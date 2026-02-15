// ============================================================================
// 数据库迁移工具模块
// ============================================================================
// 本模块实现数据库迁移功能，用于自动执行迁移脚本并管理数据库版本
//
// 功能：
// 1. 自动扫描 migrations 目录下的 SQL 文件
// 2. 按文件名顺序执行未执行的迁移脚本
// 3. 记录已执行的迁移版本到 schema_migrations 表
// 4. 支持事务保护，确保迁移的原子性
// 5. 提供详细的日志记录
// 6. 支持错误处理和回滚机制
//
// 使用方法：
// ```rust
// let migrator = MigrationManager::new(&pool, "migrations").await?;
// migrator.run_migrations().await?;
// ```
// ============================================================================

use sqlx::{Error as SqlxError, Row, SqlitePool};
use std::fs;
use std::path::{Path, PathBuf};
use tracing::{debug, error, info, warn};

/// 迁移管理器
///
/// 负责扫描、执行和管理数据库迁移脚本
pub struct MigrationManager {
    pool: SqlitePool,
    migrations_dir: PathBuf,
}

/// 迁移脚本信息
#[derive(Debug, Clone)]
pub struct Migration {
    /// 版本号（文件名）
    pub version: String,
    /// 文件路径
    pub path: PathBuf,
    /// SQL 内容
    pub sql: String,
}

impl MigrationManager {
    /// 创建新的迁移管理器
    ///
    /// # 参数
    /// - `pool`: 数据库连接池
    /// - `migrations_dir`: 迁移脚本目录路径
    ///
    /// # 返回
    /// - `Ok(MigrationManager)`: 成功创建管理器
    /// - `Err(SqlxError)`: 初始化失败
    pub async fn new<P: AsRef<Path>>(
        pool: &SqlitePool,
        migrations_dir: P,
    ) -> Result<Self, SqlxError> {
        let migrations_dir = migrations_dir.as_ref().to_path_buf();

        info!("初始化迁移管理器，迁移目录: {}", migrations_dir.display());

        // 确保迁移目录存在
        if !migrations_dir.exists() {
            error!("迁移目录不存在: {}", migrations_dir.display());
            return Err(SqlxError::Io(std::io::Error::new(
                std::io::ErrorKind::NotFound,
                format!("迁移目录不存在: {}", migrations_dir.display()),
            )));
        }

        // 确保 schema_migrations 表存在
        Self::ensure_migrations_table(pool).await?;

        Ok(Self {
            pool: pool.clone(),
            migrations_dir,
        })
    }

    /// 确保 schema_migrations 表存在
    ///
    /// 该表用于记录已执行的迁移版本
    async fn ensure_migrations_table(pool: &SqlitePool) -> Result<(), SqlxError> {
        debug!("确保 schema_migrations 表存在");

        sqlx::query(
            r#"
            CREATE TABLE IF NOT EXISTS schema_migrations (
                version TEXT PRIMARY KEY,
                applied_at TEXT NOT NULL DEFAULT (datetime('now'))
            )
            "#,
        )
        .execute(pool)
        .await?;

        debug!("schema_migrations 表已就绪");
        Ok(())
    }

    /// 运行所有待执行的迁移
    ///
    /// # 返回
    /// - `Ok(usize)`: 成功执行的迁移数量
    /// - `Err(SqlxError)`: 迁移执行失败
    pub async fn run_migrations(&self) -> Result<usize, SqlxError> {
        info!("开始执行数据库迁移");

        // 1. 扫描迁移脚本
        let all_migrations = self.scan_migrations()?;
        info!("扫描到 {} 个迁移脚本", all_migrations.len());

        // 2. 获取已执行的迁移
        let applied_migrations = self.get_applied_migrations().await?;
        info!("已执行 {} 个迁移", applied_migrations.len());

        // 3. 过滤出待执行的迁移
        let pending_migrations: Vec<Migration> = all_migrations
            .into_iter()
            .filter(|m| !applied_migrations.contains(&m.version))
            .collect();

        if pending_migrations.is_empty() {
            info!("没有待执行的迁移");
            return Ok(0);
        }

        info!("待执行 {} 个迁移", pending_migrations.len());

        // 4. 依次执行待执行的迁移
        let mut executed_count = 0;
        for migration in pending_migrations {
            info!("执行迁移: {}", migration.version);

            match self.execute_migration(&migration).await {
                Ok(_) => {
                    info!("迁移 {} 执行成功", migration.version);
                    executed_count += 1;
                }
                Err(e) => {
                    error!("迁移 {} 执行失败: {}", migration.version, e);
                    return Err(e);
                }
            }
        }

        info!("数据库迁移完成，共执行 {} 个迁移", executed_count);
        Ok(executed_count)
    }

