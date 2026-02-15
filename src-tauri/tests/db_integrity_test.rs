// ============================================================================
// 数据库完整性集成测试
// ============================================================================
// 本测试文件验证数据库的数据完整性约束
//
// 测试内容：
// 1. 外键约束测试
// 2. 唯一约束测试
// 3. 非空约束测试
// 4. 级联删除测试
// 5. 数据一致性测试
// 6. 跨表数据完整性测试
//
// 测试策略：
// - 验证约束能够正确阻止无效操作
// - 验证级联删除能够正确清理关联数据
// - 验证数据一致性规则得到执行
// - 测试边界条件和错误场景
//
// 验证需求：
// - 需求 13：数据持久化 - 所有配置和课表数据能够可靠地保存
// - 需求 14：错误处理与验证 - 数据库操作失败时显示错误信息
// ============================================================================

use course_scheduling_system::db::class::{ClassRepository, CreateClassInput};
use course_scheduling_system::db::curriculum::{
    create_curriculum, get_curriculums_by_class, get_curriculums_by_teacher,
};
use course_scheduling_system::db::exclusion::{
    CreateTeacherMutualExclusionInput, ExclusionScope, TeacherMutualExclusionRepository,
};
use course_scheduling_system::db::fixed_course::{CreateFixedCourseInput, FixedCourseRepository};
use course_scheduling_system::db::migrations::MigrationManager;
use course_scheduling_system::db::schedule::{
    CreateScheduleEntryInput, CreateScheduleInput, ScheduleRepository,
};
use course_scheduling_system::db::subject::{CreateSubjectConfigInput, SubjectConfigRepository};
use course_scheduling_system::db::teacher::{
    CreateTeacherInput, SaveTeacherPreferenceInput, TeacherRepository,
};
use course_scheduling_system::db::venue::{CreateVenueInput, VenueRepository};
use sqlx::SqlitePool;

/// 创建测试数据库连接池
async fn setup_test_db() -> SqlitePool {
    let pool = SqlitePool::connect("sqlite::memory:")
        .await
        .expect("创建测试数据库失败");

    // 运行迁移
    let migration_manager = MigrationManager::new(&pool, "migrations")
        .await
        .expect("初始化迁移管理器失败");

    migration_manager
        .run_migrations()
        .await
        .expect("运行迁移失败");

    pool
}

// ============================================================================
// 测试 1：外键约束 - 删除有教学计划的教师
// ============================================================================

#[tokio::test]
async fn test_foreign_key_constraint_teacher_curriculum() {
    println!("\n=== 测试 1：外键约束 - 删除有教学计划的教师 ===");

    let pool = setup_test_db().await;
    let teacher_repo = TeacherRepository::new(&pool);
    let class_repo = ClassRepository::new(&pool);
    let subject_repo = SubjectConfigRepository::new(&pool);

    // 创建教师
    let teacher = teacher_repo
        .create(CreateTeacherInput {
            name: "张老师".to_string(),
            teaching_group_id: None,
        })
        .await
        .expect("创建教师失败");
    println!("✓ 创建教师，ID: {}", teacher.id);

    // 创建班级
    let class = class_repo
        .create(CreateClassInput {
            name: "初一(1)班".to_string(),
            grade_level: Some(7),
        })
        .await
        .expect("创建班级失败");
    println!("✓ 创建班级，ID: {}", class.id);

    // 创建科目
    let subject = subject_repo
        .create(CreateSubjectConfigInput {
            id: "math".to_string(),
            name: "数学".to_string(),
            forbidden_slots: 0,
            allow_double_session: true,
            venue_id: None,
            is_major_subject: true,
        })
        .await
        .expect("创建科目失败");
    println!("✓ 创建科目，ID: {}", subject.id);

    // 创建教学计划
    let curriculum_id = create_curriculum(
        &pool,
        class.id,
        &subject.id,
        teacher.id,
        4,
        false,
        &[],
        "Every",
    )
    .await
    .expect("创建教学计划失败");
    println!("✓ 创建教学计划，ID: {}", curriculum_id);

    // 尝试删除有教学计划的教师（应该失败或级联删除）
    let delete_result = teacher_repo.delete(teacher.id).await;

    // 根据数据库设计，这里可能会失败（外键约束）或成功（级联删除）
    // 我们检查教学计划是否还存在
    let curriculums = get_curriculums_by_teacher(&pool, teacher.id)
        .await
        .expect("查询教学计划失败");

    if delete_result.is_ok() {
        // 如果删除成功，教学计划应该被级联删除
        assert_eq!(curriculums.len(), 0, "教学计划应该被级联删除");
        println!("✓ 教师删除成功，教学计划被级联删除");
    } else {
        // 如果删除失败，教学计划应该仍然存在
        assert_eq!(curriculums.len(), 1, "教学计划应该仍然存在");
        println!("✓ 外键约束阻止删除有教学计划的教师");
    }

    println!("=== 测试 1 通过 ===\n");
}

