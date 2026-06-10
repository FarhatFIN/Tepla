import Redis from 'ioredis';
import { createLogger } from './logger';

const logger = createLogger('redis');

export type RedisRole = 'cache' | 'persist' | 'default';

const REDIS_URLS: Record<RedisRole, string> = {
  cache: process.env.REDIS_CACHE_URL || process.env.REDIS_URL || 'redis://localhost:6379',
  persist: process.env.REDIS_PERSIST_URL || process.env.REDIS_URL || 'redis://localhost:6379',
  default: process.env.REDIS_URL || 'redis://localhost:6379',
};

export class RedisClient {
  private client: Redis;
  private subscriber: Redis | null = null;
  public readonly role: RedisRole;

  constructor(urlOrRole?: string) {
    // If it's a known role name, resolve the URL; otherwise treat as raw URL
    if (urlOrRole && (urlOrRole === 'cache' || urlOrRole === 'persist' || urlOrRole === 'default')) {
      this.role = urlOrRole;
    } else {
      this.role = 'default';
    }

    const url = (urlOrRole === 'cache' || urlOrRole === 'persist' || urlOrRole === 'default')
      ? REDIS_URLS[urlOrRole]
      : (urlOrRole || REDIS_URLS.default);

    this.client = new Redis(url, {
      maxRetriesPerRequest: 3,
      retryStrategy: (times) => Math.min(times * 200, 5000),
      lazyConnect: true,
    });

    this.client.on('error', (err) => logger.error(`Redis[${this.role}] error`, { error: err.message }));
    this.client.on('connect', () => logger.info(`Redis[${this.role}] connected`));
  }

  async connect(): Promise<void> {
    await this.client.connect();
  }

  // ─── Basic Operations ───
  async get(key: string): Promise<string | null> {
    return this.client.get(key);
  }

  async set(key: string, value: string, ttlSeconds?: number): Promise<void> {
    if (ttlSeconds) {
      await this.client.setex(key, ttlSeconds, value);
    } else {
      await this.client.set(key, value);
    }
  }

  async del(...keys: string[]): Promise<number> {
    return this.client.del(...keys);
  }

  async exists(key: string): Promise<boolean> {
    return (await this.client.exists(key)) === 1;
  }

  async ttl(key: string): Promise<number> {
    return this.client.ttl(key);
  }

  async incr(key: string): Promise<number> {
    return this.client.incr(key);
  }

  async expire(key: string, seconds: number): Promise<void> {
    await this.client.expire(key, seconds);
  }

  // ─── JSON Helpers ───
  async getJson<T>(key: string): Promise<T | null> {
    const raw = await this.client.get(key);
    return raw ? JSON.parse(raw) : null;
  }

  async setJson<T>(key: string, value: T, ttlSeconds?: number): Promise<void> {
    await this.set(key, JSON.stringify(value), ttlSeconds);
  }

  // ─── Hash Operations ───
  async hset(key: string, field: string, value: string): Promise<void> {
    await this.client.hset(key, field, value);
  }

  async hget(key: string, field: string): Promise<string | null> {
    return this.client.hget(key, field);
  }

  async hgetall(key: string): Promise<Record<string, string>> {
    return this.client.hgetall(key);
  }

  async hdel(key: string, ...fields: string[]): Promise<number> {
    return this.client.hdel(key, ...fields);
  }

  // ─── Set Operations ───
  async sadd(key: string, ...members: string[]): Promise<number> {
    return this.client.sadd(key, ...members);
  }

  async srem(key: string, ...members: string[]): Promise<number> {
    return this.client.srem(key, ...members);
  }

  async smembers(key: string): Promise<string[]> {
    return this.client.smembers(key);
  }

  async sismember(key: string, member: string): Promise<boolean> {
    return (await this.client.sismember(key, member)) === 1;
  }

  // ─── Sorted Set (for leaderboards, timeline) ───
  async zadd(key: string, score: number, member: string): Promise<number> {
    return this.client.zadd(key, score, member);
  }

  async zrangebyscore(key: string, min: number, max: number, limit?: number): Promise<string[]> {
    if (limit) {
      return this.client.zrangebyscore(key, min, max, 'LIMIT', 0, limit);
    }
    return this.client.zrangebyscore(key, min, max);
  }

  async zrem(key: string, ...members: string[]): Promise<number> {
    return this.client.zrem(key, ...members);
  }

  // ─── Pub/Sub ───
  async publish(channel: string, message: string): Promise<number> {
    return this.client.publish(channel, message);
  }

  getSubscriber(): Redis {
    if (!this.subscriber) {
      this.subscriber = this.client.duplicate();
    }
    return this.subscriber;
  }

  // ─── Pipeline ───
  pipeline() {
    return this.client.pipeline();
  }

  // ─── Lua Script ───
  async eval(script: string, keys: string[], args: string[]): Promise<unknown> {
    return this.client.eval(script, keys.length, ...keys, ...args);
  }

  // ─── Cleanup ───
  async disconnect(): Promise<void> {
    await this.client.quit();
    if (this.subscriber) {
      await this.subscriber.quit();
    }
  }

  get raw(): Redis {
    return this.client;
  }
}
