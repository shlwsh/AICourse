// ============================================================================
// 健康检查命令模块
// ============================================================================
// 本模块提供系统健康检查相关的 Tauri 命令
//
// 功能：
// - 检查数据库连接状态
// - 检查应用程序运行状态
// - 返回系统运行时间
// - 返回内存使用情况
//
// 日志级别：
// - INFO: 健康检查开始和结束
// - DEBUG: 详细的检查步骤
// - WARN: 检查发现的警告
// - ERROR: 检查失败的错误
// ============================================================================

use serde::{Deserialize, Serialize};
use std::time::{Duration, Instant};
use tauri::State;
use tracing::{debug, error, info, warn};

/// 应用程序状态
///
/// 存储应用程序的全局状态信息
pub struct AppState {
    /// 应用启动时间
    pub start_time: Instant,
    /// 数据库管理器（可选，如果数据库未初始化则为 None）
    pub db: Option<crate::db::DatabaseManager>,
}

impl AppState {
    /// 创建新的应用状态
    ///
    /// # 参数
    /// - `db`: 数据库管理器（可选）
    ///
    /// # 返回
    /// - `AppState`: 新的应用状态实例
    pub fn new(db: Option<crate::db::DatabaseManager>) -> Self {
        info!("初始化应用状态");
        Self {
            start_time: Instant::now(),
            db,
        }
    }

    /// 获取应用运行时间（秒）
    ///
    /// # 返回
    /// - `u64`: 应用运行时间（秒）
    pub fn uptime_seconds(&self) -> u64 {
        self.start_time.elapsed().as_secs()
    }

    /// 获取应用运行时间（Duration）
    ///
    /// # 返回
    /// - `Duration`: 应用运行时间
    pub fn uptime(&self) -> Duration {
        self.start_time.elapsed()
    }

    /// 检查数据库是否已初始化
    ///
    /// # 返回
    /// - `bool`: 如果数据库已初始化返回 true，否则返回 false
    pub fn is_database_initialized(&self) -> bool {
        debug!("检查数据库初始化状态");
        self.db.is_some()
    }

    /// 获取数据库管理器的引用
    ///
    /// # 返回
    /// - `Option<&DatabaseManager>`: 数据库管理器的引用（如果已初始化）
    pub fn get_database(&self) -> Option<&crate::db::DatabaseManager> {
        debug!("获取数据库管理器引用");
        self.db.as_ref()
    }

    /// 获取格式化的运行时间字符串
    ///
    /// # 返回
    /// - `String`: 格式化的运行时间（例如："2小时30分钟15秒"）
    pub fn uptime_formatted(&self) -> String {
        let duration = self.uptime();
        let hours = duration.as_secs() / 3600;
        let minutes = (duration.as_secs() % 3600) / 60;
        let seconds = duration.as_secs() % 60;

        if hours > 0 {
            format!("{}小时{}分钟{}秒", hours, minutes, seconds)
        } else if minutes > 0 {
            format!("{}分钟{}秒", minutes, seconds)
        } else {
            format!("{}秒", seconds)
        }
    }
}

/// 健康检查结果
///
/// 包含系统各组件的健康状态信息
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct HealthStatus {
    /// 数据库连接状态
    pub database: DatabaseStatus,
    /// 应用程序运行状态
    pub application: ApplicationStatus,
    /// 内存使用情况（MB）
    pub memory_usage_mb: u64,
    /// 应用运行时间（秒）
    pub uptime_seconds: u64,
}

/// 数据库状态
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DatabaseStatus {
    /// 是否连接正常
    pub connected: bool,
    /// 连接池大小
    pub pool_size: Option<u32>,
    /// 空闲连接数
    pub idle_connections: Option<usize>,
    /// 错误信息（如果有）
    pub error: Option<String>,
}

/// 应用程序状态
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ApplicationStatus {
    /// 是否运行正常
    pub running: bool,
    /// 版本号
    pub version: String,
    /// 应用名称
    pub name: String,
}

