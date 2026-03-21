import {
  SPARK_GIFT_TRANSACTION_TYPES,
  SPARK_PACKAGES,
  getSparkGiftById,
  isSparksGiftId,
  isSparksPackageAmount,
} from "@/lib/sparks";
import { chatsRepository } from "@/server/database/chats.repository";
import { messagesRepository } from "@/server/database/messages.repository";
import { sparksRepository } from "@/server/database/sparks.repository";
import { usersRepository } from "@/server/database/users.repository";
import { emitToChat, emitToUser } from "@/server/sockets/emitter";
import { ensureString } from "@/server/validation/validators";
import type { ChatType } from "@/types/chat";
import type {
  MessageSparkSummary,
  SparksGiftId,
  SparksTransaction,
  SparksTransactionType,
  SparksWallet,
} from "@/types/sparks";

const mapWallet = (wallet: Awaited<ReturnType<typeof sparksRepository.getWallet>>): SparksWallet => ({
  userId: wallet.user_id,
  balance: wallet.balance,
  updatedAt: wallet.updated_at,
});

const mapTransaction = (
  transaction: Awaited<ReturnType<typeof sparksRepository.listTransactionsForUser>>[number],
): SparksTransaction => ({
  id: transaction.id,
  fromUserId: transaction.from_user_id,
  toUserId: transaction.to_user_id,
  chatId: transaction.chat_id,
  messageId: transaction.message_id,
  amount: transaction.amount,
  type: transaction.type,
  createdAt: transaction.created_at,
});

export const summarizeSparkTransactionsByMessage = (
  transactions: Array<{
    message_id: string | null;
    from_user_id: string | null;
    amount: number;
  }>,
  currentUserId?: string | null,
): Map<string, MessageSparkSummary> => {
  const map = new Map<
    string,
    {
      sparkCount: number;
      senderIds: Set<string>;
      sparkedByCurrentUser: boolean;
    }
  >();

  for (const transaction of transactions) {
    if (!transaction.message_id) {
      continue;
    }

    const current = map.get(transaction.message_id) ?? {
      sparkCount: 0,
      senderIds: new Set<string>(),
      sparkedByCurrentUser: false,
    };

    current.sparkCount += transaction.amount;
    if (transaction.from_user_id) {
      current.senderIds.add(transaction.from_user_id);
      if (currentUserId && transaction.from_user_id === currentUserId) {
        current.sparkedByCurrentUser = true;
      }
    }

    map.set(transaction.message_id, current);
  }

  return new Map(
    Array.from(map.entries()).map(([messageId, value]) => [
      messageId,
      {
        sparkCount: value.sparkCount,
        sparkSendersCount: value.senderIds.size,
        sparkedByCurrentUser: value.sparkedByCurrentUser,
      },
    ]),
  );
};

const ensureChatAccess = async (chatId: string, userId: string) => {
  const role = await chatsRepository.getMemberRole(chatId, userId);
  if (!role || role === "banned") {
    throw new Error("You do not have access to this chat.");
  }

  return role;
};

const resolveChatRecipient = async (chatId: string) => {
  const chat = await chatsRepository.findById(chatId);
  if (!chat) {
    throw new Error("Chat not found.");
  }

  if (chat.type !== "channel") {
    throw new Error("Direct chat donations are only supported for channels.");
  }

  const recipientUserId = ensureString(chat.created_by, "Channel owner is unavailable.");
  return {
    chat,
    recipientUserId,
    transactionType: "channel_donation" as SparksTransactionType,
  };
};

const resolveMessageRecipient = async (messageId: string) => {
  const message = await messagesRepository.findById(messageId);
  if (!message) {
    throw new Error("Message not found.");
  }

  const chat = await chatsRepository.findById(message.chat_id);
  if (!chat) {
    throw new Error("Chat not found.");
  }

  const recipientUserId =
    chat.type === "channel"
      ? ensureString(chat.created_by, "Channel owner is unavailable.")
      : ensureString(message.sender_id, "Message sender is unavailable.");

  return {
    message,
    chat,
    recipientUserId,
    transactionType:
      chat.type === "channel"
        ? ("channel_donation" as SparksTransactionType)
        : ("message_spark" as SparksTransactionType),
  };
};

const resolveSparkTransferMeta = (payload: {
  amount?: number | null;
  defaultType: SparksTransactionType;
  giftId?: SparksGiftId | null;
}) => {
  if (payload.giftId) {
    if (!isSparksGiftId(payload.giftId)) {
      throw new Error("Unsupported spark gift.");
    }

    const gift = getSparkGiftById(payload.giftId);
    if (!gift) {
      throw new Error("Spark gift is unavailable.");
    }

    return {
      amount: gift.cost,
      type: SPARK_GIFT_TRANSACTION_TYPES[payload.giftId],
      gift,
    };
  }

  if (!Number.isInteger(payload.amount) || (payload.amount ?? 0) <= 0) {
    throw new Error("Spark amount must be a positive integer.");
  }

  return {
    amount: payload.amount as number,
    type: payload.defaultType,
    gift: null,
  };
};

