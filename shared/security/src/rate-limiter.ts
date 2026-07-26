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

  /**
   * Auth-specific gate: refuse while locked out, and cap how many *attempts*
   * an identifier may make per window.
   *
   * H-01: this used to increment `sec_rate:auth:<id>` — the very same counter
   * `recordAuthFailure()` writes to. Two consequences, both bad:
   *
   *   1. An unauthenticated attacker could lock any account out of its own
   *      login simply by POSTing the victim's email `MAX_AUTH_FAILURES` times,
   *      with no password at all.
   *   2. A legitimate user hit the lockout after roughly half the intended
   *      number of wrong passwords, because each attempt was counted twice.
   *
   * Attempts and failures now live in separate keys. Attempts get a deliberately
   * looser budget (someone retyping a password is not an attacker); only real
   * failures move the account toward lockout.
   */
  async checkAuth(identifier: string): Promise<void> {
    const lockKey = `sec_lockout:${identifier}`;
    const isLocked = await this.redis.get(lockKey);

    if (isLocked) {
      const ttl = await this.redis.ttl(lockKey);
      throw new Error(`Account locked. Retry in ${Math.max(ttl, 1)} seconds.`);
    }

    await this.check(`auth_attempt:${identifier}`, SecurityConfig.MAX_AUTH_ATTEMPTS);
  }

  /** Record auth failure — lock after threshold */
  async recordAuthFailure(identifier: string): Promise<void> {
    const key = `sec_rate:auth_fail:${identifier}`;
    const count = await this.redis.incr(key);

    if (count === 1) {
      await this.redis.expire(key, SecurityConfig.AUTH_FAILURE_WINDOW);
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
    await this.redis.del(
      `sec_rate:auth_fail:${identifier}`,
      `sec_rate:auth_attempt:${identifier}`,
      `sec_lockout:${identifier}`,
    );
  }

  /**
   * Generic attempt counter for second-factor endpoints (TOTP, PIN, Binary
   * Shield). Returns the attempt number; the caller decides what to do when the
   * budget is spent.
   *
   * C-07/C-06: `/2fa/login`, `/2fa/disable` and `/login/trusted` previously had
   * no attempt ceiling at all, which made a 6-digit second factor guessable.
   */
  async recordFactorAttempt(key: string, max: number, ttlSeconds: number): Promise<{ allowed: boolean; attempts: number }> {
    const redisKey = `sec_factor:${key}`;
    const attempts = await this.redis.incr(redisKey);
    if (attempts === 1) {
      await this.redis.expire(redisKey, ttlSeconds);
    }
    return { allowed: attempts <= max, attempts };
  }

  async clearFactorAttempts(key: string): Promise<void> {
    await this.redis.del(`sec_factor:${key}`);
  }
}
