import { Router } from 'express';
import { authMiddleware, AppError, createLogger, KafkaProducer, RedisClient } from '@tepla/common';
import { WalletRepository } from '../repositories/wallet.repository';
import { KycService } from '../services/kyc.service';

const logger = createLogger('wallet-routes');

export function walletRouter(redis: RedisClient, kafka: KafkaProducer): Router {
  const router = Router();
  const repo = new WalletRepository();
  const kyc = new KycService();
  const auth = authMiddleware();

  // ── Get or create wallet ──
  router.get('/profile', auth, async (req, res, next) => {
    try {
      const wallet = await repo.getOrCreateWallet(req.user!.sub);
      res.json({ success: true, data: wallet });
    } catch (err) { next(err); }
  });

  // ── Get wallet by user ID ──
  router.get('/profile/:userId', auth, async (req, res, next) => {
    try {
      const wallet = await repo.getWalletByUserId(req.params.userId);
      if (!wallet) throw new AppError('Wallet not found', 404);
      // Only return public info for other users
      if (req.params.userId !== req.user!.sub) {
        const { balance, frozenBalance, dailyLimit, monthlyLimit, ...publicInfo } = wallet;
        res.json({ success: true, data: publicInfo });
      } else {
        res.json({ success: true, data: wallet });
      }
    } catch (err) { next(err); }
  });

  // ── Transfer money ──
  router.post('/transfer', auth, async (req, res, next) => {
    try {
      const { toUserId, amount, description, idempotencyKey } = req.body;
      const fromUserId = req.user!.sub;

      if (!toUserId || !amount) throw new AppError('toUserId and amount are required', 400);
      if (toUserId === fromUserId) throw new AppError('Cannot transfer to yourself', 400);
      if (amount <= 0) throw new AppError('Amount must be positive', 400);

      const fromWallet = await repo.getWalletByUserId(fromUserId);
      if (!fromWallet) throw new AppError('Wallet not found', 404);
      if (fromWallet.isBlocked) throw new AppError('Your wallet is blocked', 403);

      // KYC required for transfers > $100
      if (amount > 100 && fromWallet.kycStatus !== 'approved') {
        throw new AppError('KYC verification required for transfers over $100', 403);
      }

      const toWallet = await repo.getOrCreateWallet(toUserId);
      if (toWallet.isBlocked) throw new AppError('Recipient wallet is blocked', 403);

      const fee = amount > 50 ? parseFloat((amount * 0.01).toFixed(2)) : 0; // 1% fee over $50

      const tx = await repo.transfer(fromUserId, toUserId, amount, fee, description || 'Transfer', idempotencyKey);

      // Publish event
      await kafka.send('wallet-events', {
        id: crypto.randomUUID(),
        type: 'wallet.transfer',
        source: 'wallet-service',
        timestamp: new Date().toISOString(),
        userId: fromUserId,
        payload: { transactionId: tx.id, fromUserId, toUserId, amount, fee },
      });

      // Cache invalidation
      await redis.del(`wallet:${fromUserId}`);
      await redis.del(`wallet:${toUserId}`);

      res.json({ success: true, data: tx });
    } catch (err) { next(err); }
  });

  // ── Deposit ──
  router.post('/deposit', auth, async (req, res, next) => {
    try {
      const { amount, reference } = req.body;
      const userId = req.user!.sub;
      if (!amount || amount <= 0) throw new AppError('Valid amount required', 400);

      await repo.getOrCreateWallet(userId);
      const tx = await repo.deposit(userId, amount, reference);

      await kafka.send('wallet-events', {
        id: crypto.randomUUID(),
        type: 'wallet.deposit',
        source: 'wallet-service',
        timestamp: new Date().toISOString(),
        userId,
        payload: { transactionId: tx.id, amount },
      });

      await redis.del(`wallet:${userId}`);
      res.json({ success: true, data: tx });
    } catch (err) { next(err); }
  });

  // ── Withdraw ──
  router.post('/withdraw', auth, async (req, res, next) => {
    try {
      const { amount, description } = req.body;
      const userId = req.user!.sub;
      if (!amount || amount <= 0) throw new AppError('Valid amount required', 400);

      const tx = await repo.withdraw(userId, amount, description);

      await kafka.send('wallet-events', {
        id: crypto.randomUUID(),
        type: 'wallet.withdrawal',
        source: 'wallet-service',
        timestamp: new Date().toISOString(),
        userId,
        payload: { transactionId: tx.id, amount },
      });

      await redis.del(`wallet:${userId}`);
      res.json({ success: true, data: tx });
    } catch (err) { next(err); }
  });

  // ── Transaction history ──
  router.get('/transactions', auth, async (req, res, next) => {
    try {
      const limit = parseInt(req.query.limit as string) || 50;
      const offset = parseInt(req.query.offset as string) || 0;
      const txs = await repo.getTransactions(req.user!.sub, limit, offset);
      res.json({ success: true, data: txs });
    } catch (err) { next(err); }
  });

  // ── Get transaction by ID ──
  router.get('/transactions/:txId', auth, async (req, res, next) => {
    try {
      const tx = await repo.getTransactionById(req.params.txId);
      if (!tx) throw new AppError('Transaction not found', 404);
      if (tx.fromUserId !== req.user!.sub && tx.toUserId !== req.user!.sub) {
        throw new AppError('Access denied', 403);
      }
      res.json({ success: true, data: tx });
    } catch (err) { next(err); }
  });

  // ── KYC: Start verification ──
  router.post('/kyc/start', auth, async (req, res, next) => {
    try {
      const userId = req.user!.sub;
      const wallet = await repo.getOrCreateWallet(userId);

      if (wallet.kycStatus === 'approved') {
        throw new AppError('KYC already verified', 400);
      }
      if (wallet.kycStatus === 'pending') {
        throw new AppError('KYC verification already in progress', 400);
      }

      const { applicantId } = await kyc.createApplicant(userId, req.body.email, req.body.phone);
      await repo.updateKycStatus(userId, 'pending', applicantId);

      res.json({ success: true, data: { applicantId, status: 'pending' } });
    } catch (err) { next(err); }
  });

  // ── KYC: Get SDK access token ──
  router.post('/kyc/token', auth, async (req, res, next) => {
    try {
      const result = await kyc.getAccessToken(req.user!.sub);
      res.json({ success: true, data: result });
    } catch (err) { next(err); }
  });

  // ── KYC: Get status ──
  router.get('/kyc/status', auth, async (req, res, next) => {
    try {
      const wallet = await repo.getWalletByUserId(req.user!.sub);
      if (!wallet) throw new AppError('Wallet not found', 404);

      res.json({
        success: true,
        data: {
          status: wallet.kycStatus,
          verifiedAt: wallet.kycVerifiedAt,
          provider: wallet.kycProvider,
        },
      });
    } catch (err) { next(err); }
  });

  // ── KYC: Sumsub webhook ──
  router.post('/kyc/webhook', async (req, res, next) => {
    try {
      const rawBody = JSON.stringify(req.body);
      const signature = req.headers['x-payload-digest'] as string || '';

      if (!kyc.verifyWebhookSignature(rawBody, signature)) {
        throw new AppError('Invalid webhook signature', 401);
      }

      const event = kyc.parseWebhookEvent(req.body);
      logger.info('KYC webhook received', { type: event.type, userId: event.externalUserId });

      if (event.type === 'applicantReviewed' || event.type === 'applicantPending') {
        const answer = event.reviewResult?.reviewAnswer;
        let status: string;

        if (answer === 'GREEN') {
          status = 'approved';
          // Upgrade limits for verified users
          await repo.updateLimits(event.externalUserId, 5000, 50000);
        } else if (answer === 'RED') {
          status = 'rejected';
        } else {
          status = 'pending';
        }

        await repo.updateKycStatus(event.externalUserId, status, event.applicantId);
        await redis.del(`wallet:${event.externalUserId}`);

        await kafka.send('wallet-events', {
          id: crypto.randomUUID(),
          type: 'wallet.kyc_updated',
          source: 'wallet-service',
          timestamp: new Date().toISOString(),
          userId: event.externalUserId,
          payload: { status, applicantId: event.applicantId },
        });
      }

      res.json({ success: true });
    } catch (err) { next(err); }
  });

  // ── Block/Unblock wallet (admin only) ──
  router.post('/admin/block', auth, async (req, res, next) => {
    try {
      const { userId, reason } = req.body;
      if (!userId || !reason) throw new AppError('userId and reason required', 400);
      await repo.blockWallet(userId, reason);
      await redis.del(`wallet:${userId}`);
      res.json({ success: true });
    } catch (err) { next(err); }
  });

  router.post('/admin/unblock', auth, async (req, res, next) => {
    try {
      const { userId } = req.body;
      if (!userId) throw new AppError('userId required', 400);
      await repo.unblockWallet(userId);
      await redis.del(`wallet:${userId}`);
      res.json({ success: true });
    } catch (err) { next(err); }
  });

  return router;
}
