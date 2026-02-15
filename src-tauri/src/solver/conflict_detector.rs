// ============================================================================
// 冲突检测器模块
// ============================================================================
// 本模块实现排课系统的冲突检测功能，用于检测课表中的硬约束和软约束违反
//
// 功能说明：
// - 检测硬约束冲突（教师时间冲突、班级时间冲突、场地容量等）
// - 检测软约束冲突（教师偏好、早晚偏好等）
// - 为前端提供可视化的冲突信息
// - 支持实时冲突检测和批量冲突检测
//
// 使用场景：
// 1. 手动调课时实时显示可用/禁止/警告的时间槽位
// 2. 拖拽课程时检测目标位置是否存在冲突
// 3. 生成课表后验证课表的有效性
// ============================================================================

use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use tracing::{debug, info, trace};

use crate::algorithm::types::{
    ClassCurriculum, SubjectConfig, TeacherMutualExclusion, TeacherPreference, TimeSlot, Venue,
    WeekType,
};

// Schedule 相关类型需要单独定义或从其他模块导入
// 暂时使用占位符结构体，后续任务会完善

/// 课表元数据（临时定义）
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ScheduleMetadata {
    pub cycle_days: u8,
    pub periods_per_day: u8,
    pub generated_at: String,
    pub version: u32,
}

/// 课表条目（临时定义）
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ScheduleEntry {
    pub class_id: u32,
    pub subject_id: String,
    pub teacher_id: u32,
    pub time_slot: TimeSlot,
    pub is_fixed: bool,
    pub week_type: WeekType,
}

/// 课表（临时定义）
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Schedule {
    pub entries: Vec<ScheduleEntry>,
    pub cost: u32,
    pub metadata: ScheduleMetadata,
}

// ============================================================================
// 冲突严重程度枚举
// ============================================================================

/// 冲突严重程度
///
/// 表示冲突的严重程度，用于前端可视化显示
///
/// # 变体
/// - `Blocked`: 红色，硬约束冲突，不可放置
/// - `Warning`: 黄色，软约束冲突，可放置但不推荐
/// - `Available`: 绿色，无冲突，可放置
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub enum ConflictSeverity {
    /// 红色：硬约束冲突，不可放置
    Blocked,
    /// 黄色：软约束冲突，可放置但不推荐
    Warning,
    /// 绿色：无冲突，可放置
    Available,
}

// ============================================================================
// 硬约束违反枚举
// ============================================================================

/// 硬约束违反类型
///
/// 表示违反的具体硬约束类型
///
/// # 变体
/// - `TeacherBusy`: 教师在该时段已有课程
/// - `ClassBusy`: 班级在该时段已有课程
/// - `ForbiddenSlot`: 课程禁止在该时段安排
/// - `TeacherBlocked`: 教师在该时段不排课
/// - `VenueOverCapacity`: 场地容量超限
/// - `TeacherMutualExclusion`: 违反教师互斥约束
/// - `NoDoubleSession`: 违反不允许连堂约束
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub enum HardConstraintViolation {
    /// 教师在该时段已有课程
    TeacherBusy,
    /// 班级在该时段已有课程
    ClassBusy,
    /// 课程禁止在该时段安排
    ForbiddenSlot,
    /// 教师在该时段不排课
    TeacherBlocked,
    /// 场地容量超限
    VenueOverCapacity,
    /// 违反教师互斥约束
    TeacherMutualExclusion,
    /// 违反不允许连堂约束
    NoDoubleSession,
}

// ============================================================================
// 软约束违反枚举
// ============================================================================

/// 软约束违反类型
///
/// 表示违反的具体软约束类型
///
/// # 变体
/// - `TeacherPreference`: 不在教师偏好时段
/// - `TimeBias`: 违反教师早晚偏好
/// - `ConsecutiveMajorSubject`: 主科连续3节或以上
/// - `ProgressInconsistency`: 同一教师多班课进度不一致
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub enum SoftConstraintViolation {
    /// 不在教师偏好时段
    TeacherPreference,
    /// 违反教师早晚偏好
    TimeBias,
    /// 主科连续3节或以上
    ConsecutiveMajorSubject,
    /// 同一教师多班课进度不一致
    ProgressInconsistency,
}

// ============================================================================
// 冲突类型枚举
// ============================================================================

/// 冲突类型
///
/// 表示冲突是硬约束还是软约束
///
/// # 变体
/// - `HardConstraint`: 硬约束冲突
/// - `SoftConstraint`: 软约束冲突
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub enum ConflictType {
    /// 硬约束冲突
    HardConstraint(HardConstraintViolation),
    /// 软约束冲突
    SoftConstraint(SoftConstraintViolation),
}

// ============================================================================
// 冲突信息结构体
// ============================================================================

