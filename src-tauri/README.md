# Tauri 桌面应用

本目录包含 Tauri 桌面应用的最小化配置。

## 架构说明

根据项目架构规范，Tauri **仅作为桌面应用打包工具**，不包含任何业务逻辑：

- ✅ Tauri 作为应用容器，加载前端页面
- ✅ 所有业务逻辑在 `src-service/` 中实现（Hono 后端）
- ✅ 前端通过 HTTP API 调用后端服务
- ❌ 不在 Tauri 中实现业务逻辑、算法或数据处理

## 目录结构

```
src-tauri/
├── src/
│   ├── main.rs          # Tauri 应用入口（最小化）
│   └── lib.rs           # 库文件（仅包含常量）
├── icons/               # 应用图标
├── Cargo.toml           # Rust 依赖配置（最小化）
├── tauri.conf.json      # Tauri 配置文件
└── build.rs             # 构建脚本
```

## 开发说明

### 日常开发

开发时使用浏览器模式（更快、更方便调试）：

```bash
# 启动前端和后端服务
bun run dev

# 访问 http://localhost:5173
```

### 测试桌面应用

仅在需要测试桌面应用特性时启动 Tauri：

```bash
# 启动 Tauri 桌面应用
bun run tauri:dev
```

### 构建桌面应用

```bash
# 构建生产版本
bun run tauri:build
```

## 注意事项

1. **不要在 Tauri 中添加业务逻辑**
   - 所有业务逻辑必须在 `src-service/` 中实现
   - Tauri 仅负责加载前端页面

2. **保持最小化**
   - 只保留必要的 Tauri 配置和启动代码
   - 不添加额外的 Rust 依赖

3. **优先使用浏览器模式**
   - 开发时使用 `bun run dev`（不启动 Tauri）
   - 仅在需要时使用 `bun run tauri:dev`
