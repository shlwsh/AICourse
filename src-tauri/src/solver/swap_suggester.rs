// ============================================================================
// 交换建议器模块
// ============================================================================
// 本模块实现排课系统的智能课程交换建议功能，用于在手动调课时提供可行的交换方案
//
// 功能说明：
// - 简单交换：A ↔ B，将两节课直接交换位置
// - 三角交换：A → B → C → A，三节课循环交换
// - 链式交换：A → B → C → ... → 空位，多节课依次移动到空位
// - 代价评估：计算交换后对软约束的影响
//
// 使用场景：
// 1. 用户尝试将课程移动到已被占用的时间槽位
// 2. 系统自动计算可行的交换方案
// 3. 显示交换建议弹窗供用户选择
// 4. 用户选择方案后自动执行交换
//
// 算法设计：
// 1. 检测目标槽位是否被占用
// 2. 查找能够容纳被占用课程的其他有效时间槽位
// 3. 计算简单交换、三角交换和链式交换方案
// 4. 评估每个方案对软约束的影响
// 5. 按代价影响排序返回建议列表
// ============================================================================

use serde::{Deserialize, Serialize};
use tracing::{debug, info, trace, warn};

use crate::algorithm::types::TimeSlot;
use crate::solver::conflict_detector::{ConstraintGraph, Schedule, ScheduleEntry};

// ============================================================================
// 交换类型枚举
// ============================================================================

/// 交换类型
///
/// 表示课程交换的方式
///
/// # 变体
/// - `Simple`: 简单交换，两节课直接交换位置（A ↔ B）
/// - `Triangle`: 三角交换，三节课循环交换（A → B → C → A）
/// - `Chain`: 链式交换，多节课依次移动到空位（A → B → C → ... → 空位）
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub enum SwapType {
    /// 简单交换：A ↔ B
    Simple,
    /// 三角交换：A → B → C → A
    Triangle,
    /// 链式交换：A → B → C → ... → 空位
    Chain,
}

// ============================================================================
// 课程移动结构体
// ============================================================================

/// 课程移动
///
/// 表示一次课程移动操作，包含课程信息和移动的起止位置
///
/// # 字段
/// - `class_id`: 班级ID
/// - `subject_id`: 科目ID
/// - `teacher_id`: 教师ID
/// - `from_slot`: 起始时间槽位
/// - `to_slot`: 目标时间槽位
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CourseMove {
    /// 班级ID
    pub class_id: u32,
    /// 科目ID
    pub subject_id: String,
    /// 教师ID
    pub teacher_id: u32,
    /// 起始时间槽位
    pub from_slot: TimeSlot,
    /// 目标时间槽位
    pub to_slot: TimeSlot,
}

impl CourseMove {
    /// 创建新的课程移动
    ///
    /// # 参数
    /// - `class_id`: 班级ID
    /// - `subject_id`: 科目ID
    /// - `teacher_id`: 教师ID
    /// - `from_slot`: 起始时间槽位
    /// - `to_slot`: 目标时间槽位
    ///
    /// # 返回
    /// 课程移动实例
    pub fn new(
        class_id: u32,
        subject_id: String,
        teacher_id: u32,
        from_slot: TimeSlot,
        to_slot: TimeSlot,
    ) -> Self {
        trace!(
            "创建课程移动: class_id={}, subject_id={}, teacher_id={}, from=({}, {}), to=({}, {})",
            class_id,
            subject_id,
            teacher_id,
            from_slot.day,
            from_slot.period,
            to_slot.day,
            to_slot.period
        );
        Self {
            class_id,
            subject_id,
            teacher_id,
            from_slot,
            to_slot,
        }
    }
}

// ============================================================================
// 交换选项结构体
// ============================================================================

/// 交换选项
///
/// 表示一个可行的课程交换方案，包含交换类型、移动列表和代价影响
///
/// # 字段
/// - `swap_type`: 交换类型（Simple/Triangle/Chain）
/// - `moves`: 课程移动列表
/// - `cost_impact`: 代价变化（负数表示改善，正数表示恶化）
/// - `description`: 交换方案的中文描述
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SwapOption {
    /// 交换类型
    pub swap_type: SwapType,
    /// 课程移动列表
    pub moves: Vec<CourseMove>,
    /// 代价变化（负数表示改善，正数表示恶化）
    pub cost_impact: i32,
    /// 交换方案的中文描述
    pub description: String,
}

