// ============================================================================
// 数据访问层模块
// ============================================================================
// 本模块封装 SQLite 数据库操作，提供类型安全的数据访问接口
//
// 模块组织：
// - manager.rs  : DatabaseManager 核心结构，管理数据库连接池
// - teacher.rs  : 教师相关数据访问（CRUD 操作）
// - class.rs    : 班级相关数据访问
// - subject.rs  : 科目配置数据访问
// - curriculum.rs : 教学计划数据访问
// - schedule.rs : 课表数据访问
// - venue.rs    : 场地数据访问
// - fixed_course.rs : 固定课程数据访问
// - exclusion.rs : 教师互斥关系数据访问
// - history.rs  : 操作历史数据访问（用于撤销/重做）
// - migration.rs : 数据库迁移工具
//
// 设计原则：
// 1. 使用 sqlx 提供的异步 API
// 2. 所有数据库操作都应该返回 Result<T, sqlx::Error>
// 3. 复杂查询应该使用事务确保数据一致性
// 4. 使用参数化查询防止 SQL 注入
// 5. 关键操作应该记录日志
// 6. 使用连接池管理数据库连接
//
// 性能优化：
// - 使用索引优化查询性能
// - 批量操作使用事务
// - 查询结果缓存（在上层实现）
// - 避免 N+1 查询问题
// ============================================================================

use sqlx::{Error as SqlxError, SqlitePool};
use std::path::Path;
use tracing::{debug, error, info};

use crate::db::migrations::MigrationManager;

/// 数据库管理器
///
/// 负责管理 SQLite 数据库连接池和提供数据访问接口
///
/// # 功能
/// - 管理数据库连接池
/// - 自动执行数据库迁移
/// - 提供健康检查接口
/// - 统一的错误处理
/// - 完善的日志记录
///
/// # 示例
/// ```rust
/// use course_scheduling_system::db::DatabaseManager;
///
/// #[tokio::main]
/// async fn main() -> Result<(), sqlx::Error> {
///     let db = DatabaseManager::new("sqlite://data/schedule.db", "migrations").await?;
///
///     // 执行健康检查
///     db.health_check().await?;
///
///     // 使用连接池
///     let pool = db.pool();
///
///     // 关闭连接
///     db.close().await;
///
///     Ok(())
/// }
/// ```
pub struct DatabaseManager {
    pool: SqlitePool,
}

impl DatabaseManager {
    /// 创建新的数据库管理器
    ///
    /// 此方法会：
    /// 1. 建立数据库连接池
    /// 2. 自动执行数据库迁移
    /// 3. 验证数据库连接
    ///
    /// # 参数
    /// - `database_url`: 数据库连接字符串，例如 "sqlite://data/schedule.db"
    /// - `migrations_dir`: 迁移脚本目录路径，例如 "migrations"
    ///
    /// # 返回
    /// - `Ok(DatabaseManager)`: 成功创建管理器
    /// - `Err(SqlxError)`: 连接失败或迁移失败
    ///
    /// # 错误处理
    /// - 如果数据库文件不存在，SQLite 会自动创建
    /// - 如果迁移目录不存在，会返回错误
    /// - 如果迁移执行失败，会回滚并返回错误
    ///
    /// # 示例
    /// ```rust
    /// let db = DatabaseManager::new(
    ///     "sqlite://data/schedule.db",
    ///     "migrations"
    /// ).await?;
    /// ```
    pub async fn new<P: AsRef<Path>>(
        database_url: &str,
        migrations_dir: P,
    ) -> Result<Self, SqlxError> {
        info!("初始化数据库管理器");
        info!("数据库连接字符串: {}", database_url);
        info!("迁移脚本目录: {}", migrations_dir.as_ref().display());

        // 1. 建立数据库连接池
        info!("正在建立数据库连接...");
        let pool = SqlitePool::connect(database_url).await.map_err(|e| {
            error!("数据库连接失败: {}", e);
            e
        })?;
        info!("数据库连接成功");

        // 2. 执行数据库迁移
        info!("开始执行数据库迁移...");
        let migrator = MigrationManager::new(&pool, migrations_dir)
            .await
            .map_err(|e| {
                error!("迁移管理器初始化失败: {}", e);
                e
            })?;

        match migrator.run_migrations().await {
            Ok(count) => {
                if count > 0 {
                    info!("数据库迁移完成，执行了 {} 个迁移", count);
                } else {
                    info!("数据库已是最新版本，无需迁移");
                }
            }
            Err(e) => {
                error!("数据库迁移失败: {}", e);
                return Err(e);
            }
        }

        // 3. 验证数据库连接
        info!("验证数据库连接...");
        sqlx::query("SELECT 1")
            .fetch_one(&pool)
            .await
            .map_err(|e| {
                error!("数据库连接验证失败: {}", e);
                e
            })?;
        info!("数据库连接验证成功");

        info!("数据库管理器初始化完成");
        Ok(Self { pool })
    }

