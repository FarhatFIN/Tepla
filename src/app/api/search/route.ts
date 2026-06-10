import { NextResponse } from "next/server";
import { messagesRepository } from "@/server/database/messages.repository";
import { chatsRepository } from "@/server/database/chats.repository";
import { hydrateMessages } from "@/server/services/messages.service";

/**
 * GET /api/search/messages?q=...&chatId=...&userId=...&type=...&limit=...
 * Searches messages within a chat. Uses database ILIKE as fallback
 * when Elasticsearch is not available.
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const query = url.searchParams.get("q")?.trim();
  const chatId = url.searchParams.get("chatId");
  const userId = url.searchParams.get("userId");
  const type = url.searchParams.get("type");
  const limit = Math.min(parseInt(url.searchParams.get("limit") ?? "50", 10), 100);

  if (!query || query.length < 2) {
    return NextResponse.json({ messages: [], total: 0 });
  }

  if (!chatId) {
    return NextResponse.json(
      { error: "chatId is required." },
      { status: 400 },
    );
  }

  if (!userId) {
    return NextResponse.json(
      { error: "userId is required." },
      { status: 400 },
    );
  }

  try {
    // Verify user is a member of this chat before allowing search
    const memberIds = await chatsRepository.listMemberIds(chatId);
    if (!memberIds.includes(userId)) {
      return NextResponse.json(
        { error: "Access denied." },
        { status: 403 },
      );
    }

    // Try Elasticsearch first via messaging-core-service
    const esUrl = process.env.MESSAGING_CORE_URL ?? process.env.NEXT_PUBLIC_API_URL;
    if (esUrl) {
      try {
        const params = new URLSearchParams({ q: query, chatId, limit: String(limit) });
        if (type) params.set("type", type);

        const esResponse = await fetch(`${esUrl}/api/search/messages?${params}`, {
          headers: { "Content-Type": "application/json" },
          signal: AbortSignal.timeout(3000),
        });

        if (esResponse.ok) {
          const esData = await esResponse.json();
          return NextResponse.json(esData);
        }
      } catch {
        // Elasticsearch unavailable, fall through to database search
      }
    }

    // Fallback: database search via ILIKE
    const rows = await messagesRepository.searchByContent(chatId, query, limit);
    const hydrated = await hydrateMessages(rows, userId);

    return NextResponse.json({
      messages: hydrated,
      total: hydrated.length,
    });
  } catch (error) {
    return NextResponse.json(
      { error: "Search failed." },
      { status: 500 },
    );
  }
}
