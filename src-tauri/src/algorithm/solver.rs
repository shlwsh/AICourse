// ============================================================================
// 约束求解器模块
// ============================================================================
// 本模块实现排课系统的核心约束求解器，负责生成满足所有约束条件的课表。
//
// 主要组件：
// - SolverConfig: 求解器配置参数
// - SolverError: 求解器错误类型
// - ConstraintSolver: 约束求解器主结构体
//
// 使用示例：
// ```rust
// use course_scheduling_system::algorithm::solver::{ConstraintSolver, SolverConfig};
//
// let config = SolverConfig {
//     cycle_days: 5,
//     periods_per_day: 8,
//     max_iterations: 10000,
//     timeout_seconds: 30,
// };
//
// let solver = ConstraintSolver::new(config);
// ```
// ============================================================================

use serde::{Deserialize, Serialize};
use thiserror::Error;
use tracing::{debug, error, info, warn};

// ============================================================================
// 求解器配置
// ============================================================================

/// 求解器配置参数
///
/// 定义约束求解器的运行参数，包括排课周期、节次数量、迭代限制和超时设置。
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct SolverConfig {
    /// 排课周期天数（1-30天）
    pub cycle_days: u8,

    /// 每天节次数（1-12节）
    pub periods_per_day: u8,

    /// 最大迭代次数
    pub max_iterations: u32,

    /// 超时时间（秒）
    pub timeout_seconds: u32,

    /// 是否启用代价缓存（默认启用）
    #[serde(default = "default_enable_cost_cache")]
    pub enable_cost_cache: bool,
}

/// 默认启用代价缓存
fn default_enable_cost_cache() -> bool {
    true
}

impl Default for SolverConfig {
    /// 创建默认配置
    ///
    /// 默认值：
    /// - cycle_days: 5（标准工作周）
    /// - periods_per_day: 8（标准8节课）
    /// - max_iterations: 10000
    /// - timeout_seconds: 30
    /// - enable_cost_cache: true（启用代价缓存）
    fn default() -> Self {
        Self {
            cycle_days: 5,
            periods_per_day: 8,
            max_iterations: 10000,
            timeout_seconds: 30,
            enable_cost_cache: true,
        }
    }
}

// ============================================================================
// 求解器错误类型
// ============================================================================

/// 求解器错误枚举
///
/// 定义约束求解器可能遇到的各种错误情况。
#[derive(Error, Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub enum SolverError {
    /// 未找到可行解
    ///
    /// 当求解器无法找到满足所有硬约束的课表方案时返回此错误。
    #[error("未找到可行解")]
    NoSolutionFound,

    /// 求解超时
    ///
    /// 当求解时间超过配置的超时限制时返回此错误。
    #[error("求解超时")]
    TimeoutExceeded,

    /// 配置无效
    ///
    /// 当求解器配置参数不合法时返回此错误。
    #[error("配置无效：{0}")]
    InvalidConfiguration(String),

    /// 约束违反
    ///
    /// 当检测到约束违反时返回此错误，包含详细的违反信息。
    #[error("约束违反：{0}")]
    ConstraintViolation(String),
}

// ============================================================================
// 约束求解器
// ============================================================================

/// 约束求解器
///
/// 核心求解器结构体，负责执行约束满足算法生成课表。
/// 使用回溯搜索算法，结合硬约束剪枝和软约束优化。
#[derive(Debug, Clone)]
pub struct ConstraintSolver {
    /// 求解器配置
    config: SolverConfig,
}

impl ConstraintSolver {
    /// 创建新的约束求解器
    ///
    /// # 参数
    ///
    /// * `config` - 求解器配置参数
    ///
    /// # 返回
    ///
    /// 返回配置好的约束求解器实例
    ///
    /// # 示例
    ///
    /// ```rust
    /// use course_scheduling_system::algorithm::solver::{ConstraintSolver, SolverConfig};
    ///
    /// let config = SolverConfig::default();
    /// let solver = ConstraintSolver::new(config);
    /// ```
    pub fn new(config: SolverConfig) -> Result<Self, SolverError> {
        info!(
            "创建约束求解器，周期：{}天，每天{}节",
            config.cycle_days, config.periods_per_day
        );

        // 验证配置有效性
        Self::validate_config(&config)?;

        debug!(
            "求解器配置：最大迭代次数 {}，超时 {} 秒",
            config.max_iterations, config.timeout_seconds
        );

        Ok(Self { config })
    }

    /// 验证配置有效性
    ///
    /// 检查求解器配置参数是否在合法范围内。
    ///
    /// # 参数
    ///
    /// * `config` - 待验证的配置
    ///
    /// # 返回
    ///
    /// 如果配置有效返回 Ok(())，否则返回 InvalidConfiguration 错误
    ///
    /// # 验证规则
    ///
    /// - cycle_days 必须在 1-30 之间
    /// - periods_per_day 必须在 1-12 之间
    /// - max_iterations 必须大于 0
    /// - timeout_seconds 必须大于 0
    pub fn validate_config(config: &SolverConfig) -> Result<(), SolverError> {
        debug!("验证求解器配置");

        // 验证周期天数
        if config.cycle_days < 1 || config.cycle_days > 30 {
            error!("周期天数无效：{}", config.cycle_days);
            return Err(SolverError::InvalidConfiguration(format!(
                "周期天数必须在 1-30 之间，当前值：{}",
                config.cycle_days
            )));
        }

        // 验证每天节次数
        if config.periods_per_day < 1 || config.periods_per_day > 12 {
            error!("每天节次数无效：{}", config.periods_per_day);
            return Err(SolverError::InvalidConfiguration(format!(
                "每天节次数必须在 1-12 之间，当前值：{}",
                config.periods_per_day
            )));
        }

        // 验证最大迭代次数
        if config.max_iterations == 0 {
            error!("最大迭代次数不能为 0");
            return Err(SolverError::InvalidConfiguration(
                "最大迭代次数必须大于 0".to_string(),
            ));
        }

        // 验证超时时间
        if config.timeout_seconds == 0 {
            error!("超时时间不能为 0");
            return Err(SolverError::InvalidConfiguration(
                "超时时间必须大于 0 秒".to_string(),
            ));
        }

        debug!("配置验证通过");
        Ok(())
    }

    /// 获取求解器配置
    ///
    /// # 返回
    ///
    /// 返回当前求解器的配置引用
    pub fn config(&self) -> &SolverConfig {
        &self.config
    }

    // ========================================================================
    // 固定课程安排
    // ========================================================================

    /// 安排固定课程
    ///
    /// 将所有固定课程添加到课表中，并验证它们不违反硬约束。
    /// 固定课程包括班会课、劳动课、自习课等固定在特定时间槽位的课程。
    ///
    /// # 参数
    ///
    /// * `schedule` - 当前课表（可变引用）
    /// * `fixed_courses` - 固定课程列表
    /// * `subject_configs` - 课程配置映射
    /// * `teacher_prefs` - 教师偏好映射
    /// * `venues` - 场地配置映射
    /// * `exclusions` - 教师互斥关系列表
    ///
    /// # 返回
    ///
    /// 如果所有固定课程都成功安排返回 Ok(())，否则返回错误
    ///
    /// # 错误
    ///
    /// 如果固定课程违反硬约束（教师冲突、班级冲突、场地冲突等），返回 ConstraintViolation 错误
    ///
    /// # 示例
    ///
    /// ```rust
    /// use course_scheduling_system::algorithm::solver::ConstraintSolver;
    /// use course_scheduling_system::algorithm::types::*;
    /// use std::collections::HashMap;
    ///
    /// let solver = ConstraintSolver::new(SolverConfig::default()).unwrap();
    /// let mut schedule = Schedule::new(5, 8);
    ///
    /// // 创建固定课程：班会课固定在周五最后一节
    /// let time_slot = TimeSlot { day: 4, period: 7 };
    /// let fixed_course = FixedCourse::new(101, "class_meeting".to_string(), 1001, time_slot);
    /// let fixed_courses = vec![fixed_course];
    ///
    /// let subject_configs = HashMap::new();
    /// let teacher_prefs = HashMap::new();
    /// let venues = HashMap::new();
    /// let exclusions = vec![];
    ///
    /// // let result = solver.place_fixed_courses(
    /// //     &mut schedule,
    /// //     &fixed_courses,
    /// //     &subject_configs,
    /// //     &teacher_prefs,
    /// //     &venues,
    /// //     &exclusions,
    /// // );
    /// // assert!(result.is_ok());
    /// ```
    pub fn place_fixed_courses(
        &self,
        schedule: &mut crate::algorithm::types::Schedule,
        fixed_courses: &[crate::algorithm::types::FixedCourse],
        subject_configs: &std::collections::HashMap<String, crate::algorithm::types::SubjectConfig>,
        teacher_prefs: &std::collections::HashMap<u32, crate::algorithm::types::TeacherPreference>,
        venues: &std::collections::HashMap<String, crate::algorithm::types::Venue>,
        exclusions: &[crate::algorithm::types::TeacherMutualExclusion],
    ) -> Result<(), SolverError> {
        info!("开始安排固定课程，共 {} 个", fixed_courses.len());

        // 遍历所有固定课程
        for (index, fixed_course) in fixed_courses.iter().enumerate() {
            debug!(
                "安排固定课程 {}/{}: 班级={}, 科目={}, 教师={}, 时间槽位=({}, {})",
                index + 1,
                fixed_courses.len(),
                fixed_course.class_id,
                fixed_course.subject_id,
                fixed_course.teacher_id,
                fixed_course.time_slot.day + 1,
                fixed_course.time_slot.period + 1
            );

            // 验证时间槽位有效性
            if !fixed_course
                .time_slot
                .is_valid(self.config.cycle_days, self.config.periods_per_day)
            {
                let error_msg = format!(
                    "固定课程的时间槽位无效：班级={}, 科目={}, 时间槽位=({}, {}), 最大天数={}, 最大节次={}",
                    fixed_course.class_id,
                    fixed_course.subject_id,
                    fixed_course.time_slot.day + 1,
                    fixed_course.time_slot.period + 1,
                    self.config.cycle_days,
                    self.config.periods_per_day
                );
                error!("{}", error_msg);
                return Err(SolverError::ConstraintViolation(error_msg));
            }

            // 获取课程配置和教师偏好
            let subject_config = subject_configs.get(&fixed_course.subject_id);
            let teacher_pref = teacher_prefs.get(&fixed_course.teacher_id);

            // 如果找不到配置，记录警告但继续（允许固定课程没有配置）
            if subject_config.is_none() {
                debug!(
                    "警告：固定课程 {} 没有找到课程配置，跳过课程配置检查",
                    fixed_course.subject_id
                );
            }

            if teacher_pref.is_none() {
                debug!(
                    "警告：固定课程的教师 {} 没有找到教师偏好，跳过教师偏好检查",
                    fixed_course.teacher_id
                );
            }

            // 1. 检查教师时间冲突
            self.check_teacher_conflict(
                schedule,
                fixed_course.teacher_id,
                &fixed_course.time_slot,
            )?;

            // 2. 检查班级时间冲突
            self.check_class_conflict(schedule, fixed_course.class_id, &fixed_course.time_slot)?;

            // 3. 如果有课程配置，检查课程禁止时段
            if let Some(config) = subject_config {
                self.check_forbidden_slot(config, &fixed_course.time_slot)?;
            }

            // 4. 如果有教师偏好，检查教师不排课时段
            if let Some(pref) = teacher_pref {
                self.check_teacher_blocked(pref, &fixed_course.time_slot)?;
            }

            // 5. 检查场地容量（如果课程有关联场地）
            if let Some(config) = subject_config {
                if let Some(venue_id) = &config.venue_id {
                    if let Some(venue) = venues.get(venue_id) {
                        self.check_venue_capacity(
                            schedule,
                            config,
                            venue,
                            &fixed_course.time_slot,
                        )?;
                    }
                }
            }

            // 6. 检查教师互斥约束
            for exclusion in exclusions {
                self.check_teacher_mutual_exclusion(
                    schedule,
                    exclusion,
                    fixed_course.teacher_id,
                    &fixed_course.time_slot,
                )?;
            }

            // 所有检查通过，添加固定课程到课表
            let entry = crate::algorithm::types::ScheduleEntry {
                class_id: fixed_course.class_id,
                subject_id: fixed_course.subject_id.clone(),
                teacher_id: fixed_course.teacher_id,
                time_slot: fixed_course.time_slot,
                is_fixed: true,
                week_type: crate::algorithm::types::WeekType::Every,
            };

            schedule.add_entry(entry);

            debug!(
                "固定课程安排成功：班级={}, 科目={}, 教师={}, 时间槽位=({}, {})",
                fixed_course.class_id,
                fixed_course.subject_id,
                fixed_course.teacher_id,
                fixed_course.time_slot.day + 1,
                fixed_course.time_slot.period + 1
            );
        }

        info!("所有固定课程安排完成，共 {} 个", fixed_courses.len());
        Ok(())
    }

    // ========================================================================
    // 约束图构建
    // ========================================================================

    /// 构建约束图
    ///
    /// 将输入的配置数据转换为高效的查找结构，便于在求解过程中快速访问。
    /// 约束图包含科目配置、教师偏好、场地配置和教师互斥关系的映射。
    ///
    /// # 参数
    ///
    /// * `curriculums` - 教学计划列表（用于提取相关配置）
    /// * `subject_configs` - 科目配置列表
    /// * `teacher_prefs` - 教师偏好列表
    /// * `venues` - 场地配置列表
    /// * `exclusions` - 教师互斥关系列表
    ///
    /// # 返回
    ///
    /// 返回构建好的约束图实例
    ///
    /// # 示例
    ///
    /// ```rust
    /// use course_scheduling_system::algorithm::solver::{ConstraintSolver, SolverConfig};
    /// use course_scheduling_system::algorithm::types::*;
    ///
    /// let solver = ConstraintSolver::new(SolverConfig::default()).unwrap();
    ///
    /// let curriculums = vec![
    ///     ClassCurriculum::new(1, 101, "math".to_string(), 1001, 5),
    /// ];
    ///
    /// let subject_configs = vec![
    ///     SubjectConfig::new("math".to_string(), "数学".to_string()),
    /// ];
    ///
    /// let teacher_prefs = vec![
    ///     TeacherPreference::new(1001),
    /// ];
    ///
    /// let venues = vec![];
    /// let exclusions = vec![];
    ///
    /// let graph = solver.build_constraint_graph(
    ///     &curriculums,
    ///     &subject_configs,
    ///     &teacher_prefs,
    ///     &venues,
    ///     &exclusions,
    /// );
    ///
    /// assert_eq!(graph.subject_configs.len(), 1);
    /// assert_eq!(graph.teacher_prefs.len(), 1);
    /// ```
    pub fn build_constraint_graph(
        &self,
        curriculums: &[crate::algorithm::types::ClassCurriculum],
        subject_configs: &[crate::algorithm::types::SubjectConfig],
        teacher_prefs: &[crate::algorithm::types::TeacherPreference],
        venues: &[crate::algorithm::types::Venue],
        exclusions: &[crate::algorithm::types::TeacherMutualExclusion],
    ) -> crate::algorithm::types::ConstraintGraph {
        info!("开始构建约束图");

        // 构建科目配置映射
        debug!("构建科目配置映射，共 {} 个科目", subject_configs.len());
        let subject_config_map: std::collections::HashMap<
            String,
            crate::algorithm::types::SubjectConfig,
        > = subject_configs
            .iter()
            .map(|config| (config.id.clone(), config.clone()))
            .collect();

        // 构建教师偏好映射
        debug!("构建教师偏好映射，共 {} 个教师", teacher_prefs.len());
        let teacher_pref_map: std::collections::HashMap<
            u32,
            crate::algorithm::types::TeacherPreference,
        > = teacher_prefs
            .iter()
            .map(|pref| (pref.teacher_id, pref.clone()))
            .collect();

        // 构建场地配置映射
        debug!("构建场地配置映射，共 {} 个场地", venues.len());
        let venue_map: std::collections::HashMap<String, crate::algorithm::types::Venue> = venues
            .iter()
            .map(|venue| (venue.id.clone(), venue.clone()))
            .collect();

        // 复制教师互斥关系列表
        debug!("复制教师互斥关系列表，共 {} 个关系", exclusions.len());
        let exclusion_list = exclusions.to_vec();

        // 创建约束图
        let graph = crate::algorithm::types::ConstraintGraph::new(
            subject_config_map,
            teacher_pref_map,
            venue_map,
            exclusion_list,
        );

        info!(
            "约束图构建完成：科目 {} 个，教师 {} 个，场地 {} 个，互斥关系 {} 个",
            graph.subject_configs.len(),
            graph.teacher_prefs.len(),
            graph.venues.len(),
            graph.exclusions.len()
        );

        // 记录教学计划统计信息
        debug!("教学计划统计：共 {} 个", curriculums.len());
        let combined_count = curriculums.iter().filter(|c| c.is_combined()).count();
        if combined_count > 0 {
            debug!("其中合班课程 {} 个", combined_count);
        }

        graph
    }

    // ========================================================================
    // 硬约束检查函数
    // ========================================================================

    /// 检查课程禁止时段（硬约束 1）
    ///
    /// 检查课程是否被安排在禁止的时段。
    /// 使用 SubjectConfig 的 forbidden_slots 位掩码进行检查。
    ///
    /// # 参数
    ///
    /// * `subject_config` - 课程配置
    /// * `slot` - 待检查的时间槽位
    ///
    /// # 返回
    ///
    /// 如果时段可用返回 Ok(())，否则返回 ConstraintViolation 错误
    ///
    /// # 示例
    ///
    /// ```rust
    /// use course_scheduling_system::algorithm::types::{SubjectConfig, TimeSlot};
    /// use course_scheduling_system::algorithm::solver::ConstraintSolver;
    ///
    /// let subject = SubjectConfig::new("PE".to_string(), "体育".to_string());
    /// let slot = TimeSlot::new(0, 0); // 第1天第1节
    /// // solver.check_forbidden_slot(&subject, &slot)?;
    /// ```
    pub fn check_forbidden_slot(
        &self,
        subject_config: &crate::algorithm::types::SubjectConfig,
        slot: &crate::algorithm::types::TimeSlot,
    ) -> Result<(), SolverError> {
        use tracing::trace;

        trace!(
            "检查课程 {} 在时段 {:?} 是否被禁止",
            subject_config.name,
            slot
        );

        // 检查时段是否在禁止列表中
        if subject_config.is_slot_forbidden(slot, self.config.periods_per_day) {
            let error_msg = format!(
                "课程 {} 不能安排在第{}天第{}节（禁止时段）",
                subject_config.name,
                slot.day + 1,
                slot.period + 1
            );
            debug!("{}", error_msg);
            return Err(SolverError::ConstraintViolation(error_msg));
        }

        trace!("课程 {} 在时段 {:?} 可用", subject_config.name, slot);
        Ok(())
    }

