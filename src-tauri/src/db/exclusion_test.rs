// ============================================================================
// 教师互斥关系数据访问模块单元测试
// ============================================================================

#[cfg(test)]
mod tests {
    use crate::db::exclusion::{
        CreateTeacherMutualExclusionInput, ExclusionScope, TeacherMutualExclusionRepository,
        UpdateTeacherMutualExclusionInput,
    };
    use crate::db::teacher::{CreateTeacherInput, TeacherRepository};
    use sqlx::SqlitePool;

    /// 创建测试数据库连接池
    async fn setup_test_db() -> SqlitePool {
        let pool = SqlitePool::connect("sqlite::memory:")
            .await
            .expect("创建内存数据库失败");

        // 创建教师表
        sqlx::query(
            r#"
            CREATE TABLE teachers (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                teaching_group_id INTEGER,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL
            )
            "#,
        )
        .execute(&pool)
        .await
        .expect("创建教师表失败");

        // 创建教师互斥关系表
        sqlx::query(
            r#"
            CREATE TABLE teacher_mutual_exclusions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                teacher_a_id INTEGER NOT NULL,
                teacher_b_id INTEGER NOT NULL,
                scope_type TEXT NOT NULL,
                specific_slots TEXT,
                created_at TEXT NOT NULL,
                FOREIGN KEY (teacher_a_id) REFERENCES teachers(id),
                FOREIGN KEY (teacher_b_id) REFERENCES teachers(id)
            )
            "#,
        )
        .execute(&pool)
        .await
        .expect("创建教师互斥关系表失败");

