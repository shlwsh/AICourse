// ============================================================================
// 数据库 CRUD 操作集成测试
// ============================================================================
// 本测试文件验证所有数据访问层模块的 CRUD 操作
//
// 测试模块：
// - 教师 CRUD 测试
// - 班级 CRUD 测试
// - 科目配置 CRUD 测试
// - 教学计划 CRUD 测试
// - 课表 CRUD 测试
// - 场地 CRUD 测试
// - 固定课程 CRUD 测试
// - 教师互斥关系 CRUD 测试
//
// 测试策略：
// 1. 每个模块测试创建、查询、更新、删除的完整流程
// 2. 测试外键约束和数据完整性
// 3. 测试批量操作
// 4. 测试错误场景（如删除不存在的记录）
// ============================================================================

use course_scheduling_system::db::class::{ClassRepository, CreateClassInput, UpdateClassInput};
use course_scheduling_system::db::curriculum::{
    batch_create_curriculums, create_curriculum, delete_curriculum, get_all_curriculums,
    get_curriculum_by_id, get_curriculums_by_class, get_curriculums_by_teacher, update_curriculum,
};
use course_scheduling_system::db::exclusion::{
    CreateTeacherMutualExclusionInput, ExclusionScope, TeacherMutualExclusionRepository,
    UpdateTeacherMutualExclusionInput,
};
use course_scheduling_system::db::fixed_course::{
    CreateFixedCourseInput, FixedCourseRepository, UpdateFixedCourseInput,
};
use course_scheduling_system::db::migrations::MigrationManager;
use course_scheduling_system::db::schedule::{
    CreateScheduleEntryInput, CreateScheduleInput, ScheduleRepository, UpdateScheduleEntryInput,
    UpdateScheduleInput,
};
use course_scheduling_system::db::subject::{
    CreateSubjectConfigInput, SubjectConfigRepository, UpdateSubjectConfigInput,
};
use course_scheduling_system::db::teacher::{
    CreateTeacherInput, SaveTeacherPreferenceInput, TeacherRepository, UpdateTeacherInput,
};
use course_scheduling_system::db::venue::{CreateVenueInput, UpdateVenueInput, VenueRepository};
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
// 教师 CRUD 测试
// ============================================================================

#[tokio::test]
async fn test_teacher_crud() {
    let pool = setup_test_db().await;
    let repo = TeacherRepository::new(&pool);

    // 1. 创建教师
    let create_input = CreateTeacherInput {
        name: "张老师".to_string(),
        teaching_group_id: None,
    };

    let teacher = repo
        .create(create_input)
        .await
        .expect("Failed to create teacher");

    assert_eq!(teacher.name, "张老师");
    assert!(teacher.id > 0);
    println!("✓ 创建教师成功，ID: {}", teacher.id);

    // 2. 根据 ID 查询教师
    let found_teacher = repo
        .find_by_id(teacher.id)
        .await
        .expect("Failed to find teacher")
        .expect("Teacher not found");

    assert_eq!(found_teacher.id, teacher.id);
    assert_eq!(found_teacher.name, "张老师");
    println!("✓ 查询教师成功");

    // 3. 查询所有教师
    let all_teachers = repo.find_all().await.expect("Failed to find all teachers");

    assert_eq!(all_teachers.len(), 1);
    println!("✓ 查询所有教师成功，数量: {}", all_teachers.len());

    // 4. 更新教师信息
    let update_input = UpdateTeacherInput {
        name: Some("张三老师".to_string()),
        teaching_group_id: None,
    };

    let updated_teacher = repo
        .update(teacher.id, update_input)
        .await
        .expect("Failed to update teacher");

    assert_eq!(updated_teacher.name, "张三老师");
    println!("✓ 更新教师成功");

    // 5. 删除教师
    repo.delete(teacher.id)
        .await
        .expect("Failed to delete teacher");

    let deleted_teacher = repo
        .find_by_id(teacher.id)
        .await
        .expect("Failed to query deleted teacher");

    assert!(deleted_teacher.is_none());
    println!("✓ 删除教师成功");

    // 6. 测试删除不存在的教师（应该返回错误）
    let delete_result = repo.delete(999).await;
    assert!(delete_result.is_err());
    println!("✓ 删除不存在的教师返回错误");
}

