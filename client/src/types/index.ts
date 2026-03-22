export type MessageStatus = "sending" | "sent" | "delivered" | "read" | "failed";
export type ChatType = "direct" | "group" | "channel" | "bot" | "saved" | "forum";
export type ChatRole = "owner" | "admin" | "member" | "restricted" | "banned";
export type PresenceStatus = "online" | "offline" | "away" | "dnd";
export type CallType = "voice" | "video";
export type CallStatus = "ringing" | "active" | "ended" | "missed" | "declined";
export type StoryType = "image" | "video" | "text";
export type StickerType = "static" | "animated" | "video";
export type MessageType = "text" | "image" | "video" | "audio" | "voice" | "file" | "sticker" | "gif" | "poll" | "location" | "contact" | "call" | "system" | "video_note" | "story_reply" | "scheduled";
export type ThemeMode = "dark" | "light" | "system";

export interface User {
  id: string;
  name: string;
  username?: string;
  avatar?: string;
  bio?: string;
  phone?: string;
  status: PresenceStatus;
  lastSeen?: string;
  isPremium?: boolean;
  isVerified?: boolean;
  isAdmin?: boolean;
  language?: string;
}

export interface ChatMember {
  userId: string;
  user: User;
  role: ChatRole;
  joinedAt: string;
}

export interface ChatFolder {
  id: string;
  name: string;
  icon?: string;
  chatIds: string[];
  color?: string;
}

export interface Chat {
  id: string;
  type: ChatType;
  name: string;
  avatar?: string;
  description?: string;
  lastMessage?: MessagePreview;
  unreadCount: number;
  isPinned?: boolean;
  isMuted?: boolean;
  isArchived?: boolean;
  membersCount?: number;
  members?: ChatMember[];
  user?: User; // for direct chats
  folderId?: string;
  autoTranslate?: boolean;
  autoTranslateLang?: string;
  typing?: string[];
}

export interface MessagePreview {
  text: string;
  senderId: string;
  senderName?: string;
  timestamp: string;
  type: MessageType;
}

export interface MessageReaction {
  emoji: string;
  count: number;
  users: string[];
  myReaction?: boolean;
}

export interface MessageReply {
  id: string;
  senderId: string;
  senderName: string;
  text: string;
  type: MessageType;
}

export interface MessageAttachment {
  id: string;
  type: "image" | "video" | "audio" | "voice" | "file" | "sticker" | "gif" | "video_note";
  url: string;
  thumbnailUrl?: string;
  fileName?: string;
  fileSize?: number;
  mimeType?: string;
  duration?: number;
  width?: number;
  height?: number;
  waveform?: number[];
}

export interface Message {
  id: string;
  chatId: string;
  senderId: string;
  senderName?: string;
  text: string;
  type: MessageType;
  timestamp: string;
  date: string;
  status: MessageStatus;
  replyTo?: MessageReply;
  reactions?: MessageReaction[];
  attachments?: MessageAttachment[];
  isEdited?: boolean;
  isPinned?: boolean;
  threadId?: string;
  threadRepliesCount?: number;
  isForwarded?: boolean;
  forwardedFrom?: string;
  scheduledAt?: string;
  translatedText?: string;
  translatedLang?: string;
}

export interface Story {
  id: string;
  userId: string;
  userName: string;
  userAvatar?: string;
  type: StoryType;
  mediaUrl?: string;
  text?: string;
  backgroundColor?: string;
  createdAt: string;
  expiresAt: string;
  viewsCount: number;
  isViewed: boolean;
}

export interface UserStories {
  userId: string;
  userName: string;
  userAvatar?: string;
  stories: Story[];
  hasUnviewed: boolean;
}

export interface StickerPack {
  id: string;
  name: string;
  author: string;
  thumbnail: string;
  stickers: Sticker[];
  isInstalled: boolean;
  installCount: number;
}

export interface Sticker {
  id: string;
  packId: string;
  emoji: string;
  url: string;
  type: StickerType;
}

export interface GifResult {
  id: string;
  url: string;
  previewUrl: string;
  width: number;
  height: number;
  title?: string;
}

export interface Call {
  id: string;
  chatId: string;
  type: CallType;
  status: CallStatus;
  startedBy: string;
  startedAt: string;
  endedAt?: string;
  participants: CallParticipant[];
}

export interface CallParticipant {
  userId: string;
  userName: string;
  userAvatar?: string;
  isMuted: boolean;
  isVideoOff: boolean;
  isScreenSharing: boolean;
  joinedAt: string;
}

export interface Thread {
  id: string;
  parentMessageId: string;
  chatId: string;
  repliesCount: number;
  lastReplyAt: string;
  participants: string[];
}

export interface PremiumPlan {
  id: string;
  name: string;
  price: number;
  currency: string;
  period: "1month" | "3months" | "6months" | "1year";
  periodLabel: string;
  features: string[];
  isPopular?: boolean;
  savings?: string;
}

export interface NotificationSettings {
  pushEnabled: boolean;
  soundEnabled: boolean;
  previewEnabled: boolean;
  mutedChats: string[];
}

export interface TranslationResult {
  originalText: string;
  translatedText: string;
  sourceLang: string;
  targetLang: string;
}
