import { NextResponse } from "next/server";
import { getServiceSupabaseClient } from "@/lib/db";

type SubscriptionPayload = {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
};

export async function POST(request: Request) {
  const body = (await request.json()) as {
    userId: string;
    subscription: SubscriptionPayload;
  };

  if (!body.userId || !body.subscription?.endpoint) {
    return NextResponse.json(
      { error: "userId and subscription are required." },
      { status: 400 },
    );
  }

  const supabase = getServiceSupabaseClient();

  const { error } = await supabase
    .from("push_subscriptions")
    .upsert(
      {
        user_id: body.userId,
        endpoint: body.subscription.endpoint,
        p256dh: body.subscription.keys.p256dh,
        auth: body.subscription.keys.auth,
      },
      {
        onConflict: "user_id,endpoint",
      },
    );

  if (error) {
    return NextResponse.json(
      { error: "Failed to save subscription." },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true }, { status: 201 });
}

