import { NextResponse } from "next/server";
import { messagesService } from "@/server/services/messages.service";
import { AuthError, requireAuth } from "@/server/auth/require-auth";

export const messagesController = {
  async list(request: Request) {
    try {
      const userId = await requireAuth(request);
      const { searchParams } = new URL(request.url);
      const chatId = searchParams.get("chatId");
      if (!chatId) {
        return NextResponse.json({ error: "chatId is required." }, { status: 400 });
      }

      const payload = await messagesService.listMessages({
        chatId,
        userId,
        limit: searchParams.get("limit"),
        cursor: searchParams.get("cursor"),
      });

      return NextResponse.json(payload, { status: 200 });
    } catch (error) {
      if (error instanceof AuthError) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
      return NextResponse.json(
        { error: error instanceof Error ? error.message : "Failed to load messages." },
        { status: 400 },
      );
    }
  },

  async create(request: Request) {
    try {
      const userId = await requireAuth(request);
      const body = (await request.json()) as {
        chatId: string;
        clientMessageId?: string | null;
        content?: string | null;
        contentIv?: string | null;
        encryptedKeys?: unknown;
        type: import("@/types/message").MessageType;
        replyToMessageId?: string | null;
        entities?: unknown;
        attachments?: Array<{
          url: string;
          encryptedUrl?: string | null;
          thumbnailUrl?: string | null;
          type?: string | null;
          mimeType?: string | null;
          sizeBytes?: number | null;
          width?: number | null;
          height?: number | null;
          durationSeconds?: number | null;
          fileName?: string | null;
          isSpoiler?: boolean;
        }>;
      };

      const message = await messagesService.createMessage({
        ...body,
        senderId: userId,
      });
      return NextResponse.json({ message }, { status: 201 });
    } catch (error) {
      if (error instanceof AuthError) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
      return NextResponse.json(
        { error: error instanceof Error ? error.message : "Failed to send message." },
        { status: 400 },
      );
    }
  },

  async update(request: Request, context: { params: { messageId: string } }) {
    try {
      const userId = await requireAuth(request);
      const body = (await request.json()) as { content: string };
      const message = await messagesService.editMessage({
        messageId: context.params.messageId,
        userId,
        content: body.content,
      });
      return NextResponse.json({ message }, { status: 200 });
    } catch (error) {
      if (error instanceof AuthError) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
      return NextResponse.json(
        { error: error instanceof Error ? error.message : "Failed to edit message." },
        { status: 400 },
      );
    }
  },

  async remove(request: Request, context: { params: { messageId: string } }) {
    try {
      const userId = await requireAuth(request);

      const payload = await messagesService.deleteMessage({
        messageId: context.params.messageId,
        userId,
      });
      return NextResponse.json(payload, { status: 200 });
    } catch (error) {
      if (error instanceof AuthError) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
      return NextResponse.json(
        { error: error instanceof Error ? error.message : "Failed to delete message." },
        { status: 400 },
      );
    }
  },

  async pin(request: Request, context: { params: { messageId: string } }) {
    try {
      const userId = await requireAuth(request);
      const body = (await request.json()) as { pinned?: boolean };
      const pinnedMessages = await messagesService.setPinnedState({
        messageId: context.params.messageId,
        userId,
        pinned: body.pinned ?? true,
      });

      return NextResponse.json({ pinnedMessages }, { status: 200 });
    } catch (error) {
      if (error instanceof AuthError) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
      return NextResponse.json(
        { error: error instanceof Error ? error.message : "Failed to pin message." },
        { status: 400 },
      );
    }
  },
};
