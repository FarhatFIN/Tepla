import { Router, Request, Response, NextFunction } from 'express';
import { uuidv7 } from 'uuidv7';
import Redis from 'ioredis';
import { RedisClient, KafkaProducer, CacheLayer, authMiddleware, NotFoundError, ValidationError, ForbiddenError, createLogger } from '@tepla/common';
import { EventType, EventTopic } from '@tepla/types';
import {
  ReplayProtection,
  AuditLogger,
} from '@tepla/security';
import { MessageRepository } from '../repositories/message.repository';
import { OutboxRepository } from '../repositories/outbox.repository';

const logger = createLogger('message-routes');

export function messageRouter(redis: RedisClient, kafka: KafkaProducer): Router {
  const router = Router();
  const auth = authMiddleware();
  const msgRepo = new MessageRepository();
  const outboxRepo = new OutboxRepository();
  const cache = new CacheLayer(redis);

  // Security framework — replay protection + audit
  const rawRedis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');
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
  // ATOMIC: message + outbox event in single DB transaction.
  // Outbox worker handles Kafka delivery asynchronously.
  router.post('/', auth, async (req: Request, res: Response, next: NextFunction) => {
    try {
      const {
        chatId, content, type = 'text', replyToId,
        contentIv, encryptedKeys, attachments,
        isSilent,
        // E2E fields — client-side encryption (server is blind relay)
        e2e, clientNonce,
        // X3DH initial message header (sent only in first message of a session)
        x3dhHeader,
      } = req.body;
      if (!chatId || !content) throw new ValidationError('chatId and content are required');

      // ─── Cached role lookup (Redis → DB fallback) ───
      const userId = req.user!.sub;
      let cachedRole = await cache.getMemberRole(chatId, userId);
      if (cachedRole === null) {
        cachedRole = await msgRepo.getMemberRole(chatId, userId) || '';
        if (cachedRole) await cache.setMemberRole(chatId, userId, cachedRole);
      }

      // Channel broadcast guard — only owner/admin can post
      const chatType = await msgRepo.getChatType(chatId);
      if (chatType === 'channel') {
        if (!cachedRole || !['owner', 'admin'].includes(cachedRole)) {
          throw new ForbiddenError('Only admins can post in channels');
        }
      }

      // Slow mode check (skip for admins)
      const slowKey = `slow:${chatId}:${userId}`;
      const slowTtl = await redis.ttl(slowKey);
      if (slowTtl > 0) {
        if (!cachedRole || !['owner', 'admin'].includes(cachedRole)) {
          throw new ValidationError(`Slow mode: wait ${slowTtl} seconds`);
        }
      }

      // Replay protection — prevent duplicate message submission
      if (clientNonce) {
        await replayProtection.validate(req.user!.sub, clientNonce);
      }

      const finalContent = content;
      const finalContentIv = contentIv || null;
      const correlationId = req.correlationId || uuidv7();

      // ─── ATOMIC TRANSACTION: message + outbox ───
      const message = await msgRepo.transaction(async (client) => {
        // 1. Insert message
        const msg = await msgRepo.createWithClient(client, {
          chat_id: chatId,
          sender_id: req.user!.sub,
          content: finalContent,
          content_iv: finalContentIv,
          encrypted_keys: encryptedKeys || null,
          type,
          reply_to_id: replyToId || null,
          is_silent: isSilent || false,
        });

        // 2. Insert outbox event (same transaction — both succeed or both fail)
        await outboxRepo.insertWithClient(client, {
          aggregateType: 'message',
          aggregateId: msg.id,
          eventType: EventType.MESSAGE_SENT,
          topic: EventTopic.MESSAGE_EVENTS,
          correlationId,
          payload: {
            messageId: msg.id,
            chatId,
            senderId: req.user!.sub,
            content: finalContent,
            type,
            replyToId,
            attachments: attachments || [],
            createdAt: msg.created_at,
            e2e: !!e2e,
            x3dhHeader: x3dhHeader || null,
            isSilent: isSilent || false,
          },
        });

        return msg;
      });

      // Non-critical side effects (outside transaction — OK to fail)
      const slowModeSec = await msgRepo.getSlowModeSeconds(chatId);
      if (slowModeSec > 0) {
        await redis.set(slowKey, '1', slowModeSec);
      }

      if (attachments?.length) {
        await msgRepo.addAttachments(message.id, attachments);
      }

      await redis.del(`messages:${chatId}:latest`);

      res.status(201).json({ success: true, data: message });
    } catch (err) { next(err); }
  });

  // E2E decrypt/session endpoints REMOVED — server is now a blind relay.
  // Session establishment happens client-side via X3DH + Double Ratchet.
  // See: src/lib/crypto/x3dh.ts, src/lib/crypto/signal.ts
  // Key management: GET/POST /api/e2e/keys/* (user-service)

  // Helper: write to outbox (for non-transactional mutations like edit/delete/pin)
  async function enqueueEvent(entry: { aggregateId: string; eventType: string; topic: string; payload: Record<string, unknown>; correlationId?: string }) {
    await outboxRepo.insert({
      aggregateType: 'message',
      aggregateId: entry.aggregateId,
      eventType: entry.eventType,
      topic: entry.topic,
      payload: entry.payload,
      correlationId: entry.correlationId,
    });
  }

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

      await enqueueEvent({
        aggregateId: msg.id,
        eventType: EventType.MESSAGE_EDITED,
        topic: EventTopic.MESSAGE_EVENTS,
        correlationId: req.correlationId,
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

      await enqueueEvent({
        aggregateId: msg.id,
        eventType: EventType.MESSAGE_DELETED,
        topic: EventTopic.MESSAGE_EVENTS,
        correlationId: req.correlationId,
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
      await enqueueEvent({
        aggregateId: msg.id,
        eventType,
        topic: EventTopic.MESSAGE_EVENTS,
        correlationId: req.correlationId,
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
        await enqueueEvent({
          aggregateId: chatId,
          eventType: EventType.MESSAGE_READ,
          topic: EventTopic.MESSAGE_EVENTS,
          correlationId: req.correlationId,
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

      await enqueueEvent({
        aggregateId: message.id,
        eventType: EventType.MESSAGE_SENT,
        topic: EventTopic.MESSAGE_EVENTS,
        correlationId: req.correlationId,
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

      await enqueueEvent({
        aggregateId: poll.message_id,
        eventType: EventType.MESSAGE_EDITED,
        topic: EventTopic.MESSAGE_EVENTS,
        correlationId: req.correlationId,
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

      await enqueueEvent({
        aggregateId: forwarded.id,
        eventType: EventType.MESSAGE_FORWARDED,
        topic: EventTopic.MESSAGE_EVENTS,
        correlationId: req.correlationId,
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
