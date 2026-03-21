import { Socket } from 'socket.io';
import Redis from 'ioredis';
/**
 * Socket.IO Security Middleware
 * Validates session token, rate limits connections, device fingerprinting
 */
export declare function socketSecurity(redis: Redis): (socket: Socket, next: (err?: Error) => void) => Promise<void>;
/**
 * Per-message rate limiter for WebSocket events
 */
export declare function socketMessageRateLimit(redis: Redis): (socket: Socket, next: (err?: Error) => void) => Promise<void>;
//# sourceMappingURL=socket-security.d.ts.map