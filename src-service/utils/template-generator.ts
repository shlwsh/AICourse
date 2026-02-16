/**
 * Excel 模板生成工具
 * 生成排课系统导入模板
 */
import ExcelJS from 'exceljs';
import { createLogger } from './logger';
import path from 'path';
import fs from 'fs/promises';

const log = createLogger('TemplateGenerator');

/**
 * 生成导入模板
 */
export async function generateImportTemplate(outputPath: string): Promise<string> {
  log.info('开始生成导入模板', { outputPath });

  const workbook = new ExcelJS.Workbook();

  // 创建教师信息工作表
  createTeachersSheet(workbook);

  // 创建科目配置工作表
  createSubjectsSheet(workbook);

  // 创建教学计划工作表
  createCurriculumsSheet(workbook);

  // 创建教师偏好工作表
  createTeacherPreferencesSheet(workbook);

  // 确保输出目录存在
  const dir = path.dirname(outputPath);
  await fs.mkdir(dir, { recursive: true });

  // 保存文件
  await workbook.xlsx.writeFile(outputPath);

  log.info('导入模板生成成功', { outputPath });

  return outputPath;
}

/**
 * 创建教师信息工作表
 */
function createTeachersSheet(workbook: ExcelJS.Workbook) {
  const sheet = workbook.addWorksheet('教师信息');

  // 设置列
  sheet.columns = [
    { header: '教师ID', key: 'id', width: 15 },
    { header: '姓名', key: 'name', width: 15 },
    { header: '教研组', key: 'group', width: 15 },
  ];

  // 添加示例数据
  sheet.addRow({ id: 1, name: '张老师', group: '语文组' });
  sheet.addRow({ id: 2, name: '李老师', group: '数学组' });

  // 设置表头样式
  sheet.getRow(1).font = { bold: true };
  sheet.getRow(1).fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFE0E0E0' },
  };
}

/**
 * 创建科目配置工作表
 */
function createSubjectsSheet(workbook: ExcelJS.Workbook) {
  const sheet = workbook.addWorksheet('科目配置');

  sheet.columns = [
    { header: '科目ID', key: 'id', width: 15 },
    { header: '科目名称', key: 'name', width: 15 },
    { header: '周课时数', key: 'hours', width: 15 },
  ];

  sheet.addRow({ id: 'chinese', name: '语文', hours: 5 });
  sheet.addRow({ id: 'math', name: '数学', hours: 5 });

  sheet.getRow(1).font = { bold: true };
  sheet.getRow(1).fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFE0E0E0' },
  };
}

/**
 * 创建教学计划工作表
 */
function createCurriculumsSheet(workbook: ExcelJS.Workbook) {
  const sheet = workbook.addWorksheet('教学计划');

  sheet.columns = [
    { header: '班级ID', key: 'classId', width: 15 },
    { header: '科目ID', key: 'subjectId', width: 15 },
    { header: '教师ID', key: 'teacherId', width: 15 },
    { header: '周课时数', key: 'hours', width: 15 },
  ];

  sheet.addRow({ classId: 1, subjectId: 'chinese', teacherId: 1, hours: 5 });
  sheet.addRow({ classId: 1, subjectId: 'math', teacherId: 2, hours: 5 });

  sheet.getRow(1).font = { bold: true };
  sheet.getRow(1).fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFE0E0E0' },
  };
}

/**
 * 创建教师偏好工作表
 */
function createTeacherPreferencesSheet(workbook: ExcelJS.Workbook) {
  const sheet = workbook.addWorksheet('教师偏好');

  sheet.columns = [
    { header: '教师ID', key: 'teacherId', width: 15 },
    { header: '星期', key: 'day', width: 15 },
    { header: '节次', key: 'period', width: 15 },
    { header: '偏好类型', key: 'type', width: 20 },
  ];

  sheet.addRow({ teacherId: 1, day: 1, period: 1, type: 'preferred' });
  sheet.addRow({ teacherId: 1, day: 1, period: 2, type: 'unavailable' });

  sheet.getRow(1).font = { bold: true };
  sheet.getRow(1).fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFE0E0E0' },
  };
}
