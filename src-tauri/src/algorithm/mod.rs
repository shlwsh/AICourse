// ============================================================================
// 核心算法模块
// ============================================================================
// 本模块提供排课系统的核心算法实现，包括：
// - 时间槽位数据结构和位运算
// - 约束求解器
// - 代价函数计算
// - 调课引擎
//
// 使用示例：
// ```rust
// use course_scheduling_system::algorithm::{TimeSlot, TimeSlotMask};
//
// // 创建时间槽位
// let slot = TimeSlot { day: 0, period: 0 };
//
// // 转换为位掩码
// let mask = slot.to_mask(8);
// ```
// ============================================================================

pub mod cost_cache;
pub mod schedule_hash;
pub mod solver;
pub mod types;

// 重新导出常用类型
pub use cost_cache::{CacheStats, CostCache};
pub use schedule_hash::{calculate_incremental_hash, calculate_schedule_hash};
pub use solver::{ConstraintSolver, SolverConfig, SolverError};
pub use types::{
    clear_slot, count_slots, is_slot_set, set_slot, ExtendedTimeSlotMask, TimeSlot, TimeSlotMask,
};
