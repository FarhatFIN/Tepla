const authUserServiceUrl = process.env.AUTH_USER_SERVICE_URL;
const messagingServiceUrl = process.env.MESSAGING_SERVICE_URL;
const mediaServiceUrl = process.env.MEDIA_SERVICE_URL;
const realtimeServiceUrl = process.env.REALTIME_SERVICE_URL;
const botPlatformServiceUrl = process.env.BOT_PLATFORM_SERVICE_URL;

export const config = {
  port: parseInt(process.env.PORT || '3000'),
  jwtSecret: process.env.JWT_SECRET || 'tepla-jwt-secret-change-me',
  redisUrl: process.env.REDIS_URL || 'redis://localhost:6379',

  // Service URLs support both the legacy split topology and the consolidated 5-service target.
  services: {
    auth: authUserServiceUrl || process.env.AUTH_SERVICE_URL || 'http://localhost:3001',
    user: authUserServiceUrl || process.env.USER_SERVICE_URL || 'http://localhost:3002',
    chat: messagingServiceUrl || process.env.CHAT_SERVICE_URL || 'http://localhost:3003',
    message: messagingServiceUrl || process.env.MESSAGE_SERVICE_URL || 'http://localhost:3004',
    presence: realtimeServiceUrl || process.env.PRESENCE_SERVICE_URL || 'http://localhost:3005',
    notification: realtimeServiceUrl || process.env.NOTIFICATION_SERVICE_URL || 'http://localhost:3006',
    media: mediaServiceUrl || process.env.MEDIA_SERVICE_URL || 'http://localhost:3007',
    search: messagingServiceUrl || process.env.SEARCH_SERVICE_URL || 'http://localhost:3008',
    moderation: messagingServiceUrl || process.env.MODERATION_SERVICE_URL || 'http://localhost:3010',
    analytics: process.env.ANALYTICS_SERVICE_URL || 'http://localhost:3011',
    calls: realtimeServiceUrl || process.env.CALLS_SERVICE_URL || 'http://localhost:3012',
    bot: botPlatformServiceUrl || process.env.BOT_SERVICE_URL || 'http://localhost:3013',
    stories: mediaServiceUrl || process.env.STORIES_SERVICE_URL || 'http://localhost:3014',
    sticker: mediaServiceUrl || process.env.STICKER_SERVICE_URL || 'http://localhost:3015',
    translation: messagingServiceUrl || process.env.TRANSLATION_SERVICE_URL || 'http://localhost:3016',
    webapp: botPlatformServiceUrl || process.env.WEBAPP_SERVICE_URL || 'http://localhost:3017',
    wallet: process.env.WALLET_SERVICE_URL || 'http://localhost:3018',
    wbit: process.env.WBIT_SERVICE_URL || 'http://localhost:3019',
  },

  rateLimits: {
    global: { windowMs: 60_000, max: 200 },
    auth: { windowMs: 60_000, max: 10 },
    messages: { windowMs: 1_000, max: 30 },
    upload: { windowMs: 60_000, max: 20 },
  },

  cors: {
    origin: process.env.CORS_ORIGIN || '*',
    credentials: true,
  },
};
