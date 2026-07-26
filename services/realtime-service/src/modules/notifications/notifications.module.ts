import { KafkaConsumer, createLogger, authMiddleware, BaseRepository, ValidationError } from '@tepla/common';
import { EventTopic, EventType, DomainEvent } from '@tepla/types';
import webPush from 'web-push';
import { Router, Request, Response, NextFunction } from 'express';
import { isValidPushSubscription, notificationBody } from './push-validation';

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

  /**
   * Push targets for a chat, excluding the sender.
   *
   * H-11: the caller passed `undefined` for `excludeUserId` (see the consumer
   * below), and `ps.user_id != NULL` is NULL — never true — so this query
   * returned **zero rows** and no push notification was ever delivered. The
   * `IS DISTINCT FROM` form is null-safe: a missing sender id now degrades to
   * "notify everyone in the chat" instead of "notify nobody".
   *
   * Muted members are excluded here rather than in JS so the work stays in the
   * database.
   */
  async getChatMemberSubscriptions(chatId: string, excludeUserId: string | null): Promise<any[]> {
    return this.queryMany(
      `SELECT ps.subscription, cm.user_id, c.name AS chat_name
       FROM push_subscriptions ps
       JOIN chat_members cm ON cm.user_id = ps.user_id
       JOIN chats c ON c.id = cm.chat_id
       WHERE cm.chat_id = $1
         AND ps.user_id IS DISTINCT FROM $2
         AND cm.is_muted IS NOT TRUE`,
      [chatId, excludeUserId ?? null]
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
  //
  // M-13: the body was stored unvalidated. A missing `endpoint` threw on
  // `subscription.endpoint` (500), and an arbitrary endpoint URL meant the
  // service would later have web-push issue outbound requests to whatever host
  // the client named — an SSRF primitive with a scheduler attached.
  router.post('/subscribe', auth, async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { subscription } = req.body || {};
      if (!isValidPushSubscription(subscription)) {
        throw new ValidationError('A valid push subscription (https endpoint + p256dh/auth keys) is required');
      }
      await repo.saveSubscription(req.user!.sub, subscription);
      res.json({ success: true });
    } catch (err) { next(err); }
  });

  // POST /unsubscribe
  router.post('/unsubscribe', auth, async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { endpoint } = req.body || {};
      if (typeof endpoint !== 'string' || !endpoint) {
        throw new ValidationError('endpoint is required');
      }
      await repo.removeSubscription(req.user!.sub, endpoint);
      res.json({ success: true });
    } catch (err) { next(err); }
  });

  // GET / — get in-app notifications
  router.get('/', auth, async (req: Request, res: Response, next: NextFunction) => {
    try {
      const limit = Math.min(Math.max(Number(req.query.limit) || 50, 1), 100);
      const notifications = await repo.getNotifications(req.user!.sub, limit);
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
    const payload = event.payload as Record<string, any>;
    const chatId = payload.chatId ?? payload.chat_id;
    // H-11: the producer spreads the raw DB row, so the field is `sender_id`.
    // Reading `senderId` yielded undefined and broke the exclusion filter.
    const senderId = payload.senderId ?? payload.sender_id ?? event.userId ?? null;
    const messageId = payload.messageId ?? payload.id ?? null;
    const type = payload.type ?? 'text';

    if (!chatId) return;

    try {
      const members = await repo.getChatMemberSubscriptions(chatId, senderId);
      for (const member of members) {
        await sendPush(member.subscription, {
          // The column is aliased `chat_name`; `member.chatName` was always
          // undefined, so every notification said "New message".
          title: member.chat_name || 'New message',
          body: notificationBody(type, payload.content),
          data: { chatId, messageId },
        });
      }
    } catch (err) {
      // An unhandled rejection in a Kafka handler takes the consumer down.
      logger.error('Failed to fan out push notifications', {
        error: (err as Error).message,
        chatId,
      });
    }
  });

  await consumer.start();
  logger.info('Notification consumer ready');
}
