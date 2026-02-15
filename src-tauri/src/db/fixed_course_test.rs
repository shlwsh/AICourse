// ============================================================================
// 固定课程数据访问模块测试
// ============================================================================
// 本模块测试固定课程相关的数据库操作
//
// 测试覆盖：
// - 创建固定课程
// - 查询固定课程（按 ID、班级、教师、时间槽位）
// - 更新固定课程
// - 删除固定课程
// - 批量创建固定课程
// ============================================================================

#[cfg(test)]
mod tests {
    use crate::db::fixed_course::{
        CreateFixedCourseInput, FixedCourseRepository, UpdateFixedCourseInput,
    };
    use crate::db::DatabaseManager;
    use sqlx::SqlitePool;

    /// 创建测试数据库
    async fn setup_test_db() -> SqlitePool {
        let db = DatabaseManager::new("sqlite::memory:", "migrations")
            .await
            .expect("创建测试数据库失败");

        let pool = db.pool().clone();

        // 注意：教研组已经在迁移脚本中插入，无需再次插入

        // 插入测试数据：教师
        sqlx::query(
            r#"
            INSERT INTO teachers (id, name, teaching_group_id, created_at, updated_at)
            VALUES
                (1, '张老师', 1, datetime('now'), datetime('now')),
                (2, '李老师', 1, datetime('now'), datetime('now'))
            "#,
        )
        .execute(&pool)
        .await
        .expect("插入教师失败");

        // 插入测试数据：班级
        sqlx::query(
            r#"
            INSERT INTO classes (id, name, grade_level, created_at, updated_at)
            VALUES
                (1, '初一(1)班', 1, datetime('now'), datetime('now')),
                (2, '初一(2)班', 1, datetime('now'), datetime('now'))
            "#,
        )
        .execute(&pool)
        .await
        .expect("插入班级失败");

        // 插入测试数据：科目配置
        sqlx::query(
            r#"
            INSERT INTO subject_configs (id, name, forbidden_slots, allow_double_session, is_major_subject, created_at, updated_at)
            VALUES
                ('chinese', '语文', '0', 1, 1, datetime('now'), datetime('now')),
                ('math', '数学', '0', 1, 1, datetime('now'), datetime('now')),
                ('class_meeting', '班会', '0', 0, 0, datetime('now'), datetime('now'))
            "#,
        )
        .execute(&pool)
        .await
        .expect("插入科目配置失败");

        pool
    }

    #[tokio::test]
    async fn test_create_fixed_course() {
        let pool = setup_test_db().await;
        let repo = FixedCourseRepository::new(&pool);

        let input = CreateFixedCourseInput {
            class_id: 1,
            subject_id: "class_meeting".to_string(),
            teacher_id: 1,
            day: 0,    // 星期一
            period: 7, // 第8节
            is_pre_arranged: false,
        };

        let result = repo.create(input).await;
        assert!(result.is_ok(), "创建固定课程应该成功");

        let fixed_course = result.unwrap();
        assert_eq!(fixed_course.class_id, 1);
        assert_eq!(fixed_course.subject_id, "class_meeting");
        assert_eq!(fixed_course.teacher_id, 1);
        assert_eq!(fixed_course.day, 0);
        assert_eq!(fixed_course.period, 7);
        assert_eq!(fixed_course.is_pre_arranged, 0);
    }

    #[tokio::test]
    async fn test_find_by_id() {
        let pool = setup_test_db().await;
        let repo = FixedCourseRepository::new(&pool);

        // 创建固定课程
        let input = CreateFixedCourseInput {
            class_id: 1,
            subject_id: "class_meeting".to_string(),
            teacher_id: 1,
            day: 0,
            period: 7,
            is_pre_arranged: false,
        };

        let created = repo.create(input).await.unwrap();

        // 查询固定课程
        let result = repo.find_by_id(created.id).await;
        assert!(result.is_ok(), "查询固定课程应该成功");

        let found = result.unwrap();
        assert!(found.is_some(), "应该找到固定课程");

        let fixed_course = found.unwrap();
        assert_eq!(fixed_course.id, created.id);
        assert_eq!(fixed_course.class_id, 1);
        assert_eq!(fixed_course.subject_id, "class_meeting");
    }

    #[tokio::test]
    async fn test_find_by_id_not_found() {
        let pool = setup_test_db().await;
        let repo = FixedCourseRepository::new(&pool);

        let result = repo.find_by_id(999).await;
        assert!(result.is_ok(), "查询应该成功");

        let found = result.unwrap();
        assert!(found.is_none(), "不应该找到固定课程");
    }

