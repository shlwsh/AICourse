/**
 * 生产环境配置
 *
 * 覆盖默认配置中的部分设置
 */

export default {
  app: {
    env: 'production',
  },

  server: {
    port: parseInt(process.env.PORT || '3000', 10),
    cors: {
      enabled: true,
      origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
    },
  },

  database: {
    path: process.env.DATABASE_PATH || 'data/schedule.db',
  },

  logging: {
    level: 'info',
    console: {
      enabled: true,
      colorize: false,
    },
    file: {
      enabled: true,
      maxSize: '50m',
      maxFiles: 30,
    },
  },

  llm: {
    enabled: process.env.LLM_ENABLED === 'true',
  },

  scheduling: {
    maxIterations: 10000,
    timeout: 300000, // 5分钟
  },

  cache: {
    enabled: true,
    ttl: 3600,
  },

  security: {
    rateLimit: {
      enabled: true,
      windowMs: 15 * 60 * 1000,
      maxRequests: 100,
    },
  },
};
