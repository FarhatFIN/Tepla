import { create } from "zustand";
import { persist } from "zustand/middleware";

export type ThemePreference = "light" | "dark" | "system" | "oled" | "aurora" | "sunset";

export type Density = "compact" | "comfortable" | "spacious";

export type TeplaUIState = {
  theme: ThemePreference;
  accentColor: string;
  density: Density;
  fontSize: number;
  chatBackground: string;
  notifyMessages: boolean;
  notifyGroups: boolean;
  notifySound: boolean;
  isSidebarCollapsed: boolean;
  activeChatId: string | null;
  pinnedChatIds: string[];
  favoriteChatIds: string[];
  setTheme: (theme: ThemePreference) => void;
  setAccentColor: (color: string) => void;
  setDensity: (density: Density) => void;
  setFontSize: (fontSize: number) => void;
  setChatBackground: (color: string) => void;
  setNotifyMessages: (enabled: boolean) => void;
  setNotifyGroups: (enabled: boolean) => void;
  setNotifySound: (enabled: boolean) => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
  setActiveChatId: (chatId: string | null) => void;
  togglePinnedChat: (chatId: string) => void;
  toggleFavoriteChat: (chatId: string) => void;
};

export const useUIStore = create<TeplaUIState>()(
  persist(
    (set) => ({
      theme: "dark",
      accentColor: "#7B61FF",
      density: "comfortable",
      fontSize: 16,
      chatBackground: "#0F1117",
      notifyMessages: true,
      notifyGroups: true,
      notifySound: true,
      isSidebarCollapsed: false,
      activeChatId: null,
      pinnedChatIds: [],
      favoriteChatIds: [],
      setTheme: (theme) => set({ theme }),
      setAccentColor: (accentColor) => set({ accentColor }),
      setDensity: (density) => set({ density }),
      setFontSize: (fontSize) => set({ fontSize }),
      setChatBackground: (chatBackground) => set({ chatBackground }),
      setNotifyMessages: (notifyMessages) => set({ notifyMessages }),
      setNotifyGroups: (notifyGroups) => set({ notifyGroups }),
      setNotifySound: (notifySound) => set({ notifySound }),
      setSidebarCollapsed: (isSidebarCollapsed) => set({ isSidebarCollapsed }),
      setActiveChatId: (activeChatId) => set({ activeChatId }),
      togglePinnedChat: (chatId) =>
        set((state) => ({
          pinnedChatIds: state.pinnedChatIds.includes(chatId)
            ? state.pinnedChatIds.filter((id) => id !== chatId)
            : [chatId, ...state.pinnedChatIds],
        })),
      toggleFavoriteChat: (chatId) =>
        set((state) => ({
          favoriteChatIds: state.favoriteChatIds.includes(chatId)
            ? state.favoriteChatIds.filter((id) => id !== chatId)
            : [chatId, ...state.favoriteChatIds],
        })),
    }),
    {
      name: "tepla.ui",
      version: 2,
      migrate: (persisted) => {
        const state = (persisted ?? {}) as Record<string, unknown>;
        return {
          ...state,
          fontSize: typeof state.fontSize === "number" ? state.fontSize : 16,
          chatBackground:
            typeof state.chatBackground === "string" ? state.chatBackground : "#0F1117",
          notifyMessages:
            typeof state.notifyMessages === "boolean" ? state.notifyMessages : true,
          notifyGroups:
            typeof state.notifyGroups === "boolean" ? state.notifyGroups : true,
          notifySound: typeof state.notifySound === "boolean" ? state.notifySound : true,
        };
      },
    },
  ),
);
