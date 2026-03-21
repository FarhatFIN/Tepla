import { BaseService } from '@tepla/common';
import { userRouter } from './routes/user.routes';

class UserService extends BaseService {
  constructor() {
    super({ name: 'user-service', port: 3002 });
  }

  async setup(): Promise<void> {
    this.registerRoutes('/api/users', userRouter(this.redis!, this.kafka!));
    this.logger.info('User service routes registered');
  }
}

new UserService().start();
