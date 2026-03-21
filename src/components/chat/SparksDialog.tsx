"use client";

import { useEffect, useState } from "react";
import {
  Crown,
  Flame,
  Flower2,
  Gem,
  Loader2,
  Sparkles,
  Wallet,
  X,
} from "lucide-react";
import {
  DEFAULT_SPARK_TRANSFER_AMOUNTS,
  SPARK_GIFTS,
  SPARK_PACKAGE_PRICES,
} from "@/lib/sparks";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import type { SparksGiftId } from "@/types/sparks";

type SparksDialogProps = {
  open: boolean;
  title: string;
  description: string;
  balance: number;
  packages: number[];
  onClose: () => void;
  onPurchase: (packageAmount: number) => Promise<void>;
  onSend?: (amount: number) => Promise<void>;
  onSendGift?: (giftId: SparksGiftId) => Promise<void>;
};

const sparkGiftIcons = {
  rose: Flower2,
  fire: Flame,
  diamond: Gem,
  crown: Crown,
} satisfies Record<SparksGiftId, typeof Flower2>;

export const SparksDialog = ({
  open,
  title,
  description,
  balance,
  packages,
  onClose,
  onPurchase,
  onSend,
  onSendGift,
}: SparksDialogProps) => {
  const [amount, setAmount] = useState("10");
  const [error, setError] = useState<string | null>(null);
  const [isSending, setIsSending] = useState(false);
  const [sendingGiftId, setSendingGiftId] = useState<SparksGiftId | null>(null);
  const [buyingPackage, setBuyingPackage] = useState<number | null>(null);

  useEffect(() => {
    if (!open) {
      setAmount("10");
      setError(null);
      setIsSending(false);
      setSendingGiftId(null);
      setBuyingPackage(null);
    }
  }, [open]);

  if (!open) {
    return null;
  }

  const parsedAmount = Number(amount);

  const handleSend = async () => {
    if (!onSend) {
      return;
    }

    if (!Number.isInteger(parsedAmount) || parsedAmount <= 0) {
      setError("Enter a positive number of sparks.");
      return;
    }

    try {
      setIsSending(true);
      setError(null);
      await onSend(parsedAmount);
      onClose();
    } catch (sendError) {
      setError(sendError instanceof Error ? sendError.message : "Failed to send sparks.");
    } finally {
      setIsSending(false);
    }
  };

  const handleSendGift = async (giftId: SparksGiftId) => {
    if (!onSendGift) {
      return;
    }

    try {
      setSendingGiftId(giftId);
      setError(null);
      await onSendGift(giftId);
      onClose();
    } catch (sendError) {
      setError(sendError instanceof Error ? sendError.message : "Failed to send gift.");
    } finally {
      setSendingGiftId(null);
    }
  };

  const handlePurchase = async (packageAmount: number) => {
    try {
      setBuyingPackage(packageAmount);
      setError(null);
      await onPurchase(packageAmount);
    } catch (purchaseError) {
      setError(
        purchaseError instanceof Error ? purchaseError.message : "Failed to buy sparks.",
      );
    } finally {
      setBuyingPackage(null);
    }
  };

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <Card className="w-full max-w-lg border-white/10 bg-[linear-gradient(180deg,rgba(14,10,3,0.96),rgba(20,11,5,0.92))]">
        <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
          <div>
            <p className="text-[11px] uppercase tracking-[0.18em] text-amber-200">Sparks</p>
            <h2 className="mt-1 text-lg font-semibold text-white">{title}</h2>
            <p className="mt-1 text-xs text-tepla-text-muted">{description}</p>
          </div>
          <Button type="button" variant="ghost" size="icon" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="space-y-4 px-5 py-5">
          <div className="rounded-3xl border border-amber-400/20 bg-black/20 p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-[11px] uppercase tracking-[0.18em] text-amber-200">
                  Wallet
                </p>
                <p className="mt-2 text-2xl font-semibold text-white">{balance}</p>
                <p className="mt-1 text-xs text-tepla-text-muted">Available sparks</p>
              </div>
              <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-sm text-amber-100">
                <Wallet className="h-4 w-4" />
                Internal currency
              </span>
            </div>
          </div>

          {onSend ? (
            <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-4">
              <p className="text-sm font-medium text-white">Send sparks</p>
              <div className="mt-3 space-y-3">
                {onSendGift ? (
                  <div className="space-y-3 rounded-3xl border border-amber-400/15 bg-amber-500/5 p-3">
                    <div>
                      <p className="text-sm font-medium text-white">Send a gift</p>
                      <p className="mt-1 text-xs text-tepla-text-muted">
                        Quick gifts priced in sparks for standout messages and channel posts.
                      </p>
                    </div>
                    <div className="grid gap-2 sm:grid-cols-2">
                      {SPARK_GIFTS.map((gift) => {
                        const GiftIcon = sparkGiftIcons[gift.id];

                        return (
                          <Button
                            key={gift.id}
                            type="button"
                            variant="subtle"
                            className="h-auto justify-between py-3"
                            disabled={Boolean(sendingGiftId)}
                            onClick={() => {
                              void handleSendGift(gift.id);
                            }}
                          >
                            <span className="flex items-center gap-3 text-left">
                              <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-amber-400/20 bg-amber-500/10 text-amber-100">
                                <GiftIcon className="h-4 w-4" />
                              </span>
                              <span className="flex flex-col items-start">
                                <span className="text-sm text-white">{gift.label}</span>
                                <span className="text-xs text-tepla-text-muted">
                                  {gift.cost} sparks
                                </span>
                              </span>
                            </span>
                            {sendingGiftId === gift.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <span className="text-sm font-semibold text-amber-100">
                                {gift.cost}
                              </span>
                            )}
                          </Button>
                        );
                      })}
                    </div>
                  </div>
                ) : null}
                <Input
                  type="number"
                  min="1"
                  step="1"
                  value={amount}
                  disabled={Boolean(sendingGiftId)}
                  onChange={(event) => setAmount(event.target.value)}
                  placeholder="10"
                />
                <div className="flex flex-wrap gap-2">
                  {DEFAULT_SPARK_TRANSFER_AMOUNTS.map((value) => (
                    <Button
                      key={value}
                      type="button"
                      size="sm"
                      variant="ghost"
                      disabled={Boolean(sendingGiftId)}
                      onClick={() => setAmount(String(value))}
                    >
                      <Sparkles className="h-3.5 w-3.5" />
                      {value}
                    </Button>
                  ))}
                </div>
                <Button
                  type="button"
                  onClick={() => void handleSend()}
                  disabled={isSending || Boolean(sendingGiftId)}
                >
                  {isSending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                  Send sparks
                </Button>
              </div>
            </div>
          ) : null}

          <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-4">
            <p className="text-sm font-medium text-white">Buy sparks</p>
            <p className="mt-1 text-xs text-tepla-text-muted">
              Top up your wallet instantly with one of the available packs.
            </p>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              {packages.map((packageAmount) => (
                <Button
                  key={packageAmount}
                  type="button"
                  variant="subtle"
                  className="h-auto justify-between py-3"
                  disabled={buyingPackage === packageAmount || Boolean(sendingGiftId)}
                  onClick={() => {
                    void handlePurchase(packageAmount);
                  }}
                >
                  <span className="flex flex-col items-start gap-1 text-left">
                    <span className="inline-flex items-center gap-2">
                      <Sparkles className="h-4 w-4" />
                      {packageAmount} sparks
                    </span>
                    <span className="text-xs text-tepla-text-muted">
                      {SPARK_PACKAGE_PRICES[packageAmount as keyof typeof SPARK_PACKAGE_PRICES]?.priceLabel ??
                        "Price unavailable"}
                    </span>
                  </span>
                  {buyingPackage === packageAmount ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <span className="text-sm font-semibold text-amber-100">
                      {SPARK_PACKAGE_PRICES[packageAmount as keyof typeof SPARK_PACKAGE_PRICES]?.priceLabel ??
                        ""}
                    </span>
                  )}
                </Button>
              ))}
            </div>
          </div>

          {error ? <p className="text-xs text-tepla-danger">{error}</p> : null}
        </div>
      </Card>
    </div>
  );
};
