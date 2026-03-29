import { chatsRepository } from "@/server/database/chats.repository";
import { messagesRepository } from "@/server/database/messages.repository";
import { subscriptionsService } from "@/server/services/subscriptions.service";
import type { ChatRole } from "@/types/chat";
import {
  assertValidUsername,
  asOptionalString,
  ensureString,
} from "@/server/validation/validators";
import { mapChat } from "./mappers";

export const chatsService = {
  async ensureCreationLimit(userId: string, type: "group" | "channel") {
    const premiumState = await subscriptionsService.getPremiumState(userId);
    const currentCount = await chatsRepository.countCreatedChatsByType(userId, type);
    const limit =
      type === "group" ? premiumState.limits.groups : premiumState.limits.channels;

    if (currentCount >= limit) {
      throw new Error(
        `${type === "group" ? "Group" : "Channel"} limit reached. Your current limit is ${limit}.`,
      );
    }
  },

  async listChats(userId: string) {
    const [memberships, favoriteChatIds] = await Promise.all([
      chatsRepository.listMemberships(userId),
      chatsRepository.listFavoriteChatIds(userId),
    ]);
    const favoriteChatIdSet = new Set(favoriteChatIds);

    const chats = await Promise.all(
      memberships
        .filter((membership) => membership.chats)
        .map(async (membership) => {
          const chatRow = membership.chats!;
          const [lastMessage] = await messagesRepository.listByChat(chatRow.id, 1);
          return {
            ...mapChat(
              chatRow,
              membership.role as ChatRole,
              favoriteChatIdSet.has(chatRow.id),
            ),
            lastMessage: lastMessage
              ? {
                  id: lastMessage.id,
                  content: lastMessage.content,
                  type: lastMessage.type,
                  createdAt: lastMessage.created_at,
                  isDeleted: Boolean(lastMessage.is_deleted),
                }
              : null,
          };
        }),
    );

    return chats.sort((left, right) => {
      if (Boolean(left.isFavorite) !== Boolean(right.isFavorite)) {
        return left.isFavorite ? -1 : 1;
      }

      const leftDate = left.lastMessage?.createdAt ?? left.createdAt;
      const rightDate = right.lastMessage?.createdAt ?? right.createdAt;
      return new Date(rightDate).getTime() - new Date(leftDate).getTime();
    });
  },

  async createGroup(payload: {
    userId: string;
    name: string;
    username?: string | null;
    description?: string | null;
    memberIds?: string[];
  }) {
    await this.ensureCreationLimit(payload.userId, "group");

    const chat = await chatsRepository.createChat({
      type: "group",
      name: ensureString(payload.name, "Group name is required."),
      username: payload.username ? assertValidUsername(payload.username) : null,
      description: asOptionalString(payload.description),
      createdBy: payload.userId,
    });

    const memberIds = Array.from(
      new Set([payload.userId, ...(payload.memberIds ?? []).filter(Boolean)]),
    );

    await chatsRepository.addMembers(
      chat.id,
      memberIds.map((memberId) => ({
        userId: memberId,
        role: memberId === payload.userId ? "owner" : "member",
      })),
    );
    await chatsRepository.updateMembersCount(chat.id);

    return mapChat(
      {
        ...chat,
        members_count: memberIds.length,
      },
      "owner",
    );
  },

  async createChannel(payload: {
    userId: string;
    name: string;
    username?: string | null;
    description?: string | null;
  }) {
    await this.ensureCreationLimit(payload.userId, "channel");

    const chat = await chatsRepository.createChat({
      type: "channel",
      name: ensureString(payload.name, "Channel name is required."),
      username: payload.username ? assertValidUsername(payload.username) : null,
      description: asOptionalString(payload.description),
      createdBy: payload.userId,
      isPublic: true,
    });

    await chatsRepository.addMembers(chat.id, [
      { userId: payload.userId, role: "owner" },
    ]);
    await chatsRepository.updateMembersCount(chat.id);

    return mapChat(
      {
        ...chat,
        members_count: 1,
      },
      "owner",
    );
  },

  async ensureDirectChat(payload: {
    userId: string;
    peerUserId: string;
    peerUsername?: string | null;
    peerDisplayName?: string | null;
  }) {
    if (payload.userId === payload.peerUserId) {
      throw new Error("You already have a saved chat with yourself.");
    }

    const existing = await chatsRepository.findDirectChatBetweenUsers(
      payload.userId,
      payload.peerUserId,
    );

    if (existing) {
      return mapChat(existing.chat, existing.leftRole as ChatRole);
    }

    const chat = await chatsRepository.createChat({
      type: "direct",
      name:
        payload.peerDisplayName?.trim() ||
        (payload.peerUsername ? `@${payload.peerUsername}` : "Direct chat"),
      username: null,
      description: null,
      createdBy: payload.userId,
    });

    await chatsRepository.addMembers(chat.id, [
      { userId: payload.userId, role: "member" },
      { userId: payload.peerUserId, role: "member" },
    ]);
    await chatsRepository.updateMembersCount(chat.id);

    return mapChat(
      {
        ...chat,
        members_count: 2,
      },
      "member",
    );
  },

  async addMembers(payload: {
    chatId: string;
    requesterId: string;
    memberIds: string[];
  }) {
    const role = await chatsRepository.getMemberRole(payload.chatId, payload.requesterId);
    if (role !== "owner" && role !== "admin") {
      throw new Error("Only chat admins can add members.");
    }

    await chatsRepository.addMembers(
      payload.chatId,
      payload.memberIds.map((memberId) => ({
        userId: memberId,
        role: "member",
      })),
    );
    await chatsRepository.updateMembersCount(payload.chatId);

    const chat = await chatsRepository.findById(payload.chatId);
    if (!chat) {
      throw new Error("Chat not found.");
    }

    return mapChat(chat, role);
  },

  async toggleFavoriteChat(payload: {
    chatId: string;
    userId: string;
    favorite: boolean;
  }) {
    const role = await chatsRepository.getMemberRole(payload.chatId, payload.userId);
    if (!role || role === "banned") {
      throw new Error("You do not have access to this chat.");
    }

    if (payload.favorite) {
      await chatsRepository.addFavoriteChat(payload.userId, payload.chatId);
    } else {
      await chatsRepository.removeFavoriteChat(payload.userId, payload.chatId);
    }

    return {
      chatId: payload.chatId,
      isFavorite: payload.favorite,
    };
  },
};
