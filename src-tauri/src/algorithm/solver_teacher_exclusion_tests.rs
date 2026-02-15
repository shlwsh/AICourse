// ============================================================================
// 教师互斥约束单元测试
// ============================================================================
// 本测试模块验证教师互斥约束功能的正确性
//
// 测试覆盖的功能（需求 29）：
// 1. 全时段互斥：两位教师不能同时上课
// 2. 特定时段互斥：两位教师在特定时段不能同时上课
// 3. 互斥关系是双向的（A与B互斥，B与A也互斥）
// 4. 不在互斥关系中的教师不受影响
// 5. 多个互斥关系可以同时存在
// ============================================================================

#[cfg(test)]
mod tests {
    use crate::algorithm::solver::{ConstraintSolver, SolverConfig};
    use crate::algorithm::types::*;

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
    // 测试组 1：全时段互斥约束
    // ========================================================================

    #[test]
    fn test_all_time_exclusion_no_conflict() {
        // 测试：全时段互斥，另一教师空闲时应该通过
        let solver = create_standard_solver();
        let schedule = create_empty_schedule();

        // 创建教师1001和1002的全时段互斥关系
        let exclusion = TeacherMutualExclusion::new_all_time(1001, 1002);
        let teacher_id = 1001;
        let slot = TimeSlot::new(0, 0);

        // 教师1002在该时段空闲，教师1001应该可以安排
        let result =
            solver.check_teacher_mutual_exclusion(&schedule, &exclusion, teacher_id, &slot);
        assert!(result.is_ok(), "另一教师空闲时应该通过检查");
    }

    #[test]
    fn test_all_time_exclusion_has_conflict() {
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

        // 教师1002有课，教师1001不应该被安排
        let result =
            solver.check_teacher_mutual_exclusion(&schedule, &exclusion, teacher_id, &slot);
        assert!(result.is_err(), "互斥教师有课时应该失败");
    }

    #[test]
    fn test_all_time_exclusion_bidirectional() {
        // 测试：互斥关系是双向的（需求 29.3）
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

        // 测试教师1002（应该失败，因为互斥关系是双向的）
        let result = solver.check_teacher_mutual_exclusion(&schedule, &exclusion, 1002, &slot);
        assert!(result.is_err(), "互斥关系是双向的，教师1002也应该失败");
    }

    #[test]
    fn test_all_time_exclusion_different_slots() {
        // 测试：全时段互斥在所有时段都生效
        let solver = create_standard_solver();
        let mut schedule = create_empty_schedule();

        let exclusion = TeacherMutualExclusion::new_all_time(1001, 1002);

        // 在多个不同时段测试
        let test_slots = vec![
            TimeSlot::new(0, 0), // 周一第1节
            TimeSlot::new(2, 3), // 周三第4节
            TimeSlot::new(4, 7), // 周五第8节
        ];

        for slot in test_slots {
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

            // 教师1001不应该被安排
            let result = solver.check_teacher_mutual_exclusion(&schedule, &exclusion, 1001, &slot);
            assert!(
                result.is_err(),
                "全时段互斥在第{}天第{}节应该失败",
                slot.day + 1,
                slot.period + 1
            );
        }
    }

    // ========================================================================
    // 测试组 2：特定时段互斥约束
    // ========================================================================

    #[test]
    fn test_specific_slots_exclusion_in_range() {
        // 测试：特定时段互斥，在互斥时段内应该失败
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
    }

    #[test]
    fn test_specific_slots_exclusion_out_of_range() {
        // 测试：特定时段互斥，在非互斥时段应该通过
        let solver = create_standard_solver();
        let mut schedule = create_empty_schedule();

        // 设置周一第1节互斥
        let exclusion_slot = TimeSlot::new(0, 0);
        let exclusion_mask = exclusion_slot.to_mask(8);
        let exclusion = TeacherMutualExclusion::new_specific_slots(1001, 1002, exclusion_mask);

        // 教师1002在周一第2节有课（非互斥时段）
        let other_slot = TimeSlot::new(0, 1);
        let entry = ScheduleEntry {
            class_id: 101,
            subject_id: "MATH".to_string(),
            teacher_id: 1002,
            time_slot: other_slot,
            is_fixed: false,
            week_type: WeekType::Every,
        };
        schedule.add_entry(entry);

        // 测试非互斥时段（应该通过）
        let result =
            solver.check_teacher_mutual_exclusion(&schedule, &exclusion, 1001, &other_slot);
        assert!(result.is_ok(), "非互斥时段应该通过");
    }

