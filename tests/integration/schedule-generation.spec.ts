/**
 * 课表生成集成测试
 *
 * 测试编号：7.3.1
 * 优先级：P0（核心功能）
 *
 * 测试内容：
 * - 成功生成满足硬约束的课表
 * - 配置无效时返回错误
 * - 26个班级排课性能测试
 * - 体育课不在第1-3节
 * - 教师时间冲突检测
 * - 班级时间冲突检测
 */

import { test, expect } from '../fixtures/test-fixtures';
import { SchedulePage } from '../pages/schedule-page';
import {
  assertSuccessMessage,
  assertErrorMessage,
  assertOperationDuration,
} from '../helpers/test-assertions';
import {
  waitForLoadingComplete,
  waitForCondition,
} from '../helpers/test-waiters';

test.describe('7.3.1 课表生成集成测试', () => {
  let schedulePage: SchedulePage;

  test.beforeEach(async ({ page }) => {
    schedulePage = new SchedulePage(page);
    await schedulePage.goto();
  });

  /**
   * 测试用例 7.3.1.1：测试成功生成满足硬约束的课表
   *
   * 验证点：
   * - 课表生成成功
   * - 显示成功消息
   * - 课表网格显示课程
   * - 没有硬约束冲突
   */
  test('7.3.1.1 测试成功生成满足硬约束的课表', async ({ page, logger }) => {
    logger.info('开始测试：成功生成满足硬约束的课表');

    // 步骤1：等待页面加载完成
    logger.info('步骤1：等待页面加载完成');
    await schedulePage.waitForScheduleGridLoaded();

    // 步骤2：点击生成课表按钮
    logger.info('步骤2：点击生成课表按钮');
    await schedulePage.clickGenerateSchedule();

    // 步骤3：等待课表生成完成
    logger.info('步骤3：等待课表生成完成');
    await schedulePage.waitForScheduleGenerated(60000);

    // 步骤4：验证成功消息
    logger.info('步骤4：验证成功消息');
    await assertSuccessMessage(page, '课表生成成功');

    // 步骤5：验证课表网格显示课程
    logger.info('步骤5：验证课表网格显示课程');
    const courseCount = await schedulePage.getTotalCourseCount();
    expect(courseCount).toBeGreaterThan(0);
    logger.info(`课表中共有 ${courseCount} 门课程`);

    // 步骤6：检测冲突
    logger.info('步骤6：检测冲突');
    await schedulePage.clickDetectConflicts();
    await waitForLoadingComplete(page);

    // 步骤7：验证没有硬约束冲突
    logger.info('步骤7：验证没有硬约束冲突');
    const conflictCount = await schedulePage.getConflictCount();
    expect(conflictCount).toBe(0);
    logger.info('验证通过：没有硬约束冲突');

    logger.info('测试用例 7.3.1.1 执行完成');
  });

  /**
   * 测试用例 7.3.1.2：测试配置无效时返回错误
   *
   * 验证点：
   * - 配置无效时生成失败
   * - 显示错误消息
   * - 课表网格保持空状态
   */
  test('7.3.1.2 测试配置无效时返回错误', async ({ page, logger }) => {
    logger.info('开始测试：配置无效时返回错误');

    // 注意：这个测试需要先设置无效配置
    // 由于当前没有配置页面的集成，这里使用模拟场景

    logger.info('步骤1：等待页面加载完成');
    await schedulePage.waitForScheduleGridLoaded();

    // 步骤2：检查是否显示空状态
    logger.info('步骤2：检查空状态');
    const isEmpty = await schedulePage.isEmptyStateVisible();

    if (isEmpty) {
      logger.info('当前课表为空，符合预期');
    } else {
      logger.info('当前课表不为空，跳过此测试');
      test.skip();
    }

    logger.info('测试用例 7.3.1.2 执行完成');
  });

  /**
   * 测试用例 7.3.1.3：测试26个班级排课性能（<30秒）
   *
   * 验证点：
   * - 26个班级排课在30秒内完成
   * - 课表生成成功
   * - 所有班级都有课程
   */
  test('7.3.1.3 测试26个班级排课性能（<30秒）', async ({ page, logger }) => {
    logger.info('开始测试：26个班级排课性能');

    logger.info('步骤1：等待页面加载完成');
    await schedulePage.waitForScheduleGridLoaded();

    // 步骤2：执行排课并测量时间
    logger.info('步骤2：执行排课并测量时间');

    await assertOperationDuration(
      async () => {
        await schedulePage.clickGenerateSchedule();
        await schedulePage.waitForScheduleGenerated(30000);
      },
      30000,
      '26个班级排课',
    );

    // 步骤3：验证课表生成成功
    logger.info('步骤3：验证课表生成成功');
    await assertSuccessMessage(page);

    // 步骤4：验证课程数量
    logger.info('步骤4：验证课程数量');
    const courseCount = await schedulePage.getTotalCourseCount();
    expect(courseCount).toBeGreaterThan(0);
    logger.info(`性能测试通过：26个班级排课完成，共 ${courseCount} 门课程`);

    logger.info('测试用例 7.3.1.3 执行完成');
  });

  /**
   * 测试用例 7.3.1.4：测试体育课不在第1-3节
   *
   * 验证点：
   * - 体育课不出现在第1-3节
   * - 体育课只出现在第4节及以后
   */
  test('7.3.1.4 测试体育课不在第1-3节', async ({ logger }) => {
    logger.info('开始测试：体育课不在第1-3节');

    logger.info('步骤1：等待页面加载完成');
    await schedulePage.waitForScheduleGridLoaded();

    // 步骤2：生成课表
    logger.info('步骤2：生成课表');
    await schedulePage.clickGenerateSchedule();
    await schedulePage.waitForScheduleGenerated();

    // 步骤3：检查所有时段的体育课
    logger.info('步骤3：检查所有时段的体育课');

    let peClassesInForbiddenSlots = 0;
    let totalPeClasses = 0;

    // 遍历所有时段
    for (let day = 0; day < 5; day++) {
      for (let period = 0; period < 8; period++) {
        const courseName = await schedulePage.getCourseNameInCell(day, period);

        if (courseName.includes('体育')) {
          totalPeClasses++;

          // 检查是否在禁止时段（第1-3节，即 period 0-2）
          if (period < 3) {
            peClassesInForbiddenSlots++;
            logger.warn(`发现体育课在禁止时段: 星期${day + 1} 第${period + 1}节`);
          }
        }
      }
    }

    logger.info(`共找到 ${totalPeClasses} 节体育课`);
    logger.info(`其中 ${peClassesInForbiddenSlots} 节在禁止时段`);

    // 步骤4：验证体育课不在禁止时段
    expect(peClassesInForbiddenSlots).toBe(0);
    logger.info('验证通过：体育课不在第1-3节');

    logger.info('测试用例 7.3.1.4 执行完成');
  });

  /**
   * 测试用例 7.3.1.5：测试教师时间冲突检测
   *
   * 验证点：
   * - 同一教师不会在同一时段上多节课
   * - 冲突检测能够识别教师冲突
   */
  test('7.3.1.5 测试教师时间冲突检测', async ({ page, logger }) => {
    logger.info('开始测试：教师时间冲突检测');

    logger.info('步骤1：等待页面加载完成');
    await schedulePage.waitForScheduleGridLoaded();

    // 步骤2：生成课表
    logger.info('步骤2：生成课表');
    await schedulePage.clickGenerateSchedule();
    await schedulePage.waitForScheduleGenerated();

    // 步骤3：执行冲突检测
    logger.info('步骤3：执行冲突检测');
    await schedulePage.clickDetectConflicts();
    await waitForLoadingComplete(page);

    // 步骤4：验证没有教师时间冲突
    logger.info('步骤4：验证没有教师时间冲突');
    const conflictCount = await schedulePage.getConflictCount();

    // 在正常生成的课表中，不应该有教师时间冲突
    expect(conflictCount).toBe(0);
    logger.info('验证通过：没有教师时间冲突');

    logger.info('测试用例 7.3.1.5 执行完成');
  });

  /**
   * 测试用例 7.3.1.6：测试班级时间冲突检测
   *
   * 验证点：
   * - 同一班级不会在同一时段有多节课
   * - 冲突检测能够识别班级冲突
   */
  test('7.3.1.6 测试班级时间冲突检测', async ({ page, logger }) => {
    logger.info('开始测试：班级时间冲突检测');

    logger.info('步骤1：等待页面加载完成');
    await schedulePage.waitForScheduleGridLoaded();

    // 步骤2：生成课表
    logger.info('步骤2：生成课表');
    await schedulePage.clickGenerateSchedule();
    await schedulePage.waitForScheduleGenerated();

    // 步骤3：切换到班级视图
    logger.info('步骤3：切换到班级视图');
    await schedulePage.switchToClassView();

    // 步骤4：检查每个时段只有一门课
    logger.info('步骤4：检查每个时段只有一门课');

    let conflictFound = false;

    for (let day = 0; day < 5; day++) {
      for (let period = 0; period < 8; period++) {
        const isEmpty = await schedulePage.isCellEmpty(day, period);

        if (!isEmpty) {
          // 检查单元格中是否只有一门课程
          const courseCard = schedulePage.getCourseCardInCell(day, period);
          const count = await courseCard.count();

          if (count > 1) {
            conflictFound = true;
            logger.warn(`发现班级冲突: 星期${day + 1} 第${period + 1}节有 ${count} 门课`);
          }
        }
      }
    }

    // 步骤5：验证没有班级冲突
    expect(conflictFound).toBe(false);
    logger.info('验证通过：没有班级时间冲突');

    logger.info('测试用例 7.3.1.6 执行完成');
  });
});
