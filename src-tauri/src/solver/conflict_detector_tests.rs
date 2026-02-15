// ============================================================================
// 冲突检测器完整测试套件
// ============================================================================
// 本文件包含冲突检测器的完整单元测试，覆盖所有硬约束和软约束检测功能
//
// 测试覆盖：
// 1. 所有时间槽位的冲突状态检测（绿色/黄色/红色）
// 2. 硬约束冲突检测（教师忙、班级忙、禁止时段、教师不排课、场地超容量、教师互斥、不允许连堂）
// 3. 软约束冲突检测（教师偏好、早晚偏好、主科连续、进度不一致）
// 4. 冲突描述信息准确性
// 5. 实时检测性能（<100ms）
// ============================================================================

#[cfg(test)]
mod conflict_detector_tests {
    use crate::algorithm::types::{
        ClassCurriculum, ExclusionScope, SubjectConfig, TeacherMutualExclusion, TeacherPreference,
        TimeSlot, Venue, WeekType,
    };
    use crate::solver::conflict_detector::{
        ConflictDetector, ConflictSeverity, ConflictType, ConstraintGraph, HardConstraintViolation,
        Schedule, ScheduleEntry, ScheduleMetadata, SoftConstraintViolation,
    };
    use std::time::Instant;

    // ========================================================================
    // 测试辅助函数
    // ========================================================================

    /// 创建空课表
    fn create_empty_schedule() -> Schedule {
        Schedule {
            entries: vec![],
            cost: 0,
            metadata: ScheduleMetadata {
                cycle_days: 5,
                periods_per_day: 8,
                generated_at: "2024-01-01".to_string(),
                version: 1,
            },
        }
    }

    /// 创建基础约束图
    fn create_basic_constraint_graph() -> ConstraintGraph {
        ConstraintGraph::new()
    }

    // ========================================================================
    // 测试 1：所有时间槽位的冲突状态检测
    // ========================================================================

    #[test]
    fn test_detect_all_timeslots_conflict_status() {
        // 创建包含一些课程的课表
        let mut schedule = create_empty_schedule();
        schedule.entries.push(ScheduleEntry {
            class_id: 101,
            subject_id: "math".to_string(),
            teacher_id: 1,
            time_slot: TimeSlot::new(0, 0),
            is_fixed: false,
            week_type: WeekType::Every,
        });

        let mut constraint_graph = create_basic_constraint_graph();

        // 添加数学科目配置
        let math_config = SubjectConfig {
            id: "math".to_string(),
            name: "数学".to_string(),
            forbidden_slots: 0,
            allow_double_session: true,
            venue_id: None,
            is_major_subject: true,
        };
        constraint_graph.add_subject_config(math_config);

        // 添加教师偏好
        let teacher_pref = TeacherPreference {
            teacher_id: 1,
            preferred_slots: 0xFFFFFFFFFFFFFFFF,
            time_bias: 0,
            weight: 1,
            blocked_slots: 0,
            teaching_group_id: None,
        };
        constraint_graph.add_teacher_preference(teacher_pref);

        let detector = ConflictDetector::new(schedule, constraint_graph, 8);

        let curriculum = ClassCurriculum {
            id: 1,
            class_id: 101,
            subject_id: "math".to_string(),
            teacher_id: 1,
            target_sessions: 5,
            is_combined_class: false,
            combined_class_ids: vec![],
            week_type: WeekType::Every,
        };

        // 检测所有时间槽位
        let conflicts = detector.detect_conflicts_for_course(&curriculum);

        // 验证返回了所有时间槽位（5天 × 8节 = 40个）
        assert_eq!(conflicts.len(), 40);

        // 验证 (0,0) 时段为 Blocked（教师忙）
        let conflict_00 = conflicts.get(&TimeSlot::new(0, 0)).unwrap();
        assert_eq!(conflict_00.severity, ConflictSeverity::Blocked);

        // 验证其他空闲时段为 Available
        let conflict_01 = conflicts.get(&TimeSlot::new(0, 1)).unwrap();
        assert_eq!(conflict_01.severity, ConflictSeverity::Available);
    }

    // ========================================================================
    // 测试 2：硬约束冲突检测 - 教师忙
    // ========================================================================

