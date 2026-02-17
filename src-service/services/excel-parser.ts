/**
 * Excel 文件解析服务
 *
 * 功能：
 * - 解析上传的 Excel 文件
 * - 提取教师、班级、科目、教学计划等数据
 * - 验证数据格式和完整性
 */

import ExcelJS from 'exceljs';
import { logger } from '../utils/logger';

/**
 * 导入数据接口
 */
export interface ImportData {
  teachers: TeacherData[];
  classes: ClassData[];
  subjects: SubjectData[];
  curriculums: CurriculumData[];
  teachingGroups: TeachingGroupData[];
  grades: GradeData[];
  venues: VenueData[];
}

/**
 * 教师数据接口
 */
export interface TeacherData {
  name: string;
  teachingGroup?: string;
  maxHoursPerDay?: number;
  maxConsecutiveHours?: number;
  unavailableSlots?: string[];
}

/**
 * 班级数据接口
 */
export interface ClassData {
  name: string;
  grade?: string;
  studentCount?: number;
}

/**
 * 科目数据接口
 */
export interface SubjectData {
  id?: string;
  name: string;
  isMajorSubject?: boolean;
  allowDoubleSession?: boolean;
  venueId?: string;
  forbiddenSlots?: string;
  // 保留兼容性字段
  category?: string;
  requiresLab?: boolean;
}

/**
 * 教学计划数据接口
 */
export interface CurriculumData {
  className: string;
  subjectName: string;
  teacherName: string;
  hoursPerWeek: number;
  requiresConsecutive?: boolean;
}

/**
 * 教研组数据接口
 */
export interface TeachingGroupData {
  name: string;
  description?: string;
}

/**
 * 年级数据接口
 */
export interface GradeData {
  name: string;
  order?: number;
}

/**
 * 场地数据接口
 */
export interface VenueData {
  id?: string;
  name: string;
  type?: string;
  capacity?: number;
}

/**
 * 解析结果接口
 */
export interface ParseResult {
  success: boolean;
  data?: ImportData;
  successCount: number;
  errorCount: number;
  errors: ParseError[];
}

/**
 * 解析错误接口
 */
export interface ParseError {
  sheet: string;
  row: number;
  field?: string;
  reason: string;
}

/**
 * Excel 解析器类
 */
export class ExcelParser {
  /**
   * 解析 Excel 文件
   * @param filePath Excel 文件路径
   * @returns 解析结果
   */
  static async parseExcelFile(filePath: string): Promise<ParseResult> {
    const startTime = Date.now();
    logger.info('开始解析 Excel 文件', { filePath });

    const result: ParseResult = {
      success: true,
      data: {
        teachers: [],
        classes: [],
        subjects: [],
        curriculums: [],
        teachingGroups: [],
        grades: [],
        venues: [],
      },
      successCount: 0,
      errorCount: 0,
      errors: [],
    };

    try {
      // 读取 Excel 文件
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.readFile(filePath);

      logger.info('Excel 文件读取成功', {
        sheetCount: workbook.worksheets.length,
        sheetNames: workbook.worksheets.map(ws => ws.name),
      });

      // 解析各个工作表
      for (const worksheet of workbook.worksheets) {
        const sheetName = worksheet.name;
        logger.info(`开始解析工作表: ${sheetName}`);

        try {
          if (sheetName.includes('教师') || sheetName.toLowerCase().includes('teacher')) {
            const teachers = this.parseTeacherSheet(worksheet, result.errors);
            result.data!.teachers.push(...teachers);
            result.successCount += teachers.length;
          } else if (sheetName.includes('班级') || sheetName.toLowerCase().includes('class')) {
            const classes = this.parseClassSheet(worksheet, result.errors);
            result.data!.classes.push(...classes);
            result.successCount += classes.length;
          } else if (sheetName.includes('科目') || sheetName.toLowerCase().includes('subject')) {
            const subjects = this.parseSubjectSheet(worksheet, result.errors);
            result.data!.subjects.push(...subjects);
            result.successCount += subjects.length;
          } else if (sheetName.includes('教学计划') || sheetName.toLowerCase().includes('curriculum')) {
            const curriculums = this.parseCurriculumSheet(worksheet, result.errors);
            result.data!.curriculums.push(...curriculums);
            result.successCount += curriculums.length;
          } else if (sheetName.includes('教研组') || sheetName.toLowerCase().includes('teaching') && sheetName.toLowerCase().includes('group')) {
            const teachingGroups = this.parseTeachingGroupSheet(worksheet, result.errors);
            result.data!.teachingGroups.push(...teachingGroups);
            result.successCount += teachingGroups.length;
          } else if (sheetName.includes('年级') || sheetName.toLowerCase().includes('grade')) {
            const grades = this.parseGradeSheet(worksheet, result.errors);
            result.data!.grades.push(...grades);
            result.successCount += grades.length;
          } else if (sheetName.includes('场地') || sheetName.toLowerCase().includes('venue')) {
            const venues = this.parseVenueSheet(worksheet, result.errors);
            result.data!.venues.push(...venues);
            result.successCount += venues.length;
          } else {
            logger.warn(`跳过未识别的工作表: ${sheetName}`);
          }
        } catch (error) {
          logger.error(`解析工作表失败: ${sheetName}`, {
            error: error instanceof Error ? error.message : String(error),
          });
          result.errors.push({
            sheet: sheetName,
            row: 0,
            reason: `工作表解析失败: ${error instanceof Error ? error.message : String(error)}`,
          });
        }
      }

      result.errorCount = result.errors.length;
      result.success = result.errorCount === 0 || result.successCount > 0;

      const duration = Date.now() - startTime;
      logger.info('Excel 文件解析完成', {
        duration: `${duration}ms`,
        successCount: result.successCount,
        errorCount: result.errorCount,
        teachers: result.data!.teachers.length,
        classes: result.data!.classes.length,
        subjects: result.data!.subjects.length,
        curriculums: result.data!.curriculums.length,
        teachingGroups: result.data!.teachingGroups.length,
        grades: result.data!.grades.length,
        venues: result.data!.venues.length,
      });

      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      logger.error('Excel 文件解析失败', {
        duration: `${duration}ms`,
        error: error instanceof Error ? error.message : String(error),
      });

      result.success = false;
      result.errors.push({
        sheet: '文件',
        row: 0,
        reason: `文件解析失败: ${error instanceof Error ? error.message : String(error)}`,
      });
      result.errorCount = result.errors.length;

      return result;
    }
  }

