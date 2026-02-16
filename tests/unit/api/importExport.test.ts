/**
 * 导入导出 API 单元测试
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ImportExportApi } from '@/api/importExport';
import type {
  ImportFromExcelParams,
  ExportToExcelParams,
  DownloadTemplateParams,
  ImportResult,
  ExportResult,
} from '@/api/importExport';

// Mock fetch 全局函数
global.fetch = vi.fn();

// Mock logger
vi.mock('@/utils/logger', () => ({
  logger: {
    info: vi.fn(),
    debug: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

// Mock http 客户端
vi.mock('@/api/http', () => ({
  http: {
    baseURL: '/api',
    get: vi.fn(),
    post: vi.fn(),
  },
  ApiResponse: {},
}));

describe('ImportExportApi', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('importFromExcel', () => {
    it('应该成功导入 Excel 文件', async () => {
      // 准备测试数据
      const mockFile = new File(['test content'], 'test.xlsx', {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });

      const params: ImportFromExcelParams = {
        file: mockFile,
        conflictStrategy: 'overwrite',
      };

      const mockResult: ImportResult = {
        success: true,
        successCount: 10,
        failureCount: 0,
        message: '导入成功',
      };

      // Mock fetch 响应
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: mockResult,
        }),
      });

      // 执行测试
      const response = await ImportExportApi.importFromExcel(params);

      // 验证结果
      expect(response.success).toBe(true);
      expect(response.data?.successCount).toBe(10);
      expect(response.data?.failureCount).toBe(0);

      // 验证 fetch 调用
      expect(global.fetch).toHaveBeenCalledTimes(1);
      const fetchCall = (global.fetch as any).mock.calls[0];
      expect(fetchCall[0]).toBe('/api/import-export/import');
      expect(fetchCall[1].method).toBe('POST');
      expect(fetchCall[1].body).toBeInstanceOf(FormData);
    });

    it('应该处理导入失败的情况', async () => {
      // 准备测试数据
      const mockFile = new File(['test content'], 'test.xlsx', {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });

      const params: ImportFromExcelParams = {
        file: mockFile,
      };

      const mockResult: ImportResult = {
        success: false,
        successCount: 5,
        failureCount: 5,
        errors: [
          { row: 2, field: 'name', reason: '教师姓名不能为空' },
          { row: 3, field: 'subject', reason: '科目不存在' },
        ],
        message: '部分数据导入失败',
      };

      // Mock fetch 响应
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: false,
          data: mockResult,
          error: '部分数据导入失败',
        }),
      });

      // 执行测试
      const response = await ImportExportApi.importFromExcel(params);

      // 验证结果
      expect(response.success).toBe(false);
      expect(response.data?.successCount).toBe(5);
      expect(response.data?.failureCount).toBe(5);
      expect(response.data?.errors).toHaveLength(2);
    });

    it('应该处理网络错误', async () => {
      // 准备测试数据
      const mockFile = new File(['test content'], 'test.xlsx', {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });

      const params: ImportFromExcelParams = {
        file: mockFile,
      };

      // Mock fetch 抛出错误
      (global.fetch as any).mockRejectedValueOnce(new Error('网络连接失败'));

      // 执行测试并验证错误
      await expect(ImportExportApi.importFromExcel(params)).rejects.toThrow(
        '网络连接失败',
      );
    });
  });

  describe('exportToExcel', () => {
    it('应该成功导出班级课表', async () => {
      // 准备测试数据
      const params: ExportToExcelParams = {
        exportType: 'class',
        targetIds: [1, 2, 3],
        includeWorkload: false,
      };

      const mockResult: ExportResult = {
        success: true,
        fileUrl: '/downloads/class_schedule.xlsx',
        fileName: 'class_schedule.xlsx',
        message: '导出成功',
      };

      // Mock http.post
      const { http } = await import('@/api/http');
      (http.post as any).mockResolvedValueOnce({
        success: true,
        data: mockResult,
      });

      // 执行测试
      const response = await ImportExportApi.exportToExcel(params);

      // 验证结果
      expect(response.success).toBe(true);
      expect(response.data?.fileUrl).toBe('/downloads/class_schedule.xlsx');
      expect(response.data?.fileName).toBe('class_schedule.xlsx');

      // 验证 http.post 调用
      expect(http.post).toHaveBeenCalledWith('/import-export/export', params);
    });

    it('应该成功导出教师课表', async () => {
      // 准备测试数据
      const params: ExportToExcelParams = {
        exportType: 'teacher',
        targetIds: [10, 20],
        includeWorkload: true,
        templateStyle: 'default',
      };

      const mockResult: ExportResult = {
        success: true,
        fileUrl: '/downloads/teacher_schedule.xlsx',
        fileName: 'teacher_schedule.xlsx',
      };

      // Mock http.post
      const { http } = await import('@/api/http');
      (http.post as any).mockResolvedValueOnce({
        success: true,
        data: mockResult,
      });

      // 执行测试
      const response = await ImportExportApi.exportToExcel(params);

      // 验证结果
      expect(response.success).toBe(true);
      expect(response.data?.fileUrl).toBe('/downloads/teacher_schedule.xlsx');
    });

    it('应该处理导出失败的情况', async () => {
      // 准备测试数据
      const params: ExportToExcelParams = {
        exportType: 'all',
      };

      // Mock http.post
      const { http } = await import('@/api/http');
      (http.post as any).mockResolvedValueOnce({
        success: false,
        error: '课表数据不存在',
      });

      // 执行测试
      const response = await ImportExportApi.exportToExcel(params);

      // 验证结果
      expect(response.success).toBe(false);
      expect(response.error).toBe('课表数据不存在');
    });
  });

  describe('downloadTemplate', () => {
    it('应该成功下载教师模板', async () => {
      // 准备测试数据
      const params: DownloadTemplateParams = {
        templateType: 'teacher',
      };

      const mockResult = {
        fileUrl: '/templates/teacher_template.xlsx',
        fileName: 'teacher_template.xlsx',
      };

      // Mock http.get
      const { http } = await import('@/api/http');
      (http.get as any).mockResolvedValueOnce({
        success: true,
        data: mockResult,
      });

      // 执行测试
      const response = await ImportExportApi.downloadTemplate(params);

      // 验证结果
      expect(response.success).toBe(true);
      expect(response.data?.fileUrl).toBe('/templates/teacher_template.xlsx');
      expect(response.data?.fileName).toBe('teacher_template.xlsx');

      // 验证 http.get 调用
      expect(http.get).toHaveBeenCalledWith('/import-export/template', {
        params: {
          templateType: 'teacher',
        },
      });
    });

    it('应该成功下载科目模板', async () => {
      // 准备测试数据
      const params: DownloadTemplateParams = {
        templateType: 'subject',
      };

      const mockResult = {
        fileUrl: '/templates/subject_template.xlsx',
        fileName: 'subject_template.xlsx',
      };

      // Mock http.get
      const { http } = await import('@/api/http');
      (http.get as any).mockResolvedValueOnce({
        success: true,
        data: mockResult,
      });

      // 执行测试
      const response = await ImportExportApi.downloadTemplate(params);

      // 验证结果
      expect(response.success).toBe(true);
      expect(response.data?.fileUrl).toBe('/templates/subject_template.xlsx');
    });

    it('应该成功下载教学计划模板', async () => {
      // 准备测试数据
      const params: DownloadTemplateParams = {
        templateType: 'curriculum',
      };

      const mockResult = {
        fileUrl: '/templates/curriculum_template.xlsx',
        fileName: 'curriculum_template.xlsx',
      };

      // Mock http.get
      const { http } = await import('@/api/http');
      (http.get as any).mockResolvedValueOnce({
        success: true,
        data: mockResult,
      });

      // 执行测试
      const response = await ImportExportApi.downloadTemplate(params);

      // 验证结果
      expect(response.success).toBe(true);
      expect(response.data?.fileUrl).toBe(
        '/templates/curriculum_template.xlsx',
      );
    });

    it('应该成功下载所有模板', async () => {
      // 准备测试数据
      const params: DownloadTemplateParams = {
        templateType: 'all',
      };

      const mockResult = {
        fileUrl: '/templates/all_templates.xlsx',
        fileName: 'all_templates.xlsx',
      };

      // Mock http.get
      const { http } = await import('@/api/http');
      (http.get as any).mockResolvedValueOnce({
        success: true,
        data: mockResult,
      });

      // 执行测试
      const response = await ImportExportApi.downloadTemplate(params);

      // 验证结果
      expect(response.success).toBe(true);
      expect(response.data?.fileUrl).toBe('/templates/all_templates.xlsx');
    });
  });

  describe('triggerDownload', () => {
    it('应该触发文件下载', () => {
      // Mock document 对象
      const mockLink = {
        href: '',
        download: '',
        style: { display: '' },
        click: vi.fn(),
      };

      // Mock document.createElement
      const originalCreateElement = global.document?.createElement;
      global.document = {
        ...global.document,
        createElement: vi.fn().mockReturnValue(mockLink),
        body: {
          ...global.document?.body,
          appendChild: vi.fn(),
          removeChild: vi.fn(),
        },
      } as any;

      // 执行测试
      ImportExportApi.triggerDownload(
        '/downloads/test.xlsx',
        'test.xlsx',
      );

      // 验证结果
      expect(global.document.createElement).toHaveBeenCalledWith('a');
      expect(mockLink.href).toBe('/downloads/test.xlsx');
      expect(mockLink.download).toBe('test.xlsx');
      expect(mockLink.style.display).toBe('none');
      expect(global.document.body.appendChild).toHaveBeenCalledWith(mockLink);
      expect(mockLink.click).toHaveBeenCalled();
      expect(global.document.body.removeChild).toHaveBeenCalledWith(mockLink);

      // 清理
      if (originalCreateElement) {
        global.document.createElement = originalCreateElement;
      }
    });

    it('应该处理下载触发失败的情况', () => {
      // Mock document.createElement 抛出错误
      const originalCreateElement = global.document?.createElement;
      global.document = {
        ...global.document,
        createElement: vi.fn().mockImplementation(() => {
          throw new Error('DOM 操作失败');
        }),
      } as any;

      // 执行测试并验证错误
      expect(() => {
        ImportExportApi.triggerDownload('/downloads/test.xlsx', 'test.xlsx');
      }).toThrow('DOM 操作失败');

      // 清理
      if (originalCreateElement) {
        global.document.createElement = originalCreateElement;
      }
    });
  });
});
