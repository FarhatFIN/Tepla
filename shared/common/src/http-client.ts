import { CircuitBreaker } from './circuit-breaker';
import { createLogger } from './logger';

const logger = createLogger('http-client');

interface RequestOptions {
  method?: string;
  headers?: Record<string, string>;
  body?: unknown;
  timeout?: number;
}

export class HttpClient {
  private baseUrl: string;
  private breaker: CircuitBreaker;
  private defaultHeaders: Record<string, string>;

  constructor(serviceName: string, baseUrl: string) {
    this.baseUrl = baseUrl.replace(/\/$/, '');
    this.breaker = new CircuitBreaker(serviceName, {
      failureThreshold: 5,
      resetTimeout: 30000,
    });
    this.defaultHeaders = {
      'Content-Type': 'application/json',
    };
  }

  private async request<T>(path: string, opts: RequestOptions = {}): Promise<T> {
    return this.breaker.execute(async () => {
      const url = `${this.baseUrl}${path}`;
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), opts.timeout || 10000);

      try {
        const response = await fetch(url, {
          method: opts.method || 'GET',
          headers: { ...this.defaultHeaders, ...opts.headers },
          body: opts.body ? JSON.stringify(opts.body) : undefined,
          signal: controller.signal,
        });

        if (!response.ok) {
          const errorBody = await response.text();
          throw new Error(`HTTP ${response.status}: ${errorBody}`);
        }

        return response.json() as Promise<T>;
      } finally {
        clearTimeout(timeout);
      }
    });
  }

  async get<T>(path: string, headers?: Record<string, string>): Promise<T> {
    return this.request<T>(path, { headers });
  }

  async post<T>(path: string, body: unknown, headers?: Record<string, string>): Promise<T> {
    return this.request<T>(path, { method: 'POST', body, headers });
  }

  async put<T>(path: string, body: unknown, headers?: Record<string, string>): Promise<T> {
    return this.request<T>(path, { method: 'PUT', body, headers });
  }

  async patch<T>(path: string, body: unknown, headers?: Record<string, string>): Promise<T> {
    return this.request<T>(path, { method: 'PATCH', body, headers });
  }

  async delete<T>(path: string, headers?: Record<string, string>): Promise<T> {
    return this.request<T>(path, { method: 'DELETE', headers });
  }

  withAuth(token: string): HttpClient {
    this.defaultHeaders['Authorization'] = `Bearer ${token}`;
    return this;
  }

  withCorrelationId(id: string): HttpClient {
    this.defaultHeaders['X-Correlation-Id'] = id;
    return this;
  }
}
