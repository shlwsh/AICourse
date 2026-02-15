# 前端项目结构说明

## 目录结构

```
src/
├── api/              # API 接口层
│   ├── http.ts       # HTTP 客户端封装
│   └── schedule.ts   # 课表相关 API
├── assets/           # 静态资源
├── components/       # 可复用组件
├── router/           # 路由配置
│   └── index.ts      # 路由定义
├── stores/           # Pinia 状态管理
│   └── scheduleStore.ts  # 课表状态管理
├── styles/           # 全局样式
│   └── index.css     # 全局样式文件
├── utils/            # 工具函数
│   └── logger.ts     # 日志记录工具
├── views/            # 页面组件
│   ├── Home.vue      # 首页
│   ├── Schedule.vue  # 课表管理页面
│   ├── Teacher.vue   # 教师管理页面
│   ├── Settings.vue  # 系统设置页面
│   └── NotFound.vue  # 404 页面
├── App.vue           # 根组件
├── main.ts           # 应用入口
└── vite-env.d.ts     # TypeScript 类型声明
```

## 技术栈

- **Vue 3**: 渐进式 JavaScript 框架
- **TypeScript**: 类型安全的 JavaScript 超集
- **Vite**: 下一代前端构建工具
- **Vue Router**: Vue.js 官方路由管理器
- **Pinia**: Vue.js 官方状态管理库
- **Element Plus**: 基于 Vue 3 的组件库

## 开发规范

### 1. 组件命名

- 组件文件使用 PascalCase 命名：`MyComponent.vue`
- 组件名称使用多个单词：避免与 HTML 元素冲突

### 2. 代码注释

- 所有函数和类必须添加中文注释
- 复杂逻辑必须添加行内注释说明
- 使用 JSDoc 格式编写函数注释

### 3. 日志记录

- 使用统一的 logger 工具记录日志
- 关键操作必须记录 INFO 级别日志
- 错误必须记录 ERROR 级别日志，包含堆栈信息

### 4. 状态管理

- 使用 Pinia 管理全局状态
- 每个功能模块创建独立的 store
- Store 中的方法必须添加详细注释

### 5. API 调用

- 所有 API 调用统一通过 api 目录中的类进行
- API 方法必须添加参数说明和返回值说明
- API 调用必须记录日志

## 开发命令

```bash
# 安装依赖
bun install

# 启动开发服务器
bun run dev

# 构建生产版本
bun run build

# 类型检查
bun run type-check

# 代码检查
bun run lint

# 代码格式化
bun run format
```

## 注意事项

1. 所有代码必须通过 TypeScript 类型检查
2. 提交前必须运行 `bun run lint` 和 `bun run format`
3. 新增功能必须添加相应的日志记录
4. 遵循项目开发规则中的所有规范
