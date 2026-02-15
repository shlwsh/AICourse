// ============================================================================
// 教师互斥关系数据访问模块
// ============================================================================
// 本模块提供教师互斥关系相关的数据库操作接口
//
// 功能：
// - 教师互斥关系的 CRUD 操作
// - 按教师 ID 查询互斥关系
// - 批量操作（批量创建互斥关系）
// - 验证互斥关系的有效性
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

/// 互斥范围类型
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "type")]
pub enum ExclusionScope {
    /// 全时段互斥
    AllTime,
    /// 特定时段互斥（使用 u64 位掩码）
    SpecificSlots { mask: u64 },
}

/// 教师互斥关系信息
#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct TeacherMutualExclusion {
    /// 互斥关系 ID
    pub id: i64,
    /// 教师 A 的 ID
    pub teacher_a_id: i64,
    /// 教师 B 的 ID
    pub teacher_b_id: i64,
    /// 互斥范围类型（'AllTime' 或 'SpecificSlots'）
    pub scope_type: String,
    /// 特定时段掩码（JSON 格式的 u64，仅当 scope_type='SpecificSlots'）
    pub specific_slots: Option<String>,
    /// 创建时间
    pub created_at: String,
}

/// 创建教师互斥关系的输入数据
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreateTeacherMutualExclusionInput {
    /// 教师 A 的 ID
    pub teacher_a_id: i64,
    /// 教师 B 的 ID
    pub teacher_b_id: i64,
    /// 互斥范围
    pub scope: ExclusionScope,
}

/// 更新教师互斥关系的输入数据
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UpdateTeacherMutualExclusionInput {
    /// 互斥范围
    pub scope: Option<ExclusionScope>,
}

/// 教师互斥关系数据访问接口
pub struct TeacherMutualExclusionRepository<'a> {
    pool: &'a SqlitePool,
}

impl<'a> TeacherMutualExclusionRepository<'a> {
    /// 创建新的教师互斥关系数据访问实例
    pub fn new(pool: &'a SqlitePool) -> Self {
        Self { pool }
    }

    /// 创建教师互斥关系
    ///
    /// # 参数
    /// - `input`: 创建教师互斥关系的输入数据
    ///
    /// # 返回
    /// - `Ok(TeacherMutualExclusion)`: 创建成功，返回教师互斥关系信息
    /// - `Err(SqlxError)`: 创建失败
    pub async fn create(
        &self,
        input: CreateTeacherMutualExclusionInput,
    ) -> Result<TeacherMutualExclusion, SqlxError> {
        info!(
            "创建教师互斥关系: 教师 A ID {}, 教师 B ID {}",
            input.teacher_a_id, input.teacher_b_id
        );

        // 验证教师 ID 不能相同
        if input.teacher_a_id == input.teacher_b_id {
            error!("教师 ID 不能相同");
            return Err(SqlxError::Protocol("教师 ID 不能相同".to_string()));
        }

        // 解析互斥范围
        let (scope_type, specific_slots) = match &input.scope {
            ExclusionScope::AllTime => {
                debug!("互斥范围: 全时段");
                ("AllTime".to_string(), None)
            }
            ExclusionScope::SpecificSlots { mask } => {
                debug!("互斥范围: 特定时段，掩码: {}", mask);
                ("SpecificSlots".to_string(), Some(mask.to_string()))
            }
        };

        let result = sqlx::query_as::<_, TeacherMutualExclusion>(
            r#"
            INSERT INTO teacher_mutual_exclusions (
                teacher_a_id, teacher_b_id, scope_type, specific_slots, created_at
            )
            VALUES (?, ?, ?, ?, datetime('now'))
            RETURNING id, teacher_a_id, teacher_b_id, scope_type, specific_slots, created_at
            "#,
        )
        .bind(input.teacher_a_id)
        .bind(input.teacher_b_id)
        .bind(&scope_type)
        .bind(specific_slots)
        .fetch_one(self.pool)
        .await
        .map_err(|e| {
            error!("创建教师互斥关系失败: {}", e);
            e
        })?;

        info!("教师互斥关系创建成功，ID: {}", result.id);
        Ok(result)
    }

    /// 根据 ID 查询教师互斥关系
    ///
    /// # 参数
    /// - `id`: 教师互斥关系 ID
    ///
    /// # 返回
    /// - `Ok(Some(TeacherMutualExclusion))`: 找到教师互斥关系
    /// - `Ok(None)`: 未找到教师互斥关系
    /// - `Err(SqlxError)`: 查询失败
    pub async fn find_by_id(&self, id: i64) -> Result<Option<TeacherMutualExclusion>, SqlxError> {
        debug!("查询教师互斥关系，ID: {}", id);

        let result = sqlx::query_as::<_, TeacherMutualExclusion>(
            r#"
            SELECT id, teacher_a_id, teacher_b_id, scope_type, specific_slots, created_at
            FROM teacher_mutual_exclusions
            WHERE id = ?
            "#,
        )
        .bind(id)
        .fetch_optional(self.pool)
        .await?;

        if result.is_some() {
            debug!("找到教师互斥关系，ID: {}", id);
        } else {
            debug!("未找到教师互斥关系，ID: {}", id);
        }

        Ok(result)
    }

