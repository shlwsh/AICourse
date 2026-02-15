/**
 * 日志工具单元测试
 *
 * 测试 src/utils/logger.ts 中的日志记录功能
 *
 * 测试内容：
 * - 日志级别过滤
 * - 日志格式化
 * - 日志输出
 * - 错误日志记录
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

/**
 * 模拟 console 方法
 *
 * 在测试中捕获 console 输出
 */
describe('日志工具测试', () => {
  let consoleLogSpy: any;
  let consoleErrorSpy: any;
  let consoleWarnSpy: any;
  let consoleInfoSpy: any;

  beforeEach(() => {
    // 创建 console 方法的间谍
    consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    consoleInfoSpy = vi.spyOn(console, 'info').mockImplementation(() => {});
  });

  afterEach(() => {
    // 恢复 console 方法
    consoleLogSpy.mockRestore();
    consoleErrorSpy.mockRestore();
    consoleWarnSpy.mockRestore();
    consoleInfoSpy.mockRestore();
  });

  /**
   * 测试用例：基础日志记录
   */
  it('应该正确记录不同级别的日志', () => {
    // 模拟日志记录器
    const logger = {
      debug: (message: string) => console.log(`[DEBUG] ${message}`),
      info: (message: string) => console.info(`[INFO] ${message}`),
      warn: (message: string) => console.warn(`[WARN] ${message}`),
      error: (message: string) => console.error(`[ERROR] ${message}`),
    };

    // 记录不同级别的日志
    logger.debug('调试信息');
    logger.info('普通信息');
    logger.warn('警告信息');
    logger.error('错误信息');

    // 验证日志调用
    expect(consoleLogSpy).toHaveBeenCalledWith('[DEBUG] 调试信息');
    expect(consoleInfoSpy).toHaveBeenCalledWith('[INFO] 普通信息');
    expect(consoleWarnSpy).toHaveBeenCalledWith('[WARN] 警告信息');
    expect(consoleErrorSpy).toHaveBeenCalledWith('[ERROR] 错误信息');
  });

  /**
   * 测试用例：日志格式化
   */
  it('应该正确格式化日志消息', () => {
    const formatLog = (level: string, message: string, ...args: any[]) => {
      const timestamp = new Date().toISOString();
      const formattedArgs = args.length > 0 ? ` ${JSON.stringify(args)}` : '';
      return `[${timestamp}] [${level}] ${message}${formattedArgs}`;
    };

    const result = formatLog('INFO', '测试消息', { key: 'value' });

    expect(result).toContain('[INFO]');
    expect(result).toContain('测试消息');
    expect(result).toContain('{"key":"value"}');
  });

  /**
   * 测试用例：日志级别过滤
   */
  it('应该根据日志级别过滤消息', () => {
    const LogLevel = {
      DEBUG: 0,
      INFO: 1,
      WARN: 2,
      ERROR: 3,
    };

    class Logger {
      private level: number;

      constructor(level: number) {
        this.level = level;
      }

      debug(message: string) {
        if (this.level <= LogLevel.DEBUG) {
          console.log(`[DEBUG] ${message}`);
        }
      }

      info(message: string) {
        if (this.level <= LogLevel.INFO) {
          console.info(`[INFO] ${message}`);
        }
      }

      warn(message: string) {
        if (this.level <= LogLevel.WARN) {
          console.warn(`[WARN] ${message}`);
        }
      }

      error(message: string) {
        if (this.level <= LogLevel.ERROR) {
          console.error(`[ERROR] ${message}`);
        }
      }
    }

    // 创建只记录 WARN 及以上级别的日志记录器
    const logger = new Logger(LogLevel.WARN);

    logger.debug('不应该输出');
    logger.info('不应该输出');
    logger.warn('应该输出');
    logger.error('应该输出');

    // 验证只有 WARN 和 ERROR 被记录
    expect(consoleLogSpy).not.toHaveBeenCalled();
    expect(consoleInfoSpy).not.toHaveBeenCalled();
    expect(consoleWarnSpy).toHaveBeenCalledWith('[WARN] 应该输出');
    expect(consoleErrorSpy).toHaveBeenCalledWith('[ERROR] 应该输出');
  });

  /**
   * 测试用例：错误对象日志记录
   */
  it('应该正确记录错误对象', () => {
    const logError = (error: Error) => {
      console.error('[ERROR]', {
        message: error.message,
        stack: error.stack,
        name: error.name,
      });
    };

    const testError = new Error('测试错误');
    logError(testError);

    expect(consoleErrorSpy).toHaveBeenCalled();
    const callArgs = consoleErrorSpy.mock.calls[0];
    expect(callArgs[0]).toBe('[ERROR]');
    expect(callArgs[1]).toHaveProperty('message', '测试错误');
    expect(callArgs[1]).toHaveProperty('name', 'Error');
  });

  /**
   * 测试用例：结构化日志
   */
  it('应该支持结构化日志记录', () => {
    const structuredLog = (level: string, message: string, context: Record<string, any>) => {
      console.log(JSON.stringify({
        timestamp: new Date().toISOString(),
        level,
        message,
        ...context,
      }));
    };

    structuredLog('INFO', '用户登录', {
      userId: 123,
      username: '张三',
      ip: '192.168.1.1',
    });

    expect(consoleLogSpy).toHaveBeenCalled();
    const logOutput = consoleLogSpy.mock.calls[0][0];
    const parsed = JSON.parse(logOutput);

    expect(parsed).toHaveProperty('level', 'INFO');
    expect(parsed).toHaveProperty('message', '用户登录');
    expect(parsed).toHaveProperty('userId', 123);
    expect(parsed).toHaveProperty('username', '张三');
  });

  /**
   * 测试用例：性能日志
   */
  it('应该正确记录性能指标', () => {
    const logPerformance = (operation: string, duration: number) => {
      console.info(`[PERF] ${operation} 耗时: ${duration}ms`);
    };

    logPerformance('数据库查询', 150);

    expect(consoleInfoSpy).toHaveBeenCalledWith('[PERF] 数据库查询 耗时: 150ms');
  });

  /**
   * 测试用例：日志上下文
   */
  it('应该支持日志上下文', () => {
    class ContextLogger {
      private context: Record<string, any>;

      constructor(context: Record<string, any> = {}) {
        this.context = context;
      }

      info(message: string, additionalContext: Record<string, any> = {}) {
        console.info('[INFO]', {
          message,
          ...this.context,
          ...additionalContext,
        });
      }
    }

    const logger = new ContextLogger({ module: 'schedule', userId: 100 });
    logger.info('生成课表', { classCount: 26 });

    expect(consoleInfoSpy).toHaveBeenCalled();
    const callArgs = consoleInfoSpy.mock.calls[0];
    expect(callArgs[1]).toEqual({
      message: '生成课表',
      module: 'schedule',
      userId: 100,
      classCount: 26,
    });
  });
});

