"use strict";
// ============================================
// Tepla Messenger — Shared Type Definitions
// Microservice Architecture v2.0
// ============================================
Object.defineProperty(exports, "__esModule", { value: true });
exports.WebAppCategory = exports.StickerType = exports.StoryPrivacy = exports.StoryType = exports.ADMIN_PERMISSIONS = exports.DEFAULT_MEMBER_PERMISSIONS = exports.CallStatus = exports.CallType = exports.EventType = exports.EventTopic = exports.SparkTransactionType = exports.PREMIUM_LIMITS = exports.FREE_LIMITS = exports.PresenceStatus = exports.DeliveryStatus = exports.SubscriptionStatus = exports.SubscriptionPlan = exports.MessageType = exports.ChatRole = exports.ChatType = void 0;
// ─── Enums ──────────────────────────────────
var ChatType;
(function (ChatType) {
    ChatType["DIRECT"] = "direct";
    ChatType["GROUP"] = "group";
    ChatType["CHANNEL"] = "channel";
    ChatType["BOT"] = "bot";
    ChatType["SAVED"] = "saved";
    ChatType["FORUM"] = "forum";
})(ChatType || (exports.ChatType = ChatType = {}));
var ChatRole;
(function (ChatRole) {
    ChatRole["OWNER"] = "owner";
    ChatRole["ADMIN"] = "admin";
    ChatRole["MEMBER"] = "member";
    ChatRole["RESTRICTED"] = "restricted";
    ChatRole["BANNED"] = "banned";
})(ChatRole || (exports.ChatRole = ChatRole = {}));
var MessageType;
(function (MessageType) {
    MessageType["TEXT"] = "text";
    MessageType["IMAGE"] = "image";
    MessageType["VIDEO"] = "video";
    MessageType["AUDIO"] = "audio";
    MessageType["VOICE"] = "voice";
    MessageType["FILE"] = "file";
    MessageType["STICKER"] = "sticker";
    MessageType["GIF"] = "gif";
    MessageType["POLL"] = "poll";
    MessageType["LOCATION"] = "location";
    MessageType["CONTACT"] = "contact";
    MessageType["CALL"] = "call";
    MessageType["SYSTEM"] = "system";
    MessageType["VIDEO_NOTE"] = "video_note";
    MessageType["WEBAPP"] = "webapp";
    MessageType["STORY_REPLY"] = "story_reply";
    MessageType["SCHEDULED"] = "scheduled";
})(MessageType || (exports.MessageType = MessageType = {}));
var SubscriptionPlan;
(function (SubscriptionPlan) {
    SubscriptionPlan["FREE"] = "free";
    SubscriptionPlan["MONTHLY"] = "monthly";
    SubscriptionPlan["QUARTERLY"] = "quarterly";
    SubscriptionPlan["SEMIANNUAL"] = "semiannual";
    SubscriptionPlan["YEARLY"] = "yearly";
})(SubscriptionPlan || (exports.SubscriptionPlan = SubscriptionPlan = {}));
var SubscriptionStatus;
(function (SubscriptionStatus) {
    SubscriptionStatus["ACTIVE"] = "active";
    SubscriptionStatus["CANCELLED"] = "cancelled";
    SubscriptionStatus["EXPIRED"] = "expired";
    SubscriptionStatus["PAST_DUE"] = "past_due";
    SubscriptionStatus["TRIALING"] = "trialing";
})(SubscriptionStatus || (exports.SubscriptionStatus = SubscriptionStatus = {}));
var DeliveryStatus;
(function (DeliveryStatus) {
    DeliveryStatus["SENDING"] = "sending";
    DeliveryStatus["SENT"] = "sent";
    DeliveryStatus["DELIVERED"] = "delivered";
    DeliveryStatus["READ"] = "read";
    DeliveryStatus["FAILED"] = "failed";
})(DeliveryStatus || (exports.DeliveryStatus = DeliveryStatus = {}));
var PresenceStatus;
(function (PresenceStatus) {
    PresenceStatus["ONLINE"] = "online";
    PresenceStatus["OFFLINE"] = "offline";
    PresenceStatus["AWAY"] = "away";
    PresenceStatus["DND"] = "dnd";
})(PresenceStatus || (exports.PresenceStatus = PresenceStatus = {}));
exports.FREE_LIMITS = {
    maxFileSize: 50 * 1024 * 1024, // 50 MB
    cloudStorageTotal: 1024 * 1024 * 1024, // 1 GB
    maxPinnedChats: 5,
    maxBioLength: 140,
    maxCaptionLength: 1024,
    customEmoji: false,
    premiumStickers: false,
    advancedSearch: false,
    priorityServers: false,
    uniqueProfiles: false,
    animatedAvatars: false,
    voiceStatuses: false,
    translationLimit: 5,
};
exports.PREMIUM_LIMITS = {
    maxFileSize: 4 * 1024 * 1024 * 1024, // 4 GB
    cloudStorageTotal: 100 * 1024 * 1024 * 1024, // 100 GB
    maxPinnedChats: 100,
    maxBioLength: 500,
    maxCaptionLength: 4096,
    customEmoji: true,
    premiumStickers: true,
    advancedSearch: true,
    priorityServers: true,
    uniqueProfiles: true,
    animatedAvatars: true,
    voiceStatuses: true,
    translationLimit: -1, // unlimited
};
var SparkTransactionType;
(function (SparkTransactionType) {
    SparkTransactionType["PURCHASE"] = "purchase";
    SparkTransactionType["USER_TRANSFER"] = "user_transfer";
    SparkTransactionType["MESSAGE_SPARK"] = "message_spark";
    SparkTransactionType["CHANNEL_DONATION"] = "channel_donation";
    SparkTransactionType["GIFT_ROSE"] = "gift_rose";
    SparkTransactionType["GIFT_FIRE"] = "gift_fire";
    SparkTransactionType["GIFT_DIAMOND"] = "gift_diamond";
    SparkTransactionType["GIFT_CROWN"] = "gift_crown";
})(SparkTransactionType || (exports.SparkTransactionType = SparkTransactionType = {}));
// ─── Events (Kafka / Message Broker) ────────
var EventTopic;
(function (EventTopic) {
    EventTopic["USER_EVENTS"] = "tepla.user.events";
    EventTopic["CHAT_EVENTS"] = "tepla.chat.events";
    EventTopic["MESSAGE_EVENTS"] = "tepla.message.events";
    EventTopic["PRESENCE_EVENTS"] = "tepla.presence.events";
    EventTopic["NOTIFICATION_EVENTS"] = "tepla.notification.events";
    EventTopic["PREMIUM_EVENTS"] = "tepla.premium.events";
    EventTopic["MEDIA_EVENTS"] = "tepla.media.events";
    EventTopic["ANALYTICS_EVENTS"] = "tepla.analytics.events";
    EventTopic["MODERATION_EVENTS"] = "tepla.moderation.events";
    EventTopic["CALL_EVENTS"] = "tepla.call.events";
    EventTopic["BOT_EVENTS"] = "tepla.bot.events";
    EventTopic["STORY_EVENTS"] = "tepla.story.events";
    EventTopic["TRANSLATION_EVENTS"] = "tepla.translation.events";
})(EventTopic || (exports.EventTopic = EventTopic = {}));
var EventType;
(function (EventType) {
    // User
    EventType["USER_CREATED"] = "user.created";
    EventType["USER_UPDATED"] = "user.updated";
    EventType["USER_DELETED"] = "user.deleted";
    EventType["USER_LOGGED_IN"] = "user.logged_in";
    EventType["USER_LOGGED_OUT"] = "user.logged_out";
    EventType["USER_PREMIUM_CHANGED"] = "user.premium_changed";
    // Chat
    EventType["CHAT_CREATED"] = "chat.created";
    EventType["CHAT_UPDATED"] = "chat.updated";
    EventType["CHAT_DELETED"] = "chat.deleted";
    EventType["MEMBER_JOINED"] = "chat.member_joined";
    EventType["MEMBER_LEFT"] = "chat.member_left";
    EventType["MEMBER_ROLE_CHANGED"] = "chat.member_role_changed";
    // Message
    EventType["MESSAGE_SENT"] = "message.sent";
    EventType["MESSAGE_EDITED"] = "message.edited";
    EventType["MESSAGE_DELETED"] = "message.deleted";
    EventType["MESSAGE_DELIVERED"] = "message.delivered";
    EventType["MESSAGE_READ"] = "message.read";
    EventType["MESSAGE_PINNED"] = "message.pinned";
    EventType["MESSAGE_UNPINNED"] = "message.unpinned";
    EventType["MESSAGE_FORWARDED"] = "message.forwarded";
    EventType["REACTION_ADDED"] = "reaction.added";
    EventType["REACTION_REMOVED"] = "reaction.removed";
    // Presence
    EventType["USER_ONLINE"] = "presence.online";
    EventType["USER_OFFLINE"] = "presence.offline";
    EventType["USER_TYPING"] = "presence.typing";
    // Premium
    EventType["SUBSCRIPTION_CREATED"] = "premium.subscription_created";
    EventType["SUBSCRIPTION_RENEWED"] = "premium.subscription_renewed";
    EventType["SUBSCRIPTION_CANCELLED"] = "premium.subscription_cancelled";
    EventType["SUBSCRIPTION_EXPIRED"] = "premium.subscription_expired";
    // Media
    EventType["MEDIA_UPLOADED"] = "media.uploaded";
    EventType["MEDIA_PROCESSED"] = "media.processed";
    EventType["MEDIA_DELETED"] = "media.deleted";
    // Notification
    EventType["PUSH_NOTIFICATION"] = "notification.push";
    EventType["EMAIL_NOTIFICATION"] = "notification.email";
    EventType["IN_APP_NOTIFICATION"] = "notification.in_app";
    // Moderation
    EventType["CONTENT_FLAGGED"] = "moderation.content_flagged";
    EventType["USER_BANNED"] = "moderation.user_banned";
    EventType["CONTENT_REMOVED"] = "moderation.content_removed";
    // Calls
    EventType["CALL_STARTED"] = "call.started";
    EventType["CALL_ENDED"] = "call.ended";
    EventType["CALL_PARTICIPANT_JOINED"] = "call.participant_joined";
    EventType["CALL_PARTICIPANT_LEFT"] = "call.participant_left";
    EventType["CALL_MISSED"] = "call.missed";
    // Bots
    EventType["BOT_CREATED"] = "bot.created";
    EventType["BOT_COMMAND_RECEIVED"] = "bot.command_received";
    EventType["BOT_CALLBACK_QUERY"] = "bot.callback_query";
    EventType["BOT_INLINE_QUERY"] = "bot.inline_query";
    // Stories
    EventType["STORY_CREATED"] = "story.created";
    EventType["STORY_VIEWED"] = "story.viewed";
    EventType["STORY_REACTED"] = "story.reacted";
    EventType["STORY_EXPIRED"] = "story.expired";
    EventType["STORY_DELETED"] = "story.deleted";
    // Translation
    EventType["MESSAGE_TRANSLATED"] = "translation.message_translated";
    // Threads
    EventType["THREAD_CREATED"] = "message.thread_created";
    EventType["THREAD_REPLY"] = "message.thread_reply";
    // Scheduled
    EventType["MESSAGE_SCHEDULED"] = "message.scheduled";
    EventType["SCHEDULED_MESSAGE_SENT"] = "message.scheduled_sent";
})(EventType || (exports.EventType = EventType = {}));
// ─── Calls ─────────────────────────────────
var CallType;
(function (CallType) {
    CallType["VOICE"] = "voice";
    CallType["VIDEO"] = "video";
    CallType["SCREEN_SHARE"] = "screen_share";
})(CallType || (exports.CallType = CallType = {}));
var CallStatus;
(function (CallStatus) {
    CallStatus["RINGING"] = "ringing";
    CallStatus["ACTIVE"] = "active";
    CallStatus["ENDED"] = "ended";
    CallStatus["MISSED"] = "missed";
    CallStatus["DECLINED"] = "declined";
    CallStatus["BUSY"] = "busy";
})(CallStatus || (exports.CallStatus = CallStatus = {}));
exports.DEFAULT_MEMBER_PERMISSIONS = {
    canSendMessages: true,
    canSendMedia: true,
    canSendStickers: true,
    canSendPolls: true,
    canAddMembers: false,
    canPinMessages: false,
    canChangeInfo: false,
    canDeleteMessages: false,
    canBanMembers: false,
    canManageRoles: false,
    canManageThreads: false,
    canManageWebApps: false,
};
exports.ADMIN_PERMISSIONS = {
    canSendMessages: true,
    canSendMedia: true,
    canSendStickers: true,
    canSendPolls: true,
    canAddMembers: true,
    canPinMessages: true,
    canChangeInfo: true,
    canDeleteMessages: true,
    canBanMembers: true,
    canManageRoles: false,
    canManageThreads: true,
    canManageWebApps: true,
};
// ─── Stories ───────────────────────────────
var StoryType;
(function (StoryType) {
    StoryType["IMAGE"] = "image";
    StoryType["VIDEO"] = "video";
    StoryType["VIDEO_NOTE"] = "video_note";
    StoryType["TEXT"] = "text";
})(StoryType || (exports.StoryType = StoryType = {}));
var StoryPrivacy;
(function (StoryPrivacy) {
    StoryPrivacy["EVERYONE"] = "everyone";
    StoryPrivacy["CONTACTS"] = "contacts";
    StoryPrivacy["CLOSE_FRIENDS"] = "close_friends";
    StoryPrivacy["SELECTED"] = "selected";
})(StoryPrivacy || (exports.StoryPrivacy = StoryPrivacy = {}));
// ─── Stickers ──────────────────────────────
var StickerType;
(function (StickerType) {
    StickerType["STATIC"] = "static";
    StickerType["ANIMATED"] = "animated";
    StickerType["VIDEO"] = "video";
})(StickerType || (exports.StickerType = StickerType = {}));
var WebAppCategory;
(function (WebAppCategory) {
    WebAppCategory["GAME"] = "game";
    WebAppCategory["UTILITY"] = "utility";
    WebAppCategory["FINANCE"] = "finance";
    WebAppCategory["SOCIAL"] = "social";
    WebAppCategory["PRODUCTIVITY"] = "productivity";
    WebAppCategory["ENTERTAINMENT"] = "entertainment";
    WebAppCategory["OTHER"] = "other";
})(WebAppCategory || (exports.WebAppCategory = WebAppCategory = {}));
//# sourceMappingURL=index.js.map