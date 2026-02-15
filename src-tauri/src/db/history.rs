// ============================================================================
// 操作历史数据访问模块
// ============================================================================
// 本模块提供操作历史相关的数据库操作接口
//
// 功能：
// - 操作历史的 CRUD 操作
// - 按 schedule_id 查询操作历史
// - 获取最近 N 条操作历史
// - 清理旧操作历史（保留最近 100 条）
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

/// 操作类型
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(tag = "type")]
pub enum OperationType {
    /// 移动课程
    Move,
    /// 交换课程
    Swap,
    /// 添加课程
    Add,
    /// 删除课程
    Remove,
}

impl OperationType {
    /// 转换为字符串
    pub fn to_string(&self) -> String {
        match self {
            OperationType::Move => "Move".to_string(),
            OperationType::Swap => "Swap".to_string(),
            OperationType::Add => "Add".to_string(),
            OperationType::Remove => "Remove".to_string(),
        }
    }

    /// 从字符串解析
    pub fn from_string(s: &str) -> Result<Self, String> {
        match s {
            "Move" => Ok(OperationType::Move),
            "Swap" => Ok(OperationType::Swap),
            "Add" => Ok(OperationType::Add),
            "Remove" => Ok(OperationType::Remove),
            _ => Err(format!("无效的操作类型: {}", s)),
        }
    }
}

/// 操作历史记录
#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct OperationHistory {
    /// 操作历史 ID
    pub id: i64,
    /// 课表 ID
    pub schedule_id: i64,
    /// 操作类型（'Move', 'Swap', 'Add', 'Remove'）
    pub operation_type: String,
    /// 操作数据（JSON 格式）
    pub operation_data: String,
    /// 创建时间
    pub created_at: String,
}

/// 创建操作历史的输入数据
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreateOperationHistoryInput {
    /// 课表 ID
    pub schedule_id: i64,
    /// 操作类型
    pub operation_type: OperationType,
    /// 操作数据（JSON 格式）
    pub operation_data: serde_json::Value,
}

/// 操作历史数据访问接口
pub struct OperationHistoryRepository<'a> {
    pool: &'a SqlitePool,
}

impl<'a> OperationHistoryRepository<'a> {
    /// 创建新的操作历史数据访问实例
    pub fn new(pool: &'a SqlitePool) -> Self {
        Self { pool }
    }

    /// 创建操作历史记录
    ///
    /// # 参数
    /// - `input`: 创建操作历史的输入数据
    ///
    /// # 返回
    /// - `Ok(OperationHistory)`: 创建成功，返回操作历史信息
    /// - `Err(SqlxError)`: 创建失败
    pub async fn create(
        &self,
        input: CreateOperationHistoryInput,
    ) -> Result<OperationHistory, SqlxError> {
        info!(
            "创建操作历史: 课表 ID {}, 操作类型 {:?}",
            input.schedule_id, input.operation_type
        );

        // 将操作数据序列化为 JSON 字符串
        let operation_data_json = serde_json::to_string(&input.operation_data).map_err(|e| {
            error!("序列化操作数据失败: {}", e);
            SqlxError::Protocol(format!("序列化操作数据失败: {}", e))
        })?;

        debug!("操作数据: {}", operation_data_json);

        let result = sqlx::query_as::<_, OperationHistory>(
            r#"
            INSERT INTO operation_history (schedule_id, operation_type, operation_data, created_at)
            VALUES (?, ?, ?, datetime('now'))
            RETURNING id, schedule_id, operation_type, operation_data, created_at
            "#,
        )
        .bind(input.schedule_id)
        .bind(input.operation_type.to_string())
        .bind(&operation_data_json)
        .fetch_one(self.pool)
        .await
        .map_err(|e| {
            error!("创建操作历史失败: {}", e);
            e
        })?;

        info!("操作历史创建成功，ID: {}", result.id);
        Ok(result)
    }

    /// 根据 ID 查询操作历史
    ///
    /// # 参数
    /// - `id`: 操作历史 ID
    ///
    /// # 返回
    /// - `Ok(Some(OperationHistory))`: 找到操作历史
    /// - `Ok(None)`: 未找到操作历史
    /// - `Err(SqlxError)`: 查询失败
    pub async fn find_by_id(&self, id: i64) -> Result<Option<OperationHistory>, SqlxError> {
        debug!("查询操作历史，ID: {}", id);

        let result = sqlx::query_as::<_, OperationHistory>(
            r#"
            SELECT id, schedule_id, operation_type, operation_data, created_at
            FROM operation_history
            WHERE id = ?
            "#,
        )
        .bind(id)
        .fetch_optional(self.pool)
        .await?;

        if result.is_some() {
            debug!("找到操作历史，ID: {}", id);
        } else {
            debug!("未找到操作历史，ID: {}", id);
        }

        Ok(result)
    }

    /// 根据课表 ID 查询操作历史
    ///
    /// # 参数
    /// - `schedule_id`: 课表 ID
    ///
    /// # 返回
    /// - `Ok(Vec<OperationHistory>)`: 操作历史列表（按创建时间倒序）
    /// - `Err(SqlxError)`: 查询失败
    pub async fn find_by_schedule(
        &self,
        schedule_id: i64,
    ) -> Result<Vec<OperationHistory>, SqlxError> {
        debug!("查询课表的操作历史，课表 ID: {}", schedule_id);

        let result = sqlx::query_as::<_, OperationHistory>(
            r#"
            SELECT id, schedule_id, operation_type, operation_data, created_at
            FROM operation_history
            WHERE schedule_id = ?
            ORDER BY created_at DESC
            "#,
        )
        .bind(schedule_id)
        .fetch_all(self.pool)
        .await?;

        info!("课表 {} 有 {} 条操作历史", schedule_id, result.len());
        Ok(result)
    }

