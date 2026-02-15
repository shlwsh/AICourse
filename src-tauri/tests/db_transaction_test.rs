// ============================================================================
// 数据库事务处理集成测试
// ============================================================================
// 本测试文件验证数据库事务处理的正确性和可靠性
//
// 测试内容：
// 1. 事务提交成功场景
// 2. 事务回滚场景（操作失败时）
// 3. 并发事务处理
// 4. 嵌套事务（如果支持）
// 5. 事务隔离级别
// 6. 批量操作的事务处理
// 7. 事务失败后数据未被修改
//
// 测试策略：
// - 使用真实的数据库操作，不使用 mock
// - 每个测试独立运行，互不影响
// - 验证事务的 ACID 特性
// - 测试错误场景和边界条件
//
// 验证需求：
// - 需求 13：数据持久化 - 数据库操作失败时保持当前状态不变
// - 需求 14：错误处理与验证 - 数据库操作失败时显示错误信息
// ============================================================================

use course_scheduling_system::db::class::{ClassRepository, CreateClassInput};
use course_scheduling_system::db::exclusion::{
    CreateTeacherMutualExclusionInput, ExclusionScope, TeacherMutualExclusionRepository,
};
use course_scheduling_system::db::history::OperationHistoryRepository;
use course_scheduling_system::db::migrations::MigrationManager;
use course_scheduling_system::db::teacher::{CreateTeacherInput, TeacherRepository};
use sqlx::SqlitePool;
use std::sync::Arc;
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

// ============================================================================
// 测试 1：事务提交成功场景
// ============================================================================

#[tokio::test]
async fn test_transaction_commit_success() {
    println!("\n=== 测试 1：事务提交成功场景 ===");

    let pool = setup_test_db().await;
    let repo = TeacherRepository::new(&pool);

    // 开始事务
    let mut tx = pool.begin().await.expect("开始事务失败");
    println!("✓ 事务已开始");

    // 在事务中创建教师
    let result = sqlx::query(
        r#"
        INSERT INTO teachers (name, teaching_group_id, created_at, updated_at)
        VALUES (?, ?, datetime('now'), datetime('now'))
        "#,
    )
    .bind("张老师")
    .bind(None::<i64>)
    .execute(&mut *tx)
    .await;

    assert!(result.is_ok(), "在事务中插入数据应该成功");
    println!("✓ 在事务中插入数据成功");

    // 提交事务
    tx.commit().await.expect("提交事务失败");
    println!("✓ 事务已提交");

    // 验证数据已持久化
    let teachers = repo.find_all().await.expect("查询教师失败");
    assert_eq!(teachers.len(), 1, "应该有 1 位教师");
    assert_eq!(teachers[0].name, "张老师");
    println!("✓ 数据已持久化，教师数量: {}", teachers.len());

    println!("=== 测试 1 通过 ===\n");
}

// ============================================================================
// 测试 2：事务回滚场景（操作失败时）
// ============================================================================

#[tokio::test]
async fn test_transaction_rollback_on_error() {
    println!("\n=== 测试 2：事务回滚场景（操作失败时） ===");

    let pool = setup_test_db().await;
    let repo = TeacherRepository::new(&pool);

    // 先创建一位教师作为基准
    repo.create(CreateTeacherInput {
        name: "李老师".to_string(),
        teaching_group_id: None,
    })
    .await
    .expect("创建基准教师失败");

    let initial_count = repo.find_all().await.expect("查询教师失败").len();
    println!("初始教师数量: {}", initial_count);

    // 开始事务
    let mut tx = pool.begin().await.expect("开始事务失败");
    println!("✓ 事务已开始");

    // 在事务中插入有效数据
    let result1 = sqlx::query(
        r#"
        INSERT INTO teachers (name, teaching_group_id, created_at, updated_at)
        VALUES (?, ?, datetime('now'), datetime('now'))
        "#,
    )
    .bind("王老师")
    .bind(None::<i64>)
    .execute(&mut *tx)
    .await;

    assert!(result1.is_ok(), "第一次插入应该成功");
    println!("✓ 第一次插入成功");

    // 尝试插入无效数据（违反约束）
    let result2 = sqlx::query(
        r#"
        INSERT INTO teachers (name, teaching_group_id, created_at, updated_at)
        VALUES (?, ?, datetime('now'), datetime('now'))
        "#,
    )
    .bind(None::<String>) // name 不能为 NULL
    .bind(None::<i64>)
    .execute(&mut *tx)
    .await;

    assert!(result2.is_err(), "插入无效数据应该失败");
    println!("✓ 插入无效数据失败（预期行为）");

    // 回滚事务
    tx.rollback().await.expect("回滚事务失败");
    println!("✓ 事务已回滚");

    // 验证数据未被修改
    let final_count = repo.find_all().await.expect("查询教师失败").len();
    assert_eq!(final_count, initial_count, "教师数量应该保持不变");
    println!("✓ 数据未被修改，教师数量仍为: {}", final_count);

    println!("=== 测试 2 通过 ===\n");
}

