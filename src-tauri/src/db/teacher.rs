// ============================================================================
// 教师数据访问模块
// ============================================================================
// 本模块提供教师相关的数据库操作接口
//
// 功能：
// - 教师的 CRUD 操作
// - 教师偏好的保存和查询
// - 批量操作（批量保存教师偏好）
// - 教师状态查询（查询指定时段的教师状态）
// - 教学工作量统计
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

/// 教师信息
#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct Teacher {
    /// 教师 ID
    pub id: i64,
    /// 教师姓名
    pub name: String,
    /// 教研组 ID
    pub teaching_group_id: Option<i64>,
    /// 创建时间
    pub created_at: String,
    /// 更新时间
    pub updated_at: String,
}

/// 创建教师的输入数据
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreateTeacherInput {
    /// 教师姓名
    pub name: String,
    /// 教研组 ID
    pub teaching_group_id: Option<i64>,
}

/// 更新教师的输入数据
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UpdateTeacherInput {
    /// 教师姓名
    pub name: Option<String>,
    /// 教研组 ID
    pub teaching_group_id: Option<i64>,
}

/// 教师偏好配置
#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct TeacherPreference {
    /// 教师 ID
    pub teacher_id: i64,
    /// 偏好时段掩码（JSON 格式的 u64）
    pub preferred_slots: String,
    /// 早晚偏好：0=无偏好, 1=厌恶早课, 2=厌恶晚课
    pub time_bias: i64,
    /// 权重系数
    pub weight: i64,
    /// 不排课时段掩码（JSON 格式的 u64）
    pub blocked_slots: String,
    /// 创建时间
    pub created_at: String,
    /// 更新时间
    pub updated_at: String,
}

/// 创建/更新教师偏好的输入数据
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SaveTeacherPreferenceInput {
    /// 教师 ID
    pub teacher_id: i64,
    /// 偏好时段掩码（u64）
    pub preferred_slots: u64,
    /// 早晚偏好：0=无偏好, 1=厌恶早课, 2=厌恶晚课
    pub time_bias: i64,
    /// 权重系数
    pub weight: i64,
    /// 不排课时段掩码（u64）
    pub blocked_slots: u64,
}

/// 教师状态（在指定时段）
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TeacherStatus {
    /// 教师 ID
    pub teacher_id: i64,
    /// 教师姓名
    pub teacher_name: String,
    /// 是否在上课
    pub is_busy: bool,
    /// 如果在上课，所在的班级 ID
    pub class_id: Option<i64>,
    /// 如果在上课，授课科目 ID
    pub subject_id: Option<String>,
}

/// 教学工作量统计
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WorkloadStatistics {
    /// 教师 ID
    pub teacher_id: i64,
    /// 教师姓名
    pub teacher_name: String,
    /// 总课时数
    pub total_sessions: i64,
    /// 授课班级数量
    pub class_count: i64,
    /// 授课科目列表
    pub subjects: Vec<String>,
    /// 早课节数（第1节）
    pub early_sessions: i64,
    /// 晚课节数（最后一节）
    pub late_sessions: i64,
}

/// 教师数据访问接口
pub struct TeacherRepository<'a> {
    pool: &'a SqlitePool,
}

impl<'a> TeacherRepository<'a> {
    /// 创建新的教师数据访问实例
    pub fn new(pool: &'a SqlitePool) -> Self {
        Self { pool }
    }

    /// 创建教师
    ///
    /// # 参数
    /// - `input`: 创建教师的输入数据
    ///
    /// # 返回
    /// - `Ok(Teacher)`: 创建成功，返回教师信息
    /// - `Err(SqlxError)`: 创建失败
    pub async fn create(&self, input: CreateTeacherInput) -> Result<Teacher, SqlxError> {
        info!("创建教师: {}", input.name);

        let result = sqlx::query_as::<_, Teacher>(
            r#"
            INSERT INTO teachers (name, teaching_group_id, created_at, updated_at)
            VALUES (?, ?, datetime('now'), datetime('now'))
            RETURNING id, name, teaching_group_id, created_at, updated_at
            "#,
        )
        .bind(&input.name)
        .bind(input.teaching_group_id)
        .fetch_one(self.pool)
        .await
        .map_err(|e| {
            error!("创建教师失败: {}", e);
            e
        })?;

        info!("教师创建成功，ID: {}", result.id);
        Ok(result)
    }

