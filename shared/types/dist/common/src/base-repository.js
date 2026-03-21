"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BaseRepository = void 0;
const pg_1 = require("pg");
const logger_1 = require("./logger");
class BaseRepository {
    pool;
    logger;
    tableName;
    constructor(tableName, pool) {
        this.tableName = tableName;
        this.logger = (0, logger_1.createLogger)(`repo:${tableName}`);
        this.pool = pool || new pg_1.Pool({
            connectionString: process.env.DATABASE_URL,
            max: 20,
            idleTimeoutMillis: 30000,
            connectionTimeoutMillis: 5000,
        });
    }
    async query(sql, params) {
        const start = Date.now();
        try {
            const result = await this.pool.query(sql, params);
            this.logger.debug('Query executed', {
                sql: sql.substring(0, 100),
                duration: Date.now() - start,
                rowCount: result.rowCount,
            });
            return result;
        }
        catch (err) {
            this.logger.error('Query failed', {
                sql: sql.substring(0, 100),
                error: err.message,
                duration: Date.now() - start,
            });
            throw err;
        }
    }
    async queryOne(sql, params) {
        const result = await this.query(sql, params);
        return result.rows[0] || null;
    }
    async queryMany(sql, params) {
        const result = await this.query(sql, params);
        return result.rows;
    }
    async execute(sql, params) {
        const result = await this.query(sql, params);
        return result.rowCount || 0;
    }
    async transaction(fn) {
        const client = await this.pool.connect();
        try {
            await client.query('BEGIN');
            const result = await fn(client);
            await client.query('COMMIT');
            return result;
        }
        catch (err) {
            await client.query('ROLLBACK');
            throw err;
        }
        finally {
            client.release();
        }
    }
    async healthCheck() {
        try {
            await this.query('SELECT 1');
            return true;
        }
        catch {
            return false;
        }
    }
}
exports.BaseRepository = BaseRepository;
//# sourceMappingURL=base-repository.js.map