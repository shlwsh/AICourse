// 排课系统 Tauri 桌面应用入口
// Tauri 仅作为应用容器，所有业务逻辑通过 Hono 后端服务实现

#![cfg_attr(
    all(not(debug_assertions), target_os = "windows"),
    windows_subsystem = "windows"
)]

/// 获取系统信息
#[tauri::command]
fn get_system_info() -> Result<serde_json::Value, String> {
    let info = serde_json::json!({
        "name": env!("CARGO_PKG_NAME"),
        "version": env!("CARGO_PKG_VERSION"),
        "description": env!("CARGO_PKG_DESCRIPTION"),
        "os": std::env::consts::OS,
        "arch": std::env::consts::ARCH,
    });
    Ok(info)
}

fn main() {
    tauri::Builder::default()
        // 注册 Tauri 插件
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        // 注册命令
        .invoke_handler(tauri::generate_handler![
            get_system_info,
        ])
        // 运行应用
        .run(tauri::generate_context!())
        .expect("运行 Tauri 应用时出错");
}
