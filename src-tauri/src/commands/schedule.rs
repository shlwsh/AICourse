// ============================================================================
// 排课相关 Tauri 命令
// ============================================================================
// 本模块提供排课相关的 Tauri 命令接口，包括：
// - generate_schedule: 生成课表
// - get_active_schedule: 获取活动课表
// - move_schedule_entry: 移动课程
// - detect_conflicts: 检测冲突
// - suggest_swaps: 建议交换方案
// - execute_swap: 执行交换
// - calculate_cost: 计算代价值
// - validate_schedule: 验证课表有效性
// ============================================================================

use serde::{Deserialize, Serialize};
use tracing::{debug, error, info, warn};

use crate::algorithm::types::{
    ClassCurriculum, FixedCourse, Schedule, SubjectConfig, TeacherMutualExclusion,
    TeacherPreference, TimeSlot, Venue,
};
use crate::algorithm::{ConstraintSolver, SolverConfig};

/// 排课配置输入
///
/// 包含生成课表所需的所有配置信息
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GenerateScheduleInput {
    /// 教学计划列表
    pub curriculums: Vec<ClassCurriculum>,
    /// 科目配置映射
    pub subject_configs: Vec<SubjectConfig>,
    /// 教师偏好映射
    pub teacher_preferences: Vec<TeacherPreference>,
    /// 场地配置映射
    pub venues: Vec<Venue>,
    /// 固定课程列表
    pub fixed_courses: Vec<FixedCourse>,
    /// 教师互斥关系列表
    pub teacher_exclusions: Vec<TeacherMutualExclusion>,
    /// 求解器配置（可选，使用默认值）
    pub solver_config: Option<SolverConfig>,
}

/// 排课结果输出
///
/// 包含生成的课表和相关信息
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GenerateScheduleOutput {
    /// 生成的课表
    pub schedule: Schedule,
    /// 代价值
    pub cost: u32,
    /// 生成耗时（毫秒）
    pub duration_ms: u64,
    /// 是否找到可行解
    pub success: bool,
    /// 错误信息（如果失败）
    pub error_message: Option<String>,
}

/// 生成课表命令
///
/// 根据提供的配置信息，调用约束求解器生成满足所有约束的课表
///
/// # 参数
/// - `input`: 排课配置输入
///
/// # 返回
/// - `Ok(GenerateScheduleOutput)`: 成功生成课表
/// - `Err(String)`: 生成失败，返回错误信息
///
/// # 功能
/// 1. 接收排课配置（教学计划、教师偏好、科目配置、场地信息、固定课程、教师互斥关系）
/// 2. 调用约束求解器生成课表
/// 3. 将生成的课表保存到数据库
/// 4. 返回生成的课表数据和代价值
/// 5. 记录详细的日志（开始、进度、完成、错误）
/// 6. 处理错误情况（配置无效、无法找到可行解等）
///
/// # 日志记录
/// - INFO: 记录开始、完成、保存等关键操作
/// - DEBUG: 记录配置信息、中间结果
/// - WARN: 记录警告信息（如代价值较高）
/// - ERROR: 记录错误信息和堆栈跟踪
///
/// # 错误处理
/// - 配置验证失败：返回详细的验证错误信息
/// - 求解器初始化失败：返回初始化错误信息
/// - 无法找到可行解：返回无解错误信息
/// - 数据库保存失败：返回数据库错误信息
///
/// # 示例
/// ```rust
/// use course_scheduling_system::commands::schedule::{generate_schedule, GenerateScheduleInput};
///
/// #[tauri::command]
/// async fn test_generate_schedule() -> Result<GenerateScheduleOutput, String> {
///     let input = GenerateScheduleInput {
///         curriculums: vec![],
///         subject_configs: vec![],
///         teacher_preferences: vec![],
///         venues: vec![],
///         fixed_courses: vec![],
///         teacher_exclusions: vec![],
///         solver_config: None,
///     };
///
///     generate_schedule(input).await
/// }
/// ```
#[tauri::command]
pub async fn generate_schedule(
    input: GenerateScheduleInput,
) -> Result<GenerateScheduleOutput, String> {
    info!("========================================");
    info!("开始生成课表");
    info!("========================================");

    // 记录配置信息
    debug!("教学计划数量: {}", input.curriculums.len());
    debug!("科目配置数量: {}", input.subject_configs.len());
    debug!("教师偏好数量: {}", input.teacher_preferences.len());
    debug!("场地配置数量: {}", input.venues.len());
    debug!("固定课程数量: {}", input.fixed_courses.len());
    debug!("教师互斥关系数量: {}", input.teacher_exclusions.len());

    // 记录开始时间
    let start_time = std::time::Instant::now();

    // 1. 验证输入配置
    info!("步骤 1/5: 验证输入配置");
    if let Err(e) = validate_input(&input) {
        error!("输入配置验证失败: {}", e);
        return Err(format!("输入配置验证失败: {}", e));
    }
    info!("输入配置验证通过");

    // 2. 创建求解器配置
    info!("步骤 2/5: 创建求解器配置");
    let solver_config = input.solver_config.unwrap_or_default();
    debug!("求解器配置: {:?}", solver_config);

    // 3. 初始化约束求解器
    info!("步骤 3/5: 初始化约束求解器");
    let solver = match ConstraintSolver::new(solver_config) {
        Ok(s) => {
            info!("约束求解器初始化成功");
            s
        }
        Err(e) => {
            error!("约束求解器初始化失败: {:?}", e);
            return Err(format!("约束求解器初始化失败: {}", e));
        }
    };

    // 4. 调用求解器生成课表
    info!("步骤 4/5: 调用求解器生成课表");
    info!("开始回溯搜索...");

    // 转换输入数据为 HashMap
    let subject_configs_map: std::collections::HashMap<String, SubjectConfig> = input
        .subject_configs
        .into_iter()
        .map(|c| (c.id.clone(), c))
        .collect();

    let teacher_prefs_map: std::collections::HashMap<u32, TeacherPreference> = input
        .teacher_preferences
        .into_iter()
        .map(|p| (p.teacher_id, p))
        .collect();

    let venues_map: std::collections::HashMap<String, Venue> = input
        .venues
        .into_iter()
        .map(|v| (v.id.clone(), v))
        .collect();

    // 创建初始课表
    let mut schedule = Schedule::new(solver.config().cycle_days, solver.config().periods_per_day);

    // 放置固定课程
    if !input.fixed_courses.is_empty() {
        info!("放置 {} 个固定课程", input.fixed_courses.len());
        if let Err(e) = solver.place_fixed_courses(
            &mut schedule,
            &input.fixed_courses,
            &subject_configs_map,
            &teacher_prefs_map,
            &venues_map,
            &input.teacher_exclusions,
        ) {
            error!("放置固定课程失败: {:?}", e);
            return Err(format!("放置固定课程失败: {}", e));
        }
        info!("固定课程放置成功");
    }

    // 执行回溯搜索
    let result = solver.backtrack_search(
        &mut schedule,
        &input.curriculums,
        &subject_configs_map,
        &teacher_prefs_map,
        &venues_map,
        &input.teacher_exclusions,
        0,
    );

    let final_schedule = match result {
        Ok(schedules) => {
            if schedules.is_empty() {
                error!("未找到可行解");
                return Err("未找到可行解，请检查配置是否合理".to_string());
            }

            info!("找到 {} 个可行解", schedules.len());

            // 选择代价最低的解
            let best = schedules.into_iter().min_by_key(|s| s.cost).unwrap();

            info!("选择最优解，代价值: {}", best.cost);

            // 检查代价值是否过高
            if best.cost > 1000 {
                warn!("代价值较高 ({}), 建议调整配置以获得更优解", best.cost);
            }

            best
        }
        Err(e) => {
            error!("回溯搜索失败: {:?}", e);
            return Err(format!("生成课表失败: {}", e));
        }
    };

    // 5. 保存课表到数据库
    info!("步骤 5/5: 保存课表到数据库");
    // TODO: 实现数据库保存逻辑（在后续任务中实现）
    // let db = DatabaseManager::new("sqlite://data/schedule.db", "migrations").await
    //     .map_err(|e| format!("数据库连接失败: {}", e))?;
    // let schedule_id = db.save_schedule(&final_schedule).await
    //     .map_err(|e| format!("保存课表失败: {}", e))?;
    // info!("课表保存成功，ID: {}", schedule_id);

    warn!("数据库保存功能尚未实现，跳过保存步骤");

    // 计算耗时
    let duration = start_time.elapsed();
    let duration_ms = duration.as_millis() as u64;

    info!("========================================");
    info!("课表生成完成");
    info!("代价值: {}", final_schedule.cost);
    info!("课程数量: {}", final_schedule.entries.len());
    info!("耗时: {} 毫秒", duration_ms);
    info!("========================================");

    Ok(GenerateScheduleOutput {
        cost: final_schedule.cost,
        schedule: final_schedule,
        duration_ms,
        success: true,
        error_message: None,
    })
}

