# 排课系统

基于约束优化问题（COP）的智能课程调度系统，采用 Bun + Rust + Tauri 架构。

## 项目简介

排课系统是一个用于自动生成和管理学校课程表的智能调度系统。系统能够同时满足硬约束（必须满足的规则）和软约束（尽量优化的偏好），并提供可视化的手动调课功能。

## 技术栈

- **前端**: Vue 3 + TypeScript + Element Plus + Pinia
- **服务层**: Hono + Bun
- **后端**: Rust + Tauri
- **数据库**: SQLite
- **测试**: Playwright + Vitest

## 项目结构

```
.
├── src/                    # 前端 Vue 3 代码
│   ├── api/               # API 接口封装
│   ├── assets/            # 静态资源
│   ├── components/        # Vue 组件
│   ├── stores/            # Pinia 状态管理
│   ├── styles/            # 样式文件
│   ├── utils/             # 工具函数
│   ├── views/             # 页面视图
│   └── main.ts            # 前端入口
│
├── src-service/           # Hono 服务层代码
│   ├── middleware/        # 中间件
│   ├── routes/            # 路由定义
│   ├── services/          # 业务逻辑
│   ├── utils/             # 工具函数
│   └── index.ts           # 服务层入口
│
├── src-tauri/             # Rust 后端代码
│   └── src/
│       ├── commands/      # Tauri 命令接口
│       ├── db/            # 数据库访问层
│       ├── models/        # 数据模型
│       ├── solver/        # 约束求解器
│       └── main.rs        # Rust 入口
│
├── tests/                 # 测试代码
│   ├── fixtures/          # 测试数据
│   ├── helpers/           # 测试辅助工具
│   ├── integration/       # 集成测试（Playwright）
│   └── unit/              # 单元测试
│
└── docs/                  # 文档
    ├── api/               # API 文档
    ├── architecture/      # 架构设计文档
    ├── development/       # 开发文档
    └── user-manual/       # 用户手册
```

## 核心功能

### 硬约束管理
- 体育、音乐、美术课程不排在第1-3节
- 每门课程总课时数达到教学计划要求
- 教师和班级时间冲突检测
- 场地容量限制
- 教师互斥约束

### 软约束优化
- 教师个性化偏好（时段偏好、早晚偏好）
- 主科连续课程惩罚
- 同一教师多班课进度一致性

### 可视化调课
- 拖拽式手动调课
- 实时冲突检测和高亮显示
- 智能交换建议（简单交换、三角交换、链式交换）
- 热力图显示软约束违反程度

### 高级功能
- 固定课程和预排课
- 单双周课表
- 合班课程
- 早晚自习
- 临时调课和调课通知
- 监考表生成
- 场地课表管理
- 教学工作量统计

## 快速开始

### 环境要求

- Node.js 18+ 或 Bun 1.0+
- Rust 1.70+
- SQLite 3

### 安装依赖

```bash
# 安装前端和服务层依赖
bun install

# 安装 Rust 依赖（在 src-tauri 目录）
cd src-tauri
cargo build
```

**注意**: `bun install` 会自动配置 Git hooks（通过 Husky），确保代码质量。

### AI Git 提交工具

项目集成了 AI Git 提交工具 `mygit`，可以自动生成高质量的中文提交信息。

#### 配置

1. 复制配置文件模板：
```bash
cp .env.mygit.example .env.mygit
```

2. 编辑 `.env.mygit` 文件，填入您的 API 密钥：
```bash
DASHSCOPE_API_KEY=your-api-key-here
DASHSCOPE_BASE_URL=https://dashscope.aliyuncs.com/compatible-mode/v1
DASHSCOPE_MODEL=deepseek-v3
```

#### 使用

```bash
# 测试工具是否正常工作
bun run mygit:test

# 使用 AI 生成提交信息并提交
bun run mygit
```

详见 [AI Git 提交工具使用指南](./docs/development/mygit-guide.md)

### Git Hooks

项目使用 Husky 管理 Git hooks，自动执行代码质量检查：

- **pre-commit**: 自动格式化代码、运行 lint、检查类型
- **pre-push**: 运行单元测试、Rust 测试、检查代码格式

详见 [Git Hooks 配置指南](./docs/development/git-hooks-guide.md)

### 开发模式

```bash
# 启动开发服务器
bun run dev

# 启动 Tauri 开发模式
bun run tauri dev
```

### 构建

```bash
# 构建生产版本
bun run build

# 构建 Tauri 应用
bun run tauri build
```

## 测试

```bash
# 运行所有测试
bun test

# 运行单元测试
bun test:unit

# 运行集成测试
bun test:integration
```

## 文档

- [用户手册](./docs/user-manual/)
- [API 文档](./docs/api/)
- [开发指南](./docs/development/)
- [架构设计](./docs/architecture/)

## 开发规范

本项目遵循以下开发规范：

1. **中文优先**: 所有文档和注释使用中文
2. **完善的日志记录**: 所有模块实现结构化日志
3. **测试驱动**: 使用 Playwright 进行集成测试
4. **顺序执行**: 集成测试按用例顺序执行，失败即停止

详见 [项目开发规则](./project-rules.md)

## 许可证

待定

## 贡献

欢迎贡献！请阅读 [贡献指南](./docs/development/contributing.md)

## 联系方式

待定
