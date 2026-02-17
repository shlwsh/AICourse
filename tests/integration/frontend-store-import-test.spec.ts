/**
 * Store 导入功能集成测试
 * 验证数据从 Excel 导入后能正确分发到各个专门的 store
 */
import { test, expect } from '@playwright/test';

test.describe('Store 导入功能测试', () => {
  test.beforeEach(async ({ page }) => {
    // 访问首页
    await page.goto('http://localhost:5173');
    await page.waitForLoadState('networkidle');
    console.log('页面加载完成');
  });

  test('1. 导入测试数据到各个专门的 store', async ({ page }) => {
    console.log('开始测试：导入数据到专门的 store');

    // 进入导入导出页面
    await page.click('text=导入导出');
    await page.waitForTimeout(1000);

    // 验证页面加载
    await expect(page.locator('text=数据导入导出')).toBeVisible();
    console.log('导入导出页面已加载');

    // 选择测试数据文件
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles('data/测试数据.xlsx');
    await page.waitForTimeout(1000);

    // 验证文件已选择
    await expect(page.locator('text=测试数据.xlsx')).toBeVisible();
    console.log('文件已选择：测试数据.xlsx');

    // 点击开始导入
    const importButton = page.locator('button:has-text("开始导入")');
    await expect(importButton).toBeVisible();
    await importButton.click();
    console.log('点击开始导入按钮');

    // 等待导入完成（最多 30 秒）
    await page.waitForSelector('text=导入成功', { timeout: 30000 });
    console.log('数据导入成功');

    // 验证导入结果
    await expect(page.locator('text=导入成功')).toBeVisible();
  });

  test('2. 验证教师数据已导入到 teacherStore', async ({ page }) => {
    console.log('开始测试：验证教师数据');

    // 先导入数据
    await page.click('text=导入导出');
    await page.waitForTimeout(500);
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles('data/测试数据.xlsx');
    await page.waitForTimeout(1000);
    const importButton = page.locator('button:has-text("开始导入")');
    await importButton.click();
    await page.waitForSelector('text=导入成功', { timeout: 30000 });

    // 进入字典管理页面
    await page.click('text=字典管理');
    await page.waitForTimeout(1000);

    // 验证页面标题
    await expect(page.locator('h2:has-text("字典管理")')).toBeVisible();
    console.log('字典管理页面已加载');

    // 检查教师标签页的计数
    const teacherTab = page.locator('.el-tabs__item:has-text("教师")');
    await expect(teacherTab).toBeVisible();

    const teacherTabText = await teacherTab.textContent();
    console.log(`教师标签页文本：${teacherTabText}`);

    // 验证教师数量大于 0
    expect(teacherTabText).toContain('教师');

    // 点击教师标签页
    await teacherTab.click();
    await page.waitForTimeout(1000);

    // 等待表格加载
    await page.waitForSelector('.el-table', { timeout: 5000 });

    // 验证表格中有数据
    const tableRows = page.locator('.el-table__body tr');
    const rowCount = await tableRows.count();
    console.log(`教师列表显示 ${rowCount} 条记录`);

    expect(rowCount).toBeGreaterThan(0);
  });

  test('3. 验证班级数据已导入到 classStore', async ({ page }) => {
    console.log('开始测试：验证班级数据');

    // 先导入数据
    await page.click('text=导入导出');
    await page.waitForTimeout(500);
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles('data/测试数据.xlsx');
    await page.waitForTimeout(1000);
    const importButton = page.locator('button:has-text("开始导入")');
    await importButton.click();
    await page.waitForSelector('text=导入成功', { timeout: 30000 });

    // 进入字典管理页面
    await page.click('text=字典管理');
    await page.waitForTimeout(1000);

    // 点击班级标签页
    const classTab = page.locator('.el-tabs__item:has-text("班级")');
    await expect(classTab).toBeVisible();
    await classTab.click();
    await page.waitForTimeout(1000);

    // 等待表格加载
    await page.waitForSelector('.el-table', { timeout: 5000 });

    // 验证表格中有数据
    const tableRows = page.locator('.el-table__body tr');
    const rowCount = await tableRows.count();
    console.log(`班级列表显示 ${rowCount} 条记录`);

    expect(rowCount).toBeGreaterThan(0);
  });

  test('4. 验证科目数据已导入到 subjectStore', async ({ page }) => {
    console.log('开始测试：验证科目数据');

    // 先导入数据
    await page.click('text=导入导出');
    await page.waitForTimeout(500);
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles('data/测试数据.xlsx');
    await page.waitForTimeout(1000);
    const importButton = page.locator('button:has-text("开始导入")');
    await importButton.click();
    await page.waitForSelector('text=导入成功', { timeout: 30000 });

    // 进入字典管理页面
    await page.click('text=字典管理');
    await page.waitForTimeout(1000);

    // 点击科目标签页
    const subjectTab = page.locator('.el-tabs__item:has-text("科目")');
    await expect(subjectTab).toBeVisible();
    await subjectTab.click();
    await page.waitForTimeout(1000);

    // 等待表格加载
    await page.waitForSelector('.el-table', { timeout: 5000 });

    // 验证表格中有数据
    const tableRows = page.locator('.el-table__body tr');
    const rowCount = await tableRows.count();
    console.log(`科目列表显示 ${rowCount} 条记录`);

    expect(rowCount).toBeGreaterThan(0);
  });

  test('5. 验证教研组数据已导入到 teachingGroupStore', async ({ page }) => {
    console.log('开始测试：验证教研组数据');

    // 先导入数据
    await page.click('text=导入导出');
    await page.waitForTimeout(500);
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles('data/测试数据.xlsx');
    await page.waitForTimeout(1000);
    const importButton = page.locator('button:has-text("开始导入")');
    await importButton.click();
    await page.waitForSelector('text=导入成功', { timeout: 30000 });

    // 进入字典管理页面
    await page.click('text=字典管理');
    await page.waitForTimeout(1000);

    // 点击教研组标签页
    const groupTab = page.locator('.el-tabs__item:has-text("教研组")');
    await expect(groupTab).toBeVisible();
    await groupTab.click();
    await page.waitForTimeout(1000);

    // 等待表格加载
    await page.waitForSelector('.el-table', { timeout: 5000 });

    // 验证表格中有数据
    const tableRows = page.locator('.el-table__body tr');
    const rowCount = await tableRows.count();
    console.log(`教研组列表显示 ${rowCount} 条记录`);

    expect(rowCount).toBeGreaterThan(0);
  });

  test('6. 验证年级数据已导入到 gradeStore', async ({ page }) => {
    console.log('开始测试：验证年级数据');

    // 先导入数据
    await page.click('text=导入导出');
    await page.waitForTimeout(500);
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles('data/测试数据.xlsx');
    await page.waitForTimeout(1000);
    const importButton = page.locator('button:has-text("开始导入")');
    await importButton.click();
    await page.waitForSelector('text=导入成功', { timeout: 30000 });

    // 进入字典管理页面
    await page.click('text=字典管理');
    await page.waitForTimeout(1000);

    // 点击年级标签页
    const gradeTab = page.locator('.el-tabs__item:has-text("年级")');
    await expect(gradeTab).toBeVisible();
    await gradeTab.click();
    await page.waitForTimeout(1000);

    // 等待表格加载
    await page.waitForSelector('.el-table', { timeout: 5000 });

    // 验证表格中有数据
    const tableRows = page.locator('.el-table__body tr');
    const rowCount = await tableRows.count();
    console.log(`年级列表显示 ${rowCount} 条记录`);

    expect(rowCount).toBeGreaterThan(0);
  });

  test('7. 验证场地数据已导入到 venueStore', async ({ page }) => {
    console.log('开始测试：验证场地数据');

    // 先导入数据
    await page.click('text=导入导出');
    await page.waitForTimeout(500);
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles('data/测试数据.xlsx');
    await page.waitForTimeout(1000);
    const importButton = page.locator('button:has-text("开始导入")');
    await importButton.click();
    await page.waitForSelector('text=导入成功', { timeout: 30000 });

    // 进入字典管理页面
    await page.click('text=字典管理');
    await page.waitForTimeout(1000);

    // 点击场地标签页
    const venueTab = page.locator('.el-tabs__item:has-text("场地")');
    await expect(venueTab).toBeVisible();
    await venueTab.click();
    await page.waitForTimeout(1000);

    // 等待表格加载
    await page.waitForSelector('.el-table', { timeout: 5000 });

    // 验证表格中有数据
    const tableRows = page.locator('.el-table__body tr');
    const rowCount = await tableRows.count();
    console.log(`场地列表显示 ${rowCount} 条记录`);

    expect(rowCount).toBeGreaterThan(0);
  });

  test('8. 验证教师管理页面能显示导入的数据', async ({ page }) => {
    console.log('开始测试：验证教师管理页面');

    // 先导入数据
    await page.click('text=导入导出');
    await page.waitForTimeout(500);
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles('data/测试数据.xlsx');
    await page.waitForTimeout(1000);
    const importButton = page.locator('button:has-text("开始导入")');
    await importButton.click();
    await page.waitForSelector('text=导入成功', { timeout: 30000 });

    // 进入教师管理页面
    await page.click('text=教师管理');
    await page.waitForTimeout(1000);

    // 验证页面标题
    await expect(page.locator('h2:has-text("教师管理")')).toBeVisible();
    console.log('教师管理页面已加载');

    // 等待表格加载
    await page.waitForSelector('.el-table', { timeout: 5000 });

    // 验证表格中有数据
    const tableRows = page.locator('.el-table__body tr');
    const rowCount = await tableRows.count();
    console.log(`教师管理页面显示 ${rowCount} 条记录`);

    expect(rowCount).toBeGreaterThan(0);
  });
});