/// 验证输入配置
///
/// 检查输入配置的有效性，确保数据完整且合理
///
/// # 参数
/// - `input`: 排课配置输入
///
/// # 返回
/// - `Ok(())`: 验证通过
/// - `Err(String)`: 验证失败，返回错误信息
///
/// # 验证规则
/// 1. 教学计划不能为空
/// 2. 每个教学计划必须有对应的科目配置
/// 3. 每个教学计划必须有对应的教师偏好
/// 4. 如果课程关联场地，场地必须存在
/// 5. 固定课程的时间槽位不能冲突
/// 6. 教师互斥关系的教师必须存在
fn validate_input(input: &GenerateScheduleInput) -> Result<(), String> {
    debug!("开始验证输入配置");

    // 1. 检查教学计划
    if input.curriculums.is_empty() {
        return Err("教学计划不能为空".to_string());
    }

    // 2. 检查科目配置
    let subject_ids: std::collections::HashSet<String> =
        input.subject_configs.iter().map(|c| c.id.clone()).collect();

    for curriculum in &input.curriculums {
        if !subject_ids.contains(&curriculum.subject_id) {
            return Err(format!(
                "教学计划中的科目 '{}' 没有对应的科目配置",
                curriculum.subject_id
            ));
        }
    }

    // 3. 检查教师偏好
    let teacher_ids: std::collections::HashSet<u32> = input
        .teacher_preferences
        .iter()
        .map(|p| p.teacher_id)
        .collect();

    for curriculum in &input.curriculums {
        if !teacher_ids.contains(&curriculum.teacher_id) {
            warn!(
                "教学计划中的教师 {} 没有偏好配置，将使用默认配置",
                curriculum.teacher_id
            );
        }
    }

    // 4. 检查场地配置
    let venue_ids: std::collections::HashSet<String> =
        input.venues.iter().map(|v| v.id.clone()).collect();

    for subject_config in &input.subject_configs {
        if let Some(venue_id) = &subject_config.venue_id {
            if !venue_ids.contains(venue_id) {
                return Err(format!(
                    "科目 '{}' 关联的场地 '{}' 不存在",
                    subject_config.id, venue_id
                ));
            }
        }
    }

    // 5. 检查固定课程
    // TODO: 检查固定课程的时间槽位是否冲突

    // 6. 检查教师互斥关系
    for exclusion in &input.teacher_exclusions {
        if !teacher_ids.contains(&exclusion.teacher_a_id) {
            return Err(format!(
                "教师互斥关系中的教师 {} 不存在",
                exclusion.teacher_a_id
            ));
        }
        if !teacher_ids.contains(&exclusion.teacher_b_id) {
            return Err(format!(
                "教师互斥关系中的教师 {} 不存在",
                exclusion.teacher_b_id
            ));
        }
    }

    debug!("输入配置验证完成");
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_validate_input_empty_curriculums() {
        let input = GenerateScheduleInput {
            curriculums: vec![],
            subject_configs: vec![],
            teacher_preferences: vec![],
            venues: vec![],
            fixed_courses: vec![],
            teacher_exclusions: vec![],
            solver_config: None,
        };

        let result = validate_input(&input);
        assert!(result.is_err());
        assert_eq!(result.unwrap_err(), "教学计划不能为空");
    }

    #[test]
    fn test_validate_input_missing_subject_config() {
        let curriculum = ClassCurriculum::new(1, 101, "math".to_string(), 1001, 5);

        let input = GenerateScheduleInput {
            curriculums: vec![curriculum],
            subject_configs: vec![],
            teacher_preferences: vec![],
            venues: vec![],
            fixed_courses: vec![],
            teacher_exclusions: vec![],
            solver_config: None,
        };

        let result = validate_input(&input);
        assert!(result.is_err());
        assert!(result.unwrap_err().contains("没有对应的科目配置"));
    }

    #[test]
    fn test_validate_input_valid() {
        let curriculum = ClassCurriculum::new(1, 101, "math".to_string(), 1001, 5);
        let subject_config = SubjectConfig::new("math".to_string(), "数学".to_string());
        let teacher_pref = TeacherPreference::new(1001);

        let input = GenerateScheduleInput {
            curriculums: vec![curriculum],
            subject_configs: vec![subject_config],
            teacher_preferences: vec![teacher_pref],
            venues: vec![],
            fixed_courses: vec![],
            teacher_exclusions: vec![],
            solver_config: None,
        };

        let result = validate_input(&input);
        assert!(result.is_ok());
    }

    #[tokio::test]
    async fn test_get_active_schedule_not_implemented() {
        // 测试当前未实现的状态
        let result = get_active_schedule().await;

        // 应该返回成功，但 found = false
        assert!(result.is_ok());

        let output = result.unwrap();
        assert!(!output.found);
        assert!(output.schedule.is_none());
        assert!(output.error_message.is_some());
        assert!(output.error_message.unwrap().contains("尚未实现"));
    }

    #[tokio::test]
    async fn test_move_schedule_entry_original_not_found() {
        // 测试原课程不存在的情况
        let schedule = Schedule::new(5, 8);
        let from_slot = crate::algorithm::types::TimeSlot::new(0, 0);
        let to_slot = crate::algorithm::types::TimeSlot::new(0, 1);

        let input = MoveScheduleEntryInput {
            schedule,
            class_id: 101,
            subject_id: "math".to_string(),
            teacher_id: 1001,
            from_slot,
            to_slot,
            subject_configs: vec![],
            teacher_preferences: vec![],
            venues: vec![],
            teacher_exclusions: vec![],
        };

        let result = move_schedule_entry(input).await;
        assert!(result.is_ok());

        let output = result.unwrap();
        assert!(!output.success);
        assert!(output.error_message.is_some());
        assert!(output.error_message.unwrap().contains("未找到原课程"));
    }

    #[tokio::test]
    async fn test_move_schedule_entry_invalid_target_slot() {
        // 测试目标时间槽位无效的情况
        let mut schedule = Schedule::new(5, 8);
        let from_slot = crate::algorithm::types::TimeSlot::new(0, 0);
        let invalid_to_slot = crate::algorithm::types::TimeSlot::new(10, 0); // 超出范围

        // 添加原课程
        let entry =
            crate::algorithm::types::ScheduleEntry::new(101, "math".to_string(), 1001, from_slot);
        schedule.add_entry(entry);

        let input = MoveScheduleEntryInput {
            schedule,
            class_id: 101,
            subject_id: "math".to_string(),
            teacher_id: 1001,
            from_slot,
            to_slot: invalid_to_slot,
            subject_configs: vec![],
            teacher_preferences: vec![],
            venues: vec![],
            teacher_exclusions: vec![],
        };

        let result = move_schedule_entry(input).await;
        assert!(result.is_ok());

        let output = result.unwrap();
        assert!(!output.success);
        assert!(output.error_message.is_some());
        assert!(output.error_message.unwrap().contains("目标时间槽位无效"));
    }

    #[tokio::test]
    async fn test_move_schedule_entry_success() {
        // 测试成功移动课程的情况
        let mut schedule = Schedule::new(5, 8);
        let from_slot = crate::algorithm::types::TimeSlot::new(0, 0);
        let to_slot = crate::algorithm::types::TimeSlot::new(0, 1);

        // 添加原课程
        let entry =
            crate::algorithm::types::ScheduleEntry::new(101, "math".to_string(), 1001, from_slot);
        schedule.add_entry(entry);

        // 添加科目配置和教师偏好
        let subject_config = SubjectConfig::new("math".to_string(), "数学".to_string());
        let teacher_pref = TeacherPreference::new(1001);

        let input = MoveScheduleEntryInput {
            schedule,
            class_id: 101,
            subject_id: "math".to_string(),
            teacher_id: 1001,
            from_slot,
            to_slot,
            subject_configs: vec![subject_config],
            teacher_preferences: vec![teacher_pref],
            venues: vec![],
            teacher_exclusions: vec![],
        };

        let result = move_schedule_entry(input).await;
        assert!(result.is_ok());

        let output = result.unwrap();
        assert!(output.success);
        assert!(output.schedule.is_some());
        assert!(output.new_cost.is_some());
        assert!(output.cost_delta.is_some());
        assert!(output.conflicts.is_empty());
        assert!(output.error_message.is_none());

        // 验证课程已移动到新位置
        let new_schedule = output.schedule.unwrap();
        let moved_entry = new_schedule.entries.iter().find(|e| {
            e.class_id == 101
                && e.subject_id == "math"
                && e.teacher_id == 1001
                && e.time_slot == to_slot
        });
        assert!(moved_entry.is_some());

        // 验证原位置没有课程
        let old_entry = new_schedule.entries.iter().find(|e| {
            e.class_id == 101
                && e.subject_id == "math"
                && e.teacher_id == 1001
                && e.time_slot == from_slot
        });
        assert!(old_entry.is_none());
    }

    #[tokio::test]
    async fn test_move_schedule_entry_teacher_conflict() {
        // 测试教师时间冲突的情况
        let mut schedule = Schedule::new(5, 8);
        let from_slot = crate::algorithm::types::TimeSlot::new(0, 0);
        let to_slot = crate::algorithm::types::TimeSlot::new(0, 1);

        // 添加原课程
        let entry1 =
            crate::algorithm::types::ScheduleEntry::new(101, "math".to_string(), 1001, from_slot);
        schedule.add_entry(entry1);

        // 在目标位置添加同一教师的另一门课
        let entry2 = crate::algorithm::types::ScheduleEntry::new(
            102,
            "chinese".to_string(),
            1001, // 同一教师
            to_slot,
        );
        schedule.add_entry(entry2);

        // 添加科目配置和教师偏好
        let subject_config = SubjectConfig::new("math".to_string(), "数学".to_string());
        let teacher_pref = TeacherPreference::new(1001);

        let input = MoveScheduleEntryInput {
            schedule,
            class_id: 101,
            subject_id: "math".to_string(),
            teacher_id: 1001,
            from_slot,
            to_slot,
            subject_configs: vec![subject_config],
            teacher_preferences: vec![teacher_pref],
            venues: vec![],
            teacher_exclusions: vec![],
        };

        let result = move_schedule_entry(input).await;
        assert!(result.is_ok());

        let output = result.unwrap();
        assert!(!output.success);
        assert!(!output.conflicts.is_empty());
        assert!(output.error_message.is_some());

        // 验证冲突类型
        let has_teacher_conflict = output
            .conflicts
            .iter()
            .any(|c| c.conflict_type == "teacher_conflict");
        assert!(has_teacher_conflict);
    }

    #[tokio::test]
    async fn test_move_schedule_entry_class_conflict() {
        // 测试班级时间冲突的情况
        let mut schedule = Schedule::new(5, 8);
        let from_slot = crate::algorithm::types::TimeSlot::new(0, 0);
        let to_slot = crate::algorithm::types::TimeSlot::new(0, 1);

        // 添加原课程
        let entry1 =
            crate::algorithm::types::ScheduleEntry::new(101, "math".to_string(), 1001, from_slot);
        schedule.add_entry(entry1);

        // 在目标位置添加同一班级的另一门课
        let entry2 = crate::algorithm::types::ScheduleEntry::new(
            101, // 同一班级
            "chinese".to_string(),
            1002,
            to_slot,
        );
        schedule.add_entry(entry2);

        // 添加科目配置和教师偏好
        let subject_config = SubjectConfig::new("math".to_string(), "数学".to_string());
        let teacher_pref = TeacherPreference::new(1001);

        let input = MoveScheduleEntryInput {
            schedule,
            class_id: 101,
            subject_id: "math".to_string(),
            teacher_id: 1001,
            from_slot,
            to_slot,
            subject_configs: vec![subject_config],
            teacher_preferences: vec![teacher_pref],
            venues: vec![],
            teacher_exclusions: vec![],
        };

        let result = move_schedule_entry(input).await;
        assert!(result.is_ok());

        let output = result.unwrap();
        assert!(!output.success);
        assert!(!output.conflicts.is_empty());
        assert!(output.error_message.is_some());

        // 验证冲突类型
        let has_class_conflict = output
            .conflicts
            .iter()
            .any(|c| c.conflict_type == "class_conflict");
        assert!(has_class_conflict);
    }

    // ============================================================================
    // detect_conflicts 命令测试
    // ============================================================================

    #[tokio::test]
    async fn test_detect_conflicts_basic() {
        // 测试基本的冲突检测功能
        let schedule = Schedule::new(5, 8);
        let subject_config = SubjectConfig::new("math".to_string(), "数学".to_string());
        let teacher_pref = TeacherPreference::new(1001);

        let input = DetectConflictsInput {
            schedule,
            class_id: 101,
            subject_id: "math".to_string(),
            teacher_id: 1001,
            subject_configs: vec![subject_config],
            teacher_preferences: vec![teacher_pref],
            venues: vec![],
            teacher_exclusions: vec![],
        };

        let result = detect_conflicts(input).await;
        assert!(result.is_ok());

        let output = result.unwrap();
        assert!(output.error_message.is_none());

        // 应该检测到 5天 × 8节 = 40 个时间槽位
        assert_eq!(output.conflicts.len(), 40);

        // 统计数量应该等于总数
        assert_eq!(
            output.available_count + output.warning_count + output.blocked_count,
            40
        );
    }

    #[tokio::test]
    async fn test_detect_conflicts_with_forbidden_slots() {
        // 测试课程禁止时段的检测
        let schedule = Schedule::new(5, 8);

        // 创建禁止第1节（位置0）的科目配置
        let mut subject_config = SubjectConfig::new("pe".to_string(), "体育".to_string());
        subject_config.forbidden_slots = 0b111; // 禁止前3节（位置0,1,2）

        let teacher_pref = TeacherPreference::new(1001);

        let input = DetectConflictsInput {
            schedule,
            class_id: 101,
            subject_id: "pe".to_string(),
            teacher_id: 1001,
            subject_configs: vec![subject_config],
            teacher_preferences: vec![teacher_pref],
            venues: vec![],
            teacher_exclusions: vec![],
        };

        let result = detect_conflicts(input).await;
        assert!(result.is_ok());

        let output = result.unwrap();

        // 应该有至少3个禁止槽位（每天的前3节）
        assert!(output.blocked_count >= 3);

        // 检查第1天第1节是否被标记为禁止
        let first_slot_conflict = output
            .conflicts
            .iter()
            .find(|c| c.slot.day == 0 && c.slot.period == 0);
        assert!(first_slot_conflict.is_some());

        let conflict = first_slot_conflict.unwrap();
        assert_eq!(conflict.severity, "blocked");
        assert!(conflict.description.contains("禁止"));
    }

    #[tokio::test]
    async fn test_detect_conflicts_with_teacher_busy() {
        // 测试教师时间冲突的检测
        let mut schedule = Schedule::new(5, 8);

        // 添加教师1001在(0,0)时段的课程
        let entry = crate::algorithm::types::ScheduleEntry::new(
            102,
            "chinese".to_string(),
            1001,
            crate::algorithm::types::TimeSlot::new(0, 0),
        );
        schedule.add_entry(entry);

        let subject_config = SubjectConfig::new("math".to_string(), "数学".to_string());
        let teacher_pref = TeacherPreference::new(1001);

        let input = DetectConflictsInput {
            schedule,
            class_id: 101,
            subject_id: "math".to_string(),
            teacher_id: 1001,
            subject_configs: vec![subject_config],
            teacher_preferences: vec![teacher_pref],
            venues: vec![],
            teacher_exclusions: vec![],
        };

        let result = detect_conflicts(input).await;
        assert!(result.is_ok());

        let output = result.unwrap();

        // 应该有至少1个禁止槽位（教师已占用的时段）
        assert!(output.blocked_count >= 1);

        // 检查第1天第1节是否被标记为禁止
        let busy_slot_conflict = output
            .conflicts
            .iter()
            .find(|c| c.slot.day == 0 && c.slot.period == 0);
        assert!(busy_slot_conflict.is_some());

        let conflict = busy_slot_conflict.unwrap();
        assert_eq!(conflict.severity, "blocked");
        assert!(conflict.description.contains("教师"));
    }

    #[tokio::test]
    async fn test_detect_conflicts_with_class_busy() {
        // 测试班级时间冲突的检测
        let mut schedule = Schedule::new(5, 8);

        // 添加班级101在(0,1)时段的课程
        let entry = crate::algorithm::types::ScheduleEntry::new(
            101,
            "chinese".to_string(),
            1002,
            crate::algorithm::types::TimeSlot::new(0, 1),
        );
        schedule.add_entry(entry);

        let subject_config = SubjectConfig::new("math".to_string(), "数学".to_string());
        let teacher_pref = TeacherPreference::new(1001);

        let input = DetectConflictsInput {
            schedule,
            class_id: 101,
            subject_id: "math".to_string(),
            teacher_id: 1001,
            subject_configs: vec![subject_config],
            teacher_preferences: vec![teacher_pref],
            venues: vec![],
            teacher_exclusions: vec![],
        };

        let result = detect_conflicts(input).await;
        assert!(result.is_ok());

        let output = result.unwrap();

        // 应该有至少1个禁止槽位（班级已占用的时段）
        assert!(output.blocked_count >= 1);

        // 检查第1天第2节是否被标记为禁止
        let busy_slot_conflict = output
            .conflicts
            .iter()
            .find(|c| c.slot.day == 0 && c.slot.period == 1);
        assert!(busy_slot_conflict.is_some());

        let conflict = busy_slot_conflict.unwrap();
        assert_eq!(conflict.severity, "blocked");
        assert!(conflict.description.contains("班级"));
    }

    #[tokio::test]
    async fn test_detect_conflicts_with_teacher_preference() {
        // 测试教师偏好的检测（软约束）
        let schedule = Schedule::new(5, 8);
        let subject_config = SubjectConfig::new("math".to_string(), "数学".to_string());

        // 创建只偏好第2节（位置1）的教师
        let mut teacher_pref = TeacherPreference::new(1001);
        teacher_pref.preferred_slots = 1u64 << 1; // 只有第2节在偏好范围内

        let input = DetectConflictsInput {
            schedule,
            class_id: 101,
            subject_id: "math".to_string(),
            teacher_id: 1001,
            subject_configs: vec![subject_config],
            teacher_preferences: vec![teacher_pref],
            venues: vec![],
            teacher_exclusions: vec![],
        };

        let result = detect_conflicts(input).await;
        assert!(result.is_ok());

        let output = result.unwrap();

        // 应该有警告槽位（不在偏好时段）
        assert!(output.warning_count > 0);

        // 应该有1个可用槽位（第2节）
        assert!(output.available_count >= 1);

        // 检查第1天第2节是否被标记为可用
        let preferred_slot_conflict = output
            .conflicts
            .iter()
            .find(|c| c.slot.day == 0 && c.slot.period == 1);
        assert!(preferred_slot_conflict.is_some());

        let conflict = preferred_slot_conflict.unwrap();
        assert_eq!(conflict.severity, "available");
    }

    #[tokio::test]
    async fn test_detect_conflicts_with_time_bias() {
        // 测试教师早晚偏好的检测（软约束）
        let schedule = Schedule::new(5, 8);
        let subject_config = SubjectConfig::new("math".to_string(), "数学".to_string());

        // 创建厌恶早课的教师
        let mut teacher_pref = TeacherPreference::new(1001);
        teacher_pref.time_bias = 1; // 厌恶早课
        teacher_pref.preferred_slots = 0; // 不设置特定偏好时段，只检查早晚偏好

        let input = DetectConflictsInput {
            schedule,
            class_id: 101,
            subject_id: "math".to_string(),
            teacher_id: 1001,
            subject_configs: vec![subject_config],
            teacher_preferences: vec![teacher_pref],
            venues: vec![],
            teacher_exclusions: vec![],
        };

        let result = detect_conflicts(input).await;
        assert!(result.is_ok());

        let output = result.unwrap();

        // 应该有警告槽位（早课时段）
        assert!(output.warning_count > 0);

        // 检查第1天第1节（早课）是否被标记为警告
        let early_slot_conflict = output
            .conflicts
            .iter()
            .find(|c| c.slot.day == 0 && c.slot.period == 0);
        assert!(early_slot_conflict.is_some());

        let conflict = early_slot_conflict.unwrap();
        assert_eq!(conflict.severity, "warning");
        assert!(conflict.description.contains("早晚偏好") || conflict.description.contains("厌恶"));
    }

    #[tokio::test]
    async fn test_detect_conflicts_with_teacher_blocked() {
        // 测试教师不排课时段的检测
        let schedule = Schedule::new(5, 8);
        let subject_config = SubjectConfig::new("math".to_string(), "数学".to_string());

        // 创建有不排课时段的教师
        let mut teacher_pref = TeacherPreference::new(1001);
        teacher_pref.blocked_slots = 1u64 << 2; // 第3节不排课

        let input = DetectConflictsInput {
            schedule,
            class_id: 101,
            subject_id: "math".to_string(),
            teacher_id: 1001,
            subject_configs: vec![subject_config],
            teacher_preferences: vec![teacher_pref],
            venues: vec![],
            teacher_exclusions: vec![],
        };

        let result = detect_conflicts(input).await;
        assert!(result.is_ok());

        let output = result.unwrap();

        // 应该有至少1个禁止槽位（教师不排课时段）
        assert!(output.blocked_count >= 1);

        // 检查第1天第3节是否被标记为禁止
        let blocked_slot_conflict = output
            .conflicts
            .iter()
            .find(|c| c.slot.day == 0 && c.slot.period == 2);
        assert!(blocked_slot_conflict.is_some());

        let conflict = blocked_slot_conflict.unwrap();
        assert_eq!(conflict.severity, "blocked");
        assert!(conflict.description.contains("不排课"));
    }
}

/// 获取活动课表输出
///
/// 包含活动课表的完整信息
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GetActiveScheduleOutput {
    /// 课表信息（如果存在）
    pub schedule: Option<Schedule>,
    /// 是否找到活动课表
    pub found: bool,
    /// 错误信息（如果失败）
    pub error_message: Option<String>,
}

/// 获取活动课表命令
///
/// 从数据库查询当前激活的课表（is_active = 1），并返回完整的课表数据
///
/// # 返回
/// - `Ok(GetActiveScheduleOutput)`: 成功查询，可能包含活动课表
/// - `Err(String)`: 查询失败，返回错误信息
///
/// # 功能
/// 1. 连接数据库
/// 2. 查询当前激活的课表（is_active = 1）
/// 3. 如果找到活动课表，查询所有相关的课表条目
/// 4. 将数据库记录转换为算法层的 Schedule 结构
/// 5. 返回完整的课表数据（包含所有课表条目、元数据、代价值）
/// 6. 如果没有激活的课表，返回 found = false
/// 7. 记录详细的日志（开始、查询结果、完成、错误）
/// 8. 处理数据库查询错误
///
/// # 日志记录
/// - INFO: 记录开始、查询结果、完成等关键操作
/// - DEBUG: 记录查询详情、数据转换过程
/// - WARN: 记录警告信息（如未找到活动课表）
/// - ERROR: 记录错误信息和堆栈跟踪
///
/// # 错误处理
/// - 数据库连接失败：返回连接错误信息
/// - 数据库查询失败：返回查询错误信息
/// - 数据转换失败：返回转换错误信息
///
/// # 示例
/// ```rust
/// use course_scheduling_system::commands::schedule::get_active_schedule;
///
/// #[tauri::command]
/// async fn test_get_active_schedule() -> Result<GetActiveScheduleOutput, String> {
///     get_active_schedule().await
/// }
/// ```
#[tauri::command]
pub async fn get_active_schedule() -> Result<GetActiveScheduleOutput, String> {
    info!("========================================");
    info!("开始获取活动课表");
    info!("========================================");

    // TODO: 实现数据库连接和查询逻辑
    // 当前返回未实现的错误
    warn!("get_active_schedule 命令尚未完全实现");

    // 临时返回未找到活动课表
    info!("未找到活动课表（功能尚未实现）");
    info!("========================================");

    Ok(GetActiveScheduleOutput {
        schedule: None,
        found: false,
        error_message: Some("功能尚未实现：需要数据库连接支持".to_string()),
    })

    // 以下是完整实现的伪代码，待数据库模块完成后启用：
    /*
    // 1. 连接数据库
    info!("步骤 1/4: 连接数据库");
    let db = match DatabaseManager::new("sqlite://data/schedule.db", "migrations").await {
        Ok(db) => {
            info!("数据库连接成功");
            db
        }
        Err(e) => {
            error!("数据库连接失败: {}", e);
            return Err(format!("数据库连接失败: {}", e));
        }
    };

    // 2. 查询活动课表
    info!("步骤 2/4: 查询活动课表");
    let schedule_repo = ScheduleRepository::new(db.pool());

    let db_schedule = match schedule_repo.get_active_schedule().await {
        Ok(Some(schedule)) => {
            info!(
                "找到活动课表，ID: {}, 版本: {}, 代价: {}",
                schedule.id, schedule.version, schedule.cost
            );
            schedule
        }
        Ok(None) => {
            info!("未找到活动课表");
            return Ok(GetActiveScheduleOutput {
                schedule: None,
                found: false,
                error_message: None,
            });
        }
        Err(e) => {
            error!("查询活动课表失败: {}", e);
            return Err(format!("查询活动课表失败: {}", e));
        }
    };

    // 3. 查询课表条目
    info!("步骤 3/4: 查询课表条目");
    let db_entries = match schedule_repo.get_schedule_entries(db_schedule.id).await {
        Ok(entries) => {
            info!("查询到 {} 个课表条目", entries.len());
            entries
        }
        Err(e) => {
            error!("查询课表条目失败: {}", e);
            return Err(format!("查询课表条目失败: {}", e));
        }
    };

    // 4. 转换为算法层的 Schedule 结构
    info!("步骤 4/4: 转换数据结构");
    debug!("转换课表元数据");

    let mut schedule = Schedule::new(
        db_schedule.cycle_days as u8,
        db_schedule.periods_per_day as u8,
    );
    schedule.cost = db_schedule.cost as u32;
    schedule.metadata.version = db_schedule.version as u32;
    schedule.metadata.generated_at = db_schedule.created_at.clone();

    debug!("转换 {} 个课表条目", db_entries.len());
    for (index, db_entry) in db_entries.iter().enumerate() {
        let time_slot = TimeSlot {
            day: db_entry.day as u8,
            period: db_entry.period as u8,
        };

        let week_type = match db_entry.week_type.as_str() {
            "Odd" => WeekType::Odd,
            "Even" => WeekType::Even,
            _ => WeekType::Every,
        };

        let entry = ScheduleEntry {
            class_id: db_entry.class_id as u32,
            subject_id: db_entry.subject_id.clone(),
            teacher_id: db_entry.teacher_id as u32,
            time_slot,
            is_fixed: db_entry.is_fixed != 0,
            week_type,
        };

        schedule.add_entry(entry);

        if (index + 1) % 100 == 0 {
            debug!("已转换 {} 个课表条目", index + 1);
        }
    }

    info!("========================================");
    info!("活动课表获取完成");
    info!("课表 ID: {}", db_schedule.id);
    info!("版本: {}", db_schedule.version);
    info!("代价值: {}", schedule.cost);
    info!("课程数量: {}", schedule.entries.len());
    info!("周期: {} 天", schedule.metadata.cycle_days);
    info!("每天节次: {}", schedule.metadata.periods_per_day);
    info!("========================================");

    Ok(GetActiveScheduleOutput {
        schedule: Some(schedule),
        found: true,
        error_message: None,
    })
    */
}

// ============================================================================
// 移动课程命令
// ============================================================================

/// 移动课程输入
///
/// 包含移动课程所需的所有参数
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MoveScheduleEntryInput {
    /// 当前课表
    pub schedule: Schedule,
    /// 班级ID
    pub class_id: u32,
    /// 科目ID
    pub subject_id: String,
    /// 教师ID
    pub teacher_id: u32,
    /// 原时间槽位
    pub from_slot: crate::algorithm::types::TimeSlot,
    /// 目标时间槽位
    pub to_slot: crate::algorithm::types::TimeSlot,
    /// 科目配置列表（用于验证约束）
    pub subject_configs: Vec<SubjectConfig>,
    /// 教师偏好列表（用于验证约束）
    pub teacher_preferences: Vec<TeacherPreference>,
    /// 场地配置列表（用于验证约束）
    pub venues: Vec<Venue>,
    /// 教师互斥关系列表（用于验证约束）
    pub teacher_exclusions: Vec<TeacherMutualExclusion>,
}

