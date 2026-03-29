import { Router, Request, Response, NextFunction } from 'express';
import { uuidv7 } from 'uuidv7';
import { RedisClient, KafkaProducer, authMiddleware, ValidationError } from '@tepla/common';
import { EventType, EventTopic, UserId } from '@tepla/types';
import { MessageRepository } from '../repositories/message.repository';

export function reactionRouter(redis: RedisClient, kafka: KafkaProducer): Router {
  const router = Router();
  const auth = authMiddleware();
  const msgRepo = new MessageRepository();

  // POST /api/reactions — toggle reaction
  router.post('/', auth, async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { messageId, emoji } = req.body;
      if (!messageId || !emoji) throw new ValidationError('messageId and emoji required');

      const userId = req.user!.sub;
      const existing = await msgRepo.findReaction(messageId, userId, emoji);

      if (existing) {
        await msgRepo.removeReaction(messageId, userId, emoji);
        await kafka.publish({
          id: uuidv7(), type: EventType.REACTION_REMOVED, topic: EventTopic.MESSAGE_EVENTS,
          timestamp: new Date().toISOString(), source: 'message-service',
          correlationId: req.correlationId || uuidv7(), userId: userId as UserId,
          payload: { messageId, userId, emoji },
        });
      } else {
        await msgRepo.addReaction(messageId, userId, emoji);
        await kafka.publish({
          id: uuidv7(), type: EventType.REACTION_ADDED, topic: EventTopic.MESSAGE_EVENTS,
          timestamp: new Date().toISOString(), source: 'message-service',
          correlationId: req.correlationId || uuidv7(), userId: userId as UserId,
          payload: { messageId, userId, emoji },
        });
      }

      const reactions = await msgRepo.getReactions(messageId);
      res.json({ success: true, data: reactions });
    } catch (err) { next(err); }
  });

  return router;
}
