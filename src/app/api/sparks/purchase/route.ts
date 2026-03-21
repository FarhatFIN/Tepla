import { sparksController } from "@/server/controllers/sparks.controller";

export async function POST(request: Request) {
  return sparksController.purchase(request);
}
