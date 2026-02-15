# Tauri 开发服务器配置指南

## 概述

本文档详细说明了排课系统的 Tauri 开发服务器配置，包括前端开发服务器（Vite）、服务层（Hono）和 Rust 后端的集成配置。

## 架构说明

```
┌─────────────────────────────────────────────────────────┐
│                  Tauri 应用窗口                          │
│                                                          │
│  ┌────────────────────────────────────────────────┐    │
│  │         前端 (Vue 3 + Vite)                     │    │
│  │         http://localhost:5173                   │    │
│  └────────────────────────────────────────────────┘    │
│                       ↓ HTTP Proxy                      │
│  ┌────────────────────────────────────────────────┐    │
│  │         服务层 (Hono + Bun)                     │    │
│  │         http://localhost:3000                   │    │
│  └────────────────────────────────────────────────┘    │
│                       ↓ Tauri IPC                       │
│  ┌────────────────────────────────────────────────┐    │
│  │         Rust 后端 (Tauri Commands)              │    │
│  │         约束求解器 + 数据访问层                  │    │
│  └────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────┘
```

## 配置文件说明

### 1. Tauri 配置 (`src-tauri/tauri.conf.json`)

#### 1.1 构建配置

```json
{
  "build": {
    "beforeDevCommand": "bun run dev",
    "beforeBuildCommand": "bun run build",
    "devPath": "http://localhost:5173",
    "distDir": "../dist"
  }
}
```

**配置说明：**

- `beforeDevCommand`: 开发模式下启动前端开发服务器的命令
  - 使用 Bun 运行时执行 `package.json` 中的 `dev` 脚本
  - 该脚本会启动 Vite 开发服务器在 5173 端口

- `beforeBuildCommand`: 生产构建前执行的命令
  - 构建前端资源到 `dist` 目录
  - Tauri 会将构建后的资源打包到应用中

- `devPath`: 开发模式下前端服务器的 URL
  - Tauri 窗口会加载此 URL 的内容
  - 必须与 Vite 配置中的端口一致

- `distDir`: 生产构建后的前端资源目录
  - 相对于 `src-tauri` 目录的路径
  - Tauri 从此目录加载静态资源

#### 1.2 API 权限配置

```json
{
  "tauri": {
    "allowlist": {
      "all": false,
      "fs": {
        "scope": ["$APPDATA/*", "$APPDATA/**"]
      },
      "http": {
        "scope": [
          "http://localhost:3000/*",
          "http://127.0.0.1:3000/*"
        ]
      }
    }
  }
}
```

**安全说明：**

- 采用白名单模式，默认拒绝所有 API 访问
- 文件系统访问限制在应用数据目录
- HTTP 请求限制在本地服务层地址
- 防止恶意代码访问系统资源

#### 1.3 窗口配置

```json
{
  "windows": [
    {
      "title": "排课系统",
      "width": 1280,
      "height": 800,
      "minWidth": 1024,
      "minHeight": 600,
      "center": true,
      "resizable": true
    }
  ]
}
```

**窗口特性：**

- 初始尺寸：1280x800 像素
- 最小尺寸：1024x600 像素（确保 UI 可用性）
- 居中显示，可调整大小
- 支持文件拖放

### 2. Vite 配置 (`vite.config.ts`)

#### 2.1 开发服务器配置

```typescript
{
  server: {
    port: 5173,
    strictPort: false,
    host: true,
    open: false,
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true
      }
    }
  }
}
```

**配置说明：**

- `port: 5173`: 开发服务器端口，与 Tauri 配置一致
- `strictPort: false`: 端口被占用时自动尝试下一个端口
- `host: true`: 监听所有网络接口，支持局域网访问
- `open: false`: 不自动打开浏览器（Tauri 应用不需要）
- `proxy`: 将 `/api` 请求代理到 Hono 服务层

#### 2.2 热模块替换（HMR）

```typescript
{
  server: {
    hmr: {
      protocol: 'ws',
      host: 'localhost',
      port: 5173,
      overlay: true
    }
  }
}
```

**HMR 特性：**

- 使用 WebSocket 协议进行实时通信
- 代码修改后自动刷新页面
- 保留组件状态（Vue 3 支持）
- 显示错误覆盖层

#### 2.3 路径别名

