import { getServiceSupabaseClient } from "@/lib/db";
import type { MessageType } from "@/types/message";

export type MessageRow = {
  id: string;
  client_message_id: string | null;
  chat_id: string;
  sender_id: string | null;
  content: string;
  content_iv: string | null;
  encrypted_keys: unknown;
  type: MessageType;
  reply_to_id: string | null;
  forward_from_id: string | null;
  forward_from_chat_id: string | null;
  is_edited: boolean | null;
  edited_at: string | null;
  is_deleted: boolean | null;
  is_pinned: boolean | null;
  views_count: number | null;
  ttl_seconds: number | null;
  expires_at: string | null;
  media_group_id: string | null;
  spark_count: number | null;
  spark_senders_count: number | null;
  entities: unknown;
  created_at: string;
};

export const messagesRepository = {
  async listByChat(chatId: string, limit: number, cursor?: string | null) {
    const supabase = getServiceSupabaseClient();

    let query = supabase
      .from("messages")
      .select("*")
      .eq("chat_id", chatId)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (cursor) {
      query = query.lt("created_at", cursor);
    }

    const { data, error } = await query;

    if (error) {
      throw new Error("Failed to list messages.");
    }

    return (data ?? []) as MessageRow[];
  },

  async listByIds(messageIds: string[]) {
    if (messageIds.length === 0) {
      return [];
    }

    const supabase = getServiceSupabaseClient();
    const { data, error } = await supabase
      .from("messages")
      .select("*")
      .in("id", messageIds);

    if (error) {
      throw new Error("Failed to load messages by ids.");
    }

    return (data ?? []) as MessageRow[];
  },

  async findById(messageId: string) {
    const supabase = getServiceSupabaseClient();
    const { data, error } = await supabase
      .from("messages")
      .select("*")
      .eq("id", messageId)
      .maybeSingle();

    if (error) {
      throw new Error("Failed to load message.");
    }

    return (data as MessageRow | null) ?? null;
  },

  async findByClientMessageId(chatId: string, clientMessageId: string) {
    const supabase = getServiceSupabaseClient();
    const { data, error } = await supabase
      .from("messages")
      .select("*")
      .eq("chat_id", chatId)
      .eq("client_message_id", clientMessageId)
      .maybeSingle();

    if (error) {
      throw new Error("Failed to load message by client id.");
    }

    return (data as MessageRow | null) ?? null;
  },

  async insert(payload: {
    clientMessageId: string | null;
    chatId: string;
    senderId: string | null;
    content: string;
    contentIv: string | null;
    encryptedKeys: unknown;
    type: MessageType;
    replyToMessageId: string | null;
    entities: unknown;
  }) {
    const supabase = getServiceSupabaseClient();
    const { data, error } = await supabase
      .from("messages")
      .insert({
        client_message_id: payload.clientMessageId,
        chat_id: payload.chatId,
        sender_id: payload.senderId,
        content: payload.content,
        content_iv: payload.contentIv,
        encrypted_keys: payload.encryptedKeys,
        type: payload.type,
        reply_to_id: payload.replyToMessageId,
        entities: payload.entities,
      })
      .select("*")
      .maybeSingle();

    if (error || !data) {
      throw new Error("Failed to create message.");
    }

    return data as MessageRow;
  },

  async update(messageId: string, payload: Partial<{
    content: string;
    content_iv: string | null;
    encrypted_keys: unknown;
    is_edited: boolean;
    edited_at: string | null;
    is_deleted: boolean;
    is_pinned: boolean;
    reply_to_id: string | null;
    spark_count: number;
    spark_senders_count: number;
    entities: unknown;
  }>) {
    const supabase = getServiceSupabaseClient();
    const { data, error } = await supabase
      .from("messages")
      .update(payload)
      .eq("id", messageId)
      .select("*")
      .maybeSingle();

    if (error || !data) {
      throw new Error("Failed to update message.");
    }

    return data as MessageRow;
  },

  async listPinnedMessages(chatId: string, limit = 10) {
    const supabase = getServiceSupabaseClient();
    const { data, error } = await supabase
      .from("messages")
      .select("*")
      .eq("chat_id", chatId)
      .eq("is_pinned", true)
      .eq("is_deleted", false)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) {
      throw new Error("Failed to load pinned messages.");
    }

    return (data ?? []) as MessageRow[];
  },
};
