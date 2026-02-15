# 前端日志记录器使用指南

## 概述

前端日志记录器是一个功能完善的日志管理工具，提供统一的日志记录接口，支持多种日志级别、敏感信息过滤、日志历史记录和导出功能。

## 功能特性

- ✅ 支持多种日志级别：DEBUG、INFO、WARN、ERROR
- ✅ 支持控制台输出和本地存储输出
- ✅ 日志格式包含时间戳、日志级别、模块名称、消息内容
- ✅ 自动过滤敏感信息（密码、密钥等）
- ✅ 支持日志历史记录和导出
- ✅ 支持日志级别过滤
- ✅ 支持配置动态更新

## 快速开始

### 基础使用

```typescript
import { logger } from '@/utils/logger';

// 记录信息日志
logger.info('用户登录成功', { userId: 123 });

// 记录警告
logger.warn('课时数接近上限', { classId: 456, currentHours: 38 });

// 记录错误
logger.error('API 调用失败', { error: err.message, endpoint: '/api/schedule' });

// 记录调试信息（仅开发环境）
logger.debug('组件渲染完成', { componentName: 'ScheduleGrid' });
```

### 创建模块专用日志实例

```typescript
import Logger, { LogLevel } from '@/utils/logger';

// 为特定模块创建日志实例
const scheduleLogger = new Logger('ScheduleModule', {
  level: LogLevel.DEBUG,
  enableConsole: true,
  enableStorage: true,
});

scheduleLogger.info('开始生成课表');
scheduleLogger.debug('约束检查完成', { conflicts: 0 });
```

## 日志级别

### 级别说明

| 级别 | 用途 | 示例场景 |
|------|------|----------|
| DEBUG | 调试信息 | 组件渲染、状态变更、函数调用 |
| INFO | 一般信息 | 用户操作、业务流程、系统状态 |
| WARN | 警告信息 | 非致命错误、性能问题、配置警告 |
| ERROR | 错误信息 | API 失败、异常捕获、系统错误 |

### 级别过滤

日志记录器会根据配置的最低级别过滤日志输出：

```typescript
import Logger, { LogLevel } from '@/utils/logger';

// 只输出 WARN 和 ERROR 级别的日志
const productionLogger = new Logger('Production', {
  level: LogLevel.WARN,
});

productionLogger.debug('不会输出');
productionLogger.info('不会输出');
productionLogger.warn('会输出');
productionLogger.error('会输出');
```

## 敏感信息过滤

日志记录器会自动过滤以下敏感信息：

- password / passwd / pwd
- secret
- token
- api_key / apikey / apiKey
- access_key / accessKey
- private_key / privateKey
- authorization / auth

### 示例

```typescript
// 原始数据
const userData = {
  username: 'admin',
  password: 'secret123',
  apiKey: 'abc123xyz',
  email: 'admin@example.com',
};

// 记录日志
logger.info('用户数据', userData);

// 实际输出（密码和 API 密钥被替换为 ***）
// [2024-01-15T10:30:00.000Z] [INFO] [Frontend] 用户数据 | {"username":"admin","password":"***","apiKey":"***","email":"admin@example.com"}
```

### 嵌套对象过滤

```typescript
const complexData = {
  user: {
    id: 123,
    name: 'admin',
    credentials: {
      password: 'secret',
      apiKey: 'key123',
    },
  },
  settings: {
    theme: 'dark',
  },
};

logger.info('复杂数据', complexData);
// credentials 中的敏感信息会被自动过滤
```

## 日志历史记录

### 启用历史记录

```typescript
import Logger from '@/utils/logger';

const historyLogger = new Logger('History', {
  enableStorage: true,
  maxStorageSize: 1000, // 最多保存 1000 条日志
});

historyLogger.info('消息1');
historyLogger.warn('消息2');
historyLogger.error('消息3');
```

### 获取历史记录

```typescript
// 获取所有历史记录
const allLogs = historyLogger.getHistory();
console.log(allLogs);

// 按级别过滤
const errorLogs = historyLogger.getHistory(LogLevel.ERROR);
console.log(errorLogs);
```

### 清空历史记录

```typescript
historyLogger.clearHistory();
```

## 日志导出

### 导出为 JSON

```typescript
// 获取 JSON 字符串
const jsonLogs = logger.exportLogs();
console.log(jsonLogs);

// 下载 JSON 文件
logger.downloadLogs('json');
```

### 导出为文本

```typescript
// 获取文本字符串
const textLogs = logger.exportLogsAsText();
console.log(textLogs);

// 下载文本文件
logger.downloadLogs('text');
```

## 配置管理

### 默认配置

```typescript
{
  level: import.meta.env.DEV ? LogLevel.DEBUG : LogLevel.INFO,
  enableConsole: true,
  enableStorage: true,
  maxStorageSize: 1000,
  sanitizeSensitiveData: true,
}
```

