import type { MessageType } from "@/types/message";
import { chatsRepository } from "@/server/database/chats.repository";
import { filesRepository } from "@/server/database/files.repository";
import { messagesRepository, type MessageRow } from "@/server/database/messages.repository";
import { reactionsRepository } from "@/server/database/reactions.repository";
import { sparksRepository } from "@/server/database/sparks.repository";
import { emitToChat } from "@/server/sockets/emitter";
import {
  asOptionalString,
  ensureString,
  parseLimit,
} from "@/server/validation/validators";
import {
  mapAttachment,
  mapMessage,
  mapReactionsByMessage,
  mapReplyPreview,
  mapSparkSummaryByMessage,
} from "./mappers";
import { pushService } from "./push.service";

const asMessageArrayMap = <TItem extends { id: string }>(
  items: TItem[],
) => new Map(items.map((item) => [item.id, item]));

export const hydrateMessages = async (
  rows: MessageRow[],
  currentUserId?: string | null,
) => {
  if (rows.length === 0) {
    return [];
  }

  const messageIds = rows.map((row) => row.id);
  const replyIds = Array.from(
    new Set(rows.map((row) => row.reply_to_id).filter(Boolean) as string[]),
  );

  const [files, reactions, sparkTransactions, replyRows, replyFiles] = await Promise.all([
    filesRepository.listByMessageIds(messageIds),
    reactionsRepository.listByMessageIds(messageIds),
    sparksRepository.listByMessageIds(messageIds),
    messagesRepository.listByIds(replyIds),
    filesRepository.listByMessageIds(replyIds),
  ]);

  const attachmentsByMessage = new Map<string, ReturnType<typeof mapAttachment>[]>();
  for (const file of files) {
    const existing = attachmentsByMessage.get(file.message_id) ?? [];
    existing.push(mapAttachment(file));
    attachmentsByMessage.set(file.message_id, existing);
  }

  const replyAttachmentsByMessage = new Map<string, ReturnType<typeof mapAttachment>[]>();
  for (const file of replyFiles) {
    const existing = replyAttachmentsByMessage.get(file.message_id) ?? [];
    existing.push(mapAttachment(file));
    replyAttachmentsByMessage.set(file.message_id, existing);
  }

  const replyRowMap = asMessageArrayMap(replyRows);
  const reactionMap = mapReactionsByMessage(reactions, currentUserId);
  const sparkSummaryMap = mapSparkSummaryByMessage(sparkTransactions, currentUserId);

  return rows.map((row) => {
    const replyRow = row.reply_to_id ? replyRowMap.get(row.reply_to_id) ?? null : null;
    return mapMessage({
      row,
      attachments: attachmentsByMessage.get(row.id) ?? [],
      reactions: reactionMap.get(row.id) ?? [],
      sparkSummary: sparkSummaryMap.get(row.id) ?? null,
      replyToMessage: replyRow
        ? mapReplyPreview(
            replyRow,
            replyAttachmentsByMessage.get(replyRow.id) ?? [],
          )
        : null,
    });
  });
};

const ensureChatMember = async (chatId: string, userId: string) => {
  const role = await chatsRepository.getMemberRole(chatId, userId);
  if (!role || role === "banned") {
    throw new Error("You do not have access to this chat.");
  }
  return role;
};

