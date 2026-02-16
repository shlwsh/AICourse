/**
 * 错误处理中间件单元测试
 *
 * 测试内容：
 * - 标准错误响应格式
 * - 不同错误类型的处理
 * - 开发环境和生产环境的差异
 * - 错误日志记录
 * - 自定义错误类
 */

import { describe, it, expect, beforeEach, afterEach, mock } from 'bun:test';
import { Hono } from 'hono';
import {
  errorHandler,
  BusinessError,
  ValidationError,
  NotFoundError,
  UnauthorizedError,
  ForbiddenError,
  ConflictError,
  InternalServerError,
  asyncHandler,
  successResponse,
  throwError,
} from './error-handler';
import { logger } from '../utils/logger';

describe('错误处理中间件', () => {
  let app: Hono;
  let originalEnv: string | undefined;

  beforeEach(() => {
    // 创建新的 Hono 应用实例
    app = new Hono();
    app.onError(errorHandler);

    // 保存原始环境变量
    originalEnv = process.env.NODE_ENV;
  });

  afterEach(() => {
    // 恢复环境变量
    if (originalEnv !== undefined) {
      process.env.NODE_ENV = originalEnv;
    } else {
      delete process.env.NODE_ENV;
    }
  });

  describe('基本错误处理', () => {
    it('应该返回标准化的错误响应格式', async () => {
      // 设置为生产环境
      process.env.NODE_ENV = 'production';

      app.get('/test', () => {
        throw new Error('测试错误');
      });

      const res = await app.request('/test');
      const json = await res.json();

      expect(res.status).toBe(500);
      expect(json).toMatchObject({
        success: false,
        message: '测试错误',
        code: 'INTERNAL_SERVER_ERROR',
        path: '/test',
      });
      expect(json.timestamp).toBeDefined();
      expect(json.stack).toBeUndefined(); // 生产环境不应包含堆栈
    });

    it('应该在开发环境下包含错误详情和堆栈', async () => {
      // 设置为开发环境
      process.env.NODE_ENV = 'development';

      app.get('/test', () => {
        throw new Error('测试错误');
      });

      const res = await app.request('/test');
      const json = await res.json();

      expect(res.status).toBe(500);
      expect(json.success).toBe(false);
      expect(json.message).toBe('测试错误');
      expect(json.stack).toBeDefined(); // 开发环境应包含堆栈
    });

    it('应该处理未知错误', async () => {
      app.get('/test', () => {
        throw new Error('非标准错误'); // 使用 Error 对象
      });

      const res = await app.request('/test');
      const json = await res.json();

      expect(res.status).toBe(500);
      expect(json.success).toBe(false);
    });
  });

  describe('自定义错误类', () => {
    it('应该正确处理 BusinessError', async () => {
      app.get('/test', () => {
        throw new BusinessError('业务错误', 400, 'BUSINESS_ERROR', { field: 'test' });
      });

      const res = await app.request('/test');
      const json = await res.json();

      expect(res.status).toBe(400);
      expect(json).toMatchObject({
        success: false,
        message: '业务错误',
        code: 'BUSINESS_ERROR',
      });
    });

    it('应该正确处理 ValidationError', async () => {
      app.get('/test', () => {
        throw new ValidationError('验证失败', { field: 'email', reason: '格式不正确' });
      });

      const res = await app.request('/test');
      const json = await res.json();

      expect(res.status).toBe(400);
      expect(json).toMatchObject({
        success: false,
        message: '验证失败',
        code: 'VALIDATION_ERROR',
      });
    });

    it('应该正确处理 NotFoundError', async () => {
      app.get('/test', () => {
        throw new NotFoundError('资源未找到');
      });

      const res = await app.request('/test');
      const json = await res.json();

      expect(res.status).toBe(404);
      expect(json).toMatchObject({
        success: false,
        message: '资源未找到',
        code: 'NOT_FOUND',
      });
    });

    it('应该正确处理 UnauthorizedError', async () => {
      app.get('/test', () => {
        throw new UnauthorizedError('未授权');
      });

      const res = await app.request('/test');
      const json = await res.json();

      expect(res.status).toBe(401);
      expect(json).toMatchObject({
        success: false,
        message: '未授权',
        code: 'UNAUTHORIZED',
      });
    });

    it('应该正确处理 ForbiddenError', async () => {
      app.get('/test', () => {
        throw new ForbiddenError('禁止访问');
      });

      const res = await app.request('/test');
      const json = await res.json();

      expect(res.status).toBe(403);
      expect(json).toMatchObject({
        success: false,
        message: '禁止访问',
        code: 'FORBIDDEN',
      });
    });

    it('应该正确处理 ConflictError', async () => {
      app.get('/test', () => {
        throw new ConflictError('资源冲突', { existing: 'value' });
      });

      const res = await app.request('/test');
      const json = await res.json();

      expect(res.status).toBe(409);
      expect(json).toMatchObject({
        success: false,
        message: '资源冲突',
        code: 'CONFLICT',
      });
    });

    it('应该正确处理 InternalServerError', async () => {
      app.get('/test', () => {
        throw new InternalServerError('服务器错误');
      });

      const res = await app.request('/test');
      const json = await res.json();

      expect(res.status).toBe(500);
      expect(json).toMatchObject({
        success: false,
        message: '服务器错误',
        code: 'INTERNAL_SERVER_ERROR',
      });
    });
  });

  describe('asyncHandler 辅助函数', () => {
    it('应该正确处理异步成功响应', async () => {
      app.get(
        '/test',
        asyncHandler(async (c) => {
          return c.json({ data: 'success' });
        }),
      );

      const res = await app.request('/test');
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json).toEqual({ data: 'success' });
    });

    it('应该捕获异步错误', async () => {
      app.get(
        '/test',
        asyncHandler(async () => {
          throw new ValidationError('异步验证失败');
        }),
      );

      const res = await app.request('/test');
      const json = await res.json();

      expect(res.status).toBe(400);
      expect(json).toMatchObject({
        success: false,
        message: '异步验证失败',
        code: 'VALIDATION_ERROR',
      });
    });

    it('应该处理 Promise 拒绝', async () => {
      app.get(
        '/test',
        asyncHandler(async () => {
          return Promise.reject(new Error('Promise 拒绝'));
        }),
      );

      const res = await app.request('/test');
      const json = await res.json();

      expect(res.status).toBe(500);
      expect(json.success).toBe(false);
      expect(json.message).toBe('Promise 拒绝');
    });
  });

  describe('successResponse 辅助函数', () => {
    it('应该创建标准成功响应', () => {
      const response = successResponse({ id: 1, name: 'test' }, '创建成功');

      expect(response).toMatchObject({
        success: true,
        message: '创建成功',
        data: { id: 1, name: 'test' },
      });
      expect(response.timestamp).toBeDefined();
    });

    it('应该使用默认消息', () => {
      const response = successResponse({ id: 1 });

      expect(response.message).toBe('操作成功');
    });

    it('应该支持无数据的成功响应', () => {
      const response = successResponse();

      expect(response).toMatchObject({
        success: true,
        message: '操作成功',
      });
      expect(response.data).toBeUndefined();
    });
  });

  describe('throwError 辅助函数', () => {
    it('应该抛出 BusinessError', () => {
      expect(() => {
        throwError('测试错误', 400, 'TEST_ERROR', { field: 'test' });
      }).toThrow(BusinessError);
    });

    it('应该使用默认状态码', () => {
      try {
        throwError('测试错误');
      } catch (error) {
        expect(error).toBeInstanceOf(BusinessError);
        expect((error as BusinessError).statusCode).toBe(400);
      }
    });
  });

  describe('错误日志记录', () => {
    it('应该记录服务器错误（500）', async () => {
      // Mock logger.error
      const errorSpy = mock(() => {});
      const originalError = logger.error;
      logger.error = errorSpy as any;

      app.get('/test', () => {
        throw new InternalServerError('服务器错误');
      });

      await app.request('/test');

      expect(errorSpy).toHaveBeenCalled();

      // 恢复原始方法
      logger.error = originalError;
    });

    it('应该记录客户端错误（400）', async () => {
      // Mock logger.warn
      const warnSpy = mock(() => {});
      const originalWarn = logger.warn;
      logger.warn = warnSpy as any;

      app.get('/test', () => {
        throw new ValidationError('验证失败');
      });

      await app.request('/test');

      expect(warnSpy).toHaveBeenCalled();

      // 恢复原始方法
      logger.warn = originalWarn;
    });
  });

  describe('错误响应格式', () => {
    it('应该包含所有必需字段', async () => {
      app.get('/test', () => {
        throw new ValidationError('验证失败');
      });

      const res = await app.request('/test');
      const json = await res.json();

      expect(json).toHaveProperty('success');
      expect(json).toHaveProperty('message');
      expect(json).toHaveProperty('code');
      expect(json).toHaveProperty('path');
      expect(json).toHaveProperty('timestamp');
    });

    it('应该正确设置 success 为 false', async () => {
      app.get('/test', () => {
        throw new Error('测试错误');
      });

      const res = await app.request('/test');
      const json = await res.json();

      expect(json.success).toBe(false);
    });

    it('应该包含正确的请求路径', async () => {
      app.get('/api/test/path', () => {
        throw new Error('测试错误');
      });

      const res = await app.request('/api/test/path');
      const json = await res.json();

      expect(json.path).toBe('/api/test/path');
    });

    it('应该包含有效的时间戳', async () => {
      app.get('/test', () => {
        throw new Error('测试错误');
      });

      const res = await app.request('/test');
      const json = await res.json();

      expect(json.timestamp).toBeDefined();
      expect(new Date(json.timestamp).toString()).not.toBe('Invalid Date');
    });
  });

  describe('HTTP 状态码', () => {
    it('应该为 ValidationError 返回 400', async () => {
      app.get('/test', () => {
        throw new ValidationError('验证失败');
      });

      const res = await app.request('/test');
      expect(res.status).toBe(400);
    });

    it('应该为 UnauthorizedError 返回 401', async () => {
      app.get('/test', () => {
        throw new UnauthorizedError();
      });

      const res = await app.request('/test');
      expect(res.status).toBe(401);
    });

    it('应该为 ForbiddenError 返回 403', async () => {
      app.get('/test', () => {
        throw new ForbiddenError();
      });

      const res = await app.request('/test');
      expect(res.status).toBe(403);
    });

    it('应该为 NotFoundError 返回 404', async () => {
      app.get('/test', () => {
        throw new NotFoundError();
      });

      const res = await app.request('/test');
      expect(res.status).toBe(404);
    });

    it('应该为 ConflictError 返回 409', async () => {
      app.get('/test', () => {
        throw new ConflictError('冲突');
      });

      const res = await app.request('/test');
      expect(res.status).toBe(409);
    });

    it('应该为 InternalServerError 返回 500', async () => {
      app.get('/test', () => {
        throw new InternalServerError();
      });

      const res = await app.request('/test');
      expect(res.status).toBe(500);
    });

    it('应该为未知错误返回 500', async () => {
      app.get('/test', () => {
        throw new Error('未知错误');
      });

      const res = await app.request('/test');
      expect(res.status).toBe(500);
    });
  });

  describe('错误详情', () => {
    it('应该在开发环境下包含错误详情', async () => {
      process.env.NODE_ENV = 'development';

      app.get('/test', () => {
        throw new ValidationError('验证失败', { field: 'email', reason: '格式不正确' });
      });

      const res = await app.request('/test');
      const json = await res.json();

      expect(json.details).toEqual({ field: 'email', reason: '格式不正确' });
    });

    it('应该在生产环境下隐藏错误详情', async () => {
      process.env.NODE_ENV = 'production';

      app.get('/test', () => {
        throw new ValidationError('验证失败', { field: 'email', reason: '格式不正确' });
      });

      const res = await app.request('/test');
      const json = await res.json();

      expect(json.details).toBeUndefined();
    });
  });
});