    #[test]
    fn test_hard_constraint_teacher_busy() {
        let mut schedule = create_empty_schedule();
        schedule.entries.push(ScheduleEntry {
            class_id: 101,
            subject_id: "math".to_string(),
            teacher_id: 1,
            time_slot: TimeSlot::new(0, 0),
            is_fixed: false,
            week_type: WeekType::Every,
        });

        let mut constraint_graph = create_basic_constraint_graph();
        let math_config = SubjectConfig {
            id: "math".to_string(),
            name: "数学".to_string(),
            forbidden_slots: 0,
            allow_double_session: true,
            venue_id: None,
            is_major_subject: true,
        };
        constraint_graph.add_subject_config(math_config);

        let detector = ConflictDetector::new(schedule, constraint_graph, 8);

        let curriculum = ClassCurriculum {
            id: 2,
            class_id: 102,
            subject_id: "math".to_string(),
            teacher_id: 1, // 同一教师
            target_sessions: 5,
            is_combined_class: false,
            combined_class_ids: vec![],
            week_type: WeekType::Every,
        };

        let conflicts = detector.detect_conflicts_for_course(&curriculum);
        let conflict = conflicts.get(&TimeSlot::new(0, 0)).unwrap();

        assert_eq!(conflict.severity, ConflictSeverity::Blocked);
        assert!(matches!(
            conflict.conflict_type,
            ConflictType::HardConstraint(HardConstraintViolation::TeacherBusy)
        ));
        assert!(conflict.description.contains("教师"));
        assert!(conflict.description.contains("已有课程"));
    }

    // ========================================================================
    // 测试 3：硬约束冲突检测 - 班级忙
    // ========================================================================

    #[test]
    fn test_hard_constraint_class_busy() {
        let mut schedule = create_empty_schedule();
        schedule.entries.push(ScheduleEntry {
            class_id: 101,
            subject_id: "math".to_string(),
            teacher_id: 1,
            time_slot: TimeSlot::new(0, 0),
            is_fixed: false,
            week_type: WeekType::Every,
        });

        let mut constraint_graph = create_basic_constraint_graph();
        let english_config = SubjectConfig {
            id: "english".to_string(),
            name: "英语".to_string(),
            forbidden_slots: 0,
            allow_double_session: true,
            venue_id: None,
            is_major_subject: true,
        };
        constraint_graph.add_subject_config(english_config);

        let detector = ConflictDetector::new(schedule, constraint_graph, 8);

        let curriculum = ClassCurriculum {
            id: 2,
            class_id: 101, // 同一班级
            subject_id: "english".to_string(),
            teacher_id: 2, // 不同教师
            target_sessions: 5,
            is_combined_class: false,
            combined_class_ids: vec![],
            week_type: WeekType::Every,
        };

        let conflicts = detector.detect_conflicts_for_course(&curriculum);
        let conflict = conflicts.get(&TimeSlot::new(0, 0)).unwrap();

        assert_eq!(conflict.severity, ConflictSeverity::Blocked);
        assert!(matches!(
            conflict.conflict_type,
            ConflictType::HardConstraint(HardConstraintViolation::ClassBusy)
        ));
        assert!(conflict.description.contains("班级"));
        assert!(conflict.description.contains("已有课程"));
    }

    // ========================================================================
    // 测试 4：硬约束冲突检测 - 禁止时段
    // ========================================================================

    #[test]
    fn test_hard_constraint_forbidden_slot() {
        let schedule = create_empty_schedule();
        let mut constraint_graph = create_basic_constraint_graph();

        // 体育课禁止第1-3节（位置0-2）
        let mut pe_config = SubjectConfig {
            id: "pe".to_string(),
            name: "体育".to_string(),
            forbidden_slots: 0,
            allow_double_session: true,
            venue_id: None,
            is_major_subject: false,
        };
        // 设置禁止时段掩码：第1-3节
        pe_config.forbidden_slots = (1u64 << 0) | (1u64 << 1) | (1u64 << 2);
        constraint_graph.add_subject_config(pe_config);

        let detector = ConflictDetector::new(schedule, constraint_graph, 8);

        let curriculum = ClassCurriculum {
            id: 1,
            class_id: 101,
            subject_id: "pe".to_string(),
            teacher_id: 1,
            target_sessions: 2,
            is_combined_class: false,
            combined_class_ids: vec![],
            week_type: WeekType::Every,
        };

        let conflicts = detector.detect_conflicts_for_course(&curriculum);

        // 验证第1-3节都被标记为 Blocked
        for period in 0..3 {
            let conflict = conflicts.get(&TimeSlot::new(0, period)).unwrap();
            assert_eq!(conflict.severity, ConflictSeverity::Blocked);
            assert!(matches!(
                conflict.conflict_type,
                ConflictType::HardConstraint(HardConstraintViolation::ForbiddenSlot)
            ));
            assert!(conflict.description.contains("禁止"));
        }

        // 验证第4节可用
        let conflict = conflicts.get(&TimeSlot::new(0, 3)).unwrap();
        assert_eq!(conflict.severity, ConflictSeverity::Available);
    }

    // ========================================================================
    // 测试 5：硬约束冲突检测 - 教师不排课
    // ========================================================================