  /**
   * 解析教师工作表
   */
  private static parseTeacherSheet(
    worksheet: ExcelJS.Worksheet,
    errors: ParseError[],
  ): TeacherData[] {
    const teachers: TeacherData[] = [];
    const sheetName = worksheet.name;

    // 跳过标题行，从第 2 行开始
    worksheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return; // 跳过标题行

      try {
        // 检测列结构：如果第一列是数字，说明是 ID 列
        const firstCell = this.getCellValue(row, 1);
        const hasIdColumn = !isNaN(Number(firstCell));

        let name: string;
        let teachingGroup: string | undefined;

        if (hasIdColumn) {
          // 格式：教师ID、姓名、教研组
          name = this.getCellValue(row, 2);
          teachingGroup = this.getCellValue(row, 3) || undefined;
        } else {
          // 格式：姓名、教研组
          name = firstCell;
          teachingGroup = this.getCellValue(row, 2) || undefined;
        }

        if (!name) {
          // 空行，跳过
          return;
        }

        const teacher: TeacherData = {
          name,
          teachingGroup,
          maxHoursPerDay: undefined,
          maxConsecutiveHours: undefined,
          unavailableSlots: undefined,
        };

        teachers.push(teacher);
      } catch (error) {
        errors.push({
          sheet: sheetName,
          row: rowNumber,
          reason: `教师数据解析失败: ${error instanceof Error ? error.message : String(error)}`,
        });
      }
    });

    logger.info(`解析教师数据完成`, { count: teachers.length, errors: errors.length });
    return teachers;
  }

  /**
   * 解析班级工作表
   */
  private static parseClassSheet(
    worksheet: ExcelJS.Worksheet,
    errors: ParseError[],
  ): ClassData[] {
    const classes: ClassData[] = [];
    const sheetName = worksheet.name;

    worksheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return; // 跳过标题行

      try {
        // 检测列结构：如果第一列是数字，说明是 ID 列
        const firstCell = this.getCellValue(row, 1);
        const hasIdColumn = !isNaN(Number(firstCell));

        let name: string;
        let grade: string | undefined;
        let studentCount: number | undefined;

        if (hasIdColumn) {
          // 格式：班级ID、班级名称、年级、学生人数
          name = this.getCellValue(row, 2);
          grade = this.getCellValue(row, 3) || undefined;
          studentCount = this.getNumberValue(row, 4) || undefined;
        } else {
          // 格式：班级名称、年级、学生人数
          name = firstCell;
          grade = this.getCellValue(row, 2) || undefined;
          studentCount = this.getNumberValue(row, 3) || undefined;
        }

        if (!name) return;

        const classData: ClassData = {
          name,
          grade,
          studentCount,
        };

        classes.push(classData);
      } catch (error) {
        errors.push({
          sheet: sheetName,
          row: rowNumber,
          reason: `班级数据解析失败: ${error instanceof Error ? error.message : String(error)}`,
        });
      }
    });

    logger.info(`解析班级数据完成`, { count: classes.length, errors: errors.length });
    return classes;
  }

  /**
   * 解析科目工作表
   */
  private static parseSubjectSheet(
    worksheet: ExcelJS.Worksheet,
    errors: ParseError[],
  ): SubjectData[] {
    const subjects: SubjectData[] = [];
    const sheetName = worksheet.name;

    worksheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return; // 跳过标题行

      try {
        const firstCell = this.getCellValue(row, 1);
        if (!firstCell) return; // 空行

        // 新格式：科目ID、科目名称、是否主科、允许连堂、关联场地ID、禁止时段
        const id = firstCell;
        const name = this.getCellValue(row, 2);
        const isMajorSubject = this.getBooleanValue(row, 3);
        const allowDoubleSession = this.getBooleanValue(row, 4);
        const venueId = this.getCellValue(row, 5) || undefined;
        const forbiddenSlots = this.getCellValue(row, 6) || '0';

        if (!name) {
          errors.push({
            sheet: sheetName,
            row: rowNumber,
            reason: '科目名称不能为空',
          });
          return;
        }

        const subject: SubjectData = {
          id,
          name,
          isMajorSubject,
          allowDoubleSession,
          venueId,
          forbiddenSlots,
        };

        subjects.push(subject);
      } catch (error) {
        errors.push({
          sheet: sheetName,
          row: rowNumber,
          reason: `科目数据解析失败: ${error instanceof Error ? error.message : String(error)}`,
        });
      }
    });

    logger.info(`解析科目数据完成`, { count: subjects.length, errors: errors.length });
    return subjects;
  }

  /**
   * 解析教学计划工作表
   */
  private static parseCurriculumSheet(
    worksheet: ExcelJS.Worksheet,
    errors: ParseError[],
  ): CurriculumData[] {
    const curriculums: CurriculumData[] = [];
    const sheetName = worksheet.name;

    worksheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return; // 跳过标题行

      try {
        // 检测列结构：如果有 7 列，说明包含 ID 列
        const columnCount = row.cellCount;
        let className: string;
        let subjectName: string;
        let teacherName: string;
        let hoursPerWeek: number | undefined;

        if (columnCount >= 7) {
          // 格式：班级ID、班级名称、科目ID、科目名称、教师ID、教师姓名、周课时数
          className = this.getCellValue(row, 2);
          subjectName = this.getCellValue(row, 4);
          teacherName = this.getCellValue(row, 6);
          hoursPerWeek = this.getNumberValue(row, 7);
        } else {
          // 格式：班级名称、科目名称、教师姓名、周课时数
          className = this.getCellValue(row, 1);
          subjectName = this.getCellValue(row, 2);
          teacherName = this.getCellValue(row, 3);
          hoursPerWeek = this.getNumberValue(row, 4);
        }

        if (!className || !subjectName || !teacherName || !hoursPerWeek) {
          errors.push({
            sheet: sheetName,
            row: rowNumber,
            reason: '教学计划数据不完整（班级、科目、教师、课时数为必填项）',
          });
          return;
        }

        const curriculum: CurriculumData = {
          className,
          subjectName,
          teacherName,
          hoursPerWeek,
          requiresConsecutive: false, // 当前数据中没有此字段
        };

        curriculums.push(curriculum);
      } catch (error) {
        errors.push({
          sheet: sheetName,
          row: rowNumber,
          reason: `教学计划数据解析失败: ${error instanceof Error ? error.message : String(error)}`,
        });
      }
    });

    logger.info(`解析教学计划数据完成`, { count: curriculums.length, errors: errors.length });
    return curriculums;
  }

  /**
   * 解析教研组工作表
   */
  private static parseTeachingGroupSheet(
    worksheet: ExcelJS.Worksheet,
    errors: ParseError[],
  ): TeachingGroupData[] {
    const teachingGroups: TeachingGroupData[] = [];
    const sheetName = worksheet.name;

    worksheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return; // 跳过标题行

      try {
        const firstCell = this.getCellValue(row, 1);
        const hasIdColumn = !isNaN(Number(firstCell));

        let name: string;
        let description: string | undefined;

        if (hasIdColumn) {
          // 格式：ID、名称、描述
          name = this.getCellValue(row, 2);
          description = this.getCellValue(row, 3) || undefined;
        } else {
          // 格式：名称、描述
          name = firstCell;
          description = this.getCellValue(row, 2) || undefined;
        }

        if (!name) return;

        const teachingGroup: TeachingGroupData = {
          name,
          description,
        };

        teachingGroups.push(teachingGroup);
      } catch (error) {
        errors.push({
          sheet: sheetName,
          row: rowNumber,
          reason: `教研组数据解析失败: ${error instanceof Error ? error.message : String(error)}`,
        });
      }
    });

    logger.info(`解析教研组数据完成`, { count: teachingGroups.length, errors: errors.length });
    return teachingGroups;
  }

  /**
   * 解析年级工作表
   */
  private static parseGradeSheet(
    worksheet: ExcelJS.Worksheet,
    errors: ParseError[],
  ): GradeData[] {
    const grades: GradeData[] = [];
    const sheetName = worksheet.name;

    worksheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return; // 跳过标题行

      try {
        const firstCell = this.getCellValue(row, 1);
        const hasIdColumn = !isNaN(Number(firstCell));

        let name: string;
        let order: number | undefined;

        if (hasIdColumn) {
          // 格式：ID、名称、排序
          name = this.getCellValue(row, 2);
          order = this.getNumberValue(row, 3);
        } else {
          // 格式：名称、排序
          name = firstCell;
          order = this.getNumberValue(row, 2);
        }

        if (!name) return;

        const grade: GradeData = {
          name,
          order,
        };

        grades.push(grade);
      } catch (error) {
        errors.push({
          sheet: sheetName,
          row: rowNumber,
          reason: `年级数据解析失败: ${error instanceof Error ? error.message : String(error)}`,
        });
      }
    });

    logger.info(`解析年级数据完成`, { count: grades.length, errors: errors.length });
    return grades;
  }

  /**
   * 解析场地工作表
   */
  private static parseVenueSheet(
    worksheet: ExcelJS.Worksheet,
    errors: ParseError[],
  ): VenueData[] {
    const venues: VenueData[] = [];
    const sheetName = worksheet.name;

    worksheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return; // 跳过标题行

      try {
        const id = this.getCellValue(row, 1);
        if (!id) return; // 空行

        const name = this.getCellValue(row, 2);
        const type = this.getCellValue(row, 3) || undefined;
        const capacity = this.getNumberValue(row, 4) || 1;

        if (!name) {
          errors.push({
            sheet: sheetName,
            row: rowNumber,
            reason: '场地名称不能为空',
          });
          return;
        }

        const venue: VenueData = {
          id,
          name,
          type,
          capacity,
        };

        venues.push(venue);
      } catch (error) {
        errors.push({
          sheet: sheetName,
          row: rowNumber,
          reason: `场地数据解析失败: ${error instanceof Error ? error.message : String(error)}`,
        });
      }
    });

    logger.info(`解析场地数据完成`, { count: venues.length, errors: errors.length });
    return venues;
  }

  /**
   * 获取单元格字符串值
   */
  private static getCellValue(row: ExcelJS.Row, colNumber: number): string {
    const cell = row.getCell(colNumber);
    if (!cell || cell.value === null || cell.value === undefined) {
      return '';
    }

    // 处理不同类型的单元格值
    if (typeof cell.value === 'string') {
      return cell.value.trim();
    } else if (typeof cell.value === 'number') {
      return String(cell.value);
    } else if (typeof cell.value === 'boolean') {
      return cell.value ? '是' : '否';
    } else if (cell.value && typeof cell.value === 'object' && 'text' in cell.value) {
      // 富文本格式
      return (cell.value as any).text.trim();
    }

    return String(cell.value).trim();
  }

  /**
   * 获取单元格数字值
   */
  private static getNumberValue(row: ExcelJS.Row, colNumber: number): number | undefined {
    const value = this.getCellValue(row, colNumber);
    if (!value) return undefined;

    const num = Number(value);
    return isNaN(num) ? undefined : num;
  }

  /**
   * 获取单元格布尔值
   */
  private static getBooleanValue(row: ExcelJS.Row, colNumber: number): boolean {
    const value = this.getCellValue(row, colNumber);
    if (!value) return false;

    const lowerValue = value.toLowerCase();
    return lowerValue === '是' || lowerValue === 'true' || lowerValue === '1' || lowerValue === 'yes';
  }

  /**
   * 解析不可用时间段
   */
  private static parseUnavailableSlots(value: string | undefined): string[] | undefined {
    if (!value) return undefined;

    // 支持多种分隔符：逗号、分号、换行
    const slots = value
      .split(/[,;，；\n]/)
      .map(s => s.trim())
      .filter(s => s.length > 0);

    return slots.length > 0 ? slots : undefined;
  }
}