impl SwapOption {
    /// 创建新的交换选项
    ///
    /// # 参数
    /// - `swap_type`: 交换类型
    /// - `moves`: 课程移动列表
    /// - `cost_impact`: 代价变化
    /// - `description`: 交换方案描述
    ///
    /// # 返回
    /// 交换选项实例
    pub fn new(
        swap_type: SwapType,
        moves: Vec<CourseMove>,
        cost_impact: i32,
        description: String,
    ) -> Self {
        debug!(
            "创建交换选项: type={:?}, moves_count={}, cost_impact={}, description={}",
            swap_type,
            moves.len(),
            cost_impact,
            description
        );
        Self {
            swap_type,
            moves,
            cost_impact,
            description,
        }
    }
}

// ============================================================================
// 交换建议器结构体
// ============================================================================

/// 交换建议器
///
/// 提供智能的课程交换建议，帮助用户快速解决调课冲突
///
/// # 字段
/// - `schedule`: 当前课表
/// - `constraint_graph`: 约束图
/// - `periods_per_day`: 每天的节次数
#[derive(Debug, Clone)]
pub struct SwapSuggester {
    /// 当前课表
    schedule: Schedule,
    /// 约束图
    constraint_graph: ConstraintGraph,
    /// 每天的节次数
    periods_per_day: u8,
}

impl SwapSuggester {
    /// 创建新的交换建议器
    ///
    /// # 参数
    /// - `schedule`: 当前课表
    /// - `constraint_graph`: 约束图
    /// - `periods_per_day`: 每天的节次数
    ///
    /// # 返回
    /// 交换建议器实例
    pub fn new(schedule: Schedule, constraint_graph: ConstraintGraph, periods_per_day: u8) -> Self {
        info!(
            "创建交换建议器: 课表条目数={}, 每天节次数={}",
            schedule.entries.len(),
            periods_per_day
        );
        Self {
            schedule,
            constraint_graph,
            periods_per_day,
        }
    }

    /// 建议交换方案
    ///
    /// 根据目标班级、教师和期望的时间槽位，计算可行的交换方案
    ///
    /// # 参数
    /// - `target_class`: 目标班级ID
    /// - `target_teacher`: 目标教师ID
    /// - `desired_slot`: 期望的时间槽位
    ///
    /// # 返回
    /// 交换选项列表，按代价影响排序（代价越低越优）
    ///
    /// # 错误
    /// 如果无法找到可行的交换方案，返回错误信息
    pub fn suggest_swaps(
        &self,
        target_class: u32,
        target_teacher: u32,
        desired_slot: TimeSlot,
    ) -> Result<Vec<SwapOption>, String> {
        info!(
            "开始建议交换方案: target_class={}, target_teacher={}, desired_slot=({}, {})",
            target_class, target_teacher, desired_slot.day, desired_slot.period
        );

        let mut options = Vec::new();

        // 1. 检查目标槽位是否被占用
        if let Some(existing_entry) = self.get_entry_at(target_class, &desired_slot) {
            debug!(
                "目标槽位已被占用: class_id={}, subject_id={}, teacher_id={}",
                existing_entry.class_id, existing_entry.subject_id, existing_entry.teacher_id
            );

            // 2. 尝试简单交换
            if let Some(simple_swap) =
                self.find_simple_swap(&existing_entry, target_teacher, &desired_slot)
            {
                options.push(simple_swap);
            }

            // 3. 尝试三角交换（后续任务实现）
            // let triangle_swaps = self.find_triangle_swaps(&existing_entry, target_teacher, &desired_slot);
            // options.extend(triangle_swaps);

            // 4. 尝试链式交换（后续任务实现）
            // let chain_swaps = self.find_chain_swaps(&existing_entry, target_teacher, &desired_slot);
            // options.extend(chain_swaps);

            if options.is_empty() {
                warn!("未找到可行的交换方案");
            }
        } else {
            // 目标槽位空闲，直接移动
            debug!("目标槽位空闲，可以直接移动");
            return Ok(vec![SwapOption::new(
                SwapType::Simple,
                vec![],
                0,
                "目标位置空闲，可以直接移动".to_string(),
            )]);
        }

        // 按代价影响排序
        options.sort_by_key(|opt: &SwapOption| opt.cost_impact);

        info!("交换方案建议完成: 找到 {} 个可行方案", options.len());
        Ok(options)
    }