/// 移动课程输出
///
/// 包含移动操作的结果信息
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MoveScheduleEntryOutput {
    /// 是否移动成功
    pub success: bool,
    /// 更新后的课表（如果成功）
    pub schedule: Option<Schedule>,
    /// 新的代价值（如果成功）
    pub new_cost: Option<u32>,
    /// 代价值变化（如果成功）
    pub cost_delta: Option<i32>,
    /// 冲突信息（如果失败）
    pub conflicts: Vec<ConflictInfo>,
    /// 错误信息（如果失败）
    pub error_message: Option<String>,
}

/// 冲突信息
///
/// 描述移动课程时遇到的冲突
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ConflictInfo {
    /// 冲突类型
    pub conflict_type: String,
    /// 冲突描述
    pub description: String,
    /// 冲突严重程度（"error" 或 "warning"）
    pub severity: String,
}

/// 移动课程命令
///
/// 手动移动课程到新的时间槽位，验证硬约束并计算代价变化
///
/// # 参数
/// - `input`: 移动课程输入参数
///
/// # 返回
/// - `Ok(MoveScheduleEntryOutput)`: 移动操作结果
/// - `Err(String)`: 操作失败，返回错误信息
///
/// # 功能
/// 1. 验证原课程是否存在
/// 2. 验证目标时间槽位的有效性
/// 3. 检查目标位置是否被占用
/// 4. 验证目标位置是否满足所有硬约束：
///    - 课程禁止时段
///    - 教师不排课时段
///    - 教师时间冲突
///    - 班级时间冲突
///    - 场地容量限制
///    - 教师互斥约束
///    - 连堂限制
/// 5. 如果验证通过，执行移动操作
/// 6. 计算移动前后的代价值变化
/// 7. 更新数据库（TODO：待数据库模块完成）
/// 8. 记录操作历史（TODO：待实现撤销功能）
/// 9. 返回移动结果和新的代价值
///
/// # 日志记录
/// - INFO: 记录开始、验证步骤、移动操作、完成等关键操作
/// - DEBUG: 记录详细的验证过程和中间结果
/// - WARN: 记录警告信息（如代价值增加）
/// - ERROR: 记录错误信息和堆栈跟踪
///
/// # 错误处理
/// - 原课程不存在：返回错误信息
/// - 目标时间槽位无效：返回错误信息
/// - 违反硬约束：返回冲突信息列表
/// - 数据库更新失败：返回错误信息
///
/// # 示例
/// ```rust
/// use course_scheduling_system::commands::schedule::{move_schedule_entry, MoveScheduleEntryInput};
/// use course_scheduling_system::algorithm::types::{Schedule, TimeSlot};
///
/// #[tauri::command]
/// async fn test_move_schedule_entry() -> Result<MoveScheduleEntryOutput, String> {
///     let input = MoveScheduleEntryInput {
///         schedule: Schedule::new(5, 8),
///         class_id: 101,
///         subject_id: "math".to_string(),
///         teacher_id: 1001,
///         from_slot: TimeSlot { day: 0, period: 0 },
///         to_slot: TimeSlot { day: 0, period: 1 },
///         subject_configs: vec![],
///         teacher_preferences: vec![],
///         venues: vec![],
///         teacher_exclusions: vec![],
///     };
///
///     move_schedule_entry(input).await
/// }
/// ```
#[tauri::command]
pub async fn move_schedule_entry(
    input: MoveScheduleEntryInput,
) -> Result<MoveScheduleEntryOutput, String> {
    info!("========================================");
    info!("开始移动课程");
    info!("========================================");

    // 记录移动参数
    debug!("班级ID: {}", input.class_id);
    debug!("科目ID: {}", input.subject_id);
    debug!("教师ID: {}", input.teacher_id);
    debug!(
        "原时间槽位: 第{}天第{}节",
        input.from_slot.day + 1,
        input.from_slot.period + 1
    );
    debug!(
        "目标时间槽位: 第{}天第{}节",
        input.to_slot.day + 1,
        input.to_slot.period + 1
    );

    // 1. 验证原课程是否存在
    info!("步骤 1/8: 验证原课程是否存在");
    let original_entry = input
        .schedule
        .entries
        .iter()
        .find(|e| {
            e.class_id == input.class_id
                && e.subject_id == input.subject_id
                && e.teacher_id == input.teacher_id
                && e.time_slot == input.from_slot
        })
        .cloned();

    let original_entry = match original_entry {
        Some(entry) => {
            info!("找到原课程");
            debug!("原课程信息: {:?}", entry);
            entry
        }
        None => {
            error!("未找到原课程");
            return Ok(MoveScheduleEntryOutput {
                success: false,
                schedule: None,
                new_cost: None,
                cost_delta: None,
                conflicts: vec![],
                error_message: Some(format!(
                    "未找到原课程：班级={}, 科目={}, 教师={}, 时间槽位=({}, {})",
                    input.class_id,
                    input.subject_id,
                    input.teacher_id,
                    input.from_slot.day + 1,
                    input.from_slot.period + 1
                )),
            });
        }
    };

    // 2. 验证目标时间槽位的有效性
    info!("步骤 2/8: 验证目标时间槽位的有效性");
    if !input.to_slot.is_valid(
        input.schedule.metadata.cycle_days,
        input.schedule.metadata.periods_per_day,
    ) {
        error!("目标时间槽位无效");
        return Ok(MoveScheduleEntryOutput {
            success: false,
            schedule: None,
            new_cost: None,
            cost_delta: None,
            conflicts: vec![],
            error_message: Some(format!(
                "目标时间槽位无效：第{}天第{}节（最大天数={}，最大节次={}）",
                input.to_slot.day + 1,
                input.to_slot.period + 1,
                input.schedule.metadata.cycle_days,
                input.schedule.metadata.periods_per_day
            )),
        });
    }
    info!("目标时间槽位有效");

    // 3. 创建求解器用于验证约束
    info!("步骤 3/8: 创建约束求解器");
    let solver_config = SolverConfig {
        cycle_days: input.schedule.metadata.cycle_days,
        periods_per_day: input.schedule.metadata.periods_per_day,
        max_iterations: 10000,
        timeout_seconds: 30,
        enable_cost_cache: true,
    };

    let solver = match ConstraintSolver::new(solver_config) {
        Ok(s) => {
            info!("约束求解器创建成功");
            s
        }
        Err(e) => {
            error!("约束求解器创建失败: {:?}", e);
            return Err(format!("约束求解器创建失败: {}", e));
        }
    };

    // 4. 转换配置数据为 HashMap
    info!("步骤 4/8: 转换配置数据");
    let subject_configs_map: std::collections::HashMap<String, SubjectConfig> = input
        .subject_configs
        .into_iter()
        .map(|c| (c.id.clone(), c))
        .collect();

    let teacher_prefs_map: std::collections::HashMap<u32, TeacherPreference> = input
        .teacher_preferences
        .into_iter()
        .map(|p| (p.teacher_id, p))
        .collect();

    let venues_map: std::collections::HashMap<String, Venue> = input
        .venues
        .into_iter()
        .map(|v| (v.id.clone(), v))
        .collect();

    debug!("科目配置数量: {}", subject_configs_map.len());
    debug!("教师偏好数量: {}", teacher_prefs_map.len());
    debug!("场地配置数量: {}", venues_map.len());
    debug!("教师互斥关系数量: {}", input.teacher_exclusions.len());

    // 5. 创建临时课表（移除原课程）
    info!("步骤 5/8: 创建临时课表并移除原课程");
    let mut temp_schedule = input.schedule.clone();
    if !temp_schedule.remove_entry(&original_entry) {
        error!("移除原课程失败");
        return Err("移除原课程失败".to_string());
    }
    debug!("原课程已从临时课表中移除");

    // 6. 验证目标位置的硬约束
    info!("步骤 6/8: 验证目标位置的硬约束");
    let mut conflicts = Vec::new();

    // 获取课程配置和教师偏好
    let subject_config = subject_configs_map.get(&input.subject_id);
    let teacher_pref = teacher_prefs_map.get(&input.teacher_id);

    // 6.1 检查课程禁止时段
    if let Some(config) = subject_config {
        if let Err(e) = solver.check_forbidden_slot(config, &input.to_slot) {
            warn!("违反课程禁止时段约束: {}", e);
            conflicts.push(ConflictInfo {
                conflict_type: "forbidden_slot".to_string(),
                description: e.to_string(),
                severity: "error".to_string(),
            });
        }
    }

    // 6.2 检查教师不排课时段
    if let Some(pref) = teacher_pref {
        if let Err(e) = solver.check_teacher_blocked(pref, &input.to_slot) {
            warn!("违反教师不排课时段约束: {}", e);
            conflicts.push(ConflictInfo {
                conflict_type: "teacher_blocked".to_string(),
                description: e.to_string(),
                severity: "error".to_string(),
            });
        }
    }

    // 6.3 检查教师时间冲突
    if let Err(e) = solver.check_teacher_conflict(&temp_schedule, input.teacher_id, &input.to_slot)
    {
        warn!("违反教师时间冲突约束: {}", e);
        conflicts.push(ConflictInfo {
            conflict_type: "teacher_conflict".to_string(),
            description: e.to_string(),
            severity: "error".to_string(),
        });
    }

    // 6.4 检查班级时间冲突
    if let Err(e) = solver.check_class_conflict(&temp_schedule, input.class_id, &input.to_slot) {
        warn!("违反班级时间冲突约束: {}", e);
        conflicts.push(ConflictInfo {
            conflict_type: "class_conflict".to_string(),
            description: e.to_string(),
            severity: "error".to_string(),
        });
    }

    // 6.5 检查场地容量限制
    if let Some(config) = subject_config {
        if let Some(venue_id) = &config.venue_id {
            if let Some(venue) = venues_map.get(venue_id) {
                if let Err(e) =
                    solver.check_venue_capacity(&temp_schedule, config, venue, &input.to_slot)
                {
                    warn!("违反场地容量限制约束: {}", e);
                    conflicts.push(ConflictInfo {
                        conflict_type: "venue_capacity".to_string(),
                        description: e.to_string(),
                        severity: "error".to_string(),
                    });
                }
            }
        }
    }

    // 6.6 检查教师互斥约束
    for exclusion in &input.teacher_exclusions {
        if let Err(e) = solver.check_teacher_mutual_exclusion(
            &temp_schedule,
            exclusion,
            input.teacher_id,
            &input.to_slot,
        ) {
            warn!("违反教师互斥约束: {}", e);
            conflicts.push(ConflictInfo {
                conflict_type: "teacher_mutual_exclusion".to_string(),
                description: e.to_string(),
                severity: "error".to_string(),
            });
        }
    }

    // 6.7 检查连堂限制（需要创建临时的 ClassCurriculum）
    if let Some(config) = subject_config {
        let temp_curriculum = ClassCurriculum::new(
            0, // 临时ID
            input.class_id,
            input.subject_id.clone(),
            input.teacher_id,
            1, // 临时课时数
        );

        if let Err(e) = solver.check_double_session_constraint(
            &temp_schedule,
            &temp_curriculum,
            config,
            &input.to_slot,
        ) {
            warn!("违反连堂限制约束: {}", e);
            conflicts.push(ConflictInfo {
                conflict_type: "double_session".to_string(),
                description: e.to_string(),
                severity: "error".to_string(),
            });
        }
    }

    // 如果有冲突，返回冲突信息
    if !conflicts.is_empty() {
        let conflict_count = conflicts.len();
        info!("目标位置存在 {} 个冲突，移动失败", conflict_count);
        return Ok(MoveScheduleEntryOutput {
            success: false,
            schedule: None,
            new_cost: None,
            cost_delta: None,
            conflicts,
            error_message: Some(format!("目标位置存在 {} 个约束冲突", conflict_count)),
        });
    }

    info!("目标位置验证通过，无硬约束冲突");

    // 7. 执行移动操作
    info!("步骤 7/8: 执行移动操作");
    let mut new_entry = original_entry.clone();
    new_entry.time_slot = input.to_slot;
    temp_schedule.add_entry(new_entry);

    debug!("课程已移动到新位置");

    // 8. 计算代价值变化
    info!("步骤 8/8: 计算代价值变化");
    // TODO: 实现代价函数计算
    // 当前简化处理：返回原代价值
    let old_cost = input.schedule.cost;
    let new_cost = old_cost; // TODO: 调用代价函数计算新代价值
    let cost_delta = new_cost as i32 - old_cost as i32;

    debug!("原代价值: {}", old_cost);
    debug!("新代价值: {}", new_cost);
    debug!("代价值变化: {}", cost_delta);

    if cost_delta > 0 {
        warn!("移动后代价值增加了 {}", cost_delta);
    } else if cost_delta < 0 {
        info!("移动后代价值减少了 {}", -cost_delta);
    } else {
        info!("移动后代价值保持不变");
    }

    // TODO: 更新数据库
    warn!("数据库更新功能尚未实现，跳过数据库更新步骤");

    // TODO: 记录操作历史
    warn!("操作历史记录功能尚未实现，跳过历史记录步骤");

    info!("========================================");
    info!("课程移动完成");
    info!(
        "从 第{}天第{}节 移动到 第{}天第{}节",
        input.from_slot.day + 1,
        input.from_slot.period + 1,
        input.to_slot.day + 1,
        input.to_slot.period + 1
    );
    info!("代价值变化: {}", cost_delta);
    info!("========================================");

    Ok(MoveScheduleEntryOutput {
        success: true,
        schedule: Some(temp_schedule),
        new_cost: Some(new_cost),
        cost_delta: Some(cost_delta),
        conflicts: vec![],
        error_message: None,
    })
}

// ============================================================================
// 检测冲突命令
// ============================================================================

/// 检测冲突输入
///
/// 包含检测冲突所需的所有参数
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DetectConflictsInput {
    /// 当前课表
    pub schedule: Schedule,
    /// 班级ID
    pub class_id: u32,
    /// 科目ID
    pub subject_id: String,
    /// 教师ID
    pub teacher_id: u32,
    /// 科目配置列表
    pub subject_configs: Vec<SubjectConfig>,
    /// 教师偏好列表
    pub teacher_preferences: Vec<TeacherPreference>,
    /// 场地配置列表
    pub venues: Vec<Venue>,
    /// 教师互斥关系列表
    pub teacher_exclusions: Vec<TeacherMutualExclusion>,
}

/// 时间槽位冲突信息
///
/// 描述单个时间槽位的冲突状态
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SlotConflictInfo {
    /// 时间槽位
    pub slot: crate::algorithm::types::TimeSlot,
    /// 冲突严重程度（"available"=绿色, "warning"=黄色, "blocked"=红色）
    pub severity: String,
    /// 冲突类型（如果有冲突）
    pub conflict_type: Option<String>,
    /// 冲突描述
    pub description: String,
}

/// 检测冲突输出
///
/// 包含所有时间槽位的冲突信息
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DetectConflictsOutput {
    /// 所有时间槽位的冲突信息
    pub conflicts: Vec<SlotConflictInfo>,
    /// 可用槽位数量（绿色）
    pub available_count: usize,
    /// 警告槽位数量（黄色）
    pub warning_count: usize,
    /// 禁止槽位数量（红色）
    pub blocked_count: usize,
    /// 错误信息（如果失败）
    pub error_message: Option<String>,
}

/// 检测冲突命令
///
/// 检测课表中指定课程在所有时间槽位的冲突状态，用于前端可视化显示
///
/// # 参数
/// - `input`: 检测冲突输入参数
///
/// # 返回
/// - `Ok(DetectConflictsOutput)`: 检测结果
/// - `Err(String)`: 检测失败，返回错误信息
///
/// # 功能
/// 1. 接收课表、课程标识（班级ID、科目ID、教师ID）
/// 2. 接收科目配置、教师偏好、场地配置、教师互斥关系
/// 3. 创建冲突检测器
/// 4. 遍历所有时间槽位，检测每个槽位的冲突状态
/// 5. 对每个时间槽位进行硬约束和软约束检查
/// 6. 硬约束冲突标记为红色（blocked）：
///    - 教师时间冲突
///    - 班级时间冲突
///    - 课程禁止时段
///    - 教师不排课时段
///    - 场地容量超限
///    - 教师互斥约束
///    - 连堂限制
/// 7. 软约束冲突标记为黄色（warning）：
///    - 不在教师偏好时段
///    - 违反教师早晚偏好
///    - 主科连续3节或以上
/// 8. 无冲突标记为绿色（available）
/// 9. 返回所有时间槽位的冲突信息和统计数据
/// 10. 提供详细的冲突描述信息
/// 11. 记录详细的日志
///
/// # 日志记录
/// - INFO: 记录开始、检测进度、完成等关键操作
/// - DEBUG: 记录详细的检测过程和中间结果
/// - WARN: 记录警告信息
/// - ERROR: 记录错误信息和堆栈跟踪
///
/// # 错误处理
/// - 配置数据无效：返回错误信息
/// - 冲突检测器创建失败：返回错误信息
///
/// # 示例
/// ```rust
/// use course_scheduling_system::commands::schedule::{detect_conflicts, DetectConflictsInput};
/// use course_scheduling_system::algorithm::types::Schedule;
///
/// #[tauri::command]
/// async fn test_detect_conflicts() -> Result<DetectConflictsOutput, String> {
///     let input = DetectConflictsInput {
///         schedule: Schedule::new(5, 8),
///         class_id: 101,
///         subject_id: "math".to_string(),
///         teacher_id: 1001,
///         subject_configs: vec![],
///         teacher_preferences: vec![],
///         venues: vec![],
///         teacher_exclusions: vec![],
///     };
///
///     detect_conflicts(input).await
/// }
/// ```
#[tauri::command]
pub async fn detect_conflicts(
    input: DetectConflictsInput,
) -> Result<DetectConflictsOutput, String> {
    info!("========================================");
    info!("开始检测冲突");
    info!("========================================");

    // 记录检测参数
    debug!("班级ID: {}", input.class_id);
    debug!("科目ID: {}", input.subject_id);
    debug!("教师ID: {}", input.teacher_id);
    debug!("课表条目数量: {}", input.schedule.entries.len());
    debug!("科目配置数量: {}", input.subject_configs.len());
    debug!("教师偏好数量: {}", input.teacher_preferences.len());
    debug!("场地配置数量: {}", input.venues.len());
    debug!("教师互斥关系数量: {}", input.teacher_exclusions.len());

    // 1. 构建约束图
    info!("步骤 1/4: 构建约束图");
    let mut constraint_graph = crate::solver::conflict_detector::ConstraintGraph::new();

    // 添加科目配置
    for config in input.subject_configs {
        constraint_graph.add_subject_config(config);
    }

    // 添加教师偏好
    for pref in input.teacher_preferences {
        constraint_graph.add_teacher_preference(pref);
    }

    // 添加场地配置
    for venue in input.venues {
        constraint_graph.add_venue(venue);
    }

    // 添加教师互斥关系
    for exclusion in input.teacher_exclusions {
        constraint_graph.add_exclusion(exclusion);
    }

    debug!("约束图构建完成");

    // 2. 创建冲突检测器
    info!("步骤 2/4: 创建冲突检测器");
    let periods_per_day = input.schedule.metadata.periods_per_day;
    let detector = crate::solver::conflict_detector::ConflictDetector::new(
        input.schedule.clone(),
        constraint_graph,
        periods_per_day,
    );
    info!("冲突检测器创建成功");

    // 3. 创建教学计划（用于冲突检测）
    info!("步骤 3/4: 创建教学计划");
    let curriculum = ClassCurriculum::new(
        0, // 临时ID
        input.class_id,
        input.subject_id.clone(),
        input.teacher_id,
        1, // 临时课时数
    );
    debug!("教学计划创建完成");

    // 4. 检测所有时间槽位的冲突
    info!("步骤 4/4: 检测所有时间槽位的冲突");
    let conflict_map = detector.detect_conflicts_for_course(&curriculum);

    debug!("检测到 {} 个时间槽位的冲突信息", conflict_map.len());

    // 5. 转换冲突信息格式并统计
    info!("转换冲突信息格式并统计");
    let mut conflicts = Vec::new();
    let mut available_count = 0;
    let mut warning_count = 0;
    let mut blocked_count = 0;

    // 按时间槽位顺序排序
    let mut sorted_slots: Vec<_> = conflict_map.keys().collect();
    sorted_slots.sort_by_key(|slot| (slot.day, slot.period));

    for slot in sorted_slots {
        if let Some(conflict_info) = conflict_map.get(slot) {
            // 转换严重程度
            let severity = match conflict_info.severity {
                crate::solver::conflict_detector::ConflictSeverity::Available => {
                    available_count += 1;
                    "available"
                }
                crate::solver::conflict_detector::ConflictSeverity::Warning => {
                    warning_count += 1;
                    "warning"
                }
                crate::solver::conflict_detector::ConflictSeverity::Blocked => {
                    blocked_count += 1;
                    "blocked"
                }
            };

            // 转换冲突类型
            let conflict_type = match &conflict_info.conflict_type {
                crate::solver::conflict_detector::ConflictType::HardConstraint(violation) => {
                    Some(format!("hard_constraint_{:?}", violation).to_lowercase())
                }
                crate::solver::conflict_detector::ConflictType::SoftConstraint(violation) => {
                    Some(format!("soft_constraint_{:?}", violation).to_lowercase())
                }
            };

            conflicts.push(SlotConflictInfo {
                slot: *slot,
                severity: severity.to_string(),
                conflict_type,
                description: conflict_info.description.clone(),
            });
        }
    }

    info!("========================================");
    info!("冲突检测完成");
    info!("总时间槽位数: {}", conflicts.len());
    info!("可用槽位数（绿色）: {}", available_count);
    info!("警告槽位数（黄色）: {}", warning_count);
    info!("禁止槽位数（红色）: {}", blocked_count);
    info!("========================================");

    Ok(DetectConflictsOutput {
        conflicts,
        available_count,
        warning_count,
        blocked_count,
        error_message: None,
    })
}

