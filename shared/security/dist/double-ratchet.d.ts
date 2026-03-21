import Redis from 'ioredis';
/**
 * Double Ratchet Protocol
 *
 * Implements bidirectional key ratcheting for forward secrecy:
 * - Each message uses a unique key derived from the ratchet chain
 * - Atomic Redis WATCH/MULTI for concurrent key advancement
 * - Keys encrypted at rest in Redis
 * - Send/recv key symmetry: A's send key = B's recv key
 */
export declare class DoubleRatchet {
    private redis;
    constructor(redis: Redis);
    /** Initialize a new ratchet session between two users */
    create(sessionId: string, userA: string, userB: string, sharedKey: Buffer): Promise<void>;
    /**
     * Advance the ratchet and return the current key
     * Uses Redis WATCH/MULTI for atomic CAS (Compare-And-Swap)
     * to prevent race conditions in concurrent access
     */
    nextKey(type: 'send' | 'recv', sessionId: string, userId: string): Promise<Buffer>;
    /** Get session info */
    getSession(sessionId: string): Promise<{
        userA: string;
        userB: string;
        created: number;
    } | null>;
    /** Destroy a ratchet session */
    destroy(sessionId: string): Promise<void>;
}
//# sourceMappingURL=double-ratchet.d.ts.map