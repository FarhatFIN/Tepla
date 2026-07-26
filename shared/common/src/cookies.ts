import type { Request, Response, NextFunction } from 'express';

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      cookies?: Record<string, string>;
    }
  }
}

/**
 * Parse a `Cookie` header into a plain object.
 *
 * Deliberately dependency-free: the services read `req.cookies` in several
 * places (refresh-token fallback, device fingerprinting) but `cookie-parser`
 * was never registered anywhere, so every one of those reads silently
 * evaluated to `undefined` (H-04).
 *
 * Values are URI-decoded; a value that fails to decode is kept verbatim rather
 * than throwing, because a malformed cookie must not 500 the request.
 */
export function parseCookieHeader(header: string | undefined): Record<string, string> {
  const out: Record<string, string> = {};
  if (!header) return out;

  for (const part of header.split(';')) {
    const eq = part.indexOf('=');
    if (eq < 1) continue;

    const name = part.slice(0, eq).trim();
    if (!name) continue;

    let value = part.slice(eq + 1).trim();
    if (value.length >= 2 && value.startsWith('"') && value.endsWith('"')) {
      value = value.slice(1, -1);
    }

    // First occurrence wins, matching cookie-parser.
    if (name in out) continue;

    try {
      out[name] = decodeURIComponent(value);
    } catch {
      out[name] = value;
    }
  }

  return out;
}

/** Express middleware that populates `req.cookies`. */
export function cookieMiddleware() {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.cookies) {
      req.cookies = parseCookieHeader(req.headers.cookie);
    }
    next();
  };
}
