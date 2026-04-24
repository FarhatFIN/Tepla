import { HttpClient } from './http-client';

// Service Discovery — static config for Docker Compose / K8s
const SERVICE_URLS: Record<string, string> = {
  'auth-user-service': process.env.AUTH_USER_SERVICE_URL || 'http://auth-user-service:3001',
  'messaging-core-service': process.env.MESSAGING_SERVICE_URL || 'http://messaging-core-service:3004',
  'media-service': process.env.MEDIA_SERVICE_URL || 'http://media-service:3007',
  'realtime-service': process.env.REALTIME_SERVICE_URL || 'http://realtime-service:3100',
  'bot-service': process.env.BOT_SERVICE_URL || 'http://bot-service:3013',
  'webapp-service': process.env.WEBAPP_SERVICE_URL || 'http://webapp-service:3017',
  'api-gateway': process.env.API_GATEWAY_URL || 'http://api-gateway:3000',
};

export class ServiceRegistry {
  private clients = new Map<string, HttpClient>();

  getClient(serviceName: string): HttpClient {
    if (!this.clients.has(serviceName)) {
      const url = SERVICE_URLS[serviceName];
      if (!url) {
        throw new Error(`Unknown service: ${serviceName}`);
      }
      this.clients.set(serviceName, new HttpClient(serviceName, url));
    }
    return this.clients.get(serviceName)!;
  }

  getUrl(serviceName: string): string {
    return SERVICE_URLS[serviceName] || '';
  }

  static getServiceUrl(serviceName: string): string {
    return SERVICE_URLS[serviceName] || '';
  }
}
