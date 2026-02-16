/**
 * 前端错误处理模块
 *
 * 功能：
 * - 统一的错误类型定义
 * - 错误消息格式化
 * - 用户友好的错误提示
 * - 完善的日志记录（DEBUG、INFO、WARN、ERROR 级别）
 * - 全局错误处理器
 *
 * 使用示例：
 * ```typescript
 * import { handleError, AppError, ErrorType } from '@/utils/errorHandler';
 *
 * try {
 *   // 业务逻辑
 * } catch (error) {
 *   handleError(error);
 * }
 * ```
 */

import { logger } from './logger';
import { ElMessage, ElNotification } from 'element-plus';

/**
 * 错误类型枚举
 * 用于分类不同类型的错误，便于统一处理
 */
export enum ErrorType {
  /** 网络错误 */
  NETWORK = 'NETWORK',
  /** 验证错误 */
  VALIDATION = 'VALIDATION',
  /** 业务逻辑错误 */
  BUSINESS = 'BUSINESS',
  /** 权限错误 */
  PERMISSION = 'PERMISSION',
  /** 资源未找到 */
  NOT_FOUND = 'NOT_FOUND',
  /** 服务器错误 */
  SERVER = 'SERVER',
  /** 未知错误 */
  UNKNOWN = 'UNKNOWN',
  /** 超时错误 */
  TIMEOUT = 'TIMEOUT',
  /** 数据库错误 */
  DATABASE = 'DATABASE',
  /** 约束冲突错误 */
  CONSTRAINT = 'CONSTRAINT',
}

/**
 * 错误严重程度枚举
 */
export enum ErrorSeverity {
  /** 信息级别 - 不影响功能 */
  INFO = 'INFO',
  /** 警告级别 - 可能影响功能 */
  WARNING = 'WARNING',
  /** 错误级别 - 影响当前操作 */
  ERROR = 'ERROR',
  /** 严重级别 - 影响系统运行 */
  CRITICAL = 'CRITICAL',
}

/**
 * 应用错误类
 * 扩展标准 Error 类，添加错误类型、错误码等信息
 */
export class AppError extends Error {
  /** 错误类型 */
  public type: ErrorType;
  /** 错误码 */
  public code: string;
  /** 错误严重程度 */
  public severity: ErrorSeverity;
  /** 错误详情 */
  public details?: any;
  /** 是否显示给用户 */
  public showToUser: boolean;
  /** 时间戳 */
  public timestamp: Date;

  constructor(
    message: string,
    type: ErrorType = ErrorType.UNKNOWN,
    code?: string,
    severity: ErrorSeverity = ErrorSeverity.ERROR,
    details?: any,
    showToUser: boolean = true,
  ) {
    super(message);
    this.name = 'AppError';
    this.type = type;
    this.code = code || `${type}_ERROR`;
    this.severity = severity;
    this.details = details;
    this.showToUser = showToUser;
    this.timestamp = new Date();

    // 维护正确的堆栈跟踪
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, AppError);
    }
  }
}

/**
 * 网络错误类
 */
export class NetworkError extends AppError {
  constructor(message: string = '网络连接失败，请检查网络设置', details?: any) {
    super(message, ErrorType.NETWORK, 'NETWORK_ERROR', ErrorSeverity.ERROR, details);
    this.name = 'NetworkError';
  }
}

/**
 * 验证错误类
 */
export class ValidationError extends AppError {
  constructor(message: string = '数据验证失败', details?: any) {
    super(message, ErrorType.VALIDATION, 'VALIDATION_ERROR', ErrorSeverity.WARNING, details);
    this.name = 'ValidationError';
  }
}

/**
 * 业务逻辑错误类
 */
export class BusinessError extends AppError {
  constructor(message: string, details?: any) {
    super(message, ErrorType.BUSINESS, 'BUSINESS_ERROR', ErrorSeverity.ERROR, details);
    this.name = 'BusinessError';
  }
}

/**
 * 权限错误类
 */
export class PermissionError extends AppError {
  constructor(message: string = '您没有权限执行此操作', details?: any) {
    super(message, ErrorType.PERMISSION, 'PERMISSION_ERROR', ErrorSeverity.WARNING, details);
    this.name = 'PermissionError';
  }
}

