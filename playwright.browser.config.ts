import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright 配置 - 浏览器模式测试
 * 仅在浏览器中运行测试，不启动 Tauri
 */
export default defineConfig({
  testDir: './tests/integration',
  testMatch: '**/template-download-browser.spec.ts',

  // 超时配置
  timeout: 30000,
  expect: {
    timeout: 5000,
  },

  // 失败时重试
  retries: 0,

  // 并行执行
  workers: 1,

  // 报告配置
  reporter: [
    ['list'],
    ['html', { outputFolder: 'playwright-report-browser', open: 'never' }],
  ],

  // 全局配置
  use: {
    // 基础 URL
    baseURL: 'http://localhost:5173',

    // 截图配置
    screenshot: 'only-on-failure',

    // 视频配置
    video: 'retain-on-failure',

    // 追踪配置
    trace: 'retain-on-failure',

    // 浏览器上下文选项
    viewport: { width: 1280, height: 720 },
    ignoreHTTPSErrors: true,

    // 不启动 webServer
  },

  // 项目配置 - 仅浏览器
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
