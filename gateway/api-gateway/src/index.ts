import compression from 'compression';
import cors from 'cors';
import express, { type NextFunction, type Request, type RequestHandler, type Response } from 'express';
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
        proxyReq.removeHeader('X-User-Id');
        proxyReq.removeHeader('X-User-Premium');

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

async function forwardAuthRequest(req: GatewayRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const targetUrl = new URL(`/api/auth${req.path}`, config.services.authUser);
    for (const [key, value] of Object.entries(req.query)) {
      if (Array.isArray(value)) {
        for (const item of value) targetUrl.searchParams.append(key, String(item));
      } else if (value !== undefined) {
        targetUrl.searchParams.set(key, String(value));
      }
    }

    const headers = new Headers();
    headers.set('Content-Type', 'application/json');
    if (req.headers.authorization) headers.set('Authorization', req.headers.authorization);
    if (req.correlationId) headers.set('X-Correlation-Id', req.correlationId);
    if (req.deviceFingerprint) headers.set('X-Device-Fingerprint', req.deviceFingerprint);
    if (req.securityAnomaly) headers.set('X-Security-Anomaly', JSON.stringify(req.securityAnomaly));

    const upstream = await fetch(targetUrl, {
      method: req.method,
      headers,
      body: ['GET', 'HEAD'].includes(req.method) ? undefined : JSON.stringify(req.body || {}),
    });

    const contentType = upstream.headers.get('content-type');
    if (contentType) res.setHeader('Content-Type', contentType);
    const setCookies = (upstream.headers as unknown as { getSetCookie?: () => string[] }).getSetCookie?.()
      || (upstream.headers.get('set-cookie') ? [upstream.headers.get('set-cookie') as string] : []);
    for (const cookie of setCookies) {
      res.append('Set-Cookie', cookie);
    }

    const text = await upstream.text();
    res.status(upstream.status).send(text);
  } catch (err) {
    next(err);
  }
}

const auth = authMiddleware(config.jwtSecret);

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
  forwardAuthRequest,
);

app.use(
  '/api/v2/users/check-username',
  proxy(config.services.authUser, { '^/': '/api/users/check-username' }),
);

registerRoutes([
  {
    path: '/api/v2/contacts',
    middleware: protectedMiddleware,
    target: config.services.authUser,
    rewrite: '/api/users/contacts/',
  },
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
    path: '/api/v2/dm',
    middleware: protectedMiddleware,
    target: config.services.messaging,
    rewrite: '/api/dm/',
  },
  {
    path: '/api/v2/groups',
    middleware: protectedMiddleware,
    target: config.services.messaging,
    rewrite: '/api/groups/',
  },
  {
    path: '/api/v2/channels',
    middleware: protectedMiddleware,
    target: config.services.messaging,
    rewrite: '/api/channels/',
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
    path: '/api/v2/stats',
    middleware: protectedMiddleware,
    target: config.services.messaging,
    rewrite: '/api/stats/',
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

