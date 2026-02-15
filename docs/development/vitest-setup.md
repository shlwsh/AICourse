# Vitest 单元测试环境配置文档

## 概述

本文档记录了排课系统 Vitest 单元测试环境的配置过程和使用说明。

## 配置完成时间

2024年（任务 1.2.5）

## 配置内容

### 1. 核心配置文件

#### vitest.config.ts

主配置文件，包含以下关键配置：

- **测试环境**：jsdom（模拟浏览器环境）
- **全局 API**：启用全局测试 API（describe, it, expect 等）
- **代码覆盖率**：使用 v8 引擎，目标覆盖率 80%
- **路径别名**：与 tsconfig.json 保持一致
- **超时设置**：测试超时 10 秒
- **报告格式**：text、html、json、lcov

#### tests/unit/setup.ts

全局测试设置文件，提供：

- Vue Test Utils 全局配置
- Tauri API 模拟
- Element Plus 组件模拟
- localStorage/sessionStorage 模拟
- 测试工具函数（createTimeSlotMask、createMockTeacherPreference 等）

### 2. 示例测试文件

#### tests/unit/example.test.ts

展示了各种测试场景：

- 基础功能测试（断言、类型检查）
- 异步功能测试（Promise、async/await）
- 模拟对象测试（函数模拟、异步模拟）
- 测试工具函数使用
- 钩子函数使用（beforeEach、afterEach）
- 错误处理测试
- 条件测试（skip、only、todo）
- 快照测试

#### tests/unit/utils/logger.test.ts

实际的工具函数测试示例：

- 日志级别过滤
- 日志格式化
- 错误对象记录
- 结构化日志
- 性能日志
- 日志上下文
- 敏感信息过滤
- 日志批处理

### 3. 文档

#### tests/unit/README.md

详细的测试指南，包含：

- 运行测试的各种命令
- 编写测试的最佳实践
- 常用断言方法
- 代码覆盖率说明
- 常见问题解答

## 安装的依赖

```json
{
  "devDependencies": {
    "vitest": "^1.0.0",
    "@vitest/ui": "^1.0.0",
    "@vitest/coverage-v8": "^4.0.18",
    "jsdom": "^28.0.0",
    "@vue/test-utils": "^2.4.6"
  }
}
```

## 可用的测试命令

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

## 测试结果

初始测试运行结果：

```
✓ tests/unit/utils/logger.test.ts (10)
  ✓ 日志工具测试 (7)
  ✓ 日志工具函数 (3)

✓ tests/unit/example.test.ts (20)
  ✓ 基础功能测试 (2)
  ✓ 异步功能测试 (3)
  ✓ 模拟对象测试 (3)
  ✓ 测试工具函数 (3)
  ✓ 钩子函数测试 (2)
  ✓ 错误处理测试 (3)
  ↓ 条件测试 (2) [skipped]
  ✓ 快照测试 (2)

Test Files  2 passed (2)
Tests  28 passed | 1 skipped | 1 todo (30)
Duration  2.84s
```

## 代码覆盖率配置

### 覆盖率目标

根据项目规范，设置了以下覆盖率阈值：

- **行覆盖率**：80%
- **函数覆盖率**：80%
- **分支覆盖率**：75%
- **语句覆盖率**：80%

### 覆盖率报告

运行 `bun run test:unit --coverage` 后，报告将生成在：

- **HTML 报告**：`tests/reports/coverage/index.html`
- **JSON 报告**：`tests/reports/coverage/coverage-final.json`
- **LCOV 报告**：`tests/reports/coverage/lcov.info`

## 测试工具函数

### 时间相关

```typescript
// 等待指定时间
await sleep(100);

// 等待 Vue 组件更新
await flushPromises();
```

### 数据创建

```typescript
// 创建时间槽位掩码
const mask = createTimeSlotMask([[0, 0], [0, 1]]);

// 创建模拟教师偏好
const preference = createMockTeacherPreference({
  teacher_id: 100,
  time_bias: 1,
});

// 创建模拟课程配置
const config = createMockSubjectConfig({
  id: 'physics',
  name: '物理',
});

// 创建模拟教学计划
const curriculum = createMockClassCurriculum({
  class_id: 1,
  subject_id: 'math',
});

// 创建模拟课表条目
const entry = createMockScheduleEntry({
  class_id: 1,
  teacher_id: 1,
});
```

### 日志记录

```typescript
// 测试日志（需要设置 VITEST_LOG=true）
testLog('测试信息', { data: 'value' });
```

## 模拟对象

### Tauri API

Tauri 命令已在全局设置中模拟：

```typescript
import { invoke } from '@tauri-apps/api/tauri';

// 自动模拟，返回空对象
const result = await invoke('command_name', { args });
```

如需自定义行为：

```typescript
import { vi } from 'vitest';
import { invoke } from '@tauri-apps/api/tauri';

vi.mocked(invoke).mockResolvedValue({ data: 'custom' });
```

### Element Plus

消息提示已在全局设置中模拟：

```typescript
import { ElMessage } from 'element-plus';

ElMessage.success('成功'); // 自动模拟，输出到控制台
```

### Vue Router

