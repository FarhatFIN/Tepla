"use client";
import { create } from "zustand";
import { Chat, Message, ChatFolder, UserStories } from "@/types";
import { mockFolders, mockStories } from "@/lib/mock-data";
import api from "@/lib/api";
import { getSocket } from "@/lib/socket";
import { useAuthStore } from "@/stores/auth-store";
import { translateText } from "@/lib/translate";

interface ChatState {
  chats: Chat[];
  messages: Record<string, Message[]>;
  activeChatId: string | null;
  activeThreadId: string | null;
  folders: ChatFolder[];
  activeFolderId: string | null;
  stories: UserStories[];
  searchQuery: string;
  replyingTo: Message | null;
  editingMessage: Message | null;
  showProfile: boolean;
  showStickers: boolean;
  showCalls: boolean;
  callType: "voice" | "video";
  showSettings: boolean;
  showPremium: boolean;
  showWallet: boolean;
  showWBIT: boolean;
  showThread: boolean;
  _socketBound: boolean;

  setActiveChat: (chatId: string | null) => void;
  setActiveFolder: (folderId: string | null) => void;
  setSearchQuery: (q: string) => void;
  setReplyingTo: (msg: Message | null) => void;
  setEditingMessage: (msg: Message | null) => void;
  toggleProfile: () => void;
  toggleStickers: () => void;
  toggleCalls: (type?: "voice" | "video") => void;
  toggleSettings: () => void;
  togglePremium: () => void;
  toggleWallet: () => void;
  toggleWBIT: () => void;
  toggleThread: () => void;
  sendMessage: (chatId: string, text: string, type?: string, attachments?: any[]) => void;
  forwardMessage: (messageId: string, toChatId: string) => void;
  addReaction: (chatId: string, messageId: string, emoji: string) => void;
  markAsRead: (chatId: string) => void;
  pinMessage: (chatId: string, messageId: string) => void;
  deleteMessage: (chatId: string, messageId: string) => void;
  toggleTranslation: (chatId: string) => void;
  viewStory: (storyId: string) => void;
  loadChats: () => Promise<void>;
  loadMessages: (chatId: string) => Promise<void>;
  bindSocket: () => void;
  getDraft: (chatId: string) => string;
  setDraft: (chatId: string, text: string) => void;
}

// ─── Backend → Frontend mappers ─────────────────────────

function mapBackendChat(raw: any): Chat {
  return {
    id: raw.id,
    type: raw.type || "direct",
    name: raw.name || raw.display_name || "Chat",
    avatar: raw.avatar_url,
    description: raw.description,
    unreadCount: raw.unread_count || 0,
    isPinned: raw.is_pinned || false,
    isMuted: raw.is_muted || false,
    isArchived: raw.is_archived || false,
    membersCount: raw.members_count,
    lastMessage: raw.last_message ? {
      text: raw.last_message.content || raw.last_message.text || "",
      senderId: raw.last_message.sender_id || raw.last_message.senderId || "",
      timestamp: formatTime(raw.last_message.created_at || raw.last_message.timestamp),
      type: raw.last_message.type || "text",
    } : undefined,
    user: raw.other_user ? {
      id: raw.other_user.id,
      name: raw.other_user.display_name || raw.other_user.username || "User",
      username: raw.other_user.username,
      avatar: raw.other_user.avatar_url,
      status: raw.other_user.is_online ? "online" : "offline",
      lastSeen: raw.other_user.last_seen,
    } : undefined,
  };
}

