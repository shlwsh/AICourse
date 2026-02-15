# Vite 构建工具配置文档

## 概述

本文档详细说明了排课系统的 Vite 构建工具配置，包括开发服务器、生产构建、插件配置和优化策略。

## 配置完成时间

**2024年** - 任务 1.3.2：配置 Vite 构建工具

## 技术栈

- **Vite**: v5.0.0+ - 下一代前端构建工具
- **Vue 3**: v3.4.0+ - 渐进式 JavaScript 框架
- **TypeScript**: v5.3.0+ - 类型安全的 JavaScript 超集
- **Bun**: v1.0.0+ - 高性能 JavaScript 运行时

## 核心配置

### 1. 插件配置

#### 1.1 Vue 插件 (@vitejs/plugin-vue)

```typescript
vue({
  reactivityTransform: false,
  template: {
    compilerOptions: {
      whitespace: 'preserve',
    },
  },
})
```

**功能**：
- 提供 Vue 单文件组件（SFC）的编译支持
- 保留模板中的空白字符
- 禁用响应式语法糖（实验性功能）

#### 1.2 自动导入 API (unplugin-auto-import)

```typescript
AutoImport({
  imports: [
    'vue',
    'vue-router',
    'pinia',
    {
      '@tauri-apps/api/tauri': ['invoke'],
      '@tauri-apps/api/dialog': ['open', 'save', 'message', 'ask', 'confirm'],
      '@tauri-apps/api/notification': ['sendNotification'],
      '@tauri-apps/api/path': ['appDataDir', 'resourceDir'],
    },
  ],
  resolvers: [ElementPlusResolver()],
  dts: 'src/auto-imports.d.ts',
  eslintrc: {
    enabled: true,
    filepath: './.eslintrc-auto-import.json',
    globalsPropValue: true,
  },
  vueTemplate: true,
})
```

**功能**：
- 自动导入 Vue、Vue Router、Pinia 等常用 API
- 自动导入 Tauri API（invoke、dialog、notification 等）
- 自动导入 Element Plus 组件 API
- 生成 TypeScript 类型声明文件
- 生成 ESLint 配置文件

**优势**：
- 无需手动 `import`，提升开发效率
- 减少样板代码
- 自动生成类型声明，保持类型安全

**示例**：

```typescript
// 传统写法
import { ref, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { invoke } from '@tauri-apps/api/tauri';

// 使用自动导入后
// 直接使用，无需 import
const count = ref(0);
const router = useRouter();
const result = await invoke('my_command');
```

#### 1.3 自动导入组件 (unplugin-vue-components)

```typescript
Components({
  resolvers: [
    ElementPlusResolver({
      importStyle: 'sass',
    }),
  ],
  dirs: ['src/components'],
  dts: 'src/components.d.ts',
  deep: true,
  extensions: ['vue'],
  include: [/\.vue$/, /\.vue\?vue/],
  exclude: [/[\\/]node_modules[\\/]/, /[\\/]\.git[\\/]/, /[\\/]\.nuxt[\\/]/],
})
```

**功能**：
- 自动导入 Element Plus 组件
- 自动导入 `src/components` 目录下的自定义组件
- 自动导入组件样式（Sass）
- 生成 TypeScript 类型声明文件

**优势**：
- 无需手动注册组件
- 按需加载，减少打包体积
- 自动生成类型声明

**示例**：

```vue
<!-- 传统写法 -->
<script setup>
import { ElButton, ElInput } from 'element-plus';
import MyComponent from '@/components/MyComponent.vue';
</script>

<template>
  <el-button>按钮</el-button>
  <el-input v-model="value" />
  <my-component />
</template>

<!-- 使用自动导入后 -->
<script setup>
// 无需 import
</script>

<template>
  <el-button>按钮</el-button>
  <el-input v-model="value" />
  <my-component />
</template>
```

### 2. 路径别名配置

```typescript
resolve: {
  alias: {
    '@': resolve(__dirname, 'src'),
    '@components': resolve(__dirname, 'src/components'),
    '@views': resolve(__dirname, 'src/views'),
    '@stores': resolve(__dirname, 'src/stores'),
    '@utils': resolve(__dirname, 'src/utils'),
    '@api': resolve(__dirname, 'src/api'),
    '@assets': resolve(__dirname, 'src/assets'),
    '@styles': resolve(__dirname, 'src/styles'),
    '@types': resolve(__dirname, 'src/types'),
  },
  extensions: ['.mjs', '.js', '.ts', '.jsx', '.tsx', '.json', '.vue'],
}
```

