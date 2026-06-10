import { KafkaConsumer, createLogger, authMiddleware, BaseRepository } from '@tepla/common';
import { EventTopic, EventType, DomainEvent } from '@tepla/types';
import webPush from 'web-push';
import { Router, Request, Response, NextFunction } from 'express';

const logger = createLogger('notification-module');

// ─── Repository ────────────────────────────────────────────────────────

export class PushRepository extends BaseRepository {
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

// ─── VAPID Initialization ──────────────────────────────────────────────

export function initNotifications(): void {
  if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
    webPush.setVapidDetails(
      process.env.VAPID_SUBJECT || 'mailto:admin@tepla.app',
      process.env.VAPID_PUBLIC_KEY,
      process.env.VAPID_PRIVATE_KEY
    );
  }
}

// ─── Push Utility ──────────────────────────────────────────────────────

export async function sendPush(subscription: any, payload: any): Promise<void> {
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

// ─── Router ────────────────────────────────────────────────────────────

export function notificationRouter(): Router {
  const repo = new PushRepository();
  const router = Router();
  const auth = authMiddleware();

  // POST /subscribe — register push subscription
  router.post('/subscribe', auth, async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { subscription } = req.body;
      await repo.saveSubscription(req.user!.sub, subscription);
      res.json({ success: true });
    } catch (err) { next(err); }
  });

  // POST /unsubscribe
  router.post('/unsubscribe', auth, async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { endpoint } = req.body;
      await repo.removeSubscription(req.user!.sub, endpoint);
      res.json({ success: true });
    } catch (err) { next(err); }
  });

  // GET / — get in-app notifications
  router.get('/', auth, async (req: Request, res: Response, next: NextFunction) => {
    try {
      const notifications = await repo.getNotifications(req.user!.sub, 50);
      res.json({ success: true, data: notifications });
    } catch (err) { next(err); }
  });

  return router;
}

// ─── Kafka Consumer ────────────────────────────────────────────────────

export async function startNotificationConsumer(kafka: any): Promise<void> {
  const repo = new PushRepository();
  const consumer = new KafkaConsumer('notification-svc', 'notification-group');
  await consumer.subscribe([EventTopic.MESSAGE_EVENTS, EventTopic.CHAT_EVENTS]);

  consumer.on(EventType.MESSAGE_SENT, async (event: DomainEvent) => {
    const { chatId, senderId, content, type } = event.payload as any;
    // Get all subscribers for this chat except sender
    const members = await repo.getChatMemberSubscriptions(chatId, senderId);
    for (const member of members) {
      await sendPush(member.subscription, {
        title: member.chatName || 'New message',
        body: type === 'text' ? content.substring(0, 100) : `[${type}]`,
        data: { chatId, messageId: (event.payload as any).messageId },
      });
    }
  });

  await consumer.start();
  logger.info('Notification consumer ready');
}
