/**
 * 首页页面对象模型
 */
import { Page, Locator } from '@playwright/test';

export class HomePage {
  readonly page: Page;
  readonly pageTitle: Locator;
  readonly welcomeMessage: Locator;
  readonly quickActions: Locator;

  constructor(page: Page) {
    this.page = page;
    this.pageTitle = page.locator('h1, h2').first();
    this.welcomeMessage = page.locator('.welcome-message, .page-description');
    this.quickActions = page.locator('.quick-actions, .action-buttons');
  }

  /**
   * 检查页面是否加载完成
   */
  async isLoaded(): Promise<boolean> {
    try {
      await this.page.waitForLoadState('networkidle', { timeout: 5000 });
      return true;
    } catch {
      return false;
    }
  }

  /**
   * 获取页面标题文本
   */
  async getTitle(): Promise<string> {
    return await this.pageTitle.textContent() || '';
  }
}
