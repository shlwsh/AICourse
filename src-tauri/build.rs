// Tauri 构建脚本
//
// 此脚本在编译前运行，用于生成 Tauri 所需的上下文信息
// 包括应用配置、图标资源等

fn main() {
    // 设置 Rust 编译器版本环境变量
    // 这将在编译时捕获 rustc 版本信息
    println!("cargo:rustc-env=RUSTC_VERSION={}", rustc_version());

    tauri_build::build()
}

/// 获取 Rust 编译器版本
fn rustc_version() -> String {
    use std::process::Command;

    // 执行 rustc --version 命令
    let output = Command::new("rustc")
        .arg("--version")
        .output()
        .expect("无法执行 rustc --version 命令");

    // 将输出转换为字符串
    String::from_utf8_lossy(&output.stdout)
        .trim()
        .to_string()
}
