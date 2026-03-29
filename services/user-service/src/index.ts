import { BaseService } from '@tepla/common';
import { userRouter } from './routes/user.routes';
import { e2eRouter } from './routes/e2e.routes';
import { ktRouter } from './routes/kt.routes';

class UserService extends BaseService {
  constructor() {
    super({ name: 'user-service', port: 3002 });
  }

  async setup(): Promise<void> {
    this.registerRoutes('/api/users', userRouter(this.redis!, this.kafka!));
    this.registerRoutes('/api/e2e', e2eRouter());
    this.registerRoutes('/api/kt', ktRouter());
    this.logger.info('User service routes registered (E2E + Key Transparency enabled)');
  }
}

new UserService().start();
