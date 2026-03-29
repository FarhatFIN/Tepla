import { useEffect } from "react";
import useSWR from "swr";
import useSWRInfinite from "swr/infinite";
import { v4 as uuidv4 } from "uuid";
import type { ChatId } from "@/types/chat";
import type { MessageAttachment, MessageReaction, TeplaMessage } from "@/types/message";
import { useChatStore, type LocalMessage } from "@/stores/chat.store";
import { useAuthStore } from "@/stores/auth.store";
import { getTeplaSocket } from "@/lib/socket";
import {
  buildDemoReply,
  DEMO_CURRENT_USER,
  getDemoMessages,
  isDemoChat,
} from "@/lib/demo-data";
import { usePresenceStore } from "@/stores/presence.store";

type MessagesResponse = {
  messages: TeplaMessage[];
  nextCursor: string | null;
  hasMore: boolean;
};

type PinnedMessagesResponse = {
  pinnedMessages: TeplaMessage[];
};

const getAuthHeaders = (): Record<string, string> => {
  const { accessToken } = useAuthStore.getState();
  return accessToken ? { Authorization: `Bearer ${accessToken}` } : {};
};

const fetcher = async <TResponse>(input: RequestInfo, init?: RequestInit) => {
  const response = await fetch(input, {
    ...init,
    headers: { ...init?.headers, ...getAuthHeaders() },
  });
  if (!response.ok) {
    throw new Error("Failed to load messages.");
  }

  return (await response.json()) as TResponse;
};

const toLocalMessage = (
  message: TeplaMessage,
  currentUserId: string,
  status: LocalMessage["status"] = "sent",
): LocalMessage => ({
  ...message,
  localId: message.id,
  status: message.senderId === currentUserId ? status : "delivered",
});