/// 健康检查命令
///
/// 检查系统各组件的健康状态，包括：
/// - 数据库连接状态
/// - 应用程序运行状态
/// - 内存使用情况
/// - 应用运行时间
///
/// # 参数
/// - `app_state`: 应用程序状态
///
/// # 返回
/// - `Ok(HealthStatus)`: 健康检查结果
/// - `Err(String)`: 健康检查失败的错误信息
///
/// # 日志
/// - INFO: 记录健康检查开始和结束
/// - DEBUG: 记录详细的检查步骤
/// - WARN: 记录检查发现的警告
/// - ERROR: 记录检查失败的错误
///
/// # 示例
/// ```javascript
/// // 前端调用
/// import { invoke } from '@tauri-apps/api/tauri';
///
/// const status = await invoke('health_check');
/// console.log('数据库状态:', status.database.connected);
/// console.log('运行时间:', status.uptime_seconds, '秒');
/// ```
#[tauri::command]
pub async fn health_check(app_state: State<'_, AppState>) -> Result<HealthStatus, String> {
    info!("开始执行健康检查");

    // 1. 检查数据库连接状态
    debug!("检查数据库连接状态");
    let database_status = check_database_status(&app_state).await;

    if !database_status.connected {
        warn!("数据库连接异常: {:?}", database_status.error);
    } else {
        debug!(
            "数据库连接正常 - 连接池大小: {:?}, 空闲连接: {:?}",
            database_status.pool_size, database_status.idle_connections
        );
    }

    // 2. 检查应用程序运行状态
    debug!("检查应用程序运行状态");
    let application_status = ApplicationStatus {
        running: true,
        version: crate::VERSION.to_string(),
        name: crate::NAME.to_string(),
    };
    debug!(
        "应用程序运行正常 - 版本: {}, 名称: {}",
        application_status.version, application_status.name
    );

    // 3. 获取内存使用情况
    debug!("获取内存使用情况");
    let memory_usage_mb = get_memory_usage();
    debug!("当前内存使用: {} MB", memory_usage_mb);

    // 4. 获取应用运行时间
    let uptime_seconds = app_state.uptime_seconds();
    debug!("应用运行时间: {} 秒", uptime_seconds);

    // 5. 构建健康检查结果
    let health_status = HealthStatus {
        database: database_status,
        application: application_status,
        memory_usage_mb,
        uptime_seconds,
    };

    info!(
        "健康检查完成 - 数据库: {}, 内存: {} MB, 运行时间: {} 秒",
        health_status.database.connected, health_status.memory_usage_mb, health_status.uptime_seconds
    );

    Ok(health_status)
}

/// 检查数据库连接状态
///
/// # 参数
/// - `app_state`: 应用程序状态
///
/// # 返回
/// - `DatabaseStatus`: 数据库状态信息
async fn check_database_status(app_state: &AppState) -> DatabaseStatus {
    match &app_state.db {
        Some(db) => {
            debug!("数据库管理器已初始化，执行健康检查");

            // 执行数据库健康检查
            match db.health_check().await {
                Ok(_) => {
                    debug!("数据库健康检查通过");

                    // 获取连接池统计信息
                    let stats = db.get_pool_stats();
                    debug!(
                        "连接池统计 - 总连接数: {}, 空闲连接数: {}",
                        stats.size, stats.idle
                    );

                    DatabaseStatus {
                        connected: true,
                        pool_size: Some(stats.size),
                        idle_connections: Some(stats.idle),
                        error: None,
                    }
                }
                Err(e) => {
                    error!("数据库健康检查失败: {}", e);
                    DatabaseStatus {
                        connected: false,
                        pool_size: None,
                        idle_connections: None,
                        error: Some(format!("数据库连接失败: {}", e)),
                    }
                }
            }
        }
        None => {
            warn!("数据库管理器未初始化");
            DatabaseStatus {
                connected: false,
                pool_size: None,
                idle_connections: None,
                error: Some("数据库未初始化".to_string()),
            }
        }
    }
}

/// 获取内存使用情况（MB）
///
/// # 返回
/// - `u64`: 当前进程的内存使用量（MB）
///
/// # 注意
/// - 在不同平台上的实现可能不同
/// - 如果无法获取内存信息，返回 0
fn get_memory_usage() -> u64 {
    #[cfg(target_os = "linux")]
    {
        // Linux: 读取 /proc/self/status
        use std::fs;

        if let Ok(status) = fs::read_to_string("/proc/self/status") {
            for line in status.lines() {
                if line.starts_with("VmRSS:") {
                    if let Some(value) = line.split_whitespace().nth(1) {
                        if let Ok(kb) = value.parse::<u64>() {
                            debug!("从 /proc/self/status 读取内存使用: {} KB", kb);
                            return kb / 1024; // 转换为 MB
                        }
                    }
                }
            }
        }
        warn!("无法从 /proc/self/status 读取内存使用");
        0
    }

    #[cfg(not(target_os = "linux"))]
    {
        // 其他平台暂时返回 0
        // 可以在后续任务中添加平台特定的实现
        debug!("当前平台暂不支持内存使用查询");
        0
    }
}

// ============================================================================
// 单元测试
// ============================================================================

#[cfg(test)]
mod tests {
    use super::*;

    /// 测试 AppState 创建
    #[test]
    fn test_app_state_new() {
        let state = AppState::new(None);
        assert!(state.db.is_none());
        assert!(state.uptime_seconds() < 1); // 刚创建，运行时间应该很短
    }

