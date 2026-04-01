import { useEffect, useCallback } from "react";
import { getTeplaSocket } from "@/lib/socket";
import type { TeplaMessage } from "@/types/message";
import { useAuthStore } from "@/stores/auth.store";
import { useChatStore, type LocalMessage } from "@/stores/chat.store";
import { usePresenceStore } from "@/stores/presence.store";
import { useSparksStore } from "@/stores/sparks.store";

export const useSocket = (activeChatId: string | null) => {
  const { setOnline, setTyping } = usePresenceStore();
  const currentUserId = useAuthStore((state) => state.user?.id);

  useEffect(() => {
    const socket = getTeplaSocket();
    const {
      upsertMessage,
      removeMessage,
      setMessageReactions,
      setMessageSparks,
      applyPinnedMessages,
    } = useChatStore.getState();
    const { setBalance } = useSparksStore.getState();

    const toLocalMessage = (message: TeplaMessage): LocalMessage => ({
      ...message,
      localId: message.id,
      status: message.senderId === currentUserId ? "sent" : "delivered",
    });

    const handleConnect = () => {
      if (socket.id) setOnline(socket.id, true);
    };

    const handleDisconnect = () => {
      if (socket.id) setOnline(socket.id, false);
    };

    const handleTyping = (payload: { chatId: string; userId: string }) => {
      setTyping(payload.chatId, payload.userId, true);
      setTimeout(() => {
        setTyping(payload.chatId, payload.userId, false);
      }, 3000);
    };

    const handleMessageNew = (payload: { chatId: string; message: TeplaMessage }) => {
      upsertMessage(payload.chatId, toLocalMessage(payload.message));
    };

    const handleMessageUpdated = (payload: { chatId: string; message: TeplaMessage }) => {
      upsertMessage(payload.chatId, toLocalMessage(payload.message));
    };

    const handleMessageDeleted = (payload: { chatId: string; messageId: string }) => {
      removeMessage(payload.chatId, payload.messageId);
    };

    const handlePinnedMessages = (payload: {
      chatId: string;
      pinnedMessages: TeplaMessage[];
    }) => {
      applyPinnedMessages(
        payload.chatId,
        payload.pinnedMessages.map(toLocalMessage),
      );
    };

    const handleReactionChanged = (payload: {
      chatId: string;
      messageId: string;
      reactions: TeplaMessage["reactions"];
    }) => {
      setMessageReactions(payload.chatId, payload.messageId, payload.reactions);
    };

    const handleMessageSparks = (payload: {
      chatId: string;
      messageId: string;
      sparkCount: number;
      sparkSendersCount: number;
    }) => {
      setMessageSparks(payload.chatId, payload.messageId, {
        sparkCount: payload.sparkCount,
        sparkSendersCount: payload.sparkSendersCount,
      });
    };

    const handleSparksBalance = (payload: { userId: string; balance: number }) => {
      if (payload.userId === currentUserId) {
        setBalance(payload.balance);
      }
    };

    // User profile updated (username, displayName, avatar, etc.)
    const handleUserUpdated = (payload: { userId: string; fields: string[] }) => {
      if (payload.userId === currentUserId) {
        // Re-fetch own profile to sync across devices
        const { updateUser } = useAuthStore.getState();
        fetch(`/api/users/${currentUserId}`)
          .then((r) => r.json())
          .then((data) => { if (data.success) updateUser(data.data); })
          .catch(() => {});
      }
    };

    const handleProfileChanged = (payload: { userId: string; fields: string[] }) => {
      // Another user changed their profile — update cached user data in chats
      const { refreshUserInChats } = useChatStore.getState();
      if (typeof refreshUserInChats === 'function') {
        refreshUserInChats(payload.userId);
      }
    };

    socket.on("connect", handleConnect);
    socket.on("disconnect", handleDisconnect);
    socket.on("typing", handleTyping);
    socket.on("message:new", handleMessageNew);
    socket.on("message:updated", handleMessageUpdated);
    socket.on("message:deleted", handleMessageDeleted);
    socket.on("message:pinned", handlePinnedMessages);
    socket.on("reaction:changed", handleReactionChanged);
    socket.on("message:sparks", handleMessageSparks);
    socket.on("sparks:balance", handleSparksBalance);
    socket.on("user:updated", handleUserUpdated);
    socket.on("user:profile_changed", handleProfileChanged);

    return () => {
      socket.off("connect", handleConnect);
      socket.off("disconnect", handleDisconnect);
      socket.off("typing", handleTyping);
      socket.off("message:new", handleMessageNew);
      socket.off("message:updated", handleMessageUpdated);
      socket.off("message:deleted", handleMessageDeleted);
      socket.off("message:pinned", handlePinnedMessages);
      socket.off("reaction:changed", handleReactionChanged);
      socket.off("message:sparks", handleMessageSparks);
      socket.off("sparks:balance", handleSparksBalance);
      socket.off("user:updated", handleUserUpdated);
      socket.off("user:profile_changed", handleProfileChanged);
    };
  }, [currentUserId, setOnline, setTyping]);

  useEffect(() => {
    if (!currentUserId) {
      return undefined;
    }

    const socket = getTeplaSocket();
    const roomName = `user:${currentUserId}`;
    socket.emit("presence:join", roomName);

    return () => {
      socket.emit("presence:leave", roomName);
    };
  }, [currentUserId]);

  useEffect(() => {
    if (!activeChatId) {
      return undefined;
    }

    const socket = getTeplaSocket();
    socket.emit("presence:join", activeChatId);

    return () => {
      socket.emit("presence:leave", activeChatId);
    };
  }, [activeChatId]);
};

