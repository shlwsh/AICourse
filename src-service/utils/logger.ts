/**
 * 服务层日志记录工具
 *
 * 功能特性：
 * - 支持多种日志级别：DEBUG、INFO、WARN、ERROR
 * - 支持控制台输出和文件输出
 * - 日志格式包含时间戳、日志级别、模块名称、消息内容
 * - 自动过滤敏感信息（密码、密钥等）
 * - 支持结构化日志记录
 *
 * 使用示例：
 * ```typescript
 * import { logger } from '@/utils/logger';
 *
 * // 记录信息日志
 * logger.info('API 请求成功', { path: '/api/schedule', status: 200 });
 *
 * // 记录警告
 * logger.warn('请求参数不完整', { missing: ['teacher_id'] });
 *
 * // 记录错误
 * logger.error('数据库连接失败', { error: err.message });
 * ```
 */

import { appendFileSync, existsSync, mkdirSync, readdirSync, statSync, unlinkSync } from 'fs';
import { join } from 'path';

// 日志级别枚举
export enum LogLevel {
  DEBUG = 'DEBUG',
  INFO = 'INFO',
  WARN = 'WARN',
  ERROR = 'ERROR',
}

// 日志级别优先级映射
const LOG_LEVEL_PRIORITY: Record<LogLevel, number> = {
  [LogLevel.DEBUG]: 0,
  [LogLevel.INFO]: 1,
  [LogLevel.WARN]: 2,
  [LogLevel.ERROR]: 3,
};

// 日志配置接口
interface LoggerConfig {
  /** 最低日志级别 */
  level: LogLevel;
  /** 是否启用控制台输出 */
  enableConsole: boolean;
  /** 是否启用文件输出 */
  enableFile: boolean;
  /** 日志文件目录 */
  logDir: string;
  /** 日志文件名前缀 */
  filePrefix: string;
  /** 是否过滤敏感信息 */
  sanitizeSensitiveData: boolean;
  /** 日志文件保留天数 */
  retentionDays: number;
}

// 日志条目接口
interface LogEntry {
  /** 时间戳 */
  timestamp: string;
  /** 日志级别 */
  level: LogLevel;
  /** 模块名称 */
  module: string;
  /** 日志消息 */
  message: string;
  /** 附加数据 */
  data?: any;
}

// 默认配置
const defaultConfig: LoggerConfig = {
  level: (process.env.LOG_LEVEL as LogLevel) ||
         (process.env.NODE_ENV === 'development' ? LogLevel.DEBUG : LogLevel.INFO),
  enableConsole: process.env.LOG_ENABLE_CONSOLE !== 'false',
  enableFile: process.env.LOG_ENABLE_FILE !== 'false',
  logDir: process.env.LOG_DIR || 'logs',
  filePrefix: process.env.LOG_FILE_PREFIX || 'service',
  sanitizeSensitiveData: process.env.LOG_SANITIZE_SENSITIVE_DATA !== 'false',
  retentionDays: Number(process.env.LOG_RETENTION_DAYS) || 30,
};

// 敏感信息关键词列表
const SENSITIVE_KEYWORDS = [
  'password',
  'passwd',
  'pwd',
  'secret',
  'token',
  'api_key',
  'apikey',
  'apiKey',
  'access_key',
  'accessKey',
  'private_key',
  'privateKey',
  'authorization',
  'auth',
];

/**
 * 日志记录器类
 */
class Logger {
  private config: LoggerConfig;
  private moduleName: string;
  private currentLogFile: string | null = null;

  constructor(moduleName: string = 'Service', config: Partial<LoggerConfig> = {}) {
    this.moduleName = moduleName;
    this.config = { ...defaultConfig, ...config };

    // 确保日志目录存在
    if (this.config.enableFile) {
      this.ensureLogDirectory();
      this.cleanupOldLogs();
    }
  }

  /**
   * 确保日志目录存在
   */
  private ensureLogDirectory(): void {
    if (!existsSync(this.config.logDir)) {
      mkdirSync(this.config.logDir, { recursive: true });
    }
  }

  /**
   * 获取当前日志文件路径
   */
  private getLogFilePath(): string {
    const date = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    return join(this.config.logDir, `${this.config.filePrefix}.${date}.log`);
  }

  /**
   * 清理旧日志文件
   */
  private cleanupOldLogs(): void {
    try {
      const files = readdirSync(this.config.logDir);
      const now = Date.now();
      const cutoffTime = now - this.config.retentionDays * 24 * 60 * 60 * 1000;

      files.forEach((file) => {
        if (file.startsWith(this.config.filePrefix) && file.endsWith('.log')) {
          const filePath = join(this.config.logDir, file);
          const stats = statSync(filePath);

          if (stats.mtimeMs < cutoffTime) {
            unlinkSync(filePath);
            console.log(`已删除旧日志文件: ${file}`);
          }
        }
      });
    } catch (error) {
      console.error('清理旧日志文件失败:', error);
    }
  }

