import { SecurityConfig } from './config';
import { SecurityMetrics } from './security-metrics';
import { AuditLogger } from './audit-logger';
import Redis from 'ioredis';

/**
 * Security Rate Limiter
 * Redis-backed with atomic INCR + TTL fix for race condition.
 * Separate from the @tepla/common rate limiter — this is for
 * security-critical endpoints (auth, OTP, message encryption).
 */
export class SecurityRateLimiter {
  private redis: Redis;

  constructor(redis: Redis) {
    this.redis = redis;
  }

  /** Check rate limit — throws if exceeded */
  async check(key: string, limit: number = SecurityConfig.RATE_LIMIT_DEFAULT): Promise<void> {
    const redisKey = `sec_rate:${key}`;

    // Atomic INCR
    const count = await this.redis.incr(redisKey);

    // Fix TTL race condition: always set expiry on first increment
    if (count === 1) {
      await this.redis.expire(redisKey, SecurityConfig.RATE_LIMIT_WINDOW);
    } else {
      // Safety: if TTL was lost (Redis restart), re-set it
      const ttl = await this.redis.ttl(redisKey);
      if (ttl < 0) {
        await this.redis.expire(redisKey, SecurityConfig.RATE_LIMIT_WINDOW);
      }
    }

    if (count > limit) {
      await SecurityMetrics.rateLimit(this.redis);
      await AuditLogger.log('rate_limit_exceeded', { key, count, limit });
      throw new Error(`Rate limit exceeded: ${key} (${count}/${limit})`);
    }
  }

  /** Check without throwing — returns remaining count */
  async remaining(key: string, limit: number = SecurityConfig.RATE_LIMIT_DEFAULT): Promise<number> {
    const redisKey = `sec_rate:${key}`;
    const count = parseInt(await this.redis.get(redisKey) || '0');
    return Math.max(0, limit - count);
  }

  /** Reset rate limit for a key */
  async reset(key: string): Promise<void> {
    await this.redis.del(`sec_rate:${key}`);
  }

  /** Auth-specific rate limiter with lockout */
  async checkAuth(identifier: string): Promise<void> {
    const lockKey = `sec_lockout:${identifier}`;
    const isLocked = await this.redis.get(lockKey);

    if (isLocked) {
      const ttl = await this.redis.ttl(lockKey);
      throw new Error(`Account locked. Retry in ${ttl} seconds.`);
    }

    await this.check(`auth:${identifier}`, SecurityConfig.MAX_AUTH_FAILURES);
  }

  /** Record auth failure — lock after threshold */
  async recordAuthFailure(identifier: string): Promise<void> {
    const key = `sec_rate:auth:${identifier}`;
    const count = await this.redis.incr(key);

    if (count === 1) {
      await this.redis.expire(key, SecurityConfig.RATE_LIMIT_WINDOW);
    }

    if (count >= SecurityConfig.MAX_AUTH_FAILURES) {
      // Lock the account
      await this.redis.set(
        `sec_lockout:${identifier}`,
        '1',
        'EX',
        SecurityConfig.AUTH_LOCKOUT_SECONDS
      );
      await SecurityMetrics.authFailure(this.redis);
      await AuditLogger.log('auth_lockout', { identifier, failures: count });
    }
  }

  /** Clear auth failures (on successful login) */
  async clearAuthFailures(identifier: string): Promise<void> {
    await this.redis.del(`sec_rate:auth:${identifier}`, `sec_lockout:${identifier}`);
  }
}
