# 日志配置对比表

本文档对比三个日志系统的配置参数，确保配置的一致性。

## 配置参数对比

| 配置项 | Rust (tracing) | 前端 (TypeScript) | 服务层 (Bun) | 说明 |
|--------|----------------|-------------------|--------------|------|
| **日志级别** | `Level::DEBUG/INFO/WARN/ERROR` | `LogLevel.DEBUG/INFO/WARN/ERROR` | `LogLevel.DEBUG/INFO/WARN/ERROR` | ✅ 一致 |
| **控制台输出** | `console_output: bool` | `enableConsole: boolean` | `enableConsole: boolean` | ✅ 一致 |
| **文件输出** | `file_output: bool` | `enableStorage: boolean` | `enableFile: boolean` | ⚠️ 前端使用 LocalStorage |
| **日志目录** | `log_dir: PathBuf` | N/A | `logDir: string` | ⚠️ 前端不适用 |
| **文件前缀** | `file_prefix: String` | N/A | `filePrefix: string` | ⚠️ 前端不适用 |
| **保留天数** | `retention_days: u32` | N/A | `retentionDays: number` | ⚠️ 前端不适用 |
| **敏感信息过滤** | `sanitize_sensitive_data()` | `sanitizeSensitiveData: boolean` | `sanitizeSensitiveData: boolean` | ✅ 一致 |
| **时间戳格式** | ISO 8601 | ISO 8601 | ISO 8601 | ✅ 一致 |
| **日志格式** | `[时间戳] [级别] [模块] 消息 \| 数据` | `[时间戳] [级别] [模块] 消息 \| 数据` | `[时间戳] [级别] [模块] 消息 \| 数据` | ✅ 一致 |

## 环境配置对比

### 开发环境

| 配置项 | Rust | 前端 | 服务层 |
|--------|------|------|--------|
| 日志级别 | DEBUG | DEBUG | DEBUG |
| 控制台输出 | ✅ | ✅ | ✅ |
| 文件输出 | ✅ | ✅ (LocalStorage) | ✅ |
| 保留天数 | 7 | N/A | 7 |
| 线程信息 | ✅ | N/A | N/A |

### 生产环境

| 配置项 | Rust | 前端 | 服务层 |
|--------|------|------|--------|
| 日志级别 | INFO | INFO | INFO |
| 控制台输出 | ❌ | ✅ | ✅ |
| 文件输出 | ✅ | ✅ (LocalStorage) | ✅ |
| 保留天数 | 90 | N/A | 30 |
| 线程信息 | ❌ | N/A | N/A |

### 测试环境

| 配置项 | Rust | 前端 | 服务层 |
|--------|------|------|--------|
| 日志级别 | DEBUG | DEBUG | DEBUG |
| 控制台输出 | ✅ | ✅ | ✅ |
| 文件输出 | ❌ | ❌ | ❌ |
| 保留天数 | 0 | N/A | 0 |
| 线程信息 | ❌ | N/A | N/A |

## 日志格式示例对比

### Rust 日志输出

**控制台（Pretty 格式）：**
```
  2024-01-15T10:30:45.123456Z  INFO course_scheduling_system::logging: 排课求解完成
    at src/logging.rs:123
    in course_scheduling_system::solver
    with cost: 150, entries: 240, duration: "2.5s"
```

**文件（JSON 格式）：**
```json
{
  "timestamp": "2024-01-15T10:30:45.123456Z",
  "level": "INFO",
  "target": "course_scheduling_system::logging",
  "fields": {
    "message": "排课求解完成",
    "cost": 150,
    "entries": 240,
    "duration": "2.5s"
  },
  "span": {
    "name": "course_scheduling_system::solver"
  }
}
```

### 前端日志输出

**控制台：**
```
[2024-01-15T10:30:45.123Z] [INFO] [Frontend] 用户登录成功 | {"userId":123,"username":"admin"}
```

**LocalStorage（JSON 格式）：**
```json
{
  "timestamp": "2024-01-15T10:30:45.123Z",
  "level": "INFO",
  "module": "Frontend",
  "message": "用户登录成功",
  "data": {
    "userId": 123,
    "username": "admin"
  }
}
```

### 服务层日志输出

**控制台：**
```
[2024-01-15T10:30:45.123Z] [INFO] [Service] 收到请求 | {"method":"POST","path":"/api/schedule/generate"}
```

**文件：**
```
[2024-01-15T10:30:45.123Z] [INFO] [Service] 收到请求 | {"method":"POST","path":"/api/schedule/generate"}
```

