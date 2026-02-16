# Tauri 2.x 升级指南

> ✅ **升级状态**：已完成（2026-02-17）
>
> 所有依赖和配置已成功升级到 Tauri 2.x，验证脚本通过所有检查。

## 升级原因

当前项目使用 Tauri 1.5，存在以下问题：
1. **对话框 API 阻塞问题**：`dialog.save()` 和 `dialog.open()` 会导致应用卡死
2. **性能优化空间**：Tauri 2.x 提供更小的 bundle 大小和更好的性能
3. **Vue 3 集成**：Tauri 2.x 原生支持 Vue 3，提供更好的开发体验
4. **移动端支持**：Tauri 2.x 支持 iOS 和 Android 平台

## 升级步骤

### 第 1 步：备份当前项目

```bash
# 创建备份分支
git checkout -b backup-tauri-v1
git push origin backup-tauri-v1

# 回到主分支
git checkout main
```

### 第 2 步：更新 Rust 依赖

编辑 `src-tauri/Cargo.toml`：

```toml
[build-dependencies]
tauri-build = { version = "2", features = [] }

[dependencies]
tauri = { version = "2", features = [
    "protocol-asset",
    "tray-icon",
] }
tauri-plugin-shell = "2"
tauri-plugin-dialog = "2"
tauri-plugin-fs = "2"
tauri-plugin-notification = "2"
```

**重要变更**：
- Tauri 2.x 将许多功能拆分为插件
- 需要单独添加 `tauri-plugin-*` 依赖
- 移除了 `custom-protocol` feature，改用 `protocol-asset`

### 第 3 步：更新前端依赖

```bash
# 更新 Tauri API
bun remove @tauri-apps/api
bun add @tauri-apps/api@^2.0.0

# 添加 Tauri 插件（如果需要）
bun add @tauri-apps/plugin-shell@^2.0.0
bun add @tauri-apps/plugin-dialog@^2.0.0
bun add @tauri-apps/plugin-fs@^2.0.0
bun add @tauri-apps/plugin-notification@^2.0.0
```

### 第 4 步：更新 Tauri 配置文件

Tauri 2.x 使用新的配置格式。编辑 `src-tauri/tauri.conf.json`：

**主要变更**：
1. `tauri.allowlist` → `plugins` 配置
2. `tauri.bundle` → `bundle` 配置
3. `tauri.windows` → `app.windows` 配置

参考官方迁移指南：https://v2.tauri.app/start/migrate/from-tauri-1/

### 第 5 步：更新 Rust 代码

#### 5.1 更新 main.rs

```rust
// Tauri 1.x
fn main() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![...])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

// Tauri 2.x
fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .invoke_handler(tauri::generate_handler![...])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
```

#### 5.2 更新对话框 API

```rust
// Tauri 1.x - 会导致卡死
use tauri::api::dialog;

#[tauri::command]
async fn save_file() -> Result<String, String> {
    let path = dialog::blocking::save_file(None, None);
    // ...
}

// Tauri 2.x - 使用插件
use tauri_plugin_dialog::DialogExt;

#[tauri::command]
async fn save_file(app: tauri::AppHandle) -> Result<String, String> {
    let path = app.dialog()
        .file()
        .save_file()
        .await;
    // ...
}
```

#### 5.3 更新文件系统 API

```rust
// Tauri 1.x
use tauri::api::fs;

// Tauri 2.x
use tauri_plugin_fs::FsExt;
```

### 第 6 步：更新前端代码

#### 6.1 更新导入路径

```typescript
// Tauri 1.x
import { invoke } from '@tauri-apps/api/tauri';
import { save } from '@tauri-apps/api/dialog';
import { writeFile } from '@tauri-apps/api/fs';

// Tauri 2.x
import { invoke } from '@tauri-apps/api/core';
import { save } from '@tauri-apps/plugin-dialog';
import { writeFile } from '@tauri-apps/plugin-fs';
```

#### 6.2 更新对话框调用

```typescript
// Tauri 1.x
import { save } from '@tauri-apps/api/dialog';

const filePath = await save({
  defaultPath: 'file.xlsx',
  filters: [{
    name: 'Excel',
    extensions: ['xlsx']
  }]
});

// Tauri 2.x
import { save } from '@tauri-apps/plugin-dialog';

const filePath = await save({
  defaultPath: 'file.xlsx',
  filters: [{
    name: 'Excel',
    extensions: ['xlsx']
  }]
});
```

