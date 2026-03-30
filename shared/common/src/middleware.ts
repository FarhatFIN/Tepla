import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { JwtPayload, UserId } from '@tepla/types';
import { UnauthorizedError, ForbiddenError } from './errors';
import { RedisClient } from './redis';
import { createLogger } from './logger';

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
  const secret = jwtSecret || process.env.JWT_SECRET || 'tepla-jwt-secret-change-me';

  return (req: Request, _res: Response, next: NextFunction) => {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      throw new UnauthorizedError('Missing or invalid authorization header');
    }

    const token = authHeader.slice(7);
    try {
      const payload = jwt.verify(token, secret) as JwtPayload;
      req.user = payload;
      next();
    } catch (err) {
      if ((err as Error).name === 'TokenExpiredError') {
        throw new UnauthorizedError('Token expired');
      }
      throw new UnauthorizedError('Invalid token');
    }
  };
}

// ─── Premium Check Middleware ────────────────
export function premiumMiddleware(redis?: RedisClient) {
  return async (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) {
      throw new UnauthorizedError();
    }

    // Quick check from JWT claim
    if (req.user.isPremium) {
      return next();
    }

    // Double-check from Redis cache if available
    if (redis) {
      const cached = await redis.get(`premium:${req.user.sub}`);
      if (cached === '1') {
        return next();
      }
    }

    throw new ForbiddenError('Premium subscription required');
  };
}

// ─── Correlation ID Middleware ───────────────
export function correlationMiddleware() {
  return (req: Request, _res: Response, next: NextFunction) => {
    req.correlationId = (req.headers['x-correlation-id'] as string) ||
      crypto.randomUUID();
    next();
  };
}

// ─── Request Logger Middleware ───────────────
export function requestLoggerMiddleware(serviceName: string) {
  const svcLogger = createLogger(serviceName);
  return (req: Request, res: Response, next: NextFunction) => {
    const start = Date.now();
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

// ─── Rate Limiter Middleware (Redis-based) ───
export function rateLimitMiddleware(redis: RedisClient, opts: {
  windowMs: number;
  maxRequests: number;
  keyPrefix?: string;
}) {
  const { windowMs, maxRequests, keyPrefix = 'rl' } = opts;
  const windowSec = Math.ceil(windowMs / 1000);

  return async (req: Request, res: Response, next: NextFunction) => {
    const identifier = req.user?.sub || req.ip;
    const key = `${keyPrefix}:${identifier}`;

    const current = await redis.incr(key);
    if (current === 1) {
      await redis.expire(key, windowSec);
    }

    res.setHeader('X-RateLimit-Limit', maxRequests);
    res.setHeader('X-RateLimit-Remaining', Math.max(0, maxRequests - current));

    if (current > maxRequests) {
      const ttl = await redis.ttl(key);
      res.setHeader('Retry-After', ttl);
      res.status(429).json({
        success: false,
        error: { code: 'RATE_LIMIT', message: `Too many requests. Retry after ${ttl}s` },
      });
      return;
    }

    next();
  };
}
