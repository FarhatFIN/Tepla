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

  // ─── Kafka Consumer — route domain events to Socket.IO rooms ───
  const consumer = new KafkaConsumer('ws-gateway', 'ws-gateway-group');
  await consumer.subscribe([
    EventTopic.MESSAGE_EVENTS,
    EventTopic.PRESENCE_EVENTS,
    EventTopic.CHAT_EVENTS,
    EventTopic.PREMIUM_EVENTS,
    EventTopic.USER_EVENTS,
  ]);

  consumer.on(EventType.MESSAGE_SENT, async (event: DomainEvent) => {
    const { chatId, ...message } = event.payload as any;
    io.to(`chat:${chatId}`).emit('message:new', { chatId, message });
  });

  consumer.on(EventType.MESSAGE_EDITED, async (event: DomainEvent) => {
    const { chatId, ...data } = event.payload as any;
    io.to(`chat:${chatId}`).emit('message:updated', { chatId, ...data });
  });

  consumer.on(EventType.MESSAGE_DELETED, async (event: DomainEvent) => {
    const { chatId, messageId } = event.payload as any;
    io.to(`chat:${chatId}`).emit('message:deleted', { chatId, messageId });
  });

  consumer.on(EventType.MESSAGE_PINNED, async (event: DomainEvent) => {
    const { chatId } = event.payload as any;
    io.to(`chat:${chatId}`).emit('message:pinned', event.payload);
  });

  consumer.on(EventType.MESSAGE_UNPINNED, async (event: DomainEvent) => {
    const { chatId } = event.payload as any;
    io.to(`chat:${chatId}`).emit('message:unpinned', event.payload);
  });

  consumer.on(EventType.MESSAGE_READ, async (event: DomainEvent) => {
    const { chatId, messageIds, readBy } = event.payload as any;
    io.to(`chat:${chatId}`).emit('message:read', { chatId, messageIds, readBy });
  });

  consumer.on(EventType.MESSAGE_DELIVERED, async (event: DomainEvent) => {
    const { chatId, messageIds, deliveredTo } = event.payload as any;
    io.to(`chat:${chatId}`).emit('message:delivered', { chatId, messageIds, deliveredTo });
  });

  consumer.on(EventType.MESSAGE_FORWARDED, async (event: DomainEvent) => {
    const { chatId, ...message } = event.payload as any;
    io.to(`chat:${chatId}`).emit('message:new', { chatId, message });
  });

  consumer.on(EventType.REACTION_ADDED, async (event: DomainEvent) => {
    const chatId = (event.payload as any).chatId;
    if (chatId) io.to(`chat:${chatId}`).emit('reaction:changed', event.payload);
  });

  consumer.on(EventType.REACTION_REMOVED, async (event: DomainEvent) => {
    const chatId = (event.payload as any).chatId;
    if (chatId) io.to(`chat:${chatId}`).emit('reaction:changed', event.payload);
  });

  consumer.on(EventType.USER_ONLINE, async (event: DomainEvent) => {
    const { userId } = event.payload as any;
    io.emit('presence:online', { userId });
  });

  consumer.on(EventType.USER_OFFLINE, async (event: DomainEvent) => {
    const { userId, lastSeen } = event.payload as any;
    io.emit('presence:offline', { userId, lastSeen });
  });

  consumer.on(EventType.USER_TYPING, async (event: DomainEvent) => {
    const { chatId, userId } = event.payload as any;
    io.to(`chat:${chatId}`).emit('typing', { chatId, userId });
  });

  consumer.on(EventType.MEMBER_JOINED, async (event: DomainEvent) => {
    const { chatId, userId } = event.payload as any;
    io.to(`chat:${chatId}`).emit('chat:member_joined', { chatId, userId });
    io.to(`user:${userId}`).emit('chats:updated');
  });

  consumer.on(EventType.MEMBER_LEFT, async (event: DomainEvent) => {
    const { chatId, userId } = event.payload as any;
    io.to(`chat:${chatId}`).emit('chat:member_left', { chatId, userId });
  });

  consumer.on(EventType.SUBSCRIPTION_CREATED, async (event: DomainEvent) => {
    const { userId } = event.payload as any;
    io.to(`user:${userId}`).emit('premium:activated', event.payload);
  });

  // User profile updated (username change, etc.) — broadcast to all connected clients
  consumer.on(EventType.USER_UPDATED, async (event: DomainEvent) => {
    const { userId, fields } = event.payload as any;
    // Notify the user's own sessions
    io.to(`user:${userId}`).emit('user:updated', event.payload);
    // Broadcast to all clients so they can update cached user data (username in chat list, etc.)
    io.emit('user:profile_changed', { userId, fields });
  });

  await consumer.start();

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
    await consumer.disconnect();
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
