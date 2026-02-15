// ============================================================================
// 教师数据访问模块单元测试
// ============================================================================

#[cfg(test)]
mod tests {
    use crate::db::teacher::{
        CreateTeacherInput, SaveTeacherPreferenceInput, TeacherRepository, UpdateTeacherInput,
    };
    use sqlx::SqlitePool;

    /// 创建测试数据库连接池
    async fn setup_test_db() -> SqlitePool {
        // 使用内存数据库进行测试
        let pool = SqlitePool::connect("sqlite::memory:")
            .await
            .expect("创建测试数据库失败");

        // 创建必要的表结构
        sqlx::query(
            r#"
            CREATE TABLE IF NOT EXISTS teaching_groups (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL UNIQUE,
                description TEXT,
                created_at TEXT NOT NULL DEFAULT (datetime('now'))
            )
            "#,
        )
        .execute(&pool)
        .await
        .expect("创建 teaching_groups 表失败");

        sqlx::query(
            r#"
            CREATE TABLE IF NOT EXISTS teachers (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                teaching_group_id INTEGER,
                created_at TEXT NOT NULL DEFAULT (datetime('now')),
                updated_at TEXT NOT NULL DEFAULT (datetime('now')),
                FOREIGN KEY (teaching_group_id) REFERENCES teaching_groups(id)
            )
            "#,
        )
        .execute(&pool)
        .await
        .expect("创建 teachers 表失败");

        sqlx::query(
            r#"
            CREATE TABLE IF NOT EXISTS teacher_preferences (
                teacher_id INTEGER PRIMARY KEY,
                preferred_slots TEXT NOT NULL,
                time_bias INTEGER NOT NULL DEFAULT 0,
                weight INTEGER NOT NULL DEFAULT 1,
                blocked_slots TEXT NOT NULL,
                created_at TEXT NOT NULL DEFAULT (datetime('now')),
                updated_at TEXT NOT NULL DEFAULT (datetime('now')),
                FOREIGN KEY (teacher_id) REFERENCES teachers(id) ON DELETE CASCADE
            )
            "#,
        )
        .execute(&pool)
        .await
        .expect("创建 teacher_preferences 表失败");

        // 创建课表相关表（用于测试教师状态查询和工作量统计）
        sqlx::query(
            r#"
            CREATE TABLE IF NOT EXISTS schedules (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                version INTEGER NOT NULL,
                cycle_days INTEGER NOT NULL,
                periods_per_day INTEGER NOT NULL,
                cost INTEGER NOT NULL,
                is_active INTEGER NOT NULL DEFAULT 1,
                created_at TEXT NOT NULL DEFAULT (datetime('now'))
            )
            "#,
        )
        .execute(&pool)
        .await
        .expect("创建 schedules 表失败");

        sqlx::query(
            r#"
            CREATE TABLE IF NOT EXISTS schedule_entries (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                schedule_id INTEGER NOT NULL,
                class_id INTEGER NOT NULL,
                subject_id TEXT NOT NULL,
                teacher_id INTEGER NOT NULL,
                day INTEGER NOT NULL,
                period INTEGER NOT NULL,
                is_fixed INTEGER NOT NULL DEFAULT 0,
                week_type TEXT NOT NULL DEFAULT 'Every',
                FOREIGN KEY (schedule_id) REFERENCES schedules(id) ON DELETE CASCADE
            )
            "#,
        )
        .execute(&pool)
        .await
        .expect("创建 schedule_entries 表失败");

        pool
    }

    #[tokio::test]
    async fn test_create_teacher() {
        let pool = setup_test_db().await;
        let repo = TeacherRepository::new(&pool);

        let input = CreateTeacherInput {
            name: "张三".to_string(),
            teaching_group_id: None,
        };

        let teacher = repo.create(input).await.expect("创建教师失败");

        assert_eq!(teacher.name, "张三");
        assert_eq!(teacher.teaching_group_id, None);
        assert!(teacher.id > 0);
    }

    #[tokio::test]
    async fn test_find_teacher_by_id() {
        let pool = setup_test_db().await;
        let repo = TeacherRepository::new(&pool);

        // 创建教师
        let input = CreateTeacherInput {
            name: "李四".to_string(),
            teaching_group_id: None,
        };
        let created = repo.create(input).await.expect("创建教师失败");

        // 查询教师
        let found = repo
            .find_by_id(created.id)
            .await
            .expect("查询教师失败")
            .expect("教师不存在");

        assert_eq!(found.id, created.id);
        assert_eq!(found.name, "李四");
    }

