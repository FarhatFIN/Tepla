"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SecurityMiddleware = void 0;
const rate_limiter_1 = require("./rate-limiter");
const device_security_1 = require("./device-security");
const audit_logger_1 = require("./audit-logger");
const security_metrics_1 = require("./security-metrics");
/**
 * Express Security Middleware
 * Wraps all security checks into Express middleware functions
 */
class SecurityMiddleware {
    rateLimiter;
    deviceSecurity;
    redis;
    constructor(redis) {
        this.redis = redis;
        this.rateLimiter = new rate_limiter_1.SecurityRateLimiter(redis);
        this.deviceSecurity = new device_security_1.DeviceSecurity(redis);
    }
    /** Rate limit by IP */
    ipRateLimit(limit = 100) {
        return async (req, res, next) => {
            try {
                const ip = req.ip || req.headers['x-forwarded-for'] || 'unknown';
                await this.rateLimiter.check(`ip:${ip}`, limit);
                next();
            }
            catch (err) {
                res.status(429).json({
                    success: false,
                    error: { code: 'RATE_LIMIT', message: err.message },
                });
            }
        };
    }
    /** Rate limit by authenticated user */
    userRateLimit(limit = 120) {
        return async (req, res, next) => {
            try {
                const userId = req.user?.sub || req.ip;
                await this.rateLimiter.check(`user:${userId}`, limit);
                next();
            }
            catch (err) {
                res.status(429).json({
                    success: false,
                    error: { code: 'RATE_LIMIT', message: err.message },
                });
            }
        };
    }
    /** Auth endpoint rate limit with lockout */
    authRateLimit() {
        return async (req, res, next) => {
            try {
                const identifier = req.body.phone || req.body.email || req.ip;
                await this.rateLimiter.checkAuth(identifier);
                next();
            }
            catch (err) {
                await security_metrics_1.SecurityMetrics.authFailure(this.redis);
                res.status(429).json({
                    success: false,
                    error: { code: 'AUTH_RATE_LIMIT', message: err.message },
                });
            }
        };
    }
    /** Record auth failure (call after failed login) */
    async recordAuthFailure(identifier) {
        await this.rateLimiter.recordAuthFailure(identifier);
    }
    /** Clear auth failures (call after successful login) */
    async clearAuthFailures(identifier) {
        await this.rateLimiter.clearAuthFailures(identifier);
    }
    /** Device fingerprint middleware — adds fingerprint to request */
    deviceFingerprint() {
        return (req, _res, next) => {
            const fingerprint = device_security_1.DeviceSecurity.fingerprint(req.headers, req.cookies?.deviceId);
            req.deviceFingerprint = fingerprint;
            next();
        };
    }
    /** Anomaly detection middleware */
    anomalyDetection() {
        return async (req, res, next) => {
            const userId = req.user?.sub;
            if (!userId)
                return next();
            const fingerprint = req.deviceFingerprint ||
                device_security_1.DeviceSecurity.fingerprint(req.headers);
            const ip = req.headers['x-forwarded-for'] || req.ip || 'unknown';
            const anomaly = await this.deviceSecurity.detectAnomaly(userId, fingerprint, ip);
            if (anomaly.suspicious) {
                await audit_logger_1.AuditLogger.log('http_anomaly_detected', {
                    userId,
                    reason: anomaly.reason,
                    ip,
                    path: req.path,
                });
                await security_metrics_1.SecurityMetrics.anomalyDetected(this.redis);
                // Attach flag but don't reject
                req.securityAnomaly = anomaly;
            }
            next();
        };
    }
    /** Security audit middleware — log all requests to sensitive endpoints */
    auditSensitive(endpointName) {
        return async (req, _res, next) => {
            const userId = req.user?.sub;
            await audit_logger_1.AuditLogger.log('sensitive_access', {
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
        return (_req, res, next) => {
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
    async getMetrics() {
        return security_metrics_1.SecurityMetrics.getAll(this.redis);
    }
}
exports.SecurityMiddleware = SecurityMiddleware;
//# sourceMappingURL=middleware.js.map