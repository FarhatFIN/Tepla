export interface EncryptedPayload {
    iv: string;
    tag: string;
    data: string;
}
export declare class CryptoCore {
    /** SHA-256 hash */
    static sha256(data: Buffer | string): Buffer;
    /** Generate cryptographic nonce */
    static nonce(): string;
    /** Generate secure random token */
    static token(bytes?: number): string;
    /** Generate X25519 key pair via libsodium */
    static generateKeyPair(): {
        publicKey: string;
        privateKey: string;
    };
    /** Generate signing key pair (Ed25519) */
    static generateSigningKeyPair(): {
        publicKey: string;
        privateKey: string;
    };
    /** Derive shared secret from X25519 key exchange */
    static sharedKey(privateKey: string, publicKey: string): Buffer;
    /** Sign a message with Ed25519 */
    static sign(message: string, privateKey: string): string;
    /** Verify Ed25519 signature */
    static verify(message: string, signature: string, publicKey: string): boolean;
    /** AES-256-GCM encryption */
    static encrypt(message: string, key: Buffer): EncryptedPayload;
    /** AES-256-GCM decryption with safe error handling */
    static decrypt(payload: EncryptedPayload, key: Buffer): string | null;
    /** Encrypt a Buffer (for key-at-rest encryption) */
    static encryptBuffer(data: Buffer, key: Buffer): EncryptedPayload;
    /** Decrypt a Buffer */
    static decryptBuffer(payload: EncryptedPayload, key: Buffer): Buffer | null;
}
//# sourceMappingURL=crypto-core.d.ts.map