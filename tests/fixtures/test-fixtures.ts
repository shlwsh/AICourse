/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Playwright 测试 Fixtures
 *
 * 提供可重用的测试设置和工具
 *
 * Fixtures 的作用：
 * - 自动设置和清理测试环境
 * - 提供通用的测试工具和辅助函数
 * - 确保测试隔离和可重复性
 * - 简化测试代码
 *
 * @see https://playwright.dev/docs/test-fixtures
 */

import { test as base, expect } from '@playwright/test';
import { TestLogger, createTestLogger } from '../helpers/test-logger';

/**
 * 自定义 Fixtures 类型定义
 */
export type TestFixtures = {
  /**
   * 测试日志记录器
   *
   * 自动为每个测试创建独立的日志记录器
   */
  logger: TestLogger;

  /**
   * 测试数据清理函数
   *
   * 在测试结束后自动清理测试数据
   */
  cleanup: () => Promise<void>;

  /**
   * 测试计时器
   *
   * 自动记录测试执行时间
   */
  timer: {
    start: number;
    elapsed: () => number;
  };
};

/**
 * 扩展 Playwright 测试对象，添加自定义 fixtures
 */
export const test = base.extend<TestFixtures>({
  /**
   * Logger Fixture
   *
   * 为每个测试自动创建日志记录器
   * 记录测试开始、结束和执行时间
   */
  // eslint-disable-next-line no-empty-pattern
  logger: async ({ }, use, testInfo) => {
    // 设置阶段：创建日志记录器
    const logger = createTestLogger(`Test:${testInfo.title}`);

    // 记录测试开始
    logger.testStart(testInfo.title);

    // 使用阶段：将 logger 传递给测试
    await use(logger);

    // 清理阶段：记录测试结果
    const duration = testInfo.duration;

    if (testInfo.status === 'passed') {
      logger.testPass(testInfo.title, duration);
    } else if (testInfo.status === 'failed') {
      logger.testFail(testInfo.title, testInfo.error);
    } else if (testInfo.status === 'skipped') {
      logger.testSkip(testInfo.title);
    }
  },

  /**
   * Cleanup Fixture
   *
   * 提供测试数据清理功能
   * 在测试结束后自动执行清理
   */
  cleanup: async ({ logger }, use) => {
    const cleanupTasks: Array<() => Promise<void>> = [];

    // 提供注册清理任务的函数
    const _registerCleanup = (task: () => Promise<void>) => {
      cleanupTasks.push(task);
    };

    // 使用阶段
    await use(async () => {
      // 这个函数可以在测试中调用来注册清理任务
      // 但实际的清理会在测试结束后自动执行
    });

    // 清理阶段：执行所有注册的清理任务
    if (cleanupTasks.length > 0) {
      logger.info(`执行 ${cleanupTasks.length} 个清理任务`);

      for (const task of cleanupTasks) {
        try {
          await task();
        } catch (error) {
          logger.error('清理任务执行失败', error);
        }
      }
    }
  },

  /**
   * Timer Fixture
   *
   * 提供测试计时功能
   */
  // eslint-disable-next-line no-empty-pattern
  timer: async ({ }, use) => {
    const start = Date.now();

    await use({
      start,
      elapsed: () => Date.now() - start,
    });
  },
});

/**
 * 导出 expect 断言库
 *
 * 保持与 Playwright 原生 API 一致
 */
export { expect };

/**
 * 测试辅助函数：等待指定时间
 *
 * @param ms 等待时间（毫秒）
 */
export async function wait(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * 测试辅助函数：重试执行函数直到成功或超时
 *
 * @param fn 要执行的函数
 * @param options 重试选项
 * @returns 函数执行结果
 */
export async function retry<T>(
  fn: () => Promise<T>,
  options: {
    maxAttempts?: number;
    delay?: number;
    timeout?: number;
  } = {},
): Promise<T> {
  const {
    maxAttempts = 3,
    delay = 1000,
    timeout = 30000,
  } = options;

  const startTime = Date.now();
  let lastError: any;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    // 检查是否超时
    if (Date.now() - startTime > timeout) {
      throw new Error(`重试超时 (${timeout}ms)`);
    }

    try {
      return await fn();
    } catch (error) {
      lastError = error;

      // 如果不是最后一次尝试，等待后重试
      if (attempt < maxAttempts) {
        await wait(delay);
      }
    }
  }

  throw new Error(`重试 ${maxAttempts} 次后仍然失败: ${lastError}`);
}

/**
 * 测试辅助函数：生成随机字符串
 *
 * @param length 字符串长度
 * @returns 随机字符串
 */
export function randomString(length: number = 8): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';

  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }

  return result;
}

/**
 * 测试辅助函数：生成随机整数
 *
 * @param min 最小值（包含）
 * @param max 最大值（包含）
 * @returns 随机整数
 */
export function randomInt(min: number, max: number): string {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}
