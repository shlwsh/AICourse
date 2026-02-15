# 服务层日志系统使用指南

## 概述

服务层日志系统基于自定义的日志记录器实现，提供完善的日志记录功能，包括多级别日志、敏感信息过滤、文件输出等特性。

## 功能特性

### 1. 日志级别

支持四种标准日志级别：

- **DEBUG**：调试信息，仅在开发环境输出
- **INFO**：一般信息，记录正常的业务流程
- **WARN**：警告信息，记录潜在问题
- **ERROR**：错误信息，记录异常和错误

### 2. 日志输出

- **控制台输出**：开发环境默认启用，生产环境可配置
- **文件输出**：自动按日期轮转，支持自动清理旧日志

### 3. 敏感信息过滤

自动过滤以下敏感信息：

- 密码（password, passwd, pwd）
- 密钥（secret, token, api_key, access_key, private_key）
- 认证信息（authorization, auth）

### 4. 日志格式

```
[时间戳] [日志级别] [模块名称] 消息内容 | 附加数据
```

示例：

```
[2026-02-14T23:51:30.141Z] [INFO] [Service] 排课系统服务层启动中... | {"port":"3000"}
```

## 使用方法

### 基本使用

```typescript
import { logger } from './utils/logger';

// 记录信息日志
logger.info('用户登录成功', { userId: 123, username: 'test' });

// 记录警告
logger.warn('请求参数不完整', { missing: ['teacher_id'] });

// 记录错误
logger.error('数据库连接失败', { error: err.message, stack: err.stack });

// 记录调试信息
logger.debug('处理请求', { method: 'POST', path: '/api/schedule' });
```

### 创建自定义日志记录器

```typescript
import Logger, { LogLevel } from './utils/logger';

const customLogger = new Logger('CustomModule', {
  level: LogLevel.INFO,
  enableConsole: true,
  enableFile: true,
  logDir: 'custom-logs',
  filePrefix: 'custom',
  sanitizeSensitiveData: true,
  retentionDays: 30,
});

customLogger.info('自定义模块日志');
```

### 请求日志中间件

#### 标准配置

```typescript
import { Hono } from 'hono';
import { requestLogger } from './middleware/request-logger';

const app = new Hono();

// 使用默认配置
app.use('*', requestLogger());
```

#### 简化配置（仅记录基本信息）

```typescript
import { simpleRequestLogger } from './middleware/request-logger';

app.use('*', simpleRequestLogger());
```

#### 详细配置（记录所有信息）

```typescript
import { verboseRequestLogger } from './middleware/request-logger';

app.use('*', verboseRequestLogger());
```

#### 自定义配置

```typescript
app.use(
  '*',
  requestLogger({
    logRequestBody: true, // 记录请求体
    logResponseBody: false, // 不记录响应体
    logQueryParams: true, // 记录查询参数
    logHeaders: false, // 不记录请求头
    excludePaths: ['/health', '/metrics'], // 排除的路径
    slowRequestThreshold: 1000, // 慢请求阈值（毫秒）
  })
);
```

## 请求日志中间件功能

### 1. 自动记录请求信息

- 请求方法（GET, POST, PUT, DELETE 等）
- 请求路径
- 查询参数
- 请求体（POST/PUT/PATCH）
- 请求头（可选）

### 2. 自动记录响应信息

- 响应状态码
- 响应时间
- 响应体（可选）

### 3. 请求 ID

每个请求自动生成唯一的请求 ID，便于追踪和关联日志。

### 4. 慢请求检测

自动标记响应时间超过阈值的慢请求：

```
[2026-02-14T23:51:18.722Z] [WARN] [Service] HTTP 请求完成（慢请求） | {"requestId":"...","duration":"152ms"}
```

### 5. 错误日志

自动记录请求处理过程中的错误：

```
[2026-02-14T23:51:18.555Z] [ERROR] [Service] HTTP 请求完成（服务器错误） | {"requestId":"...","status":500}
```

### 6. 路径排除

可以配置不记录日志的路径，例如健康检查、静态资源等：

```typescript
requestLogger({
  excludePaths: ['/health', '/favicon.ico', '/metrics'],
});
```

## 日志文件管理

### 文件位置

默认日志文件位于项目根目录的 `logs/` 文件夹中。

### 文件命名

日志文件按日期命名：

```
logs/service.2026-02-14.log
logs/service.2026-02-15.log
```

### 自动清理

系统会自动清理超过保留期限的旧日志文件（默认 30 天）。

### 查看日志

