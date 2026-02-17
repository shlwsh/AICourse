/**
 * 导航页面对象模型
 * 用于测试侧边栏菜单导航功能
 */
import { Page, Locator } from '@playwright/test';

export class NavigationPage {
  readonly page: Page;
  readonly sidebar: Locator;
  readonly homeMenuItem: Locator;
  readonly scheduleSubMenu: Locator;
  readonly scheduleViewItem: Locator;
  readonly scheduleGenerateItem: Locator;
  readonly scheduleManualItem: Locator;
  readonly teacherSubMenu: Locator;
  readonly teacherListItem: Locator;
  readonly teacherPreferenceItem: Locator;
  readonly teacherWorkloadItem: Locator;
  readonly importExportMenuItem: Locator;
  readonly statisticsMenuItem: Locator;
  readonly settingsMenuItem: Locator;
  readonly helpMenuItem: Locator;
  readonly collapseButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.sidebar = page.locator('.app-sidebar');
    this.collapseButton = page.locator('.collapse-button');

    // 使用侧边栏作为作用域，避免与 header 中的菜单项冲突
    const sidebarMenu = page.locator('.app-sidebar .sidebar-menu');

    this.homeMenuItem = sidebarMenu.locator('.el-menu-item', { hasText: '首页' });
    this.scheduleSubMenu = sidebarMenu.locator('.el-sub-menu', { hasText: '课表管理' });
    this.scheduleViewItem = sidebarMenu.locator('.el-menu-item', { hasText: '查看课表' });
    this.scheduleGenerateItem = sidebarMenu.locator('.el-menu-item', { hasText: '自动排课' });
    this.scheduleManualItem = sidebarMenu.locator('.el-menu-item', { hasText: '手动调课' });

    this.teacherSubMenu = sidebarMenu.locator('.el-sub-menu', { hasText: '教师管理' });
    this.teacherListItem = sidebarMenu.locator('.el-menu-item', { hasText: '教师列表' });
    this.teacherPreferenceItem = sidebarMenu.locator('.el-menu-item', { hasText: '偏好设置' });
    this.teacherWorkloadItem = sidebarMenu.locator('.el-menu-item', { hasText: '工作量统计' });

    this.importExportMenuItem = sidebarMenu.locator('.el-menu-item', { hasText: '导入导出' });
    this.statisticsMenuItem = sidebarMenu.locator('.el-menu-item', { hasText: '统计分析' });
    this.settingsMenuItem = sidebarMenu.locator('.el-menu-item', { hasText: '系统设置' });
    this.helpMenuItem = sidebarMenu.locator('.el-menu-item', { hasText: '帮助中心' });
  }

  /**
   * 导航到首页
   */
  async goToHome() {
    await this.homeMenuItem.click();
    await this.page.waitForURL('/');
  }

  /**
   * 导航到课表查看页面
   */
  async goToScheduleView() {
    await this.scheduleSubMenu.click();
    await this.scheduleViewItem.click();
    await this.page.waitForURL('/schedule');
  }

  /**
   * 导航到自动排课页面
   */
  async goToScheduleGenerate() {
    await this.scheduleSubMenu.click();
    await this.scheduleGenerateItem.click();
    await this.page.waitForURL('/schedule/generate');
  }

  /**
   * 导航到手动调课页面
   */
  async goToScheduleManual() {
    await this.scheduleSubMenu.click();
    await this.scheduleManualItem.click();
    await this.page.waitForURL('/schedule/manual');
  }

  /**
   * 导航到教师列表页面
   */
  async goToTeacherList() {
    await this.teacherSubMenu.click();
    await this.teacherListItem.click();
    await this.page.waitForURL('/teacher');
  }

  /**
   * 导航到教师偏好设置页面
   */
  async goToTeacherPreference() {
    await this.teacherSubMenu.click();
    await this.teacherPreferenceItem.click();
    await this.page.waitForURL('/teacher/preference');
  }

  /**
   * 导航到工作量统计页面
   */
  async goToTeacherWorkload() {
    await this.teacherSubMenu.click();
    await this.teacherWorkloadItem.click();
    await this.page.waitForURL('/teacher/workload');
  }

  /**
   * 导航到导入导出页面
   */
  async goToImportExport() {
    await this.importExportMenuItem.click();
    await this.page.waitForURL('/import-export');
  }

  /**
   * 导航到统计分析页面
   */
  async goToStatistics() {
    await this.statisticsMenuItem.click();
    await this.page.waitForURL('/statistics');
  }

  /**
   * 导航到系统设置页面
   */
  async goToSettings() {
    await this.settingsMenuItem.click();
    await this.page.waitForURL('/settings');
  }

  /**
   * 导航到帮助中心页面
   */
  async goToHelp() {
    await this.helpMenuItem.click();
    await this.page.waitForURL('/help');
  }

  /**
   * 切换侧边栏折叠状态
   */
  async toggleSidebar() {
    await this.collapseButton.click();
  }

  /**
   * 检查侧边栏是否可见
   */
  async isSidebarVisible(): Promise<boolean> {
    return await this.sidebar.isVisible();
  }

  /**
   * 检查侧边栏是否折叠
   */
  async isSidebarCollapsed(): Promise<boolean> {
    const width = await this.sidebar.evaluate((el) => {
      return window.getComputedStyle(el).width;
    });
    return width === '64px';
  }
}
