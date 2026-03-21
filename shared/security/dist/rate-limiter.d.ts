import Redis from 'ioredis';
/**
 * Security Rate Limiter
 * Redis-backed with atomic INCR + TTL fix for race condition.
 * Separate from the @tepla/common rate limiter — this is for
 * security-critical endpoints (auth, OTP, message encryption).
 */
export declare class SecurityRateLimiter {
    private redis;
    constructor(redis: Redis);
    /** Check rate limit — throws if exceeded */
    check(key: string, limit?: number): Promise<void>;
    /** Check without throwing — returns remaining count */
    remaining(key: string, limit?: number): Promise<number>;
    /** Reset rate limit for a key */
    reset(key: string): Promise<void>;
    /** Auth-specific rate limiter with lockout */
    checkAuth(identifier: string): Promise<void>;
    /** Record auth failure — lock after threshold */
    recordAuthFailure(identifier: string): Promise<void>;
    /** Clear auth failures (on successful login) */
    clearAuthFailures(identifier: string): Promise<void>;
}
//# sourceMappingURL=rate-limiter.d.ts.map