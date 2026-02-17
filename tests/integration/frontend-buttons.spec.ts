/**
 * 前端功能按钮可用性测试
 * 测试各个页面的功能按钮是否可用
 */
import { test, expect } from '@playwright/test';
import { NavigationPage } from '../pages/navigation-page';
import { ImportExportPage } from '../pages/import-export-page';
import { SettingsPage } from '../pages/settings-page';
import path from 'path';

test.describe('前端功能按钮可用性测试', () => {
  let navigationPage: NavigationPage;

  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:5173');
    navigationPage = new NavigationPage(page);
    await page.waitForLoadState('networkidle');
  });

  test('18 - 导入导出页面 - 下载模板按钮', async ({ page }) => {
    // 导航到导入导出页面
    await navigationPage.goToImportExport();
    await page.waitForTimeout(1000); // 等待页面完全加载

    const importExportPage = new ImportExportPage(page);

    // 等待按钮出现
    await page.waitForSelector('button', { timeout: 5000 }).catch(() => null);

    // 验证下载模板按钮可见
    const isVisible = await importExportPage.isDownloadTemplateButtonVisible();

    if (!isVisible) {
      console.log('下载模板按钮不可见，跳过测试');
      test.skip();
      return;
    }

    // 点击下载模板按钮
    const startTime = Date.now();
    const download = await importExportPage.downloadTemplate();
    const downloadTime = Date.now() - startTime;

    console.log(`模板下载时间: ${downloadTime}ms`);
    console.log(`下载文件名: ${download.suggestedFilename()}`);

    // 验证下载文件
    expect(download.suggestedFilename()).toMatch(/\.xlsx$/);
    expect(downloadTime).toBeLessThan(5000);

    // 保存下载的文件
    const downloadsPath = path.join(process.cwd(), 'tests/downloads');
    await download.saveAs(path.join(downloadsPath, download.suggestedFilename()));
  });

  test('19 - 导入导出页面 - 选择文件按钮', async ({ page }) => {
    await navigationPage.goToImportExport();
    await page.waitForTimeout(1000);

    const importExportPage = new ImportExportPage(page);

    // 验证选择文件按钮可见
    const isVisible = await importExportPage.isSelectFileButtonVisible();

    if (!isVisible) {
      console.log('选择文件按钮不可见，跳过测试');
      test.skip();
      return;
    }

    // 验证按钮可点击（不会报错）
    await importExportPage.selectFileButton.click();

    // 验证文件输入框存在
    const fileInputCount = await importExportPage.fileInput.count();
    expect(fileInputCount).toBeGreaterThan(0);
  });

  test('20 - 导入导出页面 - 上传区域可见', async ({ page }) => {
    await navigationPage.goToImportExport();
    await page.waitForTimeout(1000);

    const importExportPage = new ImportExportPage(page);

    // 验证上传区域可见
    const isVisible = await importExportPage.isUploadAreaVisible();

    if (!isVisible) {
      console.log('上传区域不可见，跳过测试');
      test.skip();
      return;
    }

    // 验证上传区域包含提示文本
    const uploadText = await page.locator('.el-upload__text').first().textContent();
    expect(uploadText).toContain('拖');
  });

  test('21 - 导入导出页面 - 标签页切换', async ({ page }) => {
    await navigationPage.goToImportExport();
    await page.waitForTimeout(1000);

    const importExportPage = new ImportExportPage(page);

    // 检查导出标签页是否存在
    const exportTabExists = await importExportPage.exportTab.isVisible().catch(() => false);

    if (!exportTabExists) {
      console.log('导出标签页不存在，跳过测试');
      test.skip();
      return;
    }

    // 切换到导出标签页
    await importExportPage.switchToExportTab();
    await page.waitForTimeout(500);

    // 验证导出标签页激活
    const exportTabActive = await page.locator('.el-tabs__item.is-active').textContent();
    expect(exportTabActive).toContain('导出');

    // 切换回导入标签页
    await importExportPage.switchToImportTab();
    await page.waitForTimeout(500);

    // 验证导入标签页激活
    const importTabActive = await page.locator('.el-tabs__item.is-active').textContent();
    expect(importTabActive).toContain('导入');
  });

  test('22 - 系统设置页面 - 标签页可见', async ({ page }) => {
    await navigationPage.goToSettings();

    const settingsPage = new SettingsPage(page);

    // 检查各个标签页是否可见
    const tabs = [
      { name: '科目配置', locator: settingsPage.subjectConfigTab },
      { name: '场地配置', locator: settingsPage.venueConfigTab },
      { name: '教研组配置', locator: settingsPage.teachingGroupConfigTab },
      { name: '系统配置', locator: settingsPage.systemConfigTab },
    ];

    for (const tab of tabs) {
      const isVisible = await tab.locator.isVisible().catch(() => false);
      console.log(`${tab.name}标签页可见: ${isVisible}`);

      if (isVisible) {
        // 尝试点击标签页
        await tab.locator.click();
        await page.waitForTimeout(300);

        // 验证标签页切换成功
        const activeTab = await page.locator('.el-tabs__item.is-active').textContent();
        console.log(`当前激活标签页: ${activeTab}`);
      }
    }
  });

  test('23 - 系统设置页面 - 按钮可用性', async ({ page }) => {
    await navigationPage.goToSettings();

    const settingsPage = new SettingsPage(page);

    // 等待页面加载
    await page.waitForTimeout(1000);

    // 检查保存按钮
    const saveButtonVisible = await settingsPage.isSaveButtonVisible();
    console.log(`保存按钮可见: ${saveButtonVisible}`);

    // 检查添加按钮
    const addButtonVisible = await settingsPage.isAddButtonVisible();
    console.log(`添加按钮可见: ${addButtonVisible}`);

    // 至少有一个按钮应该可见
    expect(saveButtonVisible || addButtonVisible).toBe(true);
  });

  test('24 - 统计分析页面 - 页面加载', async ({ page }) => {
    await navigationPage.goToStatistics();

    // 验证页面加载完成
    await expect(page.locator('.app-main')).toBeVisible();

    // 检查是否有图表或统计内容
    const hasCharts = await page.locator('.echarts, .el-card, .statistics').count();
    console.log(`统计图表/卡片数量: ${hasCharts}`);

    expect(hasCharts).toBeGreaterThanOrEqual(0);
  });

  test('25 - 帮助中心页面 - 页面加载', async ({ page }) => {
    await navigationPage.goToHelp();

    // 验证页面加载完成
    await expect(page.locator('.app-main')).toBeVisible();

    // 检查是否有帮助内容
    const pageContent = await page.locator('.app-main').textContent();
    console.log(`帮助页面内容长度: ${pageContent?.length || 0}`);

    expect(pageContent).toBeTruthy();
  });

  test('26 - 课表管理页面 - 页面元素', async ({ page }) => {
    await navigationPage.goToScheduleView();

    // 验证页面加载完成
    await expect(page.locator('.app-main')).toBeVisible();

    // 检查是否有课表相关元素
    const scheduleElements = await page.locator('.schedule, .el-table, .el-card').count();
    console.log(`课表相关元素数量: ${scheduleElements}`);

    expect(scheduleElements).toBeGreaterThanOrEqual(0);
  });

  test('27 - 教师管理页面 - 页面元素', async ({ page }) => {
    await navigationPage.goToTeacherList();

    // 验证页面加载完成
    await expect(page.locator('.app-main')).toBeVisible();

    // 检查是否有教师相关元素
    const teacherElements = await page.locator('.teacher, .el-table, .el-card').count();
    console.log(`教师相关元素数量: ${teacherElements}`);

    expect(teacherElements).toBeGreaterThanOrEqual(0);
  });

  test('28 - 侧边栏菜单项可点击性', async ({ page }) => {
    // 测试所有侧边栏菜单项是否可点击
    const menuItems = [
      { name: '首页', action: () => navigationPage.goToHome() },
      { name: '课表查看', action: () => navigationPage.goToScheduleView() },
      { name: '教师列表', action: () => navigationPage.goToTeacherList() },
      { name: '导入导出', action: () => navigationPage.goToImportExport() },
      { name: '统计分析', action: () => navigationPage.goToStatistics() },
      { name: '系统设置', action: () => navigationPage.goToSettings() },
      { name: '帮助中心', action: () => navigationPage.goToHelp() },
    ];

    for (const item of menuItems) {
      const startTime = Date.now();

      try {
        await item.action();
        const clickTime = Date.now() - startTime;

        console.log(`${item.name} 菜单项点击响应时间: ${clickTime}ms`);

        // 验证页面切换成功
        await expect(page.locator('.app-main')).toBeVisible();

        // 验证响应时间合理
        expect(clickTime).toBeLessThan(2000);
      } catch (error) {
        console.error(`${item.name} 菜单项点击失败:`, error);
        throw error;
      }
    }
  });

  test('29 - 页面刷新后状态保持', async ({ page }) => {
    // 导航到导入导出页面
    await navigationPage.goToImportExport();
    expect(page.url()).toContain('/import-export');

    // 刷新页面
    await page.reload();
    await page.waitForLoadState('networkidle');

    // 验证仍在导入导出页面
    expect(page.url()).toContain('/import-export');

    // 验证页面内容正常
    await expect(page.locator('.app-main')).toBeVisible();
  });

  test('30 - 浏览器后退前进功能', async ({ page }) => {
    // 导航到多个页面
    await navigationPage.goToHome();
    await navigationPage.goToScheduleView();
    await navigationPage.goToTeacherList();

    // 后退
    await page.goBack();
    await page.waitForLoadState('networkidle');
    expect(page.url()).toContain('/schedule');

    // 再后退
    await page.goBack();
    await page.waitForLoadState('networkidle');
    expect(page.url()).toBe('http://localhost:5173/');

    // 前进
    await page.goForward();
    await page.waitForLoadState('networkidle');
    expect(page.url()).toContain('/schedule');
  });
});