## 敏感信息过滤对比

### 过滤关键词列表

| Rust | 前端 | 服务层 |
|------|------|--------|
| password, passwd, pwd | password, passwd, pwd | password, passwd, pwd |
| secret | secret | secret |
| token | token | token |
| api_key, apikey | api_key, apikey, apiKey | api_key, apikey, apiKey |
| access_key | access_key, accessKey | access_key, accessKey |
| private_key | private_key, privateKey | private_key, privateKey |
| - | authorization, auth | authorization, auth |

### 过滤效果对比

**原始数据：**
```json
{
  "username": "admin",
  "password": "secret123",
  "api_key": "abc123"
}
```

**Rust 过滤后：**
```json
{
  "username": "admin",
  "password": "***",
  "api_key": "***"
}
```

**前端过滤后：**
```json
{
  "username": "admin",
  "password": "***",
  "api_key": "***"
}
```

**服务层过滤后：**
```json
{
  "username": "admin",
  "password": "***",
  "api_key": "***"
}
```

✅ **结论：三个系统的敏感信息过滤效果一致**

## 日志轮转策略对比

| 系统 | 轮转方式 | 文件命名 | 实现方式 |
|------|----------|----------|----------|
| Rust | 按日期 | `course-scheduling.YYYY-MM-DD.log` | `tracing-appender::rolling::Rotation::DAILY` |
| 前端 | N/A | N/A | 使用 LocalStorage，不需要轮转 |
| 服务层 | 按日期 | `service.YYYY-MM-DD.log` | 动态生成文件名 |

✅ **结论：Rust 和服务层的轮转策略一致**

## 日志清理策略对比

| 系统 | 清理时机 | 保留天数（开发） | 保留天数（生产） | 保留天数（测试） |
|------|----------|------------------|------------------|------------------|
| Rust | 应用启动时 | 7 天 | 90 天 | 0 天（不保留） |
| 前端 | 手动清理 | N/A | N/A | N/A |
| 服务层 | 应用启动时 | 7 天 | 30 天 | 0 天（不保留） |

⚠️ **注意：生产环境的保留天数不一致（Rust: 90 天，服务层: 30 天）**

**建议：统一生产环境的保留天数为 30 天**

## 配置方式对比

### Rust 配置

```rust
// 方式 1：使用默认配置
init_default_logging();

// 方式 2：使用预设配置
init_logging(LogConfig::development())?;
init_logging(LogConfig::production())?;
init_logging(LogConfig::test())?;

// 方式 3：使用自定义配置
let config = LogConfig {
    level: Level::INFO,
    log_dir: PathBuf::from("logs"),
    console_output: true,
    file_output: true,
    retention_days: 30,
    ..Default::default()
};
init_logging(config)?;

// 方式 4：使用环境变量
// export RUST_LOG=course_scheduling_system=debug
```

### 前端配置

```typescript
// 方式 1：使用默认实例
import { logger } from '@/utils/logger';
logger.info('消息');

// 方式 2：创建自定义实例
import Logger, { LogLevel } from '@/utils/logger';
const customLogger = new Logger('CustomModule', {
  level: LogLevel.INFO,
  enableConsole: true,
  enableStorage: true,
});

// 方式 3：动态更新配置
logger.updateConfig({
  level: LogLevel.DEBUG,
});
```

### 服务层配置

```typescript
// 方式 1：使用默认实例
import { logger } from './utils/logger';
logger.info('消息');

// 方式 2：创建自定义实例
import Logger, { LogLevel } from './utils/logger';
const customLogger = new Logger('CustomService', {
  level: LogLevel.INFO,
  enableConsole: true,
  enableFile: true,
  logDir: 'logs',
  retentionDays: 30,
});

// 方式 3：使用环境变量
// export NODE_ENV=production
// export LOG_LEVEL=INFO
```

## 一致性检查清单

- [x] 日志级别定义一致（DEBUG、INFO、WARN、ERROR）
- [x] 日志格式一致（`[时间戳] [级别] [模块] 消息 | 数据`）
- [x] 时间戳格式一致（ISO 8601）
- [x] 敏感信息过滤关键词基本一致
- [x] 敏感信息过滤效果一致
- [x] 日志轮转策略一致（Rust 和服务层）
- [ ] 生产环境保留天数不一致（需要统一）
- [x] 环境变量配置方式已定义
- [x] 配置文档已创建

## 改进建议

### 1. 统一生产环境保留天数

