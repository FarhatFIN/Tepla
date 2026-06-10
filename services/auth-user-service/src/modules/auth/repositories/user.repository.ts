import { BaseRepository } from '@tepla/common';
import { v4 as uuid } from 'uuid';

interface CreateUserInput {
  username: string;
  display_name: string | null;
  phone: string | null;
  email: string | null;
  password_hash?: string | null;
  shield_code_hash?: string | null;
  language: string;
  birth_date: string | null;
  avatar_url?: string | null;
  bio?: string | null;
  public_key: string;
  signing_public_key: string;
}

export class UserRepository extends BaseRepository {
  constructor() {
    super('users');
  }

  async findById(id: string): Promise<any | null> {
    return this.queryOne('SELECT * FROM users WHERE id = $1', [id]);
  }

  async findByPhone(phone: string): Promise<any | null> {
    return this.queryOne('SELECT * FROM users WHERE phone = $1', [phone]);
  }

  async findByEmail(email: string): Promise<any | null> {
    return this.queryOne('SELECT * FROM users WHERE email = $1', [email]);
  }

  async findByUsername(username: string): Promise<any | null> {
    return this.queryOne('SELECT * FROM users WHERE username = $1', [username.toLowerCase()]);
  }

  async create(input: CreateUserInput): Promise<any> {
    const id = uuid();
    const sql = `
      INSERT INTO users (id, username, display_name, phone, email, password_hash, shield_code_hash, language, birth_date, avatar_url, bio, public_key, signing_public_key, created_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, NOW())
      RETURNING *
    `;
    return this.queryOne(sql, [
      id, input.username, input.display_name, input.phone,
      input.email, input.password_hash, input.shield_code_hash || null, input.language, input.birth_date,
      input.avatar_url || null, input.bio || null, input.public_key, input.signing_public_key,
    ]);
  }

  async updateLastSeen(id: string): Promise<void> {
    await this.execute(
      'UPDATE users SET last_seen = NOW(), is_online = true WHERE id = $1',
      [id]
    );
  }

  async markEmailVerified(userId: string): Promise<void> {
    await this.execute(
      'UPDATE users SET is_verified = true, email_verified_at = NOW() WHERE id = $1',
      [userId]
    );
  }

  // ─── 2FA / TOTP ─────────────────────────
  async getTotpSecret(userId: string): Promise<any | null> {
    return this.queryOne('SELECT * FROM totp_secrets WHERE user_id = $1', [userId]);
  }

  async saveTotpSecret(userId: string, secret: string, backupCodes: string[]): Promise<void> {
    await this.execute(
      `INSERT INTO totp_secrets (user_id, secret, backup_codes, is_verified, created_at)
       VALUES ($1, $2, $3, false, NOW())
       ON CONFLICT (user_id) DO UPDATE SET secret = $2, backup_codes = $3, is_verified = false`,
      [userId, secret, JSON.stringify(backupCodes)]
    );
  }

  async verifyTotp(userId: string): Promise<void> {
    await this.execute('UPDATE totp_secrets SET is_verified = true WHERE user_id = $1', [userId]);
    await this.execute(
      "UPDATE user_settings SET two_factor_enabled = true WHERE user_id = $1",
      [userId]
    );
  }

  async deleteTotp(userId: string): Promise<void> {
    await this.execute('DELETE FROM totp_secrets WHERE user_id = $1', [userId]);
    await this.execute(
      "UPDATE user_settings SET two_factor_enabled = false WHERE user_id = $1",
      [userId]
    );
  }

  async useBackupCode(userId: string, code: string): Promise<boolean> {
    const row = await this.getTotpSecret(userId);
    if (!row) return false;
    const codes: string[] = typeof row.backup_codes === 'string' ? JSON.parse(row.backup_codes) : row.backup_codes;
    const idx = codes.indexOf(code);
    if (idx === -1) return false;
    codes.splice(idx, 1);
    await this.execute('UPDATE totp_secrets SET backup_codes = $2 WHERE user_id = $1', [userId, JSON.stringify(codes)]);
    return true;
  }
}