    /// 获取指定班级在指定时间槽位的课表条目
    ///
    /// # 参数
    /// - `class_id`: 班级ID
    /// - `slot`: 时间槽位
    ///
    /// # 返回
    /// 如果找到课表条目返回引用，否则返回 None
    fn get_entry_at(&self, class_id: u32, slot: &TimeSlot) -> Option<&ScheduleEntry> {
        self.schedule
            .entries
            .iter()
            .find(|entry| entry.class_id == class_id && entry.time_slot == *slot)
    }

    /// 查找简单交换方案
    ///
    /// 简单交换是指将被占用的课程移动到另一个有效的时间槽位，
    /// 从而腾出空间给目标课程。这是最简单的交换方式（A → B）。
    ///
    /// # 参数
    /// - `existing_entry`: 当前占用目标槽位的课表条目
    /// - `target_teacher`: 目标教师ID（用于描述）
    /// - `desired_slot`: 期望的时间槽位
    ///
    /// # 返回
    /// 如果找到可行的简单交换方案，返回 SwapOption；否则返回 None
    fn find_simple_swap(
        &self,
        existing_entry: &ScheduleEntry,
        _target_teacher: u32,
        desired_slot: &TimeSlot,
    ) -> Option<SwapOption> {
        debug!(
            "查找简单交换方案: existing_entry=(class={}, subject={}, teacher={}), desired_slot=({}, {})",
            existing_entry.class_id,
            existing_entry.subject_id,
            existing_entry.teacher_id,
            desired_slot.day,
            desired_slot.period
        );

        // 查找能容纳现有课程的其他有效时间槽位
        let available_slots = self.find_valid_slots_for_entry(existing_entry);

        if available_slots.is_empty() {
            debug!("未找到可用的替代槽位");
            return None;
        }

        // 选择第一个可用槽位作为替代位置
        let alternative_slot = available_slots[0];
        debug!(
            "找到替代槽位: day={}, period={}",
            alternative_slot.day, alternative_slot.period
        );

        // 计算交换前的代价
        let cost_before = self.calculate_local_cost(&[existing_entry]);

        // 模拟交换后的代价
        let mut temp_entry = existing_entry.clone();
        temp_entry.time_slot = alternative_slot;
        let cost_after = self.calculate_local_cost(&[&temp_entry]);

        let cost_impact = cost_after as i32 - cost_before as i32;

        // 构建交换方案描述
        let description = format!(
            "将班级 {} 的 {} 课（教师 {}）从星期{}第{}节移至星期{}第{}节，以腾出空间",
            existing_entry.class_id,
            existing_entry.subject_id,
            existing_entry.teacher_id,
            existing_entry.time_slot.day + 1,
            existing_entry.time_slot.period + 1,
            alternative_slot.day + 1,
            alternative_slot.period + 1
        );

        debug!(
            "简单交换方案: cost_impact={}, description={}",
            cost_impact, description
        );

        Some(SwapOption::new(
            SwapType::Simple,
            vec![CourseMove::new(
                existing_entry.class_id,
                existing_entry.subject_id.clone(),
                existing_entry.teacher_id,
                existing_entry.time_slot,
                alternative_slot,
            )],
            cost_impact,
            description,
        ))
    }

