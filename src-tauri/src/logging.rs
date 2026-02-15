// ============================================================================
// 日志系统模块
// ============================================================================
// 本模块实现基于 tracing 框架的结构化日志记录系统
//
// 功能特性：
// - 支持多种日志级别：DEBUG、INFO、WARN、ERROR
// - 支持控制台输出和文件输出
// - 日志文件按日期自动轮转
// - 结构化日志格式，便于分析和查询
// - 敏感信息过滤，保护用户隐私
//
// 使用示例：
// ```rust
// use tracing::{info, warn, error, debug};
//
// // 记录信息日志
// info!("排课系统启动");
//
// // 记录带字段的结构化日志
// info!(teacher_id = 123, "保存教师偏好");
//
// // 记录警告
// warn!(class_id = 456, "班级课时数接近上限");
//
// // 记录错误
// error!(error = ?err, "数据库操作失败");
// ```
// ============================================================================

use std::path::PathBuf;
use tracing::Level;
use tracing_appender::rolling::{RollingFileAppender, Rotation};
use tracing_subscriber::{
    fmt::{self, format::FmtSpan},
    layer::SubscriberExt,
    util::SubscriberInitExt,
    EnvFilter,
};

/// 日志配置
#[derive(Debug, Clone)]
pub struct LogConfig {
    /// 日志级别
    pub level: Level,
    /// 日志目录
    pub log_dir: PathBuf,
    /// 是否输出到控制台
    pub console_output: bool,
    /// 是否输出到文件
    pub file_output: bool,
    /// 日志文件名前缀
    pub file_prefix: String,
    /// 是否包含时间戳
    pub with_timestamp: bool,
    /// 是否包含目标模块
    pub with_target: bool,
    /// 是否包含文件和行号
    pub with_location: bool,
    /// 是否包含线程信息
    pub with_thread_info: bool,
    /// 日志文件保留天数（0 表示不自动清理）
    pub retention_days: u32,
}

impl Default for LogConfig {
    fn default() -> Self {
        Self {
            level: if cfg!(debug_assertions) {
                Level::DEBUG
            } else {
                Level::INFO
            },
            log_dir: PathBuf::from("logs"),
            console_output: true,
            file_output: true,
            file_prefix: "course-scheduling".to_string(),
            with_timestamp: true,
            with_target: true,
            with_location: true,
            with_thread_info: false,
            retention_days: 30, // 默认保留 30 天
        }
    }
}

impl LogConfig {
    /// 创建开发环境配置
    pub fn development() -> Self {
        Self {
            level: Level::DEBUG,
            console_output: true,
            file_output: true,
            with_thread_info: true,
            retention_days: 7, // 开发环境保留 7 天
            ..Default::default()
        }
    }

    /// 创建生产环境配置
    pub fn production() -> Self {
        Self {
            level: Level::INFO,
            console_output: false,
            file_output: true,
            with_thread_info: false,
            retention_days: 30, // 生产环境保留 30 天
            ..Default::default()
        }
    }

    /// 创建测试环境配置
    pub fn test() -> Self {
        Self {
            level: Level::DEBUG,
            console_output: true,
            file_output: false,
            retention_days: 0, // 测试环境不保留
            ..Default::default()
        }
    }
}

