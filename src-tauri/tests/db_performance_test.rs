// ============================================================================
// 数据库性能测试
// ============================================================================
// 本测试文件验证数据库查询性能和索引优化效果
//
// 测试内容：
// 1. 单条查询性能测试
// 2. 批量查询性能测试
// 3. 索引优化效果测试
// 4. 大数据量场景性能测试
// 5. 并发查询性能测试
// 6. 复杂 JOIN 查询性能测试
// 7. 批量插入性能测试
//
// 性能基准：
// - 单条查询应在 10ms 内完成
// - 批量查询（100条）应在 100ms 内完成
// - 并发查询（10个并发）应在 200ms 内完成
// - 大数据量查询（1000+ 记录）应在 500ms 内完成
//
// 验证需求：
// - 需求 12：性能优化 - 26个班级的排课计算在30秒内完成，冲突检测在100毫秒内完成
// - 需求 6：自动排课生成 - 使用位掩码技术提高性能
// ============================================================================

use course_scheduling_system::db::class::{ClassRepository, CreateClassInput};
use course_scheduling_system::db::curriculum::{
    batch_create_curriculums, get_curriculums_by_class,
};
use course_scheduling_system::db::migrations::MigrationManager;
use course_scheduling_system::db::schedule::{
    CreateScheduleEntryInput, CreateScheduleInput, ScheduleRepository,
};
use course_scheduling_system::db::subject::{CreateSubjectConfigInput, SubjectConfigRepository};
use course_scheduling_system::db::teacher::{CreateTeacherInput, TeacherRepository};
use sqlx::SqlitePool;
use std::sync::Arc;
use std::time::Instant;
use tokio::sync::Semaphore;

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

/// 创建测试数据：教师、班级、科目
async fn create_test_data(
    pool: &SqlitePool,
    teacher_count: usize,
    class_count: usize,
    subject_count: usize,
) -> (Vec<i64>, Vec<i64>, Vec<String>) {
    let teacher_repo = TeacherRepository::new(pool);
    let class_repo = ClassRepository::new(pool);
    let subject_repo = SubjectConfigRepository::new(pool);

    // 创建教师
    let mut teacher_ids = Vec::new();
    for i in 0..teacher_count {
        let teacher = teacher_repo
            .create(CreateTeacherInput {
                name: format!("教师{}", i),
                teaching_group_id: None,
            })
            .await
            .expect("创建教师失败");
        teacher_ids.push(teacher.id);
    }

    // 创建班级
    let mut class_ids = Vec::new();
    for i in 0..class_count {
        let class = class_repo
            .create(CreateClassInput {
                name: format!("班级{}", i),
                grade_level: Some((i % 3 + 7) as i64), // 7-9年级
            })
            .await
            .expect("创建班级失败");
        class_ids.push(class.id);
    }

    // 创建科目
    let mut subject_ids = Vec::new();
    for i in 0..subject_count {
        let subject = subject_repo
            .create(CreateSubjectConfigInput {
                id: format!("subject{}", i),
                name: format!("科目{}", i),
                forbidden_slots: 0,
                allow_double_session: true,
                venue_id: None,
                is_major_subject: i < 3, // 前3个为主科
            })
            .await
            .expect("创建科目失败");
        subject_ids.push(subject.id);
    }

    (teacher_ids, class_ids, subject_ids)
}

// ============================================================================
// 测试 1：单条查询性能测试
// ============================================================================

#[tokio::test]
async fn test_single_query_performance() {
    println!("\n=== 测试 1：单条查询性能测试 ===");

    let pool = setup_test_db().await;
    let (teacher_ids, _, _) = create_test_data(&pool, 100, 50, 10).await;

    let teacher_repo = TeacherRepository::new(&pool);

    // 测试单条查询性能
    let start = Instant::now();
    let _teacher = teacher_repo
        .find_by_id(teacher_ids[50])
        .await
        .expect("查询教师失败");
    let duration = start.elapsed();

    println!("✓ 单条查询耗时: {:?}", duration);
    assert!(
        duration.as_millis() < 10,
        "单条查询应在 10ms 内完成，实际耗时: {:?}",
        duration
    );

    // 测试多次单条查询的平均性能
    let start = Instant::now();
    for &teacher_id in teacher_ids.iter().take(10) {
        let _teacher = teacher_repo
            .find_by_id(teacher_id)
            .await
            .expect("查询教师失败");
    }
    let duration = start.elapsed();
    let avg_duration = duration.as_millis() / 10;

    println!("✓ 10次单条查询平均耗时: {} ms", avg_duration);
    assert!(
        avg_duration < 10,
        "单条查询平均应在 10ms 内完成，实际平均耗时: {} ms",
        avg_duration
    );

    println!("=== 测试 1 通过 ===\n");
}

