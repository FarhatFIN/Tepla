import express from 'express';
import cors from 'cors';
import compression from 'compression';
import { createProxyMiddleware, Options as ProxyOptions, fixRequestBody } from 'http-proxy-middleware';
import { createLogger, RedisClient, errorHandler, correlationMiddleware, requestLoggerMiddleware, authMiddleware } from '@tepla/common';
import { SecurityMiddleware, AuditLogger, initializeSecurity } from '@tepla/security';
import Redis from 'ioredis';
import { config } from './config';

const app = express();
const logger = createLogger('api-gateway');
const redis = new RedisClient(config.redisUrl);

// Raw ioredis instance for security framework
const securityRedis = new Redis(config.redisUrl);
const securityMiddleware = new SecurityMiddleware(securityRedis);

// ─── Security Headers (replaces helmet — more restrictive) ───
app.use(securityMiddleware.securityHeaders());

// ─── Standard Middleware ────────────────────
app.use(cors(config.cors));
app.use(compression());
// Note: express.json() is NOT used globally — it would consume the request body
// and prevent http-proxy-middleware from forwarding it to upstream services.
// Only apply it to non-proxy routes that need body parsing.
app.use(correlationMiddleware());
app.use(requestLoggerMiddleware('api-gateway'));

// ─── Device Fingerprint (attach to every request) ───
app.use(securityMiddleware.deviceFingerprint());

// ─── Global IP Rate Limit ───────────────────
app.use(securityMiddleware.ipRateLimit(200));

// ─── Health Check ───────────────────────────
app.get('/health', async (_req, res) => {
  const metrics = await securityMiddleware.getMetrics();
  res.json({
    service: 'api-gateway',
    status: 'healthy',
    timestamp: new Date().toISOString(),
    securityMetrics: metrics,
  });
});

// ─── Security Metrics Endpoint ──────────────
app.get('/api/v2/security/metrics', authMiddleware(config.jwtSecret), async (_req, res) => {
  const metrics = await securityMiddleware.getMetrics();
  res.json({ success: true, data: metrics });
});

// ─── Security Audit Log ─────────────────────
app.get('/api/v2/security/audit', authMiddleware(config.jwtSecret), async (req, res) => {
  const count = parseInt(req.query.count as string) || 100;
  const entries = await AuditLogger.getRecent(count);
  res.json({ success: true, data: entries });
});

// ─── Proxy Helper ───────────────────────────
function proxy(target: string, pathRewrite?: Record<string, string>): ReturnType<typeof createProxyMiddleware> {
  const options: ProxyOptions = {
    target,
    changeOrigin: true,
    pathRewrite,
    on: {
      proxyReq: (proxyReq, req: any) => {
        // Forward auth & correlation headers
        if (req.headers.authorization) {
          proxyReq.setHeader('Authorization', req.headers.authorization);
        }
        if (req.correlationId) {
          proxyReq.setHeader('X-Correlation-Id', req.correlationId);
        }
        if (req.user) {
          proxyReq.setHeader('X-User-Id', req.user.sub);
          proxyReq.setHeader('X-User-Premium', String(req.user.isPremium));
        }
        // Forward device fingerprint
        if (req.deviceFingerprint) {
          proxyReq.setHeader('X-Device-Fingerprint', req.deviceFingerprint);
        }
        // Forward security anomaly flag
        if (req.securityAnomaly) {
          proxyReq.setHeader('X-Security-Anomaly', JSON.stringify(req.securityAnomaly));
        }
        // Re-serialize body if it was consumed by express.json() (must be last)
        fixRequestBody(proxyReq, req);
      },
      error: (err, _req, res: any) => {
        logger.error('Proxy error', { error: err.message });
        res.status(502).json({
          success: false,
          error: { code: 'BAD_GATEWAY', message: 'Service temporarily unavailable' },
        });
      },
    },
  };
  return createProxyMiddleware(options);
}

const auth = authMiddleware(config.jwtSecret);

// ─── Public Routes (auth rate limit with lockout protection) ─────
app.use('/api/v2/auth',
  express.json({ limit: '1mb' }),
  securityMiddleware.authRateLimit(),
  securityMiddleware.auditSensitive('auth'),
  proxy(config.services.auth, { '^/': '/api/auth/' })
);

// ─── Protected Routes (with anomaly detection) ──────────────────
const protectedMiddleware = [auth, securityMiddleware.userRateLimit(200), securityMiddleware.anomalyDetection()];

app.use('/api/v2/users', ...protectedMiddleware, proxy(config.services.user, { '^/': '/api/users/' }));
app.use('/api/v2/chats', ...protectedMiddleware, proxy(config.services.chat, { '^/': '/api/chats/' }));
app.use('/api/v2/messages', auth, securityMiddleware.userRateLimit(120), securityMiddleware.anomalyDetection(), proxy(config.services.message, { '^/': '/api/messages/' }));
app.use('/api/v2/presence', ...protectedMiddleware, proxy(config.services.presence, { '^/': '/api/presence/' }));
app.use('/api/v2/notifications', ...protectedMiddleware, proxy(config.services.notification, { '^/': '/api/notifications/' }));
app.use('/api/v2/media', auth, securityMiddleware.userRateLimit(50), proxy(config.services.media, { '^/': '/api/media/' }));
app.use('/api/v2/search', ...protectedMiddleware, proxy(config.services.search, { '^/': '/api/search/' }));

