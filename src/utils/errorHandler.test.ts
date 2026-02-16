/**
 * 错误处理模块单元测试
 *
 * 测试内容：
 * - 错误类型定义
 * - 错误消息格式化
 * - 错误类型提取
 * - 错误严重程度判断
 * - 错误处理函数
 * - 全局错误处理器
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  ErrorType,
  ErrorSeverity,
  AppError,
  NetworkError,
  ValidationError,
  BusinessError,
  PermissionError,
  NotFoundError,
  ServerError,
  TimeoutError,
  DatabaseError,
  ConstraintError,
  formatErrorMessage,
  getErrorType,
  getErrorSeverity,
  showErrorNotification,
  logError,
  handleError,
  createGlobalErrorHandler,
  createUnhandledRejectionHandler,
  initGlobalErrorHandling,
  withErrorHandling,
} from './errorHandler';
import { logger } from './logger';

// Mock Element Plus 组件
vi.mock('element-plus', () => ({
  ElMessage: vi.fn(),
  ElNotification: vi.fn(),
}));

// Mock logger
vi.mock('./logger', () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

describe('错误处理模块', () => {
  beforeEach(() => {
    // 清除所有 mock 调用记录
    vi.clearAllMocks();
  });

  describe('错误类型枚举', () => {
    it('应该定义所有错误类型', () => {
      expect(ErrorType.NETWORK).toBe('NETWORK');
      expect(ErrorType.VALIDATION).toBe('VALIDATION');
      expect(ErrorType.BUSINESS).toBe('BUSINESS');
      expect(ErrorType.PERMISSION).toBe('PERMISSION');
      expect(ErrorType.NOT_FOUND).toBe('NOT_FOUND');
      expect(ErrorType.SERVER).toBe('SERVER');
      expect(ErrorType.UNKNOWN).toBe('UNKNOWN');
      expect(ErrorType.TIMEOUT).toBe('TIMEOUT');
      expect(ErrorType.DATABASE).toBe('DATABASE');
      expect(ErrorType.CONSTRAINT).toBe('CONSTRAINT');
    });
  });

  describe('错误严重程度枚举', () => {
    it('应该定义所有严重程度级别', () => {
      expect(ErrorSeverity.INFO).toBe('INFO');
      expect(ErrorSeverity.WARNING).toBe('WARNING');
      expect(ErrorSeverity.ERROR).toBe('ERROR');
      expect(ErrorSeverity.CRITICAL).toBe('CRITICAL');
    });
  });

  describe('AppError 类', () => {
    it('应该正确创建 AppError 实例', () => {
      const error = new AppError(
        '测试错误',
        ErrorType.BUSINESS,
        'TEST_ERROR',
        ErrorSeverity.ERROR,
        { detail: 'test' },
        true,
      );

      expect(error).toBeInstanceOf(Error);
      expect(error).toBeInstanceOf(AppError);
      expect(error.message).toBe('测试错误');
      expect(error.type).toBe(ErrorType.BUSINESS);
      expect(error.code).toBe('TEST_ERROR');
      expect(error.severity).toBe(ErrorSeverity.ERROR);
      expect(error.details).toEqual({ detail: 'test' });
      expect(error.showToUser).toBe(true);
      expect(error.timestamp).toBeInstanceOf(Date);
    });

    it('应该使用默认值创建 AppError', () => {
      const error = new AppError('测试错误');

      expect(error.type).toBe(ErrorType.UNKNOWN);
      expect(error.code).toBe('UNKNOWN_ERROR');
      expect(error.severity).toBe(ErrorSeverity.ERROR);
      expect(error.showToUser).toBe(true);
    });
  });

  describe('特定错误类', () => {
    it('应该正确创建 NetworkError', () => {
      const error = new NetworkError();
      expect(error).toBeInstanceOf(AppError);
      expect(error.type).toBe(ErrorType.NETWORK);
      expect(error.message).toContain('网络连接失败');
    });

    it('应该正确创建 ValidationError', () => {
      const error = new ValidationError('验证失败');
      expect(error).toBeInstanceOf(AppError);
      expect(error.type).toBe(ErrorType.VALIDATION);
      expect(error.severity).toBe(ErrorSeverity.WARNING);
    });

    it('应该正确创建 BusinessError', () => {
      const error = new BusinessError('业务错误');
      expect(error).toBeInstanceOf(AppError);
      expect(error.type).toBe(ErrorType.BUSINESS);
    });

    it('应该正确创建 PermissionError', () => {
      const error = new PermissionError();
      expect(error).toBeInstanceOf(AppError);
      expect(error.type).toBe(ErrorType.PERMISSION);
    });

    it('应该正确创建 NotFoundError', () => {
      const error = new NotFoundError();
      expect(error).toBeInstanceOf(AppError);
      expect(error.type).toBe(ErrorType.NOT_FOUND);
    });

    it('应该正确创建 ServerError', () => {
      const error = new ServerError();
      expect(error).toBeInstanceOf(AppError);
      expect(error.type).toBe(ErrorType.SERVER);
      expect(error.severity).toBe(ErrorSeverity.CRITICAL);
    });

    it('应该正确创建 TimeoutError', () => {
      const error = new TimeoutError();
      expect(error).toBeInstanceOf(AppError);
      expect(error.type).toBe(ErrorType.TIMEOUT);
    });

    it('应该正确创建 DatabaseError', () => {
      const error = new DatabaseError();
      expect(error).toBeInstanceOf(AppError);
      expect(error.type).toBe(ErrorType.DATABASE);
      expect(error.severity).toBe(ErrorSeverity.CRITICAL);
    });

    it('应该正确创建 ConstraintError', () => {
      const error = new ConstraintError('约束冲突');
      expect(error).toBeInstanceOf(AppError);
      expect(error.type).toBe(ErrorType.CONSTRAINT);
    });
  });

  describe('formatErrorMessage', () => {
    it('应该格式化 AppError 消息', () => {
      const error = new AppError('测试错误');
      const message = formatErrorMessage(error);
      expect(message).toBe('测试错误');
      expect(logger.debug).toHaveBeenCalledWith('格式化错误消息', { error });
    });

    it('应该格式化标准 Error 消息', () => {
      const error = new Error('标准错误');
      const message = formatErrorMessage(error);
      expect(message).toBe('标准错误');
    });

    it('应该格式化 HTTP 响应错误', () => {
      const error = {
        response: {
          status: 404,
          data: { message: '资源未找到' },
        },
      };
      const message = formatErrorMessage(error);
      expect(message).toBe('资源未找到');
    });

    it('应该根据 HTTP 状态码返回默认消息', () => {
      const error = {
        response: {
          status: 500,
          data: {},
        },
      };
      const message = formatErrorMessage(error);
      expect(message).toContain('服务器错误');
    });

    it('应该格式化字符串错误', () => {
      const message = formatErrorMessage('字符串错误');
      expect(message).toBe('字符串错误');
    });

    it('应该处理带 message 属性的对象', () => {
      const error = { message: '对象错误' };
      const message = formatErrorMessage(error);
      expect(message).toBe('对象错误');
    });

    it('应该返回默认消息处理未知错误', () => {
      const message = formatErrorMessage(null);
      expect(message).toContain('未知错误');
    });
  });

  describe('getErrorType', () => {
    it('应该从 AppError 提取错误类型', () => {
      const error = new AppError('测试', ErrorType.BUSINESS);
      const type = getErrorType(error);
      expect(type).toBe(ErrorType.BUSINESS);
    });

    it('应该从 HTTP 状态码推断错误类型', () => {
      const error = { response: { status: 404 } };
      const type = getErrorType(error);
      expect(type).toBe(ErrorType.NOT_FOUND);
    });

    it('应该识别网络错误', () => {
      const error = { code: 'ERR_NETWORK' };
      const type = getErrorType(error);
      expect(type).toBe(ErrorType.NETWORK);
    });

    it('应该返回 UNKNOWN 处理未知错误', () => {
      const type = getErrorType({});
      expect(type).toBe(ErrorType.UNKNOWN);
    });
  });

  describe('getErrorSeverity', () => {
    it('应该从 AppError 提取严重程度', () => {
      const error = new AppError('测试', ErrorType.BUSINESS, undefined, ErrorSeverity.CRITICAL);
      const severity = getErrorSeverity(error);
      expect(severity).toBe(ErrorSeverity.CRITICAL);
    });

    it('应该根据错误类型判断严重程度 - CRITICAL', () => {
      const serverError = { response: { status: 500 } };
      expect(getErrorSeverity(serverError)).toBe(ErrorSeverity.CRITICAL);
    });

    it('应该根据错误类型判断严重程度 - ERROR', () => {
      const networkError = { code: 'ERR_NETWORK' };
      expect(getErrorSeverity(networkError)).toBe(ErrorSeverity.ERROR);
    });

    it('应该根据错误类型判断严重程度 - WARNING', () => {
      const validationError = { response: { status: 400 } };
      expect(getErrorSeverity(validationError)).toBe(ErrorSeverity.WARNING);
    });

    it('应该根据错误类型判断严重程度 - WARNING - NOT_FOUND', () => {
      const notFoundError = { response: { status: 404 } };
      expect(getErrorSeverity(notFoundError)).toBe(ErrorSeverity.WARNING);
    });
  });

  describe('showErrorNotification', () => {
    it('应该显示严重错误通知', async () => {
      const { ElNotification } = await import('element-plus');
      const error = new ServerError('服务器错误');

      showErrorNotification(error);

      expect(ElNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          title: '严重错误',
          type: 'error',
          duration: 0,
        }),
      );
    });

    it('应该显示错误消息', async () => {
      const { ElMessage } = await import('element-plus');
      const error = new NetworkError('网络错误');

      showErrorNotification(error);

      expect(ElMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'error',
          duration: 5000,
        }),
      );
    });

    it('应该显示警告消息', async () => {
      const { ElMessage } = await import('element-plus');
      const error = new ValidationError('验证错误');

      showErrorNotification(error);

      expect(ElMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'warning',
          duration: 4000,
        }),
      );
    });

    it('应该显示警告消息 - NotFoundError', async () => {
      const { ElMessage } = await import('element-plus');
      const error = new NotFoundError('未找到');

      showErrorNotification(error);

      expect(ElMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'warning',
          duration: 4000,
        }),
      );
    });

    it('应该使用自定义消息', async () => {
      const { ElMessage } = await import('element-plus');
      const error = new Error('原始错误');

      showErrorNotification(error, '自定义消息');

      expect(ElMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          message: '自定义消息',
        }),
      );
    });
  });

  describe('logError', () => {
    it('应该记录严重错误日志', () => {
      const error = new ServerError('服务器错误');
      logError(error);

      expect(logger.error).toHaveBeenCalledWith(
        '严重错误',
        expect.objectContaining({
          errorMessage: expect.any(String),
          errorType: ErrorType.SERVER,
          severity: ErrorSeverity.CRITICAL,
        }),
      );
    });

    it('应该记录错误日志', () => {
      const error = new NetworkError('网络错误');
      logError(error);

      expect(logger.error).toHaveBeenCalledWith(
        '错误',
        expect.any(Object),
      );
    });

    it('应该记录警告日志', () => {
      const error = new ValidationError('验证错误');
      logError(error);

      expect(logger.warn).toHaveBeenCalledWith(
        '警告',
        expect.any(Object),
      );
    });

    it('应该记录警告日志 - NotFoundError', () => {
      const error = new NotFoundError('未找到');
      logError(error);

      expect(logger.warn).toHaveBeenCalledWith(
        '警告',
        expect.any(Object),
      );
    });

    it('应该包含错误详情', () => {
      const error = new AppError('测试', ErrorType.BUSINESS, undefined, ErrorSeverity.ERROR, { key: 'value' });
      logError(error);

      expect(logger.error).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          details: { key: 'value' },
        }),
      );
    });

    it('应该包含堆栈跟踪', () => {
      const error = new Error('测试错误');
      logError(error);

      expect(logger.error).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          stack: expect.any(String),
        }),
      );
    });

    it('应该包含上下文信息', () => {
      const error = new Error('测试错误');
      const context = { userId: 123, action: 'test' };
      logError(error, context);

      expect(logger.error).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining(context),
      );
    });

    it('应该包含 HTTP 响应信息', () => {
      const error = {
        response: {
          status: 500,
          data: { message: '服务器错误' },
        },
      };
      logError(error);

      expect(logger.error).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          httpStatus: 500,
          httpData: expect.any(Object),
        }),
      );
    });
  });

  describe('handleError', () => {
    it('应该处理 AppError', () => {
      const error = new BusinessError('业务错误');
      const result = handleError(error, { showNotification: false });

      expect(result).toBeInstanceOf(AppError);
      expect(result.message).toBe('业务错误');
      expect(logger.debug).toHaveBeenCalled();
      expect(logger.error).toHaveBeenCalled();
    });

    it('应该转换标准 Error 为 AppError', () => {
      const error = new Error('标准错误');
      const result = handleError(error, { showNotification: false });

      expect(result).toBeInstanceOf(AppError);
      expect(result.message).toBe('标准错误');
    });

    it('应该显示用户提示', async () => {
      const { ElMessage } = await import('element-plus');
      const error = new Error('测试错误');

      handleError(error, { showNotification: true });

      expect(ElMessage).toHaveBeenCalled();
    });

    it('应该使用自定义消息', () => {
      const error = new Error('原始错误');
      const result = handleError(error, {
        showNotification: false,
        message: '自定义消息',
      });

      expect(result.message).toBe('自定义消息');
    });

    it('应该包含上下文信息', () => {
      const error = new Error('测试错误');
      const context = { action: 'test' };

      handleError(error, {
        showNotification: false,
        context,
      });

      expect(logger.error).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining(context),
      );
    });

    it('应该重新抛出错误', () => {
      const error = new Error('测试错误');

      expect(() => {
        handleError(error, {
          showNotification: false,
          rethrow: true,
        });
      }).toThrow(AppError);
    });

    it('应该不显示不需要显示给用户的错误', async () => {
      const { ElMessage } = await import('element-plus');
      const error = new AppError('内部错误', ErrorType.UNKNOWN, undefined, ErrorSeverity.ERROR, undefined, false);

      handleError(error, { showNotification: true });

      expect(ElMessage).not.toHaveBeenCalled();
    });
  });

  describe('createGlobalErrorHandler', () => {
    it('应该创建全局错误处理器', () => {
      const handler = createGlobalErrorHandler();
      expect(handler).toBeInstanceOf(Function);
    });

    it('应该处理 Vue 应用错误', () => {
      const handler = createGlobalErrorHandler();
      const error = new Error('Vue 错误');
      const instance = { $options: { name: 'TestComponent' } };
      const info = 'render';

      handler(error, instance, info);

      expect(logger.error).toHaveBeenCalledWith(
        'Vue 应用错误',
        expect.objectContaining({
          error,
          componentName: 'TestComponent',
          info,
        }),
      );
    });
  });

  describe('createUnhandledRejectionHandler', () => {
    it('应该创建 Promise 拒绝处理器', () => {
      const handler = createUnhandledRejectionHandler();
      expect(handler).toBeInstanceOf(Function);
    });

    it('应该处理未捕获的 Promise 拒绝', () => {
      const handler = createUnhandledRejectionHandler();
      const reason = new Error('Promise 拒绝');
      const mockPromise = {} as Promise<any>; // 使用 mock 对象而不是真实的 Promise
      const event = {
        reason,
        promise: mockPromise,
        preventDefault: vi.fn(),
      } as any;

      handler(event);

      expect(event.preventDefault).toHaveBeenCalled();
      expect(logger.error).toHaveBeenCalledWith(
        '未捕获的 Promise 拒绝',
        expect.objectContaining({
          reason,
        }),
      );
    });
  });

  describe('initGlobalErrorHandling', () => {
    it('应该初始化全局错误处理', () => {
      const app = {
        config: {
          errorHandler: null,
        },
      };

      initGlobalErrorHandling(app);

      expect(app.config.errorHandler).toBeInstanceOf(Function);
      expect(logger.info).toHaveBeenCalledWith('初始化全局错误处理');
      expect(logger.info).toHaveBeenCalledWith('全局错误处理初始化完成');
    });

    it('应该在没有 app 的情况下初始化', () => {
      initGlobalErrorHandling();

      expect(logger.info).toHaveBeenCalledWith('初始化全局错误处理');
    });
  });

  describe('withErrorHandling', () => {
    it('应该包装异步函数并处理成功情况', async () => {
      const fn = vi.fn().mockResolvedValue('success');
      const wrapped = withErrorHandling(fn, { showNotification: false });

      const result = await wrapped('arg1', 'arg2');

      expect(result).toBe('success');
      expect(fn).toHaveBeenCalledWith('arg1', 'arg2');
    });

    it('应该包装异步函数并处理错误', async () => {
      const error = new Error('异步错误');
      const fn = vi.fn().mockRejectedValue(error);
      const wrapped = withErrorHandling(fn, { showNotification: false });

      await expect(wrapped()).rejects.toThrow();
      expect(logger.error).toHaveBeenCalled();
    });

    it('应该使用自定义错误处理选项', async () => {
      const error = new Error('异步错误');
      const fn = vi.fn().mockRejectedValue(error);
      const context = { action: 'test' };
      const wrapped = withErrorHandling(fn, {
        showNotification: false,
        message: '自定义消息',
        context,
      });

      await expect(wrapped()).rejects.toThrow();
      expect(logger.error).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining(context),
      );
    });
  });
});
