import { BaseRepository } from '@tepla/common';
import { PoolClient } from 'pg';
import { uuidv7 } from 'uuidv7';

export interface OutboxEntry {
  aggregateType: string;
  aggregateId: string;
  eventType: string;
  topic: string;
  payload: Record<string, unknown>;
  correlationId?: string;
}

export class OutboxRepository extends BaseRepository {
  constructor() {
    super('outbox');
  }

  /**
   * Insert an outbox event (standalone, not in a transaction).
   */
  async insert(entry: OutboxEntry): Promise<string> {
    const id = uuidv7();
    await this.execute(
      `INSERT INTO outbox (id, aggregate_type, aggregate_id, event_type, topic, payload, correlation_id, status, created_at)
       VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7, 'pending', NOW())`,
      [id, entry.aggregateType, entry.aggregateId, entry.eventType, entry.topic,
       JSON.stringify(entry.payload), entry.correlationId || null]
    );
    return id;
  }

  /**
   * Insert an outbox event within an existing transaction.
   * This is the key to atomicity: message + outbox in same TX.
   */
  async insertWithClient(client: PoolClient, entry: OutboxEntry): Promise<string> {
    const id = uuidv7();
    await this.queryWithClient(client,
      `INSERT INTO outbox (id, aggregate_type, aggregate_id, event_type, topic, payload, correlation_id, status, created_at)
       VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7, 'pending', NOW())`,
      [id, entry.aggregateType, entry.aggregateId, entry.eventType, entry.topic,
       JSON.stringify(entry.payload), entry.correlationId || null]
    );
    return id;
  }

  /** Get dead letter events for admin review */
  async getDeadLetters(limit = 50): Promise<any[]> {
    return this.queryMany(
      `SELECT * FROM outbox WHERE status = 'dead' ORDER BY created_at DESC LIMIT $1`,
      [limit]
    );
  }

  /** Retry a specific dead letter event */
  async retryDeadLetter(id: string): Promise<boolean> {
    const count = await this.execute(
      `UPDATE outbox SET status = 'pending', retries = 0, error = NULL WHERE id = $1 AND status = 'dead'`,
      [id]
    );
    return count > 0;
  }

  /** Get pending queue depth */
  async getPendingCount(): Promise<number> {
    const row = await this.queryOne<{ count: string }>(
      `SELECT COUNT(*) as count FROM outbox WHERE status = 'pending'`
    );
    return parseInt(row?.count || '0', 10);
  }

  /** Get dead letter count */
  async getDeadCount(): Promise<number> {
    const row = await this.queryOne<{ count: string }>(
      `SELECT COUNT(*) as count FROM outbox WHERE status = 'dead'`
    );
    return parseInt(row?.count || '0', 10);
  }

  /** Get processed count in last hour */
  async getProcessedLastHour(): Promise<number> {
    const row = await this.queryOne<{ count: string }>(
      `SELECT COUNT(*) as count FROM outbox WHERE status = 'processed' AND processed_at > NOW() - INTERVAL '1 hour'`
    );
    return parseInt(row?.count || '0', 10);
  }
}
