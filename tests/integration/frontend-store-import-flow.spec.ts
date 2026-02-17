/**
 * Store 导入流程集成测试
 *
 * 测试目标：
 * 1. 验证 Excel 文件导入功能
 * 2. 验证数据正确分发到各个专门的 store
 * 3. 验证字典管理页面能正确显示导入的数据
 */

import { test, expect } from '@playwright/test';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

test.describe('Store 导入流程测试', () => {
  test.beforeEach(async ({ page }) => {
    // 访问首页
    await page.goto('http://localhost:5173');
    await page.waitForLoadState('networkidle');
  });

  test('用例 1: 导入 Excel 文件并验证数据分发到各个 store', async ({ page }) => {
    console.log('=== 开始测试用例 1: 导入 Excel 文件 ===');

    // 1. 导航到导入导出页面
    await page.click('text=导入导出');
    await page.waitForURL('**/import-export');
    console.log('✓ 已导航到导入导出页面');

    // 2. 选择测试数据文件
    const testDataPath = resolve(__dirname, '../../data/测试数据.xlsx');
    console.log(`✓ 测试数据文件路径: ${testDataPath}`);

    // 3. 上传文件
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(testDataPath);
    console.log('✓ 文件已选择');

    // 等待文件信息显示
    await page.waitForSelector('.selected-file', { timeout: 5000 });
    const fileName = await page.locator('.file-name').textContent();
    console.log(`✓ 文件信息已显示: ${fileName}`);

    // 4. 点击开始导入按钮
    await page.click('button:has-text("开始导入")');
    console.log('✓ 已点击开始导入按钮');

    // 5. 等待导入完成
    await page.waitForSelector('.import-result', { timeout: 30000 });
    console.log('✓ 导入完成');

    // 6. 验证导入结果
    const successText = await page.locator('.result-summary').textContent();
    console.log(`✓ 导入结果: ${successText}`);
    expect(successText).toContain('成功导入');

    // 7. 导航到字典管理页面验证数据
    await page.click('text=字典管理');
    await page.waitForURL('**/dictionary');
    console.log('✓ 已导航到字典管理页面');

    // 8. 验证教师数据
    const teacherCount = await page.locator('text=/教师.*\\((\\d+)\\)/').textContent();
    console.log(`✓ 教师数量: ${teacherCount}`);
    expect(teacherCount).toMatch(/\d+/);
    const teacherNum = parseInt(teacherCount?.match(/\((\d+)\)/)?.[1] || '0');
    expect(teacherNum).toBeGreaterThan(0);

    // 9. 验证班级数据
    await page.click('text=/班级.*\\(/');
    await page.waitForTimeout(500);
    const classCount = await page.locator('text=/班级.*\\((\\d+)\\)/').textContent();
    console.log(`✓ 班级数量: ${classCount}`);
    const classNum = parseInt(classCount?.match(/\((\d+)\)/)?.[1] || '0');
    expect(classNum).toBeGreaterThan(0);

    // 10. 验证科目数据
    await page.click('text=/科目.*\\(/');
    await page.waitForTimeout(500);
    const subjectCount = await page.locator('text=/科目.*\\((\\d+)\\)/').textContent();
    console.log(`✓ 科目数量: ${subjectCount}`);
    const subjectNum = parseInt(subjectCount?.match(/\((\d+)\)/)?.[1] || '0');
    expect(subjectNum).toBeGreaterThan(0);

    // 11. 验证教研组数据
    await page.click('text=/教研组.*\\(/');
    await page.waitForTimeout(500);
    const groupCount = await page.locator('text=/教研组.*\\((\\d+)\\)/').textContent();
    console.log(`✓ 教研组数量: ${groupCount}`);
    const groupNum = parseInt(groupCount?.match(/\((\d+)\)/)?.[1] || '0');
    expect(groupNum).toBeGreaterThan(0);

    // 12. 验证年级数据
    await page.click('text=/年级.*\\(/');
    await page.waitForTimeout(500);
    const gradeCount = await page.locator('text=/年级.*\\((\\d+)\\)/').textContent();
    console.log(`✓ 年级数量: ${gradeCount}`);
    const gradeNum = parseInt(gradeCount?.match(/\((\d+)\)/)?.[1] || '0');
    expect(gradeNum).toBeGreaterThan(0);

    // 13. 验证场地数据
    await page.click('text=/场地.*\\(/');
    await page.waitForTimeout(500);
    const venueCount = await page.locator('text=/场地.*\\((\\d+)\\)/').textContent();
    console.log(`✓ 场地数量: ${venueCount}`);
    const venueNum = parseInt(venueCount?.match(/\((\d+)\)/)?.[1] || '0');
    expect(venueNum).toBeGreaterThan(0);

    console.log('=== 用例 1 测试通过 ===');
  });

  test('用例 2: 验证教师字典显示导入的教师数据', async ({ page }) => {
    console.log('=== 开始测试用例 2: 验证教师字典 ===');

    // 1. 导航到字典管理页面
    await page.click('text=字典管理');
    await page.waitForURL('**/dictionary');
    console.log('✓ 已导航到字典管理页面');

    // 2. 确保在教师标签页
    await page.click('text=/教师.*\\(/');
    await page.waitForTimeout(500);
    console.log('✓ 已切换到教师标签页');

    // 3. 验证教师表格存在
    const teacherTable = page.locator('.teacher-dictionary .el-table');
    await expect(teacherTable.first()).toBeVisible();
    console.log('✓ 教师表格已显示');

    // 4. 验证表格有数据行
    const rows = page.locator('.teacher-dictionary .el-table__body tbody tr');
    const rowCount = await rows.count();
    console.log(`✓ 教师数据行数: ${rowCount}`);
    expect(rowCount).toBeGreaterThan(0);

    // 5. 验证第一行数据包含必要字段
    const firstRow = rows.first();
    const teacherName = await firstRow.locator('td').nth(1).textContent();
    console.log(`✓ 第一个教师姓名: ${teacherName}`);
    expect(teacherName).toBeTruthy();

    console.log('=== 用例 2 测试通过 ===');
  });

  test('用例 3: 验证教师管理页面显示导入的教师数据', async ({ page }) => {
    console.log('=== 开始测试用例 3: 验证教师管理页面 ===');

    // 1. 导航到教师管理页面
    await page.click('text=教师管理');
    await page.waitForURL('**/teacher');
    console.log('✓ 已导航到教师管理页面');

    // 2. 等待教师列表加载
    await page.waitForTimeout(1000);

    // 3. 验证教师列表表格存在
    const teacherTable = page.locator('.el-table');
    await expect(teacherTable.first()).toBeVisible();
    console.log('✓ 教师列表表格已显示');

    // 4. 验证表格有数据行
    const rows = page.locator('.el-table__body tbody tr');
    const rowCount = await rows.count();
    console.log(`✓ 教师列表数据行数: ${rowCount}`);
    expect(rowCount).toBeGreaterThan(0);

    // 5. 验证第一行数据
    const firstRow = rows.first();
    const teacherName = await firstRow.locator('td').nth(1).textContent();
    console.log(`✓ 第一个教师姓名: ${teacherName}`);
    expect(teacherName).toBeTruthy();

    console.log('=== 用例 3 测试通过 ===');
  });
});
