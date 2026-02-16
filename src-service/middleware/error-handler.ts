/**
 * 错误处理中间件
 *
 * 功能：
 * - 统一处理 HTTP 请求错误
 * - 返回标准化的错误响应格式
 * - 使用 ERROR 级别记录错误信息
 * - 区分开发环境和生产环境的错误详情
 * - 支持自定义错误类型和错误码
 *
 * 使用示例：
 * ```typescript
 * import { Hono } from 'hono';
 * import { errorHandler } from './middleware/error-handler';
 *
 * const app = new Hono();
 * app.onError(errorHandler);
 * ```
 */

import type { Context } from 'hono';
import { HTTPException } from 'hono/http-exception';
import { logger } from '../utils/logger';

/**
 * 标准化错误响应接口
 */
interface ErrorResponse {
  /** 是否成功 */
  success: false;
  /** 错误消息 */
  message: string;
  /** 错误码 */
  code?: string;
  /** 错误详情（仅开发环境） */
  details?: any;
  /** 堆栈跟踪（仅开发环境） */
  stack?: string;
  /** 请求路径 */
  path?: string;
  /** 时间戳 */
  timestamp: string;
}

/**
 * 自定义业务错误类
 */
export class BusinessError extends Error {
  /** HTTP 状态码 */
  public statusCode: number;
  /** 错误码 */
  public code: string;
  /** 错误详情 */
  public details?: any;

  constructor(message: string, statusCode: number = 400, code?: string, details?: any) {
    super(message);
    this.name = 'BusinessError';
    this.statusCode = statusCode;
    this.code = code || `ERR_${statusCode}`;
    this.details = details;
  }
}

/**
 * 验证错误类
 */
export class ValidationError extends BusinessError {
  constructor(message: string, details?: any) {
    super(message, 400, 'VALIDATION_ERROR', details);
    this.name = 'ValidationError';
  }
}

/**
 * 资源未找到错误类
 */
export class NotFoundError extends BusinessError {
  constructor(message: string = '请求的资源不存在') {
    super(message, 404, 'NOT_FOUND');
    this.name = 'NotFoundError';
  }
}

/**
 * 未授权错误类
 */
export class UnauthorizedError extends BusinessError {
  constructor(message: string = '未授权访问') {
    super(message, 401, 'UNAUTHORIZED');
    this.name = 'UnauthorizedError';
  }
}

/**
 * 禁止访问错误类
 */
export class ForbiddenError extends BusinessError {
  constructor(message: string = '禁止访问') {
    super(message, 403, 'FORBIDDEN');
    this.name = 'ForbiddenError';
  }
}

/**
 * 冲突错误类
 */
export class ConflictError extends BusinessError {
  constructor(message: string, details?: any) {
    super(message, 409, 'CONFLICT', details);
    this.name = 'ConflictError';
  }
}

/**
 * 内部服务器错误类
 */
export class InternalServerError extends BusinessError {
  constructor(message: string = '服务器内部错误', details?: any) {
    super(message, 500, 'INTERNAL_SERVER_ERROR', details);
    this.name = 'InternalServerError';
  }
}

/**
 * 判断是否为开发环境
 */
function isDevelopment(): boolean {
  return process.env.NODE_ENV === 'development';
}

/**
 * 获取错误的 HTTP 状态码
 *
 * @param error - 错误对象
 * @returns HTTP 状态码
 */
function getStatusCode(error: Error): number {
  // HTTPException（Hono 内置）
  if (error instanceof HTTPException) {
    return error.status;
  }

  // 自定义业务错误
  if (error instanceof BusinessError) {
    return error.statusCode;
  }

  // 默认为 500
  return 500;
}

/**
 * 获取错误码
 *
 * @param error - 错误对象
 * @returns 错误码
 */
function getErrorCode(error: Error): string {
  // 自定义业务错误
  if (error instanceof BusinessError) {
    return error.code;
  }

  // HTTPException
  if (error instanceof HTTPException) {
    return `HTTP_${error.status}`;
  }

  // 默认错误码
  return 'INTERNAL_SERVER_ERROR';
}

/**
 * 获取错误详情
 *
 * @param error - 错误对象
 * @returns 错误详情
 */
function getErrorDetails(error: Error): any {
  // 自定义业务错误
  if (error instanceof BusinessError && error.details) {
    return error.details;
  }

  // HTTPException
  if (error instanceof HTTPException && error.cause) {
    return error.cause;
  }

  return undefined;
}

