import { messagesController } from "@/server/controllers/messages.controller";

export async function POST(
  request: Request,
  context: { params: { messageId: string } },
) {
  return messagesController.pin(request, context);
}
