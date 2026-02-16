/**
 * HTTP 响应拦截器单元测试
 * 测试响应拦截器的各项功能：响应日志记录、统一错误处理、数据转换、响应时间统计
 */
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import HttpClient, { type ApiResponse, type ResponseInterceptor } from '@/api/http';
import { logger } from '@/utils/logger';

// Mock logger
vi.mock('@/utils/logger', () => ({
  logger: {
    info: vi.fn(),
    debug: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

// Mock fetch
global.fetch = vi.fn() as any;

// Mock performance.now
const mockPerformanceNow = vi.fn();
global.performance = {
  now: mockPerformanceNow,
} as any;

describe('HTTP 响应拦截器', () => {
  let httpClient: HttpClient;

  beforeEach(() => {
    // 重置所有 mock
    vi.clearAllMocks();

    // 创建新的 HTTP 客户端实例
    httpClient = new HttpClient('/api', 5000);

    // 设置 performance.now 的默认返回值
    mockPerformanceNow.mockReturnValue(0);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('响应日志记录', () => {
    it('应该记录成功响应的基本信息', async () => {
      // 模拟成功响应
      const mockResponse: ApiResponse = {
        success: true,
        data: { id: 1, name: '测试数据' },
        message: '操作成功',
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        status: 200,
        statusText: 'OK',
        json: async () => mockResponse,
      });

      // 模拟响应时间
      mockPerformanceNow.mockReturnValueOnce(0).mockReturnValueOnce(100);

      await httpClient.get('/test');

      // 验证响应日志记录
      expect(logger.info).toHaveBeenCalledWith(
        '响应拦截器 - 记录响应信息',
        expect.objectContaining({
          success: true,
          hasData: true,
          hasMessage: true,
          hasError: false,
        })
      );
    });

    it('应该记录包含错误信息的响应', async () => {
      // 模拟包含错误的响应
      const mockResponse: ApiResponse = {
        success: false,
        error: '操作失败',
        message: '数据验证失败',
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        status: 200,
        statusText: 'OK',
        json: async () => mockResponse,
      });

      mockPerformanceNow.mockReturnValueOnce(0).mockReturnValueOnce(100);

      await httpClient.get('/test');

      // 验证错误日志记录
      expect(logger.warn).toHaveBeenCalledWith(
        '响应拦截器 - 响应包含错误信息',
        expect.objectContaining({
          error: '操作失败',
          message: '数据验证失败',
        })
      );
    });

    it('应该记录响应数据的详细信息（DEBUG 级别）', async () => {
      const mockResponse: ApiResponse = {
        success: true,
        data: { id: 1, name: '测试', items: [] },
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        status: 200,
        statusText: 'OK',
        json: async () => mockResponse,
      });

      mockPerformanceNow.mockReturnValueOnce(0).mockReturnValueOnce(100);

      await httpClient.get('/test');

      // 验证 DEBUG 级别的数据日志
      expect(logger.debug).toHaveBeenCalledWith(
        '响应拦截器 - 响应数据',
        expect.objectContaining({
          dataType: 'object',
          dataKeys: expect.arrayContaining(['id', 'name', 'items']),
        })
      );
    });
  });

  describe('统一错误处理', () => {
    it('应该处理业务逻辑错误（success: false）', async () => {
      const mockResponse: ApiResponse = {
        success: false,
        error: '数据不存在',
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        status: 200,
        statusText: 'OK',
        json: async () => mockResponse,
      });

      mockPerformanceNow.mockReturnValueOnce(0).mockReturnValueOnce(100);

      await httpClient.get('/test');

      // 验证错误处理日志
      expect(logger.error).toHaveBeenCalledWith(
        '响应拦截器 - 业务逻辑错误',
        expect.objectContaining({
          error: '数据不存在',
        })
      );
    });

    it('应该识别未授权错误', async () => {
      const mockResponse: ApiResponse = {
        success: false,
        error: '用户未授权，请先登录',
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        status: 200,
        statusText: 'OK',
        json: async () => mockResponse,
      });

      mockPerformanceNow.mockReturnValueOnce(0).mockReturnValueOnce(100);

      await httpClient.get('/test');

      // 验证未授权错误识别
      expect(logger.warn).toHaveBeenCalledWith(
        '响应拦截器 - 检测到未授权错误',
        expect.objectContaining({
          error: expect.stringContaining('未授权'),
        })
      );
    });

    it('应该识别权限错误', async () => {
      const mockResponse: ApiResponse = {
        success: false,
        error: '权限不足，无法执行此操作',
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        status: 200,
        statusText: 'OK',
        json: async () => mockResponse,
      });

      mockPerformanceNow.mockReturnValueOnce(0).mockReturnValueOnce(100);

      await httpClient.get('/test');

      // 验证权限错误识别
      expect(logger.warn).toHaveBeenCalledWith(
        '响应拦截器 - 检测到权限错误',
        expect.objectContaining({
          error: expect.stringContaining('权限'),
        })
      );
    });

    it('应该识别资源不存在错误', async () => {
      const mockResponse: ApiResponse = {
        success: false,
        error: '请求的资源不存在',
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        status: 200,
        statusText: 'OK',
        json: async () => mockResponse,
      });

      mockPerformanceNow.mockReturnValueOnce(0).mockReturnValueOnce(100);

      await httpClient.get('/test');

      // 验证资源不存在错误识别
      expect(logger.warn).toHaveBeenCalledWith(
        '响应拦截器 - 检测到资源不存在错误',
        expect.objectContaining({
          error: expect.stringContaining('不存在'),
        })
      );
    });

    it('应该处理其他业务错误', async () => {
      const mockResponse: ApiResponse = {
        success: false,
        error: '服务器内部错误',
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        status: 200,
        statusText: 'OK',
        json: async () => mockResponse,
      });

      mockPerformanceNow.mockReturnValueOnce(0).mockReturnValueOnce(100);

      await httpClient.get('/test');

      // 验证其他错误处理
      expect(logger.error).toHaveBeenCalledWith(
        '响应拦截器 - 其他业务错误',
        expect.objectContaining({
          error: '服务器内部错误',
        })
      );
    });
  });

  describe('数据转换', () => {
    it('应该标准化响应格式（确保包含必要字段）', async () => {
      // 模拟不完整的响应
      const mockResponse = {
        data: { id: 1 },
      } as any;

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        status: 200,
        statusText: 'OK',
        json: async () => mockResponse,
      });

      mockPerformanceNow.mockReturnValueOnce(0).mockReturnValueOnce(100);

      const result = await httpClient.get('/test');

      // 验证响应被标准化
      expect(result).toHaveProperty('success');
      expect(result).toHaveProperty('data');
      expect(result).toHaveProperty('message');
      expect(result).toHaveProperty('error');
      expect(result.success).toBe(true); // 默认值
    });

    it('应该将字符串数据解析为 JSON', async () => {
      const mockResponse: ApiResponse = {
        success: true,
        data: '{"id":1,"name":"测试"}', // 字符串格式的 JSON
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        status: 200,
        statusText: 'OK',
        json: async () => mockResponse,
      });

      mockPerformanceNow.mockReturnValueOnce(0).mockReturnValueOnce(100);

      const result = await httpClient.get('/test');

      // 验证字符串被解析为对象
      expect(typeof result.data).toBe('object');
      expect(result.data).toEqual({ id: 1, name: '测试' });

      // 验证日志记录
      expect(logger.debug).toHaveBeenCalledWith(
        '响应拦截器 - 数据转换：字符串解析为 JSON',
        expect.objectContaining({
          originalType: 'string',
          parsedType: 'object',
        })
      );
    });

    it('应该保持无法解析的字符串格式', async () => {
      const mockResponse: ApiResponse = {
        success: true,
        data: '这不是 JSON 格式',
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        status: 200,
        statusText: 'OK',
        json: async () => mockResponse,
      });

      mockPerformanceNow.mockReturnValueOnce(0).mockReturnValueOnce(100);

      const result = await httpClient.get('/test');

      // 验证字符串保持原样
      expect(typeof result.data).toBe('string');
      expect(result.data).toBe('这不是 JSON 格式');

      // 验证日志记录
      expect(logger.debug).toHaveBeenCalledWith(
        '响应拦截器 - 数据转换：保持字符串格式',
        expect.objectContaining({
          dataLength: expect.any(Number),
        })
      );
    });

    it('应该处理空数据（null/undefined）', async () => {
      const mockResponse: ApiResponse = {
        success: true,
        data: null,
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        status: 200,
        statusText: 'OK',
        json: async () => mockResponse,
      });

      mockPerformanceNow.mockReturnValueOnce(0).mockReturnValueOnce(100);

      const result = await httpClient.get('/test');

      // 验证空数据处理
      expect(result.data).toBeNull();

      // 验证日志记录
      expect(logger.debug).toHaveBeenCalledWith(
        '响应拦截器 - 数据转换：空数据处理',
        expect.objectContaining({
          originalData: null,
        })
      );
    });
  });

  describe('响应时间统计', () => {
    it('应该记录正常响应时间（< 1000ms）', async () => {
      const mockResponse: ApiResponse = {
        success: true,
        data: { id: 1 },
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        status: 200,
        statusText: 'OK',
        json: async () => mockResponse,
      });

      // 模拟 500ms 响应时间
      mockPerformanceNow.mockReturnValueOnce(0).mockReturnValueOnce(500);

      await httpClient.get('/test');

      // 验证响应时间记录
      expect(logger.debug).toHaveBeenCalledWith(
        '响应时间正常',
        expect.objectContaining({
          url: expect.any(String),
          responseTime: '500ms',
        })
      );
    });

    it('应该警告较长响应时间（1000ms - 3000ms）', async () => {
      const mockResponse: ApiResponse = {
        success: true,
        data: { id: 1 },
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        status: 200,
        statusText: 'OK',
        json: async () => mockResponse,
      });

      // 模拟 2000ms 响应时间
      mockPerformanceNow.mockReturnValueOnce(0).mockReturnValueOnce(2000);

      await httpClient.get('/test');

      // 验证较长响应时间警告
      expect(logger.info).toHaveBeenCalledWith(
        '响应时间较长',
        expect.objectContaining({
          url: expect.any(String),
          responseTime: '2000ms',
        })
      );
    });

    it('应该警告过长响应时间（> 3000ms）', async () => {
      const mockResponse: ApiResponse = {
        success: true,
        data: { id: 1 },
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        status: 200,
        statusText: 'OK',
        json: async () => mockResponse,
      });

      // 模拟 5000ms 响应时间
      mockPerformanceNow.mockReturnValueOnce(0).mockReturnValueOnce(5000);

      await httpClient.get('/test');

      // 验证过长响应时间警告
      expect(logger.warn).toHaveBeenCalledWith(
        '响应时间过长',
        expect.objectContaining({
          url: expect.any(String),
          responseTime: '5000ms',
          threshold: '3000ms',
        })
      );
    });

    it('应该在请求失败时也记录响应时间', async () => {
      (global.fetch as any).mockRejectedValueOnce(new Error('网络错误'));

      // 模拟 1500ms 后失败
      mockPerformanceNow.mockReturnValueOnce(0).mockReturnValueOnce(1500);

      try {
        await httpClient.get('/test');
      } catch (error) {
        // 预期会抛出错误
      }

      // 验证错误时也记录了响应时间
      expect(logger.error).toHaveBeenCalledWith(
        'HTTP 请求异常',
        expect.objectContaining({
          responseTime: '1500ms',
        })
      );
    });
  });

  describe('自定义响应拦截器', () => {
    it('应该支持添加自定义响应拦截器', async () => {
      const customInterceptor: ResponseInterceptor = vi.fn((response) => {
        return {
          ...response,
          data: {
            ...response.data,
            customField: '自定义字段',
          },
        };
      });

      httpClient.addResponseInterceptor(customInterceptor);

      const mockResponse: ApiResponse = {
        success: true,
        data: { id: 1 },
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        status: 200,
        statusText: 'OK',
        json: async () => mockResponse,
      });

      mockPerformanceNow.mockReturnValueOnce(0).mockReturnValueOnce(100);

      const result = await httpClient.get('/test');

      // 验证自定义拦截器被调用
      expect(customInterceptor).toHaveBeenCalled();

      // 验证自定义字段被添加
      expect(result.data).toHaveProperty('customField', '自定义字段');
    });

    it('应该按顺序执行多个响应拦截器', async () => {
      const executionOrder: number[] = [];

      const interceptor1: ResponseInterceptor = (response: ApiResponse) => {
        executionOrder.push(1);
        return response;
      };

      const interceptor2: ResponseInterceptor = (response: ApiResponse) => {
        executionOrder.push(2);
        return response;
      };

      httpClient.addResponseInterceptor(interceptor1);
      httpClient.addResponseInterceptor(interceptor2);

      const mockResponse: ApiResponse = {
        success: true,
        data: { id: 1 },
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        status: 200,
        statusText: 'OK',
        json: async () => mockResponse,
      });

      mockPerformanceNow.mockReturnValueOnce(0).mockReturnValueOnce(100);

      await httpClient.get('/test');

      // 验证执行顺序（默认拦截器 + 自定义拦截器）
      expect(executionOrder).toEqual([1, 2]);
    });
  });

  describe('错误处理的健壮性', () => {
    it('响应拦截器中的错误不应该影响其他拦截器', async () => {
      const errorInterceptor: ResponseInterceptor = () => {
        throw new Error('拦截器内部错误');
      };

      const normalInterceptor: ResponseInterceptor = vi.fn((response: ApiResponse) => response);

      httpClient.addResponseInterceptor(errorInterceptor);
      httpClient.addResponseInterceptor(normalInterceptor);

      const mockResponse: ApiResponse = {
        success: true,
        data: { id: 1 },
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        status: 200,
        statusText: 'OK',
        json: async () => mockResponse,
      });

      mockPerformanceNow.mockReturnValueOnce(0).mockReturnValueOnce(100);

      // 应该抛出错误（因为拦截器失败）
      await expect(httpClient.get('/test')).rejects.toThrow();

      // 验证错误被记录
      expect(logger.error).toHaveBeenCalledWith(
        '响应拦截器执行失败',
        expect.objectContaining({
          error: '拦截器内部错误',
        })
      );
    });
  });
});