/**
 * 构建错误响应
 *
 * @param error - 错误对象
 * @param path - 请求路径
 * @returns 错误响应对象
 */
function buildErrorResponse(error: Error, path: string): ErrorResponse {
  const statusCode = getStatusCode(error);
  const errorCode = getErrorCode(error);
  const details = getErrorDetails(error);

  const response: ErrorResponse = {
    success: false,
    message: error.message || '未知错误',
    code: errorCode,
    path,
    timestamp: new Date().toISOString(),
  };

  // 开发环境下添加详细信息
  if (isDevelopment()) {
    if (details) {
      response.details = details;
    }
    if (error.stack) {
      response.stack = error.stack;
    }
  }

  return response;
}

/**
 * 记录错误日志
 *
 * @param error - 错误对象
 * @param context - Hono 上下文
 */
function logError(error: Error, context: Context): void {
  const statusCode = getStatusCode(error);
  const method = context.req.method;
  const path = context.req.path;

  // 构建日志数据
  const logData: any = {
    error: error.message,
    errorType: error.name,
    statusCode,
    method,
    path,
  };

  // 添加错误详情
  const details = getErrorDetails(error);
  if (details) {
    logData.details = details;
  }

  // 添加堆栈跟踪
  if (error.stack) {
    logData.stack = error.stack;
  }

  // 添加请求信息
  try {
    const query = context.req.query();
    if (Object.keys(query).length > 0) {
      logData.query = query;
    }
  } catch (e) {
    // 忽略查询参数解析错误
  }

  // 根据状态码选择日志级别
  if (statusCode >= 500) {
    // 服务器错误：ERROR 级别
    logger.error('HTTP 请求处理失败（服务器错误）', logData);
  } else if (statusCode >= 400) {
    // 客户端错误：WARN 级别
    logger.warn('HTTP 请求处理失败（客户端错误）', logData);
  } else {
    // 其他错误：INFO 级别
    logger.info('HTTP 请求处理失败', logData);
  }
}

/**
 * 错误处理中间件
 *
 * 这是 Hono 的全局错误处理器，会捕获所有未处理的错误
 *
 * @param error - 错误对象
 * @param context - Hono 上下文
 * @returns 错误响应
 */
export function errorHandler(error: Error, context: Context): Response {
  // 记录错误日志
  logError(error, context);

  // 获取状态码
  const statusCode = getStatusCode(error);

  // 构建错误响应
  const errorResponse = buildErrorResponse(error, context.req.path);

  // 返回 JSON 响应
  return context.json(errorResponse, statusCode);
}

/**
 * 异步错误包装器
 *
 * 用于包装异步路由处理器，自动捕获异步错误
 *
 * @param handler - 异步处理器函数
 * @returns 包装后的处理器
 *
 * @example
 * ```typescript
 * app.get('/api/data', asyncHandler(async (c) => {
 *   const data = await fetchData();
 *   return c.json(data);
 * }));
 * ```
 */
export function asyncHandler(
  handler: (context: Context) => Promise<Response | void>,
): (context: Context) => Promise<Response> {
  return async (context: Context): Promise<Response> => {
    try {
      const result = await handler(context);
      // 如果处理器返回了响应，直接返回
      if (result) {
        return result;
      }
      // 否则返回当前上下文的响应
      return context.res;
    } catch (error) {
      // 捕获错误并传递给错误处理器
      if (error instanceof Error) {
        return errorHandler(error, context);
      }
      // 如果不是 Error 对象，包装成 Error
      return errorHandler(new Error(String(error)), context);
    }
  };
}

/**
 * 创建标准成功响应
 *
 * @param data - 响应数据
 * @param message - 成功消息
 * @returns 标准成功响应对象
 */
export function successResponse<T = any>(data?: T, message: string = '操作成功') {
  return {
    success: true,
    message,
    data,
    timestamp: new Date().toISOString(),
  };
}

/**
 * 抛出业务错误的辅助函数
 *
 * @param message - 错误消息
 * @param statusCode - HTTP 状态码
 * @param code - 错误码
 * @param details - 错误详情
 */
export function throwError(
  message: string,
  statusCode: number = 400,
  code?: string,
  details?: any,
): never {
  throw new BusinessError(message, statusCode, code, details);
}
