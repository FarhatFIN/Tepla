import { Router, type Request, type Response, type NextFunction } from 'express';
import { Pool } from 'pg';
import { v4 as uuid } from 'uuid';
import { BaseService, KafkaProducer, ForbiddenError, UnauthorizedError, ValidationError } from '@tepla/common';
import { EventTopic, EventType, UserId } from '@tepla/types';

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
  if (!member.rows[0]) throw new ForbiddenError('Not a member');
}

async function requireAdmin(chatId: string, userId: string): Promise<void> {
  const member = await pool.query(
    "SELECT 1 FROM chat_members WHERE chat_id = $1 AND user_id = $2 AND role IN ('owner', 'admin')",
    [chatId, userId],
  );
  if (!member.rows[0]) throw new ForbiddenError('Admin access required');
}

async function refreshMembersCount(chatId: string): Promise<void> {
  await pool.query(
    `UPDATE chats
     SET members_count = (SELECT COUNT(*)::int FROM chat_members WHERE chat_id = $1)
     WHERE id = $1`,
    [chatId],
  );
}

function fileKind(attachment: any): string {
  const mime = String(attachment.mimeType || attachment.mime_type || '');
  if (attachment.type) return String(attachment.type);
  if (mime.startsWith('image/')) return 'image';
  if (mime.startsWith('video/')) return 'video';
  if (mime.startsWith('audio/')) return 'audio';
  return 'file';
}

async function attachFiles<T extends { id: string }>(messages: T[]): Promise<Array<T & { attachments?: any[] }>> {
  if (messages.length === 0) return messages;
  const ids = messages.map((m) => m.id);
  const files = await pool.query(
    `SELECT id, message_id, url, type, mime_type, size_bytes, width, height, duration_seconds, file_name, created_at
     FROM files
     WHERE message_id = ANY($1::uuid[])
     ORDER BY created_at ASC`,
    [ids],
  );
  const byMessage = new Map<string, any[]>();
  for (const file of files.rows) {
    const list = byMessage.get(file.message_id) || [];
    list.push(file);
    byMessage.set(file.message_id, list);
  }
  return messages.map((message) => ({ ...message, attachments: byMessage.get(message.id) || [] }));
}

async function publishMemberJoined(kafka: KafkaProducer, req: Request, chatId: string, userId: string): Promise<void> {
  await kafka.publish({
    id: uuid(),
    type: EventType.MEMBER_JOINED,
    topic: EventTopic.CHAT_EVENTS,
    timestamp: new Date().toISOString(),
    source: 'messaging-core-service',
    correlationId: req.correlationId || uuid(),
    userId: userId as UserId,
    payload: { chatId, userId },
  });
}

async function publishMemberLeft(kafka: KafkaProducer, req: Request, chatId: string, userId: string): Promise<void> {
  await kafka.publish({
    id: uuid(),
    type: EventType.MEMBER_LEFT,
    topic: EventTopic.CHAT_EVENTS,
    timestamp: new Date().toISOString(),
    source: 'messaging-core-service',
    correlationId: req.correlationId || uuid(),
    userId: userId as UserId,
    payload: { chatId, userId },
  });
}

