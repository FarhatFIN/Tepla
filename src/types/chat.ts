import type { UserId } from "./user";
import type { MessageType } from "./message";

export type ChatId = string;

export type ChatType = "direct" | "group" | "channel" | "bot" | "saved";

export type ChatRole = "owner" | "admin" | "member" | "restricted" | "banned";

export type TeplaChat = {
  id: ChatId;
  type: ChatType;
  name: string | null;
  username: string | null;
  avatarUrl: string | null;
  description: string | null;
  createdBy: UserId | null;
  isPublic: boolean;
  isVerified: boolean;
  membersCount: number;
  slowModeSeconds: number;
  messageTtlSeconds: number | null;
  inviteLink: string | null;
  linkedChatId: ChatId | null;
  currentUserRole?: ChatRole | null;
  lastMessage?: {
    id: string;
    content: string;
    type: MessageType;
    createdAt: string;
    isDeleted: boolean;
  } | null;
  createdAt: string;
};