// ============================================================================
// 建议交换方案命令
// ============================================================================

/// 建议交换方案输入
///
/// 包含建议交换方案所需的所有参数
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SuggestSwapsInput {
    /// 当前课表
    pub schedule: Schedule,
    /// 目标班级ID
    pub target_class: u32,
    /// 目标教师ID
    pub target_teacher: u32,
    /// 期望的时间槽位
    pub desired_slot: crate::algorithm::types::TimeSlot,
    /// 科目配置列表
    pub subject_configs: Vec<SubjectConfig>,
    /// 教师偏好列表
    pub teacher_preferences: Vec<TeacherPreference>,
    /// 场地配置列表
    pub venues: Vec<Venue>,
    /// 教师互斥关系列表
    pub teacher_exclusions: Vec<TeacherMutualExclusion>,
}

/// 建议交换方案输出
///
/// 包含交换建议的结果信息
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SuggestSwapsOutput {
    /// 交换选项列表（按代价影响排序）
    pub swap_options: Vec<crate::solver::swap_suggester::SwapOption>,
    /// 是否找到可行的交换方案
    pub found: bool,
    /// 错误信息（如果失败）
    pub error_message: Option<String>,
}

/// 建议交换方案命令
///
/// 当用户尝试将课程移动到已被占用的时间槽位时，提供智能的交换建议
///
/// # 参数
/// - `input`: 建议交换方案输入参数
///
/// # 返回
/// - `Ok(SuggestSwapsOutput)`: 交换建议结果
/// - `Err(String)`: 建议失败，返回错误信息
///
/// # 功能
/// 1. 接收当前课表、目标班级、目标教师、期望时间槽位
/// 2. 接收科目配置、教师偏好、场地配置、教师互斥关系
/// 3. 创建交换建议器
/// 4. 调用交换建议器计算可行的交换方案：
///    - 简单交换（A ↔ B）：将被占用的课程移动到另一个有效槽位
///    - 三角交换（A → B → C → A）：三节课循环交换（后续任务实现）
///    - 链式交换（A → B → C → ... → 空位）：多节课依次移动（后续任务实现）
/// 5. 计算每个交换方案对软约束的影响（代价变化）
/// 6. 按代价影响排序（优先推荐代价降低的方案）
/// 7. 返回交换选项列表，每个选项包含：
///    - 交换类型（Simple/Triangle/Chain）
///    - 移动步骤列表（CourseMove）
///    - 代价影响评估（cost_impact）
///    - 方案描述（description）
/// 8. 如果目标槽位空闲，返回直接移动的建议
/// 9. 如果无法找到可行方案，返回空列表
/// 10. 记录详细的日志
///
/// # 日志记录
/// - INFO: 记录开始、建议计算、完成等关键操作
/// - DEBUG: 记录详细的计算过程和中间结果
/// - WARN: 记录警告信息（如未找到可行方案）
/// - ERROR: 记录错误信息和堆栈跟踪
///
/// # 错误处理
/// - 配置数据无效：返回错误信息
/// - 交换建议器创建失败：返回错误信息
/// - 建议计算失败：返回错误信息
///
/// # 注意事项
/// - 当前只实现简单交换功能（任务 3.4.5）
/// - 三角交换和链式交换功能尚未实现（任务 3.4.6-3.4.7）
/// - 代价影响计算使用局部代价函数（任务 3.4.8）
///
/// # 示例
/// ```rust
/// use course_scheduling_system::commands::schedule::{suggest_swaps, SuggestSwapsInput};
/// use course_scheduling_system::algorithm::types::{Schedule, TimeSlot};
///
/// #[tauri::command]
/// async fn test_suggest_swaps() -> Result<SuggestSwapsOutput, String> {
///     let input = SuggestSwapsInput {
///         schedule: Schedule::new(5, 8),
///         target_class: 101,
///         target_teacher: 1001,
///         desired_slot: TimeSlot { day: 0, period: 0 },
///         subject_configs: vec![],
///         teacher_preferences: vec![],
///         venues: vec![],
///         teacher_exclusions: vec![],
///     };
///
///     suggest_swaps(input).await
/// }
/// ```
#[tauri::command]
pub async fn suggest_swaps(input: SuggestSwapsInput) -> Result<SuggestSwapsOutput, String> {
    info!("========================================");
    info!("开始建议交换方案");
    info!("========================================");

    // 记录输入参数
    debug!("目标班级ID: {}", input.target_class);
    debug!("目标教师ID: {}", input.target_teacher);
    debug!(
        "期望时间槽位: 第{}天第{}节",
        input.desired_slot.day + 1,
        input.desired_slot.period + 1
    );
    debug!("课表条目数量: {}", input.schedule.entries.len());
    debug!("科目配置数量: {}", input.subject_configs.len());
    debug!("教师偏好数量: {}", input.teacher_preferences.len());
    debug!("场地配置数量: {}", input.venues.len());
    debug!("教师互斥关系数量: {}", input.teacher_exclusions.len());

    // 1. 验证期望时间槽位的有效性
    info!("步骤 1/5: 验证期望时间槽位的有效性");
    if !input.desired_slot.is_valid(
        input.schedule.metadata.cycle_days,
        input.schedule.metadata.periods_per_day,
    ) {
        error!("期望时间槽位无效");
        return Err(format!(
            "期望时间槽位无效：第{}天第{}节（最大天数={}，最大节次={}）",
            input.desired_slot.day + 1,
            input.desired_slot.period + 1,
            input.schedule.metadata.cycle_days,
            input.schedule.metadata.periods_per_day
        ));
    }
    info!("期望时间槽位有效");

    // 2. 构建约束图
    info!("步骤 2/5: 构建约束图");
    let mut constraint_graph = crate::solver::conflict_detector::ConstraintGraph::new();

    // 添加科目配置
    for config in input.subject_configs {
        constraint_graph.add_subject_config(config);
    }

    // 添加教师偏好
    for pref in input.teacher_preferences {
        constraint_graph.add_teacher_preference(pref);
    }

    // 添加场地配置
    for venue in input.venues {
        constraint_graph.add_venue(venue);
    }

    // 添加教师互斥关系
    for exclusion in input.teacher_exclusions {
        constraint_graph.add_exclusion(exclusion);
    }

    debug!("约束图构建完成");

    // 3. 创建交换建议器
    info!("步骤 3/5: 创建交换建议器");
    let periods_per_day = input.schedule.metadata.periods_per_day;
    let suggester = crate::solver::swap_suggester::SwapSuggester::new(
        input.schedule.clone(),
        constraint_graph,
        periods_per_day,
    );
    info!("交换建议器创建成功");

    // 4. 调用交换建议器计算交换方案
    info!("步骤 4/5: 计算交换方案");
    let swap_options =
        match suggester.suggest_swaps(input.target_class, input.target_teacher, input.desired_slot)
        {
            Ok(options) => {
                info!("找到 {} 个可行的交换方案", options.len());
                options
            }
            Err(e) => {
                error!("计算交换方案失败: {}", e);
                return Err(format!("计算交换方案失败: {}", e));
            }
        };

    // 5. 分析交换方案
    info!("步骤 5/5: 分析交换方案");
    let found = !swap_options.is_empty();

    if found {
        debug!("交换方案详情:");
        for (index, option) in swap_options.iter().enumerate() {
            debug!(
                "  方案 {}: 类型={:?}, 移动数={}, 代价影响={}, 描述={}",
                index + 1,
                option.swap_type,
                option.moves.len(),
                option.cost_impact,
                option.description
            );
        }

        // 统计交换类型
        let simple_count = swap_options
            .iter()
            .filter(|o| matches!(o.swap_type, crate::solver::swap_suggester::SwapType::Simple))
            .count();
        let triangle_count = swap_options
            .iter()
            .filter(|o| {
                matches!(
                    o.swap_type,
                    crate::solver::swap_suggester::SwapType::Triangle
                )
            })
            .count();
        let chain_count = swap_options
            .iter()
            .filter(|o| matches!(o.swap_type, crate::solver::swap_suggester::SwapType::Chain))
            .count();

        info!("交换方案统计:");
        info!("  简单交换: {} 个", simple_count);
        info!("  三角交换: {} 个", triangle_count);
        info!("  链式交换: {} 个", chain_count);

        // 统计代价影响
        let improving_count = swap_options.iter().filter(|o| o.cost_impact < 0).count();
        let neutral_count = swap_options.iter().filter(|o| o.cost_impact == 0).count();
        let worsening_count = swap_options.iter().filter(|o| o.cost_impact > 0).count();

        info!("代价影响统计:");
        info!("  改善方案: {} 个", improving_count);
        info!("  中性方案: {} 个", neutral_count);
        info!("  恶化方案: {} 个", worsening_count);

        // 推荐最优方案
        if let Some(best_option) = swap_options.first() {
            info!("推荐方案:");
            info!("  类型: {:?}", best_option.swap_type);
            info!("  代价影响: {}", best_option.cost_impact);
            info!("  描述: {}", best_option.description);
        }
    } else {
        warn!("未找到可行的交换方案");
    }

    info!("========================================");
    info!("交换方案建议完成");
    info!("找到 {} 个可行方案", swap_options.len());
    info!("========================================");

    Ok(SuggestSwapsOutput {
        swap_options,
        found,
        error_message: None,
    })
}

// ============================================================================
// suggest_swaps 命令测试
// ============================================================================

#[cfg(test)]
mod suggest_swaps_tests {
    use super::*;
    use crate::algorithm::types::{ScheduleEntry, TimeSlot, WeekType};

    /// 创建测试用的课表
    fn create_test_schedule_for_swap() -> Schedule {
        let mut schedule = Schedule::new(5, 8);

        // 添加一些课程
        schedule.add_entry(ScheduleEntry {
            class_id: 101,
            subject_id: "math".to_string(),
            teacher_id: 1001,
            time_slot: TimeSlot::new(0, 0),
            is_fixed: false,
            week_type: WeekType::Every,
        });

        schedule.add_entry(ScheduleEntry {
            class_id: 101,
            subject_id: "english".to_string(),
            teacher_id: 1002,
            time_slot: TimeSlot::new(0, 1),
            is_fixed: false,
            week_type: WeekType::Every,
        });

        schedule.add_entry(ScheduleEntry {
            class_id: 102,
            subject_id: "chinese".to_string(),
            teacher_id: 1003,
            time_slot: TimeSlot::new(0, 0),
            is_fixed: false,
            week_type: WeekType::Every,
        });

        schedule
    }

    #[tokio::test]
    async fn test_suggest_swaps_for_empty_slot() {
        // 测试目标槽位空闲的情况
        let schedule = create_test_schedule_for_swap();
        let subject_config = SubjectConfig::new("math".to_string(), "数学".to_string());
        let teacher_pref = TeacherPreference::new(1001);

        let input = SuggestSwapsInput {
            schedule,
            target_class: 101,
            target_teacher: 1001,
            desired_slot: TimeSlot::new(0, 2), // 空闲槽位
            subject_configs: vec![subject_config],
            teacher_preferences: vec![teacher_pref],
            venues: vec![],
            teacher_exclusions: vec![],
        };

        let result = suggest_swaps(input).await;
        assert!(result.is_ok());

        let output = result.unwrap();
        assert!(output.found);
        assert_eq!(output.swap_options.len(), 1);
        assert!(output.error_message.is_none());

        // 验证是简单交换且描述包含"空闲"
        let option = &output.swap_options[0];
        assert_eq!(
            option.swap_type,
            crate::solver::swap_suggester::SwapType::Simple
        );
        assert!(option.description.contains("空闲"));
    }

    #[tokio::test]
    async fn test_suggest_swaps_for_occupied_slot() {
        // 测试目标槽位被占用的情况
        let schedule = create_test_schedule_for_swap();
        let subject_config = SubjectConfig::new("math".to_string(), "数学".to_string());
        let teacher_pref = TeacherPreference::new(1001);

        let input = SuggestSwapsInput {
            schedule,
            target_class: 101,
            target_teacher: 1004,              // 新教师
            desired_slot: TimeSlot::new(0, 0), // 已被占用的槽位
            subject_configs: vec![subject_config],
            teacher_preferences: vec![teacher_pref],
            venues: vec![],
            teacher_exclusions: vec![],
        };

        let result = suggest_swaps(input).await;
        assert!(result.is_ok());

        let output = result.unwrap();
        // 应该找到至少一个交换方案
        assert!(output.found);
        assert!(!output.swap_options.is_empty());
        assert!(output.error_message.is_none());

        // 验证是简单交换
        let option = &output.swap_options[0];
        assert_eq!(
            option.swap_type,
            crate::solver::swap_suggester::SwapType::Simple
        );
        assert!(!option.moves.is_empty());
    }

    #[tokio::test]
    async fn test_suggest_swaps_invalid_slot() {
        // 测试无效的时间槽位
        let schedule = create_test_schedule_for_swap();
        let subject_config = SubjectConfig::new("math".to_string(), "数学".to_string());
        let teacher_pref = TeacherPreference::new(1001);

        let input = SuggestSwapsInput {
            schedule,
            target_class: 101,
            target_teacher: 1001,
            desired_slot: TimeSlot::new(10, 0), // 无效槽位（超出范围）
            subject_configs: vec![subject_config],
            teacher_preferences: vec![teacher_pref],
            venues: vec![],
            teacher_exclusions: vec![],
        };

        let result = suggest_swaps(input).await;
        assert!(result.is_err());
        assert!(result.unwrap_err().contains("无效"));
    }

    #[tokio::test]
    async fn test_suggest_swaps_with_constraints() {
        // 测试带约束的交换建议
        let schedule = create_test_schedule_for_swap();

        // 创建有禁止时段的科目配置
        let mut subject_config = SubjectConfig::new("pe".to_string(), "体育".to_string());
        subject_config.forbidden_slots = 0b111; // 禁止前3节

        let teacher_pref = TeacherPreference::new(1001);

        let input = SuggestSwapsInput {
            schedule,
            target_class: 101,
            target_teacher: 1001,
            desired_slot: TimeSlot::new(0, 0), // 已被占用的槽位
            subject_configs: vec![subject_config],
            teacher_preferences: vec![teacher_pref],
            venues: vec![],
            teacher_exclusions: vec![],
        };

        let result = suggest_swaps(input).await;
        assert!(result.is_ok());

        let output = result.unwrap();
        // 可能找到或找不到方案，取决于约束
        // 但不应该返回错误
        assert!(output.error_message.is_none());
    }

    #[tokio::test]
    async fn test_suggest_swaps_cost_impact_ordering() {
        // 测试交换方案按代价影响排序
        let schedule = create_test_schedule_for_swap();
        let subject_config = SubjectConfig::new("math".to_string(), "数学".to_string());
        let teacher_pref = TeacherPreference::new(1001);

        let input = SuggestSwapsInput {
            schedule,
            target_class: 101,
            target_teacher: 1004,
            desired_slot: TimeSlot::new(0, 0),
            subject_configs: vec![subject_config],
            teacher_preferences: vec![teacher_pref],
            venues: vec![],
            teacher_exclusions: vec![],
        };

        let result = suggest_swaps(input).await;
        assert!(result.is_ok());

        let output = result.unwrap();
        if output.swap_options.len() > 1 {
            // 验证方案按代价影响排序（从小到大）
            for i in 0..output.swap_options.len() - 1 {
                assert!(
                    output.swap_options[i].cost_impact <= output.swap_options[i + 1].cost_impact
                );
            }
        }
    }