/// 冲突信息
///
/// 包含时间槽位的冲突详情，用于前端可视化显示
///
/// # 字段
/// - `slot`: 时间槽位
/// - `conflict_type`: 冲突类型（硬约束或软约束）
/// - `severity`: 冲突严重程度（Blocked/Warning/Available）
/// - `description`: 冲突描述信息
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ConflictInfo {
    /// 时间槽位
    pub slot: TimeSlot,
    /// 冲突类型
    pub conflict_type: ConflictType,
    /// 冲突严重程度
    pub severity: ConflictSeverity,
    /// 冲突描述信息
    pub description: String,
}

impl ConflictInfo {
    /// 创建新的冲突信息
    ///
    /// # 参数
    /// - `slot`: 时间槽位
    /// - `conflict_type`: 冲突类型
    /// - `severity`: 冲突严重程度
    /// - `description`: 冲突描述信息
    ///
    /// # 返回
    /// 冲突信息实例
    pub fn new(
        slot: TimeSlot,
        conflict_type: ConflictType,
        severity: ConflictSeverity,
        description: String,
    ) -> Self {
        trace!(
            "创建冲突信息: slot=({}, {}), severity={:?}, description={}",
            slot.day,
            slot.period,
            severity,
            description
        );
        Self {
            slot,
            conflict_type,
            severity,
            description,
        }
    }
}

// ============================================================================
// 约束图结构体
// ============================================================================

/// 约束图
///
/// 存储所有约束配置，用于冲突检测
///
/// # 字段
/// - `subject_configs`: 科目配置映射
/// - `teacher_prefs`: 教师偏好映射
/// - `venues`: 场地配置映射
/// - `exclusions`: 教师互斥关系列表
#[derive(Debug, Clone)]
pub struct ConstraintGraph {
    /// 科目配置映射（科目ID -> 科目配置）
    pub subject_configs: HashMap<String, SubjectConfig>,
    /// 教师偏好映射（教师ID -> 教师偏好）
    pub teacher_prefs: HashMap<u32, TeacherPreference>,
    /// 场地配置映射（场地ID -> 场地配置）
    pub venues: HashMap<String, Venue>,
    /// 教师互斥关系列表
    pub exclusions: Vec<TeacherMutualExclusion>,
}

impl ConstraintGraph {
    /// 创建新的约束图
    ///
    /// # 返回
    /// 空的约束图实例
    pub fn new() -> Self {
        debug!("创建新的约束图");
        Self {
            subject_configs: HashMap::new(),
            teacher_prefs: HashMap::new(),
            venues: HashMap::new(),
            exclusions: Vec::new(),
        }
    }

    /// 添加科目配置
    ///
    /// # 参数
    /// - `config`: 科目配置
    pub fn add_subject_config(&mut self, config: SubjectConfig) {
        debug!("添加科目配置: id={}, name={}", config.id, config.name);
        self.subject_configs.insert(config.id.clone(), config);
    }

    /// 添加教师偏好
    ///
    /// # 参数
    /// - `pref`: 教师偏好
    pub fn add_teacher_preference(&mut self, pref: TeacherPreference) {
        debug!("添加教师偏好: teacher_id={}", pref.teacher_id);
        self.teacher_prefs.insert(pref.teacher_id, pref);
    }

    /// 添加场地配置
    ///
    /// # 参数
    /// - `venue`: 场地配置
    pub fn add_venue(&mut self, venue: Venue) {
        debug!("添加场地配置: id={}, name={}", venue.id, venue.name);
        self.venues.insert(venue.id.clone(), venue);
    }

    /// 添加教师互斥关系
    ///
    /// # 参数
    /// - `exclusion`: 教师互斥关系
    pub fn add_exclusion(&mut self, exclusion: TeacherMutualExclusion) {
        debug!(
            "添加教师互斥关系: teacher_a={}, teacher_b={}",
            exclusion.teacher_a_id, exclusion.teacher_b_id
        );
        self.exclusions.push(exclusion);
    }
}

impl Default for ConstraintGraph {
    fn default() -> Self {
        Self::new()
    }
}

// ============================================================================
// 冲突检测器结构体
// ============================================================================

/// 冲突检测器
///
/// 检测课表中的硬约束和软约束冲突，为前端提供可视化信息
///
/// # 字段
/// - `schedule`: 当前课表
/// - `constraint_graph`: 约束图
/// - `periods_per_day`: 每天的节次数
#[derive(Debug, Clone)]
pub struct ConflictDetector {
    /// 当前课表
    schedule: Schedule,
    /// 约束图
    constraint_graph: ConstraintGraph,
    /// 每天的节次数
    periods_per_day: u8,
}

impl ConflictDetector {
    /// 创建新的冲突检测器
    ///
    /// # 参数
    /// - `schedule`: 当前课表
    /// - `constraint_graph`: 约束图
    /// - `periods_per_day`: 每天的节次数
    ///
    /// # 返回
    /// 冲突检测器实例
    pub fn new(schedule: Schedule, constraint_graph: ConstraintGraph, periods_per_day: u8) -> Self {
        info!(
            "创建冲突检测器: 课表条目数={}, 每天节次数={}",
            schedule.entries.len(),
            periods_per_day
        );
        Self {
            schedule,
            constraint_graph,
            periods_per_day,
        }
    }

