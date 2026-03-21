import { subscriptionsController } from "@/server/controllers/subscriptions.controller";

export async function GET(request: Request) {
  return subscriptionsController.status(request);
}

export async function POST(request: Request) {
  return subscriptionsController.purchase(request);
}

export async function PATCH(request: Request) {
  return subscriptionsController.renew(request);
}

