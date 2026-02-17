/**
 * 数据库管理模块
 *
 * 提供 SQLite 数据库连接和基础操作
 * 使用 Bun 内置的 bun:sqlite
 */

import { Database } from 'bun:sqlite';
import { logger } from '../utils/logger';
import { config } from '../../config';
import path from 'path';
import fs from 'fs';

let db: Database | null = null;

/**
 * 获取数据库实例
 */
export function getDatabase(): Database {
  if (!db) {
    const dbConfig = config.database;

    // 如果是内存数据库（测试环境）
    if (dbConfig.path === ':memory:') {
      logger.info('使用内存数据库');
      db = new Database(':memory:');
    } else {
      // 确保数据目录存在
      const dbPath = path.isAbsolute(dbConfig.path)
        ? dbConfig.path
        : path.join(process.cwd(), dbConfig.path);

      const dataDir = path.dirname(dbPath);
      if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
        logger.info('创建数据目录', { path: dataDir });
      }

      logger.info('连接数据库', { path: dbPath });
      db = new Database(dbPath, { create: true });
    }

    // 应用数据库选项
    if (dbConfig.options.foreignKeys) {
      db.run('PRAGMA foreign_keys = ON');
    }
    if (dbConfig.options.journalMode) {
      db.run(`PRAGMA journal_mode = ${dbConfig.options.journalMode}`);
    }

    logger.info('数据库连接成功');
  }

  return db;
}

/**
 * 关闭数据库连接
 */
export function closeDatabase(): void {
  if (db) {
    db.close();
    db = null;
    logger.info('数据库连接已关闭');
  }
}

/**
 * 初始化数据库表结构
 */
export function initializeDatabase(): void {
  const database = getDatabase();
  const dbConfig = config.database;

  if (!dbConfig.migrations.autoRun) {
    logger.info('数据库迁移已禁用');
    return;
  }

  logger.info('开始初始化数据库表结构');

  // 获取迁移目录
  const migrationsDir = path.join(process.cwd(), dbConfig.migrations.path);

  if (!fs.existsSync(migrationsDir)) {
    logger.warn('迁移目录不存在', { path: migrationsDir });
    return;
  }

  // 读取所有迁移文件并按文件名排序
  const migrationFiles = fs
    .readdirSync(migrationsDir)
    .filter((file) => file.endsWith('.sql'))
    .sort();

  logger.info('找到迁移文件', { count: migrationFiles.length, files: migrationFiles });

  // 执行每个迁移文件
  for (const file of migrationFiles) {
    const migrationPath = path.join(migrationsDir, file);
    const migrationSQL = fs.readFileSync(migrationPath, 'utf-8');

    try {
      logger.info('执行迁移', { file });

      // 分割 SQL 语句并逐条执行
      const statements = migrationSQL
        .split(';')
        .map((s) => s.trim())
        .filter((s) => s.length > 0 && !s.startsWith('--'));

      for (const statement of statements) {
        try {
          database.exec(statement);
        } catch (error) {
          // 忽略已存在的错误（表、索引、列等）
          if (
            error instanceof Error &&
            (error.message.includes('already exists') ||
              error.message.includes('duplicate column name'))
          ) {
            logger.debug('跳过已存在的对象', { statement: statement.substring(0, 50) });
          } else {
            logger.warn('执行 SQL 语句失败', {
              error: error instanceof Error ? error.message : String(error),
              statement: statement.substring(0, 100),
            });
          }
        }
      }

      logger.info('迁移执行完成', { file });
    } catch (error) {
      logger.error('执行迁移脚本失败', {
        file,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  logger.info('数据库表结构初始化完成');
}