    #[test]
    fn test_specific_slots_exclusion_multiple_slots() {
        // 测试：特定时段互斥可以包含多个时段
        let solver = create_standard_solver();
        let mut schedule = create_empty_schedule();

        // 设置周一前3节互斥（第1、2、3节）
        let mut exclusion_mask = 0u64;
        for period in 0..3 {
            let slot = TimeSlot::new(0, period);
            exclusion_mask |= slot.to_mask(8);
        }
        let exclusion = TeacherMutualExclusion::new_specific_slots(1001, 1002, exclusion_mask);

        // 测试互斥时段内的每一节
        for period in 0..3 {
            let slot = TimeSlot::new(0, period);

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

            // 教师1001不应该被安排
            let result = solver.check_teacher_mutual_exclusion(&schedule, &exclusion, 1001, &slot);
            assert!(result.is_err(), "互斥时段第{}节应该失败", period + 1);
        }

        // 测试非互斥时段（第4节）
        let non_exclusion_slot = TimeSlot::new(0, 3);
        let entry = ScheduleEntry {
            class_id: 102,
            subject_id: "ENGLISH".to_string(),
            teacher_id: 1002,
            time_slot: non_exclusion_slot,
            is_fixed: false,
            week_type: WeekType::Every,
        };
        schedule.add_entry(entry);

        let result =
            solver.check_teacher_mutual_exclusion(&schedule, &exclusion, 1001, &non_exclusion_slot);
        assert!(result.is_ok(), "非互斥时段第4节应该通过");
    }

    // ========================================================================
    // 测试组 3：不在互斥关系中的教师
    // ========================================================================

    #[test]
    fn test_exclusion_not_involved_teacher() {
        // 测试：不在互斥关系中的教师不受影响（需求 29.4）
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

        // 教师1001和1002互斥
        let exclusion = TeacherMutualExclusion::new_all_time(1001, 1002);

        // 测试教师1003（不在互斥关系中，应该通过）
        let result = solver.check_teacher_mutual_exclusion(&schedule, &exclusion, 1003, &slot);
        assert!(result.is_ok(), "不在互斥关系中的教师应该通过");
    }

    #[test]
    fn test_exclusion_teacher_a_checks_teacher_b() {
        // 测试：教师A检查时，教师B有课应该失败
        let solver = create_standard_solver();
        let mut schedule = create_empty_schedule();

        let slot = TimeSlot::new(0, 0);

        // 教师B（1002）在该时段有课
        let entry = ScheduleEntry {
            class_id: 101,
            subject_id: "MATH".to_string(),
            teacher_id: 1002,
            time_slot: slot,
            is_fixed: false,
            week_type: WeekType::Every,
        };
        schedule.add_entry(entry);

        let exclusion = TeacherMutualExclusion::new_all_time(1001, 1002);

        // 教师A（1001）检查
        let result = solver.check_teacher_mutual_exclusion(&schedule, &exclusion, 1001, &slot);
        assert!(result.is_err(), "教师A检查时，教师B有课应该失败");
    }

    #[test]
    fn test_exclusion_teacher_b_checks_teacher_a() {
        // 测试：教师B检查时，教师A有课应该失败
        let solver = create_standard_solver();
        let mut schedule = create_empty_schedule();

        let slot = TimeSlot::new(0, 0);

        // 教师A（1001）在该时段有课
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

        // 教师B（1002）检查
        let result = solver.check_teacher_mutual_exclusion(&schedule, &exclusion, 1002, &slot);
        assert!(result.is_err(), "教师B检查时，教师A有课应该失败");
    }

    // ========================================================================
    // 测试组 4：多个互斥关系
    // ========================================================================

