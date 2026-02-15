# Rust 工作空间配置说明

## 当前配置

本项目目前采用**单一 crate 结构**，所有模块都在同一个 crate 中组织。这种结构适合中小型项目，具有以下优势：

### 优势
1. **简单直接**：所有代码在一个 crate 中，易于理解和维护
2. **快速编译**：无需处理多个 crate 之间的依赖关系
3. **灵活重构**：模块间可以自由调整，无需修改 Cargo.toml
4. **统一版本**：所有代码使用相同的依赖版本

### 模块组织

```
src-tauri/src/
├── commands/          # Tauri 命令接口模块
│   └── mod.rs        # 模块入口和文档
├── db/               # 数据访问层模块
│   └── mod.rs        # DatabaseManager 核心结构
├── models/           # 数据模型模块
│   └── mod.rs        # 基础类型定义
├── solver/           # 约束求解器模块
│   └── mod.rs        # 求解器配置和辅助函数
├── lib.rs            # 库入口，导出公共接口
└── main.rs           # 应用入口，启动 Tauri
```

### 模块依赖关系

```
main.rs
  └── lib.rs
       ├── commands/  (依赖 db, models, solver)
       ├── db/        (依赖 models)
       ├── models/    (无依赖)
       └── solver/    (依赖 models, db)
```

## 编译特性

当前配置的编译特性：

| 特性 | 说明 | 用途 |
|------|------|------|
| `default` | 默认特性 | 包含 `custom-protocol` |
| `custom-protocol` | 自定义协议 | 生产环境使用 |
| `dev` | 开发模式 | 启用额外的调试信息 |
| `profiling` | 性能分析 | 启用性能监控工具 |
| `parallel` | 并行计算 | 使用 Rayon 优化性能 |
| `extended-cycle` | 扩展周期 | 支持超过 5 天的排课周期 |

### 使用特性

```bash
# 使用默认特性编译
cargo build

# 启用并行计算特性
cargo build --features parallel

# 启用多个特性
cargo build --features "parallel,extended-cycle"

# 禁用默认特性
cargo build --no-default-features
```

## 性能优化配置

### 发布构建优化

```toml
[profile.release]
panic = "abort"         # 发生 panic 时直接终止，减小二进制体积
codegen-units = 1       # 单个代码生成单元，启用更好的优化
lto = true              # 链接时优化，提升性能
opt-level = "z"         # 优化体积（"z" 比 "s" 更激进）
strip = true            # 移除调试符号，减小体积
```

### 开发构建优化

```toml
[profile.dev]
opt-level = 0           # 不优化，加快编译速度
debug = true            # 包含调试信息
split-debuginfo = "unpacked"  # 调试信息分离，加快链接速度
```

### 依赖项优化

即使在开发模式下，也对关键依赖进行优化以提升性能：

```toml
[profile.dev.package.sqlx]
opt-level = 2

[profile.dev.package.serde]
opt-level = 2

[profile.dev.package.serde_json]
opt-level = 2
```

## 未来扩展：多 Crate 工作空间

当项目规模增长，模块复杂度增加时，可以考虑将各模块拆分为独立的 crate。

### 扩展方案

```toml
[workspace]
members = [
    ".",                # 主应用 crate
    "crates/solver",    # 约束求解器核心
    "crates/db",        # 数据访问层
    "crates/models",    # 数据模型
]

# 工作空间级别的依赖版本管理
[workspace.dependencies]
serde = { version = "1.0", features = ["derive"] }
sqlx = { version = "0.7", features = ["runtime-tokio-native-tls", "sqlite"] }
tracing = "0.1"
```

### 目录结构

```
src-tauri/
├── crates/
│   ├── models/           # 数据模型 crate
│   │   ├── src/
│   │   │   └── lib.rs
│   │   └── Cargo.toml
│   ├── db/               # 数据访问层 crate
│   │   ├── src/
│   │   │   └── lib.rs
│   │   └── Cargo.toml
│   └── solver/           # 约束求解器 crate
│       ├── src/
│       │   └── lib.rs
│       └── Cargo.toml
├── src/                  # 主应用 crate
│   ├── commands/
│   ├── lib.rs
│   └── main.rs
└── Cargo.toml            # 工作空间配置
```

### 工作空间优势

1. **模块独立性**
   - 每个 crate 可以独立测试和发布
   - 清晰的模块边界和依赖关系
   - 更好的代码组织和可维护性

2. **编译优化**
   - 共享依赖版本，减少重复编译
   - 支持增量编译和并行构建
   - 只重新编译修改的 crate

3. **团队协作**
   - 不同团队可以负责不同的 crate
   - 减少代码冲突
   - 更容易进行代码审查

4. **版本管理**
   - 每个 crate 可以有独立的版本号
   - 支持语义化版本控制
   - 便于发布和维护

### 何时迁移到工作空间

考虑迁移的时机：

- ✅ 单个模块代码量超过 5000 行
- ✅ 模块间依赖关系变得复杂
- ✅ 需要独立发布某些模块
- ✅ 团队规模扩大，需要并行开发
- ✅ 编译时间超过 5 分钟

### 迁移步骤

1. **创建 crates 目录**
   ```bash
   mkdir -p crates/{models,db,solver}
   ```

2. **移动代码到独立 crate**
   ```bash
   mv src/models crates/models/src
   mv src/db crates/db/src
   mv src/solver crates/solver/src
   ```

3. **为每个 crate 创建 Cargo.toml**
   ```toml
   # crates/models/Cargo.toml
   [package]
   name = "course-scheduling-models"
   version = "0.1.0"
   edition = "2021"
   
   [dependencies]
   serde = { workspace = true }
   ```

4. **更新主 Cargo.toml**
   ```toml
   [workspace]
   members = [".", "crates/*"]
   
   [dependencies]
   course-scheduling-models = { path = "crates/models" }
   course-scheduling-db = { path = "crates/db" }
   course-scheduling-solver = { path = "crates/solver" }
   ```

5. **更新导入路径**
   ```rust
   // 从
   use crate::models::TimeSlot;
   
   // 改为
   use course_scheduling_models::TimeSlot;
   ```

6. **验证编译**
   ```bash
   cargo check --workspace
   cargo test --workspace
   ```

## 最佳实践

### 1. 模块设计原则

- **单一职责**：每个模块只负责一个功能领域
- **低耦合**：模块间依赖关系清晰，避免循环依赖
- **高内聚**：相关功能放在同一模块中
- **接口清晰**：通过 `pub use` 导出公共接口

### 2. 依赖管理

- **版本锁定**：使用 `Cargo.lock` 确保依赖版本一致
- **定期更新**：定期运行 `cargo update` 更新依赖
- **安全审计**：定期运行 `cargo audit` 检查安全漏洞
- **最小化依赖**：只引入必要的依赖

### 3. 性能优化

- **位运算优化**：使用位掩码代替数组操作
- **引用传递**：避免不必要的数据克隆
- **并行计算**：使用 Rayon 处理大量数据
- **缓存优化**：缓存频繁计算的结果

### 4. 代码质量

- **中文注释**：所有代码必须包含中文注释
- **日志记录**：关键操作必须记录日志
- **错误处理**：使用 `Result` 类型处理错误
- **单元测试**：为核心功能编写测试

## 总结

当前的单一 crate 结构适合项目的初期开发阶段，具有简单、灵活的优势。随着项目规模的增长，可以根据实际需求逐步迁移到多 crate 工作空间结构，以获得更好的模块化和可维护性。

无论采用哪种结构，都应该遵循良好的模块设计原则，保持代码的清晰性和可维护性。
