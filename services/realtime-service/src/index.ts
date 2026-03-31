import http from 'http';
import express from 'express';
import { Server as SocketIOServer } from 'socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import Redis from 'ioredis';
import { createLogger, RedisClient, KafkaConsumer } from '@tepla/common';
import { EventTopic, EventType, DomainEvent } from '@tepla/types';
import {
  socketSecurity,
  socketMessageRateLimit,
  AuditLogger,
  SecurityMetrics,
  initializeSecurity,
} from '@tepla/security';

// Presence module (formerly presence-service)
import { presenceRouter } from './modules/presence/routes/presence.routes';
import { PresenceManager } from './modules/presence/services/presence.manager';

// Notifications module (formerly notification-service)
import { notificationRouter, initNotifications, startNotificationConsumer } from './modules/notifications/notifications.module';

// Calls module (formerly calls-service)
import { callsRouter } from './modules/calls/calls.module';

const logger = createLogger('realtime-service');
const PORT = parseInt(process.env.PORT || '3100');

async function start() {
  await initializeSecurity();

  const app = express();
  const server = http.createServer(app);

  // Redis instances
  const securityRedis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');
  AuditLogger.setRedis(securityRedis);

  const redis = new RedisClient();
  await redis.connect();

  const pubClient = new RedisClient();
  const subClient = new RedisClient();
  await pubClient.connect();
  await subClient.connect();

  // Kafka producer for calls module
  const { KafkaProducer } = await import('@tepla/common');
  const kafka = new KafkaProducer('realtime-service');
  await kafka.connect();

  // Health check
  app.get('/health', async (_req, res) => {
    const metrics = await SecurityMetrics.getAll(securityRedis);
    res.json({
      service: 'realtime-service',
      status: 'healthy',
      connections: io.engine.clientsCount,
      securityMetrics: metrics,
    });
  });

  // ─── Presence module ──────────────────────────
  const presenceManager = new PresenceManager(redis, kafka);
  app.use('/api/presence', presenceRouter(redis, presenceManager));
  presenceManager.startHeartbeatChecker();

  // ─── Notifications module ─────────────────────
  initNotifications();
  app.use('/api/notifications', notificationRouter());
  await startNotificationConsumer(kafka);

  // ─── Calls module ─────────────────────────────
  app.use('/api/calls', callsRouter(redis, kafka));

  // ─── Socket.IO with Redis Adapter ─────────────
  const io = new SocketIOServer(server, {
    cors: { origin: process.env.CORS_ORIGIN || '*', credentials: true },
    pingInterval: 25000,
    pingTimeout: 10000,
    transports: ['websocket', 'polling'],
  });

  io.adapter(createAdapter(pubClient.raw, subClient.raw));

  // Security middleware
  io.use(socketSecurity(securityRedis));
  io.use(socketMessageRateLimit(securityRedis));

  // ─── Connection Handler ───────────────────────
  io.on('connection', (socket) => {
    const userId = (socket as any).userId as string;
    logger.info('Client connected', { userId, socketId: socket.id });
    socket.join(`user:${userId}`);

    socket.on('presence:join', (chatId: string) => {
      socket.join(`chat:${chatId}`);
      io.to(`chat:${chatId}`).emit('presence:joined', { userId, chatId });
    });

    socket.on('presence:leave', (chatId: string) => {
      socket.leave(`chat:${chatId}`);
      io.to(`chat:${chatId}`).emit('presence:left', { userId, chatId });
    });

    socket.on('typing', (data: { chatId: string }) => {
      socket.to(`chat:${data.chatId}`).emit('typing', { chatId: data.chatId, userId });
    });

    socket.on('sync:request', () => {
      io.to(`user:${userId}`).emit('sync:response', { socketId: socket.id });
    });

    socket.on('disconnect', async (reason) => {
      await AuditLogger.log('ws_disconnected', { userId, socketId: socket.id, reason });
    });
  });

  // ─── Delivery Batcher ─────────────────────────
  const BATCH_INTERVAL_MS = 100;
  type QueuedEmit = { room: string; event: string; data: any };
  let emitQueue: QueuedEmit[] = [];
  let batchTimer: NodeJS.Timeout | null = null;

  function queueEmit(room: string, event: string, data: any): void {
    emitQueue.push({ room, event, data });
    if (!batchTimer) {
      batchTimer = setTimeout(flushEmitQueue, BATCH_INTERVAL_MS);
    }
  }

  function flushEmitQueue(): void {
    batchTimer = null;
    const batch = emitQueue;
    emitQueue = [];
    for (const { room, event, data } of batch) {
      io.to(room).emit(event, data);
    }
  }

  // ─── Kafka Consumers ──────────────────────────

  // 1. MESSAGE_EVENTS
  const msgConsumer = new KafkaConsumer('rt-svc-msg', 'rt-svc-messages');
  await msgConsumer.subscribe([EventTopic.MESSAGE_EVENTS]);

  msgConsumer.on(EventType.MESSAGE_SENT, async (event: DomainEvent) => {
    const { chatId, ...message } = event.payload as any;
    queueEmit(`chat:${chatId}`, 'message:new', { chatId, message });
  });
  msgConsumer.on(EventType.MESSAGE_EDITED, async (event: DomainEvent) => {
    const { chatId, ...data } = event.payload as any;
    queueEmit(`chat:${chatId}`, 'message:updated', { chatId, ...data });
  });
  msgConsumer.on(EventType.MESSAGE_DELETED, async (event: DomainEvent) => {
    const { chatId, messageId } = event.payload as any;
    queueEmit(`chat:${chatId}`, 'message:deleted', { chatId, messageId });
  });
  msgConsumer.on(EventType.MESSAGE_PINNED, async (event: DomainEvent) => {
    const { chatId } = event.payload as any;
    queueEmit(`chat:${chatId}`, 'message:pinned', event.payload);
  });
  msgConsumer.on(EventType.MESSAGE_UNPINNED, async (event: DomainEvent) => {
    const { chatId } = event.payload as any;
    queueEmit(`chat:${chatId}`, 'message:unpinned', event.payload);
  });
  msgConsumer.on(EventType.MESSAGE_READ, async (event: DomainEvent) => {
    const { chatId, messageIds, readBy } = event.payload as any;
    queueEmit(`chat:${chatId}`, 'message:read', { chatId, messageIds, readBy });
  });
  msgConsumer.on(EventType.MESSAGE_DELIVERED, async (event: DomainEvent) => {
    const { chatId, messageIds, deliveredTo } = event.payload as any;
    queueEmit(`chat:${chatId}`, 'message:delivered', { chatId, messageIds, deliveredTo });
  });
  msgConsumer.on(EventType.MESSAGE_FORWARDED, async (event: DomainEvent) => {
    const { chatId, ...message } = event.payload as any;
    queueEmit(`chat:${chatId}`, 'message:new', { chatId, message });
  });
  msgConsumer.on(EventType.REACTION_ADDED, async (event: DomainEvent) => {
    const chatId = (event.payload as any).chatId;
    if (chatId) queueEmit(`chat:${chatId}`, 'reaction:changed', event.payload);
  });
  msgConsumer.on(EventType.REACTION_REMOVED, async (event: DomainEvent) => {
    const chatId = (event.payload as any).chatId;
    if (chatId) queueEmit(`chat:${chatId}`, 'reaction:changed', event.payload);
  });

  // 2. PRESENCE_EVENTS
  const presenceConsumer = new KafkaConsumer('rt-svc-presence', 'rt-svc-presence');
  await presenceConsumer.subscribe([EventTopic.PRESENCE_EVENTS]);

  presenceConsumer.on(EventType.USER_ONLINE, async (event: DomainEvent) => {
    const { userId } = event.payload as any;
    io.emit('presence:online', { userId });
  });
  presenceConsumer.on(EventType.USER_OFFLINE, async (event: DomainEvent) => {
    const { userId, lastSeen } = event.payload as any;
    io.emit('presence:offline', { userId, lastSeen });
  });
  presenceConsumer.on(EventType.USER_TYPING, async (event: DomainEvent) => {
    const { chatId, userId } = event.payload as any;
    io.to(`chat:${chatId}`).emit('typing', { chatId, userId });
  });

  // 3. CHAT_EVENTS
  const chatConsumer = new KafkaConsumer('rt-svc-chat', 'rt-svc-chats');
  await chatConsumer.subscribe([EventTopic.CHAT_EVENTS]);

  chatConsumer.on(EventType.MEMBER_JOINED, async (event: DomainEvent) => {
    const { chatId, userId } = event.payload as any;
    io.to(`chat:${chatId}`).emit('chat:member_joined', { chatId, userId });
    io.to(`user:${userId}`).emit('chats:updated');
  });
  chatConsumer.on(EventType.MEMBER_LEFT, async (event: DomainEvent) => {
    const { chatId, userId } = event.payload as any;
    io.to(`chat:${chatId}`).emit('chat:member_left', { chatId, userId });
  });

  // 4. USER_EVENTS + PREMIUM_EVENTS
  const userConsumer = new KafkaConsumer('rt-svc-user', 'rt-svc-users');
  await userConsumer.subscribe([EventTopic.USER_EVENTS, EventTopic.PREMIUM_EVENTS]);

  userConsumer.on(EventType.SUBSCRIPTION_CREATED, async (event: DomainEvent) => {
    const { userId } = event.payload as any;
    io.to(`user:${userId}`).emit('premium:activated', event.payload);
  });
  userConsumer.on(EventType.USER_UPDATED, async (event: DomainEvent) => {
    const { userId, fields } = event.payload as any;
    io.to(`user:${userId}`).emit('user:updated', event.payload);
    io.emit('user:profile_changed', { userId, fields });
  });

  const consumers = [msgConsumer, presenceConsumer, chatConsumer, userConsumer];
  await Promise.all(consumers.map(c => c.start()));

  // ─── Start Server ─────────────────────────────
  server.listen(PORT, () => {
    logger.info(`Realtime service running on port ${PORT}`, {
      modules: ['presence', 'notifications', 'calls', 'websocket'],
    });
  });

  // Graceful shutdown
  const shutdown = async () => {
    logger.info('Shutting down...');
    io.close();
    await Promise.all(consumers.map(c => c.disconnect()));
    await pubClient.disconnect();
    await subClient.disconnect();
    await redis.disconnect();
    await kafka.disconnect();
    securityRedis.disconnect();
    server.close();
    process.exit(0);
  };
  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
}

start().catch((err) => {
  logger.error('Failed to start Realtime service', { error: err.message });
  process.exit(1);
});
