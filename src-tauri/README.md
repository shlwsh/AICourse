# 排课系统 Rust 后端

## 概述

本项目是排课系统的 Rust 后端实现，基于 Tauri 框架构建，提供高性能的约束求解和调课引擎。

## 技术栈

- **Rust 2021 Edition**: 系统编程语言，提供内存安全和高性能
- **Tauri 1.5**: 跨平台桌面应用框架
- **SQLx 0.7**: 异步 SQL 工具包，支持 SQLite
- **Tokio**: 异步运行时
- **Tracing**: 结构化日志框架
- **Serde**: 序列化/反序列化框架

## 项目结构

```
src-tauri/
├── src/
│   ├── main.rs           # 应用入口，初始化 Tauri 和日志系统
│   ├── commands/         # Tauri 命令接口（前端调用的 API）
│   │   ├── mod.rs        # 命令模块导出
│   │   ├── schedule.rs   # 排课相关命令
│   │   ├── teacher.rs    # 教师管理命令
│   │   └── import_export.rs  # 导入导出命令
│   ├── db/               # 数据访问层
│   │   ├── mod.rs        # 数据库模块导出
│   │   ├── manager.rs    # 数据库管理器
│   │   ├── migrations/   # 数据库迁移脚本
│   │   └── queries.rs    # SQL 查询封装
│   ├── models/           # 数据模型定义
│   │   ├── mod.rs        # 模型模块导出
│   │   ├── schedule.rs   # 课表相关模型
│   │   ├── teacher.rs    # 教师相关模型
│   │   ├── subject.rs    # 科目相关模型
│   │   └── constraint.rs # 约束相关模型
│   └── solver/           # 约束求解器
│       ├── mod.rs        # 求解器模块导出
│       ├── constraint_solver.rs  # 约束求解算法
│       ├── cost_function.rs      # 代价函数计算
│       ├── conflict_detector.rs  # 冲突检测器
│       └── swap_suggester.rs     # 交换建议器
├── Cargo.toml            # 项目配置和依赖管理
├── .cargo/
│   └── config.toml       # Cargo 构建配置
├── build.rs              # 构建脚本
├── tauri.conf.json       # Tauri 配置文件
└── README.md             # 本文件

```

## 模块说明

### 1. Commands 模块 (commands/)

提供前端调用的 Tauri 命令接口，负责：
- 接收前端请求参数
- 调用业务逻辑层
- 返回处理结果
- 错误处理和日志记录

**主要命令**：
- `generate_schedule`: 生成课表
- `get_active_schedule`: 获取活动课表
- `move_schedule_entry`: 移动课程
- `detect_conflicts`: 检测冲突
- `suggest_swaps`: 建议交换方案
- `execute_swap`: 执行交换

### 2. Database 模块 (db/)

封装数据库操作，提供：
- 数据库连接管理
- CRUD 操作封装
- 事务处理
- 数据库迁移

**主要功能**：
- 教师信息管理
- 班级信息管理
- 科目配置管理
- 教学计划管理
- 课表数据管理

### 3. Models 模块 (models/)

定义核心数据结构，包括：
- `TimeSlot`: 时间槽位（使用位掩码优化）
- `Schedule`: 课表
- `ScheduleEntry`: 课表条目
- `TeacherPreference`: 教师偏好
- `SubjectConfig`: 科目配置
- `ClassCurriculum`: 教学计划

### 4. Solver 模块 (solver/)

实现约束求解算法，包括：
- **ConstraintSolver**: 回溯搜索算法，生成满足约束的课表
- **CostFunction**: 计算课表代价值，评估软约束违反情况
- **ConflictDetector**: 检测时间槽位冲突，支持可视化
- **SwapSuggester**: 提供智能交换建议（简单交换、三角交换、链式交换）

## 核心特性

### 1. 位掩码优化

使用 `u64` 位掩码表示时间槽位（5天 × 8节 = 40位），通过位运算提升性能：

