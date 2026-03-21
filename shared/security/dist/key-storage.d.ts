/** Encrypt a key for storage in Redis */
export declare function encryptKey(data: Buffer): string;
/** Decrypt a key from Redis storage */
export declare function decryptKey(payload: string): Buffer;
/** Key storage helper — wraps Redis operations with encryption */
export declare class KeyStorage {
    private redis;
    constructor(redis: import('ioredis').default);
    store(keyId: string, key: Buffer, ttl?: number): Promise<void>;
    retrieve(keyId: string): Promise<Buffer | null>;
    delete(keyId: string): Promise<void>;
    exists(keyId: string): Promise<boolean>;
}
//# sourceMappingURL=key-storage.d.ts.map