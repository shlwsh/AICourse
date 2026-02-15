# Tauri 配置文件说明

本文档详细说明 `tauri.conf.json` 配置文件中各个字段的含义和作用。

> **注意**: JSON 文件不支持注释，因此配置说明单独保存在此文档中。

## 文件结构

```json
{
  "$schema": "https://schema.tauri.app/config/1",
  "build": { ... },
  "package": { ... },
  "tauri": { ... }
}
```

---

## 1. 构建配置 (build)

### beforeDevCommand
- **类型**: `string`
- **值**: `"bun run dev"`
- **说明**: 开发模式下启动前端开发服务器的命令
- **作用**: 使用 Bun 运行时启动 Vite 开发服务器

### beforeBuildCommand
- **类型**: `string`
- **值**: `"bun run build"`
- **说明**: 生产构建前执行的命令
- **作用**: 构建前端资源到 dist 目录

### devPath
- **类型**: `string`
- **值**: `"http://localhost:5173"`
- **说明**: 开发模式下前端服务器的 URL
- **作用**: Tauri 窗口会加载此 URL 的内容
- **注意**: 必须与 Vite 配置中的端口一致

### distDir
- **类型**: `string`
- **值**: `"../dist"`
- **说明**: 生产构建后的前端资源目录
- **作用**: Tauri 从此目录加载静态资源
- **路径**: 相对于 `src-tauri` 目录

### withGlobalTauri
- **类型**: `boolean`
- **值**: `true`
- **说明**: 启用开发工具
- **作用**: 在开发模式下自动打开浏览器开发者工具

---

## 2. 应用包信息 (package)

### productName
- **类型**: `string`
- **值**: `"排课系统"`
- **说明**: 应用产品名称
- **显示位置**: 窗口标题、任务栏、关于对话框

### version
- **类型**: `string`
- **值**: `"0.1.0"`
- **说明**: 应用版本号
- **格式**: 遵循语义化版本规范 (Semantic Versioning)

---

## 3. Tauri 核心配置 (tauri)

### 3.1 API 权限配置 (allowlist)

采用**白名单模式**，默认拒绝所有 API 访问，按需启用。

#### all
- **类型**: `boolean`
- **值**: `false`
- **说明**: 禁用所有 API
- **安全**: 默认拒绝，按需启用

#### shell
- **all**: `false` - 禁用所有 shell 命令
- **open**: `true` - 允许使用系统默认程序打开文件/URL

#### fs (文件系统)
- **all**: `false` - 禁用所有文件系统操作
- **readFile**: `true` - 允许读取文件
- **writeFile**: `true` - 允许写入文件
- **readDir**: `true` - 允许读取目录
- **copyFile**: `true` - 允许复制文件
- **createDir**: `true` - 允许创建目录
- **removeDir**: `true` - 允许删除目录
- **removeFile**: `true` - 允许删除文件
- **renameFile**: `true` - 允许重命名文件
- **exists**: `true` - 允许检查文件是否存在
- **scope**: `["$APPDATA/*", "$APPDATA/**", "$RESOURCE/*", "$RESOURCE/**"]`
  - 文件系统访问范围限制
  - `$APPDATA`: 应用数据目录（存储数据库、日志等）
  - `$RESOURCE`: 应用资源目录

#### dialog (对话框)
- **all**: `false` - 禁用所有对话框
- **open**: `true` - 允许打开文件选择对话框
- **save**: `true` - 允许保存文件对话框
- **message**: `true` - 允许消息对话框
- **ask**: `true` - 允许询问对话框
- **confirm**: `true` - 允许确认对话框

#### path (路径 API)
- **all**: `true` - 允许所有路径相关 API
- **用途**: 获取应用数据目录、资源目录等

#### http (HTTP 请求)
- **all**: `false` - 禁用所有 HTTP 请求
- **scope**: `["http://localhost:3000/*", "http://127.0.0.1:3000/*"]`
  - 允许的请求范围
  - 用于与 Hono 服务层通信

#### window (窗口 API)
- **all**: `false` - 禁用所有窗口操作
- **create**: `true` - 允许创建新窗口
- **close**: `true` - 允许关闭窗口
- **minimize**: `true` - 允许最小化窗口
- **maximize**: `true` - 允许最大化窗口
- **show**: `true` - 允许显示窗口
- **hide**: `true` - 允许隐藏窗口
- **setTitle**: `true` - 允许设置窗口标题
- **setSize**: `true` - 允许设置窗口大小
- **setPosition**: `true` - 允许设置窗口位置

#### notification (通知)
- **all**: `true` - 允许所有通知功能

---

### 3.2 应用打包配置 (bundle)

#### active
- **类型**: `boolean`
- **值**: `true`
- **说明**: 启用打包

#### targets
- **类型**: `string`
- **值**: `"all"`
- **说明**: 打包目标平台
- **含义**: 当前平台的所有格式

#### identifier
- **类型**: `string`
- **值**: `"com.course-scheduling.app"`
- **说明**: 应用唯一标识符
- **格式**: 反向域名格式

#### icon
- **类型**: `string[]`
- **值**: `["icons/32x32.png", "icons/128x128.png", ...]`
- **说明**: 应用图标路径
- **支持**: 多种尺寸

#### resources
- **类型**: `string[]`
- **值**: `[]`
- **说明**: 需要打包的额外资源文件

