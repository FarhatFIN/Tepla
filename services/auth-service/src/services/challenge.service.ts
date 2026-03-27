import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { v4 as uuid } from 'uuid';
import { RedisClient, createLogger, db } from '@tepla/common';
import { sendOtpEmail } from './email.service';

const logger = createLogger('challenge-service');

export class ChallengeService {
  constructor(private redis: RedisClient) {}

  async createOtpChallenge(email: string, userId?: string, pendingData?: any): Promise<{ challengeId: string; type: 'otp' }> {
    try {
      const cooldownKey = `challenge_cooldown:${email}`;
      if (await this.redis.exists(cooldownKey)) {
        throw new Error('Please wait 60 seconds before requesting a new code');
      }

      const code = crypto.randomInt(100000, 999999).toString();
      const codeHash = await bcrypt.hash(code, 10);
      const challengeId = uuid();

      await db.query(
        `INSERT INTO auth_challenges (id, user_id, type, code_hash, pending_data, max_attempts, expires_at)
         VALUES ($1, $2, 'otp', $3, $4, 5, NOW() + INTERVAL '5 minutes')`,
        [challengeId, userId || null, codeHash, pendingData ? JSON.stringify(pendingData) : null]
      );

      await this.redis.set(cooldownKey, '1', 60);
      await sendOtpEmail(email, code);

      return { challengeId, type: 'otp' };
    } catch (err) {
      logger.error('Failed to create OTP challenge', { error: err });
      throw err;
    }
  }

  async createNumberChallenge(email: string, userId: string, device?: string, ip?: string): Promise<{ challengeId: string; type: 'number_challenge'; displayNumber: number }> {
    try {
      const numbers = Array.from({ length: 3 }, () => Math.floor(10 + Math.random() * 90));
      const correctNumber = numbers[Math.floor(Math.random() * 3)];
      const challengeId = uuid();

      await db.query(
        `INSERT INTO auth_challenges (id, user_id, type, challenge_numbers, correct_number, ip_address, max_attempts, expires_at)
         VALUES ($1, $2, 'number_challenge', $3, $4, $5, 3, NOW() + INTERVAL '3 minutes')`,
        [challengeId, userId, numbers, correctNumber, ip || null]
      );

      await this.sendNumberChallengeEmail(email, numbers, device || 'Unknown', ip || 'Unknown');

      return { challengeId, type: 'number_challenge', displayNumber: correctNumber };
    } catch (err) {
      logger.error('Failed to create number challenge', { error: err });
      throw err;
    }
  }

  async verifyOtp(challengeId: string, code: string): Promise<{ valid: boolean; pendingData?: any; userId?: string }> {
    try {
      const challenge = await db.queryRow(
        `SELECT * FROM auth_challenges WHERE id = $1 AND type = 'otp' AND is_used = false AND expires_at > NOW()`,
        [challengeId]
      );
      if (!challenge) return { valid: false };
      if (challenge.attempts >= challenge.max_attempts) throw new Error('Too many attempts');

      const valid = await bcrypt.compare(code, challenge.code_hash);
      if (!valid) {
        await db.query(`UPDATE auth_challenges SET attempts = attempts + 1 WHERE id = $1`, [challengeId]);
        return { valid: false };
      }

      await db.query(`UPDATE auth_challenges SET is_used = true WHERE id = $1`, [challengeId]);
      return {
        valid: true,
        pendingData: challenge.pending_data ? (typeof challenge.pending_data === 'string' ? JSON.parse(challenge.pending_data) : challenge.pending_data) : undefined,
        userId: challenge.user_id,
      };
    } catch (err) {
      logger.error('OTP verification failed', { error: err });
      throw err;
    }
  }

  async verifyNumberChallenge(challengeId: string, selectedNumber: number): Promise<{ valid: boolean; userId?: string }> {
    try {
      const challenge = await db.queryRow(
        `SELECT * FROM auth_challenges WHERE id = $1 AND type = 'number_challenge' AND is_used = false AND expires_at > NOW()`,
        [challengeId]
      );
      if (!challenge) return { valid: false };
      if (challenge.attempts >= challenge.max_attempts) throw new Error('Too many attempts');

      if (challenge.correct_number !== selectedNumber) {
        await db.query(`UPDATE auth_challenges SET attempts = attempts + 1 WHERE id = $1`, [challengeId]);
        return { valid: false };
      }

      await db.query(`UPDATE auth_challenges SET is_used = true WHERE id = $1`, [challengeId]);
      return { valid: true, userId: challenge.user_id };
    } catch (err) {
      logger.error('Number challenge verification failed', { error: err });
      throw err;
    }
  }

  private async sendNumberChallengeEmail(email: string, numbers: number[], device: string, ip: string): Promise<void> {
    try {
      const { sendEmail } = await import('./email.service');
      const html = `
        <div style="font-family:Inter,system-ui,sans-serif;max-width:400px;margin:0 auto;background:#130D24;padding:32px;border-radius:16px;color:#F0EAFF;">
          <div style="text-align:center;margin-bottom:24px;">
            <h2 style="margin:12px 0 0;color:#F0EAFF;">⚡ Tepla</h2>
          </div>
          <h3 style="color:#F59E0B;text-align:center;">New login attempt</h3>
          <p style="color:#9B89C4;text-align:center;">Device: ${device}<br/>IP: ${ip}</p>
          <p style="color:#9B89C4;text-align:center;">Select the number shown in the app:</p>
          <div style="display:flex;gap:12px;justify-content:center;margin:24px 0;">
            ${numbers.map(n => `<div style="width:64px;height:64px;background:linear-gradient(135deg,#5B21B6,#6C3DE8);border-radius:12px;display:flex;align-items:center;justify-content:center;font-size:24px;font-weight:700;color:white;">${n}</div>`).join('')}
          </div>
          <p style="color:#5C4D87;text-align:center;font-size:12px;">Code expires in 3 minutes</p>
        </div>`;
      await sendEmail(email, 'Tepla — подтверждение входа', html);
    } catch (err) {
      logger.error('Failed to send number challenge email', { error: err });
    }
  }
}