路由对象已在全局设置中模拟：

```typescript
// 在组件测试中可以直接使用
this.$router.push('/path');
this.$route.params.id;
```

## 最佳实践

### 1. 测试文件命名

- 单元测试文件：`*.test.ts` 或 `*.spec.ts`
- 放置位置：`tests/unit/` 或与源文件同目录

### 2. 测试结构

使用 AAA 模式（Arrange-Act-Assert）：

```typescript
it('应该做某事', () => {
  // Arrange - 准备测试数据
  const input = 1 + 1;
  
  // Act - 执行被测试的操作
  const result = input;
  
  // Assert - 验证结果
  expect(result).toBe(2);
});
```

### 3. 测试独立性

每个测试应该独立运行，不依赖其他测试：

```typescript
describe('计数器', () => {
  let counter: Counter;
  
  beforeEach(() => {
    counter = new Counter(); // 每个测试前重新创建
  });
  
  it('测试1', () => {
    expect(counter.value).toBe(0);
  });
  
  it('测试2', () => {
    expect(counter.value).toBe(0); // 不受测试1影响
  });
});
```

### 4. 测试命名

使用清晰、描述性的中文名称：

```typescript
// ✅ 好的命名
it('应该在用户点击按钮时触发事件', () => {});

// ❌ 不好的命名
it('测试1', () => {});
```

### 5. 避免测试实现细节

测试行为而不是实现：

```typescript
// ✅ 测试行为
it('应该在点击后显示消息', async () => {
  const wrapper = mount(Component);
  await wrapper.find('button').trigger('click');
  expect(wrapper.text()).toContain('消息已发送');
});

// ❌ 测试实现
it('应该调用 handleClick 方法', () => {
  // 不推荐
});
```

## 与 Playwright 集成测试的区别

| 特性 | Vitest 单元测试 | Playwright 集成测试 |
|------|----------------|-------------------|
| **测试范围** | 单个函数、类、组件 | 完整的用户流程 |
| **运行环境** | jsdom（模拟浏览器） | 真实浏览器 |
| **执行速度** | 快速（毫秒级） | 较慢（秒级） |
| **测试目的** | 验证代码逻辑正确性 | 验证系统集成和用户体验 |
| **模拟程度** | 高度模拟外部依赖 | 最小化模拟，使用真实环境 |
| **适用场景** | 工具函数、状态管理、组件逻辑 | 页面交互、表单提交、导航流程 |

## 日志记录规范

根据项目规则，测试中的日志记录应该：

1. **使用标准日志级别**：DEBUG、INFO、WARN、ERROR
2. **记录关键操作**：测试开始、测试结束、重要断言
3. **记录错误信息**：测试失败时的详细信息
4. **不记录敏感信息**：避免在日志中输出密码、密钥等

示例：

```typescript
import { testLog } from '../setup';

describe('功能测试', () => {
  beforeEach(() => {
    testLog('开始测试用例');
  });
  
  it('应该正确处理数据', () => {
    testLog('准备测试数据');
    const data = prepareData();
    
    testLog('执行操作');
    const result = processData(data);
    
    testLog('验证结果', { result });
    expect(result).toBeDefined();
  });
  
  afterEach(() => {
    testLog('测试用例完成');
  });
});
```

## 故障排查

### 问题：测试超时

**解决方案**：增加超时时间

```typescript
it('长时间运行的测试', async () => {
  // 测试代码
}, 30000); // 30秒超时
```

### 问题：模拟不生效

**解决方案**：确保在导入前模拟

```typescript
// ✅ 正确
vi.mock('@/api/schedule');
import { getSchedule } from '@/api/schedule';

// ❌ 错误
import { getSchedule } from '@/api/schedule';
vi.mock('@/api/schedule'); // 太晚了
```

### 问题：快照测试失败

**解决方案**：更新快照

```bash
bun run test:unit -u
```

### 问题：覆盖率不达标

**解决方案**：

1. 查看覆盖率报告找出未覆盖的代码
2. 添加针对性的测试用例
3. 考虑是否有不必要的代码可以删除

## 下一步

完成 Vitest 配置后，可以开始：

1. 为现有的工具函数编写单元测试
2. 为 Vue 组件编写组件测试
3. 为状态管理（Pinia stores）编写测试
4. 为 API 层编写测试
5. 持续提高代码覆盖率

## 参考资源

- [Vitest 官方文档](https://vitest.dev/)
- [Vue Test Utils 文档](https://test-utils.vuejs.org/)
- [测试最佳实践](https://github.com/goldbergyoni/javascript-testing-best-practices)
- [项目测试指南](../tests/unit/README.md)

## 总结

Vitest 单元测试环境已成功配置，包括：

✅ 完整的配置文件（vitest.config.ts）  
✅ 全局测试设置（setup.ts）  
✅ 示例测试文件（example.test.ts、logger.test.ts）  
✅ 详细的使用文档（README.md）  
✅ 代码覆盖率配置（80% 目标）  
✅ 测试工具函数  
✅ 模拟对象配置  
✅ 所有测试通过验证  

系统现在具备完善的单元测试能力，可以支持后续的开发工作。
