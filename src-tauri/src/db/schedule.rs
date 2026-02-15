// ============================================================================
// 课表数据访问模块
// ============================================================================
// 本模块提供课表相关的数据库操作接口
//
// 功能：
// - 课表的 CRUD 操作
// - 课表条目的 CRUD 操作
// - 活动课表查询
// - 课表版本管理
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

/// 课表信息
#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct Schedule {
    /// 课表 ID
    pub id: i64,
    /// 版本号
    pub version: i64,
    /// 排课周期天数
    pub cycle_days: i64,
    /// 每天节次数
    pub periods_per_day: i64,
    /// 代价值
    pub cost: i64,
    /// 是否活动课表
    pub is_active: i64,
    /// 创建时间
    pub created_at: String,
}

/// 课表条目信息
#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct ScheduleEntry {
    /// 条目 ID
    pub id: i64,
    /// 课表 ID
    pub schedule_id: i64,
    /// 班级 ID
    pub class_id: i64,
    /// 科目 ID
    pub subject_id: String,
    /// 教师 ID
    pub teacher_id: i64,
    /// 星期几（0-29）
    pub day: i64,
    /// 第几节（0-11）
    pub period: i64,
    /// 是否固定课程
    pub is_fixed: i64,
    /// 单双周标记：'Every', 'Odd', 'Even'
    pub week_type: String,
}

/// 创建课表的输入数据
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreateScheduleInput {
    /// 版本号
    pub version: i64,
    /// 排课周期天数
    pub cycle_days: i64,
    /// 每天节次数
    pub periods_per_day: i64,
    /// 代价值
    pub cost: i64,
    /// 课表条目列表
    pub entries: Vec<CreateScheduleEntryInput>,
}

/// 创建课表条目的输入数据
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreateScheduleEntryInput {
    /// 班级 ID
    pub class_id: i64,
    /// 科目 ID
    pub subject_id: String,
    /// 教师 ID
    pub teacher_id: i64,
    /// 星期几（0-29）
    pub day: i64,
    /// 第几节（0-11）
    pub period: i64,
    /// 是否固定课程
    pub is_fixed: bool,
    /// 单双周标记：'Every', 'Odd', 'Even'
    pub week_type: String,
}

/// 更新课表的输入数据
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UpdateScheduleInput {
    /// 版本号
    pub version: Option<i64>,
    /// 代价值
    pub cost: Option<i64>,
    /// 是否活动课表
    pub is_active: Option<bool>,
}

/// 更新课表条目的输入数据
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UpdateScheduleEntryInput {
    /// 班级 ID
    pub class_id: Option<i64>,
    /// 科目 ID
    pub subject_id: Option<String>,
    /// 教师 ID
    pub teacher_id: Option<i64>,
    /// 星期几（0-29）
    pub day: Option<i64>,
    /// 第几节（0-11）
    pub period: Option<i64>,
    /// 是否固定课程
    pub is_fixed: Option<bool>,
    /// 单双周标记
    pub week_type: Option<String>,
}

/// 课表数据访问接口
pub struct ScheduleRepository<'a> {
    pool: &'a SqlitePool,
}

impl<'a> ScheduleRepository<'a> {
    /// 创建新的课表数据访问实例
    pub fn new(pool: &'a SqlitePool) -> Self {
        Self { pool }
    }

    /// 获取所有课表
    ///
    /// # 返回
    /// - `Ok(Vec<Schedule>)`: 课表列表
    /// - `Err(SqlxError)`: 查询失败
    pub async fn get_all_schedules(&self) -> Result<Vec<Schedule>, SqlxError> {
        debug!("查询所有课表");

        let result = sqlx::query_as::<_, Schedule>(
            r#"
            SELECT id, version, cycle_days, periods_per_day, cost, is_active, created_at
            FROM schedules
            ORDER BY created_at DESC
            "#,
        )
        .fetch_all(self.pool)
        .await?;

        info!("查询到 {} 个课表", result.len());
        Ok(result)
    }

