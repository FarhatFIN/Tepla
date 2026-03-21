"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.RedisClient = void 0;
const ioredis_1 = __importDefault(require("ioredis"));
const logger_1 = require("./logger");
const logger = (0, logger_1.createLogger)('redis');
class RedisClient {
    client;
    subscriber = null;
    constructor(url) {
        this.client = new ioredis_1.default(url || process.env.REDIS_URL || 'redis://localhost:6379', {
            maxRetriesPerRequest: 3,
            retryStrategy: (times) => Math.min(times * 200, 5000),
            lazyConnect: true,
        });
        this.client.on('error', (err) => logger.error('Redis error', { error: err.message }));
        this.client.on('connect', () => logger.info('Redis connected'));
    }
    async connect() {
        await this.client.connect();
    }
    // ─── Basic Operations ───
    async get(key) {
        return this.client.get(key);
    }
    async set(key, value, ttlSeconds) {
        if (ttlSeconds) {
            await this.client.setex(key, ttlSeconds, value);
        }
        else {
            await this.client.set(key, value);
        }
    }
    async del(...keys) {
        return this.client.del(...keys);
    }
    async exists(key) {
        return (await this.client.exists(key)) === 1;
    }
    async ttl(key) {
        return this.client.ttl(key);
    }
    async incr(key) {
        return this.client.incr(key);
    }
    async expire(key, seconds) {
        await this.client.expire(key, seconds);
    }
    // ─── JSON Helpers ───
    async getJson(key) {
        const raw = await this.client.get(key);
        return raw ? JSON.parse(raw) : null;
    }
    async setJson(key, value, ttlSeconds) {
        await this.set(key, JSON.stringify(value), ttlSeconds);
    }
    // ─── Hash Operations ───
    async hset(key, field, value) {
        await this.client.hset(key, field, value);
    }
    async hget(key, field) {
        return this.client.hget(key, field);
    }
    async hgetall(key) {
        return this.client.hgetall(key);
    }
    async hdel(key, ...fields) {
        return this.client.hdel(key, ...fields);
    }
    // ─── Set Operations ───
    async sadd(key, ...members) {
        return this.client.sadd(key, ...members);
    }
    async srem(key, ...members) {
        return this.client.srem(key, ...members);
    }
    async smembers(key) {
        return this.client.smembers(key);
    }
    async sismember(key, member) {
        return (await this.client.sismember(key, member)) === 1;
    }
    // ─── Sorted Set (for leaderboards, timeline) ───
    async zadd(key, score, member) {
        return this.client.zadd(key, score, member);
    }
    async zrangebyscore(key, min, max, limit) {
        if (limit) {
            return this.client.zrangebyscore(key, min, max, 'LIMIT', 0, limit);
        }
        return this.client.zrangebyscore(key, min, max);
    }
    async zrem(key, ...members) {
        return this.client.zrem(key, ...members);
    }
    // ─── Pub/Sub ───
    async publish(channel, message) {
        return this.client.publish(channel, message);
    }
    getSubscriber() {
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
    async eval(script, keys, args) {
        return this.client.eval(script, keys.length, ...keys, ...args);
    }
    // ─── Cleanup ───
    async disconnect() {
        await this.client.quit();
        if (this.subscriber) {
            await this.subscriber.quit();
        }
    }
    get raw() {
        return this.client;
    }
}
exports.RedisClient = RedisClient;
//# sourceMappingURL=redis.js.map