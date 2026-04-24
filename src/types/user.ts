export type UserId = string;

export type TeplaUser = {
  id: UserId;
  phone: string | null;
  email: string | null;
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
  avatarThumbUrl: string | null;
  bio: string | null;
  birthDate: string | null;
  usernameColor: string | null;
  animatedAvatarEnabled: boolean;
  voiceStatusUrl: string | null;
  voiceStatusDurationSeconds: number | null;
  statusEmoji: string | null;
  statusText: string | null;
  lastSeen: string | null;
  isOnline: boolean;
  isVerified: boolean;
  publicKey: string;
  signingPublicKey: string;
  language: string;
  createdAt: string;
};

