/**
 * 数据库操作日志包装器
 *
 * 功能特性：
 * - 记录所有数据库查询和操作
 * - 记录 SQL 语句和参数
 * - 记录执行时间
 * - 记录影响的行数
 * - 性能监控和慢查询警告
 */

import type { Database } from 'bun:sqlite';
import { createLogger } from '../utils/logger';

const logger = createLogger('DatabaseLogger');

// 慢查询阈值（毫秒）
const SLOW_QUERY_THRESHOLD = 100;

/**
 * 格式化 SQL 语句（用于日志显示）
 */
function formatSql(sql: string): string {
  return sql
    .replace(/\s+/g, ' ')
    .trim()
    .substring(0, 500); // 限制长度
}

/**
 * 格式化参数
 */
function formatParams(params: any[]): any {
  if (!params || params.length === 0) {
    return undefined;
  }

  // 限制参数数量和大小
  if (params.length > 20) {
    return {
      _summary: `[${params.length} 个参数]`,
      _preview: params.slice(0, 5),
    };
  }

  return params;
}

/**
 * 包装数据库实例，添加日志功能
 */
export class DatabaseLogger {
  private db: Database;
  private requestId?: string;

  constructor(db: Database, requestId?: string) {
    this.db = db;
    this.requestId = requestId;
  }

  /**
   * 设置请求 ID（用于关联日志）
   */
  setRequestId(requestId: string): void {
    this.requestId = requestId;
  }

  /**
   * 执行查询（返回所有结果）
   */
  query<T = any>(sql: string): {
    all: (params?: any[]) => T[];
    get: (params?: any[]) => T | null;
  } {
    const formattedSql = formatSql(sql);

    return {
      all: (params?: any[]) => {
        const startTime = performance.now();

        logger.debug('🔍 执行查询 (all)', {
          requestId: this.requestId,
          sql: formattedSql,
          params: formatParams(params || []),
        });

        try {
          const stmt = this.db.query(sql);
          const results = params ? stmt.all(...params) : stmt.all();

          const duration = Math.round(performance.now() - startTime);

          logger.debug('✅ 查询完成', {
            requestId: this.requestId,
            sql: formattedSql,
            rowCount: Array.isArray(results) ? results.length : 0,
            duration: `${duration}ms`,
          });

          // 慢查询警告
          if (duration > SLOW_QUERY_THRESHOLD) {
            logger.warn('🐌 慢查询检测', {
              requestId: this.requestId,
              sql: formattedSql,
              duration: `${duration}ms`,
              threshold: `${SLOW_QUERY_THRESHOLD}ms`,
            });
          }

          return results as T[];
        } catch (error) {
          const duration = Math.round(performance.now() - startTime);

          logger.error('❌ 查询失败', {
            requestId: this.requestId,
            sql: formattedSql,
            params: formatParams(params || []),
            duration: `${duration}ms`,
            error: error instanceof Error ? error.message : String(error),
          });

          throw error;
        }
      },

      get: (params?: any[]) => {
        const startTime = performance.now();

        logger.debug('🔍 执行查询 (get)', {
          requestId: this.requestId,
          sql: formattedSql,
          params: formatParams(params || []),
        });

        try {
          const stmt = this.db.query(sql);
          const result = params ? stmt.get(...params) : stmt.get();

          const duration = Math.round(performance.now() - startTime);

          logger.debug('✅ 查询完成', {
            requestId: this.requestId,
            sql: formattedSql,
            hasResult: result !== null,
            duration: `${duration}ms`,
          });

          // 慢查询警告
          if (duration > SLOW_QUERY_THRESHOLD) {
            logger.warn('🐌 慢查询检测', {
              requestId: this.requestId,
              sql: formattedSql,
              duration: `${duration}ms`,
              threshold: `${SLOW_QUERY_THRESHOLD}ms`,
            });
          }

          return result as T | null;
        } catch (error) {
          const duration = Math.round(performance.now() - startTime);

          logger.error('❌ 查询失败', {
            requestId: this.requestId,
            sql: formattedSql,
            params: formatParams(params || []),
            duration: `${duration}ms`,
            error: error instanceof Error ? error.message : String(error),
          });

          throw error;
        }
      },
    };
  }

  /**
   * 执行 SQL 语句（INSERT、UPDATE、DELETE 等）
   */
  run(sql: string, ...params: any[]): { changes: number; lastInsertRowid: number } {
    const startTime = performance.now();
    const formattedSql = formatSql(sql);

    logger.debug('⚡ 执行 SQL', {
      requestId: this.requestId,
      sql: formattedSql,
      params: formatParams(params),
    });

    try {
      const stmt = this.db.prepare(sql);
      const result = stmt.run(...params);

      const duration = Math.round(performance.now() - startTime);

      logger.debug('✅ SQL 执行完成', {
        requestId: this.requestId,
        sql: formattedSql,
        changes: result.changes,
        lastInsertRowid: result.lastInsertRowid,
        duration: `${duration}ms`,
      });

      // 慢查询警告
      if (duration > SLOW_QUERY_THRESHOLD) {
        logger.warn('🐌 慢操作检测', {
          requestId: this.requestId,
          sql: formattedSql,
          duration: `${duration}ms`,
          threshold: `${SLOW_QUERY_THRESHOLD}ms`,
        });
      }

      return {
        changes: result.changes,
        lastInsertRowid: Number(result.lastInsertRowid),
      };
    } catch (error) {
      const duration = Math.round(performance.now() - startTime);

      logger.error('❌ SQL 执行失败', {
        requestId: this.requestId,
        sql: formattedSql,
        params: formatParams(params),
        duration: `${duration}ms`,
        error: error instanceof Error ? error.message : String(error),
      });

      throw error;
    }
  }

  /**
   * 准备 SQL 语句
   */
  prepare(sql: string): any {
    return this.db.prepare(sql);
  }

  /**
   * 开始事务
   */
  transaction<T>(fn: () => T): T {
    const startTime = performance.now();

    logger.info('🔄 开始事务', {
      requestId: this.requestId,
    });

    try {
      this.db.run('BEGIN TRANSACTION');
      const result = fn();
      this.db.run('COMMIT');

      const duration = Math.round(performance.now() - startTime);

      logger.info('✅ 事务提交成功', {
        requestId: this.requestId,
        duration: `${duration}ms`,
      });

      return result;
    } catch (error) {
      this.db.run('ROLLBACK');

      const duration = Math.round(performance.now() - startTime);

      logger.error('❌ 事务回滚', {
        requestId: this.requestId,
        duration: `${duration}ms`,
        error: error instanceof Error ? error.message : String(error),
      });

      throw error;
    }
  }

  /**
   * 获取原始数据库实例
   */
  getRawDatabase(): Database {
    return this.db;
  }
}

/**
 * 创建数据库日志包装器
 */
export function createDatabaseLogger(db: Database, requestId?: string): DatabaseLogger {
  return new DatabaseLogger(db, requestId);
}
