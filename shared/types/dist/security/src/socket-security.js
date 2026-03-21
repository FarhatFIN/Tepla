"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.socketSecurity = socketSecurity;
exports.socketMessageRateLimit = socketMessageRateLimit;
const session_manager_1 = require("./session-manager");
const rate_limiter_1 = require("./rate-limiter");
const device_security_1 = require("./device-security");
const audit_logger_1 = require("./audit-logger");
const config_1 = require("./config");
/**
 * Socket.IO Security Middleware
 * Validates session token, rate limits connections, device fingerprinting
 */
function socketSecurity(redis) {
    const sessionManager = new session_manager_1.SessionManager(redis);
    const rateLimiter = new rate_limiter_1.SecurityRateLimiter(redis);
    const deviceSecurity = new device_security_1.DeviceSecurity(redis);
    return async (socket, next) => {
        try {
            // 1. Extract token
            const token = socket.handshake.auth?.token;
            if (!token) {
                throw new Error('Authentication token required');
            }
            // 2. Validate session
            const session = await sessionManager.validate(token);
            if (!session) {
                await audit_logger_1.AuditLogger.log('ws_auth_failed', {
                    ip: socket.handshake.address,
                    reason: 'invalid_session',
                });
                throw new Error('Invalid or expired session');
            }
            // 3. Rate limit WebSocket connections per user
            await rateLimiter.check(`ws_conn:${session.userId}`, config_1.SecurityConfig.WS_CONNECTION_LIMIT);
            // 4. Device fingerprint check
            const fingerprint = device_security_1.DeviceSecurity.fingerprint(socket.handshake.headers, socket.handshake.auth?.deviceId);
            // Check for anomaly on WebSocket connection
            const anomaly = await deviceSecurity.detectAnomaly(session.userId, fingerprint, socket.handshake.address);
            if (anomaly.suspicious) {
                await audit_logger_1.AuditLogger.log('ws_anomaly_detected', {
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
            socket.userId = session.userId;
            socket.sessionToken = token;
            socket.deviceFingerprint = fingerprint;
            await audit_logger_1.AuditLogger.log('ws_connected', {
                userId: session.userId,
                socketId: socket.id,
            });
            next();
        }
        catch (err) {
            await audit_logger_1.AuditLogger.log('ws_auth_error', {
                error: err.message,
                ip: socket.handshake.address,
            });
            next(new Error('Authentication failed'));
        }
    };
}
/**
 * Per-message rate limiter for WebSocket events
 */
function socketMessageRateLimit(redis) {
    const rateLimiter = new rate_limiter_1.SecurityRateLimiter(redis);
    return async (socket, next) => {
        const userId = socket.userId;
        if (!userId)
            return next(new Error('Not authenticated'));
        try {
            await rateLimiter.check(`ws_msg:${userId}`, config_1.SecurityConfig.WS_MESSAGE_LIMIT);
            next();
        }
        catch {
            await audit_logger_1.AuditLogger.log('ws_rate_limit', { userId, socketId: socket.id });
            // Don't disconnect — just drop the message
            next(new Error('Message rate limit exceeded'));
        }
    };
}
//# sourceMappingURL=socket-security.js.map