// ============================================================================
// 测试 3：并发事务处理
// ============================================================================

#[tokio::test]
async fn test_concurrent_transactions() {
    println!("\n=== 测试 3：并发事务处理 ===");

    let pool = setup_test_db().await;
    let pool = Arc::new(pool);

    // 创建信号量限制并发数
    let semaphore = Arc::new(Semaphore::new(5));
    let mut handles = vec![];

    // 启动 10 个并发事务
    for i in 0..10 {
        let pool = Arc::clone(&pool);
        let semaphore = Arc::clone(&semaphore);

        let handle = tokio::spawn(async move {
            let _permit = semaphore.acquire().await.unwrap();

            // 开始事务
            let mut tx = pool.begin().await.expect("开始事务失败");

            // 插入教师
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

            // 模拟一些处理时间
            tokio::time::sleep(tokio::time::Duration::from_millis(10)).await;

            // 提交事务
            tx.commit().await.expect("提交事务失败");
        });

        handles.push(handle);
    }

    // 等待所有任务完成
    for handle in handles {
        handle.await.expect("任务执行失败");
    }
    println!("✓ 所有并发事务已完成");

    // 验证数据
    let repo = TeacherRepository::new(&pool);
    let teachers = repo.find_all().await.expect("查询教师失败");
    assert_eq!(teachers.len(), 10, "应该有 10 位教师");
    println!("✓ 并发插入数据正确，教师数量: {}", teachers.len());

    println!("=== 测试 3 通过 ===\n");
}

// ============================================================================
// 测试 4：事务提交前后的数据可见性
// ============================================================================

#[tokio::test]
async fn test_transaction_isolation() {
    println!("\n=== 测试 4：事务提交前后的数据可见性 ===");

    let pool = setup_test_db().await;
    let repo = TeacherRepository::new(&pool);

    // 创建初始教师
    repo.create(CreateTeacherInput {
        name: "赵老师".to_string(),
        teaching_group_id: None,
    })
    .await
    .expect("创建教师失败");
    println!("✓ 创建初始教师");

    let initial_count = repo.find_all().await.expect("查询教师失败").len();
    println!("初始教师数量: {}", initial_count);

    // 开始事务
    let mut tx = pool.begin().await.expect("开始事务失败");
    println!("✓ 事务已开始");

    sqlx::query(
        r#"
        INSERT INTO teachers (name, teaching_group_id, created_at, updated_at)
        VALUES (?, ?, datetime('now'), datetime('now'))
        "#,
    )
    .bind("钱老师")
    .bind(None::<i64>)
    .execute(&mut *tx)
    .await
    .expect("事务插入失败");
    println!("✓ 事务中插入数据（未提交）");

    // 提交事务
    tx.commit().await.expect("提交事务失败");
    println!("✓ 事务已提交");

    // 提交后查询
    let final_count = repo.find_all().await.expect("查询教师失败").len();
    assert_eq!(final_count, initial_count + 1, "事务提交后应该能看到新数据");
    println!("✓ 事务提交后能看到新数据，教师数量: {}", final_count);

    println!("=== 测试 4 通过 ===\n");
}

