/**
 * 教师管理页面导入测试
 *
 * 测试目标：
 * 1. 导入 Excel 文件
 * 2. 验证教师管理页面能正确显示导入的教师数据
 */

import { test, expect } from '@playwright/test';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

test.describe('教师管理页面导入测试', () => {
  test('用例 1: 导入 Excel 并验证教师管理页面显示数据', async ({ page }) => {
    console.log('=== 开始测试：导入并验证教师管理页面 ===');

    // 1. 访问首页
    await page.goto('http://localhost:5173');
    await page.waitForLoadState('networkidle');
    console.log('✓ 已访问首页');

    // 2. 导航到导入导出页面
    await page.click('text=导入导出');
    await page.waitForURL('**/import-export');
    console.log('✓ 已导航到导入导出页面');

    // 3. 选择测试数据文件
    const testDataPath = resolve(__dirname, '../../data/测试数据.xlsx');
    console.log(`✓ 测试数据文件路径: ${testDataPath}`);

    // 4. 上传文件
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(testDataPath);
    console.log('✓ 文件已选择');

    // 5. 等待文件信息显示
    await page.waitForSelector('.selected-file', { timeout: 5000 });
    const fileName = await page.locator('.file-name').textContent();
    console.log(`✓ 文件信息已显示: ${fileName}`);

    // 6. 点击开始导入按钮
    await page.click('button:has-text("开始导入")');
    console.log('✓ 已点击开始导入按钮');

    // 7. 等待导入完成（增加超时时间）
    await page.waitForSelector('.import-result', { timeout: 60000 });
    console.log('✓ 导入完成');

    // 8. 验证导入结果
    const successText = await page.locator('.result-summary').textContent();
    console.log(`✓ 导入结果: ${successText}`);
    expect(successText).toContain('成功导入');

    // 9. 导航到教师管理页面
    await page.click('text=教师管理');
    await page.waitForURL('**/teacher');
    console.log('✓ 已导航到教师管理页面');

    // 10. 等待页面加载
    await page.waitForTimeout(2000);

    // 11. 检查是否有教师数据
    // 先检查是否有空状态提示
    const emptyState = page.locator('.el-empty');
    const hasEmptyState = await emptyState.count() > 0;

    if (hasEmptyState) {
      console.log('✗ 教师管理页面显示空状态');

      // 打印页面内容以调试
      const pageContent = await page.content();
      console.log('页面内容片段:', pageContent.substring(0, 500));

      throw new Error('教师管理页面没有显示导入的数据');
    }

    // 12. 验证表格有数据行
    const rows = page.locator('.el-table__body tbody tr');
    const rowCount = await rows.count();
    console.log(`✓ 教师列表数据行数: ${rowCount}`);
    expect(rowCount).toBeGreaterThan(0);

    // 13. 验证第一行数据
    const firstRow = rows.first();
    const teacherName = await firstRow.locator('td').nth(1).textContent();
    console.log(`✓ 第一个教师姓名: ${teacherName}`);
    expect(teacherName).toBeTruthy();

    console.log('=== 测试通过 ===');
  });
});
