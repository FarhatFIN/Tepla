import { KafkaProducer, authMiddleware, createLogger, BaseRepository } from '@tepla/common';
import { Router, Request, Response, NextFunction } from 'express';
import { v4 as uuid } from 'uuid';

const logger = createLogger('moderation-service');

// Simple spam / abuse detection patterns
const SPAM_PATTERNS = [
  /(.)\1{10,}/,                    // repeated chars
  /(https?:\/\/\S+\s*){5,}/,      // excessive links
  /(.{20,})\1{3,}/,               // repeated long strings
];

const BANNED_WORDS: string[] = []; // Configure via env/DB

/**
 * Analyze content for spam patterns, banned words, and excessive length.
 * Returns an array of unique flag strings.
 */
export function analyzeContent(content: string): string[] {
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

/**
 * Returns an Express Router with moderation report endpoints:
 *   POST /report  – submit a new moderation report
 *   GET  /reports – list pending reports (admin)
 */
export function moderationRouter(kafka: KafkaProducer): Router {
  const router = Router();
  const auth = authMiddleware();

  // POST /api/moderation/report
  router.post('/report', auth, async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { targetType, targetId, reason, details } = req.body;
      const repo = new BaseRepository('moderation_reports');
      await repo.transaction(async (client) => {
        await client.query(
          `INSERT INTO moderation_reports (id, reporter_id, target_type, target_id, reason, details, status, created_at)
           VALUES ($1, $2, $3, $4, $5, $6, 'pending', NOW())`,
          [uuid(), req.user!.sub, targetType, targetId, reason, details || null]
        );
      });
      res.json({ success: true, data: { message: 'Report submitted' } });
    } catch (err) { next(err); }
  });

  // GET /api/moderation/reports (admin)
  router.get('/reports', auth, async (req: Request, res: Response, next: NextFunction) => {
    try {
      const repo = new BaseRepository('moderation_reports');
      const reports = await (repo as any).queryMany(
        'SELECT * FROM moderation_reports WHERE status = $1 ORDER BY created_at DESC LIMIT 50',
        ['pending']
      );
      res.json({ success: true, data: reports });
    } catch (err) { next(err); }
  });

  return router;
}

// NOTE: Auto-moderation (Kafka consumer → content flagging) is handled by the standalone moderation-worker.
// This module only provides HTTP report/admin endpoints for the messaging-core-service.
