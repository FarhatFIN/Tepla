import { BaseRepository } from '@tepla/common';

export interface DatabaseUser {
  id: string;
  phone: string | null;
  email: string | null;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  birth_date: string | Date | null;
  username_color: string | null;
  avatar_animation_enabled: boolean;
  voice_status_url: string | null;
  status_emoji: string | null;
  status_text: string | null;
  last_seen: string | Date | null;
  is_online: boolean;
  is_verified: boolean;
  email_verified_at: string | Date | null;
  public_key: string;
  signing_public_key: string;
  password_hash: string | null;
  language: string;
  created_at: string | Date;
  updated_at: string | Date;
}

export interface DatabaseSession {
  id: string;
  user_id: string;
  device_name: string | null;
  ip_address: string | null;
  user_agent: string | null;
  last_active_at: string | Date;
  created_at: string | Date;
}

export interface CreateAuthUserInput {
  username: string;
  displayName: string | null;
  phone: string | null;
  email: string | null;
  passwordHash: string | null;
  language: string;
  birthDate: string | null;
  publicKey: string;
  signingPublicKey: string;
  isVerified?: boolean;
}

export interface CreateSessionInput {
  userId: string;
  deviceName: string | null;
  ipAddress: string | null;
  userAgent: string | null;
}

export class AuthRepository extends BaseRepository {
  constructor() {
    super('users');
  }

  async findUserById(userId: string): Promise<DatabaseUser | null> {
    return this.queryOne<DatabaseUser>('SELECT * FROM users WHERE id = $1', [userId]);
  }

  async findUserByEmail(email: string): Promise<DatabaseUser | null> {
    return this.queryOne<DatabaseUser>('SELECT * FROM users WHERE email = $1', [email]);
  }

  async findUserByPhone(phone: string): Promise<DatabaseUser | null> {
    return this.queryOne<DatabaseUser>('SELECT * FROM users WHERE phone = $1', [phone]);
  }

  async findUserByUsername(username: string): Promise<DatabaseUser | null> {
    return this.queryOne<DatabaseUser>('SELECT * FROM users WHERE username = $1', [username]);
  }

  async createUser(input: CreateAuthUserInput): Promise<DatabaseUser> {
    const sql = `
      INSERT INTO users (
        username,
        display_name,
        phone,
        email,
        password_hash,
        language,
        birth_date,
        public_key,
        signing_public_key,
        is_verified
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *
    `;

    const user = await this.queryOne<DatabaseUser>(sql, [
      input.username,
      input.displayName,
      input.phone,
      input.email,
      input.passwordHash,
      input.language,
      input.birthDate,
      input.publicKey,
      input.signingPublicKey,
      input.isVerified ?? false,
    ]);

    if (!user) {
      throw new Error('Failed to create user');
    }

    return user;
  }

  async markEmailVerified(userId: string): Promise<void> {
    await this.execute(
      'UPDATE users SET is_verified = true, email_verified_at = NOW(), updated_at = NOW() WHERE id = $1',
      [userId],
    );
  }

  async markUserSeenOnline(userId: string): Promise<void> {
    await this.execute(
      'UPDATE users SET last_seen = NOW(), is_online = true, updated_at = NOW() WHERE id = $1',
      [userId],
    );
  }

  async markUserOffline(userId: string): Promise<void> {
    await this.execute(
      'UPDATE users SET last_seen = NOW(), is_online = false, updated_at = NOW() WHERE id = $1',
      [userId],
    );
  }

  async createSession(input: CreateSessionInput): Promise<DatabaseSession> {
    const session = await this.queryOne<DatabaseSession>(
      `
        INSERT INTO active_sessions (user_id, device_name, ip_address, user_agent, last_active_at)
        VALUES ($1, $2, $3, $4, NOW())
        RETURNING *
      `,
      [input.userId, input.deviceName, input.ipAddress, input.userAgent],
    );

    if (!session) {
      throw new Error('Failed to create session');
    }

    return session;
  }

  async updateSessionActivity(sessionId: string): Promise<void> {
    await this.execute('UPDATE active_sessions SET last_active_at = NOW() WHERE id = $1', [sessionId]);
  }

  async findSessionById(sessionId: string): Promise<DatabaseSession | null> {
    return this.queryOne<DatabaseSession>('SELECT * FROM active_sessions WHERE id = $1', [sessionId]);
  }

  async listSessionsByUser(userId: string): Promise<DatabaseSession[]> {
    return this.queryMany<DatabaseSession>(
      `
        SELECT *
        FROM active_sessions
        WHERE user_id = $1
        ORDER BY last_active_at DESC, created_at DESC
      `,
      [userId],
    );
  }

  async deleteSession(sessionId: string, userId?: string): Promise<void> {
    if (userId) {
      await this.execute('DELETE FROM active_sessions WHERE id = $1 AND user_id = $2', [sessionId, userId]);
      return;
    }

    await this.execute('DELETE FROM active_sessions WHERE id = $1', [sessionId]);
  }

  async deleteSessionsByUser(userId: string): Promise<void> {
    await this.execute('DELETE FROM active_sessions WHERE user_id = $1', [userId]);
  }

  async countSessionsByUser(userId: string): Promise<number> {
    const row = await this.queryOne<{ count: string }>(
      'SELECT COUNT(*)::text AS count FROM active_sessions WHERE user_id = $1',
      [userId],
    );

    return Number(row?.count ?? 0);
  }
}
