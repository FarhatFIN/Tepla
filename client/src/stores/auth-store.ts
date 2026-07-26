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

interface BinaryShieldIssue {
  seedPhrase?: string;
  recoveryPatterns: Array<{ id: string; pattern: string; usesLeft: number }>;
  nextManualRotationAt: string;
}

interface BinaryChallenge {
  challengeId: string;
  code: string;
  expiresIn: number;
}

interface AuthState {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  language: string;
  savedAccounts: SavedAccount[];
  otpPending: OtpPending | null;
  login: (email: string, password: string, shieldCode?: string) => Promise<{ ok: boolean; needsOtp?: boolean; needsVerification?: boolean; requiresBinaryShield?: boolean; binaryChallenge?: BinaryChallenge; email?: string; binaryShield?: BinaryShieldIssue }>;
  register: (name: string, email: string, password: string, language: string, username: string, profile?: { birthDate?: string; bio?: string; avatarUrl?: string; shieldCode?: string }) => Promise<{ ok: boolean; needsOtp?: boolean; email?: string; binaryShield?: BinaryShieldIssue }>;
  verifyBinaryShield: (challengeId: string, code: string) => Promise<{ ok: boolean; binaryShield?: BinaryShieldIssue }>;
  verifyOtp: (email: string, code: string, type: 'login' | 'register' | 'verify') => Promise<boolean>;
  resendCode: (email: string) => Promise<boolean>;
  setOtpPending: (pending: OtpPending | null) => void;
  logout: () => void;
  switchAccount: (accountId: string) => void;
  removeSavedAccount: (accountId: string) => void;
  setLanguage: (lang: string) => void;
  setUsername: (username: string) => void;
  setAvatar: (avatarDataUrl: string) => void;
  setBio: (bio: string) => void;
  setBirthDate: (birthDate: string) => void;
  reset: () => void;
  loginWithToken: (token: string) => Promise<void>;
  fullAuthReset: (newToken?: string) => Promise<void>;
  hydrate: () => void;
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

function clearLocalRuntimeState() {
  const keep = localStorage.getItem("tepla-accounts");
  const keys = Array.from({ length: localStorage.length }, (_, index) => localStorage.key(index)).filter(Boolean) as string[];
  for (const key of keys) {
    if (key === "tepla-accounts") continue;
    if (key === "tepla-auth" || key.startsWith("tepla-draft:") || key.startsWith("tepla-chat:")) {
      localStorage.removeItem(key);
    }
  }
  if (keep) localStorage.setItem("tepla-accounts", keep);
}

function mapAuthUser(raw: any, fallbackName = "User"): User {
  return {
    id: raw.id,
    name: raw.displayName || raw.display_name || raw.username || fallbackName,
    username: raw.username,
    avatar: raw.avatarUrl || raw.avatar_url,
    bio: raw.bio,
    birthDate: raw.birthDate || raw.birth_date,
    phone: raw.phone,
    status: "online",
    language: raw.language || "en",
    isVerified: raw.isVerified ?? raw.is_verified,
  };
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  token: null,
  isLoading: true,
  language: "en",
  savedAccounts: [],
  otpPending: null,

  reset: () => {
    api.setToken(null);
    disconnectSocket();
    set({ user: null, token: null, isLoading: false, otpPending: null, savedAccounts: getSavedAccounts() });
  },

  loginWithToken: async (newToken) => {
    api.setToken(newToken);
    const me = await api.get<{ success: boolean; data: { user: any } }>("/auth/me");
    const user = mapAuthUser(me.data.user);
    const language = user.language || get().language || "en";
    persist(user, newToken, language);
    saveAccountToList(user, newToken, language);
    set({ user, token: newToken, language, isLoading: false, savedAccounts: getSavedAccounts() });
    const { useChatStore } = await import("@/stores/chat-store");
    await useChatStore.getState().loadChats();
    connectSocket(newToken);
    useChatStore.getState().bindSocket();
  },

  fullAuthReset: async (newToken) => {
    disconnectSocket();
    api.setToken(null);
    try {
      clearLocalRuntimeState();
    } catch { /* ignore */ }
    const { useChatStore } = await import("@/stores/chat-store");
    useChatStore.getState().reset();
    set({ user: null, token: null, otpPending: null, savedAccounts: [] });
    if (newToken) {
      await get().loginWithToken(newToken);
    } else {
      set({ isLoading: false });
    }
  },

  hydrate: () => {
    const accounts = getSavedAccounts();
    const stored = localStorage.getItem("tepla-auth");
    if (stored) {
      try {
        const data = JSON.parse(stored);
        if (data.token && data.user) {
          api.setToken(data.token);
          connectSocket(data.token);
          set({ user: data.user, token: data.token, language: data.language || "en", isLoading: false, savedAccounts: accounts });
          return;
        }
      } catch { /* corrupted */ }
    }
    set({ isLoading: false, savedAccounts: accounts });
  },

  setOtpPending: (pending) => set({ otpPending: pending }),

  login: async (email, password, shieldCode) => {
    set({ isLoading: true });
    try {
      const res = await api.post<{ success: boolean; data: any }>("/auth/login", { email, password, shield_code: shieldCode });
      const data = res.data;

      if (data.requiresBinaryShield && data.binaryChallenge) {
        set({ isLoading: false });
        return { ok: false, requiresBinaryShield: true, binaryChallenge: data.binaryChallenge };
      }

      // Server sends OTP — needs verification step
      if (data.needsOtp || data.needsVerification) {
        const type = data.needsVerification ? 'verify' : 'login';
        set({ isLoading: false, otpPending: { email: data.email, type } });
        return { ok: false, needsOtp: !!data.needsOtp, needsVerification: !!data.needsVerification, email: data.email };
      }

      // Shouldn't happen with new flow, but handle direct token response for backwards compat
      if (data.tokens) {
        const { tokens: { accessToken } } = data;
        await get().fullAuthReset(accessToken);
        return { ok: true, binaryShield: data.binaryShield };
      }

      set({ isLoading: false });
      return { ok: false, needsOtp: true, email };
    } catch (err) {
      console.warn("[auth] login failed:", err);
      set({ isLoading: false });
      throw err;
    }
  },

  register: async (name, email, password, language, username, profile) => {
    set({ isLoading: true });
    try {
      const res = await api.post<{ success: boolean; data: any }>(
        "/auth/register/email",
        { email, password, username, displayName: name, language, dateOfBirth: profile?.birthDate, description: profile?.bio, avatarUrl: profile?.avatarUrl, shield_code: profile?.shieldCode }
      );
      const data = res.data;

      // New flow: server returns message + email, needs OTP
      if (data.email && !data.tokens) {
        set({ isLoading: false, otpPending: { email: data.email, type: 'register' } });
        return { ok: false, needsOtp: true, email: data.email };
      }

      // Backwards compat: direct token
      if (data.tokens) {
        const { tokens: { accessToken } } = data;
        await get().fullAuthReset(accessToken);
        return { ok: true, binaryShield: data.binaryShield };
      }

      set({ isLoading: false });
      return { ok: false, needsOtp: true, email };
    } catch (err) {
      console.warn("[auth] register failed:", err);
      set({ isLoading: false });
      throw err;
    }
  },

  verifyBinaryShield: async (challengeId, code) => {
    set({ isLoading: true });
    try {
      const res = await api.post<{ success: boolean; data: any }>("/auth/login/binary-verify", { challengeId, code });
      const { tokens: { accessToken }, binaryShield } = res.data;
      await get().fullAuthReset(accessToken);
      return { ok: true, binaryShield };
    } catch (err) {
      console.warn("[auth] Binary Shield verify failed:", err);
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
      const { tokens: { accessToken } } = res.data;
      await get().fullAuthReset(accessToken);
      set({ otpPending: null });
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
    const accounts = getSavedAccounts();
    // Tell the server first so it can revoke the access token's jti and clear
    // the auth cookies; a failure here must not block the local teardown.
    api.post("/auth/logout", {}).catch(() => {});
    api.setToken(null);
    disconnectSocket();
    localStorage.removeItem("tepla-auth");
    import("@/stores/chat-store")
      .then(({ useChatStore, clearSecretTextCache }) => {
        // M-07: decrypted secret-chat text must not survive a logout.
        clearSecretTextCache();
        useChatStore.getState().reset();
      })
      .catch(() => {});
    set({ user: null, token: null, savedAccounts: accounts, otpPending: null });
  },

  switchAccount: (accountId) => {
    const accounts = getSavedAccounts();
    const target = accounts.find((a) => a.user.id === accountId);
    if (!target) return;
    get().fullAuthReset(target.token).catch((err) => console.warn("[auth] switch account failed:", err));
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

  setBio: (bio) => {
    const { user } = get();
    if (!user) return;
    api.patch("/users/" + user.id, { bio }).catch((err) =>
      console.warn("[auth] bio update failed:", err)
    );
    const updated = { ...user, bio };
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

  setBirthDate: (birthDate) => {
    const { user } = get();
    if (!user) return;
    api.patch("/users/" + user.id, { birthDate }).catch((err) =>
      console.warn("[auth] birthDate update failed:", err)
    );
    const updated = { ...user, birthDate };
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
