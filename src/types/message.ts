import type { ChatId } from "./chat";
import type { UserId } from "./user";

export type MessageId = string;

export type MessageAttachment = {
  id: string;
  url: string;
  encryptedUrl: string | null;
  thumbnailUrl: string | null;
  type: string | null;
  mimeType: string | null;
  sizeBytes: number | null;
  width: number | null;
  height: number | null;
  durationSeconds: number | null;
  fileName: string | null;
  isSpoiler: boolean;
};

export type MessageReaction = {
  emoji: string;
  count: number;
  reactedUserIds: UserId[];
  reactedByCurrentUser?: boolean;
};

export type MessageReplyPreview = {
  id: MessageId;
  senderId: UserId | null;
  content: string;
  type: MessageType;
  isDeleted: boolean;
  attachments: MessageAttachment[];
};

export type MessageType =
  | "text"
  | "image"
  | "video"
  | "audio"
  | "voice"
  | "file"
  | "sticker"
  | "gif"
  | "poll"
  | "location"
  | "contact"
  | "call"
  | "system";

export type TeplaMessage = {
  id: MessageId;
  clientMessageId?: string | null;
  chatId: ChatId;
  senderId: UserId | null;
  content: string;
  contentIv: string | null;
  encryptedKeys: unknown;
  type: MessageType;
  replyToMessageId: MessageId | null;
  replyToId: MessageId | null;
  replyToMessage: MessageReplyPreview | null;
  forwardFromId: MessageId | null;
  forwardFromChatId: ChatId | null;
  isEdited: boolean;
  editedAt: string | null;
  isDeleted: boolean;
  isPinned: boolean;
  viewsCount: number;
  ttlSeconds: number | null;
  expiresAt: string | null;
  mediaGroupId: string | null;
  entities: unknown;
  attachments: MessageAttachment[];
  reactions: MessageReaction[];
  sparkCount?: number;
  sparkSendersCount?: number;
  sparkedByCurrentUser?: boolean;
  createdAt: string;
};