// ============================================================================
// 测试 2：唯一约束 - 班级名称唯一性
// ============================================================================

#[tokio::test]
async fn test_unique_constraint_class_name() {
    println!("\n=== 测试 2：唯一约束 - 班级名称唯一性 ===");

    let pool = setup_test_db().await;
    let class_repo = ClassRepository::new(&pool);

    // 创建第一个班级
    let class1 = class_repo
        .create(CreateClassInput {
            name: "初一(1)班".to_string(),
            grade_level: Some(7),
        })
        .await
        .expect("创建第一个班级失败");
    println!("✓ 创建第一个班级，ID: {}", class1.id);

    // 尝试创建同名班级（应该失败）
    let result = class_repo
        .create(CreateClassInput {
            name: "初一(1)班".to_string(),
            grade_level: Some(7),
        })
        .await;

    assert!(result.is_err(), "创建同名班级应该失败");
    println!("✓ 唯一约束阻止创建同名班级");

    // 验证只有一个班级
    let all_classes = class_repo.find_all().await.expect("查询班级失败");
    assert_eq!(all_classes.len(), 1, "应该只有一个班级");
    println!("✓ 数据库中只有一个班级");

    println!("=== 测试 2 通过 ===\n");
}

// ============================================================================
// 测试 3：非空约束 - 教师名称不能为空
// ============================================================================

#[tokio::test]
async fn test_not_null_constraint_teacher_name() {
    println!("\n=== 测试 3：非空约束 - 教师名称不能为空 ===");

    let pool = setup_test_db().await;

    // 尝试插入名称为 NULL 的教师（应该失败）
    let result = sqlx::query(
        r#"
        INSERT INTO teachers (name, teaching_group_id, created_at, updated_at)
        VALUES (?, ?, datetime('now'), datetime('now'))
        "#,
    )
    .bind(None::<String>)
    .bind(None::<i64>)
    .execute(&pool)
    .await;

    assert!(result.is_err(), "插入名称为 NULL 的教师应该失败");
    println!("✓ 非空约束阻止插入名称为 NULL 的教师");

    println!("=== 测试 3 通过 ===\n");
}

// ============================================================================
// 测试 4：级联删除 - 删除课表时自动删除课表条目
// ============================================================================

#[tokio::test]
async fn test_cascade_delete_schedule_entries() {
    println!("\n=== 测试 4：级联删除 - 删除课表时自动删除课表条目 ===");

    let pool = setup_test_db().await;
    let schedule_repo = ScheduleRepository::new(&pool);
    let teacher_repo = TeacherRepository::new(&pool);
    let class_repo = ClassRepository::new(&pool);
    let subject_repo = SubjectConfigRepository::new(&pool);

    // 创建依赖数据
    let teacher = teacher_repo
        .create(CreateTeacherInput {
            name: "李老师".to_string(),
            teaching_group_id: None,
        })
        .await
        .expect("创建教师失败");

    let class = class_repo
        .create(CreateClassInput {
            name: "初二(1)班".to_string(),
            grade_level: Some(8),
        })
        .await
        .expect("创建班级失败");

    let subject = subject_repo
        .create(CreateSubjectConfigInput {
            id: "physics".to_string(),
            name: "物理".to_string(),
            forbidden_slots: 0,
            allow_double_session: true,
            venue_id: None,
            is_major_subject: true,
        })
        .await
        .expect("创建科目失败");

    // 创建课表和课表条目
    let schedule = schedule_repo
        .create_schedule(CreateScheduleInput {
            version: 1,
            cycle_days: 5,
            periods_per_day: 8,
            cost: 0,
            entries: vec![
                CreateScheduleEntryInput {
                    class_id: class.id,
                    subject_id: subject.id.clone(),
                    teacher_id: teacher.id,
                    day: 0,
                    period: 0,
                    is_fixed: false,
                    week_type: "Every".to_string(),
                },
                CreateScheduleEntryInput {
                    class_id: class.id,
                    subject_id: subject.id.clone(),
                    teacher_id: teacher.id,
                    day: 1,
                    period: 2,
                    is_fixed: false,
                    week_type: "Every".to_string(),
                },
            ],
        })
        .await
        .expect("创建课表失败");
    println!("✓ 创建课表，ID: {}", schedule.id);

    // 验证课表条目已创建
    let entries = schedule_repo
        .get_schedule_entries(schedule.id)
        .await
        .expect("查询课表条目失败");
    assert_eq!(entries.len(), 2, "应该有 2 个课表条目");
    println!("✓ 课表条目已创建，数量: {}", entries.len());

    // 删除课表
    schedule_repo
        .delete_schedule(schedule.id)
        .await
        .expect("删除课表失败");
    println!("✓ 删除课表");

    // 验证课表条目已被级联删除
    let entries_after = schedule_repo
        .get_schedule_entries(schedule.id)
        .await
        .expect("查询课表条目失败");
    assert_eq!(entries_after.len(), 0, "课表条目应该被级联删除");
    println!("✓ 课表条目已被级联删除");

    println!("=== 测试 4 通过 ===\n");
}

