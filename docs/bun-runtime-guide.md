# Bun 运行时环境配置指南

## 概述

本项目使用 Bun 作为 JavaScript/TypeScript 运行时，提供高性能的包管理、构建和运行能力。本文档详细说明了 Bun 运行时的配置和使用方法。

## 目录

- [安装 Bun](#安装-bun)
- [配置文件说明](#配置文件说明)
- [开发环境配置](#开发环境配置)
- [生产环境配置](#生产环境配置)
- [脚本命令](#脚本命令)
- [性能优化](#性能优化)
- [常见问题](#常见问题)

## 安装 Bun

### macOS / Linux

```bash
curl -fsSL https://bun.sh/install | bash
```

### Windows

```powershell
powershell -c "irm bun.sh/install.ps1 | iex"
```

### 验证安装

```bash
bun --version
```

要求版本：`>= 1.0.0`

## 配置文件说明

### 1. bunfig.toml

主配置文件，定义 Bun 运行时的全局行为。

**位置**：项目根目录 `bunfig.toml`

**主要配置项**：

- **运行时配置**：热重载、源码映射
- **包管理器配置**：缓存、并发安装
- **开发服务器配置**：端口、主机地址
- **构建配置**：目标平台、输出格式、代码压缩
- **测试配置**：超时时间、覆盖率
- **日志配置**：日志级别
- **性能优化配置**：JIT 编译、内存限制

### 2. bun.config.ts

TypeScript 配置文件，提供类型安全的配置选项。

**位置**：项目根目录 `bun.config.ts`

**主要配置**：

- 开发环境配置 (`devConfig`)
- 生产环境配置 (`prodConfig`)
- 测试环境配置 (`testConfig`)
- 服务器配置 (`serverConfig`)
- 日志配置 (`loggingConfig`)
- 数据库配置 (`databaseConfig`)
- 性能配置 (`performanceConfig`)
- 安全配置 (`securityConfig`)

### 3. 环境变量文件

#### .env.development

开发环境专用配置，包含：

- 服务器端口：`3000`
- 日志级别：`debug`
- 数据库：`./data/dev.db`
- 启用热重载、详细错误信息、SQL 查询日志

#### .env.production

生产环境专用配置，包含：

- 服务器端口：`3000`
- 日志级别：`info`
- 数据库：`./data/production.db`
- 关闭调试功能、启用性能优化

## 开发环境配置

### 启动开发服务器

```bash
# 启动前端开发服务器
bun run dev

# 启动服务层开发服务器（带热重载）
bun run service:dev

# 同时启动 Tauri 开发环境
bun run tauri:dev
```

### 开发环境特性

1. **热重载（Hot Reload）**
   - 代码修改后自动重启服务
   - 无需手动重启开发服务器

2. **详细日志**
   - 日志级别：`debug`
   - 输出格式：`pretty`（易读格式）
   - 记录所有 API 请求和 SQL 查询

3. **源码映射（Source Maps）**
   - 启用 inline source maps
   - 便于调试和错误追踪

4. **CORS 配置**
   - 允许所有源（`*`）
   - 便于本地开发和测试

### 开发环境目录结构

```
project-root/
├── data/
│   └── dev.db              # 开发数据库
├── logs/
│   └── development.log     # 开发日志
├── src-service/            # 服务层源码
└── dist-service/           # 构建输出（开发）
```

## 生产环境配置

### 构建生产版本

```bash
# 构建服务层
bun run service:build

# 构建前端
bun run build

# 构建 Tauri 应用
bun run tauri:build
```

### 启动生产服务器

```bash
# 使用生产环境配置启动
NODE_ENV=production bun run service:start
```

### 生产环境特性

1. **代码优化**
   - 启用代码压缩（minify）
   - 启用代码分割（splitting）
   - 外部源码映射（external source maps）

2. **日志优化**
   - 日志级别：`info`
   - 输出格式：`json`（便于日志分析）
   - 仅输出到文件，不输出到控制台
   - 日志轮转：最大 100MB，保留 30 天

3. **性能优化**
   - 启用 JIT 编译
   - 启用响应压缩
   - 启用缓存（1小时）
   - 连接池大小：10

4. **安全配置**
   - 指定允许的 CORS 源
   - 启用速率限制（100 请求/分钟）
   - 请求体大小限制：10MB
   - 关闭详细错误信息

### 生产环境目录结构

```
project-root/
├── data/
│   └── production.db       # 生产数据库
├── logs/
│   └── production.log      # 生产日志
├── backups/                # 数据库备份
└── dist-service/           # 构建输出（生产）
```

## 脚本命令

### 开发命令

| 命令 | 说明 |
|------|------|
| `bun run dev` | 启动前端开发服务器 |
| `bun run service:dev` | 启动服务层开发服务器（带热重载） |
| `bun run tauri:dev` | 启动 Tauri 开发环境 |

### 构建命令

| 命令 | 说明 |
|------|------|
| `bun run build` | 构建前端生产版本 |
| `bun run service:build` | 构建服务层生产版本 |
| `bun run tauri:build` | 构建 Tauri 应用 |

### 测试命令

| 命令 | 说明 |
|------|------|
| `bun run test` | 运行单元测试（watch 模式） |
| `bun run test:unit` | 运行单元测试（单次） |
| `bun run test:integration` | 运行集成测试（Playwright） |

### 代码质量命令

| 命令 | 说明 |
|------|------|
| `bun run lint` | 运行 ESLint 检查 |
| `bun run format` | 格式化代码（Prettier） |
| `bun run type-check` | TypeScript 类型检查 |

### 生产命令

| 命令 | 说明 |
|------|------|
| `bun run service:start` | 启动生产服务器 |
| `bun run preview` | 预览生产构建 |

## 性能优化

### 1. JIT 编译

Bun 默认启用 JIT（Just-In-Time）编译，提供接近原生的执行速度。

```toml
[performance]
jit = true
```

### 2. 内存管理

配置堆内存大小限制：

```toml
[performance]
heap-size = 2048  # 2GB
```

### 3. 并发安装

加速依赖安装：

```toml
[install]
concurrent = 10
```

### 4. 缓存策略

启用全局缓存：

```toml
[install]
cache = true
```

### 5. 代码分割

减少初始加载时间：

```toml
[build]
splitting = true
```

### 6. 响应压缩

减少网络传输大小：

```typescript
export const performanceConfig = {
  compression: true,
};
```

## 日志记录

### 日志级别

- **DEBUG**：详细的调试信息
- **INFO**：一般信息性消息
- **WARN**：警告消息
- **ERROR**：错误消息

### 日志格式

#### 开发环境（Pretty 格式）

```
[2024-01-15 10:30:45] INFO  [ScheduleService] 开始生成课表
[2024-01-15 10:30:46] DEBUG [ConstraintSolver] 检查硬约束
[2024-01-15 10:30:50] INFO  [ScheduleService] 课表生成成功，代价值: 120
```

#### 生产环境（JSON 格式）

```json
{
  "timestamp": "2024-01-15T10:30:45.123Z",
  "level": "INFO",
  "module": "ScheduleService",
  "message": "开始生成课表",
  "metadata": {}
}
```

### 日志文件管理

- **开发环境**：`./logs/development.log`
- **生产环境**：`./logs/production.log`
- **日志轮转**：超过 100MB 自动轮转
- **保留期限**：30 天

## 常见问题

### 1. Bun 安装失败

**问题**：无法安装 Bun

**解决方案**：
- 检查网络连接
- 使用代理或镜像源
- 手动下载安装包

### 2. 热重载不工作

**问题**：修改代码后服务未自动重启

**解决方案**：
- 检查 `bunfig.toml` 中 `hot = true`
- 确保使用 `--watch` 参数：`bun run --watch`
- 重启开发服务器

### 3. 端口被占用

**问题**：`Error: listen EADDRINUSE: address already in use :::3000`

**解决方案**：
- 修改 `.env.development` 中的 `PORT`
- 或终止占用端口的进程

### 4. 依赖安装慢

**问题**：`bun install` 速度慢

**解决方案**：
- 增加并发数：`concurrent = 20`
- 使用国内镜像源
- 清理缓存：`bun pm cache rm`

### 5. 构建失败

**问题**：`bun run build` 失败

**解决方案**：
- 检查 TypeScript 类型错误：`bun run type-check`
- 检查 ESLint 错误：`bun run lint`
- 清理构建缓存：`rm -rf dist-service`

### 6. 内存不足

**问题**：运行时内存溢出

**解决方案**：
- 增加堆内存限制：`heap-size = 4096`
- 优化代码，减少内存占用
- 使用流式处理大数据

## 最佳实践

### 1. 环境隔离

- 开发环境使用 `.env.development`
- 生产环境使用 `.env.production`
- 不要将环境变量文件提交到版本控制

### 2. 依赖管理

- 定期更新依赖：`bun update`
- 使用精确版本号（生产环境）
- 审查依赖安全性

### 3. 性能监控

- 启用性能监控：`PERFORMANCE_MONITORING=true`
- 定期检查日志文件
- 使用性能分析工具

### 4. 错误处理

- 开发环境启用详细错误：`VERBOSE_ERRORS=true`
- 生产环境关闭详细错误：`VERBOSE_ERRORS=false`
- 记录所有错误到日志文件

### 5. 安全配置

- 生产环境指定 CORS 源
- 启用速率限制
- 限制请求体大小
- 定期备份数据库

## 参考资源

- [Bun 官方文档](https://bun.sh/docs)
- [Bun GitHub 仓库](https://github.com/oven-sh/bun)
- [Bun 性能基准测试](https://bun.sh/docs/benchmarks)
- [Tauri 文档](https://tauri.app/zh-cn/)

## 更新日志

- **2024-01-15**：初始版本，完成基础配置
- 后续更新将记录在此处

---

**注意**：本文档会随着项目发展持续更新，请定期查看最新版本。
