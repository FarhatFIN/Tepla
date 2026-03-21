import { NextResponse } from "next/server";
import { isPremiumPlan, type PremiumPlan } from "@/lib/premium";
import { subscriptionsService } from "@/server/services/subscriptions.service";

export const subscriptionsController = {
  async status(request: Request) {
    try {
      const { searchParams } = new URL(request.url);
      const userId = searchParams.get("userId");
      if (!userId) {
        return NextResponse.json({ error: "userId is required." }, { status: 400 });
      }

      const state = await subscriptionsService.getPremiumState(userId);
      return NextResponse.json(state, { status: 200 });
    } catch (error) {
      return NextResponse.json(
        { error: error instanceof Error ? error.message : "Failed to load premium status." },
        { status: 400 },
      );
    }
  },

  async purchase(request: Request) {
    try {
      const body = (await request.json()) as { userId: string; plan: PremiumPlan };
      if (!body.userId || !isPremiumPlan(body.plan)) {
        return NextResponse.json(
          { error: "userId and a valid plan are required." },
          { status: 400 },
        );
      }

      const payload = await subscriptionsService.purchaseSubscription(body);
      return NextResponse.json(payload, { status: 201 });
    } catch (error) {
      return NextResponse.json(
        { error: error instanceof Error ? error.message : "Failed to purchase premium." },
        { status: 400 },
      );
    }
  },

  async renew(request: Request) {
    try {
      const body = (await request.json()) as { userId: string; plan?: PremiumPlan | null };
      if (!body.userId) {
        return NextResponse.json({ error: "userId is required." }, { status: 400 });
      }

      const payload = await subscriptionsService.renewSubscription({
        userId: body.userId,
        plan: body.plan,
      });
      return NextResponse.json(payload, { status: 200 });
    } catch (error) {
      return NextResponse.json(
        { error: error instanceof Error ? error.message : "Failed to renew premium." },
        { status: 400 },
      );
    }
  },
};
