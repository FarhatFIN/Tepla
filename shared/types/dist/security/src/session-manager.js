"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SessionManager = void 0;
const crypto_1 = __importDefault(require("crypto"));
const config_1 = require("./config");
const audit_logger_1 = require("./audit-logger");
/**
 * Session Manager
 * Secure session tokens stored in Redis with TTL
 * Independent of JWT — used for WebSocket auth and device binding
 */
class SessionManager {
    redis;
    constructor(redis) {
        this.redis = redis;
    }
    /** Create a new security session */
    async create(userId, meta) {
        const token = crypto_1.default.randomBytes(config_1.SecurityConfig.TOKEN_BYTES).toString('hex');
        const session = {
            token,
            userId,
            deviceFingerprint: meta?.deviceFingerprint,
            ipAddress: meta?.ipAddress,
            created: Date.now(),
        };
        await this.redis.set(`sec_session:${token}`, JSON.stringify(session), 'EX', config_1.SecurityConfig.SESSION_TTL);
        // Track active sessions per user
        await this.redis.sadd(`sec_sessions:${userId}`, token);
        await this.redis.expire(`sec_sessions:${userId}`, config_1.SecurityConfig.SESSION_TTL);
        await audit_logger_1.AuditLogger.log('session_created', { userId, ipAddress: meta?.ipAddress });
        return session;
    }
    /** Validate a session token */
    async validate(token) {
        const raw = await this.redis.get(`sec_session:${token}`);
        if (!raw)
            return null;
        return JSON.parse(raw);
    }
    /** Validate session and check device fingerprint */
    async validateWithDevice(token, fingerprint) {
        const session = await this.validate(token);
        if (!session)
            return null;
        if (session.deviceFingerprint && session.deviceFingerprint !== fingerprint) {
            await audit_logger_1.AuditLogger.log('session_device_mismatch', {
                userId: session.userId,
                expected: session.deviceFingerprint?.substring(0, 8),
                actual: fingerprint.substring(0, 8),
            });
            return null;
        }
        return session;
    }
    /** Revoke a specific session */
    async revoke(token) {
        const session = await this.validate(token);
        if (session) {
            await this.redis.del(`sec_session:${token}`);
            await this.redis.srem(`sec_sessions:${session.userId}`, token);
            await audit_logger_1.AuditLogger.log('session_revoked', { userId: session.userId });
        }
    }
    /** Revoke all sessions for a user */
    async revokeAll(userId) {
        const tokens = await this.redis.smembers(`sec_sessions:${userId}`);
        if (tokens.length > 0) {
            const keys = tokens.map((t) => `sec_session:${t}`);
            await this.redis.del(...keys);
            await this.redis.del(`sec_sessions:${userId}`);
            await audit_logger_1.AuditLogger.log('sessions_revoked_all', { userId, count: tokens.length });
        }
        return tokens.length;
    }
    /** Get all active sessions for a user */
    async getActiveSessions(userId) {
        const tokens = await this.redis.smembers(`sec_sessions:${userId}`);
        const sessions = [];
        for (const token of tokens) {
            const session = await this.validate(token);
            if (session) {
                sessions.push(session);
            }
            else {
                // Clean up stale reference
                await this.redis.srem(`sec_sessions:${userId}`, token);
            }
        }
        return sessions;
    }
}
exports.SessionManager = SessionManager;
//# sourceMappingURL=session-manager.js.map