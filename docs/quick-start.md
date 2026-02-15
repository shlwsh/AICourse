# 快速开始指南

## 前置要求

在开始之前，请确保已安装以下软件：

- **Bun** >= 1.0.0
- **Rust** >= 1.70.0
- **Node.js** >= 18.0.0（可选，Bun 可替代）

## 安装步骤

### 1. 克隆项目

```bash
git clone <repository-url>
cd course-scheduling-system
```

### 2. 安装 Bun

```bash
# macOS / Linux
curl -fsSL https://bun.sh/install | bash

# Windows
powershell -c "irm bun.sh/install.ps1 | iex"
```

### 3. 安装依赖

```bash
bun install
```

### 4. 初始化数据库

```bash
# 创建数据目录
mkdir -p data logs backups

# 运行数据库迁移（后续实现）
# bun run db:migrate
```

## 开发环境

### 启动开发服务器

```bash
# 方式 1：启动前端开发服务器
bun run dev

# 方式 2：启动服务层开发服务器
bun run service:dev

# 方式 3：启动完整的 Tauri 开发环境（推荐）
bun run tauri:dev
```

### 访问应用

- **前端开发服务器**：http://localhost:5173
- **服务层 API**：http://localhost:3000
- **Tauri 应用**：自动打开桌面应用窗口

## 生产环境

### 构建应用

```bash
# 构建所有组件
bun run build
bun run service:build
bun run tauri:build
```

### 运行生产服务器

```bash
NODE_ENV=production bun run service:start
```

## 测试

### 运行单元测试

```bash
bun run test:unit
```

### 运行集成测试

```bash
bun run test:integration
```

## 常用命令

| 命令 | 说明 |
|------|------|
| `bun install` | 安装依赖 |
| `bun run dev` | 启动前端开发服务器 |
| `bun run service:dev` | 启动服务层开发服务器 |
| `bun run tauri:dev` | 启动 Tauri 开发环境 |
| `bun run build` | 构建前端 |
| `bun run service:build` | 构建服务层 |
| `bun run tauri:build` | 构建 Tauri 应用 |
| `bun run test` | 运行测试 |
| `bun run lint` | 代码检查 |
| `bun run format` | 代码格式化 |

## 下一步

- 阅读 [Bun 运行时配置指南](./bun-runtime-guide.md)
- 查看 [项目架构文档](./architecture/project-structure.md)
- 了解 [开发规范](../project-rules.md)

## 获取帮助

如遇到问题，请查看：

1. [常见问题](./bun-runtime-guide.md#常见问题)
2. [项目文档](./README.md)
3. 提交 Issue

---

祝开发愉快！🎉
