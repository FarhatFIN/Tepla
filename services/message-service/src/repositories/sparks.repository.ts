import { BaseRepository } from '@tepla/common';
import { v4 as uuid } from 'uuid';

export class SparksRepository extends BaseRepository {
  constructor() {
    super('sparks_wallet');
  }

  async getWallet(userId: string): Promise<any | null> {
    return this.queryOne('SELECT * FROM sparks_wallet WHERE user_id = $1', [userId]);
  }

  async transfer(fromUserId: string, toUserId: string | null, amount: number, type: string, chatId?: string, messageId?: string): Promise<void> {
    await this.transaction(async (client: any) => {
      // Deduct from sender
      await client.query(
        'UPDATE sparks_wallet SET balance = balance - $2 WHERE user_id = $1 AND balance >= $2',
        [fromUserId, amount]
      );

      // Credit to receiver (if applicable)
      if (toUserId) {
        await client.query(
          `INSERT INTO sparks_wallet (user_id, balance) VALUES ($1, $2)
           ON CONFLICT (user_id) DO UPDATE SET balance = sparks_wallet.balance + $2`,
          [toUserId, amount]
        );
      }

      // Record transaction
      await client.query(
        `INSERT INTO sparks_transactions (id, from_user_id, to_user_id, chat_id, message_id, amount, type, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())`,
        [uuid(), fromUserId, toUserId, chatId || null, messageId || null, amount, type]
      );

      // Update message spark count if applicable
      if (messageId) {
        await client.query(
          `UPDATE messages SET spark_count = spark_count + $2,
           spark_senders_count = (SELECT COUNT(DISTINCT from_user_id) FROM sparks_transactions WHERE message_id = $1)
           WHERE id = $1`,
          [messageId, amount]
        );
      }
    });
  }

  async getTransactions(userId: string, limit: number): Promise<any[]> {
    return this.queryMany(
      `SELECT * FROM sparks_transactions WHERE from_user_id = $1 OR to_user_id = $1
       ORDER BY created_at DESC LIMIT $2`,
      [userId, limit]
    );
  }
}
