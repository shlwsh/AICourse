/**
 * HTTP 客户端封装
 * 提供统一的 API 请求接口
 * 使用原生 fetch API 实现，支持请求/响应拦截器、超时控制、错误处理等功能
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
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  headers?: Record<string, string>;
  body?: any;
  timeout?: number;
  params?: Record<string, any>; // URL 查询参数
}

// 拦截器类型定义
export type RequestInterceptor = (config: RequestConfig & { url: string }) => RequestConfig & { url: string } | Promise<RequestConfig & { url: string }>;
export type ResponseInterceptor = <T>(response: ApiResponse<T>) => ApiResponse<T> | Promise<ApiResponse<T>>;
export type ErrorInterceptor = (error: Error) => Error | Promise<Error>;

/**
 * HTTP 客户端类
 * 提供完整的 HTTP 请求功能，包括拦截器、超时控制、错误处理等
 */
class HttpClient {
  private baseURL: string;
  private defaultTimeout: number;
  private requestInterceptors: RequestInterceptor[] = [];
  private responseInterceptors: ResponseInterceptor[] = [];
  private errorInterceptors: ErrorInterceptor[] = [];

  constructor(baseURL: string = '/api', timeout: number = 30000) {
    this.baseURL = baseURL;
    this.defaultTimeout = timeout;

    logger.info('HTTP 客户端初始化', {
      baseURL,
      timeout,
    });

    // 配置默认请求拦截器
    this.setupDefaultRequestInterceptors();

    // 配置默认响应拦截器
    this.setupDefaultResponseInterceptors();
  }

  /**
   * 配置默认请求拦截器
   * 包括：请求日志记录、认证 token 添加、请求时间戳添加
   */
  private setupDefaultRequestInterceptors(): void {
    // 拦截器 1：添加请求日志记录
    this.addRequestInterceptor((config) => {
      try {
        logger.info('[FRONTEND] 发送请求', {
          method: config.method,
          url: config.url,
          params: config.params,
          hasBody: !!config.body,
        });

        // 记录请求体详情（DEBUG 级别）
        if (config.body) {
          logger.debug('[FRONTEND] 请求体详情', {
            url: config.url,
            body: config.body,
          });
        }
      } catch (error: any) {
        // 日志记录失败不应该影响请求
        console.warn('请求日志记录失败:', error.message);
      }

      return config;
    });

    // 拦截器 2：添加认证 token（如果存在）
    this.addRequestInterceptor((config) => {
      try {
        // 从 localStorage 获取认证 token
        const token = localStorage.getItem('auth_token');

        if (token) {
          config.headers = {
            ...config.headers,
            'Authorization': `Bearer ${token}`,
          };

          logger.debug('请求拦截器 - 添加认证 token', {
            url: config.url,
            hasToken: true,
          });
        } else {
          logger.debug('请求拦截器 - 未找到认证 token', {
            url: config.url,
          });
        }
      } catch (error: any) {
        // localStorage 不可用或其他错误，记录警告但继续执行
        logger.warn('获取认证 token 失败', {
          url: config.url,
          error: error.message,
        });
      }

      return config;
    });

    // 拦截器 3：添加请求时间戳
    this.addRequestInterceptor((config) => {
      try {
        const timestamp = new Date().toISOString();

        config.headers = {
          ...config.headers,
          'X-Request-Time': timestamp,
        };

        logger.debug('请求拦截器 - 添加请求时间戳', {
          url: config.url,
          timestamp,
        });
      } catch (error: any) {
        // 时间戳添加失败不应该影响请求
        logger.warn('添加请求时间戳失败', {
          url: config.url,
          error: error.message,
        });
      }

      return config;
    });

    logger.info('默认请求拦截器配置完成', {
      interceptorCount: this.requestInterceptors.length,
    });
  }

