import { BaseService, KafkaConsumer, authMiddleware, createLogger } from '@tepla/common';
import { EventTopic, EventType, DomainEvent } from '@tepla/types';
import { Router, Request, Response, NextFunction } from 'express';

const logger = createLogger('analytics-service');

class AnalyticsService extends BaseService {
  constructor() {
    super({ name: 'analytics-service', port: 3011 });
  }

  async setup(): Promise<void> {
    const router = Router();
    const auth = authMiddleware();

    // GET /api/analytics/dashboard
    router.get('/dashboard', auth, async (req: Request, res: Response, next: NextFunction) => {
      try {
        const today = new Date().toISOString().split('T')[0];

        const [dau, messages, newUsers, premiumCount] = await Promise.all([
          this.redis!.get(`analytics:dau:${today}`),
          this.redis!.get(`analytics:messages:${today}`),
          this.redis!.get(`analytics:new_users:${today}`),
          this.redis!.get(`analytics:premium_users`),
        ]);

        res.json({
          success: true,
          data: {
            dau: parseInt(dau || '0'),
            messagestoday: parseInt(messages || '0'),
            newUsersToday: parseInt(newUsers || '0'),
            premiumUsers: parseInt(premiumCount || '0'),
            date: today,
          },
        });
      } catch (err) { next(err); }
    });

    // GET /api/analytics/user/:userId
    router.get('/user/:userId', auth, async (req: Request, res: Response, next: NextFunction) => {
      try {
        const stats = await this.redis!.hgetall(`analytics:user:${req.params.userId}`);
        res.json({ success: true, data: stats });
      } catch (err) { next(err); }
    });

    this.registerRoutes('/api/analytics', router);

    // ─── Kafka Consumer: track all events ───
    const consumer = new KafkaConsumer('analytics-svc', 'analytics-group');
    await consumer.subscribe([
      EventTopic.MESSAGE_EVENTS,
      EventTopic.USER_EVENTS,
      EventTopic.PRESENCE_EVENTS,
      EventTopic.PREMIUM_EVENTS,
    ]);

    // Wildcard handler — count everything
    consumer.on('*', async (event: DomainEvent) => {
      const today = new Date().toISOString().split('T')[0];

      // Track event counts
      await this.redis!.incr(`analytics:events:${today}:${event.type}`);

      // Track by type
      switch (event.type) {
        case EventType.MESSAGE_SENT:
          await this.redis!.incr(`analytics:messages:${today}`);
          if (event.userId) {
            await this.redis!.hset(`analytics:user:${event.userId}`, 'lastMessage', new Date().toISOString());
            const pipe = this.redis!.pipeline();
            pipe.hincrby(`analytics:user:${event.userId}`, 'messageCount', 1);
            await pipe.exec();
          }
          break;

        case EventType.USER_ONLINE:
          await this.redis!.sadd(`analytics:dau:set:${today}`, event.userId || '');
          const dauCount = await this.redis!.raw.scard(`analytics:dau:set:${today}`);
          await this.redis!.set(`analytics:dau:${today}`, String(dauCount), 86400);
          break;

        case EventType.USER_CREATED:
          await this.redis!.incr(`analytics:new_users:${today}`);
          break;

        case EventType.SUBSCRIPTION_CREATED:
          await this.redis!.incr(`analytics:premium_users`);
          break;

        case EventType.SUBSCRIPTION_EXPIRED:
        case EventType.SUBSCRIPTION_CANCELLED:
          await this.redis!.raw.decr(`analytics:premium_users`);
          break;
      }
    });

    await consumer.start();
    this.logger.info('Analytics service ready');
  }
}

new AnalyticsService().start();
