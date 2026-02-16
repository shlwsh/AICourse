/**
 * HTTP 客户端单元测试
 * 测试 HTTP 客户端的各项功能，包括请求、拦截器、错误处理等
 */
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import HttpClient, { type ApiResponse, type RequestInterceptor, type ResponseInterceptor, type ErrorInterceptor } from '@/api/http';

// Mock fetch API
global.fetch = vi.fn();

describe('HttpClient', () => {
  let httpClient: HttpClient;

  beforeEach(() => {
    httpClient = new HttpClient('/api', 5000);
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('基础请求功能', () => {
    it('应该成功发送 GET 请求', async () => {
      const mockResponse: ApiResponse<{ id: number }> = {
        success: true,
        data: { id: 1 },
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        status: 200,
        statusText: 'OK',
        json: async () => mockResponse,
      });

      const result = await httpClient.get<{ id: number }>('/test');

      expect(global.fetch).toHaveBeenCalledWith(
        '/api/test',
        expect.objectContaining({
          method: 'GET',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
          }),
        })
      );
      expect(result).toEqual(mockResponse);
    });

    it('应该成功发送 POST 请求', async () => {
      const requestBody = { name: 'test' };
      const mockResponse: ApiResponse<{ id: number }> = {
        success: true,
        data: { id: 1 },
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        status: 200,
        statusText: 'OK',
        json: async () => mockResponse,
      });

      const result = await httpClient.post<{ id: number }>('/test', requestBody);

      expect(global.fetch).toHaveBeenCalledWith(
        '/api/test',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify(requestBody),
        })
      );
      expect(result).toEqual(mockResponse);
    });

    it('应该成功发送 PUT 请求', async () => {
      const requestBody = { name: 'updated' };
      const mockResponse: ApiResponse<{ id: number }> = {
        success: true,
        data: { id: 1 },
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        status: 200,
        statusText: 'OK',
        json: async () => mockResponse,
      });

      const result = await httpClient.put<{ id: number }>('/test/1', requestBody);

      expect(global.fetch).toHaveBeenCalledWith(
        '/api/test/1',
        expect.objectContaining({
          method: 'PUT',
          body: JSON.stringify(requestBody),
        })
      );
      expect(result).toEqual(mockResponse);
    });

    it('应该成功发送 PATCH 请求', async () => {
      const requestBody = { name: 'patched' };
      const mockResponse: ApiResponse<{ id: number }> = {
        success: true,
        data: { id: 1 },
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        status: 200,
        statusText: 'OK',
        json: async () => mockResponse,
      });

      const result = await httpClient.patch<{ id: number }>('/test/1', requestBody);

      expect(global.fetch).toHaveBeenCalledWith(
        '/api/test/1',
        expect.objectContaining({
          method: 'PATCH',
          body: JSON.stringify(requestBody),
        })
      );
      expect(result).toEqual(mockResponse);
    });

    it('应该成功发送 DELETE 请求', async () => {
      const mockResponse: ApiResponse<void> = {
        success: true,
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        status: 200,
        statusText: 'OK',
        json: async () => mockResponse,
      });

      const result = await httpClient.delete<void>('/test/1');

      expect(global.fetch).toHaveBeenCalledWith(
        '/api/test/1',
        expect.objectContaining({
          method: 'DELETE',
        })
      );
      expect(result).toEqual(mockResponse);
    });
  });

  describe('URL 查询参数', () => {
    it('应该正确构建带查询参数的 URL', async () => {
      const mockResponse: ApiResponse<any> = {
        success: true,
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockResponse,
      });

      await httpClient.get('/test', {
        params: {
          page: 1,
          size: 10,
          keyword: 'test',
        },
      });

      expect(global.fetch).toHaveBeenCalledWith(
        '/api/test?page=1&size=10&keyword=test',
        expect.any(Object)
      );
    });

    it('应该过滤掉 undefined 和 null 参数', async () => {
      const mockResponse: ApiResponse<any> = {
        success: true,
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockResponse,
      });

      await httpClient.get('/test', {
        params: {
          page: 1,
          keyword: undefined,
          filter: null,
        },
      });

      expect(global.fetch).toHaveBeenCalledWith(
        '/api/test?page=1',
        expect.any(Object)
      );
    });

    it('应该正确编码特殊字符', async () => {
      const mockResponse: ApiResponse<any> = {
        success: true,
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockResponse,
      });

      await httpClient.get('/test', {
        params: {
          keyword: '测试 & 特殊字符',
        },
      });

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining(encodeURIComponent('测试 & 特殊字符')),
        expect.any(Object)
      );
    });
  });

  describe('请求拦截器', () => {
    it('应该执行请求拦截器', async () => {
      const mockResponse: ApiResponse<any> = {
        success: true,
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockResponse,
      });

      const interceptor: RequestInterceptor = (config) => {
        config.headers = {
          ...config.headers,
          'X-Custom-Header': 'test-value',
        };
        return config;
      };

      httpClient.addRequestInterceptor(interceptor);
      await httpClient.get('/test');

      expect(global.fetch).toHaveBeenCalledWith(
        '/api/test',
        expect.objectContaining({
          headers: expect.objectContaining({
            'X-Custom-Header': 'test-value',
          }),
        })
      );
    });

    it('应该按顺序执行多个请求拦截器', async () => {
      const mockResponse: ApiResponse<any> = {
        success: true,
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockResponse,
      });

      const order: number[] = [];

      const interceptor1: RequestInterceptor = (config) => {
        order.push(1);
        return config;
      };

      const interceptor2: RequestInterceptor = (config) => {
        order.push(2);
        return config;
      };

      httpClient.addRequestInterceptor(interceptor1);
      httpClient.addRequestInterceptor(interceptor2);
      await httpClient.get('/test');

      expect(order).toEqual([1, 2]);
    });

    it('应该支持异步请求拦截器', async () => {
      const mockResponse: ApiResponse<any> = {
        success: true,
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockResponse,
      });

      const interceptor: RequestInterceptor = async (config) => {
        await new Promise(resolve => setTimeout(resolve, 10));
        config.headers = {
          ...config.headers,
          'X-Async-Header': 'async-value',
        };
        return config;
      };

      httpClient.addRequestInterceptor(interceptor);
      await httpClient.get('/test');

      expect(global.fetch).toHaveBeenCalledWith(
        '/api/test',
        expect.objectContaining({
          headers: expect.objectContaining({
            'X-Async-Header': 'async-value',
          }),
        })
      );
    });
  });

  describe('响应拦截器', () => {
    it('应该执行响应拦截器', async () => {
      const mockResponse: ApiResponse<{ value: number }> = {
        success: true,
        data: { value: 100 },
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockResponse,
      });

      const interceptor: ResponseInterceptor = (response) => {
        if (response.data) {
          response.data.value = response.data.value * 2;
        }
        return response;
      };

      httpClient.addResponseInterceptor(interceptor);
      const result = await httpClient.get<{ value: number }>('/test');

      expect(result.data?.value).toBe(200);
    });

    it('应该按顺序执行多个响应拦截器', async () => {
      const mockResponse: ApiResponse<{ value: number }> = {
        success: true,
        data: { value: 10 },
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockResponse,
      });

      const interceptor1: ResponseInterceptor = (response) => {
        if (response.data) {
          response.data.value = response.data.value + 5;
        }
        return response;
      };

      const interceptor2: ResponseInterceptor = (response) => {
        if (response.data) {
          response.data.value = response.data.value * 2;
        }
        return response;
      };

      httpClient.addResponseInterceptor(interceptor1);
      httpClient.addResponseInterceptor(interceptor2);
      const result = await httpClient.get<{ value: number }>('/test');

      expect(result.data?.value).toBe(30); // (10 + 5) * 2
    });
  });

  describe('错误拦截器', () => {
    it('应该执行错误拦截器', async () => {
      const mockError = {
        success: false,
        error: 'Server Error',
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        json: async () => mockError,
      });

      const interceptor: ErrorInterceptor = (error) => {
        return new Error(`拦截器处理: ${error.message}`);
      };

      httpClient.addErrorInterceptor(interceptor);

      await expect(httpClient.get('/test')).rejects.toThrow('拦截器处理:');
    });

    it('应该按顺序执行多个错误拦截器', async () => {
      const mockError = {
        success: false,
        error: 'Error',
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: async () => mockError,
      });

      let executionCount = 0;

      const interceptor1: ErrorInterceptor = (error) => {
        executionCount++;
        return error;
      };

      const interceptor2: ErrorInterceptor = (error) => {
        executionCount++;
        return error;
      };

      httpClient.addErrorInterceptor(interceptor1);
      httpClient.addErrorInterceptor(interceptor2);

      await expect(httpClient.get('/test')).rejects.toThrow();
      // 错误拦截器应该被执行（至少一次）
      expect(executionCount).toBeGreaterThanOrEqual(2);
    });
  });

  describe('错误处理', () => {
    it('应该处理 HTTP 错误响应', async () => {
      const mockError = {
        success: false,
        message: '资源不存在',
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: 'Not Found',
        json: async () => mockError,
      });

      await expect(httpClient.get('/test')).rejects.toThrow('资源不存在');
    });

    it('应该处理请求超时', async () => {
      (global.fetch as any).mockImplementationOnce(() => {
        return new Promise((_, reject) => {
          setTimeout(() => {
            const error = new Error('The operation was aborted');
            error.name = 'AbortError';
            reject(error);
          }, 100);
        });
      });

      await expect(httpClient.get('/test', { timeout: 50 })).rejects.toThrow('请求超时');
    });

    it('应该处理网络错误', async () => {
      (global.fetch as any).mockRejectedValueOnce(new Error('Failed to fetch'));

      await expect(httpClient.get('/test')).rejects.toThrow('网络连接失败');
    });

    it('应该处理响应解析错误', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => {
          throw new Error('Invalid JSON');
        },
      });

      await expect(httpClient.get('/test')).rejects.toThrow('响应数据格式错误');
    });
  });

  describe('自定义配置', () => {
    it('应该使用自定义 baseURL', async () => {
      const customClient = new HttpClient('/custom-api');
      const mockResponse: ApiResponse<any> = {
        success: true,
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockResponse,
      });

      await customClient.get('/test');

      expect(global.fetch).toHaveBeenCalledWith(
        '/custom-api/test',
        expect.any(Object)
      );
    });

    it('应该使用自定义超时时间', async () => {
      const customClient = new HttpClient('/api', 1000);

      (global.fetch as any).mockImplementationOnce(() => {
        return new Promise((_, reject) => {
          setTimeout(() => {
            const error = new Error('The operation was aborted');
            error.name = 'AbortError';
            reject(error);
          }, 1500);
        });
      });

      await expect(customClient.get('/test')).rejects.toThrow('请求超时');
    });

    it('应该使用自定义请求头', async () => {
      const mockResponse: ApiResponse<any> = {
        success: true,
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockResponse,
      });

      await httpClient.get('/test', {
        headers: {
          'Authorization': 'Bearer token123',
          'X-Custom': 'value',
        },
      });

      expect(global.fetch).toHaveBeenCalledWith(
        '/api/test',
        expect.objectContaining({
          headers: expect.objectContaining({
            'Authorization': 'Bearer token123',
            'X-Custom': 'value',
          }),
        })
      );
    });
  });

  describe('边界情况', () => {
    it('应该处理空响应体', async () => {
      const mockResponse: ApiResponse<null> = {
        success: true,
        data: null,
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockResponse,
      });

      const result = await httpClient.get<null>('/test');

      expect(result.success).toBe(true);
      expect(result.data).toBeNull();
    });

    it('应该处理空查询参数对象', async () => {
      const mockResponse: ApiResponse<any> = {
        success: true,
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockResponse,
      });

      await httpClient.get('/test', { params: {} });

      expect(global.fetch).toHaveBeenCalledWith(
        '/api/test',
        expect.any(Object)
      );
    });

    it('应该处理没有 body 的 POST 请求', async () => {
      const mockResponse: ApiResponse<any> = {
        success: true,
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockResponse,
      });

      await httpClient.post('/test');

      expect(global.fetch).toHaveBeenCalledWith(
        '/api/test',
        expect.objectContaining({
          method: 'POST',
          body: undefined,
        })
      );
    });
  });
});
