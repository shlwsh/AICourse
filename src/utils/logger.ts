/**
 * 前端日志记录工具
 *
 * 功能特性：
 * - 支持多种日志级别：DEBUG、INFO、WARN、ERROR
 * - 支持控制台输出和本地存储输出
 * - 日志格式包含时间戳、日志级别、模块名称、消息内容
 * - 自动过滤敏感信息（密码、密钥等）
 * - 支持日志历史记录和导出
 *
 * 使用示例：
 * ```typescript
 * import { logger } from '@/utils/logger';
 *
 * // 记录信息日志
 * logger.info('用户登录成功', { userId: 123 });
 *
 * // 记录警告
 * logger.warn('课时数接近上限', { classId: 456 });
 *
 * // 记录错误
 * logger.error('API 调用失败', { error: err.message });
 * ```
 */

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
  /** 是否启用本地存储输出 */
  enableStorage: boolean;
  /** 本地存储的最大日志条数 */
  maxStorageSize: number;
  /** 是否过滤敏感信息 */
  sanitizeSensitiveData: boolean;
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
  level:
    (import.meta.env.VITE_LOG_LEVEL as LogLevel) ||
    (import.meta.env.DEV ? LogLevel.DEBUG : LogLevel.INFO),
  enableConsole: import.meta.env.VITE_LOG_ENABLE_CONSOLE !== 'false',
  enableStorage: import.meta.env.VITE_LOG_ENABLE_STORAGE !== 'false',
  maxStorageSize: Number(import.meta.env.VITE_LOG_MAX_STORAGE_SIZE) || 1000,
  sanitizeSensitiveData: import.meta.env.VITE_LOG_SANITIZE_SENSITIVE_DATA !== 'false',
};

// 本地存储键名
const STORAGE_KEY = 'course-scheduling-logs';

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
  private logHistory: LogEntry[] = [];

  constructor(moduleName: string = 'App', config: Partial<LoggerConfig> = {}) {
    this.moduleName = moduleName;
    this.config = { ...defaultConfig, ...config };

    // 从本地存储加载历史日志
    if (this.config.enableStorage) {
      this.loadLogsFromStorage();
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

    const timestamp = new Date().toISOString();
    const sanitizedData = this.sanitize(data);

    // 创建日志条目
    const logEntry: LogEntry = {
      timestamp,
      level,
      module: this.moduleName,
      message,
      data: sanitizedData,
    };

    // 输出到控制台
    if (this.config.enableConsole) {
      const formattedMessage = this.formatMessage(level, message, data);

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

    // 保存到历史记录
    if (this.config.enableStorage) {
      this.addToHistory(logEntry);
    }
  }

  /**
   * 添加日志到历史记录
   *
   * @param entry - 日志条目
   */
  private addToHistory(entry: LogEntry): void {
    this.logHistory.push(entry);

    // 限制历史记录大小
    if (this.logHistory.length > this.config.maxStorageSize) {
      this.logHistory = this.logHistory.slice(-this.config.maxStorageSize);
    }

    // 保存到本地存储
    this.saveLogsToStorage();
  }

  /**
   * 从本地存储加载日志
   */
  private loadLogsFromStorage(): void {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        this.logHistory = JSON.parse(stored);
      }
    } catch (error) {
      console.error('加载日志历史失败:', error);
    }
  }

  /**
   * 保存日志到本地存储
   */
  private saveLogsToStorage(): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.logHistory));
    } catch (error) {
      console.error('保存日志历史失败:', error);
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
   * 获取日志历史记录
   *
   * @param level - 可选的日志级别过滤
   * @returns 日志历史记录
   */
  getHistory(level?: LogLevel): LogEntry[] {
    if (level) {
      return this.logHistory.filter((entry) => entry.level === level);
    }
    return [...this.logHistory];
  }

  /**
   * 清空日志历史记录
   */
  clearHistory(): void {
    this.logHistory = [];
    if (this.config.enableStorage) {
      try {
        localStorage.removeItem(STORAGE_KEY);
      } catch (error) {
        console.error('清空日志历史失败:', error);
      }
    }
  }

  /**
   * 导出日志为 JSON 字符串
   *
   * @returns JSON 格式的日志历史
   */
  exportLogs(): string {
    return JSON.stringify(this.logHistory, null, 2);
  }

  /**
   * 导出日志为文本格式
   *
   * @returns 文本格式的日志历史
   */
  exportLogsAsText(): string {
    return this.logHistory
      .map((entry) => {
        const dataStr = entry.data ? ` | ${JSON.stringify(entry.data)}` : '';
        return `[${entry.timestamp}] [${entry.level}] [${entry.module}] ${entry.message}${dataStr}`;
      })
      .join('\n');
  }

  /**
   * 下载日志文件
   *
   * @param format - 文件格式（'json' 或 'text'）
   */
  downloadLogs(format: 'json' | 'text' = 'text'): void {
    const content = format === 'json' ? this.exportLogs() : this.exportLogsAsText();
    const blob = new Blob([content], {
      type: format === 'json' ? 'application/json' : 'text/plain',
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    link.href = url;
    link.download = `course-scheduling-logs-${timestamp}.${format === 'json' ? 'json' : 'txt'}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  /**
   * 更新日志配置
   *
   * @param config - 新的配置
   */
  updateConfig(config: Partial<LoggerConfig>): void {
    this.config = { ...this.config, ...config };
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
export const logger = new Logger('Frontend');

// 导出 Logger 类供其他模块创建实例
export default Logger;
