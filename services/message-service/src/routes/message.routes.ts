import { Router, Request, Response, NextFunction } from 'express';
import { v4 as uuid } from 'uuid';
import Redis from 'ioredis';
import { RedisClient, KafkaProducer, authMiddleware, NotFoundError, ValidationError, ForbiddenError, createLogger } from '@tepla/common';
import { EventType, EventTopic, UserId } from '@tepla/types';
import {
  MessagePipeline,
  ReplayProtection,
  AuditLogger,
  SecurityMetrics,
  SecureMessage,
} from '@tepla/security';
import { MessageRepository } from '../repositories/message.repository';

const logger = createLogger('message-routes');

export function messageRouter(redis: RedisClient, kafka: KafkaProducer): Router {
  const router = Router();
  const auth = authMiddleware();
  const msgRepo = new MessageRepository();

  // Security framework — E2E message pipeline
  const rawRedis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');
  const messagePipeline = new MessagePipeline(rawRedis);
  const replayProtection = new ReplayProtection(rawRedis);
  AuditLogger.setRedis(rawRedis);

  // GET /api/messages?chatId=...&limit=30&cursor=...
  router.get('/', auth, async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { chatId, limit = '30', cursor } = req.query;
      if (!chatId) throw new ValidationError('chatId is required');

      const messages = await msgRepo.findByChatId(
        chatId as string,
        parseInt(limit as string, 10),
        cursor as string | undefined
      );

      // Hydrate with attachments and reactions
      const enriched = await msgRepo.hydrate(messages);

      res.json({
        success: true,
        data: enriched,
        meta: {
          hasMore: messages.length === parseInt(limit as string, 10),
          cursor: messages[messages.length - 1]?.id || null,
        },
      });
    } catch (err) { next(err); }
  });

  // POST /api/messages — send message (with optional E2E encryption)
  router.post('/', auth, async (req: Request, res: Response, next: NextFunction) => {
    try {
      const {
        chatId, content, type = 'text', replyToId,
        contentIv, encryptedKeys, attachments,
        isSilent,
        // E2E encryption fields (new — Double Ratchet pipeline)
        e2e, sessionId, clientNonce,
      } = req.body;
      if (!chatId || !content) throw new ValidationError('chatId and content are required');

      // Channel broadcast guard — only owner/admin can post
      const chatType = await msgRepo.getChatType(chatId);
      if (chatType === 'channel') {
        const role = await msgRepo.getMemberRole(chatId, req.user!.sub);
        if (!role || !['owner', 'admin'].includes(role)) {
          throw new ForbiddenError('Only admins can post in channels');
        }
      }

      // Slow mode check (skip for admins)
      const slowKey = `slow:${chatId}:${req.user!.sub}`;
      const slowTtl = await redis.ttl(slowKey);
      if (slowTtl > 0) {
        const role = await msgRepo.getMemberRole(chatId, req.user!.sub);
        if (!role || !['owner', 'admin'].includes(role)) {
          throw new ValidationError(`Slow mode: wait ${slowTtl} seconds`);
        }
      }

      // Replay protection — prevent duplicate message submission
      if (clientNonce) {
        await replayProtection.validate(req.user!.sub, clientNonce);
      }

      let finalContent = content;
      let finalContentIv = contentIv || null;
      let securePacket: SecureMessage | undefined;

      // If client requests server-side E2E encryption via Double Ratchet
      if (e2e && sessionId) {
        securePacket = await messagePipeline.outgoing(sessionId, req.user!.sub, content);
        finalContent = JSON.stringify(securePacket.payload);
        finalContentIv = securePacket.nonce;
      }

      const message = await msgRepo.create({
        chat_id: chatId,
        sender_id: req.user!.sub,
        content: finalContent,
        content_iv: finalContentIv,
        encrypted_keys: encryptedKeys || null,
        type,
        reply_to_id: replyToId || null,
        is_silent: isSilent || false,
      });

      // Set slow mode cooldown
      const slowModeRow = await msgRepo.queryOne<{ slow_mode_seconds: number }>(`SELECT slow_mode_seconds FROM chats WHERE id = $1`, [chatId]);
      if (slowModeRow?.slow_mode_seconds > 0) {
        await redis.set(slowKey, '1', slowModeRow.slow_mode_seconds);
      }

      // Save attachments if any
      if (attachments?.length) {
        await msgRepo.addAttachments(message.id, attachments);
      }

      // Publish event for WebSocket delivery + notification
      await kafka.publish({
        id: uuid(),
        type: EventType.MESSAGE_SENT,
        topic: EventTopic.MESSAGE_EVENTS,
        timestamp: new Date().toISOString(),
        source: 'message-service',
        correlationId: req.correlationId || uuid(),
        userId: req.user!.sub as UserId,
        payload: {
          messageId: message.id,
          chatId,
          senderId: req.user!.sub,
          content: finalContent,
          type,
          replyToId,
          attachments: attachments || [],
          createdAt: message.created_at,
          e2e: !!e2e,
          isSilent: isSilent || false,
        },
      });

      // Invalidate chat list cache for all members
      await redis.del(`messages:${chatId}:latest`);

      res.status(201).json({ success: true, data: message });
    } catch (err) { next(err); }
  });

  // POST /api/messages/decrypt — decrypt incoming E2E message
  router.post('/decrypt', auth, async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { sessionId, packet } = req.body;
      if (!sessionId || !packet) throw new ValidationError('sessionId and packet are required');

      const decrypted = await messagePipeline.incoming(sessionId, req.user!.sub, packet);

      if (decrypted === null) {
        await SecurityMetrics.encryptionError(rawRedis);
        throw new ValidationError('Failed to decrypt message');
      }

      res.json({ success: true, data: { content: decrypted } });
    } catch (err) { next(err); }
  });

  // POST /api/messages/e2e/session — create E2E ratchet session for a chat
  router.post('/e2e/session', auth, async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { sessionId, userA, userB, sharedKey } = req.body;
      if (!sessionId || !userA || !userB || !sharedKey) {
        throw new ValidationError('sessionId, userA, userB, and sharedKey are required');
      }

      // Verify the requester is one of the participants
      if (req.user!.sub !== userA && req.user!.sub !== userB) {
        throw new ForbiddenError('Can only create sessions you participate in');
      }

      await messagePipeline.createSession(
        sessionId,
        userA,
        userB,
        Buffer.from(sharedKey, 'base64')
      );

      await AuditLogger.log('e2e_session_created', {
        sessionId,
        userA,
        userB,
        createdBy: req.user!.sub,
      });

      res.status(201).json({ success: true, data: { sessionId, message: 'E2E session created' } });
    } catch (err) { next(err); }
  });

  // DELETE /api/messages/e2e/session/:sessionId — destroy ratchet session
  router.delete('/e2e/session/:sessionId', auth, async (req: Request, res: Response, next: NextFunction) => {
    try {
      await messagePipeline.destroySession(req.params.sessionId);

      await AuditLogger.log('e2e_session_destroyed', {
        sessionId: req.params.sessionId,
        userId: req.user!.sub,
      });

      res.json({ success: true, data: { message: 'E2E session destroyed' } });
    } catch (err) { next(err); }
  });

  // PATCH /api/messages/:messageId — edit
  router.patch('/:messageId', auth, async (req: Request, res: Response, next: NextFunction) => {
    try {
      const msg = await msgRepo.findById(req.params.messageId);
      if (!msg) throw new NotFoundError('Message');
      if (msg.sender_id !== req.user!.sub) throw new ForbiddenError('Can only edit own messages');

      const updated = await msgRepo.update(req.params.messageId, {
        content: req.body.content,
        is_edited: true,
      });

      await kafka.publish({
        id: uuid(),
        type: EventType.MESSAGE_EDITED,
        topic: EventTopic.MESSAGE_EVENTS,
        timestamp: new Date().toISOString(),
        source: 'message-service',
        correlationId: req.correlationId || uuid(),
        userId: req.user!.sub as UserId,
        payload: { messageId: msg.id, chatId: msg.chat_id, content: req.body.content },
      });

      res.json({ success: true, data: updated });
    } catch (err) { next(err); }
  });

  // DELETE /api/messages/:messageId
  router.delete('/:messageId', auth, async (req: Request, res: Response, next: NextFunction) => {
    try {
      const msg = await msgRepo.findById(req.params.messageId);
      if (!msg) throw new NotFoundError('Message');
      if (msg.sender_id !== req.user!.sub) throw new ForbiddenError('Can only delete own messages');

      await msgRepo.softDelete(req.params.messageId);

      await kafka.publish({
        id: uuid(),
        type: EventType.MESSAGE_DELETED,
        topic: EventTopic.MESSAGE_EVENTS,
        timestamp: new Date().toISOString(),
        source: 'message-service',
        correlationId: req.correlationId || uuid(),
        userId: req.user!.sub as UserId,
        payload: { messageId: msg.id, chatId: msg.chat_id },
      });

      res.json({ success: true, data: { message: 'Deleted' } });
    } catch (err) { next(err); }
  });

  // PATCH /api/messages/:messageId/pin
  router.patch('/:messageId/pin', auth, async (req: Request, res: Response, next: NextFunction) => {
    try {
      const msg = await msgRepo.findById(req.params.messageId);
      if (!msg) throw new NotFoundError('Message');

      const updated = await msgRepo.togglePin(req.params.messageId, !msg.is_pinned);

      const eventType = updated.is_pinned ? EventType.MESSAGE_PINNED : EventType.MESSAGE_UNPINNED;
      await kafka.publish({
        id: uuid(),
        type: eventType,
        topic: EventTopic.MESSAGE_EVENTS,
        timestamp: new Date().toISOString(),
        source: 'message-service',
        correlationId: req.correlationId || uuid(),
        userId: req.user!.sub as UserId,
        payload: { messageId: msg.id, chatId: msg.chat_id, isPinned: updated.is_pinned },
      });

      res.json({ success: true, data: updated });
    } catch (err) { next(err); }
  });

  // POST /api/messages/read — mark messages as read in a chat
  router.post('/read', auth, async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { chatId, messageIds } = req.body;
      const userId = req.user!.sub;

      if (!chatId) throw new ValidationError('chatId is required');

      let readMessageIds: string[];

      if (messageIds?.length) {
        // Mark specific messages
        for (const msgId of messageIds) {
          await msgRepo.markRead(msgId, userId);
        }
        readMessageIds = messageIds;
      } else {
        // Mark all unread in chat
        readMessageIds = await msgRepo.markChatRead(chatId, userId);
      }

      if (readMessageIds.length > 0) {
        await kafka.publish({
          id: uuid(),
          type: EventType.MESSAGE_READ,
          topic: EventTopic.MESSAGE_EVENTS,
          timestamp: new Date().toISOString(),
          source: 'message-service',
          correlationId: req.correlationId || uuid(),
          userId: userId as UserId,
          payload: { chatId, messageIds: readMessageIds, readBy: userId },
        });
      }

      res.json({ success: true, data: { count: readMessageIds.length } });
    } catch (err) { next(err); }
  });

  // GET /api/messages/:messageId/reads — get read receipts
  router.get('/:messageId/reads', auth, async (req: Request, res: Response, next: NextFunction) => {
    try {
      const receipts = await msgRepo.getReadReceipts(req.params.messageId);
      res.json({ success: true, data: receipts });
    } catch (err) { next(err); }
  });

  // ─── Polls ─────────────────────────────────

  // POST /api/messages/poll — create a poll message
  router.post('/poll', auth, async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { chatId, question, options, type = 'regular', correctOptionId } = req.body;
      if (!chatId || !question || !options?.length) {
        throw new ValidationError('chatId, question, and options are required');
      }
      if (options.length < 2 || options.length > 10) {
        throw new ValidationError('Poll must have 2-10 options');
      }
      if (type === 'quiz' && (correctOptionId === undefined || correctOptionId === null)) {
        throw new ValidationError('Quiz polls require correctOptionId');
      }

      // Create the message
      const message = await msgRepo.create({
        chat_id: chatId,
        sender_id: req.user!.sub,
        content: question,
        type: 'poll',
        reply_to_id: null,
        content_iv: null,
        encrypted_keys: null,
      });

      // Create the poll
      const poll = await msgRepo.createPoll(message.id, question, options, type, correctOptionId);

      await kafka.publish({
        id: uuid(),
        type: EventType.MESSAGE_SENT,
        topic: EventTopic.MESSAGE_EVENTS,
        timestamp: new Date().toISOString(),
        source: 'message-service',
        correlationId: req.correlationId || uuid(),
        userId: req.user!.sub as UserId,
        payload: {
          messageId: message.id,
          chatId,
          senderId: req.user!.sub,
          content: question,
          type: 'poll',
          poll,
          createdAt: message.created_at,
        },
      });

      res.status(201).json({ success: true, data: { ...message, poll } });
    } catch (err) { next(err); }
  });

  // POST /api/messages/poll/:pollId/vote — vote on a poll
  router.post('/poll/:pollId/vote', auth, async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { optionIndex } = req.body;
      if (optionIndex === undefined || optionIndex === null) {
        throw new ValidationError('optionIndex is required');
      }

      const poll = await msgRepo.getPoll(req.params.pollId);
      if (!poll) throw new NotFoundError('Poll');
      if (poll.is_closed) throw new ValidationError('Poll is closed');

      const options = typeof poll.options === 'string' ? JSON.parse(poll.options) : poll.options;
      if (optionIndex < 0 || optionIndex >= options.length) {
        throw new ValidationError('Invalid option index');
      }

      const updated = await msgRepo.vote(req.params.pollId, req.user!.sub, optionIndex);
      if (!updated) throw new ValidationError('Already voted');

      // Get the message to find chatId
      const msg = await msgRepo.findById(poll.message_id);

      await kafka.publish({
        id: uuid(),
        type: EventType.MESSAGE_EDITED,
        topic: EventTopic.MESSAGE_EVENTS,
        timestamp: new Date().toISOString(),
        source: 'message-service',
        correlationId: req.correlationId || uuid(),
        userId: req.user!.sub as UserId,
        payload: {
          chatId: msg?.chat_id,
          messageId: poll.message_id,
          poll: updated,
          type: 'poll_update',
        },
      });

      res.json({ success: true, data: updated });
    } catch (err) { next(err); }
  });

  // POST /api/messages/poll/:pollId/retract — retract vote
  router.post('/poll/:pollId/retract', auth, async (req: Request, res: Response, next: NextFunction) => {
    try {
      const updated = await msgRepo.retractVote(req.params.pollId, req.user!.sub);
      if (!updated) throw new NotFoundError('Poll');
      res.json({ success: true, data: updated });
    } catch (err) { next(err); }
  });

  // POST /api/messages/poll/:pollId/close — close poll (sender only)
  router.post('/poll/:pollId/close', auth, async (req: Request, res: Response, next: NextFunction) => {
    try {
      const poll = await msgRepo.getPoll(req.params.pollId);
      if (!poll) throw new NotFoundError('Poll');

      const msg = await msgRepo.findById(poll.message_id);
      if (!msg || msg.sender_id !== req.user!.sub) {
        throw new ForbiddenError('Only poll creator can close it');
      }

      const updated = await msgRepo.closePoll(req.params.pollId);
      res.json({ success: true, data: updated });
    } catch (err) { next(err); }
  });

  // POST /api/messages/forward — forward message to another chat
  router.post('/forward', auth, async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { messageId, toChatId } = req.body;
      if (!messageId || !toChatId) throw new ValidationError('messageId and toChatId are required');

      const forwarded = await msgRepo.createForward(messageId, toChatId, req.user!.sub);
      if (!forwarded) throw new NotFoundError('Message');

      await kafka.publish({
        id: uuid(),
        type: EventType.MESSAGE_FORWARDED,
        topic: EventTopic.MESSAGE_EVENTS,
        timestamp: new Date().toISOString(),
        source: 'message-service',
        correlationId: req.correlationId || uuid(),
        userId: req.user!.sub as UserId,
        payload: {
          messageId: forwarded.id,
          chatId: toChatId,
          senderId: req.user!.sub,
          originalMessageId: messageId,
          content: forwarded.content,
          type: forwarded.type,
          createdAt: forwarded.created_at,
        },
      });

      await redis.del(`messages:${toChatId}:latest`);

      res.status(201).json({ success: true, data: forwarded });
    } catch (err) { next(err); }
  });

  return router;
}
