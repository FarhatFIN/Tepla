"use client";

import { useEffect } from "react";
import { getTeplaSocket } from "@/lib/socket";
import type { TeplaMessage } from "@/types/message";
import { useAuthStore } from "@/stores/auth.store";
import { useChatStore, type LocalMessage } from "@/stores/chat.store";
import { usePresenceStore } from "@/stores/presence.store";
import { useSparksStore } from "@/stores/sparks.store";
import { useCallStore } from "@/stores/call.store";

export const useSocket = (activeChatId: string | null) => {
  const { setOnline, setOffline, setTyping } = usePresenceStore();
  const currentUserId = useAuthStore((state) => state.user?.id);

  useEffect(() => {
    const socket = getTeplaSocket();
    const {
      upsertMessage,
      removeMessage,
      setMessageReactions,
      setMessageSparks,
      applyPinnedMessages,
      updateMessageStatus,
    } = useChatStore.getState();
    const { setBalance } = useSparksStore.getState();

    const toLocalMessage = (message: TeplaMessage): LocalMessage => ({
      ...message,
      localId: message.id,
      status: message.senderId === currentUserId ? "sent" : "delivered",
    });

    const handleConnect = () => {
      if (currentUserId) setOnline(currentUserId);
    };

    const handleDisconnect = () => {
      if (currentUserId) setOffline(currentUserId);
    };

    // ─── Typing ───────────────────────────────
    const handleTyping = (payload: { chatId: string; userId: string }) => {
      setTyping(payload.chatId, payload.userId, true);
      setTimeout(() => {
        setTyping(payload.chatId, payload.userId, false);
      }, 3000);
    };

    // ─── Messages ─────────────────────────────
    const handleMessageNew = (payload: { chatId: string; message: TeplaMessage }) => {
      upsertMessage(payload.chatId, toLocalMessage(payload.message));

      // Send delivery ACK for messages from other users
      if (payload.message.senderId !== currentUserId) {
        socket.emit("message:ack", {
          chatId: payload.chatId,
          messageId: payload.message.id,
          userId: currentUserId ?? "",
        });

        // Auto-mark as read if user is viewing this chat
        if (payload.chatId === activeChatId) {
          socket.emit("message:read", {
            chatId: payload.chatId,
            messageIds: [payload.message.id],
            userId: currentUserId ?? "",
          });
        }
      }
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

    // ─── Delivery & Read Receipts ─────────────
    const handleMessageDelivered = (payload: {
      chatId: string;
      messageId: string;
      userId: string;
    }) => {
      // Update our sent messages to "delivered" status
      const state = useChatStore.getState();
      const thread = state.messagesByChat[payload.chatId] ?? [];
      const msg = thread.find((m) => m.id === payload.messageId);
      if (msg && msg.senderId === currentUserId && msg.status === "sent") {
        updateMessageStatus(payload.chatId, payload.messageId, "delivered");
      }
    };

    const handleMessageRead = (payload: {
      chatId: string;
      messageIds: string[];
      userId: string;
    }) => {
      // Update our sent messages to "read" status (double blue checkmarks)
      if (payload.userId === currentUserId) return; // ignore our own reads
      const state = useChatStore.getState();
      const thread = state.messagesByChat[payload.chatId] ?? [];
      for (const messageId of payload.messageIds) {
        const msg = thread.find((m) => m.id === messageId);
        if (msg && msg.senderId === currentUserId && (msg.status === "sent" || msg.status === "delivered")) {
          updateMessageStatus(payload.chatId, messageId, "read");
        }
      }
    };

    // ─── Reactions & Sparks ───────────────────
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

    // ─── User Profile ─────────────────────────
    const handleUserUpdated = (payload: { userId: string; fields: string[] }) => {
      if (payload.userId === currentUserId) {
        const { updateUser } = useAuthStore.getState();
        fetch(`/api/users/${currentUserId}`)
          .then((r) => r.json())
          .then((data) => { if (data.success) updateUser(data.data); })
          .catch(() => {});
      }
    };

    const handleProfileChanged = (payload: { userId: string; fields: string[] }) => {
      const { refreshUserInChats } = useChatStore.getState();
      if (typeof refreshUserInChats === "function") {
        refreshUserInChats(payload.userId);
      }
    };

    // ─── Presence ─────────────────────────────
    const handlePresenceOnline = (payload: { userId: string; lastSeen: string | null }) => {
      setOnline(payload.userId);
    };

    const handlePresenceOffline = (payload: { userId: string; lastSeen: string }) => {
      setOffline(payload.userId);
      const { setLastSeen } = usePresenceStore.getState();
      setLastSeen(payload.userId, payload.lastSeen);
    };

    // ─── Calls ────────────────────────────────
    const handleCallIncoming = (payload: {
      callId: string;
      chatId: string;
      initiatorId: string;
      initiatorName: string;
      callType: "audio" | "video";
    }) => {
      const { setIncomingCall } = useCallStore.getState();
      setIncomingCall(payload);
    };

    const handleCallEnded = (payload: { callId: string; chatId: string }) => {
      const { endCall } = useCallStore.getState();
      endCall();
    };

    // ─── Register all listeners ───────────────
    socket.on("connect", handleConnect);
    socket.on("disconnect", handleDisconnect);
    socket.on("typing", handleTyping);
    socket.on("message:new", handleMessageNew);
    socket.on("message:updated", handleMessageUpdated);
    socket.on("message:deleted", handleMessageDeleted);
    socket.on("message:pinned", handlePinnedMessages);
    socket.on("message:delivered", handleMessageDelivered);
    socket.on("message:read", handleMessageRead);
    socket.on("reaction:changed", handleReactionChanged);
    socket.on("message:sparks", handleMessageSparks);
    socket.on("sparks:balance", handleSparksBalance);
    socket.on("user:updated", handleUserUpdated);
    socket.on("user:profile_changed", handleProfileChanged);
    socket.on("presence:online", handlePresenceOnline);
    socket.on("presence:offline", handlePresenceOffline);
    socket.on("call:incoming", handleCallIncoming);
    socket.on("call:ended", handleCallEnded);

    return () => {
      socket.off("connect", handleConnect);
      socket.off("disconnect", handleDisconnect);
      socket.off("typing", handleTyping);
      socket.off("message:new", handleMessageNew);
      socket.off("message:updated", handleMessageUpdated);
      socket.off("message:deleted", handleMessageDeleted);
      socket.off("message:pinned", handlePinnedMessages);
      socket.off("message:delivered", handleMessageDelivered);
      socket.off("message:read", handleMessageRead);
      socket.off("reaction:changed", handleReactionChanged);
      socket.off("message:sparks", handleMessageSparks);
      socket.off("sparks:balance", handleSparksBalance);
      socket.off("user:updated", handleUserUpdated);
      socket.off("user:profile_changed", handleProfileChanged);
      socket.off("presence:online", handlePresenceOnline);
      socket.off("presence:offline", handlePresenceOffline);
      socket.off("call:incoming", handleCallIncoming);
      socket.off("call:ended", handleCallEnded);
    };
  }, [activeChatId, currentUserId, setOnline, setOffline, setTyping]);

  // Auto-join user room for personal events
  useEffect(() => {
    if (!currentUserId) return undefined;
    const socket = getTeplaSocket();
    const roomName = `user:${currentUserId}`;
    socket.emit("presence:join", roomName);
    return () => { socket.emit("presence:leave", roomName); };
  }, [currentUserId]);

  // Auto-join active chat room
  useEffect(() => {
    if (!activeChatId) return undefined;
    const socket = getTeplaSocket();
    socket.emit("presence:join", activeChatId);

    // Mark all unread messages as read when opening a chat
    const state = useChatStore.getState();
    const thread = state.messagesByChat[activeChatId] ?? [];
    const unreadIds = thread
      .filter((m) => m.senderId !== currentUserId && m.status !== "read")
      .map((m) => m.id);

    if (unreadIds.length > 0 && currentUserId) {
      socket.emit("message:read", {
        chatId: activeChatId,
        messageIds: unreadIds,
        userId: currentUserId,
      });
    }

    return () => { socket.emit("presence:leave", activeChatId); };
  }, [activeChatId, currentUserId]);
};