**功能**：
- 简化导入路径，避免使用相对路径（`../../`）
- 提供语义化的路径别名
- 自动解析文件扩展名

**示例**：

```typescript
// 传统写法
import MyComponent from '../../../components/MyComponent.vue';
import { myUtil } from '../../../utils/myUtil';

// 使用路径别名
import MyComponent from '@components/MyComponent.vue';
import { myUtil } from '@utils/myUtil';
```

### 3. 开发服务器配置

```typescript
server: {
  port: 5173,
  strictPort: false,
  host: true,
  open: false,
  cors: true,
  proxy: {
    '/api': {
      target: 'http://localhost:3000',
      changeOrigin: true,
      rewrite: (path) => path,
    },
  },
  hmr: {
    protocol: 'ws',
    host: 'localhost',
    port: 5173,
    overlay: true,
  },
  watch: {
    ignored: ['**/node_modules/**', '**/dist/**', '**/target/**'],
    usePolling: false,
  },
}
```

**关键配置**：

| 配置项 | 值 | 说明 |
|--------|-----|------|
| port | 5173 | 开发服务器端口，与 tauri.conf.json 保持一致 |
| strictPort | false | 端口被占用时自动尝试下一个可用端口 |
| host | true | 监听所有网络接口，允许局域网访问 |
| open | false | 不自动打开浏览器（Tauri 应用不需要） |
| cors | true | 启用 CORS 支持 |

**代理配置**：
- 将 `/api` 请求转发到 Hono 服务层（`http://localhost:3000`）
- 支持前后端分离开发
- 自动处理跨域问题

**热模块替换（HMR）**：
- 使用 WebSocket 协议
- 实时更新代码变更
- 显示错误覆盖层

### 4. 构建配置

```typescript
build: {
  outDir: 'dist',
  sourcemap: true,
  target: 'esnext',
  chunkSizeWarningLimit: 1000,
  minify: 'esbuild',
  rollupOptions: {
    output: {
      manualChunks: {
        'vue-vendor': ['vue', 'vue-router', 'pinia'],
        'element-plus': ['element-plus'],
        'tauri-api': ['@tauri-apps/api'],
      },
      chunkFileNames: 'assets/js/[name]-[hash].js',
      entryFileNames: 'assets/js/[name]-[hash].js',
      assetFileNames: 'assets/[ext]/[name]-[hash].[ext]',
    },
  },
  reportCompressedSize: true,
  cssCodeSplit: true,
  assetsInlineLimit: 4096,
}
```

**关键配置**：

| 配置项 | 值 | 说明 |
|--------|-----|------|
| outDir | dist | 输出目录，与 tauri.conf.json 保持一致 |
| sourcemap | true | 生成源码映射文件，便于调试 |
| target | esnext | 构建目标为最新 ES 标准 |
| minify | esbuild | 使用 esbuild 压缩代码（速度快） |
| assetsInlineLimit | 4096 | 小于 4KB 的资源内联为 base64 |

**代码分割策略**：
- **vue-vendor**: Vue 核心库（vue、vue-router、pinia）
- **element-plus**: Element Plus UI 组件库
- **tauri-api**: Tauri API

**优势**：
- 提高缓存效率（第三方库变化频率低）
- 减少主包体积
- 加快首屏加载速度

### 5. 依赖优化配置

```typescript
optimizeDeps: {
  include: [
    'vue',
    'vue-router',
    'pinia',
    'element-plus',
    '@tauri-apps/api',
  ],
  exclude: [],
  force: false,
}
```

**功能**：
- 预构建依赖，将 CommonJS 模块转换为 ESM
- 提高开发服务器启动速度
- 减少模块请求数量

### 6. CSS 配置

```typescript
css: {
  preprocessorOptions: {
    scss: {
      // 全局 SCSS 变量和混入
      // 注意：如果项目中没有 variables.scss 文件，请注释掉此行
      // additionalData: `@use "@/styles/variables.scss" as *;`,
    },
  },
  modules: {
    generateScopedName: '[name]__[local]___[hash:base64:5]',
    localsConvention: 'camelCase',
  },
  postcss: {
    plugins: [],
  },
}
```

