import { getServiceSupabaseClient } from "@/lib/db";

export type ChatRow = {
  id: string;
  type: string;
  name: string | null;
  username: string | null;
  avatar_url: string | null;
  description: string | null;
  created_by: string | null;
  is_public: boolean | null;
  is_verified: boolean | null;
  members_count: number | null;
  slow_mode_seconds: number | null;
  message_ttl_seconds: number | null;
  invite_link: string | null;
  linked_chat_id: string | null;
  created_at: string;
};

export type ChatMembershipRow = {
  role: string;
  chats: ChatRow | null;
};

export type FavoriteChatRow = {
  chat_id: string;
};

export const chatsRepository = {
  async listMemberships(userId: string) {
    const supabase = getServiceSupabaseClient();
    const { data, error } = await supabase
      .from("chat_members")
      .select("role, chats(*)")
      .eq("user_id", userId)
      .order("joined_at", { ascending: false });

    if (error) {
      throw new Error("Failed to load chats.");
    }

    return ((data ?? []) as Array<{ role: string; chats: ChatRow | ChatRow[] | null }>).map(
      (item) => ({
        role: item.role,
        chats: Array.isArray(item.chats) ? item.chats[0] ?? null : item.chats,
      }),
    );
  },

  async findById(chatId: string) {
    const supabase = getServiceSupabaseClient();
    const { data, error } = await supabase
      .from("chats")
      .select("*")
      .eq("id", chatId)
      .maybeSingle();

    if (error) {
      throw new Error("Failed to load chat.");
    }

    return (data as ChatRow | null) ?? null;
  },

  async getMemberRole(chatId: string, userId: string) {
    const supabase = getServiceSupabaseClient();
    const { data, error } = await supabase
      .from("chat_members")
      .select("role")
      .eq("chat_id", chatId)
      .eq("user_id", userId)
      .maybeSingle();

    if (error) {
      throw new Error("Failed to load member role.");
    }

    return (data?.role as string | undefined) ?? null;
  },

  async listFavoriteChatIds(userId: string) {
    const supabase = getServiceSupabaseClient();
    const { data, error } = await supabase
      .from("favorite_chats")
      .select("chat_id")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (error) {
      throw new Error("Failed to load favorite chats.");
    }

    return ((data ?? []) as FavoriteChatRow[]).map((row) => row.chat_id);
  },

  async addFavoriteChat(userId: string, chatId: string) {
    const supabase = getServiceSupabaseClient();
    const { error } = await supabase
      .from("favorite_chats")
      .upsert(
        {
          user_id: userId,
          chat_id: chatId,
        },
        { onConflict: "user_id,chat_id" },
      );

    if (error) {
      throw new Error("Failed to add favorite chat.");
    }
  },

  async removeFavoriteChat(userId: string, chatId: string) {
    const supabase = getServiceSupabaseClient();
    const { error } = await supabase
      .from("favorite_chats")
      .delete()
      .eq("user_id", userId)
      .eq("chat_id", chatId);

    if (error) {
      throw new Error("Failed to remove favorite chat.");
    }
  },

  async findDirectChatBetweenUsers(leftUserId: string, rightUserId: string) {
    const memberships = await this.listMemberships(leftUserId);
    const directMemberships = memberships.filter(
      (membership) => membership.chats?.type === "direct",
    );

    for (const membership of directMemberships) {
      const chat = membership.chats;
      if (!chat) {
        continue;
      }

      const rightRole = await this.getMemberRole(chat.id, rightUserId);
      if (rightRole) {
        return {
          chat,
          leftRole: membership.role,
        };
      }
    }

    return null;
  },

  async createChat(payload: {
    type: "group" | "direct" | "channel";
    name: string;
    username: string | null;
    description: string | null;
    createdBy: string;
    isPublic?: boolean;
  }) {
    const supabase = getServiceSupabaseClient();
    const { data, error } = await supabase
      .from("chats")
      .insert({
        type: payload.type,
        name: payload.name,
        username: payload.username,
        description: payload.description,
        created_by: payload.createdBy,
        is_public: payload.isPublic ?? false,
        members_count: 1,
      })
      .select("*")
      .maybeSingle();

    if (error || !data) {
      throw new Error("Failed to create chat.");
    }

    return data as ChatRow;
  },

  async countCreatedChatsByType(userId: string, type: "group" | "channel") {
    const supabase = getServiceSupabaseClient();
    const { count, error } = await supabase
      .from("chats")
      .select("*", { count: "exact", head: true })
      .eq("created_by", userId)
      .eq("type", type);

    if (error) {
      throw new Error("Failed to count chats by type.");
    }

    return count ?? 0;
  },

  async addMembers(chatId: string, members: Array<{ userId: string; role?: string }>) {
    if (members.length === 0) {
      return;
    }

    const supabase = getServiceSupabaseClient();
    const { error } = await supabase
      .from("chat_members")
      .upsert(
        members.map((member) => ({
          chat_id: chatId,
          user_id: member.userId,
          role: member.role ?? "member",
        })),
        { onConflict: "chat_id,user_id" },
      );

    if (error) {
      throw new Error("Failed to add chat members.");
    }
  },

  async updateMembersCount(chatId: string) {
    const supabase = getServiceSupabaseClient();
    const { count, error: countError } = await supabase
      .from("chat_members")
      .select("*", { count: "exact", head: true })
      .eq("chat_id", chatId);

    if (countError) {
      throw new Error("Failed to count chat members.");
    }

    const { error } = await supabase
      .from("chats")
      .update({ members_count: count ?? 0 })
      .eq("id", chatId);

    if (error) {
      throw new Error("Failed to update members count.");
    }
  },
};
