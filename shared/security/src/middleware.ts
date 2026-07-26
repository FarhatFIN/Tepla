import { Request, Response, NextFunction } from 'express';
import { SecurityRateLimiter } from './rate-limiter';
import { DeviceSecurity } from './device-security';
import { AuditLogger } from './audit-logger';
import { SecurityMetrics } from './security-metrics';
import Redis from 'ioredis';

/**
 * The caller's address as Express resolved it (honouring `trust proxy`),
 * never the raw forwarded header — that one is attacker-controlled.
 */
function clientIp(req: Request): string {
  return req.ip || req.socket?.remoteAddress || 'unknown';
}

/**
 * Express Security Middleware
 * Wraps all security checks into Express middleware functions
 */
export class SecurityMiddleware {
  private rateLimiter: SecurityRateLimiter;
  private deviceSecurity: DeviceSecurity;
  private redis: Redis;

  constructor(redis: Redis) {
    this.redis = redis;
    this.rateLimiter = new SecurityRateLimiter(redis);
    this.deviceSecurity = new DeviceSecurity(redis);
  }

  /** Rate limit by IP */
  ipRateLimit(limit: number = 100) {
    return async (req: Request, res: Response, next: NextFunction) => {
      try {
        // `req.ip` already honours the app's `trust proxy` setting. Falling back
        // to the raw x-forwarded-for header (as this used to) would let a
        // client pick its own rate-limit bucket by forging that header.
        await this.rateLimiter.check(`ip:${clientIp(req)}`, limit);
        next();
      } catch (err) {
        res.status(429).json({
          success: false,
          error: { code: 'RATE_LIMIT', message: (err as Error).message },
        });
      }
    };
  }

  /** Rate limit by authenticated user */
  userRateLimit(limit: number = 120) {
    return async (req: Request, res: Response, next: NextFunction) => {
      try {
        const userId = (req as any).user?.sub || clientIp(req);
        await this.rateLimiter.check(`user:${userId}`, limit);
        next();
      } catch (err) {
        res.status(429).json({
          success: false,
          error: { code: 'RATE_LIMIT', message: (err as Error).message },
        });
      }
    };
  }

  /**
   * Auth endpoint rate limit with lockout.
   *
   * H-12: `req.body.phone` was read unguarded. Under Express 5 `req.body` is
   * `undefined` whenever no parser matched the content type, so a GET or a
   * form-encoded POST to an auth route threw a TypeError and produced a 500.
   *
   * The IP is *always* limited as well, not just as a fallback — otherwise an
   * attacker spraying one password across thousands of accounts sees no
   * per-account counter move at all.
   */
  authRateLimit() {
    return async (req: Request, res: Response, next: NextFunction) => {
      const body = (req.body ?? {}) as { phone?: unknown; email?: unknown };
      const subject = typeof body.phone === 'string' ? body.phone
        : typeof body.email === 'string' ? body.email.toLowerCase().trim()
        : null;

      try {
        await this.rateLimiter.checkAuth(`ip:${clientIp(req)}`);
        if (subject) {
          await this.rateLimiter.checkAuth(subject);
        }
        next();
      } catch (err) {
        await SecurityMetrics.authFailure(this.redis);
        res.status(429).json({
          success: false,
          error: { code: 'AUTH_RATE_LIMIT', message: (err as Error).message },
        });
      }
    };
  }

  /** Record auth failure (call after failed login) */
  async recordAuthFailure(identifier: string): Promise<void> {
    await this.rateLimiter.recordAuthFailure(identifier);
  }

  /** Clear auth failures (call after successful login) */
  async clearAuthFailures(identifier: string): Promise<void> {
    await this.rateLimiter.clearAuthFailures(identifier);
  }

  /** Device fingerprint middleware — adds fingerprint to request */
  deviceFingerprint() {
    return (req: Request, _res: Response, next: NextFunction) => {
      const fingerprint = DeviceSecurity.fingerprint(
        req.headers as Record<string, string>,
        req.cookies?.deviceId
      );
      (req as any).deviceFingerprint = fingerprint;
      next();
    };
  }

  /** Anomaly detection middleware */
  anomalyDetection() {
    return async (req: Request, res: Response, next: NextFunction) => {
      const userId = (req as any).user?.sub;
      if (!userId) return next();

      const fingerprint = (req as any).deviceFingerprint ||
        DeviceSecurity.fingerprint(req.headers as Record<string, string>);

      const ip = clientIp(req);
      const anomaly = await this.deviceSecurity.detectAnomaly(userId, fingerprint, ip);

      if (anomaly.suspicious) {
        await AuditLogger.log('http_anomaly_detected', {
          userId,
          reason: anomaly.reason,
          ip,
          path: req.path,
        });
        await SecurityMetrics.anomalyDetected(this.redis);
        // Attach flag but don't reject
        (req as any).securityAnomaly = anomaly;
      }

      next();
    };
  }

  /** Security audit middleware — log all requests to sensitive endpoints */
  auditSensitive(endpointName: string) {
    return async (req: Request, _res: Response, next: NextFunction) => {
      const userId = (req as any).user?.sub;
      await AuditLogger.log('sensitive_access', {
        endpoint: endpointName,
        userId,
        method: req.method,
        path: req.path,
        ip: clientIp(req),
      });
      next();
    };
  }

  /** Security headers middleware */
  securityHeaders() {
    return (_req: Request, res: Response, next: NextFunction) => {
      res.setHeader('X-Content-Type-Options', 'nosniff');
      res.setHeader('X-Frame-Options', 'DENY');
      res.setHeader('X-XSS-Protection', '1; mode=block');
      res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
      res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
      res.removeHeader('X-Powered-By');
      next();
    };
  }

  /** Get security metrics */
  async getMetrics(): Promise<Record<string, number>> {
    return SecurityMetrics.getAll(this.redis);
  }
}
