/**
 * 导入导出服务类
 *
 * 功能：
 * - 封装导入导出相关的业务逻辑
 * - 实现从 Excel 导入排课条件、导出课表到 Excel、生成导入模板等方法
 * - 调用 Tauri 命令与 Rust 后端交互
 * - 实现数据验证和业务规则检查
 * - 添加完善的日志记录
 *
 * 使用示例：
 * ```typescript
 * import { ImportExportService } from '@/services/import-export-service';
 *
 * const importExportService = new ImportExportService();
 *
 * // 从 Excel 导入排课条件
 * const result = await importExportService.importFromExcel('/path/to/file.xlsx');
 *
 * // 导出课表到 Excel
 * const filePath = await importExportService.exportToExcel('ClassSchedule', '/path/to/output.xlsx');
 * ```
 */

import { invoke } from '@tauri-apps/api/core';
import { createLogger } from '../utils/logger';

// 创建服务专用日志记录器
const logger = createLogger('ImportExportService');

// ============================================================================
// 类型定义
// ============================================================================

/**
 * 导出类型枚举
 */
export type ExportType =
  | 'ClassSchedule'      // 班级课表
  | 'TeacherSchedule'    // 教师课表
  | 'MasterSchedule'     // 总课表
  | 'WorkloadStatistics'; // 工作量统计

/**
 * 导入结果
 */
export interface ImportResult {
  /** 是否成功 */
  success: boolean;
  /** 成功导入的记录数 */
  successCount: number;
  /** 失败的记录数 */
  failedCount: number;
  /** 错误信息列表 */
  errors: string[];
  /** 提示消息 */
  message: string;
}

/**
 * 导出结果
 */
export interface ExportResult {
  /** 是否成功 */
  success: boolean;
  /** 导出文件路径 */
  filePath: string;
  /** 提示消息 */
  message: string;
}

/**
 * 模板生成结果
 */
export interface TemplateResult {
  /** 是否成功 */
  success: boolean;
  /** 模板文件路径 */
  filePath: string;
  /** 提示消息 */
  message: string;
}

/**
 * 文件验证结果
 */
export interface ValidationResult {
  /** 是否有效 */
  isValid: boolean;
  /** 错误信息列表 */
  errors: string[];
  /** 警告信息列表 */
  warnings: string[];
}

// ============================================================================
// 导入导出服务类
// ============================================================================

/**
 * 导入导出服务类
 *
 * 负责处理所有与导入导出相关的业务逻辑，包括：
 * - Excel 文件导入
 * - Excel 文件导出
 * - 模板生成
 * - 文件验证
 */