#[tokio::test]
async fn test_teacher_preference_crud() {
    let pool = setup_test_db().await;
    let repo = TeacherRepository::new(&pool);

    // 先创建教师
    let create_input = CreateTeacherInput {
        name: "李老师".to_string(),
        teaching_group_id: None,
    };

    let teacher = repo
        .create(create_input)
        .await
        .expect("Failed to create teacher");

    // 1. 保存教师偏好
    let pref_input = SaveTeacherPreferenceInput {
        teacher_id: teacher.id,
        preferred_slots: 0b1111111111111111, // 前16个时间槽位
        time_bias: 1,                        // 厌恶早课
        weight: 10,
        blocked_slots: 0b1, // 第1个时间槽位不排课
    };

    let pref = repo
        .save_preference(pref_input.clone())
        .await
        .expect("Failed to save preference");

    assert_eq!(pref.teacher_id, teacher.id);
    assert_eq!(pref.time_bias, 1);
    assert_eq!(pref.weight, 10);
    println!("✓ 保存教师偏好成功");

    // 2. 查询教师偏好
    let found_pref = repo
        .find_preference(teacher.id)
        .await
        .expect("Failed to find preference")
        .expect("Preference not found");

    assert_eq!(found_pref.teacher_id, teacher.id);
    println!("✓ 查询教师偏好成功");

    // 3. 更新教师偏好（使用相同的 save_preference 方法）
    let updated_pref_input = SaveTeacherPreferenceInput {
        teacher_id: teacher.id,
        preferred_slots: 0b11111111111111111111, // 前20个时间槽位
        time_bias: 2,                            // 厌恶晚课
        weight: 15,
        blocked_slots: 0b11, // 前2个时间槽位不排课
    };

    let updated_pref = repo
        .save_preference(updated_pref_input)
        .await
        .expect("Failed to update preference");

    assert_eq!(updated_pref.time_bias, 2);
    assert_eq!(updated_pref.weight, 15);
    println!("✓ 更新教师偏好成功");
}

#[tokio::test]
async fn test_teacher_batch_save_preferences() {
    let pool = setup_test_db().await;
    let repo = TeacherRepository::new(&pool);

    // 创建多个教师
    let teacher1 = repo
        .create(CreateTeacherInput {
            name: "王老师".to_string(),
            teaching_group_id: None,
        })
        .await
        .expect("Failed to create teacher1");

    let teacher2 = repo
        .create(CreateTeacherInput {
            name: "赵老师".to_string(),
            teaching_group_id: None,
        })
        .await
        .expect("Failed to create teacher2");

    // 批量保存教师偏好
    let prefs = vec![
        SaveTeacherPreferenceInput {
            teacher_id: teacher1.id,
            preferred_slots: 0b1111111111111111,
            time_bias: 0,
            weight: 5,
            blocked_slots: 0,
        },
        SaveTeacherPreferenceInput {
            teacher_id: teacher2.id,
            preferred_slots: 0b11111111111111111111,
            time_bias: 1,
            weight: 8,
            blocked_slots: 0b1,
        },
    ];

    let saved_count = repo
        .batch_save_preferences(prefs)
        .await
        .expect("Failed to batch save preferences");

    assert_eq!(saved_count, 2);
    println!("✓ 批量保存教师偏好成功，数量: {}", saved_count);

    // 验证保存的偏好
    let pref1 = repo
        .find_preference(teacher1.id)
        .await
        .expect("Failed to find preference1")
        .expect("Preference1 not found");

    assert_eq!(pref1.weight, 5);

    let pref2 = repo
        .find_preference(teacher2.id)
        .await
        .expect("Failed to find preference2")
        .expect("Preference2 not found");

    assert_eq!(pref2.weight, 8);
    println!("✓ 验证批量保存的偏好成功");
}

// ============================================================================
// 班级 CRUD 测试
// ============================================================================

#[tokio::test]
async fn test_class_crud() {
    let pool = setup_test_db().await;
    let repo = ClassRepository::new(&pool);

    // 1. 创建班级
    let create_input = CreateClassInput {
        name: "初一(1)班".to_string(),
        grade_level: Some(7),
    };

    let class = repo
        .create(create_input)
        .await
        .expect("Failed to create class");

    assert_eq!(class.name, "初一(1)班");
    assert_eq!(class.grade_level, Some(7));
    println!("✓ 创建班级成功，ID: {}", class.id);

    // 2. 根据 ID 查询班级
    let found_class = repo
        .find_by_id(class.id)
        .await
        .expect("Failed to find class")
        .expect("Class not found");

    assert_eq!(found_class.id, class.id);
    assert_eq!(found_class.name, "初一(1)班");
    println!("✓ 查询班级成功");

    // 3. 查询所有班级
    let all_classes = repo.find_all().await.expect("Failed to find all classes");

    assert_eq!(all_classes.len(), 1);
    println!("✓ 查询所有班级成功，数量: {}", all_classes.len());

    // 4. 根据年级查询班级
    let grade_classes = repo
        .find_by_grade_level(7)
        .await
        .expect("Failed to find classes by grade");

    assert_eq!(grade_classes.len(), 1);
    println!("✓ 根据年级查询班级成功，数量: {}", grade_classes.len());

    // 5. 更新班级信息
    let update_input = UpdateClassInput {
        name: Some("初一(2)班".to_string()),
        grade_level: None,
    };

    let updated_class = repo
        .update(class.id, update_input)
        .await
        .expect("Failed to update class");

    assert_eq!(updated_class.name, "初一(2)班");
    println!("✓ 更新班级成功");

    // 6. 删除班级
    repo.delete(class.id).await.expect("Failed to delete class");

    let deleted_class = repo
        .find_by_id(class.id)
        .await
        .expect("Failed to query deleted class");

    assert!(deleted_class.is_none());
    println!("✓ 删除班级成功");
}

