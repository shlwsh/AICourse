import { defineConfig } from '@playwright/test';

/**
 * Playwright API 测试配置
 * 专门用于测试服务层 API，不启动 Tauri
 */
export default defineConfig({
  testDir: './tests/integration',
  testMatch: '**/*.spec.ts',
  fullyParallel: false,
  maxFailures: 1,
  workers: 1,
  retries: 0,
  timeout: 60000,

  expect: {
    timeout: 10000,
  },

  reporter: [
    ['list'],
    ['html', { outputFolder: 'tests/reports/html', open: 'never' }],
  ],

  use: {
    baseURL: 'http://localhost:3000',
    trace: 'retain-on-failure',
  },

  projects: [
    {
      name: 'api-tests',
      use: {},
    },
  ],

  // 不启动 webServer，假设服务已经在运行
});
