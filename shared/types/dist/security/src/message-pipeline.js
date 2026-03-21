"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MessagePipeline = void 0;
const crypto_core_1 = require("./crypto-core");
const double_ratchet_1 = require("./double-ratchet");
const replay_protection_1 = require("./replay-protection");
const rate_limiter_1 = require("./rate-limiter");
const audit_logger_1 = require("./audit-logger");
const config_1 = require("./config");
/**
 * Secure Message Pipeline
 * End-to-end encryption with Double Ratchet, replay protection,
 * and rate limiting for message send/receive.
 */
class MessagePipeline {
    ratchet;
    replay;
    rateLimiter;
    constructor(redis) {
        this.ratchet = new double_ratchet_1.DoubleRatchet(redis);
        this.replay = new replay_protection_1.ReplayProtection(redis);
        this.rateLimiter = new rate_limiter_1.SecurityRateLimiter(redis);
    }
    /** Encrypt outgoing message */
    async outgoing(sessionId, userId, message) {
        // Rate limit messages
        await this.rateLimiter.check(`msg:${userId}`, config_1.SecurityConfig.MESSAGE_LIMIT_PER_MINUTE);
        // Get next ratchet key
        const key = await this.ratchet.nextKey('send', sessionId, userId);
        // Encrypt with AES-256-GCM
        const payload = crypto_core_1.CryptoCore.encrypt(message, key);
        return {
            nonce: payload.iv,
            payload,
            ts: Date.now(),
        };
    }
    /** Decrypt incoming message */
    async incoming(sessionId, userId, packet) {
        // Validate nonce (replay protection)
        await this.replay.validate(userId, packet.nonce);
        // Check timestamp freshness (reject messages older than 5 minutes)
        const age = Date.now() - packet.ts;
        if (age > 5 * 60 * 1000) {
            await audit_logger_1.AuditLogger.log('message_too_old', {
                sessionId,
                userId,
                age,
            });
            throw new Error('Message expired');
        }
        // Get next ratchet key
        const key = await this.ratchet.nextKey('recv', sessionId, userId);
        // Decrypt
        const message = crypto_core_1.CryptoCore.decrypt(packet.payload, key);
        if (message === null) {
            await audit_logger_1.AuditLogger.log('message_decrypt_failed', { sessionId, userId });
            return null;
        }
        return message;
    }
    /** Create a ratchet session for a direct chat */
    async createSession(sessionId, userA, userB, sharedKey) {
        await this.ratchet.create(sessionId, userA, userB, sharedKey);
    }
    /** Destroy a ratchet session */
    async destroySession(sessionId) {
        await this.ratchet.destroy(sessionId);
    }
}
exports.MessagePipeline = MessagePipeline;
//# sourceMappingURL=message-pipeline.js.map