```typescript
{
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
      '@components': resolve(__dirname, 'src/components'),
      '@views': resolve(__dirname, 'src/views'),
      '@stores': resolve(__dirname, 'src/stores'),
      '@utils': resolve(__dirname, 'src/utils'),
      '@api': resolve(__dirname, 'src/api')
    }
  }
}
```

**使用示例：**

```typescript
// 不使用别名（相对路径）
import { logger } from '../../../utils/logger';

// 使用别名（绝对路径）
import { logger } from '@utils/logger';
```

#### 2.4 构建优化

```typescript
{
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'vue-vendor': ['vue', 'vue-router', 'pinia'],
          'element-plus': ['element-plus'],
          'tauri-api': ['@tauri-apps/api']
        }
      }
    }
  }
}
```

**优化策略：**

- 将第三方库分离到独立的 chunk
- 提高浏览器缓存效率
- 减少主包体积
- 支持并行加载

## 启动流程

### 开发模式启动

```bash
# 1. 启动 Hono 服务层（可选，如果需要 API）
bun run server

# 2. 启动 Tauri 开发模式
bun run tauri dev
```

**启动顺序：**

1. Tauri CLI 读取 `tauri.conf.json` 配置
2. 执行 `beforeDevCommand`，启动 Vite 开发服务器
3. Vite 在 5173 端口启动，编译前端代码
4. Tauri 编译 Rust 后端代码
5. Tauri 创建应用窗口，加载 `http://localhost:5173`
6. 前端通过代理访问 Hono 服务层（3000 端口）
7. Hono 通过 Tauri IPC 调用 Rust 命令

### 生产构建

```bash
# 构建应用
bun run tauri build
```

**构建流程：**

1. 执行 `beforeBuildCommand`，构建前端资源到 `dist`
2. Tauri 编译 Rust 后端（release 模式）
3. 打包前端资源和 Rust 二进制文件
4. 生成平台特定的安装包（MSI/DMG/DEB）

## 端口配置

| 服务 | 端口 | 说明 |
|------|------|------|
| Vite 开发服务器 | 5173 | 前端开发服务器 |
| Hono 服务层 | 3000 | RESTful API 服务 |
| HMR WebSocket | 5173 | 热模块替换通信 |

**端口冲突处理：**

- Vite: `strictPort: false`，自动尝试下一个端口
- Hono: 可通过环境变量 `PORT` 修改端口
- 修改端口后需同步更新 Tauri 和 Vite 配置

## 环境变量

### 前端环境变量

创建 `.env.development` 文件：

```bash
# Vite 开发服务器端口
VITE_DEV_SERVER_PORT=5173

# Hono 服务层地址
VITE_API_BASE_URL=http://localhost:3000

# 日志级别
VITE_LOG_LEVEL=debug

# 是否启用 Mock 数据
VITE_USE_MOCK=false
```

**使用方式：**

```typescript
// 在 TypeScript 代码中访问
const apiBaseUrl = import.meta.env.VITE_API_BASE_URL;
const logLevel = import.meta.env.VITE_LOG_LEVEL;
```

### Rust 环境变量

创建 `src-tauri/.env` 文件：

```bash
# 数据库路径
DATABASE_URL=sqlite://data/schedule.db

# 日志级别
RUST_LOG=info

# 是否启用调试模式
DEBUG=false
```

## 开发工具

### 1. Tauri DevTools

在开发模式下，可以使用浏览器开发者工具：

- **打开方式**: 右键点击窗口 → "检查元素"
- **快捷键**: `Ctrl+Shift+I` (Windows/Linux) 或 `Cmd+Option+I` (macOS)

**功能：**

- 查看 DOM 结构
- 调试 JavaScript 代码
- 查看网络请求
- 查看控制台日志

### 2. Rust 日志

在 Rust 代码中使用 `tracing` 框架记录日志：

```rust
use tracing::{info, debug, warn, error};

#[tauri::command]
fn generate_schedule() -> Result<Schedule, String> {
    info!("开始生成课表");
    debug!("配置参数: {:?}", config);
    
    // ... 业务逻辑
    
    info!("课表生成成功");
    Ok(schedule)
}
```

**查看日志：**

- 开发模式：日志输出到终端
- 生产模式：日志保存到文件（`$APPDATA/logs/`）

### 3. Vue DevTools

安装 Vue DevTools 浏览器扩展：

