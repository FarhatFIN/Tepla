import type { UserId } from './user.js';
import type { ChatId } from './chat.js';

export type MessageId = string & { readonly __brand: 'MessageId' };

export type MessageType =
  | 'text' | 'image' | 'video' | 'audio' | 'voice'
  | 'file' | 'sticker' | 'gif' | 'poll' | 'location'
  | 'contact' | 'call' | 'system';

export type MessageStatus = 'sending' | 'sent' | 'delivered' | 'read' | 'error';

export interface MessageAttachment {
  id: string;
  url: string;
  encryptedUrl?: string;
  thumbnailUrl?: string;
  type: string;
  mimeType?: string;
  sizeBytes?: number;
  width?: number;
  height?: number;
  durationSeconds?: number;
  fileName?: string;
  isSpoiler: boolean;
}

export interface MessageReaction {
  emoji: string;
  count: number;
  userIds: UserId[];
  reactedByCurrentUser: boolean;
}

export interface MessageReplyPreview {
  id: MessageId;
  senderId: UserId;
  senderName?: string;
  content?: string;
  type: MessageType;
  attachments: MessageAttachment[];
}

export interface MessageSparkSummary {
  totalAmount: number;
  sendersCount: number;
  currentUserSent: boolean;
}

export interface TeplaMessage {
  id: MessageId;
  clientMessageId?: string;
  chatId: ChatId;
  senderId: UserId;
  senderName?: string;
  senderAvatarUrl?: string;
  content?: string;
  contentIv?: string;
  encryptedKeys?: Record<string, string>;
  type: MessageType;
  status: MessageStatus;
  replyTo?: MessageReplyPreview;
  forwardFromId?: MessageId;
  forwardFromChatId?: ChatId;
  isEdited: boolean;
  editedAt?: string;
  isDeleted: boolean;
  isPinned: boolean;
  viewsCount: number;
  sparkCount: number;
  sparkSendersCount: number;
  mediaGroupId?: string;
  entities?: unknown;
  attachments: MessageAttachment[];
  reactions: MessageReaction[];
  sparkSummary?: MessageSparkSummary;
  createdAt: string;
}