**功能**：
- 支持 SCSS 预处理器
- 支持 CSS 模块化
- 支持 PostCSS 插件

**注意**：
- 如果需要全局 SCSS 变量，需要先创建 `src/styles/variables.scss` 文件
- 使用 `@use` 而不是 `@import`（Sass 新语法）

### 7. 环境变量配置

```typescript
envPrefix: ['VITE_', 'TAURI_'],
envDir: './',
```

**功能**：
- 只有以 `VITE_` 或 `TAURI_` 开头的环境变量才会暴露给客户端代码
- 环境变量文件位于项目根目录

**示例**：

```bash
# .env
VITE_APP_TITLE=排课系统
VITE_API_BASE_URL=http://localhost:3000
TAURI_DEBUG=true
```

```typescript
// 在代码中使用
console.log(import.meta.env.VITE_APP_TITLE); // 排课系统
console.log(import.meta.env.VITE_API_BASE_URL); // http://localhost:3000
```

### 8. 性能配置

```typescript
esbuild: {
  drop: process.env.NODE_ENV === 'production' ? ['console', 'debugger'] : [],
  target: 'esnext',
  keepNames: false,
}
```

**功能**：
- 生产环境自动移除 `console` 和 `debugger`
- 使用最新 JavaScript 语法
- 不保留类名（减小体积）

## 与 Tauri 的集成

### 端口一致性

Vite 配置中的端口必须与 `src-tauri/tauri.conf.json` 中的 `devPath` 保持一致：

```json
// src-tauri/tauri.conf.json
{
  "build": {
    "devPath": "http://localhost:5173",
    "distDir": "../dist"
  }
}
```

```typescript
// vite.config.ts
export default defineConfig({
  server: {
    port: 5173,
  },
  build: {
    outDir: 'dist',
  },
})
```

### 开发流程

1. Tauri CLI 读取 `tauri.conf.json` 配置
2. 执行 `beforeDevCommand`，启动 Vite 开发服务器
3. Vite 在 5173 端口启动，编译前端代码
4. Tauri 编译 Rust 后端代码
5. Tauri 创建应用窗口，加载 `http://localhost:5173`
6. 前端通过 Tauri API 与 Rust 后端通信

### 生产构建流程

1. Tauri CLI 读取 `tauri.conf.json` 配置
2. 执行 `beforeBuildCommand`，运行 Vite 生产构建
3. Vite 将前端代码打包到 `dist` 目录
4. Tauri 将 `dist` 目录嵌入到应用程序中
5. Tauri 编译 Rust 后端并打包成可执行文件

## 常用命令

### 开发模式

```bash
# 启动 Vite 开发服务器
bun run dev

# 启动 Tauri 开发模式（包含 Vite 开发服务器）
bun run tauri:dev
```

### 生产构建

```bash
# 构建前端代码
bun run build

# 构建 Tauri 应用程序（包含前端构建）
bun run tauri:build
```

### 预览生产构建

```bash
# 预览生产构建结果
bun run preview
```

## 性能优化

### 1. 代码分割

通过 `manualChunks` 配置，将第三方库分离到独立的 chunk 中：

```typescript
manualChunks: {
  'vue-vendor': ['vue', 'vue-router', 'pinia'],
  'element-plus': ['element-plus'],
  'tauri-api': ['@tauri-apps/api'],
}
```

**效果**：
- Vue 核心库：~105 KB (gzip: ~41 KB)
- Element Plus：~894 KB (gzip: ~289 KB)
- Tauri API：~0.05 KB (gzip: ~0.07 KB)

### 2. 资源内联

小于 4KB 的资源自动内联为 base64：

```typescript
assetsInlineLimit: 4096,
```

**优势**：
- 减少 HTTP 请求数量
- 加快首屏加载速度

### 3. CSS 代码分割

启用 CSS 代码分割：

```typescript
cssCodeSplit: true,
```

**优势**：
- 按需加载 CSS
- 减少首屏 CSS 体积

### 4. 依赖预构建

预构建常用依赖：

```typescript
optimizeDeps: {
  include: [
    'vue',
    'vue-router',
    'pinia',
    'element-plus',
    '@tauri-apps/api',
  ],
}
```

**优势**：
- 提高开发服务器启动速度
- 减少模块请求数量

## 构建结果分析

### 典型构建输出

