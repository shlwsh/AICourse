/**
 * 模板下载功能集成测试
 * 测试用例编号：IT-TEMPLATE-001
 *
 * 测试目标：验证导入模板下载功能
 */
import { test, expect } from '@playwright/test';
import fs from 'fs/promises';
import path from 'path';
import ExcelJS from 'exceljs';

// 测试配置
const API_BASE_URL = 'http://localhost:3000';
const DOWNLOAD_DIR = path.join(process.cwd(), 'tests/downloads');

test.describe('模板下载功能测试', () => {
  // 测试前准备：确保下载目录存在
  test.beforeAll(async () => {
    await fs.mkdir(DOWNLOAD_DIR, { recursive: true });
    console.log('[测试准备] 创建下载目录:', DOWNLOAD_DIR);
  });

  // 测试后清理：删除下载的文件
  test.afterAll(async () => {
    try {
      const files = await fs.readdir(DOWNLOAD_DIR);
      for (const file of files) {
        if (file.endsWith('.xlsx')) {
          await fs.unlink(path.join(DOWNLOAD_DIR, file));
        }
      }
      console.log('[测试清理] 清理下载文件完成');
    } catch (error) {
      console.warn('[测试清理] 清理失败:', error);
    }
  });

  test('IT-TEMPLATE-001-01: 应该能够成功下载导入模板', async ({ request }) => {
    console.log('\n========================================');
    console.log('测试用例: IT-TEMPLATE-001-01');
    console.log('测试描述: 验证模板下载接口返回正确的文件');
    console.log('========================================\n');

    console.log('[步骤 1] 发送模板下载请求');
    const response = await request.get(`${API_BASE_URL}/api/import-export/template`, {
      params: {
        templateType: 'all',
      },
    });

    console.log('[验证 1.1] 检查响应状态码');
    expect(response.status()).toBe(200);
    console.log('✓ 响应状态码: 200');

    console.log('[验证 1.2] 检查响应头 Content-Type');
    const contentType = response.headers()['content-type'];
    expect(contentType).toContain('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    console.log('✓ Content-Type 正确:', contentType);

    console.log('[验证 1.3] 检查响应头 Content-Disposition');
    const contentDisposition = response.headers()['content-disposition'];
    expect(contentDisposition).toContain('attachment');
    // 文件名可能被 URL 编码，检查是否包含编码后的文件名或原始文件名
    const hasEncodedFilename = contentDisposition.includes('%E6%8E%92%E8%AF%BE');
    const hasRawFilename = contentDisposition.includes('排课系统导入模板.xlsx');
    expect(hasEncodedFilename || hasRawFilename).toBe(true);
    console.log('✓ Content-Disposition 正确:', contentDisposition);

    console.log('[步骤 2] 保存下载的文件');
    const buffer = await response.body();
    const filePath = path.join(DOWNLOAD_DIR, 'template_test.xlsx');
    await fs.writeFile(filePath, buffer);
    console.log('✓ 文件已保存:', filePath);

    console.log('[验证 2.1] 检查文件大小');
    const stats = await fs.stat(filePath);
    expect(stats.size).toBeGreaterThan(0);
    console.log('✓ 文件大小:', stats.size, 'bytes');

    console.log('\n[测试结果] IT-TEMPLATE-001-01 通过 ✓\n');
  });

  test('IT-TEMPLATE-001-02: 下载的模板应该包含所有必需的工作表', async ({ request }) => {
    console.log('\n========================================');
    console.log('测试用例: IT-TEMPLATE-001-02');
    console.log('测试描述: 验证模板文件包含所有必需的工作表');
    console.log('========================================\n');

    console.log('[步骤 1] 下载模板文件');
    const response = await request.get(`${API_BASE_URL}/api/import-export/template`, {
      params: {
        templateType: 'all',
      },
    });

    expect(response.status()).toBe(200);
    console.log('✓ 模板下载成功');

    console.log('[步骤 2] 解析 Excel 文件');
    const buffer = await response.body();
    const filePath = path.join(DOWNLOAD_DIR, 'template_structure_test.xlsx');
    await fs.writeFile(filePath, buffer);

    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(filePath);
    console.log('✓ Excel 文件解析成功');

    console.log('[验证 2.1] 检查工作表数量');
    expect(workbook.worksheets.length).toBe(4);
    console.log('✓ 工作表数量: 4');

    console.log('[验证 2.2] 检查工作表名称');
    const sheetNames = workbook.worksheets.map((sheet) => sheet.name);
    console.log('工作表列表:', sheetNames);

    expect(sheetNames).toContain('教师信息');
    console.log('✓ 包含工作表: 教师信息');

    expect(sheetNames).toContain('科目配置');
    console.log('✓ 包含工作表: 科目配置');

    expect(sheetNames).toContain('教学计划');
    console.log('✓ 包含工作表: 教学计划');

    expect(sheetNames).toContain('教师偏好');
    console.log('✓ 包含工作表: 教师偏好');

    console.log('\n[测试结果] IT-TEMPLATE-001-02 通过 ✓\n');
  });

  test('IT-TEMPLATE-001-03: 教师信息工作表应该包含正确的列和示例数据', async ({ request }) => {
    console.log('\n========================================');
    console.log('测试用例: IT-TEMPLATE-001-03');
    console.log('测试描述: 验证教师信息工作表的结构和数据');
    console.log('========================================\n');

    console.log('[步骤 1] 下载并解析模板文件');
    const response = await request.get(`${API_BASE_URL}/api/import-export/template`);
    expect(response.status()).toBe(200);

    const buffer = await response.body();
    const filePath = path.join(DOWNLOAD_DIR, 'template_teachers_test.xlsx');
    await fs.writeFile(filePath, buffer);

    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(filePath);
    console.log('✓ 文件解析成功');

    console.log('[步骤 2] 获取教师信息工作表');
    const sheet = workbook.getWorksheet('教师信息');
    expect(sheet).toBeDefined();
    console.log('✓ 找到教师信息工作表');

    if (!sheet) {
      throw new Error('教师信息工作表不存在');
    }

    console.log('[验证 2.1] 检查表头');
    const headerRow = sheet.getRow(1);
    const headers = [
      headerRow.getCell(1).value,
      headerRow.getCell(2).value,
      headerRow.getCell(3).value,
    ];
    console.log('表头:', headers);

    expect(headers).toEqual(['教师ID', '姓名', '教研组']);
    console.log('✓ 表头正确');

    console.log('[验证 2.2] 检查示例数据');
    expect(sheet.rowCount).toBeGreaterThanOrEqual(2);
    console.log('✓ 包含示例数据，行数:', sheet.rowCount);

    const row2 = sheet.getRow(2);
    expect(row2.getCell(1).value).toBeDefined();
    expect(row2.getCell(2).value).toBeDefined();
    expect(row2.getCell(3).value).toBeDefined();
    console.log('✓ 第一行示例数据完整');

    console.log('\n[测试结果] IT-TEMPLATE-001-03 通过 ✓\n');
  });

  test('IT-TEMPLATE-001-04: 科目配置工作表应该包含正确的列和示例数据', async ({ request }) => {
    console.log('\n========================================');
    console.log('测试用例: IT-TEMPLATE-001-04');
    console.log('测试描述: 验证科目配置工作表的结构和数据');
    console.log('========================================\n');

    console.log('[步骤 1] 下载并解析模板文件');
    const response = await request.get(`${API_BASE_URL}/api/import-export/template`);
    expect(response.status()).toBe(200);

    const buffer = await response.body();
    const filePath = path.join(DOWNLOAD_DIR, 'template_subjects_test.xlsx');
    await fs.writeFile(filePath, buffer);

    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(filePath);
    console.log('✓ 文件解析成功');

    console.log('[步骤 2] 获取科目配置工作表');
    const sheet = workbook.getWorksheet('科目配置');
    expect(sheet).toBeDefined();
    console.log('✓ 找到科目配置工作表');

    if (!sheet) {
      throw new Error('科目配置工作表不存在');
    }

    console.log('[验证 2.1] 检查表头');
    const headerRow = sheet.getRow(1);
    const headers = [
      headerRow.getCell(1).value,
      headerRow.getCell(2).value,
      headerRow.getCell(3).value,
    ];
    console.log('表头:', headers);

    expect(headers).toEqual(['科目ID', '科目名称', '周课时数']);
    console.log('✓ 表头正确');

    console.log('[验证 2.2] 检查示例数据');
    expect(sheet.rowCount).toBeGreaterThanOrEqual(2);
    console.log('✓ 包含示例数据，行数:', sheet.rowCount);

    console.log('\n[测试结果] IT-TEMPLATE-001-04 通过 ✓\n');
  });

  test('IT-TEMPLATE-001-05: 教学计划工作表应该包含正确的列和示例数据', async ({ request }) => {
    console.log('\n========================================');
    console.log('测试用例: IT-TEMPLATE-001-05');
    console.log('测试描述: 验证教学计划工作表的结构和数据');
    console.log('========================================\n');

    console.log('[步骤 1] 下载并解析模板文件');
    const response = await request.get(`${API_BASE_URL}/api/import-export/template`);
    expect(response.status()).toBe(200);

    const buffer = await response.body();
    const filePath = path.join(DOWNLOAD_DIR, 'template_curriculums_test.xlsx');
    await fs.writeFile(filePath, buffer);

    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(filePath);
    console.log('✓ 文件解析成功');

    console.log('[步骤 2] 获取教学计划工作表');
    const sheet = workbook.getWorksheet('教学计划');
    expect(sheet).toBeDefined();
    console.log('✓ 找到教学计划工作表');

    if (!sheet) {
      throw new Error('教学计划工作表不存在');
    }

    console.log('[验证 2.1] 检查表头');
    const headerRow = sheet.getRow(1);
    const headers = [
      headerRow.getCell(1).value,
      headerRow.getCell(2).value,
      headerRow.getCell(3).value,
      headerRow.getCell(4).value,
    ];
    console.log('表头:', headers);

    expect(headers).toEqual(['班级ID', '科目ID', '教师ID', '周课时数']);
    console.log('✓ 表头正确');

    console.log('[验证 2.2] 检查示例数据');
    expect(sheet.rowCount).toBeGreaterThanOrEqual(2);
    console.log('✓ 包含示例数据，行数:', sheet.rowCount);

    console.log('\n[测试结果] IT-TEMPLATE-001-05 通过 ✓\n');
  });

  test('IT-TEMPLATE-001-06: 教师偏好工作表应该包含正确的列和示例数据', async ({ request }) => {
    console.log('\n========================================');
    console.log('测试用例: IT-TEMPLATE-001-06');
    console.log('测试描述: 验证教师偏好工作表的结构和数据');
    console.log('========================================\n');

    console.log('[步骤 1] 下载并解析模板文件');
    const response = await request.get(`${API_BASE_URL}/api/import-export/template`);
    expect(response.status()).toBe(200);

    const buffer = await response.body();
    const filePath = path.join(DOWNLOAD_DIR, 'template_preferences_test.xlsx');
    await fs.writeFile(filePath, buffer);

    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(filePath);
    console.log('✓ 文件解析成功');

    console.log('[步骤 2] 获取教师偏好工作表');
    const sheet = workbook.getWorksheet('教师偏好');
    expect(sheet).toBeDefined();
    console.log('✓ 找到教师偏好工作表');

    if (!sheet) {
      throw new Error('教师偏好工作表不存在');
    }

    console.log('[验证 2.1] 检查表头');
    const headerRow = sheet.getRow(1);
    const headers = [
      headerRow.getCell(1).value,
      headerRow.getCell(2).value,
      headerRow.getCell(3).value,
      headerRow.getCell(4).value,
    ];
    console.log('表头:', headers);

    expect(headers).toEqual(['教师ID', '星期', '节次', '偏好类型']);
    console.log('✓ 表头正确');

    console.log('[验证 2.2] 检查示例数据');
    expect(sheet.rowCount).toBeGreaterThanOrEqual(2);
    console.log('✓ 包含示例数据，行数:', sheet.rowCount);

    console.log('\n[测试结果] IT-TEMPLATE-001-06 通过 ✓\n');
  });

  test('IT-TEMPLATE-001-07: 多次下载应该都能成功', async ({ request }) => {
    console.log('\n========================================');
    console.log('测试用例: IT-TEMPLATE-001-07');
    console.log('测试描述: 验证模板下载的稳定性和可重复性');
    console.log('========================================\n');

    console.log('[步骤 1] 连续下载 3 次模板');
    for (let i = 1; i <= 3; i++) {
      console.log(`\n[第 ${i} 次下载]`);
      const response = await request.get(`${API_BASE_URL}/api/import-export/template`);

      expect(response.status()).toBe(200);
      console.log(`✓ 第 ${i} 次下载成功`);

      const buffer = await response.body();
      expect(buffer.length).toBeGreaterThan(0);
      console.log(`✓ 第 ${i} 次文件大小: ${buffer.length} bytes`);
    }

    console.log('\n[测试结果] IT-TEMPLATE-001-07 通过 ✓\n');
  });
});
