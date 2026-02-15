/**
 * 示例单元测试文件
 *
 * 本文件展示了如何编写单元测试
 * 包括：
 * - 基础测试用例
 * - 异步测试
 * - 模拟对象使用
 * - 测试工具函数使用
 *
 * 运行测试：
 * - bun run test:unit           # 运行所有单元测试
 * - bun run test:unit example   # 运行本文件的测试
 * - bun run test                # 监视模式运行测试
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  sleep,
  createTimeSlotMask,
  createMockTeacherPreference,
  createMockSubjectConfig,
  testLog,
} from './setup';

/**
 * 测试套件：基础功能测试
 *
 * 演示基本的测试用例编写
 */
describe('基础功能测试', () => {
  /**
   * 测试用例：简单断言
   */
  it('应该正确执行基本断言', () => {
    // 数值断言
    expect(1 + 1).toBe(2);
    expect(10).toBeGreaterThan(5);
    expect(5).toBeLessThan(10);

    // 字符串断言
    expect('hello').toBe('hello');
    expect('hello world').toContain('world');
    expect('排课系统').toMatch(/排课/);

    // 布尔断言
    expect(true).toBeTruthy();
    expect(false).toBeFalsy();
    expect(null).toBeNull();
    expect(undefined).toBeUndefined();

    // 数组断言
    const arr = [1, 2, 3];
    expect(arr).toHaveLength(3);
    expect(arr).toContain(2);
    expect(arr).toEqual([1, 2, 3]);

    // 对象断言
    const obj = { name: '张三', age: 30 };
    expect(obj).toHaveProperty('name');
    expect(obj).toHaveProperty('age', 30);
    expect(obj).toEqual({ name: '张三', age: 30 });
  });

  /**
   * 测试用例：类型检查
   */
  it('应该正确检查数据类型', () => {
    expect(typeof 'string').toBe('string');
    expect(typeof 123).toBe('number');
    expect(typeof true).toBe('boolean');
    expect(typeof {}).toBe('object');
    expect(typeof []).toBe('object');
    expect(Array.isArray([])).toBe(true);
  });
});

/**
 * 测试套件：异步功能测试
 *
 * 演示异步测试用例编写
 */
describe('异步功能测试', () => {
  /**
   * 测试用例：Promise 测试
   */
  it('应该正确处理 Promise', async () => {
    const promise = Promise.resolve('success');
    await expect(promise).resolves.toBe('success');

    const rejectedPromise = Promise.reject(new Error('failed'));
    await expect(rejectedPromise).rejects.toThrow('failed');
  });

  /**
   * 测试用例：异步函数测试
   */
  it('应该正确执行异步函数', async () => {
    const asyncFunction = async () => {
      await sleep(10);
      return 'completed';
    };

    const result = await asyncFunction();
    expect(result).toBe('completed');
  });

  /**
   * 测试用例：超时测试
   */
  it('应该在指定时间内完成', async () => {
    const start = Date.now();
    await sleep(50);
    const duration = Date.now() - start;

    // 允许 2ms 的误差范围，因为系统时间精度和调度可能导致轻微偏差
    expect(duration).toBeGreaterThanOrEqual(48);
    expect(duration).toBeLessThan(100);
  }, 200); // 设置测试超时为 200ms
});

/**
 * 测试套件：模拟对象测试
 *
 * 演示如何使用模拟对象
 */
describe('模拟对象测试', () => {
  /**
   * 测试用例：函数模拟
   */
  it('应该正确模拟函数调用', () => {
    // 创建模拟函数
    const mockFn = vi.fn();

    // 设置返回值
    mockFn.mockReturnValue('mocked value');

    // 调用函数
    const result = mockFn('arg1', 'arg2');

    // 断言
    expect(result).toBe('mocked value');
    expect(mockFn).toHaveBeenCalled();
    expect(mockFn).toHaveBeenCalledTimes(1);
    expect(mockFn).toHaveBeenCalledWith('arg1', 'arg2');
  });

  /**
   * 测试用例：异步函数模拟
   */
  it('应该正确模拟异步函数', async () => {
    const mockAsyncFn = vi.fn();
    mockAsyncFn.mockResolvedValue('async result');

    const result = await mockAsyncFn();

    expect(result).toBe('async result');
    expect(mockAsyncFn).toHaveBeenCalled();
  });

  /**
   * 测试用例：模拟实现
   */
  it('应该正确模拟函数实现', () => {
    const mockFn = vi.fn((a: number, b: number) => a + b);

    const result = mockFn(2, 3);

    expect(result).toBe(5);
    expect(mockFn).toHaveBeenCalledWith(2, 3);
  });
});

/**
 * 测试套件：测试工具函数
 *
 * 演示如何使用测试工具函数
 */