```
dist/index.html                            0.64 kB │ gzip:   0.40 kB
dist/assets/css/index-X5MXT6Xr.css       369.44 kB │ gzip:  51.46 kB
dist/assets/js/index-KogSlzoS.js           8.52 kB │ gzip:   4.62 kB
dist/assets/js/vue-vendor-VR78oKni.js    105.43 kB │ gzip:  41.06 kB
dist/assets/js/element-plus-DkCjppU8.js  894.06 kB │ gzip: 289.36 kB
```

### 体积分析

| 文件类型 | 原始大小 | Gzip 后 | 压缩率 |
|---------|---------|---------|--------|
| HTML | 0.64 KB | 0.40 KB | 37.5% |
| CSS | 369.44 KB | 51.46 KB | 86.1% |
| JS (主包) | 8.52 KB | 4.62 KB | 45.8% |
| JS (Vue) | 105.43 KB | 41.06 KB | 61.1% |
| JS (Element Plus) | 894.06 KB | 289.36 KB | 67.6% |

**总计**：
- 原始大小：~1.38 MB
- Gzip 后：~387 KB
- 总压缩率：~72%

## 故障排查

### 问题 1：端口被占用

**现象**：
```
Error: Port 5173 is already in use
```

**解决方案**：
1. 检查是否有其他 Vite 进程在运行
2. 修改 `vite.config.ts` 中的端口号
3. 同步修改 `src-tauri/tauri.conf.json` 中的 `devPath`

### 问题 2：SCSS 编译错误

**现象**：
```
[sass] @use rules must be written before any other rules
```

**解决方案**：
1. 检查 `src/styles/variables.scss` 文件是否存在
2. 如果不存在，注释掉 `css.preprocessorOptions.scss.additionalData`
3. 使用 `@use` 而不是 `@import`

### 问题 3：自动导入不生效

**现象**：
- TypeScript 报错：找不到名称 'ref'、'computed' 等
- ESLint 报错：'ref' is not defined

**解决方案**：
1. 检查 `src/auto-imports.d.ts` 文件是否生成
2. 检查 `.eslintrc-auto-import.json` 文件是否生成
3. 重启 IDE 或 TypeScript 服务器
4. 在 `.eslintrc.js` 中添加：
   ```javascript
   extends: [
     './.eslintrc-auto-import.json',
   ],
   ```

### 问题 4：构建体积过大

**解决方案**：
1. 检查是否正确配置了代码分割
2. 使用 `rollup-plugin-visualizer` 分析打包体积
3. 按需导入 Element Plus 组件
4. 移除未使用的依赖

## 最佳实践

### 1. 使用路径别名

```typescript
// ❌ 不推荐
import MyComponent from '../../../components/MyComponent.vue';

// ✅ 推荐
import MyComponent from '@components/MyComponent.vue';
```

### 2. 利用自动导入

```typescript
// ❌ 不推荐
import { ref, computed, onMounted } from 'vue';
import { ElButton, ElInput } from 'element-plus';

// ✅ 推荐（自动导入）
// 直接使用，无需 import
const count = ref(0);
```

### 3. 环境变量命名

```bash
# ❌ 不推荐
API_BASE_URL=http://localhost:3000

# ✅ 推荐
VITE_API_BASE_URL=http://localhost:3000
```

### 4. 代码分割

```typescript
// ❌ 不推荐：所有代码打包到一个文件
// 无配置

// ✅ 推荐：按库分割
manualChunks: {
  'vue-vendor': ['vue', 'vue-router', 'pinia'],
  'element-plus': ['element-plus'],
}
```

## 参考资源

- [Vite 官方文档](https://vitejs.dev/)
- [Vue 3 官方文档](https://vuejs.org/)
- [Tauri 官方文档](https://tauri.app/)
- [unplugin-auto-import](https://github.com/antfu/unplugin-auto-import)
- [unplugin-vue-components](https://github.com/antfu/unplugin-vue-components)

## 总结

Vite 构建工具已成功配置，包括：

✅ Vue 3 插件配置  
✅ 自动导入 API 和组件  
✅ 路径别名配置  
✅ 开发服务器配置（端口 5173）  
✅ 代理配置（转发到 Hono 服务层）  
✅ 生产构建优化（代码分割、压缩）  
✅ 依赖预构建  
✅ CSS 预处理器支持  
✅ 环境变量配置  
✅ 与 Tauri 的集成  

配置已通过构建测试，可以正常使用。
