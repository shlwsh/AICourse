# Playwright 测试环境配置说明

## 概述

本文档说明排课系统的 Playwright 测试环境配置，包括配置细节、使用方法和最佳实践。

## 配置完成情况

✅ **已完成的配置项：**

1. **Playwright 配置文件** (`playwright.config.ts`)
   - 顺序执行配置（fullyParallel: false）
   - 快速失败机制（maxFailures: 1）
   - 单 worker 执行（workers: 1）
   - 完整的超时配置
   - 多浏览器支持
   - 自动启动开发服务器

2. **全局设置和清理**
   - `tests/helpers/global-setup.ts` - 测试前初始化
   - `tests/helpers/global-teardown.ts` - 测试后清理

3. **测试日志记录器** (`tests/helpers/test-logger.ts`)
   - 支持多种日志级别（DEBUG、INFO、WARN、ERROR）
   - 自动添加时间戳和模块名称
   - 同时输出到控制台和文件
   - 测试用例执行追踪

4. **测试 Fixtures** (`tests/fixtures/test-fixtures.ts`)
   - 自动日志记录
   - 测试数据清理
   - 测试计时器
   - 辅助函数（wait、retry、randomString 等）

5. **示例测试文件** (`tests/integration/example.spec.ts`)
   - 展示测试编写规范
   - 演示日志记录用法
   - 包含多种测试场景

6. **测试文档** (`tests/README.md`)
   - 完整的使用说明
   - 最佳实践指南
   - 常见问题解答

7. **验证脚本** (`scripts/verify-playwright.ts`)
   - 自动检查配置完整性
   - 验证依赖安装
   - 检查目录结构

## 核心特性

### 1. 顺序执行和快速失败

根据项目规则要求，测试配置确保：

```typescript
// playwright.config.ts
export default defineConfig({
  fullyParallel: false,  // 禁用并行执行
  maxFailures: 1,        // 第一个失败后停止
  workers: 1,            // 单个 worker 顺序执行
});
```

**效果：**
- 测试按照编号顺序依次执行
- 一旦某个测试失败，立即停止后续测试
- 符合项目规则第 4 条的要求

### 2. 完善的日志记录

每个测试自动记录：

```typescript
test('测试用例', async ({ page, logger }) => {
  logger.info('开始测试步骤');
  // 测试代码
  logger.info('验证结果');
});
```

**日志输出：**
- 控制台：带颜色的实时输出
- 文件：`logs/test/test-YYYY-MM-DD.log`
- 格式：`[时间戳] [级别] [模块] 消息`

### 3. 自动化测试环境

**全局设置（测试前）：**
- 创建必要的目录结构
- 初始化测试数据库
- 设置环境变量
- 记录配置信息

**全局清理（测试后）：**
- 清理测试数据
- 生成测试摘要
- 输出统计信息

### 4. 丰富的调试工具

**失败时自动保存：**
- 截图：`tests/reports/screenshots/`
- 视频：`tests/reports/videos/`
- 追踪：`tests/reports/traces/`

**查看方式：**
```bash
# 查看 HTML 报告
bun run test:integration:report

# 查看追踪文件
bunx playwright show-trace tests/reports/traces/trace.zip
```

## 使用指南

### 安装浏览器

首次使用前需要安装浏览器：

```bash
bunx playwright install chromium
```

### 运行测试

```bash
# 运行所有集成测试
bun run test:integration

# UI 模式（交互式）
bun run test:integration:ui

# 调试模式
bun run test:integration:debug

# 有头模式（显示浏览器窗口）
bun run test:integration:headed

# 查看测试报告
bun run test:integration:report
```

### 编写测试

#### 1. 创建测试文件

在 `tests/integration/` 目录下创建 `*.spec.ts` 文件：

```typescript
import { test, expect } from '../fixtures/test-fixtures';

test.describe('1. 功能模块', () => {
  test('1.1 测试场景', async ({ page, logger }) => {
    logger.info('步骤 1: 导航到页面');
    await page.goto('/');
    
    logger.info('步骤 2: 验证元素');
    await expect(page).toHaveTitle(/排课系统/);
    
    logger.info('测试完成');
  });
});
```

#### 2. 使用日志记录

```typescript
test('测试用例', async ({ page, logger }) => {
  // INFO 级别：记录正常步骤
  logger.info('执行操作');
  
  // DEBUG 级别：记录详细信息
  logger.debug('详细数据', { key: 'value' });
  
  // WARN 级别：记录警告
  logger.warn('可能的问题');
  
  // ERROR 级别：记录错误
  try {
    // 可能失败的操作
  } catch (error) {
    logger.error('操作失败', error);
    throw error;
  }
});
```

#### 3. 使用测试编号

按照项目规则，测试必须有明确的编号：

```typescript
test.describe('1. 应用启动', () => {
  test('1.1 应用能够成功启动', async ({ page, logger }) => {
    // 测试代码
  });
  
  test('1.2 健康检查正常', async ({ page, logger }) => {
    // 测试代码
  });
});

test.describe('2. 用户登录', () => {
  test('2.1 正确的凭据能够登录', async ({ page, logger }) => {
    // 测试代码
  });
});
```

