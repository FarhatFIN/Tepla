// ═══════════════════════════════════════════════════════
// Tepla Messenger — Security Framework v2.0
// Microservice-ready: E2E encryption, Double Ratchet,
// replay protection, device security, audit, metrics
// ═══════════════════════════════════════════════════════

export { SecurityConfig } from './config';
export { CryptoCore } from './crypto-core';
export { KeyDerivation } from './key-derivation';
export { KeyStorage, encryptKey, decryptKey } from './key-storage';
export { DoubleRatchet } from './double-ratchet';
export { SessionManager } from './session-manager';
export { ReplayProtection } from './replay-protection';
export { SecurityRateLimiter } from './rate-limiter';
export { DeviceSecurity } from './device-security';
export { AuditLogger } from './audit-logger';
export { SecurityMetrics } from './security-metrics';
export { socketSecurity, socketMessageRateLimit } from './socket-security';
export { verifyAccessToken, type VerifiedAccessToken } from './access-token';
export { MessagePipeline, SecureMessage } from './message-pipeline';
export { SecurityMiddleware } from './middleware';
export type { AuditEntry } from './audit-logger';
export type { EncryptedPayload } from './crypto-core';
export { initializeSecurity } from './init';
