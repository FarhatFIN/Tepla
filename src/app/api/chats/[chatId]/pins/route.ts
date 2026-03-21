import { chatsController } from "@/server/controllers/chats.controller";

export async function GET(
  request: Request,
  context: { params: { chatId: string } },
) {
  return chatsController.listPins(request, context);
}
