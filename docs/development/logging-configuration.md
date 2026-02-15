# 日志系统配置文档

## 概述

本文档描述排课系统三个日志系统（Rust、前端、服务层）的统一配置规范，确保日志级别、输出格式和管理策略的一致性。

## 日志级别

### 统一的日志级别定义

所有三个日志系统使用相同的四个日志级别：

| 级别 | 用途 | 使用场景 |
|------|------|----------|
| **DEBUG** | 调试信息 | 详细的程序执行流程、变量值、中间状态 |
| **INFO** | 信息日志 | 正常的业务操作、关键步骤完成、状态变更 |
| **WARN** | 警告信息 | 潜在问题、软约束违反、性能警告 |
| **ERROR** | 错误信息 | 异常、错误、失败操作、需要关注的问题 |

### 环境配置

#### 开发环境（Development）

```
日志级别：DEBUG
控制台输出：启用
文件输出：启用
日志保留：7 天
```

**配置说明：**
- 输出所有级别的日志，便于开发调试
- 同时输出到控制台和文件
- 较短的保留期限，避免占用过多磁盘空间

#### 生产环境（Production）

```
日志级别：INFO
控制台输出：禁用（Rust）/ 启用（前端、服务层）
文件输出：启用
日志保留：30-90 天
```

**配置说明：**
- 只记录 INFO 及以上级别的日志，减少日志量
- Rust 后端禁用控制台输出，避免影响性能
- 前端和服务层保留控制台输出，便于监控
- 较长的保留期限，便于问题追溯

#### 测试环境（Test）

```
日志级别：DEBUG
控制台输出：启用
文件输出：禁用
日志保留：不保留
```

**配置说明：**
- 输出详细日志，便于测试验证
- 只输出到控制台，不写入文件
- 测试结束后不保留日志

## 日志输出格式

### 统一的日志格式

所有三个日志系统使用一致的日志格式：

```
[时间戳] [日志级别] [模块名称] 消息内容 | 附加数据
```

### 格式说明

#### 时间戳
- **格式**：ISO 8601 格式（`YYYY-MM-DDTHH:mm:ss.sssZ`）
- **示例**：`2024-01-15T10:30:45.123Z`
- **说明**：使用 UTC 时区，便于跨时区日志分析

#### 日志级别
- **格式**：大写字母
- **示例**：`DEBUG`、`INFO`、`WARN`、`ERROR`
- **说明**：固定宽度，便于日志解析

#### 模块名称
- **格式**：模块或组件的标识符
- **示例**：`ConstraintSolver`、`Frontend`、`Service`
- **说明**：标识日志来源，便于问题定位

#### 消息内容
- **格式**：简洁的中文描述
- **示例**：`排课求解完成`、`用户登录成功`
- **说明**：描述发生的事件或操作

#### 附加数据
- **格式**：JSON 格式的结构化数据
- **示例**：`{"cost": 150, "duration": "2.5s"}`
- **说明**：提供额外的上下文信息

### 格式示例

#### Rust 日志示例

```
[2024-01-15T10:30:45.123Z] [INFO] [ConstraintSolver] 排课求解完成 | {"cost": 150, "entries": 240, "duration": "2.5s"}
[2024-01-15T10:30:46.456Z] [WARN] [DatabaseManager] 数据库连接池接近上限 | {"current": 18, "max": 20}
[2024-01-15T10:30:47.789Z] [ERROR] [TauriCommand] 生成课表失败 | {"error": "无法找到可行解", "class_count": 26}
```

#### 前端日志示例

```
[2024-01-15T10:30:45.123Z] [INFO] [Frontend] 用户登录成功 | {"userId": 123, "username": "admin"}
[2024-01-15T10:30:46.456Z] [WARN] [ScheduleGrid] 课时数接近上限 | {"classId": 456, "current": 38, "max": 40}
[2024-01-15T10:30:47.789Z] [ERROR] [API] API 调用失败 | {"endpoint": "/api/schedule/generate", "status": 500}
```

#### 服务层日志示例