    /// 获取最近 N 条操作历史
    ///
    /// # 参数
    /// - `schedule_id`: 课表 ID
    /// - `limit`: 限制数量
    ///
    /// # 返回
    /// - `Ok(Vec<OperationHistory>)`: 操作历史列表（按创建时间倒序）
    /// - `Err(SqlxError)`: 查询失败
    pub async fn find_recent(
        &self,
        schedule_id: i64,
        limit: i64,
    ) -> Result<Vec<OperationHistory>, SqlxError> {
        debug!("查询课表 {} 的最近 {} 条操作历史", schedule_id, limit);

        let result = sqlx::query_as::<_, OperationHistory>(
            r#"
            SELECT id, schedule_id, operation_type, operation_data, created_at
            FROM operation_history
            WHERE schedule_id = ?
            ORDER BY created_at DESC
            LIMIT ?
            "#,
        )
        .bind(schedule_id)
        .bind(limit)
        .fetch_all(self.pool)
        .await?;

        info!(
            "查询到课表 {} 的 {} 条最近操作历史",
            schedule_id,
            result.len()
        );
        Ok(result)
    }

    /// 删除操作历史
    ///
    /// # 参数
    /// - `id`: 操作历史 ID
    ///
    /// # 返回
    /// - `Ok(())`: 删除成功
    /// - `Err(SqlxError)`: 删除失败
    pub async fn delete(&self, id: i64) -> Result<(), SqlxError> {
        info!("删除操作历史，ID: {}", id);

        let result = sqlx::query("DELETE FROM operation_history WHERE id = ?")
            .bind(id)
            .execute(self.pool)
            .await
            .map_err(|e| {
                error!("删除操作历史失败: {}", e);
                e
            })?;

        if result.rows_affected() == 0 {
            warn!("操作历史不存在，ID: {}", id);
            return Err(SqlxError::RowNotFound);
        }

        info!("操作历史删除成功，ID: {}", id);
        Ok(())
    }

    /// 清理旧操作历史（保留最近 N 条）
    ///
    /// # 参数
    /// - `schedule_id`: 课表 ID
    /// - `keep_count`: 保留的数量（默认 100）
    ///
    /// # 返回
    /// - `Ok(usize)`: 删除的数量
    /// - `Err(SqlxError)`: 清理失败
    pub async fn cleanup_old_history(
        &self,
        schedule_id: i64,
        keep_count: i64,
    ) -> Result<usize, SqlxError> {
        info!(
            "清理课表 {} 的旧操作历史，保留最近 {} 条",
            schedule_id, keep_count
        );

        // 先统计总数
        let total_count = self.count_by_schedule(schedule_id).await?;

        if total_count <= keep_count {
            debug!(
                "操作历史数量 {} 未超过保留数量 {}，无需清理",
                total_count, keep_count
            );
            return Ok(0);
        }

        // 使用子查询删除旧记录，保留最近的 N 条
        let result = sqlx::query(
            r#"
            DELETE FROM operation_history
            WHERE schedule_id = ?
            AND id NOT IN (
                SELECT id
                FROM operation_history
                WHERE schedule_id = ?
                ORDER BY id DESC
                LIMIT ?
            )
            "#,
        )
        .bind(schedule_id)
        .bind(schedule_id)
        .bind(keep_count)
        .execute(self.pool)
        .await
        .map_err(|e| {
            error!("清理旧操作历史失败: {}", e);
            e
        })?;

        let deleted_count = result.rows_affected() as usize;
        info!("清理完成，删除了 {} 条旧操作历史", deleted_count);
        Ok(deleted_count)
    }

    /// 删除指定课表的所有操作历史
    ///
    /// # 参数
    /// - `schedule_id`: 课表 ID
    ///
    /// # 返回
    /// - `Ok(usize)`: 删除的数量
    /// - `Err(SqlxError)`: 删除失败
    pub async fn delete_by_schedule(&self, schedule_id: i64) -> Result<usize, SqlxError> {
        info!("删除课表 {} 的所有操作历史", schedule_id);

        let result = sqlx::query("DELETE FROM operation_history WHERE schedule_id = ?")
            .bind(schedule_id)
            .execute(self.pool)
            .await
            .map_err(|e| {
                error!("删除课表操作历史失败: {}", e);
                e
            })?;

        let deleted_count = result.rows_affected() as usize;
        info!("删除了 {} 条操作历史", deleted_count);
        Ok(deleted_count)
    }

    /// 统计操作历史数量
    ///
    /// # 参数
    /// - `schedule_id`: 课表 ID
    ///
    /// # 返回
    /// - `Ok(i64)`: 操作历史数量
    /// - `Err(SqlxError)`: 查询失败
    pub async fn count_by_schedule(&self, schedule_id: i64) -> Result<i64, SqlxError> {
        debug!("统计课表 {} 的操作历史数量", schedule_id);

        let result: (i64,) = sqlx::query_as(
            r#"
            SELECT COUNT(*) as count
            FROM operation_history
            WHERE schedule_id = ?
            "#,
        )
        .bind(schedule_id)
        .fetch_one(self.pool)
        .await?;

        debug!("课表 {} 有 {} 条操作历史", schedule_id, result.0);
        Ok(result.0)
    }
}
