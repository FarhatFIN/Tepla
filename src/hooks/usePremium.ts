import useSWR from "swr";
import { useAuthStore } from "@/stores/auth.store";
import {
  PREMIUM_PLANS,
  STANDARD_LIMITS,
  type PremiumPlan,
  type PremiumStatus,
} from "@/lib/premium";

type PremiumResponse = {
  status: PremiumStatus;
  isPremium: boolean;
  subscription: {
    id: string;
    plan: PremiumPlan;
    startDate: string | null;
    endDate: string | null;
    status: PremiumStatus;
  } | null;
  limits: typeof STANDARD_LIMITS;
  features: Record<string, boolean>;
  plans: typeof PREMIUM_PLANS;
};

type PremiumMutationResponse = PremiumResponse & {
  checkoutId?: string | null;
  checkoutUrl?: string | null;
  user?: {
    id: string;
    username: string;
    displayName: string | null;
    avatarUrl: string | null;
    isPremium: boolean;
    language: string;
    birthDate: string | null;
    usernameColor: string | null;
    animatedAvatarEnabled: boolean;
    voiceStatusUrl: string | null;
    voiceStatusDurationSeconds: number | null;
    statusEmoji: string | null;
  } | null;
};

const fetcher = async (url: string) => {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error("Failed to load premium state.");
  }

  return (await response.json()) as PremiumResponse;
};

export const usePremium = () => {
  const authUser = useAuthStore((state) => state.user);
  const updateUser = useAuthStore((state) => state.updateUser);
  const swrKey = authUser?.id
    ? `/api/premium?userId=${encodeURIComponent(authUser.id)}`
    : null;
  const { data, error, isLoading, mutate } = useSWR<PremiumResponse>(swrKey, fetcher);

  const purchasePremium = async (plan: PremiumPlan) => {
    if (!authUser?.id) {
      throw new Error("Sign in to buy Premium.");
    }

    const response = await fetch("/api/premium", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userId: authUser.id,
        plan,
      }),
    });

    if (!response.ok) {
      const payload = await response.json().catch(() => null);
      throw new Error(payload?.error ?? "Failed to start Premium purchase.");
    }

    const payload = (await response.json()) as PremiumMutationResponse;
    if (payload.user) {
      updateUser(payload.user);
    }
    await mutate(payload, { revalidate: true });
    return payload;
  };

  const renewPremium = async (plan?: PremiumPlan) => {
    if (!authUser?.id) {
      throw new Error("Sign in to renew Premium.");
    }

    const response = await fetch("/api/premium", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userId: authUser.id,
        plan: plan ?? null,
      }),
    });

    if (!response.ok) {
      const payload = await response.json().catch(() => null);
      throw new Error(payload?.error ?? "Failed to renew Premium.");
    }

    const payload = (await response.json()) as PremiumMutationResponse;
    if (payload.user) {
      updateUser(payload.user);
    }
    await mutate(payload, { revalidate: true });
    return payload;
  };

  return {
    isPremium: data?.isPremium ?? Boolean(authUser?.isPremium),
    status: data?.status ?? (authUser?.isPremium ? "active" : "inactive"),
    subscription: data?.subscription ?? null,
    limits: data?.limits ?? STANDARD_LIMITS,
    features: data?.features ?? {},
    plans: data?.plans ?? PREMIUM_PLANS,
    isLoading,
    error,
    purchasePremium,
    renewPremium,
    refreshPremium: mutate,
  };
};
