/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * 测试日志记录器
 *
 * 提供统一的测试日志记录功能，符合项目日志规范
 *
 * 功能特性：
 * - 支持多种日志级别（DEBUG、INFO、WARN、ERROR）
 * - 自动添加时间戳
 * - 格式化输出
 * - 支持控制台和文件输出
 * - 测试用例执行追踪
 */

import { existsSync, mkdirSync, appendFileSync } from 'fs';
import { join } from 'path';

/**
 * 日志级别枚举
 */
export enum LogLevel {
  DEBUG = 'DEBUG',
  INFO = 'INFO',
  WARN = 'WARN',
  ERROR = 'ERROR',
}

/**
 * 日志级别优先级映射
 */
const LOG_LEVEL_PRIORITY: Record<LogLevel, number> = {
  [LogLevel.DEBUG]: 0,
  [LogLevel.INFO]: 1,
  [LogLevel.WARN]: 2,
  [LogLevel.ERROR]: 3,
};

/**
 * 日志级别颜色映射（用于控制台输出）
 */
const LOG_LEVEL_COLORS: Record<LogLevel, string> = {
  [LogLevel.DEBUG]: '\x1b[36m', // 青色
  [LogLevel.INFO]: '\x1b[32m',  // 绿色
  [LogLevel.WARN]: '\x1b[33m',  // 黄色
  [LogLevel.ERROR]: '\x1b[31m', // 红色
};

const RESET_COLOR = '\x1b[0m';

/**
 * 测试日志记录器类
 */
export class TestLogger {
  private moduleName: string;
  private logLevel: LogLevel;
  private logFilePath: string;
  private enableFileLogging: boolean;

  /**
   * 构造函数
   *
   * @param moduleName 模块名称（用于标识日志来源）
   * @param logLevel 最低日志级别（默认：INFO）
   * @param enableFileLogging 是否启用文件日志（默认：true）
   */
  constructor(
    moduleName: string,
    logLevel: LogLevel = LogLevel.INFO,
    enableFileLogging: boolean = true,
  ) {
    this.moduleName = moduleName;
    this.logLevel = logLevel;
    this.enableFileLogging = enableFileLogging;

    // 设置日志文件路径
    const logDir = join(process.cwd(), 'logs/test');
    if (!existsSync(logDir)) {
      mkdirSync(logDir, { recursive: true });
    }

    const timestamp = new Date().toISOString().split('T')[0];
    this.logFilePath = join(logDir, `test-${timestamp}.log`);
  }

  /**
   * 记录 DEBUG 级别日志
   */
  debug(message: string, data?: any): void {
    this.log(LogLevel.DEBUG, message, data);
  }

  /**
   * 记录 INFO 级别日志
   */
  info(message: string, data?: any): void {
    this.log(LogLevel.INFO, message, data);
  }

  /**
   * 记录 WARN 级别日志
   */
  warn(message: string, data?: any): void {
    this.log(LogLevel.WARN, message, data);
  }

  /**
   * 记录 ERROR 级别日志
   */
  error(message: string, error?: any): void {
    let errorData = error;

    // 如果是 Error 对象，提取堆栈信息
    if (error instanceof Error) {
      errorData = {
        message: error.message,
        stack: error.stack,
        name: error.name,
      };
    }

    this.log(LogLevel.ERROR, message, errorData);
  }

  /**
   * 记录测试用例开始
   */
  testStart(testName: string, testNumber?: number): void {
    const prefix = testNumber ? `[测试 ${testNumber}]` : '[测试]';
    this.info(`${prefix} 开始执行: ${testName}`);
  }

  /**
   * 记录测试用例通过
   */
  testPass(testName: string, duration?: number): void {
    const durationStr = duration ? ` (耗时: ${duration}ms)` : '';
    this.info(`✓ 测试通过: ${testName}${durationStr}`);
  }

  /**
   * 记录测试用例失败
   */
  testFail(testName: string, error: any): void {
    this.error(`✗ 测试失败: ${testName}`, error);
  }

  /**
   * 记录测试用例跳过
   */
  testSkip(testName: string, reason?: string): void {
    const reasonStr = reason ? ` (原因: ${reason})` : '';
    this.warn(`○ 测试跳过: ${testName}${reasonStr}`);
  }

  /**
   * 核心日志记录方法
   */
  private log(level: LogLevel, message: string, data?: any): void {
    // 检查日志级别
    if (LOG_LEVEL_PRIORITY[level] < LOG_LEVEL_PRIORITY[this.logLevel]) {
      return;
    }

    // 生成时间戳
    const timestamp = new Date().toISOString();

    // 格式化日志消息
    const logMessage = this.formatLogMessage(timestamp, level, message, data);

    // 控制台输出（带颜色）
    this.logToConsole(level, logMessage);

    // 文件输出（不带颜色）
    if (this.enableFileLogging) {
      this.logToFile(logMessage);
    }
  }

  /**
   * 格式化日志消息
   */
  private formatLogMessage(
    timestamp: string,
    level: LogLevel,
    message: string,
    data?: any,
  ): string {
    let logMessage = `[${timestamp}] [${level}] [${this.moduleName}] ${message}`;

    // 如果有附加数据，格式化输出
    if (data !== undefined) {
      try {
        const dataStr = typeof data === 'string'
          ? data
          : JSON.stringify(data, null, 2);
        logMessage += `\n  数据: ${dataStr}`;
      } catch (error) {
        logMessage += '\n  数据: [无法序列化]';
      }
    }

    return logMessage;
  }

  /**
   * 输出到控制台（带颜色）
   */
  private logToConsole(level: LogLevel, message: string): void {
    const color = LOG_LEVEL_COLORS[level];
    console.log(`${color}${message}${RESET_COLOR}`);
  }

  /**
   * 输出到文件（不带颜色）
   */
  private logToFile(message: string): void {
    try {
      appendFileSync(this.logFilePath, `${message  }\n`, 'utf-8');
    } catch (error) {
      console.error('写入日志文件失败:', error);
    }
  }
}

/**
 * 创建测试日志记录器的工厂函数
 *
 * @param moduleName 模块名称
 * @returns 测试日志记录器实例
 */
export function createTestLogger(moduleName: string): TestLogger {
  const logLevel = (process.env.LOG_LEVEL?.toUpperCase() as LogLevel) || LogLevel.INFO;
  return new TestLogger(moduleName, logLevel);
}
