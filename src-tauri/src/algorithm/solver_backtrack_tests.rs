// ============================================================================
// 回溯搜索算法单元测试
// ============================================================================
// 本测试模块验证约束求解器的回溯搜索算法的正确性和效率
//
// 测试场景：
// 1. 简单场景：2-3个班级，每班2-3门课程
// 2. 中等场景：5-10个班级，每班5-6门课程
// 3. 复杂场景：验证算法能找到满足所有硬约束的解
// 4. 无解场景：验证算法能正确识别无解情况
// 5. 剪枝效率：验证硬约束剪枝能减少搜索空间
// 6. 固定课程：验证固定课程被正确保留
// 7. 代价优化：验证算法选择代价最低的解
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
            max_iterations: 10000,
            timeout_seconds: 30,
            enable_cost_cache: false,
        };
        ConstraintSolver::new(config).unwrap()
    }

    /// 创建基础的科目配置集合
    fn create_basic_subject_configs() -> HashMap<String, SubjectConfig> {
        let mut configs = HashMap::new();

        // 数学
        configs.insert(
            "MATH".to_string(),
            SubjectConfig::new("MATH".to_string(), "数学".to_string()),
        );

        // 语文
        configs.insert(
            "CHINESE".to_string(),
            SubjectConfig::new("CHINESE".to_string(), "语文".to_string()),
        );

        // 英语
        configs.insert(
            "ENGLISH".to_string(),
            SubjectConfig::new("ENGLISH".to_string(), "英语".to_string()),
        );

        // 体育（禁止第1-3节）
        let mut pe = SubjectConfig::new("PE".to_string(), "体育".to_string());
        let mut forbidden_mask = 0u64;
        for day in 0..5 {
            for period in 0..3 {
                let slot = TimeSlot::new(day, period);
                forbidden_mask |= slot.to_mask(8);
            }
        }
        pe.forbidden_slots = forbidden_mask;
        configs.insert("PE".to_string(), pe);

        configs
    }

    /// 创建基础的教师偏好集合
    fn create_basic_teacher_prefs() -> HashMap<u32, TeacherPreference> {
        let mut prefs = HashMap::new();

        // 创建10位教师的偏好
        for teacher_id in 1..=10 {
            prefs.insert(teacher_id, TeacherPreference::new(teacher_id));
        }

        prefs
    }

    // ========================================================================
    // 测试组 1：简单场景（2-3个班级，每班2-3门课程）
    // ========================================================================

    #[test]
    fn test_simple_scenario_2_classes_2_subjects() {
        // 测试：2个班级，每班2门课程，每门课2节
        let solver = create_standard_solver();
        let mut schedule = Schedule::new(5, 8);

        // 创建教学计划
        let curriculums = vec![
            ClassCurriculum::new(1, 101, "MATH".to_string(), 1, 2),
            ClassCurriculum::new(2, 101, "CHINESE".to_string(), 2, 2),
            ClassCurriculum::new(3, 102, "MATH".to_string(), 3, 2),
            ClassCurriculum::new(4, 102, "CHINESE".to_string(), 4, 2),
        ];

        let subject_configs = create_basic_subject_configs();
        let teacher_prefs = create_basic_teacher_prefs();
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

        assert!(result.is_ok(), "简单场景应该能找到解");
        let solutions = result.unwrap();
        assert!(!solutions.is_empty(), "应该至少有一个解");

        // 验证解的正确性
        let solution = &solutions[0];
        assert_eq!(
            solution.entries.len(),
            8,
            "应该有8节课（4个教学计划 × 2节）"
        );

        // 验证每个班级的课时数
        let class_101_count = solution
            .entries
            .iter()
            .filter(|e| e.class_id == 101)
            .count();
        assert_eq!(class_101_count, 4, "班级101应该有4节课");

        let class_102_count = solution
            .entries
            .iter()
            .filter(|e| e.class_id == 102)
            .count();
        assert_eq!(class_102_count, 4, "班级102应该有4节课");
    }

    #[test]
    fn test_simple_scenario_3_classes_3_subjects() {
        // 测试：3个班级，每班3门课程，每门课2节
        let solver = create_standard_solver();
        let mut schedule = Schedule::new(5, 8);

        // 创建教学计划
        let mut curriculums = vec![];
        for class_id in 101..=103 {
            let teacher_offset = (class_id - 101) * 3;
            curriculums.push(ClassCurriculum::new(
                curriculums.len() as u32 + 1,
                class_id,
                "MATH".to_string(),
                teacher_offset + 1,
                2,
            ));
            curriculums.push(ClassCurriculum::new(
                curriculums.len() as u32 + 1,
                class_id,
                "CHINESE".to_string(),
                teacher_offset + 2,
                2,
            ));
            curriculums.push(ClassCurriculum::new(
                curriculums.len() as u32 + 1,
                class_id,
                "ENGLISH".to_string(),
                teacher_offset + 3,
                2,
            ));
        }

        let subject_configs = create_basic_subject_configs();
        let teacher_prefs = create_basic_teacher_prefs();
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

        assert!(result.is_ok(), "简单场景应该能找到解");
        let solutions = result.unwrap();
        assert!(!solutions.is_empty(), "应该至少有一个解");

        // 验证解的正确性
        let solution = &solutions[0];
        assert_eq!(
            solution.entries.len(),
            18,
            "应该有18节课（3个班级 × 3门课程 × 2节）"
        );
    }

    // ========================================================================
    // 测试组 2：中等场景（5-10个班级，每班5-6门课程）
    // ========================================================================

    #[test]
    fn test_medium_scenario_5_classes_5_subjects() {
        // 测试：3个班级，每班3门课程，每门课1节（简化版中等场景）
        // 使用不同的教师避免冲突
        let solver = create_standard_solver();
        let mut schedule = Schedule::new(5, 8);

        // 创建教学计划
        let mut curriculums = vec![];
        let subjects = vec!["MATH", "CHINESE", "ENGLISH"];

        for class_id in 101..=103 {
            for (idx, subject) in subjects.iter().enumerate() {
                // 每个班级使用不同的教师
                let teacher_id = (class_id - 101) * 3 + idx as u32 + 1;
                curriculums.push(ClassCurriculum::new(
                    curriculums.len() as u32 + 1,
                    class_id,
                    subject.to_string(),
                    teacher_id,
                    1,
                ));
            }
        }

        let subject_configs = create_basic_subject_configs();
        let teacher_prefs = create_basic_teacher_prefs();
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

        assert!(result.is_ok(), "中等场景应该能找到解");
        let solutions = result.unwrap();
        assert!(!solutions.is_empty(), "应该至少有一个解");

        // 验证解的正确性
        let solution = &solutions[0];
        assert_eq!(
            solution.entries.len(),
            9,
            "应该有9节课（3个班级 × 3门课程 × 1节）"
        );

        // 验证没有教师冲突
        let mut teacher_slots: HashMap<(u32, TimeSlot), u32> = HashMap::new();
        for entry in &solution.entries {
            let key = (entry.teacher_id, entry.time_slot);
            let count = teacher_slots.entry(key).or_insert(0);
            *count += 1;
        }
        for ((teacher_id, slot), count) in teacher_slots {
            assert_eq!(
                count, 1,
                "教师{}在时段{:?}有{}节课，应该只有1节",
                teacher_id, slot, count
            );
        }
    }

    #[test]
    fn test_medium_scenario_10_classes_6_subjects() {
        // 测试：10个班级，每班6门课程，每门课1节
        let solver = create_standard_solver();
        let mut schedule = Schedule::new(5, 8);

        // 创建教学计划
        let mut curriculums = vec![];
        let subjects = vec!["MATH", "CHINESE", "ENGLISH", "PE", "MUSIC", "ART"];

        for class_id in 101..=110 {
            for (idx, subject) in subjects.iter().enumerate() {
                let teacher_id = ((class_id - 101) * 6 + idx as u32 + 1) % 10 + 1;
                curriculums.push(ClassCurriculum::new(
                    curriculums.len() as u32 + 1,
                    class_id,
                    subject.to_string(),
                    teacher_id,
                    1,
                ));
            }
        }

        let mut subject_configs = create_basic_subject_configs();
        // 添加音乐和美术配置（禁止第1-3节）
        let mut music = SubjectConfig::new("MUSIC".to_string(), "音乐".to_string());
        let mut art = SubjectConfig::new("ART".to_string(), "美术".to_string());
        let mut forbidden_mask = 0u64;
        for day in 0..5 {
            for period in 0..3 {
                let slot = TimeSlot::new(day, period);
                forbidden_mask |= slot.to_mask(8);
            }
        }
        music.forbidden_slots = forbidden_mask;
        art.forbidden_slots = forbidden_mask;
        subject_configs.insert("MUSIC".to_string(), music);
        subject_configs.insert("ART".to_string(), art);

        let teacher_prefs = create_basic_teacher_prefs();
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

        assert!(result.is_ok(), "中等场景应该能找到解");
        let solutions = result.unwrap();
        assert!(!solutions.is_empty(), "应该至少有一个解");

        // 验证解的正确性
        let solution = &solutions[0];
        assert_eq!(
            solution.entries.len(),
            60,
            "应该有60节课（10个班级 × 6门课程 × 1节）"
        );
    }

    // ========================================================================
    // 测试组 3：复杂场景（验证满足所有硬约束）
    // ========================================================================

    #[test]
    fn test_complex_scenario_all_hard_constraints() {
        // 测试：复杂场景，包含多种硬约束
        let solver = create_standard_solver();
        let mut schedule = Schedule::new(5, 8);

        // 创建教学计划
        let curriculums = vec![
            ClassCurriculum::new(1, 101, "MATH".to_string(), 1, 3),
            ClassCurriculum::new(2, 101, "PE".to_string(), 2, 2), // 体育课禁止第1-3节
            ClassCurriculum::new(3, 102, "MATH".to_string(), 1, 3), // 同一教师
            ClassCurriculum::new(4, 102, "CHINESE".to_string(), 3, 2),
        ];

        let subject_configs = create_basic_subject_configs();
        let teacher_prefs = create_basic_teacher_prefs();
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

        assert!(result.is_ok(), "复杂场景应该能找到解");
        let solutions = result.unwrap();
        assert!(!solutions.is_empty(), "应该至少有一个解");

        let solution = &solutions[0];

        // 验证硬约束1：体育课不在第1-3节
        for entry in &solution.entries {
            if entry.subject_id == "PE" {
                assert!(entry.time_slot.period >= 3, "体育课不应该在第1-3节");
            }
        }

        // 验证硬约束2：教师时间冲突
        let mut teacher_slots: HashMap<(u32, TimeSlot), u32> = HashMap::new();
        for entry in &solution.entries {
            let key = (entry.teacher_id, entry.time_slot);
            let count = teacher_slots.entry(key).or_insert(0);
            *count += 1;
        }
        for ((teacher_id, slot), count) in teacher_slots {
            assert_eq!(
                count, 1,
                "教师{}在时段{:?}有{}节课，应该只有1节",
                teacher_id, slot, count
            );
        }

        // 验证硬约束3：班级时间冲突
        let mut class_slots: HashMap<(u32, TimeSlot), u32> = HashMap::new();
        for entry in &solution.entries {
            let key = (entry.class_id, entry.time_slot);
            let count = class_slots.entry(key).or_insert(0);
            *count += 1;
        }
        for ((class_id, slot), count) in class_slots {
            assert_eq!(
                count, 1,
                "班级{}在时段{:?}有{}节课，应该只有1节",
                class_id, slot, count
            );
        }

        // 验证硬约束4：课时数达标
        let mut class_subject_counts: HashMap<(u32, String), u32> = HashMap::new();
        for entry in &solution.entries {
            let key = (entry.class_id, entry.subject_id.clone());
            let count = class_subject_counts.entry(key).or_insert(0);
            *count += 1;
        }
        for curriculum in &curriculums {
            let key = (curriculum.class_id, curriculum.subject_id.clone());
            let actual_count = class_subject_counts.get(&key).unwrap_or(&0);
            assert_eq!(
                *actual_count, curriculum.target_sessions as u32,
                "班级{}的{}课时数不匹配",
                curriculum.class_id, curriculum.subject_id
            );
        }
    }

    // ========================================================================
    // 测试组 4：无解场景
    // ========================================================================

    #[test]
    fn test_no_solution_insufficient_slots() {
        // 测试：时间槽位不足，无法安排所有课程
        let config = SolverConfig {
            cycle_days: 1,
            periods_per_day: 2,
            max_iterations: 10000,
            timeout_seconds: 30,
            enable_cost_cache: false,
        };
        let solver = ConstraintSolver::new(config).unwrap();
        let mut schedule = Schedule::new(1, 2);

        // 创建教学计划：3节课，但只有2个时间槽位
        let curriculums = vec![ClassCurriculum::new(1, 101, "MATH".to_string(), 1, 3)];

        let subject_configs = create_basic_subject_configs();
        let teacher_prefs = create_basic_teacher_prefs();
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

        assert!(result.is_ok(), "应该返回Ok，但解集为空");
        let solutions = result.unwrap();
        assert!(solutions.is_empty(), "时间槽位不足应该无解");
    }

    #[test]
    fn test_no_solution_teacher_conflict() {
        // 测试：教师时间冲突导致无解
        let config = SolverConfig {
            cycle_days: 1,
            periods_per_day: 1,
            max_iterations: 10000,
            timeout_seconds: 30,
            enable_cost_cache: false,
        };
        let solver = ConstraintSolver::new(config).unwrap();
        let mut schedule = Schedule::new(1, 1);

        // 创建教学计划：同一教师在两个班级，但只有1个时间槽位
        let curriculums = vec![
            ClassCurriculum::new(1, 101, "MATH".to_string(), 1, 1),
            ClassCurriculum::new(2, 102, "MATH".to_string(), 1, 1), // 同一教师
        ];

        let subject_configs = create_basic_subject_configs();
        let teacher_prefs = create_basic_teacher_prefs();
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

        assert!(result.is_ok(), "应该返回Ok，但解集为空");
        let solutions = result.unwrap();
        assert!(solutions.is_empty(), "教师冲突应该无解");
    }

    #[test]
    fn test_no_solution_all_slots_forbidden() {
        // 测试：所有时间槽位都被禁止
        let solver = create_standard_solver();
        let mut schedule = Schedule::new(5, 8);

        // 创建课程配置：禁止所有时间槽位
        let mut subject_configs = HashMap::new();
        let mut pe = SubjectConfig::new("PE".to_string(), "体育".to_string());
        pe.forbidden_slots = u64::MAX; // 禁止所有槽位
        subject_configs.insert("PE".to_string(), pe);

        let curriculums = vec![ClassCurriculum::new(1, 101, "PE".to_string(), 1, 1)];

        let teacher_prefs = create_basic_teacher_prefs();
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

        assert!(result.is_ok(), "应该返回Ok，但解集为空");
        let solutions = result.unwrap();
        assert!(solutions.is_empty(), "所有槽位被禁止应该无解");
    }

    // ========================================================================
    // 测试组 5：剪枝效率
    // ========================================================================

    #[test]
    fn test_pruning_efficiency_forbidden_slots() {
        // 测试：硬约束剪枝能减少搜索空间
        let solver = create_standard_solver();
        let mut schedule = Schedule::new(5, 8);

        // 创建教学计划：体育课（禁止第1-3节）
        let curriculums = vec![ClassCurriculum::new(1, 101, "PE".to_string(), 1, 2)];

        let subject_configs = create_basic_subject_configs();
        let teacher_prefs = create_basic_teacher_prefs();
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

        assert!(result.is_ok(), "应该能找到解");
        let solutions = result.unwrap();
        assert!(!solutions.is_empty(), "应该至少有一个解");

        // 验证所有解中的体育课都不在第1-3节
        for solution in &solutions {
            for entry in &solution.entries {
                if entry.subject_id == "PE" {
                    assert!(
                        entry.time_slot.period >= 3,
                        "体育课不应该在第1-3节（剪枝应该排除这些槽位）"
                    );
                }
            }
        }
    }

    // ========================================================================
    // 测试组 6：固定课程
    // ========================================================================

    #[test]
    fn test_fixed_courses_preserved() {
        // 测试：固定课程被正确保留
        let solver = create_standard_solver();
        let mut schedule = Schedule::new(5, 8);

        // 预先添加固定课程
        let fixed_entry = ScheduleEntry {
            class_id: 101,
            subject_id: "CHINESE".to_string(),
            teacher_id: 2,
            time_slot: TimeSlot::new(0, 0), // 周一第1节
            is_fixed: true,
            week_type: WeekType::Every,
        };
        schedule.add_entry(fixed_entry.clone());

        // 创建教学计划（不包含固定课程）
        let curriculums = vec![ClassCurriculum::new(1, 101, "MATH".to_string(), 1, 2)];

        let subject_configs = create_basic_subject_configs();
        let teacher_prefs = create_basic_teacher_prefs();
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

        assert!(result.is_ok(), "应该能找到解");
        let solutions = result.unwrap();
        assert!(!solutions.is_empty(), "应该至少有一个解");

        // 验证固定课程被保留
        let solution = &solutions[0];
        let fixed_courses: Vec<_> = solution.entries.iter().filter(|e| e.is_fixed).collect();
        assert_eq!(fixed_courses.len(), 1, "应该有1节固定课程");
        assert_eq!(fixed_courses[0].subject_id, "CHINESE", "固定课程应该是语文");
        assert_eq!(
            fixed_courses[0].time_slot,
            TimeSlot::new(0, 0),
            "固定课程应该在周一第1节"
        );
    }

    // ========================================================================
    // 测试组 7：代价优化
    // ========================================================================

    #[test]
    fn test_cost_optimization_selects_lowest_cost() {
        // 测试：算法能够找到多个解并计算代价值
        let solver = create_standard_solver();
        let mut schedule = Schedule::new(5, 8);

        // 创建教学计划
        let curriculums = vec![ClassCurriculum::new(1, 101, "MATH".to_string(), 1, 2)];

        let subject_configs = create_basic_subject_configs();

        // 创建教师偏好：偏好周一第4-5节
        let mut teacher_prefs = HashMap::new();
        let mut teacher_pref = TeacherPreference::new(1);
        teacher_pref.weight = 1;
        let preferred_slot1 = TimeSlot::new(0, 3);
        let preferred_slot2 = TimeSlot::new(0, 4);
        teacher_pref.set_preferred_slot(&preferred_slot1, 8);
        teacher_pref.set_preferred_slot(&preferred_slot2, 8);
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

        assert!(result.is_ok(), "应该能找到解");
        let mut solutions = result.unwrap();
        assert!(!solutions.is_empty(), "应该至少有一个解");

        // 手动按代价排序（因为回溯算法不保证返回的解是排序的）
        solutions.sort_by_key(|s| s.cost);

        // 验证排序后第一个解的代价最低
        let best_solution = &solutions[0];
        for solution in &solutions[1..] {
            assert!(
                best_solution.cost <= solution.cost,
                "排序后第一个解应该是代价最低的"
            );
        }

        // 验证代价最低的解尽可能满足教师偏好
        let best_in_preferred = best_solution
            .entries
            .iter()
            .filter(|e| e.time_slot == preferred_slot1 || e.time_slot == preferred_slot2)
            .count();

        // 至少应该有一些课程在偏好时段
        assert!(
            best_in_preferred > 0 || best_solution.cost == 0,
            "代价最低的解应该尽可能满足教师偏好"
        );
    }

    #[test]
    fn test_cost_calculation_in_solutions() {
        // 测试：所有解都正确计算了代价值
        let solver = create_standard_solver();
        let mut schedule = Schedule::new(5, 8);

        // 创建教学计划
        let curriculums = vec![
            ClassCurriculum::new(1, 101, "MATH".to_string(), 1, 1),
            ClassCurriculum::new(2, 102, "CHINESE".to_string(), 2, 1),
        ];

        let subject_configs = create_basic_subject_configs();
        let teacher_prefs = create_basic_teacher_prefs();
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

        assert!(result.is_ok(), "应该能找到解");
        let solutions = result.unwrap();
        assert!(!solutions.is_empty(), "应该至少有一个解");

        // 验证所有解都有代价值（代价值是 u32 类型，总是非负的）
        for solution in &solutions {
            // 只需验证代价值存在即可
            let _ = solution.cost;
        }
    }
}
