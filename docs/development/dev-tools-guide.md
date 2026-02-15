# 开发工具配置指南

## 概述

本文档详细说明了排课系统的开发工具配置，包括热重载（HMR）、Vue DevTools、调试工具和开发环境优化。

## 配置完成时间

**2024年** - 任务 1.3.3：配置热重载和开发工具

## 技术栈

- **Vite**: v5.0.0+ - 下一代前端构建工具，内置 HMR 支持
- **Vue DevTools**: v8.0.0+ - Vue 3 官方调试工具
- **VS Code**: 推荐的集成开发环境
- **Bun**: v1.0.0+ - 高性能 JavaScript 运行时

---

## 1. 热模块替换（HMR）配置

### 1.1 什么是 HMR？

热模块替换（Hot Module Replacement，HMR）是一种在应用运行时替换、添加或删除模块的技术，无需完全刷新页面。这大大提高了开发效率。

### 1.2 HMR 配置详情

在 `vite.config.ts` 中已配置：

```typescript
server: {
  port: 5173,
  hmr: {
    protocol: 'ws',
    host: 'localhost',
    port: 5173,
    overlay: true,
    timeout: 30000,
    clientPort: 5173,
  },
}
```

**配置说明**：

- **protocol**: 使用 WebSocket 协议进行 HMR 通信
- **host**: HMR 服务器主机地址
- **port**: HMR 服务器端口（与开发服务器端口一致）
- **overlay**: 显示编译错误和警告的浮层
- **timeout**: HMR 连接超时时间（30秒）
- **clientPort**: 客户端连接端口（Tauri 环境需要）

### 1.3 HMR 工作原理

1. **文件监听**：Vite 监听源代码文件的变化
2. **模块更新**：检测到变化后，Vite 重新编译受影响的模块
3. **WebSocket 推送**：通过 WebSocket 将更新推送到浏览器
4. **模块替换**：浏览器接收更新并替换旧模块
5. **状态保持**：Vue 组件状态在更新后保持不变

### 1.4 HMR 日志监控

在 `src/main.ts` 中已添加 HMR 事件监听：

```typescript
if (import.meta.hot) {
  import.meta.hot.on('vite:beforeUpdate', () => {
    logger.debug('HMR: 检测到文件变更，准备更新模块');
  });

  import.meta.hot.on('vite:afterUpdate', () => {
    logger.debug('HMR: 模块更新完成');
  });

  import.meta.hot.on('vite:error', (err) => {
    logger.error('HMR: 更新失败', err);
  });
}
```

### 1.5 HMR 使用技巧

**支持 HMR 的文件类型**：
- ✅ `.vue` 单文件组件
- ✅ `.ts` / `.js` TypeScript/JavaScript 文件
- ✅ `.css` / `.scss` 样式文件
- ✅ `.json` JSON 数据文件

**不支持 HMR 的情况**：
- ❌ 修改 `vite.config.ts` 需要重启开发服务器
- ❌ 修改 `.env` 环境变量文件需要重启
- ❌ 修改 `package.json` 需要重新安装依赖

**最佳实践**：
1. 保持组件小而专注，提高 HMR 效率
2. 使用 Vue 3 Composition API，状态保持更可靠
3. 避免在组件外部定义可变状态
4. 使用 Pinia 管理全局状态，HMR 友好

---

## 2. Vue DevTools 配置

### 2.1 什么是 Vue DevTools？

Vue DevTools 是 Vue.js 官方提供的调试工具，可以检查组件树、查看状态、追踪事件、分析性能等。

### 2.2 使用浏览器扩展版本

由于 vite-plugin-vue-devtools 在当前环境中存在兼容性问题，我们推荐使用浏览器扩展版本的 Vue DevTools。

**安装方法**：

1. **Chrome 浏览器**
   - 访问：https://chrome.google.com/webstore/detail/vuejs-devtools/nhdogjmejiglipccpnnnanhbledajbpd
   - 点击"添加至 Chrome"

2. **Edge 浏览器**
   - 访问：https://microsoftedge.microsoft.com/addons/detail/vuejs-devtools/olofadcdnkkjdfgjcmjaadnlehnnihnl
   - 点击"获取"

3. **Firefox 浏览器**
   - 访问：https://addons.mozilla.org/en-US/firefox/addon/vue-js-devtools/
   - 点击"添加到 Firefox"

### 2.3 在 Tauri 应用中使用 Vue DevTools

**方法 1：使用浏览器调试**

1. 启动开发服务器：
   ```bash
   bun run dev
   ```

