import { create } from "zustand";

export type PresenceState = {
  onlineUserIds: Set<string>;
  typingByChat: Record<string, Set<string>>;
  setOnline: (userId: string, online: boolean) => void;
  setTyping: (chatId: string, userId: string, typing: boolean) => void;
};

export const usePresenceStore = create<PresenceState>((set) => ({
  onlineUserIds: new Set<string>(),
  typingByChat: {},
  setOnline: (userId, online) =>
    set((state) => {
      const next = new Set(state.onlineUserIds);
      if (online) {
        next.add(userId);
      } else {
        next.delete(userId);
      }
      return { onlineUserIds: next };
    }),
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
}));