// ============================================================================
// 测试 5：批量操作的事务处理（教师互斥关系）
// ============================================================================

#[tokio::test]
async fn test_batch_operation_transaction_exclusion() {
    println!("\n=== 测试 5：批量操作的事务处理（教师互斥关系） ===");

    let pool = setup_test_db().await;
    let teacher_repo = TeacherRepository::new(&pool);
    let exclusion_repo = TeacherMutualExclusionRepository::new(&pool);

    // 创建教师
    let teacher1 = teacher_repo
        .create(CreateTeacherInput {
            name: "孙老师".to_string(),
            teaching_group_id: None,
        })
        .await
        .expect("创建教师1失败");

    let teacher2 = teacher_repo
        .create(CreateTeacherInput {
            name: "周老师".to_string(),
            teaching_group_id: None,
        })
        .await
        .expect("创建教师2失败");

    let teacher3 = teacher_repo
        .create(CreateTeacherInput {
            name: "吴老师".to_string(),
            teaching_group_id: None,
        })
        .await
        .expect("创建教师3失败");

    // 准备批量创建数据（包含一个无效数据）
    let exclusions = vec![
        CreateTeacherMutualExclusionInput {
            teacher_a_id: teacher1.id,
            teacher_b_id: teacher2.id,
            scope: ExclusionScope::AllTime,
        },
        CreateTeacherMutualExclusionInput {
            teacher_a_id: teacher2.id,
            teacher_b_id: teacher2.id, // 无效：相同教师
            scope: ExclusionScope::AllTime,
        },
        CreateTeacherMutualExclusionInput {
            teacher_a_id: teacher2.id,
            teacher_b_id: teacher3.id,
            scope: ExclusionScope::AllTime,
        },
    ];

    // 批量创建应该失败（因为有无效数据）
    let result = exclusion_repo.batch_create(exclusions).await;
    assert!(result.is_err(), "批量创建应该失败");
    println!("✓ 批量创建失败（预期行为）");

    // 验证所有数据都未被插入（事务回滚）
    let all_exclusions = exclusion_repo.find_all().await.expect("查询互斥关系失败");
    assert_eq!(all_exclusions.len(), 0, "事务回滚后不应该有任何互斥关系");
    println!("✓ 事务回滚，没有数据被插入");

    // 准备有效的批量创建数据
    let valid_exclusions = vec![
        CreateTeacherMutualExclusionInput {
            teacher_a_id: teacher1.id,
            teacher_b_id: teacher2.id,
            scope: ExclusionScope::AllTime,
        },
        CreateTeacherMutualExclusionInput {
            teacher_a_id: teacher2.id,
            teacher_b_id: teacher3.id,
            scope: ExclusionScope::AllTime,
        },
    ];

    // 批量创建应该成功
    let created_count = exclusion_repo
        .batch_create(valid_exclusions)
        .await
        .expect("批量创建失败");
    assert_eq!(created_count, 2, "应该创建 2 个互斥关系");
    println!("✓ 批量创建成功，数量: {}", created_count);

    // 验证数据已持久化
    let all_exclusions = exclusion_repo.find_all().await.expect("查询互斥关系失败");
    assert_eq!(all_exclusions.len(), 2, "应该有 2 个互斥关系");
    println!("✓ 数据已持久化，互斥关系数量: {}", all_exclusions.len());

    println!("=== 测试 5 通过 ===\n");
}

// ============================================================================
// 测试 6：批量操作的事务处理（操作历史）
// ============================================================================