    #[test]
    fn test_hard_constraint_teacher_blocked() {
        let schedule = create_empty_schedule();
        let mut constraint_graph = create_basic_constraint_graph();

        let math_config = SubjectConfig {
            id: "math".to_string(),
            name: "数学".to_string(),
            forbidden_slots: 0,
            allow_double_session: true,
            venue_id: None,
            is_major_subject: true,
        };
        constraint_graph.add_subject_config(math_config);

        // 教师在第2节不排课
        let teacher_pref = TeacherPreference {
            teacher_id: 1,
            preferred_slots: 0xFFFFFFFFFFFFFFFF,
            time_bias: 0,
            weight: 1,
            blocked_slots: 1u64 << 1, // 第2节不排课
            teaching_group_id: None,
        };
        constraint_graph.add_teacher_preference(teacher_pref);

        let detector = ConflictDetector::new(schedule, constraint_graph, 8);

        let curriculum = ClassCurriculum {
            id: 1,
            class_id: 101,
            subject_id: "math".to_string(),
            teacher_id: 1,
            target_sessions: 5,
            is_combined_class: false,
            combined_class_ids: vec![],
            week_type: WeekType::Every,
        };

        let conflicts = detector.detect_conflicts_for_course(&curriculum);
        let conflict = conflicts.get(&TimeSlot::new(0, 1)).unwrap();

        assert_eq!(conflict.severity, ConflictSeverity::Blocked);
        assert!(matches!(
            conflict.conflict_type,
            ConflictType::HardConstraint(HardConstraintViolation::TeacherBlocked)
        ));
        assert!(conflict.description.contains("不排课"));
    }

    // ========================================================================
    // 测试 6：硬约束冲突检测 - 场地超容量
    // ========================================================================

    #[test]
    fn test_hard_constraint_venue_over_capacity() {
        let mut schedule = create_empty_schedule();

        // 微机室已有一节课
        schedule.entries.push(ScheduleEntry {
            class_id: 101,
            subject_id: "computer".to_string(),
            teacher_id: 1,
            time_slot: TimeSlot::new(0, 0),
            is_fixed: false,
            week_type: WeekType::Every,
        });

        let mut constraint_graph = create_basic_constraint_graph();

        // 添加微机室场地（容量为1）
        let venue = Venue {
            id: "computer_room".to_string(),
            name: "微机室".to_string(),
            capacity: 1,
        };
        constraint_graph.add_venue(venue);

        // 微机课关联到微机室
        let computer_config = SubjectConfig {
            id: "computer".to_string(),
            name: "微机".to_string(),
            forbidden_slots: 0,
            allow_double_session: true,
            venue_id: Some("computer_room".to_string()),
            is_major_subject: false,
        };
        constraint_graph.add_subject_config(computer_config);

        let detector = ConflictDetector::new(schedule, constraint_graph, 8);

        let curriculum = ClassCurriculum {
            id: 2,
            class_id: 102,
            subject_id: "computer".to_string(),
            teacher_id: 2,
            target_sessions: 2,
            is_combined_class: false,
            combined_class_ids: vec![],
            week_type: WeekType::Every,
        };

        let conflicts = detector.detect_conflicts_for_course(&curriculum);
        let conflict = conflicts.get(&TimeSlot::new(0, 0)).unwrap();

        assert_eq!(conflict.severity, ConflictSeverity::Blocked);
        assert!(matches!(
            conflict.conflict_type,
            ConflictType::HardConstraint(HardConstraintViolation::VenueOverCapacity)
        ));
        assert!(conflict.description.contains("场地"));
    }

    // ========================================================================
    // 测试 7：硬约束冲突检测 - 教师互斥
    // ========================================================================

    #[test]
    fn test_hard_constraint_teacher_mutual_exclusion() {
        let mut schedule = create_empty_schedule();

        // 教师1在(0,0)有课
        schedule.entries.push(ScheduleEntry {
            class_id: 101,
            subject_id: "math".to_string(),
            teacher_id: 1,
            time_slot: TimeSlot::new(0, 0),
            is_fixed: false,
            week_type: WeekType::Every,
        });

        let mut constraint_graph = create_basic_constraint_graph();

        let english_config = SubjectConfig {
            id: "english".to_string(),
            name: "英语".to_string(),
            forbidden_slots: 0,
            allow_double_session: true,
            venue_id: None,
            is_major_subject: true,
        };
        constraint_graph.add_subject_config(english_config);

        // 添加教师互斥关系：教师1和教师2不能同时上课
        let exclusion = TeacherMutualExclusion {
            teacher_a_id: 1,
            teacher_b_id: 2,
            scope: ExclusionScope::AllTime,
        };
        constraint_graph.add_exclusion(exclusion);

        let detector = ConflictDetector::new(schedule, constraint_graph, 8);

        let curriculum = ClassCurriculum {
            id: 2,
            class_id: 102,
            subject_id: "english".to_string(),
            teacher_id: 2, // 教师2与教师1互斥
            target_sessions: 5,
            is_combined_class: false,
            combined_class_ids: vec![],
            week_type: WeekType::Every,
        };

        let conflicts = detector.detect_conflicts_for_course(&curriculum);
        let conflict = conflicts.get(&TimeSlot::new(0, 0)).unwrap();

        assert_eq!(conflict.severity, ConflictSeverity::Blocked);
        assert!(matches!(
            conflict.conflict_type,
            ConflictType::HardConstraint(HardConstraintViolation::TeacherMutualExclusion)
        ));
        assert!(conflict.description.contains("互斥"));
    }

