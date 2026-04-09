import { BaseRepository } from '@tepla/common';
import { PoolClient } from 'pg';
import { uuidv7 } from 'uuidv7';

export class MessageRepository extends BaseRepository {
  constructor() {
    super('messages');
  }

  async findById(id: string): Promise<any | null> {
    return this.queryOne('SELECT * FROM messages WHERE id = $1', [id]);
  }

  async findByChatId(chatId: string, limit: number, cursor?: string): Promise<any[]> {
    if (cursor) {
      // UUIDv7 cursor: id_v7 is time-sortable, no subquery needed
      return this.queryMany(
        `SELECT * FROM messages WHERE chat_id = $1 AND id_v7 < $3::uuid
         AND is_deleted = false ORDER BY id_v7 DESC LIMIT $2`,
        [chatId, limit, cursor]
      );
    }
    return this.queryMany(
      'SELECT * FROM messages WHERE chat_id = $1 AND is_deleted = false ORDER BY id_v7 DESC LIMIT $2',
      [chatId, limit]
    );
  }

  async create(input: any): Promise<any> {
    const id = uuidv7();

    // Check if chat has TTL for disappearing messages
    const chat = await this.queryOne<any>('SELECT message_ttl_seconds FROM chats WHERE id = $1', [input.chat_id]);
    const ttl = input.ttl_seconds || chat?.message_ttl_seconds || null;
    const expiresAt = ttl ? `NOW() + INTERVAL '${parseInt(ttl)} seconds'` : 'NULL';

    const sql = `
      INSERT INTO messages (id, id_v7, chat_id, sender_id, content, content_iv, encrypted_keys, type, reply_to_id, ttl_seconds, expires_at, created_at)
      VALUES ($1, $1, $2, $3, $4, $5, $6, $7, $8, $9, ${expiresAt}, NOW())
      RETURNING *
    `;
    return this.queryOne(sql, [
      id, input.chat_id, input.sender_id, input.content,
      input.content_iv, input.encrypted_keys, input.type, input.reply_to_id,
      ttl,
    ]);
  }

  /**
   * Create message within an existing transaction (PoolClient).
   * Used for atomic message + outbox insert.
   */
  async createWithClient(client: PoolClient, input: any): Promise<any> {
    const id = uuidv7();

    const chatRows = await client.query('SELECT message_ttl_seconds FROM chats WHERE id = $1', [input.chat_id]);
    const chat = chatRows.rows[0];
    const ttl = input.ttl_seconds || chat?.message_ttl_seconds || null;
    const expiresAt = ttl ? `NOW() + INTERVAL '${parseInt(ttl)} seconds'` : 'NULL';

    const sql = `
      INSERT INTO messages (id, id_v7, chat_id, sender_id, content, content_iv, encrypted_keys, type, reply_to_id, ttl_seconds, expires_at, created_at)
      VALUES ($1, $1, $2, $3, $4, $5, $6, $7, $8, $9, ${expiresAt}, NOW())
      RETURNING *
    `;
    const result = await client.query(sql, [
      id, input.chat_id, input.sender_id, input.content,
      input.content_iv, input.encrypted_keys, input.type, input.reply_to_id,
      ttl,
    ]);
    return result.rows[0];
  }

  async update(id: string, fields: Record<string, any>): Promise<any> {
    const keys = Object.keys(fields);
    const sets = keys.map((k, i) => `${k} = $${i + 2}`).join(', ');
    return this.queryOne(`UPDATE messages SET ${sets} WHERE id = $1 RETURNING *`, [id, ...keys.map(k => fields[k])]);
  }

  async softDelete(id: string): Promise<void> {
    await this.execute("UPDATE messages SET is_deleted = true, content = '[deleted]' WHERE id = $1", [id]);
  }

  async togglePin(id: string, isPinned: boolean): Promise<any> {
    return this.queryOne('UPDATE messages SET is_pinned = $2 WHERE id = $1 RETURNING *', [id, isPinned]);
  }

  async addAttachments(messageId: string, attachments: any[]): Promise<void> {
    if (!attachments.length) return;
    // Batch insert instead of N individual inserts
    const values: string[] = [];
    const params: unknown[] = [];
    let idx = 1;
    for (const att of attachments) {
      const id = uuidv7();
      values.push(`($${idx}, $${idx}, $${idx + 1}, $${idx + 2}, $${idx + 3}, $${idx + 4}, $${idx + 5}, $${idx + 6}, $${idx + 7}, NOW())`);
      params.push(id, messageId, att.uploaderId, att.url, att.type, att.mimeType, att.sizeBytes, att.fileName);
      idx += 8;
    }
    await this.execute(
      `INSERT INTO files (id, id_v7, message_id, uploader_id, url, type, mime_type, size_bytes, file_name, created_at)
       VALUES ${values.join(', ')}`,
      params
    );
  }

