// ============================================================================
// 科目配置数据访问模块
// ============================================================================
// 本模块提供科目配置相关的数据库操作接口
//
// 功能：
// - 科目配置的 CRUD 操作
// - 按场地查询科目配置
// - 批量操作（批量创建科目配置）
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

/// 科目配置信息
#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct SubjectConfig {
    /// 科目 ID
    pub id: String,
    /// 科目名称
    pub name: String,
    /// 禁止时段掩码（JSON 格式的 u64）
    pub forbidden_slots: String,
    /// 是否允许连堂（0=不允许, 1=允许）
    pub allow_double_session: i64,
    /// 关联场地 ID（可选）
    pub venue_id: Option<String>,
    /// 是否主科（0=否, 1=是）
    pub is_major_subject: i64,
    /// 创建时间
    pub created_at: String,
    /// 更新时间
    pub updated_at: String,
}

/// 创建科目配置的输入数据
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreateSubjectConfigInput {
    /// 科目 ID
    pub id: String,
    /// 科目名称
    pub name: String,
    /// 禁止时段掩码（u64）
    pub forbidden_slots: u64,
    /// 是否允许连堂
    pub allow_double_session: bool,
    /// 关联场地 ID（可选）
    pub venue_id: Option<String>,
    /// 是否主科
    pub is_major_subject: bool,
}

/// 更新科目配置的输入数据
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UpdateSubjectConfigInput {
    /// 科目名称
    pub name: Option<String>,
    /// 禁止时段掩码（u64）
    pub forbidden_slots: Option<u64>,
    /// 是否允许连堂
    pub allow_double_session: Option<bool>,
    /// 关联场地 ID（可选）
    pub venue_id: Option<String>,
    /// 是否主科
    pub is_major_subject: Option<bool>,
}

/// 科目配置数据访问接口
pub struct SubjectConfigRepository<'a> {
    pool: &'a SqlitePool,
}

impl<'a> SubjectConfigRepository<'a> {
    /// 创建新的科目配置数据访问实例
    pub fn new(pool: &'a SqlitePool) -> Self {
        Self { pool }
    }

