import webPush from "web-push";
import { getServiceSupabaseClient } from "@/lib/db";

let configured = false;

const ensureVapid = (): boolean => {
  if (configured) return true;
  const publicKey = process.env.VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT ?? "mailto:admin@tepla.app";
  if (!publicKey || !privateKey) return false;
  webPush.setVapidDetails(subject, publicKey, privateKey);
  configured = true;
  return true;
};

type PushPayload = {
  title: string;
  body: string;
  url?: string;
};

/**
 * Send push notifications to a list of user IDs.
 * Silently skips if VAPID is not configured.
 */
export const pushService = {
  async notifyUsers(userIds: string[], payload: PushPayload): Promise<void> {
    if (userIds.length === 0 || !ensureVapid()) return;

    const supabase = getServiceSupabaseClient();
    const { data: subscriptions } = await supabase
      .from("push_subscriptions")
      .select("endpoint, p256dh, auth")
      .in("user_id", userIds);

    if (!subscriptions?.length) return;

    const jsonPayload = JSON.stringify({
      title: payload.title,
      body: payload.body,
      url: payload.url ?? "/",
    });

    await Promise.allSettled(
      subscriptions.map((row) =>
        webPush.sendNotification(
          {
            endpoint: row.endpoint as string,
            keys: {
              p256dh: row.p256dh as string,
              auth: row.auth as string,
            },
          },
          jsonPayload,
        ).catch(() => {
          // Subscription expired or invalid — could clean up here
        }),
      ),
    );
  },
};
