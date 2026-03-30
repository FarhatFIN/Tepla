import { BaseRepository, BaseService, KafkaConsumer, authMiddleware, createLogger } from '@tepla/common';
import { initializeSecurity } from '@tepla/security';
import { DomainEvent, EventTopic, EventType } from '@tepla/types';
import { Client as ElasticClient } from '@elastic/elasticsearch';
import { Router, Request, Response, NextFunction } from 'express';
import { v4 as uuid } from 'uuid';
import { uuidv7 } from 'uuidv7';
import { chatRouter } from '../../chat-service/src/routes/chat.routes';
import { folderRouter } from '../../chat-service/src/routes/folder.routes';
import { rolesRouter } from '../../chat-service/src/routes/roles.routes';
import { advancedRouter } from '../../chat-service/src/routes/advanced.routes';
import { messageRouter } from '../../message-service/src/routes/message.routes';
import { reactionRouter } from '../../message-service/src/routes/reaction.routes';
import { sparksRouter } from '../../message-service/src/routes/sparks.routes';
import { threadRouter } from '../../message-service/src/routes/thread.routes';
import { scheduledRouter } from '../../message-service/src/routes/scheduled.routes';
import { MessageRepository } from '../../message-service/src/repositories/message.repository';
import { OutboxWorker } from '../../message-service/src/services/outbox.worker';

const searchLogger = createLogger('search-service');
const expiryLogger = createLogger('message-expiry');
const moderationLogger = createLogger('moderation-service');

const SPAM_PATTERNS = [
  /(.)\1{10,}/,
  /(https?:\/\/\S+\s*){5,}/,
  /(.{20,})\1{3,}/,
];

const BANNED_WORDS: string[] = [];

class MessagingService extends BaseService {
  private elastic!: ElasticClient;

  constructor() {
    super({ name: 'messaging-service', port: 3003 });
  }

  async setup(): Promise<void> {
    await initializeSecurity();

    this.registerRoutes('/api/chats', chatRouter(this.redis!, this.kafka!));
    this.registerRoutes('/api/chats', advancedRouter(this.redis!, this.kafka!));
    this.registerRoutes('/api/folders', folderRouter(this.redis!, this.kafka!));
    this.registerRoutes('/api/roles', rolesRouter(this.redis!, this.kafka!));

    this.registerRoutes('/api/messages', messageRouter(this.redis!, this.kafka!));
    this.registerRoutes('/api/reactions', reactionRouter(this.redis!, this.kafka!));
    this.registerRoutes('/api/sparks', sparksRouter(this.redis!, this.kafka!));
    this.registerRoutes('/api/threads', threadRouter(this.redis!, this.kafka!));
    this.registerRoutes('/api/scheduled', scheduledRouter(this.redis!, this.kafka!));

    await this.registerSearchRoutes();
    await this.registerModerationRoutes();

    this.startExpiryWorker();

    const outboxWorker = new OutboxWorker(this.kafka!);
    outboxWorker.start();

    this.logger.info('Messaging service routes registered', {
      chats: true,
      groups: true,
      channels: true,
      messages: true,
      reactions: true,
      sparks: true,
      search: true,
      moderation: true,
      premium: false,
    });
  }

