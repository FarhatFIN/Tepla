import { usersRepository } from "@/server/database/users.repository";
import {
  assertValidUsername,
  normalizeBirthDate,
  normalizeEmail,
  normalizeHexColor,
  normalizePhone,
  normalizePositiveNumber,
  normalizeStatusEmoji,
} from "@/server/validation/validators";
import { mapAuthUser, mapUserProfile } from "./mappers";
import { normalizeLanguage } from "@/lib/languages";

export const usersService = {
  async searchUsers(query: string, limit: number) {
    const normalizedQuery = query.trim().replace(/^@+/, "");
    if (!normalizedQuery) {
      return [];
    }

    const rows = await usersRepository.searchByUsername(normalizedQuery, limit);
    return rows.map(mapUserProfile);
  },

  async ensureUsernameAvailable(username: string, excludeUserId?: string | null) {
    const normalized = assertValidUsername(username);
    const existing = await usersRepository.findByUsername(normalized);

    if (existing && existing.id !== excludeUserId) {
      throw new Error("This username is already taken.");
    }

    return normalized;
  },

  async updateProfile(payload: {
    userId: string;
    username: string;
    displayName?: string | null;
    avatarUrl?: string | null;
    bio?: string | null;
    language?: string | null;
    birthDate?: string | null;
    statusEmoji?: string | null;
    usernameColor?: string | null;
    avatarAnimationEnabled?: boolean;
    voiceStatusUrl?: string | null;
    voiceStatusDurationSeconds?: number | null;
  }) {
    const existing = await usersRepository.findById(payload.userId);
    if (!existing) {
      throw new Error("User not found.");
    }

    const statusEmoji = normalizeStatusEmoji(payload.statusEmoji);
    const usernameColor = normalizeHexColor(payload.usernameColor);

    const username = await this.ensureUsernameAvailable(payload.username, payload.userId);
    const row = await usersRepository.updateProfile({
      userId: payload.userId,
      username,
      displayName:
        typeof payload.displayName === "string" ? payload.displayName.trim() || null : null,
      avatarUrl: typeof payload.avatarUrl === "string" ? payload.avatarUrl.trim() || null : null,
      bio: typeof payload.bio === "string" ? payload.bio.trim() || null : null,
      language: normalizeLanguage(payload.language),
      birthDate: normalizeBirthDate(payload.birthDate),
      statusEmoji,
      usernameColor,
      avatarAnimationEnabled: Boolean(payload.avatarAnimationEnabled),
      voiceStatusUrl:
        typeof payload.voiceStatusUrl === "string" ? payload.voiceStatusUrl.trim() || null : null,
      voiceStatusDurationSeconds: normalizePositiveNumber(payload.voiceStatusDurationSeconds),
    });

    return mapUserProfile(row);
  },

  async findAuthUserByPhone(phone: string) {
    const row = await usersRepository.findByPhone(phone);
    return row ? mapAuthUser(row) : null;
  },

  async register(payload: {
    phone?: string | null;
    email?: string | null;
    username: string;
    displayName?: string | null;
    language?: string | null;
    birthDate?: string | null;
  }) {
    const phone = normalizePhone(payload.phone);
    const email = normalizeEmail(payload.email);
    const displayName =
      typeof payload.displayName === "string" ? payload.displayName.trim() || null : null;
    const language = normalizeLanguage(payload.language);
    const birthDate = normalizeBirthDate(payload.birthDate);

    if (!phone && !email) {
      throw new Error("Phone or email is required to create an account.");
    }

    const username = await this.ensureUsernameAvailable(payload.username);
    if (phone) {
      const existingPhoneUser = await usersRepository.findByPhone(phone);
      if (existingPhoneUser) {
        throw new Error("An account with this phone already exists.");
      }
    }

    if (email) {
      const existingEmailUser = await usersRepository.findByEmail(email);
      if (existingEmailUser) {
        throw new Error("An account with this email already exists.");
      }
    }

    const row = await usersRepository.createUser({
      phone,
      email,
      username,
      displayName,
      language,
      birthDate,
      usernameColor: null,
      avatarAnimationEnabled: false,
      voiceStatusUrl: null,
      voiceStatusDurationSeconds: null,
    });

    return {
      user: mapAuthUser(row),
      profile: mapUserProfile(row),
    };
  },

  async activatePremium(userId: string) {
    const row = await usersRepository.activatePremium(userId);
    return {
      user: mapAuthUser(row),
      profile: mapUserProfile(row),
    };
  },
};
