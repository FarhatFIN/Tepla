import { Router } from 'express';
import { authMiddleware, AppError, createLogger, KafkaProducer, RedisClient, BaseRepository } from '@tepla/common';
import { getBalance as getTonBalance } from './ton';
import { getJettonBalance, getJettonWalletAddress, transfer, formatAmount, parseAmount, getMinterInfo } from './wbit';
import { mnemonicNew } from '@ton/crypto';
import { WalletContractV4 } from '@ton/ton';
import { mnemonicToPrivateKey } from '@ton/crypto';
import crypto from 'crypto';

const logger = createLogger('wbit-routes');

const WALLET_ENCRYPTION_KEY = process.env.WALLET_ENCRYPTION_KEY || 'tepla-wbit-encryption-key-change-me-32';
const TEPLA_TREASURY_ADDRESS = process.env.TEPLA_TREASURY_ADDRESS || '';
const PREMIUM_MONTHLY_PRICE = 100n * 1_000_000_000n;  // 100 WBIT
const PREMIUM_YEARLY_PRICE = 999n * 1_000_000_000n;    // 999 WBIT
const TRANSFER_FEE_PERCENT = 1; // 1%

function encrypt(text: string): string {
  const key = crypto.scryptSync(WALLET_ENCRYPTION_KEY, 'salt', 32);
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return iv.toString('hex') + ':' + encrypted;
}

function decrypt(encryptedText: string): string {
  const key = crypto.scryptSync(WALLET_ENCRYPTION_KEY, 'salt', 32);
  const [ivHex, encrypted] = encryptedText.split(':');
  const iv = Buffer.from(ivHex, 'hex');
  const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}

class WbitRepository extends BaseRepository {
  constructor() {
    super('ton_wallets');
  }

  async getWallet(userId: string) {
    return this.queryOne<any>(`SELECT * FROM ton_wallets WHERE user_id = $1`, [userId]);
  }

  async createWallet(userId: string, tonAddress: string, encryptedMnemonic: string, wbitWalletAddress: string) {
    return this.queryOne<any>(
      `INSERT INTO ton_wallets (user_id, ton_address, encrypted_mnemonic, wbit_wallet_address)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [userId, tonAddress, encryptedMnemonic, wbitWalletAddress]
    );
  }

  async updateBalance(userId: string, balance: bigint) {
    await this.execute(
      `UPDATE ton_wallets SET wbit_balance = $2, last_synced_at = NOW() WHERE user_id = $1`,
      [userId, balance.toString()]
    );
  }

  async getWalletByAddress(address: string) {
    return this.queryOne<any>(`SELECT * FROM ton_wallets WHERE ton_address = $1`, [address]);
  }

  async saveTx(userId: string, type: string, amount: bigint, txHash: string, from: string, to: string, status: string, description?: string) {
    return this.queryOne<any>(
      `INSERT INTO wbit_transactions (user_id, type, amount, ton_tx_hash, from_address, to_address, status, description)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
      [userId, type, amount.toString(), txHash, from, to, status, description || null]
    );
  }

  async getTxHistory(userId: string, limit = 50) {
    return this.queryMany<any>(
      `SELECT * FROM wbit_transactions WHERE user_id = $1 ORDER BY created_at DESC LIMIT $2`,
      [userId, limit]
    );
  }
}