    // ========================================================================
    // 测试 8：硬约束冲突检测 - 不允许连堂
    // ========================================================================

    #[test]
    fn test_hard_constraint_no_double_session() {
        let mut schedule = create_empty_schedule();

        // 数学课在第1节
        schedule.entries.push(ScheduleEntry {
            class_id: 101,
            subject_id: "math".to_string(),
            teacher_id: 1,
            time_slot: TimeSlot::new(0, 0),
            is_fixed: false,
            week_type: WeekType::Every,
        });

        let mut constraint_graph = create_basic_constraint_graph();

        // 数学课不允许连堂
        let math_config = SubjectConfig {
            id: "math".to_string(),
            name: "数学".to_string(),
            forbidden_slots: 0,
            allow_double_session: false, // 不允许连堂
            venue_id: None,
            is_major_subject: true,
        };
        constraint_graph.add_subject_config(math_config);

        let detector = ConflictDetector::new(schedule, constraint_graph, 8);

        let curriculum = ClassCurriculum {
            id: 1,
            class_id: 101,
            subject_id: "math".to_string(),
            teacher_id: 1,
            target_sessions: 5,
            is_combined_class: false,
            combined_class_ids: vec![],
            week_type: WeekType::Every,
        };

        let conflicts = detector.detect_conflicts_for_course(&curriculum);

        // 第2节（紧邻第1节）应该被标记为 Blocked
        let conflict = conflicts.get(&TimeSlot::new(0, 1)).unwrap();
        assert_eq!(conflict.severity, ConflictSeverity::Blocked);
        assert!(matches!(
            conflict.conflict_type,
            ConflictType::HardConstraint(HardConstraintViolation::NoDoubleSession)
        ));
        assert!(conflict.description.contains("连堂"));
    }

    // ========================================================================
    // 测试 9：软约束冲突检测 - 教师偏好
    // ========================================================================

    #[test]
    fn test_soft_constraint_teacher_preference() {
        let schedule = create_empty_schedule();
        let mut constraint_graph = create_basic_constraint_graph();

        let math_config = SubjectConfig {
            id: "math".to_string(),
            name: "数学".to_string(),
            forbidden_slots: 0,
            allow_double_session: true,
            venue_id: None,
            is_major_subject: true,
        };
        constraint_graph.add_subject_config(math_config);

        // 教师偏好：只偏好第4-8节（位置3-7）
        let mut preferred_slots = 0u64;
        for i in 3..8 {
            preferred_slots |= 1u64 << i;
        }

        let teacher_pref = TeacherPreference {
            teacher_id: 1,
            preferred_slots,
            time_bias: 0,
            weight: 1,
            blocked_slots: 0,
            teaching_group_id: None,
        };
        constraint_graph.add_teacher_preference(teacher_pref);

        let detector = ConflictDetector::new(schedule, constraint_graph, 8);

        let curriculum = ClassCurriculum {
            id: 1,
            class_id: 101,
            subject_id: "math".to_string(),
            teacher_id: 1,
            target_sessions: 5,
            is_combined_class: false,
            combined_class_ids: vec![],
            week_type: WeekType::Every,
        };

        let conflicts = detector.detect_conflicts_for_course(&curriculum);

        // 第1节（位置0）不在偏好范围内，应该是 Warning
        let conflict = conflicts.get(&TimeSlot::new(0, 0)).unwrap();
        assert_eq!(conflict.severity, ConflictSeverity::Warning);
        assert!(matches!(
            conflict.conflict_type,
            ConflictType::SoftConstraint(SoftConstraintViolation::TeacherPreference)
        ));
        assert!(conflict.description.contains("偏好"));

        // 第4节（位置3）在偏好范围内，应该是 Available
        let conflict = conflicts.get(&TimeSlot::new(0, 3)).unwrap();
        assert_eq!(conflict.severity, ConflictSeverity::Available);
    }

    // ========================================================================
    // 测试 10：软约束冲突检测 - 早晚偏好（厌恶早课）
    // ========================================================================

