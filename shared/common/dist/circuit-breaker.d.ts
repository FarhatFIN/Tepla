export interface CircuitBreakerOptions {
    failureThreshold?: number;
    resetTimeout?: number;
    halfOpenRequests?: number;
}
export declare class CircuitBreaker {
    private name;
    private state;
    private failureCount;
    private successCount;
    private lastFailureTime;
    private readonly threshold;
    private readonly resetTimeout;
    private readonly halfOpenMax;
    private readonly logger;
    constructor(name: string, opts?: CircuitBreakerOptions);
    execute<T>(fn: () => Promise<T>): Promise<T>;
    private onSuccess;
    private onFailure;
    getState(): string;
}
//# sourceMappingURL=circuit-breaker.d.ts.map