    /// 扫描迁移目录，获取所有迁移脚本
    ///
    /// # 返回
    /// - `Ok(Vec<Migration>)`: 按版本号排序的迁移列表
    /// - `Err(SqlxError)`: 扫描失败
    pub fn scan_migrations(&self) -> Result<Vec<Migration>, SqlxError> {
        debug!("扫描迁移目录: {}", self.migrations_dir.display());

        let mut migrations = Vec::new();

        // 读取目录内容
        let entries = fs::read_dir(&self.migrations_dir).map_err(|e| {
            error!("读取迁移目录失败: {}", e);
            SqlxError::Io(e)
        })?;

        for entry in entries {
            let entry = entry.map_err(SqlxError::Io)?;
            let path = entry.path();

            // 只处理 .sql 文件
            if path.extension().and_then(|s| s.to_str()) != Some("sql") {
                continue;
            }

            // 跳过模板文件
            if path
                .file_name()
                .and_then(|s| s.to_str())
                .map(|s| s == "template.sql")
                .unwrap_or(false)
            {
                continue;
            }

            // 读取文件内容
            let sql = fs::read_to_string(&path).map_err(|e| {
                error!("读取迁移文件失败: {}", path.display());
                SqlxError::Io(e)
            })?;

            // 获取版本号（文件名不含扩展名）
            let version = path
                .file_stem()
                .and_then(|s| s.to_str())
                .ok_or_else(|| {
                    SqlxError::Io(std::io::Error::new(
                        std::io::ErrorKind::InvalidData,
                        format!("无效的迁移文件名: {}", path.display()),
                    ))
                })?
                .to_string();

            debug!("发现迁移脚本: {}", version);

            migrations.push(Migration { version, path, sql });
        }

        // 按版本号（文件名）排序
        migrations.sort_by(|a, b| a.version.cmp(&b.version));

        Ok(migrations)
    }

    /// 获取已执行的迁移版本列表
    ///
    /// # 返回
    /// - `Ok(Vec<String>)`: 已执行的迁移版本列表
    /// - `Err(SqlxError)`: 查询失败
    async fn get_applied_migrations(&self) -> Result<Vec<String>, SqlxError> {
        debug!("查询已执行的迁移");

        let rows = sqlx::query("SELECT version FROM schema_migrations ORDER BY version")
            .fetch_all(&self.pool)
            .await?;

        let versions: Vec<String> = rows.iter().map(|row| row.get("version")).collect();

        debug!("已执行的迁移: {:?}", versions);
        Ok(versions)
    }

    /// 执行单个迁移脚本
    ///
    /// # 参数
    /// - `migration`: 要执行的迁移
    ///
    /// # 返回
    /// - `Ok(())`: 执行成功
    /// - `Err(SqlxError)`: 执行失败
    async fn execute_migration(&self, migration: &Migration) -> Result<(), SqlxError> {
        info!("开始执行迁移: {}", migration.version);

        // 开启事务
        let mut tx = self.pool.begin().await?;

        // 执行迁移 SQL
        // 注意：SQLite 不支持在单个 execute 中执行多条语句
        // 需要分割 SQL 并逐条执行
        let statements = self.split_sql(&migration.sql);

        for (index, statement) in statements.iter().enumerate() {
            let trimmed = statement.trim();

            // 跳过空语句和注释
            if trimmed.is_empty() || trimmed.starts_with("--") {
                continue;
            }

            debug!(
                "执行语句 {}/{}: {}",
                index + 1,
                statements.len(),
                if trimmed.len() > 100 {
                    format!("{}...", &trimmed[..100])
                } else {
                    trimmed.to_string()
                }
            );

            sqlx::query(trimmed).execute(&mut *tx).await.map_err(|e| {
                error!("执行 SQL 语句失败: {}", e);
                error!("失败的语句: {}", trimmed);
                e
            })?;
        }

        // 记录迁移版本
        sqlx::query(
            "INSERT INTO schema_migrations (version) VALUES (?)
             ON CONFLICT(version) DO NOTHING",
        )
        .bind(&migration.version)
        .execute(&mut *tx)
        .await?;

        // 提交事务
        tx.commit().await?;

        info!("迁移 {} 执行成功", migration.version);
        Ok(())
    }