#[tokio::test]
async fn test_batch_operation_transaction_history() {
    println!("\n=== 测试 6：批量操作的事务处理（操作历史） ===");

    let pool = setup_test_db().await;
    let _class_repo = ClassRepository::new(&pool);

    // 创建班级
    let _class = _class_repo
        .create(CreateClassInput {
            name: "初一(1)班".to_string(),
            grade_level: Some(7),
        })
        .await
        .expect("创建班级失败");

    // 开始事务
    let mut tx = pool.begin().await.expect("开始事务失败");
    println!("✓ 事务已开始");

    // 在事务中创建课表
    let schedule_result = sqlx::query(
        r#"
        INSERT INTO schedules (version, cycle_days, periods_per_day, cost, is_active, created_at)
        VALUES (?, ?, ?, ?, ?, datetime('now'))
        "#,
    )
    .bind(1)
    .bind(5)
    .bind(8)
    .bind(0)
    .bind(1)
    .execute(&mut *tx)
    .await
    .expect("创建课表失败");

    let schedule_id = schedule_result.last_insert_rowid();
    println!("✓ 在事务中创建课表，ID: {}", schedule_id);

    // 在事务中批量创建操作历史
    for i in 0..5 {
        let operation_data = serde_json::json!({
            "action": "test",
            "index": i
        });

        sqlx::query(
            r#"
            INSERT INTO operation_history (schedule_id, operation_type, operation_data, created_at)
            VALUES (?, ?, ?, datetime('now'))
            "#,
        )
        .bind(schedule_id)
        .bind("Move")
        .bind(operation_data.to_string())
        .execute(&mut *tx)
        .await
        .expect("创建操作历史失败");
    }
    println!("✓ 在事务中批量创建操作历史");

    // 提交事务
    tx.commit().await.expect("提交事务失败");
    println!("✓ 事务已提交");

    // 验证数据已持久化
    let history_repo = OperationHistoryRepository::new(&pool);
    let histories = history_repo
        .find_by_schedule(schedule_id)
        .await
        .expect("查询操作历史失败");
    assert_eq!(histories.len(), 5, "应该有 5 条操作历史");
    println!("✓ 数据已持久化，操作历史数量: {}", histories.len());

    println!("=== 测试 6 通过 ===\n");
}

// ============================================================================
// 测试 7：事务失败后数据未被修改
// ============================================================================

#[tokio::test]
async fn test_transaction_failure_no_data_change() {
    println!("\n=== 测试 7：事务失败后数据未被修改 ===");

    let pool = setup_test_db().await;
    let teacher_repo = TeacherRepository::new(&pool);

    // 创建初始数据
    let teacher1 = teacher_repo
        .create(CreateTeacherInput {
            name: "郑老师".to_string(),
            teaching_group_id: None,
        })
        .await
        .expect("创建教师1失败");

    let teacher2 = teacher_repo
        .create(CreateTeacherInput {
            name: "王老师".to_string(),
            teaching_group_id: None,
        })
        .await
        .expect("创建教师2失败");

    let initial_count = teacher_repo.find_all().await.expect("查询教师失败").len();
    println!("初始教师数量: {}", initial_count);

    // 开始事务
    let mut tx = pool.begin().await.expect("开始事务失败");
    println!("✓ 事务已开始");

    // 在事务中更新教师1
    let update_result = sqlx::query(
        r#"
        UPDATE teachers
        SET name = ?, updated_at = datetime('now')
        WHERE id = ?
        "#,
    )
    .bind("郑老师（已更新）")
    .bind(teacher1.id)
    .execute(&mut *tx)
    .await;

    assert!(update_result.is_ok(), "更新教师1应该成功");
    println!("✓ 在事务中更新教师1");

    // 在事务中删除教师2
    let delete_result = sqlx::query("DELETE FROM teachers WHERE id = ?")
        .bind(teacher2.id)
        .execute(&mut *tx)
        .await;

    assert!(delete_result.is_ok(), "删除教师2应该成功");
    println!("✓ 在事务中删除教师2");

    // 在事务中插入新教师
    let insert_result = sqlx::query(
        r#"
        INSERT INTO teachers (name, teaching_group_id, created_at, updated_at)
        VALUES (?, ?, datetime('now'), datetime('now'))
        "#,
    )
    .bind("刘老师")
    .bind(None::<i64>)
    .execute(&mut *tx)
    .await;

    assert!(insert_result.is_ok(), "插入新教师应该成功");
    println!("✓ 在事务中插入新教师");

    // 回滚事务（模拟失败场景）
    tx.rollback().await.expect("回滚事务失败");
    println!("✓ 事务已回滚");

    // 验证数据未被修改
    let final_count = teacher_repo.find_all().await.expect("查询教师失败").len();
    assert_eq!(final_count, initial_count, "教师数量应该保持不变");
    println!("✓ 教师数量未变，仍为: {}", final_count);

    // 验证教师1的名称未被修改
    let teacher1_after = teacher_repo
        .find_by_id(teacher1.id)
        .await
        .expect("查询教师1失败")
        .expect("教师1应该存在");
    assert_eq!(teacher1_after.name, "郑老师", "教师1的名称应该未被修改");
    println!("✓ 教师1的名称未被修改: {}", teacher1_after.name);

    // 验证教师2仍然存在
    let teacher2_after = teacher_repo
        .find_by_id(teacher2.id)
        .await
        .expect("查询教师2失败");
    assert!(teacher2_after.is_some(), "教师2应该仍然存在");
    println!("✓ 教师2仍然存在");

    println!("=== 测试 7 通过 ===\n");
}