    /// 根据 ID 获取课表
    ///
    /// # 参数
    /// - `id`: 课表 ID
    ///
    /// # 返回
    /// - `Ok(Some(Schedule))`: 找到课表
    /// - `Ok(None)`: 未找到课表
    /// - `Err(SqlxError)`: 查询失败
    pub async fn get_schedule_by_id(&self, id: i64) -> Result<Option<Schedule>, SqlxError> {
        debug!("查询课表，ID: {}", id);

        let result = sqlx::query_as::<_, Schedule>(
            r#"
            SELECT id, version, cycle_days, periods_per_day, cost, is_active, created_at
            FROM schedules
            WHERE id = ?
            "#,
        )
        .bind(id)
        .fetch_optional(self.pool)
        .await?;

        if result.is_some() {
            debug!("找到课表，ID: {}", id);
        } else {
            debug!("未找到课表，ID: {}", id);
        }

        Ok(result)
    }

    /// 获取当前活动课表
    ///
    /// # 返回
    /// - `Ok(Some(Schedule))`: 找到活动课表
    /// - `Ok(None)`: 未找到活动课表
    /// - `Err(SqlxError)`: 查询失败
    pub async fn get_active_schedule(&self) -> Result<Option<Schedule>, SqlxError> {
        debug!("查询活动课表");

        let result = sqlx::query_as::<_, Schedule>(
            r#"
            SELECT id, version, cycle_days, periods_per_day, cost, is_active, created_at
            FROM schedules
            WHERE is_active = 1
            ORDER BY created_at DESC
            LIMIT 1
            "#,
        )
        .fetch_optional(self.pool)
        .await?;

        if let Some(ref schedule) = result {
            info!(
                "找到活动课表，ID: {}, 版本: {}",
                schedule.id, schedule.version
            );
        } else {
            info!("未找到活动课表");
        }

        Ok(result)
    }

    /// 创建课表（包含课表条目）
    ///
    /// 使用事务确保课表和条目都成功创建
    ///
    /// # 参数
    /// - `input`: 创建课表的输入数据
    ///
    /// # 返回
    /// - `Ok(Schedule)`: 创建成功，返回课表信息
    /// - `Err(SqlxError)`: 创建失败
    pub async fn create_schedule(&self, input: CreateScheduleInput) -> Result<Schedule, SqlxError> {
        info!(
            "创建课表，版本: {}, 周期: {} 天, 每天 {} 节, 代价: {}, 条目数: {}",
            input.version,
            input.cycle_days,
            input.periods_per_day,
            input.cost,
            input.entries.len()
        );

        // 开始事务
        let mut tx = self.pool.begin().await.map_err(|e| {
            error!("开始事务失败: {}", e);
            e
        })?;

        // 1. 将其他课表设为非活动
        debug!("将其他课表设为非活动");
        sqlx::query("UPDATE schedules SET is_active = 0")
            .execute(&mut *tx)
            .await
            .map_err(|e| {
                error!("更新其他课表状态失败: {}", e);
                e
            })?;

        // 2. 插入课表记录
        debug!("插入课表记录");
        let schedule = sqlx::query_as::<_, Schedule>(
            r#"
            INSERT INTO schedules (version, cycle_days, periods_per_day, cost, is_active, created_at)
            VALUES (?, ?, ?, ?, 1, datetime('now'))
            RETURNING id, version, cycle_days, periods_per_day, cost, is_active, created_at
            "#,
        )
        .bind(input.version)
        .bind(input.cycle_days)
        .bind(input.periods_per_day)
        .bind(input.cost)
        .fetch_one(&mut *tx)
        .await
        .map_err(|e| {
            error!("插入课表记录失败: {}", e);
            e
        })?;

        let schedule_id = schedule.id;
        info!("课表记录创建成功，ID: {}", schedule_id);

        // 3. 插入课表条目
        debug!("插入 {} 个课表条目", input.entries.len());
        for (index, entry) in input.entries.iter().enumerate() {
            let is_fixed = if entry.is_fixed { 1 } else { 0 };

            sqlx::query(
                r#"
                INSERT INTO schedule_entries (
                    schedule_id, class_id, subject_id, teacher_id, day, period, is_fixed, week_type
                )
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                "#,
            )
            .bind(schedule_id)
            .bind(entry.class_id)
            .bind(&entry.subject_id)
            .bind(entry.teacher_id)
            .bind(entry.day)
            .bind(entry.period)
            .bind(is_fixed)
            .bind(&entry.week_type)
            .execute(&mut *tx)
            .await
            .map_err(|e| {
                error!("插入课表条目失败，索引: {}, 错误: {}", index, e);
                e
            })?;

            if (index + 1) % 100 == 0 {
                debug!("已插入 {} 个课表条目", index + 1);
            }
        }

        // 4. 提交事务
        tx.commit().await.map_err(|e| {
            error!("提交事务失败: {}", e);
            e
        })?;

        info!(
            "课表创建成功，ID: {}, 包含 {} 个条目",
            schedule_id,
            input.entries.len()
        );
        Ok(schedule)
    }

