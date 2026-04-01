import type { ChatId } from "@/types/chat";
import type { MessageId, MessageReaction, TeplaMessage } from "@/types/message";

export type ServerToClientSocketEvents = {
  connect: () => void;
  disconnect: () => void;
  "presence:joined": (payload: { userId: string }) => void;
  "presence:left": (payload: { userId: string }) => void;
  typing: (payload: { chatId: string; userId: string }) => void;
  "message:new": (payload: { chatId: ChatId; message: TeplaMessage }) => void;
  "message:updated": (payload: { chatId: ChatId; message: TeplaMessage }) => void;
  "message:deleted": (payload: { chatId: ChatId; messageId: MessageId }) => void;
  "message:pinned": (payload: { chatId: ChatId; pinnedMessages: TeplaMessage[] }) => void;
  "reaction:changed": (
    payload: { chatId: ChatId; messageId: MessageId; reactions: MessageReaction[] },
  ) => void;
  "message:sparks": (
    payload: {
      chatId: ChatId;
      messageId: MessageId;
      sparkCount: number;
      sparkSendersCount: number;
    },
  ) => void;
  "sparks:balance": (payload: { userId: string; balance: number }) => void;
  "user:updated": (payload: { userId: string; fields: string[] }) => void;
  "user:profile_changed": (payload: { userId: string; fields: string[] }) => void;
};

export type ClientToServerSocketEvents = {
  "presence:join": (roomId: string) => void;
  "presence:leave": (roomId: string) => void;
  typing: (payload: { chatId: string; userId: string }) => void;
  "message:ack": (payload: { chatId: string; messageId: string; userId: string }) => void;
};
