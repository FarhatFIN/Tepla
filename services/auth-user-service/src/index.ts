import { BaseService } from '@tepla/common';
import { initializeSecurity } from '@tepla/security';
import { authRouter } from './modules/auth/routes/auth.routes';
import { userRouter } from './modules/users/routes/user.routes';
import { e2eRouter } from './modules/e2e/routes/e2e.routes';
import { ktRouter } from './modules/key-transparency/routes/kt.routes';

class AuthUserService extends BaseService {
  constructor() {
    super({ name: 'auth-user-service', port: 3001 });
  }

  async setup(): Promise<void> {
    await initializeSecurity();

    const registerRouter = (prefix: string, router: unknown): void => {
      this.registerRoutes(prefix, router as Parameters<AuthUserService['registerRoutes']>[1]);
    };

    registerRouter('/api/auth', authRouter(this.redis!, this.kafka!));
    registerRouter('/api/users', userRouter(this.redis!, this.kafka!));
    registerRouter('/api/e2e', e2eRouter());
    registerRouter('/api/kt', ktRouter());

    this.logger.info('Auth-user service routes registered', {
      auth: true,
      profiles: true,
      contacts: true,
      e2eKeys: true,
      keyTransparency: true,
      premium: false,
    });
  }
}

new AuthUserService().start();
