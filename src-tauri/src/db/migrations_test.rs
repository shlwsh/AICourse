// ============================================================================
// 数据库迁移工具单元测试
// ============================================================================
// 本模块包含数据库迁移工具的单元测试
//
// 测试覆盖：
// 1. 迁移表创建测试
// 2. 迁移脚本扫描测试
// 3. 迁移执行测试
// 4. 版本管理测试
// 5. 幂等性测试
// 6. 错误处理测试
// ============================================================================

#[cfg(test)]
mod tests {
    use crate::db::migrations::MigrationManager;
    use sqlx::{Row, SqlitePool};
    use std::fs;
    use tempfile::TempDir;
    use tracing::info;

    /// 初始化测试日志
    fn init_test_logging() {
        let _ = tracing_subscriber::fmt()
            .with_test_writer()
            .with_max_level(tracing::Level::DEBUG)
            .try_init();
    }

    /// 创建测试用的临时数据库
    async fn create_test_db() -> (SqlitePool, TempDir) {
        init_test_logging();

        let temp_dir = TempDir::new().unwrap();

        // 使用内存数据库避免文件权限问题
        let db_url = "sqlite::memory:";

        info!("创建测试数据库: {}", db_url);

        let pool = SqlitePool::connect(db_url).await.unwrap();
        (pool, temp_dir)
    }

