import { BaseService, KafkaConsumer, createLogger } from '@tepla/common';
import { EventTopic, EventType, DomainEvent } from '@tepla/types';
import webPush from 'web-push';
import { Router, Request, Response, NextFunction } from 'express';
import { authMiddleware } from '@tepla/common';
import { BaseRepository } from '@tepla/common';

const logger = createLogger('notification-service');

class NotificationService extends BaseService {
  constructor() {
    super({ name: 'notification-service', port: 3006 });
  }

  async setup(): Promise<void> {
    // Configure web-push
    if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
      webPush.setVapidDetails(
        process.env.VAPID_SUBJECT || 'mailto:admin@tepla.app',
        process.env.VAPID_PUBLIC_KEY,
        process.env.VAPID_PRIVATE_KEY
      );
    }

    const repo = new PushRepository();
    const router = Router();
    const auth = authMiddleware();

    // POST /api/notifications/subscribe — register push subscription
    router.post('/subscribe', auth, async (req: Request, res: Response, next: NextFunction) => {
      try {
        const { subscription } = req.body;
        await repo.saveSubscription(req.user!.sub, subscription);
        res.json({ success: true });
      } catch (err) { next(err); }
    });

    // POST /api/notifications/unsubscribe
    router.post('/unsubscribe', auth, async (req: Request, res: Response, next: NextFunction) => {
      try {
        const { endpoint } = req.body;
        await repo.removeSubscription(req.user!.sub, endpoint);
        res.json({ success: true });
      } catch (err) { next(err); }
    });

    // GET /api/notifications — get in-app notifications
    router.get('/', auth, async (req: Request, res: Response, next: NextFunction) => {
      try {
        const notifications = await repo.getNotifications(req.user!.sub, 50);
        res.json({ success: true, data: notifications });
      } catch (err) { next(err); }
    });

    this.registerRoutes('/api/notifications', router);

    // ─── Kafka Consumer: listen for events → send push ───
    const consumer = new KafkaConsumer('notification-svc', 'notification-group');
    await consumer.subscribe([EventTopic.MESSAGE_EVENTS, EventTopic.CHAT_EVENTS, EventTopic.PREMIUM_EVENTS]);

    consumer.on(EventType.MESSAGE_SENT, async (event: DomainEvent) => {
      const { chatId, senderId, content, type } = event.payload as any;
      // Get all subscribers for this chat except sender
      const members = await repo.getChatMemberSubscriptions(chatId, senderId);
      for (const member of members) {
        await this.sendPush(member.subscription, {
          title: member.chatName || 'New message',
          body: type === 'text' ? content.substring(0, 100) : `[${type}]`,
          data: { chatId, messageId: (event.payload as any).messageId },
        });
      }
    });

    consumer.on(EventType.SUBSCRIPTION_CREATED, async (event: DomainEvent) => {
      const { userId } = event.payload as any;
      const subs = await repo.getUserSubscriptions(userId);
      for (const sub of subs) {
        await this.sendPush(sub.subscription, {
          title: 'Welcome to Tepla Premium! 🎉',
          body: 'Enjoy all premium features',
          data: { type: 'premium_activated' },
        });
      }
    });

    await consumer.start();
    this.logger.info('Notification service ready');
  }

  private async sendPush(subscription: any, payload: any): Promise<void> {
    try {
      await webPush.sendNotification(subscription, JSON.stringify(payload));
    } catch (err: any) {
      if (err.statusCode === 410 || err.statusCode === 404) {
        logger.debug('Subscription expired, removing');
      } else {
        logger.error('Push send failed', { error: err.message });
      }
    }
  }
}

class PushRepository extends BaseRepository {
  constructor() { super('push_subscriptions'); }

  async saveSubscription(userId: string, subscription: any): Promise<void> {
    await this.execute(
      `INSERT INTO push_subscriptions (user_id, subscription, endpoint, created_at)
       VALUES ($1, $2, $3, NOW()) ON CONFLICT (endpoint) DO UPDATE SET subscription = $2`,
      [userId, JSON.stringify(subscription), subscription.endpoint]
    );
  }

  async removeSubscription(userId: string, endpoint: string): Promise<void> {
    await this.execute('DELETE FROM push_subscriptions WHERE user_id = $1 AND endpoint = $2', [userId, endpoint]);
  }

  async getUserSubscriptions(userId: string): Promise<any[]> {
    return this.queryMany('SELECT * FROM push_subscriptions WHERE user_id = $1', [userId]);
  }

  async getChatMemberSubscriptions(chatId: string, excludeUserId: string): Promise<any[]> {
    return this.queryMany(
      `SELECT ps.subscription, cm.user_id, c.name as chat_name
       FROM push_subscriptions ps
       JOIN chat_members cm ON cm.user_id = ps.user_id
       JOIN chats c ON c.id = cm.chat_id
       WHERE cm.chat_id = $1 AND ps.user_id != $2`,
      [chatId, excludeUserId]
    );
  }

  async getNotifications(userId: string, limit: number): Promise<any[]> {
    return this.queryMany(
      'SELECT * FROM notifications WHERE user_id = $1 ORDER BY created_at DESC LIMIT $2',
      [userId, limit]
    );
  }
}

new NotificationService().start();
