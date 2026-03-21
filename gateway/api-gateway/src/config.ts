export const config = {
  port: parseInt(process.env.PORT || '3000'),
  jwtSecret: process.env.JWT_SECRET || 'tepla-jwt-secret-change-me',
  redisUrl: process.env.REDIS_URL || 'redis://localhost:6379',

  // Service URLs (fallback to localhost for local dev, Docker DNS for containers)
  services: {
    auth: process.env.AUTH_SERVICE_URL || 'http://localhost:3001',
    user: process.env.USER_SERVICE_URL || 'http://localhost:3002',
    chat: process.env.CHAT_SERVICE_URL || 'http://localhost:3003',
    message: process.env.MESSAGE_SERVICE_URL || 'http://localhost:3004',
    presence: process.env.PRESENCE_SERVICE_URL || 'http://localhost:3005',
    notification: process.env.NOTIFICATION_SERVICE_URL || 'http://localhost:3006',
    media: process.env.MEDIA_SERVICE_URL || 'http://localhost:3007',
    search: process.env.SEARCH_SERVICE_URL || 'http://localhost:3008',
    premium: process.env.PREMIUM_SERVICE_URL || 'http://localhost:3009',
    moderation: process.env.MODERATION_SERVICE_URL || 'http://localhost:3010',
    analytics: process.env.ANALYTICS_SERVICE_URL || 'http://localhost:3011',
    calls: process.env.CALLS_SERVICE_URL || 'http://localhost:3012',
    bot: process.env.BOT_SERVICE_URL || 'http://localhost:3013',
    stories: process.env.STORIES_SERVICE_URL || 'http://localhost:3014',
    sticker: process.env.STICKER_SERVICE_URL || 'http://localhost:3015',
    translation: process.env.TRANSLATION_SERVICE_URL || 'http://localhost:3016',
    webapp: process.env.WEBAPP_SERVICE_URL || 'http://localhost:3017',
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
