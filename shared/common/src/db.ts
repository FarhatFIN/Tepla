import { Pool, QueryResult, QueryResultRow } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
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