// ============================================================================
// 测试 2：批量查询性能测试
// ============================================================================

#[tokio::test]
async fn test_batch_query_performance() {
    println!("\n=== 测试 2：批量查询性能测试 ===");

    let pool = setup_test_db().await;
    let (_, _, _) = create_test_data(&pool, 100, 50, 10).await;

    let teacher_repo = TeacherRepository::new(&pool);

    // 测试批量查询性能（查询所有教师）
    let start = Instant::now();
    let teachers = teacher_repo.find_all().await.expect("查询所有教师失败");
    let duration = start.elapsed();

    println!("✓ 批量查询 {} 条记录耗时: {:?}", teachers.len(), duration);
    assert!(
        duration.as_millis() < 100,
        "批量查询100条记录应在 100ms 内完成，实际耗时: {:?}",
        duration
    );

    println!("=== 测试 2 通过 ===\n");
}

// ============================================================================
// 测试 3：索引优化效果测试
// ============================================================================

#[tokio::test]
async fn test_index_optimization() {
    println!("\n=== 测试 3：索引优化效果测试 ===");

    let pool = setup_test_db().await;
    let (teacher_ids, class_ids, subject_ids) = create_test_data(&pool, 100, 50, 10).await;

    // 创建大量教学计划数据
    let mut curriculums = Vec::new();
    for (i, &class_id) in class_ids.iter().enumerate() {
        let teacher_id = teacher_ids[i % teacher_ids.len()];
        let subject_id = &subject_ids[i % subject_ids.len()];
        curriculums.push((
            class_id,
            subject_id.clone(),
            teacher_id,
            4,
            false,
            vec![],
            "Every".to_string(),
        ));
    }

    batch_create_curriculums(&pool, &curriculums)
        .await
        .expect("批量创建教学计划失败");

    println!("✓ 创建了 {} 条教学计划记录", curriculums.len());

    // 测试有索引的查询性能（根据班级查询）
    let start = Instant::now();
    let class_curriculums = get_curriculums_by_class(&pool, class_ids[0])
        .await
        .expect("根据班级查询教学计划失败");
    let duration = start.elapsed();

    println!(
        "✓ 根据班级查询（有索引）耗时: {:?}，结果数: {}",
        duration,
        class_curriculums.len()
    );
    assert!(
        duration.as_millis() < 10,
        "有索引的查询应在 10ms 内完成，实际耗时: {:?}",
        duration
    );

    println!("=== 测试 3 通过 ===\n");
}

// ============================================================================
// 测试 4：大数据量场景性能测试
// ============================================================================

#[tokio::test]
async fn test_large_dataset_query_performance() {
    println!("\n=== 测试 4：大数据量场景性能测试 ===");

    let pool = setup_test_db().await;

    // 创建大量数据
    println!("正在创建大量测试数据...");
    let (teacher_ids, class_ids, subject_ids) = create_test_data(&pool, 200, 100, 20).await;
    println!(
        "✓ 创建了 {} 位教师、{} 个班级、{} 个科目",
        teacher_ids.len(),
        class_ids.len(),
        subject_ids.len()
    );

    // 创建大量教学计划
    let mut curriculums = Vec::new();
    for &class_id in &class_ids {
        for (i, subject_id) in subject_ids.iter().enumerate() {
            let teacher_id = teacher_ids[i % teacher_ids.len()];
            curriculums.push((
                class_id,
                subject_id.clone(),
                teacher_id,
                4,
                false,
                vec![],
                "Every".to_string(),
            ));
        }
    }

    let start = Instant::now();
    batch_create_curriculums(&pool, &curriculums)
        .await
        .expect("批量创建教学计划失败");
    let duration = start.elapsed();

    println!(
        "✓ 批量插入 {} 条教学计划记录耗时: {:?}",
        curriculums.len(),
        duration
    );

    // 测试大数据量查询性能
    let teacher_repo = TeacherRepository::new(&pool);
    let start = Instant::now();
    let all_teachers = teacher_repo.find_all().await.expect("查询所有教师失败");
    let duration = start.elapsed();

    println!(
        "✓ 查询 {} 条教师记录耗时: {:?}",
        all_teachers.len(),
        duration
    );
    assert!(
        duration.as_millis() < 500,
        "大数据量查询应在 500ms 内完成，实际耗时: {:?}",
        duration
    );

    println!("=== 测试 4 通过 ===\n");
}

