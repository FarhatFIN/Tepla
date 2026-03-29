"use client";
import { create } from "zustand";
import { User } from "@/types";
import api from "@/lib/api";
import { connectSocket, disconnectSocket } from "@/lib/socket";

interface SavedAccount {
  user: User;
  token: string;
  language: string;
}

interface OtpPending {
  email: string;
  type: 'login' | 'register' | 'verify';
}

interface AuthState {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  language: string;
  savedAccounts: SavedAccount[];
  otpPending: OtpPending | null;
  login: (email: string, password: string) => Promise<{ ok: boolean; needsOtp?: boolean; needsVerification?: boolean; email?: string }>;
  register: (name: string, email: string, password: string, language: string, username: string) => Promise<{ ok: boolean; needsOtp?: boolean; email?: string }>;
  verifyOtp: (email: string, code: string, type: 'login' | 'register' | 'verify') => Promise<boolean>;
  resendCode: (email: string) => Promise<boolean>;
  setOtpPending: (pending: OtpPending | null) => void;
  logout: () => void;
  switchAccount: (accountId: string) => void;
  removeSavedAccount: (accountId: string) => void;
  setLanguage: (lang: string) => void;
  setUsername: (username: string) => void;
  setAvatar: (avatarDataUrl: string) => void;
  hydrate: () => void;
}

const OWNER_ID = "c5246051-acc3-4b39-9911-1513909b7f9a";

function applyOwnerFlags(user: User): User {
  if (user.id === OWNER_ID) {
    return { ...user, isVerified: true, isAdmin: true };
  }
  return user;
}

function persist(user: User, token: string, language: string) {
  localStorage.setItem("tepla-auth", JSON.stringify({ user, token, language }));
}

