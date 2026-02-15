# 项目结构说明

本文档详细说明排课系统的项目目录结构和各模块职责。

## 目录结构概览

```
course-scheduling-system/
├── src/                    # 前端 Vue 3 代码
├── src-service/           # Hono 服务层代码
├── src-tauri/             # Rust 后端代码
├── tests/                 # 测试代码
├── docs/                  # 文档
├── .gitignore            # Git 忽略文件配置
├── package.json          # 项目配置和依赖
└── README.md             # 项目说明
```

## 前端层 (src/)

前端使用 Vue 3 + TypeScript + Element Plus 构建用户界面。

### 目录说明

- **api/** - API 接口封装
  - 封装与服务层和 Tauri 后端的通信
  - 提供类型安全的 API 调用方法

- **assets/** - 静态资源
  - 图片、图标、字体等静态文件

- **components/** - Vue 组件
  - 可复用的 UI 组件
  - 如：ScheduleGrid、ScheduleCell、CourseCard 等

- **stores/** - Pinia 状态管理
  - scheduleStore - 课表状态
  - teacherStore - 教师状态
  - configStore - 配置状态
  - uiStore - UI 状态

- **styles/** - 样式文件
  - 全局样式
  - 主题配置
  - CSS 变量

- **utils/** - 工具函数
  - 日志记录器
  - 日期时间工具
  - 数据格式化工具
  - 本地存储工具

- **views/** - 页面视图
  - Dashboard - 主页
  - Schedule - 课表页面
  - Teacher - 教师管理
  - Settings - 配置页面
  - ImportExport - 导入导出
  - Statistics - 统计页面

- **main.ts** - 前端入口文件

## 服务层 (src-service/)

服务层使用 Hono 框架提供 RESTful API，作为前端和后端之间的桥梁。

### 目录说明

- **middleware/** - 中间件
  - request-logger - 请求日志中间件
  - error-handler - 错误处理中间件
  - validator - 参数验证中间件

- **routes/** - 路由定义
  - schedule.ts - 排课相关路由
  - teacher.ts - 教师管理路由
  - import-export.ts - 导入导出路由

- **services/** - 业务逻辑
  - ScheduleService - 排课业务逻辑
  - TeacherService - 教师管理业务逻辑
  - ImportExportService - 导入导出业务逻辑

- **utils/** - 工具函数
  - logger - 日志记录器
  - validator - 数据验证工具

- **index.ts** - 服务层入口文件

## 后端层 (src-tauri/)

后端使用 Rust + Tauri 实现核心算法和数据访问。

### 目录说明

- **src/commands/** - Tauri 命令接口
  - schedule.rs - 排课相关命令
  - teacher.rs - 教师管理命令
  - import_export.rs - 导入导出命令

- **src/db/** - 数据库访问层
  - manager.rs - 数据库管理器
  - migrations/ - 数据库迁移脚本
  - schema.sql - 数据库模式定义

- **src/models/** - 数据模型
  - schedule.rs - 课表相关数据结构
  - teacher.rs - 教师相关数据结构
  - constraint.rs - 约束相关数据结构
  - timeslot.rs - 时间槽位数据结构

- **src/solver/** - 约束求解器
  - constraint_solver.rs - 约束求解算法
  - cost_function.rs - 代价函数计算
  - conflict_detector.rs - 冲突检测器
  - swap_suggester.rs - 交换建议器

- **src/main.rs** - Rust 入口文件

- **Cargo.toml** - Rust 项目配置
- **tauri.conf.json** - Tauri 配置文件

## 测试层 (tests/)

测试代码使用 Playwright 和 Vitest 框架。

### 目录说明

- **fixtures/** - 测试数据
  - 测试用的数据库文件
  - 测试用的配置文件
  - 测试用的 Excel 文件

- **helpers/** - 测试辅助工具
  - 数据库设置和清理函数
  - 测试数据生成器
  - Page Object Model 基类

- **integration/** - 集成测试（Playwright）
  - schedule.spec.ts - 排课模块集成测试
  - teacher.spec.ts - 教师模块集成测试
  - import-export.spec.ts - 导入导出集成测试
  - e2e.spec.ts - 端到端用户流程测试

- **unit/** - 单元测试（Vitest）
  - 前端组件单元测试
  - 工具函数单元测试
  - 状态管理单元测试

- **README.md** - 测试说明文档

## 文档层 (docs/)

项目文档和用户手册。

### 目录说明

- **api/** - API 文档
  - Tauri 命令接口文档
  - Hono API 路由文档
  - 数据结构文档

- **architecture/** - 架构设计文档
  - 系统架构设计
  - 数据库设计
  - 算法设计
  - 项目结构说明（本文档）

- **development/** - 开发文档
  - 贡献指南
  - 开发环境配置
  - 代码规范
  - 测试指南

- **user-manual/** - 用户手册
  - 快速开始指南
  - 功能使用说明
  - 常见问题解答
  - 故障排查指南

- **README.md** - 文档目录说明

## 配置文件

- **.gitignore** - Git 忽略文件配置
- **package.json** - 前端和服务层依赖配置
- **src-tauri/Cargo.toml** - Rust 依赖配置
- **src-tauri/tauri.conf.json** - Tauri 应用配置
- **README.md** - 项目说明文档

## 开发流程

1. **前端开发** - 在 `src/` 目录开发 Vue 组件和页面
2. **服务层开发** - 在 `src-service/` 目录开发 API 路由和业务逻辑
3. **后端开发** - 在 `src-tauri/src/` 目录开发 Rust 核心算法
4. **测试开发** - 在 `tests/` 目录编写单元测试和集成测试
5. **文档编写** - 在 `docs/` 目录编写和更新文档

## 数据流向

```
用户界面 (Vue 3)
    ↓ HTTP/Tauri IPC
服务层 (Hono)
    ↓ FFI/IPC
核心层 (Rust)
    ↓ SQLite
数据库 (SQLite)
```

## 注意事项

1. 所有代码和文档必须使用中文注释
2. 每个模块必须实现完善的日志记录
3. 关键功能必须编写单元测试和集成测试
4. 遵循项目开发规则（见 project-rules.md）