    /// 检测指定课程的所有时间槽位冲突
    ///
    /// # 参数
    /// - `curriculum`: 教学计划
    ///
    /// # 返回
    /// 时间槽位到冲突信息的映射
    pub fn detect_conflicts_for_course(
        &self,
        curriculum: &ClassCurriculum,
    ) -> HashMap<TimeSlot, ConflictInfo> {
        info!(
            "检测课程冲突: class_id={}, subject_id={}, teacher_id={}",
            curriculum.class_id, curriculum.subject_id, curriculum.teacher_id
        );

        let mut conflicts = HashMap::new();
        let max_days = self.schedule.metadata.cycle_days;

        // 遍历所有时间槽位
        for day in 0..max_days {
            for period in 0..self.periods_per_day {
                let slot = TimeSlot::new(day, period);
                let conflict_info = self.check_slot_conflicts(curriculum, &slot);
                conflicts.insert(slot, conflict_info);
            }
        }

        debug!(
            "冲突检测完成: 检查了 {} 个时间槽位",
            max_days as usize * self.periods_per_day as usize
        );
        conflicts
    }

    /// 检查单个时间槽位的冲突
    ///
    /// # 参数
    /// - `curriculum`: 教学计划
    /// - `slot`: 时间槽位
    ///
    /// # 返回
    /// 冲突信息
    fn check_slot_conflicts(&self, curriculum: &ClassCurriculum, slot: &TimeSlot) -> ConflictInfo {
        trace!(
            "检查时间槽位冲突: slot=({}, {}), class_id={}, subject_id={}",
            slot.day,
            slot.period,
            curriculum.class_id,
            curriculum.subject_id
        );

        // 先检查硬约束
        if let Some(hard_violation) = self.check_hard_constraint_violations(curriculum, slot) {
            let description = self.get_hard_violation_description(&hard_violation, curriculum);
            return ConflictInfo::new(
                *slot,
                ConflictType::HardConstraint(hard_violation),
                ConflictSeverity::Blocked,
                description,
            );
        }

        // 再检查软约束
        if let Some(soft_violation) = self.check_soft_constraint_violations(curriculum, slot) {
            let description = self.get_soft_violation_description(&soft_violation, curriculum);
            return ConflictInfo::new(
                *slot,
                ConflictType::SoftConstraint(soft_violation),
                ConflictSeverity::Warning,
                description,
            );
        }

        // 无冲突
        ConflictInfo::new(
            *slot,
            ConflictType::SoftConstraint(SoftConstraintViolation::TeacherPreference),
            ConflictSeverity::Available,
            "可以安排".to_string(),
        )
    }

