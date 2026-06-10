import { create } from "zustand";
import type { ChatId } from "@/types/chat";
import type { MessageId, MessageReaction, TeplaMessage } from "@/types/message";

export type MessageStatus = "sending" | "sent" | "delivered" | "read" | "error";

export type LocalMessage = TeplaMessage & {
  localId: string;
  status: MessageStatus;
};

export interface ChatState {
  activeChatId: ChatId | null;
  messagesByChat: Record<ChatId, LocalMessage[]>;
  pinnedMessagesByChat: Record<ChatId, LocalMessage[]>;
  setActiveChatId: (chatId: ChatId | null) => void;
  refreshUserInChats: (userId: string) => void;
  syncMessages: (chatId: ChatId, messages: LocalMessage[]) => void;
  upsertMessages: (chatId: ChatId, messages: LocalMessage[]) => void;
  setPinnedMessages: (chatId: ChatId, messages: LocalMessage[]) => void;
  applyPinnedMessages: (chatId: ChatId, messages: LocalMessage[]) => void;
  appendMessage: (chatId: ChatId, message: LocalMessage) => void;
  upsertMessage: (chatId: ChatId, message: LocalMessage) => void;
  updateMessage: (
    chatId: ChatId,
    messageId: MessageId | string,
    updater: (message: LocalMessage) => LocalMessage,
  ) => void;
  removeMessage: (chatId: ChatId, messageId: MessageId | string) => void;
  setMessageReactions: (
    chatId: ChatId,
    messageId: MessageId | string,
    reactions: MessageReaction[],
  ) => void;
  setMessageSparks: (
    chatId: ChatId,
    messageId: MessageId | string,
    sparkSummary: {
      sparkCount: number;
      sparkSendersCount: number;
      sparkedByCurrentUser?: boolean;
    },
  ) => void;
  replaceOptimistic: (
    chatId: ChatId,
    localId: string,
    message: LocalMessage,
  ) => void;
  updateMessageStatus: (
    chatId: ChatId,
    messageId: MessageId | string,
    status: MessageStatus,
  ) => void;
}