  /**
   * 配置默认响应拦截器
   * 包括：响应日志记录、统一错误处理、数据转换、响应时间统计
   */
  private setupDefaultResponseInterceptors(): void {
    // 拦截器 1：响应日志记录和响应时间统计
    this.addResponseInterceptor((response) => {
      try {
        // 记录响应信息
        logger.info('[FRONTEND] 收到响应', {
          success: response.success,
          dataCount: Array.isArray(response.data) ? response.data.length : (response.data ? 1 : 0),
          message: response.message,
        });

        // 记录响应数据详情（DEBUG 级别）
        if (response.data) {
          logger.debug('[FRONTEND] 响应数据详情', {
            data: response.data,
          });
        }

        // 记录错误信息
        if (response.error) {
          logger.error('[FRONTEND] 响应错误', {
            error: response.error,
            message: response.message,
          });
        }
      } catch (error: any) {
        // 日志记录失败不应该影响响应处理
        console.warn('响应日志记录失败:', error.message);
      }

      return response;
    });

    // 拦截器 2：统一错误处理
    this.addResponseInterceptor((response) => {
      try {
        // 检查响应成功标志
        if (response.success === false) {
          const errorMessage = response.error || response.message || '请求失败';

          logger.error('响应拦截器 - 业务逻辑错误', {
            error: errorMessage,
            hasData: !!response.data,
          });

          // 根据错误类型进行分类处理
          if (errorMessage.includes('未授权') || errorMessage.includes('unauthorized')) {
            logger.warn('响应拦截器 - 检测到未授权错误', {
              error: errorMessage,
            });
            // 可以在这里触发登录跳转或刷新 token
          } else if (errorMessage.includes('权限') || errorMessage.includes('forbidden')) {
            logger.warn('响应拦截器 - 检测到权限错误', {
              error: errorMessage,
            });
          } else if (errorMessage.includes('不存在') || errorMessage.includes('not found')) {
            logger.warn('响应拦截器 - 检测到资源不存在错误', {
              error: errorMessage,
            });
          } else {
            logger.error('响应拦截器 - 其他业务错误', {
              error: errorMessage,
            });
          }
        } else {
          logger.debug('响应拦截器 - 响应成功', {
            success: response.success,
          });
        }
      } catch (error: any) {
        // 错误处理失败不应该影响响应
        logger.warn('响应错误处理失败', {
          error: error.message,
        });
      }

      return response;
    });

    // 拦截器 3：数据转换（标准化响应格式）
    this.addResponseInterceptor((response) => {
      try {
        // 确保响应对象包含必要的字段
        const normalizedResponse = {
          success: response.success ?? true,
          data: response.data,
          message: response.message,
          error: response.error,
        };

        // 如果响应数据是字符串，尝试解析为 JSON
        if (typeof normalizedResponse.data === 'string') {
          try {
            normalizedResponse.data = JSON.parse(normalizedResponse.data);
            logger.debug('响应拦截器 - 数据转换：字符串解析为 JSON', {
              originalType: 'string',
              parsedType: typeof normalizedResponse.data,
            });
          } catch {
            // 解析失败，保持原始字符串
            const dataStr = normalizedResponse.data as string;
            logger.debug('响应拦截器 - 数据转换：保持字符串格式', {
              dataLength: dataStr.length,
            });
          }
        }

        // 处理空数据的情况
        if (normalizedResponse.data === null || normalizedResponse.data === undefined) {
          logger.debug('响应拦截器 - 数据转换：空数据处理', {
            originalData: normalizedResponse.data,
          });
        }

        logger.debug('响应拦截器 - 数据转换完成', {
          success: normalizedResponse.success,
          hasData: !!normalizedResponse.data,
        });

        return normalizedResponse;
      } catch (error: any) {
        // 数据转换失败，返回原始响应
        logger.warn('响应数据转换失败，返回原始响应', {
          error: error.message,
        });
        return response;
      }
    });

    logger.info('默认响应拦截器配置完成', {
      interceptorCount: this.responseInterceptors.length,
    });
  }

  /**
   * 添加请求拦截器
   * @param interceptor 请求拦截器函数
   */
  addRequestInterceptor(interceptor: RequestInterceptor): void {
    this.requestInterceptors.push(interceptor);
    logger.debug('添加请求拦截器', {
      count: this.requestInterceptors.length,
    });
  }

  /**
   * 添加响应拦截器
   * @param interceptor 响应拦截器函数
   */
  addResponseInterceptor(interceptor: ResponseInterceptor): void {
    this.responseInterceptors.push(interceptor);
    logger.debug('添加响应拦截器', {
      count: this.responseInterceptors.length,
    });
  }

