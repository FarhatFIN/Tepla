import { create } from "zustand";
import { persist } from "zustand/middleware";

export type ThemePreference =
  | "system"
  | "light"
  | "dark"
  | "oled"
  | "aurora"
  | "sunset";

export type Density = "compact" | "comfortable" | "spacious";

export type TeplaUIState = {
  theme: ThemePreference;
  accentColor: string;
  density: Density;
  isSidebarCollapsed: boolean;
  activeChatId: string | null;
  pinnedChatIds: string[];
  setTheme: (theme: ThemePreference) => void;
  setAccentColor: (color: string) => void;
  setDensity: (density: Density) => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
  setActiveChatId: (chatId: string | null) => void;
  togglePinnedChat: (chatId: string) => void;
};

export const useUIStore = create<TeplaUIState>()(
  persist(
    (set) => ({
      theme: "dark",
      accentColor: "#6C63FF",
      density: "comfortable",
      isSidebarCollapsed: false,
      activeChatId: null,
      pinnedChatIds: [],
      setTheme: (theme) => set({ theme }),
      setAccentColor: (accentColor) => set({ accentColor }),
      setDensity: (density) => set({ density }),
      setSidebarCollapsed: (isSidebarCollapsed) => set({ isSidebarCollapsed }),
      setActiveChatId: (activeChatId) => set({ activeChatId }),
      togglePinnedChat: (chatId) =>
        set((state) => ({
          pinnedChatIds: state.pinnedChatIds.includes(chatId)
            ? state.pinnedChatIds.filter((id) => id !== chatId)
            : [chatId, ...state.pinnedChatIds],
        })),
    }),
    {
      name: "tepla.ui",
      version: 1,
    },
  ),
);

