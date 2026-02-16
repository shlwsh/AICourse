/**
 * 请求日志中间件测试
 *
 * 测试内容：
 * - 验证请求开始时记录日志
 * - 验证请求完成时记录响应信息和执行时间
 * - 验证错误情况下记录异常信息
 * - 验证不同状态码使用不同日志级别
 * - 验证路由级别日志记录器功能
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { Hono } from 'hono';
import { requestLogger, createRouteLogger } from './request-logger';
import { logger } from '../utils/logger';

// 模拟 logger
vi.mock('../utils/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

describe('请求日志中间件测试', () => {
  let app: Hono;

  beforeEach(() => {
    app = new Hono();
    app.use('*', requestLogger);
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('应该记录成功的 GET 请求', async () => {
    // 设置路由
    app.get('/test', (c) => c.json({ success: true }));

    // 发送请求
    const res = await app.request('/test');

    // 验证响应
    expect(res.status).toBe(200);

    // 验证日志调用
    expect(logger.info).toHaveBeenCalledWith(
      'HTTP 请求开始',
      expect.objectContaining({
        method: 'GET',
        path: '/test',
      }),
    );

    expect(logger.info).toHaveBeenCalledWith(
      'HTTP 请求完成',
      expect.objectContaining({
        request: expect.objectContaining({
          method: 'GET',
          path: '/test',
        }),
        response: expect.objectContaining({
          status: 200,
          duration: expect.any(Number),
        }),
      }),
    );
  });

  it('应该记录 POST 请求的请求体', async () => {
    // 设置路由
    app.post('/test', async (c) => {
      const body = await c.req.json();
      return c.json({ success: true, data: body });
    });

    // 发送请求
    const res = await app.request('/test', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ name: '测试' }),
    });

    // 验证响应
    expect(res.status).toBe(200);

    // 验证日志包含请求体
    expect(logger.info).toHaveBeenCalledWith(
      'HTTP 请求开始',
      expect.objectContaining({
        method: 'POST',
        path: '/test',
        body: { name: '测试' },
      }),
    );
  });

  it('应该使用 WARN 级别记录客户端错误（4xx）', async () => {
    // 设置路由
    app.get('/test', (c) => c.json({ error: '未找到' }, 404));

    // 发送请求
    const res = await app.request('/test');

    // 验证响应
    expect(res.status).toBe(404);

    // 验证使用 WARN 级别
    expect(logger.warn).toHaveBeenCalledWith(
      'HTTP 请求完成（客户端错误）',
      expect.objectContaining({
        response: expect.objectContaining({
          status: 404,
        }),
      }),
    );
  });

  it('应该使用 ERROR 级别记录服务器错误（5xx）', async () => {
    // 设置路由
    app.get('/test', (c) => c.json({ error: '服务器错误' }, 500));

    // 发送请求
    const res = await app.request('/test');

    // 验证响应
    expect(res.status).toBe(500);

    // 验证使用 ERROR 级别
    expect(logger.error).toHaveBeenCalledWith(
      'HTTP 请求完成（服务器错误）',
      expect.objectContaining({
        response: expect.objectContaining({
          status: 500,
        }),
      }),
    );
  });

  it('应该记录请求处理异常', async () => {
    // 设置会抛出错误的路由
    app.get('/test', () => {
      throw new Error('测试错误');
    });

    // 发送请求
    const res = await app.request('/test');

    // Hono 会自动捕获错误并返回 500
    expect(res.status).toBe(500);

    // 验证记录了服务器错误
    expect(logger.error).toHaveBeenCalledWith(
      'HTTP 请求完成（服务器错误）',
      expect.objectContaining({
        response: expect.objectContaining({
          status: 500,
        }),
      }),
    );
  });

  it('应该记录查询参数', async () => {
    // 设置路由
    app.get('/test', (c) => c.json({ success: true }));

    // 发送带查询参数的请求
    const res = await app.request('/test?id=123&name=test');

    // 验证响应
    expect(res.status).toBe(200);

    // 验证日志包含查询参数
    expect(logger.info).toHaveBeenCalledWith(
      'HTTP 请求开始',
      expect.objectContaining({
        query: {
          id: '123',
          name: 'test',
        },
      }),
    );
  });
});

describe('路由级别日志记录器测试', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('应该记录路由处理开始', () => {
    const log = createRouteLogger('测试路由');

    log.start({ param: 'value' });

    expect(logger.info).toHaveBeenCalledWith('[测试路由] 开始处理', {
      param: 'value',
    });
  });

  it('应该记录业务逻辑步骤', () => {
    const log = createRouteLogger('测试路由');

    log.step('验证参数', { valid: true });

    expect(logger.debug).toHaveBeenCalledWith('[测试路由] 验证参数', {
      valid: true,
    });
  });

  it('应该记录成功结果', () => {
    const log = createRouteLogger('测试路由');

    log.success({ result: 'ok' });

    expect(logger.info).toHaveBeenCalledWith('[测试路由] 处理成功', {
      result: 'ok',
    });
  });

  it('应该记录警告信息', () => {
    const log = createRouteLogger('测试路由');

    log.warn('数据不完整', { missing: ['field1'] });

    expect(logger.warn).toHaveBeenCalledWith('[测试路由] 数据不完整', {
      missing: ['field1'],
    });
  });

  it('应该记录错误信息', () => {
    const log = createRouteLogger('测试路由');

    log.error('处理失败', { error: '数据库错误' });

    expect(logger.error).toHaveBeenCalledWith('[测试路由] 处理失败', {
      error: '数据库错误',
    });
  });

  it('应该支持完整的路由处理流程日志', () => {
    const log = createRouteLogger('生成课表');

    // 模拟完整流程
    log.start();
    log.step('验证系统配置');
    log.step('加载排课数据');
    log.step('调用约束求解器');
    log.step('保存课表到数据库');
    log.success({ cost: 100, duration: '1500ms' });

    // 验证所有日志都被调用
    expect(logger.info).toHaveBeenCalledTimes(2); // start + success
    expect(logger.debug).toHaveBeenCalledTimes(4); // 4 个 step
  });
});
