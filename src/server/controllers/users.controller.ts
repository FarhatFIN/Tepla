import { NextResponse } from "next/server";
import { usersService } from "@/server/services/users.service";
import { subscriptionsService } from "@/server/services/subscriptions.service";
import { parseLimit } from "@/server/validation/validators";

export const usersController = {
  async search(request: Request) {
    try {
      const { searchParams } = new URL(request.url);
      const query = searchParams.get("q") ?? "";
      const limit = parseLimit(searchParams.get("limit"), 10, 30);
      const users = await usersService.searchUsers(query, limit);
      return NextResponse.json({ users }, { status: 200 });
    } catch (error) {
      return NextResponse.json(
        { error: error instanceof Error ? error.message : "Failed to search users." },
        { status: 400 },
      );
    }
  },

  async updateProfile(request: Request, context: { params: { userId: string } }) {
    try {
      const body = (await request.json()) as {
        username: string;
        displayName?: string | null;
        avatarUrl?: string | null;
        bio?: string | null;
        language?: string | null;
        birthDate?: string | null;
        statusEmoji?: string | null;
        usernameColor?: string | null;
        avatarAnimationEnabled?: boolean;
        voiceStatusUrl?: string | null;
        voiceStatusDurationSeconds?: number | null;
      };

      const profile = await usersService.updateProfile({
        userId: context.params.userId,
        username: body.username,
        displayName: body.displayName,
        avatarUrl: body.avatarUrl,
        bio: body.bio,
        language: body.language,
        birthDate: body.birthDate,
        statusEmoji: body.statusEmoji,
        usernameColor: body.usernameColor,
        avatarAnimationEnabled: body.avatarAnimationEnabled,
        voiceStatusUrl: body.voiceStatusUrl,
        voiceStatusDurationSeconds: body.voiceStatusDurationSeconds,
      });

      return NextResponse.json({ profile }, { status: 200 });
    } catch (error) {
      return NextResponse.json(
        { error: error instanceof Error ? error.message : "Failed to update profile." },
        { status: 400 },
      );
    }
  },

  async activatePremium(_request: Request, context: { params: { userId: string } }) {
    try {
      const result = await subscriptionsService.renewSubscription({
        userId: context.params.userId,
        plan: "monthly",
      });
      return NextResponse.json(result, { status: 200 });
    } catch (error) {
      return NextResponse.json(
        { error: error instanceof Error ? error.message : "Failed to activate premium." },
        { status: 400 },
      );
    }
  },
};