// ============================================================================
// 测试 5：并发查询性能测试
// ============================================================================

#[tokio::test]
async fn test_concurrent_query_performance() {
    println!("\n=== 测试 5：并发查询性能测试 ===");

    let pool = setup_test_db().await;
    let (teacher_ids, _, _) = create_test_data(&pool, 100, 50, 10).await;

    let pool = Arc::new(pool);
    let semaphore = Arc::new(Semaphore::new(10)); // 限制10个并发
    let mut handles = vec![];

    let start = Instant::now();

    // 启动10个并发查询任务
    for i in 0..10 {
        let pool = Arc::clone(&pool);
        let semaphore = Arc::clone(&semaphore);
        let teacher_id = teacher_ids[i * 10];

        let handle = tokio::spawn(async move {
            let _permit = semaphore.acquire().await.unwrap();
            let teacher_repo = TeacherRepository::new(&pool);
            teacher_repo
                .find_by_id(teacher_id)
                .await
                .expect("查询教师失败")
        });

        handles.push(handle);
    }

    // 等待所有任务完成
    for handle in handles {
        handle.await.expect("任务执行失败");
    }

    let duration = start.elapsed();

    println!("✓ 10个并发查询总耗时: {:?}", duration);
    assert!(
        duration.as_millis() < 200,
        "10个并发查询应在 200ms 内完成，实际耗时: {:?}",
        duration
    );

    println!("=== 测试 5 通过 ===\n");
}

// ============================================================================
// 测试 6：复杂 JOIN 查询性能测试
// ============================================================================

#[tokio::test]
async fn test_complex_join_query_performance() {
    println!("\n=== 测试 6：复杂 JOIN 查询性能测试 ===");

    let pool = setup_test_db().await;
    let (teacher_ids, class_ids, subject_ids) = create_test_data(&pool, 100, 50, 10).await;

    // 创建课表和课表条目
    let schedule_repo = ScheduleRepository::new(&pool);

    let mut entries = Vec::new();
    for day in 0..5 {
        for period in 0..8 {
            for (i, &class_id) in class_ids.iter().enumerate().take(10) {
                let teacher_id = teacher_ids[i % teacher_ids.len()];
                let subject_id = &subject_ids[i % subject_ids.len()];
                entries.push(CreateScheduleEntryInput {
                    class_id,
                    subject_id: subject_id.clone(),
                    teacher_id,
                    day,
                    period,
                    is_fixed: false,
                    week_type: "Every".to_string(),
                });
            }
        }
    }

    let schedule = schedule_repo
        .create_schedule(CreateScheduleInput {
            version: 1,
            cycle_days: 5,
            periods_per_day: 8,
            cost: 0,
            entries,
        })
        .await
        .expect("创建课表失败");

    println!("✓ 创建了课表，ID: {}", schedule.id);

    // 测试复杂 JOIN 查询性能（查询课表条目）
    let start = Instant::now();
    let entries = schedule_repo
        .get_schedule_entries(schedule.id)
        .await
        .expect("查询课表条目失败");
    let duration = start.elapsed();

    println!(
        "✓ 复杂 JOIN 查询 {} 条记录耗时: {:?}",
        entries.len(),
        duration
    );
    assert!(
        duration.as_millis() < 100,
        "复杂 JOIN 查询应在 100ms 内完成，实际耗时: {:?}",
        duration
    );

    println!("=== 测试 6 通过 ===\n");
}