    /// 检查教师不排课时段（硬约束 2）
    ///
    /// 检查教师是否在不排课时段被安排课程。
    /// 使用 TeacherPreference 的 blocked_slots 位掩码进行检查。
    ///
    /// # 参数
    ///
    /// * `teacher_pref` - 教师偏好配置
    /// * `slot` - 待检查的时间槽位
    ///
    /// # 返回
    ///
    /// 如果时段可用返回 Ok(())，否则返回 ConstraintViolation 错误
    pub fn check_teacher_blocked(
        &self,
        teacher_pref: &crate::algorithm::types::TeacherPreference,
        slot: &crate::algorithm::types::TimeSlot,
    ) -> Result<(), SolverError> {
        use tracing::trace;

        trace!(
            "检查教师 {} 在时段 {:?} 是否不排课",
            teacher_pref.teacher_id,
            slot
        );

        // 检查时段是否在教师不排课列表中
        if teacher_pref.is_slot_blocked(slot, self.config.periods_per_day) {
            let error_msg = format!(
                "教师 {} 在第{}天第{}节不排课",
                teacher_pref.teacher_id,
                slot.day + 1,
                slot.period + 1
            );
            debug!("{}", error_msg);
            return Err(SolverError::ConstraintViolation(error_msg));
        }

        trace!("教师 {} 在时段 {:?} 可排课", teacher_pref.teacher_id, slot);
        Ok(())
    }

    /// 检查教师时间冲突（硬约束 3）
    ///
    /// 检查教师在同一时段是否有多节课。
    /// 使用 Schedule 的 is_teacher_busy() 方法进行检查。
    ///
    /// # 参数
    ///
    /// * `schedule` - 当前课表
    /// * `teacher_id` - 教师ID
    /// * `slot` - 待检查的时间槽位
    ///
    /// # 返回
    ///
    /// 如果教师空闲返回 Ok(())，否则返回 ConstraintViolation 错误
    pub fn check_teacher_conflict(
        &self,
        schedule: &crate::algorithm::types::Schedule,
        teacher_id: u32,
        slot: &crate::algorithm::types::TimeSlot,
    ) -> Result<(), SolverError> {
        use tracing::trace;

        trace!("检查教师 {} 在时段 {:?} 是否有冲突", teacher_id, slot);

        // 检查教师是否已经在该时段有课
        if schedule.is_teacher_busy(teacher_id, slot) {
            let error_msg = format!(
                "教师 {} 在第{}天第{}节已有课程（时间冲突）",
                teacher_id,
                slot.day + 1,
                slot.period + 1
            );
            debug!("{}", error_msg);
            return Err(SolverError::ConstraintViolation(error_msg));
        }

        trace!("教师 {} 在时段 {:?} 空闲", teacher_id, slot);
        Ok(())
    }

    /// 检查班级时间冲突（硬约束 4）
    ///
    /// 检查班级在同一时段是否有多节课。
    /// 使用 Schedule 的 is_class_busy() 方法进行检查。
    ///
    /// # 参数
    ///
    /// * `schedule` - 当前课表
    /// * `class_id` - 班级ID
    /// * `slot` - 待检查的时间槽位
    ///
    /// # 返回
    ///
    /// 如果班级空闲返回 Ok(())，否则返回 ConstraintViolation 错误
    pub fn check_class_conflict(
        &self,
        schedule: &crate::algorithm::types::Schedule,
        class_id: u32,
        slot: &crate::algorithm::types::TimeSlot,
    ) -> Result<(), SolverError> {
        use tracing::trace;

        trace!("检查班级 {} 在时段 {:?} 是否有冲突", class_id, slot);

        // 检查班级是否已经在该时段有课
        if schedule.is_class_busy(class_id, slot) {
            let error_msg = format!(
                "班级 {} 在第{}天第{}节已有课程（时间冲突）",
                class_id,
                slot.day + 1,
                slot.period + 1
            );
            debug!("{}", error_msg);
            return Err(SolverError::ConstraintViolation(error_msg));
        }

        trace!("班级 {} 在时段 {:?} 空闲", class_id, slot);
        Ok(())
    }

    /// 检查合班课程冲突（硬约束 5）
    ///
    /// 检查合班课程的所有班级是否都空闲。
    /// 遍历 combined_class_ids 检查每个班级。
    ///
    /// # 参数
    ///
    /// * `schedule` - 当前课表
    /// * `curriculum` - 教学计划（包含合班信息）
    /// * `slot` - 待检查的时间槽位
    ///
    /// # 返回
    ///
    /// 如果所有班级都空闲返回 Ok(())，否则返回 ConstraintViolation 错误
    pub fn check_combined_class_conflict(
        &self,
        schedule: &crate::algorithm::types::Schedule,
        curriculum: &crate::algorithm::types::ClassCurriculum,
        slot: &crate::algorithm::types::TimeSlot,
    ) -> Result<(), SolverError> {
        use tracing::trace;

        // 如果不是合班课程，直接返回成功
        if !curriculum.is_combined() {
            return Ok(());
        }

        trace!(
            "检查合班课程（班级 {}）在时段 {:?} 的所有班级是否空闲",
            curriculum.class_id,
            slot
        );

        // 检查主班级
        if schedule.is_class_busy(curriculum.class_id, slot) {
            let error_msg = format!(
                "合班课程的主班级 {} 在第{}天第{}节已有课程",
                curriculum.class_id,
                slot.day + 1,
                slot.period + 1
            );
            debug!("{}", error_msg);
            return Err(SolverError::ConstraintViolation(error_msg));
        }

        // 检查所有合班班级
        for &class_id in &curriculum.combined_class_ids {
            if schedule.is_class_busy(class_id, slot) {
                let error_msg = format!(
                    "合班课程的班级 {} 在第{}天第{}节已有课程",
                    class_id,
                    slot.day + 1,
                    slot.period + 1
                );
                debug!("{}", error_msg);
                return Err(SolverError::ConstraintViolation(error_msg));
            }
        }

        trace!("合班课程的所有班级在时段 {:?} 都空闲", slot);
        Ok(())
    }

    /// 检查场地容量限制（硬约束 6）
    ///
    /// 检查场地在指定时段的使用数量是否超过容量。
    /// 统计同一场地同一时段的课程数量。
    ///
    /// # 参数
    ///
    /// * `schedule` - 当前课表
    /// * `subject_config` - 课程配置（包含场地信息）
    /// * `venue` - 场地配置
    /// * `slot` - 待检查的时间槽位
    ///
    /// # 返回
    ///
    /// 如果场地容量足够返回 Ok(())，否则返回 ConstraintViolation 错误
    pub fn check_venue_capacity(
        &self,
        schedule: &crate::algorithm::types::Schedule,
        subject_config: &crate::algorithm::types::SubjectConfig,
        venue: &crate::algorithm::types::Venue,
        slot: &crate::algorithm::types::TimeSlot,
    ) -> Result<(), SolverError> {
        use tracing::trace;

        trace!("检查场地 {} 在时段 {:?} 的容量", venue.name, slot);

        // 统计该场地在该时段的使用数量
        let venue_usage = schedule
            .get_entries_at(slot)
            .iter()
            .filter(|entry| {
                // 这里需要通过 subject_id 查找对应的 subject_config
                // 简化处理：假设 entry.subject_id 与 subject_config.id 匹配时才计数
                entry.subject_id == subject_config.id
            })
            .count() as u8;

        trace!(
            "场地 {} 当前使用数量：{}，容量：{}",
            venue.name,
            venue_usage,
            venue.capacity
        );

        // 检查是否超过容量
        if !venue.can_accommodate(venue_usage) {
            let error_msg = format!(
                "场地 {} 在第{}天第{}节已达容量上限（{}/{}）",
                venue.name,
                slot.day + 1,
                slot.period + 1,
                venue_usage,
                venue.capacity
            );
            debug!("{}", error_msg);
            return Err(SolverError::ConstraintViolation(error_msg));
        }

        trace!("场地 {} 在时段 {:?} 容量充足", venue.name, slot);
        Ok(())
    }

    /// 检查教师互斥约束（硬约束 7）
    ///
    /// 检查互斥的两位教师是否同时上课。
    /// 使用 TeacherMutualExclusion 的 is_excluded_at() 方法进行检查。
    ///
    /// # 参数
    ///
    /// * `schedule` - 当前课表
    /// * `exclusion` - 教师互斥关系
    /// * `teacher_id` - 待安排的教师ID
    /// * `slot` - 待检查的时间槽位
    ///
    /// # 返回
    ///
    /// 如果不违反互斥约束返回 Ok(())，否则返回 ConstraintViolation 错误
    pub fn check_teacher_mutual_exclusion(
        &self,
        schedule: &crate::algorithm::types::Schedule,
        exclusion: &crate::algorithm::types::TeacherMutualExclusion,
        teacher_id: u32,
        slot: &crate::algorithm::types::TimeSlot,
    ) -> Result<(), SolverError> {
        use tracing::trace;

        trace!("检查教师 {} 在时段 {:?} 的互斥约束", teacher_id, slot);

        // 检查该时段是否在互斥范围内
        if !exclusion.is_excluded_at(slot, self.config.periods_per_day) {
            trace!("该时段不在互斥范围内");
            return Ok(());
        }

        // 确定互斥的另一位教师
        let other_teacher_id = if exclusion.teacher_a_id == teacher_id {
            exclusion.teacher_b_id
        } else if exclusion.teacher_b_id == teacher_id {
            exclusion.teacher_a_id
        } else {
            // 该教师不在互斥关系中
            return Ok(());
        };

        // 检查另一位教师是否在该时段有课
        if schedule.is_teacher_busy(other_teacher_id, slot) {
            let error_msg = format!(
                "教师 {} 与教师 {} 在第{}天第{}节互斥，不能同时上课",
                teacher_id,
                other_teacher_id,
                slot.day + 1,
                slot.period + 1
            );
            debug!("{}", error_msg);
            return Err(SolverError::ConstraintViolation(error_msg));
        }

        trace!("教师 {} 在时段 {:?} 不违反互斥约束", teacher_id, slot);
        Ok(())
    }

    /// 检查连堂限制（硬约束 8）
    ///
    /// 检查不允许连堂的课程是否被连续安排。
    /// 检查前后相邻节次是否有同一课程。
    ///
    /// # 参数
    ///
    /// * `schedule` - 当前课表
    /// * `curriculum` - 教学计划
    /// * `subject_config` - 课程配置
    /// * `slot` - 待检查的时间槽位
    ///
    /// # 返回
    ///
    /// 如果不违反连堂限制返回 Ok(())，否则返回 ConstraintViolation 错误
    pub fn check_double_session_constraint(
        &self,
        schedule: &crate::algorithm::types::Schedule,
        curriculum: &crate::algorithm::types::ClassCurriculum,
        subject_config: &crate::algorithm::types::SubjectConfig,
        slot: &crate::algorithm::types::TimeSlot,
    ) -> Result<(), SolverError> {
        use tracing::trace;

        // 如果允许连堂，直接返回成功
        if subject_config.allow_double_session {
            return Ok(());
        }

        trace!(
            "检查课程 {} 在时段 {:?} 的连堂限制",
            subject_config.name,
            slot
        );

        // 检查前一节次
        if slot.period > 0 {
            let prev_slot = crate::algorithm::types::TimeSlot::new(slot.day, slot.period - 1);
            let prev_entries = schedule.get_entries_for_class(curriculum.class_id);

            for entry in prev_entries {
                if entry.time_slot == prev_slot && entry.subject_id == curriculum.subject_id {
                    let error_msg = format!(
                        "课程 {} 不允许连堂，但在第{}天第{}节和第{}节连续安排",
                        subject_config.name,
                        slot.day + 1,
                        slot.period,
                        slot.period + 1
                    );
                    debug!("{}", error_msg);
                    return Err(SolverError::ConstraintViolation(error_msg));
                }
            }
        }

        // 检查后一节次
        if slot.period < self.config.periods_per_day - 1 {
            let next_slot = crate::algorithm::types::TimeSlot::new(slot.day, slot.period + 1);
            let next_entries = schedule.get_entries_for_class(curriculum.class_id);

            for entry in next_entries {
                if entry.time_slot == next_slot && entry.subject_id == curriculum.subject_id {
                    let error_msg = format!(
                        "课程 {} 不允许连堂，但在第{}天第{}节和第{}节连续安排",
                        subject_config.name,
                        slot.day + 1,
                        slot.period + 1,
                        slot.period + 2
                    );
                    debug!("{}", error_msg);
                    return Err(SolverError::ConstraintViolation(error_msg));
                }
            }
        }

        trace!(
            "课程 {} 在时段 {:?} 不违反连堂限制",
            subject_config.name,
            slot
        );
        Ok(())
    }
}

