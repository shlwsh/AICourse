// ============================================================================
// DatabaseManager 单元测试
// ============================================================================
// 本模块测试 DatabaseManager 的核心功能
//
// 测试覆盖：
// 1. 数据库连接和初始化
// 2. 自动迁移执行
// 3. 健康检查
// 4. 连接池管理
// 5. 数据库备份
// 6. 数据库优化
// 7. 错误处理
// ============================================================================

use super::DatabaseManager;
use sqlx::SqlitePool;
use std::fs;
use tempfile::TempDir;

/// 创建测试用的临时数据库
///
/// # 返回
/// - `(String, TempDir)`: (数据库 URL, 临时目录)
fn create_test_db() -> (String, TempDir) {
    let temp_dir = TempDir::new().unwrap();
    let db_path = temp_dir.path().join("test.db");

    // 确保父目录存在
    if let Some(parent) = db_path.parent() {
        fs::create_dir_all(parent).unwrap();
    }

    // 使用 sqlite:// 协议和绝对路径，添加 mode=rwc 参数以自动创建数据库
    let db_url = format!("sqlite://{}?mode=rwc", db_path.to_str().unwrap());
    (db_url, temp_dir)
}

/// 创建测试用的迁移目录
///
/// # 返回
/// - `TempDir`: 包含测试迁移脚本的临时目录
fn create_test_migrations_dir() -> TempDir {
    let temp_dir = TempDir::new().unwrap();

    // 创建测试迁移脚本
    fs::write(
        temp_dir
            .path()
            .join("20240101_000000_create_test_table.sql"),
        "CREATE TABLE test_table (id INTEGER PRIMARY KEY, name TEXT NOT NULL);",
    )
    .unwrap();

    fs::write(
        temp_dir.path().join("20240102_000000_add_test_index.sql"),
        "CREATE INDEX idx_test_name ON test_table(name);",
    )
    .unwrap();

    temp_dir
}

#[tokio::test]
async fn test_database_manager_new() {
    // 准备测试环境
    let (db_url, _temp_dir) = create_test_db();
    let migrations_dir = create_test_migrations_dir();

    println!("数据库 URL: {}", db_url);
    println!("迁移目录: {}", migrations_dir.path().display());

    // 创建 DatabaseManager
    let result = DatabaseManager::new(&db_url, migrations_dir.path()).await;

    // 验证创建成功
    if let Err(ref e) = result {
        eprintln!("创建失败: {:?}", e);
    }
    assert!(
        result.is_ok(),
        "DatabaseManager 创建应该成功: {:?}",
        result.err()
    );

    let db = result.unwrap();

    // 验证连接池可用
    assert!(db.pool().size() > 0, "连接池应该有连接");

    // 清理
    db.close().await;
}

#[tokio::test]
async fn test_database_manager_with_migrations() {
    // 准备测试环境
    let (db_url, _temp_dir) = create_test_db();
    let migrations_dir = create_test_migrations_dir();

    // 创建 DatabaseManager（会自动执行迁移）
    let db = DatabaseManager::new(&db_url, migrations_dir.path())
        .await
        .unwrap();

    // 验证迁移是否执行成功
    let pool = db.pool();

    // 检查 test_table 是否存在
    let result =
        sqlx::query("SELECT name FROM sqlite_master WHERE type='table' AND name='test_table'")
            .fetch_one(pool)
            .await;

    assert!(result.is_ok(), "test_table 应该存在");

    // 检查索引是否存在
    let result =
        sqlx::query("SELECT name FROM sqlite_master WHERE type='index' AND name='idx_test_name'")
            .fetch_one(pool)
            .await;

    assert!(result.is_ok(), "idx_test_name 索引应该存在");

    // 清理
    db.close().await;
}

#[tokio::test]
async fn test_health_check() {
    // 准备测试环境
    let (db_url, _temp_dir) = create_test_db();
    let migrations_dir = create_test_migrations_dir();

    // 创建 DatabaseManager
    let db = DatabaseManager::new(&db_url, migrations_dir.path())
        .await
        .unwrap();

    // 执行健康检查
    let result = db.health_check().await;

    // 验证健康检查成功
    assert!(result.is_ok(), "健康检查应该成功");

    // 清理
    db.close().await;
}

#[tokio::test]
async fn test_get_pool_stats() {
    // 准备测试环境
    let (db_url, _temp_dir) = create_test_db();
    let migrations_dir = create_test_migrations_dir();

    // 创建 DatabaseManager
    let db = DatabaseManager::new(&db_url, migrations_dir.path())
        .await
        .unwrap();

    // 获取连接池统计信息
    let stats = db.get_pool_stats();

    // 验证统计信息
    assert!(stats.size > 0, "连接池大小应该大于 0");
    assert!(
        stats.idle <= stats.size as usize,
        "空闲连接数不应超过总连接数"
    );

    // 清理
    db.close().await;
}

