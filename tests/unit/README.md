# Vitest 单元测试指南

## 简介

本目录包含排课系统的单元测试。我们使用 [Vitest](https://vitest.dev/) 作为测试框架，它是一个快速、现代的测试运行器，专为 Vite 项目优化。

## 目录结构

```
tests/unit/
├── README.md           # 本文件
├── setup.ts            # 全局测试设置
├── example.test.ts     # 示例测试文件
└── utils/              # 工具函数测试
    └── logger.test.ts  # 日志工具测试
```

## 运行测试

### 基本命令

```bash
# 运行所有单元测试
bun run test:unit

# 监视模式（文件变化时自动重新运行）
bun run test

# 运行特定测试文件
bun run test:unit example

# 运行特定测试套件
bun run test:unit -t "基础功能测试"

# 生成代码覆盖率报告
bun run test:unit --coverage

# 查看测试 UI
bun run test --ui
```

### 调试测试

```bash
# 在浏览器中调试测试
bun run test --ui

# 只运行失败的测试
bun run test:unit --reporter=verbose --bail

# 显示详细输出
bun run test:unit --reporter=verbose
```

## 编写测试

### 基本测试结构

```typescript
import { describe, it, expect } from 'vitest';

describe('功能模块名称', () => {
  it('应该做某事', () => {
    // 准备（Arrange）
    const input = 1 + 1;
    
    // 执行（Act）
    const result = input;
    
    // 断言（Assert）
    expect(result).toBe(2);
  });
});
```

### 测试 Vue 组件

```typescript
import { mount } from '@vue/test-utils';
import MyComponent from '@/components/MyComponent.vue';

describe('MyComponent', () => {
  it('应该正确渲染', () => {
    const wrapper = mount(MyComponent, {
      props: {
        title: '测试标题',
      },
    });
    
    expect(wrapper.text()).toContain('测试标题');
  });
  
  it('应该响应用户交互', async () => {
    const wrapper = mount(MyComponent);
    
    await wrapper.find('button').trigger('click');
    
    expect(wrapper.emitted('click')).toBeTruthy();
  });
});
```

### 测试异步代码

```typescript
import { describe, it, expect } from 'vitest';

describe('异步功能', () => {
  it('应该正确处理 Promise', async () => {
    const promise = Promise.resolve('success');
    await expect(promise).resolves.toBe('success');
  });
  
  it('应该正确处理异步函数', async () => {
    const asyncFn = async () => {
      return 'result';
    };
    
    const result = await asyncFn();
    expect(result).toBe('result');
  });
});
```

### 使用模拟对象

```typescript
import { vi } from 'vitest';

describe('模拟测试', () => {
  it('应该模拟函数调用', () => {
    const mockFn = vi.fn();
    mockFn.mockReturnValue('mocked');
    
    const result = mockFn('arg');
    
    expect(result).toBe('mocked');
    expect(mockFn).toHaveBeenCalledWith('arg');
  });
  
  it('应该模拟模块', async () => {
    vi.mock('@/api/schedule', () => ({
      getSchedule: vi.fn(() => Promise.resolve({ data: [] })),
    }));
    
    const { getSchedule } = await import('@/api/schedule');
    const result = await getSchedule();
    
    expect(result).toEqual({ data: [] });
  });
});
```

### 测试钩子

```typescript
import { describe, it, beforeEach, afterEach } from 'vitest';

describe('钩子测试', () => {
  let data: any;
  
  beforeEach(() => {
    // 在每个测试前执行
    data = { count: 0 };
  });
  
  afterEach(() => {
    // 在每个测试后执行
    data = null;
  });
  
  it('测试1', () => {
    expect(data.count).toBe(0);
  });
  
  it('测试2', () => {
    expect(data.count).toBe(0);
  });
});
```

## 测试最佳实践

### 1. 测试命名

使用清晰、描述性的测试名称：

```typescript
// ✅ 好的命名
it('应该在用户点击按钮时触发事件', () => {});
it('应该在输入无效时显示错误消息', () => {});

// ❌ 不好的命名
it('测试1', () => {});
it('按钮测试', () => {});
```

### 2. 测试独立性

每个测试应该独立运行，不依赖其他测试：

```typescript
// ✅ 好的做法
describe('计数器', () => {
  it('应该从0开始', () => {
    const counter = new Counter();
    expect(counter.value).toBe(0);
  });
  
  it('应该正确增加', () => {
    const counter = new Counter();
    counter.increment();
    expect(counter.value).toBe(1);
  });
});

// ❌ 不好的做法
describe('计数器', () => {
  const counter = new Counter(); // 共享状态
  
  it('应该从0开始', () => {
    expect(counter.value).toBe(0);
  });
  
  it('应该正确增加', () => {
    counter.increment(); // 依赖前一个测试
    expect(counter.value).toBe(1);
  });
});
```

### 3. 测试覆盖率

追求有意义的测试覆盖率，而不是100%：

- 重点测试核心业务逻辑
- 测试边界条件和错误情况
- 不要为了覆盖率而测试简单的 getter/setter

### 4. 使用测试工具函数

利用 `setup.ts` 中的工具函数简化测试：

```typescript
import { createMockTeacherPreference } from '../setup';

it('应该正确处理教师偏好', () => {
  const preference = createMockTeacherPreference({
    teacher_id: 100,
    time_bias: 1,
  });
  
  // 测试逻辑...
});
```

### 5. 避免测试实现细节

测试行为而不是实现：

```typescript
// ✅ 好的做法 - 测试行为
it('应该在点击后显示消息', async () => {
  const wrapper = mount(Component);
  await wrapper.find('button').trigger('click');
  expect(wrapper.text()).toContain('消息已发送');
});

// ❌ 不好的做法 - 测试实现
it('应该调用 handleClick 方法', async () => {
  const wrapper = mount(Component);
  const spy = vi.spyOn(wrapper.vm, 'handleClick');
  await wrapper.find('button').trigger('click');
  expect(spy).toHaveBeenCalled();
});
```

## 常用断言

### 基本断言

```typescript
expect(value).toBe(expected);           // 严格相等 (===)
expect(value).toEqual(expected);        // 深度相等
expect(value).toBeTruthy();             // 真值
expect(value).toBeFalsy();              // 假值
expect(value).toBeNull();               // null
expect(value).toBeUndefined();          // undefined
expect(value).toBeDefined();            // 已定义
```

### 数值断言

```typescript
expect(value).toBeGreaterThan(3);       // > 3
expect(value).toBeGreaterThanOrEqual(3);// >= 3
expect(value).toBeLessThan(5);          // < 5
expect(value).toBeLessThanOrEqual(5);   // <= 5
expect(value).toBeCloseTo(0.3);         // 浮点数近似相等
```

### 字符串断言

```typescript
expect(string).toMatch(/pattern/);      // 正则匹配
expect(string).toContain('substring');  // 包含子串
expect(string).toHaveLength(5);         // 长度为5
```

### 数组断言

```typescript
expect(array).toContain(item);          // 包含元素
expect(array).toHaveLength(3);          // 长度为3
expect(array).toEqual([1, 2, 3]);       // 数组相等
```

### 对象断言

```typescript
expect(obj).toHaveProperty('key');      // 有属性
expect(obj).toHaveProperty('key', val); // 属性值相等
expect(obj).toMatchObject({ key: val });// 部分匹配
```

### 异常断言

```typescript
expect(() => fn()).toThrow();           // 抛出异常
expect(() => fn()).toThrow(Error);      // 抛出特定类型
expect(() => fn()).toThrow('message');  // 抛出特定消息
```

### Promise 断言

```typescript
await expect(promise).resolves.toBe(value);  // 成功
await expect(promise).rejects.toThrow();     // 失败
```

## 代码覆盖率

### 查看覆盖率报告

```bash
# 生成覆盖率报告
bun run test:unit --coverage

# 打开 HTML 报告
open tests/reports/coverage/index.html
```

### 覆盖率目标

根据项目配置，我们的覆盖率目标是：

- 行覆盖率：80%
- 函数覆盖率：80%
- 分支覆盖率：75%
- 语句覆盖率：80%

## 常见问题

### Q: 如何跳过某个测试？

```typescript
it.skip('暂时跳过这个测试', () => {
  // 不会执行
});
```

### Q: 如何只运行某个测试？

```typescript
it.only('只运行这个测试', () => {
  // 只有这个测试会运行
});
```

### Q: 如何测试私有方法？

不要测试私有方法。测试公共 API 的行为，私有方法会被间接测试到。

### Q: 如何处理测试超时？

```typescript
it('长时间运行的测试', async () => {
  // 测试代码
}, 30000); // 设置超时为 30 秒
```

### Q: 如何模拟 Tauri 命令？

Tauri 命令已在 `setup.ts` 中全局模拟。如需自定义行为：

```typescript
import { vi } from 'vitest';
import { invoke } from '@tauri-apps/api/tauri';

vi.mocked(invoke).mockResolvedValue({ data: 'test' });
```

## 参考资源

- [Vitest 官方文档](https://vitest.dev/)
- [Vue Test Utils 文档](https://test-utils.vuejs.org/)
- [测试最佳实践](https://github.com/goldbergyoni/javascript-testing-best-practices)

## 贡献指南

编写新测试时，请遵循以下规范：

1. 使用中文编写测试描述
2. 遵循 AAA 模式（Arrange-Act-Assert）
3. 保持测试简单和专注
4. 添加必要的注释说明测试意图
5. 确保测试可以独立运行
6. 提交前运行所有测试确保通过

## 日志记录

在测试中使用 `testLog` 函数记录重要信息：

```typescript
import { testLog } from '../setup';

it('测试用例', () => {
  testLog('开始测试');
  // 测试代码
  testLog('测试完成');
});
```

启用测试日志：

```bash
VITEST_LOG=true bun run test:unit
```
