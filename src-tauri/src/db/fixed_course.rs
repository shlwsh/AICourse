// ============================================================================
// 固定课程数据访问模块
// ============================================================================
// 本模块提供固定课程相关的数据库操作接口
//
// 功能：
// - 固定课程的 CRUD 操作
// - 按班级查询固定课程
// - 按教师查询固定课程
// - 按时间槽位查询固定课程
// - 批量操作（批量创建固定课程）
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

/// 固定课程信息
#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct FixedCourse {
    /// 固定课程 ID
    pub id: i64,
    /// 班级 ID
    pub class_id: i64,
    /// 科目 ID
    pub subject_id: String,
    /// 教师 ID
    pub teacher_id: i64,
    /// 星期几（0-29，支持1-30天周期）
    pub day: i64,
    /// 第几节（0-11，支持1-12节）
    pub period: i64,
    /// 是否为预排课程（0=固定课程, 1=预排课程）
    pub is_pre_arranged: i64,
    /// 创建时间
    pub created_at: String,
}

/// 创建固定课程的输入数据
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreateFixedCourseInput {
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
    /// 是否为预排课程
    pub is_pre_arranged: bool,
}

/// 更新固定课程的输入数据
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UpdateFixedCourseInput {
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
    /// 是否为预排课程
    pub is_pre_arranged: Option<bool>,
}

/// 固定课程数据访问接口
pub struct FixedCourseRepository<'a> {
    pool: &'a SqlitePool,
}

impl<'a> FixedCourseRepository<'a> {
    /// 创建新的固定课程数据访问实例
    pub fn new(pool: &'a SqlitePool) -> Self {
        Self { pool }
    }

    /// 创建固定课程
    ///
    /// # 参数
    /// - `input`: 创建固定课程的输入数据
    ///
    /// # 返回
    /// - `Ok(FixedCourse)`: 创建成功，返回固定课程信息
    /// - `Err(SqlxError)`: 创建失败
    pub async fn create(&self, input: CreateFixedCourseInput) -> Result<FixedCourse, SqlxError> {
        info!(
            "创建固定课程: 班级 ID {}, 科目 ID {}, 教师 ID {}, 星期 {}, 节次 {}",
            input.class_id, input.subject_id, input.teacher_id, input.day, input.period
        );

        let is_pre_arranged_int = if input.is_pre_arranged { 1 } else { 0 };

        debug!(
            "是否为预排课程: {} ({})",
            input.is_pre_arranged, is_pre_arranged_int
        );

        let result = sqlx::query_as::<_, FixedCourse>(
            r#"
            INSERT INTO fixed_courses (
                class_id, subject_id, teacher_id, day, period, is_pre_arranged, created_at
            )
            VALUES (?, ?, ?, ?, ?, ?, datetime('now'))
            RETURNING id, class_id, subject_id, teacher_id, day, period, is_pre_arranged, created_at
            "#,
        )
        .bind(input.class_id)
        .bind(&input.subject_id)
        .bind(input.teacher_id)
        .bind(input.day)
        .bind(input.period)
        .bind(is_pre_arranged_int)
        .fetch_one(self.pool)
        .await
        .map_err(|e| {
            error!("创建固定课程失败: {}", e);
            e
        })?;

        info!("固定课程创建成功，ID: {}", result.id);
        Ok(result)
    }

    /// 根据 ID 查询固定课程
    ///
    /// # 参数
    /// - `id`: 固定课程 ID
    ///
    /// # 返回
    /// - `Ok(Some(FixedCourse))`: 找到固定课程
    /// - `Ok(None)`: 未找到固定课程
    /// - `Err(SqlxError)`: 查询失败
    pub async fn find_by_id(&self, id: i64) -> Result<Option<FixedCourse>, SqlxError> {
        debug!("查询固定课程，ID: {}", id);

        let result = sqlx::query_as::<_, FixedCourse>(
            r#"
            SELECT id, class_id, subject_id, teacher_id, day, period, is_pre_arranged, created_at
            FROM fixed_courses
            WHERE id = ?
            "#,
        )
        .bind(id)
        .fetch_optional(self.pool)
        .await?;

        if result.is_some() {
            debug!("找到固定课程，ID: {}", id);
        } else {
            debug!("未找到固定课程，ID: {}", id);
        }

        Ok(result)
    }

