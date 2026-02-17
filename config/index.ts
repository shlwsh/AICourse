/**
 * 配置管理模块
 *
 * 根据环境变量加载相应的配置文件，并提供类型安全的配置访问
 */

import defaultConfig from './default';
import developmentConfig from './development';
import productionConfig from './production';
import testConfig from './test';

/**
 * 配置类型定义
 */
export interface Config {
  app: {
    name: string;
    version: string;
    env: string;
  };
  server: {
    port: number;
    host: string;
    cors: {
      enabled: boolean;
      origin: string;
    };
  };
  database: {
    type: string;
    path: string;
    options: {
      journalMode: string;
      foreignKeys: boolean;
    };
    migrations: {
      path: string;
      autoRun: boolean;
    };
  };
  logging: {
    level: string;
    console: {
      enabled: boolean;
      colorize: boolean;
    };
    file: {
      enabled: boolean;
      path: string;
      maxSize: string;
      maxFiles: number;
      datePattern: string;
    };
  };
  upload: {
    maxSize: number;
    allowedExtensions: string[];
    tempDir: string;
  };
  export: {
    outputDir: string;
    defaultFormat: string;
  };
  llm: {
    enabled: boolean;
    provider: string;
    openai: {
      apiKey: string;
      model: string;
      baseURL: string;
      maxTokens: number;
      temperature: number;
    };
    anthropic: {
      apiKey: string;
      model: string;
      maxTokens: number;
    };
    azure: {
      apiKey: string;
      endpoint: string;
      deploymentName: string;
    };
    local: {
      endpoint: string;
      model: string;
    };
  };
  scheduling: {
    algorithm: string;
    maxIterations: number;
    populationSize: number;
    mutationRate: number;
    crossoverRate: number;
    timeout: number;
  };
  timetable: {
    cycleDays: number;
    periodsPerDay: number;
    workDays: number[];
  };
  cache: {
    enabled: boolean;
    ttl: number;
    maxSize: number;
  };
  security: {
    rateLimit: {
      enabled: boolean;
      windowMs: number;
      maxRequests: number;
    };
    cors: {
      credentials: boolean;
      maxAge: number;
    };
  };
  frontend: {
    vite: {
      port: number;
      host: string;
    };
    tauri: {
      port: number;
    };
  };
}

/**
 * 深度合并对象
 */
function deepMerge<T extends Record<string, any>>(target: T, source: Partial<T>): T {
  const result = { ...target };

  for (const key in source) {
    if (source.hasOwnProperty(key)) {
      const sourceValue = source[key];
      const targetValue = result[key];

      if (
        sourceValue &&
        typeof sourceValue === 'object' &&
        !Array.isArray(sourceValue) &&
        targetValue &&
        typeof targetValue === 'object' &&
        !Array.isArray(targetValue)
      ) {
        result[key] = deepMerge(targetValue, sourceValue);
      } else {
        result[key] = sourceValue as any;
      }
    }
  }

  return result;
}

/**
 * 获取当前环境
 */
function getEnvironment(): string {
  return process.env.NODE_ENV || 'development';
}

/**
 * 加载配置
 */
function loadConfig(): Config {
  const env = getEnvironment();
  let config = defaultConfig as Config;

  // 根据环境合并配置
  switch (env) {
    case 'development':
      config = deepMerge(config, developmentConfig);
      break;
    case 'production':
      config = deepMerge(config, productionConfig);
      break;
    case 'test':
      config = deepMerge(config, testConfig);
      break;
    default:
      console.warn(`未知环境: ${env}，使用默认配置`);
  }

  return config;
}

/**
 * 导出配置实例
 */
export const config = loadConfig();

/**
 * 获取配置值的辅助函数
 */
export function get<K extends keyof Config>(key: K): Config[K] {
  return config[key];
}

/**
 * 获取嵌套配置值
 */
export function getPath(path: string): any {
  const keys = path.split('.');
  let value: any = config;

  for (const key of keys) {
    if (value && typeof value === 'object' && key in value) {
      value = value[key];
    } else {
      return undefined;
    }
  }

  return value;
}

/**
 * 检查配置是否有效
 */
export function validateConfig(): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  // 验证必需的配置项
  if (!config.database.path) {
    errors.push('数据库路径未配置');
  }

  if (config.llm.enabled) {
    const provider = config.llm.provider;
    if (provider === 'openai' && !config.llm.openai.apiKey) {
      errors.push('OpenAI API Key 未配置');
    }
    if (provider === 'anthropic' && !config.llm.anthropic.apiKey) {
      errors.push('Anthropic API Key 未配置');
    }
    if (provider === 'azure' && (!config.llm.azure.apiKey || !config.llm.azure.endpoint)) {
      errors.push('Azure OpenAI 配置不完整');
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * 打印配置信息（隐藏敏感信息）
 */
export function printConfig(): void {
  const safeConfig = JSON.parse(JSON.stringify(config));

  // 隐藏敏感信息
  if (safeConfig.llm.openai.apiKey) {
    safeConfig.llm.openai.apiKey = '***';
  }
  if (safeConfig.llm.anthropic.apiKey) {
    safeConfig.llm.anthropic.apiKey = '***';
  }
  if (safeConfig.llm.azure.apiKey) {
    safeConfig.llm.azure.apiKey = '***';
  }

  console.log('========================================');
  console.log('当前配置:');
  console.log('========================================');
  console.log(JSON.stringify(safeConfig, null, 2));
  console.log('========================================');
}

export default config;
