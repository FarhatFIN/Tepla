"use client";
import { create } from "zustand";
import { persist } from "zustand/middleware";

export type PrivacyLevel = "everyone" | "contacts" | "nobody";

interface SettingsValues {
  // Notifications
  notifSound: boolean;
  notifPreview: boolean;
  notifPush: boolean;
  notifGroupSound: boolean;
  // Privacy
  privacyLastSeen: PrivacyLevel;
  privacyPhone: PrivacyLevel;
  privacyPhoto: PrivacyLevel;
  privacyForwards: PrivacyLevel;
  // Auto-download
  autoDownloadPhotos: boolean;
  autoDownloadVideos: boolean;
  autoDownloadFiles: boolean;
  // General
  fontSize: number;
  sendByEnter: boolean;
  animatedEmoji: boolean;
}

interface SettingsState extends SettingsValues {
  update: (patch: Partial<SettingsValues>) => void;
}

const defaults: SettingsValues = {
  notifSound: true,
  notifPreview: true,
  notifPush: true,
  notifGroupSound: true,
  privacyLastSeen: "everyone",
  privacyPhone: "nobody",
  privacyPhoto: "everyone",
  privacyForwards: "everyone",
  autoDownloadPhotos: true,
  autoDownloadVideos: false,
  autoDownloadFiles: false,
  fontSize: 16,
  sendByEnter: true,
  animatedEmoji: true,
};

/**
 * User settings, persisted to localStorage ("tepla-settings").
 * Survives reloads and is shared by every component that consumes it.
 */
export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      ...defaults,
      update: (patch) => set(patch),
    }),
    { name: "tepla-settings" },
  ),
);
