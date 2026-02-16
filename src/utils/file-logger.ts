/**
 * 文件日志记录工具
 * 在 Tauri 环境中将日志写入文件系统
 * 在浏览器环境中回退到 localStorage
 */

import { logger as baseLogger } from './logger';

// 日志级别
export enum LogLevel {
  DEBUG = 'DEBUG',
  INFO = 'INFO',
  WARN = 'WARN',
  ERROR = 'ERROR',
}

// 日志条目接口
interface LogEntry {
  timestamp: string;
  level: LogLevel;
  module: string;
  message: string;
  data?: any;
}

/**
 * 文件日志记录器类
 */
class FileLogger {
  private logBuffer: LogEntry[] = [];
  private flushInterval: number | null = null;
  private logFilePath: string = '';
  private isTauri: boolean = false;
  private isInitialized: boolean = false;

  constructor() {
    this.init();
  }

  /**
   * 初始化日志记录器
   */
  private async init(): Promise<void> {
    try {
      // 检测是否在 Tauri 环境中
      this.isTauri = typeof window !== 'undefined' && !!(window as any).__TAURI__;

      if (this.isTauri) {
        const tauri = (window as any).__TAURI__;
        const { appDataDir } = tauri.path;
        const { createDir, exists, writeTextFile } = tauri.fs;

        // 获取应用数据目录
        const appDir = await appDataDir();
        const logDir = `${appDir}/logs`;

        // 确保日志目录存在
        const dirExists = await exists(logDir);
        if (!dirExists) {
          await createDir(logDir, { recursive: true });
        }

        // 生成日志文件路径
        const date = new Date().toISOString().split('T')[0];
        this.logFilePath = `${logDir}/frontend-${date}.log`;

        // 写入初始化日志
        const initLog = this.formatLogEntry({
          timestamp: new Date().toISOString(),
          level: LogLevel.INFO,
          module: 'FileLogger',
          message: '文件日志系统初始化成功',
          data: { logFilePath: this.logFilePath },
        });

        await writeTextFile(this.logFilePath, initLog + '\n', { append: true });

        // 启动定时刷新
        this.startFlushInterval();

        this.isInitialized = true;
        baseLogger.info('FileLogger 初始化成功', {
          isTauri: this.isTauri,
          logFilePath: this.logFilePath
        });
      } else {
        baseLogger.info('FileLogger 初始化（浏览器模式）', {
          isTauri: this.isTauri
        });
        this.isInitialized = true;
      }
    } catch (error) {
      baseLogger.error('FileLogger 初始化失败', {
        error: error instanceof Error ? error.message : String(error)
      });
      this.isInitialized = true; // 即使失败也标记为已初始化，避免重复尝试
    }
  }

  /**
   * 启动定时刷新
   */
  private startFlushInterval(): void {
    // 每秒刷新一次缓冲区
    this.flushInterval = window.setInterval(() => {
      this.flush();
    }, 1000);
  }

  /**
   * 格式化日志条目
   */
  private formatLogEntry(entry: LogEntry): string {
    const dataStr = entry.data ? ` | ${JSON.stringify(entry.data)}` : '';
    return `[${entry.timestamp}] [${entry.level}] [${entry.module}] ${entry.message}${dataStr}`;
  }

  /**
   * 刷新日志缓冲区到文件
   */
  private async flush(): Promise<void> {
    if (this.logBuffer.length === 0) {
      return;
    }

    const entries = [...this.logBuffer];
    this.logBuffer = [];

    if (this.isTauri && this.logFilePath) {
      try {
        const tauri = (window as any).__TAURI__;
        const { writeTextFile } = tauri.fs;

        const content = entries.map(entry => this.formatLogEntry(entry)).join('\n') + '\n';
        await writeTextFile(this.logFilePath, content, { append: true });
      } catch (error) {
        // 刷新失败，将日志放回缓冲区
        this.logBuffer.unshift(...entries);
        baseLogger.error('刷新日志到文件失败', {
          error: error instanceof Error ? error.message : String(error)
        });
      }
    }
  }

  /**
   * 记录日志
   */
  private async log(level: LogLevel, module: string, message: string, data?: any): Promise<void> {
    // 等待初始化完成
    if (!this.isInitialized) {
      await this.init();
    }

    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      module,
      message,
      data,
    };

    // 添加到缓冲区
    this.logBuffer.push(entry);

    // 同时输出到基础日志
    baseLogger[level.toLowerCase() as 'debug' | 'info' | 'warn' | 'error'](message, data);

    // 如果是错误日志，立即刷新
    if (level === LogLevel.ERROR) {
      await this.flush();
    }
  }

  /**
   * DEBUG 级别日志
   */
  async debug(module: string, message: string, data?: any): Promise<void> {
    await this.log(LogLevel.DEBUG, module, message, data);
  }

  /**
   * INFO 级别日志
   */
  async info(module: string, message: string, data?: any): Promise<void> {
    await this.log(LogLevel.INFO, module, message, data);
  }

  /**
   * WARN 级别日志
   */
  async warn(module: string, message: string, data?: any): Promise<void> {
    await this.log(LogLevel.WARN, module, message, data);
  }

  /**
   * ERROR 级别日志
   */
  async error(module: string, message: string, data?: any): Promise<void> {
    await this.log(LogLevel.ERROR, module, message, data);
  }

  /**
   * 立即刷新所有缓冲的日志
   */
  async flushNow(): Promise<void> {
    await this.flush();
  }

  /**
   * 清理资源
   */
  destroy(): void {
    if (this.flushInterval !== null) {
      clearInterval(this.flushInterval);
      this.flushInterval = null;
    }
    this.flush(); // 最后刷新一次
  }
}

// 导出单例
export const fileLogger = new FileLogger();

// 在窗口关闭前刷新日志
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    fileLogger.flushNow();
  });
}
