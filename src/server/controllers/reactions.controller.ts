import { NextResponse } from "next/server";
import { reactionsService } from "@/server/services/reactions.service";

export const reactionsController = {
  async add(request: Request) {
    try {
      const body = (await request.json()) as {
        messageId: string;
        userId: string;
        emoji: string;
      };

      const reactions = await reactionsService.addReaction(body);
      return NextResponse.json({ reactions }, { status: 201 });
    } catch (error) {
      return NextResponse.json(
        { error: error instanceof Error ? error.message : "Failed to add reaction." },
        { status: 400 },
      );
    }
  },

  async remove(request: Request) {
    try {
      const { searchParams } = new URL(request.url);
      const messageId = searchParams.get("messageId");
      const userId = searchParams.get("userId");
      const emoji = searchParams.get("emoji");

      if (!messageId || !userId || !emoji) {
        return NextResponse.json(
          { error: "messageId, userId, and emoji are required." },
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
      return NextResponse.json(
        { error: error instanceof Error ? error.message : "Failed to remove reaction." },
        { status: 400 },
      );
    }
  },
};
