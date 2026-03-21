import { reactionsController } from "@/server/controllers/reactions.controller";

export async function POST(request: Request) {
  return reactionsController.add(request);
}

export async function DELETE(request: Request) {
  return reactionsController.remove(request);
}
