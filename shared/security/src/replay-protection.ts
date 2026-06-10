import { SecurityConfig } from './config';
import { AuditLogger } from './audit-logger';
import { SecurityMetrics } from './security-metrics';
import Redis from 'ioredis';

/**
 * Replay Protection
 * Uses Redis NX + TTL to ensure each nonce is used exactly once.
 * Prevents message replay attacks within the NONCE_TTL window.
 */
export class ReplayProtection {
  private redis: Redis;

  constructor(redis: Redis) {
    this.redis = redis;
  }

  /** Validate a nonce — returns true if fresh, throws if replayed */
  async validate(userId: string, nonce: string): Promise<void> {
    const key = `nonce:${userId}:${nonce}`;

    // SET NX (only if not exists) + EX (TTL)
    const ok = await this.redis.set(key, '1', 'EX', SecurityConfig.NONCE_TTL, 'NX');

    if (!ok) {
      await SecurityMetrics.replay(this.redis);
      await AuditLogger.log('replay_detected', { userId, nonce: nonce.substring(0, 8) });
      throw new Error('Replay detected: nonce already used');
    }
  }

  /** Check without throwing (returns boolean) */
  async check(userId: string, nonce: string): Promise<boolean> {
    const key = `nonce:${userId}:${nonce}`;
    const ok = await this.redis.set(key, '1', 'EX', SecurityConfig.NONCE_TTL, 'NX');
    return !!ok;
  }

  /** Batch validate multiple nonces (for message batches) */
  async validateBatch(userId: string, nonces: string[]): Promise<void> {
    const pipe = this.redis.pipeline();
    for (const nonce of nonces) {
      pipe.set(`nonce:${userId}:${nonce}`, '1', 'EX', SecurityConfig.NONCE_TTL, 'NX');
    }

    const results = await pipe.exec();
    if (!results) throw new Error('Replay validation pipeline failed');

    for (let i = 0; i < results.length; i++) {
      const [err, result] = results[i];
      if (err || !result) {
        await SecurityMetrics.replay(this.redis);
        await AuditLogger.log('replay_detected_batch', {
          userId,
          nonce: nonces[i].substring(0, 8),
          index: i,
        });
        throw new Error(`Replay detected: nonce ${nonces[i].substring(0, 8)} already used`);
      }
    }
  }
}
