import { defineConfig } from 'vitest/config';
import vue from '@vitejs/plugin-vue';
import { resolve } from 'path';

/**
 * Vitest 单元测试配置
 *
 * 本配置文件定义了排课系统的单元测试环境设置
 *
 * 关键特性：
 * - Vue 3 组件测试支持
 * - TypeScript 支持
 * - 代码覆盖率报告
 * - 完善的日志记录
 * - 路径别名支持
 *
 * @see https://vitest.dev/config/
 */
export default defineConfig({
  // 插件配置
  plugins: [
    vue(), // Vue 3 单文件组件支持
  ],

  // 测试配置
  test: {
    /**
     * 测试环境
     *
     * 使用 jsdom 模拟浏览器环境，用于测试 Vue 组件和 DOM 操作
     */
    environment: 'jsdom',

    /**
     * 全局 API
     *
     * 启用全局测试 API（describe, it, expect 等）
     * 无需在每个测试文件中导入
     */
    globals: true,

    /**
     * 测试文件匹配模式
     *
     * 匹配所有 .test.ts、.test.tsx、.spec.ts、.spec.tsx 文件
     */
    include: [
      'src/**/*.{test,spec}.{ts,tsx}',
      'tests/unit/**/*.{test,spec}.{ts,tsx}',
    ],

    /**
     * 排除文件
     *
     * 排除不需要测试的文件和目录
     */
    exclude: [
      'node_modules',
      'dist',
      'dist-service',
      'src-tauri',
      'tests/integration',
      'tests/reports',
      '.idea',
      '.git',
      '.cache',
    ],

    /**
     * 设置文件
     *
     * 在所有测试运行前执行的设置文件
     * 用于配置全局测试环境、模拟对象等
     */
    setupFiles: ['./tests/unit/setup.ts'],

    /**
     * 代码覆盖率配置
     *
     * 生成详细的代码覆盖率报告
     */
    coverage: {
      /**
       * 覆盖率提供者
       *
       * 使用 v8 引擎提供更快的覆盖率收集
       */
      provider: 'v8',

      /**
       * 报告格式
       *
       * - text: 控制台文本输出
       * - html: 交互式 HTML 报告
       * - json: JSON 格式报告
       * - lcov: LCOV 格式（用于 CI 集成）
       */
      reporter: ['text', 'html', 'json', 'lcov'],

      /**
       * 报告输出目录
       */
      reportsDirectory: './tests/reports/coverage',

      /**
       * 覆盖率包含文件
       *
       * 只统计 src 目录下的源代码
       */
      include: [
        'src/**/*.{ts,tsx,vue}',
      ],

      /**
       * 覆盖率排除文件
       *
       * 排除类型定义、配置文件、测试文件等
       */
      exclude: [
        'src/**/*.d.ts',
        'src/**/*.{test,spec}.{ts,tsx}',
        'src/main.ts',
        'src/vite-env.d.ts',
        'src/auto-imports.d.ts',
        'src/components.d.ts',
      ],

      /**
       * 覆盖率阈值
       *
       * 设置最低覆盖率要求
       * 如果低于阈值，测试将失败
       */
      thresholds: {
        lines: 80,      // 行覆盖率：80%
        functions: 80,  // 函数覆盖率：80%
        branches: 75,   // 分支覆盖率：75%
        statements: 80, // 语句覆盖率：80%
      },

      /**
       * 全部覆盖
       *
       * 要求所有文件都达到覆盖率阈值
       */
      all: true,

      /**
       * 清理覆盖率
       *
       * 每次运行前清理旧的覆盖率数据
       */
      clean: true,
    },

    /**
     * 超时配置（毫秒）
     */
    testTimeout: 10000,  // 单个测试超时：10秒
    hookTimeout: 10000,  // 钩子函数超时：10秒

    /**
     * 监视模式配置
     *
     * 在开发时自动重新运行测试
     */
    watch: false, // 默认不启用监视模式

    /**
     * 并发执行
     *
     * 允许测试并发执行以提高速度
     */
    pool: 'threads',
    poolOptions: {
      threads: {
        singleThread: false,
      },
    },

    /**
     * 日志配置
     *
     * 控制测试输出的详细程度
     */
    logHeapUsage: true,  // 记录堆内存使用情况

    /**
     * 报告器配置
     *
     * 定义测试结果的输出格式
     */
    reporters: [
      'default',  // 默认控制台输出
      'verbose',  // 详细输出
      'json',     // JSON 格式输出
    ],

    /**
     * 输出配置
     */
    outputFile: {
      json: './tests/reports/unit-test-results.json',
    },

    /**
     * 模拟配置
     *
     * 自动模拟外部依赖
     */
    mockReset: true,     // 每个测试后重置模拟
    restoreMocks: true,  // 每个测试后恢复原始实现
    clearMocks: true,    // 每个测试后清除模拟调用记录

    /**
     * 快照配置
     *
     * 用于快照测试
     */
    resolveSnapshotPath: (testPath, snapExtension) => {
      return testPath.replace(/\.test\.([tj]sx?)/, `${snapExtension}.$1`);
    },
  },

  /**
   * 路径解析配置
   *
   * 与 tsconfig.json 保持一致的路径别名
   */
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
      '@components': resolve(__dirname, './src/components'),
      '@views': resolve(__dirname, './src/views'),
      '@stores': resolve(__dirname, './src/stores'),
      '@utils': resolve(__dirname, './src/utils'),
      '@api': resolve(__dirname, './src/api'),
      '@assets': resolve(__dirname, './src/assets'),
      '@styles': resolve(__dirname, './src/styles'),
      '@types': resolve(__dirname, './src/types'),
    },
  },

  /**
   * 定义全局常量
   *
   * 在测试中可以使用这些常量
   */
  define: {
    __DEV__: true,
    __TEST__: true,
  },
});
