/**
 * Cleanup Worker — periodic housekeeping tasks.
 *
 * - Deletes processed outbox entries older than 7 days
 * - Cleans expired sessions
 * - Archives old notifications
 *
 * Runs every 5 minutes.
 */
import { BaseRepository, createLogger } from '@tepla/common';

const logger = createLogger('cleanup-worker');
const CLEANUP_INTERVAL = 5 * 60_000; // 5 minutes

const repo = new (class extends BaseRepository { constructor() { super('outbox'); } })();

async function cleanup() {
  try {
    // 1. Delete processed outbox entries older than 7 days
    const outboxDeleted = await repo.execute(
      `DELETE FROM outbox WHERE status = 'processed' AND processed_at < NOW() - INTERVAL '7 days'`
    );
    if (outboxDeleted > 0) {
      logger.info('Cleaned processed outbox entries', { count: outboxDeleted });
    }

    // 2. Delete expired sessions older than 30 days
    const sessionsDeleted = await repo.execute(
      `DELETE FROM active_sessions WHERE last_active_at < NOW() - INTERVAL '30 days'`
    );
    if (sessionsDeleted > 0) {
      logger.info('Cleaned expired sessions', { count: sessionsDeleted });
    }

    // 3. Delete old read notifications (older than 90 days)
    const notificationsDeleted = await repo.execute(
      `DELETE FROM notifications WHERE is_read = true AND created_at < NOW() - INTERVAL '90 days'`
    );
    if (notificationsDeleted > 0) {
      logger.info('Cleaned old notifications', { count: notificationsDeleted });
    }
  } catch (err) {
    logger.error('Cleanup error', { error: (err as Error).message });
  }
}

async function main() {
  logger.info('Cleanup worker started', { intervalMs: CLEANUP_INTERVAL });

  // Run immediately on start
  await cleanup();

  // Then run periodically
  setInterval(cleanup, CLEANUP_INTERVAL);

  // Graceful shutdown
  process.on('SIGTERM', () => process.exit(0));
  process.on('SIGINT', () => process.exit(0));
}

main().catch((err) => {
  logger.error('Cleanup worker failed', { error: err.message });
  process.exit(1);
});