2. 在浏览器中打开：http://localhost:5173

3. 按 `F12` 打开开发者工具，切换到 "Vue" 标签页

**方法 2：在 Tauri 窗口中调试**

1. 启动 Tauri 开发环境：
   ```bash
   bun run tauri:dev
   ```

2. 在 Tauri 窗口中右键点击，选择"检查元素"

3. 在开发者工具中切换到 "Vue" 标签页

**注意**：Tauri 窗口使用的是系统 WebView，需要确保已安装浏览器扩展。

### 2.4 Vue DevTools 主要功能

#### 2.3.1 组件树（Components）

- 查看组件层级结构
- 检查组件的 props、data、computed
- 实时编辑组件状态
- 查看组件的渲染性能

#### 2.3.2 时间线（Timeline）

- 追踪组件事件
- 查看路由变化
- 监控 Pinia 状态变更
- 性能分析

#### 2.3.3 路由（Router）

- 查看当前路由信息
- 查看路由历史
- 测试路由导航

#### 2.3.4 Pinia 状态管理

- 查看所有 store 的状态
- 实时编辑 store 状态
- 追踪 action 调用
- 时间旅行调试

### 2.4 Vue DevTools 快捷键

- `Ctrl/Cmd + Shift + D`: 打开 DevTools
- `Ctrl/Cmd + Shift + C`: 选择组件
- `Ctrl/Cmd + Shift + E`: 编辑组件

---

## 3. VS Code 调试配置

### 3.1 调试配置文件

已创建 `.vscode/launch.json`，包含以下调试配置：

#### 3.1.1 Tauri 应用调试

```json
{
  "name": "Tauri 开发调试",
  "type": "lldb",
  "request": "launch",
  "program": "${workspaceFolder}/src-tauri/target/debug/course-scheduling-system"
}
```

**使用方法**：
1. 按 `F5` 或点击"运行和调试"
2. 选择"Tauri 开发调试"
3. 设置断点并开始调试

#### 3.1.2 前端调试（Chrome/Edge）

```json
{
  "name": "前端调试 (Chrome)",
  "type": "chrome",
  "request": "launch",
  "url": "http://localhost:5173"
}
```

**使用方法**：
1. 启动开发服务器：`bun run dev`
2. 按 `F5` 选择"前端调试 (Chrome)"
3. 在 VS Code 中设置断点
4. 刷新浏览器触发断点

#### 3.1.3 Vitest 单元测试调试

```json
{
  "name": "Vitest 单元测试调试",
  "type": "node",
  "request": "launch",
  "runtimeExecutable": "bun",
  "runtimeArgs": ["test", "--run"]
}
```

**使用方法**：
1. 在测试文件中设置断点
2. 按 `F5` 选择"Vitest 单元测试调试"
3. 测试运行到断点时暂停

#### 3.1.4 全栈调试

```json
{
  "name": "全栈调试",
  "configurations": ["Tauri 开发调试", "服务层调试"]
}
```

**使用方法**：
1. 按 `F5` 选择"全栈调试"
2. 同时调试前端和后端
3. 可以在两端同时设置断点

### 3.2 VS Code 任务配置

已创建 `.vscode/tasks.json`，包含常用任务：

| 任务名称 | 快捷键 | 说明 |
|---------|--------|------|
| 启动前端开发服务器 | `Ctrl+Shift+B` | 启动 Vite 开发服务器 |
| 启动 Tauri 开发环境 | - | 启动 Tauri 应用 |
| 启动服务层开发服务器 | - | 启动 Hono 服务层 |
| 构建前端 | - | 构建生产版本 |
| 构建 Tauri 应用 | `Ctrl+Shift+B` | 构建 Tauri 安装包 |
| 运行单元测试 | - | 运行 Vitest 测试 |
| 运行集成测试 | `Ctrl+Shift+T` | 运行 Playwright 测试 |
| 格式化代码 | - | 使用 Prettier 格式化 |
| 代码检查 | - | 运行 ESLint |
| 类型检查 | - | 运行 TypeScript 检查 |

**使用方法**：
1. 按 `Ctrl+Shift+P` 打开命令面板
2. 输入 "Tasks: Run Task"
3. 选择要执行的任务

### 3.3 VS Code 工作区设置

已创建 `.vscode/settings.json`，包含以下配置：

- **自动格式化**：保存时自动格式化代码
- **ESLint 自动修复**：保存时自动修复 ESLint 错误
- **TypeScript 智能提示**：使用工作区的 TypeScript 版本
- **Rust 格式化**：保存时自动格式化 Rust 代码
- **文件排除**：隐藏 node_modules、dist、target 等目录

