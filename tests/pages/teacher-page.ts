/**
 * 教师管理页面对象
 *
 * 封装教师管理页面的所有操作和元素定位
 *
 * 功能特性：
 * - 教师列表查看
 * - 教师偏好设置
 * - 工作量统计
 * - 教师搜索和筛选
 */

import type { Page, Locator } from '@playwright/test';
import { BasePage } from './base-page';

/**
 * 教师管理页面对象类
 */
export class TeacherPage extends BasePage {
  // 页面元素选择器
  private readonly selectors = {
    // 标签页
    teacherListTab: '[data-testid="teacher-list-tab"]',
    preferenceTab: '[data-testid="preference-tab"]',
    workloadTab: '[data-testid="workload-tab"]',

    // 教师列表
    teacherTable: '[data-testid="teacher-table"]',
    teacherRow: '[data-testid="teacher-row"]',
    searchInput: '[data-testid="teacher-search"]',
    subjectFilter: '[data-testid="subject-filter"]',
    teachingGroupFilter: '[data-testid="teaching-group-filter"]',

    // 教师偏好设置
    preferenceForm: '[data-testid="preference-form"]',
    teacherSelect: '[data-testid="teacher-select"]',
    timeSlotGrid: '[data-testid="time-slot-grid"]',
    timeSlotCell: '[data-testid="time-slot-cell"]',
    preferredSlot: '[data-testid="preferred-slot"]',
    unavailableSlot: '[data-testid="unavailable-slot"]',
    savePreferenceButton: '[data-testid="save-preference-button"]',
    batchSaveButton: '[data-testid="batch-save-button"]',

    // 工作量统计
    workloadChart: '[data-testid="workload-chart"]',
    workloadTable: '[data-testid="workload-table"]',
    exportWorkloadButton: '[data-testid="export-workload-button"]',
    statisticsCard: '[data-testid="statistics-card"]',

    // 通用元素
    loading: '.el-loading-mask',
    emptyState: '.el-table__empty-text',
  };

  constructor(page: Page) {
    super(page, 'TeacherPage');
  }

  /**
   * 导航到教师管理页面
   */
  async goto(): Promise<void> {
    await super.goto('/teacher');
    this.logger.info('已导航到教师管理页面');
  }

  /**
   * 切换到教师列表标签页
   */
  async switchToTeacherListTab(): Promise<void> {
    this.logger.info('切换到教师列表标签页');
    await this.click(this.selectors.teacherListTab);
    await this.waitForLoadingComplete();
  }

  /**
   * 切换到偏好设置标签页
   */
  async switchToPreferenceTab(): Promise<void> {
    this.logger.info('切换到偏好设置标签页');
    await this.click(this.selectors.preferenceTab);
    await this.waitForLoadingComplete();
  }

  /**
   * 切换到工作量统计标签页
   */
  async switchToWorkloadTab(): Promise<void> {
    this.logger.info('切换到工作量统计标签页');
    await this.click(this.selectors.workloadTab);
    await this.waitForLoadingComplete();
  }

  /**
   * 搜索教师
   *
   * @param keyword 搜索关键词
   */
  async searchTeacher(keyword: string): Promise<void> {
    this.logger.info(`搜索教师: ${keyword}`);
    await this.fill(this.selectors.searchInput, keyword);

    // 等待搜索结果更新
    await this.page.waitForTimeout(500);
    await this.waitForLoadingComplete();
  }

  /**
   * 选择科目筛选器
   *
   * @param subject 科目名称
   */
  async selectSubjectFilter(subject: string): Promise<void> {
    this.logger.info(`选择科目筛选: ${subject}`);
    await this.click(this.selectors.subjectFilter);

    await this.page.waitForTimeout(500);

    const option = this.page.locator(`.el-select-dropdown__item:has-text("${subject}")`);
    await option.click();

    await this.waitForLoadingComplete();
  }

  /**
   * 获取教师列表行数
   */
  async getTeacherCount(): Promise<number> {
    const rows = this.page.locator(this.selectors.teacherRow);
    return await rows.count();
  }

  /**
   * 获取指定行的教师信息
   *
   * @param rowIndex 行索引（从0开始）
   */
  async getTeacherInfo(rowIndex: number): Promise<{
    name: string;
    subject: string;
    teachingGroup: string;
  }> {
    const row = this.page.locator(this.selectors.teacherRow).nth(rowIndex);

    const name = await row.locator('.teacher-name').textContent() || '';
    const subject = await row.locator('.teacher-subject').textContent() || '';
    const teachingGroup = await row.locator('.teaching-group').textContent() || '';

    return {
      name: name.trim(),
      subject: subject.trim(),
      teachingGroup: teachingGroup.trim(),
    };
  }

  /**
   * 检查教师列表是否为空
   */
  async isTeacherListEmpty(): Promise<boolean> {
    return await this.isVisible(this.selectors.emptyState);
  }

  /**
   * 选择教师（在偏好设置页面）
   *
   * @param teacherName 教师名称
   */
  async selectTeacher(teacherName: string): Promise<void> {
    this.logger.info(`选择教师: ${teacherName}`);
    await this.click(this.selectors.teacherSelect);

    await this.page.waitForTimeout(500);

    const option = this.page.locator(`.el-select-dropdown__item:has-text("${teacherName}")`);
    await option.click();

    await this.waitForLoadingComplete();
  }