    /// 创建科目配置
    ///
    /// # 参数
    /// - `input`: 创建科目配置的输入数据
    ///
    /// # 返回
    /// - `Ok(SubjectConfig)`: 创建成功，返回科目配置信息
    /// - `Err(SqlxError)`: 创建失败
    pub async fn create(
        &self,
        input: CreateSubjectConfigInput,
    ) -> Result<SubjectConfig, SqlxError> {
        info!("创建科目配置: {} ({})", input.name, input.id);

        // 将 u64 转换为 JSON 字符串
        let forbidden_slots_json = input.forbidden_slots.to_string();
        let allow_double_session_int = if input.allow_double_session { 1 } else { 0 };
        let is_major_subject_int = if input.is_major_subject { 1 } else { 0 };

        debug!(
            "禁止时段掩码: {}, 允许连堂: {}, 主科: {}",
            forbidden_slots_json, allow_double_session_int, is_major_subject_int
        );

        let result = sqlx::query_as::<_, SubjectConfig>(
            r#"
            INSERT INTO subject_configs (
                id, name, forbidden_slots, allow_double_session,
                venue_id, is_major_subject, created_at, updated_at
            )
            VALUES (?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
            RETURNING id, name, forbidden_slots, allow_double_session,
                      venue_id, is_major_subject, created_at, updated_at
            "#,
        )
        .bind(&input.id)
        .bind(&input.name)
        .bind(&forbidden_slots_json)
        .bind(allow_double_session_int)
        .bind(&input.venue_id)
        .bind(is_major_subject_int)
        .fetch_one(self.pool)
        .await
        .map_err(|e| {
            error!("创建科目配置失败: {}", e);
            e
        })?;

        info!("科目配置创建成功，ID: {}", result.id);
        Ok(result)
    }

    /// 根据 ID 查询科目配置
    ///
    /// # 参数
    /// - `id`: 科目 ID
    ///
    /// # 返回
    /// - `Ok(Some(SubjectConfig))`: 找到科目配置
    /// - `Ok(None)`: 未找到科目配置
    /// - `Err(SqlxError)`: 查询失败
    pub async fn find_by_id(&self, id: &str) -> Result<Option<SubjectConfig>, SqlxError> {
        debug!("查询科目配置，ID: {}", id);

        let result = sqlx::query_as::<_, SubjectConfig>(
            r#"
            SELECT id, name, forbidden_slots, allow_double_session,
                   venue_id, is_major_subject, created_at, updated_at
            FROM subject_configs
            WHERE id = ?
            "#,
        )
        .bind(id)
        .fetch_optional(self.pool)
        .await?;

        if result.is_some() {
            debug!("找到科目配置，ID: {}", id);
        } else {
            debug!("未找到科目配置，ID: {}", id);
        }

        Ok(result)
    }

    /// 查询所有科目配置
    ///
    /// # 返回
    /// - `Ok(Vec<SubjectConfig>)`: 科目配置列表
    /// - `Err(SqlxError)`: 查询失败
    pub async fn find_all(&self) -> Result<Vec<SubjectConfig>, SqlxError> {
        debug!("查询所有科目配置");

        let result = sqlx::query_as::<_, SubjectConfig>(
            r#"
            SELECT id, name, forbidden_slots, allow_double_session,
                   venue_id, is_major_subject, created_at, updated_at
            FROM subject_configs
            ORDER BY id
            "#,
        )
        .fetch_all(self.pool)
        .await?;

        info!("查询到 {} 个科目配置", result.len());
        Ok(result)
    }

    /// 根据场地查询科目配置
    ///
    /// # 参数
    /// - `venue_id`: 场地 ID
    ///
    /// # 返回
    /// - `Ok(Vec<SubjectConfig>)`: 科目配置列表
    /// - `Err(SqlxError)`: 查询失败
    pub async fn find_by_venue(&self, venue_id: &str) -> Result<Vec<SubjectConfig>, SqlxError> {
        debug!("查询场地的科目配置，场地 ID: {}", venue_id);

        let result = sqlx::query_as::<_, SubjectConfig>(
            r#"
            SELECT id, name, forbidden_slots, allow_double_session,
                   venue_id, is_major_subject, created_at, updated_at
            FROM subject_configs
            WHERE venue_id = ?
            ORDER BY id
            "#,
        )
        .bind(venue_id)
        .fetch_all(self.pool)
        .await?;

        info!("场地 {} 有 {} 个科目配置", venue_id, result.len());
        Ok(result)
    }

    /// 查询所有主科配置
    ///
    /// # 返回
    /// - `Ok(Vec<SubjectConfig>)`: 主科配置列表
    /// - `Err(SqlxError)`: 查询失败
    pub async fn find_major_subjects(&self) -> Result<Vec<SubjectConfig>, SqlxError> {
        debug!("查询所有主科配置");

        let result = sqlx::query_as::<_, SubjectConfig>(
            r#"
            SELECT id, name, forbidden_slots, allow_double_session,
                   venue_id, is_major_subject, created_at, updated_at
            FROM subject_configs
            WHERE is_major_subject = 1
            ORDER BY id
            "#,
        )
        .fetch_all(self.pool)
        .await?;

        info!("查询到 {} 个主科配置", result.len());
        Ok(result)
    }

    /// 更新科目配置信息
    ///
    /// # 参数
    /// - `id`: 科目 ID
    /// - `input`: 更新科目配置的输入数据
    ///
    /// # 返回
    /// - `Ok(SubjectConfig)`: 更新成功，返回更新后的科目配置信息
    /// - `Err(SqlxError)`: 更新失败
    pub async fn update(
        &self,
        id: &str,
        input: UpdateSubjectConfigInput,
    ) -> Result<SubjectConfig, SqlxError> {
        info!("更新科目配置信息，ID: {}", id);

        // 构建动态更新语句
        let mut updates = Vec::new();
        let mut params: Vec<String> = Vec::new();

        if let Some(name) = &input.name {
            updates.push("name = ?");
            params.push(name.clone());
            debug!("更新科目名称: {}", name);
        }

        if let Some(forbidden_slots) = input.forbidden_slots {
            updates.push("forbidden_slots = ?");
            params.push(forbidden_slots.to_string());
            debug!("更新禁止时段掩码: {}", forbidden_slots);
        }

        if let Some(allow_double_session) = input.allow_double_session {
            updates.push("allow_double_session = ?");
            let value = if allow_double_session { 1 } else { 0 };
            params.push(value.to_string());
            debug!("更新允许连堂: {}", allow_double_session);
        }

        if let Some(venue_id) = &input.venue_id {
            updates.push("venue_id = ?");
            params.push(venue_id.clone());
            debug!("更新场地 ID: {}", venue_id);
        }

        if let Some(is_major_subject) = input.is_major_subject {
            updates.push("is_major_subject = ?");
            let value = if is_major_subject { 1 } else { 0 };
            params.push(value.to_string());
            debug!("更新是否主科: {}", is_major_subject);
        }

        if updates.is_empty() {
            warn!("没有需要更新的字段");
            return self.find_by_id(id).await?.ok_or_else(|| {
                error!("科目配置不存在，ID: {}", id);
                SqlxError::RowNotFound
            });
        }

        updates.push("updated_at = datetime('now')");

        let sql = format!(
            "UPDATE subject_configs SET {} WHERE id = ? RETURNING id, name, forbidden_slots, allow_double_session, venue_id, is_major_subject, created_at, updated_at",
            updates.join(", ")
        );

        let mut query = sqlx::query_as::<_, SubjectConfig>(&sql);
        for param in params {
            query = query.bind(param);
        }
        query = query.bind(id);

        let result = query.fetch_one(self.pool).await.map_err(|e| {
            error!("更新科目配置失败: {}", e);
            e
        })?;

        info!("科目配置信息更新成功，ID: {}", id);
        Ok(result)
    }

    /// 删除科目配置
    ///
    /// # 参数
    /// - `id`: 科目 ID
    ///
    /// # 返回
    /// - `Ok(())`: 删除成功
    /// - `Err(SqlxError)`: 删除失败
    pub async fn delete(&self, id: &str) -> Result<(), SqlxError> {
        info!("删除科目配置，ID: {}", id);

        let result = sqlx::query("DELETE FROM subject_configs WHERE id = ?")
            .bind(id)
            .execute(self.pool)
            .await
            .map_err(|e| {
                error!("删除科目配置失败: {}", e);
                e
            })?;

        if result.rows_affected() == 0 {
            warn!("科目配置不存在，ID: {}", id);
            return Err(SqlxError::RowNotFound);
        }

        info!("科目配置删除成功，ID: {}", id);
        Ok(())
    }

    /// 批量创建科目配置
    ///
    /// 使用事务确保所有科目配置都成功创建或全部回滚
    ///
    /// # 参数
    /// - `inputs`: 科目配置输入数据列表
    ///
    /// # 返回
    /// - `Ok(usize)`: 创建成功的数量
    /// - `Err(SqlxError)`: 创建失败
    pub async fn batch_create(
        &self,
        inputs: Vec<CreateSubjectConfigInput>,
    ) -> Result<usize, SqlxError> {
        info!("批量创建科目配置，数量: {}", inputs.len());

        if inputs.is_empty() {
            warn!("没有需要创建的科目配置");
            return Ok(0);
        }

        // 开始事务
        let mut tx = self.pool.begin().await.map_err(|e| {
            error!("开始事务失败: {}", e);
            e
        })?;

        let mut created_count = 0;

        for input in inputs {
            debug!("创建科目配置: {} ({})", input.name, input.id);

            // 将 u64 转换为 JSON 字符串
            let forbidden_slots_json = input.forbidden_slots.to_string();
            let allow_double_session_int = if input.allow_double_session { 1 } else { 0 };
            let is_major_subject_int = if input.is_major_subject { 1 } else { 0 };

            sqlx::query(
                r#"
                INSERT INTO subject_configs (
                    id, name, forbidden_slots, allow_double_session,
                    venue_id, is_major_subject, created_at, updated_at
                )
                VALUES (?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
                "#,
            )
            .bind(&input.id)
            .bind(&input.name)
            .bind(&forbidden_slots_json)
            .bind(allow_double_session_int)
            .bind(&input.venue_id)
            .bind(is_major_subject_int)
            .execute(&mut *tx)
            .await
            .map_err(|e| {
                error!("批量创建科目配置失败，科目 ID: {}", input.id);
                e
            })?;

            created_count += 1;
        }

        // 提交事务
        tx.commit().await.map_err(|e| {
            error!("提交事务失败: {}", e);
            e
        })?;

        info!("批量创建科目配置成功，数量: {}", created_count);
        Ok(created_count)
    }
}