**当前状态：**
- Rust: 90 天
- 服务层: 30 天

**建议：**
统一为 30 天，理由：
- 30 天足够用于问题追溯
- 减少磁盘空间占用
- 与服务层保持一致

**修改方法：**
```rust
// src-tauri/src/logging.rs
pub fn production() -> Self {
    Self {
        level: Level::INFO,
        console_output: false,
        file_output: true,
        with_thread_info: false,
        retention_days: 30, // 修改为 30 天
        ..Default::default()
    }
}
```

### 2. 补充前端敏感关键词

**当前状态：**
前端和服务层包含 `authorization` 和 `auth`，但 Rust 没有。

**建议：**
在 Rust 的敏感关键词列表中添加这两个关键词。

**修改方法：**
```rust
// src-tauri/src/logging.rs
pub fn sanitize_sensitive_data(data: &str) -> String {
    let sensitive_patterns = [
        "password", "passwd", "pwd", "secret", "token",
        "api_key", "apikey", "access_key", "private_key",
        "authorization", "auth", // 添加这两个
    ];
    // ...
}
```

### 3. 添加日志级别环境变量支持

**当前状态：**
- Rust: 支持 `RUST_LOG` 环境变量
- 前端: 不支持环境变量
- 服务层: 不支持环境变量

**建议：**
为前端和服务层添加环境变量支持。

**修改方法：**

**前端：**
```typescript
// src/utils/logger.ts
const defaultConfig: LoggerConfig = {
  level: (import.meta.env.VITE_LOG_LEVEL as LogLevel) ||
         (import.meta.env.DEV ? LogLevel.DEBUG : LogLevel.INFO),
  enableConsole: import.meta.env.VITE_LOG_ENABLE_CONSOLE !== 'false',
  enableStorage: import.meta.env.VITE_LOG_ENABLE_STORAGE !== 'false',
  maxStorageSize: Number(import.meta.env.VITE_LOG_MAX_STORAGE_SIZE) || 1000,
  sanitizeSensitiveData: import.meta.env.VITE_LOG_SANITIZE_SENSITIVE_DATA !== 'false',
};
```

**服务层：**
```typescript
// src-service/utils/logger.ts
const defaultConfig: LoggerConfig = {
  level: (process.env.LOG_LEVEL as LogLevel) ||
         (process.env.NODE_ENV === 'development' ? LogLevel.DEBUG : LogLevel.INFO),
  enableConsole: process.env.LOG_ENABLE_CONSOLE !== 'false',
  enableFile: process.env.LOG_ENABLE_FILE !== 'false',
  logDir: process.env.LOG_DIR || 'logs',
  filePrefix: process.env.LOG_FILE_PREFIX || 'service',
  retentionDays: Number(process.env.LOG_RETENTION_DAYS) || 30,
  sanitizeSensitiveData: process.env.LOG_SANITIZE_SENSITIVE_DATA !== 'false',
};
```

## 验证步骤

### 1. 验证日志级别

```bash
# Rust
RUST_LOG=course_scheduling_system=debug cargo run

# 服务层
LOG_LEVEL=DEBUG bun run src-service/index.ts

# 前端
VITE_LOG_LEVEL=DEBUG bun run dev
```

### 2. 验证日志格式

检查三个系统的日志输出是否符合统一格式：
```
[时间戳] [日志级别] [模块名称] 消息内容 | 附加数据
```

### 3. 验证敏感信息过滤

在三个系统中记录包含敏感信息的日志，验证是否正确过滤：
```typescript
logger.info('用户登录', { username: 'admin', password: 'secret123' });
// 应输出：logger.info('用户登录', { username: 'admin', password: '***' });
```

### 4. 验证日志轮转

运行应用超过一天，检查是否生成新的日志文件：
```bash
ls -la logs/
# 应看到：
# course-scheduling.2024-01-15.log
# course-scheduling.2024-01-16.log
# service.2024-01-15.log
# service.2024-01-16.log
```

### 5. 验证日志清理

修改系统时间或等待保留期限过后，检查旧日志是否被清理：
```bash
# 检查日志文件
ls -la logs/

# 应只保留最近 N 天的日志文件
```

## 总结

三个日志系统的配置基本一致，主要差异在于：

1. **前端使用 LocalStorage**：不需要文件轮转和清理
2. **生产环境保留天数不一致**：建议统一为 30 天
3. **敏感关键词列表略有差异**：建议补充 Rust 的关键词列表

遵循本文档的建议进行改进后，三个日志系统将完全一致。
