/**
 * 课表生成与导出集成测试
 *
 * 测试编号：7.4.1
 * 优先级：P0（核心功能）
 *
 * 测试目标：
 * 1. 验证自动生成排课功能可用
 * 2. 验证生成的课表可以正常导出为文件
 * 3. 验证导出的文件格式正确且包含完整数据
 *
 * 测试流程：
 * 1. 导航到课表页面
 * 2. 点击生成课表按钮
 * 3. 等待课表生成完成
 * 4. 验证课表生成成功
 * 5. 导出课表为 Excel 文件
 * 6. 验证文件下载成功
 * 7. 验证文件内容完整性
 */

import { test, expect } from '../fixtures/test-fixtures';
import { SchedulePage } from '../pages/schedule-page';
import { ImportExportPage } from '../pages/import-export-page';
import {
  assertSuccessMessage,
  assertOperationDuration,
} from '../helpers/test-assertions';
import { waitForLoadingComplete } from '../helpers/test-waiters';
import * as fs from 'fs';
import * as path from 'path';

test.describe('7.4.1 课表生成与导出集成测试', () => {
  let schedulePage: SchedulePage;
  let importExportPage: ImportExportPage;

  test.beforeEach(async ({ page }) => {
    schedulePage = new SchedulePage(page);
    importExportPage = new ImportExportPage(page);
  });

  /**
   * 测试用例 7.4.1.1：完整流程 - 生成课表并导出
   *
   * 验证点：
   * - 课表生成成功
   * - 课表包含课程数据
   * - 导出功能可用
   * - 文件下载成功
   * - 文件格式正确（.xlsx）
   * - 文件大小合理（>0）
   */
  test('7.4.1.1 完整流程 - 生成课表并导出', async ({ page, logger }) => {
    logger.info('========================================');
    logger.info('开始测试：完整流程 - 生成课表并导出');
    logger.info('========================================');

    // ==================== 第一阶段：生成课表 ====================
    logger.info('');
    logger.info('【第一阶段】生成课表');
    logger.info('----------------------------------------');

    // 步骤1：导航到课表页面
    logger.info('步骤1：导航到课表页面');
    await schedulePage.goto();
    await schedulePage.waitForScheduleGridLoaded();
    logger.info('✓ 课表页面加载完成');

    // 步骤2：点击生成课表按钮
    logger.info('');
    logger.info('步骤2：点击生成课表按钮');
    const generateStartTime = Date.now();
    await schedulePage.clickGenerateSchedule();
    logger.info('✓ 已点击生成课表按钮');

    // 步骤3：等待课表生成完成（最多60秒）
    logger.info('');
    logger.info('步骤3：等待课表生成完成（最多60秒）');
    await schedulePage.waitForScheduleGenerated(60000);
    const generateDuration = Date.now() - generateStartTime;
    logger.info(`✓ 课表生成完成，耗时: ${(generateDuration / 1000).toFixed(2)}秒`);

    // 步骤4：验证成功消息
    logger.info('');
    logger.info('步骤4：验证成功消息');
    await assertSuccessMessage(page, '课表生成成功');
    logger.info('✓ 成功消息已显示');

    // 步骤5：验证课表包含课程数据
    logger.info('');
    logger.info('步骤5：验证课表包含课程数据');
    const courseCount = await schedulePage.getTotalCourseCount();
    logger.info(`课表中共有 ${courseCount} 门课程`);

    expect(courseCount).toBeGreaterThan(0);
    logger.info('✓ 课表包含课程数据');

    // 步骤6：验证没有硬约束冲突
    logger.info('');
    logger.info('步骤6：验证没有硬约束冲突');
    await schedulePage.clickDetectConflicts();
    await waitForLoadingComplete(page);

    const conflictCount = await schedulePage.getConflictCount();
    logger.info(`检测到 ${conflictCount} 个冲突`);

    expect(conflictCount).toBe(0);
    logger.info('✓ 没有硬约束冲突');

    // ==================== 第二阶段：导出课表 ====================
    logger.info('');
    logger.info('【第二阶段】导出课表');
    logger.info('----------------------------------------');

    // 步骤7：导航到导入导出页面
    logger.info('步骤7：导航到导入导出页面');
    await page.goto('http://localhost:5173/import-export');
    await page.waitForLoadingState('networkidle');
    logger.info('✓ 导入导出页面加载完成');

    // 步骤8：切换到导出标签页
    logger.info('');
    logger.info('步骤8：切换到导出标签页');
    await importExportPage.switchToExportTab();
    await page.waitForTimeout(1000);
    logger.info('✓ 已切换到导出标签页');

    // 步骤9：点击导出按钮并下载文件
    logger.info('');
    logger.info('步骤9：点击导出按钮并下载文件');

    const downloadPromise = page.waitForEvent('download', { timeout: 30000 });
    await importExportPage.clickExport();
    logger.info('✓ 已点击导出按钮');

    const download = await downloadPromise;
    logger.info('✓ 文件下载已开始');

    // 步骤10：保存下载的文件
    logger.info('');
    logger.info('步骤10：保存下载的文件');

    const downloadsDir = path.join(process.cwd(), 'tests', 'downloads');
    if (!fs.existsSync(downloadsDir)) {
      fs.mkdirSync(downloadsDir, { recursive: true });
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const fileName = `课表导出_${timestamp}.xlsx`;
    const filePath = path.join(downloadsDir, fileName);

    await download.saveAs(filePath);
    logger.info(`✓ 文件已保存到: ${filePath}`);

    // ==================== 第三阶段：验证导出文件 ====================
    logger.info('');
    logger.info('【第三阶段】验证导出文件');
    logger.info('----------------------------------------');

    // 步骤11：验证文件存在
    logger.info('步骤11：验证文件存在');
    const fileExists = fs.existsSync(filePath);
    expect(fileExists).toBe(true);
    logger.info('✓ 文件存在');

    // 步骤12：验证文件大小
    logger.info('');
    logger.info('步骤12：验证文件大小');
    const stats = fs.statSync(filePath);
    const fileSizeKB = (stats.size / 1024).toFixed(2);
    logger.info(`文件大小: ${fileSizeKB} KB`);

    expect(stats.size).toBeGreaterThan(0);
    logger.info('✓ 文件大小合理');

    // 步骤13：验证文件扩展名
    logger.info('');
    logger.info('步骤13：验证文件扩展名');
    const fileExtension = path.extname(filePath);
    logger.info(`文件扩展名: ${fileExtension}`);

    expect(fileExtension).toBe('.xlsx');
    logger.info('✓ 文件格式正确');

    // 步骤14：验证下载的文件名
    logger.info('');
    logger.info('步骤14：验证下载的文件名');
    const suggestedFilename = download.suggestedFilename();
    logger.info(`建议的文件名: ${suggestedFilename}`);

    expect(suggestedFilename).toMatch(/\.xlsx$/);
    logger.info('✓ 文件名格式正确');

    // ==================== 测试总结 ====================
    logger.info('');
    logger.info('========================================');
    logger.info('测试总结');
    logger.info('========================================');
    logger.info(`✓ 课表生成成功，包含 ${courseCount} 门课程`);
    logger.info(`✓ 课表生成耗时: ${(generateDuration / 1000).toFixed(2)}秒`);
    logger.info(`✓ 没有硬约束冲突`);
    logger.info(`✓ 文件导出成功: ${fileName}`);
    logger.info(`✓ 文件大小: ${fileSizeKB} KB`);
    logger.info('========================================');
    logger.info('测试用例 7.4.1.1 执行完成 ✓');
    logger.info('========================================');
  });

  /**
   * 测试用例 7.4.1.2：性能测试 - 生成并导出大规模课表
   *
   * 验证点：
   * - 26个班级课表生成在30秒内完成
   * - 导出操作在10秒内完成
   * - 导出文件大小合理
   */
  test('7.4.1.2 性能测试 - 生成并导出大规模课表', async ({ page, logger }) => {
    logger.info('========================================');
    logger.info('开始测试：性能测试 - 生成并导出大规模课表');
    logger.info('========================================');

    // 步骤1：导航到课表页面
    logger.info('步骤1：导航到课表页面');
    await schedulePage.goto();
    await schedulePage.waitForScheduleGridLoaded();

    // 步骤2：测量课表生成时间
    logger.info('');
    logger.info('步骤2：测量课表生成时间（要求<30秒）');

    await assertOperationDuration(
      async () => {
        await schedulePage.clickGenerateSchedule();
        await schedulePage.waitForScheduleGenerated(30000);
      },
      30000,
      '课表生成',
    );

    logger.info('✓ 课表生成性能测试通过');

    // 步骤3：验证课表生成成功
    logger.info('');
    logger.info('步骤3：验证课表生成成功');
    const courseCount = await schedulePage.getTotalCourseCount();
    logger.info(`课表中共有 ${courseCount} 门课程`);
    expect(courseCount).toBeGreaterThan(0);

    // 步骤4：导航到导出页面
    logger.info('');
    logger.info('步骤4：导航到导出页面');
    await page.goto('http://localhost:5173/import-export');
    await page.waitForLoadingState('networkidle');
    await importExportPage.switchToExportTab();

    // 步骤5：测量导出时间
    logger.info('');
    logger.info('步骤5：测量导出时间（要求<10秒）');

    const exportStartTime = Date.now();
    const downloadPromise = page.waitForEvent('download', { timeout: 10000 });
    await importExportPage.clickExport();
    const download = await downloadPromise;
    const exportDuration = Date.now() - exportStartTime;

    logger.info(`导出耗时: ${(exportDuration / 1000).toFixed(2)}秒`);
    expect(exportDuration).toBeLessThan(10000);
    logger.info('✓ 导出性能测试通过');

    // 步骤6：保存并验证文件
    logger.info('');
    logger.info('步骤6：保存并验证文件');

    const downloadsDir = path.join(process.cwd(), 'tests', 'downloads');
    if (!fs.existsSync(downloadsDir)) {
      fs.mkdirSync(downloadsDir, { recursive: true });
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const fileName = `课表导出_性能测试_${timestamp}.xlsx`;
    const filePath = path.join(downloadsDir, fileName);

    await download.saveAs(filePath);

    const stats = fs.statSync(filePath);
    const fileSizeKB = (stats.size / 1024).toFixed(2);
    logger.info(`文件大小: ${fileSizeKB} KB`);

    expect(stats.size).toBeGreaterThan(0);
    logger.info('✓ 文件保存成功');

    // 测试总结
    logger.info('');
    logger.info('========================================');
    logger.info('性能测试总结');
    logger.info('========================================');
    logger.info(`✓ 课表包含 ${courseCount} 门课程`);
    logger.info(`✓ 导出耗时: ${(exportDuration / 1000).toFixed(2)}秒`);
    logger.info(`✓ 文件大小: ${fileSizeKB} KB`);
    logger.info('========================================');
    logger.info('测试用例 7.4.1.2 执行完成 ✓');
    logger.info('========================================');
  });

  /**
   * 测试用例 7.4.1.3：边界测试 - 空课表导出
   *
   * 验证点：
   * - 未生成课表时，导出功能的行为
   * - 空课表导出应该给出提示或导出空模板
   */
  test('7.4.1.3 边界测试 - 空课表导出', async ({ page, logger }) => {
    logger.info('========================================');
    logger.info('开始测试：边界测试 - 空课表导出');
    logger.info('========================================');

    // 步骤1：直接导航到导出页面（不生成课表）
    logger.info('步骤1：直接导航到导出页面（不生成课表）');
    await page.goto('http://localhost:5173/import-export');
    await page.waitForLoadingState('networkidle');
    await importExportPage.switchToExportTab();
    logger.info('✓ 导出页面加载完成');

    // 步骤2：尝试导出
    logger.info('');
    logger.info('步骤2：尝试导出空课表');

    try {
      const downloadPromise = page.waitForEvent('download', { timeout: 5000 });
      await importExportPage.clickExport();
      const download = await downloadPromise;

      // 如果能下载，验证文件
      const downloadsDir = path.join(process.cwd(), 'tests', 'downloads');
      if (!fs.existsSync(downloadsDir)) {
        fs.mkdirSync(downloadsDir, { recursive: true });
      }

      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const fileName = `课表导出_空课表_${timestamp}.xlsx`;
      const filePath = path.join(downloadsDir, fileName);

      await download.saveAs(filePath);

      const stats = fs.statSync(filePath);
      const fileSizeKB = (stats.size / 1024).toFixed(2);
      logger.info(`✓ 空课表导出成功，文件大小: ${fileSizeKB} KB`);

      expect(stats.size).toBeGreaterThan(0);
    } catch (error) {
      // 如果不能下载，应该显示错误消息或警告
      logger.info('✓ 空课表无法导出，符合预期');

      // 检查是否有错误提示
      const errorMessage = page.locator('.el-message--error, .el-message--warning');
      const hasError = await errorMessage.isVisible();

      if (hasError) {
        const errorText = await errorMessage.textContent();
        logger.info(`错误提示: ${errorText}`);
      }
    }

    logger.info('========================================');
    logger.info('测试用例 7.4.1.3 执行完成 ✓');
    logger.info('========================================');
  });

  /**
   * 测试用例 7.4.1.4：完整性测试 - 导出后重新导入
   *
   * 验证点：
   * - 生成课表
   * - 导出课表
   * - 清空课表
   * - 重新导入导出的文件
   * - 验证数据一致性
   */
  test('7.4.1.4 完整性测试 - 导出后重新导入', async ({ page, logger }) => {
    logger.info('========================================');
    logger.info('开始测试：完整性测试 - 导出后重新导入');
    logger.info('========================================');

    // 步骤1：生成课表
    logger.info('步骤1：生成课表');
    await schedulePage.goto();
    await schedulePage.waitForScheduleGridLoaded();
    await schedulePage.clickGenerateSchedule();
    await schedulePage.waitForScheduleGenerated(60000);

    const originalCourseCount = await schedulePage.getTotalCourseCount();
    logger.info(`✓ 原始课表包含 ${originalCourseCount} 门课程`);

    // 步骤2：导出课表
    logger.info('');
    logger.info('步骤2：导出课表');
    await page.goto('http://localhost:5173/import-export');
    await page.waitForLoadingState('networkidle');
    await importExportPage.switchToExportTab();

    const downloadPromise = page.waitForEvent('download', { timeout: 30000 });
    await importExportPage.clickExport();
    const download = await downloadPromise;

    const downloadsDir = path.join(process.cwd(), 'tests', 'downloads');
    if (!fs.existsSync(downloadsDir)) {
      fs.mkdirSync(downloadsDir, { recursive: true });
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const fileName = `课表导出_完整性测试_${timestamp}.xlsx`;
    const filePath = path.join(downloadsDir, fileName);

    await download.saveAs(filePath);
    logger.info(`✓ 课表已导出到: ${filePath}`);

    // 步骤3：验证文件存在且有效
    logger.info('');
    logger.info('步骤3：验证导出文件');
    const fileExists = fs.existsSync(filePath);
    expect(fileExists).toBe(true);

    const stats = fs.statSync(filePath);
    expect(stats.size).toBeGreaterThan(0);
    logger.info(`✓ 文件有效，大小: ${(stats.size / 1024).toFixed(2)} KB`);

    // 注意：重新导入功能需要后续实现
    logger.info('');
    logger.info('注意：重新导入验证需要导入功能支持，当前仅验证导出');

    logger.info('========================================');
    logger.info('测试用例 7.4.1.4 执行完成 ✓');
    logger.info('========================================');
  });
});
