// ============================================================================
// 教学计划数据访问模块
// ============================================================================
// 本模块提供教学计划相关的数据库操作接口
//
// 功能：
// - 教学计划的 CRUD 操作
// - 根据班级ID查询教学计划
// - 根据教师ID查询教学计划
// - 批量创建教学计划（使用事务）
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

/// 教学计划结构体
#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct Curriculum {
    /// 教学计划 ID
    pub id: i64,
    /// 班级 ID
    pub class_id: i64,
    /// 科目 ID
    pub subject_id: String,
    /// 教师 ID
    pub teacher_id: i64,
    /// 目标课时数
    pub target_sessions: i64,
    /// 是否合班课（SQLite 使用 INTEGER 表示布尔值）
    pub is_combined_class: i64,
    /// 合班班级列表（JSON 字符串）
    pub combined_class_ids: String,
    /// 单双周标记：'Every', 'Odd', 'Even'
    pub week_type: String,
}

/// 获取所有教学计划
///
/// # 参数
/// - `pool`: 数据库连接池
///
/// # 返回
/// - `Ok(Vec<Curriculum>)`: 所有教学计划列表
/// - `Err(SqlxError)`: 数据库错误
pub async fn get_all_curriculums(pool: &SqlitePool) -> Result<Vec<Curriculum>, SqlxError> {
    debug!("开始查询所有教学计划");

    let curriculums = sqlx::query_as::<_, Curriculum>(
        "SELECT id, class_id, subject_id, teacher_id, target_sessions,
                is_combined_class, combined_class_ids, week_type
         FROM class_curriculums
         ORDER BY class_id, subject_id",
    )
    .fetch_all(pool)
    .await?;

    info!("查询到 {} 条教学计划记录", curriculums.len());
    Ok(curriculums)
}

/// 根据ID获取教学计划
///
/// # 参数
/// - `pool`: 数据库连接池
/// - `id`: 教学计划ID
///
/// # 返回
/// - `Ok(Some(Curriculum))`: 找到教学计划
/// - `Ok(None)`: 未找到教学计划
/// - `Err(SqlxError)`: 数据库错误
pub async fn get_curriculum_by_id(
    pool: &SqlitePool,
    id: i64,
) -> Result<Option<Curriculum>, SqlxError> {
    debug!("查询教学计划，ID: {}", id);

    let curriculum = sqlx::query_as::<_, Curriculum>(
        "SELECT id, class_id, subject_id, teacher_id, target_sessions,
                is_combined_class, combined_class_ids, week_type
         FROM class_curriculums
         WHERE id = ?",
    )
    .bind(id)
    .fetch_optional(pool)
    .await?;

    match &curriculum {
        Some(_) => info!("找到教学计划，ID: {}", id),
        None => warn!("未找到教学计划，ID: {}", id),
    }

    Ok(curriculum)
}

/// 根据班级ID获取教学计划
///
/// # 参数
/// - `pool`: 数据库连接池
/// - `class_id`: 班级ID
///
/// # 返回
/// - `Ok(Vec<Curriculum>)`: 该班级的所有教学计划
/// - `Err(SqlxError)`: 数据库错误
pub async fn get_curriculums_by_class(
    pool: &SqlitePool,
    class_id: i64,
) -> Result<Vec<Curriculum>, SqlxError> {
    debug!("查询班级的教学计划，班级ID: {}", class_id);

    let curriculums = sqlx::query_as::<_, Curriculum>(
        "SELECT id, class_id, subject_id, teacher_id, target_sessions,
                is_combined_class, combined_class_ids, week_type
         FROM class_curriculums
         WHERE class_id = ?
         ORDER BY subject_id",
    )
    .bind(class_id)
    .fetch_all(pool)
    .await?;

    info!("班级 {} 有 {} 条教学计划", class_id, curriculums.len());
    Ok(curriculums)
}

/// 根据教师ID获取教学计划
///
/// # 参数
/// - `pool`: 数据库连接池
/// - `teacher_id`: 教师ID
///
/// # 返回
/// - `Ok(Vec<Curriculum>)`: 该教师的所有教学计划
/// - `Err(SqlxError)`: 数据库错误
pub async fn get_curriculums_by_teacher(
    pool: &SqlitePool,
    teacher_id: i64,
) -> Result<Vec<Curriculum>, SqlxError> {
    debug!("查询教师的教学计划，教师ID: {}", teacher_id);

    let curriculums = sqlx::query_as::<_, Curriculum>(
        "SELECT id, class_id, subject_id, teacher_id, target_sessions,
                is_combined_class, combined_class_ids, week_type
         FROM class_curriculums
         WHERE teacher_id = ?
         ORDER BY class_id, subject_id",
    )
    .bind(teacher_id)
    .fetch_all(pool)
    .await?;

    info!("教师 {} 有 {} 条教学计划", teacher_id, curriculums.len());
    Ok(curriculums)
}

