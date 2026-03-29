/**
 * Sliding Window Rate Limiter — Redis-backed
 *
 * Uses sorted sets with timestamp scores for true sliding window.
 * More accurate than fixed-window counters; prevents burst at window boundaries.
 *
 * Key format: ratelimit:{action}:{identifier}
 * Each request adds a member with score = current timestamp.
 * Expired members are pruned on every check.
 *
 * Production risk: Redis ZRANGEBYSCORE + ZADD is not atomic.
 * Mitigation: Lua script runs both in a single Redis call.
 */

import { Request, Response, NextFunction } from 'express';
import { RedisClient, createLogger } from './index';

const logger = createLogger('rate-limiter');

export interface RateLimitConfig {
  action: string;         // e.g., 'message:send', 'otp:request'
  windowMs: number;       // sliding window size in ms
  maxRequests: number;    // max requests in window
  burstAllowance?: number; // extra burst above max (penalizes with longer cooldown)
  keyExtractor?: (req: Request) => string; // custom key (default: req.user.sub)
}

// Lua script: atomic check + add + prune
const SLIDING_WINDOW_LUA = `
local key = KEYS[1]
local now = tonumber(ARGV[1])
local window = tonumber(ARGV[2])
local max = tonumber(ARGV[3])

-- Remove expired entries
redis.call('ZREMRANGEBYSCORE', key, 0, now - window)

-- Count current entries
local count = redis.call('ZCARD', key)

if count >= max then
  -- Rate limited — return remaining TTL until oldest entry expires
  local oldest = redis.call('ZRANGE', key, 0, 0, 'WITHSCORES')
  local retryAfterMs = 0
  if #oldest > 0 then
    retryAfterMs = window - (now - tonumber(oldest[2]))
  end
  return {0, retryAfterMs, count}
end

-- Allow: add this request
redis.call('ZADD', key, now, now .. ':' .. math.random(1000000))
redis.call('PEXPIRE', key, window)

return {1, 0, count + 1}
`;

/**
 * Express middleware factory for sliding window rate limiting.
 */
export function slidingWindowLimiter(
  redis: RedisClient,
  config: RateLimitConfig
): (req: Request, res: Response, next: NextFunction) => void {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const identifier = config.keyExtractor
        ? config.keyExtractor(req)
        : req.user?.sub || req.ip;

      if (!identifier) return next();

      const key = `ratelimit:${config.action}:${identifier}`;
      const now = Date.now();
      const effectiveMax = config.maxRequests + (config.burstAllowance || 0);

      const result = await redis.eval(
        SLIDING_WINDOW_LUA,
        [key],
        [String(now), String(config.windowMs), String(effectiveMax)]
      ) as [number, number, number];

      const [allowed, retryAfterMs, currentCount] = result;

      // Set rate limit headers
      res.setHeader('X-RateLimit-Limit', config.maxRequests);
      res.setHeader('X-RateLimit-Remaining', Math.max(0, config.maxRequests - currentCount));
      res.setHeader('X-RateLimit-Reset', new Date(now + config.windowMs).toISOString());

      if (!allowed) {
        res.setHeader('Retry-After', Math.ceil(retryAfterMs / 1000));
        logger.warn('Rate limited', { action: config.action, identifier, currentCount });
        return res.status(429).json({
          success: false,
          error: 'Too many requests',
          retryAfter: Math.ceil(retryAfterMs / 1000),
        });
      }

      next();
    } catch (err) {
      // Fail open — don't block requests if Redis is down
      logger.error('Rate limiter error', { error: (err as Error).message });
      next();
    }
  };
}

// ─── Preset Configurations ──────────────────────

export const RATE_LIMITS = {
  MESSAGE_SEND: {
    action: 'message:send',
    windowMs: 60_000,      // 1 minute
    maxRequests: 30,        // 30 msg/min for normal users
    burstAllowance: 10,    // 10 extra during burst, then hard stop
  } as RateLimitConfig,

  OTP_REQUEST: {
    action: 'otp:request',
    windowMs: 3600_000,    // 1 hour
    maxRequests: 5,         // 5 OTP per hour per phone
    keyExtractor: (req: Request) => req.body?.phone || req.ip,
  } as RateLimitConfig,

  FILE_UPLOAD: {
    action: 'file:upload',
    windowMs: 300_000,     // 5 minutes
    maxRequests: 20,
  } as RateLimitConfig,

  API_GLOBAL: {
    action: 'api:global',
    windowMs: 60_000,
    maxRequests: 120,
  } as RateLimitConfig,
};
