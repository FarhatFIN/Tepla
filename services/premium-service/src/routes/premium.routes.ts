import { Router, Request, Response, NextFunction } from 'express';
import { v4 as uuid } from 'uuid';
import { RedisClient, KafkaProducer, authMiddleware, NotFoundError, ValidationError, createLogger } from '@tepla/common';
import { EventType, EventTopic, UserId, SubscriptionPlan, SubscriptionStatus, FREE_LIMITS, PREMIUM_LIMITS } from '@tepla/types';
import { SubscriptionRepository } from '../repositories/subscription.repository';

const logger = createLogger('premium-routes');

export function premiumRouter(redis: RedisClient, kafka: KafkaProducer): Router {
  const router = Router();
  const auth = authMiddleware();
  const subRepo = new SubscriptionRepository();

  // GET /api/premium/status — check current user's premium status
  router.get('/status', auth, async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user!.sub;
      const cacheKey = `premium:status:${userId}`;

      const cached = await redis.getJson<any>(cacheKey);
      if (cached) return res.json({ success: true, data: cached });

      const sub = await subRepo.getActiveSubscription(userId);
      const isPremium = !!sub && sub.status === SubscriptionStatus.ACTIVE;

      const status = {
        isPremium,
        plan: sub?.plan || SubscriptionPlan.FREE,
        status: sub?.status || null,
        expiresAt: sub?.expires_at || null,
        startedAt: sub?.started_at || null,
        limits: isPremium ? PREMIUM_LIMITS : FREE_LIMITS,
        features: getFeatures(isPremium),
      };

      await redis.setJson(cacheKey, status, 300); // 5 min cache
      await redis.set(`premium:${userId}`, isPremium ? '1' : '0', 300);

      res.json({ success: true, data: status });
    } catch (err) { next(err); }
  });

  // GET /api/premium/plans — list available plans
  router.get('/plans', async (_req: Request, res: Response) => {
    res.json({
      success: true,
      data: {
        plans: [
          {
            id: SubscriptionPlan.MONTHLY,
            name: 'Tepla Premium — 1 месяц',
            price: 499,
            currency: 'RUB',
            interval: '1month',
            features: getPlanFeatures(),
            paddlePriceId: process.env.PADDLE_PRICE_ID_MONTHLY,
          },
          {
            id: SubscriptionPlan.QUARTERLY,
            name: 'Tepla Premium — 3 месяца',
            price: 999,
            currency: 'RUB',
            interval: '3months',
            savings: '333 ₽/мес',
            features: getPlanFeatures(),
            paddlePriceId: process.env.PADDLE_PRICE_ID_QUARTERLY,
          },
          {
            id: SubscriptionPlan.SEMIANNUAL,
            name: 'Tepla Premium — 6 месяцев',
            price: 1499,
            currency: 'RUB',
            interval: '6months',
            savings: '250 ₽/мес',
            popular: true,
            features: getPlanFeatures(),
            paddlePriceId: process.env.PADDLE_PRICE_ID_SEMIANNUAL,
          },
          {
            id: SubscriptionPlan.YEARLY,
            name: 'Tepla Premium — 1 год',
            price: 2399,
            currency: 'RUB',
            interval: '1year',
            savings: '200 ₽/мес',
            features: getPlanFeatures(),
            paddlePriceId: process.env.PADDLE_PRICE_ID_YEARLY,
          },
        ],
      },
    });
  });

  // POST /api/premium/subscribe — create subscription
  router.post('/subscribe', auth, async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { plan, paddleSubscriptionId, paddleTransactionId } = req.body;
      const userId = req.user!.sub;

      if (!plan || !Object.values(SubscriptionPlan).includes(plan)) {
        throw new ValidationError('Invalid plan');
      }

      // Check for existing active subscription
      const existing = await subRepo.getActiveSubscription(userId);
      if (existing && existing.status === SubscriptionStatus.ACTIVE) {
        throw new ValidationError('Already have an active subscription');
      }

      const expiresAt = calculateExpiry(plan);

      const subscription = await subRepo.create({
        user_id: userId,
        plan,
        status: SubscriptionStatus.ACTIVE,
        paddle_subscription_id: paddleSubscriptionId || null,
        started_at: new Date().toISOString(),
        expires_at: expiresAt,
      });

      // Update user's premium flag
      await subRepo.updateUserPremium(userId, true);

      // Invalidate caches
      await redis.del(`premium:status:${userId}`, `premium:${userId}`, `user:${userId}`);

      // Publish event
      await kafka.publish({
        id: uuid(),
        type: EventType.SUBSCRIPTION_CREATED,
        topic: EventTopic.PREMIUM_EVENTS,
        timestamp: new Date().toISOString(),
        source: 'premium-service',
        correlationId: req.correlationId || uuid(),
        userId: userId as UserId,
        payload: { userId, plan, subscriptionId: subscription.id, expiresAt },
      });

      res.status(201).json({ success: true, data: subscription });
    } catch (err) { next(err); }
  });

  // POST /api/premium/cancel
  router.post('/cancel', auth, async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user!.sub;
      const sub = await subRepo.getActiveSubscription(userId);
      if (!sub) throw new NotFoundError('Active subscription');

      await subRepo.cancel(sub.id);
      await redis.del(`premium:status:${userId}`, `premium:${userId}`);

      await kafka.publish({
        id: uuid(),
        type: EventType.SUBSCRIPTION_CANCELLED,
        topic: EventTopic.PREMIUM_EVENTS,
        timestamp: new Date().toISOString(),
        source: 'premium-service',
        correlationId: req.correlationId || uuid(),
        userId: userId as UserId,
        payload: { userId, subscriptionId: sub.id },
      });

      res.json({ success: true, data: { message: 'Subscription cancelled. Active until expiry.' } });
    } catch (err) { next(err); }
  });

  // GET /api/premium/limits — get feature limits for requesting user
  router.get('/limits', auth, async (req: Request, res: Response, next: NextFunction) => {
    try {
      const isPremium = req.user!.isPremium;
      res.json({
        success: true,
        data: isPremium ? PREMIUM_LIMITS : FREE_LIMITS,
      });
    } catch (err) { next(err); }
  });

  // POST /api/premium/check-feature — check if user has access to premium feature
  router.post('/check-feature', auth, async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { feature } = req.body;
      const isPremium = req.user!.isPremium;
      const limits = isPremium ? PREMIUM_LIMITS : FREE_LIMITS;
      const hasAccess = (limits as any)[feature] === true || (limits as any)[feature] === -1;
      res.json({ success: true, data: { hasAccess, isPremium } });
    } catch (err) { next(err); }
  });

  return router;
}