// ============================================================================
// 单元测试
// ============================================================================

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_solver_config_default() {
        let config = SolverConfig::default();
        assert_eq!(config.cycle_days, 5);
        assert_eq!(config.periods_per_day, 8);
        assert_eq!(config.max_iterations, 10000);
        assert_eq!(config.timeout_seconds, 30);
    }

    #[test]
    fn test_solver_config_custom() {
        let config = SolverConfig {
            cycle_days: 7,
            periods_per_day: 10,
            max_iterations: 5000,
            timeout_seconds: 60,
            enable_cost_cache: true,
        };
        assert_eq!(config.cycle_days, 7);
        assert_eq!(config.periods_per_day, 10);
        assert_eq!(config.max_iterations, 5000);
        assert_eq!(config.timeout_seconds, 60);
        assert_eq!(config.enable_cost_cache, true);
    }

    #[test]
    fn test_validate_config_valid() {
        let config = SolverConfig::default();
        assert!(ConstraintSolver::validate_config(&config).is_ok());
    }

    #[test]
    fn test_validate_config_invalid_cycle_days_too_small() {
        let config = SolverConfig {
            cycle_days: 0,
            ..Default::default()
        };
        let result = ConstraintSolver::validate_config(&config);
        assert!(result.is_err());
        assert!(matches!(
            result.unwrap_err(),
            SolverError::InvalidConfiguration(_)
        ));
    }

    #[test]
    fn test_validate_config_invalid_cycle_days_too_large() {
        let config = SolverConfig {
            cycle_days: 31,
            ..Default::default()
        };
        let result = ConstraintSolver::validate_config(&config);
        assert!(result.is_err());
        assert!(matches!(
            result.unwrap_err(),
            SolverError::InvalidConfiguration(_)
        ));
    }

    #[test]
    fn test_validate_config_invalid_periods_per_day_too_small() {
        let config = SolverConfig {
            periods_per_day: 0,
            ..Default::default()
        };
        let result = ConstraintSolver::validate_config(&config);
        assert!(result.is_err());
        assert!(matches!(
            result.unwrap_err(),
            SolverError::InvalidConfiguration(_)
        ));
    }

    #[test]
    fn test_validate_config_invalid_periods_per_day_too_large() {
        let config = SolverConfig {
            periods_per_day: 13,
            ..Default::default()
        };
        let result = ConstraintSolver::validate_config(&config);
        assert!(result.is_err());
        assert!(matches!(
            result.unwrap_err(),
            SolverError::InvalidConfiguration(_)
        ));
    }

    #[test]
    fn test_validate_config_invalid_max_iterations_zero() {
        let config = SolverConfig {
            max_iterations: 0,
            ..Default::default()
        };
        let result = ConstraintSolver::validate_config(&config);
        assert!(result.is_err());
        assert!(matches!(
            result.unwrap_err(),
            SolverError::InvalidConfiguration(_)
        ));
    }

    #[test]
    fn test_validate_config_invalid_timeout_zero() {
        let config = SolverConfig {
            timeout_seconds: 0,
            ..Default::default()
        };
        let result = ConstraintSolver::validate_config(&config);
        assert!(result.is_err());
        assert!(matches!(
            result.unwrap_err(),
            SolverError::InvalidConfiguration(_)
        ));
    }

    #[test]
    fn test_constraint_solver_new_valid() {
        let config = SolverConfig::default();
        let result = ConstraintSolver::new(config);
        assert!(result.is_ok());
    }

    #[test]
    fn test_constraint_solver_new_invalid() {
        let config = SolverConfig {
            cycle_days: 0,
            ..Default::default()
        };
        let result = ConstraintSolver::new(config);
        assert!(result.is_err());
    }

    #[test]
    fn test_constraint_solver_config_getter() {
        let config = SolverConfig {
            cycle_days: 7,
            periods_per_day: 10,
            max_iterations: 5000,
            timeout_seconds: 60,
            enable_cost_cache: true,
        };
        let solver = ConstraintSolver::new(config.clone()).unwrap();
        assert_eq!(solver.config(), &config);
    }

    #[test]
    fn test_solver_error_no_solution_found() {
        let error = SolverError::NoSolutionFound;
        assert_eq!(error.to_string(), "未找到可行解");
    }

    #[test]
    fn test_solver_error_timeout_exceeded() {
        let error = SolverError::TimeoutExceeded;
        assert_eq!(error.to_string(), "求解超时");
    }

    #[test]
    fn test_solver_error_invalid_configuration() {
        let error = SolverError::InvalidConfiguration("测试错误".to_string());
        assert_eq!(error.to_string(), "配置无效：测试错误");
    }

    #[test]
    fn test_solver_error_constraint_violation() {
        let error = SolverError::ConstraintViolation("教师时间冲突".to_string());
        assert_eq!(error.to_string(), "约束违反：教师时间冲突");
    }

    #[test]
    fn test_solver_config_serialization() {
        let config = SolverConfig::default();
        let json = serde_json::to_string(&config).unwrap();
        let deserialized: SolverConfig = serde_json::from_str(&json).unwrap();
        assert_eq!(config, deserialized);
    }

    #[test]
    fn test_solver_error_serialization() {
        let error = SolverError::NoSolutionFound;
        let json = serde_json::to_string(&error).unwrap();
        let deserialized: SolverError = serde_json::from_str(&json).unwrap();
        assert_eq!(error, deserialized);
    }

    #[test]
    fn test_solver_config_clone() {
        let config = SolverConfig::default();
        let cloned = config.clone();
        assert_eq!(config, cloned);
    }

    #[test]
    fn test_constraint_solver_clone() {
        let config = SolverConfig::default();
        let solver = ConstraintSolver::new(config).unwrap();
        let cloned = solver.clone();
        assert_eq!(solver.config(), cloned.config());
    }

    // ========================================================================
    // 硬约束检查函数测试
    // ========================================================================

    #[test]
    fn test_check_forbidden_slot_allowed() {
        use crate::algorithm::types::{SubjectConfig, TimeSlot};

        let config = SolverConfig::default();
        let solver = ConstraintSolver::new(config).unwrap();

        let subject = SubjectConfig::new("MATH".to_string(), "数学".to_string());
        let slot = TimeSlot::new(0, 0);

        // 数学课没有禁止时段，应该通过
        assert!(solver.check_forbidden_slot(&subject, &slot).is_ok());
    }

    #[test]
    fn test_check_forbidden_slot_forbidden() {
        use crate::algorithm::types::{SubjectConfig, TimeSlot};

        let config = SolverConfig::default();
        let solver = ConstraintSolver::new(config.clone()).unwrap();

        let mut subject = SubjectConfig::new("PE".to_string(), "体育".to_string());
        let slot = TimeSlot::new(0, 0); // 第1天第1节

        // 设置体育课禁止在第1节
        subject.set_forbidden_slot(&slot, config.periods_per_day);

        // 应该返回错误
        let result = solver.check_forbidden_slot(&subject, &slot);
        assert!(result.is_err());
        assert!(matches!(
            result.unwrap_err(),
            SolverError::ConstraintViolation(_)
        ));
    }

    #[test]
    fn test_check_teacher_blocked_allowed() {
        use crate::algorithm::types::{TeacherPreference, TimeSlot};

        let config = SolverConfig::default();
        let solver = ConstraintSolver::new(config).unwrap();

        let teacher_pref = TeacherPreference::new(1);
        let slot = TimeSlot::new(0, 0);

        // 教师没有不排课时段，应该通过
        assert!(solver.check_teacher_blocked(&teacher_pref, &slot).is_ok());
    }

    #[test]
    fn test_check_teacher_blocked_blocked() {
        use crate::algorithm::types::{TeacherPreference, TimeSlot};

        let config = SolverConfig::default();
        let solver = ConstraintSolver::new(config.clone()).unwrap();

        let mut teacher_pref = TeacherPreference::new(1);
        let slot = TimeSlot::new(0, 0);

        // 设置教师在第1节不排课
        teacher_pref.set_blocked_slot(&slot, config.periods_per_day);

        // 应该返回错误
        let result = solver.check_teacher_blocked(&teacher_pref, &slot);
        assert!(result.is_err());
        assert!(matches!(
            result.unwrap_err(),
            SolverError::ConstraintViolation(_)
        ));
    }

    #[test]
    fn test_check_teacher_conflict_no_conflict() {
        use crate::algorithm::types::{Schedule, TimeSlot};

        let config = SolverConfig::default();
        let solver = ConstraintSolver::new(config).unwrap();

        let schedule = Schedule::new(5, 8);
        let slot = TimeSlot::new(0, 0);

        // 空课表，教师应该空闲
        assert!(solver.check_teacher_conflict(&schedule, 1, &slot).is_ok());
    }

    #[test]
    fn test_check_teacher_conflict_has_conflict() {
        use crate::algorithm::types::{Schedule, ScheduleEntry, TimeSlot};

        let config = SolverConfig::default();
        let solver = ConstraintSolver::new(config).unwrap();

        let mut schedule = Schedule::new(5, 8);
        let slot = TimeSlot::new(0, 0);

        // 添加一节课
        let entry = ScheduleEntry::new(1, "MATH".to_string(), 1, slot);
        schedule.add_entry(entry);

        // 教师1在该时段已有课，应该返回错误
        let result = solver.check_teacher_conflict(&schedule, 1, &slot);
        assert!(result.is_err());
        assert!(matches!(
            result.unwrap_err(),
            SolverError::ConstraintViolation(_)
        ));
    }

    #[test]
    fn test_check_class_conflict_no_conflict() {
        use crate::algorithm::types::{Schedule, TimeSlot};

        let config = SolverConfig::default();
        let solver = ConstraintSolver::new(config).unwrap();

        let schedule = Schedule::new(5, 8);
        let slot = TimeSlot::new(0, 0);

        // 空课表，班级应该空闲
        assert!(solver.check_class_conflict(&schedule, 1, &slot).is_ok());
    }

    #[test]
    fn test_check_class_conflict_has_conflict() {
        use crate::algorithm::types::{Schedule, ScheduleEntry, TimeSlot};

        let config = SolverConfig::default();
        let solver = ConstraintSolver::new(config).unwrap();

        let mut schedule = Schedule::new(5, 8);
        let slot = TimeSlot::new(0, 0);

        // 添加一节课
        let entry = ScheduleEntry::new(1, "MATH".to_string(), 1, slot);
        schedule.add_entry(entry);

        // 班级1在该时段已有课，应该返回错误
        let result = solver.check_class_conflict(&schedule, 1, &slot);
        assert!(result.is_err());
        assert!(matches!(
            result.unwrap_err(),
            SolverError::ConstraintViolation(_)
        ));
    }

    #[test]
    fn test_check_combined_class_conflict_not_combined() {
        use crate::algorithm::types::{ClassCurriculum, Schedule, TimeSlot};

        let config = SolverConfig::default();
        let solver = ConstraintSolver::new(config).unwrap();

        let schedule = Schedule::new(5, 8);
        let curriculum = ClassCurriculum::new(1, 1, "MATH".to_string(), 1, 5);
        let slot = TimeSlot::new(0, 0);

        // 不是合班课程，应该直接通过
        assert!(solver
            .check_combined_class_conflict(&schedule, &curriculum, &slot)
            .is_ok());
    }

    #[test]
    fn test_check_combined_class_conflict_all_free() {
        use crate::algorithm::types::{ClassCurriculum, Schedule, TimeSlot};

        let config = SolverConfig::default();
        let solver = ConstraintSolver::new(config).unwrap();

        let schedule = Schedule::new(5, 8);
        let mut curriculum = ClassCurriculum::new(1, 1, "PE".to_string(), 1, 2);

        // 添加合班班级
        curriculum.add_combined_class(2);
        curriculum.add_combined_class(3);

        let slot = TimeSlot::new(0, 0);

        // 所有班级都空闲，应该通过
        assert!(solver
            .check_combined_class_conflict(&schedule, &curriculum, &slot)
            .is_ok());
    }

    #[test]
    fn test_check_combined_class_conflict_has_conflict() {
        use crate::algorithm::types::{ClassCurriculum, Schedule, ScheduleEntry, TimeSlot};

        let config = SolverConfig::default();
        let solver = ConstraintSolver::new(config).unwrap();

        let mut schedule = Schedule::new(5, 8);
        let slot = TimeSlot::new(0, 0);

        // 班级2在该时段已有课
        let entry = ScheduleEntry::new(2, "MATH".to_string(), 2, slot);
        schedule.add_entry(entry);

        let mut curriculum = ClassCurriculum::new(1, 1, "PE".to_string(), 1, 2);

        // 添加合班班级
        curriculum.add_combined_class(2);
        curriculum.add_combined_class(3);

        // 合班班级2有冲突，应该返回错误
        let result = solver.check_combined_class_conflict(&schedule, &curriculum, &slot);
        assert!(result.is_err());
        assert!(matches!(
            result.unwrap_err(),
            SolverError::ConstraintViolation(_)
        ));
    }

    #[test]
    fn test_check_venue_capacity_sufficient() {
        use crate::algorithm::types::{Schedule, SubjectConfig, TimeSlot, Venue};

        let config = SolverConfig::default();
        let solver = ConstraintSolver::new(config).unwrap();

        let schedule = Schedule::new(5, 8);
        let subject = SubjectConfig::new("PE".to_string(), "体育".to_string());
        let venue = Venue::new("PLAYGROUND".to_string(), "操场".to_string(), 3);
        let slot = TimeSlot::new(0, 0);

        // 场地容量充足，应该通过
        assert!(solver
            .check_venue_capacity(&schedule, &subject, &venue, &slot)
            .is_ok());
    }

    #[test]
    fn test_check_venue_capacity_exceeded() {
        use crate::algorithm::types::{Schedule, ScheduleEntry, SubjectConfig, TimeSlot, Venue};

        let config = SolverConfig::default();
        let solver = ConstraintSolver::new(config).unwrap();

        let mut schedule = Schedule::new(5, 8);
        let slot = TimeSlot::new(0, 0);

        // 添加3节体育课（容量为3）
        for i in 1..=3 {
            let entry = ScheduleEntry::new(i, "PE".to_string(), i, slot);
            schedule.add_entry(entry);
        }

        let subject = SubjectConfig::new("PE".to_string(), "体育".to_string());
        let venue = Venue::new("PLAYGROUND".to_string(), "操场".to_string(), 3);

        // 场地已满，应该返回错误
        let result = solver.check_venue_capacity(&schedule, &subject, &venue, &slot);
        assert!(result.is_err());
        assert!(matches!(
            result.unwrap_err(),
            SolverError::ConstraintViolation(_)
        ));
    }

    #[test]
    fn test_check_teacher_mutual_exclusion_no_exclusion() {
        use crate::algorithm::types::{Schedule, TeacherMutualExclusion, TimeSlot};

        let config = SolverConfig::default();
        let solver = ConstraintSolver::new(config).unwrap();

        let schedule = Schedule::new(5, 8);
        let exclusion = TeacherMutualExclusion::new_all_time(1, 2);
        let slot = TimeSlot::new(0, 0);

        // 教师2没有课，应该通过
        assert!(solver
            .check_teacher_mutual_exclusion(&schedule, &exclusion, 1, &slot)
            .is_ok());
    }

    #[test]
    fn test_check_teacher_mutual_exclusion_has_exclusion() {
        use crate::algorithm::types::{Schedule, ScheduleEntry, TeacherMutualExclusion, TimeSlot};

        let config = SolverConfig::default();
        let solver = ConstraintSolver::new(config).unwrap();

        let mut schedule = Schedule::new(5, 8);
        let slot = TimeSlot::new(0, 0);

        // 教师2在该时段有课
        let entry = ScheduleEntry::new(2, "MATH".to_string(), 2, slot);
        schedule.add_entry(entry);

        let exclusion = TeacherMutualExclusion::new_all_time(1, 2);

        // 教师1和教师2互斥，应该返回错误
        let result = solver.check_teacher_mutual_exclusion(&schedule, &exclusion, 1, &slot);
        assert!(result.is_err());
        assert!(matches!(
            result.unwrap_err(),
            SolverError::ConstraintViolation(_)
        ));
    }

    #[test]
    fn test_check_double_session_constraint_allowed() {
        use crate::algorithm::types::{ClassCurriculum, Schedule, SubjectConfig, TimeSlot};

        let config = SolverConfig::default();
        let solver = ConstraintSolver::new(config).unwrap();

        let schedule = Schedule::new(5, 8);
        let mut subject = SubjectConfig::new("MATH".to_string(), "数学".to_string());
        subject.allow_double_session = true; // 允许连堂

        let curriculum = ClassCurriculum::new(1, 1, "MATH".to_string(), 1, 5);
        let slot = TimeSlot::new(0, 1);

        // 允许连堂，应该通过
        assert!(solver
            .check_double_session_constraint(&schedule, &curriculum, &subject, &slot)
            .is_ok());
    }

    #[test]
    fn test_check_double_session_constraint_no_adjacent() {
        use crate::algorithm::types::{ClassCurriculum, Schedule, SubjectConfig, TimeSlot};

        let config = SolverConfig::default();
        let solver = ConstraintSolver::new(config).unwrap();

        let schedule = Schedule::new(5, 8);
        let mut subject = SubjectConfig::new("PE".to_string(), "体育".to_string());
        subject.allow_double_session = false; // 不允许连堂

        let curriculum = ClassCurriculum::new(1, 1, "PE".to_string(), 1, 2);
        let slot = TimeSlot::new(0, 1);

        // 前后都没有相同课程，应该通过
        assert!(solver
            .check_double_session_constraint(&schedule, &curriculum, &subject, &slot)
            .is_ok());
    }

    #[test]
    fn test_check_double_session_constraint_has_adjacent() {
        use crate::algorithm::types::{
            ClassCurriculum, Schedule, ScheduleEntry, SubjectConfig, TimeSlot,
        };

        let config = SolverConfig::default();
        let solver = ConstraintSolver::new(config).unwrap();

        let mut schedule = Schedule::new(5, 8);

        // 在第0节添加体育课
        let entry = ScheduleEntry::new(1, "PE".to_string(), 1, TimeSlot::new(0, 0));
        schedule.add_entry(entry);

        let mut subject = SubjectConfig::new("PE".to_string(), "体育".to_string());
        subject.allow_double_session = false; // 不允许连堂

        let curriculum = ClassCurriculum::new(1, 1, "PE".to_string(), 1, 2);

        // 尝试在第1节安排体育课（与第0节连堂）
        let slot = TimeSlot::new(0, 1);
        let result =
            solver.check_double_session_constraint(&schedule, &curriculum, &subject, &slot);
        assert!(result.is_err());
        assert!(matches!(
            result.unwrap_err(),
            SolverError::ConstraintViolation(_)
        ));
    }
}

// ============================================================================
// 回溯搜索算法实现
// ============================================================================

impl ConstraintSolver {
    /// 回溯搜索算法
    ///
    /// 使用回溯搜索算法生成满足所有硬约束的课表方案。
    /// 该算法递归地为每个教学计划尝试所有可用时间槽位，
    /// 使用硬约束检查进行剪枝，限制解的数量避免内存溢出。
    ///
    /// # 参数
    ///
    /// * `schedule` - 当前课表（可变引用）
    /// * `curriculums` - 所有教学计划
    /// * `subject_configs` - 课程配置映射
    /// * `teacher_prefs` - 教师偏好映射
    /// * `venues` - 场地配置映射
    /// * `exclusions` - 教师互斥关系列表
    /// * `curriculum_index` - 当前处理的教学计划索引
    ///
    /// # 返回
    ///
    /// 返回找到的所有可行解（Vec<Schedule>），最多100个
    ///
    /// # 错误
    ///
    /// 如果无法找到任何可行解，返回空的解集
    ///
    /// # 算法流程
    ///
    /// 1. 检查递归终止条件：所有教学计划都已安排完成
    /// 2. 获取当前教学计划的所有可用时间槽位
    /// 3. 对每个可用槽位：
    ///    a. 尝试为该教学计划安排课程
    ///    b. 递归调用 backtrack_search 处理下一个教学计划
    ///    c. 收集所有子解
    ///    d. 回溯（移除刚才安排的课程）
    /// 4. 限制解的数量（最多100个）避免内存溢出
    ///
    /// # 示例
    ///
    /// ```rust
    /// use course_scheduling_system::algorithm::solver::ConstraintSolver;
    /// use course_scheduling_system::algorithm::types::*;
    /// use std::collections::HashMap;
    ///
    /// let solver = ConstraintSolver::new(SolverConfig::default()).unwrap();
    /// let mut schedule = Schedule::new(5, 8);
    /// let curriculums = vec![/* ... */];
    /// let subject_configs = HashMap::new();
    /// let teacher_prefs = HashMap::new();
    /// let venues = HashMap::new();
    /// let exclusions = vec![];
    ///
    /// // let solutions = solver.backtrack_search(
    /// //     &mut schedule,
    /// //     &curriculums,
    /// //     &subject_configs,
    /// //     &teacher_prefs,
    /// //     &venues,
    /// //     &exclusions,
    /// //     0,
    /// // )?;
    /// ```
    pub fn backtrack_search(
        &self,
        schedule: &mut crate::algorithm::types::Schedule,
        curriculums: &[crate::algorithm::types::ClassCurriculum],
        subject_configs: &std::collections::HashMap<String, crate::algorithm::types::SubjectConfig>,
        teacher_prefs: &std::collections::HashMap<u32, crate::algorithm::types::TeacherPreference>,
        venues: &std::collections::HashMap<String, crate::algorithm::types::Venue>,
        exclusions: &[crate::algorithm::types::TeacherMutualExclusion],
        curriculum_index: usize,
    ) -> Result<Vec<crate::algorithm::types::Schedule>, SolverError> {
        use tracing::trace;

        // 记录搜索开始（仅在第一层）
        if curriculum_index == 0 {
            info!(
                "开始回溯搜索算法 - 教学计划总数: {}, 当前课表已安排课程数: {}",
                curriculums.len(),
                schedule.entries.len()
            );
        }

        trace!(
            "回溯搜索 - 当前深度: {}/{}, 当前课表课程数: {}",
            curriculum_index,
            curriculums.len(),
            schedule.entries.len()
        );

        // 递归终止条件：所有教学计划都已安排完成
        if curriculum_index >= curriculums.len() {
            info!("✓ 所有教学计划已安排完成，生成一个可行解");
            debug!(
                "可行解详情 - 总课程数: {}, 固定课程数: {}",
                schedule.entries.len(),
                schedule.entries.iter().filter(|e| e.is_fixed).count()
            );

            // 构建约束图用于代价计算
            let constraint_graph = crate::algorithm::types::ConstraintGraph::new(
                subject_configs.clone(),
                teacher_prefs.clone(),
                venues.clone(),
                exclusions.to_vec(),
            );

            // 计算代价值
            let cost = self.calculate_cost(schedule, &constraint_graph);
            debug!("计算得到的代价值: {}", cost);

            let mut final_schedule = schedule.clone();
            final_schedule.cost = cost;
            return Ok(vec![final_schedule]);
        }

        let curriculum = &curriculums[curriculum_index];
        info!(
            "处理教学计划 {}/{} - 班级ID: {}, 科目: {}, 教师ID: {}, 目标课时: {}",
            curriculum_index + 1,
            curriculums.len(),
            curriculum.class_id,
            curriculum.subject_id,
            curriculum.teacher_id,
            curriculum.target_sessions
        );

        // 如果是合班课程，记录合班信息
        if curriculum.is_combined() {
            debug!(
                "合班课程 - 主班级: {}, 合班班级: {:?}",
                curriculum.class_id, curriculum.combined_class_ids
            );
        }

        let mut solutions = Vec::new();

        // 尝试为该教学计划的所有课时安排时间槽位
        debug!("开始为教学计划安排 {} 节课", curriculum.target_sessions);
        let result = self.try_place_curriculum(
            schedule,
            curriculum,
            curriculums,
            subject_configs,
            teacher_prefs,
            venues,
            exclusions,
            curriculum_index,
            0, // 从第0节课开始
            &mut solutions,
        );

        if result.is_ok() {
            info!("✓ 教学计划安排成功 - 找到 {} 个解", solutions.len());
            if solutions.len() >= 100 {
                info!("⚠ 已达到解数量上限 (100)，停止搜索更多解");
            }
        } else {
            debug!(
                "✗ 教学计划安排失败 - 班级: {}, 科目: {}",
                curriculum.class_id, curriculum.subject_id
            );
        }

        trace!(
            "回溯搜索完成 - 深度: {}, 返回解数量: {}",
            curriculum_index,
            solutions.len()
        );

        Ok(solutions)
    }

