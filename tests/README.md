# 测试文档

## 概述

本目录包含排课系统的所有测试代码，包括单元测试和集成测试。

## 目录结构

```
tests/
├── fixtures/           # 测试 Fixtures（可重用的测试设置）
│   └── test-fixtures.ts
├── helpers/            # 测试辅助工具
│   ├── global-setup.ts     # 全局测试设置
│   ├── global-teardown.ts  # 全局测试清理
│   └── test-logger.ts      # 测试日志记录器
├── integration/        # 集成测试（Playwright）
│   └── example.spec.ts     # 示例测试文件
├── unit/              # 单元测试（Vitest）
└── reports/           # 测试报告输出目录
    ├── html/          # HTML 格式报告
    ├── screenshots/   # 失败时的截图
    ├── videos/        # 失败时的视频录制
    └── traces/        # 失败时的追踪文件
```

## 测试框架

### 集成测试：Playwright

用于端到端测试和 UI 测试。

**特性：**
- 真实浏览器环境测试
- 支持多浏览器（Chromium、Firefox、WebKit）
- 自动等待和重试机制
- 丰富的调试工具（截图、视频、追踪）

### 单元测试：Vitest

用于单元测试和组件测试。

**特性：**
- 快速执行
- 与 Vite 深度集成
- 兼容 Jest API
- 支持 TypeScript

## 运行测试

### 运行所有集成测试

```bash
bun run test:integration
```

### 运行单个测试文件

```bash
bun run test:integration tests/integration/example.spec.ts
```

### 运行特定测试用例

```bash
bun run test:integration -g "应用能够成功启动"
```

### 调试模式运行

```bash
bun run test:integration --debug
```

### UI 模式运行（交互式）

```bash
bun run test:integration --ui
```

### 查看测试报告

```bash
# 生成并打开 HTML 报告
bunx playwright show-report tests/reports/html
```

## 编写测试

### 测试文件命名规范

- 集成测试：`*.spec.ts`
- 单元测试：`*.test.ts`

### 测试用例编号规范

根据项目规则，测试用例必须按顺序执行，因此需要明确的编号：

```typescript
test.describe('1. 功能模块名称', () => {
  test('1.1 具体测试场景', async ({ page, logger }) => {
    // 测试代码
  });
  
  test('1.2 另一个测试场景', async ({ page, logger }) => {
    // 测试代码
  });
});

test.describe('2. 另一个功能模块', () => {
  test('2.1 测试场景', async ({ page, logger }) => {
    // 测试代码
  });
});
```

### 使用自定义 Fixtures

```typescript
import { test, expect } from '../fixtures/test-fixtures';

test('测试用例', async ({ page, logger, timer }) => {
  // logger: 自动记录测试日志
  logger.info('开始测试');
  
  // timer: 测试计时器
  const elapsed = timer.elapsed();
  logger.info(`已执行 ${elapsed}ms`);
  
  // page: Playwright 页面对象
  await page.goto('/');
  
  // expect: 断言库
  await expect(page).toHaveTitle(/排课系统/);
});
```

### 日志记录最佳实践

根据项目规则，必须实现完善的日志记录：

```typescript
test('测试用例', async ({ page, logger }) => {
  // 1. 记录测试步骤
  logger.info('步骤 1: 导航到页面');
  await page.goto('/schedule');
  
  // 2. 记录关键操作
  logger.info('步骤 2: 点击生成课表按钮');
  await page.click('[data-testid="generate-button"]');
  
  // 3. 记录验证点
  logger.info('步骤 3: 验证课表生成成功');
  const result = await page.locator('.schedule-result');
  await expect(result).toBeVisible();
  
  // 4. 记录错误（如果有）
  try {
    // 可能失败的操作
  } catch (error) {
    logger.error('操作失败', error);
    throw error;
  }
});
```

### Page Object Model 模式

推荐使用 Page Object Model 模式组织测试代码：

```typescript
// pages/schedule-page.ts
export class SchedulePage {
  constructor(private page: Page) {}
  
  async goto() {
    await this.page.goto('/schedule');
  }
  
  async generateSchedule() {
    await this.page.click('[data-testid="generate-button"]');
  }
  
  async getScheduleResult() {
    return this.page.locator('.schedule-result');
  }
}

// 在测试中使用
test('生成课表', async ({ page, logger }) => {
  const schedulePage = new SchedulePage(page);
  
  await schedulePage.goto();
  await schedulePage.generateSchedule();
  
  const result = await schedulePage.getScheduleResult();
  await expect(result).toBeVisible();
});
```

