import { KafkaConsumer, EventHandler } from './kafka';
import { createLogger, Logger } from './logger';
import { EventTopic, DomainEvent } from '@tepla/types';

export interface WorkerConfig {
  name: string;
  groupId: string;
  topics: EventTopic[];
  autoCommit?: boolean;
}

/**
 * Lightweight base class for Kafka consumer workers.
 * Unlike BaseService, this does NOT create Express, Redis, or HTTP infrastructure.
 * Use this for background workers that only consume events from Kafka.
 */
export abstract class BaseWorker {
  protected logger: Logger;
  protected consumer: KafkaConsumer;
  private config: WorkerConfig;

  constructor(config: WorkerConfig) {
    this.config = config;
    this.logger = createLogger(config.name);
    this.consumer = new KafkaConsumer(config.name, config.groupId, {
      autoCommit: config.autoCommit,
    });
  }

  protected on(eventType: string, handler: EventHandler): void {
    this.consumer.on(eventType, handler);
  }

  abstract setup(): void;

  async start(): Promise<void> {
    try {
      this.setup();
      await this.consumer.subscribe(this.config.topics);
      await this.consumer.start();
      this.logger.info(`${this.config.name} started (topics: ${this.config.topics.join(', ')})`);

      const shutdown = async (signal: string) => {
        this.logger.info(`${signal} received, shutting down ${this.config.name}...`);
        await this.onShutdown();
        await this.consumer.disconnect();
        process.exit(0);
      };

      process.on('SIGTERM', () => shutdown('SIGTERM'));
      process.on('SIGINT', () => shutdown('SIGINT'));
    } catch (err) {
      this.logger.error(`${this.config.name} failed to start`, { error: (err as Error).message });
      process.exit(1);
    }
  }

  protected async onShutdown(): Promise<void> {
    // Override in subclass for cleanup (e.g., flush buffers)
  }
}