    /// 尝试为教学计划安排课程
    ///
    /// 递归地为教学计划的每节课尝试所有可用时间槽位。
    ///
    /// # 参数
    ///
    /// * `schedule` - 当前课表（可变引用）
    /// * `curriculum` - 当前教学计划
    /// * `curriculums` - 所有教学计划
    /// * `subject_configs` - 课程配置映射
    /// * `teacher_prefs` - 教师偏好映射
    /// * `venues` - 场地配置映射
    /// * `exclusions` - 教师互斥关系列表
    /// * `curriculum_index` - 当前教学计划索引
    /// * `session_num` - 当前安排的课时编号（0开始）
    /// * `solutions` - 收集的解集
    ///
    /// # 返回
    ///
    /// 如果成功安排返回 Ok(())，否则返回错误
    fn try_place_curriculum(
        &self,
        schedule: &mut crate::algorithm::types::Schedule,
        curriculum: &crate::algorithm::types::ClassCurriculum,
        curriculums: &[crate::algorithm::types::ClassCurriculum],
        subject_configs: &std::collections::HashMap<String, crate::algorithm::types::SubjectConfig>,
        teacher_prefs: &std::collections::HashMap<u32, crate::algorithm::types::TeacherPreference>,
        venues: &std::collections::HashMap<String, crate::algorithm::types::Venue>,
        exclusions: &[crate::algorithm::types::TeacherMutualExclusion],
        curriculum_index: usize,
        session_num: u8,
        solutions: &mut Vec<crate::algorithm::types::Schedule>,
    ) -> Result<(), SolverError> {
        use tracing::trace;

        // 如果该教学计划的所有课时都已安排完成，递归处理下一个教学计划
        if session_num >= curriculum.target_sessions {
            trace!(
                "✓ 当前教学计划的所有 {} 节课已安排完成，处理下一个教学计划",
                curriculum.target_sessions
            );

            // 递归处理下一个教学计划
            let sub_solutions = self.backtrack_search(
                schedule,
                curriculums,
                subject_configs,
                teacher_prefs,
                venues,
                exclusions,
                curriculum_index + 1,
            )?;

            debug!("下一个教学计划返回 {} 个子解", sub_solutions.len());

            solutions.extend(sub_solutions);
            return Ok(());
        }

        debug!(
            "尝试为教学计划安排第 {}/{} 节课 - 班级: {}, 科目: {}",
            session_num + 1,
            curriculum.target_sessions,
            curriculum.class_id,
            curriculum.subject_id
        );

        // 获取可用时间槽位
        let available_slots = self.get_available_slots_for_curriculum(
            schedule,
            curriculum,
            subject_configs,
            teacher_prefs,
            venues,
            exclusions,
        );

        if available_slots.is_empty() {
            warn!(
                "✗ 教学计划的第 {}/{} 节课没有可用时间槽位，回溯 - 班级: {}, 科目: {}",
                session_num + 1,
                curriculum.target_sessions,
                curriculum.class_id,
                curriculum.subject_id
            );
            return Err(SolverError::NoSolutionFound);
        }

        debug!(
            "找到 {} 个可用时间槽位，开始尝试放置",
            available_slots.len()
        );

        // 统计尝试次数
        let mut attempt_count = 0;
        let mut success_count = 0;

        // 尝试每个可用槽位
        for slot in available_slots {
            attempt_count += 1;

            trace!(
                "尝试 #{} - 将课程安排在第 {} 天第 {} 节",
                attempt_count,
                slot.day + 1,
                slot.period + 1
            );

            // 放置课程
            let entry = crate::algorithm::types::ScheduleEntry::new(
                curriculum.class_id,
                curriculum.subject_id.clone(),
                curriculum.teacher_id,
                slot,
            );
            schedule.add_entry(entry.clone());

            trace!(
                "✓ 课程已放置 - 当前课表总课程数: {}",
                schedule.entries.len()
            );

            // 递归安排下一节课
            let result = self.try_place_curriculum(
                schedule,
                curriculum,
                curriculums,
                subject_configs,
                teacher_prefs,
                venues,
                exclusions,
                curriculum_index,
                session_num + 1,
                solutions,
            );

            // 回溯：移除刚才放置的课程
            schedule.remove_entry(&entry);
            trace!(
                "↶ 回溯：移除课程 - 当前课表总课程数: {}",
                schedule.entries.len()
            );

            // 如果成功找到解，继续尝试其他槽位（寻找更多解）
            if result.is_ok() {
                success_count += 1;
                trace!("该槽位尝试成功，继续尝试其他槽位");

                // 限制解的数量以避免内存溢出
                if solutions.len() >= 100 {
                    info!(
                        "⚠ 已找到 100 个解，停止搜索 - 尝试次数: {}, 成功次数: {}",
                        attempt_count, success_count
                    );
                    return Ok(());
                }
            } else {
                trace!("该槽位尝试失败，尝试下一个槽位");
            }
        }

        debug!(
            "所有可用槽位尝试完成 - 总尝试: {}, 成功: {}, 当前解数量: {}",
            attempt_count,
            success_count,
            solutions.len()
        );

        Ok(())
    }

    /// 获取教学计划的可用时间槽位
    ///
    /// 遍历所有时间槽位，使用硬约束检查进行剪枝。
    ///
    /// # 参数
    ///
    /// * `schedule` - 当前课表
    /// * `curriculum` - 教学计划
    /// * `subject_configs` - 课程配置映射
    /// * `teacher_prefs` - 教师偏好映射
    /// * `venues` - 场地配置映射
    /// * `exclusions` - 教师互斥关系列表
    ///
    /// # 返回
    ///
    /// 返回所有满足硬约束的时间槽位列表
    /// 获取教学计划的所有可用时间槽位（优化版）
    ///
    /// 此方法遍历所有时间槽位，检查每个槽位是否满足所有硬约束。
    /// 优化点：
    /// 1. 添加详细的日志记录（TRACE 和 DEBUG 级别）
    /// 2. 使用位运算加速禁止时段检查
    /// 3. 提前终止策略：优先检查最常见的冲突
    /// 4. 统计信息：记录可用槽位数量和检查耗时
    ///
    /// # 参数
    ///
    /// * `schedule` - 当前课表
    /// * `curriculum` - 教学计划
    /// * `subject_configs` - 课程配置映射
    /// * `teacher_prefs` - 教师偏好映射
    /// * `venues` - 场地配置映射
    /// * `exclusions` - 教师互斥关系列表
    ///
    /// # 返回
    ///
    /// 返回所有可用的时间槽位列表
    fn get_available_slots_for_curriculum(
        &self,
        schedule: &crate::algorithm::types::Schedule,
        curriculum: &crate::algorithm::types::ClassCurriculum,
        subject_configs: &std::collections::HashMap<String, crate::algorithm::types::SubjectConfig>,
        teacher_prefs: &std::collections::HashMap<u32, crate::algorithm::types::TeacherPreference>,
        venues: &std::collections::HashMap<String, crate::algorithm::types::Venue>,
        exclusions: &[crate::algorithm::types::TeacherMutualExclusion],
    ) -> Vec<crate::algorithm::types::TimeSlot> {
        use std::time::Instant;
        use tracing::trace;

        // 开始计时
        let start_time = Instant::now();

        debug!(
            "开始获取可用时间槽位 - 班级ID: {}, 科目: {}, 教师ID: {}",
            curriculum.class_id, curriculum.subject_id, curriculum.teacher_id
        );

        let mut available = Vec::new();

        // 获取课程配置和教师偏好
        let subject_config = match subject_configs.get(&curriculum.subject_id) {
            Some(config) => config,
            None => {
                debug!("未找到课程配置: {}", curriculum.subject_id);
                return available;
            }
        };

        let teacher_pref = match teacher_prefs.get(&curriculum.teacher_id) {
            Some(pref) => pref,
            None => {
                debug!("未找到教师偏好: {}", curriculum.teacher_id);
                return available;
            }
        };

        trace!(
            "课程配置 - 禁止时段掩码: 0x{:X}, 允许连堂: {}",
            subject_config.forbidden_slots,
            subject_config.allow_double_session
        );
        trace!(
            "教师偏好 - 不排课时段掩码: 0x{:X}, 时间偏好: {}",
            teacher_pref.blocked_slots,
            teacher_pref.time_bias
        );

        // 统计信息
        let total_slots =
            (self.config.cycle_days as usize) * (self.config.periods_per_day as usize);
        let mut checked_slots = 0;
        let mut blocked_by_forbidden = 0;
        let mut blocked_by_teacher = 0;
        let mut blocked_by_conflict = 0;
        let mut blocked_by_other = 0;

        // 遍历所有时间槽位
        for day in 0..self.config.cycle_days {
            for period in 0..self.config.periods_per_day {
                checked_slots += 1;
                let slot = crate::algorithm::types::TimeSlot::new(day, period);

                // 使用位运算快速检查课程禁止时段（性能优化）
                let slot_bit = 1u64 << slot.to_bit_position(self.config.periods_per_day);
                if (subject_config.forbidden_slots & slot_bit) != 0 {
                    blocked_by_forbidden += 1;
                    trace!(
                        "时间槽位 ({}, {}) 被课程禁止时段规则阻止",
                        slot.day + 1,
                        slot.period + 1
                    );
                    continue;
                }

                // 使用位运算快速检查教师不排课时段（性能优化）
                if (teacher_pref.blocked_slots & slot_bit) != 0 {
                    blocked_by_teacher += 1;
                    trace!(
                        "时间槽位 ({}, {}) 被教师不排课时段规则阻止",
                        slot.day + 1,
                        slot.period + 1
                    );
                    continue;
                }

                // 检查教师和班级时间冲突（早期终止优化）
                if schedule.is_teacher_busy(curriculum.teacher_id, &slot) {
                    blocked_by_conflict += 1;
                    trace!(
                        "时间槽位 ({}, {}) 教师已有课程",
                        slot.day + 1,
                        slot.period + 1
                    );
                    continue;
                }

                if schedule.is_class_busy(curriculum.class_id, &slot) {
                    blocked_by_conflict += 1;
                    trace!(
                        "时间槽位 ({}, {}) 班级已有课程",
                        slot.day + 1,
                        slot.period + 1
                    );
                    continue;
                }

                // 检查其他硬约束
                if !self.check_all_hard_constraints(
                    schedule,
                    curriculum,
                    &slot,
                    subject_config,
                    teacher_pref,
                    venues,
                    exclusions,
                ) {
                    blocked_by_other += 1;
                    trace!(
                        "时间槽位 ({}, {}) 被其他硬约束阻止",
                        slot.day + 1,
                        slot.period + 1
                    );
                    continue;
                }

                // 槽位可用
                available.push(slot);
                trace!("时间槽位 ({}, {}) 可用 ✓", slot.day + 1, slot.period + 1);
            }
        }

        // 计算耗时
        let elapsed = start_time.elapsed();

        // 输出统计信息
        debug!(
            "可用时间槽位获取完成 - 班级ID: {}, 科目: {}",
            curriculum.class_id, curriculum.subject_id
        );
        debug!(
            "统计信息: 总槽位={}, 检查={}, 可用={}, 耗时={:?}",
            total_slots,
            checked_slots,
            available.len(),
            elapsed
        );
        debug!(
            "阻止原因统计: 课程禁止={}, 教师不排课={}, 时间冲突={}, 其他约束={}",
            blocked_by_forbidden, blocked_by_teacher, blocked_by_conflict, blocked_by_other
        );

        available
    }

    /// 检查所有硬约束
    ///
    /// 调用所有硬约束检查函数，返回是否满足所有硬约束。
    ///
    /// # 参数
    ///
    /// * `schedule` - 当前课表
    /// * `curriculum` - 教学计划
    /// * `slot` - 待检查的时间槽位
    /// * `subject_config` - 课程配置
    /// * `teacher_pref` - 教师偏好
    /// * `venues` - 场地配置映射
    /// * `exclusions` - 教师互斥关系列表
    ///
    /// # 返回
    ///
    /// 如果满足所有硬约束返回 `true`，否则返回 `false`
    fn check_all_hard_constraints(
        &self,
        schedule: &crate::algorithm::types::Schedule,
        curriculum: &crate::algorithm::types::ClassCurriculum,
        slot: &crate::algorithm::types::TimeSlot,
        subject_config: &crate::algorithm::types::SubjectConfig,
        teacher_pref: &crate::algorithm::types::TeacherPreference,
        venues: &std::collections::HashMap<String, crate::algorithm::types::Venue>,
        exclusions: &[crate::algorithm::types::TeacherMutualExclusion],
    ) -> bool {
        use tracing::trace;

        trace!(
            "开始检查所有硬约束 - 班级: {}, 科目: {}, 时段: ({}, {})",
            curriculum.class_id,
            curriculum.subject_id,
            slot.day + 1,
            slot.period + 1
        );

        // 1. 检查课程禁止时段
        if self.check_forbidden_slot(subject_config, slot).is_err() {
            trace!("✗ 硬约束检查失败：课程禁止时段");
            return false;
        }
        trace!("✓ 通过：课程禁止时段检查");

        // 2. 检查教师不排课时段
        if self.check_teacher_blocked(teacher_pref, slot).is_err() {
            trace!("✗ 硬约束检查失败：教师不排课时段");
            return false;
        }
        trace!("✓ 通过：教师不排课时段检查");

        // 3. 检查教师时间冲突
        if self
            .check_teacher_conflict(schedule, curriculum.teacher_id, slot)
            .is_err()
        {
            trace!("✗ 硬约束检查失败：教师时间冲突");
            return false;
        }
        trace!("✓ 通过：教师时间冲突检查");

        // 4. 检查班级时间冲突
        if self
            .check_class_conflict(schedule, curriculum.class_id, slot)
            .is_err()
        {
            trace!("✗ 硬约束检查失败：班级时间冲突");
            return false;
        }
        trace!("✓ 通过：班级时间冲突检查");

        // 5. 检查合班课程冲突
        if self
            .check_combined_class_conflict(schedule, curriculum, slot)
            .is_err()
        {
            trace!("✗ 硬约束检查失败：合班课程冲突");
            return false;
        }
        if curriculum.is_combined() {
            trace!("✓ 通过：合班课程冲突检查");
        }

        // 6. 检查场地容量
        if let Some(venue_id) = &subject_config.venue_id {
            if let Some(venue) = venues.get(venue_id) {
                if self
                    .check_venue_capacity(schedule, subject_config, venue, slot)
                    .is_err()
                {
                    trace!("✗ 硬约束检查失败：场地容量（场地: {}）", venue.name);
                    return false;
                }
                trace!("✓ 通过：场地容量检查（场地: {}）", venue.name);
            }
        }

        // 7. 检查教师互斥约束
        let mut exclusion_checked = false;
        for exclusion in exclusions {
            // 检查该互斥关系是否涉及当前教师
            if exclusion.teacher_a_id == curriculum.teacher_id
                || exclusion.teacher_b_id == curriculum.teacher_id
            {
                exclusion_checked = true;
                if self
                    .check_teacher_mutual_exclusion(
                        schedule,
                        exclusion,
                        curriculum.teacher_id,
                        slot,
                    )
                    .is_err()
                {
                    trace!(
                        "✗ 硬约束检查失败：教师互斥约束（教师: {} 与 {}）",
                        exclusion.teacher_a_id,
                        exclusion.teacher_b_id
                    );
                    return false;
                }
            }
        }
        if exclusion_checked {
            trace!("✓ 通过：教师互斥约束检查");
        }

        // 8. 检查连堂限制
        if !subject_config.allow_double_session {
            if self
                .check_double_session_constraint(schedule, curriculum, subject_config, slot)
                .is_err()
            {
                trace!("✗ 硬约束检查失败：连堂限制");
                return false;
            }
            trace!("✓ 通过：连堂限制检查");
        }

        trace!("✓ 所有硬约束检查通过");
        true
    }

