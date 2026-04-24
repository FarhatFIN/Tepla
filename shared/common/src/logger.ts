import { requestContext } from './context';

export interface Logger {
  info(message: string, meta?: Record<string, unknown>): void;
  warn(message: string, meta?: Record<string, unknown>): void;
  error(message: string, meta?: Record<string, unknown>): void;
  debug(message: string, meta?: Record<string, unknown>): void;
}

export function createLogger(service: string): Logger {
  const log = (level: string, message: string, meta?: Record<string, unknown>) => {
    // Auto-inject correlationId and userId from AsyncLocalStorage
    const ctx = requestContext.getStore();
    const entry: Record<string, unknown> = {
      timestamp: new Date().toISOString(),
      level,
      service,
      message,
    };
    if (ctx?.correlationId) entry.correlationId = ctx.correlationId;
    if (ctx?.userId) entry.userId = ctx.userId;
    if (meta) Object.assign(entry, meta);

    const line = JSON.stringify(entry);
    if (level === 'error') {
      console.error(line);
    } else if (level === 'warn') {
      console.warn(line);
    } else {
      console.log(line);
    }
  };

  return {
    info: (msg, meta) => log('info', msg, meta),
    warn: (msg, meta) => log('warn', msg, meta),
    error: (msg, meta) => log('error', msg, meta),
    debug: (msg, meta) => {
      if (process.env.LOG_LEVEL === 'debug') log('debug', msg, meta);
    },
  };
}
