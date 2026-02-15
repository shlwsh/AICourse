// ============================================================================
// 操作历史数据访问模块单元测试
// ============================================================================

use super::history::{CreateOperationHistoryInput, OperationHistoryRepository, OperationType};
use crate::db::DatabaseManager;
use serde_json::json;
use sqlx::SqlitePool;

/// 创建测试数据库
async fn setup_test_db() -> SqlitePool {
    let db = DatabaseManager::new("sqlite::memory:", "migrations")
        .await
        .expect("创建测试数据库失败");
    db.pool().clone()
}

/// 创建测试课表
async fn create_test_schedule(pool: &SqlitePool) -> i64 {
    let result = sqlx::query(
        r#"
        INSERT INTO schedules (version, cycle_days, periods_per_day, cost, is_active, created_at)
        VALUES (1, 5, 8, 0, 1, datetime('now'))
        "#,
    )
    .execute(pool)
    .await
    .expect("创建测试课表失败");

    result.last_insert_rowid()
}

#[tokio::test]
async fn test_create_operation_history() {
    let pool = setup_test_db().await;
    let schedule_id = create_test_schedule(&pool).await;
    let repo = OperationHistoryRepository::new(&pool);

    let input = CreateOperationHistoryInput {
        schedule_id,
        operation_type: OperationType::Move,
        operation_data: json!({
            "class_id": 1,
            "subject_id": "math",
            "from_slot": { "day": 0, "period": 0 },
            "to_slot": { "day": 0, "period": 1 }
        }),
    };

    let result = repo.create(input).await;
    assert!(result.is_ok());

    let history = result.unwrap();
    assert_eq!(history.schedule_id, schedule_id);
    assert_eq!(history.operation_type, "Move");
    assert!(history.operation_data.contains("class_id"));
}

#[tokio::test]
async fn test_find_by_id() {
    let pool = setup_test_db().await;
    let schedule_id = create_test_schedule(&pool).await;
    let repo = OperationHistoryRepository::new(&pool);

    // 创建操作历史
    let input = CreateOperationHistoryInput {
        schedule_id,
        operation_type: OperationType::Swap,
        operation_data: json!({
            "entry_a": { "class_id": 1, "slot": { "day": 0, "period": 0 } },
            "entry_b": { "class_id": 2, "slot": { "day": 0, "period": 1 } }
        }),
    };

    let created = repo.create(input).await.unwrap();

    // 查询操作历史
    let result = repo.find_by_id(created.id).await;
    assert!(result.is_ok());

    let history = result.unwrap();
    assert!(history.is_some());

    let history = history.unwrap();
    assert_eq!(history.id, created.id);
    assert_eq!(history.operation_type, "Swap");
}

#[tokio::test]
async fn test_find_by_id_not_found() {
    let pool = setup_test_db().await;
    let repo = OperationHistoryRepository::new(&pool);

    let result = repo.find_by_id(999).await;
    assert!(result.is_ok());
    assert!(result.unwrap().is_none());
}

#[tokio::test]
async fn test_find_by_schedule() {
    let pool = setup_test_db().await;
    let schedule_id = create_test_schedule(&pool).await;
    let repo = OperationHistoryRepository::new(&pool);

    // 创建多条操作历史
    for i in 0..3 {
        let input = CreateOperationHistoryInput {
            schedule_id,
            operation_type: OperationType::Move,
            operation_data: json!({
                "index": i,
                "class_id": i + 1
            }),
        };
        repo.create(input).await.unwrap();
    }

    // 查询课表的所有操作历史
    let result = repo.find_by_schedule(schedule_id).await;
    assert!(result.is_ok());

    let histories = result.unwrap();
    assert_eq!(histories.len(), 3);

    // 验证按创建时间倒序排列
    for i in 0..histories.len() - 1 {
        assert!(histories[i].created_at >= histories[i + 1].created_at);
    }
}

