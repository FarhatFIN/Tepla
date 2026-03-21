import { BaseService, KafkaConsumer } from '@tepla/common';
import { EventTopic } from '@tepla/types';
import { premiumRouter } from './routes/premium.routes';
import { webhookRouter } from './routes/webhook.routes';
import { SubscriptionWatcher } from './services/subscription.watcher';

class PremiumService extends BaseService {
  constructor() {
    super({ name: 'premium-service', port: 3009 });
  }

  async setup(): Promise<void> {
    this.registerRoutes('/api/premium', premiumRouter(this.redis!, this.kafka!));
    this.registerRoutes('/api/premium/webhooks', webhookRouter(this.redis!, this.kafka!));

    // Background job: check expired subscriptions every 5 minutes
    const watcher = new SubscriptionWatcher(this.redis!, this.kafka!);
    watcher.start();

    this.logger.info('Premium service ready');
  }
}

new PremiumService().start();