    #[tokio::test]
    async fn test_find_all_teachers() {
        let pool = setup_test_db().await;
        let repo = TeacherRepository::new(&pool);

        // 创建多个教师
        repo.create(CreateTeacherInput {
            name: "王五".to_string(),
            teaching_group_id: None,
        })
        .await
        .expect("创建教师失败");

        repo.create(CreateTeacherInput {
            name: "赵六".to_string(),
            teaching_group_id: None,
        })
        .await
        .expect("创建教师失败");

        // 查询所有教师
        let teachers = repo.find_all().await.expect("查询教师失败");

        assert_eq!(teachers.len(), 2);
    }

    #[tokio::test]
    async fn test_update_teacher() {
        let pool = setup_test_db().await;
        let repo = TeacherRepository::new(&pool);

        // 创建教师
        let created = repo
            .create(CreateTeacherInput {
                name: "原名".to_string(),
                teaching_group_id: None,
            })
            .await
            .expect("创建教师失败");

        // 更新教师
        let updated = repo
            .update(
                created.id,
                UpdateTeacherInput {
                    name: Some("新名".to_string()),
                    teaching_group_id: None,
                },
            )
            .await
            .expect("更新教师失败");

        assert_eq!(updated.name, "新名");
    }

    #[tokio::test]
    async fn test_delete_teacher() {
        let pool = setup_test_db().await;
        let repo = TeacherRepository::new(&pool);

        // 创建教师
        let created = repo
            .create(CreateTeacherInput {
                name: "待删除".to_string(),
                teaching_group_id: None,
            })
            .await
            .expect("创建教师失败");

        // 删除教师
        repo.delete(created.id).await.expect("删除教师失败");

        // 验证已删除
        let found = repo.find_by_id(created.id).await.expect("查询教师失败");
        assert!(found.is_none());
    }

    #[tokio::test]
    async fn test_save_teacher_preference() {
        let pool = setup_test_db().await;
        let repo = TeacherRepository::new(&pool);

        // 创建教师
        let teacher = repo
            .create(CreateTeacherInput {
                name: "测试教师".to_string(),
                teaching_group_id: None,
            })
            .await
            .expect("创建教师失败");

        // 保存偏好
        let input = SaveTeacherPreferenceInput {
            teacher_id: teacher.id,
            preferred_slots: 0b1111111111111111111111111111111111111111, // 所有时段都偏好
            time_bias: 1,                                                // 厌恶早课
            weight: 2,
            blocked_slots: 0, // 没有不排课时段
        };

        let pref = repo.save_preference(input).await.expect("保存偏好失败");

        assert_eq!(pref.teacher_id, teacher.id);
        assert_eq!(pref.time_bias, 1);
        assert_eq!(pref.weight, 2);
    }

    #[tokio::test]
    async fn test_find_teacher_preference() {
        let pool = setup_test_db().await;
        let repo = TeacherRepository::new(&pool);

        // 创建教师
        let teacher = repo
            .create(CreateTeacherInput {
                name: "测试教师".to_string(),
                teaching_group_id: None,
            })
            .await
            .expect("创建教师失败");

        // 保存偏好
        let input = SaveTeacherPreferenceInput {
            teacher_id: teacher.id,
            preferred_slots: 12345,
            time_bias: 0,
            weight: 1,
            blocked_slots: 0,
        };
        repo.save_preference(input).await.expect("保存偏好失败");

        // 查询偏好
        let found = repo
            .find_preference(teacher.id)
            .await
            .expect("查询偏好失败")
            .expect("偏好不存在");

        assert_eq!(found.teacher_id, teacher.id);
        assert_eq!(found.preferred_slots, "12345");
    }

    #[tokio::test]
    async fn test_batch_save_preferences() {
        let pool = setup_test_db().await;
        let repo = TeacherRepository::new(&pool);

        // 创建多个教师
        let teacher1 = repo
            .create(CreateTeacherInput {
                name: "教师1".to_string(),
                teaching_group_id: None,
            })
            .await
            .expect("创建教师失败");

        let teacher2 = repo
            .create(CreateTeacherInput {
                name: "教师2".to_string(),
                teaching_group_id: None,
            })
            .await
            .expect("创建教师失败");

        // 批量保存偏好
        let inputs = vec![
            SaveTeacherPreferenceInput {
                teacher_id: teacher1.id,
                preferred_slots: 111,
                time_bias: 1,
                weight: 1,
                blocked_slots: 0,
            },
            SaveTeacherPreferenceInput {
                teacher_id: teacher2.id,
                preferred_slots: 222,
                time_bias: 2,
                weight: 2,
                blocked_slots: 0,
            },
        ];

        let count = repo
            .batch_save_preferences(inputs)
            .await
            .expect("批量保存偏好失败");

        assert_eq!(count, 2);

        // 验证保存成功
        let pref1 = repo
            .find_preference(teacher1.id)
            .await
            .expect("查询偏好失败")
            .expect("偏好不存在");
        assert_eq!(pref1.preferred_slots, "111");

        let pref2 = repo
            .find_preference(teacher2.id)
            .await
            .expect("查询偏好失败")
            .expect("偏好不存在");
        assert_eq!(pref2.preferred_slots, "222");
    }

