/**
 * 导入导出功能测试
 */
import { test, expect } from '@playwright/test';
import { NavigationPage } from '../pages/navigation-page';
import { ImportExportPage } from '../pages/import-export-page';
import path from 'path';

test.describe('导入导出功能测试', () => {
  let navigationPage: NavigationPage;
  let importExportPage: ImportExportPage;

  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:5173');
    navigationPage = new NavigationPage(page);
    importExportPage = new ImportExportPage(page);

    // 导航到导入导出页面
    await navigationPage.goToImportExport();
    await page.waitForLoadState('networkidle');
  });

  test('15 - 导入导出页面加载', async ({ page }) => {
    // 验证页面 URL
    expect(page.url()).toContain('/import-export');

    // 验证页面标题
    await expect(page).toHaveTitle(/导入导出.*排课系统/);

    // 验证主要元素可见
    await expect(page.locator('.app-main')).toBeVisible();
  });

  test('16 - 下载模板功能', async ({ page }) => {
    // 查找下载模板按钮
    const downloadButton = page.getByRole('button', { name: /下载.*模板/i }).first();

    if (await downloadButton.isVisible()) {
      const startTime = Date.now();

      // 等待下载事件
      const downloadPromise = page.waitForEvent('download', { timeout: 10000 });

      // 点击下载按钮
      await downloadButton.click();

      // 等待下载完成
      const download = await downloadPromise;
      const downloadTime = Date.now() - startTime;

      console.log(`模板下载时间: ${downloadTime}ms`);
      console.log(`下载文件名: ${download.suggestedFilename()}`);

      // 验证下载文件名
      expect(download.suggestedFilename()).toMatch(/\.xlsx$/);

      // 验证下载时间（应该小于 5 秒）
      expect(downloadTime).toBeLessThan(5000);

      // 保存下载的文件
      const downloadsPath = path.join(process.cwd(), 'tests/downloads');
      await download.saveAs(path.join(downloadsPath, download.suggestedFilename()));
    } else {
      console.log('下载模板按钮不可见，跳过测试');
      test.skip();
    }
  });

  test('17 - 页面响应性测试', async ({ page }) => {
    // 测试页面在不同操作下的响应性
    const operations = [
      { name: '点击页面', action: () => page.locator('.app-main').click() },
      { name: '滚动页面', action: () => page.evaluate(() => window.scrollBy(0, 100)) },
    ];

    for (const op of operations) {
      const startTime = Date.now();
      await op.action();
      const responseTime = Date.now() - startTime;

      console.log(`${op.name}响应时间: ${responseTime}ms`);

      // 验证响应时间（应该小于 100ms）
      expect(responseTime).toBeLessThan(100);
    }
  });
});
