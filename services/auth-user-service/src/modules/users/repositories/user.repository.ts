import { BaseRepository, escapeLikePattern } from '@tepla/common';

export class UserRepository extends BaseRepository {
  constructor() {
    super('users');
  }

  async findById(id: string): Promise<any | null> {
    return this.queryOne('SELECT * FROM users WHERE id = $1', [id]);
  }

  /**
   * Search users by username or display name.
   *
   * Two fixes here:
   *  - H-08: the pattern was `%${query}%` with no wildcard escaping, so a query
   *    of `%` matched every row and returned the whole directory.
   *  - Privacy: `email ILIKE $1` let anyone confirm whether an address is
   *    registered, and find the account behind it, by typing it into search.
   *    Email is not a public handle; it is no longer a searchable column.
   */
  async search(query: string, limit: number): Promise<any[]> {
    const sql = `
      SELECT id, username, display_name, avatar_url, bio, is_online, is_verified, last_seen
      FROM users
      WHERE username ILIKE $1 ESCAPE '\\' OR display_name ILIKE $1 ESCAPE '\\'
      ORDER BY
        CASE WHEN username = $2 THEN 0
             WHEN username ILIKE $3 || '%' ESCAPE '\\' THEN 1
             ELSE 2 END,
        username
      LIMIT $4
    `;
    // $2 is the raw term (exact-match boost — usernames legitimately contain
    // '_', which must not be escaped for an equality test); $3 is the escaped
    // term used inside the LIKE prefix pattern.
    const escaped = escapeLikePattern(query.toLowerCase());
    const rows = await this.queryMany(sql, [
      `%${escapeLikePattern(query)}%`,
      query.toLowerCase(),
      escaped,
      limit,
    ]);
    return rows.map((r: any) => ({
      id: r.id,
      username: r.username,
      displayName: r.display_name,
      avatarUrl: r.avatar_url,
      bio: r.bio,
      isOnline: r.is_online,
      isVerified: r.is_verified,
      lastSeen: r.last_seen,
    }));
  }

  async update(id: string, fields: Record<string, any>): Promise<any> {
    const keys = Object.keys(fields);
    const sets = keys.map((k, i) => `${k} = $${i + 2}`).join(', ');
    const sql = `UPDATE users SET ${sets}, updated_at = NOW() WHERE id = $1 RETURNING *`;
    return this.queryOne(sql, [id, ...keys.map((k) => fields[k])]);
  }

  async getSettings(userId: string): Promise<any> {
    return this.queryOne('SELECT * FROM user_settings WHERE user_id = $1', [userId]) || {};
  }

  async updateSettings(userId: string, settings: Record<string, any>): Promise<any> {
    const sql = `
      INSERT INTO user_settings (user_id, settings) VALUES ($1, $2)
      ON CONFLICT (user_id) DO UPDATE SET settings = $2, updated_at = NOW()
      RETURNING *
    `;
    return this.queryOne(sql, [userId, JSON.stringify(settings)]);
  }

  async findByUsername(username: string): Promise<any | null> {
    return this.queryOne('SELECT * FROM users WHERE username = $1', [username.toLowerCase()]);
  }

  // ─── Contacts ─────────────────────────
  async getContacts(userId: string): Promise<any[]> {
    return this.queryMany(
      `SELECT c.contact_user_id, c.is_blocked, c.nickname, c.created_at,
              u.username, u.display_name, u.avatar_url, u.bio, u.is_online, u.last_seen
       FROM contacts c JOIN users u ON u.id = c.contact_user_id
       WHERE c.user_id = $1 ORDER BY u.display_name, u.username`,
      [userId]
    );
  }

  async addContact(userId: string, contactUserId: string): Promise<void> {
    await this.execute(
      'INSERT INTO contacts (user_id, contact_user_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
      [userId, contactUserId]
    );
  }

  async removeContact(userId: string, contactUserId: string): Promise<void> {
    await this.execute('DELETE FROM contacts WHERE user_id = $1 AND contact_user_id = $2', [userId, contactUserId]);
  }

  async blockUser(userId: string, targetUserId: string): Promise<void> {
    await this.execute(
      `INSERT INTO contacts (user_id, contact_user_id, is_blocked) VALUES ($1, $2, true)
       ON CONFLICT (user_id, contact_user_id) DO UPDATE SET is_blocked = true`,
      [userId, targetUserId]
    );
  }

  async unblockUser(userId: string, targetUserId: string): Promise<void> {
    await this.execute(
      'UPDATE contacts SET is_blocked = false WHERE user_id = $1 AND contact_user_id = $2',
      [userId, targetUserId]
    );
  }

  async isBlocked(userId: string, byUserId: string): Promise<boolean> {
    const row = await this.queryOne(
      'SELECT 1 FROM contacts WHERE user_id = $1 AND contact_user_id = $2 AND is_blocked = true',
      [byUserId, userId]
    );
    return !!row;
  }
}