function mapBackendMessage(raw: any): Message {
  return {
    id: raw.id,
    chatId: raw.chat_id || raw.chatId,
    senderId: raw.sender_id || raw.senderId,
    senderName: raw.sender_name || raw.senderName,
    text: raw.content || raw.text || "",
    type: raw.type || "text",
    timestamp: formatTime(raw.created_at || raw.createdAt || raw.timestamp),
    date: formatDate(raw.created_at || raw.createdAt || raw.timestamp),
    status: raw.status || "sent",
    isEdited: raw.is_edited || false,
    isPinned: raw.is_pinned || false,
    replyTo: raw.reply_to ? {
      id: raw.reply_to.id,
      senderId: raw.reply_to.sender_id,
      senderName: raw.reply_to.sender_name || "",
      text: raw.reply_to.content || "",
      type: raw.reply_to.type || "text",
    } : undefined,
    reactions: raw.reactions?.map((r: any) => ({
      emoji: r.emoji,
      count: r.count || 1,
      users: r.users || [r.user_id],
      myReaction: r.my_reaction || false,
    })),
    attachments: raw.attachments?.map((a: any) => ({
      id: a.id,
      type: a.type,
      url: a.url || a.file_url,
      thumbnailUrl: a.thumbnail_url,
      fileName: a.file_name,
      fileSize: a.file_size,
      mimeType: a.mime_type,
      duration: a.duration,
      width: a.width,
      height: a.height,
    })),
  };
}

function formatTime(iso: string | undefined): string {
  if (!iso) return "";
  try {
    return new Date(iso).toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" });
  } catch { return ""; }
}

function formatDate(iso: string | undefined): string {
  if (!iso) return new Date().toISOString().split("T")[0];
  try {
    return new Date(iso).toISOString().split("T")[0];
  } catch { return ""; }
}

// ─── Store ──────────────────────────────────────────────

let pendingMessages = new Set<string>(); // clientMessageIds to deduplicate socket echos

