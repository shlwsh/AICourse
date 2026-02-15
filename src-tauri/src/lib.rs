// ============================================================================
// 排课系统 Rust 库
// ============================================================================
// 本库提供排课系统的核心功能，可以被 Tauri 应用或其他 Rust 项目使用
//
// 主要模块：
// - commands: Tauri 命令接口
// - db: 数据访问层
// - models: 数据模型定义
// - solver: 约束求解器和调课引擎
//
// 使用示例：
// ```rust
// use course_scheduling_system::solver::ConstraintSolver;
// use course_scheduling_system::db::DatabaseManager;
//
// // 初始化数据库
// let db = DatabaseManager::new("sqlite://data/schedule.db").await?;
//
// // 创建求解器
// let solver = ConstraintSolver::new(SolverConfig::default());
//
// // 生成课表
// let schedule = solver.solve(...).await?;
// ```
// ============================================================================

// 模块声明
pub mod algorithm;
pub mod commands;
pub mod db;
pub mod logging;
pub mod models;
pub mod solver;

// 重新导出常用类型，方便外部使用
pub use algorithm::{TimeSlot, TimeSlotMask};
pub use db::DatabaseManager;
pub use logging::{init_default_logging, init_logging, sanitize_sensitive_data, LogConfig};
pub use models::WeekType;
pub use solver::{SolverConfig, SolverError};

// 版本信息
pub const VERSION: &str = env!("CARGO_PKG_VERSION");
pub const NAME: &str = env!("CARGO_PKG_NAME");
pub const DESCRIPTION: &str = env!("CARGO_PKG_DESCRIPTION");