```
[2024-01-15T10:30:45.123Z] [INFO] [Service] 收到请求 | {"method": "POST", "path": "/api/schedule/generate"}
[2024-01-15T10:30:46.456Z] [INFO] [Service] 请求完成 | {"method": "POST", "path": "/api/schedule/generate", "status": 200, "duration": "2.5s"}
[2024-01-15T10:30:47.789Z] [ERROR] [Service] 请求处理失败 | {"error": "数据库连接失败", "path": "/api/teacher/preference"}
```

## 日志文件管理

### 文件命名规范

#### Rust 日志文件

```
logs/course-scheduling.YYYY-MM-DD.log
```

**示例：**
- `logs/course-scheduling.2024-01-15.log`
- `logs/course-scheduling.2024-01-16.log`

#### 前端日志文件

前端日志存储在浏览器的 LocalStorage 中，不生成文件。

**存储键名：** `course-scheduling-logs`

#### 服务层日志文件

```
logs/service.YYYY-MM-DD.log
```

**示例：**
- `logs/service.2024-01-15.log`
- `logs/service.2024-01-16.log`

### 日志轮转策略

#### 轮转方式

所有日志系统采用**按日期轮转**的策略：

- **轮转周期**：每天午夜（00:00:00）自动创建新的日志文件
- **文件命名**：使用日期作为文件名后缀（`YYYY-MM-DD`）
- **并发处理**：支持多进程/多线程同时写入同一日志文件

#### 轮转实现

**Rust（tracing-appender）：**
```rust
use tracing_appender::rolling::{RollingFileAppender, Rotation};

let file_appender = RollingFileAppender::builder()
    .rotation(Rotation::DAILY)
    .filename_prefix("course-scheduling")
    .filename_suffix("log")
    .build("logs")?;
```

**服务层（Bun）：**
```typescript
private getLogFilePath(): string {
  const date = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
  return join(this.config.logDir, `${this.config.filePrefix}.${date}.log`);
}
```

### 日志清理策略

#### 清理规则

| 环境 | 保留天数 | 清理时机 |
|------|----------|----------|
| 开发环境 | 7 天 | 应用启动时 |
| 生产环境 | 30-90 天 | 应用启动时 |
| 测试环境 | 0 天（不保留） | 测试结束后 |

#### 清理实现

**Rust：**
```rust
pub fn cleanup_old_logs(
    log_dir: &PathBuf,
    file_prefix: &str,
    retention_days: u32,
) -> Result<(), Box<dyn std::error::Error>> {
    // 计算截止时间
    let cutoff_time = now - (retention_days as u64 * 24 * 60 * 60);

    // 遍历日志目录，删除过期文件
    for entry in std::fs::read_dir(log_dir)? {
        let entry = entry?;
        let path = entry.path();

        if let Ok(metadata) = entry.metadata() {
            if let Ok(modified) = metadata.modified() {
                let modified_secs = modified
                    .duration_since(UNIX_EPOCH)
                    .unwrap_or_default()
                    .as_secs();

                if modified_secs < cutoff_time {
                    std::fs::remove_file(&path)?;
                }
            }
        }
    }

    Ok(())
}
```

**服务层：**
```typescript
private cleanupOldLogs(): void {
  const files = readdirSync(this.config.logDir);
  const now = Date.now();
  const cutoffTime = now - this.config.retentionDays * 24 * 60 * 60 * 1000;

  files.forEach((file) => {
    if (file.startsWith(this.config.filePrefix) && file.endsWith('.log')) {
      const filePath = join(this.config.logDir, file);
      const stats = statSync(filePath);

      if (stats.mtimeMs < cutoffTime) {
        unlinkSync(filePath);
      }
    }
  });
}
```

## 敏感信息过滤

### 过滤规则

所有三个日志系统都实现了敏感信息过滤，防止密码、密钥等敏感数据泄露到日志中。

#### 敏感关键词列表

```
password, passwd, pwd
secret
token
api_key, apikey, apiKey
access_key, accessKey
private_key, privateKey
authorization, auth
```

#### 过滤方式

**键值对格式（URL 参数）：**
```
原始：password=secret123&api_key=abc123
过滤：password=***&api_key=***
```

**JSON 格式：**
```json
原始：{"username": "admin", "password": "secret123"}
过滤：{"username": "admin", "password": "***"}
```

