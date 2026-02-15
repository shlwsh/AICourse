// ============================================================================
// 代价函数计算单元测试
// ============================================================================
// 本测试模块验证约束求解器的代价函数计算功能的正确性
//
// 测试覆盖的软约束（根据需求文档 2.1-2.7）：
// 1. 教师时段偏好违反（不在偏好时段，代价 +10 × 权重）
// 2. 教师早晚偏好违反（厌恶早课但安排第1节，或厌恶晚课但安排最后一节，代价 +50）
// 3. 主科连续3节惩罚（连续3节或更多，代价 +30 × (连续节数 - 2)）
// 4. 同一教师多班课进度一致性（时间差超过2天，代价 +20 × (天数差 - 2)）
// ============================================================================

#[cfg(test)]
mod tests {
    use crate::algorithm::solver::{ConstraintSolver, SolverConfig};
    use crate::algorithm::types::*;
    use std::collections::HashMap;

    // ========================================================================
    // 辅助函数：创建测试数据
    // ========================================================================

    /// 创建标准的求解器配置（5天8节）
    fn create_standard_solver() -> ConstraintSolver {
        let config = SolverConfig {
            cycle_days: 5,
            periods_per_day: 8,
            max_iterations: 1000,
            timeout_seconds: 30,
            enable_cost_cache: false,
        };
        ConstraintSolver::new(config).unwrap()
    }

    /// 创建空的约束图
    fn create_empty_constraint_graph() -> ConstraintGraph {
        ConstraintGraph::new(HashMap::new(), HashMap::new(), HashMap::new(), vec![])
    }

    /// 创建包含教师偏好的约束图
    fn create_constraint_graph_with_teachers(teachers: Vec<TeacherPreference>) -> ConstraintGraph {
        let mut teacher_map = HashMap::new();
        for teacher in teachers {
            teacher_map.insert(teacher.teacher_id, teacher);
        }
        ConstraintGraph::new(HashMap::new(), teacher_map, HashMap::new(), vec![])
    }

    /// 创建包含科目配置的约束图
    fn create_constraint_graph_with_subjects(subjects: Vec<SubjectConfig>) -> ConstraintGraph {
        let mut subject_map = HashMap::new();
        for subject in subjects {
            subject_map.insert(subject.id.clone(), subject);
        }
        ConstraintGraph::new(subject_map, HashMap::new(), HashMap::new(), vec![])
    }

    /// 创建包含科目和教师的约束图
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

    // ========================================================================
    // 测试组 1：基础代价计算
    // ========================================================================

    #[test]
    fn test_cost_empty_schedule() {
        // 测试：空课表的代价应该为 0
        let solver = create_standard_solver();
        let schedule = Schedule::new(5, 8);
        let constraint_graph = create_empty_constraint_graph();

        let cost = solver.calculate_cost(&schedule, &constraint_graph);

        assert_eq!(cost, 0, "空课表的代价应该为 0");
    }

    // ========================================================================
    // 测试组 2：教师时段偏好违反（需求 2.2-2.3）
    // ========================================================================

    #[test]
    fn test_cost_teacher_preference_violation() {
        // 测试：不在教师偏好时段，代价 +10 × 权重
        let solver = create_standard_solver();

        // 创建课表：星期一第1节
        let mut schedule = Schedule::new(5, 8);
        let time_slot = TimeSlot::new(0, 0);
        let entry = ScheduleEntry::new(101, "math".to_string(), 1001, time_slot);
        schedule.add_entry(entry);

        // 创建教师偏好：偏好星期一第2节（不包含第1节）
        let mut teacher_pref = TeacherPreference::new(1001);
        teacher_pref.weight = 1;
        let preferred_slot = TimeSlot::new(0, 1);
        teacher_pref.set_preferred_slot(&preferred_slot, 8);

        let constraint_graph = create_constraint_graph_with_teachers(vec![teacher_pref]);

        let cost = solver.calculate_cost(&schedule, &constraint_graph);

        // 违反教师偏好：10 × 权重(1) = 10
        assert_eq!(cost, 10, "违反教师偏好应该增加 10 × 权重的代价");
    }

    #[test]
    fn test_cost_teacher_preference_satisfied() {
        // 测试：在教师偏好时段，代价为 0
        let solver = create_standard_solver();

        // 创建课表：星期一第2节
        let mut schedule = Schedule::new(5, 8);
        let time_slot = TimeSlot::new(0, 1);
        let entry = ScheduleEntry::new(101, "math".to_string(), 1001, time_slot);
        schedule.add_entry(entry);

        // 创建教师偏好：偏好星期一第2节
        let mut teacher_pref = TeacherPreference::new(1001);
        teacher_pref.weight = 1;
        teacher_pref.set_preferred_slot(&time_slot, 8);

        let constraint_graph = create_constraint_graph_with_teachers(vec![teacher_pref]);

        let cost = solver.calculate_cost(&schedule, &constraint_graph);

        assert_eq!(cost, 0, "满足教师偏好时代价应该为 0");
    }

    #[test]
    fn test_cost_teacher_weight_multiplier() {
        // 测试：教师权重系数对代价的影响（需求 2.6）
        let solver = create_standard_solver();

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
        assert_eq!(cost, 30, "权重为3时，违反偏好的代价应该是 30");
    }

    // ========================================================================
    // 测试组 3：教师早晚偏好违反（需求 2.4-2.5）
    // ========================================================================

