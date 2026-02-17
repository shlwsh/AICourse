/**
 * Hono 类型扩展
 *
 * 扩展 Hono 的上下文类型，添加自定义变量
 */

declare module 'hono' {
  interface ContextVariableMap {
    requestId: string;
    startTime: number;
  }
}

export {};
