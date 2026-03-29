import { NextResponse } from "next/server";
import { chatsService } from "@/server/services/chats.service";
import { messagesService } from "@/server/services/messages.service";
import { AuthError, requireAuth } from "@/server/auth/require-auth";

export const chatsController = {
  async list(request: Request) {
    try {
      const userId = await requireAuth(request);

      const chats = await chatsService.listChats(userId);
      return NextResponse.json({ chats }, { status: 200 });
    } catch (error) {
      if (error instanceof AuthError) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
      return NextResponse.json(
        { error: error instanceof Error ? error.message : "Failed to load chats." },
        { status: 400 },
      );
    }
  },

  async create(request: Request) {
    try {
      const userId = await requireAuth(request);
      const body = (await request.json()) as {
        type?: "group" | "direct" | "channel";
        name?: string;
        username?: string | null;
        description?: string | null;
        memberIds?: string[];
        peerUserId?: string;
        peerUsername?: string | null;
        peerDisplayName?: string | null;
      };

      const chat =
        body.type === "direct" && body.peerUserId
          ? await chatsService.ensureDirectChat({
              userId,
              peerUserId: body.peerUserId,
              peerUsername: body.peerUsername,
              peerDisplayName: body.peerDisplayName,
            })
          : body.type === "channel"
            ? await chatsService.createChannel({
                userId,
                name: body.name ?? "",
                username: body.username,
                description: body.description,
              })
          : await chatsService.createGroup({
              userId,
              name: body.name ?? "",
              username: body.username,
              description: body.description,
              memberIds: body.memberIds,
            });
      return NextResponse.json({ chat }, { status: 201 });
    } catch (error) {
      if (error instanceof AuthError) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
      return NextResponse.json(
        { error: error instanceof Error ? error.message : "Failed to create chat." },
        { status: 400 },
      );
    }
  },

  async addMembers(request: Request, context: { params: { chatId: string } }) {
    try {
      const userId = await requireAuth(request);
      const body = (await request.json()) as {
        memberIds: string[];
      };

      const chat = await chatsService.addMembers({
        chatId: context.params.chatId,
        requesterId: userId,
        memberIds: body.memberIds ?? [],
      });

      return NextResponse.json({ chat }, { status: 200 });
    } catch (error) {
      if (error instanceof AuthError) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
      return NextResponse.json(
        { error: error instanceof Error ? error.message : "Failed to add members." },
        { status: 400 },
      );
    }
  },

  async listPins(request: Request, context: { params: { chatId: string } }) {
    try {
      const userId = await requireAuth(request);
      const pinnedMessages = await messagesService.listPinnedMessages(
        context.params.chatId,
        userId,
      );
      return NextResponse.json({ pinnedMessages }, { status: 200 });
    } catch (error) {
      if (error instanceof AuthError) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
      return NextResponse.json(
        {
          error:
            error instanceof Error ? error.message : "Failed to load pinned messages.",
        },
        { status: 400 },
      );
    }
  },
};
