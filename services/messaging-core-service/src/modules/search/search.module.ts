import { authMiddleware, createLogger } from '@tepla/common';
import { Client as ElasticClient } from '@elastic/elasticsearch';
import { Router, Request, Response, NextFunction } from 'express';

const logger = createLogger('search-service');

/**
 * Creates and returns a Router with the 3 search endpoints (messages, users, chats).
 */
export function searchRouter(elastic: ElasticClient): Router {
  const router = Router();
  const auth = authMiddleware();

  // GET /api/search/messages?q=...&chatId=...&type=...&author=...
  router.get('/messages', auth, async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { q, chatId, type, author, limit = '50', offset = '0' } = req.query;

      const must: any[] = [];
      const filter: any[] = [];

      if (q) must.push({ match: { content: { query: q, fuzziness: 'AUTO' } } });
      if (chatId) filter.push({ term: { chatId } });
      if (type) filter.push({ term: { type } });
      if (author) filter.push({ term: { senderId: author } });

      const result = await elastic.search({
        index: 'tepla-messages',
        body: {
          query: { bool: { must, filter } },
          sort: [{ createdAt: 'desc' }],
          from: parseInt(offset as string),
          size: Math.min(parseInt(limit as string), 100),
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
      const result = await elastic.search({
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
      const result = await elastic.search({
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

  return router;
}

// NOTE: Search indexing (Kafka → Elasticsearch) is handled by the standalone search-worker.
// This module only provides HTTP query endpoints for the messaging-core-service.

/**
 * Ensures the required Elasticsearch indices exist, creating them if missing.
 */
export async function ensureSearchIndices(elastic: ElasticClient): Promise<void> {
  const indices = ['tepla-messages', 'tepla-users', 'tepla-chats'];
  for (const index of indices) {
    const exists = await elastic.indices.exists({ index });
    if (!exists) {
      await elastic.indices.create({ index });
      logger.info(`Created index: ${index}`);
    }
  }
}
