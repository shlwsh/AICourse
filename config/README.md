# 配置系统说明

本项目使用统一的配置管理系统,支持多环境配置和环境变量覆盖。

## 配置文件结构

```
config/
├── index.ts          # 配置加载器和类型定义
├── default.ts        # 默认配置（所有环境通用）
├── development.ts    # 开发环境配置
├── production.ts     # 生产环境配置
├── test.ts          # 测试环境配置
└── README.md        # 本文档
```

## 环境变量文件

项目根目录下的 `.env` 文件用于配置环境变量:

```
.env.example         # 环境变量示例文件
.env.development     # 开发环境变量
.env.production      # 生产环境变量
.env.test           # 测试环境变量
```

## 配置优先级

配置值的优先级从高到低:

1. **环境变量** - 从 `.env` 文件或系统环境变量读取
2. **环境配置文件** - `development.ts`、`production.ts`、`test.ts`
3. **默认配置文件** - `default.ts`

## 使用方法

### 1. 设置环境

通过 `NODE_ENV` 环境变量指定运行环境:

```bash
# 开发环境（默认）
NODE_ENV=development bun run service:dev

# 生产环境
NODE_ENV=production bun run service:start

# 测试环境
NODE_ENV=test bun test
```

### 2. 配置环境变量

复制 `.env.example` 为对应环境的 `.env` 文件:

```bash
# 开发环境
cp .env.example .env.development

# 生产环境
cp .env.example .env.production

# 测试环境
cp .env.example .env.test
```

然后编辑文件,设置所需的配置值。

### 3. 在代码中使用配置

```typescript
import { config } from '../config';

// 访问配置
const port = config.server.port;
const dbPath = config.database.path;
const llmEnabled = config.llm.enabled;

// 使用辅助函数
import { get, getPath } from '../config';

const serverConfig = get('server');
const dbPath = getPath('database.path');
```

## 主要配置项

### 应用配置 (app)
- `APP_NAME` - 应用名称
- `APP_VERSION` - 应用版本
- `NODE_ENV` - 运行环境

### 服务器配置 (server)
- `SERVER_PORT` - 服务端口（默认: 3000）
- `SERVER_HOST` - 服务主机（默认: localhost）
- `CORS_ENABLED` - 是否启用 CORS
- `CORS_ORIGIN` - CORS 允许的源

### 数据库配置 (database)
- `DATABASE_TYPE` - 数据库类型（默认: sqlite）
- `DATABASE_PATH` - 数据库文件路径（默认: data/schedule.db）
- `DATABASE_JOURNAL_MODE` - 日志模式（默认: WAL）
- `DATABASE_FOREIGN_KEYS` - 是否启用外键约束
- `DATABASE_MIGRATIONS_PATH` - 迁移脚本路径
- `DATABASE_AUTO_RUN_MIGRATIONS` - 是否自动运行迁移

### 日志配置 (logging)
- `LOG_LEVEL` - 日志级别（debug, info, warn, error）
- `LOG_CONSOLE_ENABLED` - 是否启用控制台输出
- `LOG_CONSOLE_COLORIZE` - 是否启用颜色
- `LOG_FILE_ENABLED` - 是否启用文件输出
- `LOG_FILE_PATH` - 日志文件路径
- `LOG_FILE_MAX_SIZE` - 单个日志文件最大大小
- `LOG_FILE_MAX_FILES` - 保留的日志文件数量

### 文件上传配置 (upload)
- `UPLOAD_MAX_SIZE` - 最大上传文件大小（字节）
- `UPLOAD_ALLOWED_EXTENSIONS` - 允许的文件扩展名
- `UPLOAD_TEMP_DIR` - 临时文件目录

### 文件导出配置 (export)
- `EXPORT_OUTPUT_DIR` - 导出文件目录
- `EXPORT_DEFAULT_FORMAT` - 默认导出格式

### LLM 配置 (llm)
- `LLM_ENABLED` - 是否启用 LLM 功能
- `LLM_PROVIDER` - LLM 提供商（openai, anthropic, azure, local）
- `OPENAI_API_KEY` - OpenAI API 密钥
- `OPENAI_MODEL` - OpenAI 模型名称
- `ANTHROPIC_API_KEY` - Anthropic API 密钥
- `AZURE_OPENAI_API_KEY` - Azure OpenAI API 密钥
- `LOCAL_LLM_ENDPOINT` - 本地 LLM 端点

### 排课算法配置 (scheduling)
- `SCHEDULING_ALGORITHM` - 排课算法（genetic, simulated_annealing, constraint_satisfaction）
- `SCHEDULING_MAX_ITERATIONS` - 最大迭代次数
- `SCHEDULING_POPULATION_SIZE` - 种群大小
- `SCHEDULING_MUTATION_RATE` - 变异率
- `SCHEDULING_CROSSOVER_RATE` - 交叉率
- `SCHEDULING_TIMEOUT` - 超时时间（毫秒）

### 课表配置 (timetable)
- `TIMETABLE_CYCLE_DAYS` - 排课周期天数
- `TIMETABLE_PERIODS_PER_DAY` - 每天节次数
- `TIMETABLE_WORK_DAYS` - 工作日（逗号分隔,1=周一）

### 缓存配置 (cache)
- `CACHE_ENABLED` - 是否启用缓存
- `CACHE_TTL` - 缓存过期时间（秒）
- `CACHE_MAX_SIZE` - 最大缓存条目数

### 安全配置 (security)
- `RATE_LIMIT_ENABLED` - 是否启用速率限制
- `RATE_LIMIT_WINDOW_MS` - 速率限制时间窗口（毫秒）
- `RATE_LIMIT_MAX_REQUESTS` - 时间窗口内最大请求数
- `CORS_CREDENTIALS` - 是否允许携带凭证
- `CORS_MAX_AGE` - CORS 预检请求缓存时间

### 前端配置 (frontend)
- `VITE_PORT` - Vite 开发服务器端口
- `VITE_HOST` - Vite 开发服务器主机
- `TAURI_PORT` - Tauri 应用端口
- `VITE_API_BASE_URL` - API 基础 URL
- `VITE_ENABLE_DEV_TOOLS` - 是否启用开发者工具

## 配置验证

系统启动时会自动验证配置的有效性:

```typescript
import { validateConfig } from '../config';

const validation = validateConfig();
if (!validation.valid) {
  console.error('配置验证失败:', validation.errors);
}
```

## 打印配置

可以打印当前配置（敏感信息会被隐藏）:

```typescript
import { printConfig } from '../config';

printConfig();
```

## 注意事项

1. **敏感信息**: API 密钥等敏感信息应该通过环境变量设置,不要提交到版本控制系统
2. **环境变量文件**: `.env.development`、`.env.production`、`.env.test` 已添加到 `.gitignore`,不会被提交
3. **类型安全**: 所有配置都有 TypeScript 类型定义,可以获得完整的类型提示和检查
4. **深度合并**: 环境配置会与默认配置深度合并,只需覆盖需要修改的配置项