    /// 创建测试用的迁移目录
    fn create_test_migrations_dir() -> TempDir {
        let temp_dir = TempDir::new().unwrap();

        info!("创建测试迁移目录: {}", temp_dir.path().display());

        // 创建测试迁移脚本 1
        fs::write(
            temp_dir.path().join("20240101_000000_create_test1.sql"),
            r#"
-- 测试迁移脚本 1
CREATE TABLE IF NOT EXISTS test1 (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_test1_name ON test1(name);
"#,
        )
        .unwrap();

        // 创建测试迁移脚本 2
        fs::write(
            temp_dir.path().join("20240102_000000_create_test2.sql"),
            r#"
-- 测试迁移脚本 2
CREATE TABLE IF NOT EXISTS test2 (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    value INTEGER NOT NULL,
    test1_id INTEGER,
    FOREIGN KEY (test1_id) REFERENCES test1(id)
);

INSERT OR IGNORE INTO test1 (id, name) VALUES (1, '测试数据');
"#,
        )
        .unwrap();

        // 创建模板文件（应该被跳过）
        fs::write(
            temp_dir.path().join("template.sql"),
            "-- 这是模板文件，应该被跳过",
        )
        .unwrap();

        temp_dir
    }

    /// 创建包含事务的测试迁移目录
    fn create_test_migrations_with_transaction() -> TempDir {
        let temp_dir = TempDir::new().unwrap();

        fs::write(
            temp_dir.path().join("20240103_000000_with_transaction.sql"),
            r#"
-- 测试事务处理
BEGIN TRANSACTION;

CREATE TABLE IF NOT EXISTS test3 (
    id INTEGER PRIMARY KEY,
    data TEXT
);

INSERT INTO test3 (id, data) VALUES (1, '数据1');
INSERT INTO test3 (id, data) VALUES (2, '数据2');

COMMIT;
"#,
        )
        .unwrap();

        temp_dir
    }

    #[tokio::test]
    async fn test_ensure_migrations_table() {
        info!("测试：确保迁移表存在");

        let (pool, _temp_dir) = create_test_db().await;

        // 创建迁移管理器（会自动创建 schema_migrations 表）
        let migrations_dir = TempDir::new().unwrap();
        let _migrator = MigrationManager::new(&pool, migrations_dir.path())
            .await
            .unwrap();

        // 验证表是否创建
        let result = sqlx::query(
            "SELECT name FROM sqlite_master WHERE type='table' AND name='schema_migrations'",
        )
        .fetch_one(&pool)
        .await;

        assert!(result.is_ok(), "schema_migrations 表应该存在");
        info!("✓ schema_migrations 表创建成功");
    }

    #[tokio::test]
    async fn test_scan_migrations() {
        info!("测试：扫描迁移脚本");

        let (pool, _db_temp_dir) = create_test_db().await;
        let migrations_dir = create_test_migrations_dir();

        let migrator = MigrationManager::new(&pool, migrations_dir.path())
            .await
            .unwrap();

        let migrations = migrator.scan_migrations().unwrap();

        assert_eq!(migrations.len(), 2, "应该扫描到 2 个迁移脚本");
        assert_eq!(
            migrations[0].version, "20240101_000000_create_test1",
            "第一个迁移版本应该正确"
        );
        assert_eq!(
            migrations[1].version, "20240102_000000_create_test2",
            "第二个迁移版本应该正确"
        );

        info!("✓ 成功扫描到 {} 个迁移脚本", migrations.len());
    }

    #[tokio::test]
    async fn test_run_migrations() {
        info!("测试：执行迁移脚本");

        let (pool, _db_temp_dir) = create_test_db().await;
        let migrations_dir = create_test_migrations_dir();

        let migrator = MigrationManager::new(&pool, migrations_dir.path())
            .await
            .unwrap();

        let count = migrator.run_migrations().await.unwrap();

        assert_eq!(count, 2, "应该执行 2 个迁移");

        // 验证 test1 表是否创建
        let result1 =
            sqlx::query("SELECT name FROM sqlite_master WHERE type='table' AND name='test1'")
                .fetch_one(&pool)
                .await;
        assert!(result1.is_ok(), "test1 表应该存在");

        // 验证 test2 表是否创建
        let result2 =
            sqlx::query("SELECT name FROM sqlite_master WHERE type='table' AND name='test2'")
                .fetch_one(&pool)
                .await;
        assert!(result2.is_ok(), "test2 表应该存在");

        // 验证索引是否创建
        let index_result = sqlx::query(
            "SELECT name FROM sqlite_master WHERE type='index' AND name='idx_test1_name'",
        )
        .fetch_one(&pool)
        .await;
        assert!(index_result.is_ok(), "索引应该存在");

        // 验证初始数据是否插入
        let data_result = sqlx::query("SELECT COUNT(*) as count FROM test1")
            .fetch_one(&pool)
            .await
            .unwrap();
        let count: i64 = data_result.get("count");
        assert_eq!(count, 1, "应该插入 1 条初始数据");

        info!("✓ 迁移执行成功，所有表和数据已创建");
    }

    #[tokio::test]
    async fn test_get_current_version() {
        info!("测试：获取当前数据库版本");

        let (pool, _db_temp_dir) = create_test_db().await;
        let migrations_dir = create_test_migrations_dir();

        let migrator = MigrationManager::new(&pool, migrations_dir.path())
            .await
            .unwrap();

        // 执行迁移前
        let version_before = migrator.get_current_version().await.unwrap();
        assert!(version_before.is_none(), "执行迁移前应该没有版本记录");
        info!("✓ 执行迁移前版本为空");

        // 执行迁移
        migrator.run_migrations().await.unwrap();

        // 执行迁移后
        let version_after = migrator.get_current_version().await.unwrap();
        assert_eq!(
            version_after,
            Some("20240102_000000_create_test2".to_string()),
            "当前版本应该是最后执行的迁移"
        );
        info!("✓ 执行迁移后版本正确: {:?}", version_after);
    }

    #[tokio::test]
    async fn test_has_pending_migrations() {
        info!("测试：检查待执行的迁移");

        let (pool, _db_temp_dir) = create_test_db().await;
        let migrations_dir = create_test_migrations_dir();

        let migrator = MigrationManager::new(&pool, migrations_dir.path())
            .await
            .unwrap();

        // 执行迁移前
        let has_pending_before = migrator.has_pending_migrations().await.unwrap();
        assert!(has_pending_before, "执行迁移前应该有待执行的迁移");
        info!("✓ 执行迁移前有待执行的迁移");

        // 执行迁移
        migrator.run_migrations().await.unwrap();

        // 执行迁移后
        let has_pending_after = migrator.has_pending_migrations().await.unwrap();
        assert!(!has_pending_after, "执行迁移后不应该有待执行的迁移");
        info!("✓ 执行迁移后没有待执行的迁移");
    }

    #[tokio::test]
    async fn test_idempotent_migrations() {
        info!("测试：迁移的幂等性");

        let (pool, _db_temp_dir) = create_test_db().await;
        let migrations_dir = create_test_migrations_dir();

        let migrator = MigrationManager::new(&pool, migrations_dir.path())
            .await
            .unwrap();

        // 第一次执行
        let count1 = migrator.run_migrations().await.unwrap();
        assert_eq!(count1, 2, "第一次应该执行 2 个迁移");
        info!("✓ 第一次执行了 {} 个迁移", count1);

        // 第二次执行（应该不执行任何迁移）
        let count2 = migrator.run_migrations().await.unwrap();
        assert_eq!(count2, 0, "第二次不应该执行任何迁移");
        info!("✓ 第二次执行了 {} 个迁移（幂等性验证通过）", count2);
    }

    #[tokio::test]
    async fn test_migration_history() {
        info!("测试：获取迁移历史");

        let (pool, _db_temp_dir) = create_test_db().await;
        let migrations_dir = create_test_migrations_dir();

        let migrator = MigrationManager::new(&pool, migrations_dir.path())
            .await
            .unwrap();

        // 执行迁移
        migrator.run_migrations().await.unwrap();

        // 获取迁移历史
        let history = migrator.get_migration_history().await.unwrap();

        assert_eq!(history.len(), 2, "应该有 2 条迁移历史记录");
        assert_eq!(
            history[0].0, "20240102_000000_create_test2",
            "最新的迁移应该排在前面"
        );
        assert_eq!(
            history[1].0, "20240101_000000_create_test1",
            "较早的迁移应该排在后面"
        );

        info!("✓ 迁移历史记录正确");
        for (version, applied_at) in &history {
            info!("  - {} (执行时间: {})", version, applied_at);
        }
    }

    #[tokio::test]
    async fn test_transaction_handling() {
        info!("测试：事务处理");

        let (pool, _db_temp_dir) = create_test_db().await;
        let migrations_dir = create_test_migrations_with_transaction();

        let migrator = MigrationManager::new(&pool, migrations_dir.path())
            .await
            .unwrap();

        // 执行包含事务的迁移
        let count = migrator.run_migrations().await.unwrap();
        assert_eq!(count, 1, "应该执行 1 个迁移");

        // 验证表是否创建
        let table_result =
            sqlx::query("SELECT name FROM sqlite_master WHERE type='table' AND name='test3'")
                .fetch_one(&pool)
                .await;
        assert!(table_result.is_ok(), "test3 表应该存在");

        // 验证数据是否插入
        let data_result = sqlx::query("SELECT COUNT(*) as count FROM test3")
            .fetch_one(&pool)
            .await
            .unwrap();
        let count: i64 = data_result.get("count");
        assert_eq!(count, 2, "应该插入 2 条数据");

        info!("✓ 事务处理正确");
    }

    #[tokio::test]
    async fn test_migration_with_invalid_sql() {
        info!("测试：处理无效的 SQL");

        let (pool, _db_temp_dir) = create_test_db().await;
        let migrations_dir = TempDir::new().unwrap();

        // 创建包含无效 SQL 的迁移脚本（引用不存在的表）
        fs::write(
            migrations_dir.path().join("20240104_000000_invalid.sql"),
            r#"
-- 无效的 SQL：引用不存在的表
INSERT INTO non_existent_table (id, name) VALUES (1, 'test');
"#,
        )
        .unwrap();

        let migrator = MigrationManager::new(&pool, migrations_dir.path())
            .await
            .unwrap();

        // 执行迁移应该失败
        let result = migrator.run_migrations().await;
        assert!(result.is_err(), "包含无效 SQL 的迁移应该失败");

        info!("✓ 正确处理了无效的 SQL");
    }

    #[tokio::test]
    async fn test_rollback_last_migration() {
        info!("测试：回滚最后一次迁移");

        let (pool, _db_temp_dir) = create_test_db().await;
        let migrations_dir = create_test_migrations_dir();

        let migrator = MigrationManager::new(&pool, migrations_dir.path())
            .await
            .unwrap();

        // 执行迁移
        let count = migrator.run_migrations().await.unwrap();
        assert_eq!(count, 2, "应该执行 2 个迁移");

        // 获取当前版本
        let version_before = migrator.get_current_version().await.unwrap();
        assert_eq!(
            version_before,
            Some("20240102_000000_create_test2".to_string()),
            "应该有当前版本"
        );
        info!("✓ 回滚前版本: {:?}", version_before);

        // 回滚最后一次迁移
        let rolled_back = migrator.rollback_last_migration().await.unwrap();
        assert_eq!(
            rolled_back,
            Some("20240102_000000_create_test2".to_string()),
            "应该回滚最后一次迁移"
        );
        info!("✓ 回滚了迁移: {:?}", rolled_back);

        // 获取回滚后的版本
        let version_after = migrator.get_current_version().await.unwrap();
        assert_eq!(
            version_after,
            Some("20240101_000000_create_test1".to_string()),
            "回滚后版本应该是前一个迁移"
        );
        info!("✓ 回滚后版本: {:?}", version_after);

        // 验证可以重新执行被回滚的迁移
        let count = migrator.run_migrations().await.unwrap();
        assert_eq!(count, 1, "应该重新执行 1 个迁移");
        info!("✓ 成功重新执行被回滚的迁移");
    }

    #[tokio::test]
    async fn test_empty_migrations_directory() {
        info!("测试：空的迁移目录");

        let (pool, _db_temp_dir) = create_test_db().await;
        let migrations_dir = TempDir::new().unwrap();

        let migrator = MigrationManager::new(&pool, migrations_dir.path())
            .await
            .unwrap();

        // 执行迁移
        let count = migrator.run_migrations().await.unwrap();
        assert_eq!(count, 0, "空目录不应该执行任何迁移");

        info!("✓ 正确处理了空的迁移目录");
    }

    #[tokio::test]
    async fn test_migration_ordering() {
        info!("测试：迁移执行顺序");

        let (pool, _db_temp_dir) = create_test_db().await;
        let migrations_dir = TempDir::new().unwrap();

        // 创建多个迁移脚本（故意打乱顺序）
        fs::write(
            migrations_dir.path().join("20240103_000000_third.sql"),
            "CREATE TABLE third (id INTEGER);",
        )
        .unwrap();

        fs::write(
            migrations_dir.path().join("20240101_000000_first.sql"),
            "CREATE TABLE first (id INTEGER);",
        )
        .unwrap();

        fs::write(
            migrations_dir.path().join("20240102_000000_second.sql"),
            "CREATE TABLE second (id INTEGER);",
        )
        .unwrap();

        let migrator = MigrationManager::new(&pool, migrations_dir.path())
            .await
            .unwrap();

        // 执行迁移
        migrator.run_migrations().await.unwrap();

        // 获取迁移历史
        let history = migrator.get_migration_history().await.unwrap();

        // 验证执行顺序（历史记录是倒序的）
        assert_eq!(history[2].0, "20240101_000000_first");
        assert_eq!(history[1].0, "20240102_000000_second");
        assert_eq!(history[0].0, "20240103_000000_third");

        info!("✓ 迁移按正确顺序执行");
    }
}
