"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RateLimiter = void 0;
class RateLimiter {
    constructor(redis) {
        this.redis = redis;
    }
    /**
     * Sliding window rate limiter using Redis sorted sets
     */
    async isAllowed(key, maxRequests, windowMs) {
        const now = Date.now();
        const windowStart = now - windowMs;
        const member = `${now}-${Math.random().toString(36).slice(2, 8)}`;
        const pipe = this.redis.pipeline();
        pipe.zremrangebyscore(key, '-inf', windowStart.toString());
        pipe.zadd(key, now.toString(), member);
        pipe.zcard(key);
        pipe.pexpire(key, windowMs);
        const results = await pipe.exec();
        const currentCount = results?.[2]?.[1] || 0;
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
exports.RateLimiter = RateLimiter;
//# sourceMappingURL=rate-limiter.js.map