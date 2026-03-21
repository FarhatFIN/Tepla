"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SecurityMetrics = void 0;
/**
 * Security Metrics
 * Counters for monitoring security events.
 * Consumed by Analytics Service for dashboards.
 */
class SecurityMetrics {
    static async authFailure(redis) {
        const today = new Date().toISOString().split('T')[0];
        await redis.incr(`sec_metric:auth_fail:${today}`);
        await redis.incr('sec_metric:auth_fail:total');
        await redis.expire(`sec_metric:auth_fail:${today}`, 86400 * 30);
    }
    static async authSuccess(redis) {
        const today = new Date().toISOString().split('T')[0];
        await redis.incr(`sec_metric:auth_success:${today}`);
    }
    static async replay(redis) {
        const today = new Date().toISOString().split('T')[0];
        await redis.incr(`sec_metric:replay:${today}`);
        await redis.incr('sec_metric:replay:total');
        await redis.expire(`sec_metric:replay:${today}`, 86400 * 30);
    }
    static async rateLimit(redis) {
        const today = new Date().toISOString().split('T')[0];
        await redis.incr(`sec_metric:rate_limit:${today}`);
        await redis.incr('sec_metric:rate_limit:total');
        await redis.expire(`sec_metric:rate_limit:${today}`, 86400 * 30);
    }
    static async encryptionError(redis) {
        await redis.incr('sec_metric:encryption_error:total');
    }
    static async anomalyDetected(redis) {
        const today = new Date().toISOString().split('T')[0];
        await redis.incr(`sec_metric:anomaly:${today}`);
        await redis.expire(`sec_metric:anomaly:${today}`, 86400 * 30);
    }
    /** Get all metrics for dashboard */
    static async getAll(redis) {
        const today = new Date().toISOString().split('T')[0];
        const keys = [
            `sec_metric:auth_fail:${today}`,
            `sec_metric:auth_success:${today}`,
            `sec_metric:replay:${today}`,
            `sec_metric:rate_limit:${today}`,
            `sec_metric:anomaly:${today}`,
            'sec_metric:auth_fail:total',
            'sec_metric:replay:total',
            'sec_metric:rate_limit:total',
            'sec_metric:encryption_error:total',
        ];
        const pipe = redis.pipeline();
        for (const key of keys) {
            pipe.get(key);
        }
        const results = await pipe.exec();
        const metrics = {};
        keys.forEach((key, i) => {
            const name = key.replace('sec_metric:', '').replace(`:${today}`, '_today');
            metrics[name] = parseInt(results?.[i]?.[1] || '0');
        });
        return metrics;
    }
}
exports.SecurityMetrics = SecurityMetrics;
//# sourceMappingURL=security-metrics.js.map