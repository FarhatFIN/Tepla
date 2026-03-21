import { usersController } from "@/server/controllers/users.controller";

export async function POST(
  request: Request,
  context: { params: { userId: string } },
) {
  return usersController.activatePremium(request, context);
}
