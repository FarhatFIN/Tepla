import { CryptoCore } from './crypto-core';
import { KeyDerivation } from './key-derivation';
import { encryptKey, decryptKey } from './key-storage';
import { AuditLogger } from './audit-logger';
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
export class DoubleRatchet {
  private redis: Redis;

  constructor(redis: Redis) {
    this.redis = redis;
  }

  /** Initialize a new ratchet session between two users */
  async create(sessionId: string, userA: string, userB: string, sharedKey: Buffer): Promise<void> {
    const root = CryptoCore.sha256(sharedKey);

    // Derive separate chain keys for each direction
    const keyA = KeyDerivation.derive(root, Buffer.from('A'), 'tepla_ratchet_a');
    const keyB = KeyDerivation.derive(root, Buffer.from('B'), 'tepla_ratchet_b');

    // A→B direction: A sends with keyA, B receives with keyA
    await this.redis.set(`ratchet:send:${sessionId}:${userA}`, encryptKey(keyA));
    await this.redis.set(`ratchet:recv:${sessionId}:${userB}`, encryptKey(keyA));

    // B→A direction: B sends with keyB, A receives with keyB
    await this.redis.set(`ratchet:send:${sessionId}:${userB}`, encryptKey(keyB));
    await this.redis.set(`ratchet:recv:${sessionId}:${userA}`, encryptKey(keyB));

    // Store session metadata
    await this.redis.set(
      `ratchet:session:${sessionId}`,
      JSON.stringify({ userA, userB, created: Date.now() })
    );

    await AuditLogger.log('ratchet_created', { sessionId, userA, userB });
  }

  /**
   * Advance the ratchet and return the current key
   * Uses Redis WATCH/MULTI for atomic CAS (Compare-And-Swap)
   * to prevent race conditions in concurrent access
   */
  async nextKey(type: 'send' | 'recv', sessionId: string, userId: string): Promise<Buffer> {
    const keyId = `ratchet:${type}:${sessionId}:${userId}`;

    // Optimistic locking with retry
    for (let attempt = 0; attempt < 10; attempt++) {
      await this.redis.watch(keyId);

      const raw = await this.redis.get(keyId);
      if (!raw) {
        await this.redis.unwatch();
        throw new Error(`Ratchet state missing: ${type}:${sessionId}:${userId}`);
      }

      const current = decryptKey(raw);
      const next = CryptoCore.sha256(current);

      const multi = this.redis.multi();
      multi.set(keyId, encryptKey(next));

      const result = await multi.exec();
      if (result) {
        // CAS succeeded — return the current (pre-advancement) key
        return current;
      }

      // CAS failed (concurrent update) — retry
      await AuditLogger.log('ratchet_cas_retry', { sessionId, userId, type, attempt });
    }

    throw new Error(`Ratchet CAS failed after 10 attempts: ${sessionId}:${userId}`);
  }

  /** Get session info */
  async getSession(sessionId: string): Promise<{ userA: string; userB: string; created: number } | null> {
    const raw = await this.redis.get(`ratchet:session:${sessionId}`);
    return raw ? JSON.parse(raw) : null;
  }

  /** Destroy a ratchet session */
  async destroy(sessionId: string): Promise<void> {
    const session = await this.getSession(sessionId);
    if (!session) return;

    const keys = [
      `ratchet:send:${sessionId}:${session.userA}`,
      `ratchet:recv:${sessionId}:${session.userA}`,
      `ratchet:send:${sessionId}:${session.userB}`,
      `ratchet:recv:${sessionId}:${session.userB}`,
      `ratchet:session:${sessionId}`,
    ];

    await this.redis.del(...keys);
    await AuditLogger.log('ratchet_destroyed', { sessionId });
  }
}