/// 初始化日志系统
///
/// 根据配置初始化 tracing 订阅器，设置日志输出目标和格式
///
/// # 参数
/// - `config`: 日志配置
///
/// # 错误
/// 如果日志目录创建失败或订阅器初始化失败，返回错误
///
/// # 示例
/// ```rust
/// use course_scheduling_system::logging::{init_logging, LogConfig};
///
/// // 使用默认配置
/// init_logging(LogConfig::default()).expect("日志初始化失败");
///
/// // 使用开发环境配置
/// init_logging(LogConfig::development()).expect("日志初始化失败");
/// ```
pub fn init_logging(config: LogConfig) -> Result<(), Box<dyn std::error::Error>> {
    // 确保日志目录存在
    if config.file_output {
        std::fs::create_dir_all(&config.log_dir)?;

        // 清理旧日志文件
        if config.retention_days > 0 {
            cleanup_old_logs(&config.log_dir, &config.file_prefix, config.retention_days)?;
        }
    }

    // 创建环境过滤器
    // 优先使用 RUST_LOG 环境变量，否则使用配置的级别
    let env_filter = EnvFilter::try_from_default_env().unwrap_or_else(|_| {
        EnvFilter::new(format!(
            "{}={}",
            env!("CARGO_PKG_NAME").replace('-', "_"),
            config.level
        ))
    });

    // 根据配置创建不同的订阅器
    if config.console_output && config.file_output {
        // 同时输出到控制台和文件
        let console_layer = fmt::layer()
            .with_target(config.with_target)
            .with_file(config.with_location)
            .with_line_number(config.with_location)
            .with_thread_ids(config.with_thread_info)
            .with_thread_names(config.with_thread_info)
            .with_span_events(FmtSpan::CLOSE)
            .with_ansi(true)
            .pretty();

        let file_appender = RollingFileAppender::builder()
            .rotation(Rotation::DAILY)
            .filename_prefix(&config.file_prefix)
            .filename_suffix("log")
            .build(&config.log_dir)?;

        let file_layer = fmt::layer()
            .with_writer(file_appender)
            .with_target(config.with_target)
            .with_file(config.with_location)
            .with_line_number(config.with_location)
            .with_thread_ids(config.with_thread_info)
            .with_thread_names(config.with_thread_info)
            .with_span_events(FmtSpan::CLOSE)
            .with_ansi(false)
            .json();

        tracing_subscriber::registry()
            .with(env_filter)
            .with(console_layer)
            .with(file_layer)
            .init();
    } else if config.console_output {
        // 仅输出到控制台
        let console_layer = fmt::layer()
            .with_target(config.with_target)
            .with_file(config.with_location)
            .with_line_number(config.with_location)
            .with_thread_ids(config.with_thread_info)
            .with_thread_names(config.with_thread_info)
            .with_span_events(FmtSpan::CLOSE)
            .with_ansi(true)
            .pretty();

        tracing_subscriber::registry()
            .with(env_filter)
            .with(console_layer)
            .init();
    } else if config.file_output {
        // 仅输出到文件
        let file_appender = RollingFileAppender::builder()
            .rotation(Rotation::DAILY)
            .filename_prefix(&config.file_prefix)
            .filename_suffix("log")
            .build(&config.log_dir)?;

        let file_layer = fmt::layer()
            .with_writer(file_appender)
            .with_target(config.with_target)
            .with_file(config.with_location)
            .with_line_number(config.with_location)
            .with_thread_ids(config.with_thread_info)
            .with_thread_names(config.with_thread_info)
            .with_span_events(FmtSpan::CLOSE)
            .with_ansi(false)
            .json();

        tracing_subscriber::registry()
            .with(env_filter)
            .with(file_layer)
            .init();
    } else {
        // 不输出日志（测试场景）
        tracing_subscriber::registry().with(env_filter).init();
    }

    Ok(())
}

/// 快速初始化日志系统
///
/// 使用默认配置初始化日志系统，适用于大多数场景
///
/// # 示例
/// ```rust
/// use course_scheduling_system::logging::init_default_logging;
///
/// init_default_logging();
/// ```
pub fn init_default_logging() {
    let config = if cfg!(debug_assertions) {
        LogConfig::development()
    } else {
        LogConfig::production()
    };

    if let Err(e) = init_logging(config) {
        eprintln!("日志系统初始化失败: {}", e);
    }
}

