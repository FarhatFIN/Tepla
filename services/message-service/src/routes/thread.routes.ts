import { Router, Request, Response, NextFunction } from 'express';
import { v4 as uuid } from 'uuid';
import { RedisClient, KafkaProducer, authMiddleware, NotFoundError, ValidationError, createLogger } from '@tepla/common';
import { EventType, EventTopic, UserId, ThreadId, MessageId, ChatId } from '@tepla/types';
import { BaseRepository } from '@tepla/common';

const logger = createLogger('thread-routes');

class ThreadRepository extends BaseRepository {
  async create(data: { id: string; chatId: string; rootMessageId: string; title: string | null; creatorId: string }): Promise<any> {
    return this.queryOne(
      `INSERT INTO threads (id, chat_id, root_message_id, title, creator_id, replies_count, is_closed, is_pinned, created_at)
       VALUES ($1,$2,$3,$4,$5,0,false,false,NOW()) RETURNING *`,
      [data.id, data.chatId, data.rootMessageId, data.title, data.creatorId]
    );
  }

  async findById(id: string): Promise<any> {
    return this.queryOne(`SELECT * FROM threads WHERE id = $1`, [id]);
  }

  async findByMessage(messageId: string): Promise<any> {
    return this.queryOne(`SELECT * FROM threads WHERE root_message_id = $1`, [messageId]);
  }

  async getChatThreads(chatId: string, limit = 50): Promise<any[]> {
    return this.queryMany(
      `SELECT t.*, m.content as root_content, m.sender_id as root_sender_id
       FROM threads t JOIN messages m ON m.id = t.root_message_id
       WHERE t.chat_id = $1 ORDER BY t.last_reply_at DESC NULLS LAST LIMIT $2`,
      [chatId, limit]
    );
  }

  async getThreadMessages(threadId: string, limit = 50, cursor?: string): Promise<any[]> {
    if (cursor) {
      return this.queryMany(
        `SELECT * FROM messages WHERE thread_id = $1 AND created_at < (SELECT created_at FROM messages WHERE id = $2)
         ORDER BY created_at DESC LIMIT $3`,
        [threadId, cursor, limit]
      );
    }
    return this.queryMany(
      `SELECT * FROM messages WHERE thread_id = $1 ORDER BY created_at DESC LIMIT $2`,
      [threadId, limit]
    );
  }

  async incrementReplies(threadId: string): Promise<void> {
    await this.execute(
      `UPDATE threads SET replies_count = replies_count + 1, last_reply_at = NOW() WHERE id = $1`,
      [threadId]
    );
  }

  async addParticipant(threadId: string, userId: string): Promise<void> {
    await this.execute(
      `UPDATE threads SET participant_ids = array_append(
        CASE WHEN $2 = ANY(participant_ids) THEN participant_ids ELSE participant_ids END, $2
       ) WHERE id = $1 AND NOT ($2 = ANY(participant_ids))`,
      [threadId, userId]
    );
  }

  async toggleClose(threadId: string, closed: boolean): Promise<void> {
    await this.execute(`UPDATE threads SET is_closed = $1 WHERE id = $2`, [closed, threadId]);
  }

  async togglePin(threadId: string, pinned: boolean): Promise<void> {
    await this.execute(`UPDATE threads SET is_pinned = $1 WHERE id = $2`, [pinned, threadId]);
  }
}

export function threadRouter(redis: RedisClient, kafka: KafkaProducer): Router {
  const router = Router();
  const auth = authMiddleware();
  const threadRepo = new ThreadRepository();

  // POST /api/threads — create thread from message
  router.post('/', auth, async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { chatId, messageId, title } = req.body;
      if (!chatId || !messageId) throw new ValidationError('chatId and messageId required');

      const existing = await threadRepo.findByMessage(messageId);
      if (existing) return res.json({ success: true, data: existing });

      const thread = await threadRepo.create({
        id: uuid(),
        chatId,
        rootMessageId: messageId,
        title: title || null,
        creatorId: req.user!.sub,
      });

      await kafka.publish({
        id: uuid(),
        type: EventType.THREAD_CREATED,
        topic: EventTopic.MESSAGE_EVENTS,
        timestamp: new Date().toISOString(),
        source: 'message-service',
        correlationId: uuid(),
        userId: req.user!.sub as UserId,
        payload: { threadId: thread.id, chatId, messageId },
      });

      res.status(201).json({ success: true, data: thread });
    } catch (err) { next(err); }
  });

  // GET /api/threads/chat/:chatId — list threads in chat
  router.get('/chat/:chatId', auth, async (req: Request, res: Response, next: NextFunction) => {
    try {
      const threads = await threadRepo.getChatThreads(req.params.chatId);
      res.json({ success: true, data: threads });
    } catch (err) { next(err); }
  });

  // GET /api/threads/:threadId — get thread info
  router.get('/:threadId', auth, async (req: Request, res: Response, next: NextFunction) => {
    try {
      const thread = await threadRepo.findById(req.params.threadId);
      if (!thread) throw new NotFoundError('Thread');
      res.json({ success: true, data: thread });
    } catch (err) { next(err); }
  });

  // GET /api/threads/:threadId/messages — get thread messages
  router.get('/:threadId/messages', auth, async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { limit = '50', cursor } = req.query;
      const messages = await threadRepo.getThreadMessages(
        req.params.threadId,
        parseInt(limit as string),
        cursor as string
      );
      res.json({ success: true, data: messages });
    } catch (err) { next(err); }
  });

  // POST /api/threads/:threadId/close — toggle close
  router.post('/:threadId/close', auth, async (req: Request, res: Response, next: NextFunction) => {
    try {
      const thread = await threadRepo.findById(req.params.threadId);
      if (!thread) throw new NotFoundError('Thread');
      await threadRepo.toggleClose(thread.id, !thread.is_closed);
      res.json({ success: true, data: { isClosed: !thread.is_closed } });
    } catch (err) { next(err); }
  });

  // POST /api/threads/:threadId/pin — toggle pin
  router.post('/:threadId/pin', auth, async (req: Request, res: Response, next: NextFunction) => {
    try {
      const thread = await threadRepo.findById(req.params.threadId);
      if (!thread) throw new NotFoundError('Thread');
      await threadRepo.togglePin(thread.id, !thread.is_pinned);
      res.json({ success: true, data: { isPinned: !thread.is_pinned } });
    } catch (err) { next(err); }
  });

  return router;
}
