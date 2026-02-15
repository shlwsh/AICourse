# 日志系统使用指南

## 概述

排课系统使用 Rust 的 `tracing` 框架实现结构化日志记录。日志系统支持多种输出方式、日志级别和格式化选项，满足开发、测试和生产环境的不同需求。

## 功能特性

### 1. 日志级别

系统支持标准的日志级别：

- **DEBUG**: 详细的调试信息，仅在开发环境使用
- **INFO**: 一般信息，记录关键操作和状态变更
- **WARN**: 警告信息，表示潜在问题但不影响系统运行
- **ERROR**: 错误信息，表示系统出现问题需要关注

### 2. 输出方式

- **控制台输出**: 彩色格式化输出，便于开发调试
- **文件输出**: JSON 格式输出，便于日志分析和查询
- **双重输出**: 同时输出到控制台和文件

### 3. 日志轮转

日志文件按日期自动轮转，格式为：`{prefix}.{date}.log`

例如：
- `course-scheduling.2024-01-15.log`
- `course-scheduling.2024-01-16.log`

### 4. 自动清理旧日志

系统支持自动清理超过保留期限的日志文件，避免磁盘空间占用过多。

配置选项：
- **retention_days**: 日志保留天数（0 表示不自动清理）
- 开发环境默认保留 7 天
- 生产环境默认保留 90 天
- 测试环境不保留（retention_days = 0）

清理规则：
- 在日志系统初始化时自动执行清理
- 根据文件修改时间判断是否过期
- 只清理匹配指定前缀的日志文件

### 5. 敏感信息过滤

系统自动过滤日志中的敏感信息，包括：
- 密码 (password, passwd, pwd)
- 密钥 (secret, token, api_key)
- 访问凭证 (access_key, private_key)

## 使用方法

### 基本使用

```rust
use tracing::{debug, info, warn, error};

// 记录信息日志
info!("排课系统启动");

// 记录带参数的日志
info!(version = "0.1.0", "系统版本");

// 记录警告
warn!(class_id = 123, "班级课时数接近上限");

// 记录错误
error!(error = ?err, "数据库操作失败");
```

### 结构化日志

```rust
use tracing::{info, instrument};

#[instrument]
fn save_teacher_preference(teacher_id: u32, preference: &TeacherPreference) {
    info!("开始保存教师偏好");

    // 业务逻辑...

    info!(teacher_id, "教师偏好保存成功");
}
```

### 日志配置

#### 开发环境

```rust
use course_scheduling_system::logging::{init_logging, LogConfig};

let config = LogConfig::development();
init_logging(config).expect("日志初始化失败");
```

开发环境配置：
- 日志级别: DEBUG
- 控制台输出: 启用（彩色格式）
- 文件输出: 启用（JSON 格式）
- 线程信息: 启用

#### 生产环境

```rust
let config = LogConfig::production();
init_logging(config).expect("日志初始化失败");
```

生产环境配置：
- 日志级别: INFO
- 控制台输出: 禁用
- 文件输出: 启用（JSON 格式）
- 线程信息: 禁用

#### 测试环境

```rust
let config = LogConfig::test();
init_logging(config).expect("日志初始化失败");
```

测试环境配置：
- 日志级别: DEBUG
- 控制台输出: 启用
- 文件输出: 禁用

#### 自定义配置

```rust
use std::path::PathBuf;
use tracing::Level;

let config = LogConfig {
    level: Level::INFO,
    log_dir: PathBuf::from("logs"),
    console_output: true,
    file_output: true,
    file_prefix: "my-app".to_string(),
    with_timestamp: true,
    with_target: true,
    with_location: true,
    with_thread_info: false,
    retention_days: 30,  // 保留 30 天的日志
};

init_logging(config).expect("日志初始化失败");
```

**配置选项说明**：

- `level`: 日志级别（DEBUG、INFO、WARN、ERROR）
- `log_dir`: 日志文件目录
- `console_output`: 是否输出到控制台
- `file_output`: 是否输出到文件
- `file_prefix`: 日志文件名前缀
- `with_timestamp`: 是否包含时间戳
- `with_target`: 是否包含目标模块名
- `with_location`: 是否包含文件和行号
- `with_thread_info`: 是否包含线程信息
- `retention_days`: 日志保留天数（0 表示不自动清理）

### 环境变量控制

可以通过 `RUST_LOG` 环境变量动态控制日志级别：

```bash
# 设置全局日志级别为 DEBUG
export RUST_LOG=debug

# 设置特定模块的日志级别
export RUST_LOG=course_scheduling_system=debug,sqlx=warn

# 运行应用
cargo run
```

