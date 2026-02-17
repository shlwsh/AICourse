/**
 * 测试环境配置
 *
 * 用于运行测试时的配置
 */

export default {
  app: {
    env: 'test',
  },

  server: {
    port: 3001, // 使用不同端口避免冲突
  },

  database: {
    path: ':memory:', // 使用内存数据库
  },

  logging: {
    level: 'error', // 测试时只记录错误
    console: {
      enabled: false,
    },
    file: {
      enabled: false,
    },
  },

  llm: {
    enabled: false,
  },

  cache: {
    enabled: false,
  },

  security: {
    rateLimit: {
      enabled: false,
    },
  },
};
