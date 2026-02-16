/**
 * 服务层入口文件 - Hono 框架
 *
 * 功能：
 * - 初始化 Hono 应用实例
 * - 配置全局中间件
 * - 注册路由
 * - 启动 HTTP 服务器
 */

import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { requestLogger } from './middleware/request-logger';
import { errorHandler } from './middleware/error-handler';
import { logger } from './utils/logger';
import { scheduleRoutes } from './routes/schedule';
import { teacherRoutes } from './routes/teacher';
import { importExportRoutes } from './routes/import-export';

// 创建 Hono 应用实例
const app = new Hono();

// 配置全局中间件
app.use('*', requestLogger); // 自定义请求日志中间件
app.use('*', cors()); // CORS 跨域中间件

// 注册路由
app.route('/api/schedule', scheduleRoutes);
app.route('/api/teacher', teacherRoutes);
app.route('/api/import-export', importExportRoutes);

// 健康检查路由
app.get('/health', (c) => {
  return c.json({
    status: 'ok',
    message: '排课系统服务层运行正常',
    timestamp: new Date().toISOString(),
    version: '0.1.0',
  });
});

// API 根路由
app.get('/api', (c) => {
  return c.json({
    message: '排课系统 API',
    version: '0.1.0',
    endpoints: {
      health: '/health',
      schedule: '/api/schedule',
      teacher: '/api/teacher',
      importExport: '/api/import-export',
    },
  });
});

// 404 处理
app.notFound((c) => {
  return c.json(
    {
      error: '未找到请求的资源',
      path: c.req.path,
    },
    404,
  );
});

// 错误处理（使用统一的错误处理中间件）
app.onError(errorHandler);

// 启动服务器
const port = process.env.PORT || 3000;

logger.info('排课系统服务层启动中...', { port });
console.log('🚀 排课系统服务层启动中...');
console.log(`📡 服务地址: http://localhost:${port}`);
console.log(`🏥 健康检查: http://localhost:${port}/health`);
console.log(`📚 API 文档: http://localhost:${port}/api`);

export default {
  port,
  fetch: app.fetch,
};
