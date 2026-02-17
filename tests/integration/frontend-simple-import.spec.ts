/**
 * 简单的导入测试
 * 测试导入功能是否正常工作
 */
import { test, expect } from '@playwright/test';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

test.describe('简单导入测试', () => {
  test('导入测试数据文件', async ({ page }) => {
    await page.goto('http://localhost:5173');
    await page.waitForLoadState('networkidle');

    // 导航到导入导出页面
    await page.click('text=导入导出');
    await page.waitForLoadState('networkidle');

    // 准备测试文件路径
    const testFilePath = resolve(__dirname, '../../data/测试数据.xlsx');
    console.log('测试文件路径:', testFilePath);

    // 上传文件
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(testFilePath);
    await page.waitForTimeout(1000);

    // 点击导入按钮
    await page.click('button:has-text("开始导入")');

    // 等待导入完成或失败（最多60秒）
    try {
      await page.waitForSelector('text=导入成功', { timeout: 60000 });
      console.log('✓ 导入成功');
    } catch (error) {
      // 检查是否有错误消息
      const errorMsg = await page.locator('.el-message--error').textContent().catch(() => null);
      if (errorMsg) {
        console.log('✗ 导入失败:', errorMsg);
      }

      // 截图保存错误状态
      await page.screenshot({ path: 'test-results/import-error.png' });
      throw error;
    }

    // 检查导入结果统计
    const resultText = await page.locator('.import-result').textContent();
    console.log('导入结果:', resultText);
  });
});
