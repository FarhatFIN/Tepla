"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Crown, Sparkles } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { usePremium } from "@/hooks/usePremium";
import type { PremiumPlan } from "@/lib/premium";

const formatLimitSize = (bytes: number) => {
  if (bytes >= 1024 * 1024 * 1024) {
    return `${Math.round(bytes / 1024 / 1024 / 1024)} GB`;
  }

  return `${Math.round(bytes / 1024 / 1024)} MB`;
};

export default function PremiumSettingsPage() {
  const {
    isPremium,
    status,
    subscription,
    limits,
    plans,
    purchasePremium,
    renewPremium,
  } = usePremium();
  const [error, setError] = useState<string | null>(null);
  const [busyPlan, setBusyPlan] = useState<string | null>(null);

  const handlePurchase = async (plan: PremiumPlan) => {
    try {
      setBusyPlan(plan);
      setError(null);
      const payload = await purchasePremium(plan);
      if (payload.checkoutUrl) {
        window.open(payload.checkoutUrl, "_blank", "noopener,noreferrer");
      }
    } catch (purchaseError) {
      setError(
        purchaseError instanceof Error ? purchaseError.message : "Failed to start purchase.",
      );
    } finally {
      setBusyPlan(null);
    }
  };

  const handleRenew = async () => {
    try {
      setBusyPlan("renew");
      setError(null);
      await renewPremium(subscription?.plan ?? "monthly");
    } catch (renewError) {
      setError(renewError instanceof Error ? renewError.message : "Failed to renew Premium.");
    } finally {
      setBusyPlan(null);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 8 }}
      animate={{ opacity: 1, x: 0 }}
      className="mx-auto max-w-4xl p-4"
    >
      <div className="grid gap-4 xl:grid-cols-[0.95fr,1.05fr]">
        <Card className="border-white/10 bg-[linear-gradient(180deg,rgba(29,14,4,0.9),rgba(15,8,2,0.82))]">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Crown className="h-5 w-5 text-amber-300" />
              Premium
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-3xl border border-amber-400/20 bg-black/20 p-4">
              <p className="text-[11px] uppercase tracking-[0.18em] text-amber-200">
                Current status
              </p>
              <p className="mt-2 text-2xl font-semibold text-white">
                {isPremium ? "Active" : "Standard"}
              </p>
              <p className="mt-1 text-sm text-tepla-text-muted">
                Status: {status}
                {subscription?.endDate ? ` / Renews until ${subscription.endDate.slice(0, 10)}` : ""}
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              {(Object.keys(plans) as Array<keyof typeof plans>).map((planKey) => (
                <button
                  key={planKey}
                  type="button"
                  className="rounded-3xl border border-white/10 bg-white/[0.03] p-4 text-left transition-colors hover:border-amber-300/30 hover:bg-white/[0.05]"
                  onClick={() => {
                    void handlePurchase(planKey);
                  }}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-medium text-white">{plans[planKey].label}</p>
                      <p className="mt-1 text-xs text-tepla-text-muted">
                        Full Premium for {plans[planKey].billingLabel}
                      </p>
                    </div>
                    <span className="text-lg font-semibold text-amber-200">
                      {plans[planKey].priceLabel}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-tepla-text-muted">
                    {plans[planKey].durationDays} days of Premium access
                  </p>
                  <div className="mt-3 inline-flex items-center gap-1 text-xs text-amber-200">
                    <Sparkles className="h-3.5 w-3.5" />
                    {busyPlan === planKey ? "Opening checkout..." : "Buy now"}
                  </div>
                </button>
              ))}
            </div>

            {isPremium ? (
              <Button
                type="button"
                variant="subtle"
                disabled={busyPlan === "renew"}
                onClick={() => {
                  void handleRenew();
                }}
              >
                {busyPlan === "renew" ? "Renewing..." : "Renew Premium"}
              </Button>
            ) : null}

            {error ? <p className="text-xs text-tepla-danger">{error}</p> : null}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Limits & Features</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-4">
                <p className="text-xs text-tepla-text-muted">Pinned chats</p>
                <p className="mt-2 text-2xl font-semibold text-white">{limits.pinnedChats}</p>
              </div>
              <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-4">
                <p className="text-xs text-tepla-text-muted">Groups</p>
                <p className="mt-2 text-2xl font-semibold text-white">{limits.groups}</p>
              </div>
              <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-4">
                <p className="text-xs text-tepla-text-muted">Channels</p>
                <p className="mt-2 text-2xl font-semibold text-white">{limits.channels}</p>
              </div>
              <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-4">
                <p className="text-xs text-tepla-text-muted">Max file size</p>
                <p className="mt-2 text-2xl font-semibold text-white">
                  {formatLimitSize(limits.maxFileBytes)}
                </p>
              </div>
            </div>

            <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-4">
              <p className="text-sm font-medium text-white">Premium unlocks</p>
              <div className="mt-3 grid gap-2 text-sm text-tepla-text-muted sm:grid-cols-2">
                <p>Premium badge, username colors, animated avatars</p>
                <p>Custom emoji and animated reactions</p>
                <p>High quality voice messages and voice statuses</p>
                <p>Message translation, advanced search, extra themes</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </motion.div>
  );
}