    #[tokio::test]
    async fn test_query_teacher_status() {
        let pool = setup_test_db().await;
        let repo = TeacherRepository::new(&pool);

        // 创建教师
        let teacher1 = repo
            .create(CreateTeacherInput {
                name: "教师1".to_string(),
                teaching_group_id: None,
            })
            .await
            .expect("创建教师失败");

        let teacher2 = repo
            .create(CreateTeacherInput {
                name: "教师2".to_string(),
                teaching_group_id: None,
            })
            .await
            .expect("创建教师失败");

        // 创建课表
        sqlx::query(
            "INSERT INTO schedules (version, cycle_days, periods_per_day, cost) VALUES (1, 5, 8, 0)",
        )
        .execute(&pool)
        .await
        .expect("创建课表失败");

        let schedule_id = 1;

        // 为教师1添加课程（星期一第1节）
        sqlx::query(
            "INSERT INTO schedule_entries (schedule_id, class_id, subject_id, teacher_id, day, period) VALUES (?, 1, 'math', ?, 0, 0)",
        )
        .bind(schedule_id)
        .bind(teacher1.id)
        .execute(&pool)
        .await
        .expect("添加课程失败");

        // 查询教师状态
        let statuses = repo
            .query_teacher_status(schedule_id, 0, 0)
            .await
            .expect("查询教师状态失败");

        assert_eq!(statuses.len(), 2);

        // 验证教师1在上课
        let status1 = statuses
            .iter()
            .find(|s| s.teacher_id == teacher1.id)
            .unwrap();
        assert!(status1.is_busy);
        assert_eq!(status1.class_id, Some(1));
        assert_eq!(status1.subject_id, Some("math".to_string()));

        // 验证教师2空闲
        let status2 = statuses
            .iter()
            .find(|s| s.teacher_id == teacher2.id)
            .unwrap();
        assert!(!status2.is_busy);
        assert_eq!(status2.class_id, None);
    }

    #[tokio::test]
    async fn test_calculate_workload_statistics() {
        let pool = setup_test_db().await;
        let repo = TeacherRepository::new(&pool);

        // 创建教师
        let teacher = repo
            .create(CreateTeacherInput {
                name: "测试教师".to_string(),
                teaching_group_id: None,
            })
            .await
            .expect("创建教师失败");

        // 创建课表
        sqlx::query(
            "INSERT INTO schedules (version, cycle_days, periods_per_day, cost) VALUES (1, 5, 8, 0)",
        )
        .execute(&pool)
        .await
        .expect("创建课表失败");

        let schedule_id = 1;

        // 添加多节课程
        // 早课（period = 0）
        sqlx::query(
            "INSERT INTO schedule_entries (schedule_id, class_id, subject_id, teacher_id, day, period) VALUES (?, 1, 'math', ?, 0, 0)",
        )
        .bind(schedule_id)
        .bind(teacher.id)
        .execute(&pool)
        .await
        .expect("添加课程失败");

        // 普通课
        sqlx::query(
            "INSERT INTO schedule_entries (schedule_id, class_id, subject_id, teacher_id, day, period) VALUES (?, 1, 'math', ?, 0, 2)",
        )
        .bind(schedule_id)
        .bind(teacher.id)
        .execute(&pool)
        .await
        .expect("添加课程失败");

        // 晚课（period = 7，最后一节）
        sqlx::query(
            "INSERT INTO schedule_entries (schedule_id, class_id, subject_id, teacher_id, day, period) VALUES (?, 2, 'english', ?, 1, 7)",
        )
        .bind(schedule_id)
        .bind(teacher.id)
        .execute(&pool)
        .await
        .expect("添加课程失败");

        // 统计工作量
        let statistics = repo
            .calculate_workload_statistics(schedule_id, 8)
            .await
            .expect("统计工作量失败");

        assert_eq!(statistics.len(), 1);

        let stat = &statistics[0];
        assert_eq!(stat.teacher_id, teacher.id);
        assert_eq!(stat.total_sessions, 3); // 总共3节课
        assert_eq!(stat.class_count, 2); // 2个班级
        assert_eq!(stat.subjects.len(), 2); // 2个科目
        assert!(stat.subjects.contains(&"math".to_string()));
        assert!(stat.subjects.contains(&"english".to_string()));
        assert_eq!(stat.early_sessions, 1); // 1节早课
        assert_eq!(stat.late_sessions, 1); // 1节晚课
    }
}