---

## 4. 开发环境优化

### 4.1 Vite 性能优化

#### 4.1.1 依赖预构建

```typescript
optimizeDeps: {
  include: [
    'vue',
    'vue-router',
    'pinia',
    'element-plus',
    '@tauri-apps/api',
  ],
}
```

**作用**：
- 将 CommonJS 模块转换为 ESM
- 减少 HTTP 请求数量
- 提高开发服务器启动速度

#### 4.1.2 代码分割

```typescript
build: {
  rollupOptions: {
    output: {
      manualChunks: {
        'vue-vendor': ['vue', 'vue-router', 'pinia'],
        'element-plus': ['element-plus'],
        'tauri-api': ['@tauri-apps/api'],
      },
    },
  },
}
```

**作用**：
- 将第三方库分离到独立的 chunk
- 提高缓存效率
- 减少首屏加载时间

### 4.2 Tauri 开发优化

#### 4.2.1 端口一致性

确保 `vite.config.ts` 和 `src-tauri/tauri.conf.json` 中的端口一致：

```typescript
// vite.config.ts
server: {
  port: 5173,
}
```

```json
// src-tauri/tauri.conf.json
{
  "build": {
    "devPath": "http://localhost:5173"
  }
}
```

#### 4.2.2 开发命令优化

```json
// src-tauri/tauri.conf.json
{
  "build": {
    "beforeDevCommand": "bun run dev",
    "beforeBuildCommand": "bun run build"
  }
}
```

**工作流程**：
1. 执行 `bun run tauri:dev`
2. Tauri 自动启动 `bun run dev`（Vite 开发服务器）
3. 等待 Vite 启动完成
4. Tauri 编译 Rust 后端
5. 打开应用窗口，加载 http://localhost:5173

### 4.3 日志记录优化

#### 4.3.1 前端日志

在 `src/main.ts` 中已实现结构化日志：

```typescript
const logger = {
  info: (message: string, ...args: any[]) => {
    console.log(`[INFO] ${new Date().toISOString()} - ${message}`, ...args);
  },
  // ... 其他日志级别
};
```

**日志级别**：
- `DEBUG`: 详细的调试信息（仅开发环境）
- `INFO`: 一般信息
- `WARN`: 警告信息
- `ERROR`: 错误信息

#### 4.3.2 HMR 日志

```typescript
if (import.meta.hot) {
  import.meta.hot.on('vite:beforeUpdate', () => {
    logger.debug('HMR: 检测到文件变更，准备更新模块');
  });
}
```

**作用**：
- 监控 HMR 更新过程
- 快速定位 HMR 问题
- 提供详细的调试信息

---

## 5. 常见问题和解决方案

### 5.1 HMR 不工作

**问题**：修改代码后页面没有自动更新

**解决方案**：

1. **检查 WebSocket 连接**
   ```bash
   # 在浏览器控制台查看是否有 WebSocket 连接错误
   # 应该看到: [vite] connected.
   ```

2. **检查端口配置**
   ```typescript
   // vite.config.ts
   server: {
     port: 5173,
     hmr: {
       port: 5173,
       clientPort: 5173,
     },
   }
   ```

3. **重启开发服务器**
   ```bash
   # 停止当前服务器（Ctrl+C）
   bun run dev
   ```

4. **清除缓存**
   ```bash
   # 删除 node_modules/.vite 缓存
   rm -rf node_modules/.vite
   bun run dev
   ```

### 5.2 Vue DevTools 不显示

**问题**：开发者工具中没有 Vue 标签页

**解决方案**：

1. **确认插件已安装**
   ```bash
   bun add -d vite-plugin-vue-devtools
   ```

2. **检查 Vite 配置**
   ```typescript
   import vueDevTools from 'vite-plugin-vue-devtools';

   plugins: [
     vue(),
     vueDevTools({ enabled: true }),
   ]
   ```

3. **刷新页面**
   - 按 `Ctrl+Shift+R` 强制刷新
   - 或关闭并重新打开开发者工具

4. **检查浏览器扩展**
   - 确保安装了 Vue DevTools 浏览器扩展
   - Chrome: https://chrome.google.com/webstore/detail/vuejs-devtools/nhdogjmejiglipccpnnnanhbledajbpd
   - Edge: https://microsoftedge.microsoft.com/addons/detail/vuejs-devtools/olofadcdnkkjdfgjcmjaadnlehnnihnl

### 5.3 Tauri 窗口空白

