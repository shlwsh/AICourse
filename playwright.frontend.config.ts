/**
 * Playwright 前端功能测试配置
 * 用于测试前端页面导航、加载性能和用户交互
 */
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  // 测试目录
  testDir: './tests/integration',

  // 只运行前端相关的测试
  testMatch: /frontend-.*\.spec\.ts/,

  // 全局超时设置
  timeout: 30000,
  expect: {
    timeout: 5000,
  },

  // 失败时立即停止
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1, // 串行执行，确保测试顺序

  // 报告配置
  reporter: [
    ['html', { outputFolder: 'tests/reports/frontend-html', open: 'never' }],
    ['json', { outputFile: 'tests/reports/frontend-results.json' }],
    ['list'],
  ],

  // 全局设置
  use: {
    // 基础 URL
    baseURL: 'http://localhost:5173',

    // 追踪配置
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',

    // 浏览器上下文选项
    viewport: { width: 1280, height: 720 },
    ignoreHTTPSErrors: true,

    // 导航超时
    navigationTimeout: 10000,
    actionTimeout: 5000,
  },

  // 测试项目配置
  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        launchOptions: {
          args: ['--disable-web-security'],
        },
      },
    },
  ],

  // Web 服务器配置（如果需要自动启动）
  // webServer: {
  //   command: 'bun run dev:frontend',
  //   url: 'http://localhost:5173',
  //   reuseExistingServer: !process.env.CI,
  //   timeout: 120000,
  // },
});
