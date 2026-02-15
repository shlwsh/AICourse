// ============================================================================
// 场地数据访问模块测试
// ============================================================================
// 本模块测试场地相关的数据库操作
//
// 测试覆盖：
// - 创建场地
// - 查询场地（按 ID、查询所有）
// - 更新场地信息
// - 删除场地
// - 边界条件和错误处理
// ============================================================================

#[cfg(test)]
mod tests {
    use crate::db::venue::{CreateVenueInput, UpdateVenueInput, VenueRepository};
    use sqlx::SqlitePool;

    /// 创建测试数据库连接池
    async fn setup_test_db() -> SqlitePool {
        // 使用内存数据库进行测试
        let pool = SqlitePool::connect("sqlite::memory:")
            .await
            .expect("Failed to create test database");

        // 创建 venues 表
        sqlx::query(
            r#"
            CREATE TABLE venues (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                capacity INTEGER NOT NULL,
                created_at TEXT NOT NULL
            )
            "#,
        )
        .execute(&pool)
        .await
        .expect("Failed to create venues table");

        pool
    }

    #[tokio::test]
    async fn test_create_venue() {
        let pool = setup_test_db().await;
        let repo = VenueRepository::new(&pool);

        let input = CreateVenueInput {
            id: "computer_room".to_string(),
            name: "微机室".to_string(),
            capacity: 1,
        };

        let result = repo.create(input).await;
        assert!(result.is_ok());

        let venue = result.unwrap();
        assert_eq!(venue.id, "computer_room");
        assert_eq!(venue.name, "微机室");
        assert_eq!(venue.capacity, 1);
        assert!(!venue.created_at.is_empty());
    }

    #[tokio::test]
    async fn test_create_venue_with_invalid_capacity() {
        let pool = setup_test_db().await;
        let repo = VenueRepository::new(&pool);

        let input = CreateVenueInput {
            id: "invalid_venue".to_string(),
            name: "无效场地".to_string(),
            capacity: 0, // 无效容量
        };

        let result = repo.create(input).await;
        assert!(result.is_err());
    }

    #[tokio::test]
    async fn test_create_venue_with_negative_capacity() {
        let pool = setup_test_db().await;
        let repo = VenueRepository::new(&pool);

        let input = CreateVenueInput {
            id: "invalid_venue".to_string(),
            name: "无效场地".to_string(),
            capacity: -1, // 负数容量
        };

        let result = repo.create(input).await;
        assert!(result.is_err());
    }

    #[tokio::test]
    async fn test_find_venue_by_id() {
        let pool = setup_test_db().await;
        let repo = VenueRepository::new(&pool);

        // 先创建一个场地
        let input = CreateVenueInput {
            id: "playground".to_string(),
            name: "操场".to_string(),
            capacity: 3,
        };
        repo.create(input).await.unwrap();

        // 查询场地
        let result = repo.find_by_id("playground").await;
        assert!(result.is_ok());

        let venue = result.unwrap();
        assert!(venue.is_some());

        let venue = venue.unwrap();
        assert_eq!(venue.id, "playground");
        assert_eq!(venue.name, "操场");
        assert_eq!(venue.capacity, 3);
    }

    #[tokio::test]
    async fn test_find_venue_by_id_not_found() {
        let pool = setup_test_db().await;
        let repo = VenueRepository::new(&pool);

        let result = repo.find_by_id("nonexistent").await;
        assert!(result.is_ok());

        let venue = result.unwrap();
        assert!(venue.is_none());
    }

    #[tokio::test]
    async fn test_find_all_venues() {
        let pool = setup_test_db().await;
        let repo = VenueRepository::new(&pool);

        // 创建多个场地
        let venues = vec![
            CreateVenueInput {
                id: "computer_room".to_string(),
                name: "微机室".to_string(),
                capacity: 1,
            },
            CreateVenueInput {
                id: "playground".to_string(),
                name: "操场".to_string(),
                capacity: 3,
            },
            CreateVenueInput {
                id: "language_lab".to_string(),
                name: "语音室".to_string(),
                capacity: 2,
            },
        ];

        for input in venues {
            repo.create(input).await.unwrap();
        }

        // 查询所有场地
        let result = repo.find_all().await;
        assert!(result.is_ok());

        let all_venues = result.unwrap();
        assert_eq!(all_venues.len(), 3);

        // 验证按 ID 排序
        assert_eq!(all_venues[0].id, "computer_room");
        assert_eq!(all_venues[1].id, "language_lab");
        assert_eq!(all_venues[2].id, "playground");
    }

    #[tokio::test]
    async fn test_find_all_venues_empty() {
        let pool = setup_test_db().await;
        let repo = VenueRepository::new(&pool);

        let result = repo.find_all().await;
        assert!(result.is_ok());

        let venues = result.unwrap();
        assert_eq!(venues.len(), 0);
    }

    #[tokio::test]
    async fn test_update_venue_name() {
        let pool = setup_test_db().await;
        let repo = VenueRepository::new(&pool);

        // 创建场地
        let input = CreateVenueInput {
            id: "room1".to_string(),
            name: "旧名称".to_string(),
            capacity: 2,
        };
        repo.create(input).await.unwrap();

        // 更新名称
        let update_input = UpdateVenueInput {
            name: Some("新名称".to_string()),
            capacity: None,
        };

        let result = repo.update("room1", update_input).await;
        assert!(result.is_ok());

        let venue = result.unwrap();
        assert_eq!(venue.name, "新名称");
        assert_eq!(venue.capacity, 2); // 容量未变
    }