```bash
# 查看最新日志
tail -f logs/service.$(date +%Y-%m-%d).log

# 查看最近 100 行
tail -100 logs/service.$(date +%Y-%m-%d).log

# 搜索特定内容
grep "ERROR" logs/service.*.log
```

## 配置选项

### LoggerConfig

| 选项                    | 类型      | 默认值                                    | 说明                   |
| ----------------------- | --------- | ----------------------------------------- | ---------------------- |
| level                   | LogLevel  | 开发环境：DEBUG<br>生产环境：INFO         | 最低日志级别           |
| enableConsole           | boolean   | true                                      | 是否启用控制台输出     |
| enableFile              | boolean   | true                                      | 是否启用文件输出       |
| logDir                  | string    | 'logs'                                    | 日志文件目录           |
| filePrefix              | string    | 'service'                                 | 日志文件名前缀         |
| sanitizeSensitiveData   | boolean   | true                                      | 是否过滤敏感信息       |
| retentionDays           | number    | 30                                        | 日志文件保留天数       |

### RequestLoggerConfig

| 选项                  | 类型     | 默认值                        | 说明                       |
| --------------------- | -------- | ----------------------------- | -------------------------- |
| logRequestBody        | boolean  | true                          | 是否记录请求体             |
| logResponseBody       | boolean  | false                         | 是否记录响应体             |
| logQueryParams        | boolean  | true                          | 是否记录查询参数           |
| logHeaders            | boolean  | false                         | 是否记录请求头             |
| excludePaths          | string[] | ['/health', '/favicon.ico']   | 需要排除的路径             |
| slowRequestThreshold  | number   | 1000                          | 慢请求阈值（毫秒）         |

## 最佳实践

### 1. 选择合适的日志级别

- **DEBUG**：用于详细的调试信息，仅在开发环境使用
- **INFO**：用于记录正常的业务流程和重要操作
- **WARN**：用于记录潜在问题和异常情况
- **ERROR**：用于记录错误和异常

### 2. 提供有意义的日志消息

```typescript
// ❌ 不好的做法
logger.info('操作完成');

// ✅ 好的做法
logger.info('用户登录成功', { userId: 123, username: 'test', ip: '192.168.1.1' });
```

### 3. 记录关键业务操作

```typescript
// 记录业务操作的入口和出口
logger.info('开始生成课表', { classCount: 26, teacherCount: 50 });
// ... 业务逻辑 ...
logger.info('课表生成完成', { duration: '25s', cost: 1234 });
```

### 4. 记录错误时包含上下文信息

```typescript
try {
  // 业务逻辑
} catch (error) {
  logger.error('课表生成失败', {
    error: error.message,
    stack: error.stack,
    classCount: 26,
    teacherCount: 50,
  });
}
```

### 5. 避免记录敏感信息

```typescript
// ❌ 不要这样做
logger.info('用户登录', { username: 'test', password: 'secret123' });

// ✅ 系统会自动过滤，但最好不要记录
logger.info('用户登录', { username: 'test' });
```

### 6. 使用结构化日志

```typescript
// ✅ 使用对象记录结构化数据
logger.info('API 调用', {
  method: 'POST',
  path: '/api/schedule',
  status: 200,
  duration: '150ms',
  userId: 123,
});
```

## 测试

### 运行单元测试

```bash
# 测试日志记录器
bun test src-service/utils/logger.test.ts

# 测试请求日志中间件
bun test src-service/middleware/request-logger.test.ts
```

### 测试覆盖率

- 日志记录器：100% 函数覆盖率，100% 行覆盖率
- 请求日志中间件：87.50% 函数覆盖率，84.07% 行覆盖率

## 故障排查

### 日志文件未生成

1. 检查日志目录是否存在写入权限
2. 检查配置中 `enableFile` 是否为 `true`
3. 检查日志级别配置是否正确

### 日志内容不完整

1. 检查日志级别配置，确保不会过滤掉需要的日志
2. 检查是否有异常导致日志写入失败

### 敏感信息未被过滤

1. 检查配置中 `sanitizeSensitiveData` 是否为 `true`
2. 如果使用自定义敏感关键词，需要修改源码中的 `SENSITIVE_KEYWORDS` 数组

## 相关文件

- `src-service/utils/logger.ts` - 日志记录器实现
- `src-service/middleware/request-logger.ts` - 请求日志中间件
- `src-service/utils/logger.test.ts` - 日志记录器测试
- `src-service/middleware/request-logger.test.ts` - 请求日志中间件测试
- `src-service/index.ts` - 服务层入口文件

## 参考资料

- [前端日志系统](./frontend-logger-guide.md)
- [Rust 日志系统](./logging-guide.md)
- [Hono 文档](https://hono.dev/)