    /// 根据 ID 查询教师
    ///
    /// # 参数
    /// - `id`: 教师 ID
    ///
    /// # 返回
    /// - `Ok(Some(Teacher))`: 找到教师
    /// - `Ok(None)`: 未找到教师
    /// - `Err(SqlxError)`: 查询失败
    pub async fn find_by_id(&self, id: i64) -> Result<Option<Teacher>, SqlxError> {
        debug!("查询教师，ID: {}", id);

        let result = sqlx::query_as::<_, Teacher>(
            r#"
            SELECT id, name, teaching_group_id, created_at, updated_at
            FROM teachers
            WHERE id = ?
            "#,
        )
        .bind(id)
        .fetch_optional(self.pool)
        .await?;

        if result.is_some() {
            debug!("找到教师，ID: {}", id);
        } else {
            debug!("未找到教师，ID: {}", id);
        }

        Ok(result)
    }

    /// 查询所有教师
    ///
    /// # 返回
    /// - `Ok(Vec<Teacher>)`: 教师列表
    /// - `Err(SqlxError)`: 查询失败
    pub async fn find_all(&self) -> Result<Vec<Teacher>, SqlxError> {
        debug!("查询所有教师");

        let result = sqlx::query_as::<_, Teacher>(
            r#"
            SELECT id, name, teaching_group_id, created_at, updated_at
            FROM teachers
            ORDER BY id
            "#,
        )
        .fetch_all(self.pool)
        .await?;

        info!("查询到 {} 位教师", result.len());
        Ok(result)
    }

    /// 根据教研组查询教师
    ///
    /// # 参数
    /// - `teaching_group_id`: 教研组 ID
    ///
    /// # 返回
    /// - `Ok(Vec<Teacher>)`: 教师列表
    /// - `Err(SqlxError)`: 查询失败
    pub async fn find_by_teaching_group(
        &self,
        teaching_group_id: i64,
    ) -> Result<Vec<Teacher>, SqlxError> {
        debug!("查询教研组的教师，教研组 ID: {}", teaching_group_id);

        let result = sqlx::query_as::<_, Teacher>(
            r#"
            SELECT id, name, teaching_group_id, created_at, updated_at
            FROM teachers
            WHERE teaching_group_id = ?
            ORDER BY id
            "#,
        )
        .bind(teaching_group_id)
        .fetch_all(self.pool)
        .await?;

        info!("教研组 {} 有 {} 位教师", teaching_group_id, result.len());
        Ok(result)
    }

    /// 更新教师信息
    ///
    /// # 参数
    /// - `id`: 教师 ID
    /// - `input`: 更新教师的输入数据
    ///
    /// # 返回
    /// - `Ok(Teacher)`: 更新成功，返回更新后的教师信息
    /// - `Err(SqlxError)`: 更新失败
    pub async fn update(&self, id: i64, input: UpdateTeacherInput) -> Result<Teacher, SqlxError> {
        info!("更新教师信息，ID: {}", id);

        // 构建动态更新语句
        let mut updates = Vec::new();
        let mut params: Vec<String> = Vec::new();

        if let Some(name) = &input.name {
            updates.push("name = ?");
            params.push(name.clone());
            debug!("更新教师姓名: {}", name);
        }

        if let Some(teaching_group_id) = input.teaching_group_id {
            updates.push("teaching_group_id = ?");
            params.push(teaching_group_id.to_string());
            debug!("更新教研组 ID: {}", teaching_group_id);
        }

        if updates.is_empty() {
            warn!("没有需要更新的字段");
            return self.find_by_id(id).await?.ok_or_else(|| {
                error!("教师不存在，ID: {}", id);
                SqlxError::RowNotFound
            });
        }

        updates.push("updated_at = datetime('now')");

        let sql = format!(
            "UPDATE teachers SET {} WHERE id = ? RETURNING id, name, teaching_group_id, created_at, updated_at",
            updates.join(", ")
        );

        let mut query = sqlx::query_as::<_, Teacher>(&sql);
        for param in params {
            query = query.bind(param);
        }
        query = query.bind(id);

        let result = query.fetch_one(self.pool).await.map_err(|e| {
            error!("更新教师失败: {}", e);
            e
        })?;

        info!("教师信息更新成功，ID: {}", id);
        Ok(result)
    }

