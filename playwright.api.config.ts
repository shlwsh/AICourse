import { defineConfig } from '@playwright/test';

/**
 * Playwright API 测试配置
 *
 * 专门用于后端 API 集成测试，不启动前端服务器
 */
export default defineConfig({
  testDir: './tests/integration',
  testMatch: '**/*.spec.ts',

  // 顺序执行，快速失败
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
    ['json', { outputFile: 'tests/reports/api-test-results.json' }],
  ],

  use: {
    // API 测试使用后端服务地址
    baseURL: 'http://localhost:3000',
    extraHTTPHeaders: {
      'Accept': 'application/json',
    },
  },

  // 不启动 webServer，假设后端服务已经在运行
});
