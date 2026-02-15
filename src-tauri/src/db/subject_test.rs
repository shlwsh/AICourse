// ============================================================================
// 科目配置数据访问模块单元测试
// ============================================================================
// 本模块测试科目配置相关的数据库操作
//
// 测试覆盖：
// - 创建科目配置
// - 查询科目配置（按 ID、全部、按场地、主科）
// - 更新科目配置
// - 删除科目配置
// - 批量创建科目配置
// - 错误处理（不存在的记录、重复 ID 等）
// ============================================================================

#[cfg(test)]
mod tests {
    use crate::db::subject::{
        CreateSubjectConfigInput, SubjectConfigRepository, UpdateSubjectConfigInput,
    };
    use sqlx::SqlitePool;

    /// 创建测试数据库连接池
    async fn setup_test_db() -> SqlitePool {
        // 使用内存数据库进行测试
        let pool = SqlitePool::connect("sqlite::memory:")
            .await
            .expect("无法创建测试数据库连接");

        // 创建表结构
        sqlx::query(
            r#"
            CREATE TABLE subject_configs (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                forbidden_slots TEXT NOT NULL,
                allow_double_session INTEGER NOT NULL DEFAULT 1,
                venue_id TEXT,
                is_major_subject INTEGER NOT NULL DEFAULT 0,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL
            )
            "#,
        )
        .execute(&pool)
        .await
        .expect("无法创建 subject_configs 表");

        pool
    }

    /// 创建测试科目配置输入数据
    fn create_test_subject_input(id: &str, name: &str) -> CreateSubjectConfigInput {
        CreateSubjectConfigInput {
            id: id.to_string(),
            name: name.to_string(),
            forbidden_slots: 0,
            allow_double_session: true,
            venue_id: None,
            is_major_subject: false,
        }
    }

    #[tokio::test]
    async fn test_create_subject_config() {
        let pool = setup_test_db().await;
        let repo = SubjectConfigRepository::new(&pool);

        let input = create_test_subject_input("math", "数学");
        let result = repo.create(input).await;

        assert!(result.is_ok());
        let subject = result.unwrap();
        assert_eq!(subject.id, "math");
        assert_eq!(subject.name, "数学");
        assert_eq!(subject.forbidden_slots, "0");
        assert_eq!(subject.allow_double_session, 1);
        assert_eq!(subject.is_major_subject, 0);
    }

    #[tokio::test]
    async fn test_create_subject_config_with_venue() {
        let pool = setup_test_db().await;
        let repo = SubjectConfigRepository::new(&pool);

        let input = CreateSubjectConfigInput {
            id: "pe".to_string(),
            name: "体育".to_string(),
            forbidden_slots: 7, // 禁止前3节
            allow_double_session: false,
            venue_id: Some("playground".to_string()),
            is_major_subject: false,
        };

        let result = repo.create(input).await;

        assert!(result.is_ok());
        let subject = result.unwrap();
        assert_eq!(subject.id, "pe");
        assert_eq!(subject.name, "体育");
        assert_eq!(subject.forbidden_slots, "7");
        assert_eq!(subject.allow_double_session, 0);
        assert_eq!(subject.venue_id, Some("playground".to_string()));
    }

    #[tokio::test]
    async fn test_create_major_subject() {
        let pool = setup_test_db().await;
        let repo = SubjectConfigRepository::new(&pool);

        let input = CreateSubjectConfigInput {
            id: "chinese".to_string(),
            name: "语文".to_string(),
            forbidden_slots: 0,
            allow_double_session: true,
            venue_id: None,
            is_major_subject: true,
        };

        let result = repo.create(input).await;

        assert!(result.is_ok());
        let subject = result.unwrap();
        assert_eq!(subject.is_major_subject, 1);
    }

    #[tokio::test]
    async fn test_create_duplicate_id() {
        let pool = setup_test_db().await;
        let repo = SubjectConfigRepository::new(&pool);

        let input1 = create_test_subject_input("math", "数学");
        let result1 = repo.create(input1).await;
        assert!(result1.is_ok());

        // 尝试创建相同 ID 的科目配置
        let input2 = create_test_subject_input("math", "数学2");
        let result2 = repo.create(input2).await;
        assert!(result2.is_err());
    }

    #[tokio::test]
    async fn test_find_by_id() {
        let pool = setup_test_db().await;
        let repo = SubjectConfigRepository::new(&pool);

        // 创建科目配置
        let input = create_test_subject_input("math", "数学");
        repo.create(input).await.unwrap();

        // 查询科目配置
        let result = repo.find_by_id("math").await;
        assert!(result.is_ok());
        let subject = result.unwrap();
        assert!(subject.is_some());
        assert_eq!(subject.unwrap().name, "数学");
    }

