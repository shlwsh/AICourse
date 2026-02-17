/**
 * 字典管理功能测试
 * 测试字典管理页面的基本功能
 */
import { test, expect } from '@playwright/test';

test.describe('字典管理功能测试', () => {
  test.beforeEach(async ({ page }) => {
    // 访问应用首页
    await page.goto('http://localhost:5173');
    await page.waitForLoadState('networkidle');
  });

  test('1. 应该能够导航到字典管理页面', async ({ page }) => {
    // 点击字典管理菜单
    await page.click('text=字典管理');
    await page.waitForLoadState('networkidle');

    // 验证页面标题
    await expect(page.locator('h2.page-title')).toContainText('字典管理');
  });

  test('2. 应该显示所有字典标签页', async ({ page }) => {
    // 导航到字典管理页面
    await page.click('text=字典管理');
    await page.waitForLoadState('networkidle');

    // 验证所有标签页存在
    await expect(page.locator('.el-tabs__item').filter({ hasText: '教师' })).toBeVisible();
    await expect(page.locator('.el-tabs__item').filter({ hasText: '班级' })).toBeVisible();
    await expect(page.locator('.el-tabs__item').filter({ hasText: '科目' })).toBeVisible();
    await expect(page.locator('.el-tabs__item').filter({ hasText: '教研组' })).toBeVisible();
    await expect(page.locator('.el-tabs__item').filter({ hasText: '年级' })).toBeVisible();
    await expect(page.locator('.el-tabs__item').filter({ hasText: '场地' })).toBeVisible();
  });

  test('3. 应该能够切换到教研组标签页', async ({ page }) => {
    // 导航到字典管理页面
    await page.click('text=字典管理');
    await page.waitForLoadState('networkidle');

    // 点击教研组标签页
    await page.click('.el-tabs__item:has-text("教研组")');
    await page.waitForTimeout(500);

    // 验证教研组内容显示
    await expect(page.locator('.teaching-group-dictionary')).toBeVisible();
  });

  test('4. 应该能够切换到年级标签页', async ({ page }) => {
    // 导航到字典管理页面
    await page.click('text=字典管理');
    await page.waitForLoadState('networkidle');

    // 点击年级标签页
    await page.click('.el-tabs__item:has-text("年级")');
    await page.waitForTimeout(500);

    // 验证年级内容显示
    await expect(page.locator('.grade-dictionary')).toBeVisible();
  });

  test('5. 应该能够切换到场地标签页', async ({ page }) => {
    // 导航到字典管理页面
    await page.click('text=字典管理');
    await page.waitForLoadState('networkidle');

    // 点击场地标签页
    await page.click('.el-tabs__item:has-text("场地")');
    await page.waitForTimeout(500);

    // 验证场地内容显示
    await expect(page.locator('.venue-dictionary')).toBeVisible();
  });

  test('6. 应该能够导航到教学计划页面', async ({ page }) => {
    // 点击教学计划菜单
    await page.click('text=教学计划');
    await page.waitForLoadState('networkidle');

    // 验证页面标题
    await expect(page.locator('h2.page-title')).toContainText('教学计划管理');
  });

  test('7. 教学计划页面应该显示添加按钮', async ({ page }) => {
    // 导航到教学计划页面
    await page.click('text=教学计划');
    await page.waitForLoadState('networkidle');

    // 验证添加按钮存在
    await expect(page.locator('button:has-text("添加教学计划")')).toBeVisible();
  });
});
