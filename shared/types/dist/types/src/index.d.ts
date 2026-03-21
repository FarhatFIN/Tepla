export type UserId = string & {
    readonly __brand: 'UserId';
};
export type ChatId = string & {
    readonly __brand: 'ChatId';
};
export type MessageId = string & {
    readonly __brand: 'MessageId';
};
export type FileId = string & {
    readonly __brand: 'FileId';
};
export type SubscriptionId = string & {
    readonly __brand: 'SubscriptionId';
};
export type SessionId = string & {
    readonly __brand: 'SessionId';
};
export type CallId = string & {
    readonly __brand: 'CallId';
};
export type BotId = string & {
    readonly __brand: 'BotId';
};
export type StoryId = string & {
    readonly __brand: 'StoryId';
};
export type StickerPackId = string & {
    readonly __brand: 'StickerPackId';
};
export type StickerId = string & {
    readonly __brand: 'StickerId';
};
export type ThreadId = string & {
    readonly __brand: 'ThreadId';
};
export type FolderId = string & {
    readonly __brand: 'FolderId';
};
export type WebAppId = string & {
    readonly __brand: 'WebAppId';
};
export declare enum ChatType {
    DIRECT = "direct",
    GROUP = "group",
    CHANNEL = "channel",
    BOT = "bot",
    SAVED = "saved",
    FORUM = "forum"
}
export declare enum ChatRole {
    OWNER = "owner",
    ADMIN = "admin",
    MEMBER = "member",
    RESTRICTED = "restricted",
    BANNED = "banned"
}
export declare enum MessageType {
    TEXT = "text",
    IMAGE = "image",
    VIDEO = "video",
    AUDIO = "audio",
    VOICE = "voice",
    FILE = "file",
    STICKER = "sticker",
    GIF = "gif",
    POLL = "poll",
    LOCATION = "location",
    CONTACT = "contact",
    CALL = "call",
    SYSTEM = "system",
    VIDEO_NOTE = "video_note",
    WEBAPP = "webapp",
    STORY_REPLY = "story_reply",
    SCHEDULED = "scheduled"
}
export declare enum SubscriptionPlan {
    FREE = "free",
    MONTHLY = "monthly",
    QUARTERLY = "quarterly",
    SEMIANNUAL = "semiannual",
    YEARLY = "yearly"
}
export declare enum SubscriptionStatus {
    ACTIVE = "active",
    CANCELLED = "cancelled",
    EXPIRED = "expired",
    PAST_DUE = "past_due",
    TRIALING = "trialing"
}
export declare enum DeliveryStatus {
    SENDING = "sending",
    SENT = "sent",
    DELIVERED = "delivered",
    READ = "read",
    FAILED = "failed"
}
export declare enum PresenceStatus {
    ONLINE = "online",
    OFFLINE = "offline",
    AWAY = "away",
    DND = "dnd"
}
export interface User {
    id: UserId;
    phone: string | null;
    email: string | null;
    username: string;
    displayName: string | null;
    avatarUrl: string | null;
    bio: string | null;
    birthDate: string | null;
    usernameColor: string | null;
    animatedAvatarEnabled: boolean;
    voiceStatusUrl: string | null;
    statusEmoji: string | null;
    statusText: string | null;
    lastSeen: string | null;
    isOnline: boolean;
    isVerified: boolean;
    isPremium: boolean;
    publicKey: string;
    signingPublicKey: string;
    language: string;
    createdAt: string;
}
export interface UserProfile {
    id: UserId;
    username: string;
    displayName: string | null;
    avatarUrl: string | null;
    bio: string | null;
    isOnline: boolean;
    isVerified: boolean;
    isPremium: boolean;
    lastSeen: string | null;
}
export interface Chat {
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
    lastMessage?: MessagePreview | null;
    createdAt: string;
}
export interface ChatMember {
    chatId: ChatId;
    userId: UserId;
    role: ChatRole;
    customTitle: string | null;
    permissions: Record<string, boolean> | null;
    mutedUntil: string | null;
    isAnonymous: boolean;
    joinedAt: string;
}
export interface Message {
    id: MessageId;
    chatId: ChatId;
    senderId: UserId | null;
    content: string;
    contentIv: string | null;
    encryptedKeys: unknown;
    type: MessageType;
    replyToMessageId: MessageId | null;
    replyToMessage: MessageReplyPreview | null;
    forwardFromId: MessageId | null;
    forwardFromChatId: ChatId | null;
    isEdited: boolean;
    isDeleted: boolean;
    isPinned: boolean;
    viewsCount: number;
    ttlSeconds: number | null;
    expiresAt: string | null;
    threadId: ThreadId | null;
    threadRepliesCount: number;
    isSilent: boolean;
    scheduledAt: string | null;
    voiceInfo: VoiceMessage | null;
    videoNoteInfo: VideoNote | null;
    translatedContent: Record<string, string> | null;
    keyboard: BotKeyboard | null;
    mediaGroupId: string | null;
    entities: unknown;
    attachments: MessageAttachment[];
    reactions: MessageReaction[];
    sparkCount: number;
    sparkSendersCount: number;
    deliveryStatus: DeliveryStatus;
    createdAt: string;
    updatedAt: string;
}
export interface MessagePreview {
    id: MessageId;
    senderId: UserId | null;
    senderName: string | null;
    content: string;
    type: MessageType;
    createdAt: string;
}
export interface MessageReplyPreview {
    id: MessageId;
    senderId: UserId | null;
    senderName: string | null;
    content: string;
    type: MessageType;
}
export interface MessageAttachment {
    id: FileId;
    url: string;
    encryptedUrl: string | null;
    type: string;
    mimeType: string;
    sizeBytes: number;
    width: number | null;
    height: number | null;
    durationSeconds: number | null;
    fileName: string | null;
    isSpoiler: boolean;
}
export interface MessageReaction {
    emoji: string;
    count: number;
    userIds: UserId[];
    reacted: boolean;
}
export interface Subscription {
    id: SubscriptionId;
    userId: UserId;
    plan: SubscriptionPlan;
    status: SubscriptionStatus;
    paddleSubscriptionId: string | null;
    startedAt: string;
    expiresAt: string | null;
    cancelledAt: string | null;
    createdAt: string;
}
export interface PremiumLimits {
    maxFileSize: number;
    cloudStorageTotal: number;
    maxPinnedChats: number;
    maxBioLength: number;
    maxCaptionLength: number;
    customEmoji: boolean;
    premiumStickers: boolean;
    advancedSearch: boolean;
    priorityServers: boolean;
    uniqueProfiles: boolean;
    animatedAvatars: boolean;
    voiceStatuses: boolean;
    translationLimit: number;
}
export declare const FREE_LIMITS: PremiumLimits;
export declare const PREMIUM_LIMITS: PremiumLimits;
export interface SparksWallet {
    userId: UserId;
    balance: number;
}
export declare enum SparkTransactionType {
    PURCHASE = "purchase",
    USER_TRANSFER = "user_transfer",
    MESSAGE_SPARK = "message_spark",
    CHANNEL_DONATION = "channel_donation",
    GIFT_ROSE = "gift_rose",
    GIFT_FIRE = "gift_fire",
    GIFT_DIAMOND = "gift_diamond",
    GIFT_CROWN = "gift_crown"
}
export interface SparkTransaction {
    id: string;
    fromUserId: UserId | null;
    toUserId: UserId | null;
    chatId: ChatId | null;
    messageId: MessageId | null;
    amount: number;
    type: SparkTransactionType;
    createdAt: string;
}
export declare enum EventTopic {
    USER_EVENTS = "tepla.user.events",
    CHAT_EVENTS = "tepla.chat.events",
    MESSAGE_EVENTS = "tepla.message.events",
    PRESENCE_EVENTS = "tepla.presence.events",
    NOTIFICATION_EVENTS = "tepla.notification.events",
    PREMIUM_EVENTS = "tepla.premium.events",
    MEDIA_EVENTS = "tepla.media.events",
    ANALYTICS_EVENTS = "tepla.analytics.events",
    MODERATION_EVENTS = "tepla.moderation.events",
    CALL_EVENTS = "tepla.call.events",
    BOT_EVENTS = "tepla.bot.events",
    STORY_EVENTS = "tepla.story.events",
    TRANSLATION_EVENTS = "tepla.translation.events"
}
export declare enum EventType {
    USER_CREATED = "user.created",
    USER_UPDATED = "user.updated",
    USER_DELETED = "user.deleted",
    USER_LOGGED_IN = "user.logged_in",
    USER_LOGGED_OUT = "user.logged_out",
    USER_PREMIUM_CHANGED = "user.premium_changed",
    CHAT_CREATED = "chat.created",
    CHAT_UPDATED = "chat.updated",
    CHAT_DELETED = "chat.deleted",
    MEMBER_JOINED = "chat.member_joined",
    MEMBER_LEFT = "chat.member_left",
    MEMBER_ROLE_CHANGED = "chat.member_role_changed",
    MESSAGE_SENT = "message.sent",
    MESSAGE_EDITED = "message.edited",
    MESSAGE_DELETED = "message.deleted",
    MESSAGE_DELIVERED = "message.delivered",
    MESSAGE_READ = "message.read",
    MESSAGE_PINNED = "message.pinned",
    MESSAGE_UNPINNED = "message.unpinned",
    MESSAGE_FORWARDED = "message.forwarded",
    REACTION_ADDED = "reaction.added",
    REACTION_REMOVED = "reaction.removed",
    USER_ONLINE = "presence.online",
    USER_OFFLINE = "presence.offline",
    USER_TYPING = "presence.typing",
    SUBSCRIPTION_CREATED = "premium.subscription_created",
    SUBSCRIPTION_RENEWED = "premium.subscription_renewed",
    SUBSCRIPTION_CANCELLED = "premium.subscription_cancelled",
    SUBSCRIPTION_EXPIRED = "premium.subscription_expired",
    MEDIA_UPLOADED = "media.uploaded",
    MEDIA_PROCESSED = "media.processed",
    MEDIA_DELETED = "media.deleted",
    PUSH_NOTIFICATION = "notification.push",
    EMAIL_NOTIFICATION = "notification.email",
    IN_APP_NOTIFICATION = "notification.in_app",
    CONTENT_FLAGGED = "moderation.content_flagged",
    USER_BANNED = "moderation.user_banned",
    CONTENT_REMOVED = "moderation.content_removed",
    CALL_STARTED = "call.started",
    CALL_ENDED = "call.ended",
    CALL_PARTICIPANT_JOINED = "call.participant_joined",
    CALL_PARTICIPANT_LEFT = "call.participant_left",
    CALL_MISSED = "call.missed",
    BOT_CREATED = "bot.created",
    BOT_COMMAND_RECEIVED = "bot.command_received",
    BOT_CALLBACK_QUERY = "bot.callback_query",
    BOT_INLINE_QUERY = "bot.inline_query",
    STORY_CREATED = "story.created",
    STORY_VIEWED = "story.viewed",
    STORY_REACTED = "story.reacted",
    STORY_EXPIRED = "story.expired",
    STORY_DELETED = "story.deleted",
    MESSAGE_TRANSLATED = "translation.message_translated",
    THREAD_CREATED = "message.thread_created",
    THREAD_REPLY = "message.thread_reply",
    MESSAGE_SCHEDULED = "message.scheduled",
    SCHEDULED_MESSAGE_SENT = "message.scheduled_sent"
}
export interface DomainEvent<T = unknown> {
    id: string;
    type: EventType;
    topic: EventTopic;
    timestamp: string;
    source: string;
    correlationId: string;
    userId?: UserId;
    payload: T;
    metadata?: Record<string, unknown>;
}
export interface ApiResponse<T = unknown> {
    success: boolean;
    data?: T;
    error?: ApiError;
    meta?: PaginationMeta;
}
export interface ApiError {
    code: string;
    message: string;
    details?: unknown;
}
export interface PaginationMeta {
    total: number;
    page: number;
    limit: number;
    hasMore: boolean;
    cursor?: string;
}
export interface AuthTokens {
    accessToken: string;
    refreshToken: string;
    expiresIn: number;
}
export interface JwtPayload {
    sub: UserId;
    username: string;
    isPremium: boolean;
    iat: number;
    exp: number;
    jti: string;
}
export declare enum CallType {
    VOICE = "voice",
    VIDEO = "video",
    SCREEN_SHARE = "screen_share"
}
export declare enum CallStatus {
    RINGING = "ringing",
    ACTIVE = "active",
    ENDED = "ended",
    MISSED = "missed",
    DECLINED = "declined",
    BUSY = "busy"
}
export interface Call {
    id: CallId;
    chatId: ChatId;
    initiatorId: UserId;
    type: CallType;
    status: CallStatus;
    isGroup: boolean;
    participants: CallParticipant[];
    livekitRoom: string | null;
    recordingUrl: string | null;
    startedAt: string | null;
    endedAt: string | null;
    duration: number | null;
    createdAt: string;
}
export interface CallParticipant {
    userId: UserId;
    joinedAt: string;
    leftAt: string | null;
    isMuted: boolean;
    isVideoOn: boolean;
    isScreenSharing: boolean;
}
export interface Thread {
    id: ThreadId;
    chatId: ChatId;
    rootMessageId: MessageId;
    title: string | null;
    creatorId: UserId;
    repliesCount: number;
    lastReplyAt: string | null;
    participantIds: UserId[];
    isClosed: boolean;
    isPinned: boolean;
    createdAt: string;
}
export interface ScheduledMessage {
    id: string;
    chatId: ChatId;
    senderId: UserId;
    content: string;
    type: MessageType;
    scheduledAt: string;
    isSilent: boolean;
    attachmentIds: FileId[];
    threadId: ThreadId | null;
    createdAt: string;
}
export interface ChatFolder {
    id: FolderId;
    userId: UserId;
    name: string;
    icon: string | null;
    position: number;
    filterIncludeTypes: ChatType[];
    filterExcludeMuted: boolean;
    filterExcludeRead: boolean;
    filterIncludeUnread: boolean;
    pinnedChatIds: ChatId[];
    includedChatIds: ChatId[];
    excludedChatIds: ChatId[];
    createdAt: string;
}
export interface ChatPermissions {
    canSendMessages: boolean;
    canSendMedia: boolean;
    canSendStickers: boolean;
    canSendPolls: boolean;
    canAddMembers: boolean;
    canPinMessages: boolean;
    canChangeInfo: boolean;
    canDeleteMessages: boolean;
    canBanMembers: boolean;
    canManageRoles: boolean;
    canManageThreads: boolean;
    canManageWebApps: boolean;
}
export declare const DEFAULT_MEMBER_PERMISSIONS: ChatPermissions;
export declare const ADMIN_PERMISSIONS: ChatPermissions;
export interface Bot {
    id: BotId;
    ownerId: UserId;
    username: string;
    displayName: string;
    avatarUrl: string | null;
    description: string | null;
    aboutText: string | null;
    webhookUrl: string | null;
    webhookSecret: string | null;
    apiToken: string;
    isInline: boolean;
    isPublic: boolean;
    commands: BotCommand[];
    menuButton: BotMenuButton | null;
    isEnabled: boolean;
    createdAt: string;
}
export interface BotCommand {
    command: string;
    description: string;
    scope: 'all' | 'private' | 'group' | 'admin';
}
export interface BotMenuButton {
    type: 'default' | 'commands' | 'webapp';
    text?: string;
    webAppUrl?: string;
}
export interface BotKeyboard {
    inline?: BotInlineButton[][];
    reply?: BotReplyButton[][];
    removeKeyboard?: boolean;
    oneTime?: boolean;
    placeholder?: string;
}
export interface BotInlineButton {
    text: string;
    callbackData?: string;
    url?: string;
    webAppUrl?: string;
    switchInlineQuery?: string;
}
export interface BotReplyButton {
    text: string;
    requestContact?: boolean;
    requestLocation?: boolean;
}
export interface BotUpdate {
    updateId: string;
    type: 'message' | 'callback_query' | 'inline_query' | 'command';
    chatId: ChatId;
    userId: UserId;
    messageId?: MessageId;
    data?: string;
    query?: string;
    message?: Message;
}
export declare enum StoryType {
    IMAGE = "image",
    VIDEO = "video",
    VIDEO_NOTE = "video_note",
    TEXT = "text"
}
export interface Story {
    id: StoryId;
    userId: UserId;
    type: StoryType;
    mediaUrl: string;
    thumbnailUrl: string | null;
    caption: string | null;
    duration: number;
    backgroundColor: string | null;
    textStyle: string | null;
    viewsCount: number;
    reactionsCount: number;
    isPinned: boolean;
    privacy: StoryPrivacy;
    expiresAt: string;
    createdAt: string;
}
export declare enum StoryPrivacy {
    EVERYONE = "everyone",
    CONTACTS = "contacts",
    CLOSE_FRIENDS = "close_friends",
    SELECTED = "selected"
}
export interface StoryView {
    storyId: StoryId;
    userId: UserId;
    reaction: string | null;
    viewedAt: string;
}
export declare enum StickerType {
    STATIC = "static",
    ANIMATED = "animated",
    VIDEO = "video"
}
export interface StickerPack {
    id: StickerPackId;
    name: string;
    title: string;
    creatorId: UserId;
    type: StickerType;
    thumbnailUrl: string | null;
    stickers: Sticker[];
    isOfficial: boolean;
    isPremium: boolean;
    installCount: number;
    createdAt: string;
}
export interface Sticker {
    id: StickerId;
    packId: StickerPackId;
    emoji: string;
    fileUrl: string;
    thumbnailUrl: string | null;
    width: number;
    height: number;
    isAnimated: boolean;
    position: number;
}
export interface GifResult {
    id: string;
    url: string;
    previewUrl: string;
    width: number;
    height: number;
    title: string | null;
    source: 'giphy' | 'tenor';
}
export interface TranslationRequest {
    text: string;
    sourceLang?: string;
    targetLang: string;
    messageId?: MessageId;
    chatId?: ChatId;
}
export interface TranslationResult {
    originalText: string;
    translatedText: string;
    sourceLang: string;
    targetLang: string;
    confidence: number;
}
export type SupportedLanguage = 'en' | 'ru' | 'uk' | 'es' | 'fr' | 'de' | 'it' | 'pt' | 'zh' | 'ja' | 'ko' | 'ar' | 'hi' | 'tr' | 'pl' | 'nl' | 'sv' | 'da' | 'fi' | 'no' | 'cs' | 'ro' | 'hu' | 'el' | 'th' | 'vi' | 'id' | 'ms' | 'he' | 'fa' | 'bg' | 'hr' | 'sk' | 'sl' | 'et' | 'lv' | 'lt' | 'sr' | 'ka' | 'az' | 'kk' | 'uz';
export interface WebApp {
    id: WebAppId;
    developerId: UserId;
    botId: BotId | null;
    name: string;
    shortName: string;
    description: string | null;
    iconUrl: string | null;
    url: string;
    category: WebAppCategory;
    screenshots: string[];
    isPublished: boolean;
    isPremiumOnly: boolean;
    installCount: number;
    rating: number;
    permissions: WebAppPermission[];
    createdAt: string;
}
export declare enum WebAppCategory {
    GAME = "game",
    UTILITY = "utility",
    FINANCE = "finance",
    SOCIAL = "social",
    PRODUCTIVITY = "productivity",
    ENTERTAINMENT = "entertainment",
    OTHER = "other"
}
export type WebAppPermission = 'read_profile' | 'send_messages' | 'read_contacts' | 'payments' | 'clipboard' | 'location' | 'camera' | 'microphone';
export interface WebAppEvent {
    type: 'ready' | 'close' | 'expand' | 'payment' | 'data' | 'haptic';
    data?: unknown;
}
export interface PaymentInvoice {
    id: string;
    botId: BotId | null;
    chatId: ChatId;
    userId: UserId;
    title: string;
    description: string;
    amount: number;
    currency: string;
    payload: string;
    provider: 'paddle' | 'ton' | 'sparks';
    status: 'pending' | 'paid' | 'failed' | 'refunded';
    createdAt: string;
    paidAt: string | null;
}
export interface StoreItem {
    id: string;
    chatId: ChatId;
    sellerId: UserId;
    title: string;
    description: string;
    price: number;
    currency: string;
    imageUrl: string | null;
    category: string;
    stock: number | null;
    isActive: boolean;
    createdAt: string;
}
export interface VoiceMessage {
    durationSeconds: number;
    waveform: number[];
    mimeType: string;
    sizeBytes: number;
    transcription: string | null;
}
export interface VideoNote {
    durationSeconds: number;
    thumbnailUrl: string;
    diameter: number;
    sizeBytes: number;
}
export interface HealthStatus {
    service: string;
    status: 'healthy' | 'degraded' | 'unhealthy';
    version: string;
    uptime: number;
    checks: Record<string, {
        status: 'ok' | 'error';
        latency?: number;
        message?: string;
    }>;
}
//# sourceMappingURL=index.d.ts.map