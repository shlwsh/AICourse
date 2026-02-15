import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright 测试配置
 *
 * 本配置文件定义了排课系统的端到端测试环境设置
 *
 * 关键特性：
 * - 支持顺序执行测试用例（fullyParallel: false）
 * - 快速失败机制（maxFailures: 1）
 * - 完善的日志记录
 * - 多浏览器支持
 *
 * @see https://playwright.dev/docs/test-configuration
 */
export default defineConfig({
  // 测试目录配置
  testDir: './tests/integration',

  // 测试文件匹配模式
  testMatch: '**/*.spec.ts',

  /**
   * 顺序执行配置
   *
   * 根据项目规则要求：
   * - 集成测试必须按照预定义的用例顺序依次执行
   * - 一旦某个用例执行失败，立即停止后续测试
   */
  fullyParallel: false,

  /**
   * 快速失败机制
   *
   * maxFailures: 1 确保第一个测试失败后立即停止
   * 这符合项目规则中的"快速失败机制"要求
   */
  maxFailures: 1,

  /**
   * 禁止并行执行 worker
   *
   * workers: 1 确保所有测试在单个进程中顺序执行
   * 这对于需要共享状态的集成测试至关重要
   */
  workers: 1,

  /**
   * 失败重试配置
   *
   * 在 CI 环境中允许重试一次，本地开发不重试
   * 这有助于处理偶发性的网络或时序问题
   */
  retries: process.env.CI ? 1 : 0,

  /**
   * 超时配置（毫秒）
   */
  timeout: 60000, // 单个测试超时：60秒
  expect: {
    timeout: 10000, // 断言超时：10秒
  },

  /**
   * 全局设置和拆卸
   *
   * 用于在所有测试前后执行全局操作
   * 例如：启动测试数据库、清理测试数据等
   */
  globalSetup: './tests/helpers/global-setup.ts',
  globalTeardown: './tests/helpers/global-teardown.ts',

  /**
   * 测试报告配置
   *
   * 生成多种格式的测试报告：
   * - html: 交互式 HTML 报告
   * - list: 控制台列表输出
   * - json: JSON 格式报告（用于 CI 集成）
   */
  reporter: [
    ['html', { outputFolder: 'tests/reports/html', open: 'never' }],
    ['list'],
    ['json', { outputFile: 'tests/reports/test-results.json' }],
  ],

  /**
   * 使用配置
   *
   * 定义所有测试共享的基础配置
   */
  use: {
    /**
     * 基础 URL
     *
     * 在测试中可以使用相对路径，例如：
     * await page.goto('/schedule')
     */
    baseURL: process.env.TEST_BASE_URL || 'http://localhost:1420',

    /**
     * 浏览器上下文配置
     */
    viewport: { width: 1920, height: 1080 },

    /**
     * 截图配置
     *
     * 只在测试失败时截图，用于调试
     */
    screenshot: 'only-on-failure',

    /**
     * 视频录制配置
     *
     * 只在测试失败时录制视频
     */
    video: 'retain-on-failure',

    /**
     * 追踪配置
     *
     * 在失败时保留追踪信息，用于详细调试
     */
    trace: 'retain-on-failure',

    /**
     * 操作超时
     *
     * 单个操作（如点击、填写）的超时时间
     */
    actionTimeout: 15000,

    /**
     * 导航超时
     *
     * 页面导航的超时时间
     */
    navigationTimeout: 30000,

    /**
     * 语言设置
     *
     * 设置为中文，确保测试环境与生产环境一致
     */
    locale: 'zh-CN',

    /**
     * 时区设置
     */
    timezoneId: 'Asia/Shanghai',

    /**
     * 权限配置
     *
     * 根据需要授予浏览器权限
     */
    permissions: [],

    /**
     * 忽略 HTTPS 错误
     *
     * 在开发环境中可能使用自签名证书
     */
    ignoreHTTPSErrors: true,
  },

  /**
   * 浏览器项目配置
   *
   * 定义要在哪些浏览器上运行测试
   *
   * 默认配置：
   * - Chromium（主要测试浏览器）
   * - Firefox（可选）
   * - WebKit（可选）
   */
  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        // Chromium 特定配置
        launchOptions: {
          args: [
            '--disable-web-security', // 禁用同源策略（仅用于测试）
            '--disable-features=IsolateOrigins,site-per-process', // 禁用站点隔离
          ],
        },
      },
    },

    // 可选：Firefox 浏览器测试
    // 取消注释以启用 Firefox 测试
    // {
    //   name: 'firefox',
    //   use: {
    //     ...devices['Desktop Firefox'],
    //   },
    // },

    // 可选：WebKit 浏览器测试
    // 取消注释以启用 WebKit 测试
    // {
    //   name: 'webkit',
    //   use: {
    //     ...devices['Desktop Safari'],
    //   },
    // },

    // 可选：移动端浏览器测试
    // {
    //   name: 'Mobile Chrome',
    //   use: {
    //     ...devices['Pixel 5'],
    //   },
    // },
    // {
    //   name: 'Mobile Safari',
    //   use: {
    //     ...devices['iPhone 12'],
    //   },
    // },
  ],

  /**
   * Web 服务器配置
   *
   * 在运行测试前自动启动开发服务器
   *
   * 注意：如果应用已经在运行，Playwright 会跳过启动步骤
   */
  webServer: {
    command: 'bun run tauri:dev',
    url: 'http://localhost:1420',
    reuseExistingServer: !process.env.CI,
    timeout: 120000, // 启动超时：2分钟
    stdout: 'pipe',
    stderr: 'pipe',
  },

  /**
   * 输出目录配置
   */
  outputDir: 'tests/reports/test-results',
});
