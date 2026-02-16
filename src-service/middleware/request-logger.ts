/**
 * 请求日志中间件
 *
 * 功能：
 * - 记录所有 HTTP 请求的详细信息
 * - 记录请求参数、响应结果、执行时间
 * - 记录关键业务逻辑的执行过程
 * - 记录错误和异常信息
 * - 支持性能监控和分析
 *
 * 使用示例：
 * ```typescript
 * import { Hono } from 'hono';
 * import { requestLogger } from './middleware/request-logger';
 *
 * const app = new Hono();
 * app.use('*', requestLogger);
 * ```
 */

import type { Context, Next } from 'hono';
import { logger } from '../utils/logger';

/**
 * 请求信息接口
 */
interface RequestInfo {
  /** 请求方法 */
  method: string;
  /** 请求路径 */
  path: string;
  /** 查询参数 */
  query?: Record<string, string>;
  /** 请求头 */
  headers?: Record<string, string>;
  /** 请求体 */
  body?: any;
  /** 客户端 IP */
  ip?: string;
  /** User-Agent */
  userAgent?: string;
}

/**
 * 响应信息接口
 */
interface ResponseInfo {
  /** HTTP 状态码 */
  status: number;
  /** 响应时间（毫秒） */
  duration: number;
  /** 响应体大小（字节） */
  size?: number;
}

/**
 * 获取请求体
 *
 * @param context - Hono 上下文
 * @returns 请求体数据
 */
async function getRequestBody(context: Context): Promise<any> {
  try {
    // 只记录 JSON 请求体
    const contentType = context.req.header('content-type');
    if (contentType && contentType.includes('application/json')) {
      // 克隆请求以避免消耗原始请求体
      const clonedReq = context.req.raw.clone();
      return await clonedReq.json();
    }
  } catch (error) {
    // 忽略解析错误
  }
  return undefined;
}

/**
 * 获取客户端 IP 地址
 *
 * @param context - Hono 上下文
 * @returns IP 地址
 */
function getClientIP(context: Context): string | undefined {
  // 尝试从各种头部获取真实 IP
  const headers = [
    'x-forwarded-for',
    'x-real-ip',
    'cf-connecting-ip',
    'fastly-client-ip',
    'x-cluster-client-ip',
    'x-forwarded',
    'forwarded-for',
    'forwarded',
  ];

  for (const header of headers) {
    const value = context.req.header(header);
    if (value) {
      // x-forwarded-for 可能包含多个 IP，取第一个
      return value.split(',')[0].trim();
    }
  }

  return undefined;
}

/**
 * 构建请求信息对象
 *
 * @param context - Hono 上下文
 * @param body - 请求体
 * @returns 请求信息对象
 */
function buildRequestInfo(context: Context, body?: any): RequestInfo {
  const info: RequestInfo = {
    method: context.req.method,
    path: context.req.path,
  };

  // 添加查询参数
  try {
    const query = context.req.query();
    if (Object.keys(query).length > 0) {
      info.query = query;
    }
  } catch (error) {
    // 忽略查询参数解析错误
  }

  // 添加请求体
  if (body) {
    info.body = body;
  }

  // 添加客户端信息
  info.ip = getClientIP(context);
  info.userAgent = context.req.header('user-agent');

  return info;
}

/**
 * 构建响应信息对象
 *
 * @param context - Hono 上下文
 * @param startTime - 请求开始时间
 * @returns 响应信息对象
 */
function buildResponseInfo(context: Context, startTime: number): ResponseInfo {
  const duration = Date.now() - startTime;
  const status = context.res.status;

  const info: ResponseInfo = {
    status,
    duration,
  };

  // 尝试获取响应体大小
  try {
    const contentLength = context.res.headers.get('content-length');
    if (contentLength) {
      info.size = parseInt(contentLength, 10);
    }
  } catch (error) {
    // 忽略错误
  }

  return info;
}

/**
 * 判断是否应该记录请求体
 *
 * @param context - Hono 上下文
 * @returns 是否应该记录
 */
function shouldLogRequestBody(context: Context): boolean {
  const method = context.req.method;
  // 只记录 POST、PUT、PATCH 请求的请求体
  return ['POST', 'PUT', 'PATCH'].includes(method);
}

/**
 * 请求日志中间件
 *
 * 记录所有 HTTP 请求的详细信息，包括：
 * - 请求开始时的基本信息
 * - 请求完成时的响应信息和执行时间
 * - 错误情况下的异常信息
 *
 * @param context - Hono 上下文
 * @param next - 下一个中间件
 */
export async function requestLogger(context: Context, next: Next): Promise<void> {
  const startTime = Date.now();
  const method = context.req.method;
  const path = context.req.path;

  // 获取请求体（如果需要）
  let requestBody: any;
  if (shouldLogRequestBody(context)) {
    requestBody = await getRequestBody(context);
  }

  // 构建请求信息
  const requestInfo = buildRequestInfo(context, requestBody);

  // 记录请求开始
  logger.info('HTTP 请求开始', requestInfo);

  try {
    // 执行下一个中间件/路由处理器
    await next();

    // 构建响应信息
    const responseInfo = buildResponseInfo(context, startTime);

    // 根据状态码选择日志级别
    if (responseInfo.status >= 500) {
      // 服务器错误
      logger.error('HTTP 请求完成（服务器错误）', {
        request: requestInfo,
        response: responseInfo,
      });
    } else if (responseInfo.status >= 400) {
      // 客户端错误
      logger.warn('HTTP 请求完成（客户端错误）', {
        request: requestInfo,
        response: responseInfo,
      });
    } else {
      // 成功响应
      logger.info('HTTP 请求完成', {
        request: requestInfo,
        response: responseInfo,
      });
    }
  } catch (error) {
    // 记录异常
    const duration = Date.now() - startTime;
    logger.error('HTTP 请求处理异常', {
      request: requestInfo,
      error: error instanceof Error ? error.message : String(error),
      duration,
    });

    // 重新抛出错误，让错误处理中间件处理
    throw error;
  }
}

/**
 * 创建路由级别的日志记录器
 *
 * 用于在路由处理器中记录详细的业务逻辑执行过程
 *
 * @param routeName - 路由名称
 * @returns 日志记录函数
 *
 * @example
 * ```typescript
 * const log = createRouteLogger('生成课表');
 *
 * log.start({ params: data });
 * // ... 业务逻辑
 * log.success({ result: schedule });
 * ```
 */
export function createRouteLogger(routeName: string) {
  return {
    /**
     * 记录路由处理开始
     */
    start(data?: any): void {
      logger.info(`[${routeName}] 开始处理`, data);
    },

    /**
     * 记录业务逻辑步骤
     */
    step(stepName: string, data?: any): void {
      logger.debug(`[${routeName}] ${stepName}`, data);
    },

    /**
     * 记录成功结果
     */
    success(data?: any): void {
      logger.info(`[${routeName}] 处理成功`, data);
    },

    /**
     * 记录警告信息
     */
    warn(message: string, data?: any): void {
      logger.warn(`[${routeName}] ${message}`, data);
    },

    /**
     * 记录错误信息
     */
    error(message: string, data?: any): void {
      logger.error(`[${routeName}] ${message}`, data);
    },
  };
}
