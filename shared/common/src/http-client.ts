import { CircuitBreaker } from './circuit-breaker';
import { createLogger } from './logger';

const logger = createLogger('http-client');

const RETRY_DELAYS = [0, 200, 500]; // ms — 3 attempts: immediate, 200ms, 500ms
const RETRYABLE_CODES = new Set([502, 503, 504, 429]);

interface RequestOptions {
  method?: string;
  headers?: Record<string, string>;
  body?: unknown;
  timeout?: number;
  retries?: number;
  fallback?: () => unknown;
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
    const maxRetries = opts.retries ?? RETRY_DELAYS.length;

    try {
      return await this.breaker.execute(async () => {
        let lastError: Error | undefined;

        for (let attempt = 0; attempt < maxRetries; attempt++) {
          if (attempt > 0) {
            await new Promise(r => setTimeout(r, RETRY_DELAYS[attempt] || 500));
          }

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
              const err = new HttpError(`HTTP ${response.status}: ${errorBody}`, response.status);
              if (RETRYABLE_CODES.has(response.status) && attempt < maxRetries - 1) {
                lastError = err;
                logger.warn(`Retrying ${opts.method || 'GET'} ${path} (attempt ${attempt + 1}, status ${response.status})`);
                continue;
              }
              throw err;
            }

            return response.json() as Promise<T>;
          } catch (err) {
            if (err instanceof HttpError) throw err;
            lastError = err as Error;
            if (attempt < maxRetries - 1) {
              logger.warn(`Retrying ${opts.method || 'GET'} ${path} (attempt ${attempt + 1}, ${(err as Error).message})`);
              continue;
            }
          } finally {
            clearTimeout(timeout);
          }
        }

        throw lastError || new Error(`Request failed after ${maxRetries} attempts`);
      });
    } catch (err) {
      if (opts.fallback) {
        logger.warn(`Circuit open or request failed for ${path}, using fallback`, { error: (err as Error).message });
        return opts.fallback() as T;
      }
      throw err;
    }
  }

  async get<T>(path: string, opts?: { headers?: Record<string, string>; fallback?: () => T }): Promise<T> {
    return this.request<T>(path, { headers: opts?.headers, fallback: opts?.fallback });
  }

  async post<T>(path: string, body: unknown, opts?: { headers?: Record<string, string>; fallback?: () => T }): Promise<T> {
    return this.request<T>(path, { method: 'POST', body, headers: opts?.headers, fallback: opts?.fallback, retries: 1 });
  }

  async put<T>(path: string, body: unknown, opts?: { headers?: Record<string, string>; fallback?: () => T }): Promise<T> {
    return this.request<T>(path, { method: 'PUT', body, headers: opts?.headers, fallback: opts?.fallback, retries: 1 });
  }

  async patch<T>(path: string, body: unknown, opts?: { headers?: Record<string, string>; fallback?: () => T }): Promise<T> {
    return this.request<T>(path, { method: 'PATCH', body, headers: opts?.headers, fallback: opts?.fallback, retries: 1 });
  }

  async delete<T>(path: string, opts?: { headers?: Record<string, string>; fallback?: () => T }): Promise<T> {
    return this.request<T>(path, { method: 'DELETE', headers: opts?.headers, fallback: opts?.fallback, retries: 1 });
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

export class HttpError extends Error {
  constructor(message: string, public statusCode: number) {
    super(message);
    this.name = 'HttpError';
  }
}