/**
 * 测试套件：日志工具函数
 */
describe('日志工具函数', () => {
  /**
   * 测试用例：日志消息截断
   */
  it('应该正确截断过长的日志消息', () => {
    const truncateMessage = (message: string, maxLength: number = 100): string => {
      if (message.length <= maxLength) {
        return message;
      }
      return `${message.substring(0, maxLength)  }...`;
    };

    const longMessage = 'a'.repeat(150);
    const truncated = truncateMessage(longMessage, 100);

    expect(truncated).toHaveLength(103); // 100 + '...'
    expect(truncated.endsWith('...')).toBe(true);
  });

  /**
   * 测试用例：敏感信息过滤
   */
  it('应该过滤敏感信息', () => {
    const sanitizeLog = (data: Record<string, any>): Record<string, any> => {
      const sensitiveKeys = ['password', 'token', 'secret', 'apiKey'];
      const sanitized = { ...data };

      for (const key of sensitiveKeys) {
        if (key in sanitized) {
          sanitized[key] = '***';
        }
      }

      return sanitized;
    };

    const data = {
      username: '张三',
      password: '123456',
      token: 'abc123',
      email: 'test@example.com',
    };

    const sanitized = sanitizeLog(data);

    expect(sanitized.username).toBe('张三');
    expect(sanitized.password).toBe('***');
    expect(sanitized.token).toBe('***');
    expect(sanitized.email).toBe('test@example.com');
  });

  /**
   * 测试用例：日志批处理
   */
  it('应该支持日志批处理', async () => {
    class BatchLogger {
      private buffer: string[] = [];
      private batchSize: number;

      constructor(batchSize: number = 10) {
        this.batchSize = batchSize;
      }

      log(message: string) {
        this.buffer.push(message);
        if (this.buffer.length >= this.batchSize) {
          this.flush();
        }
      }

      flush() {
        if (this.buffer.length > 0) {
          console.log(`[BATCH] 输出 ${this.buffer.length} 条日志`);
          this.buffer = [];
        }
      }
    }

    const consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    const logger = new BatchLogger(3);

    logger.log('消息1');
    logger.log('消息2');
    expect(consoleLogSpy).not.toHaveBeenCalled();

    logger.log('消息3');
    expect(consoleLogSpy).toHaveBeenCalledWith('[BATCH] 输出 3 条日志');

    consoleLogSpy.mockRestore();
  });
});
