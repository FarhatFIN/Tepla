import { getServiceSupabaseClient } from "@/lib/db";

export type UserProfileRow = {
  id: string;
  phone: string | null;
  email: string | null;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  avatar_thumb_url: string | null;
  bio: string | null;
  birth_date: string | null;
  username_color: string | null;
  avatar_animation_enabled: boolean | null;
  voice_status_url: string | null;
  voice_status_duration_seconds: number | null;
  status_emoji: string | null;
  status_text: string | null;
  last_seen: string | null;
  is_online: boolean | null;
  is_verified: boolean | null;
  is_premium: boolean | null;
  public_key: string;
  signing_public_key: string;
  language: string | null;
  created_at: string;
};

export const usersRepository = {
  async searchByUsername(query: string, limit: number) {
    const supabase = getServiceSupabaseClient();
    const { data, error } = await supabase
      .from("users")
      .select("*")
      .or(`username.ilike.${query}%,display_name.ilike.%${query}%`)
      .order("username", { ascending: true })
      .limit(limit);

    if (error) {
      throw new Error("Failed to search users.");
    }

    return (data ?? []) as UserProfileRow[];
  },

  async findById(userId: string) {
    const supabase = getServiceSupabaseClient();
    const { data, error } = await supabase
      .from("users")
      .select("*")
      .eq("id", userId)
      .maybeSingle();

    if (error) {
      throw new Error("Failed to load user.");
    }

    return (data as UserProfileRow | null) ?? null;
  },

  async findByUsername(username: string) {
    const supabase = getServiceSupabaseClient();
    const { data, error } = await supabase
      .from("users")
      .select("*")
      .eq("username", username)
      .maybeSingle();

    if (error) {
      throw new Error("Failed to load user by username.");
    }

    return (data as UserProfileRow | null) ?? null;
  },

  async findByPhone(phone: string) {
    const supabase = getServiceSupabaseClient();
    const { data, error } = await supabase
      .from("users")
      .select("*")
      .eq("phone", phone)
      .maybeSingle();

    if (error) {
      throw new Error("Failed to load user by phone.");
    }

    return (data as UserProfileRow | null) ?? null;
  },

  async findByEmail(email: string) {
    const supabase = getServiceSupabaseClient();
    const { data, error } = await supabase
      .from("users")
      .select("*")
      .eq("email", email)
      .maybeSingle();

    if (error) {
      throw new Error("Failed to load user by email.");
    }

    return (data as UserProfileRow | null) ?? null;
  },

  async createUser(payload: {
    phone: string | null;
    email: string | null;
    username: string;
    displayName: string | null;
    language: string;
    birthDate: string | null;
    usernameColor?: string | null;
    avatarAnimationEnabled?: boolean;
    voiceStatusUrl?: string | null;
    voiceStatusDurationSeconds?: number | null;
  }) {
    const supabase = getServiceSupabaseClient();
    const { data, error } = await supabase
      .from("users")
      .insert({
        phone: payload.phone,
        email: payload.email,
        username: payload.username,
        display_name: payload.displayName,
        language: payload.language,
        birth_date: payload.birthDate,
        username_color: payload.usernameColor ?? null,
        avatar_animation_enabled: payload.avatarAnimationEnabled ?? false,
        voice_status_url: payload.voiceStatusUrl ?? null,
        voice_status_duration_seconds: payload.voiceStatusDurationSeconds ?? null,
        public_key: "",
        signing_public_key: "",
      })
      .select("*")
      .maybeSingle();

    if (error || !data) {
      throw new Error("Failed to create user.");
    }

    return data as UserProfileRow;
  },

  async updateProfile(payload: {
    userId: string;
    username: string;
    displayName: string | null;
    avatarUrl: string | null;
    bio: string | null;
    language: string;
    birthDate: string | null;
    statusEmoji: string | null;
    usernameColor: string | null;
    avatarAnimationEnabled: boolean;
    voiceStatusUrl: string | null;
    voiceStatusDurationSeconds: number | null;
  }) {
    const supabase = getServiceSupabaseClient();
    const { data, error } = await supabase
      .from("users")
      .update({
        username: payload.username,
        display_name: payload.displayName,
        avatar_url: payload.avatarUrl,
        bio: payload.bio,
        language: payload.language,
        birth_date: payload.birthDate,
        status_emoji: payload.statusEmoji,
        username_color: payload.usernameColor,
        avatar_animation_enabled: payload.avatarAnimationEnabled,
        voice_status_url: payload.voiceStatusUrl,
        voice_status_duration_seconds: payload.voiceStatusDurationSeconds,
      })
      .eq("id", payload.userId)
      .select("*")
      .maybeSingle();

    if (error || !data) {
      throw new Error("Failed to update profile.");
    }

    return data as UserProfileRow;
  },

  async activatePremium(userId: string) {
    const supabase = getServiceSupabaseClient();
    const { data, error } = await supabase
      .from("users")
      .update({ is_premium: true })
      .eq("id", userId)
      .select("*")
      .maybeSingle();

    if (error || !data) {
      throw new Error("Failed to activate premium.");
    }

    return data as UserProfileRow;
  },
};
