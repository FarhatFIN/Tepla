"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.authMiddleware = authMiddleware;
exports.premiumMiddleware = premiumMiddleware;
exports.correlationMiddleware = correlationMiddleware;
exports.requestLoggerMiddleware = requestLoggerMiddleware;
exports.rateLimitMiddleware = rateLimitMiddleware;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const errors_1 = require("./errors");
const logger_1 = require("./logger");
const logger = (0, logger_1.createLogger)('middleware');
// ─── JWT Auth Middleware ─────────────────────
function authMiddleware(jwtSecret) {
    const secret = jwtSecret || process.env.JWT_SECRET || 'tepla-secret';
    return (req, _res, next) => {
        const authHeader = req.headers.authorization;
        if (!authHeader?.startsWith('Bearer ')) {
            throw new errors_1.UnauthorizedError('Missing or invalid authorization header');
        }
        const token = authHeader.slice(7);
        try {
            const payload = jsonwebtoken_1.default.verify(token, secret);
            req.user = payload;
            next();
        }
        catch (err) {
            if (err.name === 'TokenExpiredError') {
                throw new errors_1.UnauthorizedError('Token expired');
            }
            throw new errors_1.UnauthorizedError('Invalid token');
        }
    };
}
// ─── Premium Check Middleware ────────────────
function premiumMiddleware(redis) {
    return async (req, _res, next) => {
        if (!req.user) {
            throw new errors_1.UnauthorizedError();
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
        throw new errors_1.ForbiddenError('Premium subscription required');
    };
}
// ─── Correlation ID Middleware ───────────────
function correlationMiddleware() {
    return (req, _res, next) => {
        req.correlationId = req.headers['x-correlation-id'] ||
            `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
        next();
    };
}
// ─── Request Logger Middleware ───────────────
function requestLoggerMiddleware(serviceName) {
    const svcLogger = (0, logger_1.createLogger)(serviceName);
    return (req, res, next) => {
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
function rateLimitMiddleware(redis, opts) {
    const { windowMs, maxRequests, keyPrefix = 'rl' } = opts;
    const windowSec = Math.ceil(windowMs / 1000);
    return async (req, res, next) => {
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
//# sourceMappingURL=middleware.js.map