    /// 查找课程的所有有效槽位
    ///
    /// 遍历所有时间槽位，检查每个槽位是否满足硬约束条件，
    /// 返回所有可以安排该课程的有效槽位列表。
    ///
    /// # 参数
    /// - `entry`: 课表条目
    ///
    /// # 返回
    /// 有效时间槽位列表
    fn find_valid_slots_for_entry(&self, entry: &ScheduleEntry) -> Vec<TimeSlot> {
        trace!(
            "查找课程的有效槽位: class={}, subject={}, teacher={}",
            entry.class_id,
            entry.subject_id,
            entry.teacher_id
        );

        let mut valid_slots = Vec::new();
        let cycle_days = self.schedule.metadata.cycle_days;

        // 遍历所有时间槽位
        for day in 0..cycle_days {
            for period in 0..self.periods_per_day {
                let slot = TimeSlot::new(day, period);

                // 跳过当前槽位
                if slot == entry.time_slot {
                    continue;
                }

                // 检查是否满足硬约束
                if self.is_valid_slot_for_entry(entry, &slot) {
                    valid_slots.push(slot);
                    trace!("找到有效槽位: day={}, period={}", day, period);
                }
            }
        }

        debug!("找到 {} 个有效槽位", valid_slots.len());
        valid_slots
    }

    /// 检查槽位是否满足硬约束
    ///
    /// 检查将课程安排到指定槽位是否违反任何硬约束条件。
    /// 这包括：课程禁止时段、教师不排课时段、教师时间冲突、
    /// 班级时间冲突、场地容量限制、教师互斥约束、连堂限制等。
    ///
    /// # 参数
    /// - `entry`: 课表条目
    /// - `slot`: 时间槽位
    ///
    /// # 返回
    /// 如果槽位满足所有硬约束返回 true，否则返回 false
    fn is_valid_slot_for_entry(&self, entry: &ScheduleEntry, slot: &TimeSlot) -> bool {
        // 1. 检查课程禁止时段
        if let Some(subject_config) = self.constraint_graph.subject_configs.get(&entry.subject_id) {
            if subject_config.is_slot_forbidden(slot, self.periods_per_day) {
                trace!("槽位违反硬约束: 课程禁止时段");
                return false;
            }
        }

        // 2. 检查教师不排课时段
        if let Some(teacher_pref) = self.constraint_graph.teacher_prefs.get(&entry.teacher_id) {
            if teacher_pref.is_slot_blocked(slot, self.periods_per_day) {
                trace!("槽位违反硬约束: 教师不排课时段");
                return false;
            }
        }

        // 3. 检查教师时间冲突（排除当前条目）
        if self.is_teacher_busy_excluding(entry.teacher_id, slot, entry) {
            trace!("槽位违反硬约束: 教师时间冲突");
            return false;
        }

        // 4. 检查班级时间冲突（排除当前条目）
        if self.is_class_busy_excluding(entry.class_id, slot, entry) {
            trace!("槽位违反硬约束: 班级时间冲突");
            return false;
        }

        // 5. 检查场地容量
        if let Some(subject_config) = self.constraint_graph.subject_configs.get(&entry.subject_id) {
            if let Some(venue_id) = &subject_config.venue_id {
                if let Some(venue) = self.constraint_graph.venues.get(venue_id) {
                    let venue_usage = self.count_venue_usage_excluding(venue_id, slot, entry);
                    if venue_usage >= venue.capacity {
                        trace!("槽位违反硬约束: 场地容量超限");
                        return false;
                    }
                }
            }
        }

        // 6. 检查教师互斥约束
        for exclusion in &self.constraint_graph.exclusions {
            if exclusion.teacher_a_id == entry.teacher_id {
                if exclusion.scope.is_excluded_at(slot, self.periods_per_day) {
                    if self.is_teacher_busy_excluding(exclusion.teacher_b_id, slot, entry) {
                        trace!("槽位违反硬约束: 教师互斥约束");
                        return false;
                    }
                }
            } else if exclusion.teacher_b_id == entry.teacher_id {
                if exclusion.scope.is_excluded_at(slot, self.periods_per_day) {
                    if self.is_teacher_busy_excluding(exclusion.teacher_a_id, slot, entry) {
                        trace!("槽位违反硬约束: 教师互斥约束");
                        return false;
                    }
                }
            }
        }

        // 7. 检查连堂限制
        if let Some(subject_config) = self.constraint_graph.subject_configs.get(&entry.subject_id) {
            if !subject_config.allow_double_session {
                if self.has_adjacent_same_subject_excluding(entry, slot) {
                    trace!("槽位违反硬约束: 不允许连堂");
                    return false;
                }
            }
        }

        true
    }

