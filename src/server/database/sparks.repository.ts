import { getServiceSupabaseClient } from "@/lib/db";
import type { SparksTransactionType } from "@/types/sparks";

export type SparksWalletRow = {
  user_id: string;
  balance: number;
  updated_at: string | null;
};

export type SparksTransactionRow = {
  id: string;
  from_user_id: string | null;
  to_user_id: string | null;
  chat_id: string | null;
  message_id: string | null;
  amount: number;
  type: SparksTransactionType;
  created_at: string;
};

type PurchaseRpcRow = {
  transaction_id: string;
  balance: number;
};

type TransferRpcRow = {
  transaction_id: string;
  sender_balance: number;
  recipient_balance: number;
};

export const sparksRepository = {
  async ensureWallet(userId: string) {
    const supabase = getServiceSupabaseClient();
    const { error } = await supabase.rpc("ensure_sparks_wallet", {
      target_user_id: userId,
    });

    if (error) {
      throw new Error("Failed to ensure sparks wallet.");
    }
  },

  async getWallet(userId: string) {
    await this.ensureWallet(userId);

    const supabase = getServiceSupabaseClient();
    const { data, error } = await supabase
      .from("sparks_wallet")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();

    if (error || !data) {
      throw new Error("Failed to load sparks wallet.");
    }

    return data as SparksWalletRow;
  },

  async listTransactionsForUser(userId: string, limit = 20) {
    const supabase = getServiceSupabaseClient();
    const { data, error } = await supabase
      .from("sparks_transactions")
      .select("*")
      .or(`from_user_id.eq.${userId},to_user_id.eq.${userId}`)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) {
      throw new Error("Failed to load sparks transactions.");
    }

    return (data ?? []) as SparksTransactionRow[];
  },

  async listByMessageIds(messageIds: string[]) {
    if (messageIds.length === 0) {
      return [];
    }

    const supabase = getServiceSupabaseClient();
    const { data, error } = await supabase
      .from("sparks_transactions")
      .select("*")
      .in("message_id", messageIds);

    if (error) {
      throw new Error("Failed to load message sparks.");
    }

    return (data ?? []) as SparksTransactionRow[];
  },

  async purchase(userId: string, amount: number) {
    const supabase = getServiceSupabaseClient();
    const { data, error } = await supabase.rpc("purchase_sparks", {
      target_user_id: userId,
      spark_amount: amount,
    });

    if (error) {
      throw new Error(error.message || "Failed to purchase sparks.");
    }

    const row = (Array.isArray(data) ? data[0] : data) as PurchaseRpcRow | null;
    if (!row) {
      throw new Error("Failed to purchase sparks.");
    }

    return row;
  },

  async transfer(payload: {
    fromUserId: string;
    toUserId: string;
    amount: number;
    type: SparksTransactionType;
    chatId?: string | null;
    messageId?: string | null;
  }) {
    const supabase = getServiceSupabaseClient();
    const { data, error } = await supabase.rpc("transfer_sparks", {
      sender_user_id: payload.fromUserId,
      recipient_user_id: payload.toUserId,
      spark_amount: payload.amount,
      transaction_type: payload.type,
      target_chat_id: payload.chatId ?? null,
      target_message_id: payload.messageId ?? null,
    });

    if (error) {
      throw new Error(error.message || "Failed to transfer sparks.");
    }

    const row = (Array.isArray(data) ? data[0] : data) as TransferRpcRow | null;
    if (!row) {
      throw new Error("Failed to transfer sparks.");
    }

    return row;
  },
};