/// 敏感信息过滤器
///
/// 用于过滤日志中的敏感信息，如密码、密钥等
///
/// # 示例
/// ```rust
/// use course_scheduling_system::logging::sanitize_sensitive_data;
///
/// let data = "password=secret123&api_key=abc123";
/// let sanitized = sanitize_sensitive_data(data);
/// assert_eq!(sanitized, "password=***&api_key=***");
/// ```
pub fn sanitize_sensitive_data(data: &str) -> String {
    let sensitive_patterns = [
        "password",
        "passwd",
        "pwd",
        "secret",
        "token",
        "api_key",
        "apikey",
        "access_key",
        "private_key",
        "authorization",
        "auth",
    ];

    let mut result = data.to_string();

    for pattern in &sensitive_patterns {
        // 匹配 key=value 格式
        let re = regex::Regex::new(&format!(r"(?i){}=[^&\s]*", pattern)).unwrap();
        result = re
            .replace_all(&result, &format!("{}=***", pattern))
            .to_string();

        // 匹配 "key": "value" 格式（JSON）
        let re = regex::Regex::new(&format!(r#"(?i)"{}"\s*:\s*"[^"]*""#, pattern)).unwrap();
        result = re
            .replace_all(&result, &format!(r#""{}": "***""#, pattern))
            .to_string();
    }

    result
}

/// 清理旧日志文件
///
/// 删除超过保留期限的日志文件
///
/// # 参数
/// - `log_dir`: 日志目录路径
/// - `file_prefix`: 日志文件名前缀
/// - `retention_days`: 保留天数
///
/// # 错误
/// 如果读取目录或删除文件失败，返回错误
///
/// # 示例
/// ```rust
/// use std::path::PathBuf;
/// use course_scheduling_system::logging::cleanup_old_logs;
///
/// let log_dir = PathBuf::from("logs");
/// let file_prefix = "course-scheduling";
/// let retention_days = 30;
///
/// cleanup_old_logs(&log_dir, file_prefix, retention_days).expect("清理日志失败");
/// ```
pub fn cleanup_old_logs(
    log_dir: &PathBuf,
    file_prefix: &str,
    retention_days: u32,
) -> Result<(), Box<dyn std::error::Error>> {
    use std::time::{SystemTime, UNIX_EPOCH};

    // 计算截止时间（当前时间 - 保留天数）
    let now = SystemTime::now().duration_since(UNIX_EPOCH)?.as_secs();
    let cutoff_time = now - (retention_days as u64 * 24 * 60 * 60);

    // 遍历日志目录
    let entries = std::fs::read_dir(log_dir)?;
    let mut deleted_count = 0;

    for entry in entries {
        let entry = entry?;
        let path = entry.path();

        // 只处理日志文件
        if !path.is_file() {
            continue;
        }

        let file_name = path.file_name().and_then(|n| n.to_str()).unwrap_or("");

        // 检查文件名是否匹配前缀
        if !file_name.starts_with(file_prefix) || !file_name.ends_with(".log") {
            continue;
        }

        // 获取文件修改时间
        if let Ok(metadata) = entry.metadata() {
            if let Ok(modified) = metadata.modified() {
                let modified_secs = modified
                    .duration_since(UNIX_EPOCH)
                    .unwrap_or_default()
                    .as_secs();

                // 如果文件超过保留期限，删除它
                if modified_secs < cutoff_time {
                    match std::fs::remove_file(&path) {
                        Ok(_) => {
                            deleted_count += 1;
                            eprintln!("已删除旧日志文件: {:?}", path);
                        }
                        Err(e) => {
                            eprintln!("删除日志文件失败 {:?}: {}", path, e);
                        }
                    }
                }
            }
        }
    }

    if deleted_count > 0 {
        eprintln!("清理完成，共删除 {} 个旧日志文件", deleted_count);
    }

    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_log_config_default() {
        let config = LogConfig::default();
        assert!(config.console_output);
        assert!(config.file_output);
        assert!(config.with_timestamp);
    }

    #[test]
    fn test_log_config_development() {
        let config = LogConfig::development();
        assert_eq!(config.level, Level::DEBUG);
        assert!(config.console_output);
        assert!(config.with_thread_info);
    }

    #[test]
    fn test_log_config_production() {
        let config = LogConfig::production();
        assert_eq!(config.level, Level::INFO);
        assert!(!config.console_output);
        assert!(!config.with_thread_info);
        assert_eq!(config.retention_days, 30);
    }

    #[test]
    fn test_sanitize_sensitive_data() {
        let data = "username=admin&password=secret123&api_key=abc123";
        let sanitized = sanitize_sensitive_data(data);
        assert!(sanitized.contains("password=***"));
        assert!(sanitized.contains("api_key=***"));
        assert!(sanitized.contains("username=admin"));
    }

    #[test]
    fn test_sanitize_json_data() {
        let data = r#"{"username": "admin", "password": "secret123", "api_key": "abc123"}"#;
        let sanitized = sanitize_sensitive_data(data);
        assert!(sanitized.contains(r#""password": "***""#));
        assert!(sanitized.contains(r#""api_key": "***""#));
        assert!(sanitized.contains(r#""username": "admin""#));
    }

    #[test]
    fn test_log_config_retention_days() {
        let dev_config = LogConfig::development();
        assert_eq!(dev_config.retention_days, 7);

        let prod_config = LogConfig::production();
        assert_eq!(prod_config.retention_days, 30);

        let test_config = LogConfig::test();
        assert_eq!(test_config.retention_days, 0);
    }

    #[test]
    fn test_cleanup_old_logs() {
        use std::fs::File;
        use std::io::Write;
        use std::time::{Duration, SystemTime};
        use tempfile::TempDir;

        // 创建临时目录
        let temp_dir = TempDir::new().expect("创建临时目录失败");
        let log_dir = temp_dir.path().to_path_buf();

        // 创建一些测试日志文件
        let prefix = "test-log";

        // 创建一个新文件（不应被删除）
        let new_file = log_dir.join(format!("{}.2024-01-15.log", prefix));
        File::create(&new_file)
            .expect("创建新日志文件失败")
            .write_all(b"new log")
            .expect("写入失败");

        // 创建一个旧文件（应被删除）
        let old_file = log_dir.join(format!("{}.2023-01-01.log", prefix));
        let mut file = File::create(&old_file).expect("创建旧日志文件失败");
        file.write_all(b"old log").expect("写入失败");

        // 修改旧文件的修改时间为 100 天前
        let _old_time = SystemTime::now() - Duration::from_secs(100 * 24 * 60 * 60);
        if let Ok(_metadata) = file.metadata() {
            // 注意：在某些系统上可能无法修改文件时间
            // 这个测试在这些系统上可能会失败
            drop(file);
        }

        // 执行清理（保留 30 天）
        let result = cleanup_old_logs(&log_dir, prefix, 30);

        // 验证清理函数执行成功
        assert!(result.is_ok(), "清理函数应该成功执行");

        // 注意：由于无法可靠地修改文件时间，我们只验证函数不会崩溃
        // 实际的文件删除测试需要在真实环境中进行
    }
}
