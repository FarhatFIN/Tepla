export type UserId = string & { readonly __brand: 'UserId' };

export interface TeplaUser {
  id: UserId;
  phone?: string;
  email?: string;
  username: string;
  displayName?: string;
  avatarUrl?: string;
  avatarThumbUrl?: string;
  bio?: string;
  birthDate?: string;
  usernameColor?: string;
  avatarAnimationEnabled: boolean;
  voiceStatusUrl?: string;
  voiceStatusDurationSeconds?: number;
  statusEmoji?: string;
  statusText?: string;
  lastSeen?: string;
  isOnline: boolean;
  isVerified: boolean;
  isPremium: boolean;
  publicKey: string;
  signingPublicKey: string;
  language: string;
  createdAt: string;
}

export interface AuthUser {
  id: UserId;
  phone?: string;
  email?: string;
  username: string;
  displayName?: string;
  avatarUrl?: string;
  avatarThumbUrl?: string;
  isPremium: boolean;
  isVerified: boolean;
  language: string;
}

export interface UserPresence {
  userId: UserId;
  isOnline: boolean;
  lastSeen?: string;
  deviceCount: number;
}
