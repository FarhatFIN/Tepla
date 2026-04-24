import { Router, Request, Response, NextFunction } from 'express';
import { uuidv7 } from 'uuidv7';
import { RedisClient, KafkaProducer, authMiddleware, NotFoundError, ValidationError, ForbiddenError, createLogger } from '@tepla/common';
import { EventType, EventTopic, UserId } from '@tepla/types';
import { BaseRepository } from '@tepla/common';

const logger = createLogger('scheduled-routes');

class ScheduledRepository extends BaseRepository {
  async create(data: any): Promise<any> {
    return this.queryOne(
      `INSERT INTO scheduled_messages (id, chat_id, sender_id, content, type, scheduled_at, is_silent, attachment_ids, thread_id, created_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,NOW()) RETURNING *`,
      [data.id, data.chatId, data.senderId, data.content, data.type,
       data.scheduledAt, data.isSilent, JSON.stringify(data.attachmentIds || []), data.threadId]
    );
  }

  async findById(id: string): Promise<any> {
    return this.queryOne(`SELECT * FROM scheduled_messages WHERE id = $1 AND sent_at IS NULL`, [id]);
  }

  async findByUser(userId: string, chatId?: string): Promise<any[]> {
    if (chatId) {
      return this.queryMany(
        `SELECT * FROM scheduled_messages WHERE sender_id = $1 AND chat_id = $2 AND sent_at IS NULL
         ORDER BY scheduled_at ASC`,
        [userId, chatId]
      );
    }
    return this.queryMany(
      `SELECT * FROM scheduled_messages WHERE sender_id = $1 AND sent_at IS NULL ORDER BY scheduled_at ASC`,
      [userId]
    );
  }

  async getReady(): Promise<any[]> {
    return this.queryMany(
      `SELECT * FROM scheduled_messages WHERE scheduled_at <= NOW() AND sent_at IS NULL ORDER BY scheduled_at ASC LIMIT 100`
    );
  }

  async markSent(id: string): Promise<void> {
    await this.execute(`UPDATE scheduled_messages SET sent_at = NOW() WHERE id = $1`, [id]);
  }

  async update(id: string, fields: { content?: string; scheduledAt?: string; isSilent?: boolean }): Promise<any> {
    const sets: string[] = [];
    const vals: any[] = [];
    let i = 1;
    if (fields.content !== undefined) { sets.push(`content = $${i++}`); vals.push(fields.content); }
    if (fields.scheduledAt !== undefined) { sets.push(`scheduled_at = $${i++}`); vals.push(fields.scheduledAt); }
    if (fields.isSilent !== undefined) { sets.push(`is_silent = $${i++}`); vals.push(fields.isSilent); }
    if (sets.length === 0) return this.findById(id);
    vals.push(id);
    return this.queryOne(`UPDATE scheduled_messages SET ${sets.join(', ')} WHERE id = $${i} RETURNING *`, vals);
  }

  async delete(id: string): Promise<void> {
    await this.execute(`DELETE FROM scheduled_messages WHERE id = $1`, [id]);
  }
}

export function scheduledRouter(redis: RedisClient, kafka: KafkaProducer): Router {
  const router = Router();
  const auth = authMiddleware();
  const repo = new ScheduledRepository();

  // Background scheduler — check every 30 seconds
  setInterval(async () => {
    try {
      const ready = await repo.getReady();
      for (const msg of ready) {
        await kafka.publish({
          id: uuidv7(),
          type: EventType.SCHEDULED_MESSAGE_SENT,
          topic: EventTopic.MESSAGE_EVENTS,
          timestamp: new Date().toISOString(),
          source: 'message-service',
          correlationId: uuidv7(),
          userId: msg.sender_id as UserId,
          payload: {
            chatId: msg.chat_id,
            content: msg.content,
            type: msg.type,
            isSilent: msg.is_silent,
            threadId: msg.thread_id,
            scheduledMessageId: msg.id,
          },
        });
        await repo.markSent(msg.id);
        logger.info('Scheduled message sent', { id: msg.id, chatId: msg.chat_id });
      }
    } catch (err: any) {
      logger.error('Scheduler tick failed', { error: err.message });
    }
  }, 30_000);

  // POST /api/scheduled — schedule a message
  router.post('/', auth, async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { chatId, content, type = 'text', scheduledAt, isSilent, attachmentIds, threadId } = req.body;
      if (!chatId || !content || !scheduledAt) throw new ValidationError('chatId, content, scheduledAt required');

      const schedDate = new Date(scheduledAt);
      if (schedDate <= new Date()) throw new ValidationError('scheduledAt must be in the future');

      const msg = await repo.create({
        id: uuidv7(),
        chatId,
        senderId: req.user!.sub,
        content,
        type,
        scheduledAt,
        isSilent: isSilent || false,
        attachmentIds: attachmentIds || [],
        threadId: threadId || null,
      });

      await kafka.publish({
        id: uuidv7(),
        type: EventType.MESSAGE_SCHEDULED,
        topic: EventTopic.MESSAGE_EVENTS,
        timestamp: new Date().toISOString(),
        source: 'message-service',
        correlationId: uuidv7(),
        userId: req.user!.sub as UserId,
        payload: { scheduledMessageId: msg.id, chatId, scheduledAt },
      });

      res.status(201).json({ success: true, data: msg });
    } catch (err) { next(err); }
  });

  // GET /api/scheduled — list my scheduled messages
  router.get('/', auth, async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { chatId } = req.query;
      const messages = await repo.findByUser(req.user!.sub, chatId as string);
      res.json({ success: true, data: messages });
    } catch (err) { next(err); }
  });

  // PATCH /api/scheduled/:id — edit scheduled message
  router.patch('/:id', auth, async (req: Request, res: Response, next: NextFunction) => {
    try {
      const msg = await repo.findById(req.params.id);
      if (!msg) throw new NotFoundError('Scheduled message');
      if (msg.sender_id !== req.user!.sub) throw new ForbiddenError('Not your message');
      const updated = await repo.update(msg.id, req.body);
      res.json({ success: true, data: updated });
    } catch (err) { next(err); }
  });

  // DELETE /api/scheduled/:id — cancel scheduled message
  router.delete('/:id', auth, async (req: Request, res: Response, next: NextFunction) => {
    try {
      const msg = await repo.findById(req.params.id);
      if (!msg) throw new NotFoundError('Scheduled message');
      if (msg.sender_id !== req.user!.sub) throw new ForbiddenError('Not your message');
      await repo.delete(msg.id);
      res.json({ success: true });
    } catch (err) { next(err); }
  });

  return router;
}
