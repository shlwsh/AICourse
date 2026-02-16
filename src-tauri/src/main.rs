// 排课系统 Rust 后端入口文件
// 使用 Tauri 框架构建跨平台桌面应用

// 禁用控制台窗口（仅在 Windows Release 模式下）
#![cfg_attr(
    all(not(debug_assertions), target_os = "windows"),
    windows_subsystem = "windows"
)]

use tracing::info;
use tauri::Manager;

// 使用库模块
use course_scheduling_system::{init_logging, LogConfig, DESCRIPTION, NAME, VERSION};

// 重新导出命令以供 Tauri 宏使用
pub use course_scheduling_system::commands::schedule::*;
pub use course_scheduling_system::commands::teacher::*;
pub use course_scheduling_system::commands::import_export::*;
pub use course_scheduling_system::commands::health::*;
pub use course_scheduling_system::commands::logging::*;

// 获取系统信息命令
// 返回系统版本、名称、描述、操作系统信息和 Rust 版本信息
#[tauri::command]
fn get_system_info() -> Result<serde_json::Value, String> {
    use tracing::debug;

    info!("开始获取系统信息");
    debug!("系统信息请求 - 应用版本: {}, 名称: {}", VERSION, NAME);

    // 获取操作系统信息
    let os_type = std::env::consts::OS;
    let os_family = std::env::consts::FAMILY;
    let arch = std::env::consts::ARCH;

    debug!("操作系统类型: {}, 系统族: {}, 架构: {}", os_type, os_family, arch);

    // 获取 Rust 版本信息
    let rust_version = env!("CARGO_PKG_RUST_VERSION");
    debug!("Rust 版本: {}", rust_version);

    // 构建系统信息 JSON
    let info = serde_json::json!({
        "system": {
            "version": VERSION,
            "name": NAME,
            "description": DESCRIPTION,
        },
        "os": {
            "type": os_type,
            "family": os_family,
            "arch": arch,
        },
        "rust": {
            "version": rust_version,
            "compiler": env!("RUSTC_VERSION"),
        }
    });

    info!("系统信息获取成功");
    debug!("返回的系统信息: {:?}", info);

    Ok(info)
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
        // 注册 Tauri 2.x 插件
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_notification::init())
        // 注册命令
        .invoke_handler(tauri::generate_handler![
            health_check,
            get_system_info,
            log_frontend_error,
            log_frontend,
            generate_schedule,
            get_all_teachers,
            save_teacher_preference,
            batch_save_teacher_preferences,
            query_teacher_status,
            calculate_workload_statistics,
            import_from_excel,
            export_to_excel,
            download_import_template,
        ])
        // 设置应用启动回调
        .setup(|app| {
            info!("Tauri 应用初始化完成");
            info!("应用标识: {}", app.config().identifier);

            // 初始化应用状态（暂时不初始化数据库）
            // 数据库初始化将在后续任务中实现
            let app_state = AppState::new(None);
            app.manage(app_state);
            info!("应用状态已初始化");

            Ok(())
        })
        // 运行应用
        .run(tauri::generate_context!())
        .expect("运行 Tauri 应用时出错");

    info!("排课系统已退出");
}

// ============================================================================
// 单元测试
// ============================================================================

#[cfg(test)]
mod tests {
    use super::*;