    /// 检查单个槽位是否可用（快速检查版本）
    ///
    /// 此方法用于快速验证单个时间槽位是否可用，而不需要遍历所有槽位。
    /// 适用于手动调课时的实时冲突检测。
    ///
    /// # 参数
    ///
    /// * `schedule` - 当前课表
    /// * `curriculum` - 教学计划
    /// * `subject_config` - 课程配置
    /// * `teacher_pref` - 教师偏好
    /// * `slot` - 待检查的时间槽位
    /// * `venues` - 场地配置映射
    /// * `exclusions` - 教师互斥关系列表
    ///
    /// # 返回
    ///
    /// 如果槽位可用返回 `true`，否则返回 `false`
    pub fn is_slot_available(
        &self,
        schedule: &crate::algorithm::types::Schedule,
        curriculum: &crate::algorithm::types::ClassCurriculum,
        subject_config: &crate::algorithm::types::SubjectConfig,
        teacher_pref: &crate::algorithm::types::TeacherPreference,
        slot: &crate::algorithm::types::TimeSlot,
        venues: &std::collections::HashMap<String, crate::algorithm::types::Venue>,
        exclusions: &[crate::algorithm::types::TeacherMutualExclusion],
    ) -> bool {
        use tracing::trace;

        trace!(
            "快速检查时间槽位 ({}, {}) 是否可用 - 班级ID: {}, 科目: {}",
            slot.day + 1,
            slot.period + 1,
            curriculum.class_id,
            curriculum.subject_id
        );

        // 使用位运算快速检查（性能优化）
        let slot_bit = 1u64 << slot.to_bit_position(self.config.periods_per_day);

        // 1. 快速检查：课程禁止时段
        if (subject_config.forbidden_slots & slot_bit) != 0 {
            trace!("槽位不可用：课程禁止时段");
            return false;
        }

        // 2. 快速检查：教师不排课时段
        if (teacher_pref.blocked_slots & slot_bit) != 0 {
            trace!("槽位不可用：教师不排课时段");
            return false;
        }

        // 3. 快速检查：教师时间冲突
        if schedule.is_teacher_busy(curriculum.teacher_id, slot) {
            trace!("槽位不可用：教师已有课程");
            return false;
        }

        // 4. 快速检查：班级时间冲突
        if schedule.is_class_busy(curriculum.class_id, slot) {
            trace!("槽位不可用：班级已有课程");
            return false;
        }

        // 5. 完整硬约束检查
        let is_available = self.check_all_hard_constraints(
            schedule,
            curriculum,
            slot,
            subject_config,
            teacher_pref,
            venues,
            exclusions,
        );

        if is_available {
            trace!("槽位可用 ✓");
        } else {
            trace!("槽位不可用：其他硬约束");
        }

        is_available
    }

    /// 计算课表代价值（简化版）
    ///
    /// 这是一个简化的代价计算函数，用于回溯搜索过程中快速评估解的质量。
    /// 完整的代价函数将在后续任务中实现。
    ///
    /// # 参数
    ///
    /// * `schedule` - 当前课表
    ///
    /// # 返回
    ///
    /// 返回课表的代价值（当前简化为0）
    /// 计算课表的代价值
    ///
    /// 代价值越低表示课表越优。代价函数包含以下软约束：
    /// 1. 教师时段偏好违反: 不在偏好时段 +10 × 权重
    /// 2. 教师早晚偏好违反: 厌恶早课但排第1节 +50, 厌恶晚课但排最后一节 +50
    /// 3. 主科连续3节惩罚: 连续3节或更多 +30 × (连续数-2)
    /// 4. 进度一致性: 同一教师多班课时间差超过2天 +20 × (天数差-2)
    ///
    /// # 参数
    /// - `schedule`: 要计算代价的课表
    /// - `constraint_graph`: 约束图，包含教师偏好和科目配置
    ///
    /// # 返回
    /// 课表的总代价值
    ///
    /// # 日志
    /// - INFO: 记录代价计算的开始和完成，包含总代价值
    /// - DEBUG: 记录每种软约束的代价分量
    /// - TRACE: 记录每个课程条目的代价计算细节
    /// 计算课表代价值（优化版本）
    ///
    /// 优化策略：
    /// 1. 单次遍历计算多个代价分量，避免重复遍历
    /// 2. 使用引用而非克隆，减少内存分配
    /// 3. 提前分组数据，减少重复查找
    /// 4. 使用迭代器而非收集到 Vec
    ///
    /// # 参数
    /// - `schedule`: 课表引用
    /// - `constraint_graph`: 约束图引用
    ///
    /// # 返回
    /// 课表的总代价值
    pub fn calculate_cost(
        &self,
        schedule: &crate::algorithm::types::Schedule,
        constraint_graph: &crate::algorithm::types::ConstraintGraph,
    ) -> u32 {
        use std::collections::HashMap;
        use tracing::{debug, info};

        info!("开始计算课表代价值（优化版本）");
        let start_time = std::time::Instant::now();

        let mut total_cost = 0u32;

        // 统计课表信息
        let total_entries = schedule.entries.len();
        let fixed_entries = schedule.entries.iter().filter(|e| e.is_fixed).count();
        let non_fixed_entries = total_entries - fixed_entries;

        debug!(
            "课表统计 - 总课程数: {}, 固定课程: {}, 非固定课程: {}",
            total_entries, fixed_entries, non_fixed_entries
        );

        // 预分组数据结构，避免重复遍历
        // 按 (班级ID, 科目ID) 分组，用于主科连续检查
        let mut class_subject_slots: HashMap<(u32, &str), Vec<(u8, u8)>> = HashMap::new();
        // 按 (教师ID, 科目ID) 分组，用于进度一致性检查
        let mut teacher_subject_days: HashMap<(u32, &str), Vec<u8>> = HashMap::new();

        // 代价分量计数器
        let mut teacher_preference_cost = 0u32;
        let mut time_bias_cost = 0u32;

        // 单次遍历计算教师偏好和早晚偏好代价，同时收集分组数据
        for entry in &schedule.entries {
            // 获取教师偏好配置（使用引用，避免克隆）
            if let Some(teacher_pref) = constraint_graph.get_teacher_preference(entry.teacher_id) {
                // 计算时间槽位的位掩码（只计算一次）
                let slot_bit = 1u64 << entry.time_slot.to_bit_position(self.config.periods_per_day);

                // 软约束1：教师时段偏好
                if teacher_pref.preferred_slots != 0
                    && (slot_bit & teacher_pref.preferred_slots) == 0
                {
                    let penalty = 10 * teacher_pref.weight;
                    teacher_preference_cost += penalty;
                }

                // 软约束2：教师早晚偏好
                if teacher_pref.time_bias == 1 && entry.time_slot.period == 0 {
                    time_bias_cost += 50;
                } else if teacher_pref.time_bias == 2
                    && entry.time_slot.period == self.config.periods_per_day - 1
                {
                    time_bias_cost += 50;
                }
            }

            // 收集主科课程的时段信息（用于连续检查）
            if let Some(subject_config) = constraint_graph.get_subject_config(&entry.subject_id) {
                if subject_config.is_major_subject {
                    class_subject_slots
                        .entry((entry.class_id, entry.subject_id.as_str()))
                        .or_insert_with(Vec::new)
                        .push((entry.time_slot.day, entry.time_slot.period));
                }
            }

            // 收集教师-科目的天数信息（用于进度一致性检查）
            teacher_subject_days
                .entry((entry.teacher_id, entry.subject_id.as_str()))
                .or_insert_with(Vec::new)
                .push(entry.time_slot.day);
        }

        total_cost += teacher_preference_cost;
        total_cost += time_bias_cost;

        // 软约束3：主科连续3节惩罚（使用预分组的数据）
        let consecutive_major_cost =
            self.calculate_consecutive_cost_optimized(&class_subject_slots);
        total_cost += consecutive_major_cost;

        // 软约束4：进度一致性（使用预分组的数据）
        let progress_consistency_cost =
            self.calculate_progress_cost_optimized(&teacher_subject_days);
        total_cost += progress_consistency_cost;

        let elapsed = start_time.elapsed();
        debug!(
            "代价分量 - 教师偏好: {}, 早晚偏好: {}, 主科连续: {}, 进度一致性: {}",
            teacher_preference_cost,
            time_bias_cost,
            consecutive_major_cost,
            progress_consistency_cost
        );

        info!(
            "代价计算完成 - 总代价值: {}, 耗时: {:?}",
            total_cost, elapsed
        );

        total_cost
    }

    /// 优化版本：计算主科连续惩罚代价
    ///
    /// 使用预分组的数据，避免重复遍历和查找
    ///
    /// # 参数
    /// - `class_subject_slots`: 预分组的班级-科目时段数据
    ///
    /// # 返回
    /// 主科连续惩罚的总代价
    fn calculate_consecutive_cost_optimized(
        &self,
        class_subject_slots: &std::collections::HashMap<(u32, &str), Vec<(u8, u8)>>,
    ) -> u32 {
        use tracing::trace;

        let mut cost = 0u32;

        // 检查每个班级的每门主科
        for ((class_id, subject_id), slots) in class_subject_slots {
            // 排序时段（避免克隆，直接在引用上操作）
            let mut sorted_slots: Vec<(u8, u8)> = slots.clone();
            sorted_slots.sort_unstable_by(|a, b| a.0.cmp(&b.0).then(a.1.cmp(&b.1)));

            // 统计连续节次
            let mut consecutive_count = 1u32;
            for i in 1..sorted_slots.len() {
                let (prev_day, prev_period) = sorted_slots[i - 1];
                let (curr_day, curr_period) = sorted_slots[i];

                // 检查是否连续（同一天且节次连续）
                if curr_day == prev_day && curr_period == prev_period + 1 {
                    consecutive_count += 1;
                } else {
                    // 不连续，检查之前的连续数
                    if consecutive_count >= 3 {
                        let penalty = 30 * (consecutive_count - 2);
                        cost += penalty;
                        trace!(
                            "主科连续惩罚 - 班级: {}, 科目: {}, 连续数: {}, 惩罚: {}",
                            class_id,
                            subject_id,
                            consecutive_count,
                            penalty
                        );
                    }
                    consecutive_count = 1;
                }
            }

            // 检查最后一组连续
            if consecutive_count >= 3 {
                let penalty = 30 * (consecutive_count - 2);
                cost += penalty;
                trace!(
                    "主科连续惩罚 - 班级: {}, 科目: {}, 连续数: {}, 惩罚: {}",
                    class_id,
                    subject_id,
                    consecutive_count,
                    penalty
                );
            }
        }

        cost
    }

    /// 优化版本：计算进度一致性代价
    ///
    /// 使用预分组的数据，避免重复遍历和查找
    ///
    /// # 参数
    /// - `teacher_subject_days`: 预分组的教师-科目天数数据
    ///
    /// # 返回
    /// 进度一致性违反的总代价
    fn calculate_progress_cost_optimized(
        &self,
        teacher_subject_days: &std::collections::HashMap<(u32, &str), Vec<u8>>,
    ) -> u32 {
        use tracing::trace;

        let mut cost = 0u32;

        // 检查每组的时间分布
        for ((teacher_id, subject_id), days) in teacher_subject_days {
            let days_vec: &Vec<u8> = days;
            if days_vec.len() > 1 {
                // 使用迭代器直接计算最大最小值，避免收集到 Vec
                let max_day = *days_vec.iter().max().unwrap();
                let min_day = *days_vec.iter().min().unwrap();
                let day_diff = max_day - min_day;

                // 如果时间差超过2天，增加惩罚
                if day_diff > 2 {
                    let penalty = (day_diff - 2) as u32 * 20;
                    cost += penalty;
                    trace!(
                        "进度一致性违反 - 教师: {}, 科目: {}, 班级数: {}, 时间差: {} 天, 惩罚: {}",
                        teacher_id,
                        subject_id,
                        days_vec.len(),
                        day_diff,
                        penalty
                    );
                }
            }
        }

        cost
    }

    /// 带缓存的代价计算方法
    ///
    /// 使用缓存避免重复计算相同课表的代价值。
    ///
    /// # 参数
    /// - `schedule`: 课表引用
    /// - `constraint_graph`: 约束图引用
    /// - `cache`: 代价缓存（可变引用）
    ///
    /// # 返回
    /// 课表的总代价值
    ///
    /// # 示例
    ///
    /// ```
    /// use course_scheduling::algorithm::{ConstraintSolver, SolverConfig, CostCache};
    /// use course_scheduling::algorithm::types::{Schedule, ConstraintGraph};
    ///
    /// let config = SolverConfig::default();
    /// let solver = ConstraintSolver::new(config).unwrap();
    /// let schedule = Schedule::new(5, 8);
    /// let constraint_graph = ConstraintGraph::new(
    ///     HashMap::new(),
    ///     HashMap::new(),
    ///     HashMap::new(),
    ///     vec![],
    /// );
    /// let mut cache = CostCache::new(1000);
    ///
    /// let cost = solver.calculate_cost_with_cache(&schedule, &constraint_graph, &mut cache);
    /// ```
    pub fn calculate_cost_with_cache(
        &self,
        schedule: &crate::algorithm::types::Schedule,
        constraint_graph: &crate::algorithm::types::ConstraintGraph,
        cache: &mut crate::algorithm::cost_cache::CostCache,
    ) -> u32 {
        use crate::algorithm::schedule_hash::calculate_schedule_hash;
        use tracing::{debug, info};

        // 如果未启用缓存，直接计算
        if !self.config.enable_cost_cache {
            return self.calculate_cost(schedule, constraint_graph);
        }

        // 计算课表哈希值
        let schedule_hash = calculate_schedule_hash(schedule);

        // 尝试从缓存获取
        if let Some(cached_cost) = cache.get(schedule_hash) {
            debug!(
                "代价缓存命中，哈希值: {}, 代价: {}",
                schedule_hash, cached_cost
            );
            return cached_cost;
        }

        // 缓存未命中，计算代价值
        info!("代价缓存未命中，计算新的代价值");
        let cost = self.calculate_cost(schedule, constraint_graph);

        // 将结果存入缓存
        cache.insert(schedule_hash, cost);
        debug!("代价值已缓存，哈希值: {}, 代价: {}", schedule_hash, cost);

        cost
    }
}

// ============================================================================
// 固定课程安排单元测试
// ============================================================================

#[cfg(test)]
mod fixed_course_tests {
    use super::*;
    use crate::algorithm::types::*;
    use std::collections::HashMap;

    /// 测试成功安排固定课程
    #[test]
    fn test_place_fixed_courses_success() {
        // 创建求解器
        let config = SolverConfig::default();
        let solver = ConstraintSolver::new(config).unwrap();

        // 创建空课表
        let mut schedule = Schedule::new(5, 8);

        // 创建固定课程：班会课固定在周五最后一节
        let time_slot = TimeSlot { day: 4, period: 7 };
        let fixed_course = FixedCourse::new(101, "class_meeting".to_string(), 1001, time_slot);
        let fixed_courses = vec![fixed_course];

        // 创建课程配置
        let mut subject_configs = HashMap::new();
        let class_meeting_config =
            SubjectConfig::new("class_meeting".to_string(), "班会".to_string());
        subject_configs.insert("class_meeting".to_string(), class_meeting_config);

        // 创建教师偏好
        let mut teacher_prefs = HashMap::new();
        let teacher_pref = TeacherPreference::new(1001);
        teacher_prefs.insert(1001, teacher_pref);

        let venues = HashMap::new();
        let exclusions = vec![];

        // 安排固定课程
        let result = solver.place_fixed_courses(
            &mut schedule,
            &fixed_courses,
            &subject_configs,
            &teacher_prefs,
            &venues,
            &exclusions,
        );

        // 验证结果
        assert!(result.is_ok(), "固定课程安排应该成功");
        assert_eq!(schedule.entries.len(), 1, "课表应该有1个条目");

        let entry = &schedule.entries[0];
        assert_eq!(entry.class_id, 101);
        assert_eq!(entry.subject_id, "class_meeting");
        assert_eq!(entry.teacher_id, 1001);
        assert_eq!(entry.time_slot.day, 4);
        assert_eq!(entry.time_slot.period, 7);
        assert!(entry.is_fixed, "条目应该标记为固定课程");
    }

    /// 测试检测固定课程的教师冲突
    #[test]
    fn test_place_fixed_courses_teacher_conflict() {
        // 创建求解器
        let config = SolverConfig::default();
        let solver = ConstraintSolver::new(config).unwrap();

        // 创建课表，已有一节课
        let mut schedule = Schedule::new(5, 8);
        let existing_slot = TimeSlot { day: 0, period: 0 };
        let existing_entry = ScheduleEntry::new(101, "math".to_string(), 1001, existing_slot);
        schedule.add_entry(existing_entry);

        // 创建固定课程：同一教师，同一时间
        let fixed_course = FixedCourse::new(
            102,
            "chinese".to_string(),
            1001,          // 同一教师
            existing_slot, // 同一时间
        );
        let fixed_courses = vec![fixed_course];

        let subject_configs = HashMap::new();
        let teacher_prefs = HashMap::new();
        let venues = HashMap::new();
        let exclusions = vec![];

        // 安排固定课程
        let result = solver.place_fixed_courses(
            &mut schedule,
            &fixed_courses,
            &subject_configs,
            &teacher_prefs,
            &venues,
            &exclusions,
        );

        // 验证结果
        assert!(result.is_err(), "应该检测到教师冲突");
        match result.unwrap_err() {
            SolverError::ConstraintViolation(msg) => {
                assert!(msg.contains("教师"), "错误消息应该提到教师");
                assert!(
                    msg.contains("冲突") || msg.contains("已有课程"),
                    "错误消息应该提到冲突"
                );
            }
            _ => panic!("应该返回 ConstraintViolation 错误"),
        }

        // 验证课表没有被修改
        assert_eq!(schedule.entries.len(), 1, "课表应该只有原来的1个条目");
    }

    /// 测试检测固定课程的班级冲突
    #[test]
    fn test_place_fixed_courses_class_conflict() {
        // 创建求解器
        let config = SolverConfig::default();
        let solver = ConstraintSolver::new(config).unwrap();

        // 创建课表，已有一节课
        let mut schedule = Schedule::new(5, 8);
        let existing_slot = TimeSlot { day: 1, period: 2 };
        let existing_entry = ScheduleEntry::new(101, "math".to_string(), 1001, existing_slot);
        schedule.add_entry(existing_entry);

        // 创建固定课程：同一班级，同一时间
        let fixed_course = FixedCourse::new(
            101, // 同一班级
            "chinese".to_string(),
            1002,          // 不同教师
            existing_slot, // 同一时间
        );
        let fixed_courses = vec![fixed_course];

        let subject_configs = HashMap::new();
        let teacher_prefs = HashMap::new();
        let venues = HashMap::new();
        let exclusions = vec![];

        // 安排固定课程
        let result = solver.place_fixed_courses(
            &mut schedule,
            &fixed_courses,
            &subject_configs,
            &teacher_prefs,
            &venues,
            &exclusions,
        );

        // 验证结果
        assert!(result.is_err(), "应该检测到班级冲突");
        match result.unwrap_err() {
            SolverError::ConstraintViolation(msg) => {
                assert!(msg.contains("班级"), "错误消息应该提到班级");
                assert!(
                    msg.contains("冲突") || msg.contains("已有课程"),
                    "错误消息应该提到冲突"
                );
            }
            _ => panic!("应该返回 ConstraintViolation 错误"),
        }

        // 验证课表没有被修改
        assert_eq!(schedule.entries.len(), 1, "课表应该只有原来的1个条目");
    }