    #[tokio::test]
    async fn test_find_by_id_not_found() {
        let pool = setup_test_db().await;
        let repo = SubjectConfigRepository::new(&pool);

        let result = repo.find_by_id("nonexistent").await;
        assert!(result.is_ok());
        assert!(result.unwrap().is_none());
    }

    #[tokio::test]
    async fn test_find_all() {
        let pool = setup_test_db().await;
        let repo = SubjectConfigRepository::new(&pool);

        // 创建多个科目配置
        repo.create(create_test_subject_input("math", "数学"))
            .await
            .unwrap();
        repo.create(create_test_subject_input("chinese", "语文"))
            .await
            .unwrap();
        repo.create(create_test_subject_input("english", "英语"))
            .await
            .unwrap();

        // 查询所有科目配置
        let result = repo.find_all().await;
        assert!(result.is_ok());
        let subjects = result.unwrap();
        assert_eq!(subjects.len(), 3);
    }

    #[tokio::test]
    async fn test_find_all_empty() {
        let pool = setup_test_db().await;
        let repo = SubjectConfigRepository::new(&pool);

        let result = repo.find_all().await;
        assert!(result.is_ok());
        let subjects = result.unwrap();
        assert_eq!(subjects.len(), 0);
    }

    #[tokio::test]
    async fn test_find_by_venue() {
        let pool = setup_test_db().await;
        let repo = SubjectConfigRepository::new(&pool);

        // 创建带场地的科目配置
        let input1 = CreateSubjectConfigInput {
            id: "pe".to_string(),
            name: "体育".to_string(),
            forbidden_slots: 0,
            allow_double_session: true,
            venue_id: Some("playground".to_string()),
            is_major_subject: false,
        };
        repo.create(input1).await.unwrap();

        let input2 = CreateSubjectConfigInput {
            id: "computer".to_string(),
            name: "微机".to_string(),
            forbidden_slots: 0,
            allow_double_session: false,
            venue_id: Some("computer_room".to_string()),
            is_major_subject: false,
        };
        repo.create(input2).await.unwrap();

        // 查询特定场地的科目配置
        let result = repo.find_by_venue("playground").await;
        assert!(result.is_ok());
        let subjects = result.unwrap();
        assert_eq!(subjects.len(), 1);
        assert_eq!(subjects[0].id, "pe");
    }

    #[tokio::test]
    async fn test_find_major_subjects() {
        let pool = setup_test_db().await;
        let repo = SubjectConfigRepository::new(&pool);

        // 创建主科和非主科
        let input1 = CreateSubjectConfigInput {
            id: "math".to_string(),
            name: "数学".to_string(),
            forbidden_slots: 0,
            allow_double_session: true,
            venue_id: None,
            is_major_subject: true,
        };
        repo.create(input1).await.unwrap();

        let input2 = CreateSubjectConfigInput {
            id: "chinese".to_string(),
            name: "语文".to_string(),
            forbidden_slots: 0,
            allow_double_session: true,
            venue_id: None,
            is_major_subject: true,
        };
        repo.create(input2).await.unwrap();

        let input3 = CreateSubjectConfigInput {
            id: "art".to_string(),
            name: "美术".to_string(),
            forbidden_slots: 0,
            allow_double_session: false,
            venue_id: None,
            is_major_subject: false,
        };
        repo.create(input3).await.unwrap();

        // 查询主科
        let result = repo.find_major_subjects().await;
        assert!(result.is_ok());
        let subjects = result.unwrap();
        assert_eq!(subjects.len(), 2);
    }

    #[tokio::test]
    async fn test_update_subject_config() {
        let pool = setup_test_db().await;
        let repo = SubjectConfigRepository::new(&pool);

        // 创建科目配置
        let input = create_test_subject_input("math", "数学");
        repo.create(input).await.unwrap();

        // 更新科目配置
        let update_input = UpdateSubjectConfigInput {
            name: Some("高等数学".to_string()),
            forbidden_slots: Some(15),
            allow_double_session: Some(false),
            venue_id: None,
            is_major_subject: Some(true),
        };

        let result = repo.update("math", update_input).await;
        assert!(result.is_ok());
        let subject = result.unwrap();
        assert_eq!(subject.name, "高等数学");
        assert_eq!(subject.forbidden_slots, "15");
        assert_eq!(subject.allow_double_session, 0);
        assert_eq!(subject.is_major_subject, 1);
    }

