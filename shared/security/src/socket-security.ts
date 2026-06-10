import { Socket } from 'socket.io';
import { SessionManager } from './session-manager';
import { SecurityRateLimiter } from './rate-limiter';
import { DeviceSecurity } from './device-security';
import { AuditLogger } from './audit-logger';
import { SecurityConfig } from './config';
import Redis from 'ioredis';
import crypto from 'crypto';

function verifyJwtAccessToken(token: string): { userId: string } | null {
  const secret = process.env.JWT_SECRET;
  if (!secret) return null;

  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;

    const [header, payload, signature] = parts;
    
    // Verify signature using HMAC-SHA256
    const expected = crypto
      .createHmac('sha256', secret)
      .update(`${header}.${payload}`)
      .digest('base64url');

    const actualBuffer = Buffer.from(signature, 'base64url');
    const expectedBuffer = Buffer.from(expected, 'base64url');
    
    if (actualBuffer.length !== expectedBuffer.length || !crypto.timingSafeEqual(actualBuffer, expectedBuffer)) {
      return null;
    }

    // Decode and validate payload
    const decoded = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as { sub?: string; userId?: string; exp?: number; iat?: number };
    
    // Support both 'sub' (standard) and 'userId' (custom) claims
    const userId = decoded.sub || decoded.userId;
    if (!userId) return null;
    
    // Check expiration if present
    if (decoded.exp && decoded.exp * 1000 <= Date.now()) return null;

    return { userId };
  } catch {
    return null;
  }
}

/**
 * Socket.IO Security Middleware
 * Validates session token, rate limits connections, device fingerprinting
 */
export function socketSecurity(redis: Redis) {
  const sessionManager = new SessionManager(redis);
  const rateLimiter = new SecurityRateLimiter(redis);
  const deviceSecurity = new DeviceSecurity(redis);

  return async (socket: Socket, next: (err?: Error) => void) => {
    try {
      // 1. Extract token
      const token = socket.handshake.auth?.token;
      if (!token) {
        throw new Error('Authentication token required');
      }

      // 2. Validate session or JWT token
      let session = await sessionManager.validate(token);
      let jwtSession: { userId: string } | null = null;
      
      // If session not found, try JWT verification
      if (!session) {
        jwtSession = verifyJwtAccessToken(token);
        if (!jwtSession) {
          await AuditLogger.log('ws_auth_failed', {
            ip: socket.handshake.address,
            reason: 'invalid_token',
            tokenType: 'unknown',
          });
          throw new Error('Invalid or expired authentication token');
        }
      }

      // 3. Rate limit WebSocket connections per user
      const userId = session?.userId || jwtSession!.userId;
      await rateLimiter.check(
        `ws_conn:${userId}`,
        SecurityConfig.WS_CONNECTION_LIMIT
      );

      // 4. Device fingerprint check
      const fingerprint = DeviceSecurity.fingerprint(
        socket.handshake.headers as Record<string, string>,
        socket.handshake.auth?.deviceId
      );

      // Check for anomaly on WebSocket connection
      const anomaly = await deviceSecurity.detectAnomaly(
        userId,
        fingerprint,
        socket.handshake.address
      );

      if (anomaly.suspicious) {
        await AuditLogger.log('ws_anomaly_detected', {
          userId,
          reason: anomaly.reason,
          ip: socket.handshake.address,
        });
        // Don't reject — log and flag for monitoring
      }

      // Register device activity
      await deviceSecurity.registerDevice(userId, fingerprint, {
        userAgent: socket.handshake.headers['user-agent'] || 'unknown',
        ip: socket.handshake.address,
      });

      // 5. Attach user info to socket
      (socket as any).userId = userId;
      (socket as any).sessionToken = token;
      (socket as any).deviceFingerprint = fingerprint;
      (socket as any).tokenType = session ? 'session' : 'jwt';

      await AuditLogger.log('ws_connected', {
        userId,
        socketId: socket.id,
        tokenType: session ? 'session' : 'jwt',
      });

      next();
    } catch (err) {
      await AuditLogger.log('ws_auth_error', {
        error: (err as Error).message,
        ip: socket.handshake.address,
      });
      next(new Error('Authentication failed'));
    }
  };
}

/**
 * Per-message rate limiter for WebSocket events
 */
export function socketMessageRateLimit(redis: Redis) {
  const rateLimiter = new SecurityRateLimiter(redis);

  return async (socket: Socket, next: (err?: Error) => void) => {
    const userId = (socket as any).userId;
    if (!userId) return next(new Error('Not authenticated'));

    try {
      await rateLimiter.check(
        `ws_msg:${userId}`,
        SecurityConfig.WS_MESSAGE_LIMIT
      );
      next();
    } catch {
      await AuditLogger.log('ws_rate_limit', { userId, socketId: socket.id });
      // Don't disconnect — just drop the message
      next(new Error('Message rate limit exceeded'));
    }
  };
}
