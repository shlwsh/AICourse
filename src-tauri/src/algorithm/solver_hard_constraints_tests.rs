// ============================================================================
// 硬约束检查单元测试
// ============================================================================
// 本测试模块验证约束求解器的硬约束检查功能的正确性
//
// 测试覆盖的硬约束：
// 1. 课程禁止时段检查（如体育课不在第1-3节）
// 2. 教师不排课时段检查
// 3. 教师时间冲突检查（同一教师同一时段只能在一个班级）
// 4. 班级时间冲突检查（同一班级同一时段只有一门课程）
// 5. 合班课程冲突检查
// 6. 场地容量限制检查
// 7. 教师互斥约束检查
// 8. 连堂限制检查
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

    /// 创建空课表
    fn create_empty_schedule() -> Schedule {
        Schedule::new(5, 8)
    }

    // ========================================================================
    // 测试组 1：课程禁止时段检查
    // ========================================================================

    #[test]
    fn test_check_forbidden_slot_allowed() {
        // 测试：课程在允许的时段应该通过检查
        let solver = create_standard_solver();
        let subject = SubjectConfig::new("MATH".to_string(), "数学".to_string());
        let slot = TimeSlot::new(0, 0); // 周一第1节

        let result = solver.check_forbidden_slot(&subject, &slot);
        assert!(result.is_ok(), "数学课在第1节应该被允许");
    }

    #[test]
    fn test_check_forbidden_slot_pe_early_periods() {
        // 测试：体育课不能在第1-3节（需求 1.1）
        let solver = create_standard_solver();
        let mut subject = SubjectConfig::new("PE".to_string(), "体育".to_string());

        // 设置体育课禁止时段：第1-3节（每天的前3节）
        // 位掩码：第0-2位、第8-10位、第16-18位、第24-26位、第32-34位
        let mut forbidden_mask = 0u64;
        for day in 0..5 {
            for period in 0..3 {
                let slot = TimeSlot::new(day, period);
                forbidden_mask |= slot.to_mask(8);
            }
        }
        subject.forbidden_slots = forbidden_mask;

        // 测试第1节（应该被禁止）
        let slot1 = TimeSlot::new(0, 0);
        let result1 = solver.check_forbidden_slot(&subject, &slot1);
        assert!(result1.is_err(), "体育课不应该在第1节");

        // 测试第2节（应该被禁止）
        let slot2 = TimeSlot::new(0, 1);
        let result2 = solver.check_forbidden_slot(&subject, &slot2);
        assert!(result2.is_err(), "体育课不应该在第2节");

        // 测试第3节（应该被禁止）
        let slot3 = TimeSlot::new(0, 2);
        let result3 = solver.check_forbidden_slot(&subject, &slot3);
        assert!(result3.is_err(), "体育课不应该在第3节");

        // 测试第4节（应该被允许）
        let slot4 = TimeSlot::new(0, 3);
        let result4 = solver.check_forbidden_slot(&subject, &slot4);
        assert!(result4.is_ok(), "体育课应该在第4节被允许");
    }

    #[test]
    fn test_check_forbidden_slot_music_art_early_periods() {
        // 测试：音乐、美术课不能在第1-3节（需求 1.1）
        let solver = create_standard_solver();

        // 创建音乐课配置
        let mut music = SubjectConfig::new("MUSIC".to_string(), "音乐".to_string());
        let mut forbidden_mask = 0u64;
        for day in 0..5 {
            for period in 0..3 {
                let slot = TimeSlot::new(day, period);
                forbidden_mask |= slot.to_mask(8);
            }
        }
        music.forbidden_slots = forbidden_mask;

        // 测试音乐课在第1节（应该被禁止）
        let slot = TimeSlot::new(0, 0);
        let result = solver.check_forbidden_slot(&music, &slot);
        assert!(result.is_err(), "音乐课不应该在第1节");

        // 创建美术课配置
        let mut art = SubjectConfig::new("ART".to_string(), "美术".to_string());
        art.forbidden_slots = forbidden_mask;

        // 测试美术课在第2节（应该被禁止）
        let slot = TimeSlot::new(0, 1);
        let result = solver.check_forbidden_slot(&art, &slot);
        assert!(result.is_err(), "美术课不应该在第2节");
    }

    // ========================================================================
    // 测试组 2：教师不排课时段检查
    // ========================================================================

    #[test]
    fn test_check_teacher_blocked_allowed() {
        // 测试：教师在没有不排课限制的时段应该通过检查
        let solver = create_standard_solver();
        let teacher_pref = TeacherPreference::new(1001);
        let slot = TimeSlot::new(0, 0);

        let result = solver.check_teacher_blocked(&teacher_pref, &slot);
        assert!(result.is_ok(), "教师在没有限制的时段应该被允许");
    }

    #[test]
    fn test_check_teacher_blocked_specific_slot() {
        // 测试：教师在特定时段不排课（需求 23）
        let solver = create_standard_solver();
        let mut teacher_pref = TeacherPreference::new(1001);

        // 设置周一第1节不排课（开会）
        let blocked_slot = TimeSlot::new(0, 0);
        teacher_pref.blocked_slots = blocked_slot.to_mask(8);

        // 测试被阻止的时段
        let result = solver.check_teacher_blocked(&teacher_pref, &blocked_slot);
        assert!(result.is_err(), "教师在不排课时段不应该被安排");

        // 测试其他时段（应该被允许）
        let other_slot = TimeSlot::new(0, 1);
        let result = solver.check_teacher_blocked(&teacher_pref, &other_slot);
        assert!(result.is_ok(), "教师在其他时段应该被允许");
    }

    #[test]
    fn test_check_teacher_blocked_multiple_slots() {
        // 测试：教师在多个时段不排课
        let solver = create_standard_solver();
        let mut teacher_pref = TeacherPreference::new(1001);

        // 设置周一全天不排课（进修）
        let mut blocked_mask = 0u64;
        for period in 0..8 {
            let slot = TimeSlot::new(0, period);
            blocked_mask |= slot.to_mask(8);
        }
        teacher_pref.blocked_slots = blocked_mask;

        // 测试周一的所有节次（都应该被阻止）
        for period in 0..8 {
            let slot = TimeSlot::new(0, period);
            let result = solver.check_teacher_blocked(&teacher_pref, &slot);
            assert!(result.is_err(), "教师在周一第{}节不应该被安排", period + 1);
        }

        // 测试周二第1节（应该被允许）
        let slot = TimeSlot::new(1, 0);
        let result = solver.check_teacher_blocked(&teacher_pref, &slot);
        assert!(result.is_ok(), "教师在周二应该被允许");
    }

    // ========================================================================
    // 测试组 3：教师时间冲突检查
    // ========================================================================

    #[test]
    fn test_check_teacher_conflict_no_conflict() {
        // 测试：教师在空闲时段应该通过检查（需求 1.3）
        let solver = create_standard_solver();
        let schedule = create_empty_schedule();
        let teacher_id = 1001;
        let slot = TimeSlot::new(0, 0);

        let result = solver.check_teacher_conflict(&schedule, teacher_id, &slot);
        assert!(result.is_ok(), "教师在空闲时段应该被允许");
    }

    #[test]
    fn test_check_teacher_conflict_has_conflict() {
        // 测试：教师在同一时段只能在一个班级（需求 1.3）
        let solver = create_standard_solver();
        let mut schedule = create_empty_schedule();

        let teacher_id = 1001;
        let slot = TimeSlot::new(0, 0);

        // 在该时段为教师安排一节课
        let entry = ScheduleEntry {
            class_id: 101,
            subject_id: "MATH".to_string(),
            teacher_id,
            time_slot: slot,
            is_fixed: false,
            week_type: WeekType::Every,
        };
        schedule.add_entry(entry);

        // 尝试在同一时段为同一教师安排另一节课（应该失败）
        let result = solver.check_teacher_conflict(&schedule, teacher_id, &slot);
        assert!(result.is_err(), "教师在同一时段不能有多节课");
    }

    #[test]
    fn test_check_teacher_conflict_different_teachers() {
        // 测试：不同教师在同一时段可以有课
        let solver = create_standard_solver();
        let mut schedule = create_empty_schedule();

        let slot = TimeSlot::new(0, 0);

        // 教师A在该时段有课
        let entry1 = ScheduleEntry {
            class_id: 101,
            subject_id: "MATH".to_string(),
            teacher_id: 1001,
            time_slot: slot,
            is_fixed: false,
            week_type: WeekType::Every,
        };
        schedule.add_entry(entry1);

        // 教师B在同一时段应该可以有课（不同班级）
        let result = solver.check_teacher_conflict(&schedule, 1002, &slot);
        assert!(result.is_ok(), "不同教师在同一时段可以有课");
    }

    // ========================================================================
    // 测试组 4：班级时间冲突检查
    // ========================================================================

    #[test]
    fn test_check_class_conflict_no_conflict() {
        // 测试：班级在空闲时段应该通过检查（需求 1.4）
        let solver = create_standard_solver();
        let schedule = create_empty_schedule();
        let class_id = 101;
        let slot = TimeSlot::new(0, 0);

        let result = solver.check_class_conflict(&schedule, class_id, &slot);
        assert!(result.is_ok(), "班级在空闲时段应该被允许");
    }

    #[test]
    fn test_check_class_conflict_has_conflict() {
        // 测试：班级在同一时段只能有一门课程（需求 1.4）
        let solver = create_standard_solver();
        let mut schedule = create_empty_schedule();

        let class_id = 101;
        let slot = TimeSlot::new(0, 0);

        // 在该时段为班级安排一节课
        let entry = ScheduleEntry {
            class_id,
            subject_id: "MATH".to_string(),
            teacher_id: 1001,
            time_slot: slot,
            is_fixed: false,
            week_type: WeekType::Every,
        };
        schedule.add_entry(entry);

        // 尝试在同一时段为同一班级安排另一节课（应该失败）
        let result = solver.check_class_conflict(&schedule, class_id, &slot);
        assert!(result.is_err(), "班级在同一时段不能有多门课程");
    }

    #[test]
    fn test_check_class_conflict_different_classes() {
        // 测试：不同班级在同一时段可以有课
        let solver = create_standard_solver();
        let mut schedule = create_empty_schedule();

        let slot = TimeSlot::new(0, 0);

        // 班级A在该时段有课
        let entry1 = ScheduleEntry {
            class_id: 101,
            subject_id: "MATH".to_string(),
            teacher_id: 1001,
            time_slot: slot,
            is_fixed: false,
            week_type: WeekType::Every,
        };
        schedule.add_entry(entry1);

        // 班级B在同一时段应该可以有课
        let result = solver.check_class_conflict(&schedule, 102, &slot);
        assert!(result.is_ok(), "不同班级在同一时段可以有课");
    }

    // ========================================================================
    // 测试组 5：合班课程冲突检查
    // ========================================================================

    #[test]
    fn test_check_combined_class_no_combined() {
        // 测试：非合班课程应该直接通过检查
        let solver = create_standard_solver();
        let schedule = create_empty_schedule();
        let curriculum = ClassCurriculum::new(1, 101, "MATH".to_string(), 1001, 5);
        let slot = TimeSlot::new(0, 0);

        let result = solver.check_combined_class_conflict(&schedule, &curriculum, &slot);
        assert!(result.is_ok(), "非合班课程应该直接通过");
    }

    #[test]
    fn test_check_combined_class_all_free() {
        // 测试：合班课程的所有班级都空闲时应该通过（需求 27）
        let solver = create_standard_solver();
        let schedule = create_empty_schedule();

        // 创建合班课程：班级101、102、103合班上体育课
        let mut curriculum = ClassCurriculum::new(1, 101, "PE".to_string(), 1001, 2);
        curriculum.is_combined_class = true;
        curriculum.combined_class_ids = vec![102, 103];

        let slot = TimeSlot::new(0, 0);

        let result = solver.check_combined_class_conflict(&schedule, &curriculum, &slot);
        assert!(result.is_ok(), "所有合班班级都空闲时应该通过");
    }

    #[test]
    fn test_check_combined_class_main_class_busy() {
        // 测试：合班课程的主班级有课时应该失败
        let solver = create_standard_solver();
        let mut schedule = create_empty_schedule();

        let slot = TimeSlot::new(0, 0);

        // 主班级101在该时段有课
        let entry = ScheduleEntry {
            class_id: 101,
            subject_id: "MATH".to_string(),
            teacher_id: 1001,
            time_slot: slot,
            is_fixed: false,
            week_type: WeekType::Every,
        };
        schedule.add_entry(entry);

        // 创建合班课程
        let mut curriculum = ClassCurriculum::new(1, 101, "PE".to_string(), 1002, 2);
        curriculum.is_combined_class = true;
        curriculum.combined_class_ids = vec![102, 103];

        let result = solver.check_combined_class_conflict(&schedule, &curriculum, &slot);
        assert!(result.is_err(), "主班级有课时合班课程应该失败");
    }

    #[test]
    fn test_check_combined_class_one_combined_class_busy() {
        // 测试：合班课程的某个合班班级有课时应该失败
        let solver = create_standard_solver();
        let mut schedule = create_empty_schedule();

        let slot = TimeSlot::new(0, 0);

        // 合班班级102在该时段有课
        let entry = ScheduleEntry {
            class_id: 102,
            subject_id: "ENGLISH".to_string(),
            teacher_id: 1003,
            time_slot: slot,
            is_fixed: false,
            week_type: WeekType::Every,
        };
        schedule.add_entry(entry);

        // 创建合班课程
        let mut curriculum = ClassCurriculum::new(1, 101, "PE".to_string(), 1002, 2);
        curriculum.is_combined_class = true;
        curriculum.combined_class_ids = vec![102, 103];

        let result = solver.check_combined_class_conflict(&schedule, &curriculum, &slot);
        assert!(result.is_err(), "合班班级有课时合班课程应该失败");
    }

    // ========================================================================
    // 测试组 6：场地容量限制检查
    // ========================================================================

    #[test]
    fn test_check_venue_capacity_sufficient() {
        // 测试：场地容量充足时应该通过（需求 21）
        let solver = create_standard_solver();
        let schedule = create_empty_schedule();

        let venue = Venue::new("computer_room".to_string(), "微机室".to_string(), 2);
        let mut subject = SubjectConfig::new("COMPUTER".to_string(), "微机课".to_string());
        subject.venue_id = Some("computer_room".to_string());

        let slot = TimeSlot::new(0, 0);

        let result = solver.check_venue_capacity(&schedule, &subject, &venue, &slot);
        assert!(result.is_ok(), "场地容量充足时应该通过");
    }

    #[test]
    fn test_check_venue_capacity_at_limit() {
        // 测试：场地容量达到上限时应该失败
        let solver = create_standard_solver();
        let mut schedule = create_empty_schedule();

        let venue = Venue::new("computer_room".to_string(), "微机室".to_string(), 1);
        let mut subject = SubjectConfig::new("COMPUTER".to_string(), "微机课".to_string());
        subject.venue_id = Some("computer_room".to_string());

        let slot = TimeSlot::new(0, 0);

        // 在该时段已经有一节微机课（容量为1）
        let entry = ScheduleEntry {
            class_id: 101,
            subject_id: "COMPUTER".to_string(),
            teacher_id: 1001,
            time_slot: slot,
            is_fixed: false,
            week_type: WeekType::Every,
        };
        schedule.add_entry(entry);

        // 尝试再安排一节微机课（应该失败）
        let result = solver.check_venue_capacity(&schedule, &subject, &venue, &slot);
        assert!(result.is_err(), "场地容量达到上限时应该失败");
    }

    #[test]
    fn test_check_venue_capacity_multiple_classes() {
        // 测试：场地可以同时容纳多个班级
        let solver = create_standard_solver();
        let mut schedule = create_empty_schedule();

        let venue = Venue::new("playground".to_string(), "操场".to_string(), 3);
        let mut subject = SubjectConfig::new("PE".to_string(), "体育".to_string());
        subject.venue_id = Some("playground".to_string());

        let slot = TimeSlot::new(0, 0);

        // 在该时段已经有两节体育课（容量为3）
        let entry1 = ScheduleEntry {
            class_id: 101,
            subject_id: "PE".to_string(),
            teacher_id: 1001,
            time_slot: slot,
            is_fixed: false,
            week_type: WeekType::Every,
        };
        schedule.add_entry(entry1);

        let entry2 = ScheduleEntry {
            class_id: 102,
            subject_id: "PE".to_string(),
            teacher_id: 1002,
            time_slot: slot,
            is_fixed: false,
            week_type: WeekType::Every,
        };
        schedule.add_entry(entry2);

        // 尝试再安排一节体育课（应该成功，因为容量为3）
        let result = solver.check_venue_capacity(&schedule, &subject, &venue, &slot);
        assert!(result.is_ok(), "场地容量未满时应该通过");
    }

    // ========================================================================
    // 测试组 7：教师互斥约束检查
    // ========================================================================

    #[test]
    fn test_check_teacher_mutual_exclusion_no_exclusion() {
        // 测试：没有互斥关系时应该通过（需求 29）
        let solver = create_standard_solver();
        let schedule = create_empty_schedule();

        let exclusion = TeacherMutualExclusion::new_all_time(1001, 1002);
        let teacher_id = 1003; // 不在互斥关系中的教师
        let slot = TimeSlot::new(0, 0);

        let result =
            solver.check_teacher_mutual_exclusion(&schedule, &exclusion, teacher_id, &slot);
        assert!(result.is_ok(), "不在互斥关系中的教师应该通过");
    }

    #[test]
    fn test_check_teacher_mutual_exclusion_all_time_no_conflict() {
        // 测试：全时段互斥，另一教师空闲时应该通过
        let solver = create_standard_solver();
        let schedule = create_empty_schedule();

        let exclusion = TeacherMutualExclusion::new_all_time(1001, 1002);
        let teacher_id = 1001;
        let slot = TimeSlot::new(0, 0);

        let result =
            solver.check_teacher_mutual_exclusion(&schedule, &exclusion, teacher_id, &slot);
        assert!(result.is_ok(), "另一教师空闲时应该通过");
    }

    #[test]
    fn test_check_teacher_mutual_exclusion_all_time_has_conflict() {
        // 测试：全时段互斥，另一教师有课时应该失败
        let solver = create_standard_solver();
        let mut schedule = create_empty_schedule();

        let slot = TimeSlot::new(0, 0);

        // 教师1002在该时段有课
        let entry = ScheduleEntry {
            class_id: 101,
            subject_id: "MATH".to_string(),
            teacher_id: 1002,
            time_slot: slot,
            is_fixed: false,
            week_type: WeekType::Every,
        };
        schedule.add_entry(entry);

        // 教师1001与1002全时段互斥
        let exclusion = TeacherMutualExclusion::new_all_time(1001, 1002);
        let teacher_id = 1001;

        let result =
            solver.check_teacher_mutual_exclusion(&schedule, &exclusion, teacher_id, &slot);
        assert!(result.is_err(), "互斥教师有课时应该失败");
    }

    #[test]
    fn test_check_teacher_mutual_exclusion_specific_slots() {
        // 测试：特定时段互斥
        let solver = create_standard_solver();
        let mut schedule = create_empty_schedule();

        // 设置周一第1节互斥
        let exclusion_slot = TimeSlot::new(0, 0);
        let exclusion_mask = exclusion_slot.to_mask(8);
        let exclusion = TeacherMutualExclusion::new_specific_slots(1001, 1002, exclusion_mask);

        // 教师1002在周一第1节有课
        let entry = ScheduleEntry {
            class_id: 101,
            subject_id: "MATH".to_string(),
            teacher_id: 1002,
            time_slot: exclusion_slot,
            is_fixed: false,
            week_type: WeekType::Every,
        };
        schedule.add_entry(entry);

        // 测试互斥时段（应该失败）
        let result =
            solver.check_teacher_mutual_exclusion(&schedule, &exclusion, 1001, &exclusion_slot);
        assert!(result.is_err(), "互斥时段内另一教师有课时应该失败");

        // 测试非互斥时段（应该通过）
        let other_slot = TimeSlot::new(0, 1);
        let result =
            solver.check_teacher_mutual_exclusion(&schedule, &exclusion, 1001, &other_slot);
        assert!(result.is_ok(), "非互斥时段应该通过");
    }

    #[test]
    fn test_check_teacher_mutual_exclusion_bidirectional() {
        // 测试：互斥关系是双向的
        let solver = create_standard_solver();
        let mut schedule = create_empty_schedule();

        let slot = TimeSlot::new(0, 0);

        // 教师1001在该时段有课
        let entry = ScheduleEntry {
            class_id: 101,
            subject_id: "MATH".to_string(),
            teacher_id: 1001,
            time_slot: slot,
            is_fixed: false,
            week_type: WeekType::Every,
        };
        schedule.add_entry(entry);

        let exclusion = TeacherMutualExclusion::new_all_time(1001, 1002);

        // 测试教师1002（应该失败）
        let result = solver.check_teacher_mutual_exclusion(&schedule, &exclusion, 1002, &slot);
        assert!(result.is_err(), "互斥关系是双向的，教师1002也应该失败");
    }

    // ========================================================================
    // 测试组 8：连堂限制检查
    // ========================================================================

    #[test]
    fn test_check_double_session_allowed() {
        // 测试：允许连堂的课程应该通过（需求 1.6）
        let solver = create_standard_solver();
        let mut schedule = create_empty_schedule();

        let curriculum = ClassCurriculum::new(1, 101, "MATH".to_string(), 1001, 5);
        let mut subject = SubjectConfig::new("MATH".to_string(), "数学".to_string());
        subject.allow_double_session = true;

        let slot = TimeSlot::new(0, 1);

        // 在前一节安排同一课程
        let prev_entry = ScheduleEntry {
            class_id: 101,
            subject_id: "MATH".to_string(),
            teacher_id: 1001,
            time_slot: TimeSlot::new(0, 0),
            is_fixed: false,
            week_type: WeekType::Every,
        };
        schedule.add_entry(prev_entry);

        let result =
            solver.check_double_session_constraint(&schedule, &curriculum, &subject, &slot);
        assert!(result.is_ok(), "允许连堂的课程应该通过");
    }

    #[test]
    fn test_check_double_session_no_adjacent() {
        // 测试：前后都没有相同课程时应该通过
        let solver = create_standard_solver();
        let schedule = create_empty_schedule();

        let curriculum = ClassCurriculum::new(1, 101, "PE".to_string(), 1001, 2);
        let mut subject = SubjectConfig::new("PE".to_string(), "体育".to_string());
        subject.allow_double_session = false;

        let slot = TimeSlot::new(0, 1);

        let result =
            solver.check_double_session_constraint(&schedule, &curriculum, &subject, &slot);
        assert!(result.is_ok(), "前后都没有相同课程时应该通过");
    }

    #[test]
    fn test_check_double_session_has_previous() {
        // 测试：不允许连堂，前一节有相同课程时应该失败
        let solver = create_standard_solver();
        let mut schedule = create_empty_schedule();

        let curriculum = ClassCurriculum::new(1, 101, "PE".to_string(), 1001, 2);
        let mut subject = SubjectConfig::new("PE".to_string(), "体育".to_string());
        subject.allow_double_session = false;

        let slot = TimeSlot::new(0, 1);

        // 在前一节安排同一课程
        let prev_entry = ScheduleEntry {
            class_id: 101,
            subject_id: "PE".to_string(),
            teacher_id: 1001,
            time_slot: TimeSlot::new(0, 0),
            is_fixed: false,
            week_type: WeekType::Every,
        };
        schedule.add_entry(prev_entry);

        let result =
            solver.check_double_session_constraint(&schedule, &curriculum, &subject, &slot);
        assert!(result.is_err(), "不允许连堂，前一节有相同课程时应该失败");
    }

    #[test]
    fn test_check_double_session_has_next() {
        // 测试：不允许连堂，后一节有相同课程时应该失败
        let solver = create_standard_solver();
        let mut schedule = create_empty_schedule();

        let curriculum = ClassCurriculum::new(1, 101, "PE".to_string(), 1001, 2);
        let mut subject = SubjectConfig::new("PE".to_string(), "体育".to_string());
        subject.allow_double_session = false;

        let slot = TimeSlot::new(0, 1);

        // 在后一节安排同一课程
        let next_entry = ScheduleEntry {
            class_id: 101,
            subject_id: "PE".to_string(),
            teacher_id: 1001,
            time_slot: TimeSlot::new(0, 2),
            is_fixed: false,
            week_type: WeekType::Every,
        };
        schedule.add_entry(next_entry);

        let result =
            solver.check_double_session_constraint(&schedule, &curriculum, &subject, &slot);
        assert!(result.is_err(), "不允许连堂，后一节有相同课程时应该失败");
    }

    #[test]
    fn test_check_double_session_first_period() {
        // 测试：第一节课没有前一节，应该只检查后一节
        let solver = create_standard_solver();
        let mut schedule = create_empty_schedule();

        let curriculum = ClassCurriculum::new(1, 101, "PE".to_string(), 1001, 2);
        let mut subject = SubjectConfig::new("PE".to_string(), "体育".to_string());
        subject.allow_double_session = false;

        let slot = TimeSlot::new(0, 0); // 第一节

        // 在后一节安排同一课程
        let next_entry = ScheduleEntry {
            class_id: 101,
            subject_id: "PE".to_string(),
            teacher_id: 1001,
            time_slot: TimeSlot::new(0, 1),
            is_fixed: false,
            week_type: WeekType::Every,
        };
        schedule.add_entry(next_entry);

        let result =
            solver.check_double_session_constraint(&schedule, &curriculum, &subject, &slot);
        assert!(result.is_err(), "第一节课后一节有相同课程时应该失败");
    }

    #[test]
    fn test_check_double_session_last_period() {
        // 测试：最后一节课没有后一节，应该只检查前一节
        let solver = create_standard_solver();
        let mut schedule = create_empty_schedule();

        let curriculum = ClassCurriculum::new(1, 101, "PE".to_string(), 1001, 2);
        let mut subject = SubjectConfig::new("PE".to_string(), "体育".to_string());
        subject.allow_double_session = false;

        let slot = TimeSlot::new(0, 7); // 最后一节

        // 在前一节安排同一课程
        let prev_entry = ScheduleEntry {
            class_id: 101,
            subject_id: "PE".to_string(),
            teacher_id: 1001,
            time_slot: TimeSlot::new(0, 6),
            is_fixed: false,
            week_type: WeekType::Every,
        };
        schedule.add_entry(prev_entry);

        let result =
            solver.check_double_session_constraint(&schedule, &curriculum, &subject, &slot);
        assert!(result.is_err(), "最后一节课前一节有相同课程时应该失败");
    }

    // ========================================================================
    // 测试组 9：综合硬约束检查
    // ========================================================================

    #[test]
    fn test_check_all_hard_constraints_pass() {
        // 测试：所有硬约束都通过
        let solver = create_standard_solver();
        let schedule = create_empty_schedule();

        let curriculum = ClassCurriculum::new(1, 101, "MATH".to_string(), 1001, 5);
        let subject = SubjectConfig::new("MATH".to_string(), "数学".to_string());
        let teacher_pref = TeacherPreference::new(1001);
        let slot = TimeSlot::new(0, 0);

        let venues = HashMap::new();
        let exclusions = vec![];

        let result = solver.check_all_hard_constraints(
            &schedule,
            &curriculum,
            &slot,
            &subject,
            &teacher_pref,
            &venues,
            &exclusions,
        );

        assert!(result, "所有硬约束都满足时应该返回 true");
    }

    #[test]
    fn test_check_all_hard_constraints_forbidden_slot() {
        // 测试：违反课程禁止时段约束
        let solver = create_standard_solver();
        let schedule = create_empty_schedule();

        let curriculum = ClassCurriculum::new(1, 101, "PE".to_string(), 1001, 2);
        let mut subject = SubjectConfig::new("PE".to_string(), "体育".to_string());

        // 设置第1节为禁止时段
        let slot = TimeSlot::new(0, 0);
        subject.forbidden_slots = slot.to_mask(8);

        let teacher_pref = TeacherPreference::new(1001);
        let venues = HashMap::new();
        let exclusions = vec![];

        let result = solver.check_all_hard_constraints(
            &schedule,
            &curriculum,
            &slot,
            &subject,
            &teacher_pref,
            &venues,
            &exclusions,
        );

        assert!(!result, "违反课程禁止时段约束时应该返回 false");
    }

    #[test]
    fn test_check_all_hard_constraints_teacher_blocked() {
        // 测试：违反教师不排课时段约束
        let solver = create_standard_solver();
        let schedule = create_empty_schedule();

        let curriculum = ClassCurriculum::new(1, 101, "MATH".to_string(), 1001, 5);
        let subject = SubjectConfig::new("MATH".to_string(), "数学".to_string());

        let mut teacher_pref = TeacherPreference::new(1001);
        let slot = TimeSlot::new(0, 0);
        teacher_pref.blocked_slots = slot.to_mask(8);

        let venues = HashMap::new();
        let exclusions = vec![];

        let result = solver.check_all_hard_constraints(
            &schedule,
            &curriculum,
            &slot,
            &subject,
            &teacher_pref,
            &venues,
            &exclusions,
        );

        assert!(!result, "违反教师不排课时段约束时应该返回 false");
    }

    #[test]
    fn test_check_all_hard_constraints_teacher_conflict() {
        // 测试：违反教师时间冲突约束
        let solver = create_standard_solver();
        let mut schedule = create_empty_schedule();

        let slot = TimeSlot::new(0, 0);

        // 教师1001在该时段已有课
        let entry = ScheduleEntry {
            class_id: 102,
            subject_id: "ENGLISH".to_string(),
            teacher_id: 1001,
            time_slot: slot,
            is_fixed: false,
            week_type: WeekType::Every,
        };
        schedule.add_entry(entry);

        let curriculum = ClassCurriculum::new(1, 101, "MATH".to_string(), 1001, 5);
        let subject = SubjectConfig::new("MATH".to_string(), "数学".to_string());
        let teacher_pref = TeacherPreference::new(1001);

        let venues = HashMap::new();
        let exclusions = vec![];

        let result = solver.check_all_hard_constraints(
            &schedule,
            &curriculum,
            &slot,
            &subject,
            &teacher_pref,
            &venues,
            &exclusions,
        );

        assert!(!result, "违反教师时间冲突约束时应该返回 false");
    }

    #[test]
    fn test_check_all_hard_constraints_class_conflict() {
        // 测试：违反班级时间冲突约束
        let solver = create_standard_solver();
        let mut schedule = create_empty_schedule();

        let slot = TimeSlot::new(0, 0);

        // 班级101在该时段已有课
        let entry = ScheduleEntry {
            class_id: 101,
            subject_id: "ENGLISH".to_string(),
            teacher_id: 1002,
            time_slot: slot,
            is_fixed: false,
            week_type: WeekType::Every,
        };
        schedule.add_entry(entry);

        let curriculum = ClassCurriculum::new(1, 101, "MATH".to_string(), 1001, 5);
        let subject = SubjectConfig::new("MATH".to_string(), "数学".to_string());
        let teacher_pref = TeacherPreference::new(1001);

        let venues = HashMap::new();
        let exclusions = vec![];

        let result = solver.check_all_hard_constraints(
            &schedule,
            &curriculum,
            &slot,
            &subject,
            &teacher_pref,
            &venues,
            &exclusions,
        );

        assert!(!result, "违反班级时间冲突约束时应该返回 false");
    }

    #[test]
    fn test_check_all_hard_constraints_multiple_violations() {
        // 测试：同时违反多个硬约束（应该在第一个失败处停止）
        let solver = create_standard_solver();
        let mut schedule = create_empty_schedule();

        let slot = TimeSlot::new(0, 0);

        // 教师和班级都在该时段有课
        let entry = ScheduleEntry {
            class_id: 101,
            subject_id: "ENGLISH".to_string(),
            teacher_id: 1001,
            time_slot: slot,
            is_fixed: false,
            week_type: WeekType::Every,
        };
        schedule.add_entry(entry);

        let curriculum = ClassCurriculum::new(1, 101, "PE".to_string(), 1001, 2);
        let mut subject = SubjectConfig::new("PE".to_string(), "体育".to_string());
        subject.forbidden_slots = slot.to_mask(8); // 同时设置禁止时段

        let mut teacher_pref = TeacherPreference::new(1001);
        teacher_pref.blocked_slots = slot.to_mask(8); // 同时设置教师不排课

        let venues = HashMap::new();
        let exclusions = vec![];

        let result = solver.check_all_hard_constraints(
            &schedule,
            &curriculum,
            &slot,
            &subject,
            &teacher_pref,
            &venues,
            &exclusions,
        );

        assert!(!result, "同时违反多个硬约束时应该返回 false");
    }
}
