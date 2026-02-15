# Vue 3 前端项目初始化文档

## 概述

本文档记录了排课系统 Vue 3 前端项目的初始化过程和配置详情。

## 完成时间

2024年（任务 1.1.4）

## 项目结构

### 核心配置文件

| 文件 | 说明 |
|------|------|
| `index.html` | HTML 入口文件 |
| `vite.config.ts` | Vite 构建工具配置 |
| `tsconfig.json` | TypeScript 主配置 |
| `tsconfig.node.json` | Node 环境 TypeScript 配置 |
| `package.json` | 项目依赖和脚本配置 |
| `.eslintrc.cjs` | ESLint 代码检查配置 |
| `.prettierrc.json` | Prettier 代码格式化配置 |

### 源代码目录结构

```
src/
├── api/                    # API 接口层
│   ├── http.ts            # HTTP 客户端封装
│   └── schedule.ts        # 课表相关 API
├── assets/                # 静态资源
├── components/            # 可复用组件
├── router/                # 路由配置
│   └── index.ts          # 路由定义和守卫
├── stores/                # Pinia 状态管理
│   └── scheduleStore.ts  # 课表状态管理
├── styles/                # 全局样式
│   └── index.css         # 全局样式文件
├── utils/                 # 工具函数
│   └── logger.ts         # 日志记录工具
├── views/                 # 页面组件
│   ├── Home.vue          # 首页
│   ├── Schedule.vue      # 课表管理页面
│   ├── Teacher.vue       # 教师管理页面
│   ├── Settings.vue      # 系统设置页面
│   └── NotFound.vue      # 404 页面
├── App.vue                # 根组件
├── main.ts                # 应用入口
├── vite-env.d.ts         # TypeScript 类型声明
└── README.md              # 前端项目说明
```

## 技术栈

### 核心框架

- **Vue 3.4+**: 采用 Composition API 和 `<script setup>` 语法
- **TypeScript 5.3+**: 提供类型安全
- **Vite 5.0+**: 快速的开发服务器和构建工具

### 状态管理和路由

- **Pinia 2.1+**: Vue 3 官方推荐的状态管理库
- **Vue Router 4.2+**: Vue 3 官方路由管理器

### UI 组件库

- **Element Plus 2.5+**: 基于 Vue 3 的企业级 UI 组件库
- **@element-plus/icons-vue**: Element Plus 图标库

### 开发工具

- **ESLint 8.55+**: 代码质量检查
- **Prettier 3.1+**: 代码格式化
- **Vitest 1.0+**: 单元测试框架
- **Playwright 1.40+**: 端到端测试框架

## 核心功能实现

### 1. 路由系统

**文件**: `src/router/index.ts`

**功能**:
- 定义应用的所有路由规则
- 实现路由守卫（前置守卫、后置钩子）
- 自动设置页面标题
- 记录路由导航日志
- 处理路由错误

**路由列表**:
- `/` - 首页
- `/schedule` - 课表管理
- `/teacher` - 教师管理
- `/settings` - 系统设置
- `/:pathMatch(.*)` - 404 页面

### 2. 状态管理

**文件**: `src/stores/scheduleStore.ts`

**功能**:
- 管理课表数据状态
- 管理选中的课表条目
- 管理冲突检测结果
- 提供课表操作方法（加载、生成、移动、检测冲突等）
- 支持视图模式切换（班级视图、教师视图、场地视图）
- 支持热力图显示切换

**主要方法**:
- `loadSchedule()` - 加载活动课表
- `generateSchedule()` - 生成新课表
- `selectEntry()` - 选择课表条目
- `moveEntry()` - 移动课程
- `detectConflicts()` - 检测冲突
- `setViewMode()` - 设置视图模式
- `toggleHeatmap()` - 切换热力图

### 3. API 接口层

**文件**: `src/api/http.ts`, `src/api/schedule.ts`

**功能**:
- 封装统一的 HTTP 客户端
- 提供请求/响应拦截
- 实现超时控制
- 统一错误处理
- 记录 API 调用日志

**HTTP 客户端特性**:
- 支持 GET、POST、PUT、DELETE 方法
- 自动添加 Content-Type 头
- 支持请求超时（默认 30 秒）
- 统一的响应格式

### 4. 日志系统

**文件**: `src/utils/logger.ts`

**功能**:
- 提供统一的日志记录接口
- 支持多个日志级别（DEBUG、INFO、WARN、ERROR）
- 格式化日志输出（时间戳、级别、模块名、消息、数据）
- 支持控制台输出
- 为未来的文件输出预留接口