function getSavedAccounts(): SavedAccount[] {
  try {
    const raw = localStorage.getItem("tepla-accounts");
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

function saveAccountToList(user: User, token: string, language: string) {
  const accounts = getSavedAccounts();
  const idx = accounts.findIndex((a) => a.user.id === user.id);
  const entry: SavedAccount = { user, token, language };
  if (idx >= 0) {
    accounts[idx] = entry;
  } else {
    accounts.push(entry);
  }
  localStorage.setItem("tepla-accounts", JSON.stringify(accounts));
}

function removeAccountFromList(userId: string) {
  const accounts = getSavedAccounts().filter((a) => a.user.id !== userId);
  localStorage.setItem("tepla-accounts", JSON.stringify(accounts));
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  token: null,
  isLoading: true,
  language: "en",
  savedAccounts: [],
  otpPending: null,

  hydrate: () => {
    const accounts = getSavedAccounts();
    const stored = localStorage.getItem("tepla-auth");
    if (stored) {
      try {
        const data = JSON.parse(stored);
        if (data.token && data.user) {
          api.setToken(data.token);
          connectSocket(data.token);
          const u = applyOwnerFlags(data.user);
          set({ user: u, token: data.token, language: data.language || "en", isLoading: false, savedAccounts: accounts });
          return;
        }
      } catch { /* corrupted */ }
    }
    set({ isLoading: false, savedAccounts: accounts });
  },

  setOtpPending: (pending) => set({ otpPending: pending }),

  login: async (email, password) => {
    set({ isLoading: true });
    try {
      const res = await api.post<{ success: boolean; data: any }>("/auth/login", { email, password });
      const data = res.data;

      // Server sends OTP — needs verification step
      if (data.needsOtp || data.needsVerification) {
        const type = data.needsVerification ? 'verify' : 'login';
        set({ isLoading: false, otpPending: { email: data.email, type } });
        return { ok: false, needsOtp: !!data.needsOtp, needsVerification: !!data.needsVerification, email: data.email };
      }

      // Shouldn't happen with new flow, but handle direct token response for backwards compat
      if (data.tokens) {
        const { tokens: { accessToken }, user: raw } = data;
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
        const finalUser = applyOwnerFlags(user);
        api.setToken(accessToken);
        connectSocket(accessToken);
        persist(finalUser, accessToken, finalUser.language || get().language);
        saveAccountToList(finalUser, accessToken, finalUser.language || get().language);
        set({ user: finalUser, token: accessToken, isLoading: false, savedAccounts: getSavedAccounts() });
        return { ok: true };
      }

      set({ isLoading: false });
      return { ok: false, needsOtp: true, email };
    } catch (err) {
      console.warn("[auth] login failed:", err);
      set({ isLoading: false });
      throw err;
    }
  },

  register: async (name, email, password, language, username) => {
    set({ isLoading: true });
    try {
      const res = await api.post<{ success: boolean; data: any }>(
        "/auth/register/email",
        { email, password, username, displayName: name, language }
      );
      const data = res.data;

      // New flow: server returns message + email, needs OTP
      if (data.email && !data.tokens) {
        set({ isLoading: false, otpPending: { email: data.email, type: 'register' } });
        return { ok: false, needsOtp: true, email: data.email };
      }

      // Backwards compat: direct token
      if (data.tokens) {
        const { tokens: { accessToken }, user: raw } = data;
        const user: User = {
          id: raw.id,
          name: raw.displayName || name,
          username: raw.username || username,
          status: "online",
          language: raw.language || language,
          phone: raw.phone,
        };
        const finalUser = applyOwnerFlags(user);
        api.setToken(accessToken);
        connectSocket(accessToken);
        persist(finalUser, accessToken, language);
        saveAccountToList(finalUser, accessToken, language);
        set({ user: finalUser, token: accessToken, isLoading: false, language, savedAccounts: getSavedAccounts() });
        return { ok: true };
      }

      set({ isLoading: false });
      return { ok: false, needsOtp: true, email };
    } catch (err) {
      console.warn("[auth] register failed:", err);
      set({ isLoading: false });
      throw err;
    }
  },

  verifyOtp: async (email, code, type) => {
    set({ isLoading: true });
    try {
      const endpoint = type === 'login' ? '/auth/verify-login' : '/auth/verify-email';
      const res = await api.post<{ success: boolean; data: { user: any; tokens: { accessToken: string; refreshToken: string }; sessionId: string } }>(
        endpoint,
        { email, code }
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
      const finalUser = applyOwnerFlags(user);
      api.setToken(accessToken);
      connectSocket(accessToken);
      persist(finalUser, accessToken, finalUser.language || get().language);
      saveAccountToList(finalUser, accessToken, finalUser.language || get().language);
      set({ user: finalUser, token: accessToken, isLoading: false, otpPending: null, savedAccounts: getSavedAccounts() });
      return true;
    } catch (err) {
      console.warn("[auth] OTP verify failed:", err);
      set({ isLoading: false });
      throw err;
    }
  },

  resendCode: async (email) => {
    try {
      await api.post("/auth/resend-code", { email });
      return true;
    } catch (err) {
      console.warn("[auth] resend failed:", err);
      throw err;
    }
  },

  logout: () => {
    api.setToken(null);
    disconnectSocket();
    localStorage.removeItem("tepla-auth");
    set({ user: null, token: null, savedAccounts: getSavedAccounts() });
  },

  switchAccount: (accountId) => {
    const accounts = getSavedAccounts();
    const target = accounts.find((a) => a.user.id === accountId);
    if (!target) return;
    disconnectSocket();
    const u = applyOwnerFlags(target.user);
    api.setToken(target.token);
    connectSocket(target.token);
    persist(u, target.token, target.language);
    set({ user: u, token: target.token, language: target.language, savedAccounts: accounts });
  },

  removeSavedAccount: (accountId) => {
    removeAccountFromList(accountId);
    set({ savedAccounts: getSavedAccounts() });
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

  setAvatar: (avatarDataUrl) => {
    const { user } = get();
    if (!user) return;
    const updated = { ...user, avatar: avatarDataUrl };
    set({ user: updated });
    const stored = localStorage.getItem("tepla-auth");
    if (stored) {
      const data = JSON.parse(stored);
      data.user = updated;
      localStorage.setItem("tepla-auth", JSON.stringify(data));
    }
    saveAccountToList(updated, get().token!, get().language);
    set({ savedAccounts: getSavedAccounts() });
    api.patch("/users/" + user.id, { avatarUrl: avatarDataUrl }).catch(() => {});
  },

  setUsername: (username) => {
    const { user } = get();
    if (!user) return;
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
    saveAccountToList(updated, get().token!, get().language);
    set({ savedAccounts: getSavedAccounts() });
  },
}));
