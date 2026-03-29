import { NextResponse } from "next/server";
import { reactionsService } from "@/server/services/reactions.service";
import { AuthError, requireAuth } from "@/server/auth/require-auth";

export const reactionsController = {
  async add(request: Request) {
    try {
      const userId = await requireAuth(request);
      const body = (await request.json()) as {
        messageId: string;
        emoji: string;
      };

      const reactions = await reactionsService.addReaction({
        messageId: body.messageId,
        userId,
        emoji: body.emoji,
      });
      return NextResponse.json({ reactions }, { status: 201 });
    } catch (error) {
      if (error instanceof AuthError) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
      return NextResponse.json(
        { error: error instanceof Error ? error.message : "Failed to add reaction." },
        { status: 400 },
      );
    }
  },

  async remove(request: Request) {
    try {
      const userId = await requireAuth(request);
      const { searchParams } = new URL(request.url);
      const messageId = searchParams.get("messageId");
      const emoji = searchParams.get("emoji");

      if (!messageId || !emoji) {
        return NextResponse.json(
          { error: "messageId and emoji are required." },
          { status: 400 },
        );
      }

      const reactions = await reactionsService.removeReaction({
        messageId,
        userId,
        emoji,
      });
      return NextResponse.json({ reactions }, { status: 200 });
    } catch (error) {
      if (error instanceof AuthError) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
      return NextResponse.json(
        { error: error instanceof Error ? error.message : "Failed to remove reaction." },
        { status: 400 },
      );
    }
  },
};
