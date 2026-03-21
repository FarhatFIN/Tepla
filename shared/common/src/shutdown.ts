import { createLogger } from './logger';

const logger = createLogger('shutdown');

type CleanupFn = () => Promise<void>;

export function gracefulShutdown(cleanups: CleanupFn[]): void {
  const shutdown = async (signal: string) => {
    logger.info(`${signal} received, starting graceful shutdown...`);

    const timeout = setTimeout(() => {
      logger.error('Graceful shutdown timed out, forcing exit');
      process.exit(1);
    }, 15000);

    for (const cleanup of cleanups) {
      try {
        await cleanup();
      } catch (err) {
        logger.error('Cleanup error', { error: (err as Error).message });
      }
    }

    clearTimeout(timeout);
    logger.info('Graceful shutdown complete');
    process.exit(0);
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}
