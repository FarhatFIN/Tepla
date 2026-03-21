import { BaseService } from '@tepla/common';
import { initializeSecurity } from '@tepla/security';
import { authRouter } from './routes/auth.routes';

class AuthService extends BaseService {
  constructor() {
    super({ name: 'auth-service', port: 3001 });
  }

  async setup(): Promise<void> {
    // Initialize security framework (libsodium, master key)
    await initializeSecurity();

    this.registerRoutes('/api/auth', authRouter(this.redis!, this.kafka!));
    this.logger.info('Auth service routes registered', {
      securityRateLimiting: true,
      deviceFingerprinting: true,
      sessionManagement: true,
      auditLogging: true,
    });
  }
}

new AuthService().start();