    /// 删除教师
    ///
    /// # 参数
    /// - `id`: 教师 ID
    ///
    /// # 返回
    /// - `Ok(())`: 删除成功
    /// - `Err(SqlxError)`: 删除失败
    pub async fn delete(&self, id: i64) -> Result<(), SqlxError> {
        info!("删除教师，ID: {}", id);

        let result = sqlx::query("DELETE FROM teachers WHERE id = ?")
            .bind(id)
            .execute(self.pool)
            .await
            .map_err(|e| {
                error!("删除教师失败: {}", e);
                e
            })?;

        if result.rows_affected() == 0 {
            warn!("教师不存在，ID: {}", id);
            return Err(SqlxError::RowNotFound);
        }

        info!("教师删除成功，ID: {}", id);
        Ok(())
    }

    /// 保存教师偏好（创建或更新）
    ///
    /// # 参数
    /// - `input`: 教师偏好输入数据
    ///
    /// # 返回
    /// - `Ok(TeacherPreference)`: 保存成功，返回教师偏好信息
    /// - `Err(SqlxError)`: 保存失败
    pub async fn save_preference(
        &self,
        input: SaveTeacherPreferenceInput,
    ) -> Result<TeacherPreference, SqlxError> {
        info!("保存教师偏好，教师 ID: {}", input.teacher_id);

        // 验证教师是否存在
        if self.find_by_id(input.teacher_id).await?.is_none() {
            error!("教师不存在，ID: {}", input.teacher_id);
            return Err(SqlxError::RowNotFound);
        }

        // 将 u64 转换为 JSON 字符串
        let preferred_slots_json = input.preferred_slots.to_string();
        let blocked_slots_json = input.blocked_slots.to_string();

        debug!(
            "偏好时段掩码: {}, 不排课时段掩码: {}",
            preferred_slots_json, blocked_slots_json
        );

        let result = sqlx::query_as::<_, TeacherPreference>(
            r#"
            INSERT INTO teacher_preferences (
                teacher_id, preferred_slots, time_bias, weight, blocked_slots,
                created_at, updated_at
            )
            VALUES (?, ?, ?, ?, ?, datetime('now'), datetime('now'))
            ON CONFLICT(teacher_id) DO UPDATE SET
                preferred_slots = excluded.preferred_slots,
                time_bias = excluded.time_bias,
                weight = excluded.weight,
                blocked_slots = excluded.blocked_slots,
                updated_at = datetime('now')
            RETURNING teacher_id, preferred_slots, time_bias, weight, blocked_slots,
                      created_at, updated_at
            "#,
        )
        .bind(input.teacher_id)
        .bind(&preferred_slots_json)
        .bind(input.time_bias)
        .bind(input.weight)
        .bind(&blocked_slots_json)
        .fetch_one(self.pool)
        .await
        .map_err(|e| {
            error!("保存教师偏好失败: {}", e);
            e
        })?;

        info!("教师偏好保存成功，教师 ID: {}", input.teacher_id);
        Ok(result)
    }

    /// 查询教师偏好
    ///
    /// # 参数
    /// - `teacher_id`: 教师 ID
    ///
    /// # 返回
    /// - `Ok(Some(TeacherPreference))`: 找到教师偏好
    /// - `Ok(None)`: 未找到教师偏好
    /// - `Err(SqlxError)`: 查询失败
    pub async fn find_preference(
        &self,
        teacher_id: i64,
    ) -> Result<Option<TeacherPreference>, SqlxError> {
        debug!("查询教师偏好，教师 ID: {}", teacher_id);

        let result = sqlx::query_as::<_, TeacherPreference>(
            r#"
            SELECT teacher_id, preferred_slots, time_bias, weight, blocked_slots,
                   created_at, updated_at
            FROM teacher_preferences
            WHERE teacher_id = ?
            "#,
        )
        .bind(teacher_id)
        .fetch_optional(self.pool)
        .await?;

        if result.is_some() {
            debug!("找到教师偏好，教师 ID: {}", teacher_id);
        } else {
            debug!("未找到教师偏好，教师 ID: {}", teacher_id);
        }

        Ok(result)
    }