```rust
// 计算时间槽位的位位置
let bit_pos = day * 8 + period;
let slot_mask = 1u64 << bit_pos;

// 检查时间槽位是否被占用
if (occupied_slots & slot_mask) != 0 {
    // 槽位已被占用
}
```

### 2. 硬约束检查

在回溯搜索中通过剪枝策略排除违反硬约束的方案：
- 课程禁止时段检查
- 教师时间冲突检查
- 班级时间冲突检查
- 场地容量限制检查
- 教师互斥约束检查
- 连堂限制检查

### 3. 软约束优化

通过代价函数计算课表质量，选择代价最低的方案：
- 教师时段偏好（权重可配置）
- 教师早晚偏好（厌恶早课/晚课）
- 主科连续3节惩罚
- 同一教师多班课进度一致性

### 4. 智能调课

提供多种交换方案：
- **简单交换**: A ↔ B
- **三角交换**: A → B → C → A
- **链式交换**: A → B → C → ... → 空位

## 编译和运行

### 开发模式

```bash
# 进入 Rust 后端目录
cd src-tauri

# 检查代码
cargo check

# 运行测试
cargo test

# 运行应用（需要前端配合）
cargo tauri dev
```

### 发布构建

```bash
# 构建优化版本
cargo build --release

# 打包应用
cargo tauri build
```

## 性能优化

### 编译优化

在 `Cargo.toml` 中配置了发布构建优化：
- `opt-level = "z"`: 最大化体积优化
- `lto = true`: 链接时优化
- `codegen-units = 1`: 单个代码生成单元
- `strip = true`: 移除调试符号

### 运行时优化

- 使用位运算代替循环遍历
- 使用引用避免数据克隆
- 使用 `hashbrown` 提升哈希表性能
- 使用 `rayon` 实现并行计算（可选）

## 日志系统

使用 `tracing` 框架实现结构化日志：

```rust
use tracing::{info, warn, error, debug};

// 记录信息日志
info!("课表生成成功，代价值: {}", cost);

// 记录警告日志
warn!("教师 {} 的偏好设置未找到，使用默认值", teacher_id);

// 记录错误日志
error!("数据库操作失败: {}", err);

// 记录调试日志
debug!("检查时间槽位 ({}, {})", day, period);
```

### 日志级别配置

通过环境变量 `RUST_LOG` 控制日志级别：

```bash
# 显示所有日志
RUST_LOG=debug cargo run

# 只显示 INFO 及以上级别
RUST_LOG=info cargo run

# 只显示特定模块的日志
RUST_LOG=course_scheduling_system::solver=debug cargo run
```

## 测试

### 单元测试

```bash
# 运行所有测试
cargo test

# 运行特定模块的测试
cargo test solver::

# 显示测试输出
cargo test -- --nocapture
```

### 集成测试

集成测试位于 `tests/` 目录，使用 Playwright 进行端到端测试。

## 依赖管理

### 更新依赖

```bash
# 检查过时的依赖
cargo outdated

# 更新依赖到最新兼容版本
cargo update

# 更新到最新版本（可能破坏兼容性）
cargo upgrade
```

### 审计依赖

```bash
# 检查安全漏洞
cargo audit
```

## 故障排查

### 编译错误

1. **链接错误**: 确保安装了必要的系统依赖
   - Windows: 安装 Visual Studio Build Tools
   - macOS: 安装 Xcode Command Line Tools
   - Linux: 安装 `build-essential` 和 `libssl-dev`

2. **依赖冲突**: 清理并重新构建
   ```bash
   cargo clean
   cargo build
   ```

### 运行时错误

1. **数据库错误**: 检查数据库文件权限和路径
2. **日志错误**: 检查日志目录是否可写
3. **内存错误**: 检查是否有内存泄漏（使用 `valgrind` 或 `heaptrack`）

## 贡献指南

1. 所有代码必须包含中文注释
2. 遵循 Rust 代码规范（使用 `rustfmt`）
3. 添加单元测试覆盖新功能
4. 更新文档说明变更内容
5. 提交前运行 `cargo clippy` 检查代码质量

## 许可证

MIT License

## 联系方式

如有问题，请联系开发团队。
