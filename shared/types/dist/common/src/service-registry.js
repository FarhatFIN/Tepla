"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ServiceRegistry = void 0;
const http_client_1 = require("./http-client");
// Service Discovery — static config for Docker Compose / K8s
const SERVICE_URLS = {
    'auth-service': process.env.AUTH_SERVICE_URL || 'http://auth-service:3001',
    'user-service': process.env.USER_SERVICE_URL || 'http://user-service:3002',
    'chat-service': process.env.CHAT_SERVICE_URL || 'http://chat-service:3003',
    'message-service': process.env.MESSAGE_SERVICE_URL || 'http://message-service:3004',
    'presence-service': process.env.PRESENCE_SERVICE_URL || 'http://presence-service:3005',
    'notification-service': process.env.NOTIFICATION_SERVICE_URL || 'http://notification-service:3006',
    'media-service': process.env.MEDIA_SERVICE_URL || 'http://media-service:3007',
    'search-service': process.env.SEARCH_SERVICE_URL || 'http://search-service:3008',
    'premium-service': process.env.PREMIUM_SERVICE_URL || 'http://premium-service:3009',
    'moderation-service': process.env.MODERATION_SERVICE_URL || 'http://moderation-service:3010',
    'analytics-service': process.env.ANALYTICS_SERVICE_URL || 'http://analytics-service:3011',
    'api-gateway': process.env.API_GATEWAY_URL || 'http://api-gateway:3000',
    'websocket-gateway': process.env.WS_GATEWAY_URL || 'http://websocket-gateway:3100',
};
class ServiceRegistry {
    clients = new Map();
    getClient(serviceName) {
        if (!this.clients.has(serviceName)) {
            const url = SERVICE_URLS[serviceName];
            if (!url) {
                throw new Error(`Unknown service: ${serviceName}`);
            }
            this.clients.set(serviceName, new http_client_1.HttpClient(serviceName, url));
        }
        return this.clients.get(serviceName);
    }
    getUrl(serviceName) {
        return SERVICE_URLS[serviceName] || '';
    }
    static getServiceUrl(serviceName) {
        return SERVICE_URLS[serviceName] || '';
    }
}
exports.ServiceRegistry = ServiceRegistry;
//# sourceMappingURL=service-registry.js.map