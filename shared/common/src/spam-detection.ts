/**
 * Spam Detection — Heuristic-based (no ML)
 *
 * Runs on message-service before publishing to Kafka.
 * Uses Redis for tracking recent activity patterns.
 *
 * Heuristics:
 * 1. Duplicate content: same hash sent to > K distinct chats in T minutes
 * 2. Fan-out: messages to > K distinct recipients in T minutes
 * 3. Velocity: > T messages per minute
 * 4. New device: trust_level < 1 → restricted (no large groups, no files)
 *
 * Production risk: false positives on legitimate forwards.
 * Mitigation: duplicate check uses content hash, not exact match.
 *             Forward API is exempt (already requires sender to have seen the message).
 */

import crypto from 'crypto';
import { RedisClient, createLogger } from './index';

const logger = createLogger('spam-detection');

export interface SpamCheckResult {
  blocked: boolean;
  reason?: string;
  score: number;       // 0-100, higher = more suspicious
  restrictions?: string[];
}

export interface SpamCheckContext {
  userId: string;
  chatId: string;
  content: string;
  type: string;         // 'text', 'file', etc.
  deviceTrustLevel: number;
  chatMemberCount?: number;
}

const WINDOW_SECONDS = 300; // 5 minutes

export async function checkSpam(
  redis: RedisClient,
  ctx: SpamCheckContext
): Promise<SpamCheckResult> {
  const now = Math.floor(Date.now() / 1000);
  let score = 0;
  const restrictions: string[] = [];

  // 1. Device trust restrictions
  if (ctx.deviceTrustLevel < 1) {
    if (ctx.type !== 'text') {
      return { blocked: true, reason: 'New devices cannot send files until verified', score: 100 };
    }
    if (ctx.chatMemberCount && ctx.chatMemberCount > 50) {
      return { blocked: true, reason: 'New devices cannot send to large groups', score: 100 };
    }
    score += 20;
    restrictions.push('new_device');
  }

  // 2. Velocity check: messages in last minute
  const velocityKey = `spam:velocity:${ctx.userId}`;
  const velocityCount = await redis.eval(
    `redis.call('ZREMRANGEBYSCORE', KEYS[1], 0, ARGV[1])
     redis.call('ZADD', KEYS[1], ARGV[2], ARGV[3])
     redis.call('EXPIRE', KEYS[1], 60)
     return redis.call('ZCARD', KEYS[1])`,
    [velocityKey],
    [String(now - 60), String(now), `${now}:${Math.random()}`]
  ) as number;

  if (velocityCount > 60) {
    return { blocked: true, reason: 'Message rate too high (>60/min)', score: 100 };
  }
  if (velocityCount > 30) score += 30;
  else if (velocityCount > 15) score += 10;

  // 3. Duplicate content check: same content hash to different chats
  const contentHash = crypto.createHash('sha256').update(ctx.content).digest('hex');
  const dupKey = `spam:dup:${ctx.userId}:${contentHash}`;
  const dupCount = await redis.eval(
    `redis.call('SADD', KEYS[1], ARGV[1])
     redis.call('EXPIRE', KEYS[1], ARGV[2])
     return redis.call('SCARD', KEYS[1])`,
    [dupKey],
    [ctx.chatId, String(WINDOW_SECONDS)]
  ) as number;

  if (dupCount > 10) {
    return { blocked: true, reason: 'Same content sent to too many chats', score: 100 };
  }
  if (dupCount > 5) score += 25;
  else if (dupCount > 3) score += 10;

  // 4. Fan-out check: distinct recipients in window
  const fanOutKey = `spam:fanout:${ctx.userId}`;
  const fanOutCount = await redis.eval(
    `redis.call('SADD', KEYS[1], ARGV[1])
     redis.call('EXPIRE', KEYS[1], ARGV[2])
     return redis.call('SCARD', KEYS[1])`,
    [fanOutKey],
    [ctx.chatId, String(WINDOW_SECONDS)]
  ) as number;

  if (fanOutCount > 50) {
    return { blocked: true, reason: 'Messages to too many distinct chats', score: 100 };
  }
  if (fanOutCount > 20) score += 20;

  // Threshold: score >= 70 → soft block (held for review)
  if (score >= 70) {
    logger.warn('Suspicious activity detected', { userId: ctx.userId, score, restrictions });
    return { blocked: true, reason: 'Suspicious activity pattern detected', score, restrictions };
  }

  return { blocked: false, score, restrictions };
}
