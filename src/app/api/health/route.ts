import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json(
    {
      ok: true,
      product: "Tepla",
      timestamp: new Date().toISOString(),
      services: {
        socket: true,
        supabaseConfigured: Boolean(
          process.env.NEXT_PUBLIC_SUPABASE_URL &&
            process.env.SUPABASE_SERVICE_ROLE_KEY,
        ),
        notificationsConfigured: Boolean(
          process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY,
        ),
      },
    },
    { status: 200 },
  );
}