    #[tokio::test]
    async fn test_update_partial_fields() {
        let pool = setup_test_db().await;
        let repo = SubjectConfigRepository::new(&pool);

        // 创建科目配置
        let input = create_test_subject_input("math", "数学");
        repo.create(input).await.unwrap();

        // 只更新名称
        let update_input = UpdateSubjectConfigInput {
            name: Some("数学A".to_string()),
            forbidden_slots: None,
            allow_double_session: None,
            venue_id: None,
            is_major_subject: None,
        };

        let result = repo.update("math", update_input).await;
        assert!(result.is_ok());
        let subject = result.unwrap();
        assert_eq!(subject.name, "数学A");
        assert_eq!(subject.forbidden_slots, "0"); // 保持原值
    }

    #[tokio::test]
    async fn test_update_nonexistent() {
        let pool = setup_test_db().await;
        let repo = SubjectConfigRepository::new(&pool);

        let update_input = UpdateSubjectConfigInput {
            name: Some("新名称".to_string()),
            forbidden_slots: None,
            allow_double_session: None,
            venue_id: None,
            is_major_subject: None,
        };

        let result = repo.update("nonexistent", update_input).await;
        assert!(result.is_err());
    }

    #[tokio::test]
    async fn test_delete_subject_config() {
        let pool = setup_test_db().await;
        let repo = SubjectConfigRepository::new(&pool);

        // 创建科目配置
        let input = create_test_subject_input("math", "数学");
        repo.create(input).await.unwrap();

        // 删除科目配置
        let result = repo.delete("math").await;
        assert!(result.is_ok());

        // 验证已删除
        let find_result = repo.find_by_id("math").await;
        assert!(find_result.is_ok());
        assert!(find_result.unwrap().is_none());
    }

    #[tokio::test]
    async fn test_delete_nonexistent() {
        let pool = setup_test_db().await;
        let repo = SubjectConfigRepository::new(&pool);

        let result = repo.delete("nonexistent").await;
        assert!(result.is_err());
    }

    #[tokio::test]
    async fn test_batch_create() {
        let pool = setup_test_db().await;
        let repo = SubjectConfigRepository::new(&pool);

        let inputs = vec![
            create_test_subject_input("math", "数学"),
            create_test_subject_input("chinese", "语文"),
            create_test_subject_input("english", "英语"),
        ];

        let result = repo.batch_create(inputs).await;
        assert!(result.is_ok());
        assert_eq!(result.unwrap(), 3);

        // 验证所有科目配置都已创建
        let all_subjects = repo.find_all().await.unwrap();
        assert_eq!(all_subjects.len(), 3);
    }

    #[tokio::test]
    async fn test_batch_create_empty() {
        let pool = setup_test_db().await;
        let repo = SubjectConfigRepository::new(&pool);

        let inputs = vec![];
        let result = repo.batch_create(inputs).await;
        assert!(result.is_ok());
        assert_eq!(result.unwrap(), 0);
    }

    #[tokio::test]
    async fn test_batch_create_with_duplicate() {
        let pool = setup_test_db().await;
        let repo = SubjectConfigRepository::new(&pool);

        // 先创建一个科目配置
        repo.create(create_test_subject_input("math", "数学"))
            .await
            .unwrap();

        // 批量创建包含重复 ID 的科目配置
        let inputs = vec![
            create_test_subject_input("math", "数学2"), // 重复 ID
            create_test_subject_input("chinese", "语文"),
        ];

        let result = repo.batch_create(inputs).await;
        // 应该失败并回滚
        assert!(result.is_err());

        // 验证事务回滚，chinese 也没有创建
        let chinese = repo.find_by_id("chinese").await.unwrap();
        assert!(chinese.is_none());
    }

    #[tokio::test]
    async fn test_forbidden_slots_mask() {
        let pool = setup_test_db().await;
        let repo = SubjectConfigRepository::new(&pool);

        // 测试不同的禁止时段掩码
        let input = CreateSubjectConfigInput {
            id: "pe".to_string(),
            name: "体育".to_string(),
            forbidden_slots: 0b111, // 禁止前3节（二进制：111）
            allow_double_session: false,
            venue_id: None,
            is_major_subject: false,
        };

        let result = repo.create(input).await;
        assert!(result.is_ok());
        let subject = result.unwrap();
        assert_eq!(subject.forbidden_slots, "7"); // 7 的二进制是 111
    }

    #[tokio::test]
    async fn test_large_forbidden_slots_mask() {
        let pool = setup_test_db().await;
        let repo = SubjectConfigRepository::new(&pool);

        // 测试大的掩码值（u64 最大值）
        let input = CreateSubjectConfigInput {
            id: "test".to_string(),
            name: "测试".to_string(),
            forbidden_slots: u64::MAX,
            allow_double_session: true,
            venue_id: None,
            is_major_subject: false,
        };

        let result = repo.create(input).await;
        assert!(result.is_ok());
        let subject = result.unwrap();
        assert_eq!(subject.forbidden_slots, u64::MAX.to_string());
    }
}
