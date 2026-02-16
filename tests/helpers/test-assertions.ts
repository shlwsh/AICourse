/**
 * 测试断言辅助工具
 *
 * 提供自定义的断言函数，用于简化测试代码
 *
 * 功能特性：
 * - 课表相关断言
 * - 冲突检测断言
 * - 数据验证断言
 * - 性能断言
 * - 自定义错误消息
 */

import { expect, type Page, type Locator } from '@playwright/test';

/**
 * 断言课表单元格包含指定课程
 *
 * @param cell 课表单元格定位器
 * @param courseName 课程名称
 */
export async function assertCellHasCourse(
  cell: Locator,
  courseName: string,
): Promise<void> {
  await expect(cell).toContainText(courseName, {
    timeout: 5000,
  });
}

/**
 * 断言课表单元格为空
 *
 * @param cell 课表单元格定位器
 */
export async function assertCellIsEmpty(cell: Locator): Promise<void> {
  const text = await cell.textContent();
  expect(text?.trim() || '').toBe('');
}

/**
 * 断言课表单元格显示冲突
 *
 * @param cell 课表单元格定位器
 */
export async function assertCellHasConflict(cell: Locator): Promise<void> {
  // 检查是否有冲突标记（例如红色边框、警告图标等）
  await expect(cell).toHaveClass(/conflict|error|warning/, {
    timeout: 5000,
  });
}

/**
 * 断言课表单元格没有冲突
 *
 * @param cell 课表单元格定位器
 */
export async function assertCellHasNoConflict(cell: Locator): Promise<void> {
  // 检查是否没有冲突标记
  const className = await cell.getAttribute('class');
  expect(className).not.toMatch(/conflict|error|warning/);
}

/**
 * 断言页面显示成功消息
 *
 * @param page 页面对象
 * @param message 期望的消息内容（可选）
 */
export async function assertSuccessMessage(
  page: Page,
  message?: string,
): Promise<void> {
  const successToast = page.locator('.el-message--success');
  await expect(successToast).toBeVisible({ timeout: 5000 });

  if (message) {
    await expect(successToast).toContainText(message);
  }
}

/**
 * 断言页面显示错误消息
 *
 * @param page 页面对象
 * @param message 期望的消息内容（可选）
 */
export async function assertErrorMessage(
  page: Page,
  message?: string,
): Promise<void> {
  const errorToast = page.locator('.el-message--error');
  await expect(errorToast).toBeVisible({ timeout: 5000 });

  if (message) {
    await expect(errorToast).toContainText(message);
  }
}

/**
 * 断言页面显示警告消息
 *
 * @param page 页面对象
 * @param message 期望的消息内容（可选）
 */
export async function assertWarningMessage(
  page: Page,
  message?: string,
): Promise<void> {
  const warningToast = page.locator('.el-message--warning');
  await expect(warningToast).toBeVisible({ timeout: 5000 });

  if (message) {
    await expect(warningToast).toContainText(message);
  }
}

/**
 * 断言加载指示器可见
 *
 * @param page 页面对象
 */
export async function assertLoadingVisible(page: Page): Promise<void> {
  const loading = page.locator('.el-loading-mask');
  await expect(loading).toBeVisible({ timeout: 5000 });
}

/**
 * 断言加载指示器不可见
 *
 * @param page 页面对象
 */
export async function assertLoadingHidden(page: Page): Promise<void> {
  const loading = page.locator('.el-loading-mask');
  await expect(loading).not.toBeVisible({ timeout: 10000 });
}

/**
 * 断言表格包含指定行数
 *
 * @param table 表格定位器
 * @param rowCount 期望的行数
 */
export async function assertTableRowCount(
  table: Locator,
  rowCount: number,
): Promise<void> {
  const rows = table.locator('tbody tr');
  await expect(rows).toHaveCount(rowCount, { timeout: 5000 });
}

