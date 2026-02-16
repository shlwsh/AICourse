# TypeScript 和 ESLint 配置说明

## 概述

本文档说明项目中 TypeScript 和 ESLint 的配置细节，帮助开发者理解和使用这些配置。

## TypeScript 配置

### 主配置文件：tsconfig.json

#### 编译目标

- **target**: ES2020 - 编译到 ES2020 标准
- **module**: ESNext - 使用最新的 ES 模块系统
- **lib**: ES2020, DOM, DOM.Iterable - 包含必要的类型库

#### 模块解析

- **moduleResolution**: bundler - 使用打包工具的模块解析策略
- **resolveJsonModule**: true - 允许导入 JSON 文件
- **allowImportingTsExtensions**: true - 允许导入 .ts 扩展名

#### 严格类型检查

项目启用了 TypeScript 的所有严格模式选项：

- **strict**: true - 启用所有严格类型检查选项
- **strictNullChecks**: true - 严格的 null 和 undefined 检查
- **strictFunctionTypes**: true - 严格的函数类型检查
- **strictBindCallApply**: true - 严格的 bind/call/apply 检查
- **strictPropertyInitialization**: true - 严格的属性初始化检查
- **noImplicitThis**: true - 禁止隐式的 this 类型
- **noImplicitReturns**: true - 函数必须有明确的返回值
- **noImplicitOverride**: true - 重写方法必须使用 override 关键字
- **noUncheckedIndexedAccess**: true - 索引访问返回可能为 undefined
- **noUnusedLocals**: true - 检查未使用的局部变量
- **noUnusedParameters**: true - 检查未使用的参数
- **noFallthroughCasesInSwitch**: true - 检查 switch 语句的 fallthrough

#### 路径映射

配置了以下路径别名，方便模块导入：

```typescript
{
  "@/*": ["src/*"],
  "@components/*": ["src/components/*"],
  "@views/*": ["src/views/*"],
  "@stores/*": ["src/stores/*"],
  "@utils/*": ["src/utils/*"],
  "@api/*": ["src/api/*"],
  "@assets/*": ["src/assets/*"],
  "@styles/*": ["src/styles/*"],
  "@types/*": ["src/types/*"]
}
```

**使用示例**：

```typescript
// 不推荐：相对路径
import { logger } from '../../../utils/logger';

// 推荐：使用路径别名
import { logger } from '@utils/logger';
```

#### 类型定义

项目包含以下类型定义：

- **vite/client** - Vite 客户端类型
- **node** - Node.js 类型
- **element-plus/global** - Element Plus 全局类型

### Node 配置文件：tsconfig.node.json

用于配置 Node.js 环境的 TypeScript 编译选项，主要用于 Vite 配置文件等。

## ESLint 配置

### 配置文件：.eslintrc.cjs

#### 扩展配置

项目使用以下 ESLint 配置：

- **eslint:recommended** - ESLint 推荐规则
- **plugin:@typescript-eslint/recommended** - TypeScript 推荐规则
- **plugin:vue/vue3-recommended** - Vue 3 推荐规则
- **plugin:vue/vue3-strongly-recommended** - Vue 3 强烈推荐规则

#### TypeScript 规则

##### 类型安全

- `@typescript-eslint/no-explicit-any`: warn - 警告使用 any 类型
- `@typescript-eslint/no-unused-vars`: warn - 警告未使用的变量（以 _ 开头的除外）

##### 命名规范

- 接口名称必须以 `I` 开头（如 `IUser`）
- 类型别名使用 PascalCase（如 `UserType`）
- 枚举使用 PascalCase（如 `UserRole`）
- 类名使用 PascalCase（如 `UserService`）

##### 最佳实践

- 禁止使用 `require` 导入
- 禁止使用 `var` 声明变量
- 优先使用 nullish coalescing（`??`）
- 优先使用 optional chaining（`?.`）
- 禁止不必要的类型断言

#### Vue 规则

##### 组件规范

- 组件名称使用 PascalCase
- 属性按照固定顺序排列
- 组件选项按照固定顺序排列

##### HTML 规范

- 自闭合标签：void 元素必须自闭合，普通元素不自闭合，组件必须自闭合
- 单行最多 3 个属性，多行每行 1 个属性
- HTML 缩进 2 个空格

##### 安全规范

- 警告使用 `v-html`（XSS 风险）
- 要求 prop 有默认值和类型定义
- 禁止在 computed 中使用异步操作
- 禁止重复的键和属性

##### 组合式 API 规则

- 禁止解构 props（会失去响应性）
- 优先从 vue 导入而不是 @vue/xxx

#### 通用规则

##### 代码风格

- 缩进：2 个空格
- 引号：单引号（允许避免转义时使用双引号）
- 分号：必须使用
- 尾随逗号：多行时必须使用
- 对象花括号内必须有空格
- 数组方括号内不能有空格

##### 最佳实践

- 必须使用 `===` 和 `!==`（null 除外）
- 禁止使用 `var`，优先使用 `const`
- 优先使用箭头函数
- 优先使用模板字符串
- 禁止不必要的字符串拼接
- 禁止不必要的 return
- 禁止不必要的 else
- 禁止不必要的三元运算符

##### 复杂度控制

