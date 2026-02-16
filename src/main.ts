// 前端入口文件 - Vue 3 应用
import { createApp } from 'vue';
import { createPinia } from 'pinia';
import piniaPluginPersistedstate from 'pinia-plugin-persistedstate';
import ElementPlus from 'element-plus';
import 'element-plus/dist/index.css';
import 'element-plus/theme-chalk/dark/css-vars.css';
import zhCn from 'element-plus/es/locale/lang/zh-cn';

import App from './App.vue';
import router from './router';
import './styles/index.css';

// 导入日志记录器
import { logger } from './utils/logger';

// 导入错误处理模块
import { initGlobalErrorHandling } from './utils/errorHandler';

logger.info('开始初始化排课系统前端应用');

// 创建 Vue 应用实例
const app = createApp(App);

// 创建 Pinia 状态管理
const pinia = createPinia();

// 配置 Pinia 持久化插件
logger.debug('配置 Pinia 持久化插件');
pinia.use(piniaPluginPersistedstate);

// 使用插件
logger.debug('注册 Pinia 状态管理');
app.use(pinia);

logger.debug('注册 Vue Router 路由');
app.use(router);

logger.debug('注册 Element Plus UI 组件库', {
  locale: 'zh-cn',
  size: 'default',
  version: '2.5.0+',
});
app.use(ElementPlus, {
  locale: zhCn,
  size: 'default',
});
logger.info('Element Plus 配置完成', {
  语言包: '中文 (zh-cn)',
  默认尺寸: 'default',
  主题支持: '亮色和暗色',
  自动导入: '已启用',
});

// 初始化全局错误处理
logger.debug('初始化全局错误处理');
initGlobalErrorHandling(app);

// 全局警告处理（仅开发环境）
if (import.meta.env.DEV) {
  app.config.warnHandler = (msg, _instance, trace) => {
    logger.warn('Vue 警告', { message: msg, trace });
  };
}

// 挂载应用
app.mount('#app');

logger.info('排课系统前端启动成功');

// 开发环境：启用 HMR（热模块替换）
if (import.meta.env.DEV) {
  logger.debug('开发环境：HMR 已启用');

  // 监听 HMR 更新
  if (import.meta.hot) {
    import.meta.hot.on('vite:beforeUpdate', () => {
      logger.debug('HMR: 检测到文件变更，准备更新模块');
    });

    import.meta.hot.on('vite:afterUpdate', () => {
      logger.debug('HMR: 模块更新完成');
    });

    import.meta.hot.on('vite:error', (err) => {
      logger.error('HMR: 更新失败', { error: err });
    });
  }
}

// 生产环境：禁用 console.log
if (import.meta.env.PROD) {
  console.log = () => {};
  console.debug = () => {};
}
