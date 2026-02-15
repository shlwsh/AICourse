/**
 * AI Git 提交工具 - 日志模块
 */

import { LogLevel, type LogEntry } from './types';
import { existsSync, mkdirSync } from 'fs';
import { appendFileSync } from 'fs';
import { join } from 'path';

/**
 * 日志文件路径
 */
const LOG_DIR = 'logs';
const LOG_FILE = 'mygit.log';
const LOG_PATH = join(LOG_DIR, LOG_FILE);

/**
 * 日志记录器类
 */
export class Logger {
  private module: string;
  private static logFileInitialized = false;

  constructor(module: string) {
    this.module = module;
    this.ensureLogDirectory();
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
  error(message: string, error?: Error, data?: any): void {
    const errorData = error ? { error: error.message, stack: error.stack, ...data } : data;
    this.log(LogLevel.ERROR, message, errorData);
  }

  /**
   * 创建子日志记录器
   */
  child(subModule: string): Logger {
    return new Logger(`${this.module}:${subModule}`);
  }

  /**
   * 确保日志目录存在
   */
  private ensureLogDirectory(): void {
    if (!Logger.logFileInitialized) {
      try {
        if (!existsSync(LOG_DIR)) {
          mkdirSync(LOG_DIR, { recursive: true });
        }
        Logger.logFileInitialized = true;
      } catch (error) {
        // 如果无法创建日志目录，只输出到控制台
        console.error('无法创建日志目录:', error);
      }
    }
  }

  /**
   * 记录日志
   */
  private log(level: LogLevel, message: string, data?: any): void {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      module: this.module,
      message,
      data,
    };

    // 控制台输出（带颜色）
    this.logToConsole(entry);

    // 文件输出（不带颜色，包含脱敏处理）
    this.logToFile(entry);
  }

  /**
   * 输出到控制台
   */
  private logToConsole(entry: LogEntry): void {
    const color = this.getColorForLevel(entry.level);
    const reset = '\x1b[0m';
    const timePart = entry.timestamp.split('T')[1];
    const timestamp = timePart ? timePart.split('.')[0] : entry.timestamp;

    let logMessage = `${color}[${timestamp}] [${entry.level}] [${entry.module}]${reset} ${entry.message}`;

    if (entry.data) {
      logMessage += `\n${  JSON.stringify(entry.data, null, 2)}`;
    }

    console.log(logMessage);
  }

  /**
   * 输出到文件
   */
  private logToFile(entry: LogEntry): void {
    try {
      // 对敏感数据进行脱敏处理
      const sanitizedEntry = this.sanitizeEntry(entry);

      const logLine = `[${sanitizedEntry.timestamp}] [${sanitizedEntry.level}] [${sanitizedEntry.module}] ${sanitizedEntry.message}`;
      let fullLog = logLine;

      if (sanitizedEntry.data) {
        fullLog += `\n${  JSON.stringify(sanitizedEntry.data, null, 2)}`;
      }

      fullLog += '\n';

      appendFileSync(LOG_PATH, fullLog, 'utf-8');
    } catch (error) {
      // 如果无法写入日志文件，静默失败（已经输出到控制台）
      console.error('无法写入日志文件:', error);
    }
  }

  /**
   * 对日志条目进行脱敏处理
   */
  private sanitizeEntry(entry: LogEntry): LogEntry {
    const sanitizedEntry = { ...entry };

    // 脱敏消息内容
    sanitizedEntry.message = this.maskSensitiveData(entry.message);

    // 脱敏数据对象
    if (entry.data) {
      sanitizedEntry.data = this.maskSensitiveDataInObject(entry.data);
    }

    return sanitizedEntry;
  }

  /**
   * 脱敏字符串中的敏感数据
   */
  private maskSensitiveData(text: string): string {
    // 匹配可能的 API 密钥模式（长度大于 16 的字母数字字符串）
    // 常见模式：sk-xxx, api_key=xxx, apiKey: xxx, token: xxx
    const patterns = [
      /\b(sk-[a-zA-Z0-9]{20,})/g,
      /\b(api[_-]?key[=:\s]+)([a-zA-Z0-9]{16,})/gi,
      /\b(token[=:\s]+)([a-zA-Z0-9]{16,})/gi,
      /\b(password[=:\s]+)([a-zA-Z0-9]{8,})/gi,
      /\b([a-zA-Z0-9]{32,})\b/g, // 长字符串可能是密钥
    ];

    let maskedText = text;
    for (const pattern of patterns) {
      maskedText = maskedText.replace(pattern, (match, ...groups) => {
        // 如果有捕获组，处理捕获组
        if (groups.length > 1 && typeof groups[1] === 'string') {
          const prefix = groups[0];
          const secret = groups[1];
          return prefix + this.maskSecret(secret);
        }
        // 否则处理整个匹配
        if (typeof match === 'string') {
          return this.maskSecret(match);
        }
        return match;
      });
    }

    return maskedText;
  }

  /**
   * 脱敏对象中的敏感数据
   */
  private maskSensitiveDataInObject(obj: any): any {
    if (typeof obj !== 'object' || obj === null) {
      if (typeof obj === 'string') {
        return this.maskSensitiveData(obj);
      }
      return obj;
    }

    if (Array.isArray(obj)) {
      return obj.map(item => this.maskSensitiveDataInObject(item));
    }

    const masked: any = {};
    for (const [key, value] of Object.entries(obj)) {
      const lowerKey = key.toLowerCase();

      // 检查键名是否包含敏感信息标识
      if (
        lowerKey.includes('key') ||
        lowerKey.includes('token') ||
        lowerKey.includes('password') ||
        lowerKey.includes('secret') ||
        lowerKey.includes('auth')
      ) {
        // 如果值是字符串，进行脱敏
        if (typeof value === 'string') {
          masked[key] = this.maskSecret(value);
        } else {
          masked[key] = value;
        }
      } else {
        // 递归处理嵌套对象
        masked[key] = this.maskSensitiveDataInObject(value);
      }
    }

    return masked;
  }

  /**
   * 脱敏密钥（只显示前 4 位和后 4 位）
   */
  private maskSecret(secret: string): string {
    if (!secret || secret.length <= 8) {
      return '****';
    }

    const visibleChars = 4;
    const start = secret.slice(0, visibleChars);
    const end = secret.slice(-visibleChars);
    const maskedLength = secret.length - (visibleChars * 2);
    const masked = '*'.repeat(Math.min(maskedLength, 8)); // 最多显示 8 个星号

    return `${start}${masked}${end}`;
  }

  /**
   * 获取日志级别对应的颜色代码
   */
  private getColorForLevel(level: LogLevel): string {
    switch (level) {
      case LogLevel.DEBUG:
        return '\x1b[36m'; // 青色
      case LogLevel.INFO:
        return '\x1b[34m'; // 蓝色
      case LogLevel.WARN:
        return '\x1b[33m'; // 黄色
      case LogLevel.ERROR:
        return '\x1b[31m'; // 红色
      default:
        return '\x1b[0m'; // 默认
    }
  }
}
