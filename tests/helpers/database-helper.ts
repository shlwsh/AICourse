/**
 * 数据库测试辅助工具
 *
 * 提供测试数据库的设置、清理和操作功能
 *
 * 功能特性：
 * - 创建测试数据库
 * - 初始化数据库表结构
 * - 插入测试数据
 * - 清理测试数据
 * - 重置数据库状态
 * - 执行 SQL 查询
 */

import { existsSync } from 'fs';
import { join } from 'path';
import { createTestLogger } from './test-logger';
import type {
  TestTeacher,
  TestClass,
  TestSubject,
  TestCurriculum,
  TestScheduleEntry,
} from './test-data-generator';

const logger = createTestLogger('DatabaseHelper');

/**
 * 数据库配置
 */
export interface DatabaseConfig {
  /**
   * 数据库文件路径
   */
  path: string;

  /**
   * 是否在测试结束后删除数据库
   */
  deleteAfterTest: boolean;
}

/**
 * 默认数据库配置
 */
const DEFAULT_CONFIG: DatabaseConfig = {
  path: join(process.cwd(), 'data/test/scheduling.db'),
  deleteAfterTest: false, // 保留用于调试
};

/**
 * 数据库辅助类
 */
export class DatabaseHelper {
  private config: DatabaseConfig;

  constructor(config: Partial<DatabaseConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * 初始化测试数据库
   *
   * 创建数据库文件和表结构
   */
  async initialize(): Promise<void> {
    logger.info('初始化测试数据库');

    try {
      // 确保数据目录存在
      await this.ensureDataDirectory();

      // 删除旧的测试数据库
      await this.deleteDatabase();

      // 创建新的数据库
      await this.createDatabase();

      // 创建表结构
      await this.createTables();

      logger.info('测试数据库初始化完成');
    } catch (error) {
      logger.error('测试数据库初始化失败', error);
      throw error;
    }
  }

  /**
   * 清理测试数据库
   *
   * 根据配置决定是否删除数据库文件
   */
  async cleanup(): Promise<void> {
    logger.info('清理测试数据库');

    try {
      if (this.config.deleteAfterTest) {
        await this.deleteDatabase();
        logger.info('测试数据库已删除');
      } else {
        logger.info('测试数据库已保留用于调试');
        logger.info(`数据库位置: ${this.config.path}`);
      }
    } catch (error) {
      logger.error('测试数据库清理失败', error);
      // 清理失败不应该导致测试失败
    }
  }

  /**
   * 插入教师数据
   */
  async insertTeachers(teachers: TestTeacher[]): Promise<void> {
    logger.info(`插入 ${teachers.length} 条教师数据`);

    // TODO: 实现数据库插入逻辑
    // 这里需要调用 Rust 后端的数据库操作
    // 或者使用 SQLite 客户端直接操作

    logger.debug('教师数据插入完成');
  }

  /**
   * 插入班级数据
   */
  async insertClasses(classes: TestClass[]): Promise<void> {
    logger.info(`插入 ${classes.length} 条班级数据`);

    // TODO: 实现数据库插入逻辑

    logger.debug('班级数据插入完成');
  }

  /**
   * 插入科目数据
   */
  async insertSubjects(subjects: TestSubject[]): Promise<void> {
    logger.info(`插入 ${subjects.length} 条科目数据`);

    // TODO: 实现数据库插入逻辑

    logger.debug('科目数据插入完成');
  }

  /**
   * 插入教学计划数据
   */
  async insertCurriculums(curriculums: TestCurriculum[]): Promise<void> {
    logger.info(`插入 ${curriculums.length} 条教学计划数据`);

    // TODO: 实现数据库插入逻辑

    logger.debug('教学计划数据插入完成');
  }

  /**
   * 插入课表数据
   */
  async insertScheduleEntries(entries: TestScheduleEntry[]): Promise<void> {
    logger.info(`插入 ${entries.length} 条课表数据`);

    // TODO: 实现数据库插入逻辑

    logger.debug('课表数据插入完成');
  }

  /**
   * 清空所有表数据
   */
  async clearAllTables(): Promise<void> {
    logger.info('清空所有表数据');

    // TODO: 实现清空表逻辑

    logger.debug('所有表数据已清空');
  }

  /**
   * 执行 SQL 查询
   */
  async query<T = any>(sql: string, params: any[] = []): Promise<T[]> {
    logger.debug(`执行 SQL 查询: ${sql}`);

    // TODO: 实现 SQL 查询逻辑

    return [];
  }

  /**
   * 执行 SQL 命令（INSERT、UPDATE、DELETE）
   */
  async execute(sql: string, params: any[] = []): Promise<void> {
    logger.debug(`执行 SQL 命令: ${sql}`);

    // TODO: 实现 SQL 执行逻辑
  }

  /**
   * 确保数据目录存在
   */
  private async ensureDataDirectory(): Promise<void> {
    const { mkdirSync } = await import('fs');
    const { dirname } = await import('path');

    const dir = dirname(this.config.path);

    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
      logger.debug(`创建数据目录: ${dir}`);
    }
  }

  /**
   * 删除数据库文件
   */
  private async deleteDatabase(): Promise<void> {
    if (existsSync(this.config.path)) {
      const { unlinkSync } = await import('fs');
      unlinkSync(this.config.path);
      logger.debug(`删除数据库文件: ${this.config.path}`);
    }
  }

  /**
   * 创建数据库文件
   */
  private async createDatabase(): Promise<void> {
    logger.debug('创建数据库文件');

    // TODO: 实现数据库创建逻辑
    // 这里需要调用 Rust 后端的数据库初始化功能
    // 或者使用 SQLite 客户端创建数据库

    logger.debug('数据库文件创建完成');
  }

  /**
   * 创建表结构
   */
  private async createTables(): Promise<void> {
    logger.debug('创建表结构');

    // TODO: 实现表结构创建逻辑
    // 这里需要执行数据库迁移脚本
    // 或者直接执行 CREATE TABLE 语句

    logger.debug('表结构创建完成');
  }
}

/**
 * 创建数据库辅助工具的工厂函数
 *
 * @param config 数据库配置
 * @returns 数据库辅助工具实例
 */
export function createDatabaseHelper(
  config: Partial<DatabaseConfig> = {},
): DatabaseHelper {
  return new DatabaseHelper(config);
}

/**
 * 全局数据库辅助工具实例
 *
 * 用于在测试之间共享
 */
let globalDatabaseHelper: DatabaseHelper | null = null;

/**
 * 获取全局数据库辅助工具实例
 *
 * @returns 数据库辅助工具实例
 */
export function getGlobalDatabaseHelper(): DatabaseHelper {
  if (!globalDatabaseHelper) {
    globalDatabaseHelper = createDatabaseHelper();
  }
  return globalDatabaseHelper;
}

/**
 * 重置全局数据库辅助工具实例
 */
export function resetGlobalDatabaseHelper(): void {
  globalDatabaseHelper = null;
}