### 过滤实现

**Rust：**
```rust
pub fn sanitize_sensitive_data(data: &str) -> String {
    let sensitive_patterns = [
        "password", "passwd", "pwd", "secret", "token",
        "api_key", "apikey", "access_key", "private_key",
    ];

    let mut result = data.to_string();

    for pattern in &sensitive_patterns {
        // 匹配 key=value 格式
        let re = regex::Regex::new(&format!(r"(?i){}=[^&\s]*", pattern)).unwrap();
        result = re.replace_all(&result, &format!("{}=***", pattern)).to_string();

        // 匹配 "key": "value" 格式（JSON）
        let re = regex::Regex::new(&format!(r#"(?i)"{}"\s*:\s*"[^"]*""#, pattern)).unwrap();
        result = re
            .replace_all(&result, &format!(r#""{}": "***""#, pattern))
            .to_string();
    }

    result
}
```

**前端和服务层：**
```typescript
private sanitize(data: any): any {
  if (typeof data === 'object' && data !== null) {
    const sanitized: any = {};
    for (const [key, value] of Object.entries(data)) {
      const isSensitiveKey = SENSITIVE_KEYWORDS.some(keyword =>
        key.toLowerCase().includes(keyword.toLowerCase())
      );

      if (isSensitiveKey) {
        sanitized[key] = '***';
      } else {
        sanitized[key] = this.sanitize(value);
      }
    }
    return sanitized;
  }
  return data;
}
```

## 配置方式

### Rust 日志配置

#### 使用默认配置

```rust
use course_scheduling_system::logging::init_default_logging;

fn main() {
    // 自动根据编译模式选择配置
    init_default_logging();
}
```

#### 使用自定义配置

```rust
use course_scheduling_system::logging::{init_logging, LogConfig};
use tracing::Level;

fn main() {
    let config = LogConfig {
        level: Level::INFO,
        log_dir: PathBuf::from("logs"),
        console_output: true,
        file_output: true,
        retention_days: 30,
        ..Default::default()
    };

    init_logging(config).expect("日志初始化失败");
}
```

#### 使用环境变量

```bash
# 设置日志级别
export RUST_LOG=course_scheduling_system=debug

# 运行应用
./course-scheduling-system
```

### 前端日志配置

#### 使用默认日志实例

```typescript
import { logger } from '@/utils/logger';

// 直接使用
logger.info('用户登录成功', { userId: 123 });
```

#### 创建自定义日志实例

```typescript
import Logger, { LogLevel } from '@/utils/logger';

const customLogger = new Logger('CustomModule', {
  level: LogLevel.INFO,
  enableConsole: true,
  enableStorage: true,
  maxStorageSize: 1000,
  sanitizeSensitiveData: true,
});

customLogger.info('自定义模块日志');
```

#### 动态更新配置

```typescript
import { logger } from '@/utils/logger';
import { LogLevel } from '@/utils/logger';

// 更新日志级别
logger.updateConfig({
  level: LogLevel.DEBUG,
  enableConsole: true,
});
```

### 服务层日志配置

#### 使用默认日志实例

```typescript
import { logger } from './utils/logger';

// 直接使用
logger.info('API 请求成功', { path: '/api/schedule' });
```

#### 创建自定义日志实例

```typescript
import Logger, { LogLevel } from './utils/logger';

const customLogger = new Logger('CustomService', {
  level: LogLevel.INFO,
  enableConsole: true,
  enableFile: true,
  logDir: 'custom-logs',
  filePrefix: 'custom',
  retentionDays: 30,
});

customLogger.info('自定义服务日志');
```

#### 使用环境变量

```bash
# 设置日志级别
export NODE_ENV=production

# 运行服务
bun run src-service/index.ts
```

## 环境变量配置

### 创建环境变量文件

#### 开发环境（.env.development）

```bash
# Rust 日志配置
RUST_LOG=course_scheduling_system=debug

# 服务层日志配置
NODE_ENV=development
LOG_LEVEL=DEBUG
LOG_DIR=logs
LOG_RETENTION_DAYS=7

# 前端日志配置
VITE_LOG_LEVEL=DEBUG
VITE_LOG_ENABLE_STORAGE=true
```