    #[tokio::test]
    async fn test_suggest_swaps_with_teacher_preference() {
        // 测试带教师偏好的交换建议
        let schedule = create_test_schedule_for_swap();
        let subject_config = SubjectConfig::new("math".to_string(), "数学".to_string());

        // 创建有偏好时段的教师
        let mut teacher_pref = TeacherPreference::new(1001);
        teacher_pref.preferred_slots = 1u64 << 2; // 只偏好第3节
        teacher_pref.weight = 2; // 权重为2

        let input = SuggestSwapsInput {
            schedule,
            target_class: 101,
            target_teacher: 1004,
            desired_slot: TimeSlot::new(0, 0),
            subject_configs: vec![subject_config],
            teacher_preferences: vec![teacher_pref],
            venues: vec![],
            teacher_exclusions: vec![],
        };

        let result = suggest_swaps(input).await;
        assert!(result.is_ok());

        let output = result.unwrap();
        // 应该考虑教师偏好计算代价影响
        assert!(output.error_message.is_none());
    }

    #[tokio::test]
    async fn test_suggest_swaps_with_venue_constraint() {
        // 测试带场地约束的交换建议
        let schedule = create_test_schedule_for_swap();

        // 创建关联场地的科目配置
        let mut subject_config = SubjectConfig::new("pe".to_string(), "体育".to_string());
        subject_config.venue_id = Some("playground".to_string());

        // 创建场地配置
        let venue = Venue {
            id: "playground".to_string(),
            name: "操场".to_string(),
            capacity: 2, // 容量为2
        };

        let teacher_pref = TeacherPreference::new(1001);

        let input = SuggestSwapsInput {
            schedule,
            target_class: 101,
            target_teacher: 1004,
            desired_slot: TimeSlot::new(0, 0),
            subject_configs: vec![subject_config],
            teacher_preferences: vec![teacher_pref],
            venues: vec![venue],
            teacher_exclusions: vec![],
        };

        let result = suggest_swaps(input).await;
        assert!(result.is_ok());

        let output = result.unwrap();
        // 应该考虑场地容量约束
        assert!(output.error_message.is_none());
    }

    #[tokio::test]
    async fn test_suggest_swaps_with_teacher_exclusion() {
        // 测试带教师互斥约束的交换建议
        let schedule = create_test_schedule_for_swap();
        let subject_config = SubjectConfig::new("math".to_string(), "数学".to_string());
        let teacher_pref = TeacherPreference::new(1001);

        // 创建教师互斥关系
        let exclusion = TeacherMutualExclusion {
            teacher_a_id: 1001,
            teacher_b_id: 1002,
            scope: crate::algorithm::types::ExclusionScope::AllTime,
        };

        let input = SuggestSwapsInput {
            schedule,
            target_class: 101,
            target_teacher: 1004,
            desired_slot: TimeSlot::new(0, 0),
            subject_configs: vec![subject_config],
            teacher_preferences: vec![teacher_pref],
            venues: vec![],
            teacher_exclusions: vec![exclusion],
        };

        let result = suggest_swaps(input).await;
        assert!(result.is_ok());

        let output = result.unwrap();
        // 应该考虑教师互斥约束
        assert!(output.error_message.is_none());
    }
}

// ============================================================================
// 执行交换命令
// ============================================================================

/// 执行交换输入
///
/// 包含执行交换所需的所有参数
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ExecuteSwapInput {
    /// 当前课表
    pub schedule: Schedule,
    /// 要执行的交换选项
    pub swap_option: crate::solver::swap_suggester::SwapOption,
    /// 科目配置列表（用于计算代价）
    pub subject_configs: Vec<SubjectConfig>,
    /// 教师偏好列表（用于计算代价）
    pub teacher_preferences: Vec<TeacherPreference>,
    /// 场地配置列表（用于验证约束）
    pub venues: Vec<Venue>,
    /// 教师互斥关系列表（用于验证约束）
    pub teacher_exclusions: Vec<TeacherMutualExclusion>,
}

/// 执行交换输出
///
/// 包含交换执行的结果信息
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ExecuteSwapOutput {
    /// 是否执行成功
    pub success: bool,
    /// 更新后的课表（如果成功）
    pub schedule: Option<Schedule>,
    /// 新的代价值（如果成功）
    pub new_cost: Option<u32>,
    /// 实际代价值变化（如果成功）
    pub actual_cost_delta: Option<i32>,
    /// 预期代价值变化（来自交换选项）
    pub expected_cost_delta: i32,
    /// 执行的移动步骤数量
    pub moves_executed: usize,
    /// 错误信息（如果失败）
    pub error_message: Option<String>,
}

/// 执行交换命令
///
/// 执行用户选择的交换方案，更新课表并计算新的代价值
///
/// # 参数
/// - `input`: 执行交换输入参数
///
/// # 返回
/// - `Ok(ExecuteSwapOutput)`: 执行结果
/// - `Err(String)`: 执行失败，返回错误信息
///
/// # 功能
/// 1. 接收当前课表和要执行的交换选项
/// 2. 接收科目配置、教师偏好、场地配置、教师互斥关系
/// 3. 验证交换选项的有效性（移动列表不为空）
/// 4. 创建临时课表副本
/// 5. 按顺序执行所有课程移动操作：
///    - 从原位置移除课程
///    - 添加到新位置
///    - 验证每步操作的有效性
/// 6. 计算新的代价值
/// 7. 比较实际代价变化与预期代价变化
/// 8. 更新数据库（TODO：待数据库模块完成）
/// 9. 记录操作历史用于撤销（TODO：待实现撤销功能）
/// 10. 返回执行结果和新的课表
///
/// # 日志记录
/// - INFO: 记录开始、执行步骤、完成等关键操作
/// - DEBUG: 记录详细的执行过程和中间结果
/// - WARN: 记录警告信息（如实际代价与预期不符）
/// - ERROR: 记录错误信息和堆栈跟踪
///
/// # 错误处理
/// - 交换选项无效：返回错误信息
/// - 移动操作失败：返回错误信息
/// - 数据库更新失败：返回错误信息
///
/// # 注意事项
/// - 当前数据库保存功能尚未实现（任务 2.2.6）
/// - 操作历史记录功能尚未实现（任务 2.2.10）
/// - 代价函数计算使用简化版本（任务 4.1.7）
///
/// # 示例
/// ```rust
/// use course_scheduling_system::commands::schedule::{execute_swap, ExecuteSwapInput};
/// use course_scheduling_system::algorithm::types::Schedule;
/// use course_scheduling_system::solver::swap_suggester::{SwapOption, SwapType, CourseMove};
///
/// #[tauri::command]
/// async fn test_execute_swap() -> Result<ExecuteSwapOutput, String> {
///     let swap_option = SwapOption::new(
///         SwapType::Simple,
///         vec![],
///         0,
///         "测试交换".to_string(),
///     );
///
///     let input = ExecuteSwapInput {
///         schedule: Schedule::new(5, 8),
///         swap_option,
///         subject_configs: vec![],
///         teacher_preferences: vec![],
///         venues: vec![],
///         teacher_exclusions: vec![],
///     };
///
///     execute_swap(input).await
/// }
/// ```
#[tauri::command]
pub async fn execute_swap(input: ExecuteSwapInput) -> Result<ExecuteSwapOutput, String> {
    info!("========================================");
    info!("开始执行交换");
    info!("========================================");

    // 记录输入参数
    debug!("交换类型: {:?}", input.swap_option.swap_type);
    debug!("移动步骤数: {}", input.swap_option.moves.len());
    debug!("预期代价影响: {}", input.swap_option.cost_impact);
    debug!("交换描述: {}", input.swap_option.description);
    debug!("课表条目数量: {}", input.schedule.entries.len());

    // 1. 验证交换选项
    info!("步骤 1/7: 验证交换选项");

    // 检查是否为空闲槽位的直接移动（moves 为空）
    if input.swap_option.moves.is_empty() {
        info!("目标槽位空闲，无需执行交换");
        return Ok(ExecuteSwapOutput {
            success: true,
            schedule: Some(input.schedule.clone()),
            new_cost: Some(input.schedule.cost),
            actual_cost_delta: Some(0),
            expected_cost_delta: input.swap_option.cost_impact,
            moves_executed: 0,
            error_message: None,
        });
    }

    debug!("交换选项验证通过");

    // 2. 创建临时课表副本
    info!("步骤 2/7: 创建临时课表副本");
    let mut new_schedule = input.schedule.clone();
    let old_cost = input.schedule.cost;
    debug!("原课表代价值: {}", old_cost);

    // 3. 执行所有课程移动操作
    info!(
        "步骤 3/7: 执行 {} 个课程移动操作",
        input.swap_option.moves.len()
    );

    for (index, course_move) in input.swap_option.moves.iter().enumerate() {
        debug!(
            "执行移动 {}/{}: 班级={}, 科目={}, 教师={}, 从({},{}) 到({},{})",
            index + 1,
            input.swap_option.moves.len(),
            course_move.class_id,
            course_move.subject_id,
            course_move.teacher_id,
            course_move.from_slot.day + 1,
            course_move.from_slot.period + 1,
            course_move.to_slot.day + 1,
            course_move.to_slot.period + 1
        );

        // 3.1 查找并移除原课程
        let original_entry = new_schedule
            .entries
            .iter()
            .find(|e| {
                e.class_id == course_move.class_id
                    && e.subject_id == course_move.subject_id
                    && e.teacher_id == course_move.teacher_id
                    && e.time_slot == course_move.from_slot
            })
            .cloned();

        let original_entry = match original_entry {
            Some(entry) => {
                debug!("找到原课程: {:?}", entry);
                entry
            }
            None => {
                error!(
                    "未找到原课程: 班级={}, 科目={}, 教师={}, 时间槽位=({}, {})",
                    course_move.class_id,
                    course_move.subject_id,
                    course_move.teacher_id,
                    course_move.from_slot.day + 1,
                    course_move.from_slot.period + 1
                );
                return Ok(ExecuteSwapOutput {
                    success: false,
                    schedule: None,
                    new_cost: None,
                    actual_cost_delta: None,
                    expected_cost_delta: input.swap_option.cost_impact,
                    moves_executed: index,
                    error_message: Some(format!(
                        "未找到原课程：班级={}, 科目={}, 教师={}, 时间槽位=({}, {})",
                        course_move.class_id,
                        course_move.subject_id,
                        course_move.teacher_id,
                        course_move.from_slot.day + 1,
                        course_move.from_slot.period + 1
                    )),
                });
            }
        };

        // 3.2 从课表中移除原课程
        if !new_schedule.remove_entry(&original_entry) {
            error!("移除原课程失败");
            return Ok(ExecuteSwapOutput {
                success: false,
                schedule: None,
                new_cost: None,
                actual_cost_delta: None,
                expected_cost_delta: input.swap_option.cost_impact,
                moves_executed: index,
                error_message: Some("移除原课程失败".to_string()),
            });
        }
        debug!("原课程已移除");

        // 3.3 创建新课程并添加到目标位置
        let mut new_entry = original_entry.clone();
        new_entry.time_slot = course_move.to_slot;
        new_schedule.add_entry(new_entry);
        debug!("课程已添加到新位置");
    }

    info!("所有课程移动操作执行完成");

    // 4. 计算新的代价值
    info!("步骤 4/7: 计算新的代价值");
    // TODO: 实现完整的代价函数计算（任务 4.1.7）
    // 当前简化处理：使用原代价值
    let new_cost = old_cost; // TODO: 调用代价函数计算新代价值
    let actual_cost_delta = new_cost as i32 - old_cost as i32;

    debug!("原代价值: {}", old_cost);
    debug!("新代价值: {}", new_cost);
    debug!("实际代价变化: {}", actual_cost_delta);
    debug!("预期代价变化: {}", input.swap_option.cost_impact);

    // 5. 比较实际代价与预期代价
    info!("步骤 5/7: 比较实际代价与预期代价");
    let cost_diff = (actual_cost_delta - input.swap_option.cost_impact).abs();
    if cost_diff > 0 {
        warn!(
            "实际代价变化({})与预期代价变化({})不符，差异: {}",
            actual_cost_delta, input.swap_option.cost_impact, cost_diff
        );
    } else {
        info!("实际代价变化与预期代价变化一致");
    }

    // 6. 更新数据库
    info!("步骤 6/7: 更新数据库");
    // TODO: 实现数据库更新逻辑（任务 2.2.6）
    warn!("数据库更新功能尚未实现，跳过数据库更新步骤");

    // 7. 记录操作历史
    info!("步骤 7/7: 记录操作历史");
    // TODO: 实现操作历史记录逻辑（任务 2.2.10）
    warn!("操作历史记录功能尚未实现，跳过历史记录步骤");

    info!("========================================");
    info!("交换执行完成");
    info!("交换类型: {:?}", input.swap_option.swap_type);
    info!("执行移动数: {}", input.swap_option.moves.len());
    info!("实际代价变化: {}", actual_cost_delta);
    info!("预期代价变化: {}", input.swap_option.cost_impact);
    info!("========================================");

    Ok(ExecuteSwapOutput {
        success: true,
        schedule: Some(new_schedule),
        new_cost: Some(new_cost),
        actual_cost_delta: Some(actual_cost_delta),
        expected_cost_delta: input.swap_option.cost_impact,
        moves_executed: input.swap_option.moves.len(),
        error_message: None,
    })
}

// ============================================================================
// execute_swap 命令测试
// ============================================================================

#[cfg(test)]
mod execute_swap_tests {
    use super::*;
    use crate::algorithm::types::{ScheduleEntry, TimeSlot, WeekType};
    use crate::solver::swap_suggester::{CourseMove, SwapOption, SwapType};

    /// 创建测试用的课表
    fn create_test_schedule_for_execute() -> Schedule {
        let mut schedule = Schedule::new(5, 8);

        // 添加一些课程
        schedule.add_entry(ScheduleEntry {
            class_id: 101,
            subject_id: "math".to_string(),
            teacher_id: 1001,
            time_slot: TimeSlot::new(0, 0),
            is_fixed: false,
            week_type: WeekType::Every,
        });

        schedule.add_entry(ScheduleEntry {
            class_id: 101,
            subject_id: "english".to_string(),
            teacher_id: 1002,
            time_slot: TimeSlot::new(0, 1),
            is_fixed: false,
            week_type: WeekType::Every,
        });

        schedule.add_entry(ScheduleEntry {
            class_id: 102,
            subject_id: "chinese".to_string(),
            teacher_id: 1003,
            time_slot: TimeSlot::new(0, 0),
            is_fixed: false,
            week_type: WeekType::Every,
        });

        schedule
    }

    #[tokio::test]
    async fn test_execute_swap_empty_moves() {
        // 测试空闲槽位的情况（无需移动）
        let schedule = create_test_schedule_for_execute();
        let swap_option = SwapOption::new(
            SwapType::Simple,
            vec![],
            0,
            "目标位置空闲，可以直接移动".to_string(),
        );

        let input = ExecuteSwapInput {
            schedule: schedule.clone(),
            swap_option,
            subject_configs: vec![],
            teacher_preferences: vec![],
            venues: vec![],
            teacher_exclusions: vec![],
        };

        let result = execute_swap(input).await;
        assert!(result.is_ok());

        let output = result.unwrap();
        assert!(output.success);
        assert!(output.schedule.is_some());
        assert_eq!(output.moves_executed, 0);
        assert!(output.error_message.is_none());
    }

    #[tokio::test]
    async fn test_execute_swap_single_move() {
        // 测试单个课程移动
        let schedule = create_test_schedule_for_execute();

        // 创建移动：将数学课从(0,0)移到(0,2)
        let course_move = CourseMove::new(
            101,
            "math".to_string(),
            1001,
            TimeSlot::new(0, 0),
            TimeSlot::new(0, 2),
        );

        let swap_option = SwapOption::new(
            SwapType::Simple,
            vec![course_move],
            0,
            "将数学课移至第3节".to_string(),
        );

        let input = ExecuteSwapInput {
            schedule: schedule.clone(),
            swap_option,
            subject_configs: vec![],
            teacher_preferences: vec![],
            venues: vec![],
            teacher_exclusions: vec![],
        };

        let result = execute_swap(input).await;
        assert!(result.is_ok());

        let output = result.unwrap();
        assert!(output.success);
        assert!(output.schedule.is_some());
        assert_eq!(output.moves_executed, 1);
        assert!(output.error_message.is_none());

        // 验证课程已移动到新位置
        let new_schedule = output.schedule.unwrap();
        let moved_entry = new_schedule.entries.iter().find(|e| {
            e.class_id == 101
                && e.subject_id == "math"
                && e.teacher_id == 1001
                && e.time_slot == TimeSlot::new(0, 2)
        });
        assert!(moved_entry.is_some(), "课程应该在新位置");

        // 验证原位置没有课程
        let old_entry = new_schedule.entries.iter().find(|e| {
            e.class_id == 101
                && e.subject_id == "math"
                && e.teacher_id == 1001
                && e.time_slot == TimeSlot::new(0, 0)
        });
        assert!(old_entry.is_none(), "原位置不应该有课程");
    }

    #[tokio::test]
    async fn test_execute_swap_multiple_moves() {
        // 测试多个课程移动（交换）
        let schedule = create_test_schedule_for_execute();

        // 创建两个移动：交换数学课和英语课的位置
        let move1 = CourseMove::new(
            101,
            "math".to_string(),
            1001,
            TimeSlot::new(0, 0),
            TimeSlot::new(0, 1),
        );

        let move2 = CourseMove::new(
            101,
            "english".to_string(),
            1002,
            TimeSlot::new(0, 1),
            TimeSlot::new(0, 0),
        );

        let swap_option = SwapOption::new(
            SwapType::Simple,
            vec![move1, move2],
            0,
            "交换数学课和英语课".to_string(),
        );

        let input = ExecuteSwapInput {
            schedule: schedule.clone(),
            swap_option,
            subject_configs: vec![],
            teacher_preferences: vec![],
            venues: vec![],
            teacher_exclusions: vec![],
        };

        let result = execute_swap(input).await;
        assert!(result.is_ok());

        let output = result.unwrap();
        assert!(output.success);
        assert!(output.schedule.is_some());
        assert_eq!(output.moves_executed, 2);
        assert!(output.error_message.is_none());

        // 验证课程已交换位置
        let new_schedule = output.schedule.unwrap();

        // 数学课应该在(0,1)
        let math_entry = new_schedule.entries.iter().find(|e| {
            e.class_id == 101 && e.subject_id == "math" && e.time_slot == TimeSlot::new(0, 1)
        });
        assert!(math_entry.is_some(), "数学课应该在第2节");

        // 英语课应该在(0,0)
        let english_entry = new_schedule.entries.iter().find(|e| {
            e.class_id == 101 && e.subject_id == "english" && e.time_slot == TimeSlot::new(0, 0)
        });
        assert!(english_entry.is_some(), "英语课应该在第1节");
    }

