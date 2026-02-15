#[cfg(test)]
mod tests {
    use crate::db::curriculum::*;
    use crate::db::DatabaseManager;

    /// 创建测试数据库
    async fn setup_test_db() -> DatabaseManager {
        let db = DatabaseManager::new("sqlite::memory:", "migrations")
            .await
            .expect("创建测试数据库失败");

        let pool = db.pool();

        // 插入测试数据：教师
        sqlx::query("INSERT INTO teachers (id, name, created_at, updated_at) VALUES (?, ?, datetime('now'), datetime('now'))")
            .bind(1)
            .bind("张老师")
            .execute(pool)
            .await
            .expect("插入教师失败");

        sqlx::query("INSERT INTO teachers (id, name, created_at, updated_at) VALUES (?, ?, datetime('now'), datetime('now'))")
            .bind(2)
            .bind("李老师")
            .execute(pool)
            .await
            .expect("插入教师失败");

        // 插入测试数据：班级
        sqlx::query("INSERT INTO classes (id, name, created_at, updated_at) VALUES (?, ?, datetime('now'), datetime('now'))")
            .bind(1)
            .bind("一年级1班")
            .execute(pool)
            .await
            .expect("插入班级失败");

        sqlx::query("INSERT INTO classes (id, name, created_at, updated_at) VALUES (?, ?, datetime('now'), datetime('now'))")
            .bind(2)
            .bind("一年级2班")
            .execute(pool)
            .await
            .expect("插入班级失败");

        // 插入测试数据：科目
        sqlx::query("INSERT INTO subject_configs (id, name, forbidden_slots, created_at, updated_at) VALUES (?, ?, ?, datetime('now'), datetime('now'))")
            .bind("math")
            .bind("数学")
            .bind("0")  // 空的禁止时段掩码
            .execute(pool)
            .await
            .expect("插入科目失败");

        sqlx::query("INSERT INTO subject_configs (id, name, forbidden_slots, created_at, updated_at) VALUES (?, ?, ?, datetime('now'), datetime('now'))")
            .bind("chinese")
            .bind("语文")
            .bind("0")  // 空的禁止时段掩码
            .execute(pool)
            .await
            .expect("插入科目失败");

        db
    }

    #[tokio::test]
    async fn test_create_curriculum() {
        let db = setup_test_db().await;
        let pool = db.pool();

        let id = create_curriculum(pool, 1, "math", 1, 5, false, &[], "Every")
            .await
            .expect("创建教学计划失败");

        assert!(id > 0, "教学计划ID应该大于0");

        // 验证创建的教学计划
        let retrieved = get_curriculum_by_id(pool, id)
            .await
            .expect("查询教学计划失败")
            .expect("教学计划应该存在");

        assert_eq!(retrieved.class_id, 1);
        assert_eq!(retrieved.subject_id, "math");
        assert_eq!(retrieved.teacher_id, 1);
        assert_eq!(retrieved.target_sessions, 5);
        assert_eq!(retrieved.is_combined_class, 0);
        assert_eq!(retrieved.week_type, "Every");
    }

    #[tokio::test]
    async fn test_create_combined_class_curriculum() {
        let db = setup_test_db().await;
        let pool = db.pool();

        let id = create_curriculum(pool, 1, "math", 1, 4, true, &[1, 2], "Every")
            .await
            .expect("创建合班教学计划失败");

        let retrieved = get_curriculum_by_id(pool, id)
            .await
            .expect("查询教学计划失败")
            .expect("教学计划应该存在");

        assert_eq!(retrieved.is_combined_class, 1);
        let combined_ids: Vec<i64> = serde_json::from_str(&retrieved.combined_class_ids).unwrap();
        assert_eq!(combined_ids, vec![1, 2]);
    }

    #[tokio::test]
    async fn test_get_all_curriculums() {
        let db = setup_test_db().await;
        let pool = db.pool();

        // 创建多个教学计划
        create_curriculum(pool, 1, "math", 1, 5, false, &[], "Every")
            .await
            .expect("创建教学计划1失败");

        create_curriculum(pool, 1, "chinese", 2, 6, false, &[], "Every")
            .await
            .expect("创建教学计划2失败");

        let all_curriculums = get_all_curriculums(pool)
            .await
            .expect("查询所有教学计划失败");

        assert_eq!(all_curriculums.len(), 2, "应该有2条教学计划");
    }

    #[tokio::test]
    async fn test_get_curriculums_by_class() {
        let db = setup_test_db().await;
        let pool = db.pool();

        // 为班级1创建教学计划
        create_curriculum(pool, 1, "math", 1, 5, false, &[], "Every")
            .await
            .expect("创建教学计划1失败");

        create_curriculum(pool, 1, "chinese", 2, 6, false, &[], "Every")
            .await
            .expect("创建教学计划2失败");

        // 为班级2创建教学计划
        create_curriculum(pool, 2, "math", 1, 5, false, &[], "Every")
            .await
            .expect("创建教学计划3失败");

        let class1_curriculums = get_curriculums_by_class(pool, 1)
            .await
            .expect("查询班级1的教学计划失败");
        assert_eq!(class1_curriculums.len(), 2, "班级1应该有2条教学计划");

        let class2_curriculums = get_curriculums_by_class(pool, 2)
            .await
            .expect("查询班级2的教学计划失败");
        assert_eq!(class2_curriculums.len(), 1, "班级2应该有1条教学计划");
    }