        pool
    }

    /// 创建测试教师
    async fn create_test_teacher(pool: &SqlitePool, name: &str) -> i64 {
        let teacher_repo = TeacherRepository::new(pool);
        let teacher = teacher_repo
            .create(CreateTeacherInput {
                name: name.to_string(),
                teaching_group_id: None,
            })
            .await
            .expect("创建测试教师失败");
        teacher.id
    }

    #[tokio::test]
    async fn test_create_exclusion_all_time() {
        let pool = setup_test_db().await;
        let repo = TeacherMutualExclusionRepository::new(&pool);

        // 创建两位测试教师
        let teacher_a_id = create_test_teacher(&pool, "张老师").await;
        let teacher_b_id = create_test_teacher(&pool, "李老师").await;

        // 创建全时段互斥关系
        let input = CreateTeacherMutualExclusionInput {
            teacher_a_id,
            teacher_b_id,
            scope: ExclusionScope::AllTime,
        };

        let result = repo.create(input).await;
        assert!(result.is_ok(), "创建全时段互斥关系应该成功");

        let exclusion = result.unwrap();
        assert_eq!(exclusion.teacher_a_id, teacher_a_id);
        assert_eq!(exclusion.teacher_b_id, teacher_b_id);
        assert_eq!(exclusion.scope_type, "AllTime");
        assert!(exclusion.specific_slots.is_none());
    }

    #[tokio::test]
    async fn test_create_exclusion_specific_slots() {
        let pool = setup_test_db().await;
        let repo = TeacherMutualExclusionRepository::new(&pool);

        // 创建两位测试教师
        let teacher_a_id = create_test_teacher(&pool, "王老师").await;
        let teacher_b_id = create_test_teacher(&pool, "赵老师").await;

        // 创建特定时段互斥关系（位掩码：0b1111 表示前4个时段）
        let mask = 0b1111u64;
        let input = CreateTeacherMutualExclusionInput {
            teacher_a_id,
            teacher_b_id,
            scope: ExclusionScope::SpecificSlots { mask },
        };

        let result = repo.create(input).await;
        assert!(result.is_ok(), "创建特定时段互斥关系应该成功");

        let exclusion = result.unwrap();
        assert_eq!(exclusion.teacher_a_id, teacher_a_id);
        assert_eq!(exclusion.teacher_b_id, teacher_b_id);
        assert_eq!(exclusion.scope_type, "SpecificSlots");
        assert!(exclusion.specific_slots.is_some());
        assert_eq!(exclusion.specific_slots.unwrap(), mask.to_string());
    }

    #[tokio::test]
    async fn test_create_exclusion_same_teacher() {
        let pool = setup_test_db().await;
        let repo = TeacherMutualExclusionRepository::new(&pool);

        // 创建一位测试教师
        let teacher_id = create_test_teacher(&pool, "孙老师").await;

        // 尝试创建同一教师的互斥关系（应该失败）
        let input = CreateTeacherMutualExclusionInput {
            teacher_a_id: teacher_id,
            teacher_b_id: teacher_id,
            scope: ExclusionScope::AllTime,
        };

        let result = repo.create(input).await;
        assert!(result.is_err(), "创建同一教师的互斥关系应该失败");
    }

    #[tokio::test]
    async fn test_find_by_id() {
        let pool = setup_test_db().await;
        let repo = TeacherMutualExclusionRepository::new(&pool);

        // 创建两位测试教师
        let teacher_a_id = create_test_teacher(&pool, "周老师").await;
        let teacher_b_id = create_test_teacher(&pool, "吴老师").await;

        // 创建互斥关系
        let input = CreateTeacherMutualExclusionInput {
            teacher_a_id,
            teacher_b_id,
            scope: ExclusionScope::AllTime,
        };
        let created = repo.create(input).await.unwrap();

        // 根据 ID 查询
        let result = repo.find_by_id(created.id).await;
        assert!(result.is_ok());

        let found = result.unwrap();
        assert!(found.is_some());

        let exclusion = found.unwrap();
        assert_eq!(exclusion.id, created.id);
        assert_eq!(exclusion.teacher_a_id, teacher_a_id);
        assert_eq!(exclusion.teacher_b_id, teacher_b_id);
    }

    #[tokio::test]
    async fn test_find_by_id_not_found() {
        let pool = setup_test_db().await;
        let repo = TeacherMutualExclusionRepository::new(&pool);

        // 查询不存在的 ID
        let result = repo.find_by_id(999).await;
        assert!(result.is_ok());

        let found = result.unwrap();
        assert!(found.is_none(), "查询不存在的 ID 应该返回 None");
    }

    #[tokio::test]
    async fn test_find_all() {
        let pool = setup_test_db().await;
        let repo = TeacherMutualExclusionRepository::new(&pool);

        // 创建多位测试教师
        let teacher1 = create_test_teacher(&pool, "郑老师").await;
        let teacher2 = create_test_teacher(&pool, "钱老师").await;
        let teacher3 = create_test_teacher(&pool, "冯老师").await;

        // 创建多个互斥关系
        repo.create(CreateTeacherMutualExclusionInput {
            teacher_a_id: teacher1,
            teacher_b_id: teacher2,
            scope: ExclusionScope::AllTime,
        })
        .await
        .unwrap();

        repo.create(CreateTeacherMutualExclusionInput {
            teacher_a_id: teacher2,
            teacher_b_id: teacher3,
            scope: ExclusionScope::SpecificSlots { mask: 0xFF },
        })
        .await
        .unwrap();

        // 查询所有互斥关系
        let result = repo.find_all().await;
        assert!(result.is_ok());

        let exclusions = result.unwrap();
        assert_eq!(exclusions.len(), 2, "应该有2个互斥关系");
    }

    #[tokio::test]
    async fn test_find_by_teacher() {
        let pool = setup_test_db().await;
        let repo = TeacherMutualExclusionRepository::new(&pool);

        // 创建多位测试教师
        let teacher1 = create_test_teacher(&pool, "陈老师").await;
        let teacher2 = create_test_teacher(&pool, "褚老师").await;
        let teacher3 = create_test_teacher(&pool, "卫老师").await;

        // 创建互斥关系：teacher1 与 teacher2、teacher3 互斥
        repo.create(CreateTeacherMutualExclusionInput {
            teacher_a_id: teacher1,
            teacher_b_id: teacher2,
            scope: ExclusionScope::AllTime,
        })
        .await
        .unwrap();

        repo.create(CreateTeacherMutualExclusionInput {
            teacher_a_id: teacher1,
            teacher_b_id: teacher3,
            scope: ExclusionScope::AllTime,
        })
        .await
        .unwrap();

        // 查询 teacher1 的互斥关系
        let result = repo.find_by_teacher(teacher1).await;
        assert!(result.is_ok());

        let exclusions = result.unwrap();
        assert_eq!(exclusions.len(), 2, "teacher1 应该有2个互斥关系");

        // 查询 teacher2 的互斥关系
        let result = repo.find_by_teacher(teacher2).await;
        assert!(result.is_ok());

        let exclusions = result.unwrap();
        assert_eq!(exclusions.len(), 1, "teacher2 应该有1个互斥关系");
    }

    #[tokio::test]
    async fn test_find_between_teachers() {
        let pool = setup_test_db().await;
        let repo = TeacherMutualExclusionRepository::new(&pool);

        // 创建两位测试教师
        let teacher_a_id = create_test_teacher(&pool, "蒋老师").await;
        let teacher_b_id = create_test_teacher(&pool, "沈老师").await;

        // 创建互斥关系
        repo.create(CreateTeacherMutualExclusionInput {
            teacher_a_id,
            teacher_b_id,
            scope: ExclusionScope::AllTime,
        })
        .await
        .unwrap();

        // 查询两位教师之间的互斥关系（正向）
        let result = repo.find_between_teachers(teacher_a_id, teacher_b_id).await;
        assert!(result.is_ok());
        assert!(result.unwrap().is_some(), "应该找到互斥关系");

        // 查询两位教师之间的互斥关系（反向）
        let result = repo.find_between_teachers(teacher_b_id, teacher_a_id).await;
        assert!(result.is_ok());
        assert!(result.unwrap().is_some(), "反向查询也应该找到互斥关系");
    }

    #[tokio::test]
    async fn test_find_between_teachers_not_found() {
        let pool = setup_test_db().await;
        let repo = TeacherMutualExclusionRepository::new(&pool);

        // 创建两位测试教师
        let teacher_a_id = create_test_teacher(&pool, "韩老师").await;
        let teacher_b_id = create_test_teacher(&pool, "杨老师").await;

        // 不创建互斥关系，直接查询
        let result = repo.find_between_teachers(teacher_a_id, teacher_b_id).await;
        assert!(result.is_ok());
        assert!(result.unwrap().is_none(), "未创建互斥关系时应该返回 None");
    }

    #[tokio::test]
    async fn test_update() {
        let pool = setup_test_db().await;
        let repo = TeacherMutualExclusionRepository::new(&pool);

        // 创建两位测试教师
        let teacher_a_id = create_test_teacher(&pool, "朱老师").await;
        let teacher_b_id = create_test_teacher(&pool, "秦老师").await;

        // 创建全时段互斥关系
        let created = repo
            .create(CreateTeacherMutualExclusionInput {
                teacher_a_id,
                teacher_b_id,
                scope: ExclusionScope::AllTime,
            })
            .await
            .unwrap();

        assert_eq!(created.scope_type, "AllTime");

        // 更新为特定时段互斥
        let mask = 0xFFFFu64;
        let update_input = UpdateTeacherMutualExclusionInput {
            scope: Some(ExclusionScope::SpecificSlots { mask }),
        };

        let result = repo.update(created.id, update_input).await;
        assert!(result.is_ok(), "更新互斥关系应该成功");

        let updated = result.unwrap();
        assert_eq!(updated.scope_type, "SpecificSlots");
        assert!(updated.specific_slots.is_some());
        assert_eq!(updated.specific_slots.unwrap(), mask.to_string());
    }

    #[tokio::test]
    async fn test_delete() {
        let pool = setup_test_db().await;
        let repo = TeacherMutualExclusionRepository::new(&pool);

        // 创建两位测试教师
        let teacher_a_id = create_test_teacher(&pool, "尤老师").await;
        let teacher_b_id = create_test_teacher(&pool, "许老师").await;

        // 创建互斥关系
        let created = repo
            .create(CreateTeacherMutualExclusionInput {
                teacher_a_id,
                teacher_b_id,
                scope: ExclusionScope::AllTime,
            })
            .await
            .unwrap();

        // 删除互斥关系
        let result = repo.delete(created.id).await;
        assert!(result.is_ok(), "删除互斥关系应该成功");

        // 验证已删除
        let found = repo.find_by_id(created.id).await.unwrap();
        assert!(found.is_none(), "删除后应该查询不到");
    }

    #[tokio::test]
    async fn test_delete_not_found() {
        let pool = setup_test_db().await;
        let repo = TeacherMutualExclusionRepository::new(&pool);

        // 删除不存在的互斥关系
        let result = repo.delete(999).await;
        assert!(result.is_err(), "删除不存在的互斥关系应该失败");
    }

    #[tokio::test]
    async fn test_batch_create() {
        let pool = setup_test_db().await;
        let repo = TeacherMutualExclusionRepository::new(&pool);

        // 创建多位测试教师
        let teacher1 = create_test_teacher(&pool, "何老师").await;
        let teacher2 = create_test_teacher(&pool, "吕老师").await;
        let teacher3 = create_test_teacher(&pool, "施老师").await;
        let teacher4 = create_test_teacher(&pool, "张老师").await;

        // 批量创建互斥关系
        let inputs = vec![
            CreateTeacherMutualExclusionInput {
                teacher_a_id: teacher1,
                teacher_b_id: teacher2,
                scope: ExclusionScope::AllTime,
            },
            CreateTeacherMutualExclusionInput {
                teacher_a_id: teacher3,
                teacher_b_id: teacher4,
                scope: ExclusionScope::SpecificSlots { mask: 0xFF },
            },
        ];

        let result = repo.batch_create(inputs).await;
        assert!(result.is_ok(), "批量创建应该成功");
        assert_eq!(result.unwrap(), 2, "应该创建2个互斥关系");

        // 验证创建结果
        let all_exclusions = repo.find_all().await.unwrap();
        assert_eq!(all_exclusions.len(), 2);
    }

    #[tokio::test]
    async fn test_batch_create_empty() {
        let pool = setup_test_db().await;
        let repo = TeacherMutualExclusionRepository::new(&pool);

        // 批量创建空列表
        let result = repo.batch_create(vec![]).await;
        assert!(result.is_ok());
        assert_eq!(result.unwrap(), 0, "空列表应该返回0");
    }

    #[tokio::test]
    async fn test_batch_create_with_invalid_data() {
        let pool = setup_test_db().await;
        let repo = TeacherMutualExclusionRepository::new(&pool);

        // 创建一位测试教师
        let teacher_id = create_test_teacher(&pool, "孔老师").await;

        // 批量创建包含无效数据（同一教师）
        let inputs = vec![CreateTeacherMutualExclusionInput {
            teacher_a_id: teacher_id,
            teacher_b_id: teacher_id,
            scope: ExclusionScope::AllTime,
        }];

        let result = repo.batch_create(inputs).await;
        assert!(result.is_err(), "包含无效数据的批量创建应该失败");
    }
}
