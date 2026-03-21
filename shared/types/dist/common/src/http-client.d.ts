export declare class HttpClient {
    private baseUrl;
    private breaker;
    private defaultHeaders;
    constructor(serviceName: string, baseUrl: string);
    private request;
    get<T>(path: string, headers?: Record<string, string>): Promise<T>;
    post<T>(path: string, body: unknown, headers?: Record<string, string>): Promise<T>;
    put<T>(path: string, body: unknown, headers?: Record<string, string>): Promise<T>;
    patch<T>(path: string, body: unknown, headers?: Record<string, string>): Promise<T>;
    delete<T>(path: string, headers?: Record<string, string>): Promise<T>;
    withAuth(token: string): HttpClient;
    withCorrelationId(id: string): HttpClient;
}
//# sourceMappingURL=http-client.d.ts.map