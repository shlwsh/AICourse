// ============================================================================
// 数据模型模块
// ============================================================================
// 本模块定义系统中所有的数据结构和类型
//
// 模块组织：
// - timeslot.rs : 时间槽位相关类型（TimeSlot, TimeSlotMask）
// - teacher.rs  : 教师相关类型（Teacher, TeacherPreference）
// - class.rs    : 班级相关类型（Class）
// - subject.rs  : 科目相关类型（SubjectConfig）
// - curriculum.rs : 教学计划类型（ClassCurriculum, WeekType）
// - schedule.rs : 课表相关类型（Schedule, ScheduleEntry, ScheduleMetadata）
// - venue.rs    : 场地相关类型（Venue）
// - fixed_course.rs : 固定课程类型（FixedCourse）
// - exclusion.rs : 教师互斥类型（TeacherMutualExclusion, ExclusionScope）
// - conflict.rs : 冲突检测类型（ConflictInfo, ConflictType, ConflictSeverity）
// - swap.rs     : 交换建议类型（SwapOption, SwapType, CourseMove）
// - statistics.rs : 统计相关类型（WorkloadStatistics, TeacherStatus）
//
// 设计原则：
// 1. 所有类型都应该实现 Debug, Clone 特征
// 2. 需要序列化的类型实现 Serialize, Deserialize
// 3. 使用 #[serde(rename_all = "camelCase")] 确保与前端 JSON 格式一致
// 4. 使用类型别名提高代码可读性（如 TimeSlotMask = u64）
// 5. 为复杂类型提供构造函数和辅助方法
// 6. 使用文档注释说明每个字段的含义和约束
//
// 性能考虑：
// - 使用位掩码（u64）表示时间槽位，提升运算性能
// - 避免不必要的克隆，使用引用传递
// - 对于大型结构使用 Box 或 Arc 包装
// ============================================================================

use serde::{Deserialize, Serialize};

// ============================================================================
// 时间槽位类型定义
// ============================================================================

/// 时间槽位掩码类型
///
/// 使用 u64 位掩码表示一周的时间槽位
/// - 标准周期：5天 × 8节 = 40位 < u64 (64位)
/// - 每一位代表一个时间槽位，1 表示占用，0 表示空闲
///
/// 位计算公式：bit_position = day * periods_per_day + period
///
/// 示例：
/// - 周一第1节：0 * 8 + 0 = 0 → 第0位
/// - 周一第2节：0 * 8 + 1 = 1 → 第1位
/// - 周二第1节：1 * 8 + 0 = 8 → 第8位
pub type TimeSlotMask = u64;

/// 扩展时间槽位掩码类型
///
/// 用于支持超过 64 个时间槽位的场景（如 30 天周期）
/// 使用 Vec<u64> 存储多个 64 位掩码
pub type ExtendedTimeSlotMask = Vec<u64>;

/// 时间槽位结构
///
/// 表示一周内的具体上课时段，由星期和节次组成
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TimeSlot {
    /// 星期（0-29，支持 1-30 天周期）
    pub day: u8,

    /// 节次（0-11，支持 1-12 节）
    pub period: u8,
}

impl TimeSlot {
    /// 创建新的时间槽位
    ///
    /// # 参数
    /// - `day`: 星期（0 表示周一，1 表示周二，以此类推）
    /// - `period`: 节次（0 表示第1节，1 表示第2节，以此类推）
    pub fn new(day: u8, period: u8) -> Self {
        Self { day, period }
    }

    /// 计算时间槽位在位掩码中的位置
    ///
    /// # 参数
    /// - `periods_per_day`: 每天的节次数
    ///
    /// # 返回
    /// 位掩码中的位位置（0-63）
    pub fn to_bit_position(&self, periods_per_day: u8) -> usize {
        (self.day as usize) * (periods_per_day as usize) + (self.period as usize)
    }

    /// 从位位置创建时间槽位
    ///
    /// # 参数
    /// - `pos`: 位掩码中的位位置
    /// - `periods_per_day`: 每天的节次数
    ///
    /// # 返回
    /// 对应的时间槽位
    pub fn from_bit_position(pos: usize, periods_per_day: u8) -> Self {
        Self {
            day: (pos / periods_per_day as usize) as u8,
            period: (pos % periods_per_day as usize) as u8,
        }
    }

    /// 将时间槽位转换为位掩码
    ///
    /// # 参数
    /// - `periods_per_day`: 每天的节次数
    ///
    /// # 返回
    /// 只有对应位为 1 的位掩码
    pub fn to_mask(&self, periods_per_day: u8) -> TimeSlotMask {
        1u64 << self.to_bit_position(periods_per_day)
    }
}

// ============================================================================
// 周类型枚举
// ============================================================================

/// 周类型枚举
///
/// 用于支持单双周课表功能
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "PascalCase")]
pub enum WeekType {
    /// 每周都上
    Every,

    /// 仅单周上课
    Odd,

    /// 仅双周上课
    Even,
}

impl Default for WeekType {
    fn default() -> Self {
        WeekType::Every
    }
}

// 子模块声明（将在后续任务中实现）
// pub mod teacher;
// pub mod class;
// pub mod subject;
// pub mod curriculum;
// pub mod schedule;
// pub mod venue;
// pub mod fixed_course;
// pub mod exclusion;
// pub mod conflict;
// pub mod swap;
// pub mod statistics;

// 重新导出常用类型（将在后续任务中实现）
// pub use teacher::*;
// pub use class::*;
// pub use subject::*;
// pub use curriculum::*;
// pub use schedule::*;
// pub use venue::*;
// pub use fixed_course::*;
// pub use exclusion::*;
// pub use conflict::*;
// pub use swap::*;
// pub use statistics::*;

// 测试模块
#[cfg(test)]
mod timeslot_tests;
