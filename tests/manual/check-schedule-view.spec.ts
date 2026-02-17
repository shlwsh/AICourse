/**
 * 手动测试：检查课表视图显示
 * 用于验证班级视图、教师视图、场地视图的数据显示
 */
import { test, expect } from '@playwright/test';

test.describe('课表视图显示检查', () => {
  test.beforeEach(async ({ page }) => {
    // 访问课表管理页面
    await page.goto('http://localhost:5174');
    await page.waitForLoadState('networkidle');

    // 等待页面加载完成
    await page.waitForTimeout(2000);
  });

  test('检查班级视图显示', async ({ page }) => {
    console.log('=== 检查班级视图 ===');

    // 点击课表管理菜单
    await page.click('text=课表管理');
    await page.waitForTimeout(1000);

    // 确认班级视图是默认选中的
    const classViewButton = page.locator('text=班级视图');
    await expect(classViewButton).toBeVisible();

    // 等待课表数据加载
    await page.waitForTimeout(2000);

    // 检查是否有课表网格
    const scheduleTable = page.locator('.schedule-table');
    await expect(scheduleTable).toBeVisible();

    // 检查是否有班级名称
    const entityNames = page.locator('.entity-name');
    const count = await entityNames.count();
    console.log(`班级视图：找到 ${count} 个班级`);

    // 检查是否有课程卡片
    const courseCards = page.locator('.course-card');
    const cardCount = await courseCards.count();
    console.log(`班级视图：找到 ${cardCount} 个课程卡片`);

    // 截图保存
    await page.screenshot({ path: 'tests/manual/screenshots/class-view.png', fullPage: true });

    expect(count).toBeGreaterThan(0);
    expect(cardCount).toBeGreaterThan(0);
  });

  test('检查教师视图显示', async ({ page }) => {
    console.log('=== 检查教师视图 ===');

    // 点击课表管理菜单
    await page.click('text=课表管理');
    await page.waitForTimeout(1000);

    // 切换到教师视图
    await page.click('text=教师视图');
    await page.waitForTimeout(2000);

    // 检查是否有课表网格
    const scheduleTable = page.locator('.schedule-table');
    await expect(scheduleTable).toBeVisible();

    // 检查是否有教师名称
    const entityNames = page.locator('.entity-name');
    const count = await entityNames.count();
    console.log(`教师视图：找到 ${count} 个教师`);

    // 检查是否有课程卡片
    const courseCards = page.locator('.course-card');
    const cardCount = await courseCards.count();
    console.log(`教师视图：找到 ${cardCount} 个课程卡片`);

    // 截图保存
    await page.screenshot({ path: 'tests/manual/screenshots/teacher-view.png', fullPage: true });

    expect(count).toBeGreaterThan(0);
    expect(cardCount).toBeGreaterThan(0);
  });

  test('检查场地视图显示', async ({ page }) => {
    console.log('=== 检查场地视图 ===');

    // 点击课表管理菜单
    await page.click('text=课表管理');
    await page.waitForTimeout(1000);

    // 切换到场地视图
    await page.click('text=场地视图');
    await page.waitForTimeout(2000);

    // 检查是否有课表网格
    const scheduleTable = page.locator('.schedule-table');
    await expect(scheduleTable).toBeVisible();

    // 检查是否有场地名称
    const entityNames = page.locator('.entity-name');
    const count = await entityNames.count();
    console.log(`场地视图：找到 ${count} 个场地`);

    // 检查是否有课程卡片
    const courseCards = page.locator('.course-card');
    const cardCount = await courseCards.count();
    console.log(`场地视图：找到 ${cardCount} 个课程卡片`);

    // 截图保存
    await page.screenshot({ path: 'tests/manual/screenshots/venue-view.png', fullPage: true });

    // 场地视图可能没有数据（如果科目没有配置场地）
    console.log(`场地视图状态：${count > 0 ? '有数据' : '无数据（正常，科目可能未配置场地）'}`);
  });
});