export const useMessages = (chatId: ChatId | null) => {
  const authUser = useAuthStore((state) => state.user);
  const currentUserId = authUser?.id ?? DEMO_CURRENT_USER.id;
  const backendEnabled = Boolean(authUser?.id);
  const demoMode = !backendEnabled || isDemoChat(chatId);
  const {
    messagesByChat,
    pinnedMessagesByChat,
    syncMessages,
    appendMessage,
    replaceOptimistic,
    updateMessageStatus,
    updateMessage,
    removeMessage,
    applyPinnedMessages,
    setMessageReactions,
  } = useChatStore();

  const getMessagesKey = (
    pageIndex: number,
    previousPageData: MessagesResponse | null,
  ) => {
    if (!chatId || demoMode) {
      return null;
    }

    if (pageIndex > 0 && previousPageData && !previousPageData.hasMore) {
      return null;
    }

    const cursor =
      pageIndex === 0 ? null : previousPageData?.nextCursor ?? null;
    const params = new URLSearchParams({
      chatId,
      userId: currentUserId,
      limit: "30",
    });

    if (cursor) {
      params.set("cursor", cursor);
    }

    return `/api/messages?${params.toString()}`;
  };

  const {
    data,
    error,
    isLoading,
    isValidating,
    size,
    setSize,
    mutate,
  } = useSWRInfinite<MessagesResponse>(getMessagesKey, fetcher);

  const { data: pinnedData, mutate: mutatePinned } = useSWR<PinnedMessagesResponse>(
    chatId && !demoMode
      ? `/api/chats/${chatId}/pins?userId=${encodeURIComponent(currentUserId)}`
      : null,
    fetcher,
  );

  useEffect(() => {
    if (!chatId) {
      return;
    }

    if (demoMode) {
      const hydrated = getDemoMessages(chatId).map((message) =>
        toLocalMessage(message, currentUserId),
      );
      syncMessages(chatId, hydrated);
      applyPinnedMessages(
        chatId,
        hydrated.filter((message) => message.isPinned),
      );
      return;
    }

    if (!data) {
      return;
    }

    const flattened = [...data]
      .reverse()
      .flatMap((page) => page.messages)
      .map((message) => toLocalMessage(message, currentUserId));

    syncMessages(chatId, flattened);
  }, [applyPinnedMessages, chatId, currentUserId, data, demoMode, syncMessages]);

  useEffect(() => {
    if (!chatId || demoMode || !pinnedData) {
      return;
    }

    applyPinnedMessages(
      chatId,
      pinnedData.pinnedMessages.map((message) => toLocalMessage(message, currentUserId)),
    );
  }, [applyPinnedMessages, chatId, currentUserId, demoMode, pinnedData]);

  const emitTyping = (targetChatId: ChatId, draft: string) => {
    if (!draft.trim()) {
      return;
    }

    try {
      const socket = getTeplaSocket();
      socket.emit("typing", {
        chatId: targetChatId,
        userId: currentUserId,
      });
    } catch {
      // Local/demo mode works without an active socket connection.
    }
  };

  const sendMessage = async (params: {
    chatId: ChatId;
    encryptedContent?: string;
    contentIv?: string;
    encryptedKeys?: unknown;
    type: TeplaMessage["type"];
    replyToMessageId?: string | null;
    entities?: unknown;
    attachments?: MessageAttachment[];
  }) => {
    const localId = uuidv4();
    const clientMessageId = uuidv4();
    const now = new Date().toISOString();
    const sourceThread = messagesByChat[params.chatId] ?? [];
    const replyToMessage =
      params.replyToMessageId
        ? sourceThread.find((message) => message.id === params.replyToMessageId) ?? null
        : null;

    const optimistic: LocalMessage = {
      id: localId,
      clientMessageId,
      localId,
      chatId: params.chatId,
      senderId: currentUserId,
      content: params.encryptedContent?.trim() ?? "",
      contentIv: params.contentIv ?? null,
      encryptedKeys: params.encryptedKeys ?? {},
      type: params.type,
      replyToMessageId: params.replyToMessageId ?? null,
      replyToId: params.replyToMessageId ?? null,
      replyToMessage: replyToMessage
        ? {
            id: replyToMessage.id,
            senderId: replyToMessage.senderId,
            content: replyToMessage.content,
            type: replyToMessage.type,
            isDeleted: replyToMessage.isDeleted,
            attachments: replyToMessage.attachments,
          }
        : null,
      forwardFromId: null,
      forwardFromChatId: null,
      isEdited: false,
      editedAt: null,
      isDeleted: false,
      isPinned: false,
      viewsCount: 0,
      ttlSeconds: null,
      expiresAt: null,
      mediaGroupId: null,
      entities: params.entities ?? null,
      attachments: params.attachments ?? [],
      reactions: [],
      sparkCount: 0,
      sparkSendersCount: 0,
      sparkedByCurrentUser: false,
      createdAt: now,
      status: "sending",
    };

    appendMessage(params.chatId, optimistic);

    if (isDemoChat(params.chatId) || !backendEnabled) {
      await new Promise((resolve) => {
        setTimeout(resolve, 160);
      });

      const finalMessageId = `demo-local-${uuidv4()}`;
      replaceOptimistic(params.chatId, localId, {
        ...optimistic,
        id: finalMessageId,
        localId: finalMessageId,
        status: "sent",
      });

      const reply = buildDemoReply(
        params.chatId,
        params.encryptedContent?.trim() ?? "Voice message",
      );

      if (reply) {
        const companionId = reply.senderId ?? "demo-companion";
        const { setTyping } = usePresenceStore.getState();
        setTyping(params.chatId, companionId, true);

        setTimeout(() => {
          setTyping(params.chatId, companionId, false);
          const replyId = `${reply.id}-${uuidv4()}`;
          appendMessage(params.chatId, {
            ...reply,
            id: replyId,
            localId: replyId,
            status: "delivered",
            createdAt: new Date().toISOString(),
          });
        }, 900);
      }

      return;
    }

    try {
      const response = await fetch("/api/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...getAuthHeaders() },
        body: JSON.stringify({
          chatId: params.chatId,
          senderId: currentUserId,
          clientMessageId,
          content: params.encryptedContent?.trim() ?? "",
          contentIv: params.contentIv ?? null,
          encryptedKeys: params.encryptedKeys ?? {},
          type: params.type,
          replyToMessageId: params.replyToMessageId ?? null,
          entities: params.entities ?? null,
          attachments: params.attachments ?? [],
        }),
      });

      if (!response.ok) {
        const body = await response.json().catch(() => null);
        throw new Error(body?.error ?? "Failed to send message.");
      }

      const payload = (await response.json()) as { message: TeplaMessage };
      replaceOptimistic(
        params.chatId,
        localId,
        toLocalMessage(payload.message, currentUserId, "sent"),
      );
    } catch {
      updateMessageStatus(params.chatId, localId, "error");
      throw new Error("Failed to send message.");
    }
  };

  const editMessage = async (messageId: string, content: string) => {
    if (!chatId) {
      return;
    }

    if (demoMode) {
      updateMessage(chatId, messageId, (message) => ({
        ...message,
        content: content.trim(),
        isEdited: true,
        editedAt: new Date().toISOString(),
      }));
      return;
    }

    const response = await fetch(`/api/messages/${messageId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", ...getAuthHeaders() },
      body: JSON.stringify({
        content: content.trim(),
      }),
    });

    if (!response.ok) {
      const body = await response.json().catch(() => null);
      throw new Error(body?.error ?? "Failed to edit message.");
    }

    const payload = (await response.json()) as { message: TeplaMessage };
    updateMessage(chatId, messageId, () => toLocalMessage(payload.message, currentUserId));
    await mutate();
  };

  const deleteMessage = async (messageId: string) => {
    if (!chatId) {
      return;
    }

    if (demoMode) {
      removeMessage(chatId, messageId);
      return;
    }

    const response = await fetch(`/api/messages/${messageId}`, {
      method: "DELETE",
      headers: { ...getAuthHeaders() },
    });

    if (!response.ok) {
      const body = await response.json().catch(() => null);
      throw new Error(body?.error ?? "Failed to delete message.");
    }

    removeMessage(chatId, messageId);
    await mutate();
    await mutatePinned();
  };

  const togglePinMessage = async (messageId: string, pinned: boolean) => {
    if (!chatId) {
      return;
    }

    if (demoMode) {
      const thread = messagesByChat[chatId] ?? [];
      const nextPinned = thread
        .map((message) => ({
          ...message,
          isPinned: message.id === messageId ? pinned : message.isPinned,
        }))
        .filter((message) => message.isPinned);

      applyPinnedMessages(chatId, nextPinned);
      return;
    }

    const response = await fetch(`/api/messages/${messageId}/pin`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...getAuthHeaders() },
      body: JSON.stringify({
        pinned,
      }),
    });

    if (!response.ok) {
      const body = await response.json().catch(() => null);
      throw new Error(body?.error ?? "Failed to update pinned messages.");
    }

    const payload = (await response.json()) as { pinnedMessages: TeplaMessage[] };
    applyPinnedMessages(
      chatId,
      payload.pinnedMessages.map((message) => toLocalMessage(message, currentUserId)),
    );
    await mutatePinned();
  };

  const toggleReaction = async (messageId: string, emoji: string, hasReacted: boolean) => {
    if (!chatId) {
      return;
    }

    const requestInit: RequestInit = hasReacted
      ? {
          method: "DELETE",
          headers: { ...getAuthHeaders() },
        }
      : {
          method: "POST",
          headers: { "Content-Type": "application/json", ...getAuthHeaders() },
          body: JSON.stringify({
            messageId,
            emoji,
          }),
        };

    const requestUrl = hasReacted
      ? `/api/reactions?messageId=${encodeURIComponent(messageId)}&emoji=${encodeURIComponent(emoji)}`
      : "/api/reactions";

    const response = await fetch(requestUrl, requestInit);
    if (!response.ok) {
      const body = await response.json().catch(() => null);
      throw new Error(body?.error ?? "Failed to update reaction.");
    }

    const payload = (await response.json()) as { reactions: MessageReaction[] };
    setMessageReactions(chatId, messageId, payload.reactions);
  };

  const loadOlder = async () => {
    const oldestPage = data?.[data.length - 1];
    if (!oldestPage?.hasMore || isValidating) {
      return;
    }

    await setSize(size + 1);
  };

  const demoThread =
    chatId && demoMode
      ? getDemoMessages(chatId).map((message) => toLocalMessage(message, currentUserId))
      : [];

  const thread = chatId ? messagesByChat[chatId] ?? demoThread : [];
  const pinnedMessages = chatId ? pinnedMessagesByChat[chatId] ?? [] : [];
  const oldestPage = data?.[data.length - 1];

  return {
    messages: thread,
    pinnedMessages,
    isLoading: demoMode ? false : isLoading,
    isLoadingOlder: Boolean(!demoMode && size > 1 && isValidating),
    hasMore: demoMode ? false : Boolean(oldestPage?.hasMore),
    error,
    currentUserId,
    demoMode,
    sendMessage,
    sendTyping: emitTyping,
    editMessage,
    deleteMessage,
    togglePinMessage,
    toggleReaction,
    loadOlder,
    refreshMessages: mutate,
  };
};
