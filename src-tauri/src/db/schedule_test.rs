// ============================================================================
// 课表数据访问模块单元测试
// ============================================================================
// 本模块测试课表相关的数据库操作
//
// 测试覆盖：
// - 课表的 CRUD 操作
// - 课表条目的 CRUD 操作
// - 活动课表查询
// - 事务处理
// - 错误处理
// ============================================================================

#[cfg(test)]
mod tests {
    use crate::db::schedule::{
        CreateScheduleEntryInput, CreateScheduleInput, ScheduleRepository,
        UpdateScheduleEntryInput, UpdateScheduleInput,
    };
    use sqlx::SqlitePool;

    /// 创建测试数据库
    async fn setup_test_db() -> SqlitePool {
        let pool = SqlitePool::connect("sqlite::memory:")
            .await
            .expect("创建测试数据库失败");

        // 创建必要的表
        sqlx::query(
            r#"
            CREATE TABLE schedules (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                version INTEGER NOT NULL,
                cycle_days INTEGER NOT NULL,
                periods_per_day INTEGER NOT NULL,
                cost INTEGER NOT NULL,
                is_active INTEGER NOT NULL DEFAULT 1,
                created_at TEXT NOT NULL
            )
            "#,
        )
        .execute(&pool)
        .await
        .expect("创建 schedules 表失败");

        sqlx::query(
            r#"
            CREATE TABLE schedule_entries (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                schedule_id INTEGER NOT NULL,
                class_id INTEGER NOT NULL,
                subject_id TEXT NOT NULL,
                teacher_id INTEGER NOT NULL,
                day INTEGER NOT NULL,
                period INTEGER NOT NULL,
                is_fixed INTEGER NOT NULL DEFAULT 0,
                week_type TEXT NOT NULL DEFAULT 'Every',
                FOREIGN KEY (schedule_id) REFERENCES schedules(id)
            )
            "#,
        )
        .execute(&pool)
        .await
        .expect("创建 schedule_entries 表失败");

        pool
    }

    #[tokio::test]
    async fn test_create_schedule() {
        let pool = setup_test_db().await;
        let repo = ScheduleRepository::new(&pool);

        let input = CreateScheduleInput {
            version: 1,
            cycle_days: 5,
            periods_per_day: 8,
            cost: 100,
            entries: vec![
                CreateScheduleEntryInput {
                    class_id: 1,
                    subject_id: "MATH".to_string(),
                    teacher_id: 1,
                    day: 0,
                    period: 0,
                    is_fixed: false,
                    week_type: "Every".to_string(),
                },
                CreateScheduleEntryInput {
                    class_id: 1,
                    subject_id: "CHINESE".to_string(),
                    teacher_id: 2,
                    day: 0,
                    period: 1,
                    is_fixed: false,
                    week_type: "Every".to_string(),
                },
            ],
        };

        let result = repo.create_schedule(input).await;
        assert!(result.is_ok());

        let schedule = result.unwrap();
        assert_eq!(schedule.version, 1);
        assert_eq!(schedule.cycle_days, 5);
        assert_eq!(schedule.periods_per_day, 8);
        assert_eq!(schedule.cost, 100);
        assert_eq!(schedule.is_active, 1);

        // 验证条目已创建
        let entries = repo.get_schedule_entries(schedule.id).await.unwrap();
        assert_eq!(entries.len(), 2);
    }

    #[tokio::test]

    async fn test_get_all_schedules() {
        let pool = setup_test_db().await;
        let repo = ScheduleRepository::new(&pool);

        // 创建多个课表
        for i in 1..=3 {
            let input = CreateScheduleInput {
                version: i,
                cycle_days: 5,
                periods_per_day: 8,
                cost: 100 * i,
                entries: vec![],
            };
            repo.create_schedule(input).await.unwrap();
        }

        let schedules = repo.get_all_schedules().await.unwrap();
        assert_eq!(schedules.len(), 3);
    }

    #[tokio::test]

    async fn test_get_schedule_by_id() {
        let pool = setup_test_db().await;
        let repo = ScheduleRepository::new(&pool);

        let input = CreateScheduleInput {
            version: 1,
            cycle_days: 5,
            periods_per_day: 8,
            cost: 100,
            entries: vec![],
        };

        let created = repo.create_schedule(input).await.unwrap();
        let found = repo.get_schedule_by_id(created.id).await.unwrap();

        assert!(found.is_some());
        let schedule = found.unwrap();
        assert_eq!(schedule.id, created.id);
        assert_eq!(schedule.version, 1);
    }

