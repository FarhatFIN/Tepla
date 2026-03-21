"use client";
import { create } from "zustand";
import { User } from "@/types";
import api from "@/lib/api";
import { connectSocket, disconnectSocket } from "@/lib/socket";

interface AuthState {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  language: string;
  login: (email: string, password: string) => Promise<boolean>;
  register: (name: string, email: string, password: string, language: string, username: string) => Promise<boolean>;
  logout: () => void;
  setLanguage: (lang: string) => void;
  setUsername: (username: string) => void;
  hydrate: () => void;
}

function persist(user: User, token: string, language: string) {
  localStorage.setItem("tepla-auth", JSON.stringify({ user, token, language }));
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  token: null,
  isLoading: true,
  language: "ru",

  hydrate: () => {
    const stored = localStorage.getItem("tepla-auth");
    if (stored) {
      try {
        const data = JSON.parse(stored);
        if (data.token && data.user) {
          api.setToken(data.token);
          connectSocket(data.token);
          set({ user: data.user, token: data.token, language: data.language || "ru", isLoading: false });
          return;
        }
      } catch { /* corrupted */ }
    }
    set({ isLoading: false });
  },

  login: async (email, password) => {
    set({ isLoading: true });
    try {
      const res = await api.post<{ success: boolean; data: { user: any; tokens: { accessToken: string; refreshToken: string }; sessionId: string } }>(
        "/auth/login",
        { email, password }
      );
      const { tokens: { accessToken }, user: raw } = res.data;
      const user: User = {
        id: raw.id,
        name: raw.displayName || raw.username || email.split("@")[0],
        username: raw.username,
        avatar: raw.avatarUrl,
        phone: raw.phone,
        status: "online",
        isPremium: raw.isPremium || false,
        language: raw.language || get().language,
      };
      api.setToken(accessToken);
      connectSocket(accessToken);
      persist(user, accessToken, user.language || get().language);
      set({ user, token: accessToken, isLoading: false });
      return true;
    } catch (err) {
      console.warn("[auth] login failed:", err);
      set({ isLoading: false });
      return false;
    }
  },

  register: async (name, email, password, language, username) => {
    set({ isLoading: true });
    try {
      const res = await api.post<{ success: boolean; data: { user: any; tokens: { accessToken: string; refreshToken: string }; sessionId: string } }>(
        "/auth/register/email",
        { email, password, username, displayName: name, language }
      );
      const { tokens: { accessToken }, user: raw } = res.data;
      const user: User = {
        id: raw.id,
        name: raw.displayName || name,
        username: raw.username || username,
        status: "online",
        language: raw.language || language,
        phone: raw.phone,
      };
      api.setToken(accessToken);
      connectSocket(accessToken);
      persist(user, accessToken, language);
      set({ user, token: accessToken, isLoading: false, language });
      return true;
    } catch (err) {
      console.warn("[auth] register failed:", err);
      set({ isLoading: false });
      return false;
    }
  },

  logout: () => {
    api.setToken(null);
    disconnectSocket();
    localStorage.removeItem("tepla-auth");
    set({ user: null, token: null });
  },

  setLanguage: (lang) => {
    set({ language: lang });
    const stored = localStorage.getItem("tepla-auth");
    if (stored) {
      const data = JSON.parse(stored);
      data.language = lang;
      localStorage.setItem("tepla-auth", JSON.stringify(data));
    }
  },

  setUsername: (username) => {
    const { user, token } = get();
    if (!user) return;
    // Fire-and-forget API call to update username on server
    api.patch("/users/" + user.id, { username }).catch((err) =>
      console.warn("[auth] username update failed:", err)
    );
    const updated = { ...user, username };
    set({ user: updated });
    const stored = localStorage.getItem("tepla-auth");
    if (stored) {
      const data = JSON.parse(stored);
      data.user = updated;
      localStorage.setItem("tepla-auth", JSON.stringify(data));
    }
  },
}));
