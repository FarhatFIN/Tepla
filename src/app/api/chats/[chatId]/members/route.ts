import { chatsController } from "@/server/controllers/chats.controller";

export async function POST(
  request: Request,
  context: { params: { chatId: string } },
) {
  return chatsController.addMembers(request, context);
}