    #[tokio::test]

    async fn test_get_schedule_by_id_not_found() {
        let pool = setup_test_db().await;
        let repo = ScheduleRepository::new(&pool);

        let result = repo.get_schedule_by_id(999).await.unwrap();
        assert!(result.is_none());
    }

    #[tokio::test]

    async fn test_get_active_schedule() {
        let pool = setup_test_db().await;
        let repo = ScheduleRepository::new(&pool);

        // 创建第一个课表
        let input1 = CreateScheduleInput {
            version: 1,
            cycle_days: 5,
            periods_per_day: 8,
            cost: 100,
            entries: vec![],
        };
        repo.create_schedule(input1).await.unwrap();

        // 创建第二个课表（会自动成为活动课表）
        let input2 = CreateScheduleInput {
            version: 2,
            cycle_days: 5,
            periods_per_day: 8,
            cost: 200,
            entries: vec![],
        };
        let created2 = repo.create_schedule(input2).await.unwrap();

        // 获取活动课表
        let active = repo.get_active_schedule().await.unwrap();
        assert!(active.is_some());

        let schedule = active.unwrap();
        assert_eq!(schedule.id, created2.id);
        assert_eq!(schedule.version, 2);
        assert_eq!(schedule.is_active, 1);
    }

    #[tokio::test]

    async fn test_get_active_schedule_not_found() {
        let pool = setup_test_db().await;
        let repo = ScheduleRepository::new(&pool);

        let result = repo.get_active_schedule().await.unwrap();
        assert!(result.is_none());
    }

    #[tokio::test]

    async fn test_update_schedule() {
        let pool = setup_test_db().await;
        let repo = ScheduleRepository::new(&pool);

        let input = CreateScheduleInput {
            version: 1,
            cycle_days: 5,
            periods_per_day: 8,
            cost: 100,
            entries: vec![],
        };

        let created = repo.create_schedule(input).await.unwrap();

        let update_input = UpdateScheduleInput {
            version: Some(2),
            cost: Some(200),
            is_active: None,
        };

        let updated = repo
            .update_schedule(created.id, update_input)
            .await
            .unwrap();
        assert_eq!(updated.version, 2);
        assert_eq!(updated.cost, 200);
    }

    #[tokio::test]

    async fn test_update_schedule_set_active() {
        let pool = setup_test_db().await;
        let repo = ScheduleRepository::new(&pool);

        // 创建两个课表
        let input1 = CreateScheduleInput {
            version: 1,
            cycle_days: 5,
            periods_per_day: 8,
            cost: 100,
            entries: vec![],
        };
        let schedule1 = repo.create_schedule(input1).await.unwrap();

        let input2 = CreateScheduleInput {
            version: 2,
            cycle_days: 5,
            periods_per_day: 8,
            cost: 200,
            entries: vec![],
        };
        repo.create_schedule(input2).await.unwrap();

        // 将第一个课表设为活动
        let update_input = UpdateScheduleInput {
            version: None,
            cost: None,
            is_active: Some(true),
        };

        repo.update_schedule(schedule1.id, update_input)
            .await
            .unwrap();

        // 验证第一个课表是活动的
        let active = repo.get_active_schedule().await.unwrap().unwrap();
        assert_eq!(active.id, schedule1.id);
    }

    #[tokio::test]

    async fn test_delete_schedule() {
        let pool = setup_test_db().await;
        let repo = ScheduleRepository::new(&pool);

        let input = CreateScheduleInput {
            version: 1,
            cycle_days: 5,
            periods_per_day: 8,
            cost: 100,
            entries: vec![CreateScheduleEntryInput {
                class_id: 1,
                subject_id: "MATH".to_string(),
                teacher_id: 1,
                day: 0,
                period: 0,
                is_fixed: false,
                week_type: "Every".to_string(),
            }],
        };

        let created = repo.create_schedule(input).await.unwrap();

        // 删除课表
        let result = repo.delete_schedule(created.id).await;
        assert!(result.is_ok());

        // 验证课表已删除
        let found = repo.get_schedule_by_id(created.id).await.unwrap();
        assert!(found.is_none());

        // 验证条目也已删除
        let entries = repo.get_schedule_entries(created.id).await.unwrap();
        assert_eq!(entries.len(), 0);
    }

