import { Pool, QueryResult, QueryResultRow } from 'pg';
import { createLogger } from './logger';

const logger = createLogger('db');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: Number(process.env.PGPOOL_MAX || 20),
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
  // Bound how long a single statement may hold a connection. Without this a
  // pathological query can pin all 20 slots indefinitely.
  statement_timeout: Number(process.env.PG_STATEMENT_TIMEOUT_MS || 15000),
});

// H-13: pg emits 'error' on the pool when an *idle* client dies (network blip,
// server restart, admin terminate). With no listener Node treats it as an
// unhandled 'error' event and tears down the whole process.
pool.on('error', (err) => {
  logger.error('Idle Postgres client error', { error: err.message });
});

export const db = {
  pool,
  query<T extends QueryResultRow = QueryResultRow>(sql: string, params?: unknown[]): Promise<QueryResult<T>> {
    return pool.query<T>(sql, params);
  },
  async queryRow<T extends QueryResultRow = QueryResultRow>(sql: string, params?: unknown[]): Promise<T | null> {
    const result = await pool.query<T>(sql, params);
    return result.rows[0] || null;
  },
  async queryRows<T extends QueryResultRow = QueryResultRow>(sql: string, params?: unknown[]): Promise<T[]> {
    const result = await pool.query<T>(sql, params);
    return result.rows;
  },
  async execute(sql: string, params?: unknown[]): Promise<number> {
    const result = await pool.query(sql, params);
    return result.rowCount || 0;
  },
};