    /// 更新课表
    ///
    /// # 参数
    /// - `id`: 课表 ID
    /// - `input`: 更新课表的输入数据
    ///
    /// # 返回
    /// - `Ok(Schedule)`: 更新成功，返回更新后的课表信息
    /// - `Err(SqlxError)`: 更新失败
    pub async fn update_schedule(
        &self,
        id: i64,
        input: UpdateScheduleInput,
    ) -> Result<Schedule, SqlxError> {
        info!("更新课表，ID: {}", id);

        // 构建动态更新语句
        let mut updates = Vec::new();
        let mut params: Vec<String> = Vec::new();

        if let Some(version) = input.version {
            updates.push("version = ?");
            params.push(version.to_string());
            debug!("更新版本号: {}", version);
        }

        if let Some(cost) = input.cost {
            updates.push("cost = ?");
            params.push(cost.to_string());
            debug!("更新代价值: {}", cost);
        }

        if let Some(is_active) = input.is_active {
            let is_active_int = if is_active { 1 } else { 0 };
            updates.push("is_active = ?");
            params.push(is_active_int.to_string());
            debug!("更新活动状态: {}", is_active);

            // 如果设置为活动，需要将其他课表设为非活动
            if is_active {
                debug!("将其他课表设为非活动");
                sqlx::query("UPDATE schedules SET is_active = 0 WHERE id != ?")
                    .bind(id)
                    .execute(self.pool)
                    .await
                    .map_err(|e| {
                        error!("更新其他课表状态失败: {}", e);
                        e
                    })?;
            }
        }

        if updates.is_empty() {
            warn!("没有需要更新的字段");
            return self.get_schedule_by_id(id).await?.ok_or_else(|| {
                error!("课表不存在，ID: {}", id);
                SqlxError::RowNotFound
            });
        }

        let sql = format!(
            "UPDATE schedules SET {} WHERE id = ? RETURNING id, version, cycle_days, periods_per_day, cost, is_active, created_at",
            updates.join(", ")
        );

        let mut query = sqlx::query_as::<_, Schedule>(&sql);
        for param in params {
            query = query.bind(param);
        }
        query = query.bind(id);

        let result = query.fetch_one(self.pool).await.map_err(|e| {
            error!("更新课表失败: {}", e);
            e
        })?;

        info!("课表更新成功，ID: {}", id);
        Ok(result)
    }

