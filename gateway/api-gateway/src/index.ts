import compression from 'compression';
import cors from 'cors';
import express, { type Request, type RequestHandler, type Response } from 'express';
import { createProxyMiddleware, fixRequestBody, type Options as ProxyOptions } from 'http-proxy-middleware';
import {
  authMiddleware,
  correlationMiddleware,
  createLogger,
  errorHandler,
  RedisClient,
  requestLoggerMiddleware,
} from '@tepla/common';
import { AuditLogger, initializeSecurity, SecurityMiddleware } from '@tepla/security';
import Redis from 'ioredis';
import { config } from './config';

type GatewayUser = {
  sub: string;
  isPremium?: boolean;
};

type GatewayRequest = Request & {
  correlationId?: string;
  deviceFingerprint?: string;
  securityAnomaly?: unknown;
  user?: GatewayUser;
};

type RouteDefinition = {
  middleware: RequestHandler[];
  path: string;
  rewrite: string;
  target: string;
};

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

  res.json({
    service: 'api-gateway',
    status: 'healthy',
    timestamp: new Date().toISOString(),
    features: config.features,
    securityMetrics: metrics,
  });
});

app.get('/api/v2/security/metrics', authMiddleware(config.jwtSecret), async (_req, res) => {
  const metrics = await securityMiddleware.getMetrics();
  res.json({ success: true, data: metrics });
});

app.get('/api/v2/security/audit', authMiddleware(config.jwtSecret), async (req, res) => {
  const count = Number.parseInt(req.query.count as string, 10) || 100;
  const entries = await AuditLogger.getRecent(count);
  res.json({ success: true, data: entries });
});

function proxy(target: string, pathRewrite: Record<string, string>): ReturnType<typeof createProxyMiddleware> {
  const options: ProxyOptions<GatewayRequest, Response> = {
    target,
    changeOrigin: true,
    pathRewrite,
    on: {
      proxyReq: (proxyReq, req) => {
        if (req.headers.authorization) {
          proxyReq.setHeader('Authorization', req.headers.authorization);
        }

        if (req.correlationId) {
          proxyReq.setHeader('X-Correlation-Id', req.correlationId);
        }

        if (req.user) {
          proxyReq.setHeader('X-User-Id', req.user.sub);
          proxyReq.setHeader('X-User-Premium', String(Boolean(req.user.isPremium)));
        }

        if (req.deviceFingerprint) {
          proxyReq.setHeader('X-Device-Fingerprint', req.deviceFingerprint);
        }

        if (req.securityAnomaly) {
          proxyReq.setHeader('X-Security-Anomaly', JSON.stringify(req.securityAnomaly));
        }

        fixRequestBody(proxyReq, req);
      },
      error: (err, _req, res) => {
        const response = res as Response & { headersSent?: boolean };

        logger.error('Proxy error', { error: err.message, target });

        if (!response.headersSent) {
          response.status(502).json({
            success: false,
            error: {
              code: 'BAD_GATEWAY',
              message: 'Service temporarily unavailable',
            },
          });
        }
      },
    },
  };

  return createProxyMiddleware(options);
}

function registerRoutes(routes: RouteDefinition[]): void {
  for (const route of routes) {
    app.use(
      route.path,
      ...route.middleware,
      proxy(route.target, { '^/': route.rewrite }),
    );
  }
}

const auth = authMiddleware(config.jwtSecret);

<<<<<<< HEAD
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
=======
const protectedMiddleware: RequestHandler[] = [
  auth,
  securityMiddleware.userRateLimit(200),
  securityMiddleware.anomalyDetection(),
];

app.use(
  '/api/v2/auth',
  express.json({ limit: '1mb' }),
  securityMiddleware.authRateLimit(),
  securityMiddleware.auditSensitive('auth'),
  proxy(config.services.authUser, { '^/': '/api/auth/' }),
);