    #[tokio::test]

    async fn test_delete_schedule_not_found() {
        let pool = setup_test_db().await;
        let repo = ScheduleRepository::new(&pool);

        let result = repo.delete_schedule(999).await;
        assert!(result.is_err());
    }

    #[tokio::test]

    async fn test_get_schedule_entries() {
        let pool = setup_test_db().await;
        let repo = ScheduleRepository::new(&pool);

        let input = CreateScheduleInput {
            version: 1,
            cycle_days: 5,
            periods_per_day: 8,
            cost: 100,
            entries: vec![
                CreateScheduleEntryInput {
                    class_id: 1,
                    subject_id: "MATH".to_string(),
                    teacher_id: 1,
                    day: 0,
                    period: 0,
                    is_fixed: false,
                    week_type: "Every".to_string(),
                },
                CreateScheduleEntryInput {
                    class_id: 2,
                    subject_id: "CHINESE".to_string(),
                    teacher_id: 2,
                    day: 0,
                    period: 1,
                    is_fixed: true,
                    week_type: "Odd".to_string(),
                },
            ],
        };

        let schedule = repo.create_schedule(input).await.unwrap();
        let entries = repo.get_schedule_entries(schedule.id).await.unwrap();

        assert_eq!(entries.len(), 2);
        assert_eq!(entries[0].class_id, 1);
        assert_eq!(entries[0].subject_id, "MATH");
        assert_eq!(entries[0].is_fixed, 0);
        assert_eq!(entries[1].class_id, 2);
        assert_eq!(entries[1].is_fixed, 1);
        assert_eq!(entries[1].week_type, "Odd");
    }

    #[tokio::test]

    async fn test_create_schedule_entry() {
        let pool = setup_test_db().await;
        let repo = ScheduleRepository::new(&pool);

        // 先创建课表
        let schedule_input = CreateScheduleInput {
            version: 1,
            cycle_days: 5,
            periods_per_day: 8,
            cost: 100,
            entries: vec![],
        };
        let schedule = repo.create_schedule(schedule_input).await.unwrap();

        // 创建课表条目
        let entry_input = CreateScheduleEntryInput {
            class_id: 1,
            subject_id: "MATH".to_string(),
            teacher_id: 1,
            day: 0,
            period: 0,
            is_fixed: false,
            week_type: "Every".to_string(),
        };

        let result = repo.create_schedule_entry(schedule.id, entry_input).await;
        assert!(result.is_ok());

        let entry = result.unwrap();
        assert_eq!(entry.schedule_id, schedule.id);
        assert_eq!(entry.class_id, 1);
        assert_eq!(entry.subject_id, "MATH");
    }

    #[tokio::test]

    async fn test_create_schedule_entry_schedule_not_found() {
        let pool = setup_test_db().await;
        let repo = ScheduleRepository::new(&pool);

        let entry_input = CreateScheduleEntryInput {
            class_id: 1,
            subject_id: "MATH".to_string(),
            teacher_id: 1,
            day: 0,
            period: 0,
            is_fixed: false,
            week_type: "Every".to_string(),
        };

        let result = repo.create_schedule_entry(999, entry_input).await;
        assert!(result.is_err());
    }

    #[tokio::test]

    async fn test_update_schedule_entry() {
        let pool = setup_test_db().await;
        let repo = ScheduleRepository::new(&pool);

        // 创建课表和条目
        let schedule_input = CreateScheduleInput {
            version: 1,
            cycle_days: 5,
            periods_per_day: 8,
            cost: 100,
            entries: vec![CreateScheduleEntryInput {
                class_id: 1,
                subject_id: "MATH".to_string(),
                teacher_id: 1,
                day: 0,
                period: 0,
                is_fixed: false,
                week_type: "Every".to_string(),
            }],
        };
        let schedule = repo.create_schedule(schedule_input).await.unwrap();
        let entries = repo.get_schedule_entries(schedule.id).await.unwrap();
        let entry_id = entries[0].id;

        // 更新条目
        let update_input = UpdateScheduleEntryInput {
            class_id: Some(2),
            subject_id: Some("CHINESE".to_string()),
            teacher_id: Some(2),
            day: Some(1),
            period: Some(2),
            is_fixed: Some(true),
            week_type: Some("Odd".to_string()),
        };

        let updated = repo
            .update_schedule_entry(entry_id, update_input)
            .await
            .unwrap();
        assert_eq!(updated.class_id, 2);
        assert_eq!(updated.subject_id, "CHINESE");
        assert_eq!(updated.teacher_id, 2);
        assert_eq!(updated.day, 1);
        assert_eq!(updated.period, 2);
        assert_eq!(updated.is_fixed, 1);
        assert_eq!(updated.week_type, "Odd");
    }

