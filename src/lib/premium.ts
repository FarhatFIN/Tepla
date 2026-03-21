export type PremiumPlan = "monthly" | "quarterly" | "semiannual" | "yearly";
export type PremiumStatus =
  | "inactive"
  | "pending"
  | "active"
  | "expired"
  | "canceled";

export const STANDARD_LIMITS = {
  pinnedChats: 5,
  groups: 20,
  channels: 5,
  maxFileBytes: 100 * 1024 * 1024,
} as const;

export const PREMIUM_LIMITS = {
  pinnedChats: 20,
  groups: 100,
  channels: 20,
  maxFileBytes: 2 * 1024 * 1024 * 1024,
} as const;

export const PREMIUM_FEATURES = {
  premiumBadge: true,
  usernameColors: true,
  animatedAvatars: true,
  customEmojiReactions: true,
  animatedReactions: true,
  highQualityVoiceMessages: true,
  voiceStatuses: true,
  messageTranslation: true,
  advancedSearch: true,
  extraThemes: true,
  cloudFileStorage: true,
} as const;

export const PREMIUM_PLANS: Record<
  PremiumPlan,
  {
    label: string;
    billingLabel: string;
    durationDays: number;
    priceUsd: number;
    priceLabel: string;
  }
> = {
  monthly: {
    label: "1 Month",
    billingLabel: "1 month",
    durationDays: 30,
    priceUsd: 3.99,
    priceLabel: "$3.99",
  },
  quarterly: {
    label: "3 Months",
    billingLabel: "3 months",
    durationDays: 90,
    priceUsd: 9.99,
    priceLabel: "$9.99",
  },
  semiannual: {
    label: "6 Months",
    billingLabel: "6 months",
    durationDays: 180,
    priceUsd: 17.99,
    priceLabel: "$17.99",
  },
  yearly: {
    label: "1 Year",
    billingLabel: "1 year",
    durationDays: 365,
    priceUsd: 29.99,
    priceLabel: "$29.99",
  },
};

export const isPremiumPlan = (value: unknown): value is PremiumPlan =>
  value === "monthly" ||
  value === "quarterly" ||
  value === "semiannual" ||
  value === "yearly";

export const resolvePlanDurationDays = (plan: PremiumPlan) =>
  PREMIUM_PLANS[plan].durationDays;
