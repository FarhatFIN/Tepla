import http from 'http';
import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import compression from 'compression';
import { Server as SocketIOServer } from 'socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import Redis from 'ioredis';
import {
  createLogger,
  RedisClient,
  KafkaConsumer,
  cookieMiddleware,
  correlationMiddleware,
  requestLoggerMiddleware,
  errorHandler,
  parseTrustProxy,
  db,
} from '@tepla/common';
import { EventTopic, EventType, DomainEvent } from '@tepla/types';
import {
  socketSecurity,
  socketMessageRateLimit,
  AuditLogger,
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
const allowedCorsOrigins = (process.env.CORS_ORIGIN || '')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

if (allowedCorsOrigins.length === 0) {
  logger.warn('CORS_ORIGIN is not set; browser CORS requests with credentials will be rejected');
}

async function start() {
  await initializeSecurity();

  const app = express();

  // H-10: this app was constructed bare — no body parser, no helmet, no CORS,
  // no error handler — yet it mounts /api/presence, /api/notifications and
  // /api/calls. Every POST handler on those routers read `req.body` and got
  // `undefined`, so they were non-functional, and unhandled errors fell through
  // to Express's default HTML page. Unlike the other services this one does not
  // extend BaseService (it needs the raw http.Server for Socket.IO), so the
  // same middleware stack has to be assembled by hand.
  app.set('trust proxy', parseTrustProxy(process.env.TRUST_PROXY));
  app.use(helmet());
  app.use(cors({
    origin: (origin, callback) => {
      if (!origin || allowedCorsOrigins.includes(origin)) {
        callback(null, true);
        return;
      }
      callback(new Error('CORS origin is not allowed'));
    },
    credentials: true,
  }));
  app.use(compression());
  app.use(express.json({ limit: process.env.JSON_BODY_LIMIT || '1mb' }));
  app.use(express.urlencoded({ extended: true, limit: process.env.JSON_BODY_LIMIT || '1mb' }));
  app.use(cookieMiddleware());
  app.use(correlationMiddleware());
  app.use(requestLoggerMiddleware('realtime-service'));

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

  // Health check.
  // M-01: security metrics used to be returned here, unauthenticated — they
  // expose auth-failure and anomaly counts to anyone who can reach the port.
  // Liveness probes need none of that.
  app.get('/health', (_req, res) => {
    res.json({
      service: 'realtime-service',
      status: 'healthy',
      connections: io.engine.clientsCount,
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

  // Structured errors instead of Express's default HTML page (H-10).
  app.use(errorHandler);

  // ─── Socket.IO with Redis Adapter ─────────────
  const io = new SocketIOServer(server, {
    cors: {
      origin: (origin, callback) => {
        if (!origin || allowedCorsOrigins.includes(origin)) {
          callback(null, true);
          return;
        }
        callback(new Error('CORS origin is not allowed'));
      },
      credentials: true,
    },
    pingInterval: 25000,
    pingTimeout: 10000,
    transports: ['websocket', 'polling'],
  });

  io.adapter(createAdapter(pubClient.raw, subClient.raw));

  // Security middleware
  io.use(socketSecurity(securityRedis));
  io.use(socketMessageRateLimit(securityRedis));

  async function isChatMember(chatId: string, userId: string): Promise<boolean> {
    const cached = await redis.raw.sismember(`chat:${chatId}:members`, userId).catch(() => 0);
    if (cached === 1) return true;

    const row = await db.queryRow('SELECT 1 FROM chat_members WHERE chat_id = $1 AND user_id = $2 LIMIT 1', [chatId, userId]);
    return Boolean(row);
  }

  // ─── Connection Handler ───────────────────────
  io.on('connection', (socket) => {
    const userId = (socket as any).userId as string;
    logger.info('Client connected', { userId, socketId: socket.id });
    socket.join(`user:${userId}`);

    socket.on('presence:join', async (chatId: string) => {
      if (!await isChatMember(chatId, userId)) {
        socket.emit('error', { code: 'FORBIDDEN' });
        return;
      }

      socket.join(`chat:${chatId}`);
      io.to(`chat:${chatId}`).emit('presence:joined', { userId, chatId });
    });

    socket.on('presence:leave', (chatId: string) => {
      socket.leave(`chat:${chatId}`);
      io.to(`chat:${chatId}`).emit('presence:left', { userId, chatId });
    });

    socket.on('typing', async (data: { chatId: string }) => {
      if (!await isChatMember(data.chatId, userId)) {
        socket.emit('error', { code: 'FORBIDDEN' });
        return;
      }

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

  // PRIVACY/SCALE: emit user-scoped events only to rooms of chats the user
  // belongs to, instead of broadcasting to every connected client.
  //
  // M-09: this ran a `SELECT chat_id FROM chat_members` on every presence
  // transition. With N users toggling online/offline that is N queries per
  // heartbeat sweep against the hottest table in the system. A short Redis
  // cache absorbs the repeats; 60s of staleness only means a just-joined chat
  // misses one presence blip.
  const CHAT_IDS_TTL = Number(process.env.PRESENCE_CHATS_CACHE_TTL || 60);

  async function chatIdsForUser(userId: string): Promise<string[]> {
    const cacheKey = `presence:chats:${userId}`;
    try {
      const cached = await redis.get(cacheKey);
      if (cached) return JSON.parse(cached) as string[];
    } catch {
      // Cache is an optimisation; fall through to the source of truth.
    }

    const rows = await db.queryRows('SELECT chat_id FROM chat_members WHERE user_id = $1', [userId]);
    const chatIds = (rows as Array<{ chat_id: string }>).map((row) => row.chat_id);
    await redis.set(cacheKey, JSON.stringify(chatIds), CHAT_IDS_TTL).catch(() => undefined);
    return chatIds;
  }

  async function emitToUserChats(userId: string, event: string, data: any): Promise<void> {
    try {
      for (const chatId of await chatIdsForUser(userId)) {
        io.to(`chat:${chatId}`).emit(event, data);
      }
    } catch (err) {
      logger.error('emitToUserChats failed', { error: (err as Error).message, userId, event });
    }
    io.to(`user:${userId}`).emit(event, data);
  }

  // 2. PRESENCE_EVENTS
  const presenceConsumer = new KafkaConsumer('rt-svc-presence', 'rt-svc-presence');
  await presenceConsumer.subscribe([EventTopic.PRESENCE_EVENTS]);

  presenceConsumer.on(EventType.USER_ONLINE, async (event: DomainEvent) => {
    const { userId } = event.payload as any;
    await emitToUserChats(userId, 'presence:online', { userId });
  });
  presenceConsumer.on(EventType.USER_OFFLINE, async (event: DomainEvent) => {
    const { userId, lastSeen } = event.payload as any;
    await emitToUserChats(userId, 'presence:offline', { userId, lastSeen });
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

  // 4. USER_EVENTS
  const userConsumer = new KafkaConsumer('rt-svc-user', 'rt-svc-users');
  await userConsumer.subscribe([EventTopic.USER_EVENTS]);

  userConsumer.on(EventType.USER_UPDATED, async (event: DomainEvent) => {
    const { userId, fields } = event.payload as any;
    io.to(`user:${userId}`).emit('user:updated', event.payload);
    await emitToUserChats(userId, 'user:profile_changed', { userId, fields });
  });

  // 5. CALL_EVENTS — ring chat members and sync call lifecycle
  const callConsumer = new KafkaConsumer('rt-svc-call', 'rt-svc-calls');
  await callConsumer.subscribe([EventTopic.CALL_EVENTS]);

  callConsumer.on(EventType.CALL_STARTED, async (event: DomainEvent) => {
    const { call, chatId } = event.payload as any;
    io.to(`chat:${chatId}`).emit('call:incoming', { chatId, call, from: event.userId });
  });
  callConsumer.on(EventType.CALL_PARTICIPANT_JOINED, async (event: DomainEvent) => {
    const { callId, chatId } = event.payload as any;
    io.to(`chat:${chatId}`).emit('call:participant_joined', { callId, chatId, userId: event.userId });
  });
  callConsumer.on(EventType.CALL_PARTICIPANT_LEFT, async (event: DomainEvent) => {
    const { callId, chatId } = event.payload as any;
    io.to(`chat:${chatId}`).emit('call:participant_left', { callId, chatId, userId: event.userId });
  });
  callConsumer.on(EventType.CALL_ENDED, async (event: DomainEvent) => {
    const { callId, chatId, declined } = event.payload as any;
    io.to(`chat:${chatId}`).emit('call:ended', { callId, chatId, declined: Boolean(declined) });
  });

  const consumers = [msgConsumer, presenceConsumer, chatConsumer, userConsumer, callConsumer];
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
