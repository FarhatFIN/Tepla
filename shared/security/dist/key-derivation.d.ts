/**
 * HKDF-based key derivation
 * Uses correct parameter order: (ikm, salt)
 * Info field provides domain separation between derived keys
 */
export declare class KeyDerivation {
    /** Standard HKDF derive with tepla context */
    static derive(ikm: Buffer, salt: Buffer, info?: string): Buffer;
    /** Derive message encryption key */
    static deriveMessageKey(sharedSecret: Buffer, chatId: string, messageIndex: number): Buffer;
    /** Derive session key from master key */
    static deriveSessionKey(masterKey: Buffer, sessionId: string): Buffer;
    /** Derive storage encryption key (for encrypting keys at rest) */
    static deriveStorageKey(masterKey: Buffer, keyId: string): Buffer;
    /** Derive auth token key */
    static deriveAuthKey(masterKey: Buffer, userId: string): Buffer;
}
//# sourceMappingURL=key-derivation.d.ts.map