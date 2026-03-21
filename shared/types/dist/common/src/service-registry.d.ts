import { HttpClient } from './http-client';
export declare class ServiceRegistry {
    private clients;
    getClient(serviceName: string): HttpClient;
    getUrl(serviceName: string): string;
    static getServiceUrl(serviceName: string): string;
}
//# sourceMappingURL=service-registry.d.ts.map