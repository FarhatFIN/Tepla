import { EncryptedPayload } from './crypto-core';
import Redis from 'ioredis';
export interface SecureMessage {
    nonce: string;
    payload: EncryptedPayload;
    ts: number;
    signature?: string;
}
/**
 * Secure Message Pipeline
 * End-to-end encryption with Double Ratchet, replay protection,
 * and rate limiting for message send/receive.
 */
export declare class MessagePipeline {
    private ratchet;
    private replay;
    private rateLimiter;
    constructor(redis: Redis);
    /** Encrypt outgoing message */
    outgoing(sessionId: string, userId: string, message: string): Promise<SecureMessage>;
    /** Decrypt incoming message */
    incoming(sessionId: string, userId: string, packet: SecureMessage): Promise<string | null>;
    /** Create a ratchet session for a direct chat */
    createSession(sessionId: string, userA: string, userB: string, sharedKey: Buffer): Promise<void>;
    /** Destroy a ratchet session */
    destroySession(sessionId: string): Promise<void>;
}
//# sourceMappingURL=message-pipeline.d.ts.map