/**
 * Hono 框架验证脚本
 *
 * 功能：
 * - 验证 Hono 框架是否正确安装
 * - 验证相关依赖是否可用
 * - 测试基本的 HTTP 服务功能
 */

import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';

console.log('🔍 开始验证 Hono 框架配置...\n');

// 1. 验证 Hono 核心功能
console.log('✓ Hono 核心模块导入成功');

// 2. 验证 Zod 验证器
console.log('✓ @hono/zod-validator 模块导入成功');
console.log('✓ Zod 模块导入成功');

// 3. 创建测试应用
const testApp = new Hono();

// 4. 测试基本路由
testApp.get('/test', (c) => {
  return c.json({ message: 'Hello from Hono!' });
});

// 5. 测试 Zod 验证器
const testSchema = z.object({
  name: z.string(),
  age: z.number().min(0),
});

testApp.post(
  '/validate',
  zValidator('json', testSchema),
  (c) => {
    const data = c.req.valid('json');
    return c.json({ success: true, data });
  },
);

console.log('✓ Hono 应用实例创建成功');
console.log('✓ 路由注册成功');
console.log('✓ Zod 验证器配置成功');

// 6. 测试请求处理
const testRequest = new Request('http://localhost/test');
const testResponse = await testApp.fetch(testRequest);
const testData = await testResponse.json();

if (testData.message === 'Hello from Hono!') {
  console.log('✓ HTTP 请求处理测试通过');
} else {
  console.error('✗ HTTP 请求处理测试失败');
  process.exit(1);
}

// 7. 测试 Zod 验证
const validRequest = new Request('http://localhost/validate', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ name: 'Test', age: 25 }),
});

const validResponse = await testApp.fetch(validRequest);
const validData = await validResponse.json();

if (validData.success && validData.data.name === 'Test') {
  console.log('✓ Zod 参数验证测试通过');
} else {
  console.error('✗ Zod 参数验证测试失败');
  process.exit(1);
}

// 8. 测试验证失败情况
const invalidRequest = new Request('http://localhost/validate', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ name: 'Test', age: -1 }), // 无效年龄
});

const invalidResponse = await testApp.fetch(invalidRequest);

if (invalidResponse.status === 400) {
  console.log('✓ Zod 验证失败处理测试通过');
} else {
  console.error('✗ Zod 验证失败处理测试失败');
  process.exit(1);
}

console.log('\n✅ 所有验证测试通过！');
console.log('\n📦 已安装的 Hono 相关依赖：');
console.log('  - hono: 核心框架');
console.log('  - @hono/zod-validator: Zod 验证器中间件');
console.log('  - zod: 数据验证库');
console.log('\n🎉 Hono 框架配置完成，可以开始开发服务层功能！');
