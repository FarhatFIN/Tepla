import sodium from 'libsodium-wrappers';
import { createLogger } from '@tepla/common';
import { SecurityConfig } from './config';

const logger = createLogger('security-init');

let initialized = false;

export async function initializeSecurity(): Promise<void> {
  if (initialized) return;

  await sodium.ready;

  // Validate critical config
  if (!SecurityConfig.MASTER_KEY && process.env.NODE_ENV === 'production') {
    logger.error('SECURITY_MASTER_KEY is not set! Encrypted key storage will fail.');
    throw new Error('SECURITY_MASTER_KEY environment variable is required in production');
  }

  if (!SecurityConfig.MASTER_KEY) {
    logger.warn('SECURITY_MASTER_KEY not set — using dev fallback. DO NOT use in production!');
  }

  initialized = true;
  logger.info('Security framework initialized', {
    sessionTtl: SecurityConfig.SESSION_TTL,
    rateLimitWindow: SecurityConfig.RATE_LIMIT_WINDOW,
    nonceTtl: SecurityConfig.NONCE_TTL,
  });
}