export class ImportExportService {
  /**
   * 从 Excel 导入排课条件
   *
   * 从指定的 Excel 文件导入教师信息、课程配置、教学计划等排课条件。
   * 支持批量导入，并提供详细的错误报告。
   *
   * @param filePath - Excel 文件路径
   * @returns 导入结果，包含成功数量、失败数量和错误信息
   * @throws 如果导入失败则抛出错误
   *
   * @example
   * ```typescript
   * const result = await importExportService.importFromExcel('/path/to/data.xlsx');
   * if (result.success) {
   *   console.log(`成功导入 ${result.successCount} 条记录`);
   * } else {
   *   console.error(`导入失败，错误: ${result.errors.join(', ')}`);
   * }
   * ```
   */
  async importFromExcel(filePath: string): Promise<ImportResult> {
    logger.info('开始从 Excel 导入排课条件', { filePath });

    try {
      // 步骤 1: 验证文件路径
      this.validateFilePath(filePath);

      // 步骤 2: 验证文件格式
      logger.debug('验证文件格式');
      const validationResult = await this.validateImportFile(filePath);

      if (!validationResult.isValid) {
        logger.warn('文件验证失败', {
          errors: validationResult.errors,
          warnings: validationResult.warnings,
        });

        return {
          success: false,
          successCount: 0,
          failedCount: 0,
          errors: validationResult.errors,
          message: '文件验证失败，请检查文件格式和内容',
        };
      }

      // 记录警告信息（如果有）
      if (validationResult.warnings.length > 0) {
        logger.warn('文件验证通过但存在警告', {
          warnings: validationResult.warnings,
        });
      }

      // 步骤 3: 调用 Tauri 命令导入数据
      logger.debug('调用 Rust 后端导入数据');

      const result = await invoke<{
        success: boolean;
        success_count: number;
        failed_count: number;
        errors: string[];
        message: string;
      }>('import_from_excel', {
        filePath,
      });

      // 步骤 4: 处理导入结果
      const importResult: ImportResult = {
        success: result.success,
        successCount: result.success_count,
        failedCount: result.failed_count,
        errors: result.errors,
        message: result.message,
      };

      // 步骤 5: 记录导入结果
      if (importResult.success) {
        logger.info('Excel 导入成功', {
          filePath,
          successCount: importResult.successCount,
          failedCount: importResult.failedCount,
        });
      } else {
        logger.error('Excel 导入失败', {
          filePath,
          successCount: importResult.successCount,
          failedCount: importResult.failedCount,
          errors: importResult.errors,
        });
      }

      return importResult;
    } catch (error) {
      logger.error('从 Excel 导入排课条件失败', {
        filePath,
        error: error instanceof Error ? error.message : String(error),
      });

      throw new Error(
        `从 Excel 导入排课条件失败: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  /**
   * 导出课表到 Excel
   *
   * 将课表数据导出为 Excel 文件，支持多种导出类型。
   *
   * @param exportType - 导出类型（班级课表、教师课表、总课表、工作量统计）
   * @param outputPath - 可选的输出路径，如果不提供则使用默认路径
   * @returns 导出结果，包含文件路径
   * @throws 如果导出失败则抛出错误
   *
   * @example
   * ```typescript
   * // 导出班级课表到默认路径
   * const result = await importExportService.exportToExcel('ClassSchedule');
   * console.log(`课表已导出到: ${result.filePath}`);
   *
   * // 导出教师课表到指定路径
   * const result2 = await importExportService.exportToExcel(
   *   'TeacherSchedule',
   *   '/path/to/teacher_schedule.xlsx'
   * );
   * ```
   */
  async exportToExcel(exportType: ExportType, outputPath?: string): Promise<ExportResult> {
    logger.info('开始导出课表到 Excel', { exportType, outputPath });

    try {
      // 步骤 1: 验证导出类型
      this.validateExportType(exportType);

      // 步骤 2: 生成默认输出路径（如果未提供）
      let finalOutputPath = outputPath;
      if (!finalOutputPath) {
        finalOutputPath = this.generateDefaultOutputPath(exportType);
        logger.debug('使用默认输出路径', { outputPath: finalOutputPath });
      } else {
        // 验证输出路径
        this.validateOutputPath(finalOutputPath);
      }

      // 步骤 3: 调用 Tauri 命令导出数据
      logger.debug('调用 Rust 后端导出数据');

      const result = await invoke<{
        success: boolean;
        file_path: string;
        message: string;
      }>('export_to_excel', {
        exportType,
        outputPath: finalOutputPath,
      });

      // 步骤 4: 处理导出结果
      const exportResult: ExportResult = {
        success: result.success,
        filePath: result.file_path,
        message: result.message,
      };

      // 步骤 5: 记录导出结果
      if (exportResult.success) {
        logger.info('Excel 导出成功', {
          exportType,
          filePath: exportResult.filePath,
        });
      } else {
        logger.error('Excel 导出失败', {
          exportType,
          outputPath: finalOutputPath,
          message: exportResult.message,
        });
      }

      return exportResult;
    } catch (error) {
      logger.error('导出课表到 Excel 失败', {
        exportType,
        outputPath,
        error: error instanceof Error ? error.message : String(error),
      });

      throw new Error(
        `导出课表到 Excel 失败: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  /**
   * 生成并返回导入模板
   *
   * 生成包含所有必要工作表和示例数据的 Excel 导入模板。
   *
   * @returns 模板生成结果，包含模板文件路径
   * @throws 如果生成失败则抛出错误
   *
   * @example
   * ```typescript
   * const result = await importExportService.downloadTemplate();
   * console.log(`模板已生成: ${result.filePath}`);
   * ```
   */
  async downloadTemplate(): Promise<TemplateResult> {
    logger.info('开始生成导入模板');

    try {
      // 调用 Tauri 命令生成模板
      logger.debug('调用 Rust 后端生成模板');

      const result = await invoke<{
        success: boolean;
        file_path: string;
        message: string;
      }>('download_import_template');

      // 处理模板生成结果
      const templateResult: TemplateResult = {
        success: result.success,
        filePath: result.file_path,
        message: result.message,
      };

      // 记录模板生成结果
      if (templateResult.success) {
        logger.info('导入模板生成成功', {
          filePath: templateResult.filePath,
        });
      } else {
        logger.error('导入模板生成失败', {
          message: templateResult.message,
        });
      }

      return templateResult;
    } catch (error) {
      logger.error('生成导入模板失败', {
        error: error instanceof Error ? error.message : String(error),
      });

      throw new Error(
        `生成导入模板失败: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  /**
   * 验证导入文件格式和内容
   *
   * 在实际导入前验证 Excel 文件的格式和内容是否符合要求。
   * 检查工作表结构、必填字段、数据类型等。
   *
   * @param filePath - Excel 文件路径
   * @returns 验证结果，包含是否有效、错误信息和警告信息
   * @throws 如果验证过程失败则抛出错误
   *
   * @example
   * ```typescript
   * const validation = await importExportService.validateImportFile('/path/to/file.xlsx');
   * if (!validation.isValid) {
   *   console.error('文件验证失败:', validation.errors);
   * }
   * if (validation.warnings.length > 0) {
   *   console.warn('警告:', validation.warnings);
   * }
   * ```
   */
  async validateImportFile(filePath: string): Promise<ValidationResult> {
    logger.debug('开始验证导入文件', { filePath });

    try {
      // 步骤 1: 验证文件路径
      this.validateFilePath(filePath);

      // 步骤 2: 调用 Tauri 命令验证文件
      logger.debug('调用 Rust 后端验证文件');

      const result = await invoke<{
        is_valid: boolean;
        errors: string[];
        warnings: string[];
      }>('validate_import_file', {
        filePath,
      });

      // 步骤 3: 处理验证结果
      const validationResult: ValidationResult = {
        isValid: result.is_valid,
        errors: result.errors,
        warnings: result.warnings,
      };

      // 步骤 4: 记录验证结果
      if (validationResult.isValid) {
        logger.debug('文件验证通过', {
          filePath,
          warningCount: validationResult.warnings.length,
        });
      } else {
        logger.warn('文件验证失败', {
          filePath,
          errorCount: validationResult.errors.length,
          warningCount: validationResult.warnings.length,
        });
      }

      return validationResult;
    } catch (error) {
      logger.error('验证导入文件失败', {
        filePath,
        error: error instanceof Error ? error.message : String(error),
      });

      throw new Error(
        `验证导入文件失败: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  // ============================================================================
  // 私有辅助方法
  // ============================================================================

  /**
   * 验证文件路径
   *
   * @param filePath - 文件路径
   * @throws 如果文件路径无效则抛出错误
   */
  private validateFilePath(filePath: string): void {
    if (!filePath || typeof filePath !== 'string') {
      throw new Error('文件路径不能为空');
    }

    if (filePath.trim().length === 0) {
      throw new Error('文件路径不能为空字符串');
    }

    // 检查文件扩展名
    const validExtensions = ['.xlsx', '.xls'];
    const ext = filePath.substring(filePath.lastIndexOf('.')).toLowerCase();

    if (!validExtensions.includes(ext)) {
      throw new Error(
        `不支持的文件类型: ${ext}。仅支持: ${validExtensions.join(', ')}`,
      );
    }

    // 检查路径遍历攻击
    if (filePath.includes('..')) {
      throw new Error('文件路径包含非法字符');
    }

    logger.debug('文件路径验证通过', { filePath });
  }

  /**
   * 验证导出类型
   *
   * @param exportType - 导出类型
   * @throws 如果导出类型无效则抛出错误
   */
  private validateExportType(exportType: ExportType): void {
    const validTypes: ExportType[] = [
      'ClassSchedule',
      'TeacherSchedule',
      'MasterSchedule',
      'WorkloadStatistics',
    ];

    if (!validTypes.includes(exportType)) {
      throw new Error(
        `无效的导出类型: ${exportType}。有效类型: ${validTypes.join(', ')}`,
      );
    }

    logger.debug('导出类型验证通过', { exportType });
  }

  /**
   * 验证输出路径
   *
   * @param outputPath - 输出路径
   * @throws 如果输出路径无效则抛出错误
   */
  private validateOutputPath(outputPath: string): void {
    if (!outputPath || typeof outputPath !== 'string') {
      throw new Error('输出路径不能为空');
    }

    if (outputPath.trim().length === 0) {
      throw new Error('输出路径不能为空字符串');
    }

    // 检查文件扩展名
    const ext = outputPath.substring(outputPath.lastIndexOf('.')).toLowerCase();
    if (ext !== '.xlsx') {
      throw new Error('输出文件必须是 .xlsx 格式');
    }

    // 检查路径遍历攻击
    if (outputPath.includes('..')) {
      throw new Error('输出路径包含非法字符');
    }

    logger.debug('输出路径验证通过', { outputPath });
  }

  /**
   * 生成默认输出路径
   *
   * 根据导出类型生成默认的输出文件路径。
   *
   * @param exportType - 导出类型
   * @returns 默认输出路径
   */
  private generateDefaultOutputPath(exportType: ExportType): string {
    // 生成时间戳
    const timestamp = new Date()
      .toISOString()
      .replace(/[:.]/g, '-')
      .slice(0, -5); // 移除毫秒部分

    // 根据导出类型生成文件名
    const typeNameMap: Record<ExportType, string> = {
      ClassSchedule: '班级课表',
      TeacherSchedule: '教师课表',
      MasterSchedule: '总课表',
      WorkloadStatistics: '工作量统计',
    };

    const typeName = typeNameMap[exportType];
    const fileName = `${typeName}_${timestamp}.xlsx`;

    // 构建完整路径（使用 exports 目录）
    const outputPath = `exports/${fileName}`;

    logger.debug('生成默认输出路径', {
      exportType,
      outputPath,
    });

    return outputPath;
  }
}