    #[tokio::test]
    async fn test_find_all() {
        let pool = setup_test_db().await;
        let repo = FixedCourseRepository::new(&pool);

        // 创建多个固定课程
        let inputs = vec![
            CreateFixedCourseInput {
                class_id: 1,
                subject_id: "class_meeting".to_string(),
                teacher_id: 1,
                day: 0,
                period: 7,
                is_pre_arranged: false,
            },
            CreateFixedCourseInput {
                class_id: 2,
                subject_id: "class_meeting".to_string(),
                teacher_id: 2,
                day: 0,
                period: 7,
                is_pre_arranged: false,
            },
        ];

        for input in inputs {
            repo.create(input).await.unwrap();
        }

        // 查询所有固定课程
        let result = repo.find_all().await;
        assert!(result.is_ok(), "查询所有固定课程应该成功");

        let courses = result.unwrap();
        assert_eq!(courses.len(), 2, "应该有2个固定课程");
    }

    #[tokio::test]
    async fn test_find_by_class() {
        let pool = setup_test_db().await;
        let repo = FixedCourseRepository::new(&pool);

        // 为班级1创建固定课程
        let input1 = CreateFixedCourseInput {
            class_id: 1,
            subject_id: "class_meeting".to_string(),
            teacher_id: 1,
            day: 0,
            period: 7,
            is_pre_arranged: false,
        };
        repo.create(input1).await.unwrap();

        // 为班级2创建固定课程
        let input2 = CreateFixedCourseInput {
            class_id: 2,
            subject_id: "class_meeting".to_string(),
            teacher_id: 2,
            day: 0,
            period: 7,
            is_pre_arranged: false,
        };
        repo.create(input2).await.unwrap();

        // 查询班级1的固定课程
        let result = repo.find_by_class(1).await;
        assert!(result.is_ok(), "查询班级固定课程应该成功");

        let courses = result.unwrap();
        assert_eq!(courses.len(), 1, "班级1应该有1个固定课程");
        assert_eq!(courses[0].class_id, 1);
    }

    #[tokio::test]
    async fn test_find_by_teacher() {
        let pool = setup_test_db().await;
        let repo = FixedCourseRepository::new(&pool);

        // 为教师1创建固定课程
        let input1 = CreateFixedCourseInput {
            class_id: 1,
            subject_id: "class_meeting".to_string(),
            teacher_id: 1,
            day: 0,
            period: 7,
            is_pre_arranged: false,
        };
        repo.create(input1).await.unwrap();

        // 为教师2创建固定课程
        let input2 = CreateFixedCourseInput {
            class_id: 2,
            subject_id: "class_meeting".to_string(),
            teacher_id: 2,
            day: 0,
            period: 7,
            is_pre_arranged: false,
        };
        repo.create(input2).await.unwrap();

        // 查询教师1的固定课程
        let result = repo.find_by_teacher(1).await;
        assert!(result.is_ok(), "查询教师固定课程应该成功");

        let courses = result.unwrap();
        assert_eq!(courses.len(), 1, "教师1应该有1个固定课程");
        assert_eq!(courses[0].teacher_id, 1);
    }

    #[tokio::test]
    async fn test_find_by_time_slot() {
        let pool = setup_test_db().await;
        let repo = FixedCourseRepository::new(&pool);

        // 在同一时间槽位创建多个固定课程
        let inputs = vec![
            CreateFixedCourseInput {
                class_id: 1,
                subject_id: "class_meeting".to_string(),
                teacher_id: 1,
                day: 0,
                period: 7,
                is_pre_arranged: false,
            },
            CreateFixedCourseInput {
                class_id: 2,
                subject_id: "class_meeting".to_string(),
                teacher_id: 2,
                day: 0,
                period: 7,
                is_pre_arranged: false,
            },
        ];

        for input in inputs {
            repo.create(input).await.unwrap();
        }

        // 查询时间槽位的固定课程
        let result = repo.find_by_time_slot(0, 7).await;
        assert!(result.is_ok(), "查询时间槽位固定课程应该成功");

        let courses = result.unwrap();
        assert_eq!(courses.len(), 2, "该时间槽位应该有2个固定课程");
        assert_eq!(courses[0].day, 0);
        assert_eq!(courses[0].period, 7);
    }

    #[tokio::test]
    async fn test_update_fixed_course() {
        let pool = setup_test_db().await;
        let repo = FixedCourseRepository::new(&pool);

        // 创建固定课程
        let input = CreateFixedCourseInput {
            class_id: 1,
            subject_id: "class_meeting".to_string(),
            teacher_id: 1,
            day: 0,
            period: 7,
            is_pre_arranged: false,
        };

        let created = repo.create(input).await.unwrap();

        // 更新固定课程
        let update_input = UpdateFixedCourseInput {
            class_id: None,
            subject_id: None,
            teacher_id: Some(2),
            day: Some(1),    // 改为星期二
            period: Some(6), // 改为第7节
            is_pre_arranged: Some(true),
        };

        let result = repo.update(created.id, update_input).await;
        assert!(result.is_ok(), "更新固定课程应该成功");

        let updated = result.unwrap();
        assert_eq!(updated.teacher_id, 2);
        assert_eq!(updated.day, 1);
        assert_eq!(updated.period, 6);
        assert_eq!(updated.is_pre_arranged, 1);
    }

