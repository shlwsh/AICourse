// ============================================================================
// 日志记录命令模块
// ============================================================================
// 本模块提供前端日志记录相关的 Tauri 命令
//
// 功能：
// - 记录前端错误信息
// - 记录前端警告信息
// - 记录前端调试信息
// - 支持堆栈跟踪记录
//
// 日志级别：
// - ERROR: 前端错误
// - WARN: 前端警告
// - INFO: 前端信息
// - DEBUG: 前端调试
// ============================================================================

use serde::{Deserialize, Serialize};
use tracing::{debug, error, info, warn};

/// 前端日志级别
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum FrontendLogLevel {
    /// 错误级别
    Error,
    /// 警告级别
    Warn,
    /// 信息级别
    Info,
    /// 调试级别
    Debug,
}

/// 前端日志条目
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FrontendLogEntry {
    /// 日志级别
    pub level: FrontendLogLevel,
    /// 日志消息
    pub message: String,
    /// 错误堆栈（可选）
    pub stack: Option<String>,
    /// 时间戳（可选，前端提供）
    pub timestamp: Option<String>,
    /// 额外的上下文信息（可选）
    pub context: Option<serde_json::Value>,
}

/// 记录前端错误命令
///
/// 接收前端错误消息和堆栈信息，使用 ERROR 级别记录到日志系统
///
/// # 参数
/// - `message`: 错误消息
/// - `stack`: 错误堆栈跟踪（可选）
///
/// # 日志
/// - ERROR: 记录前端错误消息和堆栈信息
/// - DEBUG: 记录详细的错误上下文
///
/// # 示例
/// ```javascript
/// // 前端调用
/// import { invoke } from '@tauri-apps/api/tauri';
///
/// try {
///   // 某些可能出错的代码
/// } catch (error) {
///   await invoke('log_frontend_error', {
///     message: error.message,
///     stack: error.stack
///   });
/// }
/// ```
#[tauri::command]
pub fn log_frontend_error(message: String, stack: Option<String>) {
    debug!("收到前端错误日志请求");

    // 记录错误消息
    error!("前端错误: {}", message);

    // 如果有堆栈信息，记录堆栈跟踪
    if let Some(stack_trace) = stack {
        // 将堆栈信息按行分割，便于阅读
        let stack_lines: Vec<&str> = stack_trace.lines().collect();
        error!("错误堆栈跟踪 ({} 行):", stack_lines.len());

        for (index, line) in stack_lines.iter().enumerate() {
            error!("  [{}] {}", index + 1, line.trim());
        }

        debug!("完整堆栈信息: {}", stack_trace);
    } else {
        debug!("未提供堆栈信息");
    }

    info!("前端错误日志已记录");
}

/// 记录前端日志命令（通用版本）
///
/// 接收前端日志条目，根据日志级别记录到相应的日志系统
///
/// # 参数
/// - `entry`: 前端日志条目
///
/// # 返回
/// - `Ok(())`: 日志记录成功
/// - `Err(String)`: 日志记录失败的错误信息
///
/// # 日志
/// - 根据日志级别记录到相应的日志系统
/// - DEBUG: 记录详细的日志上下文
///
/// # 示例
/// ```javascript
/// // 前端调用
/// import { invoke } from '@tauri-apps/api/tauri';
///
/// await invoke('log_frontend', {
///   entry: {
///     level: 'error',
///     message: '发生错误',
///     stack: error.stack,
///     timestamp: new Date().toISOString(),
///     context: { userId: 123, action: 'save' }
///   }
/// });
/// ```
#[tauri::command]
pub fn log_frontend(entry: FrontendLogEntry) -> Result<(), String> {
    debug!("收到前端日志请求 - 级别: {:?}", entry.level);

    // 构建日志消息前缀
    let prefix = if let Some(timestamp) = &entry.timestamp {
        format!("[前端 {}]", timestamp)
    } else {
        "[前端]".to_string()
    };

    // 根据日志级别记录
    match entry.level {
        FrontendLogLevel::Error => {
            error!("{} {}", prefix, entry.message);
            if let Some(stack) = &entry.stack {
                error!("{} 堆栈: {}", prefix, stack);
            }
        }
        FrontendLogLevel::Warn => {
            warn!("{} {}", prefix, entry.message);
            if let Some(stack) = &entry.stack {
                warn!("{} 堆栈: {}", prefix, stack);
            }
        }
        FrontendLogLevel::Info => {
            info!("{} {}", prefix, entry.message);
        }
        FrontendLogLevel::Debug => {
            debug!("{} {}", prefix, entry.message);
        }
    }

    // 如果有额外的上下文信息，记录到 DEBUG 级别
    if let Some(context) = &entry.context {
        debug!("{} 上下文: {:?}", prefix, context);
    }

    debug!("前端日志已记录");
    Ok(())
}

