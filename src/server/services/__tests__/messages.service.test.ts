import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock all database repositories
vi.mock("@/server/database/messages.repository", () => ({
  messagesRepository: {
    listByChat: vi.fn(),
    listByIds: vi.fn(),
    findById: vi.fn(),
    findByClientMessageId: vi.fn(),
    insert: vi.fn(),
    update: vi.fn(),
    listPinnedMessages: vi.fn(),
    searchByContent: vi.fn(),
  },
}));

vi.mock("@/server/database/chats.repository", () => ({
  chatsRepository: {
    getMemberRole: vi.fn(),
    listMemberIds: vi.fn(),
  },
}));

vi.mock("@/server/database/files.repository", () => ({
  filesRepository: {
    listByMessageIds: vi.fn().mockResolvedValue([]),
    insertForMessage: vi.fn(),
  },
}));

vi.mock("@/server/database/reactions.repository", () => ({
  reactionsRepository: {
    listByMessageIds: vi.fn().mockResolvedValue([]),
  },
}));

vi.mock("@/server/database/sparks.repository", () => ({
  sparksRepository: {
    listByMessageIds: vi.fn().mockResolvedValue([]),
  },
}));

vi.mock("@/server/sockets/emitter", () => ({
  emitToChat: vi.fn(),
}));

vi.mock("@/server/services/push.service", () => ({
  pushService: {
    notifyUsers: vi.fn(),
  },
}));

const { messagesRepository } = await import("@/server/database/messages.repository");
const { chatsRepository } = await import("@/server/database/chats.repository");
const { emitToChat } = await import("@/server/sockets/emitter");

const makeRow = (overrides: Record<string, unknown> = {}) => ({
  id: "msg-1",
  client_message_id: null,
  chat_id: "chat-1",
  sender_id: "user-1",
  content: "Hello world",
  content_iv: null,
  encrypted_keys: null,
  type: "text",
  reply_to_id: null,
  forward_from_id: null,
  forward_from_chat_id: null,
  is_edited: false,
  edited_at: null,
  is_deleted: false,
  is_pinned: false,
  views_count: 0,
  ttl_seconds: null,
  expires_at: null,
  media_group_id: null,
  spark_count: 0,
  spark_senders_count: 0,
  entities: null,
  created_at: "2026-01-01T00:00:00Z",
  ...overrides,
});

