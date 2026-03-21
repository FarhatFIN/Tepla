import { RedisClient } from './redis';
export declare class RateLimiter {
    private redis;
    constructor(redis: RedisClient);
    /**
     * Sliding window rate limiter using Redis sorted sets
     */
    isAllowed(key: string, maxRequests: number, windowMs: number): Promise<{
        allowed: boolean;
        remaining: number;
        retryAfter?: number;
    }>;
}
//# sourceMappingURL=rate-limiter.d.ts.map