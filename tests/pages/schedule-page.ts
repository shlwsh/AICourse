/**
 * 课表页面对象
 *
 * 封装课表页面的所有操作和元素定位
 *
 * 功能特性：
 * - 课表生成
 * - 课程拖拽
 * - 冲突检测
 * - 交换建议
 * - 视图切换
 */

import type { Page, Locator } from '@playwright/test';
import { BasePage } from './base-page';

/**
 * 课表页面对象类
 */
export class SchedulePage extends BasePage {
  // 页面元素选择器
  private readonly selectors = {
    // 主要容器
    scheduleGrid: '.schedule-card',
    scheduleCell: '.schedule-cell',
    courseCard: '.course-card',

    // 操作按钮
    generateButton: 'button:has-text("自动排课")',
    detectConflictsButton: 'button:has-text("检测冲突")',
    suggestSwapsButton: 'button:has-text("建议交换")',
    exportButton: 'button:has-text("导出")',

    // 视图切换
    viewModeSelector: '.el-radio-group',
    classViewButton: '.el-radio-button:has-text("班级视图")',
    teacherViewButton: '.el-radio-button:has-text("教师视图")',
    venueViewButton: '.el-radio-button:has-text("场地视图")',

    // 筛选器
    classFilter: '[data-testid="class-filter"]',
    teacherFilter: '[data-testid="teacher-filter"]',
    subjectFilter: '[data-testid="subject-filter"]',

    // 冲突指示器
    conflictIndicator: '.el-tag:has-text("冲突")',
    conflictList: '.conflicts-list',

    // 交换建议
    swapSuggestionPanel: '.swap-suggestion-panel',
    swapSuggestionItem: '.swap-suggestion-item',
    executeSwapButton: 'button:has-text("执行交换")',

    // 热力图
    heatmapToggle: '.el-switch:has-text("热力图")',
    heatmapView: '.heatmap-view',

    // 加载状态
    loading: '.el-loading-mask',
    emptyState: '.empty-card',
  };

  constructor(page: Page) {
    super(page, 'SchedulePage');
  }

  /**
   * 导航到课表页面
   */
  async goto(): Promise<void> {
    await super.goto('/schedule');
    this.logger.info('已导航到课表页面');
  }

  /**
   * 等待课表页面加载完成（可能是空状态或已有课表）
   */
  async waitForScheduleGridLoaded(): Promise<void> {
    this.logger.debug('等待课表页面加载');

    // 等待页面加载完成，可能显示空状态或课表网格
    await this.page.waitForSelector(
      `${this.selectors.scheduleGrid}, ${this.selectors.emptyState}`,
      { timeout: 15000 }
    );

    await this.waitForLoadingComplete();
    this.logger.debug('课表页面加载完成');
  }

  /**
   * 点击生成课表按钮
   */
  async clickGenerateSchedule(): Promise<void> {
    this.logger.info('点击生成课表按钮');
    await this.click(this.selectors.generateButton);
  }

  /**
   * 等待课表生成完成
   *
   * @param timeout 超时时间（毫秒）
   */
  async waitForScheduleGenerated(timeout: number = 60000): Promise<void> {
    this.logger.info('等待课表生成完成');

    // 等待加载指示器出现
    try {
      await this.page.locator(this.selectors.loading).waitFor({
        state: 'visible',
        timeout: 5000,
      });
    } catch {
      // 加载指示器可能立即消失
    }

    // 等待加载指示器消失
    await this.page.locator(this.selectors.loading).waitFor({
      state: 'hidden',
      timeout,
    });

    // 等待课表网格出现
    await this.waitForVisible(this.selectors.scheduleGrid, 5000);

    this.logger.info('课表生成完成');
  }

  /**
   * 获取课表单元格
   *
   * @param dayOfWeek 星期几（0-6）
   * @param period 节次（0-7）
   * @param classId 班级ID（可选，用于班级视图）
   */
  getCellLocator(
    dayOfWeek: number,
    period: number,
    classId?: number,
  ): Locator {
    let selector = `${this.selectors.scheduleCell}[data-day="${dayOfWeek}"][data-period="${period}"]`;

    if (classId !== undefined) {
      selector += `[data-class="${classId}"]`;
    }

    return this.page.locator(selector);
  }

  /**
   * 获取单元格中的课程卡片
   *
   * @param dayOfWeek 星期几
   * @param period 节次
   */
  getCourseCardInCell(dayOfWeek: number, period: number): Locator {
    const cell = this.getCellLocator(dayOfWeek, period);
    return cell.locator(this.selectors.courseCard);
  }

  /**
   * 检查单元格是否为空
   *
   * @param dayOfWeek 星期几
   * @param period 节次
   */
  async isCellEmpty(dayOfWeek: number, period: number): Promise<boolean> {
    const courseCard = this.getCourseCardInCell(dayOfWeek, period);
    const count = await courseCard.count();
    return count === 0;
  }

  /**
   * 获取单元格中的课程名称
   *
   * @param dayOfWeek 星期几
   * @param period 节次
   */
  async getCourseNameInCell(
    dayOfWeek: number,
    period: number,
  ): Promise<string> {
    const courseCard = this.getCourseCardInCell(dayOfWeek, period);
    const courseName = courseCard.locator('.course-name');
    return await courseName.textContent() || '';
  }

  /**
   * 拖拽课程到新位置
   *
   * @param fromDay 源星期几
   * @param fromPeriod 源节次
   * @param toDay 目标星期几
   * @param toPeriod 目标节次
   */
  async dragCourse(
    fromDay: number,
    fromPeriod: number,
    toDay: number,
    toPeriod: number,
  ): Promise<void> {
    this.logger.info(
      `拖拽课程: (${fromDay},${fromPeriod}) -> (${toDay},${toPeriod})`,
    );

    const sourceCourseCard = this.getCourseCardInCell(fromDay, fromPeriod);
    const targetCell = this.getCellLocator(toDay, toPeriod);

    // 执行拖拽操作
    await sourceCourseCard.dragTo(targetCell);

    // 等待拖拽完成
    await this.waitForLoadingComplete();

    this.logger.debug('课程拖拽完成');
  }

