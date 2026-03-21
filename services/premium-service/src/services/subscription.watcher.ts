import { v4 as uuid } from 'uuid';
import { RedisClient, KafkaProducer, createLogger } from '@tepla/common';
import { EventType, EventTopic, UserId, SubscriptionStatus } from '@tepla/types';
import { SubscriptionRepository } from '../repositories/subscription.repository';

const logger = createLogger('subscription-watcher');
const CHECK_INTERVAL = 5 * 60 * 1000; // 5 minutes

export class SubscriptionWatcher {
  private interval: NodeJS.Timeout | null = null;
  private subRepo: SubscriptionRepository;

  constructor(
    private redis: RedisClient,
    private kafka: KafkaProducer
  ) {
    this.subRepo = new SubscriptionRepository();
  }

  start(): void {
    this.interval = setInterval(() => this.checkExpired(), CHECK_INTERVAL);
    logger.info('Subscription watcher started');
  }

  stop(): void {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }
  }

  private async checkExpired(): Promise<void> {
    try {
      const expired = await this.subRepo.getExpired();
      logger.info(`Found ${expired.length} expired subscriptions`);

      for (const sub of expired) {
        await this.subRepo.updateStatus(sub.id, SubscriptionStatus.EXPIRED);
        await this.subRepo.updateUserPremium(sub.user_id, false);

        // Clear caches
        await this.redis.del(
          `premium:status:${sub.user_id}`,
          `premium:${sub.user_id}`,
          `user:${sub.user_id}`
        );

        // Publish event
        await this.kafka.publish({
          id: uuid(),
          type: EventType.SUBSCRIPTION_EXPIRED,
          topic: EventTopic.PREMIUM_EVENTS,
          timestamp: new Date().toISOString(),
          source: 'premium-service',
          correlationId: uuid(),
          userId: sub.user_id as UserId,
          payload: { userId: sub.user_id, subscriptionId: sub.id, plan: sub.plan },
        });

        logger.info('Subscription expired', { userId: sub.user_id, plan: sub.plan });
      }
    } catch (err) {
      logger.error('Error checking expired subscriptions', { error: (err as Error).message });
    }
  }
}