    /// 分割 SQL 脚本为多个语句
    ///
    /// SQLite 不支持在单个 execute 中执行多条语句，
    /// 需要按分号分割并逐条执行
    ///
    /// # 参数
    /// - `sql`: 完整的 SQL 脚本
    ///
    /// # 返回
    /// - `Vec<String>`: SQL 语句列表
    fn split_sql(&self, sql: &str) -> Vec<String> {
        let mut statements = Vec::new();
        let mut current_statement = String::new();
        let mut in_transaction = false;

        for line in sql.lines() {
            let trimmed = line.trim();

            // 跳过空行
            if trimmed.is_empty() {
                continue;
            }

            // 跳过纯注释行
            if trimmed.starts_with("--") {
                continue;
            }

            // 检测事务开始
            if trimmed.to_uppercase().starts_with("BEGIN") {
                in_transaction = true;
            }

            // 检测事务结束
            if trimmed.to_uppercase().starts_with("COMMIT")
                || trimmed.to_uppercase().starts_with("ROLLBACK")
            {
                in_transaction = false;
                continue; // 跳过事务控制语句，由 sqlx 管理
            }

            // 如果在事务中，跳过 BEGIN
            if in_transaction && trimmed.to_uppercase().starts_with("BEGIN") {
                continue;
            }

            current_statement.push_str(line);
            current_statement.push('\n');

            // 如果行以分号结尾，表示语句结束
            if trimmed.ends_with(';') {
                statements.push(current_statement.clone());
                current_statement.clear();
            }
        }

        // 添加最后一个语句（如果有）
        if !current_statement.trim().is_empty() {
            statements.push(current_statement);
        }

        statements
    }

    /// 获取当前数据库版本（最后执行的迁移版本）
    ///
    /// # 返回
    /// - `Ok(Option<String>)`: 当前版本，如果没有执行过迁移则返回 None
    /// - `Err(SqlxError)`: 查询失败
    pub async fn get_current_version(&self) -> Result<Option<String>, SqlxError> {
        debug!("查询当前数据库版本");

        let row =
            sqlx::query("SELECT version FROM schema_migrations ORDER BY version DESC LIMIT 1")
                .fetch_optional(&self.pool)
                .await?;

        if let Some(row) = row {
            let version: String = row.get("version");
            info!("当前数据库版本: {}", version);
            Ok(Some(version))
        } else {
            info!("数据库尚未执行任何迁移");
            Ok(None)
        }
    }

    /// 获取所有已执行的迁移历史
    ///
    /// # 返回
    /// - `Ok(Vec<(String, String)>)`: (版本号, 执行时间) 列表
    /// - `Err(SqlxError)`: 查询失败
    pub async fn get_migration_history(&self) -> Result<Vec<(String, String)>, SqlxError> {
        debug!("查询迁移历史");

        let rows =
            sqlx::query("SELECT version, applied_at FROM schema_migrations ORDER BY version DESC")
                .fetch_all(&self.pool)
                .await?;

        let history: Vec<(String, String)> = rows
            .iter()
            .map(|row| (row.get("version"), row.get("applied_at")))
            .collect();

        info!("查询到 {} 条迁移历史记录", history.len());
        Ok(history)
    }

    /// 检查是否有待执行的迁移
    ///
    /// # 返回
    /// - `Ok(bool)`: true 表示有待执行的迁移
    /// - `Err(SqlxError)`: 检查失败
    pub async fn has_pending_migrations(&self) -> Result<bool, SqlxError> {
        debug!("检查是否有待执行的迁移");

        let all_migrations = self.scan_migrations()?;
        let applied_migrations = self.get_applied_migrations().await?;

        let pending_count = all_migrations
            .iter()
            .filter(|m| !applied_migrations.contains(&m.version))
            .count();

        if pending_count > 0 {
            info!("有 {} 个待执行的迁移", pending_count);
            Ok(true)
        } else {
            info!("没有待执行的迁移");
            Ok(false)
        }
    }