// ============================================================================
// 测试 7：批量插入性能测试
// ============================================================================

#[tokio::test]
async fn test_batch_insert_performance() {
    println!("\n=== 测试 7：批量插入性能测试 ===");

    let pool = setup_test_db().await;
    let teacher_repo = TeacherRepository::new(&pool);

    // 测试批量插入性能
    let start = Instant::now();
    for i in 0..100 {
        teacher_repo
            .create(CreateTeacherInput {
                name: format!("教师{}", i),
                teaching_group_id: None,
            })
            .await
            .expect("创建教师失败");
    }
    let duration = start.elapsed();

    println!("✓ 批量插入 100 条记录耗时: {:?}", duration);
    assert!(
        duration.as_millis() < 500,
        "批量插入100条记录应在 500ms 内完成，实际耗时: {:?}",
        duration
    );

    // 验证插入的数据
    let all_teachers = teacher_repo.find_all().await.expect("查询所有教师失败");
    assert_eq!(all_teachers.len(), 100, "应该有 100 位教师");
    println!("✓ 验证插入的数据正确");

    println!("=== 测试 7 通过 ===\n");
}

// ============================================================================
// 测试 8：事务批量插入性能测试
// ============================================================================

#[tokio::test]
async fn test_transaction_batch_insert_performance() {
    println!("\n=== 测试 8：事务批量插入性能测试 ===");

    let pool = setup_test_db().await;

    // 使用事务批量插入
    let start = Instant::now();
    let mut tx = pool.begin().await.expect("开始事务失败");

    for i in 0..100 {
        sqlx::query(
            r#"
            INSERT INTO teachers (name, teaching_group_id, created_at, updated_at)
            VALUES (?, ?, datetime('now'), datetime('now'))
            "#,
        )
        .bind(format!("教师{}", i))
        .bind(None::<i64>)
        .execute(&mut *tx)
        .await
        .expect("插入教师失败");
    }

    tx.commit().await.expect("提交事务失败");
    let duration = start.elapsed();

    println!("✓ 事务批量插入 100 条记录耗时: {:?}", duration);
    assert!(
        duration.as_millis() < 200,
        "事务批量插入100条记录应在 200ms 内完成，实际耗时: {:?}",
        duration
    );

    // 验证插入的数据
    let teacher_repo = TeacherRepository::new(&pool);
    let all_teachers = teacher_repo.find_all().await.expect("查询所有教师失败");
    assert_eq!(all_teachers.len(), 100, "应该有 100 位教师");
    println!("✓ 验证插入的数据正确");

    println!("=== 测试 8 通过 ===\n");
}

// ============================================================================
// 测试 9：索引对查询性能的影响
// ============================================================================

