import { usersRepository } from "@/server/database/users.repository";

/**
 * Custom error thrown when the request is not authenticated.
 * Controllers catch this and return a 401 response.
 */
export class AuthError extends Error {
  readonly status = 401;
  constructor(message = "Unauthorized") {
    super(message);
    this.name = "AuthError";
  }
}

/**
 * Reads and validates the Authorization header from a request.
 * Expected format: `Authorization: Bearer session-<userId>`
 *
 * Returns the authenticated userId, or throws AuthError.
 */
export async function requireAuth(request: Request): Promise<string> {
  const authHeader = request.headers.get("authorization");
  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7).trim() : null;

  if (!token || !token.startsWith("session-")) {
    throw new AuthError();
  }

  const userId = token.slice("session-".length).trim();
  if (!userId) {
    throw new AuthError();
  }

  const user = await usersRepository.findById(userId);
  if (!user) {
    throw new AuthError();
  }

  return userId;
}

/**
 * Validates a raw session token (used in WebSocket middleware).
 * Returns userId on success, null on failure.
 */
export async function validateToken(token: string): Promise<string | null> {
  if (!token || !token.startsWith("session-")) {
    return null;
  }
  const userId = token.slice("session-".length).trim();
  if (!userId) return null;

  try {
    const user = await usersRepository.findById(userId);
    return user ? userId : null;
  } catch {
    return null;
  }
}
