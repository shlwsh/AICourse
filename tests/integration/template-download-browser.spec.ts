/**
 * 模板下载功能集成测试（浏览器模式）
 *
 * 测试目标：
 * 1. 验证浏览器模式下的模板下载功能
 * 2. 通过日志追踪下载过程
 * 3. 验证文件是否成功下载
 */

import { test, expect } from '@playwright/test';
import path from 'path';
import fs from 'fs';

// 测试配置
const BASE_URL = 'http://localhost:5173';
const API_URL = 'http://localhost:3000';
const DOWNLOAD_TIMEOUT = 30000; // 30秒超时

test.describe('模板下载功能测试（浏览器模式）', () => {
  test.beforeEach(async ({ page }) => {
    // 监听控制台日志
    page.on('console', (msg) => {
      const text = msg.text();
      if (text.includes('ImportExportApi.downloadTemplate') ||
          text.includes('下载') ||
          text.includes('模板')) {
        console.log(`[浏览器日志] ${text}`);
      }
    });

    // 监听页面错误
    page.on('pageerror', (error) => {
      console.error(`[页面错误] ${error.message}`);
    });

    // 访问导入导出页面
    await page.goto(`${BASE_URL}/import-export`);
    await page.waitForLoadState('networkidle');
  });

  test('用例 1: 验证服务端模板生成 API', async ({ request }) => {
    console.log('\n========== 用例 1: 验证服务端模板生成 API ==========');

    const response = await request.get(`${API_URL}/api/import-export/template?templateType=all`);

    console.log(`API 响应状态: ${response.status()}`);
    expect(response.status()).toBe(200);

    const contentType = response.headers()['content-type'];
    console.log(`Content-Type: ${contentType}`);
    expect(contentType).toContain('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');

    const contentDisposition = response.headers()['content-disposition'];
    console.log(`Content-Disposition: ${contentDisposition}`);
    expect(contentDisposition).toContain('attachment');
    expect(contentDisposition).toContain('filename');

    const buffer = await response.body();
    console.log(`文件大小: ${buffer.length} 字节`);
    expect(buffer.length).toBeGreaterThan(0);

    console.log('✓ 服务端 API 验证通过');
  });

  test('用例 2: 验证浏览器模式下载触发', async ({ page, context }) => {
    console.log('\n========== 用例 2: 验证浏览器模式下载触发 ==========');

    // 设置下载处理
    const downloadPromise = page.waitForEvent('download', { timeout: DOWNLOAD_TIMEOUT });

    // 点击下载按钮
    console.log('点击"下载导入模板"按钮');
    await page.click('button:has-text("下载导入模板")');

    // 等待下载开始
    console.log('等待下载开始...');
    const download = await downloadPromise;

    console.log(`下载已触发: ${download.suggestedFilename()}`);
    expect(download.suggestedFilename()).toContain('.xlsx');

    // 保存文件到临时目录
    const downloadPath = path.join(process.cwd(), 'tests/temp', download.suggestedFilename());
    await download.saveAs(downloadPath);

    console.log(`文件已保存到: ${downloadPath}`);

    // 验证文件存在且有内容
    expect(fs.existsSync(downloadPath)).toBe(true);
    const stats = fs.statSync(downloadPath);
    console.log(`文件大小: ${stats.size} 字节`);
    expect(stats.size).toBeGreaterThan(0);

    // 清理临时文件
    fs.unlinkSync(downloadPath);

    console.log('✓ 浏览器模式下载验证通过');
  });

  test('用例 3: 验证下载过程日志记录', async ({ page }) => {
    console.log('\n========== 用例 3: 验证下载过程日志记录 ==========');

    const logs: string[] = [];

    // 收集所有相关日志
    page.on('console', (msg) => {
      const text = msg.text();
      if (text.includes('ImportExportApi') ||
          text.includes('下载') ||
          text.includes('环境检测') ||
          text.includes('浏览器')) {
        logs.push(text);
      }
    });

    // 触发下载
    const downloadPromise = page.waitForEvent('download', { timeout: DOWNLOAD_TIMEOUT });
    await page.click('button:has-text("下载导入模板")');
    await downloadPromise;

    // 等待日志输出完成
    await page.waitForTimeout(1000);

    console.log(`\n收集到 ${logs.length} 条相关日志:`);
    logs.forEach((log, index) => {
      console.log(`  ${index + 1}. ${log}`);
    });

    // 验证关键日志存在
    const hasStartLog = logs.some(log => log.includes('开始下载模板'));
    const hasEnvLog = logs.some(log => log.includes('环境检测'));
    const hasBrowserLog = logs.some(log => log.includes('浏览器'));
    const hasCompleteLog = logs.some(log => log.includes('下载完成') || log.includes('下载成功'));

    console.log('\n日志验证结果:');
    console.log(`  - 开始日志: ${hasStartLog ? '✓' : '✗'}`);
    console.log(`  - 环境检测日志: ${hasEnvLog ? '✓' : '✗'}`);
    console.log(`  - 浏览器模式日志: ${hasBrowserLog ? '✓' : '✗'}`);
    console.log(`  - 完成日志: ${hasCompleteLog ? '✓' : '✗'}`);

    expect(hasStartLog).toBe(true);
    expect(hasEnvLog).toBe(true);
    expect(hasBrowserLog).toBe(true);

    console.log('✓ 日志记录验证通过');
  });

  test('用例 4: 验证错误处理', async ({ page, context }) => {
    console.log('\n========== 用例 4: 验证错误处理 ==========');

    // 拦截 API 请求，模拟服务器错误
    await page.route('**/api/import-export/template*', (route) => {
      console.log('拦截 API 请求，返回 500 错误');
      route.fulfill({
        status: 500,
        body: JSON.stringify({ error: '服务器错误' }),
      });
    });

    const errorLogs: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error' || msg.text().includes('ERROR') || msg.text().includes('错误')) {
        errorLogs.push(msg.text());
      }
    });

    // 点击下载按钮
    await page.click('button:has-text("下载导入模板")');

    // 等待错误提示
    await page.waitForTimeout(2000);

    console.log(`\n收集到 ${errorLogs.length} 条错误日志:`);
    errorLogs.forEach((log, index) => {
      console.log(`  ${index + 1}. ${log}`);
    });

    // 验证有错误日志
    expect(errorLogs.length).toBeGreaterThan(0);

    console.log('✓ 错误处理验证通过');
  });
});

test.describe('模板下载功能测试（API 直接调用）', () => {
  test('用例 5: 直接测试 API 端点', async ({ request }) => {
    console.log('\n========== 用例 5: 直接测试 API 端点 ==========');

    console.log('发起 GET 请求到 /api/import-export/template');
    const startTime = Date.now();

    const response = await request.get(`${API_URL}/api/import-export/template?templateType=all`);

    const duration = Date.now() - startTime;
    console.log(`请求耗时: ${duration}ms`);
    console.log(`响应状态: ${response.status()}`);

    expect(response.status()).toBe(200);

    const headers = response.headers();
    console.log('\n响应头:');
    console.log(`  Content-Type: ${headers['content-type']}`);
    console.log(`  Content-Disposition: ${headers['content-disposition']}`);
    console.log(`  Content-Length: ${headers['content-length']}`);

    const body = await response.body();
    console.log(`\n响应体大小: ${body.length} 字节`);

    // 验证是否是有效的 Excel 文件（检查文件头）
    const header = body.slice(0, 4).toString('hex');
    console.log(`文件头: ${header}`);

    // Excel 文件应该以 PK 开头（ZIP 格式）
    expect(header.startsWith('504b')).toBe(true);

    console.log('✓ API 端点验证通过');
  });
});
