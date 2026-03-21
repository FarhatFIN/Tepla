import { Socket } from 'socket.io';
import { SessionManager } from './session-manager';
import { SecurityRateLimiter } from './rate-limiter';
import { DeviceSecurity } from './device-security';
import { AuditLogger } from './audit-logger';
import { SecurityConfig } from './config';
import Redis from 'ioredis';

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

      // 2. Validate session
      const session = await sessionManager.validate(token);
      if (!session) {
        await AuditLogger.log('ws_auth_failed', {
          ip: socket.handshake.address,
          reason: 'invalid_session',
        });
        throw new Error('Invalid or expired session');
      }

      // 3. Rate limit WebSocket connections per user
      await rateLimiter.check(
        `ws_conn:${session.userId}`,
        SecurityConfig.WS_CONNECTION_LIMIT
      );

      // 4. Device fingerprint check
      const fingerprint = DeviceSecurity.fingerprint(
        socket.handshake.headers as Record<string, string>,
        socket.handshake.auth?.deviceId
      );

      // Check for anomaly on WebSocket connection
      const anomaly = await deviceSecurity.detectAnomaly(
        session.userId,
        fingerprint,
        socket.handshake.address
      );

      if (anomaly.suspicious) {
        await AuditLogger.log('ws_anomaly_detected', {
          userId: session.userId,
          reason: anomaly.reason,
          ip: socket.handshake.address,
        });
        // Don't reject — log and flag for monitoring
      }

      // Register device activity
      await deviceSecurity.registerDevice(session.userId, fingerprint, {
        userAgent: socket.handshake.headers['user-agent'] || 'unknown',
        ip: socket.handshake.address,
      });

      // 5. Attach user info to socket
      (socket as any).userId = session.userId;
      (socket as any).sessionToken = token;
      (socket as any).deviceFingerprint = fingerprint;

      await AuditLogger.log('ws_connected', {
        userId: session.userId,
        socketId: socket.id,
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
