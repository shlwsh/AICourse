# 数据库迁移工具使用示例

## 简介

数据库迁移工具用于自动管理数据库模式的版本和变更。它会扫描 `migrations` 目录下的 SQL 文件，按顺序执行未执行的迁移脚本，并记录已执行的版本。

## 基本使用

### 1. 初始化迁移管理器

```rust
use course_scheduling_system::db::MigrationManager;
use sqlx::SqlitePool;

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    // 连接数据库
    let pool = SqlitePool::connect("sqlite://data/schedule.db").await?;

    // 创建迁移管理器
    let migrator = MigrationManager::new(&pool, "migrations").await?;

    Ok(())
}
```

### 2. 执行迁移

```rust
// 执行所有待执行的迁移
let count = migrator.run_migrations().await?;
println!("成功执行 {} 个迁移", count);
```

### 3. 查询当前版本

```rust
// 获取当前数据库版本
if let Some(version) = migrator.get_current_version().await? {
    println!("当前数据库版本: {}", version);
} else {
    println!("数据库尚未执行任何迁移");
}
```

### 4. 检查待执行的迁移

```rust
// 检查是否有待执行的迁移
if migrator.has_pending_migrations().await? {
    println!("有待执行的迁移");
} else {
    println!("所有迁移已执行");
}
```

### 5. 查看迁移历史

```rust
// 获取迁移历史
let history = migrator.get_migration_history().await?;
for (version, applied_at) in history {
    println!("{} - 执行时间: {}", version, applied_at);
}
```

## 完整示例

```rust
use course_scheduling_system::db::MigrationManager;
use sqlx::SqlitePool;
use tracing::{info, error};

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    // 初始化日志
    tracing_subscriber::fmt::init();

    // 连接数据库
    let database_url = "sqlite://data/schedule.db";
    let pool = SqlitePool::connect(database_url).await?;
    info!("数据库连接成功");

    // 创建迁移管理器
    let migrator = MigrationManager::new(&pool, "migrations").await?;

    // 检查待执行的迁移
    if migrator.has_pending_migrations().await? {
        info!("发现待执行的迁移，开始执行...");

        // 执行迁移
        match migrator.run_migrations().await {
            Ok(count) => {
                info!("成功执行 {} 个迁移", count);

                // 显示当前版本
                if let Some(version) = migrator.get_current_version().await? {
                    info!("当前数据库版本: {}", version);
                }
            }
            Err(e) => {
                error!("迁移执行失败: {}", e);
                return Err(e.into());
            }
        }
    } else {
        info!("所有迁移已执行，数据库是最新版本");
    }

    Ok(())
}
```

## 在应用启动时自动执行迁移

```rust
use course_scheduling_system::db::{DatabaseManager, MigrationManager};
use sqlx::SqlitePool;
use tracing::{info, error};

pub async fn initialize_database(database_url: &str) -> Result<DatabaseManager, Box<dyn std::error::Error>> {
    info!("初始化数据库...");

    // 连接数据库
    let pool = SqlitePool::connect(database_url).await?;

    // 执行迁移
    let migrator = MigrationManager::new(&pool, "migrations").await?;

    if migrator.has_pending_migrations().await? {
        info!("执行数据库迁移...");
        let count = migrator.run_migrations().await?;
        info!("成功执行 {} 个迁移", count);
    }

    // 创建数据库管理器
    let db_manager = DatabaseManager::new(database_url).await?;

    info!("数据库初始化完成");
    Ok(db_manager)
}
```

## 错误处理

```rust
use course_scheduling_system::db::MigrationManager;
use sqlx::SqlitePool;
use tracing::{info, error, warn};

async fn run_migrations_with_error_handling(
    pool: &SqlitePool,
) -> Result<(), Box<dyn std::error::Error>> {
    let migrator = MigrationManager::new(pool, "migrations").await?;

    match migrator.run_migrations().await {
        Ok(count) => {
            info!("成功执行 {} 个迁移", count);
            Ok(())
        }
        Err(e) => {
            error!("迁移执行失败: {}", e);

            // 记录当前版本
            if let Ok(Some(version)) = migrator.get_current_version().await {
                warn!("当前数据库版本: {}", version);
            }

            // 返回错误
            Err(e.into())
        }
    }
}
```

## 回滚迁移（谨慎使用）

```rust
use course_scheduling_system::db::MigrationManager;
use sqlx::SqlitePool;
use tracing::{info, warn};

async fn rollback_last_migration(
    pool: &SqlitePool,
) -> Result<(), Box<dyn std::error::Error>> {
    let migrator = MigrationManager::new(pool, "migrations").await?;

    warn!("准备回滚最后一次迁移（危险操作）");

    if let Some(version) = migrator.rollback_last_migration().await? {
        warn!("已回滚迁移: {}", version);
        warn!("注意：数据库结构未自动回滚，需要手动执行回滚脚本");
    } else {
        info!("没有可回滚的迁移");
    }

    Ok(())
}
```

## 注意事项

1. **备份优先**：在执行迁移前务必备份数据库
2. **测试先行**：在测试环境验证迁移脚本
3. **事务保护**：迁移工具自动使用事务，确保原子性
4. **幂等性**：已执行的迁移不会重复执行
5. **顺序执行**：迁移按文件名顺序执行
6. **错误处理**：迁移失败会自动回滚事务
7. **日志记录**：所有操作都有详细的日志记录
8. **版本管理**：使用 `schema_migrations` 表记录版本

## 迁移脚本编写规范

参考 `src-tauri/migrations/README.md` 和 `src-tauri/migrations/template.sql` 了解如何编写迁移脚本。

## 常见问题

### Q: 如何查看已执行的迁移？

```rust
let history = migrator.get_migration_history().await?;
for (version, applied_at) in history {
    println!("{} - {}", version, applied_at);
}
```

### Q: 如何跳过某个迁移？

不建议跳过迁移。如果必须跳过，可以手动在数据库中插入版本记录：

```sql
INSERT INTO schema_migrations (version) VALUES ('20240101_000000_description');
```

### Q: 迁移执行失败怎么办？

1. 查看错误日志
2. 恢复数据库备份
3. 修复迁移脚本
4. 重新执行迁移

### Q: 如何在生产环境执行迁移？

1. 在测试环境验证迁移脚本
2. 备份生产数据库
3. 在维护窗口执行迁移
4. 验证迁移结果
5. 监控应用运行状态

## 相关文档

- [迁移脚本编写指南](../migrations/README.md)
- [迁移脚本模板](../migrations/template.sql)
- [数据库设计文档](../../../.kiro/specs/course-scheduling-system/design.md)
