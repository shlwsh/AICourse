/**
 * ImportExportService 单元测试
 *
 * 测试导入导出服务类的所有方法，包括：
 * - 从 Excel 导入排课条件
 * - 导出课表到 Excel
 * - 生成导入模板
 * - 验证导入文件
 * - 数据验证和错误处理
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { ImportExportService } from './import-export-service';
import type { ImportResult, ExportResult, TemplateResult, ValidationResult } from './import-export-service';

// Mock Tauri invoke 函数
const mockInvoke = vi.fn();
vi.mock('@tauri-apps/api/tauri', () => ({
  invoke: (...args: any[]) => mockInvoke(...args),
}));

describe('ImportExportService', () => {
  let service: ImportExportService;

  beforeEach(() => {
    service = new ImportExportService();
    mockInvoke.mockClear();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  // ============================================================================
  // importFromExcel 方法测试
  // ============================================================================

  describe('importFromExcel', () => {
    it('应该成功从 Excel 导入排课条件', async () => {
      // 准备测试数据
      const filePath = '/path/to/test.xlsx';
      const mockValidationResult = {
        is_valid: true,
        errors: [],
        warnings: [],
      };
      const mockImportResult = {
        success: true,
        success_count: 10,
        failed_count: 0,
        errors: [],
        message: '导入成功',
      };

      // 设置 mock 返回值
      mockInvoke
        .mockResolvedValueOnce(mockValidationResult) // validate_import_file
        .mockResolvedValueOnce(mockImportResult);    // import_from_excel

      // 执行测试
      const result = await service.importFromExcel(filePath);

      // 验证结果
      expect(result.success).toBe(true);
      expect(result.successCount).toBe(10);
      expect(result.failedCount).toBe(0);
      expect(result.errors).toEqual([]);
      expect(result.message).toBe('导入成功');

      // 验证 Tauri 命令调用
      expect(mockInvoke).toHaveBeenCalledTimes(2);
      expect(mockInvoke).toHaveBeenNthCalledWith(1, 'validate_import_file', {
        filePath,
      });
      expect(mockInvoke).toHaveBeenNthCalledWith(2, 'import_from_excel', {
        filePath,
      });
    });

    it('应该在文件验证失败时返回错误', async () => {
      // 准备测试数据
      const filePath = '/path/to/invalid.xlsx';
      const mockValidationResult = {
        is_valid: false,
        errors: ['缺少必填工作表', '数据格式错误'],
        warnings: [],
      };

      // 设置 mock 返回值
      mockInvoke.mockResolvedValueOnce(mockValidationResult);

      // 执行测试
      const result = await service.importFromExcel(filePath);

      // 验证结果
      expect(result.success).toBe(false);
      expect(result.successCount).toBe(0);
      expect(result.failedCount).toBe(0);
      expect(result.errors).toEqual(['缺少必填工作表', '数据格式错误']);
      expect(result.message).toBe('文件验证失败，请检查文件格式和内容');

      // 验证只调用了验证命令
      expect(mockInvoke).toHaveBeenCalledTimes(1);
    });

    it('应该在文件路径为空时抛出错误', async () => {
      await expect(service.importFromExcel('')).rejects.toThrow('文件路径不能为空');
    });

    it('应该在文件扩展名无效时抛出错误', async () => {
      await expect(service.importFromExcel('/path/to/file.txt')).rejects.toThrow(
        '不支持的文件类型',
      );
    });

    it('应该在文件路径包含路径遍历时抛出错误', async () => {
      await expect(service.importFromExcel('../../../etc/passwd.xlsx')).rejects.toThrow(
        '文件路径包含非法字符',
      );
    });

    it('应该处理部分导入成功的情况', async () => {
      // 准备测试数据
      const filePath = '/path/to/partial.xlsx';
      const mockValidationResult = {
        is_valid: true,
        errors: [],
        warnings: ['某些数据可能不完整'],
      };
      const mockImportResult = {
        success: true,
        success_count: 8,
        failed_count: 2,
        errors: ['第3行数据无效', '第7行数据无效'],
        message: '部分导入成功',
      };

      // 设置 mock 返回值
      mockInvoke
        .mockResolvedValueOnce(mockValidationResult)
        .mockResolvedValueOnce(mockImportResult);

      // 执行测试
      const result = await service.importFromExcel(filePath);

      // 验证结果
      expect(result.success).toBe(true);
      expect(result.successCount).toBe(8);
      expect(result.failedCount).toBe(2);
      expect(result.errors).toHaveLength(2);
    });
  });

  // ============================================================================
  // exportToExcel 方法测试
  // ============================================================================

  describe('exportToExcel', () => {
    it('应该成功导出班级课表', async () => {
      // 准备测试数据
      const exportType = 'ClassSchedule';
      const mockExportResult = {
        success: true,
        file_path: '/path/to/班级课表_2024-01-01.xlsx',
        message: '导出成功',
      };

      // 设置 mock 返回值
      mockInvoke.mockResolvedValueOnce(mockExportResult);

      // 执行测试
      const result = await service.exportToExcel(exportType);

      // 验证结果
      expect(result.success).toBe(true);
      expect(result.filePath).toBe('/path/to/班级课表_2024-01-01.xlsx');
      expect(result.message).toBe('导出成功');

      // 验证 Tauri 命令调用
      expect(mockInvoke).toHaveBeenCalledTimes(1);
      expect(mockInvoke).toHaveBeenCalledWith('export_to_excel', {
        exportType,
        outputPath: expect.stringContaining('exports/班级课表_'),
      });
    });

    it('应该成功导出教师课表到指定路径', async () => {
      // 准备测试数据
      const exportType = 'TeacherSchedule';
      const outputPath = '/custom/path/teacher_schedule.xlsx';
      const mockExportResult = {
        success: true,
        file_path: outputPath,
        message: '导出成功',
      };

      // 设置 mock 返回值
      mockInvoke.mockResolvedValueOnce(mockExportResult);

      // 执行测试
      const result = await service.exportToExcel(exportType, outputPath);

      // 验证结果
      expect(result.success).toBe(true);
      expect(result.filePath).toBe(outputPath);

      // 验证 Tauri 命令调用
      expect(mockInvoke).toHaveBeenCalledWith('export_to_excel', {
        exportType,
        outputPath,
      });
    });

    it('应该在导出类型无效时抛出错误', async () => {
      await expect(
        service.exportToExcel('InvalidType' as any),
      ).rejects.toThrow('无效的导出类型');
    });

    it('应该在输出路径扩展名无效时抛出错误', async () => {
      await expect(
        service.exportToExcel('ClassSchedule', '/path/to/file.txt'),
      ).rejects.toThrow('输出文件必须是 .xlsx 格式');
    });

    it('应该在输出路径包含路径遍历时抛出错误', async () => {
      await expect(
        service.exportToExcel('ClassSchedule', '../../../etc/passwd.xlsx'),
      ).rejects.toThrow('输出路径包含非法字符');
    });

    it('应该支持所有导出类型', async () => {
      const exportTypes = [
        'ClassSchedule',
        'TeacherSchedule',
        'MasterSchedule',
        'WorkloadStatistics',
      ] as const;

      for (const exportType of exportTypes) {
        mockInvoke.mockResolvedValueOnce({
          success: true,
          file_path: `/path/to/${exportType}.xlsx`,
          message: '导出成功',
        });

        const result = await service.exportToExcel(exportType);
        expect(result.success).toBe(true);
      }

      expect(mockInvoke).toHaveBeenCalledTimes(exportTypes.length);
    });
  });

  // ============================================================================
  // downloadTemplate 方法测试
  // ============================================================================

  describe('downloadTemplate', () => {
    it('应该成功生成导入模板', async () => {
      // 准备测试数据
      const mockTemplateResult = {
        success: true,
        file_path: '/path/to/template.xlsx',
        message: '模板生成成功',
      };

      // 设置 mock 返回值
      mockInvoke.mockResolvedValueOnce(mockTemplateResult);

      // 执行测试
      const result = await service.downloadTemplate();

      // 验证结果
      expect(result.success).toBe(true);
      expect(result.filePath).toBe('/path/to/template.xlsx');
      expect(result.message).toBe('模板生成成功');

      // 验证 Tauri 命令调用
      expect(mockInvoke).toHaveBeenCalledTimes(1);
      expect(mockInvoke).toHaveBeenCalledWith('download_import_template');
    });

    it('应该处理模板生成失败的情况', async () => {
      // 设置 mock 抛出错误
      mockInvoke.mockRejectedValueOnce(new Error('磁盘空间不足'));

      // 执行测试并验证错误
      await expect(service.downloadTemplate()).rejects.toThrow(
        '生成导入模板失败: 磁盘空间不足',
      );
    });
  });

  // ============================================================================
  // validateImportFile 方法测试
  // ============================================================================

  describe('validateImportFile', () => {
    it('应该成功验证有效的导入文件', async () => {
      // 准备测试数据
      const filePath = '/path/to/valid.xlsx';
      const mockValidationResult = {
        is_valid: true,
        errors: [],
        warnings: [],
      };

      // 设置 mock 返回值
      mockInvoke.mockResolvedValueOnce(mockValidationResult);

      // 执行测试
      const result = await service.validateImportFile(filePath);

      // 验证结果
      expect(result.isValid).toBe(true);
      expect(result.errors).toEqual([]);
      expect(result.warnings).toEqual([]);

      // 验证 Tauri 命令调用
      expect(mockInvoke).toHaveBeenCalledWith('validate_import_file', {
        filePath,
      });
    });

    it('应该返回验证错误', async () => {
      // 准备测试数据
      const filePath = '/path/to/invalid.xlsx';
      const mockValidationResult = {
        is_valid: false,
        errors: ['缺少教师信息工作表', '课程配置格式错误'],
        warnings: ['某些可选字段为空'],
      };

      // 设置 mock 返回值
      mockInvoke.mockResolvedValueOnce(mockValidationResult);

      // 执行测试
      const result = await service.validateImportFile(filePath);

      // 验证结果
      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(2);
      expect(result.warnings).toHaveLength(1);
    });

    it('应该在文件路径为空时抛出错误', async () => {
      await expect(service.validateImportFile('')).rejects.toThrow(
        '文件路径不能为空',
      );
    });

    it('应该在文件扩展名无效时抛出错误', async () => {
      await expect(service.validateImportFile('/path/to/file.csv')).rejects.toThrow(
        '不支持的文件类型',
      );
    });
  });

  // ============================================================================
  // 私有方法测试（通过公共方法间接测试）
  // ============================================================================

  describe('私有方法验证', () => {
    it('应该正确生成默认输出路径', async () => {
      // 准备测试数据
      const mockExportResult = {
        success: true,
        file_path: '/path/to/output.xlsx',
        message: '导出成功',
      };

      mockInvoke.mockResolvedValueOnce(mockExportResult);

      // 执行测试（不提供输出路径）
      await service.exportToExcel('ClassSchedule');

      // 验证生成的路径格式
      const callArgs = mockInvoke.mock.calls[0][1] as any;
      expect(callArgs.outputPath).toMatch(/^exports\/班级课表_\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}\.xlsx$/);
    });

    it('应该为不同导出类型生成不同的文件名', async () => {
      const exportTypes = [
        { type: 'ClassSchedule', name: '班级课表' },
        { type: 'TeacherSchedule', name: '教师课表' },
        { type: 'MasterSchedule', name: '总课表' },
        { type: 'WorkloadStatistics', name: '工作量统计' },
      ] as const;

      for (const { type, name } of exportTypes) {
        mockInvoke.mockResolvedValueOnce({
          success: true,
          file_path: `/path/to/${name}.xlsx`,
          message: '导出成功',
        });

        await service.exportToExcel(type);

        const callArgs = mockInvoke.mock.calls[mockInvoke.mock.calls.length - 1][1] as any;
        expect(callArgs.outputPath).toContain(name);
      }
    });
  });

  // ============================================================================
  // 错误处理测试
  // ============================================================================

  describe('错误处理', () => {
    it('应该处理 Tauri 命令调用失败', async () => {
      // 设置 mock 抛出错误
      mockInvoke.mockRejectedValueOnce(new Error('后端服务不可用'));

      // 执行测试并验证错误
      await expect(
        service.validateImportFile('/path/to/file.xlsx'),
      ).rejects.toThrow('验证导入文件失败: 后端服务不可用');
    });

    it('应该处理网络超时错误', async () => {
      // 设置 mock 抛出超时错误
      mockInvoke.mockRejectedValueOnce(new Error('请求超时'));

      // 执行测试并验证错误
      await expect(
        service.exportToExcel('ClassSchedule'),
      ).rejects.toThrow('导出课表到 Excel 失败: 请求超时');
    });

    it('应该处理未知错误', async () => {
      // 设置 mock 抛出非 Error 对象
      mockInvoke.mockRejectedValueOnce('未知错误');

      // 执行测试并验证错误
      await expect(
        service.downloadTemplate(),
      ).rejects.toThrow('生成导入模板失败: 未知错误');
    });
  });

  // ============================================================================
  // 边界条件测试
  // ============================================================================

  describe('边界条件', () => {
    it('应该处理空错误列表', async () => {
      const mockValidationResult = {
        is_valid: true,
        errors: [],
        warnings: [],
      };
      const mockImportResult = {
        success: true,
        success_count: 5,
        failed_count: 0,
        errors: [],
        message: '导入成功',
      };

      mockInvoke
        .mockResolvedValueOnce(mockValidationResult)
        .mockResolvedValueOnce(mockImportResult);

      const result = await service.importFromExcel('/path/to/file.xlsx');

      expect(result.errors).toEqual([]);
    });

    it('应该处理大量错误信息', async () => {
      const errors = Array.from({ length: 100 }, (_, i) => `错误 ${i + 1}`);
      const mockValidationResult = {
        is_valid: false,
        errors,
        warnings: [],
      };

      mockInvoke.mockResolvedValueOnce(mockValidationResult);

      const result = await service.importFromExcel('/path/to/file.xlsx');

      expect(result.errors).toHaveLength(100);
    });

    it('应该处理特殊字符的文件路径', async () => {
      const filePath = '/path/to/文件名_测试-2024.xlsx';
      const mockValidationResult = {
        is_valid: true,
        errors: [],
        warnings: [],
      };

      mockInvoke.mockResolvedValueOnce(mockValidationResult);

      const result = await service.validateImportFile(filePath);

      expect(result.isValid).toBe(true);
    });
  });
});
