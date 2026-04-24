import { BaseRepository, KafkaProducer, createLogger } from '@tepla/common';
import { uuidv7 } from 'uuidv7';

const logger = createLogger('outbox-worker');
const POLL_INTERVAL_MS = 1000;
const BATCH_SIZE = 50;
const MAX_RETRIES = 5;

export class OutboxWorker {
  private repo: BaseRepository;
  private timer: NodeJS.Timeout | null = null;

  constructor(private kafka: KafkaProducer) {
    this.repo = new (class extends BaseRepository { constructor() { super('outbox'); } })();
  }

  start(): void {
    this.timer = setInterval(() => this.poll(), POLL_INTERVAL_MS);
    logger.info('Outbox worker started', { intervalMs: POLL_INTERVAL_MS, batchSize: BATCH_SIZE });
  }

  stop(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  private async poll(): Promise<void> {
    try {
      const rows = await this.repo.queryMany<OutboxRow>(
        `SELECT * FROM outbox
         WHERE published_at IS NULL AND retries < $1
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
            source: 'message-service',
            correlationId: uuidv7(),
            userId: row.payload.fromUserId,
            payload: row.payload,
          });

          await this.repo.execute(
            'UPDATE outbox SET published_at = NOW() WHERE id = $1',
            [row.id]
          );
        } catch (err) {
          logger.warn('Outbox publish failed, will retry', { id: row.id, error: (err as Error).message });
          await this.repo.execute(
            'UPDATE outbox SET retries = retries + 1 WHERE id = $1',
            [row.id]
          );
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
  created_at: string;
  published_at: string | null;
  retries: number;
}
