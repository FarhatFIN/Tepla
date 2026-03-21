import Redis from 'ioredis';
/**
 * Replay Protection
 * Uses Redis NX + TTL to ensure each nonce is used exactly once.
 * Prevents message replay attacks within the NONCE_TTL window.
 */
export declare class ReplayProtection {
    private redis;
    constructor(redis: Redis);
    /** Validate a nonce — returns true if fresh, throws if replayed */
    validate(userId: string, nonce: string): Promise<void>;
    /** Check without throwing (returns boolean) */
    check(userId: string, nonce: string): Promise<boolean>;
    /** Batch validate multiple nonces (for message batches) */
    validateBatch(userId: string, nonces: string[]): Promise<void>;
}
//# sourceMappingURL=replay-protection.d.ts.map