// ============================================================================
// 单元测试
// ============================================================================

#[cfg(test)]
mod tests {
    use super::*;

    /// 测试 log_frontend_error 不带堆栈信息
    #[test]
    fn test_log_frontend_error_without_stack() {
        // 测试不带堆栈信息的错误日志
        log_frontend_error("测试错误消息".to_string(), None);
        // 如果没有 panic，则测试通过
    }

    /// 测试 log_frontend_error 带堆栈信息
    #[test]
    fn test_log_frontend_error_with_stack() {
        // 测试带堆栈信息的错误日志
        log_frontend_error(
            "测试错误消息".to_string(),
            Some("at Component.vue:10:5\nat main.ts:20:10".to_string()),
        );
        // 如果没有 panic，则测试通过
    }

    /// 测试 log_frontend_error 带多行堆栈信息
    #[test]
    fn test_log_frontend_error_with_multiline_stack() {
        let stack = r#"Error: 测试错误
    at Component.vue:10:5
    at setup (Component.vue:8:3)
    at callWithErrorHandling (runtime-core.esm-bundler.js:155:22)
    at setupStatefulComponent (runtime-core.esm-bundler.js:7151:29)"#;

        log_frontend_error("测试错误消息".to_string(), Some(stack.to_string()));
        // 如果没有 panic，则测试通过
    }

    /// 测试 log_frontend_error 带空字符串消息
    #[test]
    fn test_log_frontend_error_with_empty_message() {
        log_frontend_error("".to_string(), None);
        // 如果没有 panic，则测试通过
    }

    /// 测试 log_frontend_error 带空堆栈信息
    #[test]
    fn test_log_frontend_error_with_empty_stack() {
        log_frontend_error("测试错误消息".to_string(), Some("".to_string()));
        // 如果没有 panic，则测试通过
    }

    /// 测试 log_frontend 错误级别
    #[test]
    fn test_log_frontend_error_level() {
        let entry = FrontendLogEntry {
            level: FrontendLogLevel::Error,
            message: "测试错误".to_string(),
            stack: Some("at test.js:1:1".to_string()),
            timestamp: Some("2024-01-01T00:00:00Z".to_string()),
            context: None,
        };

        let result = log_frontend(entry);
        assert!(result.is_ok());
    }

    /// 测试 log_frontend 警告级别
    #[test]
    fn test_log_frontend_warn_level() {
        let entry = FrontendLogEntry {
            level: FrontendLogLevel::Warn,
            message: "测试警告".to_string(),
            stack: None,
            timestamp: None,
            context: None,
        };

        let result = log_frontend(entry);
        assert!(result.is_ok());
    }

    /// 测试 log_frontend 信息级别
    #[test]
    fn test_log_frontend_info_level() {
        let entry = FrontendLogEntry {
            level: FrontendLogLevel::Info,
            message: "测试信息".to_string(),
            stack: None,
            timestamp: Some("2024-01-01T00:00:00Z".to_string()),
            context: None,
        };

        let result = log_frontend(entry);
        assert!(result.is_ok());
    }

    /// 测试 log_frontend 调试级别
    #[test]
    fn test_log_frontend_debug_level() {
        let entry = FrontendLogEntry {
            level: FrontendLogLevel::Debug,
            message: "测试调试信息".to_string(),
            stack: None,
            timestamp: None,
            context: None,
        };

        let result = log_frontend(entry);
        assert!(result.is_ok());
    }

    /// 测试 log_frontend 带上下文信息
    #[test]
    fn test_log_frontend_with_context() {
        let context = serde_json::json!({
            "userId": 123,
            "action": "save",
            "component": "ScheduleGrid"
        });

        let entry = FrontendLogEntry {
            level: FrontendLogLevel::Error,
            message: "保存失败".to_string(),
            stack: Some("at save():10".to_string()),
            timestamp: Some("2024-01-01T00:00:00Z".to_string()),
            context: Some(context),
        };

        let result = log_frontend(entry);
        assert!(result.is_ok());
    }

