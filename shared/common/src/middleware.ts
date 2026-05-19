import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { JwtPayload, UserId } from '@tepla/types';
import { UnauthorizedError, ForbiddenError } from './errors';
import { RedisClient } from './redis';
import { createLogger } from './logger';
import { requestContext, RequestContext } from './context';

const logger = createLogger('middleware');

// Extend Express Request
declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload;
      correlationId?: string;
    }
  }
}

// ─── JWT Auth Middleware ─────────────────────
export function authMiddleware(jwtSecret?: string) {
  const secret = jwtSecret || process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('FATAL: JWT_SECRET environment variable is required');
  }

  return (req: Request, _res: Response, next: NextFunction) => {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      throw new UnauthorizedError('Missing or invalid authorization header');
    }

    const token = authHeader.slice(7);
    try {
      const payload = jwt.verify(token, secret) as JwtPayload;
      req.user = payload;

      // Update AsyncLocalStorage context with userId
      const store = requestContext.getStore();
      if (store) {
        store.userId = payload.sub;
      }

      next();
    } catch (err) {
      if ((err as Error).name === 'TokenExpiredError') {
        throw new UnauthorizedError('Token expired');
      }
      throw new UnauthorizedError('Invalid token');
    }
  };
}

// ─── Correlation ID Middleware (with AsyncLocalStorage) ─────
export function correlationMiddleware() {
  return (req: Request, res: Response, next: NextFunction) => {
    const correlationId = (req.headers['x-correlation-id'] as string) ||
      crypto.randomUUID();
    req.correlationId = correlationId;

    // Set response header for tracing
    res.setHeader('X-Correlation-ID', correlationId);

    // Wrap remainder of request in AsyncLocalStorage context
    const ctx: RequestContext = {
      correlationId,
      requestId: crypto.randomUUID(),
      startTime: Date.now(),
      service: '', // set by requestLoggerMiddleware
    };

    requestContext.run(ctx, () => next());
  };
}

// ─── Request Logger Middleware ───────────────
export function requestLoggerMiddleware(serviceName: string) {
  const svcLogger = createLogger(serviceName);
  return (req: Request, res: Response, next: NextFunction) => {
    const start = Date.now();

    // Tag context with service name
    const store = requestContext.getStore();
    if (store) store.service = serviceName;

    res.on('finish', () => {
      svcLogger.info('request', {
        method: req.method,
        path: req.path,
        status: res.statusCode,
        duration: Date.now() - start,
        correlationId: req.correlationId,
        userId: req.user?.sub,
      });
    });
    next();
  };
}

// ─── Rate Limiter Middleware (Redis sliding window) ───
// Uses sorted sets + Lua for atomic sliding window.
// Replaces the old fixed-window INCR counter which had boundary burst issues.
const RATE_LIMIT_LUA = `
local key = KEYS[1]
local now = tonumber(ARGV[1])
local window = tonumber(ARGV[2])
local max = tonumber(ARGV[3])
redis.call('ZREMRANGEBYSCORE', key, 0, now - window)
local count = redis.call('ZCARD', key)
if count >= max then
  local oldest = redis.call('ZRANGE', key, 0, 0, 'WITHSCORES')
  local retryAfterMs = 0
  if #oldest > 0 then retryAfterMs = window - (now - tonumber(oldest[2])) end
  return {0, retryAfterMs, count}
end
redis.call('ZADD', key, now, now .. ':' .. math.random(1000000))
redis.call('PEXPIRE', key, window)
return {1, 0, count + 1}
`;

export function rateLimitMiddleware(redis: RedisClient, opts: {
  windowMs: number;
  maxRequests: number;
  keyPrefix?: string;
}) {
  const { windowMs, maxRequests, keyPrefix = 'rl' } = opts;

  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const identifier = req.user?.sub || req.ip;
      const key = `${keyPrefix}:${identifier}`;
      const now = Date.now();

      const result = await redis.eval(
        RATE_LIMIT_LUA,
        [key],
        [String(now), String(windowMs), String(maxRequests)]
      ) as [number, number, number];

      const [allowed, retryAfterMs, currentCount] = result;

      res.setHeader('X-RateLimit-Limit', maxRequests);
      res.setHeader('X-RateLimit-Remaining', Math.max(0, maxRequests - currentCount));
      res.setHeader('X-RateLimit-Reset', new Date(now + windowMs).toISOString());

      if (!allowed) {
        const retryAfterSec = Math.ceil(retryAfterMs / 1000);
        res.setHeader('Retry-After', retryAfterSec);
        res.status(429).json({
          success: false,
          error: { code: 'RATE_LIMIT', message: `Too many requests. Retry after ${retryAfterSec}s` },
        });
        return;
      }

      next();
    } catch (err) {
      // Fail open — don't block requests if Redis is down
      logger.error('Rate limiter error', { error: (err as Error).message });
      next();
    }
  };
}
