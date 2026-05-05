import { Router, type Request, type Response, type NextFunction } from 'express';
import { Pool } from 'pg';
import { v4 as uuid } from 'uuid';
import { BaseService, UnauthorizedError, ValidationError } from '@tepla/common';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

function userIdFrom(req: Request): string {
  const value = req.header('x-user-id') || req.header('X-User-Id');
  if (!value) throw new UnauthorizedError('Missing user context');
  return value;
}

async function ensureSavedChat(userId: string) {
  const existing = await pool.query(
    `SELECT c.* FROM chats c
     JOIN chat_members cm ON cm.chat_id = c.id
     WHERE cm.user_id = $1 AND c.type = 'saved'
     ORDER BY c.created_at ASC LIMIT 1`,
    [userId],
  );
  if (existing.rows[0]) return existing.rows[0];

  const chat = await pool.query(
    `INSERT INTO chats (id, type, name, created_by, members_count)
     VALUES ($1, 'saved', 'Saved Messages', $2, 1)
     RETURNING *`,
    [uuid(), userId],
  );
  await pool.query(
    `INSERT INTO chat_members (chat_id, user_id, role) VALUES ($1, $2, 'owner')
     ON CONFLICT DO NOTHING`,
    [chat.rows[0].id, userId],
  );
  return chat.rows[0];
}

async function requireMember(chatId: string, userId: string): Promise<void> {
  const member = await pool.query(
    'SELECT 1 FROM chat_members WHERE chat_id = $1 AND user_id = $2',
    [chatId, userId],
  );
  if (!member.rows[0]) throw new UnauthorizedError('Chat access denied');
}

function router(): Router {
  const r = Router();

  r.get('/chats', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = userIdFrom(req);
      await ensureSavedChat(userId);
      const rows = await pool.query(
        `SELECT c.*,
          (SELECT row_to_json(m) FROM (
            SELECT id, sender_id, content, type, created_at
            FROM messages
            WHERE chat_id = c.id AND is_deleted = false
            ORDER BY created_at DESC LIMIT 1
          ) m) AS last_message
         FROM chats c
         JOIN chat_members cm ON cm.chat_id = c.id
         WHERE cm.user_id = $1
         ORDER BY COALESCE((SELECT MAX(created_at) FROM messages WHERE chat_id = c.id), c.created_at) DESC`,
        [userId],
      );
      res.json({ success: true, data: rows.rows });
    } catch (err) { next(err); }
  });

  r.get('/messages', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = userIdFrom(req);
      const chatId = String(req.query.chatId || '');
      if (!chatId) throw new ValidationError('chatId is required');
      await requireMember(chatId, userId);
      const limit = Math.min(Number(req.query.limit) || 50, 100);
      const rows = await pool.query(
        `SELECT m.*, u.display_name AS sender_name
         FROM messages m
         LEFT JOIN users u ON u.id = m.sender_id
         WHERE m.chat_id = $1 AND m.is_deleted = false
         ORDER BY m.created_at DESC
         LIMIT $2`,
        [chatId, limit],
      );
      res.json({ success: true, data: rows.rows.reverse(), meta: { limit } });
    } catch (err) { next(err); }
  });

  r.post('/messages', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = userIdFrom(req);
      const { chatId, content, type = 'text', replyToId } = req.body;
      if (!chatId || typeof content !== 'string') {
        throw new ValidationError('chatId and content are required');
      }
      await requireMember(chatId, userId);
      const row = await pool.query(
        `INSERT INTO messages (id, chat_id, sender_id, content, type, reply_to_id)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING *`,
        [uuid(), chatId, userId, content, type, replyToId || null],
      );
      res.status(201).json({ success: true, data: row.rows[0] });
    } catch (err) { next(err); }
  });

  r.post('/messages/read', (_req, res) => res.json({ success: true, data: { ok: true } }));

  r.patch('/messages/:id/pin', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = userIdFrom(req);
      const message = await pool.query('SELECT chat_id FROM messages WHERE id = $1', [req.params.id]);
      if (!message.rows[0]) throw new ValidationError('Message not found');
      await requireMember(message.rows[0].chat_id, userId);
      const row = await pool.query(
        'UPDATE messages SET is_pinned = NOT is_pinned WHERE id = $1 RETURNING *',
        [req.params.id],
      );
      res.json({ success: true, data: row.rows[0] });
    } catch (err) { next(err); }
  });

  r.delete('/messages/:id', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = userIdFrom(req);
      const row = await pool.query(
        'UPDATE messages SET is_deleted = true WHERE id = $1 AND sender_id = $2 RETURNING id',
        [req.params.id, userId],
      );
      if (!row.rows[0]) throw new ValidationError('Message not found');
      res.json({ success: true, data: { id: req.params.id } });
    } catch (err) { next(err); }
  });

  return r;
}

class MessagingCoreService extends BaseService {
  constructor() {
    super({ name: 'messaging-core-service', port: Number(process.env.PORT || 3004) });
  }

  async setup(): Promise<void> {
    this.registerRoutes('/api', router());
  }
}

new MessagingCoreService().start();
