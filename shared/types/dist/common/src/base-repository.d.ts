import { Pool, QueryResult } from 'pg';
import { Logger } from './logger';
export declare class BaseRepository {
    protected pool: Pool;
    protected logger: Logger;
    protected tableName: string;
    constructor(tableName: string, pool?: Pool);
    protected query<T>(sql: string, params?: unknown[]): Promise<QueryResult<T>>;
    protected queryOne<T>(sql: string, params?: unknown[]): Promise<T | null>;
    protected queryMany<T>(sql: string, params?: unknown[]): Promise<T[]>;
    protected execute(sql: string, params?: unknown[]): Promise<number>;
    transaction<T>(fn: (client: any) => Promise<T>): Promise<T>;
    healthCheck(): Promise<boolean>;
}
//# sourceMappingURL=base-repository.d.ts.map