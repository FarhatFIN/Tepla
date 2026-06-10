import { getServiceSupabaseClient } from "@/lib/db";

export type BotUpdate = {
  id: string;
  chatId: string;
  senderId: string | null;
  text: string;
  createdAt: string;
};

export const dispatchBotUpdate = async (params: {
  botUserId: string;
  update: BotUpdate;
}): Promise<void> => {
  const supabase = getServiceSupabaseClient();
  const { data, error } = await supabase
    .from("bots")
    .select("webhook_url")
    .eq("user_id", params.botUserId)
    .maybeSingle();

  if (error || !data?.webhook_url) {
    return;
  }

  try {
    await fetch(data.webhook_url as string, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(params.update),
    });
  } catch {
    // Ignore webhook failures
  }
};

