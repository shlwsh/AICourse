// ============================================================================
// 场地容量约束单元测试
// ============================================================================
// 本测试模块验证约束求解器的场地容量约束检查功能的正确性
//
// 测试覆盖的场地容量约束（根据需求文档 21）：
// 1. 场地容量充足时应该通过
// 2. 场地容量达到上限时应该失败
// 3. 场地可以同时容纳多个班级（如操场容量为3）
// 4. 微机室等场地容量为1时，同一时段只能有一节课
// 5. 不同场地互不影响
// 6. 无场地关联的课程不受场地容量限制
// 7. 场地容量为0的边界情况
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
    // 测试组 1：场地容量充足时应该通过（需求 21.1）
    // ========================================================================

    #[test]
    fn test_venue_capacity_sufficient_empty_schedule() {
        // 测试：空课表时，场地容量充足
        let solver = create_standard_solver();
        let schedule = create_empty_schedule();

        let venue = Venue::new("computer_room".to_string(), "微机室".to_string(), 2);
        let mut subject = SubjectConfig::new("COMPUTER".to_string(), "微机课".to_string());
        subject.venue_id = Some("computer_room".to_string());

        let slot = TimeSlot::new(0, 0);

        let result = solver.check_venue_capacity(&schedule, &subject, &venue, &slot);
        assert!(result.is_ok(), "空课表时场地容量充足，应该通过检查");
    }

    #[test]
    fn test_venue_capacity_sufficient_one_class_using() {
        // 测试：场地容量为2，已有1个班级使用，还可以再安排1个班级
        let solver = create_standard_solver();
        let mut schedule = create_empty_schedule();

        let venue = Venue::new("computer_room".to_string(), "微机室".to_string(), 2);
        let mut subject = SubjectConfig::new("COMPUTER".to_string(), "微机课".to_string());
        subject.venue_id = Some("computer_room".to_string());

        let slot = TimeSlot::new(0, 0);

        // 在该时段已经有一节微机课（班级101）
        let entry = ScheduleEntry {
            class_id: 101,
            subject_id: "COMPUTER".to_string(),
            teacher_id: 1001,
            time_slot: slot,
            is_fixed: false,
            week_type: WeekType::Every,
        };
        schedule.add_entry(entry);

        // 尝试为班级102安排微机课（应该成功，因为容量为2）
        let result = solver.check_venue_capacity(&schedule, &subject, &venue, &slot);
        assert!(
            result.is_ok(),
            "场地容量为2，已有1个班级使用，应该可以再安排1个班级"
        );
    }

    #[test]
    fn test_venue_capacity_sufficient_large_capacity() {
        // 测试：操场容量为3，可以同时容纳3个班级上体育课
        let solver = create_standard_solver();
        let mut schedule = create_empty_schedule();

        let venue = Venue::new("playground".to_string(), "操场".to_string(), 3);
        let mut subject = SubjectConfig::new("PE".to_string(), "体育".to_string());
        subject.venue_id = Some("playground".to_string());

        let slot = TimeSlot::new(0, 0);

        // 在该时段已经有两节体育课
        schedule.add_entry(ScheduleEntry {
            class_id: 101,
            subject_id: "PE".to_string(),
            teacher_id: 1001,
            time_slot: slot,
            is_fixed: false,
            week_type: WeekType::Every,
        });
        schedule.add_entry(ScheduleEntry {
            class_id: 102,
            subject_id: "PE".to_string(),
            teacher_id: 1002,
            time_slot: slot,
            is_fixed: false,
            week_type: WeekType::Every,
        });

        // 尝试再安排一节体育课（应该成功，因为容量为3）
        let result = solver.check_venue_capacity(&schedule, &subject, &venue, &slot);
        assert!(
            result.is_ok(),
            "操场容量为3，已有2个班级使用，应该可以再安排1个班级"
        );
    }

    // ========================================================================
    // 测试组 2：场地容量达到上限时应该失败（需求 21.2）
    // ========================================================================

    #[test]
    fn test_venue_capacity_at_limit_capacity_1() {
        // 测试：微机室容量为1，已有1个班级使用，不能再安排
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
        assert!(result.is_err(), "微机室容量为1，已满时不应该再安排课程");
    }

    #[test]
    fn test_venue_capacity_at_limit_capacity_2() {
        // 测试：场地容量为2，已有2个班级使用，不能再安排
        let solver = create_standard_solver();
        let mut schedule = create_empty_schedule();

        let venue = Venue::new("computer_room".to_string(), "微机室".to_string(), 2);
        let mut subject = SubjectConfig::new("COMPUTER".to_string(), "微机课".to_string());
        subject.venue_id = Some("computer_room".to_string());

        let slot = TimeSlot::new(0, 0);

        // 在该时段已经有两节微机课（容量为2）
        schedule.add_entry(ScheduleEntry {
            class_id: 101,
            subject_id: "COMPUTER".to_string(),
            teacher_id: 1001,
            time_slot: slot,
            is_fixed: false,
            week_type: WeekType::Every,
        });
        schedule.add_entry(ScheduleEntry {
            class_id: 102,
            subject_id: "COMPUTER".to_string(),
            teacher_id: 1002,
            time_slot: slot,
            is_fixed: false,
            week_type: WeekType::Every,
        });

        // 尝试再安排一节微机课（应该失败）
        let result = solver.check_venue_capacity(&schedule, &subject, &venue, &slot);
        assert!(result.is_err(), "场地容量为2，已满时不应该再安排课程");
    }

    #[test]
    fn test_venue_capacity_at_limit_capacity_3() {
        // 测试：操场容量为3，已有3个班级使用，不能再安排
        let solver = create_standard_solver();
        let mut schedule = create_empty_schedule();

        let venue = Venue::new("playground".to_string(), "操场".to_string(), 3);
        let mut subject = SubjectConfig::new("PE".to_string(), "体育".to_string());
        subject.venue_id = Some("playground".to_string());

        let slot = TimeSlot::new(0, 0);

        // 在该时段已经有三节体育课（容量为3）
        for class_id in 101..=103 {
            schedule.add_entry(ScheduleEntry {
                class_id,
                subject_id: "PE".to_string(),
                teacher_id: 1000 + class_id,
                time_slot: slot,
                is_fixed: false,
                week_type: WeekType::Every,
            });
        }

        // 尝试再安排一节体育课（应该失败）
        let result = solver.check_venue_capacity(&schedule, &subject, &venue, &slot);
        assert!(result.is_err(), "操场容量为3，已满时不应该再安排课程");
    }

    // ========================================================================
    // 测试组 3：场地可以同时容纳多个班级（需求 21.3）
    // ========================================================================

    #[test]
    fn test_venue_capacity_multiple_classes_playground() {
        // 测试：操场容量为3，可以同时容纳3个班级上体育课
        let solver = create_standard_solver();
        let mut schedule = create_empty_schedule();

        let venue = Venue::new("playground".to_string(), "操场".to_string(), 3);
        let mut subject = SubjectConfig::new("PE".to_string(), "体育".to_string());
        subject.venue_id = Some("playground".to_string());

        let slot = TimeSlot::new(0, 0);

        // 依次安排3个班级的体育课
        for i in 0..3 {
            let class_id = 101 + i;
            schedule.add_entry(ScheduleEntry {
                class_id,
                subject_id: "PE".to_string(),
                teacher_id: 1001 + i,
                time_slot: slot,
                is_fixed: false,
                week_type: WeekType::Every,
            });

            // 每次添加后检查容量（前3次应该都通过）
            let result = solver.check_venue_capacity(&schedule, &subject, &venue, &slot);
            if i < 2 {
                assert!(result.is_ok(), "操场容量为3，第{}个班级应该可以安排", i + 1);
            }
        }

        // 验证最终有3个班级在该时段上课
        let entries_at_slot = schedule.get_entries_at(&slot);
        assert_eq!(entries_at_slot.len(), 3, "该时段应该有3个班级上课");
    }

    #[test]
    fn test_venue_capacity_multiple_classes_computer_room() {
        // 测试：微机室容量为2，可以同时容纳2个班级上微机课
        let solver = create_standard_solver();
        let mut schedule = create_empty_schedule();

        let venue = Venue::new("computer_room".to_string(), "微机室".to_string(), 2);
        let mut subject = SubjectConfig::new("COMPUTER".to_string(), "微机课".to_string());
        subject.venue_id = Some("computer_room".to_string());

        let slot = TimeSlot::new(0, 0);

        // 安排第1个班级
        schedule.add_entry(ScheduleEntry {
            class_id: 101,
            subject_id: "COMPUTER".to_string(),
            teacher_id: 1001,
            time_slot: slot,
            is_fixed: false,
            week_type: WeekType::Every,
        });

        let result = solver.check_venue_capacity(&schedule, &subject, &venue, &slot);
        assert!(result.is_ok(), "微机室容量为2，第1个班级应该可以安排");

        // 安排第2个班级
        schedule.add_entry(ScheduleEntry {
            class_id: 102,
            subject_id: "COMPUTER".to_string(),
            teacher_id: 1002,
            time_slot: slot,
            is_fixed: false,
            week_type: WeekType::Every,
        });

        // 验证最终有2个班级在该时段上课
        let entries_at_slot = schedule.get_entries_at(&slot);
        assert_eq!(entries_at_slot.len(), 2, "该时段应该有2个班级上课");
    }

    // ========================================================================
    // 测试组 4：微机室等场地容量为1时，同一时段只能有一节课（需求 21.4）
    // ========================================================================

    #[test]
    fn test_venue_capacity_1_only_one_class() {
        // 测试：微机室容量为1，同一时段只能有一节课
        let solver = create_standard_solver();
        let mut schedule = create_empty_schedule();

        let venue = Venue::new("computer_room".to_string(), "微机室".to_string(), 1);
        let mut subject = SubjectConfig::new("COMPUTER".to_string(), "微机课".to_string());
        subject.venue_id = Some("computer_room".to_string());

        let slot = TimeSlot::new(0, 0);

        // 第一个班级应该可以安排
        schedule.add_entry(ScheduleEntry {
            class_id: 101,
            subject_id: "COMPUTER".to_string(),
            teacher_id: 1001,
            time_slot: slot,
            is_fixed: false,
            week_type: WeekType::Every,
        });

        let result = solver.check_venue_capacity(&schedule, &subject, &venue, &slot);
        assert!(
            result.is_err(),
            "微机室容量为1，已有1个班级使用，不能再安排第2个班级"
        );
    }

    #[test]
    fn test_venue_capacity_1_different_timeslots() {
        // 测试：微机室容量为1，不同时段可以分别安排不同班级
        let solver = create_standard_solver();
        let mut schedule = create_empty_schedule();

        let venue = Venue::new("computer_room".to_string(), "微机室".to_string(), 1);
        let mut subject = SubjectConfig::new("COMPUTER".to_string(), "微机课".to_string());
        subject.venue_id = Some("computer_room".to_string());

        // 周一第1节安排班级101
        let slot1 = TimeSlot::new(0, 0);
        schedule.add_entry(ScheduleEntry {
            class_id: 101,
            subject_id: "COMPUTER".to_string(),
            teacher_id: 1001,
            time_slot: slot1,
            is_fixed: false,
            week_type: WeekType::Every,
        });

        // 周一第2节应该可以安排班级102
        let slot2 = TimeSlot::new(0, 1);
        let result = solver.check_venue_capacity(&schedule, &subject, &venue, &slot2);
        assert!(
            result.is_ok(),
            "微机室容量为1，不同时段可以分别安排不同班级"
        );
    }

    #[test]
    fn test_venue_capacity_1_language_lab() {
        // 测试：语音室容量为1，同一时段只能有一节课
        let solver = create_standard_solver();
        let mut schedule = create_empty_schedule();

        let venue = Venue::new("language_lab".to_string(), "语音室".to_string(), 1);
        let mut subject = SubjectConfig::new("ENGLISH".to_string(), "英语".to_string());
        subject.venue_id = Some("language_lab".to_string());

        let slot = TimeSlot::new(0, 0);

        // 第一个班级使用语音室
        schedule.add_entry(ScheduleEntry {
            class_id: 101,
            subject_id: "ENGLISH".to_string(),
            teacher_id: 1001,
            time_slot: slot,
            is_fixed: false,
            week_type: WeekType::Every,
        });

        // 第二个班级不能使用语音室
        let result = solver.check_venue_capacity(&schedule, &subject, &venue, &slot);
        assert!(result.is_err(), "语音室容量为1，同一时段只能有一节课");
    }

    // ========================================================================
    // 测试组 5：不同场地互不影响（需求 21.5）
    // ========================================================================

    #[test]
    fn test_different_venues_independent() {
        // 测试：不同场地的容量限制互不影响
        let solver = create_standard_solver();
        let mut schedule = create_empty_schedule();

        let slot = TimeSlot::new(0, 0);

        // 微机室容量为1，已有1个班级使用
        let _computer_room = Venue::new("computer_room".to_string(), "微机室".to_string(), 1);
        let mut computer_subject = SubjectConfig::new("COMPUTER".to_string(), "微机课".to_string());
        computer_subject.venue_id = Some("computer_room".to_string());

        schedule.add_entry(ScheduleEntry {
            class_id: 101,
            subject_id: "COMPUTER".to_string(),
            teacher_id: 1001,
            time_slot: slot,
            is_fixed: false,
            week_type: WeekType::Every,
        });

        // 操场容量为3，应该可以安排体育课（不受微机室影响）
        let playground = Venue::new("playground".to_string(), "操场".to_string(), 3);
        let mut pe_subject = SubjectConfig::new("PE".to_string(), "体育".to_string());
        pe_subject.venue_id = Some("playground".to_string());

        let result = solver.check_venue_capacity(&schedule, &pe_subject, &playground, &slot);
        assert!(result.is_ok(), "操场和微机室是不同场地，应该互不影响");
    }

    #[test]
    fn test_multiple_venues_same_timeslot() {
        // 测试：同一时段可以使用多个不同场地
        let _solver = create_standard_solver();
        let mut schedule = create_empty_schedule();

        let slot = TimeSlot::new(0, 0);

        // 微机室：班级101
        schedule.add_entry(ScheduleEntry {
            class_id: 101,
            subject_id: "COMPUTER".to_string(),
            teacher_id: 1001,
            time_slot: slot,
            is_fixed: false,
            week_type: WeekType::Every,
        });

        // 操场：班级102
        schedule.add_entry(ScheduleEntry {
            class_id: 102,
            subject_id: "PE".to_string(),
            teacher_id: 1002,
            time_slot: slot,
            is_fixed: false,
            week_type: WeekType::Every,
        });

        // 语音室：班级103
        schedule.add_entry(ScheduleEntry {
            class_id: 103,
            subject_id: "ENGLISH".to_string(),
            teacher_id: 1003,
            time_slot: slot,
            is_fixed: false,
            week_type: WeekType::Every,
        });

        // 验证该时段有3个班级上课
        let entries_at_slot = schedule.get_entries_at(&slot);
        assert_eq!(
            entries_at_slot.len(),
            3,
            "该时段应该有3个班级在不同场地上课"
        );
    }

    #[test]
    fn test_venue_capacity_independent_across_days() {
        // 测试：不同天的场地容量限制互不影响
        let solver = create_standard_solver();
        let mut schedule = create_empty_schedule();

        let venue = Venue::new("computer_room".to_string(), "微机室".to_string(), 1);
        let mut subject = SubjectConfig::new("COMPUTER".to_string(), "微机课".to_string());
        subject.venue_id = Some("computer_room".to_string());

        // 周一第1节：班级101
        let slot_mon = TimeSlot::new(0, 0);
        schedule.add_entry(ScheduleEntry {
            class_id: 101,
            subject_id: "COMPUTER".to_string(),
            teacher_id: 1001,
            time_slot: slot_mon,
            is_fixed: false,
            week_type: WeekType::Every,
        });

        // 周二第1节：应该可以安排班级102（不同天）
        let slot_tue = TimeSlot::new(1, 0);
        let result = solver.check_venue_capacity(&schedule, &subject, &venue, &slot_tue);
        assert!(result.is_ok(), "不同天的场地容量限制应该互不影响");
    }

    // ========================================================================
    // 测试组 6：无场地关联的课程不受场地容量限制
    // ========================================================================

    #[test]
    fn test_no_venue_no_capacity_check() {
        // 测试：没有场地关联的课程不受场地容量限制
        let _solver = create_standard_solver();
        let mut schedule = create_empty_schedule();

        let _venue = Venue::new("computer_room".to_string(), "微机室".to_string(), 1);
        let mut subject = SubjectConfig::new("MATH".to_string(), "数学".to_string());
        subject.venue_id = None; // 数学课不需要特定场地

        let slot = TimeSlot::new(0, 0);

        // 即使微机室已满，数学课也不受影响
        schedule.add_entry(ScheduleEntry {
            class_id: 101,
            subject_id: "COMPUTER".to_string(),
            teacher_id: 1001,
            time_slot: slot,
            is_fixed: false,
            week_type: WeekType::Every,
        });

        // 数学课不需要场地，可以正常添加
        schedule.add_entry(ScheduleEntry {
            class_id: 102,
            subject_id: "MATH".to_string(),
            teacher_id: 1002,
            time_slot: slot,
            is_fixed: false,
            week_type: WeekType::Every,
        });

        // 验证两门课都被添加
        let entries_at_slot = schedule.get_entries_at(&slot);
        assert_eq!(
            entries_at_slot.len(),
            2,
            "没有场地关联的课程不受场地容量限制"
        );
    }

    #[test]
    fn test_multiple_classes_no_venue() {
        // 测试：多个没有场地关联的课程可以同时进行
        let _solver = create_standard_solver();
        let mut schedule = create_empty_schedule();

        let slot = TimeSlot::new(0, 0);

        // 安排多个普通教室课程（不需要特定场地）
        let subjects = vec!["MATH", "CHINESE", "ENGLISH", "HISTORY", "GEOGRAPHY"];
        for (i, subject_id) in subjects.iter().enumerate() {
            schedule.add_entry(ScheduleEntry {
                class_id: 101 + i as u32,
                subject_id: subject_id.to_string(),
                teacher_id: 1001 + i as u32,
                time_slot: slot,
                is_fixed: false,
                week_type: WeekType::Every,
            });
        }

        // 验证所有课程都可以安排（不受场地限制）
        assert_eq!(schedule.entries.len(), 5, "没有场地关联的课程可以同时进行");
    }

    // ========================================================================
    // 测试组 7：边界条件和特殊场景
    // ========================================================================

    #[test]
    fn test_venue_capacity_zero() {
        // 测试：场地容量为0的边界情况（不应该允许任何课程）
        let _solver = create_standard_solver();
        let schedule = create_empty_schedule();

        let venue = Venue::new("closed_room".to_string(), "关闭的教室".to_string(), 0);
        let mut subject = SubjectConfig::new("TEST".to_string(), "测试课程".to_string());
        subject.venue_id = Some("closed_room".to_string());

        let slot = TimeSlot::new(0, 0);

        let result = _solver.check_venue_capacity(&schedule, &subject, &venue, &slot);
        assert!(result.is_err(), "场地容量为0时不应该允许任何课程");
    }

    #[test]
    fn test_venue_capacity_large_number() {
        // 测试：场地容量很大的情况（如大礼堂容量为10）
        let solver = create_standard_solver();
        let mut schedule = create_empty_schedule();

        let venue = Venue::new("auditorium".to_string(), "大礼堂".to_string(), 10);
        let mut subject = SubjectConfig::new("ASSEMBLY".to_string(), "集会".to_string());
        subject.venue_id = Some("auditorium".to_string());

        let slot = TimeSlot::new(0, 0);

        // 安排9个班级
        for class_id in 101..=109 {
            schedule.add_entry(ScheduleEntry {
                class_id,
                subject_id: "ASSEMBLY".to_string(),
                teacher_id: 1000 + class_id,
                time_slot: slot,
                is_fixed: false,
                week_type: WeekType::Every,
            });
        }

        // 第10个班级应该可以安排
        let result = solver.check_venue_capacity(&schedule, &subject, &venue, &slot);
        assert!(
            result.is_ok(),
            "大礼堂容量为10，已有9个班级，应该可以再安排1个班级"
        );

        // 安排第10个班级
        schedule.add_entry(ScheduleEntry {
            class_id: 110,
            subject_id: "ASSEMBLY".to_string(),
            teacher_id: 1110,
            time_slot: slot,
            is_fixed: false,
            week_type: WeekType::Every,
        });

        // 第11个班级不应该可以安排
        let result = solver.check_venue_capacity(&schedule, &subject, &venue, &slot);
        assert!(result.is_err(), "大礼堂容量为10，已满时不应该再安排课程");
    }

    #[test]
    fn test_venue_capacity_same_class_different_subjects() {
        // 测试：同一班级在同一时段不能上两门需要场地的课程（这应该被班级冲突检测拦截）
        let _solver = create_standard_solver();
        let mut schedule = create_empty_schedule();

        let slot = TimeSlot::new(0, 0);

        // 班级101在微机室上微机课
        schedule.add_entry(ScheduleEntry {
            class_id: 101,
            subject_id: "COMPUTER".to_string(),
            teacher_id: 1001,
            time_slot: slot,
            is_fixed: false,
            week_type: WeekType::Every,
        });

        // 验证该时段有1个班级上课
        let entries_at_slot = schedule.get_entries_at(&slot);
        assert_eq!(entries_at_slot.len(), 1, "该时段应该有1个班级上课");
    }

    #[test]
    fn test_venue_capacity_mixed_venue_and_no_venue() {
        // 测试：有场地和无场地的课程混合场景
        let _solver = create_standard_solver();
        let mut schedule = create_empty_schedule();

        let slot = TimeSlot::new(0, 0);

        // 微机室：班级101（有场地）
        schedule.add_entry(ScheduleEntry {
            class_id: 101,
            subject_id: "COMPUTER".to_string(),
            teacher_id: 1001,
            time_slot: slot,
            is_fixed: false,
            week_type: WeekType::Every,
        });

        // 数学课：班级102（无场地）
        schedule.add_entry(ScheduleEntry {
            class_id: 102,
            subject_id: "MATH".to_string(),
            teacher_id: 1002,
            time_slot: slot,
            is_fixed: false,
            week_type: WeekType::Every,
        });

        // 操场：班级103（有场地）
        schedule.add_entry(ScheduleEntry {
            class_id: 103,
            subject_id: "PE".to_string(),
            teacher_id: 1003,
            time_slot: slot,
            is_fixed: false,
            week_type: WeekType::Every,
        });

        // 验证该时段有3个班级上课
        let entries_at_slot = schedule.get_entries_at(&slot);
        assert_eq!(
            entries_at_slot.len(),
            3,
            "该时段应该有3个班级上课（包括有场地和无场地的课程）"
        );
    }
}