// ============================================================================
// 测试 5：数据一致性 - 教学计划总课时数验证
// ============================================================================

#[tokio::test]
async fn test_data_consistency_curriculum_sessions() {
    println!("\n=== 测试 5：数据一致性 - 教学计划总课时数验证 ===");

    let pool = setup_test_db().await;
    let teacher_repo = TeacherRepository::new(&pool);
    let class_repo = ClassRepository::new(&pool);
    let subject_repo = SubjectConfigRepository::new(&pool);

    // 创建依赖数据
    let teacher = teacher_repo
        .create(CreateTeacherInput {
            name: "王老师".to_string(),
            teaching_group_id: None,
        })
        .await
        .expect("创建教师失败");

    let class = class_repo
        .create(CreateClassInput {
            name: "初三(1)班".to_string(),
            grade_level: Some(9),
        })
        .await
        .expect("创建班级失败");

    subject_repo
        .create(CreateSubjectConfigInput {
            id: "chemistry".to_string(),
            name: "化学".to_string(),
            forbidden_slots: 0,
            allow_double_session: true,
            venue_id: None,
            is_major_subject: true,
        })
        .await
        .expect("创建科目失败");

    // 创建教学计划
    let _curriculum_id = create_curriculum(
        &pool,
        class.id,
        "chemistry",
        teacher.id,
        4,
        false,
        &[],
        "Every",
    )
    .await
    .expect("创建教学计划失败");
    println!("✓ 创建教学计划，目标课时数: 4");

    // 验证教学计划的课时数
    let curriculums = get_curriculums_by_class(&pool, class.id)
        .await
        .expect("查询教学计划失败");
    assert_eq!(curriculums.len(), 1, "应该有 1 个教学计划");
    assert_eq!(curriculums[0].target_sessions, 4, "目标课时数应该是 4");
    println!("✓ 教学计划课时数正确");

    // 尝试创建无效的课时数（0 或负数）
    let result = sqlx::query(
        r#"
        INSERT INTO class_curriculums (
            class_id, subject_id, teacher_id, target_sessions,
            is_combined_class, combined_class_ids, week_type, created_at, updated_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
        "#,
    )
    .bind(class.id)
    .bind("chemistry")
    .bind(teacher.id)
    .bind(0) // 无效的课时数
    .bind(0)
    .bind("[]")
    .bind("Every")
    .execute(&pool)
    .await;

    assert!(result.is_err(), "创建课时数为 0 的教学计划应该失败");
    println!("✓ CHECK 约束阻止创建无效课时数的教学计划");

    println!("=== 测试 5 通过 ===\n");
}

// ============================================================================
// 测试 6：跨表数据完整性 - 固定课程与教师、班级、科目的关联
// ============================================================================

#[tokio::test]
async fn test_cross_table_data_integrity() {
    println!("\n=== 测试 6：跨表数据完整性 - 固定课程与教师、班级、科目的关联 ===");

    let pool = setup_test_db().await;
    let teacher_repo = TeacherRepository::new(&pool);
    let class_repo = ClassRepository::new(&pool);
    let subject_repo = SubjectConfigRepository::new(&pool);
    let fixed_course_repo = FixedCourseRepository::new(&pool);

    // 创建依赖数据
    let teacher = teacher_repo
        .create(CreateTeacherInput {
            name: "赵老师".to_string(),
            teaching_group_id: None,
        })
        .await
        .expect("创建教师失败");

    let class = class_repo
        .create(CreateClassInput {
            name: "高一(1)班".to_string(),
            grade_level: Some(10),
        })
        .await
        .expect("创建班级失败");

    let subject = subject_repo
        .create(CreateSubjectConfigInput {
            id: "history".to_string(),
            name: "历史".to_string(),
            forbidden_slots: 0,
            allow_double_session: false,
            venue_id: None,
            is_major_subject: false,
        })
        .await
        .expect("创建科目失败");

    // 创建固定课程
    let fixed_course = fixed_course_repo
        .create(CreateFixedCourseInput {
            class_id: class.id,
            subject_id: subject.id.clone(),
            teacher_id: teacher.id,
            day: 0,
            period: 0,
            is_pre_arranged: false,
        })
        .await
        .expect("创建固定课程失败");
    println!("✓ 创建固定课程，ID: {}", fixed_course.id);

    // 尝试创建引用不存在的教师的固定课程（应该失败）
    let result = fixed_course_repo
        .create(CreateFixedCourseInput {
            class_id: class.id,
            subject_id: subject.id.clone(),
            teacher_id: 999, // 不存在的教师 ID
            day: 1,
            period: 1,
            is_pre_arranged: false,
        })
        .await;

    assert!(result.is_err(), "创建引用不存在教师的固定课程应该失败");
    println!("✓ 外键约束阻止创建引用不存在教师的固定课程");

    // 尝试创建引用不存在的班级的固定课程（应该失败）
    let result = fixed_course_repo
        .create(CreateFixedCourseInput {
            class_id: 999, // 不存在的班级 ID
            subject_id: subject.id.clone(),
            teacher_id: teacher.id,
            day: 1,
            period: 1,
            is_pre_arranged: false,
        })
        .await;

    assert!(result.is_err(), "创建引用不存在班级的固定课程应该失败");
    println!("✓ 外键约束阻止创建引用不存在班级的固定课程");

    // 尝试创建引用不存在的科目的固定课程（应该失败）
    let result = fixed_course_repo
        .create(CreateFixedCourseInput {
            class_id: class.id,
            subject_id: "nonexistent".to_string(), // 不存在的科目 ID
            teacher_id: teacher.id,
            day: 1,
            period: 1,
            is_pre_arranged: false,
        })
        .await;

    assert!(result.is_err(), "创建引用不存在科目的固定课程应该失败");
    println!("✓ 外键约束阻止创建引用不存在科目的固定课程");

    println!("=== 测试 6 通过 ===\n");
}

// ============================================================================
// 测试 7：级联删除 - 删除班级时级联删除教学计划
// ============================================================================

#[tokio::test]
async fn test_cascade_delete_class_curriculums() {
    println!("\n=== 测试 7：级联删除 - 删除班级时级联删除教学计划 ===");

    let pool = setup_test_db().await;
    let teacher_repo = TeacherRepository::new(&pool);
    let class_repo = ClassRepository::new(&pool);
    let subject_repo = SubjectConfigRepository::new(&pool);

    // 创建依赖数据
    let teacher = teacher_repo
        .create(CreateTeacherInput {
            name: "钱老师".to_string(),
            teaching_group_id: None,
        })
        .await
        .expect("创建教师失败");

    let class = class_repo
        .create(CreateClassInput {
            name: "高二(1)班".to_string(),
            grade_level: Some(11),
        })
        .await
        .expect("创建班级失败");

    subject_repo
        .create(CreateSubjectConfigInput {
            id: "geography".to_string(),
            name: "地理".to_string(),
            forbidden_slots: 0,
            allow_double_session: false,
            venue_id: None,
            is_major_subject: false,
        })
        .await
        .expect("创建科目失败");

    // 创建教学计划
    let curriculum_id = create_curriculum(
        &pool,
        class.id,
        "geography",
        teacher.id,
        2,
        false,
        &[],
        "Every",
    )
    .await
    .expect("创建教学计划失败");
    println!("✓ 创建教学计划，ID: {}", curriculum_id);

    // 验证教学计划已创建
    let curriculums = get_curriculums_by_class(&pool, class.id)
        .await
        .expect("查询教学计划失败");
    assert_eq!(curriculums.len(), 1, "应该有 1 个教学计划");
    println!("✓ 教学计划已创建");

    // 删除班级
    class_repo.delete(class.id).await.expect("删除班级失败");
    println!("✓ 删除班级");

    // 验证教学计划已被级联删除
    let curriculums_after = get_curriculums_by_class(&pool, class.id)
        .await
        .expect("查询教学计划失败");
    assert_eq!(curriculums_after.len(), 0, "教学计划应该被级联删除");
    println!("✓ 教学计划已被级联删除");

    println!("=== 测试 7 通过 ===\n");
}

// ============================================================================
// 测试 8：级联删除 - 删除班级时级联删除固定课程
// ============================================================================

#[tokio::test]
async fn test_cascade_delete_class_fixed_courses() {
    println!("\n=== 测试 8：级联删除 - 删除班级时级联删除固定课程 ===");

    let pool = setup_test_db().await;
    let teacher_repo = TeacherRepository::new(&pool);
    let class_repo = ClassRepository::new(&pool);
    let subject_repo = SubjectConfigRepository::new(&pool);
    let fixed_course_repo = FixedCourseRepository::new(&pool);

    // 创建依赖数据
    let teacher = teacher_repo
        .create(CreateTeacherInput {
            name: "孙老师".to_string(),
            teaching_group_id: None,
        })
        .await
        .expect("创建教师失败");

    let class = class_repo
        .create(CreateClassInput {
            name: "高三(1)班".to_string(),
            grade_level: Some(12),
        })
        .await
        .expect("创建班级失败");

    let subject = subject_repo
        .create(CreateSubjectConfigInput {
            id: "politics".to_string(),
            name: "政治".to_string(),
            forbidden_slots: 0,
            allow_double_session: false,
            venue_id: None,
            is_major_subject: false,
        })
        .await
        .expect("创建科目失败");

    // 创建固定课程
    let fixed_course = fixed_course_repo
        .create(CreateFixedCourseInput {
            class_id: class.id,
            subject_id: subject.id.clone(),
            teacher_id: teacher.id,
            day: 0,
            period: 0,
            is_pre_arranged: false,
        })
        .await
        .expect("创建固定课程失败");
    println!("✓ 创建固定课程，ID: {}", fixed_course.id);

    // 验证固定课程已创建
    let fixed_courses = fixed_course_repo
        .find_by_class(class.id)
        .await
        .expect("查询固定课程失败");
    assert_eq!(fixed_courses.len(), 1, "应该有 1 个固定课程");
    println!("✓ 固定课程已创建");

    // 删除班级
    class_repo.delete(class.id).await.expect("删除班级失败");
    println!("✓ 删除班级");

    // 验证固定课程已被级联删除
    let fixed_courses_after = fixed_course_repo
        .find_by_class(class.id)
        .await
        .expect("查询固定课程失败");
    assert_eq!(fixed_courses_after.len(), 0, "固定课程应该被级联删除");
    println!("✓ 固定课程已被级联删除");

    println!("=== 测试 8 通过 ===\n");
}

// ============================================================================
// 测试 9：级联删除 - 删除教师时级联删除教师偏好
// ============================================================================

#[tokio::test]
async fn test_cascade_delete_teacher_preferences() {
    println!("\n=== 测试 9：级联删除 - 删除教师时级联删除教师偏好 ===");

    let pool = setup_test_db().await;
    let teacher_repo = TeacherRepository::new(&pool);

    // 创建教师
    let teacher = teacher_repo
        .create(CreateTeacherInput {
            name: "周老师".to_string(),
            teaching_group_id: None,
        })
        .await
        .expect("创建教师失败");
    println!("✓ 创建教师，ID: {}", teacher.id);

    // 创建教师偏好
    teacher_repo
        .save_preference(SaveTeacherPreferenceInput {
            teacher_id: teacher.id,
            preferred_slots: 0b1111111111111111,
            time_bias: 1,
            weight: 10,
            blocked_slots: 0,
        })
        .await
        .expect("创建教师偏好失败");
    println!("✓ 创建教师偏好");

    // 验证教师偏好已创建
    let preference = teacher_repo
        .find_preference(teacher.id)
        .await
        .expect("查询教师偏好失败");
    assert!(preference.is_some(), "教师偏好应该存在");
    println!("✓ 教师偏好已创建");

    // 删除教师
    teacher_repo.delete(teacher.id).await.expect("删除教师失败");
    println!("✓ 删除教师");

    // 验证教师偏好已被级联删除
    let preference_after = teacher_repo
        .find_preference(teacher.id)
        .await
        .expect("查询教师偏好失败");
    assert!(preference_after.is_none(), "教师偏好应该被级联删除");
    println!("✓ 教师偏好已被级联删除");

    println!("=== 测试 9 通过 ===\n");
}

// ============================================================================
// 测试 10：级联删除 - 删除教师时级联删除教师互斥关系
// ============================================================================

#[tokio::test]
async fn test_cascade_delete_teacher_mutual_exclusions() {
    println!("\n=== 测试 10：级联删除 - 删除教师时级联删除教师互斥关系 ===");

    let pool = setup_test_db().await;
    let teacher_repo = TeacherRepository::new(&pool);
    let exclusion_repo = TeacherMutualExclusionRepository::new(&pool);

    // 创建两位教师
    let teacher1 = teacher_repo
        .create(CreateTeacherInput {
            name: "吴老师".to_string(),
            teaching_group_id: None,
        })
        .await
        .expect("创建教师1失败");

    let teacher2 = teacher_repo
        .create(CreateTeacherInput {
            name: "郑老师".to_string(),
            teaching_group_id: None,
        })
        .await
        .expect("创建教师2失败");

    // 创建教师互斥关系
    let exclusion = exclusion_repo
        .create(CreateTeacherMutualExclusionInput {
            teacher_a_id: teacher1.id,
            teacher_b_id: teacher2.id,
            scope: ExclusionScope::AllTime,
        })
        .await
        .expect("创建教师互斥关系失败");
    println!("✓ 创建教师互斥关系，ID: {}", exclusion.id);

    // 验证互斥关系已创建
    let exclusions = exclusion_repo
        .find_all()
        .await
        .expect("查询教师互斥关系失败");
    assert_eq!(exclusions.len(), 1, "应该有 1 个教师互斥关系");
    println!("✓ 教师互斥关系已创建");

    // 删除教师1
    teacher_repo
        .delete(teacher1.id)
        .await
        .expect("删除教师1失败");
    println!("✓ 删除教师1");

    // 验证互斥关系已被级联删除
    let exclusions_after = exclusion_repo
        .find_all()
        .await
        .expect("查询教师互斥关系失败");
    assert_eq!(exclusions_after.len(), 0, "教师互斥关系应该被级联删除");
    println!("✓ 教师互斥关系已被级联删除");

    println!("=== 测试 10 通过 ===\n");
}

// ============================================================================
// 测试 11：CHECK 约束 - 场地容量必须大于 0
// ============================================================================

#[tokio::test]
async fn test_check_constraint_venue_capacity() {
    println!("\n=== 测试 11：CHECK 约束 - 场地容量必须大于 0 ===");

    let pool = setup_test_db().await;
    let venue_repo = VenueRepository::new(&pool);

    // 尝试创建容量为 0 的场地（应该失败）
    let result = venue_repo
        .create(CreateVenueInput {
            id: "invalid_venue".to_string(),
            name: "无效场地".to_string(),
            capacity: 0,
        })
        .await;

    assert!(result.is_err(), "创建容量为 0 的场地应该失败");
    println!("✓ CHECK 约束阻止创建容量为 0 的场地");

    // 创建有效的场地
    let venue = venue_repo
        .create(CreateVenueInput {
            id: "valid_venue".to_string(),
            name: "有效场地".to_string(),
            capacity: 2,
        })
        .await
        .expect("创建有效场地失败");
    println!("✓ 创建有效场地成功，容量: {}", venue.capacity);

    println!("=== 测试 11 通过 ===\n");
}

// ============================================================================
// 测试 12：CHECK 约束 - 教师互斥关系中两个教师不能相同
// ============================================================================

#[tokio::test]
async fn test_check_constraint_exclusion_different_teachers() {
    println!("\n=== 测试 12：CHECK 约束 - 教师互斥关系中两个教师不能相同 ===");

    let pool = setup_test_db().await;
    let teacher_repo = TeacherRepository::new(&pool);
    let exclusion_repo = TeacherMutualExclusionRepository::new(&pool);

    // 创建教师
    let teacher = teacher_repo
        .create(CreateTeacherInput {
            name: "王老师".to_string(),
            teaching_group_id: None,
        })
        .await
        .expect("创建教师失败");

    // 尝试创建自己与自己的互斥关系（应该失败）
    let result = exclusion_repo
        .create(CreateTeacherMutualExclusionInput {
            teacher_a_id: teacher.id,
            teacher_b_id: teacher.id, // 相同的教师
            scope: ExclusionScope::AllTime,
        })
        .await;

    assert!(result.is_err(), "创建自己与自己的互斥关系应该失败");
    println!("✓ CHECK 约束阻止创建自己与自己的互斥关系");

    println!("=== 测试 12 通过 ===\n");
}

// ============================================================================
// 测试 13：CHECK 约束 - 时间槽位范围验证
// ============================================================================

#[tokio::test]
async fn test_check_constraint_time_slot_range() {
    println!("\n=== 测试 13：CHECK 约束 - 时间槽位范围验证 ===");

    let pool = setup_test_db().await;
    let teacher_repo = TeacherRepository::new(&pool);
    let class_repo = ClassRepository::new(&pool);
    let subject_repo = SubjectConfigRepository::new(&pool);
    let fixed_course_repo = FixedCourseRepository::new(&pool);

    // 创建依赖数据
    let teacher = teacher_repo
        .create(CreateTeacherInput {
            name: "陈老师".to_string(),
            teaching_group_id: None,
        })
        .await
        .expect("创建教师失败");

    let class = class_repo
        .create(CreateClassInput {
            name: "测试班级".to_string(),
            grade_level: Some(7),
        })
        .await
        .expect("创建班级失败");

    let subject = subject_repo
        .create(CreateSubjectConfigInput {
            id: "test_subject".to_string(),
            name: "测试科目".to_string(),
            forbidden_slots: 0,
            allow_double_session: true,
            venue_id: None,
            is_major_subject: false,
        })
        .await
        .expect("创建科目失败");

    // 尝试创建 day 超出范围的固定课程（应该失败）
    let result = fixed_course_repo
        .create(CreateFixedCourseInput {
            class_id: class.id,
            subject_id: subject.id.clone(),
            teacher_id: teacher.id,
            day: 30, // 超出范围（0-29）
            period: 0,
            is_pre_arranged: false,
        })
        .await;

    assert!(result.is_err(), "创建 day 超出范围的固定课程应该失败");
    println!("✓ CHECK 约束阻止创建 day 超出范围的固定课程");

    // 尝试创建 period 超出范围的固定课程（应该失败）
    let result = fixed_course_repo
        .create(CreateFixedCourseInput {
            class_id: class.id,
            subject_id: subject.id.clone(),
            teacher_id: teacher.id,
            day: 0,
            period: 12, // 超出范围（0-11）
            is_pre_arranged: false,
        })
        .await;

    assert!(result.is_err(), "创建 period 超出范围的固定课程应该失败");
    println!("✓ CHECK 约束阻止创建 period 超出范围的固定课程");

    // 创建有效的固定课程
    let valid_course = fixed_course_repo
        .create(CreateFixedCourseInput {
            class_id: class.id,
            subject_id: subject.id.clone(),
            teacher_id: teacher.id,
            day: 0,
            period: 0,
            is_pre_arranged: false,
        })
        .await
        .expect("创建有效固定课程失败");
    println!("✓ 创建有效固定课程成功，ID: {}", valid_course.id);

    println!("=== 测试 13 通过 ===\n");
}

// ============================================================================
// 测试 14：数据一致性 - 课表周期和节次数验证
// ============================================================================

#[tokio::test]
async fn test_data_consistency_schedule_cycle_and_periods() {
    println!("\n=== 测试 14：数据一致性 - 课表周期和节次数验证 ===");

    let pool = setup_test_db().await;
    let schedule_repo = ScheduleRepository::new(&pool);

    // 创建有效的课表
    let schedule = schedule_repo
        .create_schedule(CreateScheduleInput {
            version: 1,
            cycle_days: 5,
            periods_per_day: 8,
            cost: 0,
            entries: vec![],
        })
        .await
        .expect("创建有效课表失败");
    println!(
        "✓ 创建有效课表，周期: {} 天，每天节次: {}",
        schedule.cycle_days, schedule.periods_per_day
    );

    // 尝试创建周期天数为 0 的课表（应该失败）
    let result = sqlx::query(
        r#"
        INSERT INTO schedules (version, cycle_days, periods_per_day, cost, is_active, created_at)
        VALUES (?, ?, ?, ?, ?, datetime('now'))
        "#,
    )
    .bind(2)
    .bind(0) // 无效的周期天数
    .bind(8)
    .bind(0)
    .bind(1)
    .execute(&pool)
    .await;

    assert!(result.is_err(), "创建周期天数为 0 的课表应该失败");
    println!("✓ CHECK 约束阻止创建周期天数为 0 的课表");

    // 尝试创建周期天数超过 30 的课表（应该失败）
    let result = sqlx::query(
        r#"
        INSERT INTO schedules (version, cycle_days, periods_per_day, cost, is_active, created_at)
        VALUES (?, ?, ?, ?, ?, datetime('now'))
        "#,
    )
    .bind(2)
    .bind(31) // 超出范围
    .bind(8)
    .bind(0)
    .bind(1)
    .execute(&pool)
    .await;

    assert!(result.is_err(), "创建周期天数超过 30 的课表应该失败");
    println!("✓ CHECK 约束阻止创建周期天数超过 30 的课表");

    // 尝试创建每天节次数为 0 的课表（应该失败）
    let result = sqlx::query(
        r#"
        INSERT INTO schedules (version, cycle_days, periods_per_day, cost, is_active, created_at)
        VALUES (?, ?, ?, ?, ?, datetime('now'))
        "#,
    )
    .bind(2)
    .bind(5)
    .bind(0) // 无效的节次数
    .bind(0)
    .bind(1)
    .execute(&pool)
    .await;

    assert!(result.is_err(), "创建每天节次数为 0 的课表应该失败");
    println!("✓ CHECK 约束阻止创建每天节次数为 0 的课表");

    // 尝试创建每天节次数超过 12 的课表（应该失败）
    let result = sqlx::query(
        r#"
        INSERT INTO schedules (version, cycle_days, periods_per_day, cost, is_active, created_at)
        VALUES (?, ?, ?, ?, ?, datetime('now'))
        "#,
    )
    .bind(2)
    .bind(5)
    .bind(13) // 超出范围
    .bind(0)
    .bind(1)
    .execute(&pool)
    .await;

    assert!(result.is_err(), "创建每天节次数超过 12 的课表应该失败");
    println!("✓ CHECK 约束阻止创建每天节次数超过 12 的课表");

    println!("=== 测试 14 通过 ===\n");
}

// ============================================================================
// 测试 15：复杂场景 - 多层级联删除
// ============================================================================

#[tokio::test]
async fn test_complex_cascade_delete() {
    println!("\n=== 测试 15：复杂场景 - 多层级联删除 ===");

    let pool = setup_test_db().await;
    let teacher_repo = TeacherRepository::new(&pool);
    let class_repo = ClassRepository::new(&pool);
    let subject_repo = SubjectConfigRepository::new(&pool);
    let schedule_repo = ScheduleRepository::new(&pool);

    // 创建依赖数据
    let teacher = teacher_repo
        .create(CreateTeacherInput {
            name: "林老师".to_string(),
            teaching_group_id: None,
        })
        .await
        .expect("创建教师失败");

    let class = class_repo
        .create(CreateClassInput {
            name: "复杂测试班".to_string(),
            grade_level: Some(8),
        })
        .await
        .expect("创建班级失败");

    let subject = subject_repo
        .create(CreateSubjectConfigInput {
            id: "complex_subject".to_string(),
            name: "复杂科目".to_string(),
            forbidden_slots: 0,
            allow_double_session: true,
            venue_id: None,
            is_major_subject: false,
        })
        .await
        .expect("创建科目失败");

    // 创建教学计划
    let curriculum_id = create_curriculum(
        &pool,
        class.id,
        &subject.id,
        teacher.id,
        3,
        false,
        &[],
        "Every",
    )
    .await
    .expect("创建教学计划失败");
    println!("✓ 创建教学计划，ID: {}", curriculum_id);

    // 创建课表和课表条目
    let schedule = schedule_repo
        .create_schedule(CreateScheduleInput {
            version: 1,
            cycle_days: 5,
            periods_per_day: 8,
            cost: 0,
            entries: vec![
                CreateScheduleEntryInput {
                    class_id: class.id,
                    subject_id: subject.id.clone(),
                    teacher_id: teacher.id,
                    day: 0,
                    period: 0,
                    is_fixed: false,
                    week_type: "Every".to_string(),
                },
                CreateScheduleEntryInput {
                    class_id: class.id,
                    subject_id: subject.id.clone(),
                    teacher_id: teacher.id,
                    day: 1,
                    period: 2,
                    is_fixed: false,
                    week_type: "Every".to_string(),
                },
            ],
        })
        .await
        .expect("创建课表失败");
    println!("✓ 创建课表，ID: {}，包含 2 个课表条目", schedule.id);

    // 验证所有数据已创建
    let curriculums = get_curriculums_by_class(&pool, class.id)
        .await
        .expect("查询教学计划失败");
    assert_eq!(curriculums.len(), 1, "应该有 1 个教学计划");

    let entries = schedule_repo
        .get_schedule_entries(schedule.id)
        .await
        .expect("查询课表条目失败");
    assert_eq!(entries.len(), 2, "应该有 2 个课表条目");
    println!("✓ 所有数据已创建");

    // 尝试删除班级（应该失败，因为有课表条目引用该班级）
    let delete_result = class_repo.delete(class.id).await;

    if delete_result.is_err() {
        // 外键约束阻止删除有课表条目的班级
        println!("✓ 外键约束阻止删除有课表条目的班级");

        // 验证教学计划和课表条目仍然存在
        let curriculums_after = get_curriculums_by_class(&pool, class.id)
            .await
            .expect("查询教学计划失败");
        assert_eq!(curriculums_after.len(), 1, "教学计划应该仍然存在");
        println!("✓ 教学计划仍然存在");

        let entries_after = schedule_repo
            .get_schedule_entries(schedule.id)
            .await
            .expect("查询课表条目失败");
        assert_eq!(entries_after.len(), 2, "课表条目应该仍然存在");
        println!("✓ 课表条目仍然存在");

        // 先删除课表（会级联删除课表条目）
        schedule_repo
            .delete_schedule(schedule.id)
            .await
            .expect("删除课表失败");
        println!("✓ 删除课表（级联删除课表条目）");

        // 现在可以删除班级了
        class_repo.delete(class.id).await.expect("删除班级失败");
        println!("✓ 删除班级成功");

        // 验证教学计划已被级联删除
        let curriculums_final = get_curriculums_by_class(&pool, class.id)
            .await
            .expect("查询教学计划失败");
        assert_eq!(curriculums_final.len(), 0, "教学计划应该被级联删除");
        println!("✓ 教学计划已被级联删除");
    } else {
        // 如果删除成功，说明数据库设置了级联删除
        println!("✓ 班级删除成功（级联删除）");

        // 验证教学计划已被级联删除
        let curriculums_after = get_curriculums_by_class(&pool, class.id)
            .await
            .expect("查询教学计划失败");
        assert_eq!(curriculums_after.len(), 0, "教学计划应该被级联删除");
        println!("✓ 教学计划已被级联删除");
    }

    println!("=== 测试 15 通过 ===\n");
}
