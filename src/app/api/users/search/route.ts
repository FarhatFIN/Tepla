import { usersController } from "@/server/controllers/users.controller";

export async function GET(request: Request) {
  return usersController.search(request);
}