#[tokio::test]
async fn test_backup() {
    // 准备测试环境
    let (db_url, _temp_dir) = create_test_db();
    let migrations_dir = create_test_migrations_dir();

    // 创建 DatabaseManager
    let db = DatabaseManager::new(&db_url, migrations_dir.path())
        .await
        .unwrap();

    // 插入测试数据
    sqlx::query("INSERT INTO test_table (name) VALUES ('test1'), ('test2')")
        .execute(db.pool())
        .await
        .unwrap();

    // 创建备份目录
    let backup_dir = TempDir::new().unwrap();
    let backup_path = backup_dir.path().join("backup.db");

    // 执行备份
    let result = db.backup(&backup_path).await;

    // 验证备份成功
    assert!(result.is_ok(), "备份应该成功");
    assert!(backup_path.exists(), "备份文件应该存在");

    // 验证备份文件内容
    let backup_url = format!("sqlite://{}", backup_path.to_str().unwrap());
    let backup_pool = SqlitePool::connect(&backup_url).await.unwrap();

    let count: (i64,) = sqlx::query_as("SELECT COUNT(*) FROM test_table")
        .fetch_one(&backup_pool)
        .await
        .unwrap();

    assert_eq!(count.0, 2, "备份文件应该包含 2 条记录");

    // 清理
    backup_pool.close().await;
    db.close().await;
}

#[tokio::test]
async fn test_optimize() {
    // 准备测试环境
    let (db_url, _temp_dir) = create_test_db();
    let migrations_dir = create_test_migrations_dir();

    // 创建 DatabaseManager
    let db = DatabaseManager::new(&db_url, migrations_dir.path())
        .await
        .unwrap();

    // 插入测试数据
    sqlx::query("INSERT INTO test_table (name) VALUES ('test1'), ('test2'), ('test3')")
        .execute(db.pool())
        .await
        .unwrap();

    // 删除部分数据
    sqlx::query("DELETE FROM test_table WHERE name = 'test2'")
        .execute(db.pool())
        .await
        .unwrap();

    // 执行优化
    let result = db.optimize().await;

    // 验证优化成功
    assert!(result.is_ok(), "优化应该成功");

    // 验证数据完整性
    let count: (i64,) = sqlx::query_as("SELECT COUNT(*) FROM test_table")
        .fetch_one(db.pool())
        .await
        .unwrap();

    assert_eq!(count.0, 2, "优化后应该有 2 条记录");

    // 清理
    db.close().await;
}

#[tokio::test]
async fn test_invalid_database_url() {
    // 准备测试环境
    let migrations_dir = create_test_migrations_dir();

    // 尝试使用无效的数据库 URL
    let result = DatabaseManager::new("invalid://url", migrations_dir.path()).await;

    // 验证应该失败
    assert!(result.is_err(), "无效的数据库 URL 应该导致失败");
}

#[tokio::test]
async fn test_invalid_migrations_dir() {
    // 准备测试环境
    let (db_url, _temp_dir) = create_test_db();

    // 尝试使用不存在的迁移目录
    let result = DatabaseManager::new(&db_url, "/nonexistent/path").await;

    // 验证应该失败
    assert!(result.is_err(), "不存在的迁移目录应该导致失败");
}

#[tokio::test]
async fn test_concurrent_operations() {
    // 准备测试环境
    let (db_url, _temp_dir) = create_test_db();
    let migrations_dir = create_test_migrations_dir();

    // 创建 DatabaseManager
    let db = DatabaseManager::new(&db_url, migrations_dir.path())
        .await
        .unwrap();

    // 并发执行多个操作
    let pool = db.pool().clone();

    let handles: Vec<_> = (0..10)
        .map(|i| {
            let pool = pool.clone();
            tokio::spawn(async move {
                sqlx::query("INSERT INTO test_table (name) VALUES (?)")
                    .bind(format!("test{}", i))
                    .execute(&pool)
                    .await
                    .unwrap();
            })
        })
        .collect();

    // 等待所有任务完成
    for handle in handles {
        handle.await.unwrap();
    }

    // 验证数据
    let count: (i64,) = sqlx::query_as("SELECT COUNT(*) FROM test_table")
        .fetch_one(db.pool())
        .await
        .unwrap();

    assert_eq!(count.0, 10, "应该有 10 条记录");

    // 清理
    db.close().await;
}

#[tokio::test]
async fn test_idempotent_initialization() {
    // 准备测试环境
    let (db_url, _temp_dir) = create_test_db();
    let migrations_dir = create_test_migrations_dir();

    // 第一次初始化
    let db1 = DatabaseManager::new(&db_url, migrations_dir.path())
        .await
        .unwrap();
    db1.close().await;

    // 第二次初始化（应该不执行迁移）
    let db2 = DatabaseManager::new(&db_url, migrations_dir.path())
        .await
        .unwrap();

    // 验证表仍然存在
    let result =
        sqlx::query("SELECT name FROM sqlite_master WHERE type='table' AND name='test_table'")
            .fetch_one(db2.pool())
            .await;

    assert!(result.is_ok(), "test_table 应该存在");

    // 清理
    db2.close().await;
}

#[tokio::test]
async fn test_health_check_after_close() {
    // 准备测试环境
    let (db_url, _temp_dir) = create_test_db();
    let migrations_dir = create_test_migrations_dir();

    // 创建 DatabaseManager
    let db = DatabaseManager::new(&db_url, migrations_dir.path())
        .await
        .unwrap();

    // 关闭连接
    db.close().await;

    // 尝试健康检查（应该失败）
    let result = db.health_check().await;

    // 验证应该失败
    assert!(result.is_err(), "关闭后的健康检查应该失败");
}