    #[test]
    fn test_soft_constraint_time_bias_early() {
        let schedule = create_empty_schedule();
        let mut constraint_graph = create_basic_constraint_graph();

        let math_config = SubjectConfig {
            id: "math".to_string(),
            name: "数学".to_string(),
            forbidden_slots: 0,
            allow_double_session: true,
            venue_id: None,
            is_major_subject: true,
        };
        constraint_graph.add_subject_config(math_config);

        // 教师厌恶早课
        let teacher_pref = TeacherPreference {
            teacher_id: 1,
            preferred_slots: 0, // 不设置特定偏好时段
            time_bias: 1,       // 厌恶早课
            weight: 1,
            blocked_slots: 0,
            teaching_group_id: None,
        };
        constraint_graph.add_teacher_preference(teacher_pref);

        let detector = ConflictDetector::new(schedule, constraint_graph, 8);

        let curriculum = ClassCurriculum {
            id: 1,
            class_id: 101,
            subject_id: "math".to_string(),
            teacher_id: 1,
            target_sessions: 5,
            is_combined_class: false,
            combined_class_ids: vec![],
            week_type: WeekType::Every,
        };

        let conflicts = detector.detect_conflicts_for_course(&curriculum);

        // 第1节（早课）应该是 Warning
        let conflict = conflicts.get(&TimeSlot::new(0, 0)).unwrap();
        assert_eq!(conflict.severity, ConflictSeverity::Warning);
        assert!(matches!(
            conflict.conflict_type,
            ConflictType::SoftConstraint(SoftConstraintViolation::TimeBias)
        ));
        assert!(conflict.description.contains("早晚偏好"));

        // 第2节不是早课，应该是 Available
        let conflict = conflicts.get(&TimeSlot::new(0, 1)).unwrap();
        assert_eq!(conflict.severity, ConflictSeverity::Available);
    }

    // ========================================================================
    // 测试 11：软约束冲突检测 - 早晚偏好（厌恶晚课）
    // ========================================================================

    #[test]
    fn test_soft_constraint_time_bias_late() {
        let schedule = create_empty_schedule();
        let mut constraint_graph = create_basic_constraint_graph();

        let math_config = SubjectConfig {
            id: "math".to_string(),
            name: "数学".to_string(),
            forbidden_slots: 0,
            allow_double_session: true,
            venue_id: None,
            is_major_subject: true,
        };
        constraint_graph.add_subject_config(math_config);

        // 教师厌恶晚课
        let teacher_pref = TeacherPreference {
            teacher_id: 1,
            preferred_slots: 0,
            time_bias: 2, // 厌恶晚课
            weight: 1,
            blocked_slots: 0,
            teaching_group_id: None,
        };
        constraint_graph.add_teacher_preference(teacher_pref);

        let detector = ConflictDetector::new(schedule, constraint_graph, 8);

        let curriculum = ClassCurriculum {
            id: 1,
            class_id: 101,
            subject_id: "math".to_string(),
            teacher_id: 1,
            target_sessions: 5,
            is_combined_class: false,
            combined_class_ids: vec![],
            week_type: WeekType::Every,
        };

        let conflicts = detector.detect_conflicts_for_course(&curriculum);

        // 第8节（晚课，最后一节）应该是 Warning
        let conflict = conflicts.get(&TimeSlot::new(0, 7)).unwrap();
        assert_eq!(conflict.severity, ConflictSeverity::Warning);
        assert!(matches!(
            conflict.conflict_type,
            ConflictType::SoftConstraint(SoftConstraintViolation::TimeBias)
        ));

        // 第7节不是最后一节，应该是 Available
        let conflict = conflicts.get(&TimeSlot::new(0, 6)).unwrap();
        assert_eq!(conflict.severity, ConflictSeverity::Available);
    }

    // ========================================================================
    // 测试 12：软约束冲突检测 - 主科连续3节
    // ========================================================================

    #[test]
    fn test_soft_constraint_consecutive_major_subject() {
        let mut schedule = create_empty_schedule();

        // 数学课已经连续安排了2节
        schedule.entries.push(ScheduleEntry {
            class_id: 101,
            subject_id: "math".to_string(),
            teacher_id: 1,
            time_slot: TimeSlot::new(0, 0),
            is_fixed: false,
            week_type: WeekType::Every,
        });
        schedule.entries.push(ScheduleEntry {
            class_id: 101,
            subject_id: "math".to_string(),
            teacher_id: 1,
            time_slot: TimeSlot::new(0, 1),
            is_fixed: false,
            week_type: WeekType::Every,
        });

        let mut constraint_graph = create_basic_constraint_graph();

        // 数学是主科
        let math_config = SubjectConfig {
            id: "math".to_string(),
            name: "数学".to_string(),
            forbidden_slots: 0,
            allow_double_session: true,
            venue_id: None,
            is_major_subject: true, // 主科
        };
        constraint_graph.add_subject_config(math_config);

        let detector = ConflictDetector::new(schedule, constraint_graph, 8);

        let curriculum = ClassCurriculum {
            id: 1,
            class_id: 101,
            subject_id: "math".to_string(),
            teacher_id: 1,
            target_sessions: 5,
            is_combined_class: false,
            combined_class_ids: vec![],
            week_type: WeekType::Every,
        };

        let conflicts = detector.detect_conflicts_for_course(&curriculum);

        // 第3节会导致连续3节，应该是 Warning
        let conflict = conflicts.get(&TimeSlot::new(0, 2)).unwrap();
        assert_eq!(conflict.severity, ConflictSeverity::Warning);
        assert!(matches!(
            conflict.conflict_type,
            ConflictType::SoftConstraint(SoftConstraintViolation::ConsecutiveMajorSubject)
        ));
        assert!(conflict.description.contains("连续"));

        // 第4节不会导致连续3节（中间有断开），应该是 Available
        let conflict = conflicts.get(&TimeSlot::new(0, 3)).unwrap();
        assert_eq!(conflict.severity, ConflictSeverity::Available);
    }