## 日志格式

### 控制台输出格式

```
2024-01-15T10:30:45.123456Z  INFO course_scheduling_system::solver: 开始排课求解
    at src/solver/mod.rs:123
    in course_scheduling_system::solver::solve

2024-01-15T10:30:45.234567Z  WARN course_scheduling_system::solver: 发现软约束冲突
    at src/solver/mod.rs:156
    in course_scheduling_system::solver::solve
    with teacher_id: 123, slot: TimeSlot { day: 1, period: 3 }
```

### 文件输出格式（JSON）

```json
{
  "timestamp": "2024-01-15T10:30:45.123456Z",
  "level": "INFO",
  "target": "course_scheduling_system::solver",
  "fields": {
    "message": "开始排课求解"
  },
  "span": {
    "name": "solve"
  },
  "file": "src/solver/mod.rs",
  "line": 123
}
```

## 最佳实践

### 1. 在关键操作处添加日志

```rust
pub async fn generate_schedule(&self) -> Result<Schedule, SolverError> {
    info!("开始生成课表");

    // 业务逻辑
    let schedule = self.solve()?;

    info!(cost = schedule.cost, entries = schedule.entries.len(), "课表生成成功");

    Ok(schedule)
}
```

### 2. 记录错误和异常

```rust
pub async fn save_to_database(&self, schedule: &Schedule) -> Result<(), DatabaseError> {
    match self.db.save_schedule(schedule).await {
        Ok(schedule_id) => {
            info!(schedule_id, "课表保存成功");
            Ok(())
        }
        Err(e) => {
            error!(error = ?e, "课表保存失败");
            Err(e.into())
        }
    }
}
```

### 3. 使用 instrument 宏追踪函数调用

```rust
use tracing::instrument;

#[instrument(skip(self))]
pub async fn calculate_cost(&self, schedule: &Schedule) -> u32 {
    debug!("开始计算代价值");

    let cost = // 计算逻辑

    debug!(cost, "代价值计算完成");
    cost
}
```

### 4. 过滤敏感信息

```rust
use course_scheduling_system::logging::sanitize_sensitive_data;

let user_input = "username=admin&password=secret123";
let safe_input = sanitize_sensitive_data(user_input);
info!(input = %safe_input, "处理用户输入");
// 输出: input="username=admin&password=***"
```

### 5. 记录性能指标

```rust
use std::time::Instant;

let start = Instant::now();

// 执行操作
let result = heavy_computation();

let duration = start.elapsed();
info!(duration_ms = duration.as_millis(), "操作完成");
```

## 日志查看和分析

### 查看实时日志

```bash
# 查看最新的日志文件
tail -f logs/course-scheduling.$(date +%Y-%m-%d).log
```

### 分析 JSON 日志

使用 `jq` 工具分析 JSON 格式的日志：

```bash
# 查看所有错误日志
cat logs/course-scheduling.*.log | jq 'select(.level == "ERROR")'

# 统计各级别日志数量
cat logs/course-scheduling.*.log | jq -r '.level' | sort | uniq -c

# 查找特定模块的日志
cat logs/course-scheduling.*.log | jq 'select(.target | contains("solver"))'

# 查找包含特定字段的日志
cat logs/course-scheduling.*.log | jq 'select(.fields.teacher_id == 123)'
```

## 故障排查

### 问题：日志文件未创建

**原因**: 日志目录不存在或没有写入权限

**解决方案**:
```bash
# 创建日志目录
mkdir -p logs

# 设置权限
chmod 755 logs
```

### 问题：日志级别不正确

**原因**: 环境变量 `RUST_LOG` 覆盖了配置

**解决方案**:
```bash
# 清除环境变量
unset RUST_LOG

# 或设置正确的级别
export RUST_LOG=info
```

### 问题：日志文件过大

**原因**: 日志级别设置为 DEBUG 且记录了大量日志

**解决方案**:
1. 在生产环境使用 INFO 级别
2. 定期清理旧日志文件
3. 使用日志轮转（已自动启用）

```bash
# 清理 7 天前的日志
find logs -name "*.log" -mtime +7 -delete
```

## 参考资料

- [tracing 官方文档](https://docs.rs/tracing/)
- [tracing-subscriber 文档](https://docs.rs/tracing-subscriber/)
- [tracing-appender 文档](https://docs.rs/tracing-appender/)
- [Rust 日志最佳实践](https://rust-lang-nursery.github.io/rust-cookbook/development_tools/debugging/log.html)
