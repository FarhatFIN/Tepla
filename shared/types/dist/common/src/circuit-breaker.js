"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CircuitBreaker = void 0;
const logger_1 = require("./logger");
var State;
(function (State) {
    State["CLOSED"] = "CLOSED";
    State["OPEN"] = "OPEN";
    State["HALF_OPEN"] = "HALF_OPEN";
})(State || (State = {}));
class CircuitBreaker {
    name;
    state = State.CLOSED;
    failureCount = 0;
    successCount = 0;
    lastFailureTime = 0;
    threshold;
    resetTimeout;
    halfOpenMax;
    logger = (0, logger_1.createLogger)('circuit-breaker');
    constructor(name, opts = {}) {
        this.name = name;
        this.threshold = opts.failureThreshold || 5;
        this.resetTimeout = opts.resetTimeout || 30000;
        this.halfOpenMax = opts.halfOpenRequests || 3;
    }
    async execute(fn) {
        if (this.state === State.OPEN) {
            if (Date.now() - this.lastFailureTime >= this.resetTimeout) {
                this.state = State.HALF_OPEN;
                this.successCount = 0;
                this.logger.info(`Circuit ${this.name}: OPEN → HALF_OPEN`);
            }
            else {
                throw new Error(`Circuit breaker '${this.name}' is OPEN`);
            }
        }
        try {
            const result = await fn();
            this.onSuccess();
            return result;
        }
        catch (err) {
            this.onFailure();
            throw err;
        }
    }
    onSuccess() {
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
    onFailure() {
        this.failureCount++;
        this.lastFailureTime = Date.now();
        if (this.failureCount >= this.threshold || this.state === State.HALF_OPEN) {
            this.state = State.OPEN;
            this.logger.warn(`Circuit ${this.name}: → OPEN (failures: ${this.failureCount})`);
        }
    }
    getState() {
        return this.state;
    }
}
exports.CircuitBreaker = CircuitBreaker;
//# sourceMappingURL=circuit-breaker.js.map