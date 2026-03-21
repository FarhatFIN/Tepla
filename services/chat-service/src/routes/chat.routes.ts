import { Router, Request, Response, NextFunction } from 'express';
import { v4 as uuid } from 'uuid';
import { RedisClient, KafkaProducer, authMiddleware, NotFoundError, ValidationError, ForbiddenError, createLogger } from '@tepla/common';
import { EventType, EventTopic, UserId, ChatType, ChatRole } from '@tepla/types';
import { ChatRepository } from '../repositories/chat.repository';

const logger = createLogger('chat-routes');

export function chatRouter(redis: RedisClient, kafka: KafkaProducer): Router {
  const router = Router();
  const auth = authMiddleware();
  const chatRepo = new ChatRepository();

  // GET /api/chats — list user's chats
  router.get('/', auth, async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user!.sub;
      const cacheKey = `chats:user:${userId}`;

      const cached = await redis.getJson<any[]>(cacheKey);
      if (cached) return res.json({ success: true, data: cached });

      const chats = await chatRepo.findByUserId(userId);
      await redis.setJson(cacheKey, chats, 30);

      res.json({ success: true, data: chats });
    } catch (err) { next(err); }
  });

  // GET /api/chats/:chatId
  router.get('/:chatId', auth, async (req: Request, res: Response, next: NextFunction) => {
    try {
      const chat = await chatRepo.findById(req.params.chatId);
      if (!chat) throw new NotFoundError('Chat', req.params.chatId);

      // Check membership for private chats
      if (!chat.is_public) {
        const member = await chatRepo.getMember(req.params.chatId, req.user!.sub);
        if (!member) throw new ForbiddenError('Not a member of this chat');
      }

      res.json({ success: true, data: chat });
    } catch (err) { next(err); }
  });

  // POST /api/chats — create new chat
  router.post('/', auth, async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { type, name, username, description, isPublic, memberIds } = req.body;
      const userId = req.user!.sub;

      if (!type) throw new ValidationError('Chat type is required');

      if (type === ChatType.DIRECT) {
        if (!memberIds?.length) throw new ValidationError('memberIds required for direct chat');
        // Check if DM already exists
        const existing = await chatRepo.findDirectChat(userId, memberIds[0]);
        if (existing) return res.json({ success: true, data: existing });
      }

      if ((type === ChatType.GROUP || type === ChatType.CHANNEL) && !name) {
        throw new ValidationError('Name is required for groups/channels');
      }

      const chat = await chatRepo.create({
        type,
        name: name || null,
        username: username || null,
        description: description || null,
        created_by: userId,
        is_public: isPublic || false,
      });

      // Add creator as owner
      await chatRepo.addMember(chat.id, userId, ChatRole.OWNER);

      // Add other members
      if (memberIds?.length) {
        for (const memberId of memberIds) {
          if (memberId !== userId) {
            await chatRepo.addMember(chat.id, memberId, ChatRole.MEMBER);
          }
        }
      }

      await redis.del(`chats:user:${userId}`);

      await kafka.publish({
        id: uuid(),
        type: EventType.CHAT_CREATED,
        topic: EventTopic.CHAT_EVENTS,
        timestamp: new Date().toISOString(),
        source: 'chat-service',
        correlationId: req.correlationId || uuid(),
        userId: userId as UserId,
        payload: { chatId: chat.id, type, memberIds: [userId, ...(memberIds || [])] },
      });

      res.status(201).json({ success: true, data: chat });
    } catch (err) { next(err); }
  });

  // POST /api/chats/:chatId/members — add member
  router.post('/:chatId/members', auth, async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { userId: targetUserId } = req.body;
      const chat = await chatRepo.findById(req.params.chatId);
      if (!chat) throw new NotFoundError('Chat');

      const requester = await chatRepo.getMember(req.params.chatId, req.user!.sub);
      if (!requester || !['owner', 'admin'].includes(requester.role)) {
        throw new ForbiddenError('Only admins can add members');
      }

      await chatRepo.addMember(req.params.chatId, targetUserId, ChatRole.MEMBER);
      await chatRepo.updateMembersCount(req.params.chatId);

      await redis.del(`chats:user:${targetUserId}`);

      await kafka.publish({
        id: uuid(),
        type: EventType.MEMBER_JOINED,
        topic: EventTopic.CHAT_EVENTS,
        timestamp: new Date().toISOString(),
        source: 'chat-service',
        correlationId: req.correlationId || uuid(),
        userId: targetUserId as UserId,
        payload: { chatId: req.params.chatId, userId: targetUserId },
      });

      res.json({ success: true, data: { message: 'Member added' } });
    } catch (err) { next(err); }
  });

  // DELETE /api/chats/:chatId/members/:userId
  router.delete('/:chatId/members/:userId', auth, async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { chatId, userId: targetUserId } = req.params;
      const requesterId = req.user!.sub;

      // Can leave yourself or admin can remove others
      if (targetUserId !== requesterId) {
        const requester = await chatRepo.getMember(chatId, requesterId);
        if (!requester || !['owner', 'admin'].includes(requester.role)) {
          throw new ForbiddenError('Only admins can remove members');
        }
      }

      await chatRepo.removeMember(chatId, targetUserId);
      await chatRepo.updateMembersCount(chatId);
      await redis.del(`chats:user:${targetUserId}`);

      await kafka.publish({
        id: uuid(),
        type: EventType.MEMBER_LEFT,
        topic: EventTopic.CHAT_EVENTS,
        timestamp: new Date().toISOString(),
        source: 'chat-service',
        correlationId: req.correlationId || uuid(),
        userId: targetUserId as UserId,
        payload: { chatId, userId: targetUserId },
      });

      res.json({ success: true, data: { message: 'Member removed' } });
    } catch (err) { next(err); }
  });

  // POST /api/chats/:chatId/subscribe — subscribe to public channel
  router.post('/:chatId/subscribe', auth, async (req: Request, res: Response, next: NextFunction) => {
    try {
      const chat = await chatRepo.findById(req.params.chatId);
      if (!chat) throw new NotFoundError('Chat');
      if (chat.type !== ChatType.CHANNEL) throw new ValidationError('Can only subscribe to channels');
      if (!chat.is_public) throw new ForbiddenError('Channel is not public');

      const already = await chatRepo.isSubscriber(req.params.chatId, req.user!.sub);
      if (already) return res.json({ success: true, data: { message: 'Already subscribed' } });

      await chatRepo.addMember(req.params.chatId, req.user!.sub, ChatRole.MEMBER);
      await chatRepo.updateMembersCount(req.params.chatId);
      await redis.del(`chats:user:${req.user!.sub}`);

      await kafka.publish({
        id: uuid(),
        type: EventType.MEMBER_JOINED,
        topic: EventTopic.CHAT_EVENTS,
        timestamp: new Date().toISOString(),
        source: 'chat-service',
        correlationId: req.correlationId || uuid(),
        userId: req.user!.sub as UserId,
        payload: { chatId: req.params.chatId, userId: req.user!.sub },
      });

      res.status(201).json({ success: true, data: { message: 'Subscribed' } });
    } catch (err) { next(err); }
  });

  // POST /api/chats/:chatId/unsubscribe — unsubscribe from channel
  router.post('/:chatId/unsubscribe', auth, async (req: Request, res: Response, next: NextFunction) => {
    try {
      const chat = await chatRepo.findById(req.params.chatId);
      if (!chat) throw new NotFoundError('Chat');
      if (chat.type !== ChatType.CHANNEL) throw new ValidationError('Can only unsubscribe from channels');

      const member = await chatRepo.getMember(req.params.chatId, req.user!.sub);
      if (!member) return res.json({ success: true, data: { message: 'Not subscribed' } });
      if (member.role === 'owner') throw new ForbiddenError('Owner cannot unsubscribe');

      await chatRepo.removeMember(req.params.chatId, req.user!.sub);
      await chatRepo.updateMembersCount(req.params.chatId);
      await redis.del(`chats:user:${req.user!.sub}`);

      await kafka.publish({
        id: uuid(),
        type: EventType.MEMBER_LEFT,
        topic: EventTopic.CHAT_EVENTS,
        timestamp: new Date().toISOString(),
        source: 'chat-service',
        correlationId: req.correlationId || uuid(),
        userId: req.user!.sub as UserId,
        payload: { chatId: req.params.chatId, userId: req.user!.sub },
      });

      res.json({ success: true, data: { message: 'Unsubscribed' } });
    } catch (err) { next(err); }
  });

  // POST /api/chats/:chatId/ttl — set disappearing messages timer
  router.post('/:chatId/ttl', auth, async (req: Request, res: Response, next: NextFunction) => {
    try {
      const chat = await chatRepo.findById(req.params.chatId);
      if (!chat) throw new NotFoundError('Chat');

      const member = await chatRepo.getMember(req.params.chatId, req.user!.sub);
      if (!member || !['owner', 'admin'].includes(member.role)) {
        throw new ForbiddenError('Only admins can set disappearing messages timer');
      }

      const { seconds } = req.body;
      const allowed = [0, 5, 30, 60, 300, 3600, 86400, 604800];
      if (!allowed.includes(seconds)) {
        throw new ValidationError(`seconds must be one of: ${allowed.join(', ')} (0 = off)`);
      }

      const ttl = seconds === 0 ? null : seconds;
      const updated = await chatRepo.setMessageTtl(req.params.chatId, ttl);
      await redis.del(`chats:user:${req.user!.sub}`);

      await kafka.publish({
        id: uuid(),
        type: EventType.CHAT_UPDATED,
        topic: EventTopic.CHAT_EVENTS,
        timestamp: new Date().toISOString(),
        source: 'chat-service',
        correlationId: req.correlationId || uuid(),
        userId: req.user!.sub as UserId,
        payload: { chatId: req.params.chatId, messageTtlSeconds: ttl },
      });

      res.json({ success: true, data: updated });
    } catch (err) { next(err); }
  });

  // GET /api/chats/:chatId/pins
  router.get('/:chatId/pins', auth, async (req: Request, res: Response, next: NextFunction) => {
    try {
      const pins = await chatRepo.getPinnedMessages(req.params.chatId);
      res.json({ success: true, data: pins });
    } catch (err) { next(err); }
  });

  return router;
}