    /// 检查硬约束违反
    ///
    /// # 参数
    /// - `curriculum`: 教学计划
    /// - `slot`: 时间槽位
    ///
    /// # 返回
    /// 如果违反硬约束，返回违反类型；否则返回 None
    fn check_hard_constraint_violations(
        &self,
        curriculum: &ClassCurriculum,
        slot: &TimeSlot,
    ) -> Option<HardConstraintViolation> {
        // 1. 检查课程禁止时段
        if let Some(subject_config) = self
            .constraint_graph
            .subject_configs
            .get(&curriculum.subject_id)
        {
            if subject_config.is_slot_forbidden(slot, self.periods_per_day) {
                trace!("违反硬约束: 课程禁止时段");
                return Some(HardConstraintViolation::ForbiddenSlot);
            }
        }

        // 2. 检查教师不排课时段
        if let Some(teacher_pref) = self
            .constraint_graph
            .teacher_prefs
            .get(&curriculum.teacher_id)
        {
            if teacher_pref.is_slot_blocked(slot, self.periods_per_day) {
                trace!("违反硬约束: 教师不排课时段");
                return Some(HardConstraintViolation::TeacherBlocked);
            }
        }

        // 3. 检查教师时间冲突
        if self.is_teacher_busy(curriculum.teacher_id, slot) {
            trace!("违反硬约束: 教师时间冲突");
            return Some(HardConstraintViolation::TeacherBusy);
        }

        // 4. 检查班级时间冲突
        if self.is_class_busy(curriculum.class_id, slot) {
            trace!("违反硬约束: 班级时间冲突");
            return Some(HardConstraintViolation::ClassBusy);
        }

        // 5. 检查合班课程冲突
        if curriculum.is_combined_class {
            for &class_id in &curriculum.combined_class_ids {
                if self.is_class_busy(class_id, slot) {
                    trace!("违反硬约束: 合班班级时间冲突, class_id={}", class_id);
                    return Some(HardConstraintViolation::ClassBusy);
                }
            }
        }

        // 6. 检查场地容量
        if let Some(subject_config) = self
            .constraint_graph
            .subject_configs
            .get(&curriculum.subject_id)
        {
            if let Some(venue_id) = &subject_config.venue_id {
                if let Some(venue) = self.constraint_graph.venues.get(venue_id) {
                    let venue_usage = self.count_venue_usage(venue_id, slot);
                    if venue_usage >= venue.capacity {
                        trace!(
                            "违反硬约束: 场地容量超限, venue_id={}, usage={}, capacity={}",
                            venue_id,
                            venue_usage,
                            venue.capacity
                        );
                        return Some(HardConstraintViolation::VenueOverCapacity);
                    }
                }
            }
        }

        // 7. 检查教师互斥约束
        for exclusion in &self.constraint_graph.exclusions {
            if exclusion.teacher_a_id == curriculum.teacher_id {
                if exclusion.scope.is_excluded_at(slot, self.periods_per_day) {
                    if self.is_teacher_busy(exclusion.teacher_b_id, slot) {
                        trace!(
                            "违反硬约束: 教师互斥约束, teacher_a={}, teacher_b={}",
                            exclusion.teacher_a_id,
                            exclusion.teacher_b_id
                        );
                        return Some(HardConstraintViolation::TeacherMutualExclusion);
                    }
                }
            } else if exclusion.teacher_b_id == curriculum.teacher_id {
                if exclusion.scope.is_excluded_at(slot, self.periods_per_day) {
                    if self.is_teacher_busy(exclusion.teacher_a_id, slot) {
                        trace!(
                            "违反硬约束: 教师互斥约束, teacher_a={}, teacher_b={}",
                            exclusion.teacher_a_id,
                            exclusion.teacher_b_id
                        );
                        return Some(HardConstraintViolation::TeacherMutualExclusion);
                    }
                }
            }
        }

        // 8. 检查连堂限制
        if let Some(subject_config) = self
            .constraint_graph
            .subject_configs
            .get(&curriculum.subject_id)
        {
            if !subject_config.allow_double_session {
                if self.has_adjacent_same_subject(curriculum, slot) {
                    trace!("违反硬约束: 不允许连堂");
                    return Some(HardConstraintViolation::NoDoubleSession);
                }
            }
        }

        None
    }

    /// 检查软约束违反
    ///
    /// # 参数
    /// - `curriculum`: 教学计划
    /// - `slot`: 时间槽位
    ///
    /// # 返回
    /// 如果违反软约束，返回违反类型；否则返回 None
    fn check_soft_constraint_violations(
        &self,
        curriculum: &ClassCurriculum,
        slot: &TimeSlot,
    ) -> Option<SoftConstraintViolation> {
        // 1. 检查教师早晚偏好（优先级最高）
        if let Some(teacher_pref) = self
            .constraint_graph
            .teacher_prefs
            .get(&curriculum.teacher_id)
        {
            if teacher_pref.time_bias == 1 && slot.period == 0 {
                trace!("违反软约束: 教师厌恶早课但被安排第1节");
                return Some(SoftConstraintViolation::TimeBias);
            }
            if teacher_pref.time_bias == 2 && slot.period == self.periods_per_day - 1 {
                trace!("违反软约束: 教师厌恶晚课但被安排最后一节");
                return Some(SoftConstraintViolation::TimeBias);
            }
        }

        // 2. 检查主科连续3节
        if let Some(subject_config) = self
            .constraint_graph
            .subject_configs
            .get(&curriculum.subject_id)
        {
            if subject_config.is_major_subject {
                let consecutive_count = self.count_consecutive_sessions_at(curriculum, slot);
                if consecutive_count >= 3 {
                    trace!("违反软约束: 主科连续{}节", consecutive_count);
                    return Some(SoftConstraintViolation::ConsecutiveMajorSubject);
                }
            }
        }

        // 3. 检查教师时段偏好（优先级较低）
        if let Some(teacher_pref) = self
            .constraint_graph
            .teacher_prefs
            .get(&curriculum.teacher_id)
        {
            // 如果偏好掩码不为0（即设置了偏好），才检查
            if teacher_pref.preferred_slots != 0
                && !teacher_pref.is_slot_preferred(slot, self.periods_per_day)
            {
                trace!("违反软约束: 不在教师偏好时段");
                return Some(SoftConstraintViolation::TeacherPreference);
            }
        }

        None
    }