**问题**：启动 Tauri 应用后窗口显示空白

**解决方案**：

1. **检查 Vite 是否启动**
   ```bash
   # 确保看到以下输出：
   # VITE v5.x.x  ready in xxx ms
   # ➜  Local:   http://localhost:5173/
   ```

2. **检查端口是否被占用**
   ```bash
   # Windows
   netstat -ano | findstr :5173

   # Linux/macOS
   lsof -i :5173
   ```

3. **检查 devPath 配置**
   ```json
   // src-tauri/tauri.conf.json
   {
     "build": {
       "devPath": "http://localhost:5173"
     }
   }
   ```

4. **查看 Tauri 控制台日志**
   - 右键点击 Tauri 窗口
   - 选择"检查元素"或"Inspect"
   - 查看控制台错误信息

### 5.4 调试断点不生效

**问题**：在 VS Code 中设置断点但不触发

**解决方案**：

1. **确认 Source Maps 已启用**
   ```typescript
   // vite.config.ts
   build: {
     sourcemap: true,
   }
   ```

2. **检查调试配置**
   ```json
   // .vscode/launch.json
   {
     "sourceMaps": true,
     "webRoot": "${workspaceFolder}/src"
   }
   ```

3. **重启调试会话**
   - 停止当前调试（Shift+F5）
   - 重新启动调试（F5）

4. **使用 debugger 语句**
   ```typescript
   // 在代码中添加
   debugger;
   ```

### 5.5 性能问题

**问题**：开发服务器启动慢或 HMR 更新慢

**解决方案**：

1. **优化依赖预构建**
   ```typescript
   optimizeDeps: {
     include: ['vue', 'vue-router', 'pinia', 'element-plus'],
     force: true, // 强制重新预构建
   }
   ```

2. **减少监听文件**
   ```typescript
   server: {
     watch: {
       ignored: ['**/node_modules/**', '**/dist/**', '**/target/**'],
     },
   }
   ```

3. **使用 SSD 硬盘**
   - 将项目移动到 SSD 硬盘
   - 避免在网络驱动器上开发

4. **关闭不必要的插件**
   - 临时禁用 Vue DevTools
   - 减少 VS Code 扩展数量

---

## 6. 开发工作流

### 6.1 日常开发流程

```bash
# 1. 启动开发环境
bun run tauri:dev

# 2. 修改代码
# - 编辑 .vue 文件
# - 保存后自动触发 HMR
# - 页面实时更新

# 3. 调试
# - 使用 Vue DevTools 检查组件
# - 使用浏览器开发者工具调试
# - 使用 VS Code 断点调试

# 4. 测试
bun run test:unit        # 单元测试
bun run test:integration # 集成测试

# 5. 提交代码
git add .
git commit -m "feat: 实现某功能"
git push
```

### 6.2 多终端开发

**推荐配置**：

1. **终端 1**：前端开发服务器
   ```bash
   bun run dev
   ```

2. **终端 2**：服务层开发服务器
   ```bash
   bun run service:dev
   ```

3. **终端 3**：Tauri 应用
   ```bash
   bun run tauri dev
   ```

4. **终端 4**：测试和其他命令
   ```bash
   bun run test
   ```

### 6.3 快捷键总结

| 功能 | 快捷键 |
|------|--------|
| 启动调试 | `F5` |
| 停止调试 | `Shift+F5` |
| 重启调试 | `Ctrl+Shift+F5` |
| 单步跳过 | `F10` |
| 单步进入 | `F11` |
| 单步跳出 | `Shift+F11` |
| 继续执行 | `F5` |
| 切换断点 | `F9` |
| 打开命令面板 | `Ctrl+Shift+P` |
| 打开终端 | `Ctrl+` ` |
| 运行任务 | `Ctrl+Shift+B` |
| 打开 DevTools | `F12` |

---

## 7. 参考资源

- [Vite 官方文档](https://vitejs.dev/)
- [Vue DevTools 文档](https://devtools.vuejs.org/)
- [Tauri 官方文档](https://tauri.app/)
- [VS Code 调试文档](https://code.visualstudio.com/docs/editor/debugging)
- [Bun 官方文档](https://bun.sh/)

---

## 总结

开发工具已成功配置，包括：

✅ Vite HMR（热模块替换）配置
✅ Vue DevTools 集成
✅ VS Code 调试配置
✅ VS Code 任务配置
✅ VS Code 工作区设置
✅ 开发环境优化
✅ 日志记录系统
✅ 常见问题解决方案

现在可以享受高效的开发体验了！🎉