// ─── Helpers ────────────────────────────────

function calculateExpiry(plan: SubscriptionPlan): string | null {
  const now = new Date();
  switch (plan) {
    case SubscriptionPlan.MONTHLY:
      now.setMonth(now.getMonth() + 1);
      return now.toISOString();
    case SubscriptionPlan.QUARTERLY:
      now.setMonth(now.getMonth() + 3);
      return now.toISOString();
    case SubscriptionPlan.SEMIANNUAL:
      now.setMonth(now.getMonth() + 6);
      return now.toISOString();
    case SubscriptionPlan.YEARLY:
      now.setFullYear(now.getFullYear() + 1);
      return now.toISOString();
    default:
      return null;
  }
}

function getFeatures(isPremium: boolean) {
  return {
    customEmoji: isPremium,
    premiumStickers: isPremium,
    advancedSearch: isPremium,
    priorityServers: isPremium,
    uniqueProfiles: isPremium,
    animatedAvatars: isPremium,
    voiceStatuses: isPremium,
    increasedFileLimit: isPremium,
    extraCloudStorage: isPremium,
    noAds: isPremium,
    premiumBadge: isPremium,
    customThemes: isPremium,
  };
}

function getPlanFeatures() {
  return [
    '4 GB file uploads (vs 50 MB)',
    '100 GB cloud storage (vs 1 GB)',
    'Custom emoji & premium stickers',
    'Animated avatars & voice statuses',
    'Advanced message search',
    'Priority server connections',
    'Unique profile customization',
    'No ads, premium badge',
    'Custom themes & username colors',
    'Unlimited translations',
  ];
}
