import { getServiceSupabaseClient } from "@/lib/db";

export type FileRow = {
  id: string;
  message_id: string;
  uploader_id: string | null;
  url: string;
  encrypted_url: string | null;
  thumbnail_url: string | null;
  type: string | null;
  mime_type: string | null;
  size_bytes: number | null;
  width: number | null;
  height: number | null;
  duration_seconds: number | null;
  file_name: string | null;
  is_spoiler: boolean | null;
  created_at: string;
};

export const filesRepository = {
  async listByMessageIds(messageIds: string[]) {
    if (messageIds.length === 0) {
      return [];
    }

    const supabase = getServiceSupabaseClient();
    const { data, error } = await supabase
      .from("files")
      .select("*")
      .in("message_id", messageIds);

    if (error) {
      throw new Error("Failed to load files.");
    }

    return (data ?? []) as FileRow[];
  },

  async insertForMessage(
    messageId: string,
    files: Array<{
      uploaderId: string | null;
      url: string;
      encryptedUrl?: string | null;
      thumbnailUrl?: string | null;
      type?: string | null;
      mimeType?: string | null;
      sizeBytes?: number | null;
      width?: number | null;
      height?: number | null;
      durationSeconds?: number | null;
      fileName?: string | null;
      isSpoiler?: boolean;
    }>,
  ) {
    if (files.length === 0) {
      return [];
    }

    const supabase = getServiceSupabaseClient();
    const { data, error } = await supabase
      .from("files")
      .insert(
        files.map((file) => ({
          message_id: messageId,
          uploader_id: file.uploaderId,
          url: file.url,
          encrypted_url: file.encryptedUrl ?? null,
          thumbnail_url: file.thumbnailUrl ?? null,
          type: file.type ?? null,
          mime_type: file.mimeType ?? null,
          size_bytes: file.sizeBytes ?? null,
          width: file.width ?? null,
          height: file.height ?? null,
          duration_seconds: file.durationSeconds ?? null,
          file_name: file.fileName ?? null,
          is_spoiler: file.isSpoiler ?? false,
        })),
      )
      .select("*");

    if (error) {
      throw new Error("Failed to create files.");
    }

    return (data ?? []) as FileRow[];
  },
};
