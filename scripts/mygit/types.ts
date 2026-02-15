/**
 * AI Git 提交工具 - 类型定义
 */

/**
 * Git 变更类型
 */
export type GitChangeType = 'added' | 'modified' | 'deleted';

/**
 * Git 变更
 */
export interface GitChange {
  /** 变更类型 */
  type: GitChangeType;
  /** 文件路径 */
  path: string;
  /** diff 内容（可选，删除的文件没有 diff） */
  diff?: string;
}

/**
 * Git 状态
 */
export interface GitStatus {
  /** 是否有变更 */
  hasChanges: boolean;
  /** 变更列表 */
  changes: GitChange[];
  /** 统计信息 */
  summary: {
    added: number;
    modified: number;
    deleted: number;
  };
}

/**
 * AI 配置
 */
export interface AIConfig {
  /** API 密钥 */
  apiKey: string;
  /** API 基础 URL */
  baseUrl: string;
  /** 使用的模型 */
  model: string;
}

/**
 * 生成提交信息请求
 */
export interface GenerateCommitMessageRequest {
  /** 变更列表 */
  changes: GitChange[];
  /** 最大 token 数（可选） */
  maxTokens?: number;
}

/**
 * 生成提交信息响应
 */
export interface GenerateCommitMessageResponse {
  /** 提交信息 */
  message: string;
  /** 使用情况（可选） */
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

/**
 * 日志级别
 */
export enum LogLevel {
  DEBUG = 'DEBUG',
  INFO = 'INFO',
  WARN = 'WARN',
  ERROR = 'ERROR'
}

/**
 * 日志条目
 */
export interface LogEntry {
  /** 时间戳（ISO 8601 格式） */
  timestamp: string;
  /** 日志级别 */
  level: LogLevel;
  /** 模块名称 */
  module: string;
  /** 日志消息 */
  message: string;
  /** 附加数据（可选） */
  data?: any;
}

/**
 * 确认选项
 */
export interface ConfirmOptions {
  /** 提示消息 */
  message: string;
  /** 默认值（可选） */
  default?: boolean;
}

/**
 * 输入选项
 */
export interface InputOptions {
  /** 提示消息 */
  message: string;
  /** 默认值（可选） */
  default?: string;
  /** 是否多行输入（可选） */
  multiline?: boolean;
}

/**
 * 错误类型枚举
 */
export enum ErrorType {
  /** 配置错误 */
  CONFIG = 'CONFIG',
  /** Git 错误 */
  GIT = 'GIT',
  /** 网络错误 */
  NETWORK = 'NETWORK',
  /** API 错误 */
  API = 'API',
  /** 用户取消 */
  USER_CANCEL = 'USER_CANCEL'
}

/**
 * 基础错误类
 */
export class BaseError extends Error {
  constructor(
    public readonly type: ErrorType,
    message: string,
    public readonly originalError?: Error,
  ) {
    super(message);
    this.name = this.constructor.name;
    // 保持正确的堆栈跟踪
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }
}

/**
 * 配置错误
 */
export class ConfigError extends BaseError {
  constructor(message: string, originalError?: Error) {
    super(ErrorType.CONFIG, message, originalError);
  }
}

/**
 * Git 错误
 */
export class GitError extends BaseError {
  constructor(message: string, originalError?: Error) {
    super(ErrorType.GIT, message, originalError);
  }
}

/**
 * 网络错误
 */
export class NetworkError extends BaseError {
  constructor(message: string, originalError?: Error) {
    super(ErrorType.NETWORK, message, originalError);
  }
}

/**
 * API 错误
 */
export class APIError extends BaseError {
  constructor(
    message: string,
    public readonly statusCode?: number,
    originalError?: Error,
  ) {
    super(ErrorType.API, message, originalError);
  }
}

/**
 * 用户取消错误
 */
export class UserCancelError extends BaseError {
  constructor(message: string = '用户取消操作') {
    super(ErrorType.USER_CANCEL, message);
  }
}
