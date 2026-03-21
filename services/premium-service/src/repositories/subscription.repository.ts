import { BaseRepository } from '@tepla/common';
import { v4 as uuid } from 'uuid';
import { SubscriptionStatus } from '@tepla/types';

export class SubscriptionRepository extends BaseRepository {
  constructor() {
    super('subscriptions');
  }

  async getActiveSubscription(userId: string): Promise<any | null> {
    return this.queryOne(
      `SELECT * FROM subscriptions WHERE user_id = $1
       AND status IN ('active', 'trialing')
       AND (expires_at IS NULL OR expires_at > NOW())
       ORDER BY created_at DESC LIMIT 1`,
      [userId]
    );
  }

  async findByPaddleId(paddleId: string): Promise<any | null> {
    return this.queryOne(
      'SELECT * FROM subscriptions WHERE paddle_subscription_id = $1',
      [paddleId]
    );
  }

  async create(input: any): Promise<any> {
    const id = uuid();
    const sql = `
      INSERT INTO subscriptions (id, user_id, plan, status, paddle_subscription_id, started_at, expires_at, created_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
      RETURNING *
    `;
    return this.queryOne(sql, [
      id, input.user_id, input.plan, input.status,
      input.paddle_subscription_id, input.started_at, input.expires_at,
    ]);
  }

  async updateStatus(id: string, status: SubscriptionStatus): Promise<void> {
    await this.execute('UPDATE subscriptions SET status = $2 WHERE id = $1', [id, status]);
  }

  async cancel(id: string): Promise<void> {
    await this.execute(
      "UPDATE subscriptions SET status = 'cancelled', cancelled_at = NOW() WHERE id = $1",
      [id]
    );
  }

  async getExpired(): Promise<any[]> {
    return this.queryMany(
      `SELECT * FROM subscriptions WHERE status = 'active' AND expires_at IS NOT NULL AND expires_at <= NOW()`,
      []
    );
  }

  async updateUserPremium(userId: string, isPremium: boolean): Promise<void> {
    await this.execute(
      'UPDATE users SET is_premium = $2 WHERE id = $1',
      [userId, isPremium]
    );
  }
}