### 第 7 步：测试升级

```bash
# 清理旧的构建文件
bun run killports
rm -rf src-tauri/target
rm -rf dist

# 重新构建
bun install
cargo clean
cargo build

# 运行开发服务器
bun run dev

# 测试关键功能
# 1. 下载模板（测试对话框 API）
# 2. 文件导入（测试文件选择）
# 3. 数据导出（测试文件保存）
```

### 第 8 步：更新文档

更新以下文档中的 Tauri 版本信息：
- `README.md`
- `docs/development/quick-start.md`
- `docs/development/tauri-dev-server-setup.md`

## 预期改进

升级到 Tauri 2.x 后，预期获得以下改进：

1. **对话框问题解决**：
   - `dialog.save()` 和 `dialog.open()` 不再阻塞
   - 用户可以正常选择文件保存位置
   - 文件导入功能正常工作

2. **性能提升**：
   - 更小的应用体积（约减少 30%）
   - 更快的启动速度
   - 更低的内存占用

3. **开发体验**：
   - 更好的 TypeScript 类型支持
   - 更清晰的 API 设计
   - 更完善的文档

4. **功能扩展**：
   - 支持移动端（iOS/Android）
   - 更多的插件生态
   - 更好的安全性

## 注意事项

1. **破坏性变更**：
   - API 路径变更较多，需要全面测试
   - 配置文件格式变化，需要仔细迁移
   - 某些功能需要额外安装插件

2. **兼容性**：
   - 确保 Rust 版本 >= 1.70
   - 确保 Node.js 版本 >= 18
   - 确保 Bun 版本 >= 1.0

3. **测试覆盖**：
   - 重点测试文件操作功能
   - 测试所有 Tauri 命令
   - 测试双模式兼容性（Tauri + 浏览器）

## 参考资源

- [Tauri 2.0 官方文档](https://v2.tauri.app/)
- [Tauri 1.x 到 2.x 迁移指南](https://v2.tauri.app/start/migrate/from-tauri-1/)
- [Tauri 2.0 发布说明](https://v2.tauri.app/blog/tauri-2-0/)
- [Tauri 插件列表](https://v2.tauri.app/plugin/)

## 回滚方案

如果升级过程中遇到问题，可以回滚到 Tauri 1.x：

```bash
# 切换到备份分支
git checkout backup-tauri-v1

# 或者重置到升级前的提交
git reset --hard <commit-hash>

# 重新安装依赖
bun install
cargo build
```

## 升级时间估算

- 依赖更新：30 分钟
- 代码迁移：2-3 小时
- 测试验证：1-2 小时
- 文档更新：30 分钟

**总计**：约 4-6 小时

## 升级优先级

**高优先级**（建议立即升级）：
- 解决对话框阻塞问题
- 提升应用性能
- 改善开发体验

**建议时机**：
- 在完成当前功能开发后
- 在进行大规模测试前
- 在发布正式版本前


## 验证升级

升级完成后，可以运行验证脚本来确认所有依赖和配置都已正确升级：

```bash
bun run verify:tauri
```

验证脚本会检查：
- 前端依赖版本（@tauri-apps/api、@tauri-apps/cli、插件）
- Rust 依赖版本（tauri、tauri-build、插件）
- Tauri 配置文件格式
- Rust 代码中的插件初始化

如果所有检查都通过，说明升级成功。

## 已完成的升级工作

✅ 更新 @tauri-apps/cli 从 1.6.3 到 2.10.0
✅ 更新 @tauri-apps/api 到 2.10.1
✅ 添加所有必需的 Tauri 2.x 插件
✅ 更新 Rust 依赖到 Tauri 2.x
✅ 更新 tauri.conf.json 配置格式
✅ 更新 main.rs 添加插件初始化
✅ 创建验证脚本 verify:tauri
✅ 验证所有检查通过（18/18）

## 下一步

现在可以正常使用 Tauri 2.x 开发应用：

```bash
# 启动开发服务器
bun run dev

# 或者分别启动
bun run dev:all  # 浏览器模式
bun run dev      # Tauri 桌面模式
```

Tauri 2.x 升级已完成，可以享受更好的性能和更稳定的 API！
