# Hono 框架安装验证文档

## 概述

本文档记录了 Hono 框架及相关依赖的安装和验证过程。

## 已安装的依赖

### 核心依赖

| 依赖包 | 版本 | 用途 |
|--------|------|------|
| `hono` | ^3.12.12 | 轻量级、高性能的 Web 框架 |
| `@hono/zod-validator` | ^0.2.2 | Zod 验证器中间件 |
| `zod` | ^3.25.76 | TypeScript 优先的数据验证库 |

### 配置位置

依赖配置在 `package.json` 文件中：

```json
{
  "dependencies": {
    "hono": "^3.11.7",
    "@hono/zod-validator": "^0.2.1",
    "zod": "^3.22.4"
  }
}
```

## 服务层架构

### 目录结构

```
src-service/
├── index.ts           # 服务入口文件
├── middleware/        # 中间件目录
├── routes/           # 路由目录
├── services/         # 业务逻辑服务目录
└── utils/            # 工具函数目录
```

### 入口文件功能

`src-service/index.ts` 实现了以下功能：

1. **Hono 应用初始化**
   - 创建 Hono 应用实例
   - 配置全局中间件（logger, cors）

2. **路由配置**
   - `/health` - 健康检查端点
   - `/api` - API 信息端点
   - 404 处理
   - 错误处理

3. **日志记录**
   - 使用 Hono 内置的 logger 中间件
   - 记录所有 HTTP 请求

## 验证测试

### 自动化验证脚本

创建了 `scripts/verify-hono.ts` 验证脚本，测试以下功能：

1. ✅ Hono 核心模块导入
2. ✅ Zod 验证器模块导入
3. ✅ Hono 应用实例创建
4. ✅ 路由注册
5. ✅ HTTP 请求处理
6. ✅ Zod 参数验证（成功场景）
7. ✅ Zod 参数验证（失败场景）

### 运行验证

```bash
# 运行验证脚本
bun run scripts/verify-hono.ts
```

**验证结果：** ✅ 所有测试通过

### 服务启动测试

```bash
# 启动开发服务器
bun run service:dev
```

**启动输出：**
```
🚀 排课系统服务层启动中...
📡 服务地址: http://localhost:3000
🏥 健康检查: http://localhost:3000/health
📚 API 文档: http://localhost:3000/api
```

### 端点测试

#### 1. 健康检查端点

```bash
curl http://localhost:3000/health
```

**响应：**
```json
{
  "status": "ok",
  "message": "排课系统服务层运行正常",
  "timestamp": "2026-02-14T22:30:20.175Z",
  "version": "0.1.0"
}
```

#### 2. API 信息端点

```bash
curl http://localhost:3000/api
```

**响应：**
```json
{
  "message": "排课系统 API",
  "version": "0.1.0",
  "endpoints": {
    "health": "/health",
    "schedule": "/api/schedule",
    "teacher": "/api/teacher",
    "importExport": "/api/import-export"
  }
}
```

## 功能特性

### 1. 中间件支持

- **日志中间件**：自动记录所有 HTTP 请求
- **CORS 中间件**：支持跨域请求

### 2. 错误处理

- **404 处理**：未找到路由时返回友好的错误信息
- **500 处理**：服务器错误时返回详细的错误信息

### 3. 参数验证

使用 `@hono/zod-validator` 和 `zod` 进行请求参数验证：

```typescript
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';

const schema = z.object({
  name: z.string(),
  age: z.number().min(0),
});

app.post('/api/example', zValidator('json', schema), (c) => {
  const data = c.req.valid('json');
  return c.json({ success: true, data });
});
```

## 后续开发计划

根据任务列表（阶段 5），后续将实现：

### 5.1 服务层基础架构
- ✅ 创建 Hono 应用实例
- ✅ 配置全局中间件（logger, cors）
- [ ] 实现请求日志中间件
- [ ] 实现错误处理中间件
- [ ] 配置路由分组

### 5.2 排课服务路由
- [ ] POST /api/schedule/generate
- [ ] GET /api/schedule/active
- [ ] POST /api/schedule/move
- [ ] POST /api/schedule/detect-conflicts
- [ ] POST /api/schedule/suggest-swaps
- [ ] POST /api/schedule/execute-swap

### 5.3 教师服务路由
- [ ] GET /api/teacher
- [ ] POST /api/teacher/preference
- [ ] POST /api/teacher/preferences/batch
- [ ] POST /api/teacher/status
- [ ] GET /api/teacher/workload

### 5.4 导入导出服务路由
- [ ] POST /api/import-export/import
- [ ] POST /api/import-export/export
- [ ] GET /api/import-export/template

## 开发命令

```bash
# 启动开发服务器（支持热重载）
bun run service:dev

# 构建生产版本
bun run service:build

# 运行生产版本
bun run service:start

# 运行验证脚本
bun run scripts/verify-hono.ts
```

## 性能特点

1. **轻量级**：Hono 框架体积小，启动快速
2. **高性能**：基于 Web 标准 API，性能优异
3. **类型安全**：完整的 TypeScript 支持
4. **边缘优先**：可在 Cloudflare Workers、Deno、Bun 等环境运行

## 日志记录

服务层已配置日志记录功能：

- **请求日志**：使用 Hono 的 logger 中间件自动记录所有请求
- **错误日志**：在错误处理器中记录详细的错误信息
- **日志格式**：包含时间戳、请求方法、路径、状态码等信息

示例日志输出：
```
  <-- GET /health
  --> GET /health 200 2ms
```

## 总结

✅ **任务 1.2.3 完成**：Hono 框架和相关依赖已成功安装并验证

- Hono 核心框架正常工作
- Zod 验证器集成成功
- 基础服务层架构搭建完成
- 健康检查和 API 信息端点可用
- 日志记录功能正常
- 错误处理机制完善

系统已准备好进行后续的服务层功能开发。