/**
 * 资源未找到错误类
 */
export class NotFoundError extends AppError {
  constructor(message: string = '请求的资源不存在', details?: any) {
    super(message, ErrorType.NOT_FOUND, 'NOT_FOUND_ERROR', ErrorSeverity.WARNING, details);
    this.name = 'NotFoundError';
  }
}

/**
 * 服务器错误类
 */
export class ServerError extends AppError {
  constructor(message: string = '服务器错误，请稍后重试', details?: any) {
    super(message, ErrorType.SERVER, 'SERVER_ERROR', ErrorSeverity.CRITICAL, details);
    this.name = 'ServerError';
  }
}

/**
 * 超时错误类
 */
export class TimeoutError extends AppError {
  constructor(message: string = '请求超时，请稍后重试', details?: any) {
    super(message, ErrorType.TIMEOUT, 'TIMEOUT_ERROR', ErrorSeverity.ERROR, details);
    this.name = 'TimeoutError';
  }
}

/**
 * 数据库错误类
 */
export class DatabaseError extends AppError {
  constructor(message: string = '数据库操作失败', details?: any) {
    super(message, ErrorType.DATABASE, 'DATABASE_ERROR', ErrorSeverity.CRITICAL, details);
    this.name = 'DatabaseError';
  }
}

/**
 * 约束冲突错误类
 */
export class ConstraintError extends AppError {
  constructor(message: string, details?: any) {
    super(message, ErrorType.CONSTRAINT, 'CONSTRAINT_ERROR', ErrorSeverity.WARNING, details);
    this.name = 'ConstraintError';
  }
}

/**
 * 错误消息映射表
 * 将错误类型映射到用户友好的默认消息
 */
const ERROR_MESSAGES: Record<ErrorType, string> = {
  [ErrorType.NETWORK]: '网络连接失败，请检查网络设置',
  [ErrorType.VALIDATION]: '输入的数据不符合要求，请检查后重试',
  [ErrorType.BUSINESS]: '操作失败，请稍后重试',
  [ErrorType.PERMISSION]: '您没有权限执行此操作',
  [ErrorType.NOT_FOUND]: '请求的资源不存在',
  [ErrorType.SERVER]: '服务器错误，请稍后重试',
  [ErrorType.UNKNOWN]: '发生未知错误，请联系管理员',
  [ErrorType.TIMEOUT]: '请求超时，请稍后重试',
  [ErrorType.DATABASE]: '数据操作失败，请稍后重试',
  [ErrorType.CONSTRAINT]: '操作违反了约束条件',
};

/**
 * HTTP 状态码到错误类型的映射
 */
const HTTP_STATUS_TO_ERROR_TYPE: Record<number, ErrorType> = {
  400: ErrorType.VALIDATION,
  401: ErrorType.PERMISSION,
  403: ErrorType.PERMISSION,
  404: ErrorType.NOT_FOUND,
  408: ErrorType.TIMEOUT,
  409: ErrorType.CONSTRAINT,
  422: ErrorType.VALIDATION,
  500: ErrorType.SERVER,
  502: ErrorType.SERVER,
  503: ErrorType.SERVER,
  504: ErrorType.TIMEOUT,
};

/**
 * 格式化错误消息
 * 将错误对象转换为用户友好的消息
 *
 * @param error - 错误对象
 * @returns 格式化后的错误消息
 */
export function formatErrorMessage(error: any): string {
  logger.debug('格式化错误消息', { error });

  // 如果是 AppError，直接返回消息
  if (error instanceof AppError) {
    return error.message;
  }

  // 如果是标准 Error 对象
  if (error instanceof Error) {
    return error.message || '发生未知错误';
  }

  // 如果是 HTTP 响应错误
  if (error?.response) {
    const status = error.response.status;
    const data = error.response.data;

    // 尝试从响应中提取错误消息
    if (data?.message) {
      return data.message;
    }

    // 根据状态码返回默认消息
    const errorType = HTTP_STATUS_TO_ERROR_TYPE[status] || ErrorType.UNKNOWN;
    return ERROR_MESSAGES[errorType];
  }

  // 如果是字符串
  if (typeof error === 'string') {
    return error;
  }

  // 如果有 message 属性
  if (error?.message) {
    return error.message;
  }

  // 默认消息
  return '发生未知错误，请联系管理员';
}

