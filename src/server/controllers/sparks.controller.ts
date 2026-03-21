import { NextResponse } from "next/server";
import { sparksService } from "@/server/services/sparks.service";
import type { SparksGiftId } from "@/types/sparks";

export const sparksController = {
  async wallet(request: Request) {
    try {
      const { searchParams } = new URL(request.url);
      const userId = searchParams.get("userId");

      if (!userId) {
        return NextResponse.json({ error: "userId is required." }, { status: 400 });
      }

      const payload = await sparksService.getWalletState(userId);
      return NextResponse.json(payload, { status: 200 });
    } catch (error) {
      return NextResponse.json(
        { error: error instanceof Error ? error.message : "Failed to load sparks wallet." },
        { status: 400 },
      );
    }
  },

  async purchase(request: Request) {
    try {
      const body = (await request.json()) as { userId: string; packageAmount: number };
      if (!body.userId) {
        return NextResponse.json({ error: "userId is required." }, { status: 400 });
      }

      const payload = await sparksService.purchaseSparks(body);
      return NextResponse.json(payload, { status: 200 });
    } catch (error) {
      return NextResponse.json(
        { error: error instanceof Error ? error.message : "Failed to purchase sparks." },
        { status: 400 },
      );
    }
  },

  async transfer(request: Request) {
    try {
      const body = (await request.json()) as {
        fromUserId: string;
        toUserId?: string | null;
        chatId?: string | null;
        messageId?: string | null;
        amount?: number | null;
        giftId?: SparksGiftId | null;
      };

      if (!body.fromUserId) {
        return NextResponse.json({ error: "fromUserId is required." }, { status: 400 });
      }

      if (body.messageId) {
        const payload = await sparksService.sendToMessage({
          fromUserId: body.fromUserId,
          messageId: body.messageId,
          amount: body.amount ?? null,
          giftId: body.giftId ?? null,
        });
        return NextResponse.json(payload, { status: 200 });
      }

      if (body.chatId) {
        const payload = await sparksService.donateToChat({
          fromUserId: body.fromUserId,
          chatId: body.chatId,
          amount: body.amount ?? null,
        });
        return NextResponse.json(payload, { status: 200 });
      }

      if (body.toUserId) {
        const payload = await sparksService.transferToUser({
          fromUserId: body.fromUserId,
          toUserId: body.toUserId,
          amount: body.amount ?? null,
        });
        return NextResponse.json(payload, { status: 200 });
      }

      return NextResponse.json(
        { error: "toUserId, chatId, or messageId is required." },
        { status: 400 },
      );
    } catch (error) {
      return NextResponse.json(
        { error: error instanceof Error ? error.message : "Failed to transfer sparks." },
        { status: 400 },
      );
    }
  },
};
