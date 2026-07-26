import { Pool, PoolClient, QueryResult, QueryResultRow } from 'pg';
import { createLogger, Logger } from './logger';
import { db } from './db';

export class BaseRepository {
  protected pool: Pool;
  protected logger: Logger;
  protected tableName: string;

  constructor(tableName: string, pool?: Pool) {
    this.tableName = tableName;
    this.logger = createLogger(`repo:${tableName}`);

    // Default to the process-wide pool from ./db.
    //
    // Found during the stage-7 resource sweep: this used to call `new Pool({max: 20})`
    // per *instance*. Every repository subclass — PushRepository, KTRepository,
    // E2ERepository, UserRepository, CallRepository, StoryRepository, the
    // sticker repositories — allocated its own 20-connection pool, and several
    // are constructed more than once (e.g. `new PushRepository()` in both the
    // router factory and the Kafka consumer). A single service could therefore
    // demand well over a hundred Postgres connections while using a handful,
    // and none of those pools had an 'error' listener, so any one of them
    // could take the process down (the H-13 failure mode, multiplied).
    //
    // An explicitly-passed pool is still honoured for tests and for the rare
    // repository that genuinely needs isolation.
    this.pool = pool || db.pool;
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

  /**
   * Execute a query within an existing transaction (PoolClient).
   * Use this for multi-table atomic operations (e.g. message + outbox).
   */
  async queryWithClient<T extends QueryResultRow = QueryResultRow>(
    client: PoolClient,
    sql: string,
    params?: unknown[]
  ): Promise<T[]> {
    const start = Date.now();
    try {
      const result = await client.query<T>(sql, params);
      this.logger.debug('Client query executed', {
        sql: sql.substring(0, 100),
        duration: Date.now() - start,
        rowCount: result.rowCount,
      });
      return result.rows;
    } catch (err) {
      this.logger.error('Client query failed', {
        sql: sql.substring(0, 100),
        error: (err as Error).message,
        duration: Date.now() - start,
      });
      throw err;
    }
  }

  async queryOneWithClient<T extends QueryResultRow = QueryResultRow>(
    client: PoolClient,
    sql: string,
    params?: unknown[]
  ): Promise<T | null> {
    const rows = await this.queryWithClient<T>(client, sql, params);
    return rows[0] || null;
  }

  /** Expose pool for cross-repository transactions */
  getPool(): Pool {
    return this.pool;
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
