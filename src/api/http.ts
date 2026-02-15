/**
 * HTTP 客户端封装
 * 提供统一的 API 请求接口
 */
import { logger } from '@/utils/logger';

// API 响应接口
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

// 请求配置接口
export interface RequestConfig {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  headers?: Record<string, string>;
  body?: any;
  timeout?: number;
}

/**
 * HTTP 客户端类
 */
class HttpClient {
  private baseURL: string;
  private defaultTimeout: number;

  constructor(baseURL: string = '/api', timeout: number = 30000) {
    this.baseURL = baseURL;
    this.defaultTimeout = timeout;
  }

  /**
   * 发送 HTTP 请求
   */
  private async request<T>(url: string, config: RequestConfig = {}): Promise<ApiResponse<T>> {
    const { method = 'GET', headers = {}, body, timeout = this.defaultTimeout } = config;

    const fullUrl = `${this.baseURL}${url}`;

    logger.info('发送 HTTP 请求', {
      method,
      url: fullUrl,
    });

    try {
      // 创建 AbortController 用于超时控制
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);

      // 发送请求
      const response = await fetch(fullUrl, {
        method,
        headers: {
          'Content-Type': 'application/json',
          ...headers,
        },
        body: body ? JSON.stringify(body) : undefined,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      // 解析响应
      const data = await response.json();

      if (!response.ok) {
        logger.error('HTTP 请求失败', {
          status: response.status,
          statusText: response.statusText,
          data,
        });
        throw new Error(data.message || '请求失败');
      }

      logger.info('HTTP 请求成功', {
        url: fullUrl,
        status: response.status,
      });

      return data;
    } catch (error: any) {
      logger.error('HTTP 请求异常', {
        url: fullUrl,
        error: error.message,
      });

      if (error.name === 'AbortError') {
        throw new Error('请求超时');
      }

      throw error;
    }
  }

  /**
   * GET 请求
   */
  async get<T>(url: string, config?: RequestConfig): Promise<ApiResponse<T>> {
    return this.request<T>(url, { ...config, method: 'GET' });
  }

  /**
   * POST 请求
   */
  async post<T>(url: string, body?: any, config?: RequestConfig): Promise<ApiResponse<T>> {
    return this.request<T>(url, { ...config, method: 'POST', body });
  }

  /**
   * PUT 请求
   */
  async put<T>(url: string, body?: any, config?: RequestConfig): Promise<ApiResponse<T>> {
    return this.request<T>(url, { ...config, method: 'PUT', body });
  }

  /**
   * DELETE 请求
   */
  async delete<T>(url: string, config?: RequestConfig): Promise<ApiResponse<T>> {
    return this.request<T>(url, { ...config, method: 'DELETE' });
  }
}

// 导出默认 HTTP 客户端实例
export const http = new HttpClient();

// 导出 HttpClient 类
export default HttpClient;