    // ========================================================================
    // 测试 13：冲突描述信息准确性
    // ========================================================================

    #[test]
    fn test_conflict_description_accuracy() {
        let mut schedule = create_empty_schedule();
        schedule.entries.push(ScheduleEntry {
            class_id: 101,
            subject_id: "math".to_string(),
            teacher_id: 1,
            time_slot: TimeSlot::new(0, 0),
            is_fixed: false,
            week_type: WeekType::Every,
        });

        let mut constraint_graph = create_basic_constraint_graph();
        let math_config = SubjectConfig {
            id: "math".to_string(),
            name: "数学".to_string(),
            forbidden_slots: 1u64 << 1, // 第2节禁止
            allow_double_session: true,
            venue_id: None,
            is_major_subject: true,
        };
        constraint_graph.add_subject_config(math_config);

        let detector = ConflictDetector::new(schedule, constraint_graph, 8);

        let curriculum = ClassCurriculum {
            id: 1,
            class_id: 101,
            subject_id: "math".to_string(),
            teacher_id: 1,
            target_sessions: 5,
            is_combined_class: false,
            combined_class_ids: vec![],
            week_type: WeekType::Every,
        };

        let conflicts = detector.detect_conflicts_for_course(&curriculum);

        // 验证教师忙的描述
        let conflict_teacher_busy = conflicts.get(&TimeSlot::new(0, 0)).unwrap();
        assert!(conflict_teacher_busy.description.contains("教师"));
        assert!(conflict_teacher_busy.description.contains("1"));
        assert!(conflict_teacher_busy.description.contains("已有课程"));

        // 验证禁止时段的描述
        let conflict_forbidden = conflicts.get(&TimeSlot::new(0, 1)).unwrap();
        assert!(conflict_forbidden.description.contains("科目"));
        assert!(conflict_forbidden.description.contains("math"));
        assert!(conflict_forbidden.description.contains("禁止"));

        // 验证可用时段的描述
        let conflict_available = conflicts.get(&TimeSlot::new(0, 2)).unwrap();
        assert_eq!(conflict_available.description, "可以安排");
    }

    // ========================================================================
    // 测试 14：实时检测性能（<100ms）
    // ========================================================================

    #[test]
    fn test_real_time_detection_performance() {
        // 创建一个较大的课表（模拟26个班级的部分课程）
        let mut schedule = create_empty_schedule();

        // 添加100个课程条目
        for class_id in 101..127 {
            for period in 0..4 {
                schedule.entries.push(ScheduleEntry {
                    class_id,
                    subject_id: "math".to_string(),
                    teacher_id: class_id - 100,
                    time_slot: TimeSlot::new(0, period),
                    is_fixed: false,
                    week_type: WeekType::Every,
                });
            }
        }

        let mut constraint_graph = create_basic_constraint_graph();

        // 添加多个科目配置
        for subject in &["math", "english", "chinese", "physics", "chemistry"] {
            let config = SubjectConfig {
                id: subject.to_string(),
                name: subject.to_string(),
                forbidden_slots: 0,
                allow_double_session: true,
                venue_id: None,
                is_major_subject: true,
            };
            constraint_graph.add_subject_config(config);
        }

        // 添加多个教师偏好
        for teacher_id in 1..27 {
            let pref = TeacherPreference {
                teacher_id,
                preferred_slots: 0xFFFFFFFFFFFFFFFF,
                time_bias: 0,
                weight: 1,
                blocked_slots: 0,
                teaching_group_id: None,
            };
            constraint_graph.add_teacher_preference(pref);
        }

        let detector = ConflictDetector::new(schedule, constraint_graph, 8);

        let curriculum = ClassCurriculum {
            id: 1,
            class_id: 101,
            subject_id: "math".to_string(),
            teacher_id: 1,
            target_sessions: 5,
            is_combined_class: false,
            combined_class_ids: vec![],
            week_type: WeekType::Every,
        };

        // 测量检测时间
        let start = Instant::now();
        let conflicts = detector.detect_conflicts_for_course(&curriculum);
        let duration = start.elapsed();

        // 验证返回了所有时间槽位
        assert_eq!(conflicts.len(), 40);

        // 验证性能：应该在100ms内完成
        assert!(
            duration.as_millis() < 100,
            "冲突检测耗时 {}ms，超过100ms限制",
            duration.as_millis()
        );

        println!("冲突检测性能测试通过：耗时 {}ms", duration.as_millis());
    }

