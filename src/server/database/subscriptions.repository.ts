import { getServiceSupabaseClient } from "@/lib/db";
import type { PremiumPlan, PremiumStatus } from "@/lib/premium";

export type SubscriptionRow = {
  id: string;
  user_id: string;
  plan: PremiumPlan;
  status: PremiumStatus;
  stripe_subscription_id: string | null;
  started_at: string | null;
  expires_at: string | null;
};

export const subscriptionsRepository = {
  async findLatestByUserId(userId: string) {
    const supabase = getServiceSupabaseClient();
    const { data, error } = await supabase
      .from("subscriptions")
      .select("*")
      .eq("user_id", userId)
      .order("started_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      throw new Error("Failed to load subscription.");
    }

    return (data as SubscriptionRow | null) ?? null;
  },

  async create(payload: {
    userId: string;
    plan: PremiumPlan;
    status: PremiumStatus;
    startedAt: string | null;
    expiresAt: string | null;
    providerSubscriptionId?: string | null;
  }) {
    const supabase = getServiceSupabaseClient();
    const { data, error } = await supabase
      .from("subscriptions")
      .insert({
        user_id: payload.userId,
        plan: payload.plan,
        status: payload.status,
        started_at: payload.startedAt,
        expires_at: payload.expiresAt,
        stripe_subscription_id: payload.providerSubscriptionId ?? null,
      })
      .select("*")
      .maybeSingle();

    if (error || !data) {
      throw new Error("Failed to create subscription.");
    }

    return data as SubscriptionRow;
  },

  async update(subscriptionId: string, payload: Partial<{
    plan: PremiumPlan;
    status: PremiumStatus;
    started_at: string | null;
    expires_at: string | null;
    stripe_subscription_id: string | null;
  }>) {
    const supabase = getServiceSupabaseClient();
    const { data, error } = await supabase
      .from("subscriptions")
      .update(payload)
      .eq("id", subscriptionId)
      .select("*")
      .maybeSingle();

    if (error || !data) {
      throw new Error("Failed to update subscription.");
    }

    return data as SubscriptionRow;
  },
};
