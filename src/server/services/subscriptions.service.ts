import { createPaddleCheckout } from "@/lib/paddle";
import {
  PREMIUM_FEATURES,
  PREMIUM_LIMITS,
  PREMIUM_PLANS,
  STANDARD_LIMITS,
  type PremiumPlan,
  type PremiumStatus,
  resolvePlanDurationDays,
} from "@/lib/premium";
import { usersRepository } from "@/server/database/users.repository";
import { subscriptionsRepository } from "@/server/database/subscriptions.repository";
import { mapAuthUser, mapUserProfile } from "./mappers";

const addDays = (date: Date, days: number) => {
  const nextDate = new Date(date);
  nextDate.setUTCDate(nextDate.getUTCDate() + days);
  return nextDate;
};

const normalizeStatus = (
  status: PremiumStatus,
  expiresAt: string | null,
): PremiumStatus => {
  if (status !== "active") {
    return status;
  }

  if (!expiresAt) {
    return "active";
  }

  return new Date(expiresAt).getTime() >= Date.now() ? "active" : "expired";
};

const getPriceId = (plan: PremiumPlan) => {
  switch (plan) {
    case "monthly":
      return process.env.PADDLE_PRICE_ID_MONTHLY;
    case "quarterly":
      return process.env.PADDLE_PRICE_ID_QUARTERLY;
    case "semiannual":
      return process.env.PADDLE_PRICE_ID_SEMIANNUAL;
    case "yearly":
      return process.env.PADDLE_PRICE_ID_YEARLY;
    default:
      return null;
  }
};

export const subscriptionsService = {
  async getPremiumState(userId: string) {
    const [subscription, user] = await Promise.all([
      subscriptionsRepository.findLatestByUserId(userId),
      usersRepository.findById(userId),
    ]);

    if (!user) {
      throw new Error("User not found.");
    }

    const normalizedStatus = subscription
      ? normalizeStatus(subscription.status, subscription.expires_at)
      : user.is_premium
        ? "active"
        : "inactive";

    const isPremium = normalizedStatus === "active" || Boolean(user.is_premium);

    return {
      status: normalizedStatus,
      isPremium,
      subscription: subscription
        ? {
            id: subscription.id,
            plan: subscription.plan,
            startDate: subscription.started_at,
            endDate: subscription.expires_at,
            status: normalizedStatus,
          }
        : null,
      limits: isPremium ? PREMIUM_LIMITS : STANDARD_LIMITS,
      features: {
        ...Object.fromEntries(
          Object.keys(PREMIUM_FEATURES).map((key) => [key, isPremium]),
        ),
      } as typeof PREMIUM_FEATURES,
      plans: PREMIUM_PLANS,
      user: mapAuthUser(user),
      profile: mapUserProfile(user),
    };
  },

  async purchaseSubscription(payload: {
    userId: string;
    plan: PremiumPlan;
  }) {
    const priceId = getPriceId(payload.plan);
    const now = new Date();
    const expiresAt = addDays(now, resolvePlanDurationDays(payload.plan));

    if (!priceId) {
      throw new Error(`No Paddle price ID configured for plan: ${payload.plan}`);
    }
    if (!process.env.PADDLE_API_KEY) {
      throw new Error('PADDLE_API_KEY is not configured. Payment processing unavailable.');
    }

    const session = await createPaddleCheckout({
      customerId: payload.userId,
      priceId,
    });

    const subscription = await subscriptionsRepository.create({
      userId: payload.userId,
      plan: payload.plan,
      status: "pending",
      startedAt: now.toISOString(),
      expiresAt: expiresAt.toISOString(),
      providerSubscriptionId: session.id,
    });

    return {
      checkoutId: session.id,
      checkoutUrl: session.url,
      subscription: {
        id: subscription.id,
        plan: subscription.plan,
        startDate: subscription.started_at,
        endDate: subscription.expires_at,
        status: "pending" as const,
      },
      state: await this.getPremiumState(payload.userId),
      user: null,
    };
  },

  async renewSubscription(payload: {
    userId: string;
    plan?: PremiumPlan | null;
  }) {
    const current = await subscriptionsRepository.findLatestByUserId(payload.userId);
    const user = await usersRepository.findById(payload.userId);
    if (!user) {
      throw new Error("User not found.");
    }

    const plan = payload.plan ?? current?.plan ?? "monthly";
    const durationDays = resolvePlanDurationDays(plan);
    const now = new Date();
    const baseDate =
      current?.expires_at && new Date(current.expires_at).getTime() > Date.now()
        ? new Date(current.expires_at)
        : now;
    const nextExpiry = addDays(baseDate, durationDays);

    const subscription = current
      ? await subscriptionsRepository.update(current.id, {
          plan,
          status: "active",
          started_at: current.started_at ?? now.toISOString(),
          expires_at: nextExpiry.toISOString(),
        })
      : await subscriptionsRepository.create({
          userId: payload.userId,
          plan,
          status: "active",
          startedAt: now.toISOString(),
          expiresAt: nextExpiry.toISOString(),
        });

    const premiumUser = await usersRepository.activatePremium(payload.userId);

    return {
      subscription: {
        id: subscription.id,
        plan: subscription.plan,
        startDate: subscription.started_at,
        endDate: subscription.expires_at,
        status: "active" as const,
      },
      state: await this.getPremiumState(payload.userId),
      user: mapAuthUser(premiumUser),
      profile: mapUserProfile(premiumUser),
    };
  },
};
