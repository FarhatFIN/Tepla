import { getServiceSupabaseClient } from "@/lib/db";
import { PREMIUM_LIMITS, STANDARD_LIMITS } from "@/lib/premium";
import { subscriptionsService } from "@/server/services/subscriptions.service";

const formatFileLimit = (bytes: number) => {
  if (bytes >= 1024 * 1024 * 1024) {
    return `${Math.round(bytes / 1024 / 1024 / 1024)} GB`;
  }

  return `${Math.round(bytes / 1024 / 1024)} MB`;
};

export const storageService = {
  async uploadFile(file: File, type: string, userId?: string | null) {
    const premiumState = userId
      ? await subscriptionsService.getPremiumState(userId).catch(() => null)
      : null;
    const maxFileBytes = premiumState?.isPremium
      ? PREMIUM_LIMITS.maxFileBytes
      : STANDARD_LIMITS.maxFileBytes;

    if (file.size > maxFileBytes) {
      throw new Error(`File is too large. Current limit is ${formatFileLimit(maxFileBytes)}.`);
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