#[tokio::test]
async fn test_find_recent() {
    let pool = setup_test_db().await;
    let schedule_id = create_test_schedule(&pool).await;
    let repo = OperationHistoryRepository::new(&pool);

    // 创建 5 条操作历史
    for i in 0..5 {
        let input = CreateOperationHistoryInput {
            schedule_id,
            operation_type: OperationType::Add,
            operation_data: json!({
                "index": i
            }),
        };
        repo.create(input).await.unwrap();
    }

    // 查询最近 3 条
    let result = repo.find_recent(schedule_id, 3).await;
    assert!(result.is_ok());

    let histories = result.unwrap();
    assert_eq!(histories.len(), 3);
}

#[tokio::test]
async fn test_delete() {
    let pool = setup_test_db().await;
    let schedule_id = create_test_schedule(&pool).await;
    let repo = OperationHistoryRepository::new(&pool);

    // 创建操作历史
    let input = CreateOperationHistoryInput {
        schedule_id,
        operation_type: OperationType::Remove,
        operation_data: json!({
            "class_id": 1
        }),
    };

    let created = repo.create(input).await.unwrap();

    // 删除操作历史
    let result = repo.delete(created.id).await;
    assert!(result.is_ok());

    // 验证已删除
    let find_result = repo.find_by_id(created.id).await;
    assert!(find_result.is_ok());
    assert!(find_result.unwrap().is_none());
}

#[tokio::test]
async fn test_delete_not_found() {
    let pool = setup_test_db().await;
    let repo = OperationHistoryRepository::new(&pool);

    let result = repo.delete(999).await;
    assert!(result.is_err());
}

#[tokio::test]
async fn test_cleanup_old_history() {
    let pool = setup_test_db().await;
    let schedule_id = create_test_schedule(&pool).await;
    let repo = OperationHistoryRepository::new(&pool);

    // 创建 10 条操作历史
    for i in 0..10 {
        let input = CreateOperationHistoryInput {
            schedule_id,
            operation_type: OperationType::Move,
            operation_data: json!({
                "index": i
            }),
        };
        repo.create(input).await.unwrap();
    }

    // 清理，保留最近 5 条
    let result = repo.cleanup_old_history(schedule_id, 5).await;
    assert!(result.is_ok());

    let deleted_count = result.unwrap();
    assert_eq!(deleted_count, 5);

    // 验证剩余数量
    let remaining = repo.find_by_schedule(schedule_id).await.unwrap();
    assert_eq!(remaining.len(), 5);
}

#[tokio::test]
async fn test_cleanup_old_history_no_cleanup_needed() {
    let pool = setup_test_db().await;
    let schedule_id = create_test_schedule(&pool).await;
    let repo = OperationHistoryRepository::new(&pool);

    // 创建 3 条操作历史
    for i in 0..3 {
        let input = CreateOperationHistoryInput {
            schedule_id,
            operation_type: OperationType::Move,
            operation_data: json!({
                "index": i
            }),
        };
        repo.create(input).await.unwrap();
    }

    // 清理，保留最近 5 条（实际只有 3 条）
    let result = repo.cleanup_old_history(schedule_id, 5).await;
    assert!(result.is_ok());

    let deleted_count = result.unwrap();
    assert_eq!(deleted_count, 0);

    // 验证数量未变
    let remaining = repo.find_by_schedule(schedule_id).await.unwrap();
    assert_eq!(remaining.len(), 3);
}

#[tokio::test]
async fn test_delete_by_schedule() {
    let pool = setup_test_db().await;
    let schedule_id = create_test_schedule(&pool).await;
    let repo = OperationHistoryRepository::new(&pool);

    // 创建多条操作历史
    for i in 0..5 {
        let input = CreateOperationHistoryInput {
            schedule_id,
            operation_type: OperationType::Move,
            operation_data: json!({
                "index": i
            }),
        };
        repo.create(input).await.unwrap();
    }

    // 删除课表的所有操作历史
    let result = repo.delete_by_schedule(schedule_id).await;
    assert!(result.is_ok());

    let deleted_count = result.unwrap();
    assert_eq!(deleted_count, 5);

    // 验证已全部删除
    let remaining = repo.find_by_schedule(schedule_id).await.unwrap();
    assert_eq!(remaining.len(), 0);
}