    /// 获取数据库连接池引用
    ///
    /// 用于执行自定义查询或在子模块中使用
    ///
    /// # 返回
    /// - `&SqlitePool`: 数据库连接池的不可变引用
    ///
    /// # 示例
    /// ```rust
    /// let pool = db.pool();
    /// let result = sqlx::query("SELECT * FROM teachers")
    ///     .fetch_all(pool)
    ///     .await?;
    /// ```
    pub fn pool(&self) -> &SqlitePool {
        &self.pool
    }

    /// 关闭数据库连接池
    ///
    /// 在应用退出时调用，确保所有连接正确关闭
    ///
    /// # 注意
    /// - 此方法会等待所有活动连接完成
    /// - 关闭后不能再使用此 DatabaseManager 实例
    /// - 建议在应用退出前调用此方法
    ///
    /// # 示例
    /// ```rust
    /// // 应用退出时
    /// db.close().await;
    /// ```
    pub async fn close(&self) {
        info!("正在关闭数据库连接池...");

        // 获取连接池统计信息
        let size = self.pool.size();
        let idle = self.pool.num_idle();

        debug!("连接池状态 - 总连接数: {}, 空闲连接数: {}", size, idle);

        // 关闭连接池
        self.pool.close().await;

        info!("数据库连接池已关闭");
    }

    /// 执行数据库健康检查
    ///
    /// 通过执行简单的查询来验证数据库连接是否正常
    ///
    /// # 返回
    /// - `Ok(())`: 数据库连接正常
    /// - `Err(SqlxError)`: 数据库连接异常
    ///
    /// # 用途
    /// - 应用启动时验证数据库可用性
    /// - 定期健康检查
    /// - 故障诊断
    ///
    /// # 示例
    /// ```rust
    /// match db.health_check().await {
    ///     Ok(_) => println!("数据库连接正常"),
    ///     Err(e) => eprintln!("数据库连接异常: {}", e),
    /// }
    /// ```
    pub async fn health_check(&self) -> Result<(), SqlxError> {
        debug!("执行数据库健康检查");

        // 执行简单查询
        sqlx::query("SELECT 1")
            .fetch_one(&self.pool)
            .await
            .map_err(|e| {
                error!("数据库健康检查失败: {}", e);
                e
            })?;

        debug!("数据库健康检查通过");
        Ok(())
    }

    /// 获取数据库连接池统计信息
    ///
    /// # 返回
    /// - `PoolStats`: 包含连接池的统计信息
    ///
    /// # 示例
    /// ```rust
    /// let stats = db.get_pool_stats();
    /// println!("总连接数: {}", stats.size);
    /// println!("空闲连接数: {}", stats.idle);
    /// ```
    pub fn get_pool_stats(&self) -> PoolStats {
        PoolStats {
            size: self.pool.size(),
            idle: self.pool.num_idle(),
        }
    }

    /// 执行数据库备份
    ///
    /// 将当前数据库备份到指定路径
    ///
    /// # 参数
    /// - `backup_path`: 备份文件路径
    ///
    /// # 返回
    /// - `Ok(())`: 备份成功
    /// - `Err(SqlxError)`: 备份失败
    ///
    /// # 注意
    /// - 备份过程中数据库仍可正常使用
    /// - 备份文件会覆盖已存在的同名文件
    ///
    /// # 示例
    /// ```rust
    /// db.backup("backups/schedule_backup.db").await?;
    /// ```
    pub async fn backup<P: AsRef<Path>>(&self, backup_path: P) -> Result<(), SqlxError> {
        let backup_path = backup_path.as_ref();
        info!("开始备份数据库到: {}", backup_path.display());

        // 使用 SQLite 的 VACUUM INTO 命令进行备份
        let backup_path_str = backup_path.to_str().ok_or_else(|| {
            error!("无效的备份路径");
            SqlxError::Io(std::io::Error::new(
                std::io::ErrorKind::InvalidInput,
                "无效的备份路径",
            ))
        })?;

        sqlx::query(&format!("VACUUM INTO '{}'", backup_path_str))
            .execute(&self.pool)
            .await
            .map_err(|e| {
                error!("数据库备份失败: {}", e);
                e
            })?;

        info!("数据库备份成功");
        Ok(())
    }

