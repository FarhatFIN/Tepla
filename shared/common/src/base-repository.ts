import { Pool, PoolClient, QueryResult, QueryResultRow } from 'pg';
import { createLogger, Logger } from './logger';

export class BaseRepository {
  protected pool: Pool;
  protected logger: Logger;
  protected tableName: string;

  constructor(tableName: string, pool?: Pool) {
    this.tableName = tableName;
    this.logger = createLogger(`repo:${tableName}`);
    this.pool = pool || new Pool({
      connectionString: process.env.DATABASE_URL,
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000,
    });
  }

  protected async query<T extends QueryResultRow = QueryResultRow>(
    sql: string,
    params?: unknown[]
  ): Promise<QueryResult<T>> {
    const start = Date.now();
    try {
      const result = await this.pool.query<T>(sql, params);
      this.logger.debug('Query executed', {
        sql: sql.substring(0, 100),
        duration: Date.now() - start,
        rowCount: result.rowCount,
      });
      return result;
    } catch (err) {
      this.logger.error('Query failed', {
        sql: sql.substring(0, 100),
        error: (err as Error).message,
        duration: Date.now() - start,
      });
      throw err;
    }
  }

  protected async queryOne<T extends QueryResultRow = QueryResultRow>(
    sql: string,
    params?: unknown[]
  ): Promise<T | null> {
    const result = await this.query<T>(sql, params);
    return result.rows[0] || null;
  }

  protected async queryMany<T extends QueryResultRow = QueryResultRow>(
    sql: string,
    params?: unknown[]
  ): Promise<T[]> {
    const result = await this.query<T>(sql, params);
    return result.rows;
  }

  protected async execute(sql: string, params?: unknown[]): Promise<number> {
    const result = await this.query(sql, params);
    return result.rowCount || 0;
  }

  async transaction<T>(fn: (client: PoolClient) => Promise<T>): Promise<T> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      const result = await fn(client);
      await client.query('COMMIT');
      return result;
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  async healthCheck(): Promise<boolean> {
    try {
      await this.query('SELECT 1');
      return true;
    } catch {
      return false;
    }
  }
}
