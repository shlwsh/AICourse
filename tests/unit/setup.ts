/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Vitest 单元测试全局设置文件
 *
 * 本文件在所有单元测试运行前执行，用于：
 * - 配置全局测试环境
 * - 设置模拟对象
 * - 初始化测试工具
 * - 配置全局钩子
 *
 * @see https://vitest.dev/config/#setupfiles
 */

import { vi } from 'vitest';
import { config } from '@vue/test-utils';

/**
 * 配置 Vue Test Utils
 *
 * 设置全局配置，用于所有 Vue 组件测试
 */
config.global.mocks = {
  // 模拟 Vue Router
  $route: {
    path: '/',
    params: {},
    query: {},
  },
  $router: {
    push: vi.fn(),
    replace: vi.fn(),
    go: vi.fn(),
    back: vi.fn(),
  },
};

/**
 * 模拟 Tauri API
 *
 * 在单元测试中模拟 Tauri 命令调用
 * 避免在测试环境中实际调用 Rust 后端
 */
vi.mock('@tauri-apps/api/core', () => ({
  invoke: vi.fn((cmd: string, args?: any) => {
    console.log(`[Mock] Tauri invoke: ${cmd}`, args);
    return Promise.resolve({});
  }),
}));

/**
 * 模拟 Tauri 事件系统
 */
vi.mock('@tauri-apps/api/event', () => ({
  listen: vi.fn(),
  once: vi.fn(),
  emit: vi.fn(),
}));

/**
 * 模拟 Tauri 窗口 API
 */
vi.mock('@tauri-apps/api/window', () => ({
  appWindow: {
    listen: vi.fn(),
    once: vi.fn(),
    emit: vi.fn(),
    close: vi.fn(),
    minimize: vi.fn(),
    maximize: vi.fn(),
    unmaximize: vi.fn(),
    show: vi.fn(),
    hide: vi.fn(),
  },
}));

/**
 * 模拟 Element Plus 消息提示
 *
 * 避免在测试中实际显示 UI 提示
 */
vi.mock('element-plus', async () => {
  const actual = await vi.importActual('element-plus');
  return {
    ...actual,
    ElMessage: {
      success: vi.fn((message: string) => {
        console.log(`[Mock] ElMessage.success: ${message}`);
      }),
      error: vi.fn((message: string) => {
        console.log(`[Mock] ElMessage.error: ${message}`);
      }),
      warning: vi.fn((message: string) => {
        console.log(`[Mock] ElMessage.warning: ${message}`);
      }),
      info: vi.fn((message: string) => {
        console.log(`[Mock] ElMessage.info: ${message}`);
      }),
    },
    ElMessageBox: {
      confirm: vi.fn(() => Promise.resolve('confirm')),
      alert: vi.fn(() => Promise.resolve()),
      prompt: vi.fn(() => Promise.resolve({ value: '' })),
    },
  };
});

/**
 * 模拟 localStorage
 *
 * 提供内存中的 localStorage 实现
 */
class LocalStorageMock {
  private store: Map<string, string> = new Map();

  getItem(key: string): string | null {
    return this.store.get(key) || null;
  }

  setItem(key: string, value: string): void {
    this.store.set(key, value);
  }

  removeItem(key: string): void {
    this.store.delete(key);
  }

  clear(): void {
    this.store.clear();
  }

  get length(): number {
    return this.store.size;
  }

  key(index: number): string | null {
    const keys = Array.from(this.store.keys());
    return keys[index] || null;
  }
}

global.localStorage = new LocalStorageMock() as Storage;

/**
 * 模拟 sessionStorage
 */
global.sessionStorage = new LocalStorageMock() as Storage;

/**
 * 模拟 console 方法（可选）
 *
 * 在测试中静默某些 console 输出
 * 取消注释以启用
 */
// const originalConsoleError = console.error;
// console.error = (...args: any[]) => {
//   // 过滤掉某些预期的错误消息
//   const message = args[0]?.toString() || '';
//   if (message.includes('Not implemented: HTMLFormElement.prototype.submit')) {
//     return;
//   }
//   originalConsoleError(...args);
// };

/**
 * 全局测试钩子
 *
 * 在每个测试前后执行清理操作
 */
beforeEach(() => {
  // 清理 localStorage
  localStorage.clear();
  sessionStorage.clear();

  // 清理所有模拟
  vi.clearAllMocks();
});

afterEach(() => {
  // 测试后清理
  vi.restoreAllMocks();
});

/**
 * 全局测试工具函数
 *
 * 提供常用的测试辅助函数
 */

/**
 * 等待指定时间
 *
 * @param ms 毫秒数
 */
export const sleep = (ms: number): Promise<void> => {
  return new Promise((resolve) => setTimeout(resolve, ms));
};

/**
 * 等待 Vue 组件更新
 *
 * 使用 nextTick 等待 DOM 更新
 */
export const flushPromises = (): Promise<void> => {
  return new Promise((resolve) => {
    setTimeout(resolve, 0);
  });
};

/**
 * 创建测试用的时间槽位掩码
 *
 * @param slots 时间槽位数组，例如 [[0, 0], [0, 1]] 表示周一第1、2节
 * @returns u64 位掩码
 */
export const createTimeSlotMask = (slots: [number, number][]): bigint => {
  let mask = 0n;
  for (const [day, period] of slots) {
    const position = day * 8 + period;
    mask |= 1n << BigInt(position);
  }
  return mask;
};

/**
 * 创建测试用的教师偏好数据
 */
export const createMockTeacherPreference = (overrides = {}) => {
  return {
    teacher_id: 1,
    preferred_slots: '0',
    time_bias: 0,
    weight: 1,
    blocked_slots: '0',
    teaching_group_id: null,
    ...overrides,
  };
};

/**
 * 创建测试用的课程配置数据
 */
export const createMockSubjectConfig = (overrides = {}) => {
  return {
    id: 'math',
    name: '数学',
    forbidden_slots: '0',
    allow_double_session: true,
    venue_id: null,
    is_major_subject: true,
    ...overrides,
  };
};

/**
 * 创建测试用的班级教学计划数据
 */
export const createMockClassCurriculum = (overrides = {}) => {
  return {
    id: 1,
    class_id: 1,
    subject_id: 'math',
    teacher_id: 1,
    target_sessions: 5,
    is_combined_class: false,
    combined_class_ids: [],
    week_type: 'Every',
    ...overrides,
  };
};

/**
 * 创建测试用的课表条目数据
 */
export const createMockScheduleEntry = (overrides = {}) => {
  return {
    class_id: 1,
    subject_id: 'math',
    teacher_id: 1,
    time_slot: { day: 0, period: 0 },
    is_fixed: false,
    week_type: 'Every',
    ...overrides,
  };
};

/**
 * 日志记录
 *
 * 在测试中记录重要信息
 */
export const testLog = (message: string, ...args: any[]): void => {
  if (process.env.VITEST_LOG === 'true') {
    console.log(`[Test] ${message}`, ...args);
  }
};

/**
 * 导出测试工具
 */
export default {
  sleep,
  flushPromises,
  createTimeSlotMask,
  createMockTeacherPreference,
  createMockSubjectConfig,
  createMockClassCurriculum,
  createMockScheduleEntry,
  testLog,
};