    /// 查询所有教师互斥关系
    ///
    /// # 返回
    /// - `Ok(Vec<TeacherMutualExclusion>)`: 教师互斥关系列表
    /// - `Err(SqlxError)`: 查询失败
    pub async fn find_all(&self) -> Result<Vec<TeacherMutualExclusion>, SqlxError> {
        debug!("查询所有教师互斥关系");

        let result = sqlx::query_as::<_, TeacherMutualExclusion>(
            r#"
            SELECT id, teacher_a_id, teacher_b_id, scope_type, specific_slots, created_at
            FROM teacher_mutual_exclusions
            ORDER BY id
            "#,
        )
        .fetch_all(self.pool)
        .await?;

        info!("查询到 {} 个教师互斥关系", result.len());
        Ok(result)
    }

    /// 根据教师 ID 查询互斥关系
    ///
    /// 查询指定教师与其他教师的所有互斥关系
    ///
    /// # 参数
    /// - `teacher_id`: 教师 ID
    ///
    /// # 返回
    /// - `Ok(Vec<TeacherMutualExclusion>)`: 教师互斥关系列表
    /// - `Err(SqlxError)`: 查询失败
    pub async fn find_by_teacher(
        &self,
        teacher_id: i64,
    ) -> Result<Vec<TeacherMutualExclusion>, SqlxError> {
        debug!("查询教师的互斥关系，教师 ID: {}", teacher_id);

        let result = sqlx::query_as::<_, TeacherMutualExclusion>(
            r#"
            SELECT id, teacher_a_id, teacher_b_id, scope_type, specific_slots, created_at
            FROM teacher_mutual_exclusions
            WHERE teacher_a_id = ? OR teacher_b_id = ?
            ORDER BY id
            "#,
        )
        .bind(teacher_id)
        .bind(teacher_id)
        .fetch_all(self.pool)
        .await?;

        info!("教师 {} 有 {} 个互斥关系", teacher_id, result.len());
        Ok(result)
    }

    /// 查询两位教师之间的互斥关系
    ///
    /// # 参数
    /// - `teacher_a_id`: 教师 A 的 ID
    /// - `teacher_b_id`: 教师 B 的 ID
    ///
    /// # 返回
    /// - `Ok(Some(TeacherMutualExclusion))`: 找到互斥关系
    /// - `Ok(None)`: 未找到互斥关系
    /// - `Err(SqlxError)`: 查询失败
    pub async fn find_between_teachers(
        &self,
        teacher_a_id: i64,
        teacher_b_id: i64,
    ) -> Result<Option<TeacherMutualExclusion>, SqlxError> {
        debug!(
            "查询两位教师之间的互斥关系，教师 A ID: {}, 教师 B ID: {}",
            teacher_a_id, teacher_b_id
        );

        let result = sqlx::query_as::<_, TeacherMutualExclusion>(
            r#"
            SELECT id, teacher_a_id, teacher_b_id, scope_type, specific_slots, created_at
            FROM teacher_mutual_exclusions
            WHERE (teacher_a_id = ? AND teacher_b_id = ?)
               OR (teacher_a_id = ? AND teacher_b_id = ?)
            LIMIT 1
            "#,
        )
        .bind(teacher_a_id)
        .bind(teacher_b_id)
        .bind(teacher_b_id)
        .bind(teacher_a_id)
        .fetch_optional(self.pool)
        .await?;

        if result.is_some() {
            debug!(
                "找到教师 {} 和 {} 之间的互斥关系",
                teacher_a_id, teacher_b_id
            );
        } else {
            debug!(
                "未找到教师 {} 和 {} 之间的互斥关系",
                teacher_a_id, teacher_b_id
            );
        }

        Ok(result)
    }

