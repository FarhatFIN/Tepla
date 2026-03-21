"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.gracefulShutdown = gracefulShutdown;
const logger_1 = require("./logger");
const logger = (0, logger_1.createLogger)('shutdown');
function gracefulShutdown(cleanups) {
    const shutdown = async (signal) => {
        logger.info(`${signal} received, starting graceful shutdown...`);
        const timeout = setTimeout(() => {
            logger.error('Graceful shutdown timed out, forcing exit');
            process.exit(1);
        }, 15000);
        for (const cleanup of cleanups) {
            try {
                await cleanup();
            }
            catch (err) {
                logger.error('Cleanup error', { error: err.message });
            }
        }
        clearTimeout(timeout);
        logger.info('Graceful shutdown complete');
        process.exit(0);
    };
    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));
}
//# sourceMappingURL=shutdown.js.map