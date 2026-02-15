// ============================================================================
// 数据库连接集成测试
// ============================================================================
// 本测试验证数据库连接功能在实际应用场景中的表现
//
// 测试内容：
// 1. 数据库连接成功场景
// 2. 数据库连接失败场景
// 3. 数据库迁移执行
// 4. 连接池管理
// 5. 数据库健康检查
//
// 测试策略：
// - 使用临时数据库文件进行测试
// - 每个测试独立运行，互不影响
// - 测试完成后自动清理资源
// - 使用真实的数据库操作，不使用 mock
//
// 验证需求：
// - 需求 13：数据持久化 - 使用 SQLite 数据库存储所有数据
// - 需求 14：错误处理与验证 - 数据库连接失败时显示友好的错误信息
// ============================================================================

use course_scheduling_system::db::DatabaseManager;
use sqlx::{Row, SqlitePool};
use std::fs;
use tempfile::TempDir;

/// 创建测试用的临时数据库 URL
///
/// # 返回
/// - `(String, TempDir)`: (数据库 URL, 临时目录)
fn create_test_db_url() -> (String, TempDir) {
    let temp_dir = TempDir::new().expect("创建临时目录失败");
    let db_path = temp_dir.path().join("test.db");

    // 确保父目录存在
    if let Some(parent) = db_path.parent() {
        fs::create_dir_all(parent).expect("创建父目录失败");
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
    let temp_dir = TempDir::new().expect("创建临时目录失败");

    // 创建测试迁移脚本
    fs::write(
        temp_dir
            .path()
            .join("20240101_000000_create_test_table.sql"),
        "CREATE TABLE test_table (id INTEGER PRIMARY KEY, name TEXT NOT NULL);",
    )
    .expect("创建迁移文件失败");

    fs::write(
        temp_dir.path().join("20240102_000000_add_test_index.sql"),
        "CREATE INDEX idx_test_name ON test_table(name);",
    )
    .expect("创建迁移文件失败");

    temp_dir
}

/// 测试 1：数据库连接成功场景
///
/// 验证：
/// - 能够成功连接到内存数据库
/// - 连接池正常工作
/// - 可以执行基本查询
#[tokio::test]
async fn test_database_connection_success() {
    println!("\n=== 测试 1：数据库连接成功场景 ===");

    // 准备测试环境
    let (db_url, _temp_dir) = create_test_db_url();
    let migrations_dir = create_test_migrations_dir();

    println!("数据库 URL: {}", db_url);
    println!("迁移目录: {}", migrations_dir.path().display());

    // 创建 DatabaseManager
    let result = DatabaseManager::new(&db_url, migrations_dir.path()).await;

    // 验证创建成功
    assert!(
        result.is_ok(),
        "DatabaseManager 创建应该成功: {:?}",
        result.err()
    );

    let db = result.unwrap();
    println!("✓ DatabaseManager 创建成功");

    // 验证连接池可用
    assert!(db.pool().size() > 0, "连接池应该有连接");
    println!("✓ 连接池可用，连接数: {}", db.pool().size());

    // 验证可以执行查询
    let result = sqlx::query("SELECT 1").fetch_one(db.pool()).await;
    assert!(result.is_ok(), "应该能够执行基本查询");
    println!("✓ 基本查询执行成功");

    // 清理
    db.close().await;
    println!("✓ 数据库连接已关闭");
    println!("=== 测试 1 通过 ===\n");
}

/// 测试 2：数据库连接到无效路径
///
/// 验证：
/// - 使用无效的数据库 URL 应该返回错误
/// - 错误信息应该清晰明确
#[tokio::test]
async fn test_database_connection_invalid_url() {
    println!("\n=== 测试 2：数据库连接到无效路径 ===");

    let migrations_dir = create_test_migrations_dir();

    // 尝试使用无效的数据库 URL
    let invalid_url = "invalid://url";
    println!("尝试连接到无效 URL: {}", invalid_url);

    let result = DatabaseManager::new(invalid_url, migrations_dir.path()).await;

    // 验证应该失败
    assert!(result.is_err(), "无效的数据库 URL 应该导致失败");
    println!("✓ 无效 URL 正确返回错误");

    // 验证错误信息（不使用 unwrap_err，因为 DatabaseManager 没有实现 Debug）
    if let Err(error) = result {
        println!("错误信息: {}", error);
    }
    println!("=== 测试 2 通过 ===\n");
}

/// 测试 3：数据库迁移执行
///
/// 验证：
/// - 迁移脚本能够正确执行
/// - 表和索引被正确创建
/// - 迁移版本被正确记录
#[tokio::test]
async fn test_database_migration_execution() {
    println!("\n=== 测试 3：数据库迁移执行 ===");

    // 准备测试环境
    let (db_url, _temp_dir) = create_test_db_url();
    let migrations_dir = create_test_migrations_dir();

    // 创建 DatabaseManager（会自动执行迁移）
    let db = DatabaseManager::new(&db_url, migrations_dir.path())
        .await
        .expect("DatabaseManager 创建失败");
    println!("✓ DatabaseManager 创建成功，迁移已执行");

    // 验证迁移是否执行成功
    let pool = db.pool();

    // 检查 test_table 是否存在
    let result =
        sqlx::query("SELECT name FROM sqlite_master WHERE type='table' AND name='test_table'")
            .fetch_one(pool)
            .await;

    assert!(result.is_ok(), "test_table 应该存在");
    println!("✓ test_table 表已创建");

    // 检查索引是否存在
    let result =
        sqlx::query("SELECT name FROM sqlite_master WHERE type='index' AND name='idx_test_name'")
            .fetch_one(pool)
            .await;

    assert!(result.is_ok(), "idx_test_name 索引应该存在");
    println!("✓ idx_test_name 索引已创建");

    // 检查 schema_migrations 表
    let result = sqlx::query("SELECT COUNT(*) as count FROM schema_migrations")
        .fetch_one(pool)
        .await;

    assert!(result.is_ok(), "schema_migrations 表应该存在");
    let count: i64 = result.unwrap().get("count");
    assert_eq!(count, 2, "应该有 2 条迁移记录");
    println!("✓ 迁移版本记录正确，共 {} 条", count);

    // 清理
    db.close().await;
    println!("=== 测试 3 通过 ===\n");
}

/// 测试 4：数据库健康检查
///
/// 验证：
/// - 健康检查能够正确执行
/// - 健康检查能够检测到连接问题
#[tokio::test]
async fn test_database_health_check() {
    println!("\n=== 测试 4：数据库健康检查 ===");

    // 准备测试环境
    let (db_url, _temp_dir) = create_test_db_url();
    let migrations_dir = create_test_migrations_dir();

    // 创建 DatabaseManager
    let db = DatabaseManager::new(&db_url, migrations_dir.path())
        .await
        .expect("DatabaseManager 创建失败");

    // 执行健康检查
    let result = db.health_check().await;

    // 验证健康检查成功
    assert!(result.is_ok(), "健康检查应该成功");
    println!("✓ 数据库健康检查通过");

    // 清理
    db.close().await;
    println!("=== 测试 4 通过 ===\n");
}

/// 测试 5：连接池管理
///
/// 验证：
/// - 连接池统计信息正确
/// - 连接池能够处理并发请求
/// - 连接池能够正确关闭
#[tokio::test]
async fn test_connection_pool_management() {
    println!("\n=== 测试 5：连接池管理 ===");

    // 准备测试环境
    let (db_url, _temp_dir) = create_test_db_url();
    let migrations_dir = create_test_migrations_dir();

    // 创建 DatabaseManager
    let db = DatabaseManager::new(&db_url, migrations_dir.path())
        .await
        .expect("DatabaseManager 创建失败");

    // 获取连接池统计信息
    let stats = db.get_pool_stats();
    println!("连接池统计信息:");
    println!("  总连接数: {}", stats.size);
    println!("  空闲连接数: {}", stats.idle);

    // 验证统计信息
    assert!(stats.size > 0, "连接池大小应该大于 0");
    assert!(
        stats.idle <= stats.size as usize,
        "空闲连接数不应超过总连接数"
    );
    println!("✓ 连接池统计信息正确");

    // 测试并发查询
    let pool = db.pool().clone();
    let mut handles = vec![];

    for i in 0..5 {
        let pool = pool.clone();
        let handle = tokio::spawn(async move {
            sqlx::query("INSERT INTO test_table (name) VALUES (?)")
                .bind(format!("test{}", i))
                .execute(&pool)
                .await
                .expect("插入失败");
        });
        handles.push(handle);
    }

    // 等待所有任务完成
    for handle in handles {
        handle.await.expect("任务执行失败");
    }
    println!("✓ 并发查询执行成功");

    // 验证数据
    let count: (i64,) = sqlx::query_as("SELECT COUNT(*) FROM test_table")
        .fetch_one(db.pool())
        .await
        .expect("查询失败");

    assert_eq!(count.0, 5, "应该有 5 条记录");
    println!("✓ 并发插入数据正确，共 {} 条记录", count.0);

    // 清理
    db.close().await;
    println!("✓ 连接池已关闭");
    println!("=== 测试 5 通过 ===\n");
}

/// 测试 6：数据库迁移幂等性
///
/// 验证：
/// - 重复初始化不会重复执行迁移
/// - 数据库状态保持一致
#[tokio::test]
async fn test_migration_idempotency() {
    println!("\n=== 测试 6：数据库迁移幂等性 ===");

    // 准备测试环境
    let (db_url, _temp_dir) = create_test_db_url();
    let migrations_dir = create_test_migrations_dir();

    // 第一次初始化
    println!("第一次初始化...");
    let db1 = DatabaseManager::new(&db_url, migrations_dir.path())
        .await
        .expect("第一次初始化失败");

    // 插入测试数据
    sqlx::query("INSERT INTO test_table (name) VALUES ('test1')")
        .execute(db1.pool())
        .await
        .expect("插入失败");

    db1.close().await;
    println!("✓ 第一次初始化完成");

    // 第二次初始化（应该不执行迁移）
    println!("第二次初始化...");
    let db2 = DatabaseManager::new(&db_url, migrations_dir.path())
        .await
        .expect("第二次初始化失败");

    // 验证表仍然存在
    let result =
        sqlx::query("SELECT name FROM sqlite_master WHERE type='table' AND name='test_table'")
            .fetch_one(db2.pool())
            .await;

    assert!(result.is_ok(), "test_table 应该存在");
    println!("✓ test_table 表仍然存在");

    // 验证数据仍然存在
    let count: (i64,) = sqlx::query_as("SELECT COUNT(*) FROM test_table")
        .fetch_one(db2.pool())
        .await
        .expect("查询失败");

    assert_eq!(count.0, 1, "应该有 1 条记录");
    println!("✓ 数据保持完整，共 {} 条记录", count.0);

    // 清理
    db2.close().await;
    println!("=== 测试 6 通过 ===\n");
}

/// 测试 7：无效迁移目录
///
/// 验证：
/// - 使用不存在的迁移目录应该返回错误
/// - 错误信息应该清晰明确
#[tokio::test]
async fn test_invalid_migrations_directory() {
    println!("\n=== 测试 7：无效迁移目录 ===");

    // 准备测试环境
    let (db_url, _temp_dir) = create_test_db_url();

    // 尝试使用不存在的迁移目录
    let invalid_dir = "/nonexistent/path";
    println!("尝试使用不存在的迁移目录: {}", invalid_dir);

    let result = DatabaseManager::new(&db_url, invalid_dir).await;

    // 验证应该失败
    assert!(result.is_err(), "不存在的迁移目录应该导致失败");
    println!("✓ 无效迁移目录正确返回错误");

    // 验证错误信息（不使用 unwrap_err，因为 DatabaseManager 没有实现 Debug）
    if let Err(error) = result {
        println!("错误信息: {}", error);
    }
    println!("=== 测试 7 通过 ===\n");
}

/// 测试 8：数据库备份功能
///
/// 验证：
/// - 能够成功备份数据库
/// - 备份文件包含完整数据
#[tokio::test]
async fn test_database_backup() {
    println!("\n=== 测试 8：数据库备份功能 ===");

    // 准备测试环境
    let (db_url, _temp_dir) = create_test_db_url();
    let migrations_dir = create_test_migrations_dir();

    // 创建 DatabaseManager
    let db = DatabaseManager::new(&db_url, migrations_dir.path())
        .await
        .expect("DatabaseManager 创建失败");

    // 插入测试数据
    sqlx::query("INSERT INTO test_table (name) VALUES ('test1'), ('test2')")
        .execute(db.pool())
        .await
        .expect("插入失败");
    println!("✓ 测试数据已插入");

    // 创建备份目录
    let backup_dir = TempDir::new().expect("创建备份目录失败");
    let backup_path = backup_dir.path().join("backup.db");

    // 执行备份
    let result = db.backup(&backup_path).await;

    // 验证备份成功
    assert!(result.is_ok(), "备份应该成功");
    assert!(backup_path.exists(), "备份文件应该存在");
    println!("✓ 备份文件已创建: {}", backup_path.display());

    // 验证备份文件内容
    let backup_url = format!("sqlite://{}", backup_path.to_str().unwrap());
    let backup_pool = SqlitePool::connect(&backup_url)
        .await
        .expect("连接备份数据库失败");

    let count: (i64,) = sqlx::query_as("SELECT COUNT(*) FROM test_table")
        .fetch_one(&backup_pool)
        .await
        .expect("查询备份数据库失败");

    assert_eq!(count.0, 2, "备份文件应该包含 2 条记录");
    println!("✓ 备份数据完整，共 {} 条记录", count.0);

    // 清理
    backup_pool.close().await;
    db.close().await;
    println!("=== 测试 8 通过 ===\n");
}

/// 测试 9：数据库优化功能
///
/// 验证：
/// - 能够成功执行数据库优化
/// - 优化后数据完整性保持
#[tokio::test]
async fn test_database_optimization() {
    println!("\n=== 测试 9：数据库优化功能 ===");

    // 准备测试环境
    let (db_url, _temp_dir) = create_test_db_url();
    let migrations_dir = create_test_migrations_dir();

    // 创建 DatabaseManager
    let db = DatabaseManager::new(&db_url, migrations_dir.path())
        .await
        .expect("DatabaseManager 创建失败");

    // 插入测试数据
    sqlx::query("INSERT INTO test_table (name) VALUES ('test1'), ('test2'), ('test3')")
        .execute(db.pool())
        .await
        .expect("插入失败");
    println!("✓ 测试数据已插入");

    // 删除部分数据
    sqlx::query("DELETE FROM test_table WHERE name = 'test2'")
        .execute(db.pool())
        .await
        .expect("删除失败");
    println!("✓ 部分数据已删除");

    // 执行优化
    let result = db.optimize().await;

    // 验证优化成功
    assert!(result.is_ok(), "优化应该成功");
    println!("✓ 数据库优化完成");

    // 验证数据完整性
    let count: (i64,) = sqlx::query_as("SELECT COUNT(*) FROM test_table")
        .fetch_one(db.pool())
        .await
        .expect("查询失败");

    assert_eq!(count.0, 2, "优化后应该有 2 条记录");
    println!("✓ 数据完整性保持，共 {} 条记录", count.0);

    // 清理
    db.close().await;
    println!("=== 测试 9 通过 ===\n");
}

/// 测试 10：关闭后的操作
///
/// 验证：
/// - 关闭连接后无法执行查询
/// - 健康检查应该失败
#[tokio::test]
async fn test_operations_after_close() {
    println!("\n=== 测试 10：关闭后的操作 ===");

    // 准备测试环境
    let (db_url, _temp_dir) = create_test_db_url();
    let migrations_dir = create_test_migrations_dir();

    // 创建 DatabaseManager
    let db = DatabaseManager::new(&db_url, migrations_dir.path())
        .await
        .expect("DatabaseManager 创建失败");

    // 关闭连接
    db.close().await;
    println!("✓ 数据库连接已关闭");

    // 尝试健康检查（应该失败）
    let result = db.health_check().await;

    // 验证应该失败
    assert!(result.is_err(), "关闭后的健康检查应该失败");
    println!("✓ 关闭后的健康检查正确返回错误");

    println!("=== 测试 10 通过 ===\n");
}
