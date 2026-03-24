import { BaseService } from '@tepla/common';
import { chatRouter } from './routes/chat.routes';
import { folderRouter } from './routes/folder.routes';
import { rolesRouter } from './routes/roles.routes';
import { advancedRouter } from './routes/advanced.routes';

class ChatService extends BaseService {
  constructor() {
    super({ name: 'chat-service', port: 3003 });
  }

  async setup(): Promise<void> {
    this.registerRoutes('/api/chats', chatRouter(this.redis!, this.kafka!));
    this.registerRoutes('/api/chats', advancedRouter(this.redis!, this.kafka!));
    this.registerRoutes('/api/folders', folderRouter(this.redis!, this.kafka!));
    this.registerRoutes('/api/roles', rolesRouter(this.redis!, this.kafka!));
    this.logger.info('Chat service routes registered', {
      folders: true,
      roles: true,
      adminLog: true,
      joinRequests: true,
      inviteLinks: true,
      anonymousAdmins: true,
    });
  }
}

new ChatService().start();