    /// 测试 AppState 运行时间
    #[tokio::test]
    async fn test_app_state_uptime() {
        let state = AppState::new(None);

        // 等待 1 秒
        tokio::time::sleep(tokio::time::Duration::from_secs(1)).await;

        let uptime = state.uptime_seconds();
        assert!(uptime >= 1, "运行时间应该至少 1 秒");
        assert!(uptime < 2, "运行时间应该小于 2 秒");
    }

    /// 测试健康检查（无数据库）
    #[tokio::test]
    async fn test_health_check_without_database() {
        let state = AppState::new(None);

        // 注意：这里无法直接调用 health_check，因为它需要 Tauri State
        // 我们直接测试 check_database_status
        let db_status = check_database_status(&state).await;

        assert!(!db_status.connected);
        assert!(db_status.pool_size.is_none());
        assert!(db_status.idle_connections.is_none());
        assert!(db_status.error.is_some());
        assert_eq!(db_status.error.unwrap(), "数据库未初始化");
    }

    /// 测试内存使用获取
    #[test]
    fn test_get_memory_usage() {
        let memory = get_memory_usage();
        // 内存使用应该大于 0（除非在不支持的平台上）
        // 我们只检查它不会 panic
        println!("当前内存使用: {} MB", memory);
    }

    /// 测试 DatabaseStatus 序列化
    #[test]
    fn test_database_status_serialization() {
        let status = DatabaseStatus {
            connected: true,
            pool_size: Some(10),
            idle_connections: Some(5),
            error: None,
        };

        let json = serde_json::to_string(&status).unwrap();
        assert!(json.contains("\"connected\":true"));
        assert!(json.contains("\"pool_size\":10"));
        assert!(json.contains("\"idle_connections\":5"));
    }

    /// 测试 HealthStatus 序列化
    #[test]
    fn test_health_status_serialization() {
        let status = HealthStatus {
            database: DatabaseStatus {
                connected: true,
                pool_size: Some(10),
                idle_connections: Some(5),
                error: None,
            },
            application: ApplicationStatus {
                running: true,
                version: "1.0.0".to_string(),
                name: "test-app".to_string(),
            },
            memory_usage_mb: 100,
            uptime_seconds: 3600,
        };

        let json = serde_json::to_string(&status).unwrap();
        assert!(json.contains("\"database\""));
        assert!(json.contains("\"application\""));
        assert!(json.contains("\"memory_usage_mb\":100"));
        assert!(json.contains("\"uptime_seconds\":3600"));
    }

    /// 测试数据库初始化检查
    #[test]
    fn test_is_database_initialized() {
        // 无数据库
        let state_without_db = AppState::new(None);
        assert!(!state_without_db.is_database_initialized());

        // 有数据库（这里我们无法创建真实的数据库管理器，所以只测试 None 情况）
        // 在实际集成测试中会测试有数据库的情况
    }

    /// 测试获取数据库引用
    #[test]
    fn test_get_database() {
        let state = AppState::new(None);
        assert!(state.get_database().is_none());
    }

    /// 测试格式化运行时间
    #[test]
    fn test_uptime_formatted() {
        let state = AppState::new(None);

        // 刚创建时应该是几秒
        let formatted = state.uptime_formatted();
        assert!(formatted.ends_with("秒"));

        // 测试不同时间格式的逻辑
        // 注意：这里我们无法直接修改 start_time，所以只能测试当前时间
        println!("格式化运行时间: {}", formatted);
    }

    /// 测试 AppState 方法的日志记录
    #[test]
    fn test_app_state_logging() {
        // 初始化日志（如果还没有初始化）
        let _ = tracing_subscriber::fmt()
            .with_test_writer()
            .try_init();

        let state = AppState::new(None);

        // 调用各种方法，确保日志记录正常工作
        let _ = state.is_database_initialized();
        let _ = state.get_database();
        let _ = state.uptime_seconds();
        let _ = state.uptime_formatted();

        // 如果没有 panic，说明日志记录正常
    }

    /// 测试 ApplicationStatus 创建
    #[test]
    fn test_application_status() {
        let status = ApplicationStatus {
            running: true,
            version: "1.0.0".to_string(),
            name: "test-app".to_string(),
        };

        assert!(status.running);
        assert_eq!(status.version, "1.0.0");
        assert_eq!(status.name, "test-app");
    }

    /// 测试 DatabaseStatus 错误情况
    #[test]
    fn test_database_status_with_error() {
        let status = DatabaseStatus {
            connected: false,
            pool_size: None,
            idle_connections: None,
            error: Some("连接失败".to_string()),
        };

        assert!(!status.connected);
        assert!(status.pool_size.is_none());
        assert!(status.idle_connections.is_none());
        assert_eq!(status.error.unwrap(), "连接失败");
    }
}
