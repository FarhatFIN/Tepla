import { Router, Request, Response, NextFunction } from 'express';
import { RedisClient, authMiddleware, ValidationError } from '@tepla/common';
import { PresenceManager } from '../services/presence.manager';

export function presenceRouter(redis: RedisClient, presenceManager: PresenceManager): Router {
  const router = Router();
  const auth = authMiddleware();

  // POST /api/presence/heartbeat
  router.post('/heartbeat', auth, async (req: Request, res: Response, next: NextFunction) => {
    try {
      await presenceManager.heartbeat(req.user!.sub);
      res.json({ success: true });
    } catch (err) { next(err); }
  });

  // POST /api/presence/online
  router.post('/online', auth, async (req: Request, res: Response, next: NextFunction) => {
    try {
      await presenceManager.setOnline(req.user!.sub);
      res.json({ success: true });
    } catch (err) { next(err); }
  });

  // POST /api/presence/offline
  router.post('/offline', auth, async (req: Request, res: Response, next: NextFunction) => {
    try {
      await presenceManager.setOffline(req.user!.sub);
      res.json({ success: true });
    } catch (err) { next(err); }
  });

  // POST /api/presence/typing
  router.post('/typing', auth, async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { chatId } = req.body;
      if (!chatId) throw new ValidationError('chatId required');
      await presenceManager.setTyping(req.user!.sub, chatId);
      res.json({ success: true });
    } catch (err) { next(err); }
  });

  // GET /api/presence/:userId
  router.get('/:userId', auth, async (req: Request, res: Response, next: NextFunction) => {
    try {
      const status = await presenceManager.getStatus(req.params.userId);
      res.json({ success: true, data: status });
    } catch (err) { next(err); }
  });

  // POST /api/presence/bulk — get presence for multiple users
  router.post('/bulk', auth, async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { userIds } = req.body;
      if (!Array.isArray(userIds)) throw new ValidationError('userIds must be an array');
      const statuses = await presenceManager.getBulkStatus(userIds);
      res.json({ success: true, data: statuses });
    } catch (err) { next(err); }
  });

  // GET /api/presence/chat/:chatId/typing
  router.get('/chat/:chatId/typing', auth, async (req: Request, res: Response, next: NextFunction) => {
    try {
      const typing = await presenceManager.getTyping(req.params.chatId);
      res.json({ success: true, data: typing });
    } catch (err) { next(err); }
  });

  return router;
}
