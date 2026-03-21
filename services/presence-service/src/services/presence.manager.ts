import { v4 as uuid } from 'uuid';
import { RedisClient, KafkaProducer, createLogger } from '@tepla/common';
import { EventType, EventTopic, UserId, PresenceStatus } from '@tepla/types';

const logger = createLogger('presence-manager');
const HEARTBEAT_TTL = 90; // seconds
const HEARTBEAT_CHECK_INTERVAL = 30000; // ms

export class PresenceManager {
  private checkInterval: NodeJS.Timeout | null = null;

  constructor(
    private redis: RedisClient,
    private kafka: KafkaProducer
  ) {}

  async setOnline(userId: string): Promise<void> {
    const wasOnline = await this.redis.sismember('presence:online', userId);
    await this.redis.sadd('presence:online', userId);
    await this.redis.set(`presence:heartbeat:${userId}`, Date.now().toString(), HEARTBEAT_TTL);
    await this.redis.hset('presence:status', userId, PresenceStatus.ONLINE);

    if (!wasOnline) {
      await this.kafka.publish({
        id: uuid(),
        type: EventType.USER_ONLINE,
        topic: EventTopic.PRESENCE_EVENTS,
        timestamp: new Date().toISOString(),
        source: 'presence-service',
        correlationId: uuid(),
        userId: userId as UserId,
        payload: { userId },
      });
      logger.debug('User online', { userId });
    }
  }

  async setOffline(userId: string): Promise<void> {
    const wasOnline = await this.redis.sismember('presence:online', userId);
    await this.redis.srem('presence:online', userId);
    await this.redis.del(`presence:heartbeat:${userId}`);
    await this.redis.hset('presence:status', userId, PresenceStatus.OFFLINE);

    const lastSeen = new Date().toISOString();
    await this.redis.hset('presence:lastSeen', userId, lastSeen);

    if (wasOnline) {
      await this.kafka.publish({
        id: uuid(),
        type: EventType.USER_OFFLINE,
        topic: EventTopic.PRESENCE_EVENTS,
        timestamp: new Date().toISOString(),
        source: 'presence-service',
        correlationId: uuid(),
        userId: userId as UserId,
        payload: { userId, lastSeen },
      });
      logger.debug('User offline', { userId });
    }
  }

  async heartbeat(userId: string): Promise<void> {
    await this.redis.set(`presence:heartbeat:${userId}`, Date.now().toString(), HEARTBEAT_TTL);
    // Ensure user is in online set
    await this.redis.sadd('presence:online', userId);
  }

  async getStatus(userId: string): Promise<{ status: string; lastSeen: string | null }> {
    const isOnline = await this.redis.sismember('presence:online', userId);
    const lastSeen = await this.redis.hget('presence:lastSeen', userId);
    return {
      status: isOnline ? PresenceStatus.ONLINE : PresenceStatus.OFFLINE,
      lastSeen,
    };
  }

  async getBulkStatus(userIds: string[]): Promise<Record<string, { status: string; lastSeen: string | null }>> {
    const result: Record<string, any> = {};
    for (const userId of userIds) {
      result[userId] = await this.getStatus(userId);
    }
    return result;
  }

  async getOnlineUsers(): Promise<string[]> {
    return this.redis.smembers('presence:online');
  }

  async setTyping(userId: string, chatId: string): Promise<void> {
    const key = `typing:${chatId}`;
    await this.redis.hset(key, userId, Date.now().toString());
    // Auto-expire typing after 5s
    await this.redis.expire(key, 5);

    await this.kafka.publish({
      id: uuid(),
      type: EventType.USER_TYPING,
      topic: EventTopic.PRESENCE_EVENTS,
      timestamp: new Date().toISOString(),
      source: 'presence-service',
      correlationId: uuid(),
      userId: userId as UserId,
      payload: { chatId, userId },
    });
  }

  async getTyping(chatId: string): Promise<string[]> {
    const typing = await this.redis.hgetall(`typing:${chatId}`);
    const now = Date.now();
    return Object.entries(typing)
      .filter(([_, ts]) => now - parseInt(ts) < 5000)
      .map(([userId]) => userId);
  }

  startHeartbeatChecker(): void {
    this.checkInterval = setInterval(async () => {
      try {
        const onlineUsers = await this.getOnlineUsers();
        for (const userId of onlineUsers) {
          const hb = await this.redis.get(`presence:heartbeat:${userId}`);
          if (!hb) {
            await this.setOffline(userId);
          }
        }
      } catch (err) {
        logger.error('Heartbeat check failed', { error: (err as Error).message });
      }
    }, HEARTBEAT_CHECK_INTERVAL);
  }

  stopHeartbeatChecker(): void {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }
  }
}