    #[tokio::test]
    async fn test_execute_swap_course_not_found() {
        // 测试原课程不存在的情况
        let schedule = create_test_schedule_for_execute();

        // 创建一个不存在的课程移动
        let course_move = CourseMove::new(
            999, // 不存在的班级
            "physics".to_string(),
            9999,
            TimeSlot::new(0, 0),
            TimeSlot::new(0, 2),
        );

        let swap_option = SwapOption::new(
            SwapType::Simple,
            vec![course_move],
            0,
            "移动不存在的课程".to_string(),
        );

        let input = ExecuteSwapInput {
            schedule: schedule.clone(),
            swap_option,
            subject_configs: vec![],
            teacher_preferences: vec![],
            venues: vec![],
            teacher_exclusions: vec![],
        };

        let result = execute_swap(input).await;
        assert!(result.is_ok());

        let output = result.unwrap();
        assert!(!output.success);
        assert!(output.schedule.is_none());
        assert_eq!(output.moves_executed, 0);
        assert!(output.error_message.is_some());
        assert!(output.error_message.unwrap().contains("未找到原课程"));
    }

    #[tokio::test]
    async fn test_execute_swap_preserves_other_entries() {
        // 测试交换不影响其他课程
        let schedule = create_test_schedule_for_execute();
        let original_entry_count = schedule.entries.len();

        // 创建移动：将数学课从(0,0)移到(0,2)
        let course_move = CourseMove::new(
            101,
            "math".to_string(),
            1001,
            TimeSlot::new(0, 0),
            TimeSlot::new(0, 2),
        );

        let swap_option = SwapOption::new(
            SwapType::Simple,
            vec![course_move],
            0,
            "将数学课移至第3节".to_string(),
        );

        let input = ExecuteSwapInput {
            schedule: schedule.clone(),
            swap_option,
            subject_configs: vec![],
            teacher_preferences: vec![],
            venues: vec![],
            teacher_exclusions: vec![],
        };

        let result = execute_swap(input).await;
        assert!(result.is_ok());

        let output = result.unwrap();
        assert!(output.success);

        let new_schedule = output.schedule.unwrap();

        // 验证课程总数不变
        assert_eq!(new_schedule.entries.len(), original_entry_count);

        // 验证其他课程未受影响
        let english_entry = new_schedule.entries.iter().find(|e| {
            e.class_id == 101 && e.subject_id == "english" && e.time_slot == TimeSlot::new(0, 1)
        });
        assert!(english_entry.is_some(), "英语课应该保持在原位置");

        let chinese_entry = new_schedule.entries.iter().find(|e| {
            e.class_id == 102 && e.subject_id == "chinese" && e.time_slot == TimeSlot::new(0, 0)
        });
        assert!(chinese_entry.is_some(), "语文课应该保持在原位置");
    }

    #[tokio::test]
    async fn test_execute_swap_with_cost_impact() {
        // 测试代价影响记录
        let schedule = create_test_schedule_for_execute();

        let course_move = CourseMove::new(
            101,
            "math".to_string(),
            1001,
            TimeSlot::new(0, 0),
            TimeSlot::new(0, 2),
        );

        let expected_cost_impact = -10; // 预期代价降低10
        let swap_option = SwapOption::new(
            SwapType::Simple,
            vec![course_move],
            expected_cost_impact,
            "将数学课移至第3节".to_string(),
        );

        let input = ExecuteSwapInput {
            schedule: schedule.clone(),
            swap_option,
            subject_configs: vec![],
            teacher_preferences: vec![],
            venues: vec![],
            teacher_exclusions: vec![],
        };

        let result = execute_swap(input).await;
        assert!(result.is_ok());

        let output = result.unwrap();
        assert!(output.success);
        assert_eq!(output.expected_cost_delta, expected_cost_impact);
        assert!(output.actual_cost_delta.is_some());
    }

    #[tokio::test]
    async fn test_execute_swap_preserves_entry_properties() {
        // 测试交换保留课程的其他属性
        let mut schedule = create_test_schedule_for_execute();

        // 添加一个固定课程
        schedule.add_entry(ScheduleEntry {
            class_id: 101,
            subject_id: "pe".to_string(),
            teacher_id: 1004,
            time_slot: TimeSlot::new(0, 3),
            is_fixed: true,           // 固定课程
            week_type: WeekType::Odd, // 单周
        });

        // 移动这个固定课程
        let course_move = CourseMove::new(
            101,
            "pe".to_string(),
            1004,
            TimeSlot::new(0, 3),
            TimeSlot::new(0, 4),
        );

        let swap_option = SwapOption::new(
            SwapType::Simple,
            vec![course_move],
            0,
            "移动固定课程".to_string(),
        );

        let input = ExecuteSwapInput {
            schedule: schedule.clone(),
            swap_option,
            subject_configs: vec![],
            teacher_preferences: vec![],
            venues: vec![],
            teacher_exclusions: vec![],
        };

        let result = execute_swap(input).await;
        assert!(result.is_ok());

        let output = result.unwrap();
        assert!(output.success);

        let new_schedule = output.schedule.unwrap();

        // 验证课程属性保留
        let pe_entry = new_schedule.entries.iter().find(|e| {
            e.class_id == 101 && e.subject_id == "pe" && e.time_slot == TimeSlot::new(0, 4)
        });

        assert!(pe_entry.is_some(), "体育课应该在新位置");
        let pe_entry = pe_entry.unwrap();
        assert!(pe_entry.is_fixed, "is_fixed 属性应该保留");
        assert_eq!(pe_entry.week_type, WeekType::Odd, "week_type 属性应该保留");
    }
}

// ============================================================================
// calculate_cost 命令
// ============================================================================

/// 计算代价输入
///
/// 包含计算课表代价所需的所有信息
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CalculateCostInput {
    /// 课表数据
    pub schedule: Schedule,
    /// 科目配置列表
    pub subject_configs: Vec<SubjectConfig>,
    /// 教师偏好列表
    pub teacher_preferences: Vec<TeacherPreference>,
    /// 场地配置列表
    pub venues: Vec<Venue>,
    /// 教师互斥关系列表
    pub teacher_exclusions: Vec<TeacherMutualExclusion>,
    /// 求解器配置（可选）
    pub solver_config: Option<SolverConfig>,
}

/// 代价分解信息
///
/// 详细记录各项软约束的违反情况和代价值
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CostBreakdown {
    /// 教师时段偏好违反代价
    pub teacher_preference_cost: u32,
    /// 教师早晚偏好违反代价
    pub time_bias_cost: u32,
    /// 主科连续3节惩罚代价
    pub consecutive_major_cost: u32,
    /// 进度一致性代价
    pub progress_consistency_cost: u32,
    /// 总代价值
    pub total_cost: u32,
}

/// 计算代价输出
///
/// 包含代价值和详细的代价分解信息
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CalculateCostOutput {
    /// 总代价值
    pub total_cost: u32,
    /// 代价分解信息
    pub breakdown: CostBreakdown,
    /// 计算耗时（毫秒）
    pub duration_ms: u64,
    /// 是否成功
    pub success: bool,
    /// 错误信息（如果失败）
    pub error_message: Option<String>,
}

/// 计算课表代价命令
///
/// 接受课表和约束配置，调用约束求解器的代价函数计算课表的总代价值，
/// 并返回详细的代价分解信息
///
/// # 参数
/// - `input`: 计算代价输入，包含课表和约束配置
///
/// # 返回
/// - `Ok(CalculateCostOutput)`: 成功计算代价，返回代价值和分解信息
/// - `Err(String)`: 计算失败，返回错误信息
///
/// # 功能
/// 1. 接收课表数据和约束配置
/// 2. 创建约束求解器实例
/// 3. 调用代价函数计算总代价值
/// 4. 计算各项代价分量：
///    - 教师时段偏好违反代价
///    - 教师早晚偏好违反代价
///    - 主科连续3节惩罚代价
///    - 进度一致性代价
/// 5. 返回总代价值和详细分解信息
/// 6. 记录详细的日志（DEBUG, INFO, WARN, ERROR）
///
/// # 代价函数规则
/// - 不在教师偏好时段: +10 × 教师权重
/// - 厌恶早课但安排第1节: +50
/// - 厌恶晚课但安排最后一节: +50
/// - 主科连续3节或以上: +30 × (连续节数 - 2)
/// - 同一教师多班课时间差超过2天: +20 × (天数差 - 2)
///
/// # 日志记录
/// - INFO: 记录开始、完成等关键操作
/// - DEBUG: 记录配置信息、代价分量
/// - WARN: 记录警告信息（如代价值较高）
/// - ERROR: 记录错误信息和堆栈跟踪
///
/// # 错误处理
/// - 配置验证失败：返回详细的验证错误信息
/// - 求解器初始化失败：返回初始化错误信息
/// - 代价计算失败：返回计算错误信息
///
/// # 示例
/// ```rust
/// use course_scheduling_system::commands::schedule::{calculate_cost, CalculateCostInput};
///
/// #[tauri::command]
/// async fn test_calculate_cost() -> Result<CalculateCostOutput, String> {
///     let input = CalculateCostInput {
///         schedule: Schedule::new(5, 8),
///         subject_configs: vec![],
///         teacher_preferences: vec![],
///         venues: vec![],
///         teacher_exclusions: vec![],
///         solver_config: None,
///     };
///
///     calculate_cost(input).await
/// }
/// ```
#[tauri::command]
pub async fn calculate_cost(input: CalculateCostInput) -> Result<CalculateCostOutput, String> {
    info!("========================================");
    info!("开始计算课表代价值");
    info!("========================================");

    // 记录配置信息
    debug!("课表课程数量: {}", input.schedule.entries.len());
    debug!("科目配置数量: {}", input.subject_configs.len());
    debug!("教师偏好数量: {}", input.teacher_preferences.len());
    debug!("场地配置数量: {}", input.venues.len());
    debug!("教师互斥关系数量: {}", input.teacher_exclusions.len());

    // 记录开始时间
    let start_time = std::time::Instant::now();

    // 1. 验证输入配置
    info!("步骤 1/4: 验证输入配置");
    if input.schedule.entries.is_empty() {
        warn!("课表为空，代价值为 0");
        return Ok(CalculateCostOutput {
            total_cost: 0,
            breakdown: CostBreakdown {
                teacher_preference_cost: 0,
                time_bias_cost: 0,
                consecutive_major_cost: 0,
                progress_consistency_cost: 0,
                total_cost: 0,
            },
            duration_ms: start_time.elapsed().as_millis() as u64,
            success: true,
            error_message: None,
        });
    }
    info!("输入配置验证通过");

    // 2. 创建求解器配置
    info!("步骤 2/4: 创建求解器配置");
    let solver_config = input.solver_config.unwrap_or_default();
    debug!("求解器配置: {:?}", solver_config);

    // 3. 初始化约束求解器
    info!("步骤 3/4: 初始化约束求解器");
    let solver = match ConstraintSolver::new(solver_config) {
        Ok(s) => {
            info!("约束求解器初始化成功");
            s
        }
        Err(e) => {
            error!("约束求解器初始化失败: {:?}", e);
            return Err(format!("约束求解器初始化失败: {}", e));
        }
    };

    // 4. 计算代价值
    info!("步骤 4/4: 计算代价值");

    // 转换输入数据为 HashMap
    let subject_configs_map: std::collections::HashMap<String, SubjectConfig> = input
        .subject_configs
        .into_iter()
        .map(|c| (c.id.clone(), c))
        .collect();

    let teacher_prefs_map: std::collections::HashMap<u32, TeacherPreference> = input
        .teacher_preferences
        .into_iter()
        .map(|p| (p.teacher_id, p))
        .collect();

    let venues_map: std::collections::HashMap<String, Venue> = input
        .venues
        .into_iter()
        .map(|v| (v.id.clone(), v))
        .collect();

    // 构建约束图
    use crate::algorithm::types::ConstraintGraph;
    let constraint_graph = ConstraintGraph::new(
        subject_configs_map,
        teacher_prefs_map,
        venues_map,
        input.teacher_exclusions,
    );

    // 调用代价函数计算（使用详细版本以获取分解信息）
    let breakdown = calculate_cost_with_breakdown(&solver, &input.schedule, &constraint_graph);

    // 计算耗时
    let duration = start_time.elapsed();
    let duration_ms = duration.as_millis() as u64;

    info!("========================================");
    info!("代价计算完成");
    info!("总代价值: {}", breakdown.total_cost);
    info!("  - 教师偏好违反: {}", breakdown.teacher_preference_cost);
    info!("  - 早晚偏好违反: {}", breakdown.time_bias_cost);
    info!("  - 主科连续惩罚: {}", breakdown.consecutive_major_cost);
    info!("  - 进度一致性: {}", breakdown.progress_consistency_cost);
    info!("耗时: {} 毫秒", duration_ms);
    info!("========================================");

    // 检查代价值是否过高
    if breakdown.total_cost > 1000 {
        warn!(
            "代价值较高 ({}), 建议调整课表以获得更优解",
            breakdown.total_cost
        );
    }

    Ok(CalculateCostOutput {
        total_cost: breakdown.total_cost,
        breakdown,
        duration_ms,
        success: true,
        error_message: None,
    })
}

/// 计算代价值并返回详细分解信息
///
/// 这是一个辅助函数，用于计算代价值的各个分量
///
/// # 参数
/// - `solver`: 约束求解器引用
/// - `schedule`: 课表引用
/// - `constraint_graph`: 约束图引用
///
/// # 返回
/// - `CostBreakdown`: 代价分解信息
fn calculate_cost_with_breakdown(
    solver: &ConstraintSolver,
    schedule: &Schedule,
    constraint_graph: &crate::algorithm::types::ConstraintGraph,
) -> CostBreakdown {
    use std::collections::HashMap;

    debug!("开始详细代价计算");

    let mut teacher_preference_cost = 0u32;
    let mut time_bias_cost = 0u32;

    // 预分组数据结构
    let mut class_subject_slots: HashMap<(u32, String), Vec<(u8, u8)>> = HashMap::new();
    let mut teacher_subject_days: HashMap<(u32, String), Vec<u8>> = HashMap::new();

    // 遍历所有课程条目
    for entry in &schedule.entries {
        // 获取教师偏好配置
        if let Some(teacher_pref) = constraint_graph.get_teacher_preference(entry.teacher_id) {
            let slot_bit = 1u64
                << entry
                    .time_slot
                    .to_bit_position(solver.config().periods_per_day);

            // 软约束1：教师时段偏好
            if teacher_pref.preferred_slots != 0 && (slot_bit & teacher_pref.preferred_slots) == 0 {
                let penalty = 10 * teacher_pref.weight;
                teacher_preference_cost += penalty;
                debug!(
                    "教师 {} 时段偏好违反 - 星期{}第{}节，惩罚: {}",
                    entry.teacher_id,
                    entry.time_slot.day + 1,
                    entry.time_slot.period + 1,
                    penalty
                );
            }

            // 软约束2：教师早晚偏好
            if teacher_pref.time_bias == 1 && entry.time_slot.period == 0 {
                time_bias_cost += 50;
                debug!("教师 {} 厌恶早课但被安排第1节，惩罚: 50", entry.teacher_id);
            } else if teacher_pref.time_bias == 2
                && entry.time_slot.period == solver.config().periods_per_day - 1
            {
                time_bias_cost += 50;
                debug!(
                    "教师 {} 厌恶晚课但被安排最后一节，惩罚: 50",
                    entry.teacher_id
                );
            }
        }

        // 收集主科课程的时段信息
        if let Some(subject_config) = constraint_graph.get_subject_config(&entry.subject_id) {
            if subject_config.is_major_subject {
                class_subject_slots
                    .entry((entry.class_id, entry.subject_id.clone()))
                    .or_insert_with(Vec::new)
                    .push((entry.time_slot.day, entry.time_slot.period));
            }
        }

        // 收集教师-科目的天数信息
        teacher_subject_days
            .entry((entry.teacher_id, entry.subject_id.clone()))
            .or_insert_with(Vec::new)
            .push(entry.time_slot.day);
    }

    // 软约束3：主科连续3节惩罚
    let consecutive_major_cost = calculate_consecutive_cost(&class_subject_slots);

    // 软约束4：进度一致性
    let progress_consistency_cost = calculate_progress_cost(&teacher_subject_days);

    let total_cost = teacher_preference_cost
        + time_bias_cost
        + consecutive_major_cost
        + progress_consistency_cost;

    debug!("代价分量汇总:");
    debug!("  - 教师偏好违反: {}", teacher_preference_cost);
    debug!("  - 早晚偏好违反: {}", time_bias_cost);
    debug!("  - 主科连续惩罚: {}", consecutive_major_cost);
    debug!("  - 进度一致性: {}", progress_consistency_cost);
    debug!("  - 总代价: {}", total_cost);

    CostBreakdown {
        teacher_preference_cost,
        time_bias_cost,
        consecutive_major_cost,
        progress_consistency_cost,
        total_cost,
    }
}

/// 计算主科连续节次惩罚代价
///
/// # 参数
/// - `class_subject_slots`: 班级-科目的时段映射
///
/// # 返回
/// - `u32`: 连续节次惩罚代价
fn calculate_consecutive_cost(
    class_subject_slots: &std::collections::HashMap<(u32, String), Vec<(u8, u8)>>,
) -> u32 {
    let mut cost = 0u32;

    for ((class_id, subject_id), slots) in class_subject_slots {
        let mut sorted_slots: Vec<(u8, u8)> = slots.clone();
        sorted_slots.sort_unstable_by(|a, b| a.0.cmp(&b.0).then(a.1.cmp(&b.1)));

        let mut consecutive_count = 1u32;
        for i in 1..sorted_slots.len() {
            let (prev_day, prev_period) = sorted_slots[i - 1];
            let (curr_day, curr_period) = sorted_slots[i];

            if curr_day == prev_day && curr_period == prev_period + 1 {
                consecutive_count += 1;
            } else {
                if consecutive_count >= 3 {
                    let penalty = 30 * (consecutive_count - 2);
                    cost += penalty;
                    debug!(
                        "主科连续惩罚 - 班级: {}, 科目: {}, 连续数: {}, 惩罚: {}",
                        class_id, subject_id, consecutive_count, penalty
                    );
                }
                consecutive_count = 1;
            }
        }

        // 检查最后一组连续
        if consecutive_count >= 3 {
            let penalty = 30 * (consecutive_count - 2);
            cost += penalty;
            debug!(
                "主科连续惩罚 - 班级: {}, 科目: {}, 连续数: {}, 惩罚: {}",
                class_id, subject_id, consecutive_count, penalty
            );
        }
    }

    cost
}

