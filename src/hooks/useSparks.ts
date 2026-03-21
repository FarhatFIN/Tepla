import { useEffect } from "react";
import useSWR from "swr";
import { SPARK_PACKAGES, type SparksPackageAmount } from "@/lib/sparks";
import { useAuthStore } from "@/stores/auth.store";
import { useSparksStore } from "@/stores/sparks.store";
import type {
  MessageSparkSummary,
  SparksGiftId,
  SparksTransaction,
  SparksWallet,
} from "@/types/sparks";

type SparksWalletResponse = {
  wallet: SparksWallet;
  transactions: SparksTransaction[];
  packages: number[];
};

type SparksTransferResponse = {
  wallet: SparksWallet;
  sparkSummary?: MessageSparkSummary;
  recipientUserId?: string;
  chatId?: string;
};

const fetcher = async (url: string) => {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error("Failed to load sparks wallet.");
  }

  return (await response.json()) as SparksWalletResponse;
};

export const useSparks = () => {
  const authUser = useAuthStore((state) => state.user);
  const currentUserId = authUser?.id ?? null;
  const { wallet, transactions, setWalletState, setBalance, clearWallet } = useSparksStore();

  const swrKey = currentUserId
    ? `/api/sparks/wallet?userId=${encodeURIComponent(currentUserId)}`
    : null;

  const { data, error, isLoading, mutate } = useSWR<SparksWalletResponse>(swrKey, fetcher);

  useEffect(() => {
    if (!currentUserId) {
      clearWallet();
      return;
    }

    if (data?.wallet) {
      setWalletState({
        wallet: data.wallet,
        transactions: data.transactions,
      });
    }
  }, [clearWallet, currentUserId, data, setWalletState]);

  const purchaseSparks = async (packageAmount: SparksPackageAmount) => {
    if (!currentUserId) {
      throw new Error("Sign in to buy sparks.");
    }

    const response = await fetch("/api/sparks/purchase", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userId: currentUserId,
        packageAmount,
      }),
    });

    if (!response.ok) {
      const payload = await response.json().catch(() => null);
      throw new Error(payload?.error ?? "Failed to buy sparks.");
    }

    const payload = (await response.json()) as SparksWalletResponse;
    setWalletState({
      wallet: payload.wallet,
      transactions: payload.transactions,
    });
    await mutate(payload, { revalidate: false });
    return payload;
  };

  const transferSparks = async (payload: {
    toUserId?: string | null;
    chatId?: string | null;
    messageId?: string | null;
    amount?: number | null;
    giftId?: SparksGiftId | null;
  }) => {
    if (!currentUserId) {
      throw new Error("Sign in to send sparks.");
    }

    const response = await fetch("/api/sparks/transfer", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        fromUserId: currentUserId,
        toUserId: payload.toUserId ?? null,
        chatId: payload.chatId ?? null,
        messageId: payload.messageId ?? null,
        amount: payload.amount ?? null,
        giftId: payload.giftId ?? null,
      }),
    });

    if (!response.ok) {
      const body = await response.json().catch(() => null);
      throw new Error(body?.error ?? "Failed to send sparks.");
    }

    const result = (await response.json()) as SparksTransferResponse;
    if (result.wallet) {
      setWalletState({
        wallet: result.wallet,
      });
      setBalance(result.wallet.balance);
      await mutate(
        (current) =>
          current
            ? {
                ...current,
                wallet: result.wallet,
              }
            : current,
        { revalidate: false },
      );
    }

    return result;
  };

  return {
    wallet: wallet ?? data?.wallet ?? null,
    transactions: transactions.length > 0 ? transactions : data?.transactions ?? [],
    packages: data?.packages ?? [...SPARK_PACKAGES],
    balance: wallet?.balance ?? data?.wallet.balance ?? 0,
    isLoading,
    error,
    purchaseSparks,
    transferSparks,
    refreshWallet: mutate,
  };
};
