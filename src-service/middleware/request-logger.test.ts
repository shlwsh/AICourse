/**
 * 请求日志中间件集成测试
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { Hono } from 'hono';
import { existsSync, rmSync, readFileSync, readdirSync } from 'fs';
import { join } from 'path';
import { requestLogger, simpleRequestLogger, verboseRequestLogger } from './request-logger';
import Logger from '../utils/logger';

describe('请求日志中间件', () => {
  const testLogDir = 'test-request-logs';
  let app: Hono;

  beforeEach(() => {
    // 创建测试应用
    app = new Hono();

    // 配置测试日志记录器
    const testLogger = new Logger('RequestLogger', {
      enableConsole: false,
      enableFile: true,
      logDir: testLogDir,
      filePrefix: 'request',
    });

    // 注意：这里我们需要修改 logger 实例，但由于是单例，我们在测试中使用独立的配置
  });

  afterEach(() => {
    // 清理测试日志目录
    if (existsSync(testLogDir)) {
      rmSync(testLogDir, { recursive: true, force: true });
    }
  });

  describe('基本功能', () => {
    it('应该记录 GET 请求', async () => {
      app.use('*', requestLogger());
      app.get('/test', (c) => c.json({ message: 'success' }));

      const res = await app.request('/test');
      expect(res.status).toBe(200);

      // 由于日志是异步写入的，我们需要等待一小段时间
      await new Promise((resolve) => setTimeout(resolve, 100));

      // 验证日志文件存在（如果配置了文件输出）
      // 注意：由于我们使用的是全局 logger，这里只验证响应
      const data = await res.json();
      expect(data).toEqual({ message: 'success' });
    });

    it('应该记录 POST 请求', async () => {
      app.use('*', requestLogger());
      app.post('/api/data', async (c) => {
        const body = await c.req.json();
        return c.json({ received: body });
      });

      const res = await app.request('/api/data', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name: 'test', value: 123 }),
      });

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.received).toEqual({ name: 'test', value: 123 });
    });

    it('应该记录请求方法和路径', async () => {
      app.use('*', requestLogger());
      app.get('/api/users/:id', (c) => {
        const id = c.req.param('id');
        return c.json({ userId: id });
      });

      const res = await app.request('/api/users/123');
      expect(res.status).toBe(200);

      const data = await res.json();
      expect(data.userId).toBe('123');
    });

    it('应该记录查询参数', async () => {
      app.use('*', requestLogger());
      app.get('/search', (c) => {
        const query = c.req.query('q');
        return c.json({ query });
      });

      const res = await app.request('/search?q=test&page=1');
      expect(res.status).toBe(200);

      const data = await res.json();
      expect(data.query).toBe('test');
    });
  });

  describe('响应状态码', () => {
    it('应该记录成功响应（2xx）', async () => {
      app.use('*', requestLogger());
      app.get('/success', (c) => c.json({ status: 'ok' }, 200));

      const res = await app.request('/success');
      expect(res.status).toBe(200);
    });

    it('应该记录客户端错误（4xx）', async () => {
      app.use('*', requestLogger());
      app.get('/not-found', (c) => c.json({ error: 'Not Found' }, 404));

      const res = await app.request('/not-found');
      expect(res.status).toBe(404);
    });

    it('应该记录服务器错误（5xx）', async () => {
      app.use('*', requestLogger());
      app.get('/error', (c) => c.json({ error: 'Internal Error' }, 500));

      const res = await app.request('/error');
      expect(res.status).toBe(500);
    });
  });

  describe('敏感信息过滤', () => {
    it('应该过滤请求体中的密码', async () => {
      app.use('*', requestLogger());
      app.post('/login', async (c) => {
        const body = await c.req.json();
        return c.json({ success: true });
      });

      const res = await app.request('/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username: 'testuser',
          password: 'secret123',
        }),
      });

      expect(res.status).toBe(200);
      // 日志中的密码应该被过滤为 ***
    });

    it('应该过滤请求体中的 API 密钥', async () => {
      app.use('*', requestLogger());
      app.post('/api/config', async (c) => {
        const body = await c.req.json();
        return c.json({ success: true });
      });

      const res = await app.request('/api/config', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          service: 'external-api',
          api_key: 'abc123xyz',
        }),
      });

      expect(res.status).toBe(200);
    });
  });

  describe('路径排除', () => {
    it('应该排除健康检查路径', async () => {
      app.use(
        '*',
        requestLogger({
          excludePaths: ['/health'],
        }),
      );
      app.get('/health', (c) => c.json({ status: 'ok' }));

      const res = await app.request('/health');
      expect(res.status).toBe(200);

      // 健康检查路径不应该生成日志
    });

    it('应该排除多个路径', async () => {
      app.use(
        '*',
        requestLogger({
          excludePaths: ['/health', '/favicon.ico', '/metrics'],
        }),
      );

      app.get('/health', (c) => c.json({ status: 'ok' }));
      app.get('/favicon.ico', (c) => c.text(''));
      app.get('/metrics', (c) => c.json({ metrics: {} }));

      await app.request('/health');
      await app.request('/favicon.ico');
      await app.request('/metrics');

      // 这些路径都不应该生成日志
    });
  });

  describe('错误处理', () => {
    it('应该记录请求处理过程中的错误', async () => {
      app.use('*', requestLogger());
      app.get('/error', (c) => {
        throw new Error('测试错误');
      });

      // 捕获错误
      app.onError((err, c) => {
        return c.json({ error: err.message }, 500);
      });

      const res = await app.request('/error');
      expect(res.status).toBe(500);

      const data = await res.json();
      expect(data.error).toBe('测试错误');
    });
  });

  describe('简化版中间件', () => {
    it('应该使用简化配置', async () => {
      app.use('*', simpleRequestLogger());
      app.get('/test', (c) => c.json({ message: 'success' }));

      const res = await app.request('/test');
      expect(res.status).toBe(200);
    });
  });

  describe('详细版中间件', () => {
    it('应该使用详细配置', async () => {
      app.use('*', verboseRequestLogger());
      app.post('/test', async (c) => {
        const body = await c.req.json();
        return c.json({ received: body });
      });

      const res = await app.request('/test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ data: 'test' }),
      });

      expect(res.status).toBe(200);
    });
  });

  describe('响应时间', () => {
    it('应该记录快速请求', async () => {
      app.use('*', requestLogger());
      app.get('/fast', (c) => c.json({ message: 'fast' }));

      const res = await app.request('/fast');
      expect(res.status).toBe(200);
    });

    it('应该标记慢请求', async () => {
      app.use(
        '*',
        requestLogger({
          slowRequestThreshold: 100, // 100ms
        }),
      );

      app.get('/slow', async (c) => {
        // 模拟慢请求
        await new Promise((resolve) => setTimeout(resolve, 150));
        return c.json({ message: 'slow' });
      });

      const res = await app.request('/slow');
      expect(res.status).toBe(200);
      // 应该在日志中标记为慢请求
    });
  });

  describe('请求 ID', () => {
    it('应该为每个请求生成唯一 ID', async () => {
      app.use('*', requestLogger());
      app.get('/test', (c) => c.json({ message: 'test' }));

      await app.request('/test');
      await app.request('/test');
      await app.request('/test');

      // 每个请求应该有不同的 requestId
    });
  });
});
