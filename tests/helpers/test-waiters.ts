/**
 * 测试等待辅助工具
 *
 * 提供各种等待条件的辅助函数
 *
 * 功能特性：
 * - 等待元素状态变化
 * - 等待网络请求完成
 * - 等待动画完成
 * - 等待数据加载
 * - 自定义等待条件
 */

import type { Page, Locator } from '@playwright/test';

/**
 * 等待选项
 */
export interface WaitOptions {
  /**
   * 超时时间（毫秒）
   */
  timeout?: number;

  /**
   * 轮询间隔（毫秒）
   */
  interval?: number;
}

/**
 * 默认等待选项
 */
const DEFAULT_WAIT_OPTIONS: Required<WaitOptions> = {
  timeout: 30000,
  interval: 100,
};

/**
 * 等待元素可见
 *
 * @param element 元素定位器
 * @param options 等待选项
 */
export async function waitForVisible(
  element: Locator,
  options: WaitOptions = {},
): Promise<void> {
  const { timeout } = { ...DEFAULT_WAIT_OPTIONS, ...options };
  await element.waitFor({ state: 'visible', timeout });
}

/**
 * 等待元素隐藏
 *
 * @param element 元素定位器
 * @param options 等待选项
 */
export async function waitForHidden(
  element: Locator,
  options: WaitOptions = {},
): Promise<void> {
  const { timeout } = { ...DEFAULT_WAIT_OPTIONS, ...options };
  await element.waitFor({ state: 'hidden', timeout });
}

/**
 * 等待元素可点击
 *
 * @param element 元素定位器
 * @param options 等待选项
 */
export async function waitForClickable(
  element: Locator,
  options: WaitOptions = {},
): Promise<void> {
  const { timeout } = { ...DEFAULT_WAIT_OPTIONS, ...options };

  await element.waitFor({ state: 'visible', timeout });

  // 等待元素启用（非禁用状态）
  await element.evaluate(
    (el, timeoutMs) => {
      return new Promise<void>((resolve, reject) => {
        const startTime = Date.now();

        const checkEnabled = () => {
          if (!(el as HTMLButtonElement).disabled) {
            resolve();
          } else if (Date.now() - startTime > timeoutMs) {
            reject(new Error('等待元素可点击超时'));
          } else {
            setTimeout(checkEnabled, 100);
          }
        };

        checkEnabled();
      });
    },
    timeout,
  );
}

/**
 * 等待加载指示器消失
 *
 * @param page 页面对象
 * @param options 等待选项
 */
export async function waitForLoadingComplete(
  page: Page,
  options: WaitOptions = {},
): Promise<void> {
  const { timeout } = { ...DEFAULT_WAIT_OPTIONS, ...options };

  const loading = page.locator('.el-loading-mask');

  try {
    // 先等待加载指示器出现（可能已经存在）
    await loading.waitFor({ state: 'visible', timeout: 1000 });
  } catch {
    // 如果加载指示器没有出现，说明加载已经完成
    return;
  }

  // 等待加载指示器消失
  await loading.waitFor({ state: 'hidden', timeout });
}

/**
 * 等待网络空闲
 *
 * @param page 页面对象
 * @param options 等待选项
 */
export async function waitForNetworkIdle(
  page: Page,
  options: WaitOptions = {},
): Promise<void> {
  const { timeout } = { ...DEFAULT_WAIT_OPTIONS, ...options };
  await page.waitForLoadState('networkidle', { timeout });
}

/**
 * 等待特定的网络请求完成
 *
 * @param page 页面对象
 * @param urlPattern URL 模式（字符串或正则表达式）
 * @param options 等待选项
 */
export async function waitForRequest(
  page: Page,
  urlPattern: string | RegExp,
  options: WaitOptions = {},
): Promise<void> {
  const { timeout } = { ...DEFAULT_WAIT_OPTIONS, ...options };

  await page.waitForRequest(urlPattern, { timeout });
}

/**
 * 等待特定的网络响应
 *
 * @param page 页面对象
 * @param urlPattern URL 模式（字符串或正则表达式）
 * @param options 等待选项
 */
export async function waitForResponse(
  page: Page,
  urlPattern: string | RegExp,
  options: WaitOptions = {},
): Promise<void> {
  const { timeout } = { ...DEFAULT_WAIT_OPTIONS, ...options };

  await page.waitForResponse(urlPattern, { timeout });
}

/**
 * 等待元素文本内容变化
 *
 * @param element 元素定位器
 * @param expectedText 期望的文本内容
 * @param options 等待选项
 */
export async function waitForTextContent(
  element: Locator,
  expectedText: string | RegExp,
  options: WaitOptions = {},
): Promise<void> {
  const { timeout, interval } = { ...DEFAULT_WAIT_OPTIONS, ...options };

  const startTime = Date.now();

  while (Date.now() - startTime < timeout) {
    const text = await element.textContent();

    if (text) {
      if (typeof expectedText === 'string') {
        if (text.includes(expectedText)) {
          return;
        }
      } else {
        if (expectedText.test(text)) {
          return;
        }
      }
    }

    await new Promise(resolve => setTimeout(resolve, interval));
  }

  throw new Error(`等待文本内容变化超时: ${expectedText}`);
}