### 调试测试

#### 方法 1：使用 Playwright Inspector

```bash
bun run test:integration:debug
```

#### 方法 2：使用 page.pause()

```typescript
test('调试测试', async ({ page }) => {
  await page.goto('/');
  await page.pause(); // 暂停并打开 Inspector
});
```

#### 方法 3：查看失败截图和视频

测试失败时自动保存在：
- `tests/reports/screenshots/`
- `tests/reports/videos/`

#### 方法 4：查看追踪文件

```bash
bunx playwright show-trace tests/reports/traces/trace.zip
```

## 配置详解

### 超时配置

```typescript
{
  timeout: 60000,           // 单个测试超时：60秒
  expect: {
    timeout: 10000,         // 断言超时：10秒
  },
  use: {
    actionTimeout: 15000,   // 操作超时：15秒
    navigationTimeout: 30000, // 导航超时：30秒
  },
}
```

### 浏览器配置

默认使用 Chromium，可以启用其他浏览器：

```typescript
projects: [
  { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  // { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
  // { name: 'webkit', use: { ...devices['Desktop Safari'] } },
]
```

### 报告配置

生成三种格式的报告：

```typescript
reporter: [
  ['html', { outputFolder: 'tests/reports/html' }],
  ['list'],  // 控制台输出
  ['json', { outputFile: 'tests/reports/test-results.json' }],
]
```

## 环境变量

支持的环境变量：

| 变量 | 说明 | 默认值 |
|------|------|--------|
| `TEST_BASE_URL` | 测试基础 URL | `http://localhost:1420` |
| `LOG_LEVEL` | 日志级别 | `INFO` |
| `KEEP_TEST_DATA` | 是否保留测试数据 | `false` |
| `CI` | 是否在 CI 环境 | `false` |

使用示例：

```bash
# 设置日志级别为 DEBUG
LOG_LEVEL=DEBUG bun run test:integration

# 保留测试数据用于调试
KEEP_TEST_DATA=true bun run test:integration
```

## 目录结构

```
tests/
├── fixtures/              # 测试 Fixtures
│   └── test-fixtures.ts
├── helpers/               # 辅助工具
│   ├── global-setup.ts
│   ├── global-teardown.ts
│   └── test-logger.ts
├── integration/           # 集成测试
│   └── example.spec.ts
├── unit/                  # 单元测试
├── reports/               # 测试报告
│   ├── html/             # HTML 报告
│   ├── screenshots/      # 截图
│   ├── videos/           # 视频
│   └── traces/           # 追踪文件
└── README.md             # 测试文档
```

## 最佳实践

### 1. 测试隔离

每个测试应该独立，不依赖其他测试的状态：

```typescript
test('测试 A', async ({ page }) => {
  // 完整的设置和清理
});

test('测试 B', async ({ page }) => {
  // 不依赖测试 A 的结果
});
```

### 2. 明确的断言

使用清晰的断言消息：

```typescript
await expect(element).toBeVisible();
await expect(page).toHaveURL(/schedule/);
await expect(result).toContainText('成功');
```

### 3. 等待机制

使用 Playwright 的自动等待，避免硬编码延迟：

```typescript
// ✓ 好的做法
await page.waitForSelector('.result');
await page.waitForLoadState('networkidle');

// ✗ 不好的做法
await page.waitForTimeout(5000);
```

### 4. 选择器策略

优先使用 `data-testid` 属性：

```typescript
// ✓ 最佳
await page.click('[data-testid="submit-button"]');

// ○ 可以
await page.click('button:has-text("提交")');

// ✗ 避免
await page.click('.btn.btn-primary.submit');
```

### 5. Page Object Model

对于复杂页面，使用 Page Object Model：

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
}

// 在测试中使用
test('生成课表', async ({ page }) => {
  const schedulePage = new SchedulePage(page);
  await schedulePage.goto();
  await schedulePage.generateSchedule();
});
```

## 故障排查

### 问题：测试运行很慢

**解决方案：**
- 检查是否有不必要的 `waitForTimeout`
- 使用 `networkidle` 而不是固定延迟
- 考虑使用 mock 数据

### 问题：测试在 CI 中失败但本地通过

**解决方案：**
- 检查环境差异（浏览器版本、屏幕尺寸）
- 增加超时时间
- 查看 CI 日志和截图

### 问题：元素找不到

**解决方案：**
- 使用 Playwright Inspector 检查选择器
- 添加适当的等待
- 检查元素是否在 iframe 中

### 问题：测试不稳定（flaky）

**解决方案：**
- 使用 Playwright 的自动等待
- 避免依赖时序
- 增加重试次数（仅在 CI 中）

## 下一步

1. **安装浏览器**：`bunx playwright install chromium`
2. **运行示例测试**：`bun run test:integration`
3. **查看测试报告**：`bun run test:integration:report`
4. **编写实际测试**：参考 `tests/integration/example.spec.ts`

## 参考资源

- [Playwright 官方文档](https://playwright.dev/)
- [测试最佳实践](https://playwright.dev/docs/best-practices)
- [调试指南](https://playwright.dev/docs/debug)
- [项目测试文档](../../tests/README.md)
