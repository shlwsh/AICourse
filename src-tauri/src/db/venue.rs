// ============================================================================
// 场地数据访问模块
// ============================================================================
// 本模块提供场地相关的数据库操作接口
//
// 功能：
// - 场地的 CRUD 操作
// - 场地容量管理
// - 场地使用情况查询
//
// 设计原则：
// 1. 所有操作都返回 Result<T, sqlx::Error>
// 2. 使用参数化查询防止 SQL 注入
// 3. 关键操作记录日志
// 4. 批量操作使用事务确保数据一致性
// ============================================================================

use serde::{Deserialize, Serialize};
use sqlx::{Error as SqlxError, FromRow, SqlitePool};
use tracing::{debug, error, info, warn};

/// 场地信息
#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct Venue {
    /// 场地 ID
    pub id: String,
    /// 场地名称
    pub name: String,
    /// 容量（同时容纳的班级数）
    pub capacity: i64,
    /// 创建时间
    pub created_at: String,
}

/// 创建场地的输入数据
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreateVenueInput {
    /// 场地 ID
    pub id: String,
    /// 场地名称
    pub name: String,
    /// 容量（同时容纳的班级数）
    pub capacity: i64,
}

/// 更新场地的输入数据
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UpdateVenueInput {
    /// 场地名称
    pub name: Option<String>,
    /// 容量（同时容纳的班级数）
    pub capacity: Option<i64>,
}

/// 场地数据访问接口
pub struct VenueRepository<'a> {
    pool: &'a SqlitePool,
}

impl<'a> VenueRepository<'a> {
    /// 创建新的场地数据访问实例
    pub fn new(pool: &'a SqlitePool) -> Self {
        Self { pool }
    }

    /// 创建场地
    ///
    /// # 参数
    /// - `input`: 创建场地的输入数据
    ///
    /// # 返回
    /// - `Ok(Venue)`: 创建成功，返回场地信息
    /// - `Err(SqlxError)`: 创建失败
    pub async fn create(&self, input: CreateVenueInput) -> Result<Venue, SqlxError> {
        info!("创建场地: {} ({})", input.name, input.id);

        // 验证容量必须大于0
        if input.capacity <= 0 {
            error!("场地容量必须大于0，当前值: {}", input.capacity);
            return Err(SqlxError::Io(std::io::Error::new(
                std::io::ErrorKind::InvalidInput,
                "场地容量必须大于0",
            )));
        }

        debug!("场地容量: {}", input.capacity);

        let result = sqlx::query_as::<_, Venue>(
            r#"
            INSERT INTO venues (id, name, capacity, created_at)
            VALUES (?, ?, ?, datetime('now'))
            RETURNING id, name, capacity, created_at
            "#,
        )
        .bind(&input.id)
        .bind(&input.name)
        .bind(input.capacity)
        .fetch_one(self.pool)
        .await
        .map_err(|e| {
            error!("创建场地失败: {}", e);
            e
        })?;

        info!("场地创建成功，ID: {}", result.id);
        Ok(result)
    }

    /// 根据 ID 查询场地
    ///
    /// # 参数
    /// - `id`: 场地 ID
    ///
    /// # 返回
    /// - `Ok(Some(Venue))`: 找到场地
    /// - `Ok(None)`: 未找到场地
    /// - `Err(SqlxError)`: 查询失败
    pub async fn find_by_id(&self, id: &str) -> Result<Option<Venue>, SqlxError> {
        debug!("查询场地，ID: {}", id);

        let result = sqlx::query_as::<_, Venue>(
            r#"
            SELECT id, name, capacity, created_at
            FROM venues
            WHERE id = ?
            "#,
        )
        .bind(id)
        .fetch_optional(self.pool)
        .await?;

        if result.is_some() {
            debug!("找到场地，ID: {}", id);
        } else {
            debug!("未找到场地，ID: {}", id);
        }

        Ok(result)
    }

    /// 查询所有场地
    ///
    /// # 返回
    /// - `Ok(Vec<Venue>)`: 场地列表
    /// - `Err(SqlxError)`: 查询失败
    pub async fn find_all(&self) -> Result<Vec<Venue>, SqlxError> {
        debug!("查询所有场地");

        let result = sqlx::query_as::<_, Venue>(
            r#"
            SELECT id, name, capacity, created_at
            FROM venues
            ORDER BY id
            "#,
        )
        .fetch_all(self.pool)
        .await?;

        info!("查询到 {} 个场地", result.len());
        Ok(result)
    }

    /// 更新场地信息
    ///
    /// # 参数
    /// - `id`: 场地 ID
    /// - `input`: 更新场地的输入数据
    ///
    /// # 返回
    /// - `Ok(Venue)`: 更新成功，返回更新后的场地信息
    /// - `Err(SqlxError)`: 更新失败
    pub async fn update(&self, id: &str, input: UpdateVenueInput) -> Result<Venue, SqlxError> {
        info!("更新场地信息，ID: {}", id);

        // 验证容量必须大于0
        if let Some(capacity) = input.capacity {
            if capacity <= 0 {
                error!("场地容量必须大于0，当前值: {}", capacity);
                return Err(SqlxError::Io(std::io::Error::new(
                    std::io::ErrorKind::InvalidInput,
                    "场地容量必须大于0",
                )));
            }
        }

        // 构建动态更新语句
        let mut updates = Vec::new();
        let mut params: Vec<String> = Vec::new();

        if let Some(name) = &input.name {
            updates.push("name = ?");
            params.push(name.clone());
            debug!("更新场地名称: {}", name);
        }

        if let Some(capacity) = input.capacity {
            updates.push("capacity = ?");
            params.push(capacity.to_string());
            debug!("更新场地容量: {}", capacity);
        }

        if updates.is_empty() {
            warn!("没有需要更新的字段");
            return self.find_by_id(id).await?.ok_or_else(|| {
                error!("场地不存在，ID: {}", id);
                SqlxError::RowNotFound
            });
        }

        let sql = format!(
            "UPDATE venues SET {} WHERE id = ? RETURNING id, name, capacity, created_at",
            updates.join(", ")
        );

        let mut query = sqlx::query_as::<_, Venue>(&sql);
        for param in params {
            query = query.bind(param);
        }
        query = query.bind(id);

        let result = query.fetch_one(self.pool).await.map_err(|e| {
            error!("更新场地失败: {}", e);
            e
        })?;

        info!("场地信息更新成功，ID: {}", id);
        Ok(result)
    }

    /// 删除场地
    ///
    /// # 参数
    /// - `id`: 场地 ID
    ///
    /// # 返回
    /// - `Ok(())`: 删除成功
    /// - `Err(SqlxError)`: 删除失败
    pub async fn delete(&self, id: &str) -> Result<(), SqlxError> {
        info!("删除场地，ID: {}", id);

        let result = sqlx::query("DELETE FROM venues WHERE id = ?")
            .bind(id)
            .execute(self.pool)
            .await
            .map_err(|e| {
                error!("删除场地失败: {}", e);
                e
            })?;

        if result.rows_affected() == 0 {
            warn!("场地不存在，ID: {}", id);
            return Err(SqlxError::RowNotFound);
        }

        info!("场地删除成功，ID: {}", id);
        Ok(())
    }
}