// ============================================================================
// 科目配置 CRUD 测试
// ============================================================================

#[tokio::test]
async fn test_subject_config_crud() {
    let pool = setup_test_db().await;
    let repo = SubjectConfigRepository::new(&pool);

    // 1. 创建科目配置
    let create_input = CreateSubjectConfigInput {
        id: "math".to_string(),
        name: "数学".to_string(),
        forbidden_slots: 0b111, // 禁止前3个时间槽位
        allow_double_session: true,
        venue_id: None,
        is_major_subject: true,
    };

    let subject = repo
        .create(create_input)
        .await
        .expect("Failed to create subject config");

    assert_eq!(subject.id, "math");
    assert_eq!(subject.name, "数学");
    assert_eq!(subject.is_major_subject, 1);
    println!("✓ 创建科目配置成功，ID: {}", subject.id);

    // 2. 根据 ID 查询科目配置
    let found_subject = repo
        .find_by_id("math")
        .await
        .expect("Failed to find subject config")
        .expect("Subject config not found");

    assert_eq!(found_subject.id, "math");
    assert_eq!(found_subject.name, "数学");
    println!("✓ 查询科目配置成功");

    // 3. 查询所有科目配置
    let all_subjects = repo
        .find_all()
        .await
        .expect("Failed to find all subject configs");

    assert_eq!(all_subjects.len(), 1);
    println!("✓ 查询所有科目配置成功，数量: {}", all_subjects.len());

    // 4. 查询所有主科配置
    let major_subjects = repo
        .find_major_subjects()
        .await
        .expect("Failed to find major subjects");

    assert_eq!(major_subjects.len(), 1);
    println!("✓ 查询主科配置成功，数量: {}", major_subjects.len());

    // 5. 更新科目配置
    let update_input = UpdateSubjectConfigInput {
        name: Some("数学课".to_string()),
        forbidden_slots: Some(0b1111), // 禁止前4个时间槽位
        allow_double_session: Some(false),
        venue_id: None,
        is_major_subject: None,
    };

    let updated_subject = repo
        .update("math", update_input)
        .await
        .expect("Failed to update subject config");

    assert_eq!(updated_subject.name, "数学课");
    assert_eq!(updated_subject.allow_double_session, 0);
    println!("✓ 更新科目配置成功");

    // 6. 删除科目配置
    repo.delete("math")
        .await
        .expect("Failed to delete subject config");

    let deleted_subject = repo
        .find_by_id("math")
        .await
        .expect("Failed to query deleted subject config");

    assert!(deleted_subject.is_none());
    println!("✓ 删除科目配置成功");
}

#[tokio::test]
async fn test_subject_config_batch_create() {
    let pool = setup_test_db().await;
    let repo = SubjectConfigRepository::new(&pool);

    // 先创建场地（体育课需要）
    let venue_repo = VenueRepository::new(&pool);
    venue_repo
        .create(CreateVenueInput {
            id: "playground".to_string(),
            name: "操场".to_string(),
            capacity: 4,
        })
        .await
        .expect("创建场地失败");

    // 批量创建科目配置
    let subjects = vec![
        CreateSubjectConfigInput {
            id: "chinese".to_string(),
            name: "语文".to_string(),
            forbidden_slots: 0,
            allow_double_session: true,
            venue_id: None,
            is_major_subject: true,
        },
        CreateSubjectConfigInput {
            id: "english".to_string(),
            name: "英语".to_string(),
            forbidden_slots: 0,
            allow_double_session: true,
            venue_id: None,
            is_major_subject: true,
        },
        CreateSubjectConfigInput {
            id: "pe".to_string(),
            name: "体育".to_string(),
            forbidden_slots: 0b111, // 禁止前3个时间槽位
            allow_double_session: false,
            venue_id: Some("playground".to_string()),
            is_major_subject: false,
        },
    ];

    let created_count = repo
        .batch_create(subjects)
        .await
        .expect("批量创建科目配置失败");

    assert_eq!(created_count, 3);
    println!("✓ 批量创建科目配置成功，数量: {}", created_count);

    // 验证创建的科目配置
    let all_subjects = repo.find_all().await.expect("查询所有科目配置失败");

    assert_eq!(all_subjects.len(), 3);
    println!("✓ 验证批量创建的科目配置成功");
}

// ============================================================================
// 教学计划 CRUD 测试
// ============================================================================

