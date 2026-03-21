"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SecurityRateLimiter = void 0;
const config_1 = require("./config");
const security_metrics_1 = require("./security-metrics");
const audit_logger_1 = require("./audit-logger");
/**
 * Security Rate Limiter
 * Redis-backed with atomic INCR + TTL fix for race condition.
 * Separate from the @tepla/common rate limiter — this is for
 * security-critical endpoints (auth, OTP, message encryption).
 */
class SecurityRateLimiter {
    redis;
    constructor(redis) {
        this.redis = redis;
    }
    /** Check rate limit — throws if exceeded */
    async check(key, limit = config_1.SecurityConfig.RATE_LIMIT_DEFAULT) {
        const redisKey = `sec_rate:${key}`;
        // Atomic INCR
        const count = await this.redis.incr(redisKey);
        // Fix TTL race condition: always set expiry on first increment
        if (count === 1) {
            await this.redis.expire(redisKey, config_1.SecurityConfig.RATE_LIMIT_WINDOW);
        }
        else {
            // Safety: if TTL was lost (Redis restart), re-set it
            const ttl = await this.redis.ttl(redisKey);
            if (ttl < 0) {
                await this.redis.expire(redisKey, config_1.SecurityConfig.RATE_LIMIT_WINDOW);
            }
        }
        if (count > limit) {
            await security_metrics_1.SecurityMetrics.rateLimit(this.redis);
            await audit_logger_1.AuditLogger.log('rate_limit_exceeded', { key, count, limit });
            throw new Error(`Rate limit exceeded: ${key} (${count}/${limit})`);
        }
    }
    /** Check without throwing — returns remaining count */
    async remaining(key, limit = config_1.SecurityConfig.RATE_LIMIT_DEFAULT) {
        const redisKey = `sec_rate:${key}`;
        const count = parseInt(await this.redis.get(redisKey) || '0');
        return Math.max(0, limit - count);
    }
    /** Reset rate limit for a key */
    async reset(key) {
        await this.redis.del(`sec_rate:${key}`);
    }
    /** Auth-specific rate limiter with lockout */
    async checkAuth(identifier) {
        const lockKey = `sec_lockout:${identifier}`;
        const isLocked = await this.redis.get(lockKey);
        if (isLocked) {
            const ttl = await this.redis.ttl(lockKey);
            throw new Error(`Account locked. Retry in ${ttl} seconds.`);
        }
        await this.check(`auth:${identifier}`, config_1.SecurityConfig.MAX_AUTH_FAILURES);
    }
    /** Record auth failure — lock after threshold */
    async recordAuthFailure(identifier) {
        const key = `sec_rate:auth:${identifier}`;
        const count = await this.redis.incr(key);
        if (count === 1) {
            await this.redis.expire(key, config_1.SecurityConfig.RATE_LIMIT_WINDOW);
        }
        if (count >= config_1.SecurityConfig.MAX_AUTH_FAILURES) {
            // Lock the account
            await this.redis.set(`sec_lockout:${identifier}`, '1', 'EX', config_1.SecurityConfig.AUTH_LOCKOUT_SECONDS);
            await security_metrics_1.SecurityMetrics.authFailure(this.redis);
            await audit_logger_1.AuditLogger.log('auth_lockout', { identifier, failures: count });
        }
    }
    /** Clear auth failures (on successful login) */
    async clearAuthFailures(identifier) {
        await this.redis.del(`sec_rate:auth:${identifier}`, `sec_lockout:${identifier}`);
    }
}
exports.SecurityRateLimiter = SecurityRateLimiter;
//# sourceMappingURL=rate-limiter.js.map