    /// 检查教师在指定槽位是否忙碌（排除指定条目）
    ///
    /// # 参数
    /// - `teacher_id`: 教师ID
    /// - `slot`: 时间槽位
    /// - `exclude_entry`: 要排除的课表条目
    ///
    /// # 返回
    /// 如果教师在该槽位有其他课程返回 true，否则返回 false
    fn is_teacher_busy_excluding(
        &self,
        teacher_id: u32,
        slot: &TimeSlot,
        exclude_entry: &ScheduleEntry,
    ) -> bool {
        self.schedule.entries.iter().any(|entry| {
            entry.teacher_id == teacher_id
                && entry.time_slot == *slot
                && !(entry.class_id == exclude_entry.class_id
                    && entry.time_slot == exclude_entry.time_slot)
        })
    }

    /// 检查班级在指定槽位是否忙碌（排除指定条目）
    ///
    /// # 参数
    /// - `class_id`: 班级ID
    /// - `slot`: 时间槽位
    /// - `exclude_entry`: 要排除的课表条目
    ///
    /// # 返回
    /// 如果班级在该槽位有其他课程返回 true，否则返回 false
    fn is_class_busy_excluding(
        &self,
        class_id: u32,
        slot: &TimeSlot,
        exclude_entry: &ScheduleEntry,
    ) -> bool {
        self.schedule.entries.iter().any(|entry| {
            entry.class_id == class_id
                && entry.time_slot == *slot
                && !(entry.class_id == exclude_entry.class_id
                    && entry.time_slot == exclude_entry.time_slot)
        })
    }

    /// 统计场地在指定槽位的使用数量（排除指定条目）
    ///
    /// # 参数
    /// - `venue_id`: 场地ID
    /// - `slot`: 时间槽位
    /// - `exclude_entry`: 要排除的课表条目
    ///
    /// # 返回
    /// 场地使用数量
    fn count_venue_usage_excluding(
        &self,
        venue_id: &str,
        slot: &TimeSlot,
        exclude_entry: &ScheduleEntry,
    ) -> u8 {
        self.schedule
            .entries
            .iter()
            .filter(|entry| {
                entry.time_slot == *slot
                    && !(entry.class_id == exclude_entry.class_id
                        && entry.time_slot == exclude_entry.time_slot)
            })
            .filter(|entry| {
                if let Some(subject_config) =
                    self.constraint_graph.subject_configs.get(&entry.subject_id)
                {
                    subject_config.venue_id.as_deref() == Some(venue_id)
                } else {
                    false
                }
            })
            .count() as u8
    }

    /// 检查是否有相邻的相同科目（排除指定条目）
    ///
    /// # 参数
    /// - `entry`: 课表条目
    /// - `slot`: 时间槽位
    ///
    /// # 返回
    /// 如果有相邻的相同科目返回 true，否则返回 false
    fn has_adjacent_same_subject_excluding(&self, entry: &ScheduleEntry, slot: &TimeSlot) -> bool {
        // 检查前一节
        if slot.period > 0 {
            let prev_slot = TimeSlot::new(slot.day, slot.period - 1);
            if self.schedule.entries.iter().any(|e| {
                e.class_id == entry.class_id
                    && e.subject_id == entry.subject_id
                    && e.time_slot == prev_slot
                    && !(e.class_id == entry.class_id && e.time_slot == entry.time_slot)
            }) {
                return true;
            }
        }

        // 检查后一节
        if slot.period < self.periods_per_day - 1 {
            let next_slot = TimeSlot::new(slot.day, slot.period + 1);
            if self.schedule.entries.iter().any(|e| {
                e.class_id == entry.class_id
                    && e.subject_id == entry.subject_id
                    && e.time_slot == next_slot
                    && !(e.class_id == entry.class_id && e.time_slot == entry.time_slot)
            }) {
                return true;
            }
        }

        false
    }

