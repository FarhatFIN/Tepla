import { BaseRepository } from '@tepla/common';

export interface WalletProfile {
  id: string;
  userId: string;
  currency: string;
  balance: string;
  frozenBalance: string;
  kycStatus: 'none' | 'pending' | 'approved' | 'rejected';
  kycProvider: string;
  kycExternalId: string | null;
  kycVerifiedAt: string | null;
  dailyLimit: string;
  monthlyLimit: string;
  isBlocked: boolean;
  blockedReason: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface WalletTransaction {
  id: string;
  fromWalletId: string | null;
  toWalletId: string | null;
  fromUserId: string | null;
  toUserId: string | null;
  type: 'deposit' | 'withdrawal' | 'transfer' | 'payment' | 'refund' | 'fee' | 'bonus';
  amount: string;
  currency: string;
  fee: string;
  status: 'pending' | 'completed' | 'failed' | 'cancelled' | 'reversed';
  description: string | null;
  reference: string | null;
  idempotencyKey: string | null;
  metadata: Record<string, unknown>;
  completedAt: string | null;
  createdAt: string;
}

export class WalletRepository extends BaseRepository {
  constructor() {
    super('wallet_profiles');
  }

  async getOrCreateWallet(userId: string): Promise<WalletProfile> {
    const existing = await this.queryOne<any>(
      `SELECT * FROM wallet_profiles WHERE user_id = $1`, [userId]
    );
    if (existing) return this.mapWallet(existing);

    const row = await this.queryOne<any>(
      `INSERT INTO wallet_profiles (user_id) VALUES ($1)
       ON CONFLICT (user_id) DO UPDATE SET updated_at = NOW()
       RETURNING *`,
      [userId]
    );
    return this.mapWallet(row!);
  }

  async getWalletByUserId(userId: string): Promise<WalletProfile | null> {
    const row = await this.queryOne<any>(
      `SELECT * FROM wallet_profiles WHERE user_id = $1`, [userId]
    );
    return row ? this.mapWallet(row) : null;
  }

  async getWalletById(walletId: string): Promise<WalletProfile | null> {
    const row = await this.queryOne<any>(
      `SELECT * FROM wallet_profiles WHERE id = $1`, [walletId]
    );
    return row ? this.mapWallet(row) : null;
  }

  async updateKycStatus(userId: string, status: string, externalId?: string): Promise<void> {
    const extra = status === 'approved' ? ', kyc_verified_at = NOW()' : '';
    await this.execute(
      `UPDATE wallet_profiles SET kyc_status = $1, kyc_external_id = COALESCE($3, kyc_external_id)${extra}, updated_at = NOW()
       WHERE user_id = $2`,
      [status, userId, externalId || null]
    );
  }

  async updateLimits(userId: string, dailyLimit: number, monthlyLimit: number): Promise<void> {
    await this.execute(
      `UPDATE wallet_profiles SET daily_limit = $2, monthly_limit = $3, updated_at = NOW() WHERE user_id = $1`,
      [userId, dailyLimit, monthlyLimit]
    );
  }

  async blockWallet(userId: string, reason: string): Promise<void> {
    await this.execute(
      `UPDATE wallet_profiles SET is_blocked = true, blocked_reason = $2, updated_at = NOW() WHERE user_id = $1`,
      [userId, reason]
    );
  }

  async unblockWallet(userId: string): Promise<void> {
    await this.execute(
      `UPDATE wallet_profiles SET is_blocked = false, blocked_reason = NULL, updated_at = NOW() WHERE user_id = $1`,
      [userId]
    );
  }

  // Transfer with row-level locking to prevent race conditions
  async transfer(
    fromUserId: string,
    toUserId: string,
    amount: number,
    fee: number,
    description: string,
    idempotencyKey?: string
  ): Promise<WalletTransaction> {
    return this.transaction(async (client) => {
      // Check idempotency
      if (idempotencyKey) {
        const existing = await client.query(
          `SELECT * FROM wallet_transactions WHERE idempotency_key = $1`, [idempotencyKey]
        );
        if (existing.rows[0]) return this.mapTransaction(existing.rows[0]);
      }

      // Lock both wallets (ordered by id to prevent deadlocks)
      const wallets = await client.query(
        `SELECT * FROM wallet_profiles WHERE user_id IN ($1, $2) ORDER BY id FOR UPDATE`,
        [fromUserId, toUserId]
      );

      const fromWallet = wallets.rows.find((w: any) => w.user_id === fromUserId);
      const toWallet = wallets.rows.find((w: any) => w.user_id === toUserId);

      if (!fromWallet) throw new Error('Sender wallet not found');
      if (!toWallet) throw new Error('Recipient wallet not found');
      if (fromWallet.is_blocked) throw new Error('Sender wallet is blocked');
      if (toWallet.is_blocked) throw new Error('Recipient wallet is blocked');

      const totalDebit = amount + fee;
      if (parseFloat(fromWallet.balance) < totalDebit) {
        throw new Error('Insufficient balance');
      }

      // Check daily limit
      const dailySpent = await client.query(
        `SELECT COALESCE(SUM(amount + fee), 0) as total FROM wallet_transactions
         WHERE from_user_id = $1 AND status = 'completed' AND created_at > NOW() - INTERVAL '24 hours'`,
        [fromUserId]
      );
      if (parseFloat(dailySpent.rows[0].total) + totalDebit > parseFloat(fromWallet.daily_limit)) {
        throw new Error('Daily limit exceeded');
      }

      // Debit sender
      await client.query(
        `UPDATE wallet_profiles SET balance = balance - $2, updated_at = NOW() WHERE id = $1`,
        [fromWallet.id, totalDebit]
      );

      // Credit receiver
      await client.query(
        `UPDATE wallet_profiles SET balance = balance + $2, updated_at = NOW() WHERE id = $1`,
        [toWallet.id, amount]
      );

      // Create transaction record
      const tx = await client.query(
        `INSERT INTO wallet_transactions (from_wallet_id, to_wallet_id, from_user_id, to_user_id, type, amount, currency, fee, status, description, idempotency_key, completed_at)
         VALUES ($1, $2, $3, $4, 'transfer', $5, $6, $7, 'completed', $8, $9, NOW())
         RETURNING *`,
        [fromWallet.id, toWallet.id, fromUserId, toUserId, amount, fromWallet.currency, fee, description, idempotencyKey || null]
      );

      return this.mapTransaction(tx.rows[0]);
    });
  }

