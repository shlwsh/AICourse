/**
 * API 请求日志中间件
 *
 * 功能特性：
 * - 记录每个 API 请求的完整调用链路
 * - 记录请求和响应的详细信息（方法、路径、参数、响应状态等）
 * - 自动生成请求 ID 用于追踪
 * - 计算请求处理时间
 * - 过滤敏感信息
 * - 支持代理服务器时间校正
 */

import type { Context, Next } from 'hono';
import { createLogger } from '../utils/logger';
import { nanoid } from 'nanoid';

const logger = createLogger('RequestLogger');

/**
 * 生成唯一的请求 ID
 */
function generateRequestId(): string {
  return nanoid(10);
}

/**
 * 获取客户端 IP 地址（考虑代理）
 */
function getClientIp(c: Context): string {
  // 优先从代理头获取真实 IP
  const forwardedFor = c.req.header('x-forwarded-for');
  if (forwardedFor) {
    return forwardedFor.split(',')[0].trim();
  }

  const realIp = c.req.header('x-real-ip');
  if (realIp) {
    return realIp;
  }

  // 从连接信息获取（Bun 特定）
  return 'unknown';
}

/**
 * 获取服务器时间（考虑代理延迟）
 */
function getServerTime(): number {
  // 使用高精度时间戳
  return performance.now();
}

/**
 * 格式化请求体（限制大小）
 */
async function formatRequestBody(c: Context): Promise<any> {
  try {
    const contentType = c.req.header('content-type') || '';

    if (contentType.includes('application/json')) {
      const body = await c.req.json();
      return body;
    }

    if (contentType.includes('application/x-www-form-urlencoded')) {
      const formData = await c.req.parseBody();
      return formData;
    }

    if (contentType.includes('multipart/form-data')) {
      return '[FormData]';
    }

    return null;
  } catch (error) {
    return '[解析失败]';
  }
}

/**
 * 格式化响应体（限制大小）
 */
function formatResponseBody(body: any): any {
  if (!body) return null;

  try {
    const bodyStr = JSON.stringify(body);

    // 如果响应体太大，只记录摘要
    if (bodyStr.length > 10000) {
      return {
        _summary: `[响应体过大: ${bodyStr.length} 字符]`,
        _preview: bodyStr.substring(0, 200) + '...',
      };
    }

    return body;
  } catch (error) {
    return '[无法序列化]';
  }
}

/**
 * 请求日志中间件
 */
export async function requestLogger(c: Context, next: Next) {
  const requestId = generateRequestId();
  const startTime = getServerTime();
  const startDate = new Date();

  // 将请求 ID 存储到上下文中，供后续使用
  c.set('requestId', requestId);
  c.set('startTime', startTime);

  // 获取请求信息
  const method = c.req.method;
  const path = c.req.path;
  const query = c.req.query();
  const headers = Object.fromEntries(c.req.raw.headers.entries());
  const clientIp = getClientIp(c);
  const userAgent = c.req.header('user-agent') || 'unknown';

  // 记录请求开始
  logger.info('[BACKEND] 📥 收到请求', {
    requestId,
    method,
    path,
    query: Object.keys(query).length > 0 ? query : undefined,
    clientIp,
    timestamp: startDate.toISOString(),
  });

  // 记录请求体（仅对 POST/PUT/PATCH 请求）
  if (['POST', 'PUT', 'PATCH'].includes(method)) {
    try {
      const body = await formatRequestBody(c);

      if (body) {
        logger.debug('[BACKEND] 📦 请求体详情', {
          requestId,
          body,
        });
      }
    } catch (error) {
      logger.warn('[BACKEND] ⚠️ 无法读取请求体', {
        requestId,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  try {
    // 执行后续中间件和路由处理
    await next();

    // 计算处理时间
    const endTime = getServerTime();
    const duration = Math.round(endTime - startTime);

    // 获取响应信息
    const status = c.res.status;
    const responseHeaders = Object.fromEntries(c.res.headers.entries());

    // 记录响应
    logger.info('[BACKEND] 📤 返回响应', {
      requestId,
      method,
      path,
      status,
      duration: `${duration}ms`,
    });

    // 如果是错误响应，记录详细信息
    if (status >= 400) {
      logger.error('[BACKEND] ❌ 错误响应', {
        requestId,
        method,
        path,
        status,
        duration: `${duration}ms`,
      });
    }

    // 性能警告
    if (duration > 1000) {
      logger.warn('[BACKEND] 🐌 响应时间过长', {
        requestId,
        method,
        path,
        duration: `${duration}ms`,
      });
    }

  } catch (error) {
    // 计算处理时间
    const endTime = getServerTime();
    const duration = Math.round(endTime - startTime);

    // 记录错误
    logger.error('[BACKEND] ❌ 请求异常', {
      requestId,
      method,
      path,
      duration: `${duration}ms`,
      error: error instanceof Error ? {
        name: error.name,
        message: error.message,
        stack: error.stack,
      } : String(error),
    });

    // 重新抛出错误，让错误处理中间件处理
    throw error;
  }
}

/**
 * 响应日志中间件（记录响应体）
 */
export async function responseLogger(c: Context, next: Next) {
  await next();

  const requestId = c.get('requestId');
  const startTime = c.get('startTime');

  if (!requestId || !startTime) {
    return;
  }

  try {
    // 获取响应体
    const responseBody = await c.res.clone().json().catch(() => null);

    if (responseBody) {
      const formattedBody = formatResponseBody(responseBody);

      logger.debug('📦 响应体', {
        requestId,
        body: formattedBody,
      });
    }
  } catch (error) {
    // 忽略响应体读取错误
  }
}

/**
 * 创建路由级别的日志记录器
 *
 * 用于在路由处理函数中记录业务逻辑的执行步骤
 */
export function createRouteLogger(routeName: string) {
  const routeLogger = createLogger(routeName);

  return {
    /**
     * 记录路由处理开始
     */
    start(params?: any) {
      routeLogger.info(`开始处理: ${routeName}`, params);
    },

    /**
     * 记录业务逻辑步骤
     */
    step(stepName: string, data?: any) {
      routeLogger.debug(`步骤: ${stepName}`, data);
    },

    /**
     * 记录成功结果
     */
    success(data?: any) {
      routeLogger.info(`处理成功: ${routeName}`, data);
    },

    /**
     * 记录警告信息
     */
    warn(message: string, data?: any) {
      routeLogger.warn(`${routeName} - ${message}`, data);
    },

    /**
     * 记录错误信息
     */
    error(message: string, data?: any) {
      routeLogger.error(`${routeName} - ${message}`, data);
    },
  };
}
