/**
 * 日志记录器单元测试
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import Logger, { LogLevel, logger } from './logger';

describe('Logger', () => {
  let testLogger: Logger;

  beforeEach(() => {
    // 创建测试日志实例
    testLogger = new Logger('TestModule', {
      level: LogLevel.DEBUG,
      enableConsole: true,
      enableStorage: false,
      sanitizeSensitiveData: true,
    });

    // 清空本地存储
    localStorage.clear();

    // Mock console 方法
    vi.spyOn(console, 'debug').mockImplementation(() => {});
    vi.spyOn(console, 'info').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('基础日志功能', () => {
    it('应该正确输出 DEBUG 级别日志', () => {
      testLogger.debug('测试调试消息');
      expect(console.debug).toHaveBeenCalled();
    });

    it('应该正确输出 INFO 级别日志', () => {
      testLogger.info('测试信息消息');
      expect(console.info).toHaveBeenCalled();
    });

    it('应该正确输出 WARN 级别日志', () => {
      testLogger.warn('测试警告消息');
      expect(console.warn).toHaveBeenCalled();
    });

    it('应该正确输出 ERROR 级别日志', () => {
      testLogger.error('测试错误消息');
      expect(console.error).toHaveBeenCalled();
    });

    it('应该在日志消息中包含模块名称', () => {
      testLogger.info('测试消息');
      const call = (console.info as any).mock.calls[0][0];
      expect(call).toContain('[TestModule]');
    });

    it('应该在日志消息中包含时间戳', () => {
      testLogger.info('测试消息');
      const call = (console.info as any).mock.calls[0][0];
      expect(call).toMatch(/\[\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
    });

    it('应该在日志消息中包含日志级别', () => {
      testLogger.info('测试消息');
      const call = (console.info as any).mock.calls[0][0];
      expect(call).toContain('[INFO]');
    });
  });

  describe('日志级别过滤', () => {
    it('应该根据配置的日志级别过滤日志', () => {
      const infoLogger = new Logger('InfoModule', {
        level: LogLevel.INFO,
        enableConsole: true,
        enableStorage: false,
      });

      infoLogger.debug('不应该输出');
      expect(console.debug).not.toHaveBeenCalled();

      infoLogger.info('应该输出');
      expect(console.info).toHaveBeenCalled();
    });

    it('WARN 级别应该过滤 DEBUG 和 INFO', () => {
      const warnLogger = new Logger('WarnModule', {
        level: LogLevel.WARN,
        enableConsole: true,
        enableStorage: false,
      });

      warnLogger.debug('不应该输出');
      warnLogger.info('不应该输出');
      expect(console.debug).not.toHaveBeenCalled();
      expect(console.info).not.toHaveBeenCalled();

      warnLogger.warn('应该输出');
      expect(console.warn).toHaveBeenCalled();
    });

    it('ERROR 级别应该只输出 ERROR', () => {
      const errorLogger = new Logger('ErrorModule', {
        level: LogLevel.ERROR,
        enableConsole: true,
        enableStorage: false,
      });

      errorLogger.debug('不应该输出');
      errorLogger.info('不应该输出');
      errorLogger.warn('不应该输出');
      expect(console.debug).not.toHaveBeenCalled();
      expect(console.info).not.toHaveBeenCalled();
      expect(console.warn).not.toHaveBeenCalled();

      errorLogger.error('应该输出');
      expect(console.error).toHaveBeenCalled();
    });
  });

  describe('敏感信息过滤', () => {
    it('应该过滤对象中的密码字段', () => {
      const sensitiveData = {
        username: 'admin',
        password: 'secret123',
        email: 'admin@example.com',
      };

      testLogger.info('用户登录', sensitiveData);
      const call = (console.info as any).mock.calls[0][0];
      expect(call).toContain('password');
      expect(call).toContain('***');
      expect(call).not.toContain('secret123');
    });

    it('应该过滤对象中的 API 密钥', () => {
      const sensitiveData = {
        userId: 123,
        apiKey: 'abc123xyz',
        api_key: 'def456uvw',
      };

      testLogger.info('API 调用', sensitiveData);
      const call = (console.info as any).mock.calls[0][0];
      expect(call).not.toContain('abc123xyz');
      expect(call).not.toContain('def456uvw');
    });

    it('应该过滤对象中的 token 字段', () => {
      const sensitiveData = {
        userId: 123,
        token: 'bearer-token-123',
        accessToken: 'access-token-456',
      };

      testLogger.info('认证信息', sensitiveData);
      const call = (console.info as any).mock.calls[0][0];
      expect(call).not.toContain('bearer-token-123');
      expect(call).not.toContain('access-token-456');
    });

    it('应该过滤嵌套对象中的敏感信息', () => {
      const sensitiveData = {
        user: {
          id: 123,
          name: 'admin',
          credentials: {
            password: 'secret',
            apiKey: 'key123',
          },
        },
      };

      testLogger.info('用户数据', sensitiveData);
      const call = (console.info as any).mock.calls[0][0];
      expect(call).not.toContain('secret');
      expect(call).not.toContain('key123');
    });

    it('应该过滤数组中的敏感信息', () => {
      const sensitiveData = [
        { username: 'user1', password: 'pass1' },
        { username: 'user2', password: 'pass2' },
      ];

      testLogger.info('用户列表', sensitiveData);
      const call = (console.info as any).mock.calls[0][0];
      expect(call).not.toContain('pass1');
      expect(call).not.toContain('pass2');
    });
  });

  describe('日志历史记录', () => {
    it('应该记录日志到历史', () => {
      const historyLogger = new Logger('HistoryModule', {
        enableStorage: true,
      });

      historyLogger.info('测试消息1');
      historyLogger.warn('测试消息2');
      historyLogger.error('测试消息3');

      const history = historyLogger.getHistory();
      expect(history).toHaveLength(3);
      expect(history[0]?.message).toBe('测试消息1');
      expect(history[1]?.message).toBe('测试消息2');
      expect(history[2]?.message).toBe('测试消息3');
    });

    it('应该按日志级别过滤历史记录', () => {
      const historyLogger = new Logger('HistoryModule', {
        enableStorage: true,
      });

      historyLogger.info('信息消息');
      historyLogger.warn('警告消息');
      historyLogger.error('错误消息');

      const errorHistory = historyLogger.getHistory(LogLevel.ERROR);
      expect(errorHistory).toHaveLength(1);
      expect(errorHistory[0]?.level).toBe(LogLevel.ERROR);
    });

    it('应该限制历史记录大小', () => {
      const historyLogger = new Logger('HistoryModule', {
        enableStorage: true,
        maxStorageSize: 5,
      });

      // 添加 10 条日志
      for (let i = 0; i < 10; i++) {
        historyLogger.info(`消息 ${i}`);
      }

      const history = historyLogger.getHistory();
      expect(history).toHaveLength(5);
      // 应该保留最后 5 条
      expect(history[0]?.message).toBe('消息 5');
      expect(history[4]?.message).toBe('消息 9');
    });

    it('应该能够清空历史记录', () => {
      const historyLogger = new Logger('HistoryModule', {
        enableStorage: true,
      });

      historyLogger.info('测试消息1');
      historyLogger.info('测试消息2');
      expect(historyLogger.getHistory()).toHaveLength(2);

      historyLogger.clearHistory();
      expect(historyLogger.getHistory()).toHaveLength(0);
    });
  });

  describe('日志导出', () => {
    it('应该能够导出 JSON 格式的日志', () => {
      const exportLogger = new Logger('ExportModule', {
        enableStorage: true,
      });

      exportLogger.info('测试消息', { data: 'test' });
      const exported = exportLogger.exportLogs();
      const parsed = JSON.parse(exported);

      expect(Array.isArray(parsed)).toBe(true);
      expect(parsed[0].message).toBe('测试消息');
      expect(parsed[0].data).toEqual({ data: 'test' });
    });

    it('应该能够导出文本格式的日志', () => {
      const exportLogger = new Logger('ExportModule', {
        enableStorage: true,
      });

      exportLogger.info('测试消息1');
      exportLogger.warn('测试消息2');
      const exported = exportLogger.exportLogsAsText();

      expect(exported).toContain('[INFO]');
      expect(exported).toContain('[WARN]');
      expect(exported).toContain('测试消息1');
      expect(exported).toContain('测试消息2');
    });
  });

  describe('配置管理', () => {
    it('应该能够更新配置', () => {
      testLogger.updateConfig({ level: LogLevel.ERROR });
      const config = testLogger.getConfig();
      expect(config.level).toBe(LogLevel.ERROR);
    });

    it('应该能够获取当前配置', () => {
      const config = testLogger.getConfig();
      expect(config.level).toBe(LogLevel.DEBUG);
      expect(config.enableConsole).toBe(true);
      expect(config.enableStorage).toBe(false);
    });
  });

  describe('默认日志实例', () => {
    it('应该导出默认的日志实例', () => {
      expect(logger).toBeDefined();
      expect(logger.info).toBeDefined();
      expect(logger.warn).toBeDefined();
      expect(logger.error).toBeDefined();
      expect(logger.debug).toBeDefined();
    });
  });
});