#[tokio::test]
async fn test_count_by_schedule() {
    let pool = setup_test_db().await;
    let schedule_id = create_test_schedule(&pool).await;
    let repo = OperationHistoryRepository::new(&pool);

    // 初始数量应为 0
    let count = repo.count_by_schedule(schedule_id).await.unwrap();
    assert_eq!(count, 0);

    // 创建 3 条操作历史
    for i in 0..3 {
        let input = CreateOperationHistoryInput {
            schedule_id,
            operation_type: OperationType::Move,
            operation_data: json!({
                "index": i
            }),
        };
        repo.create(input).await.unwrap();
    }

    // 验证数量
    let count = repo.count_by_schedule(schedule_id).await.unwrap();
    assert_eq!(count, 3);
}

#[tokio::test]
async fn test_operation_type_conversion() {
    // 测试操作类型转换
    assert_eq!(OperationType::Move.to_string(), "Move");
    assert_eq!(OperationType::Swap.to_string(), "Swap");
    assert_eq!(OperationType::Add.to_string(), "Add");
    assert_eq!(OperationType::Remove.to_string(), "Remove");

    assert_eq!(
        OperationType::from_string("Move").unwrap(),
        OperationType::Move
    );
    assert_eq!(
        OperationType::from_string("Swap").unwrap(),
        OperationType::Swap
    );
    assert_eq!(
        OperationType::from_string("Add").unwrap(),
        OperationType::Add
    );
    assert_eq!(
        OperationType::from_string("Remove").unwrap(),
        OperationType::Remove
    );

    assert!(OperationType::from_string("Invalid").is_err());
}

#[tokio::test]
async fn test_multiple_schedules() {
    let pool = setup_test_db().await;
    let schedule_id_1 = create_test_schedule(&pool).await;
    let schedule_id_2 = create_test_schedule(&pool).await;
    let repo = OperationHistoryRepository::new(&pool);

    // 为第一个课表创建操作历史
    for i in 0..3 {
        let input = CreateOperationHistoryInput {
            schedule_id: schedule_id_1,
            operation_type: OperationType::Move,
            operation_data: json!({
                "schedule": 1,
                "index": i
            }),
        };
        repo.create(input).await.unwrap();
    }

    // 为第二个课表创建操作历史
    for i in 0..2 {
        let input = CreateOperationHistoryInput {
            schedule_id: schedule_id_2,
            operation_type: OperationType::Swap,
            operation_data: json!({
                "schedule": 2,
                "index": i
            }),
        };
        repo.create(input).await.unwrap();
    }

    // 验证各自的操作历史数量
    let count_1 = repo.count_by_schedule(schedule_id_1).await.unwrap();
    let count_2 = repo.count_by_schedule(schedule_id_2).await.unwrap();

    assert_eq!(count_1, 3);
    assert_eq!(count_2, 2);

    // 验证查询结果互不干扰
    let histories_1 = repo.find_by_schedule(schedule_id_1).await.unwrap();
    let histories_2 = repo.find_by_schedule(schedule_id_2).await.unwrap();

    assert_eq!(histories_1.len(), 3);
    assert_eq!(histories_2.len(), 2);

    for history in histories_1 {
        assert_eq!(history.schedule_id, schedule_id_1);
        assert_eq!(history.operation_type, "Move");
    }

    for history in histories_2 {
        assert_eq!(history.schedule_id, schedule_id_2);
        assert_eq!(history.operation_type, "Swap");
    }
}