    /// 批量保存教师偏好
    ///
    /// 使用事务确保所有偏好都成功保存或全部回滚
    ///
    /// # 参数
    /// - `inputs`: 教师偏好输入数据列表
    ///
    /// # 返回
    /// - `Ok(usize)`: 保存成功的数量
    /// - `Err(SqlxError)`: 保存失败
    pub async fn batch_save_preferences(
        &self,
        inputs: Vec<SaveTeacherPreferenceInput>,
    ) -> Result<usize, SqlxError> {
        info!("批量保存教师偏好，数量: {}", inputs.len());

        if inputs.is_empty() {
            warn!("没有需要保存的教师偏好");
            return Ok(0);
        }

        // 开始事务
        let mut tx = self.pool.begin().await.map_err(|e| {
            error!("开始事务失败: {}", e);
            e
        })?;

        let mut saved_count = 0;

        for input in inputs {
            debug!("保存教师偏好，教师 ID: {}", input.teacher_id);

            // 将 u64 转换为 JSON 字符串
            let preferred_slots_json = input.preferred_slots.to_string();
            let blocked_slots_json = input.blocked_slots.to_string();

            sqlx::query(
                r#"
                INSERT INTO teacher_preferences (
                    teacher_id, preferred_slots, time_bias, weight, blocked_slots,
                    created_at, updated_at
                )
                VALUES (?, ?, ?, ?, ?, datetime('now'), datetime('now'))
                ON CONFLICT(teacher_id) DO UPDATE SET
                    preferred_slots = excluded.preferred_slots,
                    time_bias = excluded.time_bias,
                    weight = excluded.weight,
                    blocked_slots = excluded.blocked_slots,
                    updated_at = datetime('now')
                "#,
            )
            .bind(input.teacher_id)
            .bind(&preferred_slots_json)
            .bind(input.time_bias)
            .bind(input.weight)
            .bind(&blocked_slots_json)
            .execute(&mut *tx)
            .await
            .map_err(|e| {
                error!("批量保存教师偏好失败，教师 ID: {}", input.teacher_id);
                e
            })?;

            saved_count += 1;
        }

        // 提交事务
        tx.commit().await.map_err(|e| {
            error!("提交事务失败: {}", e);
            e
        })?;

        info!("批量保存教师偏好成功，数量: {}", saved_count);
        Ok(saved_count)
    }

    /// 查询指定时段的教师状态
    ///
    /// # 参数
    /// - `schedule_id`: 课表 ID
    /// - `day`: 星期（0-29）
    /// - `period`: 节次（0-11）
    ///
    /// # 返回
    /// - `Ok(Vec<TeacherStatus>)`: 教师状态列表
    /// - `Err(SqlxError)`: 查询失败
    pub async fn query_teacher_status(
        &self,
        schedule_id: i64,
        day: i64,
        period: i64,
    ) -> Result<Vec<TeacherStatus>, SqlxError> {
        info!(
            "查询教师状态，课表 ID: {}, 星期: {}, 节次: {}",
            schedule_id, day, period
        );

        let result = sqlx::query_as::<_, (i64, String, Option<i64>, Option<String>)>(
            r#"
            SELECT
                t.id as teacher_id,
                t.name as teacher_name,
                se.class_id,
                se.subject_id
            FROM teachers t
            LEFT JOIN schedule_entries se ON t.id = se.teacher_id
                AND se.schedule_id = ?
                AND se.day = ?
                AND se.period = ?
            ORDER BY t.id
            "#,
        )
        .bind(schedule_id)
        .bind(day)
        .bind(period)
        .fetch_all(self.pool)
        .await?;

        let statuses: Vec<TeacherStatus> = result
            .into_iter()
            .map(|(teacher_id, teacher_name, class_id, subject_id)| {
                let is_busy = class_id.is_some();
                TeacherStatus {
                    teacher_id,
                    teacher_name,
                    is_busy,
                    class_id,
                    subject_id,
                }
            })
            .collect();

        let busy_count = statuses.iter().filter(|s| s.is_busy).count();
        let free_count = statuses.len() - busy_count;

        info!(
            "查询到 {} 位教师，其中 {} 位在上课，{} 位空闲",
            statuses.len(),
            busy_count,
            free_count
        );

        Ok(statuses)
    }

