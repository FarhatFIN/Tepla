import { BaseService, KafkaConsumer } from '@tepla/common';
import { EventTopic } from '@tepla/types';
import { presenceRouter } from './routes/presence.routes';
import { PresenceManager } from './services/presence.manager';

class PresenceService extends BaseService {
  private presenceManager!: PresenceManager;

  constructor() {
    super({ name: 'presence-service', port: 3005 });
  }

  async setup(): Promise<void> {
    this.presenceManager = new PresenceManager(this.redis!, this.kafka!);
    this.registerRoutes('/api/presence', presenceRouter(this.redis!, this.presenceManager));

    // Start heartbeat checker (mark users offline after 90s without heartbeat)
    this.presenceManager.startHeartbeatChecker();

    this.logger.info('Presence service ready');
  }
}

new PresenceService().start();
