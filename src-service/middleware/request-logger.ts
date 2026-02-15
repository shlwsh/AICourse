/**
 * 请求日志中间件
 *
 * 功能：
 * - 记录所有 HTTP 请求的详细信息
 * - 记录请求方法、路径、查询参数、请求体
 * - 记录响应状态码和响应时间
 * - 自动过滤敏感信息
 * - 支持自定义日志格式
 *
 * 使用示例：
 * ```typescript
 * import { Hono } from 'hono';
 * import { requestLogger } from './middleware/request-logger';
 *
 * const app = new Hono();
 * app.use('*', requestLogger());
 * ```
 */

import type { Context, Next } from 'hono';
import { logger } from '../utils/logger';

/**
 * 请求日志中间件配置
 */
interface RequestLoggerConfig {
  /** 是否记录请求体 */
  logRequestBody: boolean;
  /** 是否记录响应体 */
  logResponseBody: boolean;
  /** 是否记录查询参数 */
  logQueryParams: boolean;
  /** 是否记录请求头 */
  logHeaders: boolean;
  /** 需要排除的路径（不记录日志） */
  excludePaths: string[];
  /** 慢请求阈值（毫秒） */
  slowRequestThreshold: number;
}

// 默认配置
const defaultConfig: RequestLoggerConfig = {
  logRequestBody: true,
  logResponseBody: false, // 响应体可能很大，默认不记录
  logQueryParams: true,
  logHeaders: false, // 请求头可能包含敏感信息，默认不记录
  excludePaths: ['/health', '/favicon.ico'],
  slowRequestThreshold: 1000, // 1秒
};

/**
 * 创建请求日志中间件
 *
 * @param config - 中间件配置
 * @returns Hono 中间件函数
 */
export function requestLogger(config: Partial<RequestLoggerConfig> = {}) {
  const finalConfig = { ...defaultConfig, ...config };

  return async (c: Context, next: Next) => {
    const startTime = Date.now();
    const method = c.req.method;
    const path = c.req.path;

    // 检查是否需要排除此路径
    if (finalConfig.excludePaths.includes(path)) {
      await next();
      return;
    }

    // 生成请求 ID
    const requestId = generateRequestId();

    // 收集请求信息
    const requestInfo: any = {
      requestId,
      method,
      path,
    };

    // 记录查询参数
    if (finalConfig.logQueryParams) {
      const queryParams = c.req.query();
      if (Object.keys(queryParams).length > 0) {
        requestInfo.query = queryParams;
      }
    }

    // 记录请求头
    if (finalConfig.logHeaders) {
      const headers: Record<string, string> = {};
      c.req.raw.headers.forEach((value, key) => {
        headers[key] = value;
      });
      requestInfo.headers = headers;
    }

    // 记录请求体
    if (finalConfig.logRequestBody && ['POST', 'PUT', 'PATCH'].includes(method)) {
      try {
        // 克隆请求以避免消耗原始请求体
        const clonedReq = c.req.raw.clone();
        const contentType = clonedReq.headers.get('content-type') || '';

        if (contentType.includes('application/json')) {
          const body = await clonedReq.json();
          requestInfo.body = body;
        } else if (contentType.includes('application/x-www-form-urlencoded')) {
          const formData = await clonedReq.formData();
          const body: Record<string, any> = {};
          formData.forEach((value, key) => {
            body[key] = value;
          });
          requestInfo.body = body;
        }
      } catch (error) {
        // 如果解析失败，忽略错误
        requestInfo.bodyParseError = 'Failed to parse request body';
      }
    }

    // 记录请求开始
    logger.info('收到 HTTP 请求', requestInfo);

    // 执行下一个中间件
    try {
      await next();
    } catch (error) {
      // 记录错误
      const duration = Date.now() - startTime;
      logger.error('请求处理失败', {
        requestId,
        method,
        path,
        duration: `${duration}ms`,
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      });
      throw error;
    }

    // 计算响应时间
    const duration = Date.now() - startTime;
    const status = c.res.status;

    // 收集响应信息
    const responseInfo: any = {
      requestId,
      method,
      path,
      status,
      duration: `${duration}ms`,
    };

    // 记录响应体（如果配置启用）
    if (finalConfig.logResponseBody) {
      try {
        const clonedRes = c.res.clone();
        const contentType = clonedRes.headers.get('content-type') || '';

        if (contentType.includes('application/json')) {
          const body = await clonedRes.json();
          responseInfo.responseBody = body;
        }
      } catch (error) {
        responseInfo.responseBodyParseError = 'Failed to parse response body';
      }
    }

    // 根据状态码和响应时间选择日志级别
    if (status >= 500) {
      logger.error('HTTP 请求完成（服务器错误）', responseInfo);
    } else if (status >= 400) {
      logger.warn('HTTP 请求完成（客户端错误）', responseInfo);
    } else if (duration > finalConfig.slowRequestThreshold) {
      logger.warn('HTTP 请求完成（慢请求）', responseInfo);
    } else {
      logger.info('HTTP 请求完成', responseInfo);
    }
  };
}

/**
 * 生成唯一的请求 ID
 *
 * @returns 请求 ID
 */
function generateRequestId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * 简化版请求日志中间件（仅记录基本信息）
 *
 * @returns Hono 中间件函数
 */
export function simpleRequestLogger() {
  return requestLogger({
    logRequestBody: false,
    logResponseBody: false,
    logQueryParams: true,
    logHeaders: false,
  });
}

/**
 * 详细版请求日志中间件（记录所有信息）
 *
 * @returns Hono 中间件函数
 */
export function verboseRequestLogger() {
  return requestLogger({
    logRequestBody: true,
    logResponseBody: true,
    logQueryParams: true,
    logHeaders: true,
  });
}