  async hydrate(messages: any[]): Promise<any[]> {
    if (!messages.length) return [];
    const ids = messages.map(m => m.id);
    const placeholders = ids.map((_, i) => `$${i + 1}`).join(',');

    const [files, reactions] = await Promise.all([
      this.queryMany(`SELECT * FROM files WHERE message_id IN (${placeholders})`, ids),
      this.queryMany(
        `SELECT message_id, emoji, COUNT(*) as count, array_agg(user_id) as user_ids
         FROM reactions WHERE message_id IN (${placeholders}) GROUP BY message_id, emoji`,
        ids
      ),
    ]);

    const fileMap = new Map<string, any[]>();
    for (const f of files) {
      if (!fileMap.has(f.message_id)) fileMap.set(f.message_id, []);
      fileMap.get(f.message_id)!.push(f);
    }

    const reactionMap = new Map<string, any[]>();
    for (const r of reactions) {
      if (!reactionMap.has(r.message_id)) reactionMap.set(r.message_id, []);
      reactionMap.get(r.message_id)!.push({ emoji: r.emoji, count: parseInt(r.count), userIds: r.user_ids });
    }

    return messages.map(m => ({
      ...m,
      attachments: fileMap.get(m.id) || [],
      reactions: reactionMap.get(m.id) || [],
    }));
  }

  // Slow mode seconds for a chat
  async getSlowModeSeconds(chatId: string): Promise<number> {
    const row = await this.queryOne<{ slow_mode_seconds: number }>('SELECT slow_mode_seconds FROM chats WHERE id = $1', [chatId]);
    return row?.slow_mode_seconds || 0;
  }

  // Channel check
  async getChatType(chatId: string): Promise<string | null> {
    const row = await this.queryOne<any>('SELECT type FROM chats WHERE id = $1', [chatId]);
    return row?.type || null;
  }

  async getMemberRole(chatId: string, userId: string): Promise<string | null> {
    const row = await this.queryOne<any>(
      'SELECT role FROM chat_members WHERE chat_id = $1 AND user_id = $2',
      [chatId, userId]
    );
    return row?.role || null;
  }

  // Reactions
  async findReaction(messageId: string, userId: string, emoji: string): Promise<any | null> {
    return this.queryOne(
      'SELECT * FROM reactions WHERE message_id = $1 AND user_id = $2 AND emoji = $3',
      [messageId, userId, emoji]
    );
  }

  async addReaction(messageId: string, userId: string, emoji: string): Promise<void> {
    await this.execute(
      'INSERT INTO reactions (message_id, user_id, emoji, created_at) VALUES ($1, $2, $3, NOW()) ON CONFLICT DO NOTHING',
      [messageId, userId, emoji]
    );
  }

  async removeReaction(messageId: string, userId: string, emoji: string): Promise<void> {
    await this.execute(
      'DELETE FROM reactions WHERE message_id = $1 AND user_id = $2 AND emoji = $3',
      [messageId, userId, emoji]
    );
  }

  async getReactions(messageId: string): Promise<any[]> {
    return this.queryMany(
      `SELECT emoji, COUNT(*) as count, array_agg(user_id) as user_ids
       FROM reactions WHERE message_id = $1 GROUP BY emoji`,
      [messageId]
    );
  }

  // Read Receipts
  async markRead(messageId: string, userId: string): Promise<void> {
    await this.execute(
      'INSERT INTO message_reads (message_id, user_id, read_at) VALUES ($1, $2, NOW()) ON CONFLICT DO NOTHING',
      [messageId, userId]
    );
  }

  async markChatRead(chatId: string, userId: string): Promise<string[]> {
    const rows = await this.queryMany(
      `INSERT INTO message_reads (message_id, user_id, read_at)
       SELECT m.id, $2, NOW() FROM messages m
       WHERE m.chat_id = $1 AND m.sender_id != $2 AND m.is_deleted = false
         AND NOT EXISTS (SELECT 1 FROM message_reads mr WHERE mr.message_id = m.id AND mr.user_id = $2)
       RETURNING message_id`,
      [chatId, userId]
    );
    return rows.map((r: any) => r.message_id);
  }

