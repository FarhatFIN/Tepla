import jwt from 'jsonwebtoken';

export interface VerifiedAccessToken {
  userId: string;
  jti?: string;
}

/**
 * Verify a WebSocket bearer token.
 *
 * C-04: the previous implementation was a hand-rolled verifier that recomputed
 * the HMAC by hand. The signature check itself was sound, but it never looked
 * at the `type` claim — so a **refresh token**, signed with the same secret and
 * valid for 30 days, opened a WebSocket happily, even though the HTTP
 * middleware rejects exactly that. It also treated a token with no `exp` as
 * valid forever.
 *
 * Split into its own module (rather than living inside socket-security.ts,
 * which pulls in ioredis) so the rules can be unit tested directly.
 */
export function verifyAccessToken(token: string, secret = process.env.JWT_SECRET): VerifiedAccessToken | null {
  if (!secret || typeof token !== 'string' || token.length === 0) return null;

  try {
    const decoded = jwt.verify(token, secret, {
      // Pin the algorithm so the token's own header cannot steer verification.
      algorithms: ['HS256'],
    }) as { sub?: string; userId?: string; exp?: number; jti?: string; type?: string };

    // A refresh token must never open a socket.
    if (decoded.type === 'refresh') return null;

    // Reject non-expiring tokens outright rather than trusting them forever.
    if (typeof decoded.exp !== 'number') return null;

    const userId = decoded.sub || decoded.userId;
    if (!userId) return null;

    return { userId, jti: decoded.jti };
  } catch {
    return null;
  }
}
