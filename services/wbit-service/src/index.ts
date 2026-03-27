import { BaseService } from '@tepla/common';
import { wbitRouter } from './routes';

class WbitService extends BaseService {
  constructor() {
    super({ name: 'wbit-service', port: 3019 });
  }

  async setup(): Promise<void> {
    this.registerRoutes('/api/wbit', wbitRouter(this.redis!, this.kafka!));
    this.logger.info('WBIT service routes registered', {
      wallet: true,
      transfer: true,
      premium: true,
      price: true,
    });
  }
}

new WbitService().start();
