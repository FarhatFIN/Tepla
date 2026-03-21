import { getServiceSupabaseClient } from "@/lib/db";

export type ReactionRow = {
  id: string;
  message_id: string;
  user_id: string;
  emoji: string;
  created_at: string;
};

export const reactionsRepository = {
  async listByMessageIds(messageIds: string[]) {
    if (messageIds.length === 0) {
      return [];
    }

    const supabase = getServiceSupabaseClient();
    const { data, error } = await supabase
      .from("reactions")
      .select("*")
      .in("message_id", messageIds);

    if (error) {
      throw new Error("Failed to load reactions.");
    }

    return (data ?? []) as ReactionRow[];
  },

  async upsert(messageId: string, userId: string, emoji: string) {
    const supabase = getServiceSupabaseClient();
    const { error } = await supabase
      .from("reactions")
      .upsert(
        {
          message_id: messageId,
          user_id: userId,
          emoji,
        },
        { onConflict: "message_id,user_id,emoji" },
      );

    if (error) {
      throw new Error("Failed to add reaction.");
    }
  },

  async remove(messageId: string, userId: string, emoji: string) {
    const supabase = getServiceSupabaseClient();
    const { error } = await supabase
      .from("reactions")
      .delete()
      .eq("message_id", messageId)
      .eq("user_id", userId)
      .eq("emoji", emoji);

    if (error) {
      throw new Error("Failed to remove reaction.");
    }
  },
};