    #[test]
    fn test_multiple_exclusions_independent() {
        // 测试：多个互斥关系可以同时存在且相互独立（需求 29.5）
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

        // 创建两个独立的互斥关系
        let exclusion1 = TeacherMutualExclusion::new_all_time(1001, 1002);
        let exclusion2 = TeacherMutualExclusion::new_all_time(1003, 1004);

        // 测试第一个互斥关系（教师1001应该失败）
        let result1 = solver.check_teacher_mutual_exclusion(&schedule, &exclusion1, 1001, &slot);
        assert!(result1.is_err(), "第一个互斥关系应该生效");

        // 测试第二个互斥关系（教师1003应该通过，因为教师1004没有课）
        let result2 = solver.check_teacher_mutual_exclusion(&schedule, &exclusion2, 1003, &slot);
        assert!(result2.is_ok(), "第二个互斥关系不受第一个影响");
    }

    #[test]
    fn test_multiple_exclusions_same_teacher() {
        // 测试：一个教师可以与多个教师互斥
        let solver = create_standard_solver();
        let mut schedule = create_empty_schedule();

        let slot = TimeSlot::new(0, 0);

        // 教师1001与教师1002、1003都互斥
        let exclusion1 = TeacherMutualExclusion::new_all_time(1001, 1002);
        let exclusion2 = TeacherMutualExclusion::new_all_time(1001, 1003);

        // 教师1002在该时段有课
        let entry1 = ScheduleEntry {
            class_id: 101,
            subject_id: "MATH".to_string(),
            teacher_id: 1002,
            time_slot: slot,
            is_fixed: false,
            week_type: WeekType::Every,
        };
        schedule.add_entry(entry1);

        // 测试第一个互斥关系（应该失败）
        let result1 = solver.check_teacher_mutual_exclusion(&schedule, &exclusion1, 1001, &slot);
        assert!(result1.is_err(), "教师1001与1002互斥，应该失败");

        // 测试第二个互斥关系（应该通过，因为教师1003没有课）
        let result2 = solver.check_teacher_mutual_exclusion(&schedule, &exclusion2, 1001, &slot);
        assert!(result2.is_ok(), "教师1003没有课，应该通过");
    }

    #[test]
    fn test_multiple_exclusions_chain() {
        // 测试：链式互斥关系（A与B互斥，B与C互斥）
        let solver = create_standard_solver();
        let mut schedule = create_empty_schedule();

        let slot = TimeSlot::new(0, 0);

        // 创建链式互斥：1001-1002, 1002-1003
        let exclusion1 = TeacherMutualExclusion::new_all_time(1001, 1002);
        let exclusion2 = TeacherMutualExclusion::new_all_time(1002, 1003);

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

        // 教师1001应该失败（与1002互斥）
        let result1 = solver.check_teacher_mutual_exclusion(&schedule, &exclusion1, 1001, &slot);
        assert!(result1.is_err(), "教师1001与1002互斥，应该失败");

        // 教师1003应该失败（与1002互斥）
        let result2 = solver.check_teacher_mutual_exclusion(&schedule, &exclusion2, 1003, &slot);
        assert!(result2.is_err(), "教师1003与1002互斥，应该失败");
    }

    // ========================================================================
    // 测试组 5：边界情况
    // ========================================================================

    #[test]
    fn test_exclusion_same_teacher_different_classes() {
        // 测试：互斥教师在不同班级同时有课
        let solver = create_standard_solver();
        let mut schedule = create_empty_schedule();

        let slot = TimeSlot::new(0, 0);

        // 教师1002在班级101有课
        let entry1 = ScheduleEntry {
            class_id: 101,
            subject_id: "MATH".to_string(),
            teacher_id: 1002,
            time_slot: slot,
            is_fixed: false,
            week_type: WeekType::Every,
        };
        schedule.add_entry(entry1);

        let exclusion = TeacherMutualExclusion::new_all_time(1001, 1002);

        // 教师1001不应该在任何班级被安排
        let result = solver.check_teacher_mutual_exclusion(&schedule, &exclusion, 1001, &slot);
        assert!(result.is_err(), "互斥教师有课时，不管在哪个班级都应该失败");
    }

