"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.HttpClient = void 0;
const circuit_breaker_1 = require("./circuit-breaker");
const logger_1 = require("./logger");
const logger = (0, logger_1.createLogger)('http-client');
class HttpClient {
    constructor(serviceName, baseUrl) {
        this.baseUrl = baseUrl.replace(/\/$/, '');
        this.breaker = new circuit_breaker_1.CircuitBreaker(serviceName, {
            failureThreshold: 5,
            resetTimeout: 30000,
        });
        this.defaultHeaders = {
            'Content-Type': 'application/json',
        };
    }
    async request(path, opts = {}) {
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
                return response.json();
            }
            finally {
                clearTimeout(timeout);
            }
        });
    }
    async get(path, headers) {
        return this.request(path, { headers });
    }
    async post(path, body, headers) {
        return this.request(path, { method: 'POST', body, headers });
    }
    async put(path, body, headers) {
        return this.request(path, { method: 'PUT', body, headers });
    }
    async patch(path, body, headers) {
        return this.request(path, { method: 'PATCH', body, headers });
    }
    async delete(path, headers) {
        return this.request(path, { method: 'DELETE', headers });
    }
    withAuth(token) {
        this.defaultHeaders['Authorization'] = `Bearer ${token}`;
        return this;
    }
    withCorrelationId(id) {
        this.defaultHeaders['X-Correlation-Id'] = id;
        return this;
    }
}
exports.HttpClient = HttpClient;
//# sourceMappingURL=http-client.js.map