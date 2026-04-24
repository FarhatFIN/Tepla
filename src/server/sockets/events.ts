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
  "message:delivered": (payload: { chatId: ChatId; messageId: MessageId; userId: string }) => void;
  "message:read": (payload: { chatId: ChatId; messageIds: MessageId[]; userId: string }) => void;
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
  "presence:online": (payload: { userId: string; lastSeen: string | null }) => void;
  "presence:offline": (payload: { userId: string; lastSeen: string }) => void;
  "call:incoming": (payload: {
    callId: string;
    chatId: string;
    initiatorId: string;
    initiatorName: string;
    callType: "audio" | "video";
  }) => void;
  "call:ended": (payload: { callId: string; chatId: string }) => void;
  "call:participant_joined": (payload: { callId: string; userId: string }) => void;
  "call:participant_left": (payload: { callId: string; userId: string }) => void;
};

export type ClientToServerSocketEvents = {
  "presence:join": (roomId: string) => void;
  "presence:leave": (roomId: string) => void;
  typing: (payload: { chatId: string; userId: string }) => void;
  "message:ack": (payload: { chatId: string; messageId: string; userId: string }) => void;
  "message:read": (payload: { chatId: string; messageIds: string[]; userId: string }) => void;
  "call:start": (payload: {
    chatId: string;
    callType: "audio" | "video";
  }) => void;
  "call:accept": (payload: { callId: string }) => void;
  "call:decline": (payload: { callId: string }) => void;
  "call:end": (payload: { callId: string }) => void;
};
