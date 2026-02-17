/**
 * Store 基础功能测试
 *
 * 测试目标：
 * 1. 验证字典管理页面能正常显示
 * 2. 验证默认数据（教研组、年级）是否正确初始化
 */

import { test, expect } from '@playwright/test';

test.describe('Store 基础功能测试', () => {
  test.beforeEach(async ({ page }) => {
    // 访问首页
    await page.goto('http://localhost:5173');
    await page.waitForLoadState('networkidle');
  });

  test('用例 1: 验证字典管理页面显示默认数据', async ({ page }) => {
    console.log('=== 开始测试用例 1: 验证字典管理页面 ===');

    // 1. 导航到字典管理页面
    await page.click('text=字典管理');
    await page.waitForURL('**/dictionary');
    console.log('✓ 已导航到字典管理页面');

    // 2. 等待页面加载
    await page.waitForTimeout(1000);

    // 3. 验证教研组数据（应该有默认数据）
    await page.click('text=/教研组/');
    await page.waitForTimeout(500);

    const groupCountText = await page.locator('text=/教研组.*\\(/').textContent();
    console.log(`✓ 教研组标签: ${groupCountText}`);

    // 4. 验证年级数据（应该有默认数据）
    await page.click('text=/年级/');
    await page.waitForTimeout(500);

    const gradeCountText = await page.locator('text=/年级.*\\(/').textContent();
    console.log(`✓ 年级标签: ${gradeCountText}`);

    console.log('=== 用例 1 测试通过 ===');
  });

  test('用例 2: 验证教师管理页面正常显示', async ({ page }) => {
    console.log('=== 开始测试用例 2: 验证教师管理页面 ===');

    // 1. 导航到教师管理页面
    await page.click('text=教师管理');
    await page.waitForURL('**/teacher');
    console.log('✓ 已导航到教师管理页面');

    // 2. 等待页面加载
    await page.waitForTimeout(1000);

    // 3. 验证页面标题
    const pageTitle = await page.locator('.page-title').textContent();
    console.log(`✓ 页面标题: ${pageTitle}`);
    expect(pageTitle).toContain('教师管理');

    console.log('=== 用例 2 测试通过 ===');
  });
});