    #[test]
    fn test_cost_time_bias_early_morning() {
        // 测试：厌恶早课但被安排第1节，代价 +50
        let solver = create_standard_solver();

        // 创建课表：第1节课
        let mut schedule = Schedule::new(5, 8);
        let time_slot = TimeSlot::new(0, 0);
        let entry = ScheduleEntry::new(101, "math".to_string(), 1001, time_slot);
        schedule.add_entry(entry);

        // 创建教师偏好：厌恶早课
        let mut teacher_pref = TeacherPreference::new(1001);
        teacher_pref.time_bias = 1; // 厌恶早课
        teacher_pref.weight = 1;

        let constraint_graph = create_constraint_graph_with_teachers(vec![teacher_pref]);

        let cost = solver.calculate_cost(&schedule, &constraint_graph);

        // 厌恶早课但被安排第1节：50
        assert_eq!(cost, 50, "厌恶早课但安排第1节应该增加 50 的代价");
    }

    #[test]
    fn test_cost_time_bias_late_evening() {
        // 测试：厌恶晚课但被安排最后一节，代价 +50
        let solver = create_standard_solver();

        // 创建课表：最后一节课（第8节）
        let mut schedule = Schedule::new(5, 8);
        let time_slot = TimeSlot::new(0, 7);
        let entry = ScheduleEntry::new(101, "math".to_string(), 1001, time_slot);
        schedule.add_entry(entry);

        // 创建教师偏好：厌恶晚课
        let mut teacher_pref = TeacherPreference::new(1001);
        teacher_pref.time_bias = 2; // 厌恶晚课
        teacher_pref.weight = 1;

        let constraint_graph = create_constraint_graph_with_teachers(vec![teacher_pref]);

        let cost = solver.calculate_cost(&schedule, &constraint_graph);

        // 厌恶晚课但被安排最后一节：50
        assert_eq!(cost, 50, "厌恶晚课但安排最后一节应该增加 50 的代价");
    }

    #[test]
    fn test_cost_no_time_bias() {
        // 测试：无早晚偏好时，第1节和最后一节都不增加代价
        let solver = create_standard_solver();

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

        assert_eq!(cost, 0, "无早晚偏好时代价应该为 0");
    }

    // ========================================================================
    // 测试组 4：主科连续3节惩罚（需求 2.7）
    // ========================================================================

    #[test]
    fn test_cost_consecutive_3_periods() {
        // 测试：主科连续3节，代价 +30 × (3-2) = 30
        let solver = create_standard_solver();

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
        assert_eq!(cost, 30, "主科连续3节应该增加 30 的代价");
    }

    #[test]
    fn test_cost_consecutive_4_periods() {
        // 测试：主科连续4节，代价 +30 × (4-2) = 60
        let solver = create_standard_solver();

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
        assert_eq!(cost, 60, "主科连续4节应该增加 60 的代价");
    }

    #[test]
    fn test_cost_consecutive_2_periods_no_penalty() {
        // 测试：主科连续2节不惩罚
        let solver = create_standard_solver();

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

        assert_eq!(cost, 0, "主科连续2节不应该有惩罚");
    }

    #[test]
    fn test_cost_non_consecutive_major_subject() {
        // 测试：主科不连续不惩罚
        let solver = create_standard_solver();

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

        assert_eq!(cost, 0, "主科不连续不应该有惩罚");
    }

    #[test]
    fn test_cost_non_major_subject_consecutive() {
        // 测试：非主科连续不惩罚
        let solver = create_standard_solver();

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

        assert_eq!(cost, 0, "非主科连续不应该有惩罚");
    }

    // ========================================================================
    // 测试组 5：进度一致性（需求 36）
    // ========================================================================

    #[test]
    fn test_cost_progress_consistency_violation() {
        // 测试：同一教师多班课时间差超过2天，代价 +20 × (天数差 - 2)
        let solver = create_standard_solver();

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
        assert_eq!(cost, 20, "时间差超过2天应该增加 20 × (天数差 - 2) 的代价");
    }

    #[test]
    fn test_cost_progress_consistency_satisfied() {
        // 测试：时间差不超过2天不惩罚
        let solver = create_standard_solver();

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

        assert_eq!(cost, 0, "时间差不超过2天不应该有惩罚");
    }

    #[test]
    fn test_cost_progress_2_days_boundary() {
        // 测试：时间差正好2天（边界情况）
        let solver = create_standard_solver();

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

        assert_eq!(cost, 0, "时间差正好2天不应该有惩罚");
    }

    #[test]
    fn test_cost_single_class_no_progress_check() {
        // 测试：教师只教一个班不检查进度一致性
        let solver = create_standard_solver();

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

        assert_eq!(cost, 0, "教师只教一个班不应该检查进度一致性");
    }

    // ========================================================================
    // 测试组 6：综合场景
    // ========================================================================

    #[test]
    fn test_cost_multiple_violations() {
        // 测试：多个软约束同时违反
        let solver = create_standard_solver();

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
        assert_eq!(cost, 130, "多个软约束违反时代价应该累加");
    }

    #[test]
    fn test_cost_all_constraints_satisfied() {
        // 测试：所有软约束都满足
        let solver = create_standard_solver();

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

        assert_eq!(cost, 0, "所有软约束都满足时代价应该为 0");
    }
}
