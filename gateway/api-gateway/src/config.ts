const authUserServiceUrl = process.env.AUTH_USER_SERVICE_URL;
const messagingServiceUrl = process.env.MESSAGING_SERVICE_URL;
const mediaServiceUrl = process.env.MEDIA_SERVICE_URL;
const realtimeServiceUrl = process.env.REALTIME_SERVICE_URL;
const botPlatformServiceUrl = process.env.BOT_PLATFORM_SERVICE_URL;

const parseBooleanEnv = (value: string | undefined, fallback: boolean): boolean => {
  if (value === undefined) {
    return fallback;
  }

  return value === 'true';
};

const jwtSecret = (() => {
  if (!process.env.JWT_SECRET) {
    throw new Error('FATAL: JWT_SECRET environment variable is required');
  }
  return process.env.JWT_SECRET;
})();

const allowedCorsOrigins = (process.env.CORS_ORIGIN || '')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

if (allowedCorsOrigins.length === 0) {
  console.warn('WARN: CORS_ORIGIN is not set; browser CORS requests with credentials will be rejected');
}

const hasBotPlatformConfig = Boolean(
  botPlatformServiceUrl || process.env.BOT_SERVICE_URL || process.env.WEBAPP_SERVICE_URL,
);

const hasLegacyFeatureConfig = Boolean(
  process.env.PREMIUM_SERVICE_URL ||
    process.env.ANALYTICS_SERVICE_URL ||
    process.env.WALLET_SERVICE_URL ||
    process.env.WBIT_SERVICE_URL,
);

export const config = {
  port: parseInt(process.env.PORT || '3000'),
  jwtSecret,
  redisUrl: process.env.REDIS_URL || 'redis://localhost:6379',

  features: {
    botPlatform: parseBooleanEnv(process.env.TEPLA_ENABLE_BOT_PLATFORM, hasBotPlatformConfig),
    legacyFeatures: parseBooleanEnv(process.env.TEPLA_ENABLE_LEGACY_FEATURES, hasLegacyFeatureConfig),
  },

  services: {
    authUser: authUserServiceUrl || process.env.AUTH_SERVICE_URL || process.env.USER_SERVICE_URL || 'http://localhost:3001',
    messaging: messagingServiceUrl || process.env.MESSAGE_SERVICE_URL || process.env.CHAT_SERVICE_URL || 'http://localhost:3004',
    media: mediaServiceUrl || process.env.MEDIA_SERVICE_URL || process.env.STORIES_SERVICE_URL || process.env.STICKER_SERVICE_URL || 'http://localhost:3007',
    realtime: realtimeServiceUrl || process.env.PRESENCE_SERVICE_URL || process.env.NOTIFICATION_SERVICE_URL || process.env.CALLS_SERVICE_URL || 'http://localhost:3100',
    botPlatform: botPlatformServiceUrl || process.env.BOT_SERVICE_URL || process.env.WEBAPP_SERVICE_URL || 'http://localhost:3013',
    legacy: {
      analytics: process.env.ANALYTICS_SERVICE_URL || 'http://localhost:3011',
      wallet: process.env.WALLET_SERVICE_URL || 'http://localhost:3018',
      wbit: process.env.WBIT_SERVICE_URL || 'http://localhost:3019',
      webapp: process.env.WEBAPP_SERVICE_URL || botPlatformServiceUrl || 'http://localhost:3017',
    },
  },

  rateLimits: {
    global: { windowMs: 60_000, max: 200 },
    auth: { windowMs: 60_000, max: 10 },
    messages: { windowMs: 1_000, max: 30 },
    upload: { windowMs: 60_000, max: 20 },
  },

  cors: {
    origin(origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) {
      if (!origin || allowedCorsOrigins.includes(origin)) {
        callback(null, true);
        return;
      }
      callback(new Error('CORS origin is not allowed'));
    },
    credentials: true,
  },
};