    #[tokio::test]

    async fn test_update_schedule_entry_partial() {
        let pool = setup_test_db().await;
        let repo = ScheduleRepository::new(&pool);

        // 创建课表和条目
        let schedule_input = CreateScheduleInput {
            version: 1,
            cycle_days: 5,
            periods_per_day: 8,
            cost: 100,
            entries: vec![CreateScheduleEntryInput {
                class_id: 1,
                subject_id: "MATH".to_string(),
                teacher_id: 1,
                day: 0,
                period: 0,
                is_fixed: false,
                week_type: "Every".to_string(),
            }],
        };
        let schedule = repo.create_schedule(schedule_input).await.unwrap();
        let entries = repo.get_schedule_entries(schedule.id).await.unwrap();
        let entry_id = entries[0].id;

        // 只更新部分字段
        let update_input = UpdateScheduleEntryInput {
            class_id: None,
            subject_id: None,
            teacher_id: None,
            day: Some(1),
            period: Some(2),
            is_fixed: None,
            week_type: None,
        };

        let updated = repo
            .update_schedule_entry(entry_id, update_input)
            .await
            .unwrap();
        assert_eq!(updated.class_id, 1); // 未改变
        assert_eq!(updated.subject_id, "MATH"); // 未改变
        assert_eq!(updated.day, 1); // 已更新
        assert_eq!(updated.period, 2); // 已更新
    }

    #[tokio::test]

    async fn test_delete_schedule_entry() {
        let pool = setup_test_db().await;
        let repo = ScheduleRepository::new(&pool);

        // 创建课表和条目
        let schedule_input = CreateScheduleInput {
            version: 1,
            cycle_days: 5,
            periods_per_day: 8,
            cost: 100,
            entries: vec![CreateScheduleEntryInput {
                class_id: 1,
                subject_id: "MATH".to_string(),
                teacher_id: 1,
                day: 0,
                period: 0,
                is_fixed: false,
                week_type: "Every".to_string(),
            }],
        };
        let schedule = repo.create_schedule(schedule_input).await.unwrap();
        let entries = repo.get_schedule_entries(schedule.id).await.unwrap();
        let entry_id = entries[0].id;

        // 删除条目
        let result = repo.delete_schedule_entry(entry_id).await;
        assert!(result.is_ok());

        // 验证条目已删除
        let entries = repo.get_schedule_entries(schedule.id).await.unwrap();
        assert_eq!(entries.len(), 0);
    }

    #[tokio::test]

    async fn test_delete_schedule_entry_not_found() {
        let pool = setup_test_db().await;
        let repo = ScheduleRepository::new(&pool);

        let result = repo.delete_schedule_entry(999).await;
        assert!(result.is_err());
    }

    #[tokio::test]

    async fn test_create_schedule_with_many_entries() {
        let pool = setup_test_db().await;
        let repo = ScheduleRepository::new(&pool);

        // 创建包含大量条目的课表
        let mut entries = Vec::new();
        for i in 0..100 {
            entries.push(CreateScheduleEntryInput {
                class_id: (i % 10) + 1,
                subject_id: format!("SUBJECT_{}", i % 5),
                teacher_id: (i % 20) + 1,
                day: i % 5,
                period: i % 8,
                is_fixed: i % 10 == 0,
                week_type: if i % 3 == 0 {
                    "Odd".to_string()
                } else if i % 3 == 1 {
                    "Even".to_string()
                } else {
                    "Every".to_string()
                },
            });
        }

        let input = CreateScheduleInput {
            version: 1,
            cycle_days: 5,
            periods_per_day: 8,
            cost: 100,
            entries,
        };

        let result = repo.create_schedule(input).await;
        assert!(result.is_ok());

        let schedule = result.unwrap();
        let entries = repo.get_schedule_entries(schedule.id).await.unwrap();
        assert_eq!(entries.len(), 100);
    }
}
