import { NextResponse } from "next/server";
import { getServiceSupabaseClient } from "@/lib/db";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get("userId");

  if (!userId) {
    return NextResponse.json(
      { error: "userId is required." },
      { status: 400 },
    );
  }

  const supabase = getServiceSupabaseClient();
  const { data, error } = await supabase
    .from("bots")
    .select("*")
    .eq("user_id", userId);

  if (error) {
    return NextResponse.json(
      { error: "Failed to load bots." },
      { status: 500 },
    );
  }

  return NextResponse.json({ bots: data ?? [] }, { status: 200 });
}

export async function POST(request: Request) {
  const body = (await request.json()) as {
    userId: string;
    name: string;
    username: string;
    description?: string;
    webhookUrl?: string;
    isInline?: boolean;
  };

  if (!body.userId || !body.username || !body.name) {
    return NextResponse.json(
      { error: "userId, username, and name are required." },
      { status: 400 },
    );
  }

  const supabase = getServiceSupabaseClient();

  const token = crypto.randomUUID();

  const { data, error } = await supabase
    .from("bots")
    .insert({
      user_id: body.userId,
      token,
      name: body.name,
      username: body.username,
      description: body.description ?? null,
      webhook_url: body.webhookUrl ?? null,
      is_inline: body.isInline ?? false,
    })
    .select("*")
    .maybeSingle();

  if (error || !data) {
    return NextResponse.json(
      { error: "Failed to create bot." },
      { status: 500 },
    );
  }

  return NextResponse.json({ bot: data }, { status: 201 });
}