    /// 统计在指定槽位放置课程后的连续课程数
    ///
    /// # 参数
    /// - `curriculum`: 教学计划
    /// - `slot`: 时间槽位
    ///
    /// # 返回
    /// 连续课程数（包括当前槽位）
    fn count_consecutive_sessions_at(&self, curriculum: &ClassCurriculum, slot: &TimeSlot) -> u8 {
        let mut count = 1u8; // 包括当前槽位

        // 向前统计
        let mut prev_period = slot.period;
        while prev_period > 0 {
            prev_period -= 1;
            let prev_slot = TimeSlot::new(slot.day, prev_period);
            if self.schedule.entries.iter().any(|entry| {
                entry.class_id == curriculum.class_id
                    && entry.subject_id == curriculum.subject_id
                    && entry.time_slot == prev_slot
            }) {
                count += 1;
            } else {
                break;
            }
        }

        // 向后统计
        let mut next_period = slot.period;
        while next_period < self.periods_per_day - 1 {
            next_period += 1;
            let next_slot = TimeSlot::new(slot.day, next_period);
            if self.schedule.entries.iter().any(|entry| {
                entry.class_id == curriculum.class_id
                    && entry.subject_id == curriculum.subject_id
                    && entry.time_slot == next_slot
            }) {
                count += 1;
            } else {
                break;
            }
        }

        trace!(
            "统计连续课程数: class_id={}, subject_id={}, slot=({}, {}), count={}",
            curriculum.class_id,
            curriculum.subject_id,
            slot.day,
            slot.period,
            count
        );
        count
    }

    /// 检查教师是否在指定时段忙碌
    ///
    /// # 参数
    /// - `teacher_id`: 教师ID
    /// - `slot`: 时间槽位
    ///
    /// # 返回
    /// 如果教师在该时段有课返回 true，否则返回 false
    fn is_teacher_busy(&self, teacher_id: u32, slot: &TimeSlot) -> bool {
        self.schedule
            .entries
            .iter()
            .any(|entry| entry.teacher_id == teacher_id && entry.time_slot == *slot)
    }

    /// 检查班级是否在指定时段忙碌
    ///
    /// # 参数
    /// - `class_id`: 班级ID
    /// - `slot`: 时间槽位
    ///
    /// # 返回
    /// 如果班级在该时段有课返回 true，否则返回 false
    fn is_class_busy(&self, class_id: u32, slot: &TimeSlot) -> bool {
        self.schedule
            .entries
            .iter()
            .any(|entry| entry.class_id == class_id && entry.time_slot == *slot)
    }

    /// 统计场地在指定时段的使用数量
    ///
    /// # 参数
    /// - `venue_id`: 场地ID
    /// - `slot`: 时间槽位
    ///
    /// # 返回
    /// 场地使用数量
    fn count_venue_usage(&self, venue_id: &str, slot: &TimeSlot) -> u8 {
        let count = self
            .schedule
            .entries
            .iter()
            .filter(|entry| {
                if let Some(subject_config) =
                    self.constraint_graph.subject_configs.get(&entry.subject_id)
                {
                    if let Some(entry_venue_id) = &subject_config.venue_id {
                        return entry_venue_id == venue_id && entry.time_slot == *slot;
                    }
                }
                false
            })
            .count() as u8;

        trace!(
            "统计场地使用: venue_id={}, slot=({}, {}), count={}",
            venue_id,
            slot.day,
            slot.period,
            count
        );
        count
    }

    /// 检查是否有相邻的同一科目课程
    ///
    /// # 参数
    /// - `curriculum`: 教学计划
    /// - `slot`: 时间槽位
    ///
    /// # 返回
    /// 如果有相邻的同一科目课程返回 true，否则返回 false
    fn has_adjacent_same_subject(&self, curriculum: &ClassCurriculum, slot: &TimeSlot) -> bool {
        // 检查前一节
        if slot.period > 0 {
            let prev_slot = TimeSlot::new(slot.day, slot.period - 1);
            if self.schedule.entries.iter().any(|entry| {
                entry.class_id == curriculum.class_id
                    && entry.subject_id == curriculum.subject_id
                    && entry.time_slot == prev_slot
            }) {
                return true;
            }
        }

        // 检查后一节
        if slot.period < self.periods_per_day - 1 {
            let next_slot = TimeSlot::new(slot.day, slot.period + 1);
            if self.schedule.entries.iter().any(|entry| {
                entry.class_id == curriculum.class_id
                    && entry.subject_id == curriculum.subject_id
                    && entry.time_slot == next_slot
            }) {
                return true;
            }
        }

        false
    }

    /// 获取硬约束违反的描述信息
    ///
    /// # 参数
    /// - `violation`: 硬约束违反类型
    /// - `curriculum`: 教学计划
    ///
    /// # 返回
    /// 描述信息字符串
    fn get_hard_violation_description(
        &self,
        violation: &HardConstraintViolation,
        curriculum: &ClassCurriculum,
    ) -> String {
        match violation {
            HardConstraintViolation::TeacherBusy => {
                format!("教师 {} 在该时段已有课程", curriculum.teacher_id)
            }
            HardConstraintViolation::ClassBusy => {
                format!("班级 {} 在该时段已有课程", curriculum.class_id)
            }
            HardConstraintViolation::ForbiddenSlot => {
                format!("科目 {} 禁止在该时段安排", curriculum.subject_id)
            }
            HardConstraintViolation::TeacherBlocked => {
                format!("教师 {} 在该时段不排课", curriculum.teacher_id)
            }
            HardConstraintViolation::VenueOverCapacity => "场地容量已满".to_string(),
            HardConstraintViolation::TeacherMutualExclusion => {
                format!("教师 {} 与其他教师存在互斥约束", curriculum.teacher_id)
            }
            HardConstraintViolation::NoDoubleSession => {
                format!("科目 {} 不允许连堂", curriculum.subject_id)
            }
        }
    }