  /**
   * 点击检测冲突按钮
   */
  async clickDetectConflicts(): Promise<void> {
    this.logger.info('点击检测冲突按钮');
    await this.click(this.selectors.detectConflictsButton);
    await this.waitForLoadingComplete();
  }

  /**
   * 获取冲突数量
   */
  async getConflictCount(): Promise<number> {
    const conflictIndicator = this.page.locator(this.selectors.conflictIndicator);

    if (!(await conflictIndicator.isVisible())) {
      return 0;
    }

    const text = await conflictIndicator.textContent();
    const match = text?.match(/\d+/);
    return match ? parseInt(match[0], 10) : 0;
  }

  /**
   * 检查单元格是否有冲突标记
   *
   * @param dayOfWeek 星期几
   * @param period 节次
   */
  async cellHasConflict(dayOfWeek: number, period: number): Promise<boolean> {
    const cell = this.getCellLocator(dayOfWeek, period);
    const className = await cell.getAttribute('class');
    return className?.includes('conflict') || className?.includes('error') || false;
  }

  /**
   * 点击建议交换按钮
   */
  async clickSuggestSwaps(): Promise<void> {
    this.logger.info('点击建议交换按钮');
    await this.click(this.selectors.suggestSwapsButton);
    await this.waitForLoadingComplete();
  }

  /**
   * 等待交换建议面板出现
   */
  async waitForSwapSuggestions(): Promise<void> {
    this.logger.debug('等待交换建议面板');
    await this.waitForVisible(this.selectors.swapSuggestionPanel, 10000);
  }

  /**
   * 获取交换建议数量
   */
  async getSwapSuggestionCount(): Promise<number> {
    const suggestions = this.page.locator(this.selectors.swapSuggestionItem);
    return await suggestions.count();
  }

  /**
   * 执行第一个交换建议
   */
  async executeFirstSwapSuggestion(): Promise<void> {
    this.logger.info('执行第一个交换建议');

    const firstSuggestion = this.page
      .locator(this.selectors.swapSuggestionItem)
      .first();

    const executeButton = firstSuggestion.locator(this.selectors.executeSwapButton);
    await executeButton.click();

    await this.waitForLoadingComplete();
    this.logger.debug('交换执行完成');
  }

  /**
   * 切换到班级视图
   */
  async switchToClassView(): Promise<void> {
    this.logger.info('切换到班级视图');
    await this.click(this.selectors.classViewButton);
    await this.waitForLoadingComplete();
  }

  /**
   * 切换到教师视图
   */
  async switchToTeacherView(): Promise<void> {
    this.logger.info('切换到教师视图');
    await this.click(this.selectors.teacherViewButton);
    await this.waitForLoadingComplete();
  }

  /**
   * 切换到场地视图
   */
  async switchToVenueView(): Promise<void> {
    this.logger.info('切换到场地视图');
    await this.click(this.selectors.venueViewButton);
    await this.waitForLoadingComplete();
  }

  /**
   * 选择班级筛选器
   *
   * @param className 班级名称
   */
  async selectClassFilter(className: string): Promise<void> {
    this.logger.info(`选择班级筛选: ${className}`);
    await this.click(this.selectors.classFilter);

    // 等待下拉菜单出现
    await this.page.waitForTimeout(500);

    // 点击选项
    const option = this.page.locator(`.el-select-dropdown__item:has-text("${className}")`);
    await option.click();

    await this.waitForLoadingComplete();
  }

  /**
   * 选择教师筛选器
   *
   * @param teacherName 教师名称
   */
  async selectTeacherFilter(teacherName: string): Promise<void> {
    this.logger.info(`选择教师筛选: ${teacherName}`);
    await this.click(this.selectors.teacherFilter);

    await this.page.waitForTimeout(500);

    const option = this.page.locator(`.el-select-dropdown__item:has-text("${teacherName}")`);
    await option.click();

    await this.waitForLoadingComplete();
  }

  /**
   * 切换热力图视图
   */
  async toggleHeatmap(): Promise<void> {
    this.logger.info('切换热力图视图');
    await this.click(this.selectors.heatmapToggle);
    await this.page.waitForTimeout(500);
  }

  /**
   * 检查热力图是否显示
   */
  async isHeatmapVisible(): Promise<boolean> {
    return await this.isVisible(this.selectors.heatmapView);
  }

  /**
   * 点击导出按钮
   */
  async clickExport(): Promise<void> {
    this.logger.info('点击导出按钮');
    await this.click(this.selectors.exportButton);
  }

  /**
   * 检查是否显示空状态
   */
  async isEmptyStateVisible(): Promise<boolean> {
    return await this.isVisible(this.selectors.emptyState);
  }

  /**
   * 获取课表网格的行数（节次数）
   */
  async getRowCount(): Promise<number> {
    const rows = this.page.locator(`${this.selectors.scheduleGrid} .schedule-row`);
    return await rows.count();
  }

  /**
   * 获取课表网格的列数（天数）
   */
  async getColumnCount(): Promise<number> {
    const columns = this.page.locator(`${this.selectors.scheduleGrid} .schedule-column`);
    return await columns.count();
  }

  /**
   * 统计课表中的课程总数
   */
  async getTotalCourseCount(): Promise<number> {
    const courseCards = this.page.locator(this.selectors.courseCard);
    return await courseCards.count();
  }
}