    /// 测试 get_system_info 命令返回正确的数据结构
    #[test]
    fn test_get_system_info_returns_valid_structure() {
        // 执行命令
        let result = get_system_info();

        // 验证命令执行成功
        assert!(result.is_ok(), "get_system_info 应该返回 Ok");

        let info = result.unwrap();

        // 验证返回的是一个对象
        assert!(info.is_object(), "返回值应该是一个 JSON 对象");

        // 验证 system 字段存在
        assert!(
            info.get("system").is_some(),
            "返回值应该包含 system 字段"
        );
        let system = info.get("system").unwrap();
        assert!(system.is_object(), "system 字段应该是一个对象");

        // 验证 system 子字段
        assert!(
            system.get("version").is_some(),
            "system 应该包含 version 字段"
        );
        assert!(system.get("name").is_some(), "system 应该包含 name 字段");
        assert!(
            system.get("description").is_some(),
            "system 应该包含 description 字段"
        );

        // 验证 os 字段存在
        assert!(info.get("os").is_some(), "返回值应该包含 os 字段");
        let os = info.get("os").unwrap();
        assert!(os.is_object(), "os 字段应该是一个对象");

        // 验证 os 子字段
        assert!(os.get("type").is_some(), "os 应该包含 type 字段");
        assert!(os.get("family").is_some(), "os 应该包含 family 字段");
        assert!(os.get("arch").is_some(), "os 应该包含 arch 字段");

        // 验证 rust 字段存在
        assert!(info.get("rust").is_some(), "返回值应该包含 rust 字段");
        let rust = info.get("rust").unwrap();
        assert!(rust.is_object(), "rust 字段应该是一个对象");

        // 验证 rust 子字段
        assert!(
            rust.get("version").is_some(),
            "rust 应该包含 version 字段"
        );
        assert!(
            rust.get("compiler").is_some(),
            "rust 应该包含 compiler 字段"
        );
    }

    /// 测试 get_system_info 返回的系统版本信息正确
    #[test]
    fn test_get_system_info_version_matches_constant() {
        let result = get_system_info();
        assert!(result.is_ok());

        let info = result.unwrap();
        let system = info.get("system").unwrap();
        let version = system.get("version").unwrap().as_str().unwrap();

        // 验证版本号与常量匹配
        assert_eq!(version, VERSION, "返回的版本号应该与 VERSION 常量匹配");
    }

    /// 测试 get_system_info 返回的应用名称正确
    #[test]
    fn test_get_system_info_name_matches_constant() {
        let result = get_system_info();
        assert!(result.is_ok());

        let info = result.unwrap();
        let system = info.get("system").unwrap();
        let name = system.get("name").unwrap().as_str().unwrap();

        // 验证名称与常量匹配
        assert_eq!(name, NAME, "返回的名称应该与 NAME 常量匹配");
    }

    /// 测试 get_system_info 返回的操作系统信息不为空
    #[test]
    fn test_get_system_info_os_info_not_empty() {
        let result = get_system_info();
        assert!(result.is_ok());

        let info = result.unwrap();
        let os = info.get("os").unwrap();

        // 验证操作系统类型不为空
        let os_type = os.get("type").unwrap().as_str().unwrap();
        assert!(!os_type.is_empty(), "操作系统类型不应该为空");

        // 验证操作系统族不为空
        let os_family = os.get("family").unwrap().as_str().unwrap();
        assert!(!os_family.is_empty(), "操作系统族不应该为空");

        // 验证架构不为空
        let arch = os.get("arch").unwrap().as_str().unwrap();
        assert!(!arch.is_empty(), "架构不应该为空");
    }

    /// 测试 get_system_info 返回的 Rust 版本信息不为空
    #[test]
    fn test_get_system_info_rust_version_not_empty() {
        let result = get_system_info();
        assert!(result.is_ok());

        let info = result.unwrap();
        let rust = info.get("rust").unwrap();

        // 验证 Rust 版本不为空
        let rust_version = rust.get("version").unwrap().as_str().unwrap();
        assert!(!rust_version.is_empty(), "Rust 版本不应该为空");

        // 验证编译器版本不为空
        let compiler = rust.get("compiler").unwrap().as_str().unwrap();
        assert!(!compiler.is_empty(), "编译器版本不应该为空");
    }

    /// 测试 get_system_info 可以多次调用
    #[test]
    fn test_get_system_info_multiple_calls() {
        // 第一次调用
        let result1 = get_system_info();
        assert!(result1.is_ok());

        // 第二次调用
        let result2 = get_system_info();
        assert!(result2.is_ok());

        // 验证两次调用返回相同的数据
        let info1 = result1.unwrap();
        let info2 = result2.unwrap();

        assert_eq!(
            info1.get("system"),
            info2.get("system"),
            "多次调用应该返回相同的系统信息"
        );
        assert_eq!(
            info1.get("os"),
            info2.get("os"),
            "多次调用应该返回相同的操作系统信息"
        );
        assert_eq!(
            info1.get("rust"),
            info2.get("rust"),
            "多次调用应该返回相同的 Rust 版本信息"
        );
    }
}
