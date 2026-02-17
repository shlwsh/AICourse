/**
 * 默认配置文件
 *
 * 包含所有环境通用的默认配置
 * 配置值优先从环境变量读取,如果环境变量不存在则使用默认值
 */

/**
 * 辅助函数：从环境变量读取配置
 */
const env = (key: string, defaultValue: any): any => {
  const value = process.env[key];
  if (value === undefined) return defaultValue;

  // 处理布尔值
  if (defaultValue === true || defaultValue === false) {
    return value === 'true';
  }

  // 处理数字
  if (typeof defaultValue === 'number') {
    return Number(value);
  }

  // 处理数组（逗号分隔）
  if (Array.isArray(defaultValue)) {
    return value.split(',').map(v => {
      const trimmed = v.trim();
      // 如果默认值数组元素是数字，转换为数字
      return typeof defaultValue[0] === 'number' ? Number(trimmed) : trimmed;
    });
  }

  return value;
};

export default {
  /**
   * 应用基础配置
   */
  app: {
    name: env('APP_NAME', '排课系统'),
    version: env('APP_VERSION', '0.1.0'),
    env: env('NODE_ENV', 'development'),
  },

  /**
   * 服务器配置
   */
  server: {
    port: env('SERVER_PORT', 3000),
    host: env('SERVER_HOST', 'localhost'),
    cors: {
      enabled: env('CORS_ENABLED', true),
      origin: env('CORS_ORIGIN', '*'),
    },
  },

  /**
   * 数据库配置
   */
  database: {
    type: env('DATABASE_TYPE', 'sqlite'),
    path: env('DATABASE_PATH', 'data/schedule.db'),
    options: {
      journalMode: env('DATABASE_JOURNAL_MODE', 'WAL'),
      foreignKeys: env('DATABASE_FOREIGN_KEYS', true),
    },
    migrations: {
      path: env('DATABASE_MIGRATIONS_PATH', 'src-service/db/migrations'),
      autoRun: env('DATABASE_AUTO_RUN_MIGRATIONS', true),
    },
  },

  /**
   * 日志配置
   */
  logging: {
    level: env('LOG_LEVEL', 'info'),
    console: {
      enabled: env('LOG_CONSOLE_ENABLED', true),
      colorize: env('LOG_CONSOLE_COLORIZE', true),
    },
    file: {
      enabled: env('LOG_FILE_ENABLED', true),
      path: env('LOG_FILE_PATH', 'logs'),
      maxSize: env('LOG_FILE_MAX_SIZE', '10m'),
      maxFiles: env('LOG_FILE_MAX_FILES', 10),
      datePattern: env('LOG_FILE_DATE_PATTERN', 'YYYY-MM-DD'),
    },
  },

  /**
   * 文件上传配置
   */
  upload: {
    maxSize: env('UPLOAD_MAX_SIZE', 10 * 1024 * 1024),
    allowedExtensions: env('UPLOAD_ALLOWED_EXTENSIONS', ['.xlsx', '.xls']),
    tempDir: env('UPLOAD_TEMP_DIR', '/tmp/course-scheduling-uploads'),
  },

  /**
   * 文件导出配置
   */
  export: {
    outputDir: env('EXPORT_OUTPUT_DIR', 'exports'),
    defaultFormat: env('EXPORT_DEFAULT_FORMAT', 'xlsx'),
  },

  /**
   * LLM 配置（AI 功能）
   */
  llm: {
    enabled: env('LLM_ENABLED', false),
    provider: env('LLM_PROVIDER', 'openai'),
    openai: {
      apiKey: env('OPENAI_API_KEY', ''),
      model: env('OPENAI_MODEL', 'gpt-4'),
      baseURL: env('OPENAI_BASE_URL', 'https://api.openai.com/v1'),
      maxTokens: env('OPENAI_MAX_TOKENS', 4096),
      temperature: env('OPENAI_TEMPERATURE', 0.7),
    },
    anthropic: {
      apiKey: env('ANTHROPIC_API_KEY', ''),
      model: env('ANTHROPIC_MODEL', 'claude-3-opus-20240229'),
      maxTokens: env('ANTHROPIC_MAX_TOKENS', 4096),
    },
    azure: {
      apiKey: env('AZURE_OPENAI_API_KEY', ''),
      endpoint: env('AZURE_OPENAI_ENDPOINT', ''),
      deploymentName: env('AZURE_OPENAI_DEPLOYMENT', ''),
    },
    local: {
      endpoint: env('LOCAL_LLM_ENDPOINT', 'http://localhost:11434'),
      model: env('LOCAL_LLM_MODEL', 'llama2'),
    },
  },

  /**
   * 排课算法配置
   */
  scheduling: {
    algorithm: env('SCHEDULING_ALGORITHM', 'genetic'),
    maxIterations: env('SCHEDULING_MAX_ITERATIONS', 10000),
    populationSize: env('SCHEDULING_POPULATION_SIZE', 100),
    mutationRate: env('SCHEDULING_MUTATION_RATE', 0.1),
    crossoverRate: env('SCHEDULING_CROSSOVER_RATE', 0.8),
    timeout: env('SCHEDULING_TIMEOUT', 300000),
  },

  /**
   * 课表配置
   */
  timetable: {
    cycleDays: env('TIMETABLE_CYCLE_DAYS', 5),
    periodsPerDay: env('TIMETABLE_PERIODS_PER_DAY', 8),
    workDays: env('TIMETABLE_WORK_DAYS', [1, 2, 3, 4, 5]),
  },

  /**
   * 缓存配置
   */
  cache: {
    enabled: env('CACHE_ENABLED', true),
    ttl: env('CACHE_TTL', 3600),
    maxSize: env('CACHE_MAX_SIZE', 100),
  },

  /**
   * 安全配置
   */
  security: {
    rateLimit: {
      enabled: env('RATE_LIMIT_ENABLED', true),
      windowMs: env('RATE_LIMIT_WINDOW_MS', 15 * 60 * 1000),
      maxRequests: env('RATE_LIMIT_MAX_REQUESTS', 100),
    },
    cors: {
      credentials: env('CORS_CREDENTIALS', true),
      maxAge: env('CORS_MAX_AGE', 86400),
    },
  },

  /**
   * 前端配置
   */
  frontend: {
    vite: {
      port: env('VITE_PORT', 5173),
      host: env('VITE_HOST', 'localhost'),
    },
    tauri: {
      port: env('TAURI_PORT', 1420),
    },
  },
};
