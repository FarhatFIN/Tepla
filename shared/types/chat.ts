import type { UserId } from './user.js';

export type ChatId = string & { readonly __brand: 'ChatId' };

export type ChatType = 'direct' | 'group' | 'channel' | 'bot' | 'saved';

export type ChatRole = 'owner' | 'admin' | 'member' | 'restricted' | 'banned';

export interface TeplaChat {
  id: ChatId;
  type: ChatType;
  name?: string;
  username?: string;
  avatarUrl?: string;
  description?: string;
  createdBy?: UserId;
  isPublic: boolean;
  isVerified: boolean;
  membersCount: number;
  slowModeSeconds: number;
  messageTtlSeconds?: number;
  inviteLink?: string;
  linkedChatId?: ChatId;
  lastMessage?: {
    id: string;
    content?: string;
    senderName?: string;
    type: string;
    createdAt: string;
  };
  unreadCount: number;
  isMuted: boolean;
  createdAt: string;
}

export interface ChatMember {
  userId: UserId;
  chatId: ChatId;
  role: ChatRole;
  customTitle?: string;
  permissions: Record<string, boolean>;
  mutedUntil?: string;
  isAnonymous: boolean;
  joinedAt: string;
}
