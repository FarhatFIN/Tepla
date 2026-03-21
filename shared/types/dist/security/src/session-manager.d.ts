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
export declare class SessionManager {
    private redis;
    constructor(redis: Redis);
    /** Create a new security session */
    create(userId: string, meta?: {
        deviceFingerprint?: string;
        ipAddress?: string;
    }): Promise<SecuritySession>;
    /** Validate a session token */
    validate(token: string): Promise<SecuritySession | null>;
    /** Validate session and check device fingerprint */
    validateWithDevice(token: string, fingerprint: string): Promise<SecuritySession | null>;
    /** Revoke a specific session */
    revoke(token: string): Promise<void>;
    /** Revoke all sessions for a user */
    revokeAll(userId: string): Promise<number>;
    /** Get all active sessions for a user */
    getActiveSessions(userId: string): Promise<SecuritySession[]>;
}
//# sourceMappingURL=session-manager.d.ts.map