    /// 测试检测固定课程的场地冲突
    #[test]
    fn test_place_fixed_courses_venue_conflict() {
        // 创建求解器
        let config = SolverConfig::default();
        let solver = ConstraintSolver::new(config).unwrap();

        // 创建课表，已有一节体育课
        let mut schedule = Schedule::new(5, 8);
        let existing_slot = TimeSlot { day: 2, period: 3 };
        let existing_entry = ScheduleEntry::new(101, "pe".to_string(), 1001, existing_slot);
        schedule.add_entry(existing_entry);

        // 创建固定课程：同一场地，同一时间
        let fixed_course = FixedCourse::new(102, "pe".to_string(), 1002, existing_slot);
        let fixed_courses = vec![fixed_course];

        // 创建课程配置（关联场地）
        let mut subject_configs = HashMap::new();
        let mut pe_config = SubjectConfig::new("pe".to_string(), "体育".to_string());
        pe_config.venue_id = Some("playground".to_string());
        subject_configs.insert("pe".to_string(), pe_config);

        // 创建场地配置（容量为1）
        let mut venues = HashMap::new();
        let playground = Venue::new("playground".to_string(), "操场".to_string(), 1);
        venues.insert("playground".to_string(), playground);

        let teacher_prefs = HashMap::new();
        let exclusions = vec![];

        // 安排固定课程
        let result = solver.place_fixed_courses(
            &mut schedule,
            &fixed_courses,
            &subject_configs,
            &teacher_prefs,
            &venues,
            &exclusions,
        );

        // 验证结果
        assert!(result.is_err(), "应该检测到场地冲突");
        match result.unwrap_err() {
            SolverError::ConstraintViolation(msg) => {
                assert!(
                    msg.contains("场地") || msg.contains("容量"),
                    "错误消息应该提到场地或容量"
                );
            }
            _ => panic!("应该返回 ConstraintViolation 错误"),
        }

        // 验证课表没有被修改
        assert_eq!(schedule.entries.len(), 1, "课表应该只有原来的1个条目");
    }

    /// 测试多个固定课程的安排
    #[test]
    fn test_place_multiple_fixed_courses() {
        // 创建求解器
        let config = SolverConfig::default();
        let solver = ConstraintSolver::new(config).unwrap();

        // 创建空课表
        let mut schedule = Schedule::new(5, 8);

        // 创建多个固定课程
        let fixed_courses = vec![
            // 班级101的班会课：周五最后一节
            FixedCourse::new(
                101,
                "class_meeting".to_string(),
                1001,
                TimeSlot { day: 4, period: 7 },
            ),
            // 班级102的班会课：周五最后一节
            FixedCourse::new(
                102,
                "class_meeting".to_string(),
                1002,
                TimeSlot { day: 4, period: 7 },
            ),
            // 班级101的劳动课：周三下午
            FixedCourse::new(
                101,
                "labor".to_string(),
                1003,
                TimeSlot { day: 2, period: 6 },
            ),
            // 班级102的劳动课：周三下午
            FixedCourse::new(
                102,
                "labor".to_string(),
                1004,
                TimeSlot { day: 2, period: 6 },
            ),
        ];

        let subject_configs = HashMap::new();
        let teacher_prefs = HashMap::new();
        let venues = HashMap::new();
        let exclusions = vec![];

        // 安排固定课程
        let result = solver.place_fixed_courses(
            &mut schedule,
            &fixed_courses,
            &subject_configs,
            &teacher_prefs,
            &venues,
            &exclusions,
        );

        // 验证结果
        assert!(result.is_ok(), "多个固定课程安排应该成功");
        assert_eq!(schedule.entries.len(), 4, "课表应该有4个条目");

        // 验证所有条目都标记为固定课程
        for entry in &schedule.entries {
            assert!(entry.is_fixed, "所有条目都应该标记为固定课程");
        }

        // 验证班级101的课程
        let class_101_entries: Vec<_> = schedule
            .entries
            .iter()
            .filter(|e| e.class_id == 101)
            .collect();
        assert_eq!(class_101_entries.len(), 2, "班级101应该有2节固定课程");

        // 验证班级102的课程
        let class_102_entries: Vec<_> = schedule
            .entries
            .iter()
            .filter(|e| e.class_id == 102)
            .collect();
        assert_eq!(class_102_entries.len(), 2, "班级102应该有2节固定课程");
    }
}

// ============================================================================
// 回溯搜索算法单元测试
// ============================================================================

#[cfg(test)]
mod backtrack_tests {
    use super::*;
    use crate::algorithm::types::*;
    use std::collections::HashMap;

    /// 测试回溯搜索算法 - 空教学计划列表
    #[test]
    fn test_backtrack_search_empty_curriculums() {
        let config = SolverConfig::default();
        let solver = ConstraintSolver::new(config).unwrap();

        let mut schedule = Schedule::new(5, 8);
        let curriculums: Vec<ClassCurriculum> = vec![];
        let subject_configs = HashMap::new();
        let teacher_prefs = HashMap::new();
        let venues = HashMap::new();
        let exclusions = vec![];

        let result = solver.backtrack_search(
            &mut schedule,
            &curriculums,
            &subject_configs,
            &teacher_prefs,
            &venues,
            &exclusions,
            0,
        );

        // 空教学计划应该返回一个空课表解
        assert!(result.is_ok());
        let solutions = result.unwrap();
        assert_eq!(solutions.len(), 1);
        assert_eq!(solutions[0].entries.len(), 0);
    }

    /// 测试回溯搜索算法 - 单个教学计划
    #[test]
    fn test_backtrack_search_single_curriculum() {
        let config = SolverConfig::default();
        let solver = ConstraintSolver::new(config).unwrap();

        let mut schedule = Schedule::new(5, 8);

        // 创建一个简单的教学计划：班级1，数学课，教师1，2节课
        let curriculum = ClassCurriculum::new(1, 1, "MATH".to_string(), 1, 2);
        let curriculums = vec![curriculum];

        // 创建课程配置
        let mut subject_configs = HashMap::new();
        let math_config = SubjectConfig::new("MATH".to_string(), "数学".to_string());
        subject_configs.insert("MATH".to_string(), math_config);

        // 创建教师偏好
        let mut teacher_prefs = HashMap::new();
        let teacher_pref = TeacherPreference::new(1);
        teacher_prefs.insert(1, teacher_pref);

        let venues = HashMap::new();
        let exclusions = vec![];

        let result = solver.backtrack_search(
            &mut schedule,
            &curriculums,
            &subject_configs,
            &teacher_prefs,
            &venues,
            &exclusions,
            0,
        );

        // 应该能找到可行解
        assert!(result.is_ok());
        let solutions = result.unwrap();
        assert!(!solutions.is_empty());

        // 验证第一个解
        let first_solution = &solutions[0];
        assert_eq!(first_solution.entries.len(), 2); // 2节课
    }

    /// 测试回溯搜索算法 - 多个教学计划
    #[test]
    fn test_backtrack_search_multiple_curriculums() {
        let config = SolverConfig::default();
        let solver = ConstraintSolver::new(config).unwrap();

        let mut schedule = Schedule::new(5, 8);

        // 创建两个教学计划
        let curriculum1 = ClassCurriculum::new(1, 1, "MATH".to_string(), 1, 1);
        let curriculum2 = ClassCurriculum::new(2, 2, "CHINESE".to_string(), 2, 1);
        let curriculums = vec![curriculum1, curriculum2];

        // 创建课程配置
        let mut subject_configs = HashMap::new();
        subject_configs.insert(
            "MATH".to_string(),
            SubjectConfig::new("MATH".to_string(), "数学".to_string()),
        );
        subject_configs.insert(
            "CHINESE".to_string(),
            SubjectConfig::new("CHINESE".to_string(), "语文".to_string()),
        );

        // 创建教师偏好
        let mut teacher_prefs = HashMap::new();
        teacher_prefs.insert(1, TeacherPreference::new(1));
        teacher_prefs.insert(2, TeacherPreference::new(2));

        let venues = HashMap::new();
        let exclusions = vec![];

        let result = solver.backtrack_search(
            &mut schedule,
            &curriculums,
            &subject_configs,
            &teacher_prefs,
            &venues,
            &exclusions,
            0,
        );

        // 应该能找到可行解
        assert!(result.is_ok());
        let solutions = result.unwrap();
        assert!(!solutions.is_empty());

        // 验证第一个解
        let first_solution = &solutions[0];
        assert_eq!(first_solution.entries.len(), 2); // 2节课
    }

    /// 测试回溯搜索算法 - 教师时间冲突
    #[test]
    fn test_backtrack_search_teacher_conflict() {
        let config = SolverConfig {
            cycle_days: 1,
            periods_per_day: 1,
            max_iterations: 10000,
            timeout_seconds: 30,
            enable_cost_cache: true,
        };
        let solver = ConstraintSolver::new(config).unwrap();

        let mut schedule = Schedule::new(1, 1);

        // 创建两个教学计划，使用同一个教师
        let curriculum1 = ClassCurriculum::new(1, 1, "MATH".to_string(), 1, 1);
        let curriculum2 = ClassCurriculum::new(2, 2, "CHINESE".to_string(), 1, 1); // 同一个教师
        let curriculums = vec![curriculum1, curriculum2];

        // 创建课程配置
        let mut subject_configs = HashMap::new();
        subject_configs.insert(
            "MATH".to_string(),
            SubjectConfig::new("MATH".to_string(), "数学".to_string()),
        );
        subject_configs.insert(
            "CHINESE".to_string(),
            SubjectConfig::new("CHINESE".to_string(), "语文".to_string()),
        );

        // 创建教师偏好
        let mut teacher_prefs = HashMap::new();
        teacher_prefs.insert(1, TeacherPreference::new(1));

        let venues = HashMap::new();
        let exclusions = vec![];

        let result = solver.backtrack_search(
            &mut schedule,
            &curriculums,
            &subject_configs,
            &teacher_prefs,
            &venues,
            &exclusions,
            0,
        );

        // 只有1天1节课，同一个教师不能同时上两节课，应该无解
        assert!(result.is_ok());
        let solutions = result.unwrap();
        assert!(solutions.is_empty());
    }

    /// 测试获取可用时间槽位 - 正常情况
    #[test]
    fn test_get_available_slots_for_curriculum_normal() {
        let config = SolverConfig::default();
        let solver = ConstraintSolver::new(config).unwrap();

        let schedule = Schedule::new(5, 8);
        let curriculum = ClassCurriculum::new(1, 1, "MATH".to_string(), 1, 2);

        let mut subject_configs = HashMap::new();
        subject_configs.insert(
            "MATH".to_string(),
            SubjectConfig::new("MATH".to_string(), "数学".to_string()),
        );

        let mut teacher_prefs = HashMap::new();
        teacher_prefs.insert(1, TeacherPreference::new(1));

        let venues = HashMap::new();
        let exclusions = vec![];

        let available_slots = solver.get_available_slots_for_curriculum(
            &schedule,
            &curriculum,
            &subject_configs,
            &teacher_prefs,
            &venues,
            &exclusions,
        );

        // 空课表，所有时间槽位都应该可用
        assert_eq!(available_slots.len(), 40); // 5天 × 8节 = 40
    }

    /// 测试获取可用时间槽位 - 有禁止时段
    #[test]
    fn test_get_available_slots_for_curriculum_with_forbidden_slots() {
        let config = SolverConfig::default();
        let solver = ConstraintSolver::new(config.clone()).unwrap();

        let schedule = Schedule::new(5, 8);
        let curriculum = ClassCurriculum::new(1, 1, "PE".to_string(), 1, 2);

        let mut subject_configs = HashMap::new();
        let mut pe_config = SubjectConfig::new("PE".to_string(), "体育".to_string());

        // 禁止前3节
        for period in 0..3 {
            pe_config.set_forbidden_slot(&TimeSlot::new(0, period), config.periods_per_day);
        }
        subject_configs.insert("PE".to_string(), pe_config);

        let mut teacher_prefs = HashMap::new();
        teacher_prefs.insert(1, TeacherPreference::new(1));

        let venues = HashMap::new();
        let exclusions = vec![];

        let available_slots = solver.get_available_slots_for_curriculum(
            &schedule,
            &curriculum,
            &subject_configs,
            &teacher_prefs,
            &venues,
            &exclusions,
        );

        // 第1天的前3节被禁止，应该有 40 - 3 = 37 个可用槽位
        assert_eq!(available_slots.len(), 37);
    }

    /// 测试检查所有硬约束 - 全部通过
    #[test]
    fn test_check_all_hard_constraints_pass() {
        let config = SolverConfig::default();
        let solver = ConstraintSolver::new(config).unwrap();

        let schedule = Schedule::new(5, 8);
        let curriculum = ClassCurriculum::new(1, 1, "MATH".to_string(), 1, 2);
        let slot = TimeSlot::new(0, 0);

        let mut subject_configs = HashMap::new();
        subject_configs.insert(
            "MATH".to_string(),
            SubjectConfig::new("MATH".to_string(), "数学".to_string()),
        );

        let teacher_pref = TeacherPreference::new(1);
        let venues = HashMap::new();
        let exclusions = vec![];

        let subject_config = subject_configs.get("MATH").unwrap();

        let result = solver.check_all_hard_constraints(
            &schedule,
            &curriculum,
            &slot,
            subject_config,
            &teacher_pref,
            &venues,
            &exclusions,
        );

        // 空课表，所有约束都应该通过
        assert!(result);
    }

    /// 测试检查所有硬约束 - 教师冲突
    #[test]
    fn test_check_all_hard_constraints_teacher_conflict() {
        let config = SolverConfig::default();
        let solver = ConstraintSolver::new(config).unwrap();

        let mut schedule = Schedule::new(5, 8);
        let slot = TimeSlot::new(0, 0);

        // 教师1在该时段已有课
        let entry = ScheduleEntry::new(2, "CHINESE".to_string(), 1, slot);
        schedule.add_entry(entry);

        let curriculum = ClassCurriculum::new(1, 1, "MATH".to_string(), 1, 2);

        let mut subject_configs = HashMap::new();
        subject_configs.insert(
            "MATH".to_string(),
            SubjectConfig::new("MATH".to_string(), "数学".to_string()),
        );

        let teacher_pref = TeacherPreference::new(1);
        let venues = HashMap::new();
        let exclusions = vec![];

        let subject_config = subject_configs.get("MATH").unwrap();

        let result = solver.check_all_hard_constraints(
            &schedule,
            &curriculum,
            &slot,
            subject_config,
            &teacher_pref,
            &venues,
            &exclusions,
        );

        // 教师时间冲突，应该返回 false
        assert!(!result);
    }

    /// 测试 is_slot_available - 槽位可用
    #[test]
    fn test_is_slot_available_available() {
        let config = SolverConfig::default();
        let solver = ConstraintSolver::new(config).unwrap();

        let schedule = Schedule::new(5, 8);
        let curriculum = ClassCurriculum::new(1, 1, "MATH".to_string(), 1, 2);
        let slot = TimeSlot::new(0, 0);

        let mut subject_configs = HashMap::new();
        subject_configs.insert(
            "MATH".to_string(),
            SubjectConfig::new("MATH".to_string(), "数学".to_string()),
        );

        let mut teacher_prefs = HashMap::new();
        teacher_prefs.insert(1, TeacherPreference::new(1));

        let venues = HashMap::new();
        let exclusions = vec![];

        let subject_config = subject_configs.get("MATH").unwrap();
        let teacher_pref = teacher_prefs.get(&1).unwrap();

        let is_available = solver.is_slot_available(
            &schedule,
            &curriculum,
            subject_config,
            teacher_pref,
            &slot,
            &venues,
            &exclusions,
        );

        assert!(is_available);
    }

    /// 测试 is_slot_available - 课程禁止时段
    #[test]
    fn test_is_slot_available_forbidden_slot() {
        let config = SolverConfig::default();
        let solver = ConstraintSolver::new(config).unwrap();

        let schedule = Schedule::new(5, 8);
        let curriculum = ClassCurriculum::new(1, 1, "PE".to_string(), 1, 2);
        let slot = TimeSlot::new(0, 0); // 第1天第1节

        let mut subject_configs = HashMap::new();
        let mut pe_config = SubjectConfig::new("PE".to_string(), "体育".to_string());
        // 禁止第1节课（位置0）
        pe_config.forbidden_slots = 1u64 << slot.to_bit_position(8);
        subject_configs.insert("PE".to_string(), pe_config);

        let mut teacher_prefs = HashMap::new();
        teacher_prefs.insert(1, TeacherPreference::new(1));

        let venues = HashMap::new();
        let exclusions = vec![];

        let subject_config = subject_configs.get("PE").unwrap();
        let teacher_pref = teacher_prefs.get(&1).unwrap();

        let is_available = solver.is_slot_available(
            &schedule,
            &curriculum,
            subject_config,
            teacher_pref,
            &slot,
            &venues,
            &exclusions,
        );

        assert!(!is_available);
    }

    /// 测试 is_slot_available - 教师不排课时段
    #[test]
    fn test_is_slot_available_teacher_blocked() {
        let config = SolverConfig::default();
        let solver = ConstraintSolver::new(config).unwrap();

        let schedule = Schedule::new(5, 8);
        let curriculum = ClassCurriculum::new(1, 1, "MATH".to_string(), 1, 2);
        let slot = TimeSlot::new(0, 0);

        let mut subject_configs = HashMap::new();
        subject_configs.insert(
            "MATH".to_string(),
            SubjectConfig::new("MATH".to_string(), "数学".to_string()),
        );

        let mut teacher_prefs = HashMap::new();
        let mut teacher_pref = TeacherPreference::new(1);
        // 教师在第1节不排课
        teacher_pref.blocked_slots = 1u64 << slot.to_bit_position(8);
        teacher_prefs.insert(1, teacher_pref);

        let venues = HashMap::new();
        let exclusions = vec![];

        let subject_config = subject_configs.get("MATH").unwrap();
        let teacher_pref = teacher_prefs.get(&1).unwrap();

        let is_available = solver.is_slot_available(
            &schedule,
            &curriculum,
            subject_config,
            teacher_pref,
            &slot,
            &venues,
            &exclusions,
        );

        assert!(!is_available);
    }

