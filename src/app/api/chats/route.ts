import { chatsController } from "@/server/controllers/chats.controller";

export async function GET(request: Request) {
  return chatsController.list(request);
}

export async function POST(request: Request) {
  return chatsController.create(request);
}
