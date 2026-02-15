// 排课系统 Rust 后端入口文件
// 使用 Tauri 框架构建跨平台桌面应用

// 禁用控制台窗口（仅在 Windows Release 模式下）
#![cfg_attr(
    all(not(debug_assertions), target_os = "windows"),
    windows_subsystem = "windows"
)]

use tracing::{error, info};

// 使用库模块（将在后续任务中实现具体功能）
use course_scheduling_system::{init_logging, LogConfig, DESCRIPTION, NAME, VERSION};

// 健康检查命令
#[tauri::command]
fn health_check() -> Result<String, String> {
    info!("执行健康检查");
    Ok("系统运行正常".to_string())
}

// 获取系统信息命令
#[tauri::command]
fn get_system_info() -> Result<serde_json::Value, String> {
    info!("获取系统信息");

    let info = serde_json::json!({
        "version": VERSION,
        "name": NAME,
        "description": DESCRIPTION,
        "rust_version": env!("CARGO_PKG_RUST_VERSION"),
    });

    Ok(info)
}

// 记录前端错误命令
#[tauri::command]
fn log_frontend_error(message: String, stack: Option<String>) {
    error!("前端错误: {}", message);
    if let Some(stack_trace) = stack {
        error!("错误堆栈: {}", stack_trace);
    }
}

fn main() {
    // 初始化日志系统
    // 根据编译模式自动选择开发或生产配置
    let log_config = if cfg!(debug_assertions) {
        LogConfig::development()
    } else {
        LogConfig::production()
    };

    if let Err(e) = init_logging(log_config) {
        eprintln!("日志系统初始化失败: {}", e);
        std::process::exit(1);
    }

    info!("排课系统启动中...");
    info!("版本: {}", VERSION);
    info!(
        "编译模式: {}",
        if cfg!(debug_assertions) {
            "开发"
        } else {
            "生产"
        }
    );

    // 构建 Tauri 应用
    tauri::Builder::default()
        // 注册命令
        .invoke_handler(tauri::generate_handler![
            health_check,
            get_system_info,
            log_frontend_error,
        ])
        // 设置应用启动回调
        .setup(|app| {
            info!("Tauri 应用初始化完成");
            info!("应用标识: {}", app.config().tauri.bundle.identifier);

            // 在这里可以进行数据库初始化等操作
            // 将在后续任务中实现

            Ok(())
        })
        // 运行应用
        .run(tauri::generate_context!())
        .expect("运行 Tauri 应用时出错");

    info!("排课系统已退出");
}
