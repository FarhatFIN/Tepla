/**
 * Analytics Worker — Kafka consumer that aggregates metrics from all event topics.
 *
 * Consumes: MESSAGE_EVENTS, USER_EVENTS, CHAT_EVENTS, PRESENCE_EVENTS, PREMIUM_EVENTS
 * Writes to: Redis (DAU sets, counters)
 *
 * Pure aggregation — no mutations, no HTTP endpoints.
 */

import { KafkaConsumer, RedisClient, createLogger } from '@tepla/common';
import { EventTopic, EventType, DomainEvent } from '@tepla/types';

const logger = createLogger('analytics-worker');

async function start(): Promise<void> {
  const redis = new RedisClient();
  await redis.connect();

  const consumer = new KafkaConsumer('analytics-worker', 'analytics-group');
  await consumer.subscribe([
    EventTopic.MESSAGE_EVENTS,
    EventTopic.USER_EVENTS,
    EventTopic.CHAT_EVENTS,
    EventTopic.PRESENCE_EVENTS,
    EventTopic.PREMIUM_EVENTS,
  ]);

  const today = () => new Date().toISOString().slice(0, 10);

  // DAU tracking: any event from a user = active
  const trackDAU = async (event: DomainEvent) => {
    const userId = event.userId || (event.payload as any)?.userId || (event.payload as any)?.senderId;
    if (userId) {
      await redis.eval(
        `redis.call('SADD', KEYS[1], ARGV[1])
         redis.call('EXPIRE', KEYS[1], 172800)
         return 1`,
        [`analytics:dau:${today()}`],
        [userId]
      );
    }
  };

  // Message counter
  consumer.on(EventType.MESSAGE_SENT, async (event: DomainEvent) => {
    await trackDAU(event);
    await redis.eval(
      `redis.call('INCR', KEYS[1])
       redis.call('EXPIRE', KEYS[1], 172800)
       return 1`,
      [`analytics:messages:${today()}`],
      []
    );
  });

  // User registrations
  consumer.on(EventType.USER_CREATED, async (event: DomainEvent) => {
    await trackDAU(event);
    await redis.eval(
      `redis.call('INCR', KEYS[1])
       redis.call('EXPIRE', KEYS[1], 172800)
       return 1`,
      [`analytics:new_users:${today()}`],
      []
    );
  });

  // Premium activations
  consumer.on(EventType.SUBSCRIPTION_CREATED, async (event: DomainEvent) => {
    await trackDAU(event);
    await redis.eval(
      `redis.call('INCR', KEYS[1])
       redis.call('EXPIRE', KEYS[1], 172800)
       return 1`,
      [`analytics:premium:${today()}`],
      []
    );
  });

  // Online presence = DAU
  consumer.on(EventType.USER_ONLINE, async (event: DomainEvent) => {
    await trackDAU(event);
  });

  // Catch-all for any remaining events → DAU
  consumer.on(EventType.MESSAGE_EDITED, trackDAU);
  consumer.on(EventType.MESSAGE_DELETED, trackDAU);
  consumer.on(EventType.REACTION_ADDED, trackDAU);
  consumer.on(EventType.MEMBER_JOINED, trackDAU);

  await consumer.start();
  logger.info('Analytics worker started (consuming all topics → Redis aggregation)');

  const shutdown = async () => {
    logger.info('Shutting down analytics worker...');
    await consumer.disconnect();
    await redis.disconnect();
    process.exit(0);
  };
  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
}

start().catch(err => {
  logger.error('Analytics worker failed to start', { error: err.message });
  process.exit(1);
});