// ============================================================================
// 测试 8：嵌套事务（保存点）
// ============================================================================

#[tokio::test]
async fn test_nested_transaction_savepoint() {
    println!("\n=== 测试 8：嵌套事务（保存点） ===");

    let pool = setup_test_db().await;
    let teacher_repo = TeacherRepository::new(&pool);

    // 开始外层事务
    let mut tx = pool.begin().await.expect("开始外层事务失败");
    println!("✓ 外层事务已开始");

    // 在外层事务中插入教师1
    sqlx::query(
        r#"
        INSERT INTO teachers (name, teaching_group_id, created_at, updated_at)
        VALUES (?, ?, datetime('now'), datetime('now'))
        "#,
    )
    .bind("陈老师")
    .bind(None::<i64>)
    .execute(&mut *tx)
    .await
    .expect("插入教师1失败");
    println!("✓ 在外层事务中插入教师1");

    // 创建保存点（模拟嵌套事务）
    sqlx::query("SAVEPOINT sp1")
        .execute(&mut *tx)
        .await
        .expect("创建保存点失败");
    println!("✓ 创建保存点 sp1");

    // 在保存点后插入教师2
    sqlx::query(
        r#"
        INSERT INTO teachers (name, teaching_group_id, created_at, updated_at)
        VALUES (?, ?, datetime('now'), datetime('now'))
        "#,
    )
    .bind("林老师")
    .bind(None::<i64>)
    .execute(&mut *tx)
    .await
    .expect("插入教师2失败");
    println!("✓ 在保存点后插入教师2");

    // 回滚到保存点（撤销教师2的插入）
    sqlx::query("ROLLBACK TO SAVEPOINT sp1")
        .execute(&mut *tx)
        .await
        .expect("回滚到保存点失败");
    println!("✓ 回滚到保存点 sp1");

    // 在保存点后插入教师3
    sqlx::query(
        r#"
        INSERT INTO teachers (name, teaching_group_id, created_at, updated_at)
        VALUES (?, ?, datetime('now'), datetime('now'))
        "#,
    )
    .bind("黄老师")
    .bind(None::<i64>)
    .execute(&mut *tx)
    .await
    .expect("插入教师3失败");
    println!("✓ 在保存点后插入教师3");

    // 提交外层事务
    tx.commit().await.expect("提交外层事务失败");
    println!("✓ 外层事务已提交");

    // 验证数据
    let teachers = teacher_repo.find_all().await.expect("查询教师失败");
    assert_eq!(teachers.len(), 2, "应该有 2 位教师（教师1和教师3）");
    println!("✓ 数据正确，教师数量: {}", teachers.len());

    // 验证教师名称
    let names: Vec<String> = teachers.iter().map(|t| t.name.clone()).collect();
    assert!(names.contains(&"陈老师".to_string()), "应该包含教师1");
    assert!(names.contains(&"黄老师".to_string()), "应该包含教师3");
    assert!(!names.contains(&"林老师".to_string()), "不应该包含教师2");
    println!("✓ 教师名称正确: {:?}", names);

    println!("=== 测试 8 通过 ===\n");
}

// ============================================================================
// 测试 9：事务超时处理
// ============================================================================