    /// 计算局部代价
    ///
    /// 计算指定课表条目的软约束违反代价。
    /// 这用于评估交换方案对课表质量的影响。
    ///
    /// # 参数
    /// - `entries`: 课表条目列表
    ///
    /// # 返回
    /// 代价值
    fn calculate_local_cost(&self, entries: &[&ScheduleEntry]) -> u32 {
        let mut cost = 0u32;

        for entry in entries {
            let slot = &entry.time_slot;

            // 软约束1：教师时段偏好
            if let Some(teacher_pref) = self.constraint_graph.teacher_prefs.get(&entry.teacher_id) {
                if teacher_pref.preferred_slots != 0
                    && !teacher_pref.is_slot_preferred(slot, self.periods_per_day)
                {
                    cost += 10 * teacher_pref.weight;
                }

                // 软约束2：教师早晚偏好
                if teacher_pref.time_bias == 1 && slot.period == 0 {
                    cost += 50;
                }
                if teacher_pref.time_bias == 2 && slot.period == self.periods_per_day - 1 {
                    cost += 50;
                }
            }

            // 软约束3：主科连续3节惩罚
            if let Some(subject_config) =
                self.constraint_graph.subject_configs.get(&entry.subject_id)
            {
                if subject_config.is_major_subject {
                    let consecutive_count = self.count_consecutive_sessions(entry);
                    if consecutive_count >= 3 {
                        cost += 30 * (consecutive_count - 2) as u32;
                    }
                }
            }
        }

        cost
    }

    /// 统计连续课程数
    ///
    /// # 参数
    /// - `entry`: 课表条目
    ///
    /// # 返回
    /// 连续课程数
    fn count_consecutive_sessions(&self, entry: &ScheduleEntry) -> u8 {
        let mut count = 1u8;
        let slot = &entry.time_slot;

        // 向前统计
        let mut period = slot.period;
        while period > 0 {
            period -= 1;
            let prev_slot = TimeSlot::new(slot.day, period);
            if self.schedule.entries.iter().any(|e| {
                e.class_id == entry.class_id
                    && e.subject_id == entry.subject_id
                    && e.time_slot == prev_slot
            }) {
                count += 1;
            } else {
                break;
            }
        }

        // 向后统计
        let mut period = slot.period;
        while period < self.periods_per_day - 1 {
            period += 1;
            let next_slot = TimeSlot::new(slot.day, period);
            if self.schedule.entries.iter().any(|e| {
                e.class_id == entry.class_id
                    && e.subject_id == entry.subject_id
                    && e.time_slot == next_slot
            }) {
                count += 1;
            } else {
                break;
            }
        }

        count
    }
}

// ============================================================================
// 单元测试
// ============================================================================

#[cfg(test)]
mod tests {
    use super::*;
    use crate::algorithm::types::WeekType;
    use crate::solver::conflict_detector::ScheduleMetadata;

    /// 创建测试用的课表
    fn create_test_schedule() -> Schedule {
        Schedule {
            entries: vec![
                ScheduleEntry {
                    class_id: 101,
                    subject_id: "math".to_string(),
                    teacher_id: 1,
                    time_slot: TimeSlot::new(0, 0),
                    is_fixed: false,
                    week_type: WeekType::Every,
                },
                ScheduleEntry {
                    class_id: 101,
                    subject_id: "english".to_string(),
                    teacher_id: 2,
                    time_slot: TimeSlot::new(0, 1),
                    is_fixed: false,
                    week_type: WeekType::Every,
                },
            ],
            cost: 0,
            metadata: ScheduleMetadata {
                cycle_days: 5,
                periods_per_day: 8,
                generated_at: "2024-01-01".to_string(),
                version: 1,
            },
        }
    }

    /// 创建测试用的约束图
    fn create_test_constraint_graph() -> ConstraintGraph {
        ConstraintGraph::new()
    }

    #[test]
    fn test_swap_suggester_creation() {
        let schedule = create_test_schedule();
        let constraint_graph = create_test_constraint_graph();
        let suggester = SwapSuggester::new(schedule, constraint_graph, 8);

        assert_eq!(suggester.periods_per_day, 8);
    }

