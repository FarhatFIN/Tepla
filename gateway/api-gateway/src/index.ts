import express from 'express';
import cors from 'cors';
import compression from 'compression';
import { createProxyMiddleware, fixRequestBody } from 'http-proxy-middleware';
import {
  createLogger,
  RedisClient,
  errorHandler,
  correlationMiddleware,
  requestLoggerMiddleware,
  authMiddleware,
} from '@tepla/common';
import { SecurityMiddleware, AuditLogger, initializeSecurity } from '@tepla/security';
import Redis from 'ioredis';
import { config } from './config';

const app = express();
const logger = createLogger('api-gateway');
const redis = new RedisClient(config.redisUrl);
const securityRedis = new Redis(config.redisUrl);
const securityMiddleware = new SecurityMiddleware(securityRedis);

app.use(securityMiddleware.securityHeaders());
app.use(cors(config.cors));
app.use(compression());
app.use(correlationMiddleware());
app.use(requestLoggerMiddleware('api-gateway'));
app.use(securityMiddleware.deviceFingerprint());
app.use(securityMiddleware.ipRateLimit(200));

app.get('/health', async (_req, res) => {
  const metrics = await securityMiddleware.getMetrics();
  res.json({ status: 'ok', metrics });
});

function proxy(target: string, rewrite?: Record<string, string>) {
  return createProxyMiddleware({
    target,
    changeOrigin: true,
    pathRewrite: rewrite,
    on: {
      proxyReq: (proxyReq, req: any) => {
        if (req.headers.authorization) proxyReq.setHeader('Authorization', req.headers.authorization);
        if (req.correlationId) proxyReq.setHeader('X-Correlation-Id', req.correlationId);
        if (req.user) proxyReq.setHeader('X-User-Id', req.user.sub);
        if (req.deviceFingerprint) proxyReq.setHeader('X-Device-Fingerprint', req.deviceFingerprint);
        fixRequestBody(proxyReq, req);
      },
      error: (err, _req, res: any) => {
        logger.error('Proxy error', { error: err.message });
        res.status(502).json({ error: 'BAD_GATEWAY' });
      },
    },
  });
}

const auth = authMiddleware(config.jwtSecret);

// ─── Auth & Users (auth-user-service) ─────
// NOTE: Do NOT use express.json() before proxy — it consumes the body stream
// and fixRequestBody is broken with Express v5. Rate limit by IP only.
app.use('/api/v2/auth',
  securityMiddleware.ipRateLimit(10),
  proxy(config.services.auth, { '^/': '/api/auth/' })
);

app.use('/api/v2/users', auth, proxy(config.services.auth, { '^/': '/api/users/' }));
app.use('/api/v2/e2e', auth, proxy(config.services.auth, { '^/': '/api/e2e/' }));
app.use('/api/v2/kt', auth, proxy(config.services.auth, { '^/': '/api/kt/' }));

// ─── Messaging (messaging-core-service) ───
app.use('/api/v2/chats', auth, proxy(config.services.message, { '^/': '/api/chats/' }));
app.use('/api/v2/messages', auth, proxy(config.services.message, { '^/': '/api/messages/' }));
app.use('/api/v2/search', auth, proxy(config.services.search, { '^/': '/api/search/' }));
app.use('/api/v2/moderation', auth, proxy(config.services.moderation, { '^/': '/api/moderation/' }));
app.use('/api/v2/reactions', auth, proxy(config.services.message, { '^/': '/api/reactions/' }));
app.use('/api/v2/threads', auth, proxy(config.services.message, { '^/': '/api/threads/' }));
app.use('/api/v2/sparks', auth, proxy(config.services.message, { '^/': '/api/sparks/' }));
app.use('/api/v2/translate', auth, proxy(config.services.translation, { '^/': '/api/translate/' }));

// ─── Media (media-service) ────────────────
app.use('/api/v2/media', auth, proxy(config.services.media, { '^/': '/api/media/' }));
app.use('/api/v2/stories', auth, proxy(config.services.stories, { '^/': '/api/stories/' }));
app.use('/api/v2/stickers', auth, proxy(config.services.sticker, { '^/': '/api/stickers/' }));

// ─── Real-time (realtime-service) ─────────
app.use('/api/v2/presence', auth, proxy(config.services.presence, { '^/': '/api/presence/' }));
app.use('/api/v2/notifications', auth, proxy(config.services.notification, { '^/': '/api/notifications/' }));
app.use('/api/v2/calls', auth, proxy(config.services.calls, { '^/': '/api/calls/' }));

// ─── Bots & Webapp ───────────────────────
app.use('/api/v2/bots', auth, proxy(config.services.bot, { '^/': '/api/bots/' }));
app.use('/api/v2/bot-api', proxy(config.services.bot, { '^/': '/api/bot-api/' }));
app.use('/api/v2/webapp', auth, proxy(config.services.webapp, { '^/': '/api/webapp/' }));

// ─── Wallet & WBIT ───────────────────────
app.use('/api/v2/wallet', auth, proxy(config.services.wallet, { '^/': '/api/wallet/' }));
app.use('/api/v2/wbit', auth, proxy(config.services.wbit, { '^/': '/api/wbit/' }));

app.use(errorHandler);

async function start() {
  await initializeSecurity();
  await redis.connect();
  AuditLogger.setRedis(securityRedis);

  app.listen(config.port, () => {
    logger.info(`API Gateway running on ${config.port}`);
  });
}

start().catch((err) => {
  logger.error('Startup failed', { error: err.message });
  process.exit(1);
});