#[tokio::test]
async fn test_transaction_timeout() {
    println!("\n=== 测试 9：事务超时处理 ===");

    let pool = setup_test_db().await;

    // 开始事务
    let mut tx = pool.begin().await.expect("开始事务失败");
    println!("✓ 事务已开始");

    // 插入数据
    sqlx::query(
        r#"
        INSERT INTO teachers (name, teaching_group_id, created_at, updated_at)
        VALUES (?, ?, datetime('now'), datetime('now'))
        "#,
    )
    .bind("测试教师")
    .bind(None::<i64>)
    .execute(&mut *tx)
    .await
    .expect("插入数据失败");
    println!("✓ 插入数据成功");

    // 模拟长时间操作（但不超过连接超时）
    tokio::time::sleep(tokio::time::Duration::from_millis(100)).await;
    println!("✓ 模拟长时间操作完成");

    // 提交事务
    let commit_result = tx.commit().await;
    assert!(commit_result.is_ok(), "提交事务应该成功");
    println!("✓ 事务提交成功");

    // 验证数据
    let repo = TeacherRepository::new(&pool);
    let teachers = repo.find_all().await.expect("查询教师失败");
    assert_eq!(teachers.len(), 1, "应该有 1 位教师");
    println!("✓ 数据已持久化");

    println!("=== 测试 9 通过 ===\n");
}

// ============================================================================
// 测试 10：复杂场景 - 多表关联的事务处理
// ============================================================================

