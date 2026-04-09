/**
 * Redis Cache Layer — reduces DB calls for hot paths.
 *
 * Cache keys:
 *   user:session:{userId}   TTL 15min  → user object (from JWT auth check)
 *   user:rooms:{userId}     TTL 5min   → set of chatIds the user belongs to
 *   room:members:{chatId}   TTL 5min   → { count, roles: { [userId]: role } }
 *   room:info:{chatId}      TTL 10min  → chat object
 */
import { RedisClient } from './redis';
import { createLogger } from './logger';

const logger = createLogger('cache');

export class CacheLayer {
  constructor(private redis: RedisClient) {}

  // ─── User Session Cache ───
  async getUserSession(userId: string): Promise<any | null> {
    return this.redis.getJson(`user:session:${userId}`);
  }

  async setUserSession(userId: string, user: any): Promise<void> {
    await this.redis.setJson(`user:session:${userId}`, user, 900); // 15 min
  }

  async invalidateUserSession(userId: string): Promise<void> {
    await this.redis.del(`user:session:${userId}`);
  }

  // ─── User Room Membership Cache ───
  async getUserRooms(userId: string): Promise<string[] | null> {
    const key = `user:rooms:${userId}`;
    const members = await this.redis.smembers(key);
    if (members.length === 0) {
      // Could be empty set or cache miss — check if key exists
      const exists = await this.redis.exists(key);
      return exists ? [] : null;
    }
    return members;
  }

  async setUserRooms(userId: string, chatIds: string[]): Promise<void> {
    const key = `user:rooms:${userId}`;
    if (chatIds.length > 0) {
      await this.redis.sadd(key, ...chatIds);
    }
    // Set TTL even for empty sets
    await this.redis.expire(key, 300); // 5 min
  }

  async isUserInRoom(userId: string, chatId: string): Promise<boolean | null> {
    const key = `user:rooms:${userId}`;
    const exists = await this.redis.exists(key);
    if (!exists) return null; // cache miss
    return this.redis.sismember(key, chatId);
  }

  async addUserToRoom(userId: string, chatId: string): Promise<void> {
    const key = `user:rooms:${userId}`;
    await this.redis.sadd(key, chatId);
  }

  async removeUserFromRoom(userId: string, chatId: string): Promise<void> {
    const key = `user:rooms:${userId}`;
    await this.redis.srem(key, chatId);
  }

  // ─── Room Info Cache ───
  async getRoomInfo(chatId: string): Promise<any | null> {
    return this.redis.getJson(`room:info:${chatId}`);
  }

  async setRoomInfo(chatId: string, room: any): Promise<void> {
    await this.redis.setJson(`room:info:${chatId}`, room, 600); // 10 min
  }

  async invalidateRoomInfo(chatId: string): Promise<void> {
    await this.redis.del(`room:info:${chatId}`);
  }

  // ─── Member Role Cache ───
  async getMemberRole(chatId: string, userId: string): Promise<string | null> {
    return this.redis.hget(`room:roles:${chatId}`, userId);
  }

  async setMemberRole(chatId: string, userId: string, role: string): Promise<void> {
    await this.redis.hset(`room:roles:${chatId}`, userId, role);
    await this.redis.expire(`room:roles:${chatId}`, 300); // 5 min
  }

  async invalidateRoomRoles(chatId: string): Promise<void> {
    await this.redis.del(`room:roles:${chatId}`);
  }
}