#### 生产环境（.env.production）

```bash
# Rust 日志配置
RUST_LOG=course_scheduling_system=info

# 服务层日志配置
NODE_ENV=production
LOG_LEVEL=INFO
LOG_DIR=logs
LOG_RETENTION_DAYS=30

# 前端日志配置
VITE_LOG_LEVEL=INFO
VITE_LOG_ENABLE_STORAGE=true
```

#### 测试环境（.env.test）

```bash
# Rust 日志配置
RUST_LOG=course_scheduling_system=debug

# 服务层日志配置
NODE_ENV=test
LOG_LEVEL=DEBUG
LOG_DIR=logs
LOG_RETENTION_DAYS=0

# 前端日志配置
VITE_LOG_LEVEL=DEBUG
VITE_LOG_ENABLE_STORAGE=false
```

### 环境变量说明

| 变量名 | 说明 | 可选值 | 默认值 |
|--------|------|--------|--------|
| `RUST_LOG` | Rust 日志级别 | `debug`, `info`, `warn`, `error` | `info` |
| `NODE_ENV` | Node.js 环境 | `development`, `production`, `test` | `development` |
| `LOG_LEVEL` | 服务层日志级别 | `DEBUG`, `INFO`, `WARN`, `ERROR` | `INFO` |
| `LOG_DIR` | 日志目录 | 任意路径 | `logs` |
| `LOG_RETENTION_DAYS` | 日志保留天数 | 数字 | `30` |
| `VITE_LOG_LEVEL` | 前端日志级别 | `DEBUG`, `INFO`, `WARN`, `ERROR` | `INFO` |
| `VITE_LOG_ENABLE_STORAGE` | 前端日志存储 | `true`, `false` | `true` |

## 日志使用最佳实践

### 1. 选择合适的日志级别

```rust
// ✅ 正确：使用 INFO 记录关键业务操作
info!("排课求解完成", cost = schedule.cost);

// ❌ 错误：使用 DEBUG 记录关键业务操作
debug!("排课求解完成", cost = schedule.cost);

// ✅ 正确：使用 DEBUG 记录详细的执行流程
debug!("检查时间槽位", day = slot.day, period = slot.period);

// ✅ 正确：使用 WARN 记录潜在问题
warn!("班级课时数接近上限", class_id = class.id, current = 38, max = 40);

// ✅ 正确：使用 ERROR 记录错误和异常
error!("数据库操作失败", error = ?err);
```

### 2. 提供足够的上下文信息

```typescript
// ✅ 正确：提供详细的上下文
logger.info('课程移动成功', {
  classId: 123,
  subjectId: 'math',
  fromSlot: { day: 1, period: 2 },
  toSlot: { day: 3, period: 4 },
});

// ❌ 错误：缺少上下文信息
logger.info('课程移动成功');
```

### 3. 避免记录敏感信息

```typescript
// ✅ 正确：不记录密码
logger.info('用户登录成功', { userId: 123, username: 'admin' });

// ❌ 错误：记录了密码
logger.info('用户登录成功', { userId: 123, username: 'admin', password: 'secret' });
```

### 4. 使用结构化日志

```rust
// ✅ 正确：使用结构化字段
info!(
    teacher_id = teacher.id,
    class_count = classes.len(),
    "保存教师偏好"
);

// ❌ 错误：将数据拼接到消息中
info!("保存教师偏好: teacher_id={}, class_count={}", teacher.id, classes.len());
```

### 5. 在关键位置添加日志

```rust
pub async fn generate_schedule(&self) -> Result<Schedule, Error> {
    info!("开始生成课表");

    // 加载配置
    let config = self.load_config().await?;
    debug!("配置加载完成", config_count = config.len());

    // 执行求解
    let schedule = self.solver.solve(&config)?;
    info!("课表生成成功", cost = schedule.cost, entries = schedule.entries.len());

    // 保存结果
    self.save_schedule(&schedule).await?;
    info!("课表保存完成");

    Ok(schedule)
}
```

### 6. 错误处理时记录详细信息