  private async registerSearchRoutes(): Promise<void> {
    this.elastic = new ElasticClient({
      node: process.env.ELASTICSEARCH_URL || 'http://elasticsearch:9200',
    });

    await this.ensureIndices();

    const router = Router();
    const auth = authMiddleware();

    router.get('/messages', auth, async (req: Request, res: Response, next: NextFunction) => {
      try {
        const { q, chatId, type, author, limit = '20', offset = '0' } = req.query;
        const isPremium = req.user!.isPremium;
        const must: object[] = [];
        const filter: object[] = [];

        if (q) must.push({ match: { content: { query: q, fuzziness: 'AUTO' } } });
        if (chatId) filter.push({ term: { chatId } });
        if (type && isPremium) filter.push({ term: { type } });
        if (author && isPremium) filter.push({ term: { senderId: author } });

        const result = await this.elastic.search({
          index: 'tepla-messages',
          body: {
            query: { bool: { must, filter } },
            sort: [{ createdAt: 'desc' }],
            from: parseInt(offset as string, 10),
            size: Math.min(parseInt(limit as string, 10), isPremium ? 100 : 20),
            highlight: { fields: { content: {} } },
          },
        });

        const hits = result.hits.hits.map((hit: any) => ({
          ...hit._source,
          _score: hit._score,
          _highlight: hit.highlight,
        }));

        res.json({ success: true, data: hits, meta: { total: (result.hits.total as any)?.value || 0 } });
      } catch (err) { next(err); }
    });

    router.get('/users', auth, async (req: Request, res: Response, next: NextFunction) => {
      try {
        const { q, limit = '10' } = req.query;
        const result = await this.elastic.search({
          index: 'tepla-users',
          body: {
            query: {
              multi_match: { query: q, fields: ['username^3', 'displayName^2', 'bio'], fuzziness: 'AUTO' },
            },
            size: parseInt(limit as string, 10),
          },
        });

        res.json({ success: true, data: result.hits.hits.map((hit: any) => hit._source) });
      } catch (err) { next(err); }
    });

    router.get('/chats', auth, async (req: Request, res: Response, next: NextFunction) => {
      try {
        const { q, limit = '10' } = req.query;
        const result = await this.elastic.search({
          index: 'tepla-chats',
          body: {
            query: {
              multi_match: { query: q, fields: ['name^3', 'username^2', 'description'], fuzziness: 'AUTO' },
            },
            size: parseInt(limit as string, 10),
          },
        });

        res.json({ success: true, data: result.hits.hits.map((hit: any) => hit._source) });
      } catch (err) { next(err); }
    });

    this.registerRoutes('/api/search', router);

    const bulkBuffer: Array<{ action: object; doc?: object }> = [];
    const bulkMaxSize = 100;
    const bulkFlushMs = 500;
    let bulkTimer: NodeJS.Timeout | null = null;

    const flushBulk = async () => {
      if (bulkBuffer.length === 0) return;

      const ops = bulkBuffer.splice(0, bulkBuffer.length);
      const body = ops.flatMap((op) => op.doc ? [op.action, op.doc] : [op.action]);

      try {
        const result = await this.elastic.bulk({ body });
        if (result.errors) {
          const errors = result.items.filter((item: any) => item.index?.error || item.delete?.error);
          searchLogger.warn(`Bulk indexing: ${errors.length} errors in batch of ${ops.length}`);
        }
      } catch (err) {
        searchLogger.error('Bulk indexing failed', { error: (err as Error).message, count: ops.length });
      }
    };

    const enqueueBulk = (action: object, doc?: object) => {
      bulkBuffer.push({ action, doc });
      if (bulkBuffer.length >= bulkMaxSize) {
        if (bulkTimer) {
          clearTimeout(bulkTimer);
          bulkTimer = null;
        }
        void flushBulk();
      } else if (!bulkTimer) {
        bulkTimer = setTimeout(() => {
          bulkTimer = null;
          void flushBulk();
        }, bulkFlushMs);
      }
    };

    const consumer = new KafkaConsumer('messaging-search-svc', 'messaging-search-group');
    await consumer.subscribe([EventTopic.MESSAGE_EVENTS, EventTopic.USER_EVENTS, EventTopic.CHAT_EVENTS]);

    consumer.on(EventType.MESSAGE_SENT, async (event: DomainEvent) => {
      const msg = event.payload as any;
      enqueueBulk(
        { index: { _index: 'tepla-messages', _id: msg.messageId } },
        { messageId: msg.messageId, chatId: msg.chatId, senderId: msg.senderId, content: msg.content, type: msg.type, createdAt: msg.createdAt },
      );
    });

    consumer.on(EventType.MESSAGE_DELETED, async (event: DomainEvent) => {
      const { messageId } = event.payload as any;
      enqueueBulk({ delete: { _index: 'tepla-messages', _id: messageId } });
    });

    consumer.on(EventType.USER_CREATED, async () => {
      // User indexing remains a follow-up once Auth/User becomes the single profile source.
    });

    await consumer.start();
  }