## 测试执行流程

根据项目规则，集成测试必须遵循以下流程：

### 1. 顺序执行

测试用例按照编号顺序依次执行，不并行。

配置已在 `playwright.config.ts` 中设置：
```typescript
fullyParallel: false,
workers: 1,
```

### 2. 快速失败

一旦某个测试用例失败，立即停止后续测试。

配置已在 `playwright.config.ts` 中设置：
```typescript
maxFailures: 1,
```

### 3. 失败处理流程

当测试失败时：

1. **查看日志**：检查 `logs/test/` 目录下的日志文件
2. **查看截图**：检查 `tests/reports/screenshots/` 目录
3. **查看视频**：检查 `tests/reports/videos/` 目录
4. **查看追踪**：使用 `bunx playwright show-trace` 查看详细追踪

```bash
# 查看追踪文件
bunx playwright show-trace tests/reports/traces/trace.zip
```

4. **分析原因**：根据日志和调试信息分析失败原因
5. **修正代码**：修正代码或测试用例
6. **重新运行**：从失败的测试用例重新开始执行

```bash
# 只运行失败的测试
bun run test:integration --last-failed
```

## 环境变量

测试支持以下环境变量：

- `TEST_BASE_URL`: 测试基础 URL（默认：http://localhost:1420）
- `LOG_LEVEL`: 日志级别（DEBUG、INFO、WARN、ERROR，默认：INFO）
- `KEEP_TEST_DATA`: 是否保留测试数据（true/false，默认：false）
- `CI`: 是否在 CI 环境中运行（true/false）

示例：

```bash
# 设置日志级别为 DEBUG
LOG_LEVEL=DEBUG bun run test:integration

# 保留测试数据用于调试
KEEP_TEST_DATA=true bun run test:integration
```

## 调试技巧

### 1. 使用 Playwright Inspector

```bash
bun run test:integration --debug
```

### 2. 使用 console.log

```typescript
test('测试', async ({ page }) => {
  console.log('当前 URL:', page.url());
  console.log('页面标题:', await page.title());
});
```

### 3. 使用 page.pause()

```typescript
test('测试', async ({ page }) => {
  await page.goto('/');
  await page.pause(); // 暂停执行，打开 Inspector
});
```

### 4. 查看元素选择器

```bash
# 打开选择器生成器
bunx playwright codegen http://localhost:1420
```

### 5. 慢速执行

```bash
# 每个操作延迟 1000ms
bun run test:integration --slow-mo=1000
```

## 持续集成

在 CI 环境中运行测试：

```bash
# CI 环境会自动设置 CI=true
bun run test:integration --reporter=json
```

测试结果会输出到 `tests/reports/test-results.json`。

## 最佳实践

1. **测试隔离**：每个测试应该独立，不依赖其他测试的状态
2. **明确的断言**：使用清晰的断言消息
3. **等待机制**：使用 Playwright 的自动等待，避免硬编码延迟
4. **选择器策略**：优先使用 `data-testid` 属性
5. **日志记录**：记录关键步骤和验证点
6. **错误处理**：捕获并记录错误信息
7. **性能考虑**：避免不必要的等待和操作

## 常见问题

### Q: 测试运行很慢怎么办？

A: 
- 检查是否有不必要的等待
- 使用 `networkidle` 而不是固定延迟
- 考虑使用 mock 数据

### Q: 测试在 CI 中失败但本地通过？

A:
- 检查环境差异（浏览器版本、屏幕尺寸等）
- 增加超时时间
- 查看 CI 日志和截图

### Q: 如何测试需要登录的页面？

A:
- 使用 `storageState` 保存登录状态
- 在 `beforeEach` 中恢复登录状态

### Q: 如何处理动态内容？

A:
- 使用 Playwright 的自动等待
- 使用 `waitForSelector` 等待元素出现
- 使用正则表达式匹配动态文本

## 参考资源

- [Playwright 官方文档](https://playwright.dev/)
- [Vitest 官方文档](https://vitest.dev/)
- [测试最佳实践](https://playwright.dev/docs/best-practices)
