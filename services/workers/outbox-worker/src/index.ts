/**
 * Standalone Outbox Worker Process
 *
 * Can run independently from the API server for process isolation.
 * Polls the outbox table and publishes events to Kafka.
 *
 * Start: npx tsx --tsconfig tsconfig.services.json services/workers/outbox-worker/src/index.ts
 */
import { KafkaProducer, createLogger } from '@tepla/common';
import { OutboxWorker } from '../../../messaging-core-service/src/modules/messages/services/outbox.worker';

const logger = createLogger('outbox-worker-standalone');

async function main() {
  logger.info('Starting standalone outbox worker...');

  const kafka = new KafkaProducer('outbox-worker');
  await kafka.connect();
  logger.info('Kafka producer connected');

  const worker = new OutboxWorker(kafka);
  worker.start();

  // Graceful shutdown
  const shutdown = async (signal: string) => {
    logger.info(`${signal} received, shutting down...`);
    worker.stop();
    await kafka.disconnect();
    process.exit(0);
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));

  logger.info('Outbox worker running. Press Ctrl+C to stop.');
}

main().catch((err) => {
  logger.error('Outbox worker failed to start', { error: err.message });
  process.exit(1);
});
