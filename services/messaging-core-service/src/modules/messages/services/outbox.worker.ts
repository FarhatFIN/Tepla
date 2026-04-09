import { BaseRepository, KafkaProducer, createLogger } from '@tepla/common';
import { uuidv7 } from 'uuidv7';

const logger = createLogger('outbox-worker');
const POLL_INTERVAL_MS = 100;  // 100ms for near-realtime delivery
const BATCH_SIZE = 100;
const MAX_RETRIES = 5;

export class OutboxWorker {
  private repo: BaseRepository;
  private timer: NodeJS.Timeout | null = null;
  private running = false;

  constructor(private kafka: KafkaProducer) {
    this.repo = new (class extends BaseRepository { constructor() { super('outbox'); } })();
  }

  start(): void {
    this.running = true;
    this.timer = setInterval(() => this.poll(), POLL_INTERVAL_MS);
    logger.info('Outbox worker started', { intervalMs: POLL_INTERVAL_MS, batchSize: BATCH_SIZE });
  }

  stop(): void {
    this.running = false;
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  private async poll(): Promise<void> {
    if (!this.running) return;

    try {
      // Use FOR UPDATE SKIP LOCKED for safe concurrent polling
      const rows = await this.repo.queryMany<OutboxRow>(
        `SELECT * FROM outbox
         WHERE status = 'pending' AND retries < $1
         ORDER BY created_at ASC
         LIMIT $2
         FOR UPDATE SKIP LOCKED`,
        [MAX_RETRIES, BATCH_SIZE]
      );

      if (rows.length === 0) return;

      for (const row of rows) {
        try {
          await this.kafka.publish({
            id: row.id,
            type: row.event_type,
            topic: row.topic as any,
            timestamp: row.created_at,
            source: 'messaging-core-service',
            correlationId: row.correlation_id || uuidv7(),
            userId: row.payload.senderId || row.payload.fromUserId,
            payload: row.payload,
          });

          // Mark as processed
          await this.repo.execute(
            `UPDATE outbox SET status = 'processed', published_at = NOW(), processed_at = NOW() WHERE id = $1`,
            [row.id]
          );
        } catch (err) {
          const newRetries = row.retries + 1;
          const errorMsg = (err as Error).message;

          if (newRetries >= MAX_RETRIES) {
            // Move to dead letter queue
            logger.error('Outbox event moved to DLQ', {
              id: row.id,
              eventType: row.event_type,
              aggregateId: row.aggregate_id,
              error: errorMsg,
              retries: newRetries,
            });
            await this.repo.execute(
              `UPDATE outbox SET status = 'dead', retries = $2, error = $3 WHERE id = $1`,
              [row.id, newRetries, errorMsg]
            );
          } else {
            logger.warn('Outbox publish failed, will retry', {
              id: row.id,
              retries: newRetries,
              error: errorMsg,
            });
            await this.repo.execute(
              `UPDATE outbox SET retries = $2, error = $3 WHERE id = $1`,
              [row.id, newRetries, errorMsg]
            );
          }
        }
      }
    } catch (err) {
      logger.error('Outbox poll error', { error: (err as Error).message });
    }
  }
}

interface OutboxRow {
  id: string;
  aggregate_type: string;
  aggregate_id: string;
  event_type: string;
  topic: string;
  payload: any;
  status: string;
  retries: number;
  max_retries: number;
  error: string | null;
  correlation_id: string | null;
  created_at: string;
  published_at: string | null;
  processed_at: string | null;
}
