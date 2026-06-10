import { messagesController } from "@/server/controllers/messages.controller";

export async function PATCH(
  request: Request,
  context: { params: { messageId: string } },
) {
  return messagesController.update(request, context);
}

export async function DELETE(
  request: Request,
  context: { params: { messageId: string } },
) {
  return messagesController.remove(request, context);
}