    /// 删除课表
    ///
    /// 会级联删除所有相关的课表条目
    ///
    /// # 参数
    /// - `id`: 课表 ID
    ///
    /// # 返回
    /// - `Ok(())`: 删除成功
    /// - `Err(SqlxError)`: 删除失败
    pub async fn delete_schedule(&self, id: i64) -> Result<(), SqlxError> {
        info!("删除课表，ID: {}", id);

        // 开始事务
        let mut tx = self.pool.begin().await.map_err(|e| {
            error!("开始事务失败: {}", e);
            e
        })?;

        // 1. 删除课表条目
        debug!("删除课表条目");
        let entries_result = sqlx::query("DELETE FROM schedule_entries WHERE schedule_id = ?")
            .bind(id)
            .execute(&mut *tx)
            .await
            .map_err(|e| {
                error!("删除课表条目失败: {}", e);
                e
            })?;

        let entries_deleted = entries_result.rows_affected();
        debug!("删除了 {} 个课表条目", entries_deleted);

        // 2. 删除课表
        debug!("删除课表记录");
        let schedule_result = sqlx::query("DELETE FROM schedules WHERE id = ?")
            .bind(id)
            .execute(&mut *tx)
            .await
            .map_err(|e| {
                error!("删除课表失败: {}", e);
                e
            })?;

        if schedule_result.rows_affected() == 0 {
            warn!("课表不存在，ID: {}", id);
            return Err(SqlxError::RowNotFound);
        }

        // 3. 提交事务
        tx.commit().await.map_err(|e| {
            error!("提交事务失败: {}", e);
            e
        })?;

        info!(
            "课表删除成功，ID: {}, 删除了 {} 个条目",
            id, entries_deleted
        );
        Ok(())
    }

    /// 获取课表的所有条目
    ///
    /// # 参数
    /// - `schedule_id`: 课表 ID
    ///
    /// # 返回
    /// - `Ok(Vec<ScheduleEntry>)`: 课表条目列表
    /// - `Err(SqlxError)`: 查询失败
    pub async fn get_schedule_entries(
        &self,
        schedule_id: i64,
    ) -> Result<Vec<ScheduleEntry>, SqlxError> {
        debug!("查询课表条目，课表 ID: {}", schedule_id);

        let result = sqlx::query_as::<_, ScheduleEntry>(
            r#"
            SELECT id, schedule_id, class_id, subject_id, teacher_id, day, period, is_fixed, week_type
            FROM schedule_entries
            WHERE schedule_id = ?
            ORDER BY day, period, class_id
            "#,
        )
        .bind(schedule_id)
        .fetch_all(self.pool)
        .await?;

        info!("课表 {} 有 {} 个条目", schedule_id, result.len());
        Ok(result)
    }