    /// 测试 is_slot_available - 教师时间冲突
    #[test]
    fn test_is_slot_available_teacher_conflict() {
        let config = SolverConfig::default();
        let solver = ConstraintSolver::new(config).unwrap();

        let mut schedule = Schedule::new(5, 8);
        let slot = TimeSlot::new(0, 0);

        // 教师1已经在这个时间槽位有课
        let existing_entry = ScheduleEntry::new(
            2, // 不同的班级
            "CHINESE".to_string(),
            1, // 同一个教师
            slot,
        );
        schedule.add_entry(existing_entry);

        let curriculum = ClassCurriculum::new(1, 1, "MATH".to_string(), 1, 2);

        let mut subject_configs = HashMap::new();
        subject_configs.insert(
            "MATH".to_string(),
            SubjectConfig::new("MATH".to_string(), "数学".to_string()),
        );

        let mut teacher_prefs = HashMap::new();
        teacher_prefs.insert(1, TeacherPreference::new(1));

        let venues = HashMap::new();
        let exclusions = vec![];

        let subject_config = subject_configs.get("MATH").unwrap();
        let teacher_pref = teacher_prefs.get(&1).unwrap();

        let is_available = solver.is_slot_available(
            &schedule,
            &curriculum,
            subject_config,
            teacher_pref,
            &slot,
            &venues,
            &exclusions,
        );

        assert!(!is_available);
    }

    /// 测试 is_slot_available - 班级时间冲突
    #[test]
    fn test_is_slot_available_class_conflict() {
        let config = SolverConfig::default();
        let solver = ConstraintSolver::new(config).unwrap();

        let mut schedule = Schedule::new(5, 8);
        let slot = TimeSlot::new(0, 0);

        // 班级1已经在这个时间槽位有课
        let existing_entry = ScheduleEntry::new(
            1, // 同一个班级
            "CHINESE".to_string(),
            2, // 不同的教师
            slot,
        );
        schedule.add_entry(existing_entry);

        let curriculum = ClassCurriculum::new(1, 1, "MATH".to_string(), 1, 2);

        let mut subject_configs = HashMap::new();
        subject_configs.insert(
            "MATH".to_string(),
            SubjectConfig::new("MATH".to_string(), "数学".to_string()),
        );

        let mut teacher_prefs = HashMap::new();
        teacher_prefs.insert(1, TeacherPreference::new(1));

        let venues = HashMap::new();
        let exclusions = vec![];

        let subject_config = subject_configs.get("MATH").unwrap();
        let teacher_pref = teacher_prefs.get(&1).unwrap();

        let is_available = solver.is_slot_available(
            &schedule,
            &curriculum,
            subject_config,
            teacher_pref,
            &slot,
            &venues,
            &exclusions,
        );

        assert!(!is_available);
    }

    /// 测试优化后的 get_available_slots_for_curriculum - 性能验证
    #[test]
    fn test_get_available_slots_for_curriculum_performance() {
        use std::time::Instant;

        let config = SolverConfig::default();
        let solver = ConstraintSolver::new(config).unwrap();

        let schedule = Schedule::new(5, 8);
        let curriculum = ClassCurriculum::new(1, 1, "MATH".to_string(), 1, 2);

        let mut subject_configs = HashMap::new();
        subject_configs.insert(
            "MATH".to_string(),
            SubjectConfig::new("MATH".to_string(), "数学".to_string()),
        );

        let mut teacher_prefs = HashMap::new();
        teacher_prefs.insert(1, TeacherPreference::new(1));

        let venues = HashMap::new();
        let exclusions = vec![];

        let start = Instant::now();
        let available_slots = solver.get_available_slots_for_curriculum(
            &schedule,
            &curriculum,
            &subject_configs,
            &teacher_prefs,
            &venues,
            &exclusions,
        );
        let elapsed = start.elapsed();

        // 验证返回了可用槽位
        assert!(!available_slots.is_empty());
        assert_eq!(available_slots.len(), 40); // 5天 × 8节 = 40个槽位

        // 验证性能：应该在1毫秒内完成
        assert!(elapsed.as_millis() < 10, "性能测试失败：耗时 {:?}", elapsed);
    }

    /// 测试优化后的 get_available_slots_for_curriculum - 统计信息验证
    #[test]
    fn test_get_available_slots_for_curriculum_with_constraints() {
        let config = SolverConfig::default();
        let solver = ConstraintSolver::new(config).unwrap();

        let mut schedule = Schedule::new(5, 8);

        // 添加一些已有课程
        schedule.add_entry(ScheduleEntry::new(
            1,
            "CHINESE".to_string(),
            2,
            TimeSlot::new(0, 0),
        ));
        schedule.add_entry(ScheduleEntry::new(
            2,
            "ENGLISH".to_string(),
            1,
            TimeSlot::new(0, 1),
        ));

        let curriculum = ClassCurriculum::new(1, 1, "MATH".to_string(), 1, 2);

        let mut subject_configs = HashMap::new();
        let mut math_config = SubjectConfig::new("MATH".to_string(), "数学".to_string());
        // 禁止第1天第3节
        math_config.forbidden_slots = 1u64 << TimeSlot::new(0, 2).to_bit_position(8);
        subject_configs.insert("MATH".to_string(), math_config);

        let mut teacher_prefs = HashMap::new();
        let mut teacher_pref = TeacherPreference::new(1);
        // 教师在第1天第4节不排课
        teacher_pref.blocked_slots = 1u64 << TimeSlot::new(0, 3).to_bit_position(8);
        teacher_prefs.insert(1, teacher_pref);

        let venues = HashMap::new();
        let exclusions = vec![];

        let available_slots = solver.get_available_slots_for_curriculum(
            &schedule,
            &curriculum,
            &subject_configs,
            &teacher_prefs,
            &venues,
            &exclusions,
        );

        // 总共40个槽位
        // - 班级1在(0,0)有课：-1
        // - 教师1在(0,1)有课：-1
        // - 课程禁止(0,2)：-1
        // - 教师不排课(0,3)：-1
        // 剩余：40 - 4 = 36个可用槽位
        assert_eq!(available_slots.len(), 36);
    }

    // ========================================================================
    // 约束图构建测试
    // ========================================================================

    /// 测试构建空约束图
    #[test]
    fn test_build_constraint_graph_empty() {
        let config = SolverConfig::default();
        let solver = ConstraintSolver::new(config).unwrap();

        let curriculums = vec![];
        let subject_configs = vec![];
        let teacher_prefs = vec![];
        let venues = vec![];
        let exclusions = vec![];

        let graph = solver.build_constraint_graph(
            &curriculums,
            &subject_configs,
            &teacher_prefs,
            &venues,
            &exclusions,
        );

        assert!(graph.is_empty());
        assert_eq!(graph.subject_configs.len(), 0);
        assert_eq!(graph.teacher_prefs.len(), 0);
        assert_eq!(graph.venues.len(), 0);
        assert_eq!(graph.exclusions.len(), 0);
    }

    /// 测试构建包含所有类型配置的约束图
    #[test]
    fn test_build_constraint_graph_with_all_configs() {
        let config = SolverConfig::default();
        let solver = ConstraintSolver::new(config).unwrap();

        // 创建教学计划
        let curriculums = vec![
            ClassCurriculum::new(1, 101, "math".to_string(), 1001, 5),
            ClassCurriculum::new(2, 101, "english".to_string(), 1002, 4),
            ClassCurriculum::new(3, 102, "math".to_string(), 1001, 5),
        ];

        // 创建科目配置
        let subject_configs = vec![
            SubjectConfig::new("math".to_string(), "数学".to_string()),
            SubjectConfig::new("english".to_string(), "英语".to_string()),
            SubjectConfig::new("physics".to_string(), "物理".to_string()),
        ];

        // 创建教师偏好
        let teacher_prefs = vec![
            TeacherPreference::new(1001),
            TeacherPreference::new(1002),
            TeacherPreference::new(1003),
        ];

        // 创建场地配置
        let venues = vec![
            Venue::new("gym".to_string(), "体育馆".to_string(), 4),
            Venue::new("lab".to_string(), "实验室".to_string(), 2),
        ];

        // 创建教师互斥关系
        let exclusions = vec![
            TeacherMutualExclusion::new_all_time(1001, 1002),
            TeacherMutualExclusion::new_all_time(1002, 1003),
        ];

        let graph = solver.build_constraint_graph(
            &curriculums,
            &subject_configs,
            &teacher_prefs,
            &venues,
            &exclusions,
        );

        // 验证约束图内容
        assert!(!graph.is_empty());
        assert_eq!(graph.subject_configs.len(), 3);
        assert_eq!(graph.teacher_prefs.len(), 3);
        assert_eq!(graph.venues.len(), 2);
        assert_eq!(graph.exclusions.len(), 2);

        // 验证统计信息
        let (subjects, teachers, venues_count, exclusions_count) = graph.stats();
        assert_eq!(subjects, 3);
        assert_eq!(teachers, 3);
        assert_eq!(venues_count, 2);
        assert_eq!(exclusions_count, 2);
    }

    /// 测试约束图的科目配置查询
    #[test]
    fn test_constraint_graph_get_subject_config() {
        let config = SolverConfig::default();
        let solver = ConstraintSolver::new(config).unwrap();

        let curriculums = vec![];
        let subject_configs = vec![
            SubjectConfig::new("math".to_string(), "数学".to_string()),
            SubjectConfig::new("english".to_string(), "英语".to_string()),
        ];
        let teacher_prefs = vec![];
        let venues = vec![];
        let exclusions = vec![];

        let graph = solver.build_constraint_graph(
            &curriculums,
            &subject_configs,
            &teacher_prefs,
            &venues,
            &exclusions,
        );

        // 查询存在的科目
        let math_config = graph.get_subject_config("math");
        assert!(math_config.is_some());
        assert_eq!(math_config.unwrap().id, "math");
        assert_eq!(math_config.unwrap().name, "数学");

        let english_config = graph.get_subject_config("english");
        assert!(english_config.is_some());
        assert_eq!(english_config.unwrap().id, "english");
        assert_eq!(english_config.unwrap().name, "英语");

        // 查询不存在的科目
        let physics_config = graph.get_subject_config("physics");
        assert!(physics_config.is_none());
    }

    /// 测试约束图的教师偏好查询
    #[test]
    fn test_constraint_graph_get_teacher_preference() {
        let config = SolverConfig::default();
        let solver = ConstraintSolver::new(config).unwrap();

        let curriculums = vec![];
        let subject_configs = vec![];
        let teacher_prefs = vec![
            TeacherPreference::new(1001),
            TeacherPreference::new(1002),
            TeacherPreference::new(1003),
        ];
        let venues = vec![];
        let exclusions = vec![];

        let graph = solver.build_constraint_graph(
            &curriculums,
            &subject_configs,
            &teacher_prefs,
            &venues,
            &exclusions,
        );

        // 查询存在的教师
        let pref1 = graph.get_teacher_preference(1001);
        assert!(pref1.is_some());
        assert_eq!(pref1.unwrap().teacher_id, 1001);

        let pref2 = graph.get_teacher_preference(1002);
        assert!(pref2.is_some());
        assert_eq!(pref2.unwrap().teacher_id, 1002);

        // 查询不存在的教师
        let pref_none = graph.get_teacher_preference(9999);
        assert!(pref_none.is_none());
    }

    /// 测试约束图的场地配置查询
    #[test]
    fn test_constraint_graph_get_venue() {
        let config = SolverConfig::default();
        let solver = ConstraintSolver::new(config).unwrap();

        let curriculums = vec![];
        let subject_configs = vec![];
        let teacher_prefs = vec![];
        let venues = vec![
            Venue::new("gym".to_string(), "体育馆".to_string(), 4),
            Venue::new("lab".to_string(), "实验室".to_string(), 2),
        ];
        let exclusions = vec![];

        let graph = solver.build_constraint_graph(
            &curriculums,
            &subject_configs,
            &teacher_prefs,
            &venues,
            &exclusions,
        );

        // 查询存在的场地
        let gym = graph.get_venue("gym");
        assert!(gym.is_some());
        assert_eq!(gym.unwrap().id, "gym");
        assert_eq!(gym.unwrap().name, "体育馆");
        assert_eq!(gym.unwrap().capacity, 4);

        let lab = graph.get_venue("lab");
        assert!(lab.is_some());
        assert_eq!(lab.unwrap().id, "lab");
        assert_eq!(lab.unwrap().name, "实验室");
        assert_eq!(lab.unwrap().capacity, 2);

        // 查询不存在的场地
        let none = graph.get_venue("nonexistent");
        assert!(none.is_none());
    }

    /// 测试约束图的教师互斥关系查询
    #[test]
    fn test_constraint_graph_get_teacher_exclusions() {
        let config = SolverConfig::default();
        let solver = ConstraintSolver::new(config).unwrap();

        let curriculums = vec![];
        let subject_configs = vec![];
        let teacher_prefs = vec![];
        let venues = vec![];
        let exclusions = vec![
            TeacherMutualExclusion::new_all_time(1001, 1002),
            TeacherMutualExclusion::new_all_time(1001, 1003),
            TeacherMutualExclusion::new_all_time(1002, 1004),
        ];

        let graph = solver.build_constraint_graph(
            &curriculums,
            &subject_configs,
            &teacher_prefs,
            &venues,
            &exclusions,
        );

        // 查询教师1001的互斥关系（与1002和1003互斥）
        let exclusions_1001 = graph.get_teacher_exclusions(1001);
        assert_eq!(exclusions_1001.len(), 2);

        // 查询教师1002的互斥关系（与1001和1004互斥）
        let exclusions_1002 = graph.get_teacher_exclusions(1002);
        assert_eq!(exclusions_1002.len(), 2);

        // 查询教师1003的互斥关系（与1001互斥）
        let exclusions_1003 = graph.get_teacher_exclusions(1003);
        assert_eq!(exclusions_1003.len(), 1);

        // 查询教师1004的互斥关系（与1002互斥）
        let exclusions_1004 = graph.get_teacher_exclusions(1004);
        assert_eq!(exclusions_1004.len(), 1);

        // 查询没有互斥关系的教师
        let exclusions_none = graph.get_teacher_exclusions(9999);
        assert_eq!(exclusions_none.len(), 0);
    }

    /// 测试约束图构建时的合班课程统计
    #[test]
    fn test_build_constraint_graph_with_combined_classes() {
        let config = SolverConfig::default();
        let solver = ConstraintSolver::new(config).unwrap();

        // 创建包含合班课程的教学计划
        let mut curriculum1 = ClassCurriculum::new(1, 101, "pe".to_string(), 1001, 2);
        curriculum1.add_combined_class(102);
        curriculum1.add_combined_class(103);

        let curriculum2 = ClassCurriculum::new(2, 101, "math".to_string(), 1002, 5);

        let curriculums = vec![curriculum1, curriculum2];

        let subject_configs = vec![
            SubjectConfig::new("pe".to_string(), "体育".to_string()),
            SubjectConfig::new("math".to_string(), "数学".to_string()),
        ];

        let teacher_prefs = vec![TeacherPreference::new(1001), TeacherPreference::new(1002)];

        let venues = vec![];
        let exclusions = vec![];

        let graph = solver.build_constraint_graph(
            &curriculums,
            &subject_configs,
            &teacher_prefs,
            &venues,
            &exclusions,
        );

        // 验证约束图构建成功
        assert_eq!(graph.subject_configs.len(), 2);
        assert_eq!(graph.teacher_prefs.len(), 2);
    }

    /// 测试约束图构建时的数据克隆
    #[test]
    fn test_build_constraint_graph_data_cloning() {
        let config = SolverConfig::default();
        let solver = ConstraintSolver::new(config).unwrap();

        let curriculums = vec![];
        let mut subject_configs = vec![SubjectConfig::new("math".to_string(), "数学".to_string())];
        let teacher_prefs = vec![];
        let venues = vec![];
        let exclusions = vec![];

        // 构建约束图
        let graph = solver.build_constraint_graph(
            &curriculums,
            &subject_configs,
            &teacher_prefs,
            &venues,
            &exclusions,
        );

        // 修改原始数据
        subject_configs[0].name = "修改后的数学".to_string();

        // 验证约束图中的数据未被修改（因为是克隆的）
        let math_config = graph.get_subject_config("math");
        assert!(math_config.is_some());
        assert_eq!(math_config.unwrap().name, "数学");
    }
}

// ============================================================================
// 代价函数计算单元测试
// ============================================================================

#[cfg(test)]
mod cost_calculation_tests {
    use super::*;
    use crate::algorithm::types::*;
    use std::collections::HashMap;

    /// 辅助函数：创建空的约束图
    fn create_empty_constraint_graph() -> ConstraintGraph {
        ConstraintGraph::new(HashMap::new(), HashMap::new(), HashMap::new(), vec![])
    }

    /// 辅助函数：创建包含科目配置的约束图
    fn create_constraint_graph_with_subjects(subjects: Vec<SubjectConfig>) -> ConstraintGraph {
        let mut subject_map = HashMap::new();
        for subject in subjects {
            subject_map.insert(subject.id.clone(), subject);
        }
        ConstraintGraph::new(subject_map, HashMap::new(), HashMap::new(), vec![])
    }

    /// 辅助函数：创建包含教师偏好的约束图
    fn create_constraint_graph_with_teachers(teachers: Vec<TeacherPreference>) -> ConstraintGraph {
        let mut teacher_map = HashMap::new();
        for teacher in teachers {
            teacher_map.insert(teacher.teacher_id, teacher);
        }
        ConstraintGraph::new(HashMap::new(), teacher_map, HashMap::new(), vec![])
    }

    /// 辅助函数：创建包含科目和教师的约束图
    fn create_constraint_graph_with_subjects_and_teachers(
        subjects: Vec<SubjectConfig>,
        teachers: Vec<TeacherPreference>,
    ) -> ConstraintGraph {
        let mut subject_map = HashMap::new();
        for subject in subjects {
            subject_map.insert(subject.id.clone(), subject);
        }
        let mut teacher_map = HashMap::new();
        for teacher in teachers {
            teacher_map.insert(teacher.teacher_id, teacher);
        }
        ConstraintGraph::new(subject_map, teacher_map, HashMap::new(), vec![])
    }

    /// 测试空课表的代价计算
    #[test]
    fn test_calculate_cost_empty_schedule() {
        let config = SolverConfig::default();
        let solver = ConstraintSolver::new(config).unwrap();

        let schedule = Schedule::new(5, 8);
        let constraint_graph = create_empty_constraint_graph();

        let cost = solver.calculate_cost(&schedule, &constraint_graph);

        // 空课表代价应该为 0
        assert_eq!(cost, 0);
    }