export const useChatStore = create<ChatState>((set, get) => ({
  chats: [],
  messages: {},
  activeChatId: null,
  activeThreadId: null,
  folders: mockFolders,
  activeFolderId: null,
  stories: mockStories,
  searchQuery: "",
  replyingTo: null,
  editingMessage: null,
  showProfile: false,
  showStickers: false,
  showCalls: false,
  callType: "voice" as const,
  showSettings: false,
  showPremium: false,
  showWallet: false,
  showWBIT: false,
  showThread: false,
  _socketBound: false,

  // ─── Load chats from API ────────────────────────
  loadChats: async () => {
    try {
      const res = await api.get<{ success: boolean; data: any[] }>("/chats");
      const chats = res.data.map(mapBackendChat);
      set({ chats });
    } catch (err: any) {
      // Warn instead of error to avoid triggering Next.js dev error overlay
      console.warn("[chat-store] loadChats failed:", err?.message || err);
    }
  },

  // ─── Load messages for a chat ───────────────────
  loadMessages: async (chatId: string) => {
    // Don't re-fetch if we already have messages
    if (get().messages[chatId]?.length) return;
    try {
      const res = await api.get<{ success: boolean; data: any[]; meta: any }>(
        `/messages?chatId=${chatId}&limit=50`
      );
      const messages = res.data.map(mapBackendMessage);
      set((s) => ({ messages: { ...s.messages, [chatId]: messages } }));
    } catch (err: any) {
      console.warn("[chat-store] loadMessages failed:", err?.message || err);
    }
  },

  // ─── Bind socket events ────────────────────────
  bindSocket: () => {
    if (get()._socketBound) return;
    const socket = getSocket();
    if (!socket) return;

    set({ _socketBound: true });

    // New message from another user (or echo of own)
    socket.on("message:new", (data: { chatId: string; message: any }) => {
      const msg = mapBackendMessage({ ...data.message, chat_id: data.chatId });
      const myId = useAuthStore.getState().user?.id;

      // Deduplicate own messages that were optimistically added
      if (pendingMessages.has(msg.id)) {
        pendingMessages.delete(msg.id);
        // Update status from "sending" to "sent"
        set((s) => ({
          messages: {
            ...s.messages,
            [data.chatId]: (s.messages[data.chatId] || []).map((m) =>
              m.id === msg.id ? { ...m, status: "sent" } : m
            ),
          },
        }));
        return;
      }

      // Skip own messages that somehow weren't tracked (double safety)
      if (msg.senderId === myId && (s => s.messages[data.chatId]?.some(m => m.text === msg.text && m.status === "sending"))(get())) {
        return;
      }

      // Add incoming message
      set((s) => ({
        messages: {
          ...s.messages,
          [data.chatId]: [...(s.messages[data.chatId] || []), msg],
        },
        chats: s.chats.map((c) =>
          c.id === data.chatId
            ? {
                ...c,
                lastMessage: { text: msg.text, senderId: msg.senderId, timestamp: msg.timestamp, type: msg.type },
                unreadCount: s.activeChatId === data.chatId ? 0 : (c.unreadCount || 0) + 1,
              }
            : c
        ),
      }));

      // Auto-translate if enabled for this chat
      const chatObj = get().chats.find((c) => c.id === data.chatId);
      if (chatObj?.autoTranslate && msg.type === "text" && msg.text.trim()) {
        const lang = useAuthStore.getState().language || "ru";
        translateText(msg.text, lang).then((translated) => {
          if (translated && translated !== msg.text) {
            set((s) => ({
              messages: {
                ...s.messages,
                [data.chatId]: (s.messages[data.chatId] || []).map((m) =>
                  m.id === msg.id ? { ...m, translatedText: translated, translatedLang: lang } : m
                ),
              },
            }));
          }
        });
      }

      // Join room if we aren't in it yet
      socket.emit("presence:join", data.chatId);
    });

    socket.on("message:updated", (data: { chatId: string; messageId: string; content: string }) => {
      set((s) => ({
        messages: {
          ...s.messages,
          [data.chatId]: (s.messages[data.chatId] || []).map((m) =>
            m.id === data.messageId ? { ...m, text: data.content, isEdited: true } : m
          ),
        },
      }));
    });

    socket.on("message:deleted", (data: { chatId: string; messageId: string }) => {
      set((s) => ({
        messages: {
          ...s.messages,
          [data.chatId]: (s.messages[data.chatId] || []).filter((m) => m.id !== data.messageId),
        },
      }));
    });

    socket.on("message:pinned", (data: { chatId: string; messageId: string }) => {
      set((s) => ({
        messages: {
          ...s.messages,
          [data.chatId]: (s.messages[data.chatId] || []).map((m) =>
            m.id === data.messageId ? { ...m, isPinned: true } : m
          ),
        },
      }));
    });

    socket.on("message:unpinned", (data: { chatId: string; messageId: string }) => {
      set((s) => ({
        messages: {
          ...s.messages,
          [data.chatId]: (s.messages[data.chatId] || []).map((m) =>
            m.id === data.messageId ? { ...m, isPinned: false } : m
          ),
        },
      }));
    });

    socket.on("message:read", (data: { chatId: string; messageIds: string[]; readBy: string }) => {
      const myId = useAuthStore.getState().user?.id;
      // Update status of my messages that were read by others
      if (data.readBy !== myId) {
        set((s) => ({
          messages: {
            ...s.messages,
            [data.chatId]: (s.messages[data.chatId] || []).map((m) =>
              data.messageIds.includes(m.id) && m.senderId === myId
                ? { ...m, status: "read" as const }
                : m
            ),
          },
        }));
      }
    });

    socket.on("message:delivered", (data: { chatId: string; messageIds: string[]; deliveredTo: string }) => {
      const myId = useAuthStore.getState().user?.id;
      if (data.deliveredTo !== myId) {
        set((s) => ({
          messages: {
            ...s.messages,
            [data.chatId]: (s.messages[data.chatId] || []).map((m) =>
              data.messageIds.includes(m.id) && m.senderId === myId && m.status !== "read"
                ? { ...m, status: "delivered" as const }
                : m
            ),
          },
        }));
      }
    });

    socket.on("typing", (data: { chatId: string; userId: string }) => {
      set((s) => ({
        chats: s.chats.map((c) =>
          c.id === data.chatId
            ? { ...c, typing: [...new Set([...(c.typing || []), data.userId])] }
            : c
        ),
      }));
      // Clear typing after 3s
      setTimeout(() => {
        set((s) => ({
          chats: s.chats.map((c) =>
            c.id === data.chatId
              ? { ...c, typing: (c.typing || []).filter((u) => u !== data.userId) }
              : c
          ),
        }));
      }, 3000);
    });

    socket.on("chats:updated", () => {
      get().loadChats();
    });
  },

  setActiveChat: (chatId) => {
    set({ activeChatId: chatId, showProfile: false, showThread: false, replyingTo: null, editingMessage: null });
    if (chatId) {
      get().markAsRead(chatId);
      get().loadMessages(chatId);
      // Join the chat room for real-time events
      const socket = getSocket();
      if (socket) socket.emit("presence:join", chatId);
    }
  },

  setActiveFolder: (folderId) => set({ activeFolderId: folderId }),
  setSearchQuery: (q) => set({ searchQuery: q }),
  setReplyingTo: (msg) => set({ replyingTo: msg, editingMessage: null }),
  setEditingMessage: (msg) => set({ editingMessage: msg, replyingTo: null }),
  toggleProfile: () => set((s) => ({ showProfile: !s.showProfile })),
  toggleStickers: () => set((s) => ({ showStickers: !s.showStickers })),
  toggleCalls: (type) => set((s) => ({ showCalls: !s.showCalls, callType: type || s.callType })),
  toggleSettings: () => set((s) => ({ showSettings: !s.showSettings })),
  togglePremium: () => set((s) => ({ showPremium: !s.showPremium })),
  toggleWallet: () => set((s) => ({ showWallet: !s.showWallet })),
  toggleWBIT: () => set((s) => ({ showWBIT: !s.showWBIT })),
  toggleThread: () => set((s) => ({ showThread: !s.showThread })),

  // ─── Send message with optional attachments via API ──────────────────────
  sendMessage: (chatId, text, type = "text", attachments?: any[]) => {
    const now = new Date();
    const tempId = `tmp-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const replyingTo = get().replyingTo;
    const authUser = useAuthStore.getState().user;
    const currentUserId = authUser?.id || "me";

    // Optimistic add
    const optimistic: Message = {
      id: tempId,
      chatId,
      senderId: currentUserId,
      senderName: authUser?.name || "",
      text,
      type: type as Message["type"],
      timestamp: now.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" }),
      date: now.toISOString().split("T")[0],
      status: "sending",
      attachments: attachments || undefined,
      replyTo: replyingTo ? {
        id: replyingTo.id,
        senderId: replyingTo.senderId,
        senderName: replyingTo.senderName || "",
        text: replyingTo.text,
        type: replyingTo.type,
      } : undefined,
    };

    set((s) => ({
      messages: { ...s.messages, [chatId]: [...(s.messages[chatId] || []), optimistic] },
      chats: s.chats.map((c) =>
        c.id === chatId
          ? { ...c, lastMessage: { text, senderId: currentUserId, timestamp: optimistic.timestamp, type: optimistic.type }, unreadCount: 0 }
          : c
      ),
      replyingTo: null,
      editingMessage: null,
    }));

    // Send to API
    api
      .post<{ success: boolean; data: any }>("/messages", {
        chatId,
        content: text,
        type,
        replyToId: replyingTo?.id || undefined,
        attachments: attachments || undefined,
      })
      .then((res) => {
        const real = res.data;
        // Track server ID so socket echo is deduplicated
        pendingMessages.add(real.id);
        // Replace temp message with real one
        set((s) => ({
          messages: {
            ...s.messages,
            [chatId]: (s.messages[chatId] || []).map((m) =>
              m.id === tempId
                ? { ...m, id: real.id, status: "sent" as const }
                : m
            ),
          },
        }));
      })
      .catch((err) => {
        console.warn("[chat-store] sendMessage failed:", err);
        // Mark as failed
        set((s) => ({
          messages: {
            ...s.messages,
            [chatId]: (s.messages[chatId] || []).map((m) =>
              m.id === tempId ? { ...m, status: "failed" as const } : m
            ),
          },
        }));
      });
  },

  addReaction: (chatId, messageId, emoji) => {
    set((s) => ({
      messages: {
        ...s.messages,
        [chatId]: (s.messages[chatId] || []).map((m) => {
          if (m.id !== messageId) return m;
          const reactions = [...(m.reactions || [])];
          const existing = reactions.find((r) => r.emoji === emoji);
          if (existing) {
            if (existing.myReaction) { existing.count--; existing.myReaction = false; existing.users = existing.users.filter((u) => u !== "me"); }
            else { existing.count++; existing.myReaction = true; existing.users.push("me"); }
          } else { reactions.push({ emoji, count: 1, users: ["me"], myReaction: true }); }
          return { ...m, reactions: reactions.filter((r) => r.count > 0) };
        }),
      },
    }));
  },

  markAsRead: (chatId) => {
    set((s) => ({ chats: s.chats.map((c) => c.id === chatId ? { ...c, unreadCount: 0 } : c) }));
    // Notify server
    api.post("/messages/read", { chatId }).catch((err) =>
      console.warn("[chat-store] markAsRead failed:", err)
    );
  },

  forwardMessage: (messageId, toChatId) => {
    api.post("/messages/forward", { messageId, toChatId })
      .then(() => {
        // Message will arrive via socket event
      })
      .catch((err) => console.warn("[chat-store] forwardMessage failed:", err));
  },

  pinMessage: (chatId, messageId) => {
    // Optimistic toggle
    set((s) => ({
      messages: { ...s.messages, [chatId]: (s.messages[chatId] || []).map((m) => m.id === messageId ? { ...m, isPinned: !m.isPinned } : m) },
    }));
    // API call
    api.patch(`/messages/${messageId}/pin`).catch((err) =>
      console.warn("[chat-store] pinMessage failed:", err)
    );
  },

  deleteMessage: (chatId, messageId) => {
    // Optimistic remove
    set((s) => ({
      messages: { ...s.messages, [chatId]: (s.messages[chatId] || []).filter((m) => m.id !== messageId) },
    }));
    // API call
    api.delete(`/messages/${messageId}`).catch((err) =>
      console.warn("[chat-store] deleteMessage failed:", err)
    );
  },

  toggleTranslation: (chatId) => {
    const chat = get().chats.find((c) => c.id === chatId);
    const newState = !chat?.autoTranslate;
    set((s) => ({
      chats: s.chats.map((c) => c.id === chatId ? { ...c, autoTranslate: newState } : c),
    }));

    if (newState) {
      const lang = useAuthStore.getState().language || "ru";
      const msgs = get().messages[chatId] || [];
      const myId = useAuthStore.getState().user?.id;
      // Translate non-own messages that don't already have a translation
      msgs.forEach(async (msg) => {
        if (msg.senderId === myId || msg.translatedText || !msg.text.trim()) return;
        if (msg.type !== "text") return;
        const translated = await translateText(msg.text, lang);
        if (translated && translated !== msg.text) {
          set((s) => ({
            messages: {
              ...s.messages,
              [chatId]: (s.messages[chatId] || []).map((m) =>
                m.id === msg.id ? { ...m, translatedText: translated, translatedLang: lang } : m
              ),
            },
          }));
        }
      });
    } else {
      // Clear translations
      set((s) => ({
        messages: {
          ...s.messages,
          [chatId]: (s.messages[chatId] || []).map((m) => ({ ...m, translatedText: undefined, translatedLang: undefined })),
        },
      }));
    }
  },

  viewStory: (storyId) => {
    set((s) => ({
      stories: s.stories.map((us) => ({
        ...us,
        stories: us.stories.map((st) => st.id === storyId ? { ...st, isViewed: true, viewsCount: st.viewsCount + 1 } : st),
        hasUnviewed: us.stories.some((st) => st.id !== storyId && !st.isViewed),
      })),
    }));
  },

  // ─── Draft Messages (localStorage only) ─────
  getDraft: (chatId) => {
    try {
      return localStorage.getItem(`tepla-draft:${chatId}`) || "";
    } catch { return ""; }
  },

  setDraft: (chatId, text) => {
    try {
      if (text.trim()) {
        localStorage.setItem(`tepla-draft:${chatId}`, text);
      } else {
        localStorage.removeItem(`tepla-draft:${chatId}`);
      }
    } catch { /* quota exceeded */ }
  },
}));