**使用示例**:
```typescript
import { logger } from '@/utils/logger';

logger.info('用户登录', { userId: 123 });
logger.error('请求失败', { error: error.message });
```

### 5. 页面组件

#### 首页 (Home.vue)
- 展示系统欢迎信息
- 显示核心功能卡片
- 提供快速操作入口

#### 课表管理 (Schedule.vue)
- 课表展示和操作
- 自动排课功能入口
- 预留拖拽调课功能

#### 教师管理 (Teacher.vue)
- 教师信息管理
- 教师偏好设置
- 工作量统计

#### 系统设置 (Settings.vue)
- 系统配置管理
- 约束规则设置
- 预留设置向导

## 开发规范

### 1. 代码风格

- 使用 TypeScript 编写所有代码
- 使用 Composition API 和 `<script setup>` 语法
- 组件文件使用 PascalCase 命名
- 函数和变量使用 camelCase 命名
- 常量使用 UPPER_SNAKE_CASE 命名

### 2. 注释规范

- 所有函数必须添加中文注释
- 使用 JSDoc 格式编写函数注释
- 复杂逻辑必须添加行内注释
- 接口和类型必须添加说明注释

### 3. 日志规范

- 关键操作必须记录 INFO 级别日志
- 错误必须记录 ERROR 级别日志
- 调试信息使用 DEBUG 级别
- 警告信息使用 WARN 级别

### 4. 类型安全

- 所有函数参数和返回值必须声明类型
- 避免使用 `any` 类型（必要时使用 `unknown`）
- 定义清晰的接口和类型
- 使用类型守卫确保类型安全

## 配置说明

### Vite 配置

**路径别名**:
- `@` → `src/`
- `@components` → `src/components/`
- `@views` → `src/views/`
- `@stores` → `src/stores/`
- `@utils` → `src/utils/`
- `@api` → `src/api/`
- `@assets` → `src/assets/`
- `@styles` → `src/styles/`

**开发服务器**:
- 端口: 5173
- 代理: `/api` → `http://localhost:3000`

**构建优化**:
- 代码分割: vue-vendor, element-plus
- 生成 sourcemap
- 优化依赖预构建

### TypeScript 配置

**编译选项**:
- 目标: ES2020
- 模块: ESNext
- 严格模式: 启用
- 路径映射: 支持别名

**包含文件**:
- `src/**/*.ts`
- `src/**/*.vue`
- `src/**/*.d.ts`

## 开发命令

```bash
# 安装依赖
bun install

# 启动开发服务器
bun run dev

# 构建生产版本
bun run build

# 预览生产构建
bun run preview

# 类型检查
bun run type-check

# 代码检查
bun run lint

# 代码格式化
bun run format

# 运行单元测试
bun run test:unit

# 运行集成测试
bun run test:integration
```

## 验证脚本

**文件**: `scripts/verify-frontend.ts`

**功能**:
- 检查所有必需文件是否存在
- 检查所有必需目录是否存在
- 验证关键依赖是否安装
- 输出详细的验证报告

**运行**:
```bash
bun run scripts/verify-frontend.ts
```

## 后续开发任务

根据任务列表，接下来需要完成：

1. **任务 1.1.5**: 配置 TypeScript 和 ESLint（已部分完成）
2. **任务 6.1**: 前端基础架构（已完成基础部分）
3. **任务 6.2**: 状态管理实现（已完成 scheduleStore）
4. **任务 6.3**: API 层实现（已完成基础封装）
5. **任务 6.4**: 核心组件实现（待开发）
6. **任务 6.5**: 拖拽功能实现（待开发）

## 注意事项

1. **Tauri 集成**: 当前 API 调用使用 HTTP，后续需要集成 Tauri 命令
2. **测试覆盖**: 需要为所有核心功能编写单元测试和集成测试
3. **性能优化**: 大数据量渲染需要实现虚拟滚动
4. **无障碍支持**: 需要添加 ARIA 标签和键盘导航
5. **国际化**: 当前仅支持中文，未来可扩展多语言

## 参考资源

- [Vue 3 官方文档](https://cn.vuejs.org/)
- [Vite 官方文档](https://cn.vitejs.dev/)
- [Pinia 官方文档](https://pinia.vuejs.org/zh/)
- [Element Plus 官方文档](https://element-plus.org/zh-CN/)
- [TypeScript 官方文档](https://www.typescriptlang.org/zh/)