    /// 测试教师时段偏好违反的代价计算
    #[test]
    fn test_calculate_cost_teacher_preference_violation() {
        let config = SolverConfig::default();
        let solver = ConstraintSolver::new(config).unwrap();

        // 创建课表
        let mut schedule = Schedule::new(5, 8);
        let time_slot = TimeSlot::new(0, 0); // 星期一第1节
        let entry = ScheduleEntry::new(101, "math".to_string(), 1001, time_slot);
        schedule.add_entry(entry);

        // 创建教师偏好：偏好星期一第2节（不包含第1节）
        let mut teacher_pref = TeacherPreference::new(1001);
        teacher_pref.weight = 1;
        let preferred_slot = TimeSlot::new(0, 1); // 星期一第2节
        teacher_pref.set_preferred_slot(&preferred_slot, 8);

        let constraint_graph = create_constraint_graph_with_teachers(vec![teacher_pref]);

        let cost = solver.calculate_cost(&schedule, &constraint_graph);

        // 违反教师偏好：10 × 权重(1) = 10
        assert_eq!(cost, 10);
    }

    /// 测试教师时段偏好满足的代价计算
    #[test]
    fn test_calculate_cost_teacher_preference_satisfied() {
        let config = SolverConfig::default();
        let solver = ConstraintSolver::new(config).unwrap();

        // 创建课表
        let mut schedule = Schedule::new(5, 8);
        let time_slot = TimeSlot::new(0, 1); // 星期一第2节
        let entry = ScheduleEntry::new(101, "math".to_string(), 1001, time_slot);
        schedule.add_entry(entry);

        // 创建教师偏好：偏好星期一第2节
        let mut teacher_pref = TeacherPreference::new(1001);
        teacher_pref.weight = 1;
        teacher_pref.set_preferred_slot(&time_slot, 8);

        let constraint_graph = create_constraint_graph_with_teachers(vec![teacher_pref]);

        let cost = solver.calculate_cost(&schedule, &constraint_graph);

        // 满足教师偏好，代价为 0
        assert_eq!(cost, 0);
    }

    /// 测试教师权重系数对代价的影响
    #[test]
    fn test_calculate_cost_teacher_weight() {
        let config = SolverConfig::default();
        let solver = ConstraintSolver::new(config).unwrap();

        // 创建课表
        let mut schedule = Schedule::new(5, 8);
        let time_slot = TimeSlot::new(0, 0);
        let entry = ScheduleEntry::new(101, "math".to_string(), 1001, time_slot);
        schedule.add_entry(entry);

        // 创建教师偏好：权重为 3
        let mut teacher_pref = TeacherPreference::new(1001);
        teacher_pref.weight = 3;
        let preferred_slot = TimeSlot::new(0, 1);
        teacher_pref.set_preferred_slot(&preferred_slot, 8);

        let constraint_graph = create_constraint_graph_with_teachers(vec![teacher_pref]);

        let cost = solver.calculate_cost(&schedule, &constraint_graph);

        // 违反教师偏好：10 × 权重(3) = 30
        assert_eq!(cost, 30);
    }

    /// 测试厌恶早课的代价计算
    #[test]
    fn test_calculate_cost_time_bias_early() {
        let config = SolverConfig::default();
        let solver = ConstraintSolver::new(config).unwrap();

        // 创建课表：第1节课
        let mut schedule = Schedule::new(5, 8);
        let time_slot = TimeSlot::new(0, 0); // 第1节
        let entry = ScheduleEntry::new(101, "math".to_string(), 1001, time_slot);
        schedule.add_entry(entry);

        // 创建教师偏好：厌恶早课
        let mut teacher_pref = TeacherPreference::new(1001);
        teacher_pref.time_bias = 1; // 厌恶早课
        teacher_pref.weight = 1;

        let constraint_graph = create_constraint_graph_with_teachers(vec![teacher_pref]);

        let cost = solver.calculate_cost(&schedule, &constraint_graph);

        // 厌恶早课但被安排第1节：50
        assert_eq!(cost, 50);
    }

    /// 测试厌恶晚课的代价计算
    #[test]
    fn test_calculate_cost_time_bias_late() {
        let config = SolverConfig::default();
        let solver = ConstraintSolver::new(config).unwrap();

        // 创建课表：最后一节课
        let mut schedule = Schedule::new(5, 8);
        let time_slot = TimeSlot::new(0, 7); // 第8节（最后一节）
        let entry = ScheduleEntry::new(101, "math".to_string(), 1001, time_slot);
        schedule.add_entry(entry);

        // 创建教师偏好：厌恶晚课
        let mut teacher_pref = TeacherPreference::new(1001);
        teacher_pref.time_bias = 2; // 厌恶晚课
        teacher_pref.weight = 1;

        let constraint_graph = create_constraint_graph_with_teachers(vec![teacher_pref]);

        let cost = solver.calculate_cost(&schedule, &constraint_graph);

        // 厌恶晚课但被安排最后一节：50
        assert_eq!(cost, 50);
    }

    /// 测试无早晚偏好的代价计算
    #[test]
    fn test_calculate_cost_no_time_bias() {
        let config = SolverConfig::default();
        let solver = ConstraintSolver::new(config).unwrap();

        // 创建课表：第1节和最后一节
        let mut schedule = Schedule::new(5, 8);
        schedule.add_entry(ScheduleEntry::new(
            101,
            "math".to_string(),
            1001,
            TimeSlot::new(0, 0),
        ));
        schedule.add_entry(ScheduleEntry::new(
            102,
            "math".to_string(),
            1001,
            TimeSlot::new(0, 7),
        ));

        // 创建教师偏好：无早晚偏好
        let mut teacher_pref = TeacherPreference::new(1001);
        teacher_pref.time_bias = 0; // 无偏好
        teacher_pref.weight = 1;

        let constraint_graph = create_constraint_graph_with_teachers(vec![teacher_pref]);

        let cost = solver.calculate_cost(&schedule, &constraint_graph);

        // 无早晚偏好，代价为 0
        assert_eq!(cost, 0);
    }

    /// 测试主科连续3节的代价计算
    #[test]
    fn test_calculate_cost_consecutive_major_subject() {
        let config = SolverConfig::default();
        let solver = ConstraintSolver::new(config).unwrap();

        // 创建课表：连续3节数学课
        let mut schedule = Schedule::new(5, 8);
        schedule.add_entry(ScheduleEntry::new(
            101,
            "math".to_string(),
            1001,
            TimeSlot::new(0, 0),
        ));
        schedule.add_entry(ScheduleEntry::new(
            101,
            "math".to_string(),
            1001,
            TimeSlot::new(0, 1),
        ));
        schedule.add_entry(ScheduleEntry::new(
            101,
            "math".to_string(),
            1001,
            TimeSlot::new(0, 2),
        ));

        // 创建科目配置：数学是主科
        let mut subject_config = SubjectConfig::new("math".to_string(), "数学".to_string());
        subject_config.is_major_subject = true;

        let constraint_graph = create_constraint_graph_with_subjects(vec![subject_config]);

        let cost = solver.calculate_cost(&schedule, &constraint_graph);

        // 连续3节：30 × (3-2) = 30
        assert_eq!(cost, 30);
    }

    /// 测试主科连续4节的代价计算
    #[test]
    fn test_calculate_cost_consecutive_4_periods() {
        let config = SolverConfig::default();
        let solver = ConstraintSolver::new(config).unwrap();

        // 创建课表：连续4节数学课
        let mut schedule = Schedule::new(5, 8);
        for period in 0..4 {
            schedule.add_entry(ScheduleEntry::new(
                101,
                "math".to_string(),
                1001,
                TimeSlot::new(0, period),
            ));
        }

        // 创建科目配置：数学是主科
        let mut subject_config = SubjectConfig::new("math".to_string(), "数学".to_string());
        subject_config.is_major_subject = true;

        let constraint_graph = create_constraint_graph_with_subjects(vec![subject_config]);

        let cost = solver.calculate_cost(&schedule, &constraint_graph);

        // 连续4节：30 × (4-2) = 60
        assert_eq!(cost, 60);
    }

    /// 测试主科不连续的代价计算
    #[test]
    fn test_calculate_cost_non_consecutive_major_subject() {
        let config = SolverConfig::default();
        let solver = ConstraintSolver::new(config).unwrap();

        // 创建课表：不连续的数学课
        let mut schedule = Schedule::new(5, 8);
        schedule.add_entry(ScheduleEntry::new(
            101,
            "math".to_string(),
            1001,
            TimeSlot::new(0, 0),
        ));
        schedule.add_entry(ScheduleEntry::new(
            101,
            "math".to_string(),
            1001,
            TimeSlot::new(0, 2), // 跳过第2节
        ));
        schedule.add_entry(ScheduleEntry::new(
            101,
            "math".to_string(),
            1001,
            TimeSlot::new(0, 4), // 跳过第4节
        ));

        // 创建科目配置：数学是主科
        let mut subject_config = SubjectConfig::new("math".to_string(), "数学".to_string());
        subject_config.is_major_subject = true;

        let constraint_graph = create_constraint_graph_with_subjects(vec![subject_config]);

        let cost = solver.calculate_cost(&schedule, &constraint_graph);

        // 不连续，代价为 0
        assert_eq!(cost, 0);
    }

    /// 测试非主科连续的代价计算
    #[test]
    fn test_calculate_cost_non_major_subject_consecutive() {
        let config = SolverConfig::default();
        let solver = ConstraintSolver::new(config).unwrap();

        // 创建课表：连续3节体育课
        let mut schedule = Schedule::new(5, 8);
        for period in 0..3 {
            schedule.add_entry(ScheduleEntry::new(
                101,
                "pe".to_string(),
                1001,
                TimeSlot::new(0, period),
            ));
        }

        // 创建科目配置：体育不是主科
        let mut subject_config = SubjectConfig::new("pe".to_string(), "体育".to_string());
        subject_config.is_major_subject = false;

        let constraint_graph = create_constraint_graph_with_subjects(vec![subject_config]);

        let cost = solver.calculate_cost(&schedule, &constraint_graph);

        // 非主科连续不惩罚，代价为 0
        assert_eq!(cost, 0);
    }

    /// 测试进度一致性违反的代价计算
    #[test]
    fn test_calculate_cost_progress_consistency_violation() {
        let config = SolverConfig::default();
        let solver = ConstraintSolver::new(config).unwrap();

        // 创建课表：同一教师教两个班的数学，时间差3天
        let mut schedule = Schedule::new(5, 8);
        schedule.add_entry(ScheduleEntry::new(
            101,
            "math".to_string(),
            1001,
            TimeSlot::new(0, 0), // 星期一
        ));
        schedule.add_entry(ScheduleEntry::new(
            102,
            "math".to_string(),
            1001,
            TimeSlot::new(3, 0), // 星期四
        ));

        let constraint_graph = create_empty_constraint_graph();

        let cost = solver.calculate_cost(&schedule, &constraint_graph);

        // 时间差3天，超过2天：20 × (3-2) = 20
        assert_eq!(cost, 20);
    }

    /// 测试进度一致性满足的代价计算
    #[test]
    fn test_calculate_cost_progress_consistency_satisfied() {
        let config = SolverConfig::default();
        let solver = ConstraintSolver::new(config).unwrap();

        // 创建课表：同一教师教两个班的数学，时间差2天
        let mut schedule = Schedule::new(5, 8);
        schedule.add_entry(ScheduleEntry::new(
            101,
            "math".to_string(),
            1001,
            TimeSlot::new(0, 0), // 星期一
        ));
        schedule.add_entry(ScheduleEntry::new(
            102,
            "math".to_string(),
            1001,
            TimeSlot::new(2, 0), // 星期三
        ));

        let constraint_graph = create_empty_constraint_graph();

        let cost = solver.calculate_cost(&schedule, &constraint_graph);

        // 时间差2天，不超过2天，代价为 0
        assert_eq!(cost, 0);
    }

    /// 测试多个软约束违反的综合代价计算
    #[test]
    fn test_calculate_cost_multiple_violations() {
        let config = SolverConfig::default();
        let solver = ConstraintSolver::new(config).unwrap();

        // 创建课表
        let mut schedule = Schedule::new(5, 8);
        // 教师1001：第1节课（违反厌恶早课）
        schedule.add_entry(ScheduleEntry::new(
            101,
            "math".to_string(),
            1001,
            TimeSlot::new(0, 0),
        ));
        // 教师1001：连续3节数学课
        schedule.add_entry(ScheduleEntry::new(
            102,
            "math".to_string(),
            1001,
            TimeSlot::new(1, 0),
        ));
        schedule.add_entry(ScheduleEntry::new(
            102,
            "math".to_string(),
            1001,
            TimeSlot::new(1, 1),
        ));
        schedule.add_entry(ScheduleEntry::new(
            102,
            "math".to_string(),
            1001,
            TimeSlot::new(1, 2),
        ));

        // 创建教师偏好：厌恶早课
        let mut teacher_pref = TeacherPreference::new(1001);
        teacher_pref.time_bias = 1;
        teacher_pref.weight = 1;

        // 创建科目配置：数学是主科
        let mut subject_config = SubjectConfig::new("math".to_string(), "数学".to_string());
        subject_config.is_major_subject = true;

        let constraint_graph = create_constraint_graph_with_subjects_and_teachers(
            vec![subject_config],
            vec![teacher_pref],
        );

        let cost = solver.calculate_cost(&schedule, &constraint_graph);

        // 厌恶早课：班级101第1节 50 + 班级102第1节 50 + 连续3节：30 = 130
        assert_eq!(cost, 130);
    }

    /// 测试所有软约束都满足的代价计算
    #[test]
    fn test_calculate_cost_all_satisfied() {
        let config = SolverConfig::default();
        let solver = ConstraintSolver::new(config).unwrap();

        // 创建课表：满足所有软约束
        let mut schedule = Schedule::new(5, 8);
        let time_slot = TimeSlot::new(0, 2); // 星期一第3节（不是早课也不是晚课）
        schedule.add_entry(ScheduleEntry::new(101, "math".to_string(), 1001, time_slot));

        // 创建教师偏好：偏好星期一第3节
        let mut teacher_pref = TeacherPreference::new(1001);
        teacher_pref.time_bias = 0; // 无早晚偏好
        teacher_pref.weight = 1;
        teacher_pref.set_preferred_slot(&time_slot, 8);

        // 创建科目配置：数学是主科但不连续
        let mut subject_config = SubjectConfig::new("math".to_string(), "数学".to_string());
        subject_config.is_major_subject = true;

        let constraint_graph = create_constraint_graph_with_subjects_and_teachers(
            vec![subject_config],
            vec![teacher_pref],
        );

        let cost = solver.calculate_cost(&schedule, &constraint_graph);

        // 所有软约束都满足，代价为 0
        assert_eq!(cost, 0);
    }

    /// 测试边界情况：连续2节主科（不惩罚）
    #[test]
    fn test_calculate_cost_consecutive_2_periods_no_penalty() {
        let config = SolverConfig::default();
        let solver = ConstraintSolver::new(config).unwrap();

        // 创建课表：连续2节数学课
        let mut schedule = Schedule::new(5, 8);
        schedule.add_entry(ScheduleEntry::new(
            101,
            "math".to_string(),
            1001,
            TimeSlot::new(0, 0),
        ));
        schedule.add_entry(ScheduleEntry::new(
            101,
            "math".to_string(),
            1001,
            TimeSlot::new(0, 1),
        ));

        // 创建科目配置：数学是主科
        let mut subject_config = SubjectConfig::new("math".to_string(), "数学".to_string());
        subject_config.is_major_subject = true;

        let constraint_graph = create_constraint_graph_with_subjects(vec![subject_config]);

        let cost = solver.calculate_cost(&schedule, &constraint_graph);

        // 连续2节不惩罚，代价为 0
        assert_eq!(cost, 0);
    }

    /// 测试边界情况：时间差正好2天（不惩罚）
    #[test]
    fn test_calculate_cost_progress_2_days_no_penalty() {
        let config = SolverConfig::default();
        let solver = ConstraintSolver::new(config).unwrap();

        // 创建课表：时间差正好2天
        let mut schedule = Schedule::new(5, 8);
        schedule.add_entry(ScheduleEntry::new(
            101,
            "math".to_string(),
            1001,
            TimeSlot::new(0, 0),
        ));
        schedule.add_entry(ScheduleEntry::new(
            102,
            "math".to_string(),
            1001,
            TimeSlot::new(2, 0),
        ));

        let constraint_graph = create_empty_constraint_graph();

        let cost = solver.calculate_cost(&schedule, &constraint_graph);

        // 时间差正好2天，不惩罚，代价为 0
        assert_eq!(cost, 0);
    }

    /// 测试边界情况：教师只教一个班（不检查进度一致性）
    #[test]
    fn test_calculate_cost_single_class_no_progress_check() {
        let config = SolverConfig::default();
        let solver = ConstraintSolver::new(config).unwrap();

        // 创建课表：教师只教一个班
        let mut schedule = Schedule::new(5, 8);
        schedule.add_entry(ScheduleEntry::new(
            101,
            "math".to_string(),
            1001,
            TimeSlot::new(0, 0),
        ));

        let constraint_graph = create_empty_constraint_graph();

        let cost = solver.calculate_cost(&schedule, &constraint_graph);

        // 只教一个班，不检查进度一致性，代价为 0
        assert_eq!(cost, 0);
    }
}

// ============================================================================
// 硬约束检查测试模块
// ============================================================================

#[cfg(test)]
#[path = "solver_hard_constraints_tests.rs"]
mod solver_hard_constraints_tests;

// ============================================================================
// 代价函数计算测试模块
// ============================================================================

#[cfg(test)]
#[path = "solver_cost_tests.rs"]
mod solver_cost_tests;

// ============================================================================
// 场地容量约束测试模块
// ============================================================================

#[cfg(test)]
#[path = "solver_venue_capacity_tests.rs"]
mod solver_venue_capacity_tests;

// ============================================================================
// 教师互斥约束测试模块
// ============================================================================

#[cfg(test)]
#[path = "solver_teacher_exclusion_tests.rs"]
mod solver_teacher_exclusion_tests;

// ============================================================================
// 回溯搜索算法测试模块
// ============================================================================
#[cfg(test)]
#[path = "solver_backtrack_tests.rs"]
mod solver_backtrack_tests;
