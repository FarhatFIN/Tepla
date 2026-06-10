import { NextResponse } from "next/server";
import { chatsService } from "@/server/services/chats.service";
import { messagesService } from "@/server/services/messages.service";

export const chatsController = {
  async list(request: Request) {
    try {
      const { searchParams } = new URL(request.url);
      const userId = searchParams.get("userId");
      if (!userId) {
        return NextResponse.json({ error: "userId is required." }, { status: 400 });
      }

      const chats = await chatsService.listChats(userId);
      return NextResponse.json({ chats }, { status: 200 });
    } catch (error) {
      return NextResponse.json(
        { error: error instanceof Error ? error.message : "Failed to load chats." },
        { status: 400 },
      );
    }
  },

  async create(request: Request) {
    try {
      const body = (await request.json()) as {
        userId: string;
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
              userId: body.userId,
              peerUserId: body.peerUserId,
              peerUsername: body.peerUsername,
              peerDisplayName: body.peerDisplayName,
            })
          : body.type === "channel"
            ? await chatsService.createChannel({
                userId: body.userId,
                name: body.name ?? "",
                username: body.username,
                description: body.description,
              })
          : await chatsService.createGroup({
              userId: body.userId,
              name: body.name ?? "",
              username: body.username,
              description: body.description,
              memberIds: body.memberIds,
            });
      return NextResponse.json({ chat }, { status: 201 });
    } catch (error) {
      return NextResponse.json(
        { error: error instanceof Error ? error.message : "Failed to create chat." },
        { status: 400 },
      );
    }
  },

  async addMembers(request: Request, context: { params: { chatId: string } }) {
    try {
      const body = (await request.json()) as {
        requesterId: string;
        memberIds: string[];
      };

      const chat = await chatsService.addMembers({
        chatId: context.params.chatId,
        requesterId: body.requesterId,
        memberIds: body.memberIds ?? [],
      });

      return NextResponse.json({ chat }, { status: 200 });
    } catch (error) {
      return NextResponse.json(
        { error: error instanceof Error ? error.message : "Failed to add members." },
        { status: 400 },
      );
    }
  },

  async toggleFavorite(request: Request, context: { params: { chatId: string } }) {
    try {
      const body = (await request.json()) as {
        userId: string;
        favorite: boolean;
      };

      if (!body.userId) {
        return NextResponse.json({ error: "userId is required." }, { status: 400 });
      }

      const result = await chatsService.toggleFavoriteChat({
        chatId: context.params.chatId,
        userId: body.userId,
        favorite: Boolean(body.favorite),
      });

      return NextResponse.json(result, { status: 200 });
    } catch (error) {
      return NextResponse.json(
        { error: error instanceof Error ? error.message : "Failed to update favorites." },
        { status: 400 },
      );
    }
  },

  async listPins(request: Request, context: { params: { chatId: string } }) {
    try {
      const { searchParams } = new URL(request.url);
      const userId = searchParams.get("userId");
      const pinnedMessages = await messagesService.listPinnedMessages(
        context.params.chatId,
        userId,
      );
      return NextResponse.json({ pinnedMessages }, { status: 200 });
    } catch (error) {
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
