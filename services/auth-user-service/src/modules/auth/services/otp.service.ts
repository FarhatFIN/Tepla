import crypto from 'crypto';
import { RedisClient, createLogger, ValidationError } from '@tepla/common';

const logger = createLogger('otp-service');
const OTP_TTL = 600; // 10 minutes
const OTP_RATE_LIMIT = 60; // 1 per minute

export class OtpService {
  constructor(private redis: RedisClient) {}

  async sendOtp(phone: string): Promise<void> {
    // Rate limit: 1 OTP per minute per phone
    const rateKey = `otp:rate:${phone}`;
    const rateLimited = await this.redis.exists(rateKey);
    if (rateLimited) {
      throw new ValidationError('Please wait before requesting a new code');
    }

    const code = this.generateCode();
    await this.redis.set(`otp:${phone}`, code, OTP_TTL);
    await this.redis.set(rateKey, '1', OTP_RATE_LIMIT);

    // Send via Twilio (or skip in dev)
    if (process.env.NODE_ENV === 'production' && process.env.TWILIO_ACCOUNT_SID) {
      try {
        const twilio = require('twilio')(
          process.env.TWILIO_ACCOUNT_SID,
          process.env.TWILIO_AUTH_TOKEN
        );
        await twilio.messages.create({
          body: `Tepla: Your code is ${code}`,
          from: process.env.TWILIO_FROM_NUMBER,
          to: phone,
        });
        logger.info('OTP sent via Twilio', { phone: phone.slice(-4) });
      } catch (err) {
        logger.error('Twilio send failed', { error: (err as Error).message });
        throw new Error('Failed to send OTP');
      }
    } else {
      logger.info(`[DEV] OTP for ${phone}: ${code}`);
    }
  }

  async verifyOtp(phone: string, code: string): Promise<boolean> {
    const stored = await this.redis.get(`otp:${phone}`);
    if (!stored || stored !== code) {
      return false;
    }
    // Delete after successful verification
    await this.redis.del(`otp:${phone}`);
    return true;
  }

  private generateCode(): string {
    return crypto.randomInt(100000, 999999).toString();
  }
}