#### externalBin
- **类型**: `string[]`
- **值**: `[]`
- **说明**: 需要打包的外部二进制文件

#### copyright
- **类型**: `string`
- **值**: `"Copyright © 2024 排课系统开发团队"`
- **说明**: 版权信息

#### category
- **类型**: `string`
- **值**: `"Education"`
- **说明**: 应用分类（用于应用商店）

#### shortDescription
- **类型**: `string`
- **值**: `"智能排课系统"`
- **说明**: 应用简短描述

#### longDescription
- **类型**: `string`
- **值**: `"基于约束优化的智能课程调度系统..."`
- **说明**: 应用详细描述

---

### 3.3 安全配置 (security)

#### csp (内容安全策略)
- **类型**: `string`
- **值**: `"default-src 'self'; script-src 'self' 'unsafe-inline'; ..."`
- **说明**: 限制前端可以加载的资源来源
- **作用**: 防止 XSS 攻击

**CSP 规则说明**:
- `default-src 'self'`: 默认只允许加载同源资源
- `script-src 'self' 'unsafe-inline'`: 允许内联脚本
- `style-src 'self' 'unsafe-inline'`: 允许内联样式
- `img-src 'self' data: https:`: 允许图片来源
- `font-src 'self' data:`: 允许字体来源
- `connect-src 'self' http://localhost:3000 http://127.0.0.1:3000`: 允许连接到本地服务

---

### 3.4 窗口配置 (windows)

#### title
- **类型**: `string`
- **值**: `"排课系统"`
- **说明**: 窗口标题

#### width / height
- **类型**: `number`
- **值**: `1280` / `800`
- **说明**: 窗口初始宽度和高度（像素）

#### minWidth / minHeight
- **类型**: `number`
- **值**: `1024` / `600`
- **说明**: 窗口最小宽度和高度（像素）

#### resizable
- **类型**: `boolean`
- **值**: `true`
- **说明**: 窗口是否可调整大小

#### fullscreen
- **类型**: `boolean`
- **值**: `false`
- **说明**: 窗口是否全屏

#### center
- **类型**: `boolean`
- **值**: `true`
- **说明**: 窗口是否居中显示

#### decorations
- **类型**: `boolean`
- **值**: `true`
- **说明**: 是否显示窗口装饰（标题栏、边框等）

#### alwaysOnTop
- **类型**: `boolean`
- **值**: `false`
- **说明**: 窗口是否始终置顶

#### skipTaskbar
- **类型**: `boolean`
- **值**: `false`
- **说明**: 是否在任务栏显示

#### theme
- **类型**: `string`
- **值**: `"Light"`
- **说明**: 窗口主题（Light/Dark）

#### backgroundColor
- **类型**: `string`
- **值**: `"#ffffff"`
- **说明**: 窗口背景色（在内容加载前显示）

#### shadow
- **类型**: `boolean`
- **值**: `true`
- **说明**: 是否显示窗口阴影

#### visible
- **类型**: `boolean`
- **值**: `true`
- **说明**: 窗口是否可见（初始状态）

#### transparent
- **类型**: `boolean`
- **值**: `false`
- **说明**: 窗口是否透明

#### fileDropEnabled
- **类型**: `boolean`
- **值**: `true`
- **说明**: 是否启用文件拖放

---

### 3.5 系统托盘配置 (systemTray)

#### iconPath
- **类型**: `string`
- **值**: `"icons/icon.png"`
- **说明**: 托盘图标路径

#### iconAsTemplate
- **类型**: `boolean`
- **值**: `true`
- **说明**: 托盘图标在 macOS 上的外观

#### menuOnLeftClick
- **类型**: `boolean`
- **值**: `false`
- **说明**: 左键点击是否显示菜单

#### tooltip
- **类型**: `string`
- **值**: `"排课系统"`
- **说明**: 托盘提示文本

---

### 3.6 更新配置 (updater)

#### active
- **类型**: `boolean`
- **值**: `false`
- **说明**: 是否启用自动更新

#### endpoints
- **类型**: `string[]`
- **值**: `[]`
- **说明**: 更新服务器端点

#### dialog
- **类型**: `boolean`
- **值**: `true`
- **说明**: 更新检查对话框配置

#### pubkey
- **类型**: `string`
- **值**: `""`
- **说明**: 公钥（用于验证更新包签名）

---

### 3.7 CLI 配置 (cli)

#### description
- **类型**: `string`
- **值**: `"排课系统 - 智能课程调度应用"`
- **说明**: 命令行描述

#### args
- **类型**: `array`
- **说明**: 命令行参数配置

**参数列表**:
1. `dev` - 以开发模式启动应用
2. `debug` - 启用调试日志

---

## 配置修改注意事项

1. **端口一致性**: `devPath` 中的端口必须与 `vite.config.ts` 中的 `server.port` 一致
2. **安全范围**: 修改 `scope` 时要谨慎，避免过度开放权限
3. **CSP 策略**: 修改 CSP 时要确保不影响应用功能
4. **图标路径**: 确保所有图标文件存在于指定路径
5. **标识符**: `identifier` 应该是唯一的，避免与其他应用冲突

## 相关文档

- [Tauri 配置文档](https://tauri.app/v1/api/config/)
- [CSP 策略指南](https://developer.mozilla.org/zh-CN/docs/Web/HTTP/CSP)
- [语义化版本规范](https://semver.org/lang/zh-CN/)