/// 创建教学计划
///
/// # 参数
/// - `pool`: 数据库连接池
/// - `class_id`: 班级ID
/// - `subject_id`: 科目ID
/// - `teacher_id`: 教师ID
/// - `target_sessions`: 目标课时数
/// - `is_combined_class`: 是否合班课
/// - `combined_class_ids`: 合班班级ID列表
/// - `week_type`: 单双周标记
///
/// # 返回
/// - `Ok(i64)`: 新创建的教学计划ID
/// - `Err(SqlxError)`: 数据库错误
pub async fn create_curriculum(
    pool: &SqlitePool,
    class_id: i64,
    subject_id: &str,
    teacher_id: i64,
    target_sessions: i64,
    is_combined_class: bool,
    combined_class_ids: &[i64],
    week_type: &str,
) -> Result<i64, SqlxError> {
    info!(
        "创建教学计划：班级ID={}, 科目ID={}, 教师ID={}",
        class_id, subject_id, teacher_id
    );

    let combined_class_ids_json = serde_json::to_string(combined_class_ids).map_err(|e| {
        error!("序列化合班班级列表失败: {}", e);
        SqlxError::Decode(Box::new(e))
    })?;

    let result = sqlx::query(
        "INSERT INTO class_curriculums
         (class_id, subject_id, teacher_id, target_sessions, is_combined_class,
          combined_class_ids, week_type, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))",
    )
    .bind(class_id)
    .bind(subject_id)
    .bind(teacher_id)
    .bind(target_sessions)
    .bind(if is_combined_class { 1 } else { 0 })
    .bind(combined_class_ids_json)
    .bind(week_type)
    .execute(pool)
    .await?;

    let id = result.last_insert_rowid();
    info!("教学计划创建成功，ID: {}", id);
    Ok(id)
}

/// 更新教学计划
///
/// # 参数
/// - `pool`: 数据库连接池
/// - `id`: 教学计划ID
/// - `class_id`: 班级ID
/// - `subject_id`: 科目ID
/// - `teacher_id`: 教师ID
/// - `target_sessions`: 目标课时数
/// - `is_combined_class`: 是否合班课
/// - `combined_class_ids`: 合班班级ID列表
/// - `week_type`: 单双周标记
///
/// # 返回
/// - `Ok(())`: 更新成功
/// - `Err(SqlxError)`: 数据库错误或记录不存在
pub async fn update_curriculum(
    pool: &SqlitePool,
    id: i64,
    class_id: i64,
    subject_id: &str,
    teacher_id: i64,
    target_sessions: i64,
    is_combined_class: bool,
    combined_class_ids: &[i64],
    week_type: &str,
) -> Result<(), SqlxError> {
    info!("更新教学计划，ID: {}", id);

    let combined_class_ids_json = serde_json::to_string(combined_class_ids).map_err(|e| {
        error!("序列化合班班级列表失败: {}", e);
        SqlxError::Decode(Box::new(e))
    })?;

    let result = sqlx::query(
        "UPDATE class_curriculums
         SET class_id = ?, subject_id = ?, teacher_id = ?, target_sessions = ?,
             is_combined_class = ?, combined_class_ids = ?, week_type = ?,
             updated_at = datetime('now')
         WHERE id = ?",
    )
    .bind(class_id)
    .bind(subject_id)
    .bind(teacher_id)
    .bind(target_sessions)
    .bind(if is_combined_class { 1 } else { 0 })
    .bind(combined_class_ids_json)
    .bind(week_type)
    .bind(id)
    .execute(pool)
    .await?;

    if result.rows_affected() > 0 {
        info!("教学计划更新成功，ID: {}", id);
        Ok(())
    } else {
        warn!("教学计划不存在，ID: {}", id);
        Err(SqlxError::RowNotFound)
    }
}

/// 删除教学计划
///
/// # 参数
/// - `pool`: 数据库连接池
/// - `id`: 教学计划ID
///
/// # 返回
/// - `Ok(())`: 删除成功
/// - `Err(SqlxError)`: 数据库错误或记录不存在
pub async fn delete_curriculum(pool: &SqlitePool, id: i64) -> Result<(), SqlxError> {
    info!("删除教学计划，ID: {}", id);

    let result = sqlx::query("DELETE FROM class_curriculums WHERE id = ?")
        .bind(id)
        .execute(pool)
        .await?;

    if result.rows_affected() > 0 {
        info!("教学计划删除成功，ID: {}", id);
        Ok(())
    } else {
        warn!("教学计划不存在，ID: {}", id);
        Err(SqlxError::RowNotFound)
    }
}

/// 批量创建教学计划（使用事务）
///
/// # 参数
/// - `pool`: 数据库连接池
/// - `curriculums`: 教学计划数据元组列表
///   格式：(class_id, subject_id, teacher_id, target_sessions, is_combined_class, combined_class_ids, week_type)
///
/// # 返回
/// - `Ok(Vec<i64>)`: 新创建的教学计划ID列表
/// - `Err(SqlxError)`: 数据库错误（事务会自动回滚）
pub async fn batch_create_curriculums(
    pool: &SqlitePool,
    curriculums: &[(i64, String, i64, i64, bool, Vec<i64>, String)],
) -> Result<Vec<i64>, SqlxError> {
    info!("批量创建 {} 条教学计划", curriculums.len());

    let mut tx = pool.begin().await?;
    let mut ids = Vec::new();

    for (
        class_id,
        subject_id,
        teacher_id,
        target_sessions,
        is_combined_class,
        combined_class_ids,
        week_type,
    ) in curriculums
    {
        debug!(
            "批量创建：班级ID={}, 科目ID={}, 教师ID={}",
            class_id, subject_id, teacher_id
        );

        let combined_class_ids_json = serde_json::to_string(combined_class_ids).map_err(|e| {
            error!("序列化合班班级列表失败: {}", e);
            SqlxError::Decode(Box::new(e))
        })?;

        let result = sqlx::query(
            "INSERT INTO class_curriculums
             (class_id, subject_id, teacher_id, target_sessions, is_combined_class,
              combined_class_ids, week_type, created_at, updated_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))",
        )
        .bind(class_id)
        .bind(subject_id)
        .bind(teacher_id)
        .bind(target_sessions)
        .bind(if *is_combined_class { 1 } else { 0 })
        .bind(combined_class_ids_json)
        .bind(week_type)
        .execute(&mut *tx)
        .await?;

        let id = result.last_insert_rowid();
        ids.push(id);
    }

    tx.commit().await?;
    info!("批量创建教学计划成功，共 {} 条", ids.len());
    Ok(ids)
}
