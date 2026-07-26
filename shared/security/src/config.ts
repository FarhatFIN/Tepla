// ═══════════════════════════════════════════════════════
// Security Configuration
// Centralized config for all security modules
// ═══════════════════════════════════════════════════════

export const SecurityConfig = {

  // Session
  SESSION_TTL: parseInt(process.env.SESSION_TTL || '86400'),             // 24h
  DEVICE_TTL: parseInt(process.env.DEVICE_TTL || '2592000'),             // 30 days
  NONCE_TTL: parseInt(process.env.NONCE_TTL || '604800'),                // 7 days replay protection

  // Token sizes
  TOKEN_BYTES: 32,
  NONCE_BYTES: 16,

  // Rate limiting
  RATE_LIMIT_WINDOW: parseInt(process.env.RATE_LIMIT_WINDOW || '60'),    // seconds
  RATE_LIMIT_DEFAULT: parseInt(process.env.RATE_LIMIT_DEFAULT || '120'), // requests/window
  MESSAGE_LIMIT_PER_MINUTE: parseInt(process.env.MESSAGE_LIMIT || '40'),

  // WebSocket limits
  WS_CONNECTION_LIMIT: parseInt(process.env.WS_CONNECTION_LIMIT || '500'),
  WS_MESSAGE_LIMIT: parseInt(process.env.WS_MESSAGE_LIMIT || '100'),     // per minute

  // Master key for encrypting ratchet keys at rest
  MASTER_KEY: process.env.SECURITY_MASTER_KEY || '',

  // Brute force protection
  // MAX_AUTH_ATTEMPTS throttles how often an identifier may *try* to log in.
  // MAX_AUTH_FAILURES counts only wrong credentials and drives the lockout.
  // Keeping them separate is what stops an attacker from locking someone else
  // out just by hammering the endpoint with their email (H-01).
  MAX_AUTH_ATTEMPTS: parseInt(process.env.MAX_AUTH_ATTEMPTS || '20'),
  MAX_AUTH_FAILURES: parseInt(process.env.MAX_AUTH_FAILURES || '5'),
  AUTH_FAILURE_WINDOW: parseInt(process.env.AUTH_FAILURE_WINDOW || '900'),   // 15 min
  AUTH_LOCKOUT_SECONDS: parseInt(process.env.AUTH_LOCKOUT_SECONDS || '900'), // 15 min

  // Second-factor brute force (TOTP, PIN, Binary Shield)
  MAX_FACTOR_ATTEMPTS: parseInt(process.env.MAX_FACTOR_ATTEMPTS || '5'),
  FACTOR_ATTEMPT_WINDOW: parseInt(process.env.FACTOR_ATTEMPT_WINDOW || '900'),

  // One-time prekey fetches allowed per (requester, target) pair per
  // RATE_LIMIT_WINDOW. Stops a single account from draining another user's
  // prekey supply (H-06).
  PREKEY_FETCH_LIMIT: parseInt(process.env.PREKEY_FETCH_LIMIT || '10'),

  // Audit
  AUDIT_LOG_MAX_SIZE: parseInt(process.env.AUDIT_LOG_MAX_SIZE || '100000'),
  AUDIT_LOG_TTL: parseInt(process.env.AUDIT_LOG_TTL || '2592000'),       // 30 days

} as const;
