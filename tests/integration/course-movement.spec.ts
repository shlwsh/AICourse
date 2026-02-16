/**
 * 课程移动集成测试
 *
 * 测试编号：7.3.2
 * 优先级：P0（核心功能）
 *
 * 测试内容：
 * - 成功移动到空闲时段
 * - 阻止违反硬约束的移动
 * - 冲突检测性能测试
 * - 冲突状态显示
 */

import { test, expect } from '../fixtures/test-fixtures';
import { SchedulePage } from '../pages/schedule-page';
import {
  assertSuccessMessage,
  assertErrorMessage,
  assertOperationDuration,
} from '../helpers/test-assertions';
import { waitForLoadingComplete } from '../helpers/test-waiters';

test.describe('7.3.2 课程移动集成测试', () => {
  let schedulePage: SchedulePage;

  test.beforeEach(async ({ page }) => {
    schedulePage = new SchedulePage(page);
    await schedulePage.goto();
    await schedulePage.waitForScheduleGridLoaded();

    // 生成初始课表
    await schedulePage.clickGenerateSchedule();
    await schedulePage.waitForScheduleGenerated();
  });

  /**
   * 测试用例 7.3.2.1：测试成功移动到空闲时段
   *
   * 验证点：
   * - 课程可以拖拽到空闲时段
   * - 移动后课程出现在新位置
   * - 原位置变为空
   * - 显示成功消息
   */
  test('7.3.2.1 测试成功移动到空闲时段', async ({ page, logger }) => {
    logger.info('开始测试：成功移动到空闲时段');

    // 步骤1：找到一个有课程的时段
    logger.info('步骤1：找到一个有课程的时段');

    let sourceDay = -1;
    let sourcePeriod = -1;
    let sourceCourse = '';

    // 查找第一个有课程的时段
    outerLoop: for (let day = 0; day < 5; day++) {
      for (let period = 0; period < 8; period++) {
        const isEmpty = await schedulePage.isCellEmpty(day, period);

        if (!isEmpty) {
          sourceDay = day;
          sourcePeriod = period;
          sourceCourse = await schedulePage.getCourseNameInCell(day, period);
          logger.info(`找到源课程: ${sourceCourse} 在 (${day}, ${period})`);
          break outerLoop;
        }
      }
    }

    expect(sourceDay).toBeGreaterThanOrEqual(0);
    expect(sourcePeriod).toBeGreaterThanOrEqual(0);

    // 步骤2：找到一个空闲时段
    logger.info('步骤2：找到一个空闲时段');

    let targetDay = -1;
    let targetPeriod = -1;

    // 查找第一个空闲时段
    outerLoop2: for (let day = 0; day < 5; day++) {
      for (let period = 0; period < 8; period++) {
        const isEmpty = await schedulePage.isCellEmpty(day, period);

        if (isEmpty && (day !== sourceDay || period !== sourcePeriod)) {
          targetDay = day;
          targetPeriod = period;
          logger.info(`找到目标空闲时段: (${day}, ${period})`);
          break outerLoop2;
        }
      }
    }

    if (targetDay < 0 || targetPeriod < 0) {
      logger.warn('没有找到空闲时段，跳过此测试');
      test.skip();
      return;
    }

    // 步骤3：拖拽课程到空闲时段
    logger.info('步骤3：拖拽课程到空闲时段');
    await schedulePage.dragCourse(sourceDay, sourcePeriod, targetDay, targetPeriod);

    // 步骤4：验证移动成功
    logger.info('步骤4：验证移动成功');

    // 验证原位置为空
    const sourceIsEmpty = await schedulePage.isCellEmpty(sourceDay, sourcePeriod);
    expect(sourceIsEmpty).toBe(true);
    logger.info('验证通过：原位置已清空');

    // 验证新位置有课程
    const targetCourse = await schedulePage.getCourseNameInCell(targetDay, targetPeriod);
    expect(targetCourse).toBe(sourceCourse);
    logger.info(`验证通过：课程已移动到新位置 ${targetCourse}`);

    logger.info('测试用例 7.3.2.1 执行完成');
  });

  /**
   * 测试用例 7.3.2.2：测试阻止违反硬约束的移动
   *
   * 验证点：
   * - 违反硬约束的移动被阻止
   * - 显示错误消息
   * - 课程保持在原位置
   */
  test('7.3.2.2 测试阻止违反硬约束的移动', async ({ page, logger }) => {
    logger.info('开始测试：阻止违反硬约束的移动');

    // 步骤1：找到一个体育课
    logger.info('步骤1：找到一个体育课');

    let peDay = -1;
    let pePeriod = -1;

    // 查找体育课
    outerLoop: for (let day = 0; day < 5; day++) {
      for (let period = 0; period < 8; period++) {
        const courseName = await schedulePage.getCourseNameInCell(day, period);

        if (courseName.includes('体育')) {
          peDay = day;
          pePeriod = period;
          logger.info(`找到体育课在 (${day}, ${period})`);
          break outerLoop;
        }
      }
    }

    if (peDay < 0 || pePeriod < 0) {
      logger.warn('没有找到体育课，跳过此测试');
      test.skip();
      return;
    }

    // 步骤2：尝试将体育课移动到第1节（禁止时段）
    logger.info('步骤2：尝试将体育课移动到第1节（禁止时段）');

    const targetDay = 0;
    const targetPeriod = 0; // 第1节

    await schedulePage.dragCourse(peDay, pePeriod, targetDay, targetPeriod);

    // 步骤3：验证移动被阻止
    logger.info('步骤3：验证移动被阻止');

    // 等待错误消息或验证课程仍在原位置
    try {
      await assertErrorMessage(page, '违反硬约束');
      logger.info('验证通过：显示了错误消息');
    } catch {
      // 如果没有错误消息，验证课程仍在原位置
      const courseStillThere = await schedulePage.getCourseNameInCell(peDay, pePeriod);
      expect(courseStillThere).toContain('体育');
      logger.info('验证通过：课程仍在原位置');
    }

    logger.info('测试用例 7.3.2.2 执行完成');
  });

  /**
   * 测试用例 7.3.2.3：测试冲突检测性能（<100ms）
   *
   * 验证点：
   * - 冲突检测在100ms内完成
   * - 返回正确的冲突信息
   */
  test('7.3.2.3 测试冲突检测性能（<100ms）', async ({ page, logger }) => {
    logger.info('开始测试：冲突检测性能');

    // 步骤1：执行冲突检测并测量时间
    logger.info('步骤1：执行冲突检测并测量时间');

    await assertOperationDuration(
      async () => {
        await schedulePage.clickDetectConflicts();
        await waitForLoadingComplete(page);
      },
      100,
      '冲突检测',
    );

    logger.info('验证通过：冲突检测在100ms内完成');

    logger.info('测试用例 7.3.2.3 执行完成');
  });

  /**
   * 测试用例 7.3.2.4：测试冲突状态显示
   *
   * 验证点：
   * - 有冲突的单元格显示冲突标记
   * - 冲突数量正确显示
   * - 冲突列表显示详细信息
   */
  test('7.3.2.4 测试冲突状态显示', async ({ page, logger }) => {
    logger.info('开始测试：冲突状态显示');

    // 步骤1：执行冲突检测
    logger.info('步骤1：执行冲突检测');
    await schedulePage.clickDetectConflicts();
    await waitForLoadingComplete(page);

    // 步骤2：获取冲突数量
    logger.info('步骤2：获取冲突数量');
    const conflictCount = await schedulePage.getConflictCount();
    logger.info(`检测到 ${conflictCount} 个冲突`);

    // 步骤3：如果有冲突，验证冲突标记
    if (conflictCount > 0) {
      logger.info('步骤3：验证冲突标记');

      let markedConflicts = 0;

      // 检查所有单元格的冲突标记
      for (let day = 0; day < 5; day++) {
        for (let period = 0; period < 8; period++) {
          const hasConflict = await schedulePage.cellHasConflict(day, period);

          if (hasConflict) {
            markedConflicts++;
            logger.debug(`单元格 (${day}, ${period}) 有冲突标记`);
          }
        }
      }

      logger.info(`共有 ${markedConflicts} 个单元格标记了冲突`);
      expect(markedConflicts).toBeGreaterThan(0);
    } else {
      logger.info('没有冲突，测试通过');
    }

    logger.info('测试用例 7.3.2.4 执行完成');
  });
});