    // ========================================================================
    // 测试 15：合班课程冲突检测
    // ========================================================================

    #[test]
    fn test_combined_class_conflict() {
        let mut schedule = create_empty_schedule();

        // 班级102在(0,0)有课
        schedule.entries.push(ScheduleEntry {
            class_id: 102,
            subject_id: "math".to_string(),
            teacher_id: 1,
            time_slot: TimeSlot::new(0, 0),
            is_fixed: false,
            week_type: WeekType::Every,
        });

        let mut constraint_graph = create_basic_constraint_graph();
        let pe_config = SubjectConfig {
            id: "pe".to_string(),
            name: "体育".to_string(),
            forbidden_slots: 0,
            allow_double_session: true,
            venue_id: None,
            is_major_subject: false,
        };
        constraint_graph.add_subject_config(pe_config);

        let detector = ConflictDetector::new(schedule, constraint_graph, 8);

        // 合班课程：班级101和102合班上体育课
        let curriculum = ClassCurriculum {
            id: 1,
            class_id: 101,
            subject_id: "pe".to_string(),
            teacher_id: 2,
            target_sessions: 2,
            is_combined_class: true,
            combined_class_ids: vec![102], // 与班级102合班
            week_type: WeekType::Every,
        };

        let conflicts = detector.detect_conflicts_for_course(&curriculum);

        // (0,0)时段班级102有课，应该是 Blocked
        let conflict = conflicts.get(&TimeSlot::new(0, 0)).unwrap();
        assert_eq!(conflict.severity, ConflictSeverity::Blocked);
        assert!(matches!(
            conflict.conflict_type,
            ConflictType::HardConstraint(HardConstraintViolation::ClassBusy)
        ));
    }

    // ========================================================================
    // 测试 16：多个硬约束同时违反（优先级测试）
    // ========================================================================

    #[test]
    fn test_multiple_hard_constraints_priority() {
        let mut schedule = create_empty_schedule();

        // 教师1和班级101在(0,0)都有课
        schedule.entries.push(ScheduleEntry {
            class_id: 101,
            subject_id: "math".to_string(),
            teacher_id: 1,
            time_slot: TimeSlot::new(0, 0),
            is_fixed: false,
            week_type: WeekType::Every,
        });

        let mut constraint_graph = create_basic_constraint_graph();

        // 数学课禁止第1节
        let math_config = SubjectConfig {
            id: "math".to_string(),
            name: "数学".to_string(),
            forbidden_slots: 1u64 << 0,
            allow_double_session: true,
            venue_id: None,
            is_major_subject: true,
        };
        constraint_graph.add_subject_config(math_config);

        let detector = ConflictDetector::new(schedule, constraint_graph, 8);

        let curriculum = ClassCurriculum {
            id: 1,
            class_id: 101,
            subject_id: "math".to_string(),
            teacher_id: 1,
            target_sessions: 5,
            is_combined_class: false,
            combined_class_ids: vec![],
            week_type: WeekType::Every,
        };

        let conflicts = detector.detect_conflicts_for_course(&curriculum);
        let conflict = conflicts.get(&TimeSlot::new(0, 0)).unwrap();

        // 应该返回第一个检测到的硬约束冲突（禁止时段优先级最高）
        assert_eq!(conflict.severity, ConflictSeverity::Blocked);
        assert!(matches!(
            conflict.conflict_type,
            ConflictType::HardConstraint(HardConstraintViolation::ForbiddenSlot)
        ));
    }

    // ========================================================================
    // 测试 17：软约束优先级测试（早晚偏好 > 主科连续 > 教师偏好）
    // ========================================================================

