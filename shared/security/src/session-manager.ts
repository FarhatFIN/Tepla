import crypto from 'crypto';
import { SecurityConfig } from './config';
import { AuditLogger } from './audit-logger';
import Redis from 'ioredis';

export interface SecuritySession {
  token: string;
  userId: string;
  deviceFingerprint?: string;
  ipAddress?: string;
  created: number;
}

/**
 * Session Manager
 * Secure session tokens stored in Redis with TTL
 * Independent of JWT — used for WebSocket auth and device binding
 */
export class SessionManager {
  private redis: Redis;

  constructor(redis: Redis) {
    this.redis = redis;
  }

  /** Create a new security session */
  async create(userId: string, meta?: { deviceFingerprint?: string; ipAddress?: string }): Promise<SecuritySession> {
    const token = crypto.randomBytes(SecurityConfig.TOKEN_BYTES).toString('hex');

    const session: SecuritySession = {
      token,
      userId,
      deviceFingerprint: meta?.deviceFingerprint,
      ipAddress: meta?.ipAddress,
      created: Date.now(),
    };

    await this.redis.set(
      `sec_session:${token}`,
      JSON.stringify(session),
      'EX',
      SecurityConfig.SESSION_TTL
    );

    // Track active sessions per user
    await this.redis.sadd(`sec_sessions:${userId}`, token);
    await this.redis.expire(`sec_sessions:${userId}`, SecurityConfig.SESSION_TTL);

    await AuditLogger.log('session_created', { userId, ipAddress: meta?.ipAddress });

    return session;
  }

  /** Validate a session token */
  async validate(token: string): Promise<SecuritySession | null> {
    const raw = await this.redis.get(`sec_session:${token}`);
    if (!raw) return null;
    return JSON.parse(raw);
  }

  /** Validate session and check device fingerprint */
  async validateWithDevice(token: string, fingerprint: string): Promise<SecuritySession | null> {
    const session = await this.validate(token);
    if (!session) return null;

    if (session.deviceFingerprint && session.deviceFingerprint !== fingerprint) {
      await AuditLogger.log('session_device_mismatch', {
        userId: session.userId,
        expected: session.deviceFingerprint?.substring(0, 8),
        actual: fingerprint.substring(0, 8),
      });
      return null;
    }

    return session;
  }

  /** Revoke a specific session */
  async revoke(token: string): Promise<void> {
    const session = await this.validate(token);
    if (session) {
      await this.redis.del(`sec_session:${token}`);
      await this.redis.srem(`sec_sessions:${session.userId}`, token);
      await AuditLogger.log('session_revoked', { userId: session.userId });
    }
  }

  /** Revoke all sessions for a user */
  async revokeAll(userId: string): Promise<number> {
    const tokens = await this.redis.smembers(`sec_sessions:${userId}`);
    if (tokens.length > 0) {
      const keys = tokens.map((t) => `sec_session:${t}`);
      await this.redis.del(...keys);
      await this.redis.del(`sec_sessions:${userId}`);
      await AuditLogger.log('sessions_revoked_all', { userId, count: tokens.length });
    }
    return tokens.length;
  }

  /** Get all active sessions for a user */
  async getActiveSessions(userId: string): Promise<SecuritySession[]> {
    const tokens = await this.redis.smembers(`sec_sessions:${userId}`);
    const sessions: SecuritySession[] = [];

    for (const token of tokens) {
      const session = await this.validate(token);
      if (session) {
        sessions.push(session);
      } else {
        // Clean up stale reference
        await this.redis.srem(`sec_sessions:${userId}`, token);
      }
    }

    return sessions;
  }
}
