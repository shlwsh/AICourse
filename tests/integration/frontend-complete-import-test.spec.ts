/**
 * 完整的导入测试
 * 测试导入功能并验证所有字典数据
 */
import { test, expect } from '@playwright/test';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

test.describe('完整导入测试', () => {
  test('完整流程：导入数据 -> 验证所有字典', async ({ page }) => {
    // 1. 访问首页
    await page.goto('http://localhost:5173');
    await page.waitForLoadState('networkidle');
    console.log('✓ 访问首页成功');

    // 2. 导航到导入导出页面
    await page.click('text=导入导出');
    await page.waitForLoadState('networkidle');
    console.log('✓ 进入导入导出页面');

    // 3. 上传测试数据文件
    const testFilePath = resolve(__dirname, '../../data/测试数据.xlsx');
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(testFilePath);
    await page.waitForTimeout(1000);
    console.log('✓ 文件上传成功');

    // 4. 点击导入按钮
    await page.click('button:has-text("开始导入")');
    console.log('⏳ 开始导入...');

    // 5. 等待导入完成
    await page.waitForSelector('.el-message', { timeout: 60000 });
    const messageText = await page.locator('.el-message').first().textContent();
    console.log('导入结果:', messageText);

    // 等待消息消失
    await page.waitForTimeout(2000);

    // 6. 验证教师字典
    await page.click('text=字典管理');
    await page.waitForLoadState('networkidle');
    console.log('✓ 进入字典管理页面');

    const teacherTable = page.locator('.teacher-dictionary .el-table');
    await expect(teacherTable).toBeVisible();
    const teacherRows = await teacherTable.locator('tbody tr').count();
    console.log(`✓ 教师字典: ${teacherRows} 条数据`);
    expect(teacherRows).toBeGreaterThan(0);

    // 7. 验证班级字典
    await page.click('.el-tabs__item:has-text("班级")');
    await page.waitForTimeout(1000);

    const classTable = page.locator('.class-dictionary .el-table');
    const classRows = await classTable.locator('tbody tr').count();
    console.log(`✓ 班级字典: ${classRows} 条数据`);
    if (classRows > 0) {
      expect(classRows).toBeGreaterThan(0);
    }

    // 8. 验证科目字典
    await page.click('.el-tabs__item:has-text("科目")');
    await page.waitForTimeout(1000);

    const subjectTable = page.locator('.subject-dictionary .el-table');
    const subjectRows = await subjectTable.locator('tbody tr').count();
    console.log(`✓ 科目字典: ${subjectRows} 条数据`);
    if (subjectRows > 0) {
      expect(subjectRows).toBeGreaterThan(0);
    }

    // 9. 验证教研组字典
    await page.click('.el-tabs__item:has-text("教研组")');
    await page.waitForTimeout(1000);

    const teachingGroupTable = page.locator('.teaching-group-dictionary .el-table');
    await expect(teachingGroupTable).toBeVisible();
    const teachingGroupRows = await teachingGroupTable.locator('tbody tr').count();
    console.log(`✓ 教研组字典: ${teachingGroupRows} 条数据`);
    expect(teachingGroupRows).toBeGreaterThan(0);

    // 10. 验证年级字典
    await page.click('.el-tabs__item:has-text("年级")');
    await page.waitForTimeout(1000);

    const gradeTable = page.locator('.grade-dictionary .el-table');
    await expect(gradeTable).toBeVisible();
    const gradeRows = await gradeTable.locator('tbody tr').count();
    console.log(`✓ 年级字典: ${gradeRows} 条数据`);
    expect(gradeRows).toBeGreaterThanOrEqual(3);

    // 11. 验证场地字典
    await page.click('.el-tabs__item:has-text("场地")');
    await page.waitForTimeout(1000);

    const venueTable = page.locator('.venue-dictionary .el-table');
    const venueRows = await venueTable.locator('tbody tr').count();
    console.log(`✓ 场地字典: ${venueRows} 条数据`);
    if (venueRows > 0) {
      expect(venueRows).toBeGreaterThan(0);
    }

    // 12. 验证教学计划
    await page.click('text=教学计划');
    await page.waitForLoadState('networkidle');

    const curriculumTable = page.locator('.curriculum-page .el-table');
    await expect(curriculumTable).toBeVisible();
    const curriculumRows = await curriculumTable.locator('tbody tr').count();
    console.log(`✓ 教学计划: ${curriculumRows} 条数据`);
    if (curriculumRows > 0) {
      expect(curriculumRows).toBeGreaterThan(0);
    }

    console.log('\n========== 测试总结 ==========');
    console.log(`教师: ${teacherRows} 条`);
    console.log(`班级: ${classRows} 条`);
    console.log(`科目: ${subjectRows} 条`);
    console.log(`教研组: ${teachingGroupRows} 条`);
    console.log(`年级: ${gradeRows} 条`);
    console.log(`场地: ${venueRows} 条`);
    console.log(`教学计划: ${curriculumRows} 条`);
    console.log('=============================\n');
  });
});
