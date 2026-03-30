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

app.use('/api/v2/auth',
  express.json({ limit: '1mb' }),
  securityMiddleware.authRateLimit(),
  proxy(config.services.authUser, { '^/': '/api/auth/' })
);

app.use('/api/v2/users', auth, proxy(config.services.authUser, { '^/': '/api/users/' }));
app.use('/api/v2/e2e', auth, proxy(config.services.authUser, { '^/': '/api/e2e/' }));
app.use('/api/v2/kt', auth, proxy(config.services.authUser, { '^/': '/api/kt/' }));

app.use('/api/v2/chats', auth, proxy(config.services.messaging, { '^/': '/api/chats/' }));
app.use('/api/v2/messages', auth, proxy(config.services.messaging, { '^/': '/api/messages/' }));
app.use('/api/v2/search', auth, proxy(config.services.messaging, { '^/': '/api/search/' }));
app.use('/api/v2/moderation', auth, proxy(config.services.messaging, { '^/': '/api/moderation/' }));
app.use('/api/v2/reactions', auth, proxy(config.services.messaging, { '^/': '/api/reactions/' }));
app.use('/api/v2/threads', auth, proxy(config.services.messaging, { '^/': '/api/threads/' }));
app.use('/api/v2/sparks', auth, proxy(config.services.messaging, { '^/': '/api/sparks/' }));

app.use('/api/v2/media', auth, proxy(config.services.media, { '^/': '/api/media/' }));

app.use('/api/v2/presence', auth, proxy(config.services.realtime, { '^/': '/api/presence/' }));
app.use('/api/v2/notifications', auth, proxy(config.services.realtime, { '^/': '/api/notifications/' }));
app.use('/api/v2/calls', auth, proxy(config.services.realtime, { '^/': '/api/calls/' }));

app.use('/api/v2/bots', auth, proxy(config.services.bot, { '^/': '/api/bots/' }));
app.use('/api/v2/bot-api', proxy(config.services.bot, { '^/': '/api/bot-api/' }));

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
