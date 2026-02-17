/**
 * 前端导航功能测试
 * 测试所有页面的加载和切换性能
 */
import { test, expect } from '@playwright/test';
import { NavigationPage } from '../pages/navigation-page';

test.describe('前端导航功能测试', () => {
  let navigationPage: NavigationPage;

  test.beforeEach(async ({ page }) => {
    // 导航到应用首页
    await page.goto('http://localhost:5173');
    navigationPage = new NavigationPage(page);

    // 等待页面加载完成
    await page.waitForLoadState('networkidle');
  });

  test('01 - 应用首页加载', async ({ page }) => {
    // 验证页面标题
    await expect(page).toHaveTitle(/排课系统/);

    // 验证侧边栏可见
    await expect(navigationPage.sidebar).toBeVisible();

    // 验证首页内容加载
    await expect(page.locator('.app-main')).toBeVisible();
  });

  test('02 - 侧边栏折叠功能', async () => {
    // 验证侧边栏初始状态（展开）
    const initialCollapsed = await navigationPage.isSidebarCollapsed();
    expect(initialCollapsed).toBe(false);

    // 折叠侧边栏
    await navigationPage.toggleSidebar();
    await navigationPage.page.waitForTimeout(500); // 等待动画完成

    // 验证侧边栏已折叠
    const collapsed = await navigationPage.isSidebarCollapsed();
    expect(collapsed).toBe(true);

    // 展开侧边栏
    await navigationPage.toggleSidebar();
    await navigationPage.page.waitForTimeout(500);

    // 验证侧边栏已展开
    const expanded = await navigationPage.isSidebarCollapsed();
    expect(expanded).toBe(false);
  });

  test('03 - 导航到课表查看页面', async ({ page }) => {
    const startTime = Date.now();

    await navigationPage.goToScheduleView();

    const loadTime = Date.now() - startTime;
    console.log(`课表查看页面加载时间: ${loadTime}ms`);

    // 验证 URL
    expect(page.url()).toContain('/schedule');

    // 验证页面加载时间（首次加载可能较慢，允许 3 秒）
    expect(loadTime).toBeLessThan(3000);

    // 验证页面内容
    await expect(page.locator('.app-main')).toBeVisible();
  });

  test('04 - 导航到自动排课页面', async ({ page }) => {
    const startTime = Date.now();

    await navigationPage.goToScheduleGenerate();

    const loadTime = Date.now() - startTime;
    console.log(`自动排课页面加载时间: ${loadTime}ms`);

    expect(page.url()).toContain('/schedule/generate');
    expect(loadTime).toBeLessThan(2000);
    await expect(page.locator('.app-main')).toBeVisible();
  });

  test('05 - 导航到手动调课页面', async ({ page }) => {
    const startTime = Date.now();

    await navigationPage.goToScheduleManual();

    const loadTime = Date.now() - startTime;
    console.log(`手动调课页面加载时间: ${loadTime}ms`);

    expect(page.url()).toContain('/schedule/manual');
    expect(loadTime).toBeLessThan(2000);
    await expect(page.locator('.app-main')).toBeVisible();
  });

  test('06 - 导航到教师列表页面', async ({ page }) => {
    const startTime = Date.now();

    await navigationPage.goToTeacherList();

    const loadTime = Date.now() - startTime;
    console.log(`教师列表页面加载时间: ${loadTime}ms`);

    expect(page.url()).toContain('/teacher');
    expect(loadTime).toBeLessThan(2000);
    await expect(page.locator('.app-main')).toBeVisible();
  });

  test('07 - 导航到教师偏好设置页面', async ({ page }) => {
    const startTime = Date.now();

    await navigationPage.goToTeacherPreference();

    const loadTime = Date.now() - startTime;
    console.log(`教师偏好设置页面加载时间: ${loadTime}ms`);

    expect(page.url()).toContain('/teacher/preference');
    expect(loadTime).toBeLessThan(2000);
    await expect(page.locator('.app-main')).toBeVisible();
  });

  test('08 - 导航到工作量统计页面', async ({ page }) => {
    const startTime = Date.now();

    await navigationPage.goToTeacherWorkload();

    const loadTime = Date.now() - startTime;
    console.log(`工作量统计页面加载时间: ${loadTime}ms`);

    expect(page.url()).toContain('/teacher/workload');
    expect(loadTime).toBeLessThan(2000);
    await expect(page.locator('.app-main')).toBeVisible();
  });

  test('09 - 导航到导入导出页面', async ({ page }) => {
    const startTime = Date.now();

    await navigationPage.goToImportExport();

    const loadTime = Date.now() - startTime;
    console.log(`导入导出页面加载时间: ${loadTime}ms`);

    expect(page.url()).toContain('/import-export');
    expect(loadTime).toBeLessThan(2000);
    await expect(page.locator('.app-main')).toBeVisible();
  });

  test('10 - 导航到统计分析页面', async ({ page }) => {
    const startTime = Date.now();

    await navigationPage.goToStatistics();

    const loadTime = Date.now() - startTime;
    console.log(`统计分析页面加载时间: ${loadTime}ms`);

    expect(page.url()).toContain('/statistics');
    expect(loadTime).toBeLessThan(2000);
    await expect(page.locator('.app-main')).toBeVisible();
  });

  test('11 - 导航到系统设置页面', async ({ page }) => {
    const startTime = Date.now();

    await navigationPage.goToSettings();

    const loadTime = Date.now() - startTime;
    console.log(`系统设置页面加载时间: ${loadTime}ms`);

    expect(page.url()).toContain('/settings');
    expect(loadTime).toBeLessThan(2000);
    await expect(page.locator('.app-main')).toBeVisible();
  });

  test('12 - 导航到帮助中心页面', async ({ page }) => {
    const startTime = Date.now();

    await navigationPage.goToHelp();

    const loadTime = Date.now() - startTime;
    console.log(`帮助中心页面加载时间: ${loadTime}ms`);

    expect(page.url()).toContain('/help');
    expect(loadTime).toBeLessThan(2000);
    await expect(page.locator('.app-main')).toBeVisible();
  });

  test('13 - 快速切换多个页面', async ({ page }) => {
    // 测试快速切换页面的性能
    const pages = [
      { name: '首页', action: () => navigationPage.goToHome(), url: '/' },
      { name: '课表管理', action: () => navigationPage.goToScheduleView(), url: '/schedule' },
      { name: '教师管理', action: () => navigationPage.goToTeacherList(), url: '/teacher' },
      { name: '导入导出', action: () => navigationPage.goToImportExport(), url: '/import-export' },
      { name: '统计分析', action: () => navigationPage.goToStatistics(), url: '/statistics' },
    ];

    for (const pageInfo of pages) {
      const startTime = Date.now();
      await pageInfo.action();
      const loadTime = Date.now() - startTime;

      console.log(`${pageInfo.name}页面切换时间: ${loadTime}ms`);

      // 验证 URL
      expect(page.url()).toContain(pageInfo.url);

      // 验证切换时间（应该小于 1 秒）
      expect(loadTime).toBeLessThan(1000);

      // 验证页面内容可见
      await expect(page.locator('.app-main')).toBeVisible();
    }
  });

  test('14 - 返回首页功能', async ({ page }) => {
    // 先导航到其他页面
    await navigationPage.goToSettings();
    expect(page.url()).toContain('/settings');

    // 返回首页
    await navigationPage.goToHome();
    expect(page.url()).toBe('http://localhost:5173/');

    // 验证首页内容
    await expect(page.locator('.app-main')).toBeVisible();
  });
});
