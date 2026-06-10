import { usersController } from "@/server/controllers/users.controller";

export async function PATCH(
  request: Request,
  context: { params: { userId: string } },
) {
  return usersController.updateProfile(request, context);
}