#[tokio::test]
async fn test_index_impact_on_query_performance() {
    println!("\n=== 测试 9：索引对查询性能的影响 ===");

    let pool = setup_test_db().await;
    let (teacher_ids, class_ids, subject_ids) = create_test_data(&pool, 100, 50, 10).await;

    // 创建大量课表条目
    let schedule_repo = ScheduleRepository::new(&pool);
    let mut entries = Vec::new();

    for day in 0..5 {
        for period in 0..8 {
            for &class_id in &class_ids {
                let teacher_id = teacher_ids[class_id as usize % teacher_ids.len()];
                let subject_id = &subject_ids[class_id as usize % subject_ids.len()];
                entries.push(CreateScheduleEntryInput {
                    class_id,
                    subject_id: subject_id.clone(),
                    teacher_id,
                    day,
                    period,
                    is_fixed: false,
                    week_type: "Every".to_string(),
                });
            }
        }
    }

    let schedule = schedule_repo
        .create_schedule(CreateScheduleInput {
            version: 1,
            cycle_days: 5,
            periods_per_day: 8,
            cost: 0,
            entries,
        })
        .await
        .expect("创建课表失败");

    println!("✓ 创建了 {} 条课表条目", 5 * 8 * class_ids.len());

    // 测试根据班级查询（有索引）
    let start = Instant::now();
    let result = sqlx::query(
        r#"
        SELECT * FROM schedule_entries
        WHERE schedule_id = ? AND class_id = ?
        "#,
    )
    .bind(schedule.id)
    .bind(class_ids[0])
    .fetch_all(&pool)
    .await
    .expect("查询失败");
    let duration_with_index = start.elapsed();

    println!(
        "✓ 根据班级查询（有索引）耗时: {:?}，结果数: {}",
        duration_with_index,
        result.len()
    );

    // 测试根据时间槽位查询（有索引）
    let start = Instant::now();
    let result = sqlx::query(
        r#"
        SELECT * FROM schedule_entries
        WHERE schedule_id = ? AND day = ? AND period = ?
        "#,
    )
    .bind(schedule.id)
    .bind(0)
    .bind(0)
    .fetch_all(&pool)
    .await
    .expect("查询失败");
    let duration_time_index = start.elapsed();

    println!(
        "✓ 根据时间槽位查询（有索引）耗时: {:?}，结果数: {}",
        duration_time_index,
        result.len()
    );

    assert!(
        duration_with_index.as_millis() < 50,
        "有索引的查询应在 50ms 内完成"
    );
    assert!(
        duration_time_index.as_millis() < 50,
        "有索引的查询应在 50ms 内完成"
    );

    println!("=== 测试 9 通过 ===\n");
}

// ============================================================================
// 测试 10：冲突检测性能测试（模拟需求 12）
// ============================================================================

#[tokio::test]
async fn test_conflict_detection_performance() {
    println!("\n=== 测试 10：冲突检测性能测试（模拟需求 12） ===");

    let pool = setup_test_db().await;
    let (teacher_ids, class_ids, subject_ids) = create_test_data(&pool, 100, 26, 10).await;

    // 创建26个班级的课表（模拟需求 12）
    let schedule_repo = ScheduleRepository::new(&pool);
    let mut entries = Vec::new();

    for day in 0..5 {
        for period in 0..8 {
            for &class_id in &class_ids {
                let teacher_id = teacher_ids[class_id as usize % teacher_ids.len()];
                let subject_id = &subject_ids[class_id as usize % subject_ids.len()];
                entries.push(CreateScheduleEntryInput {
                    class_id,
                    subject_id: subject_id.clone(),
                    teacher_id,
                    day,
                    period,
                    is_fixed: false,
                    week_type: "Every".to_string(),
                });
            }
        }
    }

    let schedule = schedule_repo
        .create_schedule(CreateScheduleInput {
            version: 1,
            cycle_days: 5,
            periods_per_day: 8,
            cost: 0,
            entries,
        })
        .await
        .expect("创建课表失败");

    println!("✓ 创建了26个班级的课表");

    // 模拟冲突检测：检查教师时间冲突
    let start = Instant::now();

    // 查询所有课表条目
    let all_entries = schedule_repo
        .get_schedule_entries(schedule.id)
        .await
        .expect("查询课表条目失败");

    // 按教师分组检查冲突
    let mut teacher_slots: std::collections::HashMap<i64, Vec<(i64, i64)>> =
        std::collections::HashMap::new();

    for entry in &all_entries {
        teacher_slots
            .entry(entry.teacher_id)
            .or_insert_with(Vec::new)
            .push((entry.day, entry.period));
    }

    // 检查每个教师是否有时间冲突
    let mut conflict_count = 0;
    for (_teacher_id, slots) in &teacher_slots {
        let mut unique_slots = std::collections::HashSet::new();
        for slot in slots {
            if !unique_slots.insert(slot) {
                conflict_count += 1;
            }
        }
    }

    let duration = start.elapsed();

    println!(
        "✓ 冲突检测耗时: {:?}，检测了 {} 条记录，发现 {} 个冲突",
        duration,
        all_entries.len(),
        conflict_count
    );

    // 验证需求 12：冲突检测应在 100ms 内完成
    assert!(
        duration.as_millis() < 100,
        "冲突检测应在 100ms 内完成（需求 12），实际耗时: {:?}",
        duration
    );

    println!("=== 测试 10 通过 ===\n");
}