  private async registerModerationRoutes(): Promise<void> {
    const router = Router();
    const auth = authMiddleware();

    router.post('/report', auth, async (req: Request, res: Response, next: NextFunction) => {
      try {
        const { targetType, targetId, reason, details } = req.body;
        const repo = new BaseRepository('moderation_reports');

        await repo.transaction(async (client) => {
          await client.query(
            `INSERT INTO moderation_reports (id, reporter_id, target_type, target_id, reason, details, status, created_at)
             VALUES ($1, $2, $3, $4, $5, $6, 'pending', NOW())`,
            [uuid(), req.user!.sub, targetType, targetId, reason, details || null],
          );
        });

        res.json({ success: true, data: { message: 'Report submitted' } });
      } catch (err) { next(err); }
    });

    router.get('/reports', auth, async (_req: Request, res: Response, next: NextFunction) => {
      try {
        const repo = new BaseRepository('moderation_reports');
        const reports = await (repo as any).queryMany(
          'SELECT * FROM moderation_reports WHERE status = $1 ORDER BY created_at DESC LIMIT 50',
          ['pending'],
        );

        res.json({ success: true, data: reports });
      } catch (err) { next(err); }
    });

    this.registerRoutes('/api/moderation', router);

    const consumer = new KafkaConsumer('messaging-moderation-svc', 'messaging-moderation-group');
    await consumer.subscribe([EventTopic.MESSAGE_EVENTS]);

    consumer.on(EventType.MESSAGE_SENT, async (event: DomainEvent) => {
      const { content, senderId, chatId, messageId } = event.payload as any;
      const flags = this.analyzeContent(content);

      if (flags.length === 0) return;

      moderationLogger.warn('Content flagged', { messageId, senderId, flags });

      await this.kafka!.publish({
        id: uuid(),
        type: EventType.CONTENT_FLAGGED,
        topic: EventTopic.MODERATION_EVENTS,
        timestamp: new Date().toISOString(),
        source: 'messaging-service',
        correlationId: event.correlationId,
        payload: { messageId, senderId, chatId, flags },
      });
    });

    await consumer.start();
  }

  private analyzeContent(content: string): string[] {
    const flags: string[] = [];

    for (const pattern of SPAM_PATTERNS) {
      if (pattern.test(content)) flags.push('spam_pattern');
    }

    const lower = content.toLowerCase();
    for (const word of BANNED_WORDS) {
      if (lower.includes(word)) flags.push('banned_word');
    }

    if (content.length > 10000) flags.push('excessive_length');
    return [...new Set(flags)];
  }

  private async ensureIndices(): Promise<void> {
    const indices = ['tepla-messages', 'tepla-users', 'tepla-chats'];
    for (const index of indices) {
      const exists = await this.elastic.indices.exists({ index });
      if (!exists) {
        await this.elastic.indices.create({ index });
        searchLogger.info(`Created index: ${index}`);
      }
    }
  }

  private startExpiryWorker(): void {
    const msgRepo = new MessageRepository();
    const kafka = this.kafka!;

    setInterval(async () => {
      try {
        const expired = await msgRepo.deleteExpiredMessages();
        if (expired.length === 0) return;

        expiryLogger.info(`Expired ${expired.length} messages`);
        const byChatId = new Map<string, string[]>();

        for (const row of expired) {
          if (!byChatId.has(row.chat_id)) byChatId.set(row.chat_id, []);
          byChatId.get(row.chat_id)!.push(row.id);
        }

        for (const [chatId, messageIds] of byChatId) {
          for (const messageId of messageIds) {
            await kafka.publish({
              id: uuidv7(),
              type: EventType.MESSAGE_DELETED,
              topic: EventTopic.MESSAGE_EVENTS,
              timestamp: new Date().toISOString(),
              source: 'messaging-service',
              correlationId: uuidv7(),
              payload: { chatId, messageId },
            });
          }
        }
      } catch (err) {
        expiryLogger.error('Expiry worker error', { error: (err as Error).message });
      }
    }, 60_000);
  }
}

new MessagingService().start();