// ─── Sensitive Routes (audit logging) ───────────────────────────
app.use('/api/v2/premium', auth, securityMiddleware.userRateLimit(100), securityMiddleware.auditSensitive('premium'), proxy(config.services.premium, { '^/': '/api/premium/' }));
app.use('/api/v2/moderation', auth, securityMiddleware.userRateLimit(50), securityMiddleware.auditSensitive('moderation'), proxy(config.services.moderation, { '^/': '/api/moderation/' }));
app.use('/api/v2/analytics', auth, securityMiddleware.userRateLimit(30), securityMiddleware.auditSensitive('analytics'), proxy(config.services.analytics, { '^/': '/api/analytics/' }));

// ─── New Feature Routes v2.1 ────────────────────────────────────
app.use('/api/v2/calls', ...protectedMiddleware, proxy(config.services.calls, { '^/': '/api/calls/' }));
app.use('/api/v2/bots', ...protectedMiddleware, proxy(config.services.bot, { '^/': '/api/bots/' }));
app.use('/api/v2/bot-api', proxy(config.services.bot, { '^/': '/api/bot-api/' })); // Bot API — uses own token auth
app.use('/api/v2/stories', ...protectedMiddleware, proxy(config.services.stories, { '^/': '/api/stories/' }));
app.use('/api/v2/stickers', ...protectedMiddleware, proxy(config.services.sticker, { '^/': '/api/stickers/' }));
app.use('/api/v2/gifs', ...protectedMiddleware, proxy(config.services.sticker, { '^/': '/api/gifs/' }));
app.use('/api/v2/translate', ...protectedMiddleware, proxy(config.services.translation, { '^/': '/api/translate/' }));
app.use('/api/v2/webapps', ...protectedMiddleware, proxy(config.services.webapp, { '^/': '/api/webapps/' }));
app.use('/api/v2/payments', auth, securityMiddleware.auditSensitive('payment'), proxy(config.services.webapp, { '^/': '/api/payments/' }));
app.use('/api/v2/store', ...protectedMiddleware, proxy(config.services.webapp, { '^/': '/api/store/' }));
app.use('/api/v2/threads', ...protectedMiddleware, proxy(config.services.message, { '^/': '/api/threads/' }));
app.use('/api/v2/scheduled', ...protectedMiddleware, proxy(config.services.message, { '^/': '/api/scheduled/' }));
app.use('/api/v2/folders', ...protectedMiddleware, proxy(config.services.chat, { '^/': '/api/folders/' }));
app.use('/api/v2/roles', ...protectedMiddleware, proxy(config.services.chat, { '^/': '/api/roles/' }));
app.use('/api/v2/reactions', ...protectedMiddleware, proxy(config.services.message, { '^/': '/api/reactions/' }));
app.use('/api/v2/sparks', auth, securityMiddleware.auditSensitive('sparks'), proxy(config.services.message, { '^/': '/api/sparks/' }));

// ─── Wallet & KYC Routes v2.3 ─────────────────────────────────────
app.use('/api/v2/wallet', auth, securityMiddleware.userRateLimit(100), securityMiddleware.auditSensitive('wallet'), proxy(config.services.wallet, { '^/': '/api/wallet/' }));
app.use('/api/v2/wallet/kyc/webhook', express.json({ limit: '1mb' }), proxy(config.services.wallet, { '^/': '/api/wallet/kyc/webhook' })); // No auth — Sumsub webhook

// ─── WBIT Token Routes v2.4 ───────────────────────────────────────
app.use('/api/v2/wbit/price', proxy(config.services.wbit, { '^/': '/api/wbit/price' })); // Public
app.use('/api/v2/wbit/info', proxy(config.services.wbit, { '^/': '/api/wbit/info' }));   // Public
app.use('/api/v2/wbit', auth, securityMiddleware.userRateLimit(100), securityMiddleware.auditSensitive('wbit'), proxy(config.services.wbit, { '^/': '/api/wbit/' }));

// ─── Error Handler ──────────────────────────
app.use(errorHandler);

// ─── Start ──────────────────────────────────
async function start() {
  // Initialize security framework (libsodium, master key validation)
  await initializeSecurity();

  await redis.connect();
  AuditLogger.setRedis(securityRedis);

  app.listen(config.port, () => {
    logger.info(`API Gateway running on port ${config.port}`, {
      securityHeaders: true,
      deviceFingerprinting: true,
      anomalyDetection: true,
      authRateLimiting: true,
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

start().catch((err) => {
  logger.error('Failed to start API Gateway', { error: err.message });
  process.exit(1);
});