  /**
   * 获取时间槽位单元格
   *
   * @param dayOfWeek 星期几（0-6）
   * @param period 节次（0-7）
   */
  getTimeSlotCell(dayOfWeek: number, period: number): Locator {
    return this.page.locator(
      `${this.selectors.timeSlotCell}[data-day="${dayOfWeek}"][data-period="${period}"]`,
    );
  }

  /**
   * 设置时间槽位为偏好
   *
   * @param dayOfWeek 星期几
   * @param period 节次
   */
  async setSlotAsPreferred(dayOfWeek: number, period: number): Promise<void> {
    this.logger.debug(`设置偏好时段: (${dayOfWeek}, ${period})`);

    const cell = this.getTimeSlotCell(dayOfWeek, period);
    await cell.click();

    // 等待状态更新
    await this.page.waitForTimeout(300);
  }

  /**
   * 设置时间槽位为不可用
   *
   * @param dayOfWeek 星期几
   * @param period 节次
   */
  async setSlotAsUnavailable(dayOfWeek: number, period: number): Promise<void> {
    this.logger.debug(`设置不可用时段: (${dayOfWeek}, ${period})`);

    const cell = this.getTimeSlotCell(dayOfWeek, period);

    // 双击设置为不可用
    await cell.dblclick();

    await this.page.waitForTimeout(300);
  }

  /**
   * 检查时间槽位是否为偏好
   *
   * @param dayOfWeek 星期几
   * @param period 节次
   */
  async isSlotPreferred(dayOfWeek: number, period: number): Promise<boolean> {
    const cell = this.getTimeSlotCell(dayOfWeek, period);
    const className = await cell.getAttribute('class');
    return className?.includes('preferred') || false;
  }

  /**
   * 检查时间槽位是否为不可用
   *
   * @param dayOfWeek 星期几
   * @param period 节次
   */
  async isSlotUnavailable(dayOfWeek: number, period: number): Promise<boolean> {
    const cell = this.getTimeSlotCell(dayOfWeek, period);
    const className = await cell.getAttribute('class');
    return className?.includes('unavailable') || false;
  }

  /**
   * 保存教师偏好设置
   */
  async savePreference(): Promise<void> {
    this.logger.info('保存教师偏好设置');
    await this.click(this.selectors.savePreferenceButton);
    await this.waitForLoadingComplete();
  }

  /**
   * 批量保存教师偏好设置
   */
  async batchSavePreferences(): Promise<void> {
    this.logger.info('批量保存教师偏好设置');
    await this.click(this.selectors.batchSaveButton);
    await this.waitForLoadingComplete();
  }

  /**
   * 等待工作量图表加载完成
   */
  async waitForWorkloadChartLoaded(): Promise<void> {
    this.logger.debug('等待工作量图表加载');
    await this.waitForVisible(this.selectors.workloadChart, 10000);
    await this.waitForLoadingComplete();
  }

  /**
   * 检查工作量图表是否显示
   */
  async isWorkloadChartVisible(): Promise<boolean> {
    return await this.isVisible(this.selectors.workloadChart);
  }

  /**
   * 获取工作量统计表格行数
   */
  async getWorkloadTableRowCount(): Promise<number> {
    const table = this.page.locator(this.selectors.workloadTable);
    const rows = table.locator('tbody tr');
    return await rows.count();
  }

  /**
   * 获取指定教师的工作量信息
   *
   * @param teacherName 教师名称
   */
  async getTeacherWorkload(teacherName: string): Promise<{
    hoursPerWeek: number;
    classCount: number;
  } | null> {
    const table = this.page.locator(this.selectors.workloadTable);
    const row = table.locator(`tr:has-text("${teacherName}")`);

    if (!(await row.isVisible())) {
      return null;
    }

    const hoursText = await row.locator('.hours-per-week').textContent() || '0';
    const classCountText = await row.locator('.class-count').textContent() || '0';

    return {
      hoursPerWeek: parseInt(hoursText, 10),
      classCount: parseInt(classCountText, 10),
    };
  }

  /**
   * 点击导出工作量统计按钮
   */
  async clickExportWorkload(): Promise<void> {
    this.logger.info('点击导出工作量统计按钮');
    await this.click(this.selectors.exportWorkloadButton);
  }

  /**
   * 获取统计卡片数量
   */
  async getStatisticsCardCount(): Promise<number> {
    const cards = this.page.locator(this.selectors.statisticsCard);
    return await cards.count();
  }

  /**
   * 获取统计卡片的值
   *
   * @param cardIndex 卡片索引（从0开始）
   */
  async getStatisticsCardValue(cardIndex: number): Promise<{
    title: string;
    value: string;
  }> {
    const card = this.page.locator(this.selectors.statisticsCard).nth(cardIndex);

    const title = await card.locator('.card-title').textContent() || '';
    const value = await card.locator('.card-value').textContent() || '';

    return {
      title: title.trim(),
      value: value.trim(),
    };
  }
}