  async deposit(userId: string, amount: number, reference?: string): Promise<WalletTransaction> {
    return this.transaction(async (client) => {
      const wallet = await client.query(
        `SELECT * FROM wallet_profiles WHERE user_id = $1 FOR UPDATE`, [userId]
      );
      if (!wallet.rows[0]) throw new Error('Wallet not found');

      await client.query(
        `UPDATE wallet_profiles SET balance = balance + $2, updated_at = NOW() WHERE user_id = $1`,
        [userId, amount]
      );

      const tx = await client.query(
        `INSERT INTO wallet_transactions (to_wallet_id, to_user_id, type, amount, currency, status, description, reference, completed_at)
         VALUES ($1, $2, 'deposit', $3, $4, 'completed', 'Deposit', $5, NOW())
         RETURNING *`,
        [wallet.rows[0].id, userId, amount, wallet.rows[0].currency, reference || null]
      );

      return this.mapTransaction(tx.rows[0]);
    });
  }

  async withdraw(userId: string, amount: number, description?: string): Promise<WalletTransaction> {
    return this.transaction(async (client) => {
      const wallet = await client.query(
        `SELECT * FROM wallet_profiles WHERE user_id = $1 FOR UPDATE`, [userId]
      );
      if (!wallet.rows[0]) throw new Error('Wallet not found');
      if (parseFloat(wallet.rows[0].balance) < amount) throw new Error('Insufficient balance');
      if (wallet.rows[0].kyc_status !== 'approved') throw new Error('KYC verification required for withdrawals');

      await client.query(
        `UPDATE wallet_profiles SET balance = balance - $2, updated_at = NOW() WHERE user_id = $1`,
        [userId, amount]
      );

      const tx = await client.query(
        `INSERT INTO wallet_transactions (from_wallet_id, from_user_id, type, amount, currency, status, description, completed_at)
         VALUES ($1, $2, 'withdrawal', $3, $4, 'completed', $5, NOW())
         RETURNING *`,
        [wallet.rows[0].id, userId, amount, wallet.rows[0].currency, description || 'Withdrawal']
      );

      return this.mapTransaction(tx.rows[0]);
    });
  }

  async getTransactions(userId: string, limit = 50, offset = 0): Promise<WalletTransaction[]> {
    const rows = await this.queryMany<any>(
      `SELECT * FROM wallet_transactions
       WHERE from_user_id = $1 OR to_user_id = $1
       ORDER BY created_at DESC
       LIMIT $2 OFFSET $3`,
      [userId, limit, offset]
    );
    return rows.map(r => this.mapTransaction(r));
  }

  async getTransactionById(txId: string): Promise<WalletTransaction | null> {
    const row = await this.queryOne<any>(
      `SELECT * FROM wallet_transactions WHERE id = $1`, [txId]
    );
    return row ? this.mapTransaction(row) : null;
  }

  private mapWallet(row: any): WalletProfile {
    return {
      id: row.id,
      userId: row.user_id,
      currency: row.currency,
      balance: row.balance,
      frozenBalance: row.frozen_balance,
      kycStatus: row.kyc_status,
      kycProvider: row.kyc_provider,
      kycExternalId: row.kyc_external_id,
      kycVerifiedAt: row.kyc_verified_at,
      dailyLimit: row.daily_limit,
      monthlyLimit: row.monthly_limit,
      isBlocked: row.is_blocked,
      blockedReason: row.blocked_reason,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  private mapTransaction(row: any): WalletTransaction {
    return {
      id: row.id,
      fromWalletId: row.from_wallet_id,
      toWalletId: row.to_wallet_id,
      fromUserId: row.from_user_id,
      toUserId: row.to_user_id,
      type: row.type,
      amount: row.amount,
      currency: row.currency,
      fee: row.fee,
      status: row.status,
      description: row.description,
      reference: row.reference,
      idempotencyKey: row.idempotency_key,
      metadata: row.metadata || {},
      completedAt: row.completed_at,
      createdAt: row.created_at,
    };
  }
}
