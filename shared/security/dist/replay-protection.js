"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ReplayProtection = void 0;
const config_1 = require("./config");
const audit_logger_1 = require("./audit-logger");
const security_metrics_1 = require("./security-metrics");
/**
 * Replay Protection
 * Uses Redis NX + TTL to ensure each nonce is used exactly once.
 * Prevents message replay attacks within the NONCE_TTL window.
 */
class ReplayProtection {
    redis;
    constructor(redis) {
        this.redis = redis;
    }
    /** Validate a nonce — returns true if fresh, throws if replayed */
    async validate(userId, nonce) {
        const key = `nonce:${userId}:${nonce}`;
        // SET NX (only if not exists) + EX (TTL)
        const ok = await this.redis.set(key, '1', 'EX', config_1.SecurityConfig.NONCE_TTL, 'NX');
        if (!ok) {
            await security_metrics_1.SecurityMetrics.replay(this.redis);
            await audit_logger_1.AuditLogger.log('replay_detected', { userId, nonce: nonce.substring(0, 8) });
            throw new Error('Replay detected: nonce already used');
        }
    }
    /** Check without throwing (returns boolean) */
    async check(userId, nonce) {
        const key = `nonce:${userId}:${nonce}`;
        const ok = await this.redis.set(key, '1', 'EX', config_1.SecurityConfig.NONCE_TTL, 'NX');
        return !!ok;
    }
    /** Batch validate multiple nonces (for message batches) */
    async validateBatch(userId, nonces) {
        const pipe = this.redis.pipeline();
        for (const nonce of nonces) {
            pipe.set(`nonce:${userId}:${nonce}`, '1', 'EX', config_1.SecurityConfig.NONCE_TTL, 'NX');
        }
        const results = await pipe.exec();
        if (!results)
            throw new Error('Replay validation pipeline failed');
        for (let i = 0; i < results.length; i++) {
            const [err, result] = results[i];
            if (err || !result) {
                await security_metrics_1.SecurityMetrics.replay(this.redis);
                await audit_logger_1.AuditLogger.log('replay_detected_batch', {
                    userId,
                    nonce: nonces[i].substring(0, 8),
                    index: i,
                });
                throw new Error(`Replay detected: nonce ${nonces[i].substring(0, 8)} already used`);
            }
        }
    }
}
exports.ReplayProtection = ReplayProtection;
//# sourceMappingURL=replay-protection.js.map