    /// 测试 log_frontend 带完整信息
    #[test]
    fn test_log_frontend_with_all_fields() {
        let context = serde_json::json!({
            "browser": "Chrome",
            "version": "120.0.0",
            "url": "/schedule"
        });

        let entry = FrontendLogEntry {
            level: FrontendLogLevel::Error,
            message: "网络请求失败".to_string(),
            stack: Some("at fetch():15\nat api.ts:20".to_string()),
            timestamp: Some("2024-01-01T12:34:56Z".to_string()),
            context: Some(context),
        };

        let result = log_frontend(entry);
        assert!(result.is_ok());
    }

    /// 测试 FrontendLogLevel 序列化
    #[test]
    fn test_frontend_log_level_serialization() {
        let level = FrontendLogLevel::Error;
        let json = serde_json::to_string(&level).unwrap();
        assert_eq!(json, "\"error\"");

        let level = FrontendLogLevel::Warn;
        let json = serde_json::to_string(&level).unwrap();
        assert_eq!(json, "\"warn\"");

        let level = FrontendLogLevel::Info;
        let json = serde_json::to_string(&level).unwrap();
        assert_eq!(json, "\"info\"");

        let level = FrontendLogLevel::Debug;
        let json = serde_json::to_string(&level).unwrap();
        assert_eq!(json, "\"debug\"");
    }

    /// 测试 FrontendLogLevel 反序列化
    #[test]
    fn test_frontend_log_level_deserialization() {
        let level: FrontendLogLevel = serde_json::from_str("\"error\"").unwrap();
        assert!(matches!(level, FrontendLogLevel::Error));

        let level: FrontendLogLevel = serde_json::from_str("\"warn\"").unwrap();
        assert!(matches!(level, FrontendLogLevel::Warn));

        let level: FrontendLogLevel = serde_json::from_str("\"info\"").unwrap();
        assert!(matches!(level, FrontendLogLevel::Info));

        let level: FrontendLogLevel = serde_json::from_str("\"debug\"").unwrap();
        assert!(matches!(level, FrontendLogLevel::Debug));
    }

    /// 测试 FrontendLogEntry 序列化
    #[test]
    fn test_frontend_log_entry_serialization() {
        let entry = FrontendLogEntry {
            level: FrontendLogLevel::Error,
            message: "测试".to_string(),
            stack: Some("stack".to_string()),
            timestamp: Some("2024-01-01T00:00:00Z".to_string()),
            context: Some(serde_json::json!({"key": "value"})),
        };

        let json = serde_json::to_string(&entry).unwrap();
        assert!(json.contains("\"level\":\"error\""));
        assert!(json.contains("\"message\":\"测试\""));
        assert!(json.contains("\"stack\":\"stack\""));
        assert!(json.contains("\"timestamp\":\"2024-01-01T00:00:00Z\""));
        assert!(json.contains("\"context\""));
    }

    /// 测试 FrontendLogEntry 反序列化
    #[test]
    fn test_frontend_log_entry_deserialization() {
        let json = r#"{
            "level": "error",
            "message": "测试",
            "stack": "stack",
            "timestamp": "2024-01-01T00:00:00Z",
            "context": {"key": "value"}
        }"#;

        let entry: FrontendLogEntry = serde_json::from_str(json).unwrap();
        assert!(matches!(entry.level, FrontendLogLevel::Error));
        assert_eq!(entry.message, "测试");
        assert_eq!(entry.stack, Some("stack".to_string()));
        assert_eq!(entry.timestamp, Some("2024-01-01T00:00:00Z".to_string()));
        assert!(entry.context.is_some());
    }

    /// 测试 FrontendLogEntry 反序列化（最小字段）
    #[test]
    fn test_frontend_log_entry_deserialization_minimal() {
        let json = r#"{
            "level": "info",
            "message": "测试"
        }"#;

        let entry: FrontendLogEntry = serde_json::from_str(json).unwrap();
        assert!(matches!(entry.level, FrontendLogLevel::Info));
        assert_eq!(entry.message, "测试");
        assert!(entry.stack.is_none());
        assert!(entry.timestamp.is_none());
        assert!(entry.context.is_none());
    }
}
