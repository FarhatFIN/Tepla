import { NextResponse } from "next/server";
import { getServiceSupabaseClient } from "@/lib/db";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get("userId");

  const supabase = getServiceSupabaseClient();

  let query = supabase
    .from("stories")
    .select("*")
    .gt("expires_at", new Date().toISOString())
    .order("created_at", { ascending: false });

  if (userId) {
    query = query.eq("user_id", userId);
  }

  const { data, error } = await query;

  if (error) {
    return NextResponse.json(
      { error: "Failed to load stories." },
      { status: 500 },
    );
  }

  return NextResponse.json({ stories: data ?? [] });
}

export async function POST(request: Request) {
  const body = (await request.json()) as {
    userId: string;
    mediaUrl: string;
    thumbnailUrl?: string;
    type: "photo" | "video" | "circle";
    caption?: string;
    privacy?: string;
  };

  if (!body.userId || !body.mediaUrl || !body.type) {
    return NextResponse.json(
      { error: "userId, mediaUrl, and type are required." },
      { status: 400 },
    );
  }

  try {
    const supabase = getServiceSupabaseClient();

    const { data, error } = await supabase
      .from("stories")
      .insert({
        user_id: body.userId,
        media_url: body.mediaUrl,
        thumbnail_url: body.thumbnailUrl,
        type: body.type === "circle" ? "video" : body.type,
        caption: body.caption,
        privacy: body.privacy ?? "contacts",
      })
      .select("*")
      .maybeSingle();

    if (error || !data) {
      return NextResponse.json(
        { error: "Failed to create story." },
        { status: 500 },
      );
    }

    return NextResponse.json(
      {
        story: {
          ...data,
          type: body.type,
        },
      },
      { status: 201 },
    );
  } catch {
    return NextResponse.json(
      {
        story: {
          id: crypto.randomUUID(),
          user_id: body.userId,
          media_url: body.mediaUrl,
          thumbnail_url: body.thumbnailUrl ?? null,
          type: body.type,
          caption: body.caption ?? null,
          privacy: body.privacy ?? "contacts",
          created_at: new Date().toISOString(),
          expires_at: new Date(Date.now() + 86400000).toISOString(),
          mode: "demo",
        },
      },
      { status: 201 },
    );
  }
}
