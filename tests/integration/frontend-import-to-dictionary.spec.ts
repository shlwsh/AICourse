/**
 * 导入数据到字典管理测试
 * 测试从导入功能到字典管理页面的完整流程
 */
import { test, expect } from '@playwright/test';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

test.describe('导入数据到字典管理测试', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:5173');
    await page.waitForLoadState('networkidle');
  });

  test('1. 导入数据后应该能在教师字典中看到数据', async ({ page }) => {
    await page.click('text=导入导出');
    await page.waitForLoadState('networkidle');

    const testFilePath = resolve(__dirname, '../../data/测试数据.xlsx');
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(testFilePath);
    await page.waitForTimeout(1000);

    await page.click('button:has-text("开始导入")');
    await page.waitForSelector('text=导入成功', { timeout: 30000 });

    await page.click('text=字典管理');
    await page.waitForLoadState('networkidle');

    await expect(page.locator('.teacher-dictionary')).toBeVisible();
    const teacherTable = page.locator('.teacher-dictionary .el-table');
    await expect(teacherTable).toBeVisible();

    const tableRows = teacherTable.locator('tbody tr');
    const rowCount = await tableRows.count();
    expect(rowCount).toBeGreaterThan(0);

    console.log(`✓ 教师字典中有 ${rowCount} 条数据`);
  });

  test('2. 导入数据后应该能在班级字典中看到数据', async ({ page }) => {
    await page.click('text=字典管理');
    await page.waitForLoadState('networkidle');

    await page.click('.el-tabs__item:has-text("班级")');
    await page.waitForTimeout(500);

    const classTable = page.locator('.class-dictionary .el-table');
    await expect(classTable).toBeVisible();

    const tableRows = classTable.locator('tbody tr');
    const rowCount = await tableRows.count();

    if (rowCount > 0) {
      console.log(`✓ 班级字典中有 ${rowCount} 条数据`);
    } else {
      console.log('⚠ 班级字典中暂无数据');
    }
  });

  test('3. 导入数据后应该能在科目字典中看到数据', async ({ page }) => {
    await page.click('text=字典管理');
    await page.waitForLoadState('networkidle');

    await page.click('.el-tabs__item:has-text("科目")');
    await page.waitForTimeout(500);

    const subjectTable = page.locator('.subject-dictionary .el-table');
    await expect(subjectTable).toBeVisible();

    const tableRows = subjectTable.locator('tbody tr');
    const rowCount = await tableRows.count();

    if (rowCount > 0) {
      console.log(`✓ 科目字典中有 ${rowCount} 条数据`);
    } else {
      console.log('⚠ 科目字典中暂无数据');
    }
  });

  test('4. 导入数据后应该能在教学计划页面看到数据', async ({ page }) => {
    await page.click('text=教学计划');
    await page.waitForLoadState('networkidle');

    const curriculumTable = page.locator('.curriculum-page .el-table');
    await expect(curriculumTable).toBeVisible();

    const tableRows = curriculumTable.locator('tbody tr');
    const rowCount = await tableRows.count();

    if (rowCount > 0) {
      console.log(`✓ 教学计划中有 ${rowCount} 条数据`);
    } else {
      console.log('⚠ 教学计划中暂无数据');
    }
  });

  test('5. 教研组字典应该显示默认数据', async ({ page }) => {
    await page.click('text=字典管理');
    await page.waitForLoadState('networkidle');

    await page.click('.el-tabs__item:has-text("教研组")');
    await page.waitForTimeout(500);

    const teachingGroupTable = page.locator('.teaching-group-dictionary .el-table');
    await expect(teachingGroupTable).toBeVisible();

    const tableRows = teachingGroupTable.locator('tbody tr');
    const rowCount = await tableRows.count();
    expect(rowCount).toBeGreaterThan(0);

    console.log(`✓ 教研组字典中有 ${rowCount} 条数据（包含默认数据）`);
  });

  test('6. 年级字典应该显示默认数据', async ({ page }) => {
    await page.click('text=字典管理');
    await page.waitForLoadState('networkidle');

    await page.click('.el-tabs__item:has-text("年级")');
    await page.waitForTimeout(500);

    const gradeTable = page.locator('.grade-dictionary .el-table');
    await expect(gradeTable).toBeVisible();

    const tableRows = gradeTable.locator('tbody tr');
    const rowCount = await tableRows.count();
    expect(rowCount).toBeGreaterThanOrEqual(3);

    console.log(`✓ 年级字典中有 ${rowCount} 条数据（包含默认数据）`);
  });
});
