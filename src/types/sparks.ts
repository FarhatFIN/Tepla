export type SparksGiftId = "rose" | "fire" | "diamond" | "crown";

export type SparksWallet = {
  userId: string;
  balance: number;
  updatedAt: string | null;
};

export type SparksTransactionType =
  | "purchase"
  | "user_transfer"
  | "message_spark"
  | "channel_donation"
  | "gift_rose"
  | "gift_fire"
  | "gift_diamond"
  | "gift_crown";

export type SparksTransaction = {
  id: string;
  fromUserId: string | null;
  toUserId: string | null;
  chatId: string | null;
  messageId: string | null;
  amount: number;
  type: SparksTransactionType;
  createdAt: string;
};

export type MessageSparkSummary = {
  sparkCount: number;
  sparkSendersCount: number;
  sparkedByCurrentUser: boolean;
};
