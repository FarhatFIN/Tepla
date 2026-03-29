import type { AuthUser } from "@/stores/auth.store";
import type { TeplaChat } from "@/types/chat";
import type {
  MessageAttachment,
  MessageReaction,
  MessageReplyPreview,
  TeplaMessage,
} from "@/types/message";
import type { TeplaUser } from "@/types/user";
import type { ChatRow } from "@/server/database/chats.repository";
import type { FileRow } from "@/server/database/files.repository";
import type { MessageRow } from "@/server/database/messages.repository";
import type { ReactionRow } from "@/server/database/reactions.repository";
import type { SparksTransactionRow } from "@/server/database/sparks.repository";
import type { UserProfileRow } from "@/server/database/users.repository";
import type { MessageSparkSummary } from "@/types/sparks";
import { DEFAULT_LANGUAGE } from "@/lib/languages";

export const mapUserProfile = (row: UserProfileRow): TeplaUser => ({
  id: row.id,
  phone: row.phone,
  email: row.email,
  username: row.username,
  displayName: row.display_name,
  avatarUrl: row.avatar_url,
  avatarThumbUrl: row.avatar_thumb_url,
  bio: row.bio,
  birthDate: row.birth_date,
  usernameColor: row.username_color,
  animatedAvatarEnabled: Boolean(row.avatar_animation_enabled),
  voiceStatusUrl: row.voice_status_url,
  voiceStatusDurationSeconds: row.voice_status_duration_seconds,
  statusEmoji: row.status_emoji,
  statusText: row.status_text,
  lastSeen: row.last_seen,
  isOnline: Boolean(row.is_online),
  isVerified: Boolean(row.is_verified),
  isPremium: Boolean(row.is_premium),
  publicKey: row.public_key,
  signingPublicKey: row.signing_public_key,
  language: row.language ?? "en",
  createdAt: row.created_at,
});

export const mapAuthUser = (row: UserProfileRow): AuthUser => ({
  id: row.id,
  username: row.username,
  displayName: row.display_name,
  avatarUrl: row.avatar_url,
  isPremium: Boolean(row.is_premium),
  language: row.language ?? DEFAULT_LANGUAGE,
  birthDate: row.birth_date,
  usernameColor: row.username_color,
  animatedAvatarEnabled: Boolean(row.avatar_animation_enabled),
  voiceStatusUrl: row.voice_status_url,
  voiceStatusDurationSeconds: row.voice_status_duration_seconds,
  statusEmoji: row.status_emoji,
});

export const mapChat = (
  row: ChatRow,
  currentUserRole: TeplaChat["currentUserRole"] = null,
  isFavorite = false,
): TeplaChat => ({
  id: row.id,
  type: row.type as TeplaChat["type"],
  name: row.name,
  username: row.username,
  avatarUrl: row.avatar_url,
  description: row.description,
  createdBy: row.created_by,
  isPublic: Boolean(row.is_public),
  isVerified: Boolean(row.is_verified),
  isFavorite,
  membersCount: row.members_count ?? 0,
  slowModeSeconds: row.slow_mode_seconds ?? 0,
  messageTtlSeconds: row.message_ttl_seconds,
  inviteLink: row.invite_link,
  linkedChatId: row.linked_chat_id,
  currentUserRole,
  createdAt: row.created_at,
});

export const mapAttachment = (row: FileRow): MessageAttachment => ({
  id: row.id,
  url: row.url,
  encryptedUrl: row.encrypted_url,
  thumbnailUrl: row.thumbnail_url,
  type: row.type,
  mimeType: row.mime_type,
  sizeBytes: row.size_bytes,
  width: row.width,
  height: row.height,
  durationSeconds: row.duration_seconds,
  fileName: row.file_name,
  isSpoiler: Boolean(row.is_spoiler),
});

const buildReactionMap = (rows: ReactionRow[]) => {
  const grouped = new Map<string, Map<string, string[]>>();

  for (const row of rows) {
    const messageBucket = grouped.get(row.message_id) ?? new Map<string, string[]>();
    const userIds = messageBucket.get(row.emoji) ?? [];
    userIds.push(row.user_id);
    messageBucket.set(row.emoji, userIds);
    grouped.set(row.message_id, messageBucket);
  }

  return grouped;
};