    /// 优化数据库
    ///
    /// 执行 VACUUM 和 ANALYZE 命令优化数据库性能
    ///
    /// # 返回
    /// - `Ok(())`: 优化成功
    /// - `Err(SqlxError)`: 优化失败
    ///
    /// # 用途
    /// - 回收删除数据后的空间
    /// - 优化查询性能
    /// - 重建索引
    ///
    /// # 注意
    /// - 此操作可能耗时较长
    /// - 建议在低峰期执行
    ///
    /// # 示例
    /// ```rust
    /// db.optimize().await?;
    /// ```
    pub async fn optimize(&self) -> Result<(), SqlxError> {
        info!("开始优化数据库");

        // 执行 VACUUM 回收空间
        debug!("执行 VACUUM 命令");
        sqlx::query("VACUUM")
            .execute(&self.pool)
            .await
            .map_err(|e| {
                error!("VACUUM 执行失败: {}", e);
                e
            })?;

        // 执行 ANALYZE 更新统计信息
        debug!("执行 ANALYZE 命令");
        sqlx::query("ANALYZE")
            .execute(&self.pool)
            .await
            .map_err(|e| {
                error!("ANALYZE 执行失败: {}", e);
                e
            })?;

        info!("数据库优化完成");
        Ok(())
    }
}

/// 连接池统计信息
#[derive(Debug, Clone)]
pub struct PoolStats {
    /// 总连接数
    pub size: u32,
    /// 空闲连接数
    pub idle: usize,
}

// 子模块声明
pub mod class;
pub mod curriculum;
pub mod exclusion;
pub mod fixed_course;
pub mod history;
pub mod migrations;
pub mod schedule;
pub mod subject;
pub mod teacher;
pub mod venue;

// 测试模块
#[cfg(test)]
mod migrations_test;

#[cfg(test)]
mod manager_test;

#[cfg(test)]
mod teacher_test;

#[cfg(test)]
mod class_test;

#[cfg(test)]
mod subject_test;

#[cfg(test)]
mod curriculum_test;

#[cfg(test)]
mod schedule_test;

#[cfg(test)]
mod venue_test;

#[cfg(test)]
mod fixed_course_test;

#[cfg(test)]
mod exclusion_test;

#[cfg(test)]
mod history_test;

// 重新导出常用类型
pub use teacher::{
    CreateTeacherInput, SaveTeacherPreferenceInput, Teacher, TeacherPreference, TeacherRepository,
    TeacherStatus, UpdateTeacherInput, WorkloadStatistics,
};

pub use class::{Class, ClassRepository, CreateClassInput, UpdateClassInput};

pub use subject::{
    CreateSubjectConfigInput, SubjectConfig, SubjectConfigRepository, UpdateSubjectConfigInput,
};

pub use curriculum::Curriculum;

pub use schedule::{
    CreateScheduleEntryInput, CreateScheduleInput, Schedule, ScheduleEntry, ScheduleRepository,
    UpdateScheduleEntryInput, UpdateScheduleInput,
};

pub use venue::{CreateVenueInput, UpdateVenueInput, Venue, VenueRepository};

pub use fixed_course::{
    CreateFixedCourseInput, FixedCourse, FixedCourseRepository, UpdateFixedCourseInput,
};

pub use exclusion::{
    CreateTeacherMutualExclusionInput, ExclusionScope, TeacherMutualExclusion,
    TeacherMutualExclusionRepository, UpdateTeacherMutualExclusionInput,
};

pub use history::{
    CreateOperationHistoryInput, OperationHistory, OperationHistoryRepository, OperationType,
};
