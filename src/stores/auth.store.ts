import { create } from "zustand";
import { persist } from "zustand/middleware";

export type AuthStatus = "signed_out" | "pending" | "signed_in";

export type AuthUser = {
  id: string;
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
  language: string;
  birthDate: string | null;
  usernameColor: string | null;
  animatedAvatarEnabled: boolean;
  voiceStatusUrl: string | null;
  voiceStatusDurationSeconds: number | null;
  statusEmoji: string | null;
};

export interface AuthState {
  status: AuthStatus;
  user: AuthUser | null;
  accessToken: string | null;
  refreshToken: string | null;
  setSession: (payload: {
    user: AuthUser;
    accessToken: string;
    refreshToken: string;
  }) => void;
  updateUser: (user: Partial<AuthUser>) => void;
  clearSession: () => void;
  setStatus: (status: AuthStatus) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      status: "signed_out",
      user: null,
      accessToken: null,
      refreshToken: null,
      setSession: ({ user, accessToken, refreshToken }) =>
        set({
          user,
          accessToken,
          refreshToken,
          status: "signed_in",
        }),
      updateUser: (user) =>
        set((state) => ({
          user: state.user ? { ...state.user, ...user } : state.user,
        })),
      clearSession: () =>
        set({
          status: "signed_out",
          user: null,
          accessToken: null,
          refreshToken: null,
        }),
      setStatus: (status) => set({ status }),
    }),
    {
      name: "tepla.auth",
      version: 1,
      partialize: (state) => ({
        status: state.status,
        user: state.user,
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
      }),
    },
  ),
);