describe('测试工具函数', () => {
  /**
   * 测试用例：时间槽位掩码创建
   */
  it('应该正确创建时间槽位掩码', () => {
    // 创建周一第1节和第2节的掩码
    const mask = createTimeSlotMask([[0, 0], [0, 1]]);

    // 验证掩码值
    // 周一第1节：位置 0，值 2^0 = 1
    // 周一第2节：位置 1，值 2^1 = 2
    // 总和：1 + 2 = 3
    expect(mask).toBe(3n);
  });

  /**
   * 测试用例：创建模拟教师偏好
   */
  it('应该正确创建模拟教师偏好数据', () => {
    const preference = createMockTeacherPreference({
      teacher_id: 100,
      time_bias: 1,
      weight: 2,
    });

    expect(preference).toEqual({
      teacher_id: 100,
      preferred_slots: '0',
      time_bias: 1,
      weight: 2,
      blocked_slots: '0',
      teaching_group_id: null,
    });
  });

  /**
   * 测试用例：创建模拟课程配置
   */
  it('应该正确创建模拟课程配置数据', () => {
    const config = createMockSubjectConfig({
      id: 'physics',
      name: '物理',
      is_major_subject: false,
    });

    expect(config).toEqual({
      id: 'physics',
      name: '物理',
      forbidden_slots: '0',
      allow_double_session: true,
      venue_id: null,
      is_major_subject: false,
    });
  });
});

/**
 * 测试套件：钩子函数测试
 *
 * 演示如何使用测试钩子
 */
describe('钩子函数测试', () => {
  let counter: number;

  /**
   * 在所有测试前执行一次
   */
  beforeAll(() => {
    testLog('开始测试套件');
  });

  /**
   * 在每个测试前执行
   */
  beforeEach(() => {
    counter = 0;
    testLog('初始化测试用例');
  });

  /**
   * 在每个测试后执行
   */
  afterEach(() => {
    testLog('清理测试用例');
  });

  /**
   * 在所有测试后执行一次
   */
  afterAll(() => {
    testLog('结束测试套件');
  });

  /**
   * 测试用例 1
   */
  it('应该从 0 开始计数', () => {
    expect(counter).toBe(0);
    counter++;
  });

  /**
   * 测试用例 2
   */
  it('应该在每个测试前重置计数器', () => {
    // 由于 beforeEach 重置了 counter，这里应该是 0
    expect(counter).toBe(0);
    counter += 2;
  });
});

/**
 * 测试套件：错误处理测试
 *
 * 演示如何测试错误情况
 */
describe('错误处理测试', () => {
  /**
   * 测试用例：捕获同步错误
   */
  it('应该正确捕获同步错误', () => {
    const throwError = () => {
      throw new Error('测试错误');
    };

    expect(throwError).toThrow('测试错误');
    expect(throwError).toThrow(Error);
  });

  /**
   * 测试用例：捕获异步错误
   */
  it('应该正确捕获异步错误', async () => {
    const asyncThrowError = async () => {
      throw new Error('异步错误');
    };

    await expect(asyncThrowError()).rejects.toThrow('异步错误');
  });

  /**
   * 测试用例：验证错误类型
   */
  it('应该正确验证错误类型', () => {
    class CustomError extends Error {
      constructor(message: string) {
        super(message);
        this.name = 'CustomError';
      }
    }

    const throwCustomError = () => {
      throw new CustomError('自定义错误');
    };

    expect(throwCustomError).toThrow(CustomError);
    expect(throwCustomError).toThrow('自定义错误');
  });
});

/**
 * 测试套件：条件测试
 *
 * 演示如何根据条件跳过或只运行某些测试
 */
describe('条件测试', () => {
  /**
   * 跳过测试
   *
   * 使用 it.skip 跳过某个测试
   */
  it.skip('这个测试将被跳过', () => {
    expect(true).toBe(false); // 不会执行
  });

  /**
   * 只运行这个测试
   *
   * 使用 it.only 只运行某个测试（调试时使用）
   * 注意：提交代码前应该移除 .only
   */
  // it.only('只运行这个测试', () => {
  //   expect(true).toBe(true);
  // });

  /**
   * 待办测试
   *
   * 使用 it.todo 标记待实现的测试
   */
  it.todo('待实现：复杂的业务逻辑测试');
});

/**
 * 测试套件：快照测试
 *
 * 演示如何使用快照测试
 */
describe('快照测试', () => {
  /**
   * 测试用例：对象快照
   */
  it('应该匹配对象快照', () => {
    const data = {
      id: 1,
      name: '测试数据',
      items: [1, 2, 3],
    };

    expect(data).toMatchSnapshot();
  });

  /**
   * 测试用例：内联快照
   */
  it('应该匹配内联快照', () => {
    const result = { status: 'success', code: 200 };

    expect(result).toMatchInlineSnapshot(`
      {
        "code": 200,
        "status": "success",
      }
    `);
  });
});