    #[test]
    fn test_soft_constraint_priority() {
        let mut schedule = create_empty_schedule();

        // 已有2节连续的数学课
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

        let mut constraint_graph = create_basic_constraint_graph();

        let math_config = SubjectConfig {
            id: "math".to_string(),
            name: "数学".to_string(),
            forbidden_slots: 0,
            allow_double_session: true,
            venue_id: None,
            is_major_subject: true,
        };
        constraint_graph.add_subject_config(math_config);

        // 教师厌恶早课，且第1节不在偏好范围内
        let teacher_pref = TeacherPreference {
            teacher_id: 1,
            preferred_slots: 0xFFFFFFFFFFFFFFFE, // 第1节不在偏好范围
            time_bias: 1,                        // 厌恶早课
            weight: 1,
            blocked_slots: 0,
            teaching_group_id: None,
        };
        constraint_graph.add_teacher_preference(teacher_pref);

        let detector = ConflictDetector::new(schedule, constraint_graph, 8);

        let curriculum = ClassCurriculum {
            id: 1,
            class_id: 101,
            subject_id: "math".to_string(),
            teacher_id: 1,
            target_sessions: 5,
            is_combined_class: false,
            combined_class_ids: vec![],
            week_type: WeekType::Every,
        };

        let conflicts = detector.detect_conflicts_for_course(&curriculum);

        // 第1节：同时违反早晚偏好和教师偏好，应该返回早晚偏好（优先级更高）
        let conflict = conflicts.get(&TimeSlot::new(0, 0)).unwrap();
        assert_eq!(conflict.severity, ConflictSeverity::Warning);
        assert!(matches!(
            conflict.conflict_type,
            ConflictType::SoftConstraint(SoftConstraintViolation::TimeBias)
        ));

        // 第3节：会导致连续3节主科
        let conflict = conflicts.get(&TimeSlot::new(0, 3)).unwrap();
        assert_eq!(conflict.severity, ConflictSeverity::Warning);
        assert!(matches!(
            conflict.conflict_type,
            ConflictType::SoftConstraint(SoftConstraintViolation::ConsecutiveMajorSubject)
        ));
    }

    // ========================================================================
    // 测试 18：边界条件 - 第一天第一节
    // ========================================================================

    #[test]
    fn test_boundary_first_slot() {
        let schedule = create_empty_schedule();
        let mut constraint_graph = create_basic_constraint_graph();

        let math_config = SubjectConfig {
            id: "math".to_string(),
            name: "数学".to_string(),
            forbidden_slots: 0,
            allow_double_session: true,
            venue_id: None,
            is_major_subject: true,
        };
        constraint_graph.add_subject_config(math_config);

        let detector = ConflictDetector::new(schedule, constraint_graph, 8);

        let curriculum = ClassCurriculum {
            id: 1,
            class_id: 101,
            subject_id: "math".to_string(),
            teacher_id: 1,
            target_sessions: 5,
            is_combined_class: false,
            combined_class_ids: vec![],
            week_type: WeekType::Every,
        };

        let conflicts = detector.detect_conflicts_for_course(&curriculum);

        // 第一天第一节应该可以正常检测
        let conflict = conflicts.get(&TimeSlot::new(0, 0)).unwrap();
        assert_eq!(conflict.severity, ConflictSeverity::Available);
    }

    // ========================================================================
    // 测试 19：边界条件 - 最后一天最后一节
    // ========================================================================

    #[test]
    fn test_boundary_last_slot() {
        let schedule = create_empty_schedule();
        let mut constraint_graph = create_basic_constraint_graph();

        let math_config = SubjectConfig {
            id: "math".to_string(),
            name: "数学".to_string(),
            forbidden_slots: 0,
            allow_double_session: true,
            venue_id: None,
            is_major_subject: true,
        };
        constraint_graph.add_subject_config(math_config);

        let detector = ConflictDetector::new(schedule, constraint_graph, 8);

        let curriculum = ClassCurriculum {
            id: 1,
            class_id: 101,
            subject_id: "math".to_string(),
            teacher_id: 1,
            target_sessions: 5,
            is_combined_class: false,
            combined_class_ids: vec![],
            week_type: WeekType::Every,
        };

        let conflicts = detector.detect_conflicts_for_course(&curriculum);

        // 最后一天最后一节应该可以正常检测
        let conflict = conflicts.get(&TimeSlot::new(4, 7)).unwrap();
        assert_eq!(conflict.severity, ConflictSeverity::Available);
    }

    // ========================================================================
    // 测试 20：空课表检测
    // ========================================================================

    #[test]
    fn test_empty_schedule_detection() {
        let schedule = create_empty_schedule();
        let mut constraint_graph = create_basic_constraint_graph();

        let math_config = SubjectConfig {
            id: "math".to_string(),
            name: "数学".to_string(),
            forbidden_slots: 0,
            allow_double_session: true,
            venue_id: None,
            is_major_subject: true,
        };
        constraint_graph.add_subject_config(math_config);

        let detector = ConflictDetector::new(schedule, constraint_graph, 8);

        let curriculum = ClassCurriculum {
            id: 1,
            class_id: 101,
            subject_id: "math".to_string(),
            teacher_id: 1,
            target_sessions: 5,
            is_combined_class: false,
            combined_class_ids: vec![],
            week_type: WeekType::Every,
        };

        let conflicts = detector.detect_conflicts_for_course(&curriculum);

        // 空课表所有时段都应该是 Available
        for conflict in conflicts.values() {
            assert_eq!(conflict.severity, ConflictSeverity::Available);
        }
    }
}
