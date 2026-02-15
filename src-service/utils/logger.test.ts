/**
 * 服务层日志记录器单元测试
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { existsSync, rmSync, readFileSync, readdirSync } from 'fs';
import { join } from 'path';
import Logger, { LogLevel } from './logger';

describe('服务层日志记录器', () => {
  const testLogDir = 'test-logs';
  let testLogger: Logger;

  beforeEach(() => {
    // 创建测试日志记录器
    testLogger = new Logger('TestModule', {
      level: LogLevel.DEBUG,
      enableConsole: false, // 测试时禁用控制台输出
      enableFile: true,
      logDir: testLogDir,
      filePrefix: 'test',
      sanitizeSensitiveData: true,
      retentionDays: 7,
    });
  });

  afterEach(() => {
    // 清理测试日志目录
    if (existsSync(testLogDir)) {
      rmSync(testLogDir, { recursive: true, force: true });
    }
  });

  describe('日志级别', () => {
    it('应该支持 DEBUG 级别', () => {
      testLogger.debug('这是一条调试日志');
      const logFiles = readdirSync(testLogDir);
      expect(logFiles.length).toBeGreaterThan(0);

      const logContent = readFileSync(join(testLogDir, logFiles[0]), 'utf-8');
      expect(logContent).toContain('[DEBUG]');
      expect(logContent).toContain('这是一条调试日志');
    });

    it('应该支持 INFO 级别', () => {
      testLogger.info('这是一条信息日志');
      const logFiles = readdirSync(testLogDir);
      const logContent = readFileSync(join(testLogDir, logFiles[0]), 'utf-8');
      expect(logContent).toContain('[INFO]');
      expect(logContent).toContain('这是一条信息日志');
    });

    it('应该支持 WARN 级别', () => {
      testLogger.warn('这是一条警告日志');
      const logFiles = readdirSync(testLogDir);
      const logContent = readFileSync(join(testLogDir, logFiles[0]), 'utf-8');
      expect(logContent).toContain('[WARN]');
      expect(logContent).toContain('这是一条警告日志');
    });

    it('应该支持 ERROR 级别', () => {
      testLogger.error('这是一条错误日志');
      const logFiles = readdirSync(testLogDir);
      const logContent = readFileSync(join(testLogDir, logFiles[0]), 'utf-8');
      expect(logContent).toContain('[ERROR]');
      expect(logContent).toContain('这是一条错误日志');
    });

    it('应该根据配置的日志级别过滤日志', () => {
      const infoLogger = new Logger('InfoModule', {
        level: LogLevel.INFO,
        enableConsole: false,
        enableFile: true,
        logDir: testLogDir,
        filePrefix: 'info-test',
      });

      infoLogger.debug('这条调试日志不应该被记录');
      infoLogger.info('这条信息日志应该被记录');

      const logFiles = readdirSync(testLogDir);
      const logContent = readFileSync(join(testLogDir, logFiles[0]), 'utf-8');

      expect(logContent).not.toContain('这条调试日志不应该被记录');
      expect(logContent).toContain('这条信息日志应该被记录');
    });
  });

  describe('日志格式', () => {
    it('应该包含时间戳', () => {
      testLogger.info('测试日志');
      const logFiles = readdirSync(testLogDir);
      const logContent = readFileSync(join(testLogDir, logFiles[0]), 'utf-8');

      // 检查 ISO 8601 格式的时间戳
      expect(logContent).toMatch(/\[\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z\]/);
    });

    it('应该包含日志级别', () => {
      testLogger.info('测试日志');
      const logFiles = readdirSync(testLogDir);
      const logContent = readFileSync(join(testLogDir, logFiles[0]), 'utf-8');
      expect(logContent).toContain('[INFO]');
    });

    it('应该包含模块名称', () => {
      testLogger.info('测试日志');
      const logFiles = readdirSync(testLogDir);
      const logContent = readFileSync(join(testLogDir, logFiles[0]), 'utf-8');
      expect(logContent).toContain('[TestModule]');
    });

    it('应该包含日志消息', () => {
      testLogger.info('这是测试消息');
      const logFiles = readdirSync(testLogDir);
      const logContent = readFileSync(join(testLogDir, logFiles[0]), 'utf-8');
      expect(logContent).toContain('这是测试消息');
    });

    it('应该支持附加数据', () => {
      testLogger.info('用户登录', { userId: 123, username: 'test' });
      const logFiles = readdirSync(testLogDir);
      const logContent = readFileSync(join(testLogDir, logFiles[0]), 'utf-8');
      expect(logContent).toContain('"userId":123');
      expect(logContent).toContain('"username":"test"');
    });
  });

  describe('敏感信息过滤', () => {
    it('应该过滤密码字段', () => {
      testLogger.info('用户注册', {
        username: 'testuser',
        password: 'secret123',
        email: 'test@example.com',
      });

      const logFiles = readdirSync(testLogDir);
      const logContent = readFileSync(join(testLogDir, logFiles[0]), 'utf-8');

      expect(logContent).toContain('"username":"testuser"');
      expect(logContent).toContain('"password":"***"');
      expect(logContent).toContain('"email":"test@example.com"');
      expect(logContent).not.toContain('secret123');
    });

    it('应该过滤 API 密钥', () => {
      testLogger.info('API 调用', {
        endpoint: '/api/data',
        api_key: 'abc123xyz',
        apiKey: 'def456uvw',
      });

      const logFiles = readdirSync(testLogDir);
      const logContent = readFileSync(join(testLogDir, logFiles[0]), 'utf-8');

      expect(logContent).toContain('"api_key":"***"');
      expect(logContent).toContain('"apiKey":"***"');
      expect(logContent).not.toContain('abc123xyz');
      expect(logContent).not.toContain('def456uvw');
    });

    it('应该过滤 token 字段', () => {
      testLogger.info('认证请求', {
        token: 'bearer_token_123',
        authorization: 'Bearer xyz789',
      });

      const logFiles = readdirSync(testLogDir);
      const logContent = readFileSync(join(testLogDir, logFiles[0]), 'utf-8');

      expect(logContent).toContain('"token":"***"');
      expect(logContent).toContain('"authorization":"***"');
      expect(logContent).not.toContain('bearer_token_123');
      expect(logContent).not.toContain('Bearer xyz789');
    });

    it('应该过滤嵌套对象中的敏感信息', () => {
      testLogger.info('复杂数据', {
        user: {
          name: 'test',
          password: 'secret',
        },
        config: {
          api_key: 'key123',
        },
      });

      const logFiles = readdirSync(testLogDir);
      const logContent = readFileSync(join(testLogDir, logFiles[0]), 'utf-8');

      expect(logContent).toContain('"name":"test"');
      expect(logContent).toContain('"password":"***"');
      expect(logContent).toContain('"api_key":"***"');
      expect(logContent).not.toContain('secret');
      expect(logContent).not.toContain('key123');
    });

    it('应该过滤数组中的敏感信息', () => {
      testLogger.info('批量操作', {
        users: [
          { name: 'user1', password: 'pass1' },
          { name: 'user2', password: 'pass2' },
        ],
      });

      const logFiles = readdirSync(testLogDir);
      const logContent = readFileSync(join(testLogDir, logFiles[0]), 'utf-8');

      expect(logContent).toContain('"name":"user1"');
      expect(logContent).toContain('"name":"user2"');
      expect(logContent).toContain('"password":"***"');
      expect(logContent).not.toContain('pass1');
      expect(logContent).not.toContain('pass2');
    });
  });

  describe('文件输出', () => {
    it('应该创建日志目录', () => {
      testLogger.info('测试日志');
      expect(existsSync(testLogDir)).toBe(true);
    });

    it('应该创建日志文件', () => {
      testLogger.info('测试日志');
      const logFiles = readdirSync(testLogDir);
      expect(logFiles.length).toBeGreaterThan(0);
    });

    it('日志文件名应该包含日期', () => {
      testLogger.info('测试日志');
      const logFiles = readdirSync(testLogDir);
      const today = new Date().toISOString().split('T')[0];
      expect(logFiles[0]).toContain(today);
    });

    it('应该将多条日志写入同一文件', () => {
      testLogger.info('第一条日志');
      testLogger.info('第二条日志');
      testLogger.info('第三条日志');

      const logFiles = readdirSync(testLogDir);
      expect(logFiles.length).toBe(1);

      const logContent = readFileSync(join(testLogDir, logFiles[0]), 'utf-8');
      const lines = logContent.trim().split('\n');
      expect(lines.length).toBe(3);
    });
  });

  describe('配置管理', () => {
    it('应该支持更新配置', () => {
      const config = testLogger.getConfig();
      expect(config.level).toBe(LogLevel.DEBUG);

      testLogger.updateConfig({ level: LogLevel.ERROR });
      const newConfig = testLogger.getConfig();
      expect(newConfig.level).toBe(LogLevel.ERROR);
    });

    it('应该支持禁用敏感信息过滤', () => {
      testLogger.updateConfig({ sanitizeSensitiveData: false });
      testLogger.info('测试', { password: 'secret123' });

      const logFiles = readdirSync(testLogDir);
      const logContent = readFileSync(join(testLogDir, logFiles[0]), 'utf-8');
      expect(logContent).toContain('secret123');
    });
  });
});
