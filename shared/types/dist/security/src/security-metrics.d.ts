import Redis from 'ioredis';
/**
 * Security Metrics
 * Counters for monitoring security events.
 * Consumed by Analytics Service for dashboards.
 */
export declare class SecurityMetrics {
    static authFailure(redis: Redis): Promise<void>;
    static authSuccess(redis: Redis): Promise<void>;
    static replay(redis: Redis): Promise<void>;
    static rateLimit(redis: Redis): Promise<void>;
    static encryptionError(redis: Redis): Promise<void>;
    static anomalyDetected(redis: Redis): Promise<void>;
    /** Get all metrics for dashboard */
    static getAll(redis: Redis): Promise<Record<string, number>>;
}
//# sourceMappingURL=security-metrics.d.ts.map