/**
 * 等待元素数量达到指定值
 *
 * @param locator 元素定位器
 * @param count 期望的元素数量
 * @param options 等待选项
 */
export async function waitForElementCount(
  locator: Locator,
  count: number,
  options: WaitOptions = {},
): Promise<void> {
  const { timeout, interval } = { ...DEFAULT_WAIT_OPTIONS, ...options };

  const startTime = Date.now();

  while (Date.now() - startTime < timeout) {
    const actualCount = await locator.count();

    if (actualCount === count) {
      return;
    }

    await new Promise(resolve => setTimeout(resolve, interval));
  }

  throw new Error(`等待元素数量达到 ${count} 超时`);
}

/**
 * 等待条件满足
 *
 * @param condition 条件函数（返回 true 表示条件满足）
 * @param options 等待选项
 */
export async function waitForCondition(
  condition: () => Promise<boolean> | boolean,
  options: WaitOptions = {},
): Promise<void> {
  const { timeout, interval } = { ...DEFAULT_WAIT_OPTIONS, ...options };

  const startTime = Date.now();

  while (Date.now() - startTime < timeout) {
    const result = await condition();

    if (result) {
      return;
    }

    await new Promise(resolve => setTimeout(resolve, interval));
  }

  throw new Error('等待条件满足超时');
}

/**
 * 等待动画完成
 *
 * @param element 元素定位器
 * @param options 等待选项
 */
export async function waitForAnimationEnd(
  element: Locator,
  options: WaitOptions = {},
): Promise<void> {
  const { timeout } = { ...DEFAULT_WAIT_OPTIONS, ...options };

  await element.evaluate(
    (el, timeoutMs) => {
      return new Promise<void>((resolve, reject) => {
        const timeoutId = setTimeout(() => {
          reject(new Error('等待动画完成超时'));
        }, timeoutMs);

        const onAnimationEnd = () => {
          clearTimeout(timeoutId);
          el.removeEventListener('animationend', onAnimationEnd);
          el.removeEventListener('transitionend', onAnimationEnd);
          resolve();
        };

        // 监听动画和过渡结束事件
        el.addEventListener('animationend', onAnimationEnd);
        el.addEventListener('transitionend', onAnimationEnd);

        // 如果没有动画，立即解决
        const hasAnimation = window.getComputedStyle(el).animationName !== 'none';
        const hasTransition = window.getComputedStyle(el).transitionDuration !== '0s';

        if (!hasAnimation && !hasTransition) {
          clearTimeout(timeoutId);
          resolve();
        }
      });
    },
    timeout,
  );
}

/**
 * 等待表格数据加载完成
 *
 * @param table 表格定位器
 * @param options 等待选项
 */
export async function waitForTableDataLoaded(
  table: Locator,
  options: WaitOptions = {},
): Promise<void> {
  const { timeout } = { ...DEFAULT_WAIT_OPTIONS, ...options };

  // 等待加载指示器消失
  const loading = table.locator('.el-table__loading');
  try {
    await loading.waitFor({ state: 'hidden', timeout: 5000 });
  } catch {
    // 如果没有加载指示器，继续
  }

  // 等待表格行出现或空状态出现
  const rows = table.locator('tbody tr');
  const emptyText = table.locator('.el-table__empty-text');

  await Promise.race([
    rows.first().waitFor({ state: 'visible', timeout }),
    emptyText.waitFor({ state: 'visible', timeout }),
  ]);
}

/**
 * 等待对话框打开
 *
 * @param page 页面对象
 * @param options 等待选项
 */
export async function waitForDialogOpen(
  page: Page,
  options: WaitOptions = {},
): Promise<void> {
  const { timeout } = { ...DEFAULT_WAIT_OPTIONS, ...options };

  const dialog = page.locator('.el-dialog');
  await dialog.waitFor({ state: 'visible', timeout });
}

/**
 * 等待对话框关闭
 *
 * @param page 页面对象
 * @param options 等待选项
 */
export async function waitForDialogClose(
  page: Page,
  options: WaitOptions = {},
): Promise<void> {
  const { timeout } = { ...DEFAULT_WAIT_OPTIONS, ...options };

  const dialog = page.locator('.el-dialog');
  await dialog.waitFor({ state: 'hidden', timeout });
}

/**
 * 等待消息提示消失
 *
 * @param page 页面对象
 * @param options 等待选项
 */
export async function waitForMessageDismiss(
  page: Page,
  options: WaitOptions = {},
): Promise<void> {
  const { timeout } = { ...DEFAULT_WAIT_OPTIONS, ...options };

  const message = page.locator('.el-message');

  try {
    // 先等待消息出现
    await message.waitFor({ state: 'visible', timeout: 5000 });
  } catch {
    // 如果消息没有出现，直接返回
    return;
  }

  // 等待消息消失
  await message.waitFor({ state: 'hidden', timeout });
}

/**
 * 等待指定时间
 *
 * @param ms 等待时间（毫秒）
 */
export async function wait(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}