    /// 查询所有固定课程
    ///
    /// # 返回
    /// - `Ok(Vec<FixedCourse>)`: 固定课程列表
    /// - `Err(SqlxError)`: 查询失败
    pub async fn find_all(&self) -> Result<Vec<FixedCourse>, SqlxError> {
        debug!("查询所有固定课程");

        let result = sqlx::query_as::<_, FixedCourse>(
            r#"
            SELECT id, class_id, subject_id, teacher_id, day, period, is_pre_arranged, created_at
            FROM fixed_courses
            ORDER BY day, period, class_id
            "#,
        )
        .fetch_all(self.pool)
        .await?;

        info!("查询到 {} 个固定课程", result.len());
        Ok(result)
    }

    /// 根据班级 ID 查询固定课程
    ///
    /// # 参数
    /// - `class_id`: 班级 ID
    ///
    /// # 返回
    /// - `Ok(Vec<FixedCourse>)`: 固定课程列表
    /// - `Err(SqlxError)`: 查询失败
    pub async fn find_by_class(&self, class_id: i64) -> Result<Vec<FixedCourse>, SqlxError> {
        debug!("查询班级的固定课程，班级 ID: {}", class_id);

        let result = sqlx::query_as::<_, FixedCourse>(
            r#"
            SELECT id, class_id, subject_id, teacher_id, day, period, is_pre_arranged, created_at
            FROM fixed_courses
            WHERE class_id = ?
            ORDER BY day, period
            "#,
        )
        .bind(class_id)
        .fetch_all(self.pool)
        .await?;

        info!("班级 {} 有 {} 个固定课程", class_id, result.len());
        Ok(result)
    }

    /// 根据教师 ID 查询固定课程
    ///
    /// # 参数
    /// - `teacher_id`: 教师 ID
    ///
    /// # 返回
    /// - `Ok(Vec<FixedCourse>)`: 固定课程列表
    /// - `Err(SqlxError)`: 查询失败
    pub async fn find_by_teacher(&self, teacher_id: i64) -> Result<Vec<FixedCourse>, SqlxError> {
        debug!("查询教师的固定课程，教师 ID: {}", teacher_id);

        let result = sqlx::query_as::<_, FixedCourse>(
            r#"
            SELECT id, class_id, subject_id, teacher_id, day, period, is_pre_arranged, created_at
            FROM fixed_courses
            WHERE teacher_id = ?
            ORDER BY day, period
            "#,
        )
        .bind(teacher_id)
        .fetch_all(self.pool)
        .await?;

        info!("教师 {} 有 {} 个固定课程", teacher_id, result.len());
        Ok(result)
    }

    /// 根据时间槽位查询固定课程
    ///
    /// # 参数
    /// - `day`: 星期几（0-29）
    /// - `period`: 第几节（0-11）
    ///
    /// # 返回
    /// - `Ok(Vec<FixedCourse>)`: 固定课程列表
    /// - `Err(SqlxError)`: 查询失败
    pub async fn find_by_time_slot(
        &self,
        day: i64,
        period: i64,
    ) -> Result<Vec<FixedCourse>, SqlxError> {
        debug!("查询时间槽位的固定课程，星期: {}, 节次: {}", day, period);

        let result = sqlx::query_as::<_, FixedCourse>(
            r#"
            SELECT id, class_id, subject_id, teacher_id, day, period, is_pre_arranged, created_at
            FROM fixed_courses
            WHERE day = ? AND period = ?
            ORDER BY class_id
            "#,
        )
        .bind(day)
        .bind(period)
        .fetch_all(self.pool)
        .await?;

        info!(
            "时间槽位（星期 {}, 节次 {}）有 {} 个固定课程",
            day,
            period,
            result.len()
        );
        Ok(result)
    }

