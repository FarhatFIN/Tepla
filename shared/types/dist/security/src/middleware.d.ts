import { Request, Response, NextFunction } from 'express';
import Redis from 'ioredis';
/**
 * Express Security Middleware
 * Wraps all security checks into Express middleware functions
 */
export declare class SecurityMiddleware {
    private rateLimiter;
    private deviceSecurity;
    private redis;
    constructor(redis: Redis);
    /** Rate limit by IP */
    ipRateLimit(limit?: number): (req: Request, res: Response, next: NextFunction) => Promise<void>;
    /** Rate limit by authenticated user */
    userRateLimit(limit?: number): (req: Request, res: Response, next: NextFunction) => Promise<void>;
    /** Auth endpoint rate limit with lockout */
    authRateLimit(): (req: Request, res: Response, next: NextFunction) => Promise<void>;
    /** Record auth failure (call after failed login) */
    recordAuthFailure(identifier: string): Promise<void>;
    /** Clear auth failures (call after successful login) */
    clearAuthFailures(identifier: string): Promise<void>;
    /** Device fingerprint middleware — adds fingerprint to request */
    deviceFingerprint(): (req: Request, _res: Response, next: NextFunction) => void;
    /** Anomaly detection middleware */
    anomalyDetection(): (req: Request, res: Response, next: NextFunction) => Promise<void>;
    /** Security audit middleware — log all requests to sensitive endpoints */
    auditSensitive(endpointName: string): (req: Request, _res: Response, next: NextFunction) => Promise<void>;
    /** Security headers middleware */
    securityHeaders(): (_req: Request, res: Response, next: NextFunction) => void;
    /** Get security metrics */
    getMetrics(): Promise<Record<string, number>>;
}
//# sourceMappingURL=middleware.d.ts.map