/**
 * 从错误对象中提取错误类型
 *
 * @param error - 错误对象
 * @returns 错误类型
 */
export function getErrorType(error: any): ErrorType {
  logger.debug('提取错误类型', { error });

  // 如果是 AppError，直接返回类型
  if (error instanceof AppError) {
    return error.type;
  }

  // 如果是 HTTP 响应错误
  if (error?.response) {
    const status = error.response.status;
    return HTTP_STATUS_TO_ERROR_TYPE[status] || ErrorType.UNKNOWN;
  }

  // 如果是网络错误
  if (error?.code === 'ECONNABORTED' || error?.code === 'ERR_NETWORK') {
    return ErrorType.NETWORK;
  }

  // 默认为未知错误
  return ErrorType.UNKNOWN;
}

/**
 * 从错误对象中提取错误严重程度
 *
 * @param error - 错误对象
 * @returns 错误严重程度
 */
export function getErrorSeverity(error: any): ErrorSeverity {
  // 如果是 AppError，直接返回严重程度
  if (error instanceof AppError) {
    return error.severity;
  }

  // 根据错误类型判断严重程度
  const errorType = getErrorType(error);

  switch (errorType) {
    case ErrorType.SERVER:
    case ErrorType.DATABASE:
      return ErrorSeverity.CRITICAL;
    case ErrorType.NETWORK:
    case ErrorType.TIMEOUT:
    case ErrorType.BUSINESS:
      return ErrorSeverity.ERROR;
    case ErrorType.VALIDATION:
    case ErrorType.PERMISSION:
    case ErrorType.CONSTRAINT:
    case ErrorType.NOT_FOUND:
      return ErrorSeverity.WARNING;
    default:
      return ErrorSeverity.ERROR;
  }
}

/**
 * 显示错误提示
 * 根据错误严重程度选择合适的提示方式
 *
 * @param error - 错误对象
 * @param message - 自定义错误消息（可选）
 */
export function showErrorNotification(error: any, message?: string): void {
  const errorMessage = message || formatErrorMessage(error);
  const severity = getErrorSeverity(error);
  const errorType = getErrorType(error);

  logger.debug('显示错误提示', { errorMessage, severity, errorType });

  // 根据严重程度选择提示方式
  switch (severity) {
    case ErrorSeverity.CRITICAL:
      // 严重错误：使用通知
      ElNotification({
        title: '严重错误',
        message: errorMessage,
        type: 'error',
        duration: 0, // 不自动关闭
        showClose: true,
      });
      break;

    case ErrorSeverity.ERROR:
      // 错误：使用消息提示
      ElMessage({
        message: errorMessage,
        type: 'error',
        duration: 5000,
        showClose: true,
      });
      break;

    case ErrorSeverity.WARNING:
      // 警告：使用消息提示
      ElMessage({
        message: errorMessage,
        type: 'warning',
        duration: 4000,
        showClose: true,
      });
      break;

    case ErrorSeverity.INFO:
      // 信息：使用消息提示
      ElMessage({
        message: errorMessage,
        type: 'info',
        duration: 3000,
        showClose: true,
      });
      break;

    default:
      // 默认：使用错误消息提示
      ElMessage({
        message: errorMessage,
        type: 'error',
        duration: 5000,
        showClose: true,
      });
  }
}

/**
 * 记录错误日志
 * 根据错误严重程度选择合适的日志级别
 *
 * @param error - 错误对象
 * @param context - 错误上下文信息
 */
export function logError(error: any, context?: Record<string, any>): void {
  const errorMessage = formatErrorMessage(error);
  const errorType = getErrorType(error);
  const severity = getErrorSeverity(error);

  // 构建日志数据
  const logData: Record<string, any> = {
    errorMessage,
    errorType,
    severity,
    timestamp: new Date().toISOString(),
    ...context,
  };

  // 添加错误详情
  if (error instanceof AppError && error.details) {
    logData.details = error.details;
  }

  // 添加堆栈跟踪
  if (error instanceof Error && error.stack) {
    logData.stack = error.stack;
  }

  // 添加 HTTP 响应信息
  if (error?.response) {
    logData.httpStatus = error.response.status;
    logData.httpData = error.response.data;
  }

  // 根据严重程度选择日志级别
  switch (severity) {
    case ErrorSeverity.CRITICAL:
      logger.error('严重错误', logData);
      break;
    case ErrorSeverity.ERROR:
      logger.error('错误', logData);
      break;
    case ErrorSeverity.WARNING:
      logger.warn('警告', logData);
      break;
    case ErrorSeverity.INFO:
      logger.info('信息', logData);
      break;
    default:
      logger.error('未知错误', logData);
  }
}