export const sparksService = {
  async getWalletState(userId: string) {
    const [wallet, transactions] = await Promise.all([
      sparksRepository.getWallet(userId),
      sparksRepository.listTransactionsForUser(userId, 20),
    ]);

    return {
      wallet: mapWallet(wallet),
      transactions: transactions.map(mapTransaction),
      packages: [...SPARK_PACKAGES],
    };
  },

  async purchaseSparks(payload: { userId: string; packageAmount: number }) {
    if (!isSparksPackageAmount(payload.packageAmount)) {
      throw new Error("Unsupported sparks package.");
    }

    await sparksRepository.purchase(payload.userId, payload.packageAmount);
    const walletState = await this.getWalletState(payload.userId);

    emitToUser(payload.userId, "sparks:balance", {
      userId: payload.userId,
      balance: walletState.wallet.balance,
    });

    return walletState;
  },

  async transferToUser(payload: {
    fromUserId: string;
    toUserId: string;
    amount?: number | null;
  }) {
    const amount = payload.amount;

    if (typeof amount !== "number" || !Number.isInteger(amount) || amount <= 0) {
      throw new Error("Spark amount must be a positive integer.");
    }

    await usersRepository.findById(payload.fromUserId).then((user) => {
      if (!user) {
        throw new Error("Sender not found.");
      }
    });
    await usersRepository.findById(payload.toUserId).then((user) => {
      if (!user) {
        throw new Error("Recipient not found.");
      }
    });

    const transfer = await sparksRepository.transfer({
      fromUserId: payload.fromUserId,
      toUserId: payload.toUserId,
      amount,
      type: "user_transfer",
    });

    emitToUser(payload.fromUserId, "sparks:balance", {
      userId: payload.fromUserId,
      balance: transfer.sender_balance,
    });
    emitToUser(payload.toUserId, "sparks:balance", {
      userId: payload.toUserId,
      balance: transfer.recipient_balance,
    });

    return this.getWalletState(payload.fromUserId);
  },

  async sendToMessage(payload: {
    fromUserId: string;
    messageId: string;
    amount?: number | null;
    giftId?: SparksGiftId | null;
  }) {
    const resolved = await resolveMessageRecipient(payload.messageId);
    const transferMeta = resolveSparkTransferMeta({
      amount: payload.amount,
      defaultType: resolved.transactionType,
      giftId: payload.giftId ?? null,
    });
    await ensureChatAccess(resolved.chat.id, payload.fromUserId);

    const transfer = await sparksRepository.transfer({
      fromUserId: payload.fromUserId,
      toUserId: resolved.recipientUserId,
      amount: transferMeta.amount,
      type: transferMeta.type,
      chatId: resolved.chat.id,
      messageId: resolved.message.id,
    });

    const sparkTransactions = await sparksRepository.listByMessageIds([resolved.message.id]);
    const sparkSummary =
      summarizeSparkTransactionsByMessage(sparkTransactions, payload.fromUserId).get(
        resolved.message.id,
      ) ?? {
        sparkCount: 0,
        sparkSendersCount: 0,
        sparkedByCurrentUser: false,
      };

    await messagesRepository.update(resolved.message.id, {
      spark_count: sparkSummary.sparkCount,
      spark_senders_count: sparkSummary.sparkSendersCount,
    });

    emitToChat(resolved.chat.id, "message:sparks", {
      chatId: resolved.chat.id,
      messageId: resolved.message.id,
      sparkCount: sparkSummary.sparkCount,
      sparkSendersCount: sparkSummary.sparkSendersCount,
    });
    emitToUser(payload.fromUserId, "sparks:balance", {
      userId: payload.fromUserId,
      balance: transfer.sender_balance,
    });
    emitToUser(resolved.recipientUserId, "sparks:balance", {
      userId: resolved.recipientUserId,
      balance: transfer.recipient_balance,
    });

    return {
      wallet: mapWallet(await sparksRepository.getWallet(payload.fromUserId)),
      sparkSummary,
      chatType: resolved.chat.type as ChatType,
      recipientUserId: resolved.recipientUserId,
      gift: transferMeta.gift,
    };
  },

  async donateToChat(payload: {
    fromUserId: string;
    chatId: string;
    amount?: number | null;
  }) {
    const amount = payload.amount;

    if (typeof amount !== "number" || !Number.isInteger(amount) || amount <= 0) {
      throw new Error("Spark amount must be a positive integer.");
    }

    const resolved = await resolveChatRecipient(payload.chatId);
    await ensureChatAccess(resolved.chat.id, payload.fromUserId);

    const transfer = await sparksRepository.transfer({
      fromUserId: payload.fromUserId,
      toUserId: resolved.recipientUserId,
      amount,
      type: resolved.transactionType,
      chatId: resolved.chat.id,
    });

    emitToUser(payload.fromUserId, "sparks:balance", {
      userId: payload.fromUserId,
      balance: transfer.sender_balance,
    });
    emitToUser(resolved.recipientUserId, "sparks:balance", {
      userId: resolved.recipientUserId,
      balance: transfer.recipient_balance,
    });

    return {
      wallet: mapWallet(await sparksRepository.getWallet(payload.fromUserId)),
      recipientUserId: resolved.recipientUserId,
      chatId: resolved.chat.id,
    };
  },
};