### 更新配置

```typescript
// 动态更新配置
logger.updateConfig({
  level: LogLevel.ERROR,
  enableConsole: false,
});

// 获取当前配置
const config = logger.getConfig();
console.log(config);
```

## 最佳实践

### 1. 为不同模块创建专用日志实例

```typescript
// stores/scheduleStore.ts
import Logger from '@/utils/logger';
const logger = new Logger('ScheduleStore');

export const useScheduleStore = defineStore('schedule', () => {
  const generateSchedule = async () => {
    logger.info('开始生成课表');
    try {
      // ...
      logger.info('课表生成成功');
    } catch (error) {
      logger.error('课表生成失败', { error });
    }
  };
});
```

### 2. 在 API 调用中记录日志

```typescript
// api/schedule.ts
import Logger from '@/utils/logger';
const logger = new Logger('ScheduleAPI');

export const scheduleApi = {
  async generate(params: GenerateParams) {
    logger.debug('调用生成课表 API', { params });
    try {
      const response = await http.post('/api/schedule/generate', params);
      logger.info('课表生成成功', { scheduleId: response.data.id });
      return response.data;
    } catch (error) {
      logger.error('课表生成失败', { error, params });
      throw error;
    }
  },
};
```

### 3. 在组件中记录用户操作

```typescript
// components/ScheduleGrid.vue
import Logger from '@/utils/logger';
const logger = new Logger('ScheduleGrid');

const handleDragEnd = (event: DragEvent) => {
  logger.debug('拖拽结束', {
    from: event.from,
    to: event.to
  });

  try {
    // 处理拖拽逻辑
    logger.info('课程移动成功', {
      courseId: course.id,
      newSlot: targetSlot
    });
  } catch (error) {
    logger.error('课程移动失败', { error });
  }
};
```

### 4. 在错误边界中记录错误

```typescript
// App.vue
import { logger } from '@/utils/logger';

app.config.errorHandler = (err, instance, info) => {
  logger.error('Vue 应用错误', {
    error: err,
    componentName: instance?.$options.name,
    info,
  });
};
```

### 5. 记录性能指标

```typescript
import Logger from '@/utils/logger';
const logger = new Logger('Performance');

const measurePerformance = async (name: string, fn: () => Promise<void>) => {
  const startTime = performance.now();
  logger.debug(`开始执行: ${name}`);

  try {
    await fn();
    const duration = performance.now() - startTime;
    logger.info(`执行完成: ${name}`, { duration: `${duration.toFixed(2)}ms` });
  } catch (error) {
    const duration = performance.now() - startTime;
    logger.error(`执行失败: ${name}`, { duration: `${duration.toFixed(2)}ms`, error });
    throw error;
  }
};

// 使用
await measurePerformance('生成课表', async () => {
  await scheduleApi.generate(params);
});
```

## 开发环境 vs 生产环境

### 开发环境

- 默认日志级别：DEBUG
- 控制台输出：启用
- 本地存储：启用
- 包含详细的调试信息

### 生产环境

- 默认日志级别：INFO
- 控制台输出：启用（ERROR 和 WARN）
- 本地存储：启用
- 过滤调试信息，减少日志量

### 环境检测

```typescript
if (import.meta.env.DEV) {
  logger.debug('开发环境专用日志');
}

if (import.meta.env.PROD) {
  logger.info('生产环境日志');
}
```

## 故障排查

### 查看日志历史

1. 打开浏览器开发者工具
2. 在控制台执行：
   ```javascript
   logger.getHistory()
   ```

### 导出日志用于分析

```javascript
// 导出所有日志
logger.downloadLogs('text');

// 或导出 JSON 格式
logger.downloadLogs('json');
```

### 查看特定级别的日志

```javascript
// 只查看错误日志
logger.getHistory(LogLevel.ERROR);

// 只查看警告日志
logger.getHistory(LogLevel.WARN);
```

## 注意事项

1. **不要记录大量数据**：避免在日志中记录大型对象或数组，这会影响性能和存储空间
2. **敏感信息**：虽然日志记录器会自动过滤常见的敏感信息，但仍需注意不要记录用户隐私数据
3. **日志级别**：合理使用日志级别，避免在生产环境输出过多 DEBUG 日志
4. **本地存储限制**：浏览器本地存储有大小限制（通常 5-10MB），注意控制 `maxStorageSize`
5. **性能影响**：频繁的日志记录可能影响性能，在性能敏感的代码中谨慎使用

## 相关文档

- [Rust 日志模块](./logging-guide.md)
- [服务层日志中间件](./service-logging-guide.md)
- [项目开发规则](../../project-rules.md)
