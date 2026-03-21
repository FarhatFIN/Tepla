import crypto from 'crypto';
import sodium from 'libsodium-wrappers';
import { SecurityConfig } from './config';
import { AuditLogger } from './audit-logger';

export interface EncryptedPayload {
  iv: string;
  tag: string;
  data: string;
}

export class CryptoCore {

  /** SHA-256 hash */
  static sha256(data: Buffer | string): Buffer {
    return crypto.createHash('sha256').update(data).digest();
  }

  /** Generate cryptographic nonce */
  static nonce(): string {
    return crypto.randomBytes(SecurityConfig.NONCE_BYTES).toString('hex');
  }

  /** Generate secure random token */
  static token(bytes: number = SecurityConfig.TOKEN_BYTES): string {
    return crypto.randomBytes(bytes).toString('hex');
  }

  /** Generate X25519 key pair via libsodium */
  static generateKeyPair(): { publicKey: string; privateKey: string } {
    const kp = sodium.crypto_box_keypair();
    return {
      publicKey: Buffer.from(kp.publicKey).toString('base64'),
      privateKey: Buffer.from(kp.privateKey).toString('base64'),
    };
  }

  /** Generate signing key pair (Ed25519) */
  static generateSigningKeyPair(): { publicKey: string; privateKey: string } {
    const kp = sodium.crypto_sign_keypair();
    return {
      publicKey: Buffer.from(kp.publicKey).toString('base64'),
      privateKey: Buffer.from(kp.privateKey).toString('base64'),
    };
  }

  /** Derive shared secret from X25519 key exchange */
  static sharedKey(privateKey: string, publicKey: string): Buffer {
    const priv = Buffer.from(privateKey, 'base64');
    const pub = Buffer.from(publicKey, 'base64');
    const shared = sodium.crypto_scalarmult(
      new Uint8Array(priv),
      new Uint8Array(pub)
    );
    return this.sha256(Buffer.from(shared));
  }

  /** Sign a message with Ed25519 */
  static sign(message: string, privateKey: string): string {
    const priv = Buffer.from(privateKey, 'base64');
    const sig = sodium.crypto_sign_detached(
      new Uint8Array(Buffer.from(message, 'utf8')),
      new Uint8Array(priv)
    );
    return Buffer.from(sig).toString('base64');
  }

  /** Verify Ed25519 signature */
  static verify(message: string, signature: string, publicKey: string): boolean {
    try {
      const pub = Buffer.from(publicKey, 'base64');
      const sig = Buffer.from(signature, 'base64');
      return sodium.crypto_sign_verify_detached(
        new Uint8Array(sig),
        new Uint8Array(Buffer.from(message, 'utf8')),
        new Uint8Array(pub)
      );
    } catch {
      return false;
    }
  }

  /** AES-256-GCM encryption */
  static encrypt(message: string, key: Buffer): EncryptedPayload {
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
    const encrypted = Buffer.concat([
      cipher.update(message, 'utf8'),
      cipher.final(),
    ]);
    const tag = cipher.getAuthTag();

    return {
      iv: iv.toString('hex'),
      tag: tag.toString('hex'),
      data: encrypted.toString('hex'),
    };
  }

  /** AES-256-GCM decryption with safe error handling */
  static decrypt(payload: EncryptedPayload, key: Buffer): string | null {
    try {
      const iv = Buffer.from(payload.iv, 'hex');
      const tag = Buffer.from(payload.tag, 'hex');
      const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
      decipher.setAuthTag(tag);

      const decrypted = Buffer.concat([
        decipher.update(Buffer.from(payload.data, 'hex')),
        decipher.final(),
      ]);

      return decrypted.toString('utf8');
    } catch (err) {
      AuditLogger.log('decrypt_failed', { error: String(err) });
      return null;
    }
  }

  /** Encrypt a Buffer (for key-at-rest encryption) */
  static encryptBuffer(data: Buffer, key: Buffer): EncryptedPayload {
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
    const encrypted = Buffer.concat([cipher.update(data), cipher.final()]);
    const tag = cipher.getAuthTag();

    return {
      iv: iv.toString('hex'),
      tag: tag.toString('hex'),
      data: encrypted.toString('hex'),
    };
  }

  /** Decrypt a Buffer */
  static decryptBuffer(payload: EncryptedPayload, key: Buffer): Buffer | null {
    try {
      const iv = Buffer.from(payload.iv, 'hex');
      const tag = Buffer.from(payload.tag, 'hex');
      const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
      decipher.setAuthTag(tag);
      return Buffer.concat([
        decipher.update(Buffer.from(payload.data, 'hex')),
        decipher.final(),
      ]);
    } catch {
      return null;
    }
  }
}
