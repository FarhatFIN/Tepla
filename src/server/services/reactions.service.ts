import { messagesRepository } from "@/server/database/messages.repository";
import { reactionsRepository } from "@/server/database/reactions.repository";
import { emitToChat } from "@/server/sockets/emitter";
import { mapReactionsByMessage } from "./mappers";

const getHydratedReactions = async (messageId: string, currentUserId?: string | null) => {
  const rows = await reactionsRepository.listByMessageIds([messageId]);
  return mapReactionsByMessage(rows, currentUserId).get(messageId) ?? [];
};

export const reactionsService = {
  async addReaction(payload: { messageId: string; userId: string; emoji: string }) {
    const message = await messagesRepository.findById(payload.messageId);
    if (!message) {
      throw new Error("Message not found.");
    }

    await reactionsRepository.upsert(payload.messageId, payload.userId, payload.emoji);
    const reactions = await getHydratedReactions(payload.messageId, payload.userId);

    emitToChat(message.chat_id, "reaction:changed", {
      chatId: message.chat_id,
      messageId: payload.messageId,
      reactions,
    });

    return reactions;
  },

  async removeReaction(payload: { messageId: string; userId: string; emoji: string }) {
    const message = await messagesRepository.findById(payload.messageId);
    if (!message) {
      throw new Error("Message not found.");
    }

    await reactionsRepository.remove(payload.messageId, payload.userId, payload.emoji);
    const reactions = await getHydratedReactions(payload.messageId, payload.userId);

    emitToChat(message.chat_id, "reaction:changed", {
      chatId: message.chat_id,
      messageId: payload.messageId,
      reactions,
    });

    return reactions;
  },
};