  /**
   * 添加错误拦截器
   * @param interceptor 错误拦截器函数
   */
  addErrorInterceptor(interceptor: ErrorInterceptor): void {
    this.errorInterceptors.push(interceptor);
    logger.debug('添加错误拦截器', {
      count: this.errorInterceptors.length,
    });
  }

  /**
   * 构建完整的 URL（包含查询参数）
   */
  private buildUrl(url: string, params?: Record<string, any>): string {
    const fullUrl = `${this.baseURL}${url}`;

    if (!params || Object.keys(params).length === 0) {
      return fullUrl;
    }

    const queryString = Object.entries(params)
      .filter(([_, value]) => value !== undefined && value !== null)
      .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`)
      .join('&');

    return queryString ? `${fullUrl}?${queryString}` : fullUrl;
  }

  /**
   * 执行请求拦截器
   */
  private async executeRequestInterceptors(config: RequestConfig & { url: string }): Promise<RequestConfig & { url: string }> {
    let modifiedConfig = config;

    for (const interceptor of this.requestInterceptors) {
      try {
        modifiedConfig = await interceptor(modifiedConfig);
        logger.debug('请求拦截器执行成功', {
          url: modifiedConfig.url,
        });
      } catch (error: any) {
        logger.error('请求拦截器执行失败', {
          error: error.message,
        });
        throw error;
      }
    }

    return modifiedConfig;
  }

  /**
   * 执行响应拦截器
   */
  private async executeResponseInterceptors<T>(response: ApiResponse<T>): Promise<ApiResponse<T>> {
    let modifiedResponse = response;

    for (const interceptor of this.responseInterceptors) {
      try {
        modifiedResponse = await interceptor(modifiedResponse);
        logger.debug('响应拦截器执行成功');
      } catch (error: any) {
        logger.error('响应拦截器执行失败', {
          error: error.message,
        });
        throw error;
      }
    }

    return modifiedResponse;
  }

  /**
   * 执行错误拦截器
   */
  private async executeErrorInterceptors(error: Error): Promise<Error> {
    let modifiedError = error;

    for (const interceptor of this.errorInterceptors) {
      try {
        modifiedError = await interceptor(modifiedError);
        logger.debug('错误拦截器执行成功');
      } catch (err: any) {
        logger.error('错误拦截器执行失败', {
          error: err.message,
        });
        // 如果错误拦截器本身出错，返回原始错误
        return modifiedError;
      }
    }

    return modifiedError;
  }

  /**
   * 发送 HTTP 请求
   * @param url 请求路径
   * @param config 请求配置
   * @returns API 响应
   */
  private async request<T>(url: string, config: RequestConfig = {}): Promise<ApiResponse<T>> {
    const { method = 'GET', headers = {}, body, timeout = this.defaultTimeout, params } = config;

    // 构建完整 URL
    const fullUrl = this.buildUrl(url, params);

    // 创建请求配置对象（保留 params 供拦截器使用）
    let requestConfig: RequestConfig & { url: string } = {
      url: fullUrl,
      method,
      headers,
      body,
      timeout,
      params, // 保留原始 params
    };

    // 记录请求开始时间（用于响应时间统计）
    const startTime = performance.now();

    logger.info('发送 HTTP 请求', {
      method,
      url: fullUrl,
      hasBody: !!body,
      hasParams: !!params,
      startTime,
    });

    try {
      // 执行请求拦截器
      requestConfig = await this.executeRequestInterceptors(requestConfig);

      // 创建 AbortController 用于超时控制
      const controller = new AbortController();
      const timeoutId = setTimeout(() => {
        controller.abort();
        logger.warn('请求超时', {
          url: requestConfig.url,
          timeout,
        });
      }, timeout);

      // 发送请求
      const response = await fetch(requestConfig.url, {
        method: requestConfig.method,
        headers: {
          'Content-Type': 'application/json',
          ...requestConfig.headers,
        },
        body: requestConfig.body ? JSON.stringify(requestConfig.body) : undefined,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      // 计算响应时间
      const endTime = performance.now();
      const responseTime = Math.round(endTime - startTime);

      logger.debug('收到 HTTP 响应', {
        url: requestConfig.url,
        status: response.status,
        statusText: response.statusText,
        responseTime: `${responseTime}ms`,
      });

      // 解析响应
      let data: ApiResponse<T>;
      try {
        data = await response.json();
      } catch (parseError: any) {
        logger.error('响应解析失败', {
          url: requestConfig.url,
          error: parseError.message,
          responseTime: `${responseTime}ms`,
        });
        throw new Error('响应数据格式错误');
      }

      // 检查 HTTP 状态码
      if (!response.ok) {
        logger.error('HTTP 请求失败', {
          url: requestConfig.url,
          status: response.status,
          statusText: response.statusText,
          responseTime: `${responseTime}ms`,
          data,
        });
        const error = new Error(data.message || data.error || `请求失败: ${response.statusText}`);
        throw await this.executeErrorInterceptors(error);
      }

      logger.info('HTTP 请求成功', {
        url: requestConfig.url,
        status: response.status,
        success: data.success,
        responseTime: `${responseTime}ms`,
      });

      // 记录响应时间统计（INFO 级别，便于性能监控）
      if (responseTime > 3000) {
        logger.warn('响应时间过长', {
          url: requestConfig.url,
          responseTime: `${responseTime}ms`,
          threshold: '3000ms',
        });
      } else if (responseTime > 1000) {
        logger.info('响应时间较长', {
          url: requestConfig.url,
          responseTime: `${responseTime}ms`,
        });
      } else {
        logger.debug('响应时间正常', {
          url: requestConfig.url,
          responseTime: `${responseTime}ms`,
        });
      }

      // 执行响应拦截器
      return await this.executeResponseInterceptors(data);
    } catch (error: any) {
      // 计算错误发生时的响应时间
      const endTime = performance.now();
      const responseTime = Math.round(endTime - startTime);

      logger.error('HTTP 请求异常', {
        url: requestConfig.url,
        error: error.message,
        name: error.name,
        responseTime: `${responseTime}ms`,
      });

      // 处理超时错误
      if (error.name === 'AbortError') {
        const timeoutError = new Error(`请求超时（${timeout}ms）`);
        throw await this.executeErrorInterceptors(timeoutError);
      }

      // 处理网络错误
      if (error.message === 'Failed to fetch' || error.message.includes('NetworkError')) {
        const networkError = new Error('网络连接失败，请检查网络设置');
        throw await this.executeErrorInterceptors(networkError);
      }

      // 其他错误
      throw await this.executeErrorInterceptors(error);
    }
  }

  /**
   * GET 请求
   * @param url 请求路径
   * @param config 请求配置
   * @returns API 响应
   */
  async get<T>(url: string, config?: RequestConfig): Promise<ApiResponse<T>> {
    return this.request<T>(url, { ...config, method: 'GET' });
  }

  /**
   * POST 请求
   * @param url 请求路径
   * @param body 请求体
   * @param config 请求配置
   * @returns API 响应
   */
  async post<T>(url: string, body?: any, config?: RequestConfig): Promise<ApiResponse<T>> {
    return this.request<T>(url, { ...config, method: 'POST', body });
  }

  /**
   * PUT 请求
   * @param url 请求路径
   * @param body 请求体
   * @param config 请求配置
   * @returns API 响应
   */
  async put<T>(url: string, body?: any, config?: RequestConfig): Promise<ApiResponse<T>> {
    return this.request<T>(url, { ...config, method: 'PUT', body });
  }

  /**
   * PATCH 请求
   * @param url 请求路径
   * @param body 请求体
   * @param config 请求配置
   * @returns API 响应
   */
  async patch<T>(url: string, body?: any, config?: RequestConfig): Promise<ApiResponse<T>> {
    return this.request<T>(url, { ...config, method: 'PATCH', body });
  }

  /**
   * DELETE 请求
   * @param url 请求路径
   * @param config 请求配置
   * @returns API 响应
   */
  async delete<T>(url: string, config?: RequestConfig): Promise<ApiResponse<T>> {
    return this.request<T>(url, { ...config, method: 'DELETE' });
  }
}

// 导出默认 HTTP 客户端实例
export const http = new HttpClient();

// 导出 HttpClient 类
export default HttpClient;
