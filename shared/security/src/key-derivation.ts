import crypto from 'crypto';

/**
 * HKDF-based key derivation
 * Uses correct parameter order: (ikm, salt)
 * Info field provides domain separation between derived keys
 */
export class KeyDerivation {

  /** Standard HKDF derive with tepla context */
  static derive(ikm: Buffer, salt: Buffer, info: string = 'tepla_secure_key'): Buffer {
    return Buffer.from(
      crypto.hkdfSync('sha256', ikm, salt, Buffer.from(info), 32)
    );
  }

  /** Derive message encryption key */
  static deriveMessageKey(sharedSecret: Buffer, chatId: string, messageIndex: number): Buffer {
    const salt = Buffer.from(`${chatId}:${messageIndex}`);
    return this.derive(sharedSecret, salt, 'tepla_message_key');
  }

  /** Derive session key from master key */
  static deriveSessionKey(masterKey: Buffer, sessionId: string): Buffer {
    const salt = Buffer.from(sessionId);
    return this.derive(masterKey, salt, 'tepla_session_key');
  }

  /** Derive storage encryption key (for encrypting keys at rest) */
  static deriveStorageKey(masterKey: Buffer, keyId: string): Buffer {
    const salt = Buffer.from(keyId);
    return this.derive(masterKey, salt, 'tepla_storage_key');
  }

  /** Derive auth token key */
  static deriveAuthKey(masterKey: Buffer, userId: string): Buffer {
    const salt = Buffer.from(userId);
    return this.derive(masterKey, salt, 'tepla_auth_key');
  }
}
