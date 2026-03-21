import crypto from 'crypto';
import { SecurityConfig } from './config';

/**
 * Encrypted key storage
 * All ratchet keys are encrypted at rest using AES-256-GCM
 * with the master key derived from SECURITY_MASTER_KEY
 */

function masterKey(): Buffer {
  const source = SecurityConfig.MASTER_KEY || 'dev-fallback-key-DO-NOT-USE-IN-PRODUCTION';
  return crypto.createHash('sha256').update(source).digest();
}

/** Encrypt a key for storage in Redis */
export function encryptKey(data: Buffer): string {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', masterKey(), iv);
  const encrypted = Buffer.concat([cipher.update(data), cipher.final()]);
  const tag = cipher.getAuthTag();

  return JSON.stringify({
    iv: iv.toString('hex'),
    tag: tag.toString('hex'),
    data: encrypted.toString('hex'),
  });
}

/** Decrypt a key from Redis storage */
export function decryptKey(payload: string): Buffer {
  const parsed = JSON.parse(payload);
  const iv = Buffer.from(parsed.iv, 'hex');
  const tag = Buffer.from(parsed.tag, 'hex');

  const decipher = crypto.createDecipheriv('aes-256-gcm', masterKey(), iv);
  decipher.setAuthTag(tag);

  return Buffer.concat([
    decipher.update(Buffer.from(parsed.data, 'hex')),
    decipher.final(),
  ]);
}

/** Key storage helper — wraps Redis operations with encryption */
export class KeyStorage {
  constructor(private redis: import('ioredis').default) {}

  async store(keyId: string, key: Buffer, ttl?: number): Promise<void> {
    const encrypted = encryptKey(key);
    if (ttl) {
      await this.redis.set(keyId, encrypted, 'EX', ttl);
    } else {
      await this.redis.set(keyId, encrypted);
    }
  }

  async retrieve(keyId: string): Promise<Buffer | null> {
    const raw = await this.redis.get(keyId);
    if (!raw) return null;
    return decryptKey(raw);
  }

  async delete(keyId: string): Promise<void> {
    await this.redis.del(keyId);
  }

  async exists(keyId: string): Promise<boolean> {
    return (await this.redis.exists(keyId)) === 1;
  }
}