    #[tokio::test]
    async fn test_get_curriculums_by_teacher() {
        let db = setup_test_db().await;
        let pool = db.pool();

        // 为教师1创建教学计划
        create_curriculum(pool, 1, "math", 1, 5, false, &[], "Every")
            .await
            .expect("创建教学计划1失败");

        create_curriculum(pool, 2, "math", 1, 5, false, &[], "Every")
            .await
            .expect("创建教学计划2失败");

        // 为教师2创建教学计划
        create_curriculum(pool, 1, "chinese", 2, 6, false, &[], "Every")
            .await
            .expect("创建教学计划3失败");

        let teacher1_curriculums = get_curriculums_by_teacher(pool, 1)
            .await
            .expect("查询教师1的教学计划失败");
        assert_eq!(teacher1_curriculums.len(), 2, "教师1应该有2条教学计划");

        let teacher2_curriculums = get_curriculums_by_teacher(pool, 2)
            .await
            .expect("查询教师2的教学计划失败");
        assert_eq!(teacher2_curriculums.len(), 1, "教师2应该有1条教学计划");
    }

    #[tokio::test]
    async fn test_update_curriculum() {
        let db = setup_test_db().await;
        let pool = db.pool();

        let id = create_curriculum(pool, 1, "math", 1, 5, false, &[], "Every")
            .await
            .expect("创建教学计划失败");

        // 更新教学计划
        update_curriculum(pool, id, 1, "math", 1, 6, false, &[], "Odd")
            .await
            .expect("更新教学计划失败");

        // 验证更新
        let updated = get_curriculum_by_id(pool, id)
            .await
            .expect("查询教学计划失败")
            .expect("教学计划应该存在");

        assert_eq!(updated.target_sessions, 6);
        assert_eq!(updated.week_type, "Odd");
    }

    #[tokio::test]
    async fn test_delete_curriculum() {
        let db = setup_test_db().await;
        let pool = db.pool();

        let id = create_curriculum(pool, 1, "math", 1, 5, false, &[], "Every")
            .await
            .expect("创建教学计划失败");

        // 删除教学计划
        delete_curriculum(pool, id).await.expect("删除教学计划失败");

        // 验证删除
        let result = get_curriculum_by_id(pool, id)
            .await
            .expect("查询教学计划失败");
        assert!(result.is_none(), "教学计划应该已被删除");
    }

    #[tokio::test]
    async fn test_batch_create_curriculums() {
        let db = setup_test_db().await;
        let pool = db.pool();

        let curriculums = vec![
            (
                1,
                "math".to_string(),
                1,
                5,
                false,
                vec![],
                "Every".to_string(),
            ),
            (
                1,
                "chinese".to_string(),
                2,
                6,
                false,
                vec![],
                "Every".to_string(),
            ),
            (
                2,
                "math".to_string(),
                1,
                5,
                false,
                vec![],
                "Every".to_string(),
            ),
        ];

        let ids = batch_create_curriculums(pool, &curriculums)
            .await
            .expect("批量创建教学计划失败");

        assert_eq!(ids.len(), 3, "应该创建3条教学计划");

        // 验证所有教学计划都已创建
        let all_curriculums = get_all_curriculums(pool)
            .await
            .expect("查询所有教学计划失败");
        assert_eq!(all_curriculums.len(), 3, "应该有3条教学计划");
    }

    #[tokio::test]
    async fn test_week_type_variations() {
        let db = setup_test_db().await;
        let pool = db.pool();

        let week_types = vec!["Every", "Odd", "Even"];
        let subject_ids = vec!["math", "chinese", "math"]; // 使用已存在的科目ID

        for (i, week_type) in week_types.iter().enumerate() {
            let id = create_curriculum(pool, 1, subject_ids[i], 1, 4, false, &[], week_type)
                .await
                .expect("创建教学计划失败");

            let retrieved = get_curriculum_by_id(pool, id)
                .await
                .expect("查询教学计划失败")
                .expect("教学计划应该存在");

            assert_eq!(retrieved.week_type, *week_type);
        }
    }

    #[tokio::test]
    async fn test_get_curriculum_by_id_not_found() {
        let db = setup_test_db().await;
        let pool = db.pool();

        let result = get_curriculum_by_id(pool, 999)
            .await
            .expect("查询教学计划失败");
        assert!(result.is_none(), "不存在的教学计划应该返回None");
    }

    #[tokio::test]
    async fn test_update_nonexistent_curriculum() {
        let db = setup_test_db().await;
        let pool = db.pool();

        let result = update_curriculum(pool, 999, 1, "math", 1, 5, false, &[], "Every").await;
        assert!(result.is_err(), "更新不存在的教学计划应该失败");
    }

    #[tokio::test]
    async fn test_delete_nonexistent_curriculum() {
        let db = setup_test_db().await;
        let pool = db.pool();

        let result = delete_curriculum(pool, 999).await;
        assert!(result.is_err(), "删除不存在的教学计划应该失败");
    }
}