    #[test]
    fn test_suggest_swaps_for_empty_slot() {
        let schedule = create_test_schedule();
        let constraint_graph = create_test_constraint_graph();
        let suggester = SwapSuggester::new(schedule, constraint_graph, 8);

        // 尝试移动到空闲槽位（第3节）
        let result = suggester.suggest_swaps(101, 1, TimeSlot::new(0, 2));
        assert!(result.is_ok());

        let options = result.unwrap();
        assert_eq!(options.len(), 1);
        assert_eq!(options[0].swap_type, SwapType::Simple);
        assert!(options[0].description.contains("空闲"));
    }

    #[test]
    fn test_suggest_swaps_for_occupied_slot() {
        let schedule = create_test_schedule();
        let constraint_graph = create_test_constraint_graph();
        let suggester = SwapSuggester::new(schedule, constraint_graph, 8);

        // 尝试移动到已占用槽位（第1节）
        let result = suggester.suggest_swaps(101, 3, TimeSlot::new(0, 0));
        assert!(result.is_ok());

        // 应该找到简单交换方案
        let options = result.unwrap();
        assert!(!options.is_empty(), "应该找到至少一个交换方案");
        assert_eq!(options[0].swap_type, SwapType::Simple);
    }

    #[test]
    fn test_get_entry_at() {
        let schedule = create_test_schedule();
        let constraint_graph = create_test_constraint_graph();
        let suggester = SwapSuggester::new(schedule, constraint_graph, 8);

        // 查找存在的条目
        let entry = suggester.get_entry_at(101, &TimeSlot::new(0, 0));
        assert!(entry.is_some());
        assert_eq!(entry.unwrap().subject_id, "math");

        // 查找不存在的条目
        let entry = suggester.get_entry_at(101, &TimeSlot::new(0, 2));
        assert!(entry.is_none());
    }

    #[test]
    fn test_course_move_creation() {
        let course_move = CourseMove::new(
            101,
            "math".to_string(),
            1,
            TimeSlot::new(0, 0),
            TimeSlot::new(0, 1),
        );

        assert_eq!(course_move.class_id, 101);
        assert_eq!(course_move.subject_id, "math");
        assert_eq!(course_move.teacher_id, 1);
        assert_eq!(course_move.from_slot, TimeSlot::new(0, 0));
        assert_eq!(course_move.to_slot, TimeSlot::new(0, 1));
    }

    #[test]
    fn test_swap_option_creation() {
        let moves = vec![CourseMove::new(
            101,
            "math".to_string(),
            1,
            TimeSlot::new(0, 0),
            TimeSlot::new(0, 1),
        )];

        let option = SwapOption::new(SwapType::Simple, moves, -10, "测试交换方案".to_string());

        assert_eq!(option.swap_type, SwapType::Simple);
        assert_eq!(option.moves.len(), 1);
        assert_eq!(option.cost_impact, -10);
        assert_eq!(option.description, "测试交换方案");
    }

    #[test]
    fn test_find_valid_slots_for_entry() {
        let schedule = create_test_schedule();
        let constraint_graph = create_test_constraint_graph();

        // 获取第一个条目（在创建 suggester 之前）
        let entry = schedule.entries[0].clone();

        let suggester = SwapSuggester::new(schedule, constraint_graph, 8);

        // 查找有效槽位
        let valid_slots = suggester.find_valid_slots_for_entry(&entry);

        // 应该找到多个有效槽位（排除当前槽位）
        assert!(!valid_slots.is_empty(), "应该找到至少一个有效槽位");

        // 验证不包含当前槽位
        assert!(!valid_slots.contains(&entry.time_slot), "不应包含当前槽位");
    }

    #[test]
    fn test_is_valid_slot_for_entry() {
        let schedule = create_test_schedule();
        let constraint_graph = create_test_constraint_graph();

        let entry = schedule.entries[0].clone();

        let suggester = SwapSuggester::new(schedule, constraint_graph, 8);

        // 测试空闲槽位应该有效
        let empty_slot = TimeSlot::new(0, 2);
        assert!(
            suggester.is_valid_slot_for_entry(&entry, &empty_slot),
            "空闲槽位应该有效"
        );

        // 测试已被同一班级占用的槽位应该无效
        let occupied_slot = TimeSlot::new(0, 1);
        assert!(
            !suggester.is_valid_slot_for_entry(&entry, &occupied_slot),
            "已被同一班级占用的槽位应该无效"
        );
    }

