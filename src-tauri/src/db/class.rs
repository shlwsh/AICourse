// ============================================================================
// 班级数据访问模块
// ============================================================================
// 本模块提供班级相关的数据库操作接口
//
// 功能：
// - 班级的 CRUD 操作
// - 按年级查询班级
// - 批量操作（批量创建班级）
// - 班级升级功能（批量重命名）
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

/// 班级信息
#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct Class {
    /// 班级 ID
    pub id: i64,
    /// 班级名称
    pub name: String,
    /// 年级
    pub grade_level: Option<i64>,
    /// 创建时间
    pub created_at: String,
    /// 更新时间
    pub updated_at: String,
}

/// 创建班级的输入数据
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreateClassInput {
    /// 班级名称
    pub name: String,
    /// 年级
    pub grade_level: Option<i64>,
}

/// 更新班级的输入数据
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UpdateClassInput {
    /// 班级名称
    pub name: Option<String>,
    /// 年级
    pub grade_level: Option<i64>,
}

/// 班级数据访问接口
pub struct ClassRepository<'a> {
    pool: &'a SqlitePool,
}

impl<'a> ClassRepository<'a> {
    /// 创建新的班级数据访问实例
    pub fn new(pool: &'a SqlitePool) -> Self {
        Self { pool }
    }

    /// 创建班级
    ///
    /// # 参数
    /// - `input`: 创建班级的输入数据
    ///
    /// # 返回
    /// - `Ok(Class)`: 创建成功，返回班级信息
    /// - `Err(SqlxError)`: 创建失败
    pub async fn create(&self, input: CreateClassInput) -> Result<Class, SqlxError> {
        info!("创建班级: {}", input.name);

        let result = sqlx::query_as::<_, Class>(
            r#"
            INSERT INTO classes (name, grade_level, created_at, updated_at)
            VALUES (?, ?, datetime('now'), datetime('now'))
            RETURNING id, name, grade_level, created_at, updated_at
            "#,
        )
        .bind(&input.name)
        .bind(input.grade_level)
        .fetch_one(self.pool)
        .await
        .map_err(|e| {
            error!("创建班级失败: {}", e);
            e
        })?;

        info!("班级创建成功，ID: {}", result.id);
        Ok(result)
    }

    /// 根据 ID 查询班级
    ///
    /// # 参数
    /// - `id`: 班级 ID
    ///
    /// # 返回
    /// - `Ok(Some(Class))`: 找到班级
    /// - `Ok(None)`: 未找到班级
    /// - `Err(SqlxError)`: 查询失败
    pub async fn find_by_id(&self, id: i64) -> Result<Option<Class>, SqlxError> {
        debug!("查询班级，ID: {}", id);

        let result = sqlx::query_as::<_, Class>(
            r#"
            SELECT id, name, grade_level, created_at, updated_at
            FROM classes
            WHERE id = ?
            "#,
        )
        .bind(id)
        .fetch_optional(self.pool)
        .await?;

        if result.is_some() {
            debug!("找到班级，ID: {}", id);
        } else {
            debug!("未找到班级，ID: {}", id);
        }

        Ok(result)
    }

    /// 查询所有班级
    ///
    /// # 返回
    /// - `Ok(Vec<Class>)`: 班级列表
    /// - `Err(SqlxError)`: 查询失败
    pub async fn find_all(&self) -> Result<Vec<Class>, SqlxError> {
        debug!("查询所有班级");

        let result = sqlx::query_as::<_, Class>(
            r#"
            SELECT id, name, grade_level, created_at, updated_at
            FROM classes
            ORDER BY grade_level, name
            "#,
        )
        .fetch_all(self.pool)
        .await?;

        info!("查询到 {} 个班级", result.len());
        Ok(result)
    }

    /// 根据年级查询班级
    ///
    /// # 参数
    /// - `grade_level`: 年级
    ///
    /// # 返回
    /// - `Ok(Vec<Class>)`: 班级列表
    /// - `Err(SqlxError)`: 查询失败
    pub async fn find_by_grade_level(&self, grade_level: i64) -> Result<Vec<Class>, SqlxError> {
        debug!("查询年级的班级，年级: {}", grade_level);

        let result = sqlx::query_as::<_, Class>(
            r#"
            SELECT id, name, grade_level, created_at, updated_at
            FROM classes
            WHERE grade_level = ?
            ORDER BY name
            "#,
        )
        .bind(grade_level)
        .fetch_all(self.pool)
        .await?;

        info!("年级 {} 有 {} 个班级", grade_level, result.len());
        Ok(result)
    }

    /// 更新班级信息
    ///
    /// # 参数
    /// - `id`: 班级 ID
    /// - `input`: 更新班级的输入数据
    ///
    /// # 返回
    /// - `Ok(Class)`: 更新成功，返回更新后的班级信息
    /// - `Err(SqlxError)`: 更新失败
    pub async fn update(&self, id: i64, input: UpdateClassInput) -> Result<Class, SqlxError> {
        info!("更新班级信息，ID: {}", id);

        // 构建动态更新语句
        let mut updates = Vec::new();
        let mut params: Vec<String> = Vec::new();

        if let Some(name) = &input.name {
            updates.push("name = ?");
            params.push(name.clone());
            debug!("更新班级名称: {}", name);
        }

        if let Some(grade_level) = input.grade_level {
            updates.push("grade_level = ?");
            params.push(grade_level.to_string());
            debug!("更新年级: {}", grade_level);
        }

        if updates.is_empty() {
            warn!("没有需要更新的字段");
            return self.find_by_id(id).await?.ok_or_else(|| {
                error!("班级不存在，ID: {}", id);
                SqlxError::RowNotFound
            });
        }

        updates.push("updated_at = datetime('now')");

        let sql = format!(
            "UPDATE classes SET {} WHERE id = ? RETURNING id, name, grade_level, created_at, updated_at",
            updates.join(", ")
        );

        let mut query = sqlx::query_as::<_, Class>(&sql);
        for param in params {
            query = query.bind(param);
        }
        query = query.bind(id);

        let result = query.fetch_one(self.pool).await.map_err(|e| {
            error!("更新班级失败: {}", e);
            e
        })?;

        info!("班级信息更新成功，ID: {}", id);
        Ok(result)
    }

    /// 删除班级
    ///
    /// # 参数
    /// - `id`: 班级 ID
    ///
    /// # 返回
    /// - `Ok(())`: 删除成功
    /// - `Err(SqlxError)`: 删除失败
    pub async fn delete(&self, id: i64) -> Result<(), SqlxError> {
        info!("删除班级，ID: {}", id);

        let result = sqlx::query("DELETE FROM classes WHERE id = ?")
            .bind(id)
            .execute(self.pool)
            .await
            .map_err(|e| {
                error!("删除班级失败: {}", e);
                e
            })?;

        if result.rows_affected() == 0 {
            warn!("班级不存在，ID: {}", id);
            return Err(SqlxError::RowNotFound);
        }

        info!("班级删除成功，ID: {}", id);
        Ok(())
    }
}
