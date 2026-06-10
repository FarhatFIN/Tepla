import { sparksController } from "@/server/controllers/sparks.controller";

export async function GET(request: Request) {
  return sparksController.wallet(request);
}