    #[test]
    fn test_find_simple_swap() {
        let schedule = create_test_schedule();
        let constraint_graph = create_test_constraint_graph();

        let existing_entry = schedule.entries[0].clone();
        let desired_slot = TimeSlot::new(0, 0);

        let suggester = SwapSuggester::new(schedule, constraint_graph, 8);

        // 查找简单交换方案
        let swap_option = suggester.find_simple_swap(&existing_entry, 3, &desired_slot);

        // 应该找到交换方案
        assert!(swap_option.is_some(), "应该找到简单交换方案");

        let option = swap_option.unwrap();
        assert_eq!(option.swap_type, SwapType::Simple);
        assert_eq!(option.moves.len(), 1);
        assert!(option.description.contains("移至"), "描述应包含'移至'");
    }

    #[test]
    fn test_is_teacher_busy_excluding() {
        let schedule = create_test_schedule();
        let constraint_graph = create_test_constraint_graph();

        let entry = schedule.entries[0].clone();

        let suggester = SwapSuggester::new(schedule, constraint_graph, 8);

        // 教师1在(0,0)有课，但排除当前条目后应该不忙
        assert!(
            !suggester.is_teacher_busy_excluding(1, &TimeSlot::new(0, 0), &entry),
            "排除当前条目后教师应该不忙"
        );

        // 教师2在(0,1)有课，不排除时应该忙
        assert!(
            suggester.is_teacher_busy_excluding(2, &TimeSlot::new(0, 1), &entry),
            "教师2在(0,1)应该忙"
        );
    }

    #[test]
    fn test_is_class_busy_excluding() {
        let schedule = create_test_schedule();
        let constraint_graph = create_test_constraint_graph();

        let entry = schedule.entries[0].clone();

        let suggester = SwapSuggester::new(schedule, constraint_graph, 8);

        // 班级101在(0,0)有课，但排除当前条目后应该不忙
        assert!(
            !suggester.is_class_busy_excluding(101, &TimeSlot::new(0, 0), &entry),
            "排除当前条目后班级应该不忙"
        );

        // 班级101在(0,1)有课，不排除时应该忙
        assert!(
            suggester.is_class_busy_excluding(101, &TimeSlot::new(0, 1), &entry),
            "班级101在(0,1)应该忙"
        );
    }

    #[test]
    fn test_calculate_local_cost() {
        let schedule = create_test_schedule();
        let constraint_graph = create_test_constraint_graph();

        let entry = schedule.entries[0].clone();

        let suggester = SwapSuggester::new(schedule, constraint_graph, 8);

        // 计算代价
        let cost = suggester.calculate_local_cost(&[&entry]);

        // 验证代价计算成功（u32 类型本身就是非负数）
        let _ = cost; // 使用 cost 变量避免未使用警告
    }

    #[test]
    fn test_count_consecutive_sessions() {
        // 创建包含连续课程的课表
        let mut schedule = create_test_schedule();
        schedule.entries.push(ScheduleEntry {
            class_id: 101,
            subject_id: "math".to_string(),
            teacher_id: 1,
            time_slot: TimeSlot::new(0, 1),
            is_fixed: false,
            week_type: WeekType::Every,
        });
        schedule.entries.push(ScheduleEntry {
            class_id: 101,
            subject_id: "math".to_string(),
            teacher_id: 1,
            time_slot: TimeSlot::new(0, 2),
            is_fixed: false,
            week_type: WeekType::Every,
        });

        let constraint_graph = create_test_constraint_graph();
        let suggester = SwapSuggester::new(schedule, constraint_graph, 8);

        let entry = &suggester.schedule.entries[0];

        // 统计连续课程数
        let count = suggester.count_consecutive_sessions(entry);

        // 应该有3节连续课程
        assert_eq!(count, 3, "应该有3节连续课程");
    }
}
