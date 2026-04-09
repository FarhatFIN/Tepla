import { Router, Request, Response, NextFunction } from 'express';
import { authMiddleware, createLogger } from '@tepla/common';
import { OutboxRepository } from '../../messages/repositories/outbox.repository';

const logger = createLogger('admin-routes');

export function adminRouter(): Router {
  const router = Router();
  const auth = authMiddleware();
  const outboxRepo = new OutboxRepository();

  // GET /api/admin/outbox/dead — list dead letter events
  router.get('/outbox/dead', auth, async (req: Request, res: Response, next: NextFunction) => {
    try {
      const limit = parseInt(req.query.limit as string || '50', 10);
      const deadLetters = await outboxRepo.getDeadLetters(limit);
      res.json({ success: true, data: deadLetters });
    } catch (err) { next(err); }
  });

  // POST /api/admin/outbox/retry/:id — retry a dead letter event
  router.post('/outbox/retry/:id', auth, async (req: Request, res: Response, next: NextFunction) => {
    try {
      const success = await outboxRepo.retryDeadLetter(req.params.id);
      if (!success) {
        return res.status(404).json({ success: false, error: 'Event not found or not in dead state' });
      }
      logger.info('Dead letter retried', { id: req.params.id });
      res.json({ success: true, data: { message: 'Event requeued for retry' } });
    } catch (err) { next(err); }
  });

  // GET /api/admin/outbox/stats — outbox queue stats
  router.get('/outbox/stats', auth, async (req: Request, res: Response, next: NextFunction) => {
    try {
      const [pending, dead, processedLastHour] = await Promise.all([
        outboxRepo.getPendingCount(),
        outboxRepo.getDeadCount(),
        outboxRepo.getProcessedLastHour(),
      ]);
      res.json({
        success: true,
        data: { pending, dead, processedLastHour },
      });
    } catch (err) { next(err); }
  });

  return router;
}