export const mapReactionsByMessage = (
  rows: ReactionRow[],
  currentUserId?: string | null,
): Map<string, MessageReaction[]> => {
  const reactionMap = buildReactionMap(rows);
  const output = new Map<string, MessageReaction[]>();

  for (const [messageId, emojiMap] of Array.from(reactionMap.entries())) {
    output.set(
      messageId,
      Array.from(emojiMap.entries()).map(([emoji, userIds]) => ({
        emoji,
        count: userIds.length,
        reactedUserIds: userIds,
        reactedByCurrentUser: currentUserId ? userIds.includes(currentUserId) : false,
      })),
    );
  }

  return output;
};

export const mapSparkSummaryByMessage = (
  rows: SparksTransactionRow[],
  currentUserId?: string | null,
): Map<string, MessageSparkSummary> => {
  const grouped = new Map<
    string,
    {
      sparkCount: number;
      senderIds: Set<string>;
      sparkedByCurrentUser: boolean;
    }
  >();

  for (const row of rows) {
    if (!row.message_id) {
      continue;
    }

    const current = grouped.get(row.message_id) ?? {
      sparkCount: 0,
      senderIds: new Set<string>(),
      sparkedByCurrentUser: false,
    };

    current.sparkCount += row.amount;
    if (row.from_user_id) {
      current.senderIds.add(row.from_user_id);
      if (currentUserId && row.from_user_id === currentUserId) {
        current.sparkedByCurrentUser = true;
      }
    }
    grouped.set(row.message_id, current);
  }

  return new Map(
    Array.from(grouped.entries()).map(([messageId, value]) => [
      messageId,
      {
        sparkCount: value.sparkCount,
        sparkSendersCount: value.senderIds.size,
        sparkedByCurrentUser: value.sparkedByCurrentUser,
      },
    ]),
  );
};

export const mapReplyPreview = (
  row: MessageRow,
  attachments: MessageAttachment[],
): MessageReplyPreview => ({
  id: row.id,
  senderId: row.sender_id,
  content: row.content,
  type: row.type,
  isDeleted: Boolean(row.is_deleted),
  attachments,
});

export const mapMessage = (params: {
  row: MessageRow;
  attachments?: MessageAttachment[];
  reactions?: MessageReaction[];
  replyToMessage?: MessageReplyPreview | null;
  sparkSummary?: MessageSparkSummary | null;
}): TeplaMessage => ({
  id: params.row.id,
  clientMessageId: params.row.client_message_id,
  chatId: params.row.chat_id,
  senderId: params.row.sender_id,
  content: params.row.content,
  contentIv: params.row.content_iv,
  encryptedKeys: params.row.encrypted_keys,
  type: params.row.type,
  replyToMessageId: params.row.reply_to_id,
  replyToId: params.row.reply_to_id,
  replyToMessage: params.replyToMessage ?? null,
  forwardFromId: params.row.forward_from_id,
  forwardFromChatId: params.row.forward_from_chat_id,
  isEdited: Boolean(params.row.is_edited),
  editedAt: params.row.edited_at,
  isDeleted: Boolean(params.row.is_deleted),
  isPinned: Boolean(params.row.is_pinned),
  viewsCount: params.row.views_count ?? 0,
  ttlSeconds: params.row.ttl_seconds,
  expiresAt: params.row.expires_at,
  mediaGroupId: params.row.media_group_id,
  entities: params.row.entities,
  attachments: params.attachments ?? [],
  reactions: params.reactions ?? [],
  sparkCount: params.sparkSummary?.sparkCount ?? params.row.spark_count ?? 0,
  sparkSendersCount:
    params.sparkSummary?.sparkSendersCount ?? params.row.spark_senders_count ?? 0,
  sparkedByCurrentUser: params.sparkSummary?.sparkedByCurrentUser ?? false,
  createdAt: params.row.created_at,
});
