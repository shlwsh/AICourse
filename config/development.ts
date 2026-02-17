/**
 * 开发环境配置
 *
 * 覆盖默认配置中的部分设置
 */

export default {
  app: {
    env: 'development',
  },

  server: {
    port: 3000,
  },

  database: {
    path: 'data/schedule.db',
  },

  logging: {
    level: 'debug',
    console: {
      enabled: true,
      colorize: true,
    },
    file: {
      enabled: true,
    },
  },

  llm: {
    enabled: false, // 开发环境默认禁用 LLM
  },

  scheduling: {
    maxIterations: 1000, // 开发环境减少迭代次数
    timeout: 60000, // 1分钟
  },

  cache: {
    enabled: false, // 开发环境禁用缓存
  },

  security: {
    rateLimit: {
      enabled: false, // 开发环境禁用限流
    },
  },
};
