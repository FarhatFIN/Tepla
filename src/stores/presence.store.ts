import { create } from "zustand";

export type PresenceState = {
  onlineUserIds: Set<string>;
  lastSeenByUser: Record<string, string>;
  typingByChat: Record<string, Set<string>>;
  setOnline: (userId: string) => void;
  setOffline: (userId: string) => void;
  setLastSeen: (userId: string, lastSeen: string) => void;
  setTyping: (chatId: string, userId: string, typing: boolean) => void;
  isOnline: (userId: string) => boolean;
  getLastSeen: (userId: string) => string | null;
};

export const usePresenceStore = create<PresenceState>((set, get) => ({
  onlineUserIds: new Set<string>(),
  lastSeenByUser: {},
  typingByChat: {},
  setOnline: (userId) =>
    set((state) => {
      const next = new Set(state.onlineUserIds);
      next.add(userId);
      return { onlineUserIds: next };
    }),
  setOffline: (userId) =>
    set((state) => {
      const next = new Set(state.onlineUserIds);
      next.delete(userId);
      return { onlineUserIds: next };
    }),
  setLastSeen: (userId, lastSeen) =>
    set((state) => ({
      lastSeenByUser: { ...state.lastSeenByUser, [userId]: lastSeen },
    })),
  setTyping: (chatId, userId, typing) =>
    set((state) => {
      const existing = state.typingByChat[chatId] ?? new Set<string>();
      const next = new Set(existing);
      if (typing) {
        next.add(userId);
      } else {
        next.delete(userId);
      }
      return {
        typingByChat: {
          ...state.typingByChat,
          [chatId]: next,
        },
      };
    }),
  isOnline: (userId) => get().onlineUserIds.has(userId),
  getLastSeen: (userId) => get().lastSeenByUser[userId] ?? null,
}));
