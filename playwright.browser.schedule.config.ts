import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright 浏览器模式测试配置 - 排课功能专用
 *
 * 本配置用于测试排课生成和导出功能
 * 使用浏览器模式（不启动 Tauri），测试速度更快
 */
export default defineConfig({
  testDir: './tests/integration',
  testMatch: '**/schedule-generation-and-export.spec.ts',

  fullyParallel: false,
  maxFailures: 1,
  workers: 1,
  retries: 0,

  timeout: 90000,
  expect: {
    timeout: 10000,
  },

  globalSetup: './tests/helpers/global-setup.ts',
  globalTeardown: './tests/helpers/global-teardown.ts',

  reporter: [
    ['html', { outputFolder: 'tests/reports/html', open: 'never' }],
    ['list'],
    ['json', { outputFile: 'tests/reports/test-results.json' }],
  ],

  use: {
    baseURL: process.env.TEST_BASE_URL || 'http://localhost:5173',
    viewport: { width: 1920, height: 1080 },
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    trace: 'retain-on-failure',
    actionTimeout: 15000,
    navigationTimeout: 30000,
    locale: 'zh-CN',
    timezoneId: 'Asia/Shanghai',
    ignoreHTTPSErrors: true,
  },

  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        launchOptions: {
          args: [
            '--disable-web-security',
            '--disable-features=IsolateOrigins,site-per-process',
          ],
        },
      },
    },
  ],

  // 不使用 webServer，由测试脚本手动启动服务
  outputDir: 'tests/reports/test-results',
});