export function wbitRouter(redis: RedisClient, kafka: KafkaProducer): Router {
  const router = Router();
  const repo = new WbitRepository();
  const auth = authMiddleware();

  // ── Create TON wallet ──
  router.post('/wallet/create', auth, async (req, res, next) => {
    try {
      const userId = req.user!.sub;
      const existing = await repo.getWallet(userId);
      if (existing) {
        return res.json({
          success: true,
          data: { tonAddress: existing.ton_address, wbitWalletAddress: existing.wbit_wallet_address },
        });
      }

      // Generate new wallet
      const mnemonic = await mnemonicNew(24);
      const keyPair = await mnemonicToPrivateKey(mnemonic);
      const wallet = WalletContractV4.create({ publicKey: keyPair.publicKey, workchain: 0 });
      const tonAddress = wallet.address.toString();

      // Get WBIT jetton wallet address
      let wbitWalletAddress = '';
      try {
        wbitWalletAddress = await getJettonWalletAddress(tonAddress);
      } catch {
        wbitWalletAddress = 'pending';
      }

      // Encrypt and store mnemonic
      const encryptedMnemonic = encrypt(mnemonic.join(' '));
      await repo.createWallet(userId, tonAddress, encryptedMnemonic, wbitWalletAddress);

      logger.info('TON wallet created', { userId, address: tonAddress.slice(0, 10) + '...' });

      res.json({
        success: true,
        data: { tonAddress, wbitWalletAddress },
      });
    } catch (err) { next(err); }
  });

  // ── Get balance ──
  router.get('/balance', auth, async (req, res, next) => {
    try {
      const userId = req.user!.sub;
      const wallet = await repo.getWallet(userId);
      if (!wallet) throw new AppError('Wallet not found. Create one first.', 404);

      const [wbitBalance, tonBalance] = await Promise.all([
        getJettonBalance(wallet.ton_address).catch(() => 0n),
        getTonBalance(wallet.ton_address).catch(() => 0n),
      ]);

      await repo.updateBalance(userId, wbitBalance);

      res.json({
        success: true,
        data: {
          wbitBalance: formatAmount(wbitBalance),
          tonBalance: formatAmount(tonBalance),
          formatted: `${Number(formatAmount(wbitBalance)).toLocaleString()} WBIT`,
          tonAddress: wallet.ton_address,
        },
      });
    } catch (err) { next(err); }
  });

  // ── Transfer WBIT ──
  router.post('/transfer', auth, async (req, res, next) => {
    try {
      const userId = req.user!.sub;
      const { toUserId, toAddress, amount, description } = req.body;

      if (!amount) throw new AppError('Amount required', 400);
      if (!toUserId && !toAddress) throw new AppError('Recipient required', 400);

      const senderWallet = await repo.getWallet(userId);
      if (!senderWallet) throw new AppError('Wallet not found', 404);

      // Resolve recipient address
      let recipientAddress = toAddress;
      if (toUserId) {
        const recipientWallet = await repo.getWallet(toUserId);
        if (!recipientWallet) throw new AppError('Recipient wallet not found', 404);
        recipientAddress = recipientWallet.ton_address;
      }

      const parsedAmount = parseAmount(amount);
      const fee = parsedAmount * BigInt(TRANSFER_FEE_PERCENT) / 100n;
      const totalAmount = parsedAmount + fee;

      // Check balance
      const balance = await getJettonBalance(senderWallet.ton_address);
      if (balance < totalAmount) throw new AppError('Insufficient WBIT balance', 400);

      // Decrypt mnemonic and send
      const mnemonic = decrypt(senderWallet.encrypted_mnemonic);
      const txHash = await transfer(mnemonic, recipientAddress, parsedAmount, description);

      // Send fee to treasury
      if (fee > 0n && TEPLA_TREASURY_ADDRESS) {
        try {
          await transfer(mnemonic, TEPLA_TREASURY_ADDRESS, fee, 'Transfer fee');
        } catch (e) {
          logger.warn('Failed to collect fee', { error: (e as Error).message });
        }
      }

      // Save transaction
      await repo.saveTx(userId, 'transfer', parsedAmount, txHash, senderWallet.ton_address, recipientAddress, 'completed', description);

      await kafka.send('wbit-events', {
        id: crypto.randomUUID(),
        type: 'wbit.transfer',
        source: 'wbit-service',
        timestamp: new Date().toISOString(),
        userId,
        payload: { amount: formatAmount(parsedAmount), to: recipientAddress, fee: formatAmount(fee), txHash },
      });

      res.json({
        success: true,
        data: { txHash, amount: formatAmount(parsedAmount), fee: formatAmount(fee) },
      });
    } catch (err) { next(err); }
  });

  // ── Transaction history ──
  router.get('/transactions', auth, async (req, res, next) => {
    try {
      const txs = await repo.getTxHistory(req.user!.sub, parseInt(req.query.limit as string) || 50);
      res.json({
        success: true,
        data: txs.map((tx: any) => ({
          id: tx.id,
          type: tx.type,
          amount: formatAmount(BigInt(tx.amount)),
          txHash: tx.ton_tx_hash,
          from: tx.from_address,
          to: tx.to_address,
          status: tx.status,
          description: tx.description,
          createdAt: tx.created_at,
        })),
      });
    } catch (err) { next(err); }
  });

  // ── Buy Premium with WBIT ──
  router.post('/buy-premium', auth, async (req, res, next) => {
    try {
      const userId = req.user!.sub;
      const { plan } = req.body as { plan: 'monthly' | 'yearly' };
      if (!plan || !['monthly', 'yearly'].includes(plan)) {
        throw new AppError('Invalid plan. Use "monthly" or "yearly"', 400);
      }

      const price = plan === 'monthly' ? PREMIUM_MONTHLY_PRICE : PREMIUM_YEARLY_PRICE;
      const wallet = await repo.getWallet(userId);
      if (!wallet) throw new AppError('Wallet not found', 404);

      const balance = await getJettonBalance(wallet.ton_address);
      if (balance < price) {
        throw new AppError(`Insufficient balance. Need ${formatAmount(price)} WBIT`, 400);
      }

      if (!TEPLA_TREASURY_ADDRESS) throw new AppError('Treasury not configured', 500);

      const mnemonic = decrypt(wallet.encrypted_mnemonic);
      const txHash = await transfer(mnemonic, TEPLA_TREASURY_ADDRESS, price, `Premium ${plan}`);

      await repo.saveTx(userId, 'premium', price, txHash, wallet.ton_address, TEPLA_TREASURY_ADDRESS, 'completed', `Premium ${plan}`);

      // Activate premium via Kafka event
      await kafka.send('premium-events', {
        id: crypto.randomUUID(),
        type: 'premium.activated_wbit',
        source: 'wbit-service',
        timestamp: new Date().toISOString(),
        userId,
        payload: { plan, price: formatAmount(price), txHash },
      });

      res.json({ success: true, data: { plan, price: formatAmount(price), txHash } });
    } catch (err) { next(err); }
  });

  // ── WBIT price (public) ──
  router.get('/price', async (_req, res, next) => {
    try {
      // Try to fetch from STON.fi DEX API
      const cached = await redis.get('wbit:price');
      if (cached) {
        return res.json({ success: true, data: JSON.parse(cached) });
      }

      // Placeholder price data (in production, fetch from STON.fi)
      const priceData = {
        price: '0.05',
        change24h: '+0.0%',
        volume24h: '0',
        marketCap: '0',
        currency: 'USDT',
      };

      await redis.set('wbit:price', JSON.stringify(priceData), 60); // cache 1 min

      res.json({ success: true, data: priceData });
    } catch (err) { next(err); }
  });

  // ── Token info (public) ──
  router.get('/info', async (_req, res, next) => {
    try {
      const info = await getMinterInfo();
      res.json({
        success: true,
        data: {
          name: 'WBIT',
          symbol: 'WBIT',
          decimals: 9,
          totalSupply: formatAmount(info.totalSupply),
          mintable: info.mintable,
          minterAddress: process.env.WBIT_MINTER_ADDRESS || '',
          network: process.env.NETWORK || 'testnet',
        },
      });
    } catch (err) { next(err); }
  });

  return router;
}
