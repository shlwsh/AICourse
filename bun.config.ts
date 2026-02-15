/**
 * Bun 运行时配置
 * Bun Runtime Configuration
 *
 * 此文件定义了 Bun 运行时的高级配置选项
 * 包括构建、测试、开发服务器等配置
 */

import type { BuildConfig } from 'bun';

/**
 * 开发环境配置
 * Development Environment Configuration
 */
export const devConfig: BuildConfig = {
  entrypoints: ['./src-service/index.ts'],
  outdir: './dist-service',
  target: 'bun',
  format: 'esm',
  splitting: true,
  sourcemap: 'inline',
  minify: false,
  // 外部依赖（不打包）
  external: [
    '@tauri-apps/api',
    '@tauri-apps/plugin-*',
  ],
};

/**
 * 生产环境配置
 * Production Environment Configuration
 */
export const prodConfig: BuildConfig = {
  entrypoints: ['./src-service/index.ts'],
  outdir: './dist-service',
  target: 'bun',
  format: 'esm',
  splitting: true,
  sourcemap: 'external',
  minify: true,
  // 外部依赖（不打包）
  external: [
    '@tauri-apps/api',
    '@tauri-apps/plugin-*',
  ],
  // 定义全局变量
  define: {
    'process.env.NODE_ENV': '"production"',
  },
};

/**
 * 测试环境配置
 * Test Environment Configuration
 */
export const testConfig = {
  // 测试超时时间（毫秒）
  timeout: 5000,
  // 启用覆盖率报告
  coverage: true,
  // 覆盖率阈值
  coverageThreshold: {
    lines: 80,
    functions: 80,
    branches: 80,
    statements: 80,
  },
};

/**
 * 服务器配置
 * Server Configuration
 */
export const serverConfig = {
  development: {
    port: 3000,
    host: 'localhost',
    // 启用热重载
    hot: true,
    // 启用详细日志
    verbose: true,
  },
  production: {
    port: 3000,
    host: '0.0.0.0',
    // 关闭热重载
    hot: false,
    // 关闭详细日志
    verbose: false,
  },
};

/**
 * 日志配置
 * Logging Configuration
 */
export const loggingConfig = {
  development: {
    level: 'debug',
    format: 'pretty',
    console: true,
    file: true,
    filePath: './logs/development.log',
  },
  production: {
    level: 'info',
    format: 'json',
    console: false,
    file: true,
    filePath: './logs/production.log',
    maxSize: 100 * 1024 * 1024, // 100MB
    retentionDays: 30,
  },
};

/**
 * 数据库配置
 * Database Configuration
 */
export const databaseConfig = {
  development: {
    url: 'sqlite:./data/dev.db',
    logging: true,
    poolSize: 5,
  },
  production: {
    url: 'sqlite:./data/production.db',
    logging: false,
    poolSize: 10,
    timeout: 30000,
  },
};

/**
 * 性能优化配置
 * Performance Configuration
 */
export const performanceConfig = {
  // 启用 JIT 编译
  jit: true,
  // 内存堆大小限制（MB）
  heapSize: 2048,
  // 启用响应压缩
  compression: true,
  // 缓存配置
  cache: {
    maxAge: 3600, // 1小时
    maxSize: 100, // 最多缓存100个条目
  },
};

/**
 * 安全配置
 * Security Configuration
 */
export const securityConfig = {
  // CORS 配置
  cors: {
    development: {
      origin: '*',
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      headers: ['Content-Type', 'Authorization'],
    },
    production: {
      origin: 'https://yourdomain.com',
      methods: ['GET', 'POST', 'PUT', 'DELETE'],
      headers: ['Content-Type', 'Authorization'],
      credentials: true,
    },
  },
  // 速率限制
  rateLimit: {
    enabled: true,
    maxRequests: 100, // 每分钟最大请求数
    windowMs: 60000, // 时间窗口（毫秒）
  },
  // 请求体大小限制
  bodyLimit: '10mb',
};

/**
 * 导出配置
 * Export Configuration
 */
export default {
  dev: devConfig,
  prod: prodConfig,
  test: testConfig,
  server: serverConfig,
  logging: loggingConfig,
  database: databaseConfig,
  performance: performanceConfig,
  security: securityConfig,
};
