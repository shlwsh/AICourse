/**
 * 示例集成测试
 *
 * 本文件展示如何使用 Playwright 测试框架和自定义 fixtures
 *
 * 测试规范：
 * - 使用 Page Object Model 模式
 * - 测试用例按顺序执行
 * - 失败时快速停止
 * - 完善的日志记录
 */

import { test, expect } from '../fixtures/test-fixtures';

/**
 * 测试套件：应用启动和健康检查
 *
 * 测试编号：1.x
 * 优先级：P0（核心功能）
 */
test.describe('1. 应用启动和健康检查', () => {
  /**
   * 测试用例 1.1：应用能够成功启动
   *
   * 验证点：
   * - 应用窗口能够打开
   * - 页面标题正确
   * - 主要 UI 元素可见
   */
  test('1.1 应用能够成功启动', async ({ page, logger }) => {
    logger.info('导航到应用首页');

    // 访问应用首页
    await page.goto('/');

    // 等待页面加载完成
    await page.waitForLoadState('networkidle');

    logger.info('验证页面标题');

    // 验证页面标题
    await expect(page).toHaveTitle(/排课系统/);

    logger.info('验证主要 UI 元素');

    // 验证主要 UI 元素存在
    // 注意：这些选择器需要根据实际的 UI 实现进行调整
    const header = page.locator('header');
    await expect(header).toBeVisible();

    logger.info('测试用例 1.1 执行完成');
  });

  /**
   * 测试用例 1.2：健康检查端点正常响应
   *
   * 验证点：
   * - /health 端点返回 200 状态码
   * - 响应包含正确的状态信息
   */
  test('1.2 健康检查端点正常响应', async ({ page, logger }) => {
    logger.info('访问健康检查端点');

    // 使用 page.request 访问 API 端点
    const response = await page.request.get('/health');

    logger.info('验证响应状态码');

    // 验证状态码
    expect(response.status()).toBe(200);

    logger.info('验证响应内容');

    // 验证响应内容
    const body = await response.json();
    expect(body).toHaveProperty('status', 'ok');
    expect(body).toHaveProperty('timestamp');

    logger.info('测试用例 1.2 执行完成');
  });
});

/**
 * 测试套件：导航功能
 *
 * 测试编号：2.x
 * 优先级：P0（核心功能）
 */
test.describe('2. 导航功能', () => {
  /**
   * 测试用例 2.1：能够导航到课表页面
   *
   * 验证点：
   * - 课表菜单项可点击
   * - 成功跳转到课表页面
   * - 课表页面主要元素可见
   */
  test('2.1 能够导航到课表页面', async ({ page, logger }) => {
    logger.info('导航到应用首页');
    await page.goto('/');

    logger.info('点击课表菜单');

    // 点击课表菜单（选择器需要根据实际实现调整）
    const scheduleMenu = page.locator('text=课表');
    await scheduleMenu.click();

    logger.info('等待页面跳转');

    // 等待 URL 变化
    await page.waitForURL('**/schedule');

    logger.info('验证课表页面元素');

    // 验证课表页面的关键元素
    const scheduleGrid = page.locator('[data-testid="schedule-grid"]');
    await expect(scheduleGrid).toBeVisible({ timeout: 10000 });

    logger.info('测试用例 2.1 执行完成');
  });

  /**
   * 测试用例 2.2：能够导航到设置页面
   *
   * 验证点：
   * - 设置菜单项可点击
   * - 成功跳转到设置页面
   * - 设置页面主要元素可见
   */
  test('2.2 能够导航到设置页面', async ({ page, logger }) => {
    logger.info('导航到应用首页');
    await page.goto('/');

    logger.info('点击设置菜单');

    // 点击设置菜单
    const settingsMenu = page.locator('text=设置');
    await settingsMenu.click();

    logger.info('等待页面跳转');

    // 等待 URL 变化
    await page.waitForURL('**/settings');

    logger.info('验证设置页面元素');

    // 验证设置页面的关键元素
    const settingsForm = page.locator('[data-testid="settings-form"]');
    await expect(settingsForm).toBeVisible({ timeout: 10000 });

    logger.info('测试用例 2.2 执行完成');
  });
});

/**
 * 测试套件：错误处理
 *
 * 测试编号：3.x
 * 优先级：P1（重要功能）
 */
test.describe('3. 错误处理', () => {
  /**
   * 测试用例 3.1：访问不存在的页面显示 404
   *
   * 验证点：
   * - 访问不存在的路由
   * - 显示友好的错误提示
   */
  test('3.1 访问不存在的页面显示 404', async ({ page, logger }) => {
    logger.info('访问不存在的页面');

    // 访问一个不存在的路由
    const response = await page.goto('/non-existent-page');

    logger.info('验证响应状态');

    // 根据应用的实现，可能返回 404 或重定向到首页
    // 这里需要根据实际情况调整
    if (response) {
      logger.info(`响应状态码: ${response.status()}`);
    }

    logger.info('测试用例 3.1 执行完成');
  });
});

/**
 * 测试套件：性能测试
 *
 * 测试编号：4.x
 * 优先级：P2（增强功能）
 */
test.describe('4. 性能测试', () => {
  /**
   * 测试用例 4.1：首页加载时间在可接受范围内
   *
   * 验证点：
   * - 首页加载时间 < 3秒
   */
  test('4.1 首页加载时间在可接受范围内', async ({ page, logger, timer: _timer }) => {
    logger.info('开始性能测试');

    const startTime = Date.now();

    // 访问首页
    await page.goto('/');

    // 等待页面完全加载
    await page.waitForLoadState('networkidle');

    const loadTime = Date.now() - startTime;

    logger.info(`首页加载时间: ${loadTime}ms`);

    // 验证加载时间
    expect(loadTime).toBeLessThan(3000);

    logger.info('测试用例 4.1 执行完成');
  });
});
