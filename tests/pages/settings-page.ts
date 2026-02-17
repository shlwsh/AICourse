/**
 * 系统设置页面对象模型
 */
import { Page, Locator } from '@playwright/test';

export class SettingsPage {
  readonly page: Page;
  readonly subjectConfigTab: Locator;
  readonly venueConfigTab: Locator;
  readonly teachingGroupConfigTab: Locator;
  readonly systemConfigTab: Locator;
  readonly saveButton: Locator;
  readonly resetButton: Locator;
  readonly addButton: Locator;

  constructor(page: Page) {
    this.page = page;

    // 标签页
    this.subjectConfigTab = page.getByRole('tab', { name: /科目配置/i });
    this.venueConfigTab = page.getByRole('tab', { name: /场地配置/i });
    this.teachingGroupConfigTab = page.getByRole('tab', { name: /教研组配置/i });
    this.systemConfigTab = page.getByRole('tab', { name: /系统配置/i });

    // 按钮
    this.saveButton = page.getByRole('button', { name: /保存/i }).first();
    this.resetButton = page.getByRole('button', { name: /重置/i }).first();
    this.addButton = page.getByRole('button', { name: /添加|新增/i }).first();
  }

  /**
   * 切换到科目配置标签页
   */
  async switchToSubjectConfig() {
    if (await this.subjectConfigTab.isVisible()) {
      await this.subjectConfigTab.click();
      await this.page.waitForTimeout(300);
    }
  }

  /**
   * 切换到场地配置标签页
   */
  async switchToVenueConfig() {
    if (await this.venueConfigTab.isVisible()) {
      await this.venueConfigTab.click();
      await this.page.waitForTimeout(300);
    }
  }

  /**
   * 切换到教研组配置标签页
   */
  async switchToTeachingGroupConfig() {
    if (await this.teachingGroupConfigTab.isVisible()) {
      await this.teachingGroupConfigTab.click();
      await this.page.waitForTimeout(300);
    }
  }

  /**
   * 切换到系统配置标签页
   */
  async switchToSystemConfig() {
    if (await this.systemConfigTab.isVisible()) {
      await this.systemConfigTab.click();
      await this.page.waitForTimeout(300);
    }
  }

  /**
   * 点击保存按钮
   */
  async clickSave() {
    if (await this.saveButton.isVisible()) {
      await this.saveButton.click();
    }
  }

  /**
   * 点击重置按钮
   */
  async clickReset() {
    if (await this.resetButton.isVisible()) {
      await this.resetButton.click();
    }
  }

  /**
   * 点击添加按钮
   */
  async clickAdd() {
    if (await this.addButton.isVisible()) {
      await this.addButton.click();
    }
  }

  /**
   * 检查保存按钮是否可见
   */
  async isSaveButtonVisible(): Promise<boolean> {
    return await this.saveButton.isVisible().catch(() => false);
  }

  /**
   * 检查添加按钮是否可见
   */
  async isAddButtonVisible(): Promise<boolean> {
    return await this.addButton.isVisible().catch(() => false);
  }
}