    /// 获取软约束违反的描述信息
    ///
    /// # 参数
    /// - `violation`: 软约束违反类型
    /// - `curriculum`: 教学计划
    ///
    /// # 返回
    /// 描述信息字符串
    fn get_soft_violation_description(
        &self,
        violation: &SoftConstraintViolation,
        curriculum: &ClassCurriculum,
    ) -> String {
        match violation {
            SoftConstraintViolation::TeacherPreference => {
                format!("不在教师 {} 的偏好时段", curriculum.teacher_id)
            }
            SoftConstraintViolation::TimeBias => {
                format!("违反教师 {} 的早晚偏好", curriculum.teacher_id)
            }
            SoftConstraintViolation::ConsecutiveMajorSubject => {
                format!("主科 {} 连续安排过多", curriculum.subject_id)
            }
            SoftConstraintViolation::ProgressInconsistency => {
                format!("教师 {} 的多班课进度不一致", curriculum.teacher_id)
            }
        }
    }
}

// ============================================================================
// 单元测试
// ============================================================================

#[cfg(test)]
mod tests {
    use super::*;

    /// 创建测试用的课表
    fn create_test_schedule() -> Schedule {
        Schedule {
            entries: vec![ScheduleEntry {
                class_id: 101,
                subject_id: "math".to_string(),
                teacher_id: 1,
                time_slot: TimeSlot::new(0, 0),
                is_fixed: false,
                week_type: WeekType::Every,
            }],
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
        let mut graph = ConstraintGraph::new();

        // 添加科目配置
        let mut math_config = SubjectConfig {
            id: "math".to_string(),
            name: "数学".to_string(),
            forbidden_slots: 0,
            allow_double_session: true,
            venue_id: None,
            is_major_subject: true,
        };
        // 禁止第1节（位置0）
        math_config.forbidden_slots = 1u64 << 0;
        graph.add_subject_config(math_config);

        // 添加教师偏好
        let teacher_pref = TeacherPreference {
            teacher_id: 1,
            preferred_slots: 0xFFFFFFFFFFFFFFFF, // 所有时段都偏好
            time_bias: 0,
            weight: 1,
            blocked_slots: 0,
            teaching_group_id: None,
        };
        graph.add_teacher_preference(teacher_pref);

        graph
    }

    #[test]
    fn test_conflict_detector_creation() {
        let schedule = create_test_schedule();
        let constraint_graph = create_test_constraint_graph();
        let detector = ConflictDetector::new(schedule, constraint_graph, 8);

        assert_eq!(detector.periods_per_day, 8);
    }

    #[test]
    fn test_teacher_busy_detection() {
        let schedule = create_test_schedule();
        let constraint_graph = create_test_constraint_graph();
        let detector = ConflictDetector::new(schedule, constraint_graph, 8);

        // 教师1在(0,0)时段有课
        assert!(detector.is_teacher_busy(1, &TimeSlot::new(0, 0)));
        // 教师1在(0,1)时段没课
        assert!(!detector.is_teacher_busy(1, &TimeSlot::new(0, 1)));
    }

    #[test]
    fn test_class_busy_detection() {
        let schedule = create_test_schedule();
        let constraint_graph = create_test_constraint_graph();
        let detector = ConflictDetector::new(schedule, constraint_graph, 8);

        // 班级101在(0,0)时段有课
        assert!(detector.is_class_busy(101, &TimeSlot::new(0, 0)));
        // 班级101在(0,1)时段没课
        assert!(!detector.is_class_busy(101, &TimeSlot::new(0, 1)));
    }

    #[test]
    fn test_forbidden_slot_detection() {
        let schedule = create_test_schedule();
        let constraint_graph = create_test_constraint_graph();
        let detector = ConflictDetector::new(schedule, constraint_graph, 8);

        let curriculum = ClassCurriculum {
            id: 1,
            class_id: 102,
            subject_id: "math".to_string(),
            teacher_id: 2,
            target_sessions: 5,
            is_combined_class: false,
            combined_class_ids: vec![],
            week_type: WeekType::Every,
        };

        // 检查禁止时段（第1节）
        let violation =
            detector.check_hard_constraint_violations(&curriculum, &TimeSlot::new(0, 0));
        assert_eq!(violation, Some(HardConstraintViolation::ForbiddenSlot));

        // 检查非禁止时段（第2节）
        let violation =
            detector.check_hard_constraint_violations(&curriculum, &TimeSlot::new(0, 1));
        assert_eq!(violation, None);
    }

    // ============================================================================
    // 冲突严重程度判断测试
    // ============================================================================

    #[test]
    fn test_conflict_severity_blocked_for_hard_constraint() {
        // 测试硬约束冲突返回 ConflictSeverity::Blocked
        let schedule = create_test_schedule();
        let constraint_graph = create_test_constraint_graph();
        let detector = ConflictDetector::new(schedule, constraint_graph, 8);

        let curriculum = ClassCurriculum {
            id: 1,
            class_id: 102,
            subject_id: "math".to_string(),
            teacher_id: 2,
            target_sessions: 5,
            is_combined_class: false,
            combined_class_ids: vec![],
            week_type: WeekType::Every,
        };

        // 检查禁止时段（第1节），应该返回 Blocked
        let conflict_info = detector.check_slot_conflicts(&curriculum, &TimeSlot::new(0, 0));
        assert!(matches!(conflict_info.severity, ConflictSeverity::Blocked));
        assert!(matches!(
            conflict_info.conflict_type,
            ConflictType::HardConstraint(HardConstraintViolation::ForbiddenSlot)
        ));
        assert!(conflict_info.description.contains("禁止"));
    }

    #[test]
    fn test_conflict_severity_blocked_for_teacher_busy() {
        // 测试教师时间冲突返回 ConflictSeverity::Blocked
        let mut schedule = create_test_schedule();
        // 添加教师1在(0,1)时段的课程
        schedule.entries.push(ScheduleEntry {
            class_id: 103,
            subject_id: "english".to_string(),
            teacher_id: 1,
            time_slot: TimeSlot::new(0, 1),
            is_fixed: false,
            week_type: WeekType::Every,
        });

        let constraint_graph = create_test_constraint_graph();
        let detector = ConflictDetector::new(schedule, constraint_graph, 8);

        let curriculum = ClassCurriculum {
            id: 2,
            class_id: 102,
            subject_id: "math".to_string(),
            teacher_id: 1, // 教师1在(0,1)时段已有课
            target_sessions: 5,
            is_combined_class: false,
            combined_class_ids: vec![],
            week_type: WeekType::Every,
        };

        // 检查教师已占用的时段，应该返回 Blocked
        let conflict_info = detector.check_slot_conflicts(&curriculum, &TimeSlot::new(0, 1));
        assert!(matches!(conflict_info.severity, ConflictSeverity::Blocked));
        assert!(matches!(
            conflict_info.conflict_type,
            ConflictType::HardConstraint(HardConstraintViolation::TeacherBusy)
        ));
        assert!(conflict_info.description.contains("教师"));
    }

    #[test]
    fn test_conflict_severity_blocked_for_class_busy() {
        // 测试班级时间冲突返回 ConflictSeverity::Blocked
        let mut schedule = create_test_schedule();
        // 添加班级102在(0,1)时段的课程
        schedule.entries.push(ScheduleEntry {
            class_id: 102,
            subject_id: "english".to_string(),
            teacher_id: 2,
            time_slot: TimeSlot::new(0, 1),
            is_fixed: false,
            week_type: WeekType::Every,
        });

        let constraint_graph = create_test_constraint_graph();
        let detector = ConflictDetector::new(schedule, constraint_graph, 8);

        let curriculum = ClassCurriculum {
            id: 2,
            class_id: 102, // 班级102在(0,1)时段已有课
            subject_id: "math".to_string(),
            teacher_id: 3,
            target_sessions: 5,
            is_combined_class: false,
            combined_class_ids: vec![],
            week_type: WeekType::Every,
        };

        // 检查班级已占用的时段，应该返回 Blocked
        let conflict_info = detector.check_slot_conflicts(&curriculum, &TimeSlot::new(0, 1));
        assert!(matches!(conflict_info.severity, ConflictSeverity::Blocked));
        assert!(matches!(
            conflict_info.conflict_type,
            ConflictType::HardConstraint(HardConstraintViolation::ClassBusy)
        ));
        assert!(conflict_info.description.contains("班级"));
    }

    #[test]
    fn test_conflict_severity_warning_for_soft_constraint() {
        // 测试软约束冲突返回 ConflictSeverity::Warning
        let schedule = create_test_schedule();
        let mut constraint_graph = create_test_constraint_graph();

        // 添加英语科目配置（没有禁止时段）
        let english_config = SubjectConfig {
            id: "english".to_string(),
            name: "英语".to_string(),
            forbidden_slots: 0,
            allow_double_session: true,
            venue_id: None,
            is_major_subject: false,
        };
        constraint_graph.add_subject_config(english_config);

        // 添加教师偏好，使第1节（位置0）不在偏好范围内
        let teacher_pref = TeacherPreference {
            teacher_id: 2,
            preferred_slots: 0xFFFFFFFFFFFFFFFE, // 第1节（位置0）不在偏好范围内
            time_bias: 0,
            weight: 1,
            blocked_slots: 0,
            teaching_group_id: None,
        };
        constraint_graph.add_teacher_preference(teacher_pref);

        let detector = ConflictDetector::new(schedule, constraint_graph, 8);

        let curriculum = ClassCurriculum {
            id: 2,
            class_id: 102,
            subject_id: "english".to_string(), // 使用英语课，避免触发数学课的禁止时段
            teacher_id: 2,
            target_sessions: 5,
            is_combined_class: false,
            combined_class_ids: vec![],
            week_type: WeekType::Every,
        };

        // 检查不在教师偏好时段的槽位（第1节，位置0），应该返回 Warning
        let conflict_info = detector.check_slot_conflicts(&curriculum, &TimeSlot::new(0, 0));
        assert!(matches!(conflict_info.severity, ConflictSeverity::Warning));
        assert!(matches!(
            conflict_info.conflict_type,
            ConflictType::SoftConstraint(SoftConstraintViolation::TeacherPreference)
        ));
    }

    #[test]
    fn test_conflict_severity_warning_for_time_bias() {
        // 测试教师早晚偏好冲突返回 ConflictSeverity::Warning
        let schedule = create_test_schedule();
        let mut constraint_graph = create_test_constraint_graph();

        // 添加英语科目配置（没有禁止时段）
        let english_config = SubjectConfig {
            id: "english".to_string(),
            name: "英语".to_string(),
            forbidden_slots: 0,
            allow_double_session: true,
            venue_id: None,
            is_major_subject: false,
        };
        constraint_graph.add_subject_config(english_config);

        // 添加厌恶早课的教师
        let teacher_pref = TeacherPreference {
            teacher_id: 3,
            preferred_slots: 0, // 设置为0表示没有特定偏好时段，只检查早晚偏好
            time_bias: 1,       // 厌恶早课
            weight: 1,
            blocked_slots: 0,
            teaching_group_id: None,
        };
        constraint_graph.add_teacher_preference(teacher_pref);

        let detector = ConflictDetector::new(schedule, constraint_graph, 8);

        let curriculum = ClassCurriculum {
            id: 3,
            class_id: 103,
            subject_id: "english".to_string(), // 使用英语课
            teacher_id: 3,
            target_sessions: 5,
            is_combined_class: false,
            combined_class_ids: vec![],
            week_type: WeekType::Every,
        };

        // 检查第1节（早课），应该返回 Warning
        let conflict_info = detector.check_slot_conflicts(&curriculum, &TimeSlot::new(0, 0));
        assert!(matches!(conflict_info.severity, ConflictSeverity::Warning));
        assert!(matches!(
            conflict_info.conflict_type,
            ConflictType::SoftConstraint(SoftConstraintViolation::TimeBias)
        ));
    }

    #[test]
    fn test_conflict_severity_available_for_no_conflict() {
        // 测试无冲突返回 ConflictSeverity::Available
        let schedule = create_test_schedule();
        let constraint_graph = create_test_constraint_graph();
        let detector = ConflictDetector::new(schedule, constraint_graph, 8);

        let curriculum = ClassCurriculum {
            id: 2,
            class_id: 102,
            subject_id: "math".to_string(),
            teacher_id: 2,
            target_sessions: 5,
            is_combined_class: false,
            combined_class_ids: vec![],
            week_type: WeekType::Every,
        };

        // 检查空闲时段（第2节），应该返回 Available
        let conflict_info = detector.check_slot_conflicts(&curriculum, &TimeSlot::new(0, 1));
        assert!(matches!(conflict_info.severity, ConflictSeverity::Available));
        assert_eq!(conflict_info.description, "可以安排");
    }

    #[test]
    fn test_conflict_severity_blocked_for_teacher_blocked_slot() {
        // 测试教师不排课时段返回 ConflictSeverity::Blocked
        let schedule = create_test_schedule();
        let mut constraint_graph = create_test_constraint_graph();

        // 添加有不排课时段的教师
        let teacher_pref = TeacherPreference {
            teacher_id: 4,
            preferred_slots: 0xFFFFFFFFFFFFFFFF,
            time_bias: 0,
            weight: 1,
            blocked_slots: 1u64 << 1, // 第2节不排课
            teaching_group_id: None,
        };
        constraint_graph.add_teacher_preference(teacher_pref);

        let detector = ConflictDetector::new(schedule, constraint_graph, 8);

        let curriculum = ClassCurriculum {
            id: 4,
            class_id: 104,
            subject_id: "math".to_string(),
            teacher_id: 4,
            target_sessions: 5,
            is_combined_class: false,
            combined_class_ids: vec![],
            week_type: WeekType::Every,
        };

        // 检查教师不排课时段，应该返回 Blocked
        let conflict_info = detector.check_slot_conflicts(&curriculum, &TimeSlot::new(0, 1));
        assert!(matches!(conflict_info.severity, ConflictSeverity::Blocked));
        assert!(matches!(
            conflict_info.conflict_type,
            ConflictType::HardConstraint(HardConstraintViolation::TeacherBlocked)
        ));
    }
}