    #[tokio::test]
    async fn test_update_fixed_course_not_found() {
        let pool = setup_test_db().await;
        let repo = FixedCourseRepository::new(&pool);

        let update_input = UpdateFixedCourseInput {
            class_id: None,
            subject_id: None,
            teacher_id: Some(2),
            day: None,
            period: None,
            is_pre_arranged: None,
        };

        let result = repo.update(999, update_input).await;
        assert!(result.is_err(), "更新不存在的固定课程应该失败");
    }

    #[tokio::test]
    async fn test_delete_fixed_course() {
        let pool = setup_test_db().await;
        let repo = FixedCourseRepository::new(&pool);

        // 创建固定课程
        let input = CreateFixedCourseInput {
            class_id: 1,
            subject_id: "class_meeting".to_string(),
            teacher_id: 1,
            day: 0,
            period: 7,
            is_pre_arranged: false,
        };

        let created = repo.create(input).await.unwrap();

        // 删除固定课程
        let result = repo.delete(created.id).await;
        assert!(result.is_ok(), "删除固定课程应该成功");

        // 验证已删除
        let found = repo.find_by_id(created.id).await.unwrap();
        assert!(found.is_none(), "固定课程应该已被删除");
    }

    #[tokio::test]
    async fn test_delete_fixed_course_not_found() {
        let pool = setup_test_db().await;
        let repo = FixedCourseRepository::new(&pool);

        let result = repo.delete(999).await;
        assert!(result.is_err(), "删除不存在的固定课程应该失败");
    }

    #[tokio::test]
    async fn test_batch_create_fixed_courses() {
        let pool = setup_test_db().await;
        let repo = FixedCourseRepository::new(&pool);

        let inputs = vec![
            CreateFixedCourseInput {
                class_id: 1,
                subject_id: "class_meeting".to_string(),
                teacher_id: 1,
                day: 0,
                period: 7,
                is_pre_arranged: false,
            },
            CreateFixedCourseInput {
                class_id: 2,
                subject_id: "class_meeting".to_string(),
                teacher_id: 2,
                day: 0,
                period: 7,
                is_pre_arranged: false,
            },
            CreateFixedCourseInput {
                class_id: 1,
                subject_id: "chinese".to_string(),
                teacher_id: 1,
                day: 1,
                period: 0,
                is_pre_arranged: true,
            },
        ];

        let result = repo.batch_create(inputs).await;
        assert!(result.is_ok(), "批量创建固定课程应该成功");

        let count = result.unwrap();
        assert_eq!(count, 3, "应该创建3个固定课程");

        // 验证创建结果
        let all_courses = repo.find_all().await.unwrap();
        assert_eq!(all_courses.len(), 3, "应该有3个固定课程");
    }

    #[tokio::test]
    async fn test_batch_create_empty() {
        let pool = setup_test_db().await;
        let repo = FixedCourseRepository::new(&pool);

        let inputs = vec![];

        let result = repo.batch_create(inputs).await;
        assert!(result.is_ok(), "批量创建空列表应该成功");

        let count = result.unwrap();
        assert_eq!(count, 0, "应该创建0个固定课程");
    }

    #[tokio::test]
    async fn test_batch_create_transaction_rollback() {
        let pool = setup_test_db().await;
        let repo = FixedCourseRepository::new(&pool);

        // 包含一个无效的输入（不存在的班级ID）
        let inputs = vec![
            CreateFixedCourseInput {
                class_id: 1,
                subject_id: "class_meeting".to_string(),
                teacher_id: 1,
                day: 0,
                period: 7,
                is_pre_arranged: false,
            },
            CreateFixedCourseInput {
                class_id: 999, // 不存在的班级
                subject_id: "class_meeting".to_string(),
                teacher_id: 2,
                day: 0,
                period: 7,
                is_pre_arranged: false,
            },
        ];

        let result = repo.batch_create(inputs).await;
        assert!(result.is_err(), "批量创建包含无效数据应该失败");

        // 验证事务回滚，没有任何固定课程被创建
        let all_courses = repo.find_all().await.unwrap();
        assert_eq!(all_courses.len(), 0, "事务回滚后不应该有任何固定课程");
    }

    #[tokio::test]
    async fn test_create_pre_arranged_course() {
        let pool = setup_test_db().await;
        let repo = FixedCourseRepository::new(&pool);

        let input = CreateFixedCourseInput {
            class_id: 1,
            subject_id: "chinese".to_string(),
            teacher_id: 1,
            day: 1,
            period: 0,
            is_pre_arranged: true, // 预排课程
        };

        let result = repo.create(input).await;
        assert!(result.is_ok(), "创建预排课程应该成功");

        let fixed_course = result.unwrap();
        assert_eq!(fixed_course.is_pre_arranged, 1, "应该是预排课程");
    }
}