/**
 * 断言表格为空
 *
 * @param table 表格定位器
 */
export async function assertTableIsEmpty(table: Locator): Promise<void> {
  const emptyText = table.locator('.el-table__empty-text');
  await expect(emptyText).toBeVisible({ timeout: 5000 });
}

/**
 * 断言操作在指定时间内完成
 *
 * @param operation 要执行的操作
 * @param maxDuration 最大允许时间（毫秒）
 * @param operationName 操作名称（用于错误消息）
 */
export async function assertOperationDuration(
  operation: () => Promise<void>,
  maxDuration: number,
  operationName: string = '操作',
): Promise<void> {
  const startTime = Date.now();

  await operation();

  const duration = Date.now() - startTime;

  expect(duration).toBeLessThan(maxDuration);

  if (duration >= maxDuration) {
    throw new Error(
      `${operationName}执行时间过长: ${duration}ms (期望 < ${maxDuration}ms)`,
    );
  }
}

/**
 * 断言元素在视口内可见
 *
 * @param element 元素定位器
 */
export async function assertElementInViewport(element: Locator): Promise<void> {
  const isInViewport = await element.evaluate((el) => {
    const rect = el.getBoundingClientRect();
    return (
      rect.top >= 0 &&
      rect.left >= 0 &&
      rect.bottom <= window.innerHeight &&
      rect.right <= window.innerWidth
    );
  });

  expect(isInViewport).toBe(true);
}

/**
 * 断言元素具有指定的 CSS 属性值
 *
 * @param element 元素定位器
 * @param property CSS 属性名
 * @param value 期望的属性值
 */
export async function assertCSSProperty(
  element: Locator,
  property: string,
  value: string,
): Promise<void> {
  const actualValue = await element.evaluate(
    (el, prop) => window.getComputedStyle(el).getPropertyValue(prop),
    property,
  );

  expect(actualValue).toBe(value);
}

/**
 * 断言数组包含指定元素
 *
 * @param array 数组
 * @param element 期望包含的元素
 */
export function assertArrayContains<T>(array: T[], element: T): void {
  expect(array).toContain(element);
}

/**
 * 断言数组不包含指定元素
 *
 * @param array 数组
 * @param element 不应包含的元素
 */
export function assertArrayNotContains<T>(array: T[], element: T): void {
  expect(array).not.toContain(element);
}

/**
 * 断言对象具有指定的属性
 *
 * @param obj 对象
 * @param property 属性名
 */
export function assertObjectHasProperty(
  obj: any,
  property: string,
): void {
  expect(obj).toHaveProperty(property);
}

/**
 * 断言对象的属性值等于指定值
 *
 * @param obj 对象
 * @param property 属性名
 * @param value 期望的属性值
 */
export function assertObjectPropertyEquals(
  obj: any,
  property: string,
  value: any,
): void {
  expect(obj).toHaveProperty(property, value);
}

/**
 * 断言字符串匹配正则表达式
 *
 * @param str 字符串
 * @param pattern 正则表达式
 */
export function assertStringMatches(str: string, pattern: RegExp): void {
  expect(str).toMatch(pattern);
}

/**
 * 断言数字在指定范围内
 *
 * @param value 数值
 * @param min 最小值（包含）
 * @param max 最大值（包含）
 */
export function assertNumberInRange(
  value: number,
  min: number,
  max: number,
): void {
  expect(value).toBeGreaterThanOrEqual(min);
  expect(value).toBeLessThanOrEqual(max);
}

/**
 * 断言日期在指定范围内
 *
 * @param date 日期
 * @param startDate 开始日期
 * @param endDate 结束日期
 */
export function assertDateInRange(
  date: Date,
  startDate: Date,
  endDate: Date,
): void {
  expect(date.getTime()).toBeGreaterThanOrEqual(startDate.getTime());
  expect(date.getTime()).toBeLessThanOrEqual(endDate.getTime());
}
