// ============================================================================
// 班级数据访问模块单元测试
// ============================================================================

#[cfg(test)]
mod tests {
    use crate::db::class::{ClassRepository, CreateClassInput, UpdateClassInput};
    use sqlx::SqlitePool;

    /// 创建测试数据库连接池
    async fn setup_test_db() -> SqlitePool {
        // 使用内存数据库进行测试
        let pool = SqlitePool::connect("sqlite::memory:")
            .await
            .expect("创建测试数据库失败");

        // 创建班级表
        sqlx::query(
            r#"
            CREATE TABLE IF NOT EXISTS classes (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL UNIQUE,
                grade_level INTEGER,
                created_at TEXT NOT NULL DEFAULT (datetime('now')),
                updated_at TEXT NOT NULL DEFAULT (datetime('now'))
            )
            "#,
        )
        .execute(&pool)
        .await
        .expect("创建 classes 表失败");

        pool
    }

    #[tokio::test]
    async fn test_create_class() {
        let pool = setup_test_db().await;
        let repo = ClassRepository::new(&pool);

        let input = CreateClassInput {
            name: "初一(1)班".to_string(),
            grade_level: Some(7),
        };

        let class = repo.create(input).await.expect("创建班级失败");

        assert_eq!(class.name, "初一(1)班");
        assert_eq!(class.grade_level, Some(7));
        assert!(class.id > 0);
    }

    #[tokio::test]
    async fn test_find_class_by_id() {
        let pool = setup_test_db().await;
        let repo = ClassRepository::new(&pool);

        // 创建班级
        let input = CreateClassInput {
            name: "初一(2)班".to_string(),
            grade_level: Some(7),
        };
        let created = repo.create(input).await.expect("创建班级失败");

        // 查询班级
        let found = repo
            .find_by_id(created.id)
            .await
            .expect("查询班级失败")
            .expect("班级不存在");

        assert_eq!(found.id, created.id);
        assert_eq!(found.name, "初一(2)班");
        assert_eq!(found.grade_level, Some(7));
    }

    #[tokio::test]
    async fn test_find_all_classes() {
        let pool = setup_test_db().await;
        let repo = ClassRepository::new(&pool);

        // 创建多个班级
        repo.create(CreateClassInput {
            name: "初一(1)班".to_string(),
            grade_level: Some(7),
        })
        .await
        .expect("创建班级失败");

        repo.create(CreateClassInput {
            name: "初一(2)班".to_string(),
            grade_level: Some(7),
        })
        .await
        .expect("创建班级失败");

        repo.create(CreateClassInput {
            name: "初二(1)班".to_string(),
            grade_level: Some(8),
        })
        .await
        .expect("创建班级失败");

        // 查询所有班级
        let classes = repo.find_all().await.expect("查询班级失败");

        assert_eq!(classes.len(), 3);
    }

    #[tokio::test]
    async fn test_find_classes_by_grade_level() {
        let pool = setup_test_db().await;
        let repo = ClassRepository::new(&pool);

        // 创建不同年级的班级
        repo.create(CreateClassInput {
            name: "初一(1)班".to_string(),
            grade_level: Some(7),
        })
        .await
        .expect("创建班级失败");

        repo.create(CreateClassInput {
            name: "初一(2)班".to_string(),
            grade_level: Some(7),
        })
        .await
        .expect("创建班级失败");

        repo.create(CreateClassInput {
            name: "初二(1)班".to_string(),
            grade_level: Some(8),
        })
        .await
        .expect("创建班级失败");

        // 查询初一年级的班级
        let grade_7_classes = repo.find_by_grade_level(7).await.expect("查询班级失败");

        assert_eq!(grade_7_classes.len(), 2);
        assert!(grade_7_classes.iter().all(|c| c.grade_level == Some(7)));

        // 查询初二年级的班级
        let grade_8_classes = repo.find_by_grade_level(8).await.expect("查询班级失败");

        assert_eq!(grade_8_classes.len(), 1);
        assert_eq!(grade_8_classes[0].name, "初二(1)班");
    }

    #[tokio::test]
    async fn test_update_class() {
        let pool = setup_test_db().await;
        let repo = ClassRepository::new(&pool);

        // 创建班级
        let created = repo
            .create(CreateClassInput {
                name: "初一(1)班".to_string(),
                grade_level: Some(7),
            })
            .await
            .expect("创建班级失败");

        // 更新班级名称
        let updated = repo
            .update(
                created.id,
                UpdateClassInput {
                    name: Some("初二(1)班".to_string()),
                    grade_level: Some(8),
                },
            )
            .await
            .expect("更新班级失败");

        assert_eq!(updated.name, "初二(1)班");
        assert_eq!(updated.grade_level, Some(8));
    }

    #[tokio::test]
    async fn test_update_class_name_only() {
        let pool = setup_test_db().await;
        let repo = ClassRepository::new(&pool);

        // 创建班级
        let created = repo
            .create(CreateClassInput {
                name: "初一(1)班".to_string(),
                grade_level: Some(7),
            })
            .await
            .expect("创建班级失败");

        // 只更新班级名称
        let updated = repo
            .update(
                created.id,
                UpdateClassInput {
                    name: Some("初一(甲)班".to_string()),
                    grade_level: None,
                },
            )
            .await
            .expect("更新班级失败");

        assert_eq!(updated.name, "初一(甲)班");
        assert_eq!(updated.grade_level, Some(7)); // 年级保持不变
    }

    #[tokio::test]
    async fn test_delete_class() {
        let pool = setup_test_db().await;
        let repo = ClassRepository::new(&pool);

        // 创建班级
        let created = repo
            .create(CreateClassInput {
                name: "待删除班级".to_string(),
                grade_level: Some(7),
            })
            .await
            .expect("创建班级失败");

        // 删除班级
        repo.delete(created.id).await.expect("删除班级失败");

        // 验证已删除
        let found = repo.find_by_id(created.id).await.expect("查询班级失败");
        assert!(found.is_none());
    }

    #[tokio::test]
    async fn test_delete_nonexistent_class() {
        let pool = setup_test_db().await;
        let repo = ClassRepository::new(&pool);

        // 尝试删除不存在的班级
        let result = repo.delete(999).await;

        assert!(result.is_err());
        match result {
            Err(sqlx::Error::RowNotFound) => {
                // 预期的错误
            }
            _ => panic!("应该返回 RowNotFound 错误"),
        }
    }

    #[tokio::test]
    async fn test_create_class_without_grade_level() {
        let pool = setup_test_db().await;
        let repo = ClassRepository::new(&pool);

        let input = CreateClassInput {
            name: "特殊班级".to_string(),
            grade_level: None,
        };

        let class = repo.create(input).await.expect("创建班级失败");

        assert_eq!(class.name, "特殊班级");
        assert_eq!(class.grade_level, None);
    }

    #[tokio::test]
    async fn test_update_class_no_changes() {
        let pool = setup_test_db().await;
        let repo = ClassRepository::new(&pool);

        // 创建班级
        let created = repo
            .create(CreateClassInput {
                name: "初一(1)班".to_string(),
                grade_level: Some(7),
            })
            .await
            .expect("创建班级失败");

        // 不更新任何字段
        let updated = repo
            .update(
                created.id,
                UpdateClassInput {
                    name: None,
                    grade_level: None,
                },
            )
            .await
            .expect("更新班级失败");

        // 应该返回原始数据
        assert_eq!(updated.name, created.name);
        assert_eq!(updated.grade_level, created.grade_level);
    }
}
