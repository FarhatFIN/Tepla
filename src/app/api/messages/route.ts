import { messagesController } from "@/server/controllers/messages.controller";

export async function GET(request: Request) {
  return messagesController.list(request);
}

export async function POST(request: Request) {
  return messagesController.create(request);
}

