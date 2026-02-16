import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import { resolve } from 'path';
import AutoImport from 'unplugin-auto-import/vite';
import Components from 'unplugin-vue-components/vite';
import { ElementPlusResolver } from 'unplugin-vue-components/resolvers';

// ============================================
// Vite 配置文件
// ============================================
// Vite 是一个现代化的前端构建工具，提供快速的开发服务器和优化的生产构建
// 文档: https://vitejs.dev/config/
export default defineConfig({
  // ============================================
  // 插件配置
  // ============================================
  plugins: [
    // Vue 3 官方插件
    // 提供 Vue 单文件组件（SFC）的编译支持
    vue({
      // 启用响应式语法糖（实验性功能）
      reactivityTransform: false,

      // 自定义块转换
      template: {
        compilerOptions: {
          // 保留空白字符
          whitespace: 'preserve',
        },
      },
    }),

    // 自动导入 API
    // 自动导入 Vue、Vue Router、Pinia 等常用 API，无需手动 import
    AutoImport({
      // 自动导入的库
      imports: [
        'vue',
        'vue-router',
        'pinia',
        {
          '@tauri-apps/api/core': ['invoke'],
          '@tauri-apps/plugin-dialog': ['open', 'save', 'message', 'ask', 'confirm'],
          '@tauri-apps/plugin-notification': ['sendNotification'],
          '@tauri-apps/api/path': ['appDataDir', 'resourceDir'],
        },
      ],

      // Element Plus 组件解析器
      resolvers: [ElementPlusResolver()],

      // 生成的类型声明文件路径
      dts: 'src/auto-imports.d.ts',

      // ESLint 配置
      eslintrc: {
        enabled: true,
        filepath: './.eslintrc-auto-import.json',
        globalsPropValue: true,
      },

      // 日志输出
      vueTemplate: true,
    }),

    // 自动导入组件
    // 自动导入 Element Plus 和自定义组件，无需手动注册
    Components({
      // Element Plus 组件解析器
      resolvers: [
        ElementPlusResolver({
          // 自动导入样式
          importStyle: 'sass',
        }),
      ],

      // 组件目录
      dirs: ['src/components'],

      // 生成的类型声明文件路径
      dts: 'src/components.d.ts',

      // 深度搜索子目录
      deep: true,

      // 允许的组件文件扩展名
      extensions: ['vue'],

      // 包含的文件模式
      include: [/\.vue$/, /\.vue\?vue/],

      // 排除的文件模式
      exclude: [/[\\/]node_modules[\\/]/, /[\\/]\.git[\\/]/, /[\\/]\.nuxt[\\/]/],
    }),
  ],

  // ============================================
  // 路径别名配置
  // ============================================
  // 简化导入路径，避免使用相对路径（../../）
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

    // 自动解析的文件扩展名
    extensions: ['.mjs', '.js', '.ts', '.jsx', '.tsx', '.json', '.vue'],
  },

  // ============================================
  // 开发服务器配置
  // ============================================
  server: {
    // 开发服务器端口
    // 与 tauri.conf.json 中的 devPath 保持一致
    port: 5173,

    // 端口被占用时是否严格退出
    // false: 自动尝试下一个可用端口
    strictPort: false,

    // 监听所有网络接口
    // true: 允许局域网访问（用于移动端测试）
    host: true,

    // 是否自动在浏览器中打开
    // Tauri 应用不需要浏览器，设为 false
    open: false,

    // 开发服务器 CORS 配置
    cors: true,

    // 代理配置
    // 将前端 API 请求转发到 Hono 服务层
    proxy: {
      '/api': {
        // Hono 服务层运行的地址
        target: 'http://localhost:3000',

        // 改变请求头中的 origin 字段
        changeOrigin: true,

        // 是否重写路径（保持原路径）
        rewrite: (path) => path,

        // 配置代理日志
        configure: (proxy, _options) => {
          proxy.on('error', (err, _req, _res) => {
            console.log('代理错误:', err);
          });
          proxy.on('proxyReq', (proxyReq, req, _res) => {
            console.log('发送请求:', req.method, req.url);
          });
          proxy.on('proxyRes', (proxyRes, req, _res) => {
            console.log('收到响应:', proxyRes.statusCode, req.url);
          });
        },
      },
    },

    // 热模块替换（HMR）配置
    // HMR 允许在不刷新整个页面的情况下更新模块
    hmr: {
      // HMR 协议
      protocol: 'ws',

      // HMR 主机（使用开发服务器的主机）
      host: 'localhost',

      // HMR 端口（使用开发服务器的端口）
      port: 5173,

      // HMR 覆盖配置
      // 显示编译错误和警告的浮层
      overlay: true,

      // HMR 超时时间（毫秒）
      timeout: 30000,

      // 客户端路径
      // Tauri 环境下需要明确指定
      clientPort: 5173,
    },

    // 监听文件变化配置
    watch: {
      // 忽略的文件/目录
      ignored: ['**/node_modules/**', '**/dist/**', '**/target/**'],

      // 使用轮询模式（某些系统需要）
      usePolling: false,
    },
  },

  // ============================================
  // 构建配置
  // ============================================
  build: {
    // 输出目录
    outDir: 'dist',

    // 生成源码映射文件
    // true: 便于调试生产环境问题
    sourcemap: true,

    // 构建目标
    // 支持的浏览器版本
    target: 'esnext',

    // 代码分割阈值（KB）
    // 小于此大小的模块不会被分割
    chunkSizeWarningLimit: 1000,

    // 是否压缩代码
    minify: 'esbuild',

    // Rollup 打包配置
    rollupOptions: {
      output: {
        // 手动分块策略
        // 将第三方库分离到独立的 chunk 中，提高缓存效率
        manualChunks: {
          // Vue 核心库
          'vue-vendor': ['vue', 'vue-router', 'pinia'],

          // Element Plus UI 组件库
          'element-plus': ['element-plus'],

          // Tauri API
          'tauri-api': ['@tauri-apps/api'],
        },

        // 输出文件命名规则
        chunkFileNames: 'assets/js/[name]-[hash].js',
        entryFileNames: 'assets/js/[name]-[hash].js',
        assetFileNames: 'assets/[ext]/[name]-[hash].[ext]',
      },
    },

    // 是否报告压缩后的文件大小
    reportCompressedSize: true,

    // 启用 CSS 代码分割
    cssCodeSplit: true,

    // 静态资源处理
    assetsInlineLimit: 4096, // 小于 4KB 的资源内联为 base64
  },

  // ============================================
  // 依赖优化配置
  // ============================================
  optimizeDeps: {
    // 需要预构建的依赖
    // 将 CommonJS 模块转换为 ESM，提高开发服务器启动速度
    include: [
      'vue',
      'vue-router',
      'pinia',
      'element-plus',
      '@tauri-apps/api',
    ],

    // 排除预构建的依赖
    exclude: [],

    // 强制优化的依赖（即使在 node_modules 中）
    force: false,
  },

  // ============================================
  // CSS 配置
  // ============================================
  css: {
    // CSS 预处理器配置
    preprocessorOptions: {
      scss: {
        // 使用现代 Sass API，避免弃用警告
        api: 'modern-compiler',
        // 全局 SCSS 变量和混入
        // 注意：如果项目中没有 variables.scss 文件，请注释掉此行
        // additionalData: `@use "@/styles/variables.scss" as *;`,
      },
    },

    // CSS 模块配置
    modules: {
      // 类名生成规则
      generateScopedName: '[name]__[local]___[hash:base64:5]',

      // 是否对 .module.css 文件启用 CSS 模块
      localsConvention: 'camelCase',
    },

    // PostCSS 配置
    postcss: {
      plugins: [
        // 自动添加浏览器前缀
        // autoprefixer(),
      ],
    },
  },

  // ============================================
  // JSON 配置
  // ============================================
  json: {
    // 是否支持命名导入
    namedExports: true,

    // 是否压缩 JSON
    stringify: false,
  },

  // ============================================
  // 环境变量配置
  // ============================================
  // 环境变量前缀
  // 只有以这些前缀开头的环境变量才会暴露给客户端代码
  envPrefix: ['VITE_', 'TAURI_'],

  // 环境变量目录
  envDir: './',

  // ============================================
  // 日志配置
  // ============================================
  // 日志级别: 'info' | 'warn' | 'error' | 'silent'
  logLevel: 'info',

  // 是否清除控制台
  // false: 保留之前的日志输出
  clearScreen: false,

  // ============================================
  // 预览服务器配置（用于预览生产构建）
  // ============================================
  preview: {
    port: 4173,
    strictPort: false,
    host: true,
    open: false,
  },

  // ============================================
  // 性能配置
  // ============================================
  // 是否启用 esbuild 压缩
  esbuild: {
    // 移除 console 和 debugger（生产环境）
    drop: process.env.NODE_ENV === 'production' ? ['console', 'debugger'] : [],

    // 目标 JavaScript 版本
    target: 'esnext',

    // 是否保留类名（用于调试）
    keepNames: false,
  },

  // ============================================
  // 实验性功能
  // ============================================
  experimental: {
    // 启用渲染内置 HTML
    renderBuiltUrl: undefined,
  },
});
