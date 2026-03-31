import { Router, Request, Response, NextFunction } from 'express';
import { uuidv7 } from 'uuidv7';
import { RedisClient, KafkaProducer, authMiddleware, ValidationError, createLogger } from '@tepla/common';
import { UserId } from '@tepla/types';
import { SparksRepository } from '../repositories/sparks.repository';

const logger = createLogger('sparks-routes');

export function sparksRouter(redis: RedisClient, kafka: KafkaProducer): Router {
  const router = Router();
  const auth = authMiddleware();
  const sparksRepo = new SparksRepository();

  // GET /api/sparks/wallet
  router.get('/wallet', auth, async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user!.sub;
      const cached = await redis.get(`sparks:balance:${userId}`);
      if (cached) return res.json({ success: true, data: { balance: parseInt(cached) } });

      const wallet = await sparksRepo.getWallet(userId);
      const balance = wallet?.balance || 0;
      await redis.set(`sparks:balance:${userId}`, String(balance), 60);

      res.json({ success: true, data: { balance } });
    } catch (err) { next(err); }
  });

  // POST /api/sparks/transfer
  router.post('/transfer', auth, async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { toUserId, chatId, messageId, amount, type } = req.body;
      const fromUserId = req.user!.sub;

      if (!amount || amount <= 0) throw new ValidationError('Amount must be positive');

      const wallet = await sparksRepo.getWallet(fromUserId);
      if (!wallet || wallet.balance < amount) {
        throw new ValidationError('Insufficient sparks balance');
      }

      await sparksRepo.transfer(fromUserId, toUserId, amount, type, chatId, messageId);
      await redis.del(`sparks:balance:${fromUserId}`);
      if (toUserId) await redis.del(`sparks:balance:${toUserId}`);

      res.json({ success: true, data: { message: 'Transfer complete' } });
    } catch (err) { next(err); }
  });

  // GET /api/sparks/transactions
  router.get('/transactions', auth, async (req: Request, res: Response, next: NextFunction) => {
    try {
      const transactions = await sparksRepo.getTransactions(req.user!.sub, 50);
      res.json({ success: true, data: transactions });
    } catch (err) { next(err); }
  });

  return router;
}