```typescript
try {
  const schedule = await this.generateSchedule();
  logger.info('课表生成成功', { cost: schedule.cost });
} catch (error) {
  logger.error('课表生成失败', {
    error: error.message,
    stack: error.stack,
    timestamp: new Date().toISOString(),
  });
  throw error;
}
```

## 日志查看和分析

### 查看日志文件

#### Rust 日志

```bash
# 查看最新日志
tail -f logs/course-scheduling.$(date +%Y-%m-%d).log

# 搜索错误日志
grep "ERROR" logs/course-scheduling.*.log

# 搜索特定模块的日志
grep "ConstraintSolver" logs/course-scheduling.*.log
```

#### 服务层日志

```bash
# 查看最新日志
tail -f logs/service.$(date +%Y-%m-%d).log

# 搜索特定请求的日志
grep "POST /api/schedule" logs/service.*.log

# 统计错误数量
grep -c "ERROR" logs/service.*.log
```

### 前端日志查看

#### 浏览器控制台

打开浏览器开发者工具（F12），查看 Console 标签页。

#### 导出日志

```typescript
import { logger } from '@/utils/logger';

// 导出为文本文件
logger.downloadLogs('text');

// 导出为 JSON 文件
logger.downloadLogs('json');

// 获取日志历史
const logs = logger.getHistory();
console.log(logs);

// 获取特定级别的日志
const errors = logger.getHistory(LogLevel.ERROR);
console.log(errors);
```

### 日志分析工具

#### 推荐工具

1. **grep/awk/sed**：命令行文本处理工具
2. **jq**：JSON 日志解析工具
3. **lnav**：日志文件查看器
4. **ELK Stack**：企业级日志分析平台（可选）

#### 使用示例

```bash
# 使用 jq 解析 JSON 格式的日志
cat logs/course-scheduling.*.log | jq 'select(.level == "ERROR")'

# 统计每个日志级别的数量
grep -oP '\[(DEBUG|INFO|WARN|ERROR)\]' logs/*.log | sort | uniq -c

# 查找耗时超过 1 秒的请求
grep "duration" logs/service.*.log | awk -F'"duration": "' '{print $2}' | awk -F's"' '$1 > 1 {print}'
```

## 故障排查

### 常见问题

#### 1. 日志文件未生成

**可能原因：**
- 日志目录不存在或无写入权限
- 文件输出被禁用

**解决方法：**
```bash
# 检查日志目录
ls -la logs/

# 创建日志目录
mkdir -p logs

# 修改权限
chmod 755 logs
```

#### 2. 日志级别不正确

**可能原因：**
- 环境变量配置错误
- 代码中硬编码了日志级别

**解决方法：**
```bash
# 检查环境变量
echo $RUST_LOG
echo $NODE_ENV

# 设置正确的环境变量
export RUST_LOG=course_scheduling_system=debug
export NODE_ENV=development
```

#### 3. 日志文件过大

**可能原因：**
- 日志级别设置为 DEBUG
- 日志清理策略未生效

**解决方法：**
```bash
# 手动清理旧日志
find logs/ -name "*.log" -mtime +30 -delete

# 调整日志级别
export RUST_LOG=course_scheduling_system=info
```

#### 4. 敏感信息泄露

**可能原因：**
- 敏感信息过滤被禁用
- 敏感关键词列表不完整

**解决方法：**
```typescript
// 确保敏感信息过滤启用
logger.updateConfig({
  sanitizeSensitiveData: true,
});

// 检查日志输出
const logs = logger.getHistory();
console.log(logs);
```

## 总结

本文档提供了排课系统三个日志系统的统一配置规范，包括：

1. **日志级别**：DEBUG、INFO、WARN、ERROR
2. **输出格式**：`[时间戳] [日志级别] [模块名称] 消息内容 | 附加数据`
3. **文件管理**：按日期轮转、自动清理旧日志
4. **敏感信息过滤**：自动过滤密码、密钥等敏感数据
5. **环境配置**：开发、生产、测试环境的不同配置
6. **最佳实践**：日志使用的推荐做法

遵循本文档的配置规范，可以确保三个日志系统的一致性，便于日志管理和问题排查。
