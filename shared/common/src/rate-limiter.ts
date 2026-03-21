import { RedisClient } from './redis';

export class RateLimiter {
  constructor(private redis: RedisClient) {}

  /**
   * Sliding window rate limiter using Redis sorted sets
   */
  async isAllowed(key: string, maxRequests: number, windowMs: number): Promise<{ allowed: boolean; remaining: number; retryAfter?: number }> {
    const now = Date.now();
    const windowStart = now - windowMs;
    const member = `${now}-${Math.random().toString(36).slice(2, 8)}`;

    const pipe = this.redis.pipeline();
    pipe.zremrangebyscore(key, '-inf', windowStart.toString());
    pipe.zadd(key, now.toString(), member);
    pipe.zcard(key);
    pipe.pexpire(key, windowMs);

    const results = await pipe.exec();
    const currentCount = (results?.[2]?.[1] as number) || 0;

    if (currentCount > maxRequests) {
      return {
        allowed: false,
        remaining: 0,
        retryAfter: Math.ceil(windowMs / 1000),
      };
    }

    return {
      allowed: true,
      remaining: maxRequests - currentCount,
    };
  }
}
