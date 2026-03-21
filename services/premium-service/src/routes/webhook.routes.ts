import { Router, Request, Response, NextFunction } from 'express';
import { v4 as uuid } from 'uuid';
import { RedisClient, KafkaProducer, createLogger } from '@tepla/common';
import { EventType, EventTopic, UserId, SubscriptionStatus } from '@tepla/types';
import { SubscriptionRepository } from '../repositories/subscription.repository';

const logger = createLogger('premium-webhooks');

export function webhookRouter(redis: RedisClient, kafka: KafkaProducer): Router {
  const router = Router();
  const subRepo = new SubscriptionRepository();

  // POST /api/premium/webhooks/paddle — Paddle payment webhook
  router.post('/paddle', async (req: Request, res: Response, next: NextFunction) => {
    try {
      // TODO: Verify Paddle webhook signature
      const event = req.body;
      logger.info('Paddle webhook received', { eventType: event.event_type });

      switch (event.event_type) {
        case 'subscription.created':
        case 'subscription.activated': {
          const sub = await subRepo.findByPaddleId(event.data.id);
          if (sub) {
            await subRepo.updateStatus(sub.id, SubscriptionStatus.ACTIVE);
            await subRepo.updateUserPremium(sub.user_id, true);
            await redis.del(`premium:status:${sub.user_id}`, `premium:${sub.user_id}`);
          }
          break;
        }
        case 'subscription.cancelled': {
          const sub = await subRepo.findByPaddleId(event.data.id);
          if (sub) {
            await subRepo.cancel(sub.id);
            await redis.del(`premium:status:${sub.user_id}`, `premium:${sub.user_id}`);
          }
          break;
        }
        case 'subscription.past_due': {
          const sub = await subRepo.findByPaddleId(event.data.id);
          if (sub) {
            await subRepo.updateStatus(sub.id, SubscriptionStatus.PAST_DUE);
            await redis.del(`premium:status:${sub.user_id}`, `premium:${sub.user_id}`);
          }
          break;
        }
        case 'transaction.completed': {
          logger.info('Payment completed', { transactionId: event.data.id });
          break;
        }
      }

      res.json({ success: true });
    } catch (err) {
      logger.error('Webhook processing error', { error: (err as Error).message });
      next(err);
    }
  });

  // POST /api/premium/webhooks/ton — TON blockchain payment webhook
  router.post('/ton', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { userId, amount, transactionHash, plan } = req.body;
      logger.info('TON payment received', { userId, amount, transactionHash });

      // Verify transaction on chain (TODO: actual TON verification)
      // For now, trust the webhook and create subscription

      res.json({ success: true, data: { message: 'Payment processed' } });
    } catch (err) { next(err); }
  });

  return router;
}