function router(kafka: KafkaProducer): Router {
  const r = Router();

  r.get('/chats', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = userIdFrom(req);
      await ensureSavedChat(userId);
      const rows = await pool.query(
        `SELECT c.*, cm.is_archived, cm.is_pinned, cm.is_muted,
          (SELECT row_to_json(m) FROM (
            SELECT id, sender_id, content, type, created_at
            FROM messages
            WHERE chat_id = c.id AND is_deleted = false
            ORDER BY created_at DESC LIMIT 1
          ) m) AS last_message,
          (SELECT COUNT(*)::int FROM messages msg
           WHERE msg.chat_id = c.id
             AND msg.is_deleted = false
             AND (msg.sender_id IS NULL OR msg.sender_id <> $1)
             AND NOT EXISTS (
               SELECT 1 FROM message_reads mr
               WHERE mr.message_id = msg.id AND mr.user_id = $1
             )
          ) AS unread_count
         FROM chats c
         JOIN chat_members cm ON cm.chat_id = c.id
         WHERE cm.user_id = $1
         ORDER BY COALESCE((SELECT MAX(created_at) FROM messages WHERE chat_id = c.id), c.created_at) DESC`,
        [userId],
      );
      res.json({ success: true, data: rows.rows });
    } catch (err) { next(err); }
  });

  r.post('/chats', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = userIdFrom(req);
      const { type, targetUserId, name, description, avatarUrl, username, isPublic } = req.body || {};
      const chatType = type || (targetUserId ? 'direct' : undefined);

      if (!chatType || !['direct', 'group', 'channel'].includes(chatType)) {
        throw new ValidationError('type must be "direct", "group", or "channel"');
      }

      // Handle direct chat creation
      if (chatType === 'direct') {
        if (!targetUserId) throw new ValidationError('targetUserId is required for direct chats');
        if (targetUserId === userId) throw new ValidationError('Cannot create direct chat with yourself');

        const target = await pool.query('SELECT id FROM users WHERE id = $1', [targetUserId]);
        if (!target.rows[0]) throw new ValidationError('User not found');

        const existing = await pool.query(
          `SELECT c.*
           FROM chats c
           JOIN chat_members a ON a.chat_id = c.id AND a.user_id = $1
           JOIN chat_members b ON b.chat_id = c.id AND b.user_id = $2
           WHERE c.type = 'direct'
           LIMIT 1`,
          [userId, targetUserId],
        );
        if (existing.rows[0]) {
          return res.json({ success: true, data: existing.rows[0] });
        }

        const chat = await pool.query(
          `INSERT INTO chats (id, type, created_by, members_count)
           VALUES ($1, 'direct', $2, 2)
           RETURNING *`,
          [uuid(), userId],
        );
        await pool.query(
          `INSERT INTO chat_members (chat_id, user_id, role)
           VALUES ($1, $2, 'member'), ($1, $3, 'member')
           ON CONFLICT DO NOTHING`,
          [chat.rows[0].id, userId, targetUserId],
        );

        await publishMemberJoined(kafka, req, chat.rows[0].id, userId);
        await publishMemberJoined(kafka, req, chat.rows[0].id, targetUserId);
        return res.status(201).json({ success: true, data: chat.rows[0] });
      }

      // Handle group creation
      if (chatType === 'group') {
        if (!name || String(name).trim().length < 2) throw new ValidationError('Group name is required');

        const chat = await pool.query(
          `INSERT INTO chats (id, type, name, avatar_url, created_by, members_count)
           VALUES ($1, 'group', $2, $3, $4, 1)
           RETURNING *`,
          [uuid(), String(name).trim(), avatarUrl || null, userId],
        );
        await pool.query(
          `INSERT INTO chat_members (chat_id, user_id, role) VALUES ($1, $2, 'owner')
           ON CONFLICT DO NOTHING`,
          [chat.rows[0].id, userId],
        );
        await publishMemberJoined(kafka, req, chat.rows[0].id, userId);
        return res.status(201).json({ success: true, data: chat.rows[0] });
      }

      // Handle channel creation
      if (chatType === 'channel') {
        if (!name || String(name).trim().length < 2) throw new ValidationError('Channel name is required');

        const handle = username ? String(username).toLowerCase() : null;
        if (handle && !/^[a-z0-9_]{3,32}$/.test(handle)) {
          throw new ValidationError('username must be 3-32 characters: a-z, 0-9, _');
        }
        if (handle) {
          const taken = await pool.query('SELECT 1 FROM chats WHERE username = $1', [handle]);
          if (taken.rows[0]) throw new ValidationError('Username is already taken');
        }

        const chat = await pool.query(
          `INSERT INTO chats (id, type, name, description, username, is_public, created_by, members_count)
           VALUES ($1, 'channel', $2, $3, $4, $5, $6, 1)
           RETURNING *`,
          [uuid(), String(name).trim(), description || null, handle, isPublic !== false, userId],
        );
        await pool.query(
          `INSERT INTO chat_members (chat_id, user_id, role) VALUES ($1, $2, 'owner')
           ON CONFLICT DO NOTHING`,
          [chat.rows[0].id, userId],
        );
        await publishMemberJoined(kafka, req, chat.rows[0].id, userId);
        return res.status(201).json({ success: true, data: chat.rows[0] });
      }
    } catch (err) { next(err); }
  });

  // Toggle (or explicitly set) the per-user archive flag for a chat
  r.patch('/chats/:id/archive', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = userIdFrom(req);
      const chatId = req.params.id;
      await requireMember(chatId, userId);
      const archived = req.body?.archived;
      const row = await pool.query(
        `UPDATE chat_members SET is_archived = COALESCE($3, NOT is_archived)
         WHERE chat_id = $1 AND user_id = $2
         RETURNING is_archived`,
        [chatId, userId, typeof archived === 'boolean' ? archived : null],
      );
      res.json({ success: true, data: { chatId, isArchived: row.rows[0].is_archived } });
    } catch (err) { next(err); }
  });

  // Toggle (or explicitly set) the per-user pin flag for a chat
  r.patch('/chats/:id/pin', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = userIdFrom(req);
      const chatId = req.params.id;
      await requireMember(chatId, userId);
      const pinned = req.body?.pinned;
      const row = await pool.query(
        `UPDATE chat_members SET is_pinned = COALESCE($3, NOT is_pinned)
         WHERE chat_id = $1 AND user_id = $2
         RETURNING is_pinned`,
        [chatId, userId, typeof pinned === 'boolean' ? pinned : null],
      );
      res.json({ success: true, data: { chatId, isPinned: row.rows[0].is_pinned } });
    } catch (err) { next(err); }
  });

  // Toggle (or explicitly set) the per-user mute flag for a chat
  r.patch('/chats/:id/mute', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = userIdFrom(req);
      const chatId = req.params.id;
      await requireMember(chatId, userId);
      const muted = req.body?.muted;
      const row = await pool.query(
        `UPDATE chat_members SET is_muted = COALESCE($3, NOT is_muted)
         WHERE chat_id = $1 AND user_id = $2
         RETURNING is_muted`,
        [chatId, userId, typeof muted === 'boolean' ? muted : null],
      );
      res.json({ success: true, data: { chatId, isMuted: row.rows[0].is_muted } });
    } catch (err) { next(err); }
  });

  r.post('/dm/:userId', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const currentUserId = userIdFrom(req);
      const targetUserId = req.params.userId;
      if (!targetUserId || targetUserId === currentUserId) {
        throw new ValidationError('Valid userId is required');
      }

      const target = await pool.query('SELECT id FROM users WHERE id = $1', [targetUserId]);
      if (!target.rows[0]) throw new ValidationError('User not found');

      const existing = await pool.query(
        `SELECT c.*
         FROM chats c
         JOIN chat_members a ON a.chat_id = c.id AND a.user_id = $1
         JOIN chat_members b ON b.chat_id = c.id AND b.user_id = $2
         WHERE c.type = 'direct'
         LIMIT 1`,
        [currentUserId, targetUserId],
      );
      if (existing.rows[0]) {
        return res.json({ success: true, data: existing.rows[0] });
      }

      const chat = await pool.query(
        `INSERT INTO chats (id, type, created_by, members_count)
         VALUES ($1, 'direct', $2, 2)
         RETURNING *`,
        [uuid(), currentUserId],
      );
      await pool.query(
        `INSERT INTO chat_members (chat_id, user_id, role)
         VALUES ($1, $2, 'member'), ($1, $3, 'member')
         ON CONFLICT DO NOTHING`,
        [chat.rows[0].id, currentUserId, targetUserId],
      );

      await publishMemberJoined(kafka, req, chat.rows[0].id, currentUserId);
      await publishMemberJoined(kafka, req, chat.rows[0].id, targetUserId);
      res.status(201).json({ success: true, data: chat.rows[0] });
    } catch (err) { next(err); }
  });

  r.post('/groups', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = userIdFrom(req);
      const { name, avatar, avatarUrl } = req.body || {};
      if (!name || String(name).trim().length < 2) throw new ValidationError('Group name is required');

      const chat = await pool.query(
        `INSERT INTO chats (id, type, name, avatar_url, created_by, members_count)
         VALUES ($1, 'group', $2, $3, $4, 1)
         RETURNING *`,
        [uuid(), String(name).trim(), avatarUrl || avatar || null, userId],
      );
      await pool.query(
        `INSERT INTO chat_members (chat_id, user_id, role) VALUES ($1, $2, 'owner')
         ON CONFLICT DO NOTHING`,
        [chat.rows[0].id, userId],
      );
      await publishMemberJoined(kafka, req, chat.rows[0].id, userId);
      res.status(201).json({ success: true, data: chat.rows[0] });
    } catch (err) { next(err); }
  });

  r.post('/groups/:id/members', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const currentUserId = userIdFrom(req);
      const chatId = req.params.id;
      await requireAdmin(chatId, currentUserId);
      const ids = Array.isArray(req.body?.userIds) ? req.body.userIds : [req.body?.userId].filter(Boolean);
      if (ids.length === 0) throw new ValidationError('userId is required');

      const added: string[] = [];
      for (const userId of ids) {
        const banned = await pool.query('SELECT 1 FROM chat_bans WHERE chat_id = $1 AND user_id = $2', [chatId, userId]);
        if (banned.rows[0]) continue; // banned users must be unbanned before re-adding
        await pool.query(
          `INSERT INTO chat_members (chat_id, user_id, role) VALUES ($1, $2, 'member')
           ON CONFLICT DO NOTHING`,
          [chatId, userId],
        );
        await publishMemberJoined(kafka, req, chatId, userId);
        added.push(userId);
      }
      await refreshMembersCount(chatId);
      res.status(201).json({ success: true, data: { chatId, added } });
    } catch (err) { next(err); }
  });

  r.delete('/groups/:id/members/:userId', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const currentUserId = userIdFrom(req);
      const chatId = req.params.id;
      const userId = req.params.userId;
      await requireAdmin(chatId, currentUserId);
      await pool.query("DELETE FROM chat_members WHERE chat_id = $1 AND user_id = $2 AND role <> 'owner'", [chatId, userId]);
      await refreshMembersCount(chatId);
      await publishMemberLeft(kafka, req, chatId, userId);
      res.json({ success: true, data: { chatId, removed: userId } });
    } catch (err) { next(err); }
  });

  r.get('/groups/:id/members', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = userIdFrom(req);
      const chatId = req.params.id;
      await requireMember(chatId, userId);
      const rows = await pool.query(
        `SELECT cm.user_id, cm.role, cm.joined_at, u.username, u.display_name, u.avatar_url, u.is_online
         FROM chat_members cm
         JOIN users u ON u.id = cm.user_id
         WHERE cm.chat_id = $1
         ORDER BY cm.role, u.display_name, u.username`,
        [chatId],
      );
      res.json({ success: true, data: rows.rows });
    } catch (err) { next(err); }
  });

  // ── Change a member's role (owner promotes/demotes admins) ──
  r.patch('/groups/:id/members/:userId/role', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const currentUserId = userIdFrom(req);
      const chatId = req.params.id;
      const targetUserId = req.params.userId;
      const role = req.body?.role;
      if (!['admin', 'member'].includes(role)) throw new ValidationError('role must be "admin" or "member"');

      const me = await pool.query('SELECT role FROM chat_members WHERE chat_id = $1 AND user_id = $2', [chatId, currentUserId]);
      if (me.rows[0]?.role !== 'owner') throw new ForbiddenError('Only the owner can change roles');
      if (targetUserId === currentUserId) throw new ValidationError('Cannot change your own role');

      const row = await pool.query(
        `UPDATE chat_members SET role = $3
         WHERE chat_id = $1 AND user_id = $2 AND role <> 'owner'
         RETURNING user_id, role`,
        [chatId, targetUserId, role],
      );
      if (!row.rows[0]) throw new ValidationError('Member not found');
      res.json({ success: true, data: { chatId, userId: targetUserId, role } });
    } catch (err) { next(err); }
  });

  // ── Leave a group/channel (owner must transfer ownership first) ──
  r.post('/chats/:id/leave', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = userIdFrom(req);
      const chatId = req.params.id;
      await requireMember(chatId, userId);
      const me = await pool.query('SELECT role FROM chat_members WHERE chat_id = $1 AND user_id = $2', [chatId, userId]);
      if (me.rows[0]?.role === 'owner') {
        throw new ValidationError('Owner cannot leave the chat. Transfer ownership first.');
      }
      await pool.query('DELETE FROM chat_members WHERE chat_id = $1 AND user_id = $2', [chatId, userId]);
      await refreshMembersCount(chatId);
      await publishMemberLeft(kafka, req, chatId, userId);
      res.json({ success: true, data: { chatId } });
    } catch (err) { next(err); }
  });

  // ── Edit chat info: name/description/avatar (admins of groups/channels) ──
  r.patch('/chats/:id', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = userIdFrom(req);
      const chatId = req.params.id;
      const chat = await pool.query('SELECT type FROM chats WHERE id = $1', [chatId]);
      if (!chat.rows[0]) throw new ValidationError('Chat not found');
      if (!['group', 'channel'].includes(chat.rows[0].type)) {
        throw new ValidationError('Only groups and channels can be edited');
      }
      await requireAdmin(chatId, userId);
      const { name, description, avatarUrl } = req.body || {};
      if (name !== undefined && String(name).trim().length < 2) {
        throw new ValidationError('Name must be at least 2 characters');
      }
      const row = await pool.query(
        `UPDATE chats SET
           name = COALESCE($2, name),
           description = COALESCE($3, description),
           avatar_url = COALESCE($4, avatar_url)
         WHERE id = $1 RETURNING *`,
        [
          chatId,
          name !== undefined ? String(name).trim() : null,
          description !== undefined ? String(description) : null,
          avatarUrl !== undefined ? String(avatarUrl) : null,
        ],
      );
      res.json({ success: true, data: row.rows[0] });
    } catch (err) { next(err); }
  });

  r.post('/channels', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = userIdFrom(req);
      const { name, description, username, isPublic } = req.body || {};
      if (!name || String(name).trim().length < 2) throw new ValidationError('Channel name is required');

      const handle = username ? String(username).toLowerCase() : null;
      if (handle && !/^[a-z0-9_]{3,32}$/.test(handle)) {
        throw new ValidationError('username must be 3-32 characters: a-z, 0-9, _');
      }
      if (handle) {
        const taken = await pool.query('SELECT 1 FROM chats WHERE username = $1', [handle]);
        if (taken.rows[0]) throw new ValidationError('Username is already taken');
      }

      const chat = await pool.query(
        `INSERT INTO chats (id, type, name, description, username, is_public, created_by, members_count)
         VALUES ($1, 'channel', $2, $3, $4, $5, $6, 1)
         RETURNING *`,
        [uuid(), String(name).trim(), description || null, handle, isPublic !== false, userId],
      );
      await pool.query(
        `INSERT INTO chat_members (chat_id, user_id, role) VALUES ($1, $2, 'owner')
         ON CONFLICT DO NOTHING`,
        [chat.rows[0].id, userId],
      );
      await publishMemberJoined(kafka, req, chat.rows[0].id, userId);
      res.status(201).json({ success: true, data: chat.rows[0] });
    } catch (err) { next(err); }
  });

  r.post('/channels/:id/members', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const currentUserId = userIdFrom(req);
      const chatId = req.params.id;
      await requireAdmin(chatId, currentUserId);
      const ids = Array.isArray(req.body?.userIds) ? req.body.userIds : [req.body?.userId].filter(Boolean);
      const role = req.body?.role === 'admin' ? 'admin' : 'member';
      if (ids.length === 0) throw new ValidationError('userId is required');

      for (const userId of ids) {
        await pool.query(
          `INSERT INTO chat_members (chat_id, user_id, role) VALUES ($1, $2, $3)
           ON CONFLICT (chat_id, user_id) DO UPDATE SET role = EXCLUDED.role`,
          [chatId, userId, role],
        );
        await publishMemberJoined(kafka, req, chatId, userId);
      }
      await refreshMembersCount(chatId);
      res.status(201).json({ success: true, data: { chatId, added: ids, role } });
    } catch (err) { next(err); }
  });

  // ── Discover public channels (registered before /channels/:id) ──
  r.get('/channels/discover', async (req: Request, res: Response, next: NextFunction) => {
    try {
      userIdFrom(req);
      const q = String(req.query.q || '').trim();
      const like = `%${q}%`;
      const rows = await pool.query(
        `SELECT id, type, name, username, description, avatar_url, members_count, created_at
         FROM chats
         WHERE type = 'channel' AND is_public = true
           AND ($1 = '%%' OR name ILIKE $1 OR username ILIKE $1 OR description ILIKE $1)
         ORDER BY members_count DESC, created_at DESC
         LIMIT 30`,
        [like],
      );
      res.json({ success: true, data: rows.rows });
    } catch (err) { next(err); }
  });

  // ── Subscribe to a public channel ──
  r.post('/channels/:id/join', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = userIdFrom(req);
      const chatId = req.params.id;
      const chat = await pool.query("SELECT id, is_public FROM chats WHERE id = $1 AND type = 'channel'", [chatId]);
      if (!chat.rows[0]) throw new ValidationError('Channel not found');
      if (!chat.rows[0].is_public) throw new ForbiddenError('Channel is private');
      const ban = await pool.query('SELECT 1 FROM chat_bans WHERE chat_id = $1 AND user_id = $2', [chatId, userId]);
      if (ban.rows[0]) throw new ForbiddenError('You are banned from this channel');
      await pool.query(
        `INSERT INTO chat_members (chat_id, user_id, role) VALUES ($1, $2, 'member')
         ON CONFLICT DO NOTHING`,
        [chatId, userId],
      );
      await refreshMembersCount(chatId);
      await publishMemberJoined(kafka, req, chatId, userId);
      res.status(201).json({ success: true, data: { chatId } });
    } catch (err) { next(err); }
  });

  r.get('/channels/:id', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = userIdFrom(req);
      const chatId = req.params.id;
      await requireMember(chatId, userId);
      const row = await pool.query("SELECT * FROM chats WHERE id = $1 AND type = 'channel'", [chatId]);
      if (!row.rows[0]) throw new ValidationError('Channel not found');
      res.json({ success: true, data: row.rows[0] });
    } catch (err) { next(err); }
  });

  // ─── Chat Folders (Telegram-style) ──────────────────────────

  r.get('/folders', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = userIdFrom(req);
      const folders = await pool.query(
        `SELECT f.id, f.name, f.emoji, f.position, f.created_at,
                COALESCE(json_agg(fi.chat_id) FILTER (WHERE fi.chat_id IS NOT NULL), '[]') AS chat_ids
         FROM chat_folders f
         LEFT JOIN chat_folder_items fi ON fi.folder_id = f.id
         WHERE f.user_id = $1
         GROUP BY f.id
         ORDER BY f.position ASC, f.created_at ASC`,
        [userId],
      );
      res.json({ success: true, data: folders.rows });
    } catch (err) { next(err); }
  });

  r.post('/folders', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = userIdFrom(req);
      const { name, emoji } = req.body || {};
      if (!name || typeof name !== 'string' || name.trim().length < 1 || name.trim().length > 32) {
        throw new ValidationError('Folder name must be 1-32 characters');
      }
      const count = await pool.query('SELECT COUNT(*)::int AS n FROM chat_folders WHERE user_id = $1', [userId]);
      if (count.rows[0].n >= 20) throw new ValidationError('Folder limit reached (20)');
      const row = await pool.query(
        `INSERT INTO chat_folders (id, user_id, name, emoji, position)
         VALUES ($1, $2, $3, $4, COALESCE((SELECT MAX(position) + 1 FROM chat_folders WHERE user_id = $2), 0))
         RETURNING *`,
        [uuid(), userId, name.trim(), typeof emoji === 'string' ? emoji.slice(0, 16) : null],
      );
      res.status(201).json({ success: true, data: row.rows[0] });
    } catch (err) { next(err); }
  });

  r.patch('/folders/:id', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = userIdFrom(req);
      const { name, emoji, position } = req.body || {};
      if (name !== undefined && (typeof name !== 'string' || name.trim().length < 1 || name.trim().length > 32)) {
        throw new ValidationError('Folder name must be 1-32 characters');
      }
      const row = await pool.query(
        `UPDATE chat_folders
         SET name = COALESCE($3, name),
             emoji = COALESCE($4, emoji),
             position = COALESCE($5, position)
         WHERE id = $1 AND user_id = $2
         RETURNING *`,
        [
          req.params.id,
          userId,
          name !== undefined ? String(name).trim() : null,
          typeof emoji === 'string' ? emoji.slice(0, 16) : null,
          Number.isInteger(position) ? position : null,
        ],
      );
      if (!row.rows[0]) throw new ValidationError('Folder not found');
      res.json({ success: true, data: row.rows[0] });
    } catch (err) { next(err); }
  });

  r.delete('/folders/:id', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = userIdFrom(req);
      const row = await pool.query(
        'DELETE FROM chat_folders WHERE id = $1 AND user_id = $2 RETURNING id',
        [req.params.id, userId],
      );
      if (!row.rows[0]) throw new ValidationError('Folder not found');
      res.json({ success: true, data: { id: req.params.id } });
    } catch (err) { next(err); }
  });

  r.put('/folders/:id/chats', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = userIdFrom(req);
      const folderId = req.params.id;
      const chatIds = Array.isArray(req.body?.chatIds) ? req.body.chatIds.slice(0, 200).map(String) : [];
      const folder = await pool.query('SELECT id FROM chat_folders WHERE id = $1 AND user_id = $2', [folderId, userId]);
      if (!folder.rows[0]) throw new ValidationError('Folder not found');

      await pool.query('DELETE FROM chat_folder_items WHERE folder_id = $1', [folderId]);
      if (chatIds.length > 0) {
        // Only chats the user is actually a member of can be added
        await pool.query(
          `INSERT INTO chat_folder_items (folder_id, chat_id)
           SELECT $1, cm.chat_id FROM chat_members cm
           WHERE cm.user_id = $2 AND cm.chat_id = ANY($3::uuid[])
           ON CONFLICT DO NOTHING`,
          [folderId, userId, chatIds],
        );
      }
      const items = await pool.query('SELECT chat_id FROM chat_folder_items WHERE folder_id = $1', [folderId]);
      res.json({ success: true, data: { folderId, chatIds: items.rows.map((row) => row.chat_id) } });
    } catch (err) { next(err); }
  });

  r.get('/messages', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = userIdFrom(req);
      const chatId = String(req.query.chatId || '');
      if (!chatId) throw new ValidationError('chatId is required');
      await requireMember(chatId, userId);
      const limit = Math.min(Number(req.query.limit) || 50, 100);
      const before = req.query.before ? new Date(String(req.query.before)) : null;
      if (before && Number.isNaN(before.getTime())) {
        throw new ValidationError('before must be a valid ISO date');
      }

      const rows = before
        ? await pool.query(
            `SELECT m.*, u.display_name AS sender_name
             FROM messages m
             LEFT JOIN users u ON u.id = m.sender_id
             WHERE m.chat_id = $1 AND m.is_deleted = false
               AND (m.expires_at IS NULL OR m.expires_at > NOW())
               AND NOT EXISTS (
                 SELECT 1 FROM message_hidden mh
                 WHERE mh.message_id = m.id AND mh.user_id = $4
               )
               AND m.created_at < $3
             ORDER BY m.created_at DESC
             LIMIT $2`,
            [chatId, limit, before.toISOString(), userId],
          )
        : await pool.query(
            `SELECT m.*, u.display_name AS sender_name
             FROM messages m
             LEFT JOIN users u ON u.id = m.sender_id
             WHERE m.chat_id = $1 AND m.is_deleted = false
               AND (m.expires_at IS NULL OR m.expires_at > NOW())
               AND NOT EXISTS (
                 SELECT 1 FROM message_hidden mh
                 WHERE mh.message_id = m.id AND mh.user_id = $3
               )
             ORDER BY m.created_at DESC
             LIMIT $2`,
            [chatId, limit, userId],
          );

      const messages = await attachFiles(rows.rows.reverse());
      const nextCursor = rows.rows.length === limit && messages.length > 0 ? messages[0].created_at : null;
      res.json({ success: true, data: messages, meta: { limit, nextCursor } });
    } catch (err) { next(err); }
  });

  r.post('/messages', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = userIdFrom(req);
      const { chatId, content, type = 'text', replyToId, attachments = [], clientMessageId } = req.body;
      if (!chatId || typeof content !== 'string') {
        throw new ValidationError('chatId and content are required');
      }
      if (content.length > 4096) {
        throw new ValidationError('Message content must be at most 4096 characters');
      }
      if (
        clientMessageId !== undefined && clientMessageId !== null &&
        !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(clientMessageId))
      ) {
        throw new ValidationError('clientMessageId must be a UUID');
      }
      const attachmentList = (Array.isArray(attachments) ? attachments : []).slice(0, 10);
      for (const attachment of attachmentList) {
        if (!attachment?.url) continue;
        const attachmentUrl = String(attachment.url);
        // SECURITY: only allow http(s) URLs to prevent javascript:/data: injection
        if (!/^https?:\/\//i.test(attachmentUrl) || attachmentUrl.length > 2048) {
          throw new ValidationError('Attachment URLs must be valid http(s) links');
        }
      }
      await requireMember(chatId, userId);

      const chatRow = await pool.query('SELECT type, message_ttl_seconds, slow_mode_seconds FROM chats WHERE id = $1', [chatId]);
      // Channels are broadcast-only: subscribers read, only owner/admins post
      if (chatRow.rows[0]?.type === 'channel') {
        await requireAdmin(chatId, userId);
      }

      // Secret chats accept only E2E ciphertext: the server never sees plaintext.
      // The client encrypts with Double Ratchet keys and sends the IV/envelope alongside.
      const { contentIv, keyEnvelope } = req.body || {};
      const isSecretChat = chatRow.rows[0]?.type === 'secret';
      if (isSecretChat) {
        if (typeof contentIv !== 'string' || contentIv.length === 0 || contentIv.length > 256) {
          throw new ValidationError('Secret chat messages require contentIv (E2E encryption envelope)');
        }
        if (attachmentList.length > 0) {
          throw new ValidationError('Plain attachments are not allowed in secret chats');
        }
      }

      // Restricted (muted) members cannot send until muted_until passes
      const membership = await pool.query(
        'SELECT role, muted_until FROM chat_members WHERE chat_id = $1 AND user_id = $2',
        [chatId, userId],
      );
      const me = membership.rows[0];
      const isPrivileged = Boolean(me && ['owner', 'admin'].includes(me.role));
      if (me?.muted_until && new Date(me.muted_until).getTime() > Date.now() && !isPrivileged) {
        throw new ForbiddenError('You are restricted from sending messages in this chat');
      }

      // Slow mode: non-admin members must wait between messages
      const slowMode = Number(chatRow.rows[0]?.slow_mode_seconds) || 0;
      if (slowMode > 0 && !isPrivileged) {
        const lastMessage = await pool.query(
          'SELECT created_at FROM messages WHERE chat_id = $1 AND sender_id = $2 ORDER BY created_at DESC LIMIT 1',
          [chatId, userId],
        );
        if (lastMessage.rows[0]) {
          const elapsed = (Date.now() - new Date(lastMessage.rows[0].created_at).getTime()) / 1000;
          if (elapsed < slowMode) {
            throw new ValidationError(`Slow mode is enabled. Wait ${Math.ceil(slowMode - elapsed)}s before sending again`);
          }
        }
      }

      // Disappearing messages: honor the chat's message TTL when configured
      const ttlSeconds = Number(chatRow.rows[0]?.message_ttl_seconds) || null;
      const expiresAt = ttlSeconds ? new Date(Date.now() + ttlSeconds * 1000).toISOString() : null;

      const messageType = attachmentList.length > 0 && type === 'text' ? fileKind(attachmentList[0]) : type;
      // Dedup/replay protection: the same (chat, sender, clientMessageId) is inserted only once.
      const row = await pool.query(
        `INSERT INTO messages (id, chat_id, sender_id, content, type, reply_to_id, ttl_seconds, expires_at, client_message_id, content_iv, key_envelope)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
         ON CONFLICT (chat_id, sender_id, client_message_id) WHERE client_message_id IS NOT NULL DO NOTHING
         RETURNING *`,
        [
          uuid(), chatId, userId, content, messageType, replyToId || null, ttlSeconds, expiresAt, clientMessageId || null,
          isSecretChat ? contentIv : null,
          isSecretChat && keyEnvelope ? JSON.stringify(keyEnvelope) : null,
        ],
      );
      if (!row.rows[0]) {
        // Duplicate delivery (retry or replay) — return the original message,
        // do not attach files again and do not publish a second event.
        const existing = await pool.query(
          'SELECT * FROM messages WHERE chat_id = $1 AND sender_id = $2 AND client_message_id = $3',
          [chatId, userId, clientMessageId],
        );
        const duplicate = (await attachFiles([existing.rows[0]]))[0];
        return res.json({ success: true, data: duplicate, meta: { deduplicated: true } });
      }
      let message = row.rows[0];

      for (const attachment of attachmentList) {
        if (!attachment?.url) continue;
        await pool.query(
          `INSERT INTO files (id, message_id, uploader_id, url, type, mime_type, size_bytes, width, height, duration_seconds, file_name)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
          [
            attachment.id || uuid(),
            message.id,
            userId,
            attachment.url,
            fileKind(attachment),
            attachment.mimeType || attachment.mime_type || null,
            attachment.sizeBytes || attachment.size_bytes || attachment.fileSize || 0,
            attachment.width || null,
            attachment.height || null,
            attachment.durationSeconds || attachment.duration || null,
            attachment.fileName || attachment.file_name || null,
          ],
        );
      }

      message = (await attachFiles([message]))[0];

      await kafka.publish({
        id: uuid(),
        type: EventType.MESSAGE_SENT,
        topic: EventTopic.MESSAGE_EVENTS,
        timestamp: new Date().toISOString(),
        source: 'messaging-core-service',
        correlationId: req.correlationId || uuid(),
        userId: userId as UserId,
        payload: {
          chatId,
          ...message,
        },
      });

      res.status(201).json({ success: true, data: message });
    } catch (err) { next(err); }
  });

  r.post('/messages/forward', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = userIdFrom(req);
      const { messageId, toChatId } = req.body || {};
      if (!messageId || !toChatId) throw new ValidationError('messageId and toChatId are required');

      const original = await pool.query(
        'SELECT * FROM messages WHERE id = $1 AND is_deleted = false',
        [messageId],
      );
      if (!original.rows[0]) throw new ValidationError('Message not found');

      // Telegram behavior: secret chat content cannot leave the secret chat,
      // and plaintext cannot be forwarded into an E2E chat
      const chatTypes = await pool.query(
        'SELECT id, type FROM chats WHERE id = ANY($1::uuid[])',
        [[original.rows[0].chat_id, toChatId]],
      );
      if (chatTypes.rows.some((chat) => chat.type === 'secret')) {
        throw new ForbiddenError('Forwarding is not allowed for secret chats');
      }

      // Must be a member of both the source and the target chat
      await requireMember(original.rows[0].chat_id, userId);
      await requireMember(toChatId, userId);

      const newId = uuid();
      const row = await pool.query(
        `INSERT INTO messages (id, chat_id, sender_id, content, type, forward_from_id, forward_from_chat_id)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         RETURNING *`,
        [newId, toChatId, userId, original.rows[0].content, original.rows[0].type, messageId, original.rows[0].chat_id],
      );

      // Copy attachments (same URLs, new file rows)
      await pool.query(
        `INSERT INTO files (id, message_id, uploader_id, url, type, mime_type, size_bytes, width, height, duration_seconds, file_name)
         SELECT gen_random_uuid(), $2, uploader_id, url, type, mime_type, size_bytes, width, height, duration_seconds, file_name
         FROM files WHERE message_id = $1`,
        [messageId, newId],
      );

      const message = (await attachFiles([row.rows[0]]))[0];

      await kafka.publish({
        id: uuid(),
        type: EventType.MESSAGE_FORWARDED,
        topic: EventTopic.MESSAGE_EVENTS,
        timestamp: new Date().toISOString(),
        source: 'messaging-core-service',
        correlationId: req.correlationId || uuid(),
        userId: userId as UserId,
        payload: {
          chatId: toChatId,
          ...message,
        },
      });

      res.status(201).json({ success: true, data: message });
    } catch (err) { next(err); }
  });

  r.patch('/chats/:id/ttl', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = userIdFrom(req);
      const chatId = req.params.id;
      const raw = req.body?.ttlSeconds;
      const ttl = raw === null || raw === undefined || raw === 0 ? null : Number(raw);
      if (ttl !== null && (!Number.isInteger(ttl) || ttl < 30 || ttl > 31536000)) {
        throw new ValidationError('ttlSeconds must be null or an integer between 30 and 31536000');
      }

      const chat = await pool.query('SELECT type FROM chats WHERE id = $1', [chatId]);
      if (!chat.rows[0]) throw new ValidationError('Chat not found');
      if (['group', 'channel'].includes(chat.rows[0].type)) {
        await requireAdmin(chatId, userId);
      } else {
        await requireMember(chatId, userId);
      }

      const row = await pool.query(
        'UPDATE chats SET message_ttl_seconds = $2 WHERE id = $1 RETURNING *',
        [chatId, ttl],
      );
      res.json({ success: true, data: row.rows[0] });
    } catch (err) { next(err); }
  });

  r.post('/messages/read', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = userIdFrom(req);
      const { chatId, messageIds } = req.body || {};
      if (!chatId || !Array.isArray(messageIds) || messageIds.length === 0) {
        throw new ValidationError('chatId and messageIds are required');
      }
      await requireMember(chatId, userId);
      const ids = messageIds.slice(0, 100).map(String);

      await pool.query(
        `INSERT INTO message_reads (message_id, user_id)
         SELECT m.id, $2 FROM messages m
         WHERE m.id = ANY($1::uuid[]) AND m.chat_id = $3
         ON CONFLICT DO NOTHING`,
        [ids, userId, chatId],
      );

      await kafka.publish({
        id: uuid(),
        type: EventType.MESSAGE_READ,
        topic: EventTopic.MESSAGE_EVENTS,
        timestamp: new Date().toISOString(),
        source: 'messaging-core-service',
        correlationId: req.correlationId || uuid(),
        userId: userId as UserId,
        payload: { chatId, messageIds: ids, readBy: userId },
      });

      res.json({ success: true, data: { chatId, messageIds: ids } });
    } catch (err) { next(err); }
  });

  r.get('/search', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = userIdFrom(req);
      const q = String(req.query.q || '').trim();
      const type = String(req.query.type || 'messages');
      if (q.length < 1) return res.json({ success: true, data: [] });
      const like = `%${q}%`;

      if (type === 'users') {
        const rows = await pool.query(
          `SELECT id, username, display_name, avatar_url, bio, is_online
           FROM users
           WHERE username ILIKE $1 OR display_name ILIKE $1
           ORDER BY username LIMIT 20`,
          [like],
        );
        return res.json({ success: true, data: rows.rows });
      }

      if (type === 'groups' || type === 'channels') {
        const chatType = type === 'groups' ? 'group' : 'channel';
        const rows = await pool.query(
          `SELECT c.*
           FROM chats c
           JOIN chat_members cm ON cm.chat_id = c.id AND cm.user_id = $1
           WHERE c.type = $2 AND (c.name ILIKE $3 OR c.description ILIKE $3)
           ORDER BY c.name LIMIT 20`,
          [userId, chatType, like],
        );
        return res.json({ success: true, data: rows.rows });
      }

      const rows = await pool.query(
        `SELECT m.id AS message_id, m.chat_id, m.content, m.type, m.created_at, c.name AS chat_name
         FROM messages m
         JOIN chat_members cm ON cm.chat_id = m.chat_id AND cm.user_id = $1
         JOIN chats c ON c.id = m.chat_id
         WHERE m.is_deleted = false AND m.content ILIKE $2
           AND c.type <> 'secret'
         ORDER BY m.created_at DESC
         LIMIT 50`,
        [userId, like],
      );
      res.json({ success: true, data: rows.rows });
    } catch (err) { next(err); }
  });

  r.get('/stats/:chatId', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = userIdFrom(req);
      const chatId = req.params.chatId;
      await requireMember(chatId, userId);

      const chat = await pool.query('SELECT type, created_at FROM chats WHERE id = $1', [chatId]);
      if (!chat.rows[0]) throw new ValidationError('Chat not found');

      const messageStats = await pool.query(
        `SELECT
           COUNT(*)::int AS messages,
           COUNT(*) FILTER (WHERE type = 'voice' OR type = 'audio')::int AS voice
         FROM messages
         WHERE chat_id = $1 AND is_deleted = false`,
        [chatId],
      );
      const fileStats = await pool.query(
        `SELECT
           COUNT(*) FILTER (WHERE f.mime_type LIKE 'image/%')::int AS photos,
           COUNT(*) FILTER (WHERE f.mime_type LIKE 'video/%')::int AS videos,
           COUNT(*) FILTER (WHERE f.mime_type = 'application/pdf' OR f.type = 'file')::int AS files
         FROM files f
         JOIN messages m ON m.id = f.message_id
         WHERE m.chat_id = $1 AND m.is_deleted = false`,
        [chatId],
      );
      const memberStats = await pool.query(
        `SELECT
           COUNT(*)::int AS members,
           COUNT(*) FILTER (WHERE cm.role IN ('owner', 'admin'))::int AS admins,
           COUNT(*) FILTER (WHERE u.is_online = true)::int AS online
         FROM chat_members cm
         JOIN users u ON u.id = cm.user_id
         WHERE cm.chat_id = $1`,
        [chatId],
      );

      const isCommunity = chat.rows[0].type === 'group' || chat.rows[0].type === 'channel';
      res.json({
        success: true,
        data: {
          messages: messageStats.rows[0].messages,
          photos: fileStats.rows[0].photos,
          videos: fileStats.rows[0].videos,
          files: fileStats.rows[0].files,
          voice: messageStats.rows[0].voice,
          created_at: chat.rows[0].created_at,
          members: isCommunity ? memberStats.rows[0].members : 0,
          admins: isCommunity ? memberStats.rows[0].admins : 0,
          online: isCommunity ? memberStats.rows[0].online : 0,
        },
      });
    } catch (err) { next(err); }
  });

  r.patch('/messages/:id', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = userIdFrom(req);
      const { content } = req.body || {};
      if (typeof content !== 'string' || content.trim().length === 0 || content.length > 4096) {
        throw new ValidationError('content is required (max 4096 characters)');
      }
      const row = await pool.query(
        `UPDATE messages
         SET content = $3, is_edited = true, updated_at = NOW()
         WHERE id = $1 AND sender_id = $2 AND is_deleted = false
         RETURNING *`,
        [req.params.id, userId, content],
      );
      if (!row.rows[0]) throw new ValidationError('Message not found');
      const message = (await attachFiles([row.rows[0]]))[0];

      await kafka.publish({
        id: uuid(),
        type: EventType.MESSAGE_EDITED,
        topic: EventTopic.MESSAGE_EVENTS,
        timestamp: new Date().toISOString(),
        source: 'messaging-core-service',
        correlationId: req.correlationId || uuid(),
        userId: userId as UserId,
        payload: { chatId: message.chat_id, message },
      });

      res.json({ success: true, data: message });
    } catch (err) { next(err); }
  });

  r.patch('/messages/:id/pin', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = userIdFrom(req);
      const message = await pool.query('SELECT chat_id FROM messages WHERE id = $1', [req.params.id]);
      if (!message.rows[0]) throw new ValidationError('Message not found');
      const chatId = message.rows[0].chat_id;

      // In groups and channels only admins may pin; in direct/saved chats any member.
      const chat = await pool.query('SELECT type FROM chats WHERE id = $1', [chatId]);
      if (chat.rows[0] && ['group', 'channel'].includes(chat.rows[0].type)) {
        await requireAdmin(chatId, userId);
      } else {
        await requireMember(chatId, userId);
      }

      const row = await pool.query(
        'UPDATE messages SET is_pinned = NOT is_pinned WHERE id = $1 RETURNING *',
        [req.params.id],
      );

      await kafka.publish({
        id: uuid(),
        type: row.rows[0].is_pinned ? EventType.MESSAGE_PINNED : EventType.MESSAGE_UNPINNED,
        topic: EventTopic.MESSAGE_EVENTS,
        timestamp: new Date().toISOString(),
        source: 'messaging-core-service',
        correlationId: req.correlationId || uuid(),
        userId: userId as UserId,
        payload: { chatId, messageId: req.params.id, isPinned: row.rows[0].is_pinned, byUserId: userId },
      });

      res.json({ success: true, data: row.rows[0] });
    } catch (err) { next(err); }
  });

  r.delete('/messages/:id', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = userIdFrom(req);
      const existing = await pool.query(
        'SELECT chat_id, sender_id FROM messages WHERE id = $1 AND is_deleted = false',
        [req.params.id],
      );
      if (!existing.rows[0]) throw new ValidationError('Message not found');
      const chatId = existing.rows[0].chat_id;

      // Telegram-style "delete for me": hides the message only for this user
      const forMe = req.query.scope === 'me' || req.body?.forMe === true;
      if (forMe) {
        await requireMember(chatId, userId);
        await pool.query(
          'INSERT INTO message_hidden (message_id, user_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
          [req.params.id, userId],
        );
        return res.json({ success: true, data: { id: req.params.id, scope: 'me' } });
      }

      // Senders may delete their own messages; group/channel admins may delete any.
      if (existing.rows[0].sender_id !== userId) {
        await requireAdmin(chatId, userId);
      } else {
        await requireMember(chatId, userId);
      }

      await pool.query('UPDATE messages SET is_deleted = true WHERE id = $1', [req.params.id]);

      await kafka.publish({
        id: uuid(),
        type: EventType.MESSAGE_DELETED,
        topic: EventTopic.MESSAGE_EVENTS,
        timestamp: new Date().toISOString(),
        source: 'messaging-core-service',
        correlationId: req.correlationId || uuid(),
        userId: userId as UserId,
        payload: { chatId, messageId: req.params.id },
      });

      res.json({ success: true, data: { id: req.params.id } });
    } catch (err) { next(err); }
  });

  r.post('/reactions', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = userIdFrom(req);
      const { messageId, emoji } = req.body || {};
      if (!messageId || typeof emoji !== 'string' || emoji.length === 0 || emoji.length > 16) {
        throw new ValidationError('messageId and emoji are required');
      }
      const message = await pool.query(
        'SELECT chat_id FROM messages WHERE id = $1 AND is_deleted = false',
        [messageId],
      );
      if (!message.rows[0]) throw new ValidationError('Message not found');
      const chatId = message.rows[0].chat_id;
      await requireMember(chatId, userId);

      const existing = await pool.query(
        'SELECT 1 FROM reactions WHERE message_id = $1 AND user_id = $2 AND emoji = $3',
        [messageId, userId, emoji],
      );
      let added: boolean;
      if (existing.rows[0]) {
        await pool.query(
          'DELETE FROM reactions WHERE message_id = $1 AND user_id = $2 AND emoji = $3',
          [messageId, userId, emoji],
        );
        added = false;
      } else {
        await pool.query(
          'INSERT INTO reactions (message_id, user_id, emoji) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING',
          [messageId, userId, emoji],
        );
        added = true;
      }

      const counts = await pool.query(
        'SELECT emoji, COUNT(*)::int AS count FROM reactions WHERE message_id = $1 GROUP BY emoji ORDER BY count DESC',
        [messageId],
      );

      await kafka.publish({
        id: uuid(),
        type: added ? EventType.REACTION_ADDED : EventType.REACTION_REMOVED,
        topic: EventTopic.MESSAGE_EVENTS,
        timestamp: new Date().toISOString(),
        source: 'messaging-core-service',
        correlationId: req.correlationId || uuid(),
        userId: userId as UserId,
        payload: { chatId, messageId, emoji, userId, reactions: counts.rows },
      });

      res.json({ success: true, data: { messageId, emoji, added, reactions: counts.rows } });
    } catch (err) { next(err); }
  });

  r.get('/reactions/:messageId', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = userIdFrom(req);
      const message = await pool.query('SELECT chat_id FROM messages WHERE id = $1', [req.params.messageId]);
      if (!message.rows[0]) throw new ValidationError('Message not found');
      await requireMember(message.rows[0].chat_id, userId);
      const rows = await pool.query(
        `SELECT r.emoji, r.user_id, u.username, u.display_name
         FROM reactions r
         LEFT JOIN users u ON u.id = r.user_id
         WHERE r.message_id = $1
         ORDER BY r.created_at ASC`,
        [req.params.messageId],
      );
      res.json({ success: true, data: rows.rows });
    } catch (err) { next(err); }
  });

  // ─── Polls (Telegram-style, incl. quizzes) ──────────────────────

  async function findPoll(idOrMessageId: string): Promise<any> {
    const row = await pool.query('SELECT * FROM polls WHERE id = $1 OR message_id = $1', [idOrMessageId]);
    if (!row.rows[0]) throw new ValidationError('Poll not found');
    return row.rows[0];
  }

  async function pollResults(pollId: string): Promise<{ counts: Array<{ option_id: number; votes: number }>; totalVoters: number }> {
    const counts = await pool.query(
      `SELECT opt AS option_id, COUNT(*)::int AS votes
       FROM poll_votes, unnest(option_ids) AS opt
       WHERE poll_id = $1
       GROUP BY opt ORDER BY opt`,
      [pollId],
    );
    const total = await pool.query('SELECT COUNT(*)::int AS n FROM poll_votes WHERE poll_id = $1', [pollId]);
    return { counts: counts.rows, totalVoters: total.rows[0].n };
  }

  r.post('/polls', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = userIdFrom(req);
      const {
        chatId, question, options,
        isAnonymous = true, allowsMultiple = false, isQuiz = false,
        correctOption = null, closesInSeconds = null,
      } = req.body || {};
      if (!chatId || typeof question !== 'string' || question.trim().length < 1 || question.length > 300) {
        throw new ValidationError('chatId and question (1-300 characters) are required');
      }
      const opts = (Array.isArray(options) ? options : [])
        .map((option: unknown) => String(option).trim().slice(0, 100))
        .filter((option: string) => option.length > 0);
      if (opts.length < 2 || opts.length > 10) throw new ValidationError('Poll requires 2-10 options');
      if (isQuiz === true && (!Number.isInteger(correctOption) || correctOption < 0 || correctOption >= opts.length)) {
        throw new ValidationError('Quiz polls require a valid correctOption index');
      }
      if (closesInSeconds !== null && (!Number.isInteger(closesInSeconds) || closesInSeconds < 5 || closesInSeconds > 604800)) {
        throw new ValidationError('closesInSeconds must be an integer between 5 and 604800');
      }
      await requireMember(chatId, userId);
      const chat = await pool.query('SELECT type FROM chats WHERE id = $1', [chatId]);
      if (chat.rows[0]?.type === 'channel') await requireAdmin(chatId, userId);

      const messageId = uuid();
      const messageRow = await pool.query(
        `INSERT INTO messages (id, chat_id, sender_id, content, type)
         VALUES ($1, $2, $3, $4, 'poll') RETURNING *`,
        [messageId, chatId, userId, question.trim()],
      );
      const closesAt = closesInSeconds ? new Date(Date.now() + closesInSeconds * 1000).toISOString() : null;
      const poll = await pool.query(
        `INSERT INTO polls (id, message_id, chat_id, creator_id, question, options, is_anonymous, allows_multiple, is_quiz, correct_option, closes_at)
         VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7, $8, $9, $10, $11)
         RETURNING *`,
        [
          uuid(), messageId, chatId, userId, question.trim(),
          JSON.stringify(opts.map((text: string, id: number) => ({ id, text }))),
          isAnonymous !== false, allowsMultiple === true, isQuiz === true,
          isQuiz === true ? correctOption : null, closesAt,
        ],
      );

      await kafka.publish({
        id: uuid(),
        type: EventType.MESSAGE_SENT,
        topic: EventTopic.MESSAGE_EVENTS,
        timestamp: new Date().toISOString(),
        source: 'messaging-core-service',
        correlationId: req.correlationId || uuid(),
        userId: userId as UserId,
        payload: { chatId, ...messageRow.rows[0], poll: poll.rows[0] },
      });

      res.status(201).json({ success: true, data: { message: messageRow.rows[0], poll: poll.rows[0] } });
    } catch (err) { next(err); }
  });

  r.get('/polls/:id', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = userIdFrom(req);
      const poll = await findPoll(req.params.id);
      await requireMember(poll.chat_id, userId);
      const results = await pollResults(poll.id);
      const mine = await pool.query('SELECT option_ids FROM poll_votes WHERE poll_id = $1 AND user_id = $2', [poll.id, userId]);
      const hasVoted = Boolean(mine.rows[0]);
      // Quiz correct answer is revealed only after voting or once the poll is closed
      const exposeCorrect = !poll.is_quiz || hasVoted || poll.is_closed;
      res.json({
        success: true,
        data: {
          ...poll,
          correct_option: exposeCorrect ? poll.correct_option : null,
          ...results,
          myOptionIds: mine.rows[0]?.option_ids || [],
        },
      });
    } catch (err) { next(err); }
  });

  r.post('/polls/:id/vote', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = userIdFrom(req);
      const poll = await findPoll(req.params.id);
      await requireMember(poll.chat_id, userId);
      if (poll.is_closed || (poll.closes_at && new Date(poll.closes_at).getTime() <= Date.now())) {
        throw new ValidationError('Poll is closed');
      }
      const optionCount = Array.isArray(poll.options) ? poll.options.length : 0;
      const optionIds: number[] = [...new Set((Array.isArray(req.body?.optionIds) ? req.body.optionIds : []) as unknown[])]
        .filter((value): value is number => Number.isInteger(value) && (value as number) >= 0 && (value as number) < optionCount);
      if (optionIds.length === 0) throw new ValidationError('optionIds must contain valid option indexes');
      if (!poll.allows_multiple && optionIds.length !== 1) throw new ValidationError('This poll allows a single choice');

      if (poll.is_quiz) {
        const existing = await pool.query('SELECT 1 FROM poll_votes WHERE poll_id = $1 AND user_id = $2', [poll.id, userId]);
        if (existing.rows[0]) throw new ValidationError('Quiz answers cannot be changed');
      }

      await pool.query(
        `INSERT INTO poll_votes (poll_id, user_id, option_ids) VALUES ($1, $2, $3)
         ON CONFLICT (poll_id, user_id) DO UPDATE SET option_ids = EXCLUDED.option_ids, created_at = NOW()`,
        [poll.id, userId, optionIds],
      );
      const results = await pollResults(poll.id);

      await kafka.publish({
        id: uuid(),
        type: EventType.MESSAGE_EDITED,
        topic: EventTopic.MESSAGE_EVENTS,
        timestamp: new Date().toISOString(),
        source: 'messaging-core-service',
        correlationId: req.correlationId || uuid(),
        userId: userId as UserId,
        payload: { chatId: poll.chat_id, messageId: poll.message_id, poll: { ...poll, ...results } },
      });

      res.json({
        success: true,
        data: {
          pollId: poll.id,
          myOptionIds: optionIds,
          isCorrect: poll.is_quiz ? optionIds.includes(poll.correct_option) : null,
          ...results,
        },
      });
    } catch (err) { next(err); }
  });

  r.delete('/polls/:id/vote', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = userIdFrom(req);
      const poll = await findPoll(req.params.id);
      await requireMember(poll.chat_id, userId);
      if (poll.is_quiz) throw new ValidationError('Quiz answers cannot be retracted');
      if (poll.is_closed) throw new ValidationError('Poll is closed');
      await pool.query('DELETE FROM poll_votes WHERE poll_id = $1 AND user_id = $2', [poll.id, userId]);
      const results = await pollResults(poll.id);
      res.json({ success: true, data: { pollId: poll.id, ...results } });
    } catch (err) { next(err); }
  });

  r.post('/polls/:id/close', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = userIdFrom(req);
      const poll = await findPoll(req.params.id);
      await requireMember(poll.chat_id, userId);
      if (poll.creator_id !== userId) {
        await requireAdmin(poll.chat_id, userId);
      }
      const row = await pool.query('UPDATE polls SET is_closed = true WHERE id = $1 RETURNING *', [poll.id]);
      const results = await pollResults(poll.id);

      await kafka.publish({
        id: uuid(),
        type: EventType.MESSAGE_EDITED,
        topic: EventTopic.MESSAGE_EVENTS,
        timestamp: new Date().toISOString(),
        source: 'messaging-core-service',
        correlationId: req.correlationId || uuid(),
        userId: userId as UserId,
        payload: { chatId: poll.chat_id, messageId: poll.message_id, poll: { ...row.rows[0], ...results } },
      });

      res.json({ success: true, data: { ...row.rows[0], ...results } });
    } catch (err) { next(err); }
  });

  r.get('/polls/:id/voters', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = userIdFrom(req);
      const poll = await findPoll(req.params.id);
      await requireMember(poll.chat_id, userId);
      if (poll.is_anonymous) throw new ForbiddenError('This poll is anonymous');
      const rows = await pool.query(
        `SELECT pv.user_id, pv.option_ids, pv.created_at, u.username, u.display_name, u.avatar_url
         FROM poll_votes pv
         LEFT JOIN users u ON u.id = pv.user_id
         WHERE pv.poll_id = $1
         ORDER BY pv.created_at ASC`,
        [poll.id],
      );
      res.json({ success: true, data: rows.rows });
    } catch (err) { next(err); }
  });

  // ─── Invite links (Telegram-style) ───────────────────────────

  r.post('/chats/:id/invites', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = userIdFrom(req);
      const chatId = req.params.id;
      await requireAdmin(chatId, userId);
      const { expiresInSeconds = null, memberLimit = null } = req.body || {};
      if (expiresInSeconds !== null && (!Number.isInteger(expiresInSeconds) || expiresInSeconds < 60 || expiresInSeconds > 31536000)) {
        throw new ValidationError('expiresInSeconds must be an integer between 60 and 31536000');
      }
      if (memberLimit !== null && (!Number.isInteger(memberLimit) || memberLimit < 1 || memberLimit > 100000)) {
        throw new ValidationError('memberLimit must be an integer between 1 and 100000');
      }
      const code = uuid().replace(/-/g, '');
      const expiresAt = expiresInSeconds ? new Date(Date.now() + expiresInSeconds * 1000).toISOString() : null;
      const row = await pool.query(
        `INSERT INTO chat_invites (code, chat_id, created_by, expires_at, member_limit)
         VALUES ($1, $2, $3, $4, $5) RETURNING *`,
        [code, chatId, userId, expiresAt, memberLimit],
      );
      res.status(201).json({ success: true, data: { ...row.rows[0], link: `/invite/${code}` } });
    } catch (err) { next(err); }
  });

  r.get('/chats/:id/invites', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = userIdFrom(req);
      const chatId = req.params.id;
      await requireAdmin(chatId, userId);
      const rows = await pool.query(
        `SELECT * FROM chat_invites WHERE chat_id = $1 AND revoked = false ORDER BY created_at DESC`,
        [chatId],
      );
      res.json({ success: true, data: rows.rows.map((invite) => ({ ...invite, link: `/invite/${invite.code}` })) });
    } catch (err) { next(err); }
  });

  r.delete('/invites/:code', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = userIdFrom(req);
      const invite = await pool.query('SELECT * FROM chat_invites WHERE code = $1', [req.params.code]);
      if (!invite.rows[0]) throw new ValidationError('Invite not found');
      await requireAdmin(invite.rows[0].chat_id, userId);
      await pool.query('UPDATE chat_invites SET revoked = true WHERE code = $1', [req.params.code]);
      res.json({ success: true, data: { code: req.params.code, revoked: true } });
    } catch (err) { next(err); }
  });

  r.get('/invites/:code', async (req: Request, res: Response, next: NextFunction) => {
    try {
      userIdFrom(req);
      const rows = await pool.query(
        `SELECT i.code, i.expires_at, i.member_limit, i.uses, i.revoked,
                c.id AS chat_id, c.type, c.name, c.avatar_url, c.description, c.members_count
         FROM chat_invites i JOIN chats c ON c.id = i.chat_id
         WHERE i.code = $1`,
        [req.params.code],
      );
      const invite = rows.rows[0];
      if (!invite || invite.revoked) throw new ValidationError('Invite link is invalid or revoked');
      if (invite.expires_at && new Date(invite.expires_at).getTime() <= Date.now()) {
        throw new ValidationError('Invite link has expired');
      }
      res.json({ success: true, data: invite });
    } catch (err) { next(err); }
  });

  r.post('/invites/:code/join', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = userIdFrom(req);
      const rows = await pool.query('SELECT * FROM chat_invites WHERE code = $1', [req.params.code]);
      const invite = rows.rows[0];
      if (!invite || invite.revoked) throw new ValidationError('Invite link is invalid or revoked');
      if (invite.expires_at && new Date(invite.expires_at).getTime() <= Date.now()) {
        throw new ValidationError('Invite link has expired');
      }
      if (invite.member_limit !== null && invite.uses >= invite.member_limit) {
        throw new ValidationError('Invite link usage limit reached');
      }
      const ban = await pool.query('SELECT 1 FROM chat_bans WHERE chat_id = $1 AND user_id = $2', [invite.chat_id, userId]);
      if (ban.rows[0]) throw new ForbiddenError('You are banned from this chat');

      const inserted = await pool.query(
        `INSERT INTO chat_members (chat_id, user_id, role) VALUES ($1, $2, 'member')
         ON CONFLICT DO NOTHING RETURNING user_id`,
        [invite.chat_id, userId],
      );
      if (inserted.rows[0]) {
        await pool.query('UPDATE chat_invites SET uses = uses + 1 WHERE code = $1', [req.params.code]);
        await refreshMembersCount(invite.chat_id);
        await publishMemberJoined(kafka, req, invite.chat_id, userId);
      }
      res.status(201).json({ success: true, data: { chatId: invite.chat_id, joined: Boolean(inserted.rows[0]) } });
    } catch (err) { next(err); }
  });

  // ─── Bans & restrictions (Telegram-style moderation) ────────────

  r.post('/chats/:id/members/:userId/ban', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const currentUserId = userIdFrom(req);
      const chatId = req.params.id;
      const targetUserId = req.params.userId;
      if (targetUserId === currentUserId) throw new ValidationError('Cannot ban yourself');
      await requireAdmin(chatId, currentUserId);

      const target = await pool.query('SELECT role FROM chat_members WHERE chat_id = $1 AND user_id = $2', [chatId, targetUserId]);
      const me = await pool.query('SELECT role FROM chat_members WHERE chat_id = $1 AND user_id = $2', [chatId, currentUserId]);
      if (target.rows[0]?.role === 'owner') throw new ForbiddenError('Cannot ban the owner');
      if (target.rows[0]?.role === 'admin' && me.rows[0]?.role !== 'owner') {
        throw new ForbiddenError('Only the owner can ban admins');
      }

      const reason = typeof req.body?.reason === 'string' ? req.body.reason.slice(0, 500) : null;
      await pool.query(
        `INSERT INTO chat_bans (chat_id, user_id, banned_by, reason) VALUES ($1, $2, $3, $4)
         ON CONFLICT (chat_id, user_id) DO UPDATE SET banned_by = EXCLUDED.banned_by, reason = EXCLUDED.reason, created_at = NOW()`,
        [chatId, targetUserId, currentUserId, reason],
      );
      await pool.query('DELETE FROM chat_members WHERE chat_id = $1 AND user_id = $2', [chatId, targetUserId]);
      await refreshMembersCount(chatId);
      await publishMemberLeft(kafka, req, chatId, targetUserId);
      res.json({ success: true, data: { chatId, userId: targetUserId, banned: true } });
    } catch (err) { next(err); }
  });

  r.delete('/chats/:id/members/:userId/ban', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const currentUserId = userIdFrom(req);
      const chatId = req.params.id;
      await requireAdmin(chatId, currentUserId);
      await pool.query('DELETE FROM chat_bans WHERE chat_id = $1 AND user_id = $2', [chatId, req.params.userId]);
      res.json({ success: true, data: { chatId, userId: req.params.userId, banned: false } });
    } catch (err) { next(err); }
  });

  r.get('/chats/:id/bans', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const currentUserId = userIdFrom(req);
      const chatId = req.params.id;
      await requireAdmin(chatId, currentUserId);
      const rows = await pool.query(
        `SELECT b.user_id, b.banned_by, b.reason, b.created_at, u.username, u.display_name, u.avatar_url
         FROM chat_bans b LEFT JOIN users u ON u.id = b.user_id
         WHERE b.chat_id = $1 ORDER BY b.created_at DESC`,
        [chatId],
      );
      res.json({ success: true, data: rows.rows });
    } catch (err) { next(err); }
  });

  r.patch('/chats/:id/members/:userId/restrict', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const currentUserId = userIdFrom(req);
      const chatId = req.params.id;
      const targetUserId = req.params.userId;
      await requireAdmin(chatId, currentUserId);

      const target = await pool.query('SELECT role FROM chat_members WHERE chat_id = $1 AND user_id = $2', [chatId, targetUserId]);
      if (!target.rows[0]) throw new ValidationError('Member not found');
      if (['owner', 'admin'].includes(target.rows[0].role)) throw new ForbiddenError('Cannot restrict admins');

      const raw = req.body?.mutedForSeconds;
      const seconds = raw === null || raw === undefined || raw === 0 ? null : Number(raw);
      if (seconds !== null && (!Number.isInteger(seconds) || seconds < 30 || seconds > 31536000)) {
        throw new ValidationError('mutedForSeconds must be null or an integer between 30 and 31536000');
      }
      const mutedUntil = seconds ? new Date(Date.now() + seconds * 1000).toISOString() : null;
      const row = await pool.query(
        'UPDATE chat_members SET muted_until = $3 WHERE chat_id = $1 AND user_id = $2 RETURNING user_id, muted_until',
        [chatId, targetUserId, mutedUntil],
      );

      await kafka.publish({
        id: uuid(),
        type: EventType.MEMBER_ROLE_CHANGED,
        topic: EventTopic.CHAT_EVENTS,
        timestamp: new Date().toISOString(),
        source: 'messaging-core-service',
        correlationId: req.correlationId || uuid(),
        userId: currentUserId as UserId,
        payload: { chatId, userId: targetUserId, mutedUntil: row.rows[0].muted_until },
      });

      res.json({ success: true, data: { chatId, userId: targetUserId, mutedUntil: row.rows[0].muted_until } });
    } catch (err) { next(err); }
  });

  // ─── Slow mode (Telegram-style) ──────────────────────────────

  r.patch('/chats/:id/slowmode', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = userIdFrom(req);
      const chatId = req.params.id;
      const seconds = Number(req.body?.seconds);
      if (!Number.isInteger(seconds) || seconds < 0 || seconds > 21600) {
        throw new ValidationError('seconds must be an integer between 0 and 21600');
      }
      const chat = await pool.query('SELECT type FROM chats WHERE id = $1', [chatId]);
      if (!chat.rows[0]) throw new ValidationError('Chat not found');
      if (chat.rows[0].type !== 'group') throw new ValidationError('Slow mode is only available in groups');
      await requireAdmin(chatId, userId);

      const row = await pool.query('UPDATE chats SET slow_mode_seconds = $2 WHERE id = $1 RETURNING *', [chatId, seconds]);

      await kafka.publish({
        id: uuid(),
        type: EventType.CHAT_UPDATED,
        topic: EventTopic.CHAT_EVENTS,
        timestamp: new Date().toISOString(),
        source: 'messaging-core-service',
        correlationId: req.correlationId || uuid(),
        userId: userId as UserId,
        payload: { chatId, slowModeSeconds: seconds },
      });

      res.json({ success: true, data: row.rows[0] });
    } catch (err) { next(err); }
  });

  // ─── Secret chats (E2E encrypted, Telegram-style) ───────────────

  r.post('/secret-chats', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = userIdFrom(req);
      const { targetUserId } = req.body || {};
      if (!targetUserId || targetUserId === userId) throw new ValidationError('Valid targetUserId is required');
      const target = await pool.query('SELECT id FROM users WHERE id = $1', [targetUserId]);
      if (!target.rows[0]) throw new ValidationError('User not found');

      const existing = await pool.query(
        `SELECT c.*
         FROM chats c
         JOIN chat_members a ON a.chat_id = c.id AND a.user_id = $1
         JOIN chat_members b ON b.chat_id = c.id AND b.user_id = $2
         WHERE c.type = 'secret'
         LIMIT 1`,
        [userId, targetUserId],
      );
      if (existing.rows[0]) {
        return res.json({ success: true, data: existing.rows[0] });
      }

      const chat = await pool.query(
        `INSERT INTO chats (id, type, created_by, members_count)
         VALUES ($1, 'secret', $2, 2)
         RETURNING *`,
        [uuid(), userId],
      );
      await pool.query(
        `INSERT INTO chat_members (chat_id, user_id, role)
         VALUES ($1, $2, 'member'), ($1, $3, 'member')
         ON CONFLICT DO NOTHING`,
        [chat.rows[0].id, userId, targetUserId],
      );

      await publishMemberJoined(kafka, req, chat.rows[0].id, userId);
      await publishMemberJoined(kafka, req, chat.rows[0].id, targetUserId);
      res.status(201).json({ success: true, data: chat.rows[0] });
    } catch (err) { next(err); }
  });

  // Destroy a secret chat: wipes the encrypted history for BOTH participants
  r.delete('/secret-chats/:id', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = userIdFrom(req);
      const chatId = req.params.id;
      const chat = await pool.query("SELECT id FROM chats WHERE id = $1 AND type = 'secret'", [chatId]);
      if (!chat.rows[0]) throw new ValidationError('Secret chat not found');
      await requireMember(chatId, userId);

      await pool.query('DELETE FROM messages WHERE chat_id = $1', [chatId]);
      await pool.query('DELETE FROM chat_members WHERE chat_id = $1', [chatId]);
      await pool.query('DELETE FROM chats WHERE id = $1', [chatId]);

      await kafka.publish({
        id: uuid(),
        type: EventType.CHAT_DELETED,
        topic: EventTopic.CHAT_EVENTS,
        timestamp: new Date().toISOString(),
        source: 'messaging-core-service',
        correlationId: req.correlationId || uuid(),
        userId: userId as UserId,
        payload: { chatId, secret: true, destroyedBy: userId },
      });

      res.json({ success: true, data: { chatId, destroyed: true } });
    } catch (err) { next(err); }
  });

  return r;
}

class MessagingCoreService extends BaseService {
  constructor() {
    super({ name: 'messaging-core-service', port: Number(process.env.PORT || 3004) });
  }

  async setup(): Promise<void> {
    if (!this.kafka) throw new Error('Kafka is required for messaging realtime events');
    this.registerRoutes('/api', router(this.kafka));
  }
}

new MessagingCoreService().start();