- Chrome: [Vue.js devtools](https://chrome.google.com/webstore/detail/vuejs-devtools/nhdogjmejiglipccpnnnanhbledajbpd)
- Firefox: [Vue.js devtools](https://addons.mozilla.org/en-US/firefox/addon/vue-js-devtools/)

**功能：**

- 查看组件树
- 检查组件状态
- 查看 Pinia store 状态
- 时间旅行调试

## 常见问题

### 1. 端口被占用

**问题：** Vite 启动失败，提示端口 5173 被占用

**解决方案：**

```bash
# 查找占用端口的进程
lsof -i :5173  # macOS/Linux
netstat -ano | findstr :5173  # Windows

# 杀死进程
kill -9 <PID>  # macOS/Linux
taskkill /PID <PID> /F  # Windows

# 或修改 vite.config.ts 中的端口
server: {
  port: 5174  // 使用其他端口
}
```

### 2. HMR 不工作

**问题：** 修改代码后页面不自动刷新

**解决方案：**

1. 检查 Vite 配置中的 `hmr` 设置
2. 确保防火墙允许 WebSocket 连接
3. 尝试禁用浏览器扩展
4. 清除浏览器缓存

### 3. 代理请求失败

**问题：** 前端无法访问 Hono 服务层 API

**解决方案：**

1. 确保 Hono 服务层已启动（`bun run server`）
2. 检查 Vite 代理配置是否正确
3. 查看浏览器控制台的网络请求
4. 检查 Hono 服务层日志

### 4. Tauri 窗口空白

**问题：** Tauri 窗口打开后显示空白页面

**解决方案：**

1. 检查 Vite 开发服务器是否正常启动
2. 确认 `tauri.conf.json` 中的 `devPath` 正确
3. 查看 Tauri 终端输出的错误信息
4. 打开开发者工具查看控制台错误

### 5. 构建失败

**问题：** 执行 `bun run tauri build` 失败

**解决方案：**

1. 确保所有依赖已安装（`bun install`）
2. 检查 Rust 工具链是否正确安装
3. 清除构建缓存：
   ```bash
   rm -rf dist
   rm -rf src-tauri/target
   ```
4. 重新构建

## 性能优化建议

### 1. 开发模式优化

- 使用 `optimizeDeps.include` 预构建常用依赖
- 启用 Vite 的依赖缓存
- 减少不必要的文件监听

### 2. 构建优化

- 启用代码分割（`manualChunks`）
- 压缩静态资源
- 使用 CDN 加载大型第三方库（可选）

### 3. 运行时优化

- 使用虚拟滚动处理大量数据
- 实现组件懒加载
- 优化图片资源（WebP 格式）

## 调试技巧

### 1. 前端调试

```typescript
// 使用 console.log 输出调试信息
console.log('课表数据:', schedule);

// 使用 debugger 断点
function generateSchedule() {
  debugger;  // 代码会在此处暂停
  // ...
}

// 使用 Vue DevTools 查看组件状态
```

### 2. Rust 调试

```rust
// 使用 tracing 输出日志
use tracing::{debug, info};

#[tauri::command]
fn my_command() {
    debug!("调试信息: {:?}", data);
    info!("执行命令");
}

// 使用 dbg! 宏快速调试
let result = dbg!(calculate_cost(&schedule));
```

### 3. 网络调试

- 使用浏览器开发者工具的 Network 面板
- 查看请求/响应头和数据
- 检查代理配置是否生效

## 相关文档

- [Tauri 官方文档](https://tauri.app/v1/guides/)
- [Vite 官方文档](https://vitejs.dev/)
- [Vue 3 官方文档](https://vuejs.org/)
- [Bun 官方文档](https://bun.sh/docs)

## 总结

本配置文档详细说明了 Tauri 开发服务器的配置方法，包括：

1. ✅ Tauri 配置文件的详细说明
2. ✅ Vite 开发服务器配置
3. ✅ 端口和代理配置
4. ✅ 环境变量管理
5. ✅ 开发工具使用
6. ✅ 常见问题解决
7. ✅ 性能优化建议
8. ✅ 调试技巧

通过正确配置开发服务器，可以实现：

- 🚀 快速的开发体验（HMR）
- 🔧 便捷的调试工具
- 🔒 安全的 API 访问控制
- 📦 优化的生产构建

如有问题，请参考相关文档或联系开发团队。