    /// 统计教学工作量
    ///
    /// # 参数
    /// - `schedule_id`: 课表 ID
    /// - `periods_per_day`: 每天节次数（用于判断早课和晚课）
    ///
    /// # 返回
    /// - `Ok(Vec<WorkloadStatistics>)`: 工作量统计列表
    /// - `Err(SqlxError)`: 查询失败
    pub async fn calculate_workload_statistics(
        &self,
        schedule_id: i64,
        periods_per_day: i64,
    ) -> Result<Vec<WorkloadStatistics>, SqlxError> {
        info!("统计教学工作量，课表 ID: {}", schedule_id);

        // 查询所有教师的基本信息
        let teachers = self.find_all().await?;

        let mut statistics = Vec::new();

        for teacher in teachers {
            debug!("统计教师工作量，教师 ID: {}", teacher.id);

            // 查询总课时数
            let total_sessions: (i64,) = sqlx::query_as(
                r#"
                SELECT COUNT(*) as count
                FROM schedule_entries
                WHERE schedule_id = ? AND teacher_id = ?
                "#,
            )
            .bind(schedule_id)
            .bind(teacher.id)
            .fetch_one(self.pool)
            .await?;

            // 查询授课班级数量
            let class_count: (i64,) = sqlx::query_as(
                r#"
                SELECT COUNT(DISTINCT class_id) as count
                FROM schedule_entries
                WHERE schedule_id = ? AND teacher_id = ?
                "#,
            )
            .bind(schedule_id)
            .bind(teacher.id)
            .fetch_one(self.pool)
            .await?;

            // 查询授课科目列表
            let subjects: Vec<(String,)> = sqlx::query_as(
                r#"
                SELECT DISTINCT subject_id
                FROM schedule_entries
                WHERE schedule_id = ? AND teacher_id = ?
                ORDER BY subject_id
                "#,
            )
            .bind(schedule_id)
            .bind(teacher.id)
            .fetch_all(self.pool)
            .await?;

            // 查询早课节数（第1节，period = 0）
            let early_sessions: (i64,) = sqlx::query_as(
                r#"
                SELECT COUNT(*) as count
                FROM schedule_entries
                WHERE schedule_id = ? AND teacher_id = ? AND period = 0
                "#,
            )
            .bind(schedule_id)
            .bind(teacher.id)
            .fetch_one(self.pool)
            .await?;

            // 查询晚课节数（最后一节）
            let late_period = periods_per_day - 1;
            let late_sessions: (i64,) = sqlx::query_as(
                r#"
                SELECT COUNT(*) as count
                FROM schedule_entries
                WHERE schedule_id = ? AND teacher_id = ? AND period = ?
                "#,
            )
            .bind(schedule_id)
            .bind(teacher.id)
            .bind(late_period)
            .fetch_one(self.pool)
            .await?;

            let stat = WorkloadStatistics {
                teacher_id: teacher.id,
                teacher_name: teacher.name.clone(),
                total_sessions: total_sessions.0,
                class_count: class_count.0,
                subjects: subjects.into_iter().map(|s| s.0).collect(),
                early_sessions: early_sessions.0,
                late_sessions: late_sessions.0,
            };

            debug!(
                "教师 {} 工作量：总课时 {}, 班级数 {}, 早课 {}, 晚课 {}",
                teacher.name,
                stat.total_sessions,
                stat.class_count,
                stat.early_sessions,
                stat.late_sessions
            );

            statistics.push(stat);
        }

        info!("工作量统计完成，共 {} 位教师", statistics.len());
        Ok(statistics)
    }
}