  /**
   * 过滤敏感信息
   *
   * @param data - 需要过滤的数据
   * @returns 过滤后的数据
   */
  private sanitize(data: any): any {
    if (!this.config.sanitizeSensitiveData) {
      return data;
    }

    if (typeof data === 'string') {
      return this.sanitizeString(data);
    }

    if (typeof data === 'object' && data !== null) {
      if (Array.isArray(data)) {
        return data.map((item) => this.sanitize(item));
      }

      const sanitized: any = {};
      for (const [key, value] of Object.entries(data)) {
        // 检查键名是否包含敏感关键词
        const isSensitiveKey = SENSITIVE_KEYWORDS.some((keyword) =>
          key.toLowerCase().includes(keyword.toLowerCase()),
        );

        if (isSensitiveKey) {
          sanitized[key] = '***';
        } else {
          sanitized[key] = this.sanitize(value);
        }
      }
      return sanitized;
    }

    return data;
  }

  /**
   * 过滤字符串中的敏感信息
   *
   * @param str - 需要过滤的字符串
   * @returns 过滤后的字符串
   */
  private sanitizeString(str: string): string {
    let result = str;

    // 匹配 key=value 格式
    SENSITIVE_KEYWORDS.forEach((keyword) => {
      const regex = new RegExp(`${keyword}=[^&\\s]*`, 'gi');
      result = result.replace(regex, `${keyword}=***`);
    });

    // 匹配 "key": "value" 格式（JSON）
    SENSITIVE_KEYWORDS.forEach((keyword) => {
      const regex = new RegExp(`"${keyword}"\\s*:\\s*"[^"]*"`, 'gi');
      result = result.replace(regex, `"${keyword}": "***"`);
    });

    return result;
  }

  /**
   * 格式化日志消息
   *
   * @param level - 日志级别
   * @param message - 日志消息
   * @param data - 附加数据
   * @returns 格式化后的日志消息
   */
  private formatMessage(level: LogLevel, message: string, data?: any): string {
    const timestamp = new Date().toISOString();
    const sanitizedData = this.sanitize(data);
    const dataStr = sanitizedData ? ` | ${JSON.stringify(sanitizedData)}` : '';
    return `[${timestamp}] [${level}] [${this.moduleName}] ${message}${dataStr}`;
  }

  /**
   * 检查日志级别是否应该输出
   *
   * @param level - 日志级别
   * @returns 是否应该输出
   */
  private shouldLog(level: LogLevel): boolean {
    return LOG_LEVEL_PRIORITY[level] >= LOG_LEVEL_PRIORITY[this.config.level];
  }

  /**
   * 输出日志
   *
   * @param level - 日志级别
   * @param message - 日志消息
   * @param data - 附加数据
   */
  private log(level: LogLevel, message: string, data?: any): void {
    // 检查日志级别
    if (!this.shouldLog(level)) {
      return;
    }

    const formattedMessage = this.formatMessage(level, message, data);

    // 输出到控制台
    if (this.config.enableConsole) {
      switch (level) {
        case LogLevel.DEBUG:
          console.debug(formattedMessage);
          break;
        case LogLevel.INFO:
          console.info(formattedMessage);
          break;
        case LogLevel.WARN:
          console.warn(formattedMessage);
          break;
        case LogLevel.ERROR:
          console.error(formattedMessage);
          break;
      }
    }

    // 输出到文件
    if (this.config.enableFile) {
      try {
        const logFilePath = this.getLogFilePath();
        appendFileSync(logFilePath, `${formattedMessage  }\n`, 'utf-8');
      } catch (error) {
        console.error('写入日志文件失败:', error);
      }
    }
  }

  /**
   * DEBUG 级别日志
   *
   * @param message - 日志消息
   * @param data - 附加数据
   */
  debug(message: string, data?: any): void {
    this.log(LogLevel.DEBUG, message, data);
  }

  /**
   * INFO 级别日志
   *
   * @param message - 日志消息
   * @param data - 附加数据
   */
  info(message: string, data?: any): void {
    this.log(LogLevel.INFO, message, data);
  }

  /**
   * WARN 级别日志
   *
   * @param message - 日志消息
   * @param data - 附加数据
   */
  warn(message: string, data?: any): void {
    this.log(LogLevel.WARN, message, data);
  }

  /**
   * ERROR 级别日志
   *
   * @param message - 日志消息
   * @param data - 附加数据
   */
  error(message: string, data?: any): void {
    this.log(LogLevel.ERROR, message, data);
  }

  /**
   * 更新日志配置
   *
   * @param config - 新的配置
   */
  updateConfig(config: Partial<LoggerConfig>): void {
    this.config = { ...this.config, ...config };

    // 如果启用文件输出，确保日志目录存在
    if (this.config.enableFile) {
      this.ensureLogDirectory();
    }
  }

  /**
   * 获取当前配置
   *
   * @returns 当前配置
   */
  getConfig(): LoggerConfig {
    return { ...this.config };
  }
}

// 导出默认日志实例
export const logger = new Logger('Service');

// 导出 Logger 类供其他模块创建实例
export default Logger;
