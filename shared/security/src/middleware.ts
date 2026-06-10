import { Request, Response, NextFunction } from 'express';
import { SecurityRateLimiter } from './rate-limiter';
import { DeviceSecurity } from './device-security';
import { AuditLogger } from './audit-logger';
import { SecurityMetrics } from './security-metrics';
import Redis from 'ioredis';

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
        const ip = req.ip || req.headers['x-forwarded-for'] || 'unknown';
        await this.rateLimiter.check(`ip:${ip}`, limit);
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
        const userId = (req as any).user?.sub || req.ip;
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

  /** Auth endpoint rate limit with lockout */
  authRateLimit() {
    return async (req: Request, res: Response, next: NextFunction) => {
      try {
        const identifier = req.body.phone || req.body.email || req.ip;
        await this.rateLimiter.checkAuth(identifier);
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

      const ip = (req.headers['x-forwarded-for'] as string) || req.ip || 'unknown';
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
        ip: req.ip,
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
