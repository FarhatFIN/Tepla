import { NextResponse } from "next/server";
import webPush from "web-push";
import { getServiceSupabaseClient } from "@/lib/db";

const getWebPushConfigured = () => {
  const publicKey = process.env.VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT ?? "mailto:admin@tepla.app";
  if (!publicKey || !privateKey) {
    return null;
  }
  webPush.setVapidDetails(subject, publicKey, privateKey);
  return { publicKey, privateKey };
};

export async function POST(request: Request) {
  const supabase = getServiceSupabaseClient();
  const { userId, title, body, url } = (await request.json()) as {
    userId: string;
    title?: string;
    body?: string;
    url?: string;
  };

  if (!userId) {
    return NextResponse.json(
      { error: "userId is required." },
      { status: 400 },
    );
  }

  const vapid = getWebPushConfigured();
  if (!vapid) {
    return NextResponse.json(
      { error: "Web Push is not configured." },
      { status: 503 },
    );
  }

  const { data, error } = await supabase
    .from("push_subscriptions")
    .select("*")
    .eq("user_id", userId);

  if (error) {
    return NextResponse.json(
      { error: "Failed to load subscriptions." },
      { status: 500 },
    );
  }

  const payload = JSON.stringify({
    title: title ?? "Tepla",
    body: body ?? "Test notification",
    url: url ?? "/",
  });

  await Promise.all(
    (data ?? []).map(async (row) => {
      try {
        await webPush.sendNotification(
          {
            endpoint: row.endpoint as string,
            keys: {
              p256dh: row.p256dh as string,
              auth: row.auth as string,
            },
          },
          payload,
        );
      } catch {
        // ignore failures for test endpoint
      }
    }),
  );

  return NextResponse.json({ ok: true }, { status: 200 });
}

