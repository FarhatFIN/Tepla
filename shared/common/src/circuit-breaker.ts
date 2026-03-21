import { createLogger } from './logger';

export interface CircuitBreakerOptions {
  failureThreshold?: number;
  resetTimeout?: number;
  halfOpenRequests?: number;
}

enum State {
  CLOSED = 'CLOSED',
  OPEN = 'OPEN',
  HALF_OPEN = 'HALF_OPEN',
}

export class CircuitBreaker {
  private state = State.CLOSED;
  private failureCount = 0;
  private successCount = 0;
  private lastFailureTime = 0;
  private readonly threshold: number;
  private readonly resetTimeout: number;
  private readonly halfOpenMax: number;
  private readonly logger = createLogger('circuit-breaker');

  constructor(private name: string, opts: CircuitBreakerOptions = {}) {
    this.threshold = opts.failureThreshold || 5;
    this.resetTimeout = opts.resetTimeout || 30000;
    this.halfOpenMax = opts.halfOpenRequests || 3;
  }

  async execute<T>(fn: () => Promise<T>): Promise<T> {
    if (this.state === State.OPEN) {
      if (Date.now() - this.lastFailureTime >= this.resetTimeout) {
        this.state = State.HALF_OPEN;
        this.successCount = 0;
        this.logger.info(`Circuit ${this.name}: OPEN → HALF_OPEN`);
      } else {
        throw new Error(`Circuit breaker '${this.name}' is OPEN`);
      }
    }

    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (err) {
      this.onFailure();
      throw err;
    }
  }

  private onSuccess(): void {
    if (this.state === State.HALF_OPEN) {
      this.successCount++;
      if (this.successCount >= this.halfOpenMax) {
        this.state = State.CLOSED;
        this.failureCount = 0;
        this.logger.info(`Circuit ${this.name}: HALF_OPEN → CLOSED`);
      }
    }
    this.failureCount = 0;
  }

  private onFailure(): void {
    this.failureCount++;
    this.lastFailureTime = Date.now();
    if (this.failureCount >= this.threshold || this.state === State.HALF_OPEN) {
      this.state = State.OPEN;
      this.logger.warn(`Circuit ${this.name}: → OPEN (failures: ${this.failureCount})`);
    }
  }

  getState(): string {
    return this.state;
  }
}