#[tokio::test]
async fn test_curriculum_crud() {
    let pool = setup_test_db().await;

    // 先创建必要的依赖数据
    let teacher_repo = TeacherRepository::new(&pool);
    let class_repo = ClassRepository::new(&pool);
    let subject_repo = SubjectConfigRepository::new(&pool);

    let teacher = teacher_repo
        .create(CreateTeacherInput {
            name: "陈老师".to_string(),
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
        .expect("创建科目配置失败");

    // 1. 创建教学计划
    let curriculum_id = create_curriculum(
        &pool,
        class.id,
        &subject.id,
        teacher.id,
        4, // 每周4节课
        false,
        &[],
        "Every",
    )
    .await
    .expect("创建教学计划失败");

    assert!(curriculum_id > 0);
    println!("✓ 创建教学计划成功，ID: {}", curriculum_id);

    // 2. 根据 ID 查询教学计划
    let found_curriculum = get_curriculum_by_id(&pool, curriculum_id)
        .await
        .expect("查询教学计划失败")
        .expect("未找到教学计划");

    assert_eq!(found_curriculum.id, curriculum_id);
    assert_eq!(found_curriculum.class_id, class.id);
    assert_eq!(found_curriculum.subject_id, subject.id);
    assert_eq!(found_curriculum.teacher_id, teacher.id);
    assert_eq!(found_curriculum.target_sessions, 4);
    println!("✓ 查询教学计划成功");

    // 3. 根据班级 ID 查询教学计划
    let class_curriculums = get_curriculums_by_class(&pool, class.id)
        .await
        .expect("根据班级查询教学计划失败");

    assert_eq!(class_curriculums.len(), 1);
    println!(
        "✓ 根据班级查询教学计划成功，数量: {}",
        class_curriculums.len()
    );

    // 4. 根据教师 ID 查询教学计划
    let teacher_curriculums = get_curriculums_by_teacher(&pool, teacher.id)
        .await
        .expect("根据教师查询教学计划失败");

    assert_eq!(teacher_curriculums.len(), 1);
    println!(
        "✓ 根据教师查询教学计划成功，数量: {}",
        teacher_curriculums.len()
    );

    // 5. 更新教学计划
    update_curriculum(
        &pool,
        curriculum_id,
        class.id,
        &subject.id,
        teacher.id,
        5, // 改为每周5节课
        false,
        &[],
        "Every",
    )
    .await
    .expect("更新教学计划失败");

    let updated_curriculum = get_curriculum_by_id(&pool, curriculum_id)
        .await
        .expect("查询更新后的教学计划失败")
        .expect("未找到更新后的教学计划");

    assert_eq!(updated_curriculum.target_sessions, 5);
    println!("✓ 更新教学计划成功");

    // 6. 删除教学计划
    delete_curriculum(&pool, curriculum_id)
        .await
        .expect("删除教学计划失败");

    let deleted_curriculum = get_curriculum_by_id(&pool, curriculum_id)
        .await
        .expect("查询已删除的教学计划失败");

    assert!(deleted_curriculum.is_none());
    println!("✓ 删除教学计划成功");
}

#[tokio::test]
async fn test_curriculum_batch_create() {
    let pool = setup_test_db().await;

    // 创建依赖数据
    let teacher_repo = TeacherRepository::new(&pool);
    let class_repo = ClassRepository::new(&pool);
    let subject_repo = SubjectConfigRepository::new(&pool);

    let teacher = teacher_repo
        .create(CreateTeacherInput {
            name: "刘老师".to_string(),
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
        .batch_create(vec![
            CreateSubjectConfigInput {
                id: "chemistry".to_string(),
                name: "化学".to_string(),
                forbidden_slots: 0,
                allow_double_session: true,
                venue_id: None,
                is_major_subject: true,
            },
            CreateSubjectConfigInput {
                id: "biology".to_string(),
                name: "生物".to_string(),
                forbidden_slots: 0,
                allow_double_session: true,
                venue_id: None,
                is_major_subject: true,
            },
        ])
        .await
        .expect("批量创建科目配置失败");

    // 批量创建教学计划
    let curriculums = vec![
        (
            class.id,
            "chemistry".to_string(),
            teacher.id,
            3,
            false,
            vec![],
            "Every".to_string(),
        ),
        (
            class.id,
            "biology".to_string(),
            teacher.id,
            2,
            false,
            vec![],
            "Every".to_string(),
        ),
    ];

    let curriculum_ids = batch_create_curriculums(&pool, &curriculums)
        .await
        .expect("批量创建教学计划失败");

    assert_eq!(curriculum_ids.len(), 2);
    println!("✓ 批量创建教学计划成功，数量: {}", curriculum_ids.len());

    // 验证创建的教学计划
    let all_curriculums = get_all_curriculums(&pool)
        .await
        .expect("查询所有教学计划失败");

    assert_eq!(all_curriculums.len(), 2);
    println!("✓ 验证批量创建的教学计划成功");
}

// ============================================================================
// 课表 CRUD 测试
// ============================================================================

#[tokio::test]
async fn test_schedule_crud() {
    let pool = setup_test_db().await;
    let repo = ScheduleRepository::new(&pool);

    // 创建依赖数据
    let teacher_repo = TeacherRepository::new(&pool);
    let class_repo = ClassRepository::new(&pool);
    let subject_repo = SubjectConfigRepository::new(&pool);

    let teacher = teacher_repo
        .create(CreateTeacherInput {
            name: "周老师".to_string(),
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
        .expect("创建科目配置失败");

    // 1. 创建课表
    let create_input = CreateScheduleInput {
        version: 1,
        cycle_days: 5,
        periods_per_day: 8,
        cost: 100,
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
    };

    let schedule = repo
        .create_schedule(create_input)
        .await
        .expect("创建课表失败");

    assert_eq!(schedule.version, 1);
    assert_eq!(schedule.cycle_days, 5);
    assert_eq!(schedule.periods_per_day, 8);
    assert_eq!(schedule.cost, 100);
    assert_eq!(schedule.is_active, 1);
    println!("✓ 创建课表成功，ID: {}", schedule.id);

    // 2. 查询课表条目
    let entries = repo
        .get_schedule_entries(schedule.id)
        .await
        .expect("查询课表条目失败");

    assert_eq!(entries.len(), 2);
    println!("✓ 查询课表条目成功，数量: {}", entries.len());

    // 3. 查询活动课表
    let active_schedule = repo
        .get_active_schedule()
        .await
        .expect("查询活动课表失败")
        .expect("未找到活动课表");

    assert_eq!(active_schedule.id, schedule.id);
    println!("✓ 查询活动课表成功");

    // 4. 更新课表
    let update_input = UpdateScheduleInput {
        version: Some(2),
        cost: Some(80),
        is_active: None,
    };

    let updated_schedule = repo
        .update_schedule(schedule.id, update_input)
        .await
        .expect("更新课表失败");

    assert_eq!(updated_schedule.version, 2);
    assert_eq!(updated_schedule.cost, 80);
    println!("✓ 更新课表成功");

    // 5. 删除课表
    repo.delete_schedule(schedule.id)
        .await
        .expect("删除课表失败");

    let deleted_schedule = repo
        .get_schedule_by_id(schedule.id)
        .await
        .expect("查询已删除的课表失败");

    assert!(deleted_schedule.is_none());
    println!("✓ 删除课表成功（包括所有条目）");
}

#[tokio::test]
async fn test_schedule_entry_crud() {
    let pool = setup_test_db().await;
    let repo = ScheduleRepository::new(&pool);

    // 创建依赖数据
    let teacher_repo = TeacherRepository::new(&pool);
    let class_repo = ClassRepository::new(&pool);
    let subject_repo = SubjectConfigRepository::new(&pool);

    let teacher = teacher_repo
        .create(CreateTeacherInput {
            name: "吴老师".to_string(),
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

    let subject = subject_repo
        .create(CreateSubjectConfigInput {
            id: "geography".to_string(),
            name: "地理".to_string(),
            forbidden_slots: 0,
            allow_double_session: false,
            venue_id: None,
            is_major_subject: false,
        })
        .await
        .expect("创建科目配置失败");

    // 先创建课表
    let schedule = repo
        .create_schedule(CreateScheduleInput {
            version: 1,
            cycle_days: 5,
            periods_per_day: 8,
            cost: 0,
            entries: vec![],
        })
        .await
        .expect("创建课表失败");

    // 1. 创建课表条目
    let entry_input = CreateScheduleEntryInput {
        class_id: class.id,
        subject_id: subject.id.clone(),
        teacher_id: teacher.id,
        day: 2,
        period: 3,
        is_fixed: false,
        week_type: "Every".to_string(),
    };

    let entry = repo
        .create_schedule_entry(schedule.id, entry_input)
        .await
        .expect("创建课表条目失败");

    assert_eq!(entry.schedule_id, schedule.id);
    assert_eq!(entry.class_id, class.id);
    assert_eq!(entry.day, 2);
    assert_eq!(entry.period, 3);
    println!("✓ 创建课表条目成功，ID: {}", entry.id);

    // 2. 更新课表条目
    let update_entry_input = UpdateScheduleEntryInput {
        class_id: None,
        subject_id: None,
        teacher_id: None,
        day: Some(3),
        period: Some(4),
        is_fixed: Some(true),
        week_type: None,
    };

    let updated_entry = repo
        .update_schedule_entry(entry.id, update_entry_input)
        .await
        .expect("更新课表条目失败");

    assert_eq!(updated_entry.day, 3);
    assert_eq!(updated_entry.period, 4);
    assert_eq!(updated_entry.is_fixed, 1);
    println!("✓ 更新课表条目成功");

    // 3. 删除课表条目
    repo.delete_schedule_entry(entry.id)
        .await
        .expect("删除课表条目失败");

    let entries = repo
        .get_schedule_entries(schedule.id)
        .await
        .expect("查询课表条目失败");

    assert_eq!(entries.len(), 0);
    println!("✓ 删除课表条目成功");
}

// ============================================================================
// 场地 CRUD 测试
// ============================================================================

#[tokio::test]
async fn test_venue_crud() {
    let pool = setup_test_db().await;
    let repo = VenueRepository::new(&pool);

    // 1. 创建场地
    let create_input = CreateVenueInput {
        id: "lab1".to_string(),
        name: "实验室1".to_string(),
        capacity: 2,
    };

    let venue = repo.create(create_input).await.expect("创建场地失败");

    assert_eq!(venue.id, "lab1");
    assert_eq!(venue.name, "实验室1");
    assert_eq!(venue.capacity, 2);
    println!("✓ 创建场地成功，ID: {}", venue.id);

    // 2. 根据 ID 查询场地
    let found_venue = repo
        .find_by_id("lab1")
        .await
        .expect("查询场地失败")
        .expect("未找到场地");

    assert_eq!(found_venue.id, "lab1");
    assert_eq!(found_venue.name, "实验室1");
    println!("✓ 查询场地成功");

    // 3. 查询所有场地
    let all_venues = repo.find_all().await.expect("查询所有场地失败");

    assert_eq!(all_venues.len(), 1);
    println!("✓ 查询所有场地成功，数量: {}", all_venues.len());

    // 4. 更新场地信息
    let update_input = UpdateVenueInput {
        name: Some("物理实验室".to_string()),
        capacity: Some(3),
    };

    let updated_venue = repo
        .update("lab1", update_input)
        .await
        .expect("更新场地失败");

    assert_eq!(updated_venue.name, "物理实验室");
    assert_eq!(updated_venue.capacity, 3);
    println!("✓ 更新场地成功");

    // 5. 删除场地
    repo.delete("lab1").await.expect("删除场地失败");

    let deleted_venue = repo.find_by_id("lab1").await.expect("查询已删除的场地失败");

    assert!(deleted_venue.is_none());
    println!("✓ 删除场地成功");

    // 6. 测试创建容量为0的场地（应该返回错误）
    let invalid_input = CreateVenueInput {
        id: "invalid".to_string(),
        name: "无效场地".to_string(),
        capacity: 0,
    };

    let result = repo.create(invalid_input).await;
    assert!(result.is_err());
    println!("✓ 创建容量为0的场地返回错误");
}

// ============================================================================
// 固定课程 CRUD 测试
// ============================================================================

#[tokio::test]
async fn test_fixed_course_crud() {
    let pool = setup_test_db().await;
    let repo = FixedCourseRepository::new(&pool);

    // 创建依赖数据
    let teacher_repo = TeacherRepository::new(&pool);
    let class_repo = ClassRepository::new(&pool);
    let subject_repo = SubjectConfigRepository::new(&pool);

    let teacher = teacher_repo
        .create(CreateTeacherInput {
            name: "郑老师".to_string(),
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
        .expect("创建科目配置失败");

    // 1. 创建固定课程
    let create_input = CreateFixedCourseInput {
        class_id: class.id,
        subject_id: subject.id.clone(),
        teacher_id: teacher.id,
        day: 0,
        period: 0,
        is_pre_arranged: false,
    };

    let fixed_course = repo.create(create_input).await.expect("创建固定课程失败");

    assert_eq!(fixed_course.class_id, class.id);
    assert_eq!(fixed_course.subject_id, subject.id);
    assert_eq!(fixed_course.teacher_id, teacher.id);
    assert_eq!(fixed_course.day, 0);
    assert_eq!(fixed_course.period, 0);
    assert_eq!(fixed_course.is_pre_arranged, 0);
    println!("✓ 创建固定课程成功，ID: {}", fixed_course.id);

    // 2. 根据 ID 查询固定课程
    let found_course = repo
        .find_by_id(fixed_course.id)
        .await
        .expect("查询固定课程失败")
        .expect("未找到固定课程");

    assert_eq!(found_course.id, fixed_course.id);
    println!("✓ 查询固定课程成功");

    // 3. 根据班级查询固定课程
    let class_courses = repo
        .find_by_class(class.id)
        .await
        .expect("根据班级查询固定课程失败");

    assert_eq!(class_courses.len(), 1);
    println!("✓ 根据班级查询固定课程成功，数量: {}", class_courses.len());

    // 4. 根据教师查询固定课程
    let teacher_courses = repo
        .find_by_teacher(teacher.id)
        .await
        .expect("根据教师查询固定课程失败");

    assert_eq!(teacher_courses.len(), 1);
    println!(
        "✓ 根据教师查询固定课程成功，数量: {}",
        teacher_courses.len()
    );

    // 5. 根据时间槽位查询固定课程
    let slot_courses = repo
        .find_by_time_slot(0, 0)
        .await
        .expect("根据时间槽位查询固定课程失败");

    assert_eq!(slot_courses.len(), 1);
    println!(
        "✓ 根据时间槽位查询固定课程成功，数量: {}",
        slot_courses.len()
    );

    // 6. 更新固定课程
    let update_input = UpdateFixedCourseInput {
        class_id: None,
        subject_id: None,
        teacher_id: None,
        day: Some(1),
        period: Some(2),
        is_pre_arranged: Some(true),
    };

    let updated_course = repo
        .update(fixed_course.id, update_input)
        .await
        .expect("更新固定课程失败");

    assert_eq!(updated_course.day, 1);
    assert_eq!(updated_course.period, 2);
    assert_eq!(updated_course.is_pre_arranged, 1);
    println!("✓ 更新固定课程成功");

    // 7. 删除固定课程
    repo.delete(fixed_course.id)
        .await
        .expect("删除固定课程失败");

    let deleted_course = repo
        .find_by_id(fixed_course.id)
        .await
        .expect("查询已删除的固定课程失败");

    assert!(deleted_course.is_none());
    println!("✓ 删除固定课程成功");
}

#[tokio::test]
async fn test_fixed_course_batch_create() {
    let pool = setup_test_db().await;
    let repo = FixedCourseRepository::new(&pool);

    // 创建依赖数据
    let teacher_repo = TeacherRepository::new(&pool);
    let class_repo = ClassRepository::new(&pool);
    let subject_repo = SubjectConfigRepository::new(&pool);

    let teacher = teacher_repo
        .create(CreateTeacherInput {
            name: "冯老师".to_string(),
            teaching_group_id: None,
        })
        .await
        .expect("创建教师失败");

    let class = class_repo
        .create(CreateClassInput {
            name: "初一(3)班".to_string(),
            grade_level: Some(7),
        })
        .await
        .expect("创建班级失败");

    let subject = subject_repo
        .create(CreateSubjectConfigInput {
            id: "class_meeting".to_string(),
            name: "班会".to_string(),
            forbidden_slots: 0,
            allow_double_session: false,
            venue_id: None,
            is_major_subject: false,
        })
        .await
        .expect("创建科目配置失败");

    // 批量创建固定课程
    let courses = vec![
        CreateFixedCourseInput {
            class_id: class.id,
            subject_id: subject.id.clone(),
            teacher_id: teacher.id,
            day: 0,
            period: 7,
            is_pre_arranged: false,
        },
        CreateFixedCourseInput {
            class_id: class.id,
            subject_id: subject.id.clone(),
            teacher_id: teacher.id,
            day: 4,
            period: 7,
            is_pre_arranged: false,
        },
    ];

    let created_count = repo
        .batch_create(courses)
        .await
        .expect("批量创建固定课程失败");

    assert_eq!(created_count, 2);
    println!("✓ 批量创建固定课程成功，数量: {}", created_count);

    // 验证创建的固定课程
    let all_courses = repo.find_all().await.expect("查询所有固定课程失败");

    assert_eq!(all_courses.len(), 2);
    println!("✓ 验证批量创建的固定课程成功");
}

// ============================================================================
// 教师互斥关系 CRUD 测试
// ============================================================================

#[tokio::test]
async fn test_teacher_mutual_exclusion_crud() {
    let pool = setup_test_db().await;
    let repo = TeacherMutualExclusionRepository::new(&pool);

    // 创建两位教师
    let teacher_repo = TeacherRepository::new(&pool);

    let teacher_a = teacher_repo
        .create(CreateTeacherInput {
            name: "韩老师".to_string(),
            teaching_group_id: None,
        })
        .await
        .expect("创建教师A失败");

    let teacher_b = teacher_repo
        .create(CreateTeacherInput {
            name: "曹老师".to_string(),
            teaching_group_id: None,
        })
        .await
        .expect("创建教师B失败");

    // 1. 创建全时段互斥关系
    let create_input = CreateTeacherMutualExclusionInput {
        teacher_a_id: teacher_a.id,
        teacher_b_id: teacher_b.id,
        scope: ExclusionScope::AllTime,
    };

    let exclusion = repo.create(create_input).await.expect("创建互斥关系失败");

    assert_eq!(exclusion.teacher_a_id, teacher_a.id);
    assert_eq!(exclusion.teacher_b_id, teacher_b.id);
    assert_eq!(exclusion.scope_type, "AllTime");
    assert!(exclusion.specific_slots.is_none());
    println!("✓ 创建全时段互斥关系成功，ID: {}", exclusion.id);

    // 2. 根据 ID 查询互斥关系
    let found_exclusion = repo
        .find_by_id(exclusion.id)
        .await
        .expect("查询互斥关系失败")
        .expect("未找到互斥关系");

    assert_eq!(found_exclusion.id, exclusion.id);
    println!("✓ 查询互斥关系成功");

    // 3. 根据教师查询互斥关系
    let teacher_exclusions = repo
        .find_by_teacher(teacher_a.id)
        .await
        .expect("根据教师查询互斥关系失败");

    assert_eq!(teacher_exclusions.len(), 1);
    println!(
        "✓ 根据教师查询互斥关系成功，数量: {}",
        teacher_exclusions.len()
    );

    // 4. 查询两位教师之间的互斥关系
    let between_exclusion = repo
        .find_between_teachers(teacher_a.id, teacher_b.id)
        .await
        .expect("查询两位教师之间的互斥关系失败")
        .expect("未找到互斥关系");

    assert_eq!(between_exclusion.id, exclusion.id);
    println!("✓ 查询两位教师之间的互斥关系成功");

    // 5. 更新互斥关系为特定时段互斥
    let update_input = UpdateTeacherMutualExclusionInput {
        scope: Some(ExclusionScope::SpecificSlots {
            mask: 0b11111111, // 前8个时间槽位互斥
        }),
    };

    let updated_exclusion = repo
        .update(exclusion.id, update_input)
        .await
        .expect("更新互斥关系失败");

    assert_eq!(updated_exclusion.scope_type, "SpecificSlots");
    assert!(updated_exclusion.specific_slots.is_some());
    println!("✓ 更新互斥关系成功");

    // 6. 删除互斥关系
    repo.delete(exclusion.id).await.expect("删除互斥关系失败");

    let deleted_exclusion = repo
        .find_by_id(exclusion.id)
        .await
        .expect("查询已删除的互斥关系失败");

    assert!(deleted_exclusion.is_none());
    println!("✓ 删除互斥关系成功");

    // 7. 测试创建相同教师的互斥关系（应该返回错误）
    let invalid_input = CreateTeacherMutualExclusionInput {
        teacher_a_id: teacher_a.id,
        teacher_b_id: teacher_a.id,
        scope: ExclusionScope::AllTime,
    };

    let result = repo.create(invalid_input).await;
    assert!(result.is_err());
    println!("✓ 创建相同教师的互斥关系返回错误");
}

#[tokio::test]
async fn test_teacher_mutual_exclusion_batch_create() {
    let pool = setup_test_db().await;
    let repo = TeacherMutualExclusionRepository::new(&pool);

    // 创建多位教师
    let teacher_repo = TeacherRepository::new(&pool);

    let teacher1 = teacher_repo
        .create(CreateTeacherInput {
            name: "邓老师".to_string(),
            teaching_group_id: None,
        })
        .await
        .expect("创建教师1失败");

    let teacher2 = teacher_repo
        .create(CreateTeacherInput {
            name: "许老师".to_string(),
            teaching_group_id: None,
        })
        .await
        .expect("创建教师2失败");

    let teacher3 = teacher_repo
        .create(CreateTeacherInput {
            name: "何老师".to_string(),
            teaching_group_id: None,
        })
        .await
        .expect("创建教师3失败");

    // 批量创建互斥关系
    let exclusions = vec![
        CreateTeacherMutualExclusionInput {
            teacher_a_id: teacher1.id,
            teacher_b_id: teacher2.id,
            scope: ExclusionScope::AllTime,
        },
        CreateTeacherMutualExclusionInput {
            teacher_a_id: teacher2.id,
            teacher_b_id: teacher3.id,
            scope: ExclusionScope::SpecificSlots {
                mask: 0b1111111111111111,
            },
        },
    ];

    let created_count = repo
        .batch_create(exclusions)
        .await
        .expect("批量创建互斥关系失败");

    assert_eq!(created_count, 2);
    println!("✓ 批量创建互斥关系成功，数量: {}", created_count);

    // 验证创建的互斥关系
    let all_exclusions = repo.find_all().await.expect("查询所有互斥关系失败");

    assert_eq!(all_exclusions.len(), 2);
    println!("✓ 验证批量创建的互斥关系成功");
}

// ============================================================================
// 综合测试：测试外键约束和数据完整性
// ============================================================================

#[tokio::test]
async fn test_foreign_key_constraints() {
    let pool = setup_test_db().await;

    // 创建教师
    let teacher_repo = TeacherRepository::new(&pool);
    let teacher = teacher_repo
        .create(CreateTeacherInput {
            name: "测试教师".to_string(),
            teaching_group_id: None,
        })
        .await
        .expect("创建教师失败");

    // 尝试为不存在的教师保存偏好（应该返回错误）
    let invalid_pref = SaveTeacherPreferenceInput {
        teacher_id: 999,
        preferred_slots: 0,
        time_bias: 0,
        weight: 1,
        blocked_slots: 0,
    };

    let result = teacher_repo.save_preference(invalid_pref).await;
    assert!(result.is_err());
    println!("✓ 为不存在的教师保存偏好返回错误");

    // 删除教师后，其偏好应该被级联删除或保持孤立（取决于数据库设计）
    teacher_repo.delete(teacher.id).await.expect("删除教师失败");

    println!("✓ 外键约束测试通过");
}
