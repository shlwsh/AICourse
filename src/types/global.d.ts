/**
 * 全局类型声明文件
 * 定义项目中使用的全局类型和接口
 */

// Vite 环境变量类型声明
interface ImportMetaEnv {
  readonly VITE_APP_TITLE: string;
  readonly VITE_API_BASE_URL: string;
  readonly VITE_LOG_LEVEL: 'debug' | 'info' | 'warn' | 'error';
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

// Window 对象扩展
interface Window {
  // Tauri API
  __TAURI__?: unknown;
}

// 日志级别类型
type LogLevel = 'DEBUG' | 'INFO' | 'WARN' | 'ERROR';

// 日志记录器接口
interface ILogger {
  debug(message: string, ...args: unknown[]): void;
  info(message: string, ...args: unknown[]): void;
  warn(message: string, ...args: unknown[]): void;
  error(message: string, error?: Error, ...args: unknown[]): void;
}

// 通用响应类型
interface IApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

// 分页参数
interface IPaginationParams {
  page: number;
  pageSize: number;
}

// 分页响应
interface IPaginationResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

// 排序参数
interface ISortParams {
  field: string;
  order: 'asc' | 'desc';
}

// 筛选参数
interface IFilterParams {
  [key: string]: string | number | boolean | undefined;
}

// 导出类型
export type {
  LogLevel,
  ILogger,
  IApiResponse,
  IPaginationParams,
  IPaginationResponse,
  ISortParams,
  IFilterParams,
};
