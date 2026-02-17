/**
 * 字典显示测试
 * 测试字典管理页面是否能正确显示数据
 */
import { test, expect } from '@playwright/test';

test.describe('字典显示测试', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:5173');
    await page.waitForLoadState('networkidle');
  });

  test('1. 教研组字典应该显示默认数据', async ({ page }) => {
    await page.click('text=字典管理');
    await page.waitForLoadState('networkidle');

    await page.click('.el-tabs__item:has-text("教研组")');
    await page.waitForTimeout(1000);

    const teachingGroupTable = page.locator('.teaching-group-dictionary .el-table');
    await expect(teachingGroupTable).toBeVisible();

    const tableRows = teachingGroupTable.locator('tbody tr');
    const rowCount = await tableRows.count();
    expect(rowCount).toBeGreaterThan(0);

    console.log(`✓ 教研组字典中有 ${rowCount} 条数据`);
  });

  test('2. 年级字典应该显示默认数据', async ({ page }) => {
    await page.click('text=字典管理');
    await page.waitForLoadState('networkidle');

    await page.click('.el-tabs__item:has-text("年级")');
    await page.waitForTimeout(1000);

    const gradeTable = page.locator('.grade-dictionary .el-table');
    await expect(gradeTable).toBeVisible();

    const tableRows = gradeTable.locator('tbody tr');
    const rowCount = await tableRows.count();
    expect(rowCount).toBeGreaterThanOrEqual(3);

    console.log(`✓ 年级字典中有 ${rowCount} 条数据`);
  });

  test('3. 场地字典应该可以添加数据', async ({ page }) => {
    await page.click('text=字典管理');
    await page.waitForLoadState('networkidle');

    await page.click('.el-tabs__item:has-text("场地")');
    await page.waitForTimeout(1000);

    // 点击添加按钮
    await page.click('button:has-text("添加场地")');
    await page.waitForTimeout(500);

    // 填写表单
    await page.fill('input[placeholder="请输入场地名称"]', '测试教室101');
    await page.selectOption('.el-select', { label: '普通教室' });

    // 点击保存
    await page.click('button:has-text("保存")');
    await page.waitForTimeout(500);

    // 验证添加成功
    await expect(page.locator('text=添加成功')).toBeVisible();

    console.log('✓ 场地添加成功');
  });
});