    #[tokio::test]
    async fn test_update_venue_capacity() {
        let pool = setup_test_db().await;
        let repo = VenueRepository::new(&pool);

        // 创建场地
        let input = CreateVenueInput {
            id: "room2".to_string(),
            name: "测试场地".to_string(),
            capacity: 1,
        };
        repo.create(input).await.unwrap();

        // 更新容量
        let update_input = UpdateVenueInput {
            name: None,
            capacity: Some(5),
        };

        let result = repo.update("room2", update_input).await;
        assert!(result.is_ok());

        let venue = result.unwrap();
        assert_eq!(venue.name, "测试场地"); // 名称未变
        assert_eq!(venue.capacity, 5);
    }

    #[tokio::test]
    async fn test_update_venue_all_fields() {
        let pool = setup_test_db().await;
        let repo = VenueRepository::new(&pool);

        // 创建场地
        let input = CreateVenueInput {
            id: "room3".to_string(),
            name: "旧名称".to_string(),
            capacity: 1,
        };
        repo.create(input).await.unwrap();

        // 更新所有字段
        let update_input = UpdateVenueInput {
            name: Some("新名称".to_string()),
            capacity: Some(3),
        };

        let result = repo.update("room3", update_input).await;
        assert!(result.is_ok());

        let venue = result.unwrap();
        assert_eq!(venue.name, "新名称");
        assert_eq!(venue.capacity, 3);
    }

    #[tokio::test]
    async fn test_update_venue_with_invalid_capacity() {
        let pool = setup_test_db().await;
        let repo = VenueRepository::new(&pool);

        // 创建场地
        let input = CreateVenueInput {
            id: "room4".to_string(),
            name: "测试场地".to_string(),
            capacity: 2,
        };
        repo.create(input).await.unwrap();

        // 尝试更新为无效容量
        let update_input = UpdateVenueInput {
            name: None,
            capacity: Some(0),
        };

        let result = repo.update("room4", update_input).await;
        assert!(result.is_err());
    }

    #[tokio::test]
    async fn test_update_venue_not_found() {
        let pool = setup_test_db().await;
        let repo = VenueRepository::new(&pool);

        let update_input = UpdateVenueInput {
            name: Some("新名称".to_string()),
            capacity: None,
        };

        let result = repo.update("nonexistent", update_input).await;
        assert!(result.is_err());
    }

    #[tokio::test]
    async fn test_update_venue_no_changes() {
        let pool = setup_test_db().await;
        let repo = VenueRepository::new(&pool);

        // 创建场地
        let input = CreateVenueInput {
            id: "room5".to_string(),
            name: "测试场地".to_string(),
            capacity: 2,
        };
        repo.create(input).await.unwrap();

        // 不更新任何字段
        let update_input = UpdateVenueInput {
            name: None,
            capacity: None,
        };

        let result = repo.update("room5", update_input).await;
        assert!(result.is_ok());

        let venue = result.unwrap();
        assert_eq!(venue.name, "测试场地");
        assert_eq!(venue.capacity, 2);
    }

    #[tokio::test]
    async fn test_delete_venue() {
        let pool = setup_test_db().await;
        let repo = VenueRepository::new(&pool);

        // 创建场地
        let input = CreateVenueInput {
            id: "to_delete".to_string(),
            name: "待删除场地".to_string(),
            capacity: 1,
        };
        repo.create(input).await.unwrap();

        // 删除场地
        let result = repo.delete("to_delete").await;
        assert!(result.is_ok());

        // 验证已删除
        let find_result = repo.find_by_id("to_delete").await;
        assert!(find_result.is_ok());
        assert!(find_result.unwrap().is_none());
    }

    #[tokio::test]
    async fn test_delete_venue_not_found() {
        let pool = setup_test_db().await;
        let repo = VenueRepository::new(&pool);

        let result = repo.delete("nonexistent").await;
        assert!(result.is_err());
    }

    #[tokio::test]
    async fn test_create_duplicate_venue_id() {
        let pool = setup_test_db().await;
        let repo = VenueRepository::new(&pool);

        // 创建第一个场地
        let input1 = CreateVenueInput {
            id: "duplicate".to_string(),
            name: "场地1".to_string(),
            capacity: 1,
        };
        repo.create(input1).await.unwrap();

        // 尝试创建相同 ID 的场地
        let input2 = CreateVenueInput {
            id: "duplicate".to_string(),
            name: "场地2".to_string(),
            capacity: 2,
        };

        let result = repo.create(input2).await;
        assert!(result.is_err()); // 应该失败，因为 ID 重复
    }

    #[tokio::test]
    async fn test_venue_capacity_boundary() {
        let pool = setup_test_db().await;
        let repo = VenueRepository::new(&pool);

        // 测试容量为 1（最小有效值）
        let input = CreateVenueInput {
            id: "min_capacity".to_string(),
            name: "最小容量场地".to_string(),
            capacity: 1,
        };
        let result = repo.create(input).await;
        assert!(result.is_ok());

        // 测试大容量
        let input = CreateVenueInput {
            id: "max_capacity".to_string(),
            name: "大容量场地".to_string(),
            capacity: 100,
        };
        let result = repo.create(input).await;
        assert!(result.is_ok());
    }
}
