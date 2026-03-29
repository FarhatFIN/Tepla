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

const logger = createLogger('websocket-gateway');
const PORT = parseInt(process.env.PORT || '3100');

async function start() {
  // Initialize security framework (libsodium, master key validation)
  await initializeSecurity();

  const app = express();
  const server = http.createServer(app);

  // Raw Redis for security framework
  const securityRedis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');
  AuditLogger.setRedis(securityRedis);

  // Health check with security metrics
  app.get('/health', async (_req, res) => {
    const metrics = await SecurityMetrics.getAll(securityRedis);
    res.json({
      service: 'websocket-gateway',
      status: 'healthy',
      connections: io.engine.clientsCount,
      securityMetrics: metrics,
    });
  });

  // ─── Socket.IO with Redis Adapter (horizontal scaling) ───
  const pubClient = new RedisClient();
  const subClient = new RedisClient();
  await pubClient.connect();
  await subClient.connect();

  const io = new SocketIOServer(server, {
    cors: { origin: process.env.CORS_ORIGIN || '*', credentials: true },
    pingInterval: 25000,
    pingTimeout: 10000,
    transports: ['websocket', 'polling'],
  });

  io.adapter(createAdapter(pubClient.raw, subClient.raw));

  // ─── Security Middleware (replaces raw JWT check) ─────────
  // socketSecurity handles:
  //   1. Extract & validate session token (via SessionManager)
  //   2. Rate limit WebSocket connections per user
  //   3. Device fingerprinting (SHA-256 of headers)
  //   4. Anomaly detection (new device / new IP logging)
  //   5. Device registration & audit logging
  io.use(socketSecurity(securityRedis));

  // ─── Per-message rate limiter ─────────────────────────────
  // Prevents WebSocket flood attacks — drops messages over limit
  io.use(socketMessageRateLimit(securityRedis));

  // ─── Connection Handler ───
  io.on('connection', (socket) => {
    // socketSecurity attaches userId, sessionToken, deviceFingerprint
    const userId = (socket as any).userId as string;

    logger.info('Client connected', { userId, socketId: socket.id });

    // Join user's personal room for targeted events
    socket.join(`user:${userId}`);

    // Join chat rooms
    socket.on('presence:join', (chatId: string) => {
      socket.join(`chat:${chatId}`);
      io.to(`chat:${chatId}`).emit('presence:joined', { userId, chatId });
      logger.debug('User joined chat room', { userId, chatId });
    });

    socket.on('presence:leave', (chatId: string) => {
      socket.leave(`chat:${chatId}`);
      io.to(`chat:${chatId}`).emit('presence:left', { userId, chatId });
    });

    // Typing indicator
    socket.on('typing', (data: { chatId: string }) => {
      socket.to(`chat:${data.chatId}`).emit('typing', { chatId: data.chatId, userId });
    });

    // Multi-device sync — broadcast to all user's sessions
    socket.on('sync:request', () => {
      io.to(`user:${userId}`).emit('sync:response', { socketId: socket.id });
    });

    socket.on('disconnect', async (reason) => {
      logger.debug('Client disconnected', { userId, reason });
      await AuditLogger.log('ws_disconnected', { userId, socketId: socket.id, reason });
    });
  });

  // ─── Delivery Batcher — timing metadata protection ─────────
  // Holds messages up to 100ms and emits them as a batch.
  // Prevents timing correlation (server can't tell who's talking based on delivery timing).
  // Typing indicators bypass the batcher (separate channel, acceptable leak).
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

  // ─── Kafka Consumers — separate consumer group per topic ───
  // Each topic gets its own consumer group so a slow handler on one
  // topic doesn't block event processing on another. MESSAGE_EVENTS
  // is keyed by chatId for per-chat ordering guarantees.

  // 1. MESSAGE_EVENTS — highest throughput, keyed by chatId
  const msgConsumer = new KafkaConsumer('ws-gw-msg', 'ws-gw-messages');
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

  // 2. PRESENCE_EVENTS — latency-sensitive, lightweight
  const presenceConsumer = new KafkaConsumer('ws-gw-presence', 'ws-gw-presence');
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

  // 3. CHAT_EVENTS — membership changes
  const chatConsumer = new KafkaConsumer('ws-gw-chat', 'ws-gw-chats');
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

  // 4. USER_EVENTS + PREMIUM_EVENTS — low throughput
  const userConsumer = new KafkaConsumer('ws-gw-user', 'ws-gw-users');
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

  // Start all consumers in parallel
  const consumers = [msgConsumer, presenceConsumer, chatConsumer, userConsumer];
  await Promise.all(consumers.map(c => c.start()));

  // ─── Start Server ───
  server.listen(PORT, () => {
    logger.info(`WebSocket Gateway running on port ${PORT}`, {
      socketSecurity: true,
      messageRateLimit: true,
      deviceFingerprinting: true,
      anomalyDetection: true,
    });
  });

  // Graceful shutdown
  const shutdown = async () => {
    logger.info('Shutting down...');
    io.close();
    await Promise.all(consumers.map(c => c.disconnect()));
    await pubClient.disconnect();
    await subClient.disconnect();
    securityRedis.disconnect();
    server.close();
    process.exit(0);
  };
  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
}

start().catch((err) => {
  logger.error('Failed to start WebSocket Gateway', { error: err.message });
  process.exit(1);
});