/**
 * 统一错误处理函数
 * 处理错误的主入口，包括日志记录和用户提示
 *
 * @param error - 错误对象
 * @param options - 处理选项
 * @returns 处理后的错误对象
 */
export function handleError(
  error: any,
  options: {
    /** 是否显示用户提示 */
    showNotification?: boolean;
    /** 自定义错误消息 */
    message?: string;
    /** 错误上下文信息 */
    context?: Record<string, any>;
    /** 是否重新抛出错误 */
    rethrow?: boolean;
  } = {},
): AppError {
  const {
    showNotification = true,
    message,
    context,
    rethrow = false,
  } = options;

  logger.debug('处理错误', { error, options });

  // 转换为 AppError
  let appError: AppError;
  if (error instanceof AppError) {
    appError = error;
  } else {
    const errorType = getErrorType(error);
    const errorMessage = message || formatErrorMessage(error);
    const severity = getErrorSeverity(error);
    appError = new AppError(errorMessage, errorType, undefined, severity, error);
  }

  // 记录错误日志
  logError(appError, context);

  // 显示用户提示
  if (showNotification && appError.showToUser) {
    showErrorNotification(appError, message);
  }

  // 重新抛出错误
  if (rethrow) {
    throw appError;
  }

  return appError;
}

/**
 * 创建全局错误处理器
 * 用于 Vue 应用的全局错误处理
 *
 * @returns 全局错误处理器函数
 */
export function createGlobalErrorHandler() {
  return (error: any, instance: any, info: string) => {
    logger.error('Vue 应用错误', {
      error,
      componentName: instance?.$options?.name || 'Unknown',
      info,
    });

    // 处理错误
    handleError(error, {
      showNotification: true,
      context: {
        component: instance?.$options?.name,
        info,
      },
    });
  };
}

/**
 * 创建 Promise 拒绝处理器
 * 用于处理未捕获的 Promise 拒绝
 *
 * @returns Promise 拒绝处理器函数
 */
export function createUnhandledRejectionHandler() {
  return (event: PromiseRejectionEvent) => {
    logger.error('未捕获的 Promise 拒绝', {
      reason: event.reason,
      promise: event.promise,
    });

    // 阻止默认行为
    event.preventDefault();

    // 处理错误
    handleError(event.reason, {
      showNotification: true,
      context: {
        type: 'unhandledRejection',
      },
    });
  };
}

/**
 * 初始化全局错误处理
 * 设置 Vue 应用和浏览器的全局错误处理器
 *
 * @param app - Vue 应用实例（可选）
 */
export function initGlobalErrorHandling(app?: any): void {
  logger.info('初始化全局错误处理');

  // 设置 Vue 应用错误处理器
  if (app) {
    app.config.errorHandler = createGlobalErrorHandler();
    logger.debug('Vue 应用错误处理器已设置');
  }

  // 设置浏览器未捕获的 Promise 拒绝处理器
  if (typeof window !== 'undefined') {
    window.addEventListener('unhandledrejection', createUnhandledRejectionHandler());
    logger.debug('Promise 拒绝处理器已设置');
  }

  logger.info('全局错误处理初始化完成');
}

/**
 * 包装异步函数，自动处理错误
 *
 * @param fn - 异步函数
 * @param options - 错误处理选项
 * @returns 包装后的函数
 */
export function withErrorHandling<T extends (...args: any[]) => Promise<any>>(
  fn: T,
  options: {
    showNotification?: boolean;
    message?: string;
    context?: Record<string, any>;
  } = {},
): T {
  return (async (...args: any[]) => {
    try {
      return await fn(...args);
    } catch (error) {
      handleError(error, options);
      throw error;
    }
  }) as T;
}
