import crypto from 'crypto';
import { RedisClient, ValidationError } from '@tepla/common';
import { DeliveryService, VerificationPurpose } from './delivery.service';

type VerificationChannel = 'email' | 'phone';

interface StoredVerificationCode {
  hash: string;
  attempts: number;
  createdAt: number;
}

export class VerificationCodeService {
  private static readonly OTP_TTL_SECONDS = 600;
  private static readonly COOLDOWN_SECONDS = 60;
  private static readonly MAX_ATTEMPTS = 5;
  private static readonly MAX_SENDS_PER_HOUR = 5;

  constructor(
    private readonly redis: RedisClient,
    private readonly delivery: DeliveryService,
  ) {}

  async issueEmailCode(email: string, purpose: VerificationPurpose): Promise<void> {
    await this.issueCode('email', email, purpose, (code) => this.delivery.sendEmailCode(email, code, purpose));
  }

  async issuePhoneCode(phone: string, purpose: Exclude<VerificationPurpose, 'password_reset'>): Promise<void> {
    await this.issueCode('phone', phone, purpose, (code) => this.delivery.sendPhoneCode(phone, code));
  }

  async verifyEmailCode(email: string, purpose: VerificationPurpose, code: string): Promise<boolean> {
    return this.verifyCode('email', email, purpose, code);
  }

  async verifyPhoneCode(phone: string, purpose: Exclude<VerificationPurpose, 'password_reset'>, code: string): Promise<boolean> {
    return this.verifyCode('phone', phone, purpose, code);
  }

  private async issueCode(
    channel: VerificationChannel,
    recipient: string,
    purpose: VerificationPurpose,
    sender: (code: string) => Promise<void>,
  ): Promise<void> {
    const cooldownKey = this.cooldownKey(channel, purpose, recipient);
    if (await this.redis.exists(cooldownKey)) {
      throw new ValidationError('Please wait 60 seconds before requesting a new code');
    }

    const hourlyKey = this.hourlyKey(channel, purpose, recipient);
    const hourlyCount = Number((await this.redis.get(hourlyKey)) || '0');
    if (hourlyCount >= VerificationCodeService.MAX_SENDS_PER_HOUR) {
      throw new ValidationError('Too many requests. Try again later.');
    }

    const code = crypto.randomInt(100000, 1000000).toString();
    const payload: StoredVerificationCode = {
      hash: this.hashCode(code),
      attempts: 0,
      createdAt: Date.now(),
    };

    await this.redis.setJson(
      this.codeKey(channel, purpose, recipient),
      payload,
      VerificationCodeService.OTP_TTL_SECONDS,
    );
    await this.redis.set(cooldownKey, '1', VerificationCodeService.COOLDOWN_SECONDS);

    const nextCount = await this.redis.incr(hourlyKey);
    if (nextCount === 1) {
      await this.redis.expire(hourlyKey, 3600);
    }

    try {
      await sender(code);
    } catch (error) {
      await this.redis.del(this.codeKey(channel, purpose, recipient), cooldownKey, hourlyKey);
      throw error;
    }
  }

  private async verifyCode(
    channel: VerificationChannel,
    recipient: string,
    purpose: VerificationPurpose,
    code: string,
  ): Promise<boolean> {
    const key = this.codeKey(channel, purpose, recipient);
    const stored = await this.redis.getJson<StoredVerificationCode>(key);
    if (!stored) {
      return false;
    }

    if (stored.attempts >= VerificationCodeService.MAX_ATTEMPTS) {
      throw new ValidationError('Too many attempts. Request a new code.');
    }

    if (!this.codesMatch(stored.hash, code)) {
      stored.attempts += 1;
      const ttl = await this.redis.ttl(key);
      await this.redis.setJson(
        key,
        stored,
        ttl > 0 ? ttl : VerificationCodeService.OTP_TTL_SECONDS,
      );
      return false;
    }

    await this.redis.del(key);
    return true;
  }

  private codeKey(channel: VerificationChannel, purpose: VerificationPurpose, recipient: string): string {
    return `auth:verification:${channel}:${purpose}:${recipient}`;
  }

  private cooldownKey(channel: VerificationChannel, purpose: VerificationPurpose, recipient: string): string {
    return `auth:verification:cooldown:${channel}:${purpose}:${recipient}`;
  }

  private hourlyKey(channel: VerificationChannel, purpose: VerificationPurpose, recipient: string): string {
    return `auth:verification:hourly:${channel}:${purpose}:${recipient}`;
  }

  private hashCode(code: string): string {
    return crypto.createHash('sha256').update(code).digest('hex');
  }

  private codesMatch(expectedHash: string, code: string): boolean {
    const expected = Buffer.from(expectedHash, 'hex');
    const actual = Buffer.from(this.hashCode(code), 'hex');
    return expected.length === actual.length && crypto.timingSafeEqual(expected, actual);
  }
}