  async getReadReceipts(messageId: string): Promise<any[]> {
    return this.queryMany(
      `SELECT mr.user_id, mr.read_at, u.username, u.display_name
       FROM message_reads mr JOIN users u ON u.id = mr.user_id
       WHERE mr.message_id = $1`,
      [messageId]
    );
  }

  // ─── Polls ───────────────────────────
  async createPoll(messageId: string, question: string, options: string[], type: string, correctOptionId?: number): Promise<any> {
    const id = uuidv7();
    const optionsJson = JSON.stringify(options.map((text, i) => ({ index: i, text, voter_count: 0 })));
    const sql = `
      INSERT INTO polls (id, id_v7, message_id, question, options, type, correct_option_id, created_at)
      VALUES ($1, $1, $2, $3, $4::jsonb, $5, $6, NOW())
      RETURNING *
    `;
    return this.queryOne(sql, [id, messageId, question, optionsJson, type || 'regular', correctOptionId ?? null]);
  }

  async getPoll(pollId: string): Promise<any | null> {
    return this.queryOne('SELECT * FROM polls WHERE id = $1', [pollId]);
  }

  async getPollByMessageId(messageId: string): Promise<any | null> {
    return this.queryOne('SELECT * FROM polls WHERE message_id = $1', [messageId]);
  }

  async vote(pollId: string, userId: string, optionIndex: number): Promise<any> {
    // Check if already voted (for regular polls, allow multiple; for quiz, single only)
    const poll = await this.getPoll(pollId);
    if (!poll) return null;
    if (poll.is_closed) return null;

    if (poll.type === 'quiz') {
      const existing = await this.queryOne(
        'SELECT 1 FROM poll_votes WHERE poll_id = $1 AND user_id = $2',
        [pollId, userId]
      );
      if (existing) return null; // already voted in quiz
    }

    await this.execute(
      'INSERT INTO poll_votes (poll_id, user_id, option_index, voted_at) VALUES ($1, $2, $3, NOW()) ON CONFLICT DO NOTHING',
      [pollId, userId, optionIndex]
    );

    // Update voter count in options jsonb
    await this.execute(
      `UPDATE polls SET
        options = (
          SELECT jsonb_agg(
            CASE WHEN (elem->>'index')::int = $2
              THEN jsonb_set(elem, '{voter_count}', (COALESCE((elem->>'voter_count')::int, 0) + 1)::text::jsonb)
              ELSE elem
            END
          ) FROM jsonb_array_elements(options) elem
        ),
        total_voters = (SELECT COUNT(DISTINCT user_id) FROM poll_votes WHERE poll_id = $1)
      WHERE id = $1`,
      [pollId, optionIndex]
    );

    return this.getPoll(pollId);
  }

  async retractVote(pollId: string, userId: string): Promise<any> {
    await this.execute('DELETE FROM poll_votes WHERE poll_id = $1 AND user_id = $2', [pollId, userId]);
    // Recalculate all option counts
    await this.execute(
      `UPDATE polls SET
        options = (
          SELECT jsonb_agg(
            jsonb_set(elem, '{voter_count}',
              (SELECT COUNT(*) FROM poll_votes WHERE poll_id = $1 AND option_index = (elem->>'index')::int)::text::jsonb
            )
          ) FROM jsonb_array_elements(options) elem
        ),
        total_voters = (SELECT COUNT(DISTINCT user_id) FROM poll_votes WHERE poll_id = $1)
      WHERE id = $1`,
      [pollId]
    );
    return this.getPoll(pollId);
  }

  async closePoll(pollId: string): Promise<any> {
    return this.queryOne('UPDATE polls SET is_closed = true WHERE id = $1 RETURNING *', [pollId]);
  }

  // Disappearing messages — delete expired
  async deleteExpiredMessages(): Promise<any[]> {
    return this.queryMany(
      `UPDATE messages SET is_deleted = true, content = '[expired]'
       WHERE expires_at IS NOT NULL AND expires_at <= NOW() AND is_deleted = false
       RETURNING id, chat_id`,
      []
    );
  }

  // Forward
  async createForward(originalMessageId: string, toChatId: string, senderId: string): Promise<any> {
    const original = await this.findById(originalMessageId);
    if (!original) return null;
    const id = uuidv7();
    const sql = `
      INSERT INTO messages (id, id_v7, chat_id, sender_id, content, type, forward_from_id, forward_from_chat_id, created_at)
      VALUES ($1, $1, $2, $3, $4, $5, $6, $7, NOW())
      RETURNING *
    `;
    return this.queryOne(sql, [
      id, toChatId, senderId, original.content, original.type,
      originalMessageId, original.chat_id,
    ]);
  }
}
