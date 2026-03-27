import { BaseService } from '@tepla/common';
import { walletRouter } from './routes/wallet.routes';

class WalletService extends BaseService {
  constructor() {
    super({ name: 'wallet-service', port: 3018 });
  }

  async setup(): Promise<void> {
    this.registerRoutes('/api/wallet', walletRouter(this.redis!, this.kafka!));
    this.logger.info('Wallet service routes registered', {
      wallet: true,
      kyc: true,
      transfers: true,
    });
  }
}

new WalletService().start();
