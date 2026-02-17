/**
 * 教师管理页面测试
 * 测试教师管理页面的数据显示和基本功能
 */
import { test, expect } from '@playwright/test';

test.describe('教师管理页面', () => {
  test.beforeEach(async ({ page }) => {
    // 访问首页
    await page.goto('http://localhost:5173');
    await page.waitForLoadState('networkidle');
  });

  test('1. 导入测试数据', async ({ page }) => {
    console.log('开始测试：导入测试数据');

    // 点击导入导出菜单
    await page.click('text=导入导出');
    await page.waitForTimeout(500);

    // 等待页面加载
    await expect(page.locator('text=数据导入导出')).toBeVisible();

    // 点击下载模板按钮
    const downloadButton = page.locator('button:has-text("下载导入模板")');
    await expect(downloadButton).toBeVisible();
    await downloadButton.click();

    // 等待下载完成
    await page.waitForTimeout(2000);

    // 选择测试数据文件
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles('data/测试数据.xlsx');

    // 等待文件信息显示
    await expect(page.locator('text=测试数据.xlsx')).toBeVisible();
    console.log('文件已选择：测试数据.xlsx');

    // 点击开始导入按钮
    const importButton = page.locator('button:has-text("开始导入")');
    await expect(importButton).toBeVisible();
    await importButton.click();

    // 等待导入完成（最多 30 秒）
    await page.waitForSelector('text=导入成功', { timeout: 30000 });
    console.log('数据导入成功');

    // 验证导入结果
    await expect(page.locator('text=导入成功')).toBeVisible();
  });

  test('2. 访问教师管理页面并验证数据显示', async ({ page }) => {
    console.log('开始测试：访问教师管理页面');

    // 先导入数据
    await page.click('text=导入导出');
    await page.waitForTimeout(500);

    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles('data/测试数据.xlsx');
    await page.waitForTimeout(1000);

    const importButton = page.locator('button:has-text("开始导入")');
    await importButton.click();
    await page.waitForSelector('text=导入成功', { timeout: 30000 });

    console.log('数据导入完成，开始访问教师管理页面');

    // 点击教师管理菜单
    await page.click('text=教师管理');
    await page.waitForTimeout(1000);

    // 验证页面标题
    await expect(page.locator('h2:has-text("教师管理")')).toBeVisible();
    console.log('教师管理页面已加载');

    // 验证教师列表标签页
    await expect(page.locator('text=教师列表')).toBeVisible();

    // 等待表格加载
    await page.waitForSelector('.el-table', { timeout: 5000 });

    // 验证表格中有数据
    const tableRows = page.locator('.el-table__body tr');
    const rowCount = await tableRows.count();
    console.log(`教师列表显示 ${rowCount} 条记录`);

    expect(rowCount).toBeGreaterThan(0);

    // 验证表格列
    await expect(page.locator('text=教师姓名')).toBeVisible();
    await expect(page.locator('text=教研组')).toBeVisible();
    await expect(page.locator('text=每天最大课时')).toBeVisible();
    await expect(page.locator('text=最大连续课时')).toBeVisible();

    console.log('教师管理页面数据显示正常');
  });

  test('3. 测试教师列表筛选功能', async ({ page }) => {
    console.log('开始测试：教师列表筛选功能');

    // 先导入数据并进入教师管理页面
    await page.click('text=导入导出');
    await page.waitForTimeout(500);

    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles('data/测试数据.xlsx');
    await page.waitForTimeout(1000);

    const importButton = page.locator('button:has-text("开始导入")');
    await importButton.click();
    await page.waitForSelector('text=导入成功', { timeout: 30000 });

    await page.click('text=教师管理');
    await page.waitForTimeout(1000);

    // 等待表格加载
    await page.waitForSelector('.el-table', { timeout: 5000 });

    // 获取初始行数
    const initialRows = await page.locator('.el-table__body tr').count();
    console.log(`初始教师数量：${initialRows}`);

    // 测试搜索功能
    const searchInput = page.locator('input[placeholder="搜索教师姓名"]');
    await searchInput.fill('张');
    await page.waitForTimeout(500);

    const filteredRows = await page.locator('.el-table__body tr').count();
    console.log(`搜索"张"后的教师数量：${filteredRows}`);

    // 清除搜索
    await searchInput.clear();
    await page.waitForTimeout(500);

    // 验证恢复到初始数量
    const restoredRows = await page.locator('.el-table__body tr').count();
    expect(restoredRows).toBe(initialRows);

    console.log('教师列表筛选功能测试通过');
  });

  test('4. 测试教师管理页面标签页切换', async ({ page }) => {
    console.log('开始测试：标签页切换功能');

    // 先导入数据并进入教师管理页面
    await page.click('text=导入导出');
    await page.waitForTimeout(500);

    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles('data/测试数据.xlsx');
    await page.waitForTimeout(1000);

    const importButton = page.locator('button:has-text("开始导入")');
    await importButton.click();
    await page.waitForSelector('text=导入成功', { timeout: 30000 });

    await page.click('text=教师管理');
    await page.waitForTimeout(1000);

    // 验证教师列表标签页
    await expect(page.locator('.el-tabs__item:has-text("教师列表")')).toBeVisible();

    // 点击偏好设置标签页
    await page.click('.el-tabs__item:has-text("偏好设置")');
    await page.waitForTimeout(500);
    console.log('已切换到偏好设置标签页');

    // 点击工作量统计标签页
    await page.click('.el-tabs__item:has-text("工作量统计")');
    await page.waitForTimeout(500);
    console.log('已切换到工作量统计标签页');

    // 切换回教师列表
    await page.click('.el-tabs__item:has-text("教师列表")');
    await page.waitForTimeout(500);
    console.log('已切换回教师列表标签页');

    // 验证表格仍然可见
    await expect(page.locator('.el-table')).toBeVisible();

    console.log('标签页切换功能测试通过');
  });
});