    /// 更新教师互斥关系信息
    ///
    /// # 参数
    /// - `id`: 教师互斥关系 ID
    /// - `input`: 更新教师互斥关系的输入数据
    ///
    /// # 返回
    /// - `Ok(TeacherMutualExclusion)`: 更新成功，返回更新后的教师互斥关系信息
    /// - `Err(SqlxError)`: 更新失败
    pub async fn update(
        &self,
        id: i64,
        input: UpdateTeacherMutualExclusionInput,
    ) -> Result<TeacherMutualExclusion, SqlxError> {
        info!("更新教师互斥关系信息，ID: {}", id);

        if input.scope.is_none() {
            warn!("没有需要更新的字段");
            return self.find_by_id(id).await?.ok_or_else(|| {
                error!("教师互斥关系不存在，ID: {}", id);
                SqlxError::RowNotFound
            });
        }

        // 解析互斥范围
        let (scope_type, specific_slots) = match &input.scope.unwrap() {
            ExclusionScope::AllTime => {
                debug!("更新互斥范围: 全时段");
                ("AllTime".to_string(), None)
            }
            ExclusionScope::SpecificSlots { mask } => {
                debug!("更新互斥范围: 特定时段，掩码: {}", mask);
                ("SpecificSlots".to_string(), Some(mask.to_string()))
            }
        };

        let result = sqlx::query_as::<_, TeacherMutualExclusion>(
            r#"
            UPDATE teacher_mutual_exclusions
            SET scope_type = ?, specific_slots = ?
            WHERE id = ?
            RETURNING id, teacher_a_id, teacher_b_id, scope_type, specific_slots, created_at
            "#,
        )
        .bind(&scope_type)
        .bind(specific_slots)
        .bind(id)
        .fetch_one(self.pool)
        .await
        .map_err(|e| {
            error!("更新教师互斥关系失败: {}", e);
            e
        })?;

        info!("教师互斥关系信息更新成功，ID: {}", id);
        Ok(result)
    }

    /// 删除教师互斥关系
    ///
    /// # 参数
    /// - `id`: 教师互斥关系 ID
    ///
    /// # 返回
    /// - `Ok(())`: 删除成功
    /// - `Err(SqlxError)`: 删除失败
    pub async fn delete(&self, id: i64) -> Result<(), SqlxError> {
        info!("删除教师互斥关系，ID: {}", id);

        let result = sqlx::query("DELETE FROM teacher_mutual_exclusions WHERE id = ?")
            .bind(id)
            .execute(self.pool)
            .await
            .map_err(|e| {
                error!("删除教师互斥关系失败: {}", e);
                e
            })?;

        if result.rows_affected() == 0 {
            warn!("教师互斥关系不存在，ID: {}", id);
            return Err(SqlxError::RowNotFound);
        }

        info!("教师互斥关系删除成功，ID: {}", id);
        Ok(())
    }

    /// 批量创建教师互斥关系
    ///
    /// 使用事务确保所有互斥关系都成功创建或全部回滚
    ///
    /// # 参数
    /// - `inputs`: 教师互斥关系输入数据列表
    ///
    /// # 返回
    /// - `Ok(usize)`: 创建成功的数量
    /// - `Err(SqlxError)`: 创建失败
    pub async fn batch_create(
        &self,
        inputs: Vec<CreateTeacherMutualExclusionInput>,
    ) -> Result<usize, SqlxError> {
        info!("批量创建教师互斥关系，数量: {}", inputs.len());

        if inputs.is_empty() {
            warn!("没有需要创建的教师互斥关系");
            return Ok(0);
        }

        // 开始事务
        let mut tx = self.pool.begin().await.map_err(|e| {
            error!("开始事务失败: {}", e);
            e
        })?;

        let mut created_count = 0;

        for input in inputs {
            // 验证教师 ID 不能相同
            if input.teacher_a_id == input.teacher_b_id {
                error!("教师 ID 不能相同");
                return Err(SqlxError::Protocol("教师 ID 不能相同".to_string()));
            }

            debug!(
                "创建教师互斥关系: 教师 A ID {}, 教师 B ID {}",
                input.teacher_a_id, input.teacher_b_id
            );

            // 解析互斥范围
            let (scope_type, specific_slots) = match &input.scope {
                ExclusionScope::AllTime => ("AllTime".to_string(), None),
                ExclusionScope::SpecificSlots { mask } => {
                    ("SpecificSlots".to_string(), Some(mask.to_string()))
                }
            };

            sqlx::query(
                r#"
                INSERT INTO teacher_mutual_exclusions (
                    teacher_a_id, teacher_b_id, scope_type, specific_slots, created_at
                )
                VALUES (?, ?, ?, ?, datetime('now'))
                "#,
            )
            .bind(input.teacher_a_id)
            .bind(input.teacher_b_id)
            .bind(&scope_type)
            .bind(specific_slots)
            .execute(&mut *tx)
            .await
            .map_err(|e| {
                error!(
                    "批量创建教师互斥关系失败，教师 A ID: {}, 教师 B ID: {}",
                    input.teacher_a_id, input.teacher_b_id
                );
                e
            })?;

            created_count += 1;
        }

        // 提交事务
        tx.commit().await.map_err(|e| {
            error!("提交事务失败: {}", e);
            e
        })?;

        info!("批量创建教师互斥关系成功，数量: {}", created_count);
        Ok(created_count)
    }
}