    /// 创建课表条目
    ///
    /// # 参数
    /// - `schedule_id`: 课表 ID
    /// - `input`: 创建课表条目的输入数据
    ///
    /// # 返回
    /// - `Ok(ScheduleEntry)`: 创建成功，返回课表条目信息
    /// - `Err(SqlxError)`: 创建失败
    pub async fn create_schedule_entry(
        &self,
        schedule_id: i64,
        input: CreateScheduleEntryInput,
    ) -> Result<ScheduleEntry, SqlxError> {
        info!(
            "创建课表条目，课表 ID: {}, 班级: {}, 科目: {}, 教师: {}, 时间: 第{}天第{}节",
            schedule_id,
            input.class_id,
            input.subject_id,
            input.teacher_id,
            input.day,
            input.period
        );

        // 验证课表是否存在
        if self.get_schedule_by_id(schedule_id).await?.is_none() {
            error!("课表不存在，ID: {}", schedule_id);
            return Err(SqlxError::RowNotFound);
        }

        let is_fixed = if input.is_fixed { 1 } else { 0 };

        let result = sqlx::query_as::<_, ScheduleEntry>(
            r#"
            INSERT INTO schedule_entries (
                schedule_id, class_id, subject_id, teacher_id, day, period, is_fixed, week_type
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            RETURNING id, schedule_id, class_id, subject_id, teacher_id, day, period, is_fixed, week_type
            "#,
        )
        .bind(schedule_id)
        .bind(input.class_id)
        .bind(&input.subject_id)
        .bind(input.teacher_id)
        .bind(input.day)
        .bind(input.period)
        .bind(is_fixed)
        .bind(&input.week_type)
        .fetch_one(self.pool)
        .await
        .map_err(|e| {
            error!("创建课表条目失败: {}", e);
            e
        })?;

        info!("课表条目创建成功，ID: {}", result.id);
        Ok(result)
    }

    /// 更新课表条目
    ///
    /// # 参数
    /// - `id`: 课表条目 ID
    /// - `input`: 更新课表条目的输入数据
    ///
    /// # 返回
    /// - `Ok(ScheduleEntry)`: 更新成功，返回更新后的课表条目信息
    /// - `Err(SqlxError)`: 更新失败
    pub async fn update_schedule_entry(
        &self,
        id: i64,
        input: UpdateScheduleEntryInput,
    ) -> Result<ScheduleEntry, SqlxError> {
        info!("更新课表条目，ID: {}", id);

        // 构建动态更新语句
        let mut updates = Vec::new();
        let mut params: Vec<String> = Vec::new();

        if let Some(class_id) = input.class_id {
            updates.push("class_id = ?");
            params.push(class_id.to_string());
            debug!("更新班级 ID: {}", class_id);
        }

        if let Some(subject_id) = &input.subject_id {
            updates.push("subject_id = ?");
            params.push(subject_id.clone());
            debug!("更新科目 ID: {}", subject_id);
        }

        if let Some(teacher_id) = input.teacher_id {
            updates.push("teacher_id = ?");
            params.push(teacher_id.to_string());
            debug!("更新教师 ID: {}", teacher_id);
        }

        if let Some(day) = input.day {
            updates.push("day = ?");
            params.push(day.to_string());
            debug!("更新星期: {}", day);
        }

        if let Some(period) = input.period {
            updates.push("period = ?");
            params.push(period.to_string());
            debug!("更新节次: {}", period);
        }

        if let Some(is_fixed) = input.is_fixed {
            let is_fixed_int = if is_fixed { 1 } else { 0 };
            updates.push("is_fixed = ?");
            params.push(is_fixed_int.to_string());
            debug!("更新固定状态: {}", is_fixed);
        }

        if let Some(week_type) = &input.week_type {
            updates.push("week_type = ?");
            params.push(week_type.clone());
            debug!("更新单双周标记: {}", week_type);
        }

        if updates.is_empty() {
            warn!("没有需要更新的字段");
            // 查询并返回当前条目
            return sqlx::query_as::<_, ScheduleEntry>(
                r#"
                SELECT id, schedule_id, class_id, subject_id, teacher_id, day, period, is_fixed, week_type
                FROM schedule_entries
                WHERE id = ?
                "#,
            )
            .bind(id)
            .fetch_optional(self.pool)
            .await?
            .ok_or_else(|| {
                error!("课表条目不存在，ID: {}", id);
                SqlxError::RowNotFound
            });
        }

        let sql = format!(
            "UPDATE schedule_entries SET {} WHERE id = ? RETURNING id, schedule_id, class_id, subject_id, teacher_id, day, period, is_fixed, week_type",
            updates.join(", ")
        );

        let mut query = sqlx::query_as::<_, ScheduleEntry>(&sql);
        for param in params {
            query = query.bind(param);
        }
        query = query.bind(id);

        let result = query.fetch_one(self.pool).await.map_err(|e| {
            error!("更新课表条目失败: {}", e);
            e
        })?;

        info!("课表条目更新成功，ID: {}", id);
        Ok(result)
    }

    /// 删除课表条目
    ///
    /// # 参数
    /// - `id`: 课表条目 ID
    ///
    /// # 返回
    /// - `Ok(())`: 删除成功
    /// - `Err(SqlxError)`: 删除失败
    pub async fn delete_schedule_entry(&self, id: i64) -> Result<(), SqlxError> {
        info!("删除课表条目，ID: {}", id);

        let result = sqlx::query("DELETE FROM schedule_entries WHERE id = ?")
            .bind(id)
            .execute(self.pool)
            .await
            .map_err(|e| {
                error!("删除课表条目失败: {}", e);
                e
            })?;

        if result.rows_affected() == 0 {
            warn!("课表条目不存在，ID: {}", id);
            return Err(SqlxError::RowNotFound);
        }

        info!("课表条目删除成功，ID: {}", id);
        Ok(())
    }
}
