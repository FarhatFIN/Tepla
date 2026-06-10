import { CryptoCore, EncryptedPayload } from './crypto-core';
import { DoubleRatchet } from './double-ratchet';
import { ReplayProtection } from './replay-protection';
import { SecurityRateLimiter } from './rate-limiter';
import { AuditLogger } from './audit-logger';
import { SecurityConfig } from './config';
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
export class MessagePipeline {
  private ratchet: DoubleRatchet;
  private replay: ReplayProtection;
  private rateLimiter: SecurityRateLimiter;

  constructor(redis: Redis) {
    this.ratchet = new DoubleRatchet(redis);
    this.replay = new ReplayProtection(redis);
    this.rateLimiter = new SecurityRateLimiter(redis);
  }

  /** Encrypt outgoing message */
  async outgoing(sessionId: string, userId: string, message: string): Promise<SecureMessage> {
    // Rate limit messages
    await this.rateLimiter.check(
      `msg:${userId}`,
      SecurityConfig.MESSAGE_LIMIT_PER_MINUTE
    );

    // Get next ratchet key
    const key = await this.ratchet.nextKey('send', sessionId, userId);

    // Encrypt with AES-256-GCM
    const payload = CryptoCore.encrypt(message, key);

    return {
      nonce: payload.iv,
      payload,
      ts: Date.now(),
    };
  }

  /** Decrypt incoming message */
  async incoming(sessionId: string, userId: string, packet: SecureMessage): Promise<string | null> {
    // Validate nonce (replay protection)
    await this.replay.validate(userId, packet.nonce);

    // Check timestamp freshness (reject messages older than 5 minutes)
    const age = Date.now() - packet.ts;
    if (age > 5 * 60 * 1000) {
      await AuditLogger.log('message_too_old', {
        sessionId,
        userId,
        age,
      });
      throw new Error('Message expired');
    }

    // Get next ratchet key
    const key = await this.ratchet.nextKey('recv', sessionId, userId);

    // Decrypt
    const message = CryptoCore.decrypt(packet.payload, key);

    if (message === null) {
      await AuditLogger.log('message_decrypt_failed', { sessionId, userId });
      return null;
    }

    return message;
  }

  /** Create a ratchet session for a direct chat */
  async createSession(
    sessionId: string,
    userA: string,
    userB: string,
    sharedKey: Buffer
  ): Promise<void> {
    await this.ratchet.create(sessionId, userA, userB, sharedKey);
  }

  /** Destroy a ratchet session */
  async destroySession(sessionId: string): Promise<void> {
    await this.ratchet.destroy(sessionId);
  }
}