export const useChatStore = create<ChatState>((set) => ({
  activeChatId: null,
  messagesByChat: {},
  pinnedMessagesByChat: {},
  setActiveChatId: (activeChatId) => set({ activeChatId }),
  syncMessages: (chatId, messages) =>
    set((state) => {
      const existing = state.messagesByChat[chatId] ?? [];
      const merged = new Map<string, LocalMessage>();

      for (const message of messages) {
        const current =
          existing.find(
            (item) => item.id === message.id || item.localId === message.localId,
          ) ?? null;

        merged.set(message.id, {
          ...message,
          status: current?.status ?? message.status,
        });
      }

      for (const message of existing) {
        const alreadyPresent = Array.from(merged.values()).some(
          (item) => item.id === message.id || item.localId === message.localId,
        );

        if (!alreadyPresent && (message.status === "sending" || message.status === "error")) {
          merged.set(message.localId, message);
        }
      }

      const sorted = Array.from(merged.values()).sort(
        (left, right) =>
          new Date(left.createdAt).getTime() - new Date(right.createdAt).getTime(),
      );

      return {
        messagesByChat: {
          ...state.messagesByChat,
          [chatId]: sorted,
        },
      };
    }),
  upsertMessages: (chatId, messages) =>
    set((state) => ({
      messagesByChat: {
        ...state.messagesByChat,
        [chatId]: messages,
      },
    })),
  setPinnedMessages: (chatId, messages) =>
    set((state) => ({
      pinnedMessagesByChat: {
        ...state.pinnedMessagesByChat,
        [chatId]: messages,
      },
    })),
  applyPinnedMessages: (chatId, messages) =>
    set((state) => {
      const pinnedIds = new Set(messages.map((message) => message.id));
      const syncPinnedFlag = (thread: LocalMessage[]) =>
        thread.map((message) => ({
          ...message,
          isPinned: pinnedIds.has(message.id),
        }));

      return {
        messagesByChat: {
          ...state.messagesByChat,
          [chatId]: syncPinnedFlag(state.messagesByChat[chatId] ?? []),
        },
        pinnedMessagesByChat: {
          ...state.pinnedMessagesByChat,
          [chatId]: messages,
        },
      };
    }),
  appendMessage: (chatId, message) =>
    set((state) => ({
      messagesByChat: {
        ...state.messagesByChat,
        [chatId]: [...(state.messagesByChat[chatId] ?? []), message].sort(
          (left, right) =>
            new Date(left.createdAt).getTime() - new Date(right.createdAt).getTime(),
        ),
      },
    })),
  upsertMessage: (chatId, message) =>
    set((state) => {
      const thread = state.messagesByChat[chatId] ?? [];
      const existingIndex = thread.findIndex(
        (item) => item.id === message.id || item.localId === message.localId,
      );
      const nextThread =
        existingIndex >= 0
          ? thread.map((item, index) => (index === existingIndex ? message : item))
          : [...thread, message];

      return {
        messagesByChat: {
          ...state.messagesByChat,
          [chatId]: nextThread.sort(
            (left, right) =>
              new Date(left.createdAt).getTime() - new Date(right.createdAt).getTime(),
          ),
        },
      };
    }),
  updateMessage: (chatId, messageId, updater) =>
    set((state) => {
      const thread = state.messagesByChat[chatId];
      if (!thread) return state;

      const updated = thread.map((message) =>
        message.id === messageId || message.localId === messageId
          ? updater(message)
          : message,
      );

      return {
        messagesByChat: {
          ...state.messagesByChat,
          [chatId]: updated,
        },
      };
    }),
  removeMessage: (chatId, messageId) =>
    set((state) => ({
      messagesByChat: {
        ...state.messagesByChat,
        [chatId]: (state.messagesByChat[chatId] ?? []).filter(
          (message) => message.id !== messageId && message.localId !== messageId,
        ),
      },
      pinnedMessagesByChat: {
        ...state.pinnedMessagesByChat,
        [chatId]: (state.pinnedMessagesByChat[chatId] ?? []).filter(
          (message) => message.id !== messageId && message.localId !== messageId,
        ),
      },
    })),
  setMessageReactions: (chatId, messageId, reactions) =>
    set((state) => {
      const updateReactionSet = (messages: LocalMessage[]) =>
        messages.map((message) =>
          message.id === messageId || message.localId === messageId
            ? { ...message, reactions }
            : message,
        );

      return {
        messagesByChat: {
          ...state.messagesByChat,
          [chatId]: updateReactionSet(state.messagesByChat[chatId] ?? []),
        },
        pinnedMessagesByChat: {
          ...state.pinnedMessagesByChat,
          [chatId]: updateReactionSet(state.pinnedMessagesByChat[chatId] ?? []),
        },
      };
    }),
  setMessageSparks: (chatId, messageId, sparkSummary) =>
    set((state) => {
      const updateSparkState = (messages: LocalMessage[]) =>
        messages.map((message) =>
          message.id === messageId || message.localId === messageId
            ? {
                ...message,
                sparkCount: sparkSummary.sparkCount,
                sparkSendersCount: sparkSummary.sparkSendersCount,
                sparkedByCurrentUser:
                  sparkSummary.sparkedByCurrentUser ?? message.sparkedByCurrentUser ?? false,
              }
            : message,
        );

      return {
        messagesByChat: {
          ...state.messagesByChat,
          [chatId]: updateSparkState(state.messagesByChat[chatId] ?? []),
        },
        pinnedMessagesByChat: {
          ...state.pinnedMessagesByChat,
          [chatId]: updateSparkState(state.pinnedMessagesByChat[chatId] ?? []),
        },
      };
    }),
  replaceOptimistic: (chatId, localId, message) =>
    set((state) => {
      const thread = state.messagesByChat[chatId];
      if (!thread) return state;
      const updated = thread.map((msg) =>
        msg.localId === localId ? { ...message, localId: message.id } : msg,
      );
      return {
        messagesByChat: {
          ...state.messagesByChat,
          [chatId]: updated,
        },
      };
    }),
  updateMessageStatus: (chatId, messageId, status) =>
    set((state) => {
      const thread = state.messagesByChat[chatId];
      if (!thread) return state;
      const updated = thread.map((msg) =>
        msg.id === messageId || msg.localId === messageId
          ? { ...msg, status }
          : msg,
      );
      return {
        messagesByChat: {
          ...state.messagesByChat,
          [chatId]: updated,
        },
      };
    }),
  refreshUserInChats: (userId: string) => {
    // Re-fetch user profile and update sender info in cached messages
    fetch(`/api/users/${userId}`)
      .then((r) => r.json())
      .then((data) => {
        if (!data.success || !data.data) return;
        const profile = data.data;
        set((state) => {
          const updated: Record<ChatId, LocalMessage[]> = {};
          for (const [chatId, messages] of Object.entries(state.messagesByChat)) {
            const hasUser = messages.some((m) => m.senderId === userId);
            if (hasUser) {
              updated[chatId as ChatId] = messages.map((m) =>
                m.senderId === userId
                  ? { ...m, senderName: profile.displayName || profile.username, senderAvatar: profile.avatarUrl }
                  : m,
              );
            }
          }
          if (Object.keys(updated).length === 0) return state;
          return { messagesByChat: { ...state.messagesByChat, ...updated } };
        });
      })
      .catch(() => {});
  },
}));

