import Redis from 'ioredis';
export declare class RedisClient {
    private client;
    private subscriber;
    constructor(url?: string);
    connect(): Promise<void>;
    get(key: string): Promise<string | null>;
    set(key: string, value: string, ttlSeconds?: number): Promise<void>;
    del(...keys: string[]): Promise<number>;
    exists(key: string): Promise<boolean>;
    ttl(key: string): Promise<number>;
    incr(key: string): Promise<number>;
    expire(key: string, seconds: number): Promise<void>;
    getJson<T>(key: string): Promise<T | null>;
    setJson<T>(key: string, value: T, ttlSeconds?: number): Promise<void>;
    hset(key: string, field: string, value: string): Promise<void>;
    hget(key: string, field: string): Promise<string | null>;
    hgetall(key: string): Promise<Record<string, string>>;
    hdel(key: string, ...fields: string[]): Promise<number>;
    sadd(key: string, ...members: string[]): Promise<number>;
    srem(key: string, ...members: string[]): Promise<number>;
    smembers(key: string): Promise<string[]>;
    sismember(key: string, member: string): Promise<boolean>;
    zadd(key: string, score: number, member: string): Promise<number>;
    zrangebyscore(key: string, min: number, max: number, limit?: number): Promise<string[]>;
    zrem(key: string, ...members: string[]): Promise<number>;
    publish(channel: string, message: string): Promise<number>;
    getSubscriber(): Redis;
    pipeline(): import("ioredis").ChainableCommander;
    eval(script: string, keys: string[], args: string[]): Promise<unknown>;
    disconnect(): Promise<void>;
    get raw(): Redis;
}
//# sourceMappingURL=redis.d.ts.map