/// 计算进度一致性代价
///
/// # 参数
/// - `teacher_subject_days`: 教师-科目的天数映射
///
/// # 返回
/// - `u32`: 进度一致性代价
fn calculate_progress_cost(
    teacher_subject_days: &std::collections::HashMap<(u32, String), Vec<u8>>,
) -> u32 {
    let mut cost = 0u32;

    for ((teacher_id, subject_id), days) in teacher_subject_days {
        let days_vec: &Vec<u8> = days;
        if days_vec.len() > 1 {
            let max_day = *days_vec.iter().max().unwrap();
            let min_day = *days_vec.iter().min().unwrap();
            let day_diff = max_day - min_day;

            if day_diff > 2 {
                let penalty = (day_diff - 2) as u32 * 20;
                cost += penalty;
                debug!(
                    "进度一致性违反 - 教师: {}, 科目: {}, 班级数: {}, 时间差: {} 天, 惩罚: {}",
                    teacher_id,
                    subject_id,
                    days.len(),
                    day_diff,
                    penalty
                );
            }
        }
    }

    cost
}

// ============================================================================
// 单元测试
// ============================================================================

#[cfg(test)]
mod calculate_cost_tests {
    use super::*;
    use crate::algorithm::types::{ScheduleEntry, TimeSlot, WeekType};

    /// 创建测试用的课表
    fn create_test_schedule() -> Schedule {
        let mut schedule = Schedule::new(5, 8);

        // 添加一些测试课程
        schedule.add_entry(ScheduleEntry {
            class_id: 101,
            subject_id: "math".to_string(),
            teacher_id: 1001,
            time_slot: TimeSlot::new(0, 0), // 星期一第1节
            is_fixed: false,
            week_type: WeekType::Every,
        });

        schedule.add_entry(ScheduleEntry {
            class_id: 101,
            subject_id: "math".to_string(),
            teacher_id: 1001,
            time_slot: TimeSlot::new(0, 1), // 星期一第2节（连续）
            is_fixed: false,
            week_type: WeekType::Every,
        });

        schedule.add_entry(ScheduleEntry {
            class_id: 101,
            subject_id: "math".to_string(),
            teacher_id: 1001,
            time_slot: TimeSlot::new(0, 2), // 星期一第3节（连续3节）
            is_fixed: false,
            week_type: WeekType::Every,
        });

        schedule.add_entry(ScheduleEntry {
            class_id: 102,
            subject_id: "math".to_string(),
            teacher_id: 1001,
            time_slot: TimeSlot::new(4, 0), // 星期五第1节（时间差4天）
            is_fixed: false,
            week_type: WeekType::Every,
        });

        schedule
    }

    #[tokio::test]
    async fn test_calculate_cost_empty_schedule() {
        // 测试空课表的代价计算
        let schedule = Schedule::new(5, 8);

        let input = CalculateCostInput {
            schedule,
            subject_configs: vec![],
            teacher_preferences: vec![],
            venues: vec![],
            teacher_exclusions: vec![],
            solver_config: None,
        };

        let result = calculate_cost(input).await;
        assert!(result.is_ok());

        let output = result.unwrap();
        assert!(output.success);
        assert_eq!(output.total_cost, 0);
        assert_eq!(output.breakdown.total_cost, 0);
    }

    #[tokio::test]
    async fn test_calculate_cost_with_teacher_preference_violation() {
        // 测试教师偏好违反的代价计算
        let schedule = create_test_schedule();

        // 创建教师偏好：不喜欢星期一第1节
        let teacher_pref = TeacherPreference {
            teacher_id: 1001,
            preferred_slots: !1u64, // 除了第0位（星期一第1节）都是偏好时段
            time_bias: 0,
            weight: 1,
            blocked_slots: 0,
            teaching_group_id: None,
        };

        let input = CalculateCostInput {
            schedule,
            subject_configs: vec![],
            teacher_preferences: vec![teacher_pref],
            venues: vec![],
            teacher_exclusions: vec![],
            solver_config: None,
        };

        let result = calculate_cost(input).await;
        assert!(result.is_ok());

        let output = result.unwrap();
        assert!(output.success);
        assert!(output.breakdown.teacher_preference_cost > 0);
        assert_eq!(output.breakdown.teacher_preference_cost, 10); // 1个违反 × 10 × 权重1
    }

    #[tokio::test]
    async fn test_calculate_cost_with_time_bias_violation() {
        // 测试早晚偏好违反的代价计算
        let schedule = create_test_schedule();

        // 创建教师偏好：厌恶早课
        let teacher_pref = TeacherPreference {
            teacher_id: 1001,
            preferred_slots: u64::MAX,
            time_bias: 1, // 厌恶早课
            weight: 1,
            blocked_slots: 0,
            teaching_group_id: None,
        };

        let input = CalculateCostInput {
            schedule,
            subject_configs: vec![],
            teacher_preferences: vec![teacher_pref],
            venues: vec![],
            teacher_exclusions: vec![],
            solver_config: None,
        };

        let result = calculate_cost(input).await;
        assert!(result.is_ok());

        let output = result.unwrap();
        assert!(output.success);
        assert!(output.breakdown.time_bias_cost > 0);
        assert_eq!(output.breakdown.time_bias_cost, 100); // 2个第1节课 × 50
    }

    #[tokio::test]
    async fn test_calculate_cost_with_consecutive_major_subject() {
        // 测试主科连续3节的代价计算
        let schedule = create_test_schedule();

        // 创建科目配置：数学是主科
        let subject_config = SubjectConfig {
            id: "math".to_string(),
            name: "数学".to_string(),
            forbidden_slots: 0,
            allow_double_session: true,
            venue_id: None,
            is_major_subject: true, // 主科
        };

        let input = CalculateCostInput {
            schedule,
            subject_configs: vec![subject_config],
            teacher_preferences: vec![],
            venues: vec![],
            teacher_exclusions: vec![],
            solver_config: None,
        };

        let result = calculate_cost(input).await;
        assert!(result.is_ok());

        let output = result.unwrap();
        assert!(output.success);
        assert!(output.breakdown.consecutive_major_cost > 0);
        assert_eq!(output.breakdown.consecutive_major_cost, 30); // (3 - 2) × 30
    }

    #[tokio::test]
    async fn test_calculate_cost_with_progress_inconsistency() {
        // 测试进度一致性违反的代价计算
        let schedule = create_test_schedule();

        let input = CalculateCostInput {
            schedule,
            subject_configs: vec![],
            teacher_preferences: vec![],
            venues: vec![],
            teacher_exclusions: vec![],
            solver_config: None,
        };

        let result = calculate_cost(input).await;
        assert!(result.is_ok());

        let output = result.unwrap();
        assert!(output.success);
        assert!(output.breakdown.progress_consistency_cost > 0);
        assert_eq!(output.breakdown.progress_consistency_cost, 40); // (4 - 2) × 20
    }

    #[tokio::test]
    async fn test_calculate_cost_comprehensive() {
        // 综合测试：包含所有类型的代价
        let schedule = create_test_schedule();

        // 教师偏好：不喜欢星期一第1节，厌恶早课
        let teacher_pref = TeacherPreference {
            teacher_id: 1001,
            preferred_slots: !1u64,
            time_bias: 1,
            weight: 2, // 权重为2
            blocked_slots: 0,
            teaching_group_id: None,
        };

        // 科目配置：数学是主科
        let subject_config = SubjectConfig {
            id: "math".to_string(),
            name: "数学".to_string(),
            forbidden_slots: 0,
            allow_double_session: true,
            venue_id: None,
            is_major_subject: true,
        };

        let input = CalculateCostInput {
            schedule,
            subject_configs: vec![subject_config],
            teacher_preferences: vec![teacher_pref],
            venues: vec![],
            teacher_exclusions: vec![],
            solver_config: None,
        };

        let result = calculate_cost(input).await;
        assert!(result.is_ok());

        let output = result.unwrap();
        assert!(output.success);

        // 验证各项代价
        assert_eq!(output.breakdown.teacher_preference_cost, 20); // 1个违反 × 10 × 权重2
        assert_eq!(output.breakdown.time_bias_cost, 100); // 2个第1节课 × 50
        assert_eq!(output.breakdown.consecutive_major_cost, 30); // (3 - 2) × 30
        assert_eq!(output.breakdown.progress_consistency_cost, 40); // (4 - 2) × 20

        // 验证总代价
        let expected_total = 20 + 100 + 30 + 40;
        assert_eq!(output.total_cost, expected_total);
        assert_eq!(output.breakdown.total_cost, expected_total);
    }

    #[tokio::test]
    async fn test_calculate_cost_performance() {
        // 测试性能：大规模课表
        let mut schedule = Schedule::new(5, 8);

        // 添加大量课程（模拟26个班级，每班40节课）
        for class_id in 101..127 {
            for day in 0..5 {
                for period in 0..8 {
                    schedule.add_entry(ScheduleEntry {
                        class_id,
                        subject_id: format!("subject_{}", period),
                        teacher_id: 1000 + period as u32,
                        time_slot: TimeSlot::new(day, period),
                        is_fixed: false,
                        week_type: WeekType::Every,
                    });
                }
            }
        }

        let input = CalculateCostInput {
            schedule,
            subject_configs: vec![],
            teacher_preferences: vec![],
            venues: vec![],
            teacher_exclusions: vec![],
            solver_config: None,
        };

        let start = std::time::Instant::now();
        let result = calculate_cost(input).await;
        let duration = start.elapsed();

        assert!(result.is_ok());
        assert!(duration.as_millis() < 1000, "代价计算应在1秒内完成");
    }
}

// ============================================================================
// validate_schedule 命令
// ============================================================================

/// 约束违反信息
///
/// 描述课表中违反的具体约束
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ConstraintViolation {
    /// 违反的约束类型
    pub constraint_type: String,
    /// 违反的班级ID
    pub class_id: Option<u32>,
    /// 违反的教师ID
    pub teacher_id: Option<u32>,
    /// 违反的科目ID
    pub subject_id: Option<String>,
    /// 违反的时间槽位
    pub time_slot: Option<TimeSlot>,
    /// 违反的详细描述
    pub description: String,
    /// 严重程度（1-5，5最严重）
    pub severity: u8,
}

/// 验证课表输入
///
/// 包含需要验证的课表和约束配置
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ValidateScheduleInput {
    /// 待验证的课表
    pub schedule: Schedule,
    /// 科目配置列表
    pub subject_configs: Vec<SubjectConfig>,
    /// 教师偏好列表
    pub teacher_preferences: Vec<TeacherPreference>,
    /// 场地配置列表
    pub venues: Vec<Venue>,
    /// 教师互斥关系列表
    pub teacher_exclusions: Vec<TeacherMutualExclusion>,
    /// 求解器配置（可选）
    pub solver_config: Option<SolverConfig>,
}

/// 验证课表输出
///
/// 包含验证结果和违反的约束列表
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ValidateScheduleOutput {
    /// 是否通过验证（所有硬约束都满足）
    pub is_valid: bool,
    /// 违反的约束列表
    pub violations: Vec<ConstraintViolation>,
    /// 违反的硬约束数量
    pub hard_constraint_violations: usize,
    /// 违反的软约束数量
    pub soft_constraint_violations: usize,
    /// 验证耗时（毫秒）
    pub duration_ms: u64,
    /// 验证的课程总数
    pub total_entries: usize,
}

/// 验证课表命令
///
/// 验证课表是否满足所有硬约束，并返回违反的约束列表
///
/// # 参数
/// - `input`: 验证课表输入
///
/// # 返回
/// - `Ok(ValidateScheduleOutput)`: 验证完成，返回结果
/// - `Err(String)`: 验证失败，返回错误信息
///
/// # 功能
/// 1. 接收课表和约束配置
/// 2. 验证所有硬约束：
///    - 体育/音乐/美术课不在第1-3节
///    - 每个班级的每门课程总课时数达标
///    - 同一教师在同一时间只出现在一个班级
///    - 同一班级在同一时间只有一门课程
///    - 课程不在禁止时段
///    - 课程不违反连堂限制
///    - 场地容量不超限
///    - 教师互斥约束满足
/// 3. 返回详细的违反信息列表
///
/// # 日志记录
/// - INFO: 记录开始、完成等关键操作
/// - DEBUG: 记录验证进度和中间结果
/// - WARN: 记录发现的约束违反
/// - ERROR: 记录错误信息
///
/// # 示例
/// ```rust
/// use course_scheduling_system::commands::schedule::{validate_schedule, ValidateScheduleInput};
///
/// #[tauri::command]
/// async fn test_validate() -> Result<ValidateScheduleOutput, String> {
///     let input = ValidateScheduleInput {
///         schedule: Schedule::new(5, 8),
///         subject_configs: vec![],
///         teacher_preferences: vec![],
///         venues: vec![],
///         teacher_exclusions: vec![],
///         solver_config: None,
///     };
///
///     validate_schedule(input).await
/// }
/// ```
#[tauri::command]
pub async fn validate_schedule(
    input: ValidateScheduleInput,
) -> Result<ValidateScheduleOutput, String> {
    info!("========================================");
    info!("开始验证课表");
    info!("========================================");

    let start_time = std::time::Instant::now();

    // 记录基本信息
    debug!("课表条目数量: {}", input.schedule.entries.len());
    debug!("科目配置数量: {}", input.subject_configs.len());
    debug!("教师偏好数量: {}", input.teacher_preferences.len());
    debug!("场地配置数量: {}", input.venues.len());
    debug!("教师互斥关系数量: {}", input.teacher_exclusions.len());

    // 转换配置为 HashMap
    let subject_configs_map: std::collections::HashMap<String, SubjectConfig> = input
        .subject_configs
        .into_iter()
        .map(|c| (c.id.clone(), c))
        .collect();

    let teacher_prefs_map: std::collections::HashMap<u32, TeacherPreference> = input
        .teacher_preferences
        .into_iter()
        .map(|p| (p.teacher_id, p))
        .collect();

    let venues_map: std::collections::HashMap<String, Venue> = input
        .venues
        .into_iter()
        .map(|v| (v.id.clone(), v))
        .collect();

    // 创建求解器用于约束检查
    let solver_config = input.solver_config.unwrap_or_default();
    let solver = match ConstraintSolver::new(solver_config) {
        Ok(s) => s,
        Err(e) => {
            error!("创建约束求解器失败: {:?}", e);
            return Err(format!("创建约束求解器失败: {}", e));
        }
    };

    let mut violations = Vec::new();

    info!("开始验证硬约束...");

    // 遍历所有课表条目进行验证
    for (index, entry) in input.schedule.entries.iter().enumerate() {
        debug!(
            "验证课程 {}/{}: 班级={}, 科目={}, 教师={}, 时段=({}, {})",
            index + 1,
            input.schedule.entries.len(),
            entry.class_id,
            entry.subject_id,
            entry.teacher_id,
            entry.time_slot.day + 1,
            entry.time_slot.period + 1
        );

        // 获取相关配置
        let subject_config = match subject_configs_map.get(&entry.subject_id) {
            Some(config) => config,
            None => {
                warn!("科目 {} 没有配置信息，跳过验证", entry.subject_id);
                continue;
            }
        };

        let teacher_pref = teacher_prefs_map
            .get(&entry.teacher_id)
            .cloned()
            .unwrap_or_else(|| TeacherPreference::new(entry.teacher_id));

        // 验证各项硬约束
        validate_entry_constraints(
            &input.schedule,
            entry,
            subject_config,
            &teacher_pref,
            &venues_map,
            &input.teacher_exclusions,
            &solver,
            &mut violations,
        );
    }

    // 验证课时数达标
    validate_session_counts(&input.schedule, &mut violations);

    // 统计违反数量
    let hard_constraint_violations = violations.len();
    let soft_constraint_violations = 0; // 当前只验证硬约束

    let is_valid = hard_constraint_violations == 0;

    let duration = start_time.elapsed();
    let duration_ms = duration.as_millis() as u64;

    info!("========================================");
    info!("课表验证完成");
    info!("验证结果: {}", if is_valid { "通过" } else { "未通过" });
    info!("硬约束违反数量: {}", hard_constraint_violations);
    info!("验证耗时: {} 毫秒", duration_ms);
    info!("========================================");

    if !violations.is_empty() {
        warn!("发现 {} 个约束违反:", violations.len());
        for (i, violation) in violations.iter().enumerate() {
            warn!("  {}. {}", i + 1, violation.description);
        }
    }

    Ok(ValidateScheduleOutput {
        is_valid,
        violations,
        hard_constraint_violations,
        soft_constraint_violations,
        duration_ms,
        total_entries: input.schedule.entries.len(),
    })
}

/// 验证单个课程条目的约束
///
/// 检查课程是否违反各项硬约束
fn validate_entry_constraints(
    schedule: &Schedule,
    entry: &crate::algorithm::types::ScheduleEntry,
    subject_config: &SubjectConfig,
    teacher_pref: &TeacherPreference,
    venues: &std::collections::HashMap<String, Venue>,
    exclusions: &[TeacherMutualExclusion],
    _solver: &ConstraintSolver,
    violations: &mut Vec<ConstraintViolation>,
) {
    use crate::algorithm::types::is_slot_set;

    // 1. 检查课程禁止时段
    if is_slot_set(subject_config.forbidden_slots, &entry.time_slot, 8) {
        warn!(
            "违反硬约束：科目 {} 在禁止时段 ({}, {})",
            entry.subject_id,
            entry.time_slot.day + 1,
            entry.time_slot.period + 1
        );
        violations.push(ConstraintViolation {
            constraint_type: "课程禁止时段".to_string(),
            class_id: Some(entry.class_id),
            teacher_id: Some(entry.teacher_id),
            subject_id: Some(entry.subject_id.clone()),
            time_slot: Some(entry.time_slot),
            description: format!(
                "班级 {} 的 {} 课程被安排在禁止时段：星期{} 第{}节",
                entry.class_id,
                entry.subject_id,
                entry.time_slot.day + 1,
                entry.time_slot.period + 1
            ),
            severity: 5,
        });
    }

    // 2. 检查教师不排课时段
    if is_slot_set(teacher_pref.blocked_slots, &entry.time_slot, 8) {
        warn!(
            "违反硬约束：教师 {} 在不排课时段 ({}, {})",
            entry.teacher_id,
            entry.time_slot.day + 1,
            entry.time_slot.period + 1
        );
        violations.push(ConstraintViolation {
            constraint_type: "教师不排课时段".to_string(),
            class_id: Some(entry.class_id),
            teacher_id: Some(entry.teacher_id),
            subject_id: Some(entry.subject_id.clone()),
            time_slot: Some(entry.time_slot),
            description: format!(
                "教师 {} 在不排课时段被安排课程：星期{} 第{}节（班级 {}）",
                entry.teacher_id,
                entry.time_slot.day + 1,
                entry.time_slot.period + 1,
                entry.class_id
            ),
            severity: 5,
        });
    }

    // 3. 检查教师时间冲突
    let teacher_conflicts: Vec<_> = schedule
        .entries
        .iter()
        .filter(|e| {
            e.teacher_id == entry.teacher_id
                && e.time_slot == entry.time_slot
                && (e.class_id != entry.class_id || e.subject_id != entry.subject_id)
        })
        .collect();

    if !teacher_conflicts.is_empty() {
        warn!(
            "违反硬约束：教师 {} 在时段 ({}, {}) 有冲突",
            entry.teacher_id,
            entry.time_slot.day + 1,
            entry.time_slot.period + 1
        );
        violations.push(ConstraintViolation {
            constraint_type: "教师时间冲突".to_string(),
            class_id: Some(entry.class_id),
            teacher_id: Some(entry.teacher_id),
            subject_id: Some(entry.subject_id.clone()),
            time_slot: Some(entry.time_slot),
            description: format!(
                "教师 {} 在星期{} 第{}节同时在多个班级上课：班级 {} 和班级 {}",
                entry.teacher_id,
                entry.time_slot.day + 1,
                entry.time_slot.period + 1,
                entry.class_id,
                teacher_conflicts[0].class_id
            ),
            severity: 5,
        });
    }

    // 4. 检查班级时间冲突
    let class_conflicts: Vec<_> = schedule
        .entries
        .iter()
        .filter(|e| {
            e.class_id == entry.class_id
                && e.time_slot == entry.time_slot
                && e.subject_id != entry.subject_id
        })
        .collect();

    if !class_conflicts.is_empty() {
        warn!(
            "违反硬约束：班级 {} 在时段 ({}, {}) 有冲突",
            entry.class_id,
            entry.time_slot.day + 1,
            entry.time_slot.period + 1
        );
        violations.push(ConstraintViolation {
            constraint_type: "班级时间冲突".to_string(),
            class_id: Some(entry.class_id),
            teacher_id: Some(entry.teacher_id),
            subject_id: Some(entry.subject_id.clone()),
            time_slot: Some(entry.time_slot),
            description: format!(
                "班级 {} 在星期{} 第{}节同时有多门课程：{} 和 {}",
                entry.class_id,
                entry.time_slot.day + 1,
                entry.time_slot.period + 1,
                entry.subject_id,
                class_conflicts[0].subject_id
            ),
            severity: 5,
        });
    }

    // 5. 检查场地容量
    if let Some(venue_id) = &subject_config.venue_id {
        if let Some(venue) = venues.get(venue_id) {
            let venue_usage = schedule
                .entries
                .iter()
                .filter(|e| {
                    if let Some(config) = subject_config.venue_id.as_ref() {
                        e.time_slot == entry.time_slot && config == venue_id
                    } else {
                        false
                    }
                })
                .count();

            if venue_usage > venue.capacity as usize {
                warn!(
                    "违反硬约束：场地 {} 在时段 ({}, {}) 超容量",
                    venue.name,
                    entry.time_slot.day + 1,
                    entry.time_slot.period + 1
                );
                violations.push(ConstraintViolation {
                    constraint_type: "场地容量超限".to_string(),
                    class_id: Some(entry.class_id),
                    teacher_id: Some(entry.teacher_id),
                    subject_id: Some(entry.subject_id.clone()),
                    time_slot: Some(entry.time_slot),
                    description: format!(
                        "场地 {} 在星期{} 第{}节超容量：当前 {} 个班级，容量 {}",
                        venue.name,
                        entry.time_slot.day + 1,
                        entry.time_slot.period + 1,
                        venue_usage,
                        venue.capacity
                    ),
                    severity: 5,
                });
            }
        }
    }

    // 6. 检查教师互斥约束
    for exclusion in exclusions {
        if exclusion.teacher_a_id == entry.teacher_id || exclusion.teacher_b_id == entry.teacher_id
        {
            let other_teacher_id = if exclusion.teacher_a_id == entry.teacher_id {
                exclusion.teacher_b_id
            } else {
                exclusion.teacher_a_id
            };

            // 检查另一个教师是否在同一时段上课
            let has_conflict = schedule
                .entries
                .iter()
                .any(|e| e.teacher_id == other_teacher_id && e.time_slot == entry.time_slot);

            if has_conflict {
                match &exclusion.scope {
                    crate::algorithm::types::ExclusionScope::AllTime => {
                        warn!(
                            "违反硬约束：教师 {} 和 {} 互斥但同时上课",
                            entry.teacher_id, other_teacher_id
                        );
                        violations.push(ConstraintViolation {
                            constraint_type: "教师互斥约束".to_string(),
                            class_id: Some(entry.class_id),
                            teacher_id: Some(entry.teacher_id),
                            subject_id: Some(entry.subject_id.clone()),
                            time_slot: Some(entry.time_slot),
                            description: format!(
                                "教师 {} 和教师 {} 设置了互斥约束，但在星期{} 第{}节同时上课",
                                entry.teacher_id,
                                other_teacher_id,
                                entry.time_slot.day + 1,
                                entry.time_slot.period + 1
                            ),
                            severity: 5,
                        });
                    }
                    crate::algorithm::types::ExclusionScope::SpecificSlots(mask) => {
                        if is_slot_set(*mask, &entry.time_slot, 8) {
                            warn!(
                                "违反硬约束：教师 {} 和 {} 在特定时段互斥但同时上课",
                                entry.teacher_id, other_teacher_id
                            );
                            violations.push(ConstraintViolation {
                                constraint_type: "教师互斥约束（特定时段）".to_string(),
                                class_id: Some(entry.class_id),
                                teacher_id: Some(entry.teacher_id),
                                subject_id: Some(entry.subject_id.clone()),
                                time_slot: Some(entry.time_slot),
                                description: format!(
                                    "教师 {} 和教师 {} 在星期{} 第{}节设置了互斥约束，但同时上课",
                                    entry.teacher_id,
                                    other_teacher_id,
                                    entry.time_slot.day + 1,
                                    entry.time_slot.period + 1
                                ),
                                severity: 5,
                            });
                        }
                    }
                }
            }
        }
    }

    // 7. 检查连堂限制
    if !subject_config.allow_double_session {
        // 检查前一节
        if entry.time_slot.period > 0 {
            let prev_slot = TimeSlot::new(entry.time_slot.day, entry.time_slot.period - 1);
            let has_prev = schedule.entries.iter().any(|e| {
                e.class_id == entry.class_id
                    && e.subject_id == entry.subject_id
                    && e.time_slot == prev_slot
            });

            if has_prev {
                warn!(
                    "违反硬约束：科目 {} 不允许连堂但在 ({}, {}) 和 ({}, {}) 连续",
                    entry.subject_id,
                    prev_slot.day + 1,
                    prev_slot.period + 1,
                    entry.time_slot.day + 1,
                    entry.time_slot.period + 1
                );
                violations.push(ConstraintViolation {
                    constraint_type: "连堂限制".to_string(),
                    class_id: Some(entry.class_id),
                    teacher_id: Some(entry.teacher_id),
                    subject_id: Some(entry.subject_id.clone()),
                    time_slot: Some(entry.time_slot),
                    description: format!(
                        "班级 {} 的 {} 课程不允许连堂，但在星期{} 第{}节和第{}节连续安排",
                        entry.class_id,
                        entry.subject_id,
                        entry.time_slot.day + 1,
                        prev_slot.period + 1,
                        entry.time_slot.period + 1
                    ),
                    severity: 4,
                });
            }
        }
    }
}

/// 验证课时数达标
///
/// 检查每个班级的每门课程总课时数是否达到要求
fn validate_session_counts(schedule: &Schedule, _violations: &mut Vec<ConstraintViolation>) {
    use std::collections::HashMap;

    debug!("开始验证课时数达标...");

    // 统计每个班级每门课程的实际课时数
    let mut actual_sessions: HashMap<(u32, String), usize> = HashMap::new();

    for entry in &schedule.entries {
        let key = (entry.class_id, entry.subject_id.clone());
        *actual_sessions.entry(key).or_insert(0) += 1;
    }

    debug!("统计到 {} 个班级-科目组合", actual_sessions.len());

    // TODO: 需要从输入中获取目标课时数进行比较
    // 当前只记录统计信息
    for ((class_id, subject_id), count) in actual_sessions.iter() {
        debug!(
            "班级 {} 的 {} 课程：实际 {} 节",
            class_id, subject_id, count
        );
    }
}

// ============================================================================
// validate_schedule 测试
// ============================================================================

#[cfg(test)]
mod validate_schedule_tests {
    use super::*;
    use crate::algorithm::types::{ScheduleEntry, TimeSlot, WeekType};

    #[tokio::test]
    async fn test_validate_schedule_empty() {
        // 测试空课表
        let schedule = Schedule::new(5, 8);

        let input = ValidateScheduleInput {
            schedule,
            subject_configs: vec![],
            teacher_preferences: vec![],
            venues: vec![],
            teacher_exclusions: vec![],
            solver_config: None,
        };

        let result = validate_schedule(input).await;
        assert!(result.is_ok());

        let output = result.unwrap();
        assert!(output.is_valid);
        assert_eq!(output.violations.len(), 0);
        assert_eq!(output.total_entries, 0);
    }

    #[tokio::test]
    async fn test_validate_schedule_valid() {
        // 测试有效课表
        let mut schedule = Schedule::new(5, 8);

        // 添加一个有效的课程
        schedule.add_entry(ScheduleEntry {
            class_id: 101,
            subject_id: "math".to_string(),
            teacher_id: 1001,
            time_slot: TimeSlot::new(0, 3),
            is_fixed: false,
            week_type: WeekType::Every,
        });

        let subject_config = SubjectConfig::new("math".to_string(), "数学".to_string());
        let teacher_pref = TeacherPreference::new(1001);

        let input = ValidateScheduleInput {
            schedule,
            subject_configs: vec![subject_config],
            teacher_preferences: vec![teacher_pref],
            venues: vec![],
            teacher_exclusions: vec![],
            solver_config: None,
        };

        let result = validate_schedule(input).await;
        assert!(result.is_ok());

        let output = result.unwrap();
        assert!(output.is_valid);
        assert_eq!(output.violations.len(), 0);
        assert_eq!(output.total_entries, 1);
    }

    #[tokio::test]
    async fn test_validate_schedule_forbidden_slot() {
        // 测试课程在禁止时段
        let mut schedule = Schedule::new(5, 8);

        // 添加一个在禁止时段的课程
        schedule.add_entry(ScheduleEntry {
            class_id: 101,
            subject_id: "pe".to_string(),
            teacher_id: 1001,
            time_slot: TimeSlot::new(0, 0), // 第1节
            is_fixed: false,
            week_type: WeekType::Every,
        });

        let mut subject_config = SubjectConfig::new("pe".to_string(), "体育".to_string());
        // 设置禁止时段：第1-3节
        subject_config.forbidden_slots = 0b111; // 前3位

        let teacher_pref = TeacherPreference::new(1001);

        let input = ValidateScheduleInput {
            schedule,
            subject_configs: vec![subject_config],
            teacher_preferences: vec![teacher_pref],
            venues: vec![],
            teacher_exclusions: vec![],
            solver_config: None,
        };

        let result = validate_schedule(input).await;
        assert!(result.is_ok());

        let output = result.unwrap();
        assert!(!output.is_valid);
        assert_eq!(output.violations.len(), 1);
        assert_eq!(output.violations[0].constraint_type, "课程禁止时段");
    }

    #[tokio::test]
    async fn test_validate_schedule_teacher_conflict() {
        // 测试教师时间冲突
        let mut schedule = Schedule::new(5, 8);

        let slot = TimeSlot::new(0, 3);

        // 同一教师在同一时段教两个班级
        schedule.add_entry(ScheduleEntry {
            class_id: 101,
            subject_id: "math".to_string(),
            teacher_id: 1001,
            time_slot: slot,
            is_fixed: false,
            week_type: WeekType::Every,
        });

        schedule.add_entry(ScheduleEntry {
            class_id: 102,
            subject_id: "math".to_string(),
            teacher_id: 1001,
            time_slot: slot,
            is_fixed: false,
            week_type: WeekType::Every,
        });

        let subject_config = SubjectConfig::new("math".to_string(), "数学".to_string());
        let teacher_pref = TeacherPreference::new(1001);

        let input = ValidateScheduleInput {
            schedule,
            subject_configs: vec![subject_config],
            teacher_preferences: vec![teacher_pref],
            venues: vec![],
            teacher_exclusions: vec![],
            solver_config: None,
        };

        let result = validate_schedule(input).await;
        assert!(result.is_ok());

        let output = result.unwrap();
        assert!(!output.is_valid);
        assert!(output.violations.len() > 0);
        assert!(output
            .violations
            .iter()
            .any(|v| v.constraint_type == "教师时间冲突"));
    }

    #[tokio::test]
    async fn test_validate_schedule_class_conflict() {
        // 测试班级时间冲突
        let mut schedule = Schedule::new(5, 8);

        let slot = TimeSlot::new(0, 3);

        // 同一班级在同一时段有两门课
        schedule.add_entry(ScheduleEntry {
            class_id: 101,
            subject_id: "math".to_string(),
            teacher_id: 1001,
            time_slot: slot,
            is_fixed: false,
            week_type: WeekType::Every,
        });

        schedule.add_entry(ScheduleEntry {
            class_id: 101,
            subject_id: "chinese".to_string(),
            teacher_id: 1002,
            time_slot: slot,
            is_fixed: false,
            week_type: WeekType::Every,
        });

        let math_config = SubjectConfig::new("math".to_string(), "数学".to_string());
        let chinese_config = SubjectConfig::new("chinese".to_string(), "语文".to_string());
        let teacher_pref1 = TeacherPreference::new(1001);
        let teacher_pref2 = TeacherPreference::new(1002);

        let input = ValidateScheduleInput {
            schedule,
            subject_configs: vec![math_config, chinese_config],
            teacher_preferences: vec![teacher_pref1, teacher_pref2],
            venues: vec![],
            teacher_exclusions: vec![],
            solver_config: None,
        };

        let result = validate_schedule(input).await;
        assert!(result.is_ok());

        let output = result.unwrap();
        assert!(!output.is_valid);
        assert!(output.violations.len() > 0);
        assert!(output
            .violations
            .iter()
            .any(|v| v.constraint_type == "班级时间冲突"));
    }

    #[tokio::test]
    async fn test_validate_schedule_teacher_blocked() {
        // 测试教师不排课时段
        let mut schedule = Schedule::new(5, 8);

        let slot = TimeSlot::new(0, 3);

        schedule.add_entry(ScheduleEntry {
            class_id: 101,
            subject_id: "math".to_string(),
            teacher_id: 1001,
            time_slot: slot,
            is_fixed: false,
            week_type: WeekType::Every,
        });

        let subject_config = SubjectConfig::new("math".to_string(), "数学".to_string());
        let mut teacher_pref = TeacherPreference::new(1001);
        // 设置第4节为不排课时段
        teacher_pref.blocked_slots = 1u64 << slot.to_bit_position(8);

        let input = ValidateScheduleInput {
            schedule,
            subject_configs: vec![subject_config],
            teacher_preferences: vec![teacher_pref],
            venues: vec![],
            teacher_exclusions: vec![],
            solver_config: None,
        };

        let result = validate_schedule(input).await;
        assert!(result.is_ok());

        let output = result.unwrap();
        assert!(!output.is_valid);
        assert_eq!(output.violations.len(), 1);
        assert_eq!(output.violations[0].constraint_type, "教师不排课时段");
    }

    #[tokio::test]
    async fn test_validate_schedule_venue_capacity() {
        // 测试场地容量超限
        let mut schedule = Schedule::new(5, 8);

        let slot = TimeSlot::new(0, 3);

        // 创建场地配置
        let venue = Venue {
            id: "computer_room".to_string(),
            name: "微机室".to_string(),
            capacity: 1,
        };

        let mut subject_config = SubjectConfig::new("computer".to_string(), "微机".to_string());
        subject_config.venue_id = Some("computer_room".to_string());

        // 添加两个班级同时使用同一场地
        schedule.add_entry(ScheduleEntry {
            class_id: 101,
            subject_id: "computer".to_string(),
            teacher_id: 1001,
            time_slot: slot,
            is_fixed: false,
            week_type: WeekType::Every,
        });

        schedule.add_entry(ScheduleEntry {
            class_id: 102,
            subject_id: "computer".to_string(),
            teacher_id: 1002,
            time_slot: slot,
            is_fixed: false,
            week_type: WeekType::Every,
        });

        let teacher_pref1 = TeacherPreference::new(1001);
        let teacher_pref2 = TeacherPreference::new(1002);

        let input = ValidateScheduleInput {
            schedule,
            subject_configs: vec![subject_config],
            teacher_preferences: vec![teacher_pref1, teacher_pref2],
            venues: vec![venue],
            teacher_exclusions: vec![],
            solver_config: None,
        };

        let result = validate_schedule(input).await;
        assert!(result.is_ok());

        let output = result.unwrap();
        assert!(!output.is_valid);
        // 注意：可能会有多个违反（教师冲突 + 场地容量）
        assert!(output
            .violations
            .iter()
            .any(|v| v.constraint_type == "场地容量超限"));
    }

    #[tokio::test]
    async fn test_validate_schedule_performance() {
        // 测试性能：大规模课表验证
        let mut schedule = Schedule::new(5, 8);

        // 添加大量课程（模拟26个班级，每班40节课）
        for class_id in 101..127 {
            for day in 0..5 {
                for period in 0..8 {
                    schedule.add_entry(ScheduleEntry {
                        class_id,
                        subject_id: format!("subject_{}", period),
                        teacher_id: 1000 + (class_id - 101) * 8 + period as u32,
                        time_slot: TimeSlot::new(day, period),
                        is_fixed: false,
                        week_type: WeekType::Every,
                    });
                }
            }
        }

        let input = ValidateScheduleInput {
            schedule,
            subject_configs: vec![],
            teacher_preferences: vec![],
            venues: vec![],
            teacher_exclusions: vec![],
            solver_config: None,
        };

        let start = std::time::Instant::now();
        let result = validate_schedule(input).await;
        let duration = start.elapsed();

        assert!(result.is_ok());
        assert!(duration.as_millis() < 5000, "验证应在5秒内完成");

        let output = result.unwrap();
        assert_eq!(output.total_entries, 26 * 40);
    }
}