export const messagesService = {
  async listMessages(params: {
    chatId: string;
    userId?: string | null;
    limit?: string | null;
    cursor?: string | null;
  }) {
    if (params.userId) {
      await ensureChatMember(params.chatId, params.userId);
    }

    const limit = parseLimit(params.limit, 30, 100);
    const rows = await messagesRepository.listByChat(
      params.chatId,
      limit + 1,
      params.cursor,
    );
    const visibleRows = rows.filter((row) => !row.is_deleted);
    const hasMore = visibleRows.length > limit;
    const pageRows = visibleRows.slice(0, limit);
    const nextCursor = hasMore ? pageRows[pageRows.length - 1]?.created_at ?? null : null;
    const hydrated = await hydrateMessages(
      [...pageRows].reverse(),
      params.userId ?? null,
    );

    return {
      messages: hydrated,
      nextCursor,
      hasMore,
    };
  },

  async listPinnedMessages(chatId: string, userId?: string | null) {
    if (userId) {
      await ensureChatMember(chatId, userId);
    }

    const rows = await messagesRepository.listPinnedMessages(chatId);
    return hydrateMessages(rows.reverse(), userId ?? null);
  },

  async createMessage(payload: {
    chatId: string;
    senderId: string;
    clientMessageId?: string | null;
    content?: string | null;
    contentIv?: string | null;
    encryptedKeys?: unknown;
    type: MessageType;
    replyToMessageId?: string | null;
    entities?: unknown;
    attachments?: Array<{
      url: string;
      encryptedUrl?: string | null;
      thumbnailUrl?: string | null;
      type?: string | null;
      mimeType?: string | null;
      sizeBytes?: number | null;
      width?: number | null;
      height?: number | null;
      durationSeconds?: number | null;
      fileName?: string | null;
      isSpoiler?: boolean;
    }>;
  }) {
    await ensureChatMember(payload.chatId, payload.senderId);

    if (!payload.content?.trim() && (!payload.attachments || payload.attachments.length === 0)) {
      throw new Error("Message content or attachment is required.");
    }

    if (payload.clientMessageId) {
      const existing = await messagesRepository.findByClientMessageId(
        payload.chatId,
        payload.clientMessageId,
      );

      if (existing) {
        const [hydrated] = await hydrateMessages([existing], payload.senderId);
        return hydrated;
      }
    }

    const row = await messagesRepository.insert({
      clientMessageId: asOptionalString(payload.clientMessageId),
      chatId: payload.chatId,
      senderId: payload.senderId,
      content: payload.content?.trim() ?? "",
      contentIv: payload.contentIv ?? null,
      encryptedKeys: payload.encryptedKeys ?? null,
      type: payload.type,
      replyToMessageId: asOptionalString(payload.replyToMessageId),
      entities: payload.entities ?? null,
    });

    if (payload.attachments?.length) {
      await filesRepository.insertForMessage(
        row.id,
        payload.attachments.map((attachment) => ({
          uploaderId: payload.senderId,
          ...attachment,
        })),
      );
    }

    const [hydrated] = await hydrateMessages([row], payload.senderId);
    emitToChat(payload.chatId, "message:new", {
      chatId: payload.chatId,
      message: hydrated,
    });

    // Fire-and-forget push notifications to offline chat members
    void (async () => {
      try {
        const memberIds = await chatsRepository.listMemberIds(payload.chatId);
        const recipients = memberIds.filter((id) => id !== payload.senderId);
        if (recipients.length === 0) return;

        const preview =
          payload.type === "text"
            ? (payload.content?.slice(0, 100) ?? "New message")
            : `Sent ${payload.type}`;

        await pushService.notifyUsers(recipients, {
          title: "Tepla",
          body: preview,
          url: `/`,
        });
      } catch {
        // Push failure should never block messaging
      }
    })();

    return hydrated;
  },

  async editMessage(payload: {
    messageId: string;
    userId: string;
    content: string;
  }) {
    const existing = await messagesRepository.findById(payload.messageId);
    if (!existing) {
      throw new Error("Message not found.");
    }

    const role = await ensureChatMember(existing.chat_id, payload.userId);
    const canEdit = existing.sender_id === payload.userId || role === "owner" || role === "admin";
    if (!canEdit) {
      throw new Error("You cannot edit this message.");
    }

    const updated = await messagesRepository.update(payload.messageId, {
      content: ensureString(payload.content, "Message content is required."),
      is_edited: true,
      edited_at: new Date().toISOString(),
    });

    const [hydrated] = await hydrateMessages([updated], payload.userId);
    emitToChat(updated.chat_id, "message:updated", {
      chatId: updated.chat_id,
      message: hydrated,
    });

    return hydrated;
  },

  async deleteMessage(payload: {
    messageId: string;
    userId: string;
  }) {
    const existing = await messagesRepository.findById(payload.messageId);
    if (!existing) {
      throw new Error("Message not found.");
    }

    const role = await ensureChatMember(existing.chat_id, payload.userId);
    const canDelete =
      existing.sender_id === payload.userId || role === "owner" || role === "admin";

    if (!canDelete) {
      throw new Error("You cannot delete this message.");
    }

    await messagesRepository.update(payload.messageId, {
      is_deleted: true,
      content: "",
      entities: null,
    });

    emitToChat(existing.chat_id, "message:deleted", {
      chatId: existing.chat_id,
      messageId: payload.messageId,
    });

    return { ok: true };
  },

  async setPinnedState(payload: {
    messageId: string;
    userId: string;
    pinned: boolean;
  }) {
    const existing = await messagesRepository.findById(payload.messageId);
    if (!existing) {
      throw new Error("Message not found.");
    }

    const role = await ensureChatMember(existing.chat_id, payload.userId);
    if (role !== "owner" && role !== "admin") {
      throw new Error("Only chat admins can pin messages.");
    }

    await messagesRepository.update(payload.messageId, {
      is_pinned: payload.pinned,
    });

    const pinnedMessages = await this.listPinnedMessages(existing.chat_id, payload.userId);
    emitToChat(existing.chat_id, "message:pinned", {
      chatId: existing.chat_id,
      pinnedMessages,
    });

    return pinnedMessages;
  },
};
