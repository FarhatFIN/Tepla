import { getServiceSupabaseClient } from "@/lib/db";

const MAX_FILE_BYTES = 4 * 1024 * 1024 * 1024; // 4 GB

const formatFileLimit = (bytes: number) => {
  if (bytes >= 1024 * 1024 * 1024) {
    return `${Math.round(bytes / 1024 / 1024 / 1024)} GB`;
  }

  return `${Math.round(bytes / 1024 / 1024)} MB`;
};

export const storageService = {
  async uploadFile(file: File, type: string, userId?: string | null) {
    if (file.size > MAX_FILE_BYTES) {
      throw new Error(`File is too large. Current limit is ${formatFileLimit(MAX_FILE_BYTES)}.`);
    }

    const supabase = getServiceSupabaseClient();
    const bucket = supabase.storage.from("tepla-media");
    const ext = file.name.split(".").pop() ?? "bin";
    const path = `${type}/${Date.now()}-${crypto.randomUUID().slice(0, 8)}.${ext}`;

    const { data, error } = await bucket.upload(path, file, {
      contentType: file.type,
      upsert: false,
    });

    if (error || !data) {
      throw new Error("Failed to upload file.");
    }

    const { data: urlData } = bucket.getPublicUrl(data.path);
    return {
      url: urlData.publicUrl,
      path: data.path,
      mimeType: file.type,
      sizeBytes: file.size,
      fileName: file.name,
      storage: "cloud",
      maxFileBytes,
    };
  },
};