- 圈复杂度：最大 15
- 最大嵌套深度：4 层
- 最大文件行数：500 行（不含空行和注释）
- 最大函数行数：100 行（不含空行和注释）
- 最大嵌套回调：3 层
- 最大参数数量：5 个

#### 特殊规则覆盖

##### 测试文件

测试文件（`*.spec.ts`, `*.test.ts`）中放宽以下规则：

- 允许使用 `any` 类型
- 允许不安全的类型操作
- 不限制函数行数

##### 配置文件

配置文件（`*.config.ts`, `*.config.js`, `.eslintrc.cjs`）中放宽以下规则：

- 允许使用 `require`
- 允许使用 `var`

## Prettier 配置

### 配置文件：.prettierrc

```json
{
  "semi": true,                    // 使用分号
  "singleQuote": true,             // 使用单引号
  "tabWidth": 2,                   // 缩进 2 个空格
  "useTabs": false,                // 使用空格而不是 tab
  "trailingComma": "all",          // 尾随逗号
  "printWidth": 100,               // 每行最大 100 字符
  "arrowParens": "always",         // 箭头函数参数总是使用括号
  "endOfLine": "lf",               // 使用 LF 换行符
  "bracketSpacing": true,          // 对象花括号内有空格
  "bracketSameLine": false,        // 标签的 > 不与属性同行
  "vueIndentScriptAndStyle": false // Vue 文件中 script 和 style 不缩进
}
```

## EditorConfig 配置

### 配置文件：.editorconfig

统一不同编辑器的代码风格：

- 字符集：UTF-8
- 换行符：LF
- 文件末尾插入空行
- 删除行尾空格
- 缩进：2 个空格（Rust 和 Python 使用 4 个空格）

## 使用指南

### 运行 Lint 检查

```bash
# 检查所有文件
bun run lint

# 检查并自动修复
bun run lint --fix
```

### 运行类型检查

```bash
# 类型检查（不生成文件）
bun run type-check

# 或直接使用 tsc
bunx tsc --noEmit
```

### 格式化代码

```bash
# 格式化所有文件
bun run format

# 检查格式（不修改文件）
npx prettier --check "src/**/*.{ts,tsx,vue}"
```

### 验证配置

```bash
# 运行配置验证脚本
bash scripts/verify-ts-eslint-config.sh
```

## 常见问题

### Q: 为什么要使用严格的 TypeScript 配置？

A: 严格的类型检查可以在编译时发现更多潜在的错误，提高代码质量和可维护性。虽然初期可能需要编写更多的类型注解，但长期来看可以减少运行时错误。

### Q: 如何临时禁用某个 ESLint 规则？

A: 使用注释来禁用规则：

```typescript
// 禁用下一行的规则
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const data: any = fetchData();

// 禁用整个文件的规则
/* eslint-disable @typescript-eslint/no-explicit-any */
```

**注意**：应该尽量避免禁用规则，只在确实必要时使用。

### Q: 路径别名在 IDE 中无法识别怎么办？

A: 确保 IDE 使用了项目的 tsconfig.json。对于 VSCode，可以在工作区设置中配置：

```json
{
  "typescript.tsdk": "node_modules/typescript/lib"
}
```

### Q: ESLint 和 Prettier 规则冲突怎么办？

A: 项目已经配置了 `eslint-config-prettier` 来禁用与 Prettier 冲突的 ESLint 规则。如果仍有冲突，请检查配置顺序。

## 最佳实践

### 1. 使用路径别名

```typescript
// ✓ 推荐
import { logger } from '@utils/logger';
import UserCard from '@components/UserCard.vue';

// ✗ 不推荐
import { logger } from '../../../utils/logger';
import UserCard from '../../../components/UserCard.vue';
```

### 2. 明确的类型注解

```typescript
// ✓ 推荐
interface IUser {
  id: number;
  name: string;
  email: string;
}

function getUser(id: number): Promise<IUser> {
  return fetch(`/api/users/${id}`).then(res => res.json());
}

// ✗ 不推荐
function getUser(id) {
  return fetch(`/api/users/${id}`).then(res => res.json());
}
```

### 3. 使用 const 断言

```typescript
// ✓ 推荐
const COLORS = {
  primary: '#1890ff',
  success: '#52c41a',
  warning: '#faad14',
} as const;

// ✗ 不推荐
const COLORS = {
  primary: '#1890ff',
  success: '#52c41a',
  warning: '#faad14',
};
```

### 4. 避免使用 any

```typescript
// ✓ 推荐
function processData<T>(data: T): T {
  return data;
}

// ✗ 不推荐
function processData(data: any): any {
  return data;
}
```

### 5. 使用可选链和空值合并

```typescript
// ✓ 推荐
const userName = user?.profile?.name ?? '未知用户';

// ✗ 不推荐
const userName = user && user.profile && user.profile.name || '未知用户';
```

## 参考资源

- [TypeScript 官方文档](https://www.typescriptlang.org/docs/)
- [ESLint 官方文档](https://eslint.org/docs/latest/)
- [Vue ESLint 插件](https://eslint.vuejs.org/)
- [TypeScript ESLint](https://typescript-eslint.io/)
- [Prettier 官方文档](https://prettier.io/docs/en/)