    #[test]
    fn test_exclusion_empty_schedule() {
        // 测试：空课表时所有教师都可以安排
        let solver = create_standard_solver();
        let schedule = create_empty_schedule();

        let exclusion = TeacherMutualExclusion::new_all_time(1001, 1002);
        let slot = TimeSlot::new(0, 0);

        // 空课表时，任何教师都应该可以安排
        let result1 = solver.check_teacher_mutual_exclusion(&schedule, &exclusion, 1001, &slot);
        assert!(result1.is_ok(), "空课表时教师1001应该可以安排");

        let result2 = solver.check_teacher_mutual_exclusion(&schedule, &exclusion, 1002, &slot);
        assert!(result2.is_ok(), "空课表时教师1002应该可以安排");
    }

    #[test]
    fn test_exclusion_first_period() {
        // 测试：第一节课的互斥约束
        let solver = create_standard_solver();
        let mut schedule = create_empty_schedule();

        let slot = TimeSlot::new(0, 0); // 第一天第一节

        let entry = ScheduleEntry {
            class_id: 101,
            subject_id: "MATH".to_string(),
            teacher_id: 1002,
            time_slot: slot,
            is_fixed: false,
            week_type: WeekType::Every,
        };
        schedule.add_entry(entry);

        let exclusion = TeacherMutualExclusion::new_all_time(1001, 1002);

        let result = solver.check_teacher_mutual_exclusion(&schedule, &exclusion, 1001, &slot);
        assert!(result.is_err(), "第一节课的互斥约束应该生效");
    }

    #[test]
    fn test_exclusion_last_period() {
        // 测试：最后一节课的互斥约束
        let solver = create_standard_solver();
        let mut schedule = create_empty_schedule();

        let slot = TimeSlot::new(4, 7); // 第五天第八节

        let entry = ScheduleEntry {
            class_id: 101,
            subject_id: "MATH".to_string(),
            teacher_id: 1002,
            time_slot: slot,
            is_fixed: false,
            week_type: WeekType::Every,
        };
        schedule.add_entry(entry);

        let exclusion = TeacherMutualExclusion::new_all_time(1001, 1002);

        let result = solver.check_teacher_mutual_exclusion(&schedule, &exclusion, 1001, &slot);
        assert!(result.is_err(), "最后一节课的互斥约束应该生效");
    }

    #[test]
    fn test_exclusion_specific_slots_boundary() {
        // 测试：特定时段互斥的边界情况
        let solver = create_standard_solver();
        let mut schedule = create_empty_schedule();

        // 设置第1节和第8节互斥
        let slot1 = TimeSlot::new(0, 0);
        let slot8 = TimeSlot::new(0, 7);
        let exclusion_mask = slot1.to_mask(8) | slot8.to_mask(8);
        let exclusion = TeacherMutualExclusion::new_specific_slots(1001, 1002, exclusion_mask);

        // 教师1002在第1节有课
        let entry1 = ScheduleEntry {
            class_id: 101,
            subject_id: "MATH".to_string(),
            teacher_id: 1002,
            time_slot: slot1,
            is_fixed: false,
            week_type: WeekType::Every,
        };
        schedule.add_entry(entry1);

        // 第1节应该失败
        let result1 = solver.check_teacher_mutual_exclusion(&schedule, &exclusion, 1001, &slot1);
        assert!(result1.is_err(), "第1节在互斥范围内应该失败");

        // 第2节应该通过
        let slot2 = TimeSlot::new(0, 1);
        let result2 = solver.check_teacher_mutual_exclusion(&schedule, &exclusion, 1001, &slot2);
        assert!(result2.is_ok(), "第2节不在互斥范围内应该通过");

        // 教师1002在第8节有课
        let entry8 = ScheduleEntry {
            class_id: 102,
            subject_id: "ENGLISH".to_string(),
            teacher_id: 1002,
            time_slot: slot8,
            is_fixed: false,
            week_type: WeekType::Every,
        };
        schedule.add_entry(entry8);

        // 第8节应该失败
        let result8 = solver.check_teacher_mutual_exclusion(&schedule, &exclusion, 1001, &slot8);
        assert!(result8.is_err(), "第8节在互斥范围内应该失败");
    }
}
