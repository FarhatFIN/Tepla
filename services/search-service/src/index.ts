import { BaseService, KafkaConsumer, authMiddleware, createLogger } from '@tepla/common';
import { EventTopic, EventType, DomainEvent } from '@tepla/types';
import { Client as ElasticClient } from '@elastic/elasticsearch';
import { Router, Request, Response, NextFunction } from 'express';

const logger = createLogger('search-service');

class SearchService extends BaseService {
  private elastic!: ElasticClient;

  constructor() {
    super({ name: 'search-service', port: 3008 });
  }

  async setup(): Promise<void> {
    this.elastic = new ElasticClient({
      node: process.env.ELASTICSEARCH_URL || 'http://elasticsearch:9200',
    });

    // Ensure indices exist
    await this.ensureIndices();

    const router = Router();
    const auth = authMiddleware();

    // GET /api/search/messages?q=...&chatId=...&type=...&author=...
    router.get('/messages', auth, async (req: Request, res: Response, next: NextFunction) => {
      try {
        const { q, chatId, type, author, limit = '20', offset = '0' } = req.query;
        const isPremium = req.user!.isPremium;

        // Non-premium: basic text search only
        // Premium: filters by type, author, pinned, attachments
        const must: any[] = [];
        const filter: any[] = [];

        if (q) must.push({ match: { content: { query: q, fuzziness: 'AUTO' } } });
        if (chatId) filter.push({ term: { chatId } });
        if (type && isPremium) filter.push({ term: { type } });
        if (author && isPremium) filter.push({ term: { senderId: author } });

        const result = await this.elastic.search({
          index: 'tepla-messages',
          body: {
            query: { bool: { must, filter } },
            sort: [{ createdAt: 'desc' }],
            from: parseInt(offset as string),
            size: Math.min(parseInt(limit as string), isPremium ? 100 : 20),
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

    // GET /api/search/users?q=...
    router.get('/users', auth, async (req: Request, res: Response, next: NextFunction) => {
      try {
        const { q, limit = '10' } = req.query;
        const result = await this.elastic.search({
          index: 'tepla-users',
          body: {
            query: {
              multi_match: { query: q, fields: ['username^3', 'displayName^2', 'bio'], fuzziness: 'AUTO' },
            },
            size: parseInt(limit as string),
          },
        });
        res.json({ success: true, data: result.hits.hits.map((h: any) => h._source) });
      } catch (err) { next(err); }
    });

    // GET /api/search/chats?q=...
    router.get('/chats', auth, async (req: Request, res: Response, next: NextFunction) => {
      try {
        const { q, limit = '10' } = req.query;
        const result = await this.elastic.search({
          index: 'tepla-chats',
          body: {
            query: {
              multi_match: { query: q, fields: ['name^3', 'username^2', 'description'], fuzziness: 'AUTO' },
            },
            size: parseInt(limit as string),
          },
        });
        res.json({ success: true, data: result.hits.hits.map((h: any) => h._source) });
      } catch (err) { next(err); }
    });

    this.registerRoutes('/api/search', router);

    // ─── Kafka Consumer: index new/updated messages ───
    const consumer = new KafkaConsumer('search-svc', 'search-index-group');
    await consumer.subscribe([EventTopic.MESSAGE_EVENTS, EventTopic.USER_EVENTS, EventTopic.CHAT_EVENTS]);

    consumer.on(EventType.MESSAGE_SENT, async (event: DomainEvent) => {
      const msg = event.payload as any;
      await this.elastic.index({
        index: 'tepla-messages',
        id: msg.messageId,
        body: {
          messageId: msg.messageId, chatId: msg.chatId, senderId: msg.senderId,
          content: msg.content, type: msg.type, createdAt: msg.createdAt,
        },
      });
    });

    consumer.on(EventType.MESSAGE_DELETED, async (event: DomainEvent) => {
      const { messageId } = event.payload as any;
      await this.elastic.delete({ index: 'tepla-messages', id: messageId }).catch(() => {});
    });

    consumer.on(EventType.USER_CREATED, async (event: DomainEvent) => {
      const { userId } = event.payload as any;
      // Index user (would need to fetch full profile)
    });

    await consumer.start();
    this.logger.info('Search service ready');
  }

  private async ensureIndices(): Promise<void> {
    const indices = ['tepla-messages', 'tepla-users', 'tepla-chats'];
    for (const index of indices) {
      const exists = await this.elastic.indices.exists({ index });
      if (!exists) {
        await this.elastic.indices.create({ index });
        logger.info(`Created index: ${index}`);
      }
    }
  }
}

new SearchService().start();
