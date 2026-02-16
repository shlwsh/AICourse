/**
 * 基础页面对象类
 *
 * 所有页面对象的基类，提供通用的页面操作方法
 *
 * 功能特性：
 * - 页面导航
 * - 元素查找
 * - 等待操作
 * - 日志记录
 * - 错误处理
 */

import type { Page, Locator } from '@playwright/test';
import { createTestLogger, TestLogger } from '../helpers/test-logger';

/**
 * 基础页面对象类
 */
export class BasePage {
  protected page: Page;
  protected logger: TestLogger;
  protected baseUrl: string;

  constructor(page: Page, pageName: string = 'BasePage') {
    this.page = page;
    this.logger = createTestLogger(pageName);
    this.baseUrl = process.env.TEST_BASE_URL || 'http://localhost:1420';
  }

  /**
   * 导航到指定路径
   *
   * @param path 路径（相对于 baseUrl）
   */
  async goto(path: string = '/'): Promise<void> {
    this.logger.info(`导航到页面: ${path}`);

    const url = path.startsWith('http') ? path : `${this.baseUrl}${path}`;

    await this.page.goto(url);
    await this.page.waitForLoadState('networkidle');

    this.logger.debug(`页面加载完成: ${url}`);
  }

  /**
   * 获取当前页面 URL
   */
  getUrl(): string {
    return this.page.url();
  }

  /**
   * 获取页面标题
   */
  async getTitle(): Promise<string> {
    return await this.page.title();
  }

  /**
   * 等待页面加载完成
   */
  async waitForLoad(): Promise<void> {
    await this.page.waitForLoadState('networkidle');
  }

  /**
   * 等待元素可见
   *
   * @param selector 元素选择器
   * @param timeout 超时时间（毫秒）
   */
  async waitForVisible(selector: string, timeout: number = 10000): Promise<void> {
    await this.page.locator(selector).waitFor({
      state: 'visible',
      timeout,
    });
  }

  /**
   * 等待元素隐藏
   *
   * @param selector 元素选择器
   * @param timeout 超时时间（毫秒）
   */
  async waitForHidden(selector: string, timeout: number = 10000): Promise<void> {
    await this.page.locator(selector).waitFor({
      state: 'hidden',
      timeout,
    });
  }

  /**
   * 点击元素
   *
   * @param selector 元素选择器
   */
  async click(selector: string): Promise<void> {
    this.logger.debug(`点击元素: ${selector}`);
    await this.page.locator(selector).click();
  }

  /**
   * 填写输入框
   *
   * @param selector 元素选择器
   * @param value 输入值
   */
  async fill(selector: string, value: string): Promise<void> {
    this.logger.debug(`填写输入框: ${selector} = ${value}`);
    await this.page.locator(selector).fill(value);
  }

  /**
   * 选择下拉框选项
   *
   * @param selector 元素选择器
   * @param value 选项值
   */
  async select(selector: string, value: string): Promise<void> {
    this.logger.debug(`选择下拉框: ${selector} = ${value}`);
    await this.page.locator(selector).selectOption(value);
  }

  /**
   * 获取元素文本内容
   *
   * @param selector 元素选择器
   */
  async getText(selector: string): Promise<string> {
    const text = await this.page.locator(selector).textContent();
    return text?.trim() || '';
  }

  /**
   * 获取元素属性值
   *
   * @param selector 元素选择器
   * @param attribute 属性名
   */
  async getAttribute(selector: string, attribute: string): Promise<string | null> {
    return await this.page.locator(selector).getAttribute(attribute);
  }

  /**
   * 检查元素是否可见
   *
   * @param selector 元素选择器
   */
  async isVisible(selector: string): Promise<boolean> {
    return await this.page.locator(selector).isVisible();
  }

  /**
   * 检查元素是否启用
   *
   * @param selector 元素选择器
   */
  async isEnabled(selector: string): Promise<boolean> {
    return await this.page.locator(selector).isEnabled();
  }

  /**
   * 获取元素定位器
   *
   * @param selector 元素选择器
   */
  locator(selector: string): Locator {
    return this.page.locator(selector);
  }

  /**
   * 等待加载指示器消失
   */
  async waitForLoadingComplete(): Promise<void> {
    this.logger.debug('等待加载完成');

    const loading = this.page.locator('.el-loading-mask');

    try {
      // 先等待加载指示器出现
      await loading.waitFor({ state: 'visible', timeout: 1000 });
    } catch {
      // 如果加载指示器没有出现，说明加载已经完成
      return;
    }

    // 等待加载指示器消失
    await loading.waitFor({ state: 'hidden', timeout: 30000 });

    this.logger.debug('加载完成');
  }

  /**
   * 等待成功消息出现
   */
  async waitForSuccessMessage(): Promise<void> {
    this.logger.debug('等待成功消息');
    await this.page.locator('.el-message--success').waitFor({
      state: 'visible',
      timeout: 5000,
    });
  }

  /**
   * 等待错误消息出现
   */
  async waitForErrorMessage(): Promise<void> {
    this.logger.debug('等待错误消息');
    await this.page.locator('.el-message--error').waitFor({
      state: 'visible',
      timeout: 5000,
    });
  }

  /**
   * 获取成功消息文本
   */
  async getSuccessMessage(): Promise<string> {
    const message = this.page.locator('.el-message--success');
    await message.waitFor({ state: 'visible', timeout: 5000 });
    return await message.textContent() || '';
  }

  /**
   * 获取错误消息文本
   */
  async getErrorMessage(): Promise<string> {
    const message = this.page.locator('.el-message--error');
    await message.waitFor({ state: 'visible', timeout: 5000 });
    return await message.textContent() || '';
  }

  /**
   * 截图
   *
   * @param name 截图文件名
   */
  async screenshot(name: string): Promise<void> {
    const path = `tests/reports/screenshots/${name}.png`;
    await this.page.screenshot({ path, fullPage: true });
    this.logger.info(`截图已保存: ${path}`);
  }

  /**
   * 等待指定时间
   *
   * @param ms 等待时间（毫秒）
   */
  async wait(ms: number): Promise<void> {
    await this.page.waitForTimeout(ms);
  }
}