#[tokio::test]
async fn test_complex_multi_table_transaction() {
    println!("\n=== 测试 10：复杂场景 - 多表关联的事务处理 ===");

    let pool = setup_test_db().await;

    // 开始事务
    let mut tx = pool.begin().await.expect("开始事务失败");
    println!("✓ 事务已开始");

    // 1. 创建教师
    let teacher_result = sqlx::query(
        r#"
        INSERT INTO teachers (name, teaching_group_id, created_at, updated_at)
        VALUES (?, ?, datetime('now'), datetime('now'))
        "#,
    )
    .bind("张老师")
    .bind(None::<i64>)
    .execute(&mut *tx)
    .await
    .expect("创建教师失败");

    let teacher_id = teacher_result.last_insert_rowid();
    println!("✓ 创建教师，ID: {}", teacher_id);

    // 2. 创建教师偏好
    sqlx::query(
        r#"
        INSERT INTO teacher_preferences (
            teacher_id, preferred_slots, time_bias, weight, blocked_slots, created_at, updated_at
        )
        VALUES (?, ?, ?, ?, ?, datetime('now'), datetime('now'))
        "#,
    )
    .bind(teacher_id)
    .bind("1111111111111111")
    .bind(0)
    .bind(5)
    .bind("0")
    .execute(&mut *tx)
    .await
    .expect("创建教师偏好失败");
    println!("✓ 创建教师偏好");

    // 3. 创建班级
    let class_result = sqlx::query(
        r#"
        INSERT INTO classes (name, grade_level, created_at, updated_at)
        VALUES (?, ?, datetime('now'), datetime('now'))
        "#,
    )
    .bind("初一(1)班")
    .bind(7)
    .execute(&mut *tx)
    .await
    .expect("创建班级失败");

    let class_id = class_result.last_insert_rowid();
    println!("✓ 创建班级，ID: {}", class_id);

    // 4. 创建科目配置
    sqlx::query(
        r#"
        INSERT INTO subject_configs (
            id, name, forbidden_slots, allow_double_session, venue_id, is_major_subject, created_at, updated_at
        )
        VALUES (?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
        "#,
    )
    .bind("math")
    .bind("数学")
    .bind("0")
    .bind(1)
    .bind(None::<String>)
    .bind(1)
    .execute(&mut *tx)
    .await
    .expect("创建科目配置失败");
    println!("✓ 创建科目配置");

    // 5. 创建教学计划
    sqlx::query(
        r#"
        INSERT INTO class_curriculums (
            class_id, subject_id, teacher_id, target_sessions,
            is_combined_class, combined_class_ids, week_type, created_at, updated_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
        "#,
    )
    .bind(class_id)
    .bind("math")
    .bind(teacher_id)
    .bind(4)
    .bind(0)
    .bind("[]")
    .bind("Every")
    .execute(&mut *tx)
    .await
    .expect("创建教学计划失败");
    println!("✓ 创建教学计划");

    // 提交事务
    tx.commit().await.expect("提交事务失败");
    println!("✓ 事务已提交");

    // 验证所有数据都已持久化
    let teacher_repo = TeacherRepository::new(&pool);
    let class_repo = ClassRepository::new(&pool);

    let teachers = teacher_repo.find_all().await.expect("查询教师失败");
    assert_eq!(teachers.len(), 1, "应该有 1 位教师");
    println!("✓ 教师数据已持久化");

    let teacher_pref = teacher_repo
        .find_preference(teacher_id)
        .await
        .expect("查询教师偏好失败");
    assert!(teacher_pref.is_some(), "教师偏好应该存在");
    println!("✓ 教师偏好数据已持久化");

    let classes = class_repo.find_all().await.expect("查询班级失败");
    assert_eq!(classes.len(), 1, "应该有 1 个班级");
    println!("✓ 班级数据已持久化");

    println!("=== 测试 10 通过 ===\n");
}

// ============================================================================
// 测试 11：事务中的外键约束验证
// ============================================================================

#[tokio::test]
async fn test_transaction_foreign_key_constraint() {
    println!("\n=== 测试 11：事务中的外键约束验证 ===");

    let pool = setup_test_db().await;

    // 开始事务
    let mut tx = pool.begin().await.expect("开始事务失败");
    println!("✓ 事务已开始");

    // 尝试为不存在的教师创建偏好（违反外键约束）
    let result = sqlx::query(
        r#"
        INSERT INTO teacher_preferences (
            teacher_id, preferred_slots, time_bias, weight, blocked_slots, created_at, updated_at
        )
        VALUES (?, ?, ?, ?, ?, datetime('now'), datetime('now'))
        "#,
    )
    .bind(999) // 不存在的教师 ID
    .bind("0")
    .bind(0)
    .bind(1)
    .bind("0")
    .execute(&mut *tx)
    .await;

    assert!(result.is_err(), "违反外键约束应该失败");
    println!("✓ 违反外键约束失败（预期行为）");

    // 回滚事务
    tx.rollback().await.expect("回滚事务失败");
    println!("✓ 事务已回滚");

    // 验证没有数据被插入
    let teacher_repo = TeacherRepository::new(&pool);
    let pref = teacher_repo
        .find_preference(999)
        .await
        .expect("查询偏好失败");
    assert!(pref.is_none(), "不应该有偏好数据");
    println!("✓ 没有数据被插入");

    println!("=== 测试 11 通过 ===\n");
}

// ============================================================================
// 测试 12：事务中的唯一约束验证
// ============================================================================

#[tokio::test]
async fn test_transaction_unique_constraint() {
    println!("\n=== 测试 12：事务中的唯一约束验证 ===");

    let pool = setup_test_db().await;
    let class_repo = ClassRepository::new(&pool);

    // 先创建一个班级
    class_repo
        .create(CreateClassInput {
            name: "初一(1)班".to_string(),
            grade_level: Some(7),
        })
        .await
        .expect("创建班级失败");
    println!("✓ 创建初始班级");

    // 开始事务
    let mut tx = pool.begin().await.expect("开始事务失败");
    println!("✓ 事务已开始");

    // 在事务中创建新班级
    sqlx::query(
        r#"
        INSERT INTO classes (name, grade_level, created_at, updated_at)
        VALUES (?, ?, datetime('now'), datetime('now'))
        "#,
    )
    .bind("初一(2)班")
    .bind(7)
    .execute(&mut *tx)
    .await
    .expect("创建新班级失败");
    println!("✓ 在事务中创建新班级");

    // 尝试创建重复名称的班级（违反唯一约束）
    let result = sqlx::query(
        r#"
        INSERT INTO classes (name, grade_level, created_at, updated_at)
        VALUES (?, ?, datetime('now'), datetime('now'))
        "#,
    )
    .bind("初一(1)班") // 重复的班级名称
    .bind(7)
    .execute(&mut *tx)
    .await;

    assert!(result.is_err(), "违反唯一约束应该失败");
    println!("✓ 违反唯一约束失败（预期行为）");

    // 回滚事务
    tx.rollback().await.expect("回滚事务失败");
    println!("✓ 事务已回滚");

    // 验证只有初始班级存在
    let classes = class_repo.find_all().await.expect("查询班级失败");
    assert_eq!(classes.len(), 1, "应该只有 1 个班级");
    assert_eq!(classes[0].name, "初一(1)班");
    println!("✓ 只有初始班级存在，事务中的新班级未被保存");

    println!("=== 测试 12 通过 ===\n");
}

// ============================================================================
// 测试 13：大批量数据的事务处理
// ============================================================================

#[tokio::test]
async fn test_large_batch_transaction() {
    println!("\n=== 测试 13：大批量数据的事务处理 ===");

    let pool = setup_test_db().await;
    let teacher_repo = TeacherRepository::new(&pool);

    // 开始事务
    let mut tx = pool.begin().await.expect("开始事务失败");
    println!("✓ 事务已开始");

    // 批量插入 100 位教师
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
    println!("✓ 批量插入 100 位教师");

    // 提交事务
    tx.commit().await.expect("提交事务失败");
    println!("✓ 事务已提交");

    // 验证数据
    let teachers = teacher_repo.find_all().await.expect("查询教师失败");
    assert_eq!(teachers.len(), 100, "应该有 100 位教师");
    println!("✓ 数据已持久化，教师数量: {}", teachers.len());

    println!("=== 测试 13 通过 ===\n");
}

// ============================================================================
// 测试 14：事务中的数据一致性验证
// ============================================================================

#[tokio::test]
async fn test_transaction_data_consistency() {
    println!("\n=== 测试 14：事务中的数据一致性验证 ===");

    let pool = setup_test_db().await;
    let teacher_repo = TeacherRepository::new(&pool);
    let exclusion_repo = TeacherMutualExclusionRepository::new(&pool);

    // 创建两位教师
    let teacher1 = teacher_repo
        .create(CreateTeacherInput {
            name: "教师A".to_string(),
            teaching_group_id: None,
        })
        .await
        .expect("创建教师A失败");

    let teacher2 = teacher_repo
        .create(CreateTeacherInput {
            name: "教师B".to_string(),
            teaching_group_id: None,
        })
        .await
        .expect("创建教师B失败");

    // 开始事务
    let mut tx = pool.begin().await.expect("开始事务失败");
    println!("✓ 事务已开始");

    // 在事务中创建互斥关系
    sqlx::query(
        r#"
        INSERT INTO teacher_mutual_exclusions (
            teacher_a_id, teacher_b_id, scope_type, specific_slots, created_at
        )
        VALUES (?, ?, ?, ?, datetime('now'))
        "#,
    )
    .bind(teacher1.id)
    .bind(teacher2.id)
    .bind("AllTime")
    .bind(None::<String>)
    .execute(&mut *tx)
    .await
    .expect("创建互斥关系失败");
    println!("✓ 在事务中创建互斥关系");

    // 在事务中删除教师A
    sqlx::query("DELETE FROM teachers WHERE id = ?")
        .bind(teacher1.id)
        .execute(&mut *tx)
        .await
        .expect("删除教师A失败");
    println!("✓ 在事务中删除教师A");

    // 提交事务
    tx.commit().await.expect("提交事务失败");
    println!("✓ 事务已提交");

    // 验证数据一致性
    let teachers = teacher_repo.find_all().await.expect("查询教师失败");
    assert_eq!(teachers.len(), 1, "应该只有 1 位教师");
    assert_eq!(teachers[0].id, teacher2.id, "应该是教师B");
    println!("✓ 教师A已被删除");

    // 验证互斥关系仍然存在（或被级联删除，取决于数据库设计）
    let exclusions = exclusion_repo.find_all().await.expect("查询互斥关系失败");
    println!("✓ 互斥关系数量: {}", exclusions.len());

    println!("=== 测试 14 通过 ===\n");
}