describe("messagesService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("createMessage", () => {
    it("should reject empty messages", async () => {
      const { messagesService } = await import("@/server/services/messages.service");
      vi.mocked(chatsRepository.getMemberRole).mockResolvedValue("member");

      await expect(
        messagesService.createMessage({
          chatId: "chat-1",
          senderId: "user-1",
          content: "   ",
          type: "text",
        }),
      ).rejects.toThrow("Message content or attachment is required.");
    });

    it("should reject non-members", async () => {
      const { messagesService } = await import("@/server/services/messages.service");
      vi.mocked(chatsRepository.getMemberRole).mockResolvedValue(null);

      await expect(
        messagesService.createMessage({
          chatId: "chat-1",
          senderId: "user-1",
          content: "Hello",
          type: "text",
        }),
      ).rejects.toThrow("You do not have access to this chat.");
    });

    it("should reject banned users", async () => {
      const { messagesService } = await import("@/server/services/messages.service");
      vi.mocked(chatsRepository.getMemberRole).mockResolvedValue("banned");

      await expect(
        messagesService.createMessage({
          chatId: "chat-1",
          senderId: "user-1",
          content: "Hello",
          type: "text",
        }),
      ).rejects.toThrow("You do not have access to this chat.");
    });

    it("should create message and emit socket event", async () => {
      const { messagesService } = await import("@/server/services/messages.service");
      const row = makeRow();
      vi.mocked(chatsRepository.getMemberRole).mockResolvedValue("member");
      vi.mocked(chatsRepository.listMemberIds).mockResolvedValue(["user-1", "user-2"]);
      vi.mocked(messagesRepository.insert).mockResolvedValue(row as any);
      vi.mocked(messagesRepository.listByIds).mockResolvedValue([]);

      const result = await messagesService.createMessage({
        chatId: "chat-1",
        senderId: "user-1",
        content: "Hello world",
        type: "text",
      });

      expect(result).toBeDefined();
      expect(result.content).toBe("Hello world");
      expect(messagesRepository.insert).toHaveBeenCalledOnce();
      expect(emitToChat).toHaveBeenCalledWith("chat-1", "message:new", expect.any(Object));
    });

    it("should deduplicate by clientMessageId", async () => {
      const { messagesService } = await import("@/server/services/messages.service");
      const row = makeRow({ client_message_id: "client-1" });
      vi.mocked(chatsRepository.getMemberRole).mockResolvedValue("member");
      vi.mocked(messagesRepository.findByClientMessageId).mockResolvedValue(row as any);
      vi.mocked(messagesRepository.listByIds).mockResolvedValue([]);

      const result = await messagesService.createMessage({
        chatId: "chat-1",
        senderId: "user-1",
        clientMessageId: "client-1",
        content: "Hello",
        type: "text",
      });

      expect(result).toBeDefined();
      expect(messagesRepository.insert).not.toHaveBeenCalled();
    });
  });

  describe("editMessage", () => {
    it("should allow message owner to edit", async () => {
      const { messagesService } = await import("@/server/services/messages.service");
      const row = makeRow();
      const updated = makeRow({ content: "Updated", is_edited: true });
      vi.mocked(messagesRepository.findById).mockResolvedValue(row as any);
      vi.mocked(chatsRepository.getMemberRole).mockResolvedValue("member");
      vi.mocked(messagesRepository.update).mockResolvedValue(updated as any);
      vi.mocked(messagesRepository.listByIds).mockResolvedValue([]);

      const result = await messagesService.editMessage({
        messageId: "msg-1",
        userId: "user-1",
        content: "Updated",
      });

      expect(result.content).toBe("Updated");
      expect(emitToChat).toHaveBeenCalledWith("chat-1", "message:updated", expect.any(Object));
    });

    it("should reject edit from non-owner non-admin", async () => {
      const { messagesService } = await import("@/server/services/messages.service");
      const row = makeRow({ sender_id: "user-other" });
      vi.mocked(messagesRepository.findById).mockResolvedValue(row as any);
      vi.mocked(chatsRepository.getMemberRole).mockResolvedValue("member");

      await expect(
        messagesService.editMessage({
          messageId: "msg-1",
          userId: "user-1",
          content: "Hacked",
        }),
      ).rejects.toThrow("You cannot edit this message.");
    });
  });

  describe("deleteMessage", () => {
    it("should soft-delete and emit event", async () => {
      const { messagesService } = await import("@/server/services/messages.service");
      const row = makeRow();
      vi.mocked(messagesRepository.findById).mockResolvedValue(row as any);
      vi.mocked(chatsRepository.getMemberRole).mockResolvedValue("member");
      vi.mocked(messagesRepository.update).mockResolvedValue(
        makeRow({ is_deleted: true, content: "" }) as any,
      );

      const result = await messagesService.deleteMessage({
        messageId: "msg-1",
        userId: "user-1",
      });

      expect(result.ok).toBe(true);
      expect(messagesRepository.update).toHaveBeenCalledWith("msg-1", {
        is_deleted: true,
        content: "",
        entities: null,
      });
      expect(emitToChat).toHaveBeenCalledWith("chat-1", "message:deleted", {
        chatId: "chat-1",
        messageId: "msg-1",
      });
    });
  });

  describe("setPinnedState", () => {
    it("should reject non-admins", async () => {
      const { messagesService } = await import("@/server/services/messages.service");
      const row = makeRow();
      vi.mocked(messagesRepository.findById).mockResolvedValue(row as any);
      vi.mocked(chatsRepository.getMemberRole).mockResolvedValue("member");

      await expect(
        messagesService.setPinnedState({
          messageId: "msg-1",
          userId: "user-1",
          pinned: true,
        }),
      ).rejects.toThrow("Only chat admins can pin messages.");
    });
  });
});