    /// 回滚最后一次迁移（危险操作，谨慎使用）
    ///
    /// 注意：此方法仅从 schema_migrations 表中删除记录，
    /// 不会自动执行回滚 SQL。需要手动编写回滚脚本。
    ///
    /// # 返回
    /// - `Ok(Option<String>)`: 被回滚的版本号，如果没有可回滚的迁移则返回 None
    /// - `Err(SqlxError)`: 回滚失败
    pub async fn rollback_last_migration(&self) -> Result<Option<String>, SqlxError> {
        warn!("尝试回滚最后一次迁移（危险操作）");

        // 获取最后一次迁移
        let last_version = self.get_current_version().await?;

        if let Some(version) = last_version {
            warn!("回滚迁移: {}", version);

            // 从 schema_migrations 表中删除记录
            sqlx::query("DELETE FROM schema_migrations WHERE version = ?")
                .bind(&version)
                .execute(&self.pool)
                .await?;

            warn!("迁移 {} 已从记录中删除", version);
            warn!("注意：数据库结构未自动回滚，需要手动执行回滚脚本");

            Ok(Some(version))
        } else {
            info!("没有可回滚的迁移");
            Ok(None)
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use sqlx::SqlitePool;
    use std::fs;
    use tempfile::TempDir;

    /// 创建测试用的临时数据库
    async fn create_test_db() -> (SqlitePool, TempDir) {
        let temp_dir = TempDir::new().unwrap();
        let db_path = temp_dir.path().join("test.db");
        let db_url = format!("sqlite://{}", db_path.display());

        let pool = SqlitePool::connect(&db_url).await.unwrap();
        (pool, temp_dir)
    }

    /// 创建测试用的迁移目录
    fn create_test_migrations_dir() -> TempDir {
        let temp_dir = TempDir::new().unwrap();

        // 创建测试迁移脚本
        fs::write(
            temp_dir.path().join("20240101_000000_test1.sql"),
            "CREATE TABLE test1 (id INTEGER PRIMARY KEY);",
        )
        .unwrap();

        fs::write(
            temp_dir.path().join("20240102_000000_test2.sql"),
            "CREATE TABLE test2 (id INTEGER PRIMARY KEY);",
        )
        .unwrap();

        temp_dir
    }

    #[tokio::test]
    async fn test_ensure_migrations_table() {
        let (pool, _temp_dir) = create_test_db().await;

        MigrationManager::ensure_migrations_table(&pool)
            .await
            .unwrap();

        // 验证表是否创建
        let result = sqlx::query(
            "SELECT name FROM sqlite_master WHERE type='table' AND name='schema_migrations'",
        )
        .fetch_one(&pool)
        .await;

        assert!(result.is_ok());
    }

    #[tokio::test]
    async fn test_scan_migrations() {
        let (pool, _db_temp_dir) = create_test_db().await;
        let migrations_dir = create_test_migrations_dir();

        let migrator = MigrationManager::new(&pool, migrations_dir.path())
            .await
            .unwrap();

        let migrations = migrator.scan_migrations().unwrap();

        assert_eq!(migrations.len(), 2);
        assert_eq!(migrations[0].version, "20240101_000000_test1");
        assert_eq!(migrations[1].version, "20240102_000000_test2");
    }

    #[tokio::test]
    async fn test_run_migrations() {
        let (pool, _db_temp_dir) = create_test_db().await;
        let migrations_dir = create_test_migrations_dir();

        let migrator = MigrationManager::new(&pool, migrations_dir.path())
            .await
            .unwrap();

        let count = migrator.run_migrations().await.unwrap();

        assert_eq!(count, 2);

        // 验证表是否创建
        let result1 =
            sqlx::query("SELECT name FROM sqlite_master WHERE type='table' AND name='test1'")
                .fetch_one(&pool)
                .await;
        assert!(result1.is_ok());

        let result2 =
            sqlx::query("SELECT name FROM sqlite_master WHERE type='table' AND name='test2'")
                .fetch_one(&pool)
                .await;
        assert!(result2.is_ok());
    }

    #[tokio::test]
    async fn test_get_current_version() {
        let (pool, _db_temp_dir) = create_test_db().await;
        let migrations_dir = create_test_migrations_dir();

        let migrator = MigrationManager::new(&pool, migrations_dir.path())
            .await
            .unwrap();

        // 执行迁移前
        let version_before = migrator.get_current_version().await.unwrap();
        assert!(version_before.is_none());

        // 执行迁移
        migrator.run_migrations().await.unwrap();

        // 执行迁移后
        let version_after = migrator.get_current_version().await.unwrap();
        assert_eq!(version_after, Some("20240102_000000_test2".to_string()));
    }

    #[tokio::test]
    async fn test_has_pending_migrations() {
        let (pool, _db_temp_dir) = create_test_db().await;
        let migrations_dir = create_test_migrations_dir();

        let migrator = MigrationManager::new(&pool, migrations_dir.path())
            .await
            .unwrap();

        // 执行迁移前
        let has_pending_before = migrator.has_pending_migrations().await.unwrap();
        assert!(has_pending_before);

        // 执行迁移
        migrator.run_migrations().await.unwrap();

        // 执行迁移后
        let has_pending_after = migrator.has_pending_migrations().await.unwrap();
        assert!(!has_pending_after);
    }

    #[tokio::test]
    async fn test_idempotent_migrations() {
        let (pool, _db_temp_dir) = create_test_db().await;
        let migrations_dir = create_test_migrations_dir();

        let migrator = MigrationManager::new(&pool, migrations_dir.path())
            .await
            .unwrap();

        // 第一次执行
        let count1 = migrator.run_migrations().await.unwrap();
        assert_eq!(count1, 2);

        // 第二次执行（应该不执行任何迁移）
        let count2 = migrator.run_migrations().await.unwrap();
        assert_eq!(count2, 0);
    }
}