registerRoutes([
  {
    path: '/api/v2/users',
    middleware: protectedMiddleware,
    target: config.services.authUser,
    rewrite: '/api/users/',
  },
  {
    path: '/api/v2/e2e',
    middleware: [auth, securityMiddleware.userRateLimit(120), securityMiddleware.anomalyDetection()],
    target: config.services.authUser,
    rewrite: '/api/e2e/',
  },
  {
    path: '/api/v2/kt/head',
    middleware: [],
    target: config.services.authUser,
    rewrite: '/api/kt/head',
  },
  {
    path: '/api/v2/kt',
    middleware: [auth, securityMiddleware.userRateLimit(60), securityMiddleware.anomalyDetection()],
    target: config.services.authUser,
    rewrite: '/api/kt/',
  },
  {
    path: '/api/v2/chats',
    middleware: protectedMiddleware,
    target: config.services.messaging,
    rewrite: '/api/chats/',
  },
  {
    path: '/api/v2/messages',
    middleware: [auth, securityMiddleware.userRateLimit(120), securityMiddleware.anomalyDetection()],
    target: config.services.messaging,
    rewrite: '/api/messages/',
  },
  {
    path: '/api/v2/folders',
    middleware: protectedMiddleware,
    target: config.services.messaging,
    rewrite: '/api/folders/',
  },
  {
    path: '/api/v2/roles',
    middleware: protectedMiddleware,
    target: config.services.messaging,
    rewrite: '/api/roles/',
  },
  {
    path: '/api/v2/reactions',
    middleware: protectedMiddleware,
    target: config.services.messaging,
    rewrite: '/api/reactions/',
  },
  {
    path: '/api/v2/threads',
    middleware: protectedMiddleware,
    target: config.services.messaging,
    rewrite: '/api/threads/',
  },
  {
    path: '/api/v2/scheduled',
    middleware: protectedMiddleware,
    target: config.services.messaging,
    rewrite: '/api/scheduled/',
  },
  {
    path: '/api/v2/search',
    middleware: protectedMiddleware,
    target: config.services.messaging,
    rewrite: '/api/search/',
  },
  {
    path: '/api/v2/moderation',
    middleware: [auth, securityMiddleware.userRateLimit(50), securityMiddleware.auditSensitive('moderation')],
    target: config.services.messaging,
    rewrite: '/api/moderation/',
  },
  {
    path: '/api/v2/translate',
    middleware: protectedMiddleware,
    target: config.services.messaging,
    rewrite: '/api/translate/',
  },
  {
    path: '/api/v2/sparks',
    middleware: [auth, securityMiddleware.userRateLimit(120), securityMiddleware.auditSensitive('sparks')],
    target: config.services.messaging,
    rewrite: '/api/sparks/',
  },
  {
    path: '/api/v2/media',
    middleware: [auth, securityMiddleware.userRateLimit(50)],
    target: config.services.media,
    rewrite: '/api/media/',
  },
  {
    path: '/api/v2/stories',
    middleware: protectedMiddleware,
    target: config.services.media,
    rewrite: '/api/stories/',
  },
  {
    path: '/api/v2/stickers',
    middleware: protectedMiddleware,
    target: config.services.media,
    rewrite: '/api/stickers/',
  },
  {
    path: '/api/v2/gifs',
    middleware: protectedMiddleware,
    target: config.services.media,
    rewrite: '/api/gifs/',
  },
  {
    path: '/api/v2/presence',
    middleware: protectedMiddleware,
    target: config.services.realtime,
    rewrite: '/api/presence/',
  },
  {
    path: '/api/v2/notifications',
    middleware: protectedMiddleware,
    target: config.services.realtime,
    rewrite: '/api/notifications/',
  },
  {
    path: '/api/v2/calls',
    middleware: protectedMiddleware,
    target: config.services.realtime,
    rewrite: '/api/calls/',
  },
]);

if (config.features.botPlatform) {
  registerRoutes([
    {
      path: '/api/v2/bots',
      middleware: protectedMiddleware,
      target: config.services.botPlatform,
      rewrite: '/api/bots/',
    },
    {
      path: '/api/v2/bot-api',
      middleware: [],
      target: config.services.botPlatform,
      rewrite: '/api/bot-api/',
    },
    {
      path: '/api/v2/webapps',
      middleware: protectedMiddleware,
      target: config.services.botPlatform,
      rewrite: '/api/webapps/',
    },
  ]);
} else {
  logger.info('Bot platform routes are disabled by default', {
    hint: 'Set TEPLA_ENABLE_BOT_PLATFORM=true to expose /api/v2/bots and /api/v2/webapps',
  });
}

if (config.features.legacyFeatures) {
  registerRoutes([
    {
      path: '/api/v2/analytics',
      middleware: [auth, securityMiddleware.userRateLimit(30), securityMiddleware.auditSensitive('analytics')],
      target: config.services.legacy.analytics,
      rewrite: '/api/analytics/',
    },
    {
      path: '/api/v2/payments',
      middleware: [auth, securityMiddleware.auditSensitive('payment')],
      target: config.services.legacy.webapp,
      rewrite: '/api/payments/',
    },
    {
      path: '/api/v2/store',
      middleware: protectedMiddleware,
      target: config.services.legacy.webapp,
      rewrite: '/api/store/',
    },
    {
      path: '/api/v2/wallet',
      middleware: [auth, securityMiddleware.userRateLimit(100), securityMiddleware.auditSensitive('wallet')],
      target: config.services.legacy.wallet,
      rewrite: '/api/wallet/',
    },
    {
      path: '/api/v2/wbit/price',
      middleware: [],
      target: config.services.legacy.wbit,
      rewrite: '/api/wbit/price',
    },
    {
      path: '/api/v2/wbit/info',
      middleware: [],
      target: config.services.legacy.wbit,
      rewrite: '/api/wbit/info',
    },
    {
      path: '/api/v2/wbit',
      middleware: [auth, securityMiddleware.userRateLimit(100), securityMiddleware.auditSensitive('wbit')],
      target: config.services.legacy.wbit,
      rewrite: '/api/wbit/',
    },
  ]);
} else {
  logger.info('Legacy feature routes are disabled by default', {
    hint: 'Set TEPLA_ENABLE_LEGACY_FEATURES=true to expose wallet, analytics, and WBIT routes',
  });
}

>>>>>>> origin/main

app.use(errorHandler);

async function start(): Promise<void> {
  await initializeSecurity();
  await redis.connect();
  AuditLogger.setRedis(securityRedis);

  app.listen(config.port, () => {
    logger.info(`API Gateway running on port ${config.port}`, {
      authUser: config.services.authUser,
      botPlatformEnabled: config.features.botPlatform,
      legacyFeaturesEnabled: config.features.legacyFeatures,
      media: config.services.media,
      messaging: config.services.messaging,
      realtime: config.services.realtime,
    });
  });

  const shutdown = async () => {
    logger.info('Shutting down API Gateway...');
    await redis.disconnect();
    securityRedis.disconnect();
    process.exit(0);
  };

  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
}

start().catch((err: Error) => {
  logger.error('Failed to start API Gateway', { error: err.message });
  process.exit(1);
});