    /// 更新固定课程信息
    ///
    /// # 参数
    /// - `id`: 固定课程 ID
    /// - `input`: 更新固定课程的输入数据
    ///
    /// # 返回
    /// - `Ok(FixedCourse)`: 更新成功，返回更新后的固定课程信息
    /// - `Err(SqlxError)`: 更新失败
    pub async fn update(
        &self,
        id: i64,
        input: UpdateFixedCourseInput,
    ) -> Result<FixedCourse, SqlxError> {
        info!("更新固定课程信息，ID: {}", id);

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

        if let Some(is_pre_arranged) = input.is_pre_arranged {
            updates.push("is_pre_arranged = ?");
            let value = if is_pre_arranged { 1 } else { 0 };
            params.push(value.to_string());
            debug!("更新是否为预排课程: {}", is_pre_arranged);
        }

        if updates.is_empty() {
            warn!("没有需要更新的字段");
            return self.find_by_id(id).await?.ok_or_else(|| {
                error!("固定课程不存在，ID: {}", id);
                SqlxError::RowNotFound
            });
        }

        let sql = format!(
            "UPDATE fixed_courses SET {} WHERE id = ? RETURNING id, class_id, subject_id, teacher_id, day, period, is_pre_arranged, created_at",
            updates.join(", ")
        );

        let mut query = sqlx::query_as::<_, FixedCourse>(&sql);
        for param in params {
            query = query.bind(param);
        }
        query = query.bind(id);

        let result = query.fetch_one(self.pool).await.map_err(|e| {
            error!("更新固定课程失败: {}", e);
            e
        })?;

        info!("固定课程信息更新成功，ID: {}", id);
        Ok(result)
    }

    /// 删除固定课程
    ///
    /// # 参数
    /// - `id`: 固定课程 ID
    ///
    /// # 返回
    /// - `Ok(())`: 删除成功
    /// - `Err(SqlxError)`: 删除失败
    pub async fn delete(&self, id: i64) -> Result<(), SqlxError> {
        info!("删除固定课程，ID: {}", id);

        let result = sqlx::query("DELETE FROM fixed_courses WHERE id = ?")
            .bind(id)
            .execute(self.pool)
            .await
            .map_err(|e| {
                error!("删除固定课程失败: {}", e);
                e
            })?;

        if result.rows_affected() == 0 {
            warn!("固定课程不存在，ID: {}", id);
            return Err(SqlxError::RowNotFound);
        }

        info!("固定课程删除成功，ID: {}", id);
        Ok(())
    }

    /// 批量创建固定课程
    ///
    /// 使用事务确保所有固定课程都成功创建或全部回滚
    ///
    /// # 参数
    /// - `inputs`: 固定课程输入数据列表
    ///
    /// # 返回
    /// - `Ok(usize)`: 创建成功的数量
    /// - `Err(SqlxError)`: 创建失败
    pub async fn batch_create(
        &self,
        inputs: Vec<CreateFixedCourseInput>,
    ) -> Result<usize, SqlxError> {
        info!("批量创建固定课程，数量: {}", inputs.len());

        if inputs.is_empty() {
            warn!("没有需要创建的固定课程");
            return Ok(0);
        }

        // 开始事务
        let mut tx = self.pool.begin().await.map_err(|e| {
            error!("开始事务失败: {}", e);
            e
        })?;

        let mut created_count = 0;

        for input in inputs {
            debug!(
                "创建固定课程: 班级 ID {}, 科目 ID {}, 教师 ID {}, 星期 {}, 节次 {}",
                input.class_id, input.subject_id, input.teacher_id, input.day, input.period
            );

            let is_pre_arranged_int = if input.is_pre_arranged { 1 } else { 0 };

            sqlx::query(
                r#"
                INSERT INTO fixed_courses (
                    class_id, subject_id, teacher_id, day, period, is_pre_arranged, created_at
                )
                VALUES (?, ?, ?, ?, ?, ?, datetime('now'))
                "#,
            )
            .bind(input.class_id)
            .bind(&input.subject_id)
            .bind(input.teacher_id)
            .bind(input.day)
            .bind(input.period)
            .bind(is_pre_arranged_int)
            .execute(&mut *tx)
            .await
            .map_err(|e| {
                error!(
                    "批量创建固定课程失败，班级 ID: {}, 科目 ID: {}",
                    input.class_id, input.subject_id
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

        info!("批量创建固定课程成功，数量: {}", created_count);
        Ok(created_count)
    }
}
