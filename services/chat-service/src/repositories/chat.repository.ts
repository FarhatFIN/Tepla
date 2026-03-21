import { BaseRepository } from '@tepla/common';
import { v4 as uuid } from 'uuid';

export class ChatRepository extends BaseRepository {
  constructor() {
    super('chats');
  }

  async findById(id: string): Promise<any | null> {
    return this.queryOne('SELECT * FROM chats WHERE id = $1', [id]);
  }

  async findByUserId(userId: string): Promise<any[]> {
    const sql = `
      SELECT c.*, cm.role AS current_user_role,
        (SELECT json_build_object(
          'id', m.id, 'senderId', m.sender_id, 'content', m.content,
          'type', m.type, 'createdAt', m.created_at
        ) FROM messages m WHERE m.chat_id = c.id ORDER BY m.created_at DESC LIMIT 1) AS last_message
      FROM chats c
      JOIN chat_members cm ON cm.chat_id = c.id AND cm.user_id = $1
      WHERE cm.role != 'banned'
      ORDER BY COALESCE(
        (SELECT m.created_at FROM messages m WHERE m.chat_id = c.id ORDER BY m.created_at DESC LIMIT 1),
        c.created_at
      ) DESC
    `;
    return this.queryMany(sql, [userId]);
  }

  async findDirectChat(userA: string, userB: string): Promise<any | null> {
    const sql = `
      SELECT c.* FROM chats c
      JOIN chat_members cm1 ON cm1.chat_id = c.id AND cm1.user_id = $1
      JOIN chat_members cm2 ON cm2.chat_id = c.id AND cm2.user_id = $2
      WHERE c.type = 'direct'
      LIMIT 1
    `;
    return this.queryOne(sql, [userA, userB]);
  }

  async create(input: any): Promise<any> {
    const id = uuid();
    const sql = `
      INSERT INTO chats (id, type, name, username, description, created_by, is_public, members_count, created_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, 0, NOW())
      RETURNING *
    `;
    return this.queryOne(sql, [
      id, input.type, input.name, input.username,
      input.description, input.created_by, input.is_public,
    ]);
  }

  async getMember(chatId: string, userId: string): Promise<any | null> {
    return this.queryOne(
      'SELECT * FROM chat_members WHERE chat_id = $1 AND user_id = $2',
      [chatId, userId]
    );
  }

  async addMember(chatId: string, userId: string, role: string): Promise<void> {
    await this.execute(
      `INSERT INTO chat_members (chat_id, user_id, role, joined_at) VALUES ($1, $2, $3, NOW())
       ON CONFLICT (chat_id, user_id) DO UPDATE SET role = $3`,
      [chatId, userId, role]
    );
  }

  async removeMember(chatId: string, userId: string): Promise<void> {
    await this.execute(
      'DELETE FROM chat_members WHERE chat_id = $1 AND user_id = $2',
      [chatId, userId]
    );
  }

  async updateMembersCount(chatId: string): Promise<void> {
    await this.execute(
      `UPDATE chats SET members_count = (
        SELECT COUNT(*) FROM chat_members WHERE chat_id = $1 AND role != 'banned'
      ) WHERE id = $1`,
      [chatId]
    );
  }

  async getPinnedMessages(chatId: string): Promise<any[]> {
    return this.queryMany(
      'SELECT * FROM messages WHERE chat_id = $1 AND is_pinned = true ORDER BY created_at DESC',
      [chatId]
    );
  }

  // ─── Disappearing Messages ─────────────
  async setMessageTtl(chatId: string, ttlSeconds: number | null): Promise<any> {
    return this.queryOne(
      'UPDATE chats SET message_ttl_seconds = $2 WHERE id = $1 RETURNING *',
      [chatId, ttlSeconds]
    );
  }

  // ─── Channels ─────────────────────────
  async findPublicChannelByUsername(username: string): Promise<any | null> {
    return this.queryOne(
      "SELECT * FROM chats WHERE username = $1 AND type = 'channel' AND is_public = true",
      [username.toLowerCase()]
    );
  }

  async isSubscriber(chatId: string, userId: string): Promise<boolean> {
    const row = await this.queryOne(
      'SELECT 1 FROM chat_members WHERE chat_id = $1 AND user_id = $2',
      [chatId, userId]
    );
    return !!row;
  }
}
