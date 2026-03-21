"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createLogger = createLogger;
function createLogger(service) {
    const log = (level, message, meta) => {
        const entry = {
            timestamp: new Date().toISOString(),
            level,
            service,
            message,
            ...meta,
        };
        const line = JSON.stringify(entry);
        if (level === 'error') {
            console.error(line);
        }
        else if (level === 'warn') {
            console.warn(line);
        }
        else {
            console.log(line);
        }
    };
    return {
        info: (msg, meta) => log('info', msg, meta),
        warn: (msg, meta) => log('warn', msg, meta),
        error: (msg, meta) => log('error', msg, meta),
        debug: (msg, meta) => {
            if (process.env.LOG_LEVEL === 'debug')
                log('debug', msg, meta);
        },
    };
}
//# sourceMappingURL=logger.js.map