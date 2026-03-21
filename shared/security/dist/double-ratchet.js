"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DoubleRatchet = void 0;
const crypto_core_1 = require("./crypto-core");
const key_derivation_1 = require("./key-derivation");
const key_storage_1 = require("./key-storage");
const audit_logger_1 = require("./audit-logger");
/**
 * Double Ratchet Protocol
 *
 * Implements bidirectional key ratcheting for forward secrecy:
 * - Each message uses a unique key derived from the ratchet chain
 * - Atomic Redis WATCH/MULTI for concurrent key advancement
 * - Keys encrypted at rest in Redis
 * - Send/recv key symmetry: A's send key = B's recv key
 */
class DoubleRatchet {
    redis;
    constructor(redis) {
        this.redis = redis;
    }
    /** Initialize a new ratchet session between two users */
    async create(sessionId, userA, userB, sharedKey) {
        const root = crypto_core_1.CryptoCore.sha256(sharedKey);
        // Derive separate chain keys for each direction
        const keyA = key_derivation_1.KeyDerivation.derive(root, Buffer.from('A'), 'tepla_ratchet_a');
        const keyB = key_derivation_1.KeyDerivation.derive(root, Buffer.from('B'), 'tepla_ratchet_b');
        // A→B direction: A sends with keyA, B receives with keyA
        await this.redis.set(`ratchet:send:${sessionId}:${userA}`, (0, key_storage_1.encryptKey)(keyA));
        await this.redis.set(`ratchet:recv:${sessionId}:${userB}`, (0, key_storage_1.encryptKey)(keyA));
        // B→A direction: B sends with keyB, A receives with keyB
        await this.redis.set(`ratchet:send:${sessionId}:${userB}`, (0, key_storage_1.encryptKey)(keyB));
        await this.redis.set(`ratchet:recv:${sessionId}:${userA}`, (0, key_storage_1.encryptKey)(keyB));
        // Store session metadata
        await this.redis.set(`ratchet:session:${sessionId}`, JSON.stringify({ userA, userB, created: Date.now() }));
        await audit_logger_1.AuditLogger.log('ratchet_created', { sessionId, userA, userB });
    }
    /**
     * Advance the ratchet and return the current key
     * Uses Redis WATCH/MULTI for atomic CAS (Compare-And-Swap)
     * to prevent race conditions in concurrent access
     */
    async nextKey(type, sessionId, userId) {
        const keyId = `ratchet:${type}:${sessionId}:${userId}`;
        // Optimistic locking with retry
        for (let attempt = 0; attempt < 10; attempt++) {
            await this.redis.watch(keyId);
            const raw = await this.redis.get(keyId);
            if (!raw) {
                await this.redis.unwatch();
                throw new Error(`Ratchet state missing: ${type}:${sessionId}:${userId}`);
            }
            const current = (0, key_storage_1.decryptKey)(raw);
            const next = crypto_core_1.CryptoCore.sha256(current);
            const multi = this.redis.multi();
            multi.set(keyId, (0, key_storage_1.encryptKey)(next));
            const result = await multi.exec();
            if (result) {
                // CAS succeeded — return the current (pre-advancement) key
                return current;
            }
            // CAS failed (concurrent update) — retry
            await audit_logger_1.AuditLogger.log('ratchet_cas_retry', { sessionId, userId, type, attempt });
        }
        throw new Error(`Ratchet CAS failed after 10 attempts: ${sessionId}:${userId}`);
    }
    /** Get session info */
    async getSession(sessionId) {
        const raw = await this.redis.get(`ratchet:session:${sessionId}`);
        return raw ? JSON.parse(raw) : null;
    }
    /** Destroy a ratchet session */
    async destroy(sessionId) {
        const session = await this.getSession(sessionId);
        if (!session)
            return;
        const keys = [
            `ratchet:send:${sessionId}:${session.userA}`,
            `ratchet:recv:${sessionId}:${session.userA}`,
            `ratchet:send:${sessionId}:${session.userB}`,
            `ratchet:recv:${sessionId}:${session.userB}`,
            `ratchet:session:${sessionId}`,
        ];
        await this.redis.del(...keys);
        await audit_logger_1.AuditLogger.log('ratchet_destroyed', { sessionId });
    }
}
exports.DoubleRatchet = DoubleRatchet;
//# sourceMappingURL=double-ratchet.js.map