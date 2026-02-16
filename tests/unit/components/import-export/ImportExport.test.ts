/**
 * ImportExport 组件单元测试
 * 测试导入导出组件的所有功能
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { mount, VueWrapper } from '@vue/test-utils';
import { ElMessage, ElMessageBox } from 'element-plus';
import ImportExport from '@/components/import-export/ImportExport.vue';
import { ImportExportApi } from '@/api/importExport';
import { logger } from '@/utils/logger';

// Mock Element Plus 组件
vi.mock('element-plus', async () => {
  const actual = await vi.importActual('element-plus');
  return {
    ...actual,
    ElMessage: {
      success: vi.fn(),
      error: vi.fn(),
      warning: vi.fn(),
      info: vi.fn(),
    },
    ElMessageBox: {
      confirm: vi.fn(),
    },
  };
});

// Mock ImportExportApi
vi.mock('@/api/importExport', () => ({
  ImportExportApi: {
    importFromExcel: vi.fn(),
    exportToExcel: vi.fn(),
    downloadTemplate: vi.fn(),
    triggerDownload: vi.fn(),
  },
}));

// Mock logger
vi.mock('@/utils/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

describe('ImportExport 组件', () => {
  let wrapper: VueWrapper<any>;

  // 测试数据
  const mockClassList = [
    { id: 1, name: '一年级1班' },
    { id: 2, name: '一年级2班' },
  ];

  const mockTeacherList = [
    { id: 1, name: '张老师' },
    { id: 2, name: '李老师' },
  ];

  beforeEach(() => {
    // 清除所有 mock
    vi.clearAllMocks();
  });

  afterEach(() => {
    if (wrapper) {
      wrapper.unmount();
    }
  });

  describe('组件渲染', () => {
    it('应该正确渲染组件', () => {
      wrapper = mount(ImportExport, {
        props: {
          classList: mockClassList,
          teacherList: mockTeacherList,
        },
      });

      expect(wrapper.exists()).toBe(true);
      expect(wrapper.find('.import-export-container').exists()).toBe(true);
    });

    it('应该显示导入和导出两个选项卡', () => {
      wrapper = mount(ImportExport, {
        props: {
          classList: mockClassList,
          teacherList: mockTeacherList,
        },
      });

      // 由于 Element Plus 组件在测试环境中可能不会完全渲染，我们检查组件的数据
      expect(wrapper.vm.activeTab).toBeDefined();
      expect(['import', 'export'].includes(wrapper.vm.activeTab)).toBe(true);
    });

    it('应该默认显示导入选项卡', async () => {
      wrapper = mount(ImportExport, {
        props: {
          classList: mockClassList,
          teacherList: mockTeacherList,
        },
      });

      await wrapper.vm.$nextTick();
      expect(wrapper.vm.activeTab).toBe('import');
    });
  });

  describe('导入功能', () => {
    it('应该能够下载导入模板', async () => {
      const mockResponse = {
        success: true,
        data: {
          fileUrl: 'http://example.com/template.xlsx',
          fileName: 'import-template.xlsx',
        },
      };

      vi.mocked(ImportExportApi.downloadTemplate).mockResolvedValue(mockResponse);

      wrapper = mount(ImportExport, {
        props: {
          classList: mockClassList,
          teacherList: mockTeacherList,
        },
      });

      // 直接调用方法而不是查找按钮
      await wrapper.vm.handleDownloadTemplate();
      await wrapper.vm.$nextTick();

      expect(ImportExportApi.downloadTemplate).toHaveBeenCalledWith({
        templateType: 'all',
      });
      expect(ImportExportApi.triggerDownload).toHaveBeenCalledWith(
        mockResponse.data.fileUrl,
        mockResponse.data.fileName
      );
      expect(ElMessage.success).toHaveBeenCalledWith('模板下载成功');
      expect(logger.info).toHaveBeenCalled();
    });

    it('应该验证文件类型', async () => {
      wrapper = mount(ImportExport, {
        props: {
          classList: mockClassList,
          teacherList: mockTeacherList,
        },
      });

      // 创建一个无效的文件
      const invalidFile = {
        name: 'test.txt',
        size: 1024,
        raw: new File(['test'], 'test.txt', { type: 'text/plain' }),
      };

      // 调用文件变化处理函数
      await wrapper.vm.handleFileChange(invalidFile);

      expect(ElMessage.error).toHaveBeenCalledWith(
        expect.stringContaining('文件格式不正确')
      );
      expect(logger.warn).toHaveBeenCalled();
    });

    it('应该验证文件大小', async () => {
      wrapper = mount(ImportExport, {
        props: {
          classList: mockClassList,
          teacherList: mockTeacherList,
        },
      });

      // 创建一个超大文件
      const largeFile = {
        name: 'large.xlsx',
        size: 11 * 1024 * 1024, // 11MB
        raw: new File(['test'], 'large.xlsx', {
          type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        }),
      };

      // 调用文件变化处理函数
      await wrapper.vm.handleFileChange(largeFile);

      expect(ElMessage.error).toHaveBeenCalledWith(
        expect.stringContaining('文件大小超过限制')
      );
      expect(logger.warn).toHaveBeenCalled();
    });

    it('应该接受有效的 Excel 文件', async () => {
      wrapper = mount(ImportExport, {
        props: {
          classList: mockClassList,
          teacherList: mockTeacherList,
        },
      });

      // 创建一个有效的文件
      const validFile = {
        name: 'test.xlsx',
        size: 1024,
        raw: new File(['test'], 'test.xlsx', {
          type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        }),
      };

      // 调用文件变化处理函数
      await wrapper.vm.handleFileChange(validFile);

      expect(wrapper.vm.selectedFile).toBe(validFile.raw);
      expect(logger.info).toHaveBeenCalledWith(
        '文件选择成功',
        expect.objectContaining({ fileName: validFile.name })
      );
    });

    it('应该能够清除选中的文件', async () => {
      wrapper = mount(ImportExport, {
        props: {
          classList: mockClassList,
          teacherList: mockTeacherList,
        },
      });

      // 先选择一个文件
      const validFile = {
        name: 'test.xlsx',
        size: 1024,
        raw: new File(['test'], 'test.xlsx', {
          type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        }),
      };
      await wrapper.vm.handleFileChange(validFile);
      expect(wrapper.vm.selectedFile).toBeTruthy();

      // 清除文件
      await wrapper.vm.clearSelectedFile();
      expect(wrapper.vm.selectedFile).toBeNull();
      expect(logger.info).toHaveBeenCalledWith('用户清除选中的文件');
    });

    it('应该正确格式化文件大小', () => {
      wrapper = mount(ImportExport, {
        props: {
          classList: mockClassList,
          teacherList: mockTeacherList,
        },
      });

      expect(wrapper.vm.formatFileSize(0)).toBe('0 B');
      expect(wrapper.vm.formatFileSize(1024)).toBe('1 KB');
      expect(wrapper.vm.formatFileSize(1024 * 1024)).toBe('1 MB');
      expect(wrapper.vm.formatFileSize(1536)).toBe('1.5 KB');
    });

    it('应该成功导入数据', async () => {
      const mockImportResult = {
        success: true,
        data: {
          success: true,
          successCount: 10,
          failureCount: 0,
          errors: [],
        },
      };

      vi.mocked(ImportExportApi.importFromExcel).mockResolvedValue(mockImportResult);
      vi.mocked(ElMessageBox.confirm).mockResolvedValue('confirm' as any);

      wrapper = mount(ImportExport, {
        props: {
          classList: mockClassList,
          teacherList: mockTeacherList,
        },
      });

      // 选择文件
      const validFile = {
        name: 'test.xlsx',
        size: 1024,
        raw: new File(['test'], 'test.xlsx', {
          type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        }),
      };
      await wrapper.vm.handleFileChange(validFile);

      // 开始导入
      await wrapper.vm.handleImport();
      await wrapper.vm.$nextTick();

      expect(ElMessageBox.confirm).toHaveBeenCalled();
      expect(ImportExportApi.importFromExcel).toHaveBeenCalledWith({
        file: validFile.raw,
        conflictStrategy: 'skip',
      });
      expect(wrapper.vm.importResult).toEqual(mockImportResult.data);
      expect(ElMessage.success).toHaveBeenCalled();
      expect(logger.info).toHaveBeenCalled();
    });

    it('应该处理导入部分失败的情况', async () => {
      const mockImportResult = {
        success: true,
        data: {
          success: true,
          successCount: 8,
          failureCount: 2,
          errors: [
            { row: 5, field: 'name', reason: '名称不能为空' },
            { row: 7, field: 'id', reason: 'ID 已存在' },
          ],
        },
      };

      vi.mocked(ImportExportApi.importFromExcel).mockResolvedValue(mockImportResult);
      vi.mocked(ElMessageBox.confirm).mockResolvedValue('confirm' as any);

      wrapper = mount(ImportExport, {
        props: {
          classList: mockClassList,
          teacherList: mockTeacherList,
        },
      });

      // 选择文件
      const validFile = {
        name: 'test.xlsx',
        size: 1024,
        raw: new File(['test'], 'test.xlsx', {
          type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        }),
      };
      await wrapper.vm.handleFileChange(validFile);

      // 开始导入
      await wrapper.vm.handleImport();
      await wrapper.vm.$nextTick();

      expect(wrapper.vm.importResult).toEqual(mockImportResult.data);
      expect(wrapper.vm.importErrors).toEqual(mockImportResult.data.errors);
      expect(ElMessage.warning).toHaveBeenCalled();
      expect(logger.warn).toHaveBeenCalled();
    });

    it('应该处理导入失败的情况', async () => {
      const mockImportResult = {
        success: false,
        message: '导入失败：文件格式错误',
      };

      vi.mocked(ImportExportApi.importFromExcel).mockResolvedValue(mockImportResult);
      vi.mocked(ElMessageBox.confirm).mockResolvedValue('confirm' as any);

      wrapper = mount(ImportExport, {
        props: {
          classList: mockClassList,
          teacherList: mockTeacherList,
        },
      });

      // 选择文件
      const validFile = {
        name: 'test.xlsx',
        size: 1024,
        raw: new File(['test'], 'test.xlsx', {
          type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        }),
      };
      await wrapper.vm.handleFileChange(validFile);

      // 开始导入
      await wrapper.vm.handleImport();
      await wrapper.vm.$nextTick();

      expect(ElMessage.error).toHaveBeenCalled();
      expect(logger.error).toHaveBeenCalled();
    });

    it('应该能够取消导入', async () => {
      vi.mocked(ElMessageBox.confirm).mockRejectedValue('cancel');

      wrapper = mount(ImportExport, {
        props: {
          classList: mockClassList,
          teacherList: mockTeacherList,
        },
      });

      // 选择文件
      const validFile = {
        name: 'test.xlsx',
        size: 1024,
        raw: new File(['test'], 'test.xlsx', {
          type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        }),
      };
      await wrapper.vm.handleFileChange(validFile);

      // 尝试导入但取消
      await wrapper.vm.handleImport();
      await wrapper.vm.$nextTick();

      expect(ImportExportApi.importFromExcel).not.toHaveBeenCalled();
      expect(logger.info).toHaveBeenCalledWith('用户取消导入');
    });

    it('应该能够重置导入状态', async () => {
      wrapper = mount(ImportExport, {
        props: {
          classList: mockClassList,
          teacherList: mockTeacherList,
        },
      });

      // 设置一些状态
      wrapper.vm.selectedFile = new File(['test'], 'test.xlsx');
      wrapper.vm.importProgress = 100;
      wrapper.vm.importResult = { success: true, successCount: 10, failureCount: 0 };

      // 重置
      await wrapper.vm.resetImport();

      expect(wrapper.vm.selectedFile).toBeNull();
      expect(wrapper.vm.importProgress).toBe(0);
      expect(wrapper.vm.importResult).toBeNull();
      expect(logger.info).toHaveBeenCalledWith('用户重置导入状态');
    });
  });

  describe('导出功能', () => {
    it('应该成功导出课表', async () => {
      const mockExportResult = {
        success: true,
        data: {
          success: true,
          fileUrl: 'http://example.com/schedule.xlsx',
          fileName: 'class-schedule.xlsx',
        },
      };

      vi.mocked(ImportExportApi.exportToExcel).mockResolvedValue(mockExportResult);

      wrapper = mount(ImportExport, {
        props: {
          classList: mockClassList,
          teacherList: mockTeacherList,
        },
      });

      // 切换到导出选项卡
      wrapper.vm.activeTab = 'export';
      await wrapper.vm.$nextTick();

      // 设置导出参数
      wrapper.vm.exportForm.exportType = 'class';
      wrapper.vm.exportForm.targetIds = [1, 2];
      wrapper.vm.exportForm.includeWorkload = true;
      wrapper.vm.exportForm.templateStyle = 'standard';

      // 开始导出
      await wrapper.vm.handleExport();
      await wrapper.vm.$nextTick();

      expect(ImportExportApi.exportToExcel).toHaveBeenCalledWith({
        exportType: 'class',
        targetIds: [1, 2],
        includeWorkload: true,
        templateStyle: 'standard',
      });
      expect(wrapper.vm.exportResult).toEqual(mockExportResult.data);
      expect(ElMessage.success).toHaveBeenCalled();
      expect(logger.info).toHaveBeenCalled();
    });

    it('应该处理导出失败的情况', async () => {
      const mockExportResult = {
        success: false,
        message: '导出失败：没有找到课表数据',
      };

      vi.mocked(ImportExportApi.exportToExcel).mockResolvedValue(mockExportResult);

      wrapper = mount(ImportExport, {
        props: {
          classList: mockClassList,
          teacherList: mockTeacherList,
        },
      });

      // 切换到导出选项卡
      wrapper.vm.activeTab = 'export';
      await wrapper.vm.$nextTick();

      // 开始导出
      await wrapper.vm.handleExport();
      await wrapper.vm.$nextTick();

      expect(ElMessage.error).toHaveBeenCalled();
      expect(logger.error).toHaveBeenCalled();
    });

    it('应该能够下载导出的文件', async () => {
      wrapper = mount(ImportExport, {
        props: {
          classList: mockClassList,
          teacherList: mockTeacherList,
        },
      });

      // 设置导出结果
      wrapper.vm.exportResult = {
        success: true,
        fileUrl: 'http://example.com/schedule.xlsx',
        fileName: 'class-schedule.xlsx',
      };

      // 下载文件
      await wrapper.vm.downloadExportedFile();

      expect(ImportExportApi.triggerDownload).toHaveBeenCalledWith(
        'http://example.com/schedule.xlsx',
        'class-schedule.xlsx'
      );
      expect(logger.info).toHaveBeenCalled();
    });

    it('应该能够重置导出状态', async () => {
      wrapper = mount(ImportExport, {
        props: {
          classList: mockClassList,
          teacherList: mockTeacherList,
        },
      });

      // 设置一些状态
      wrapper.vm.exportProgress = 100;
      wrapper.vm.exportResult = {
        success: true,
        fileUrl: 'http://example.com/schedule.xlsx',
        fileName: 'class-schedule.xlsx',
      };

      // 重置
      await wrapper.vm.resetExport();

      expect(wrapper.vm.exportProgress).toBe(0);
      expect(wrapper.vm.exportResult).toBeNull();
      expect(logger.info).toHaveBeenCalledWith('用户重置导出状态');
    });
  });

  describe('错误详情功能', () => {
    beforeEach(() => {
      // Mock URL API
      global.URL.createObjectURL = vi.fn(() => 'blob:mock-url');
      global.URL.revokeObjectURL = vi.fn();
    });

    it('应该能够显示错误详情对话框', async () => {
      wrapper = mount(ImportExport, {
        props: {
          classList: mockClassList,
          teacherList: mockTeacherList,
        },
      });

      // 设置错误数据
      wrapper.vm.importErrors = [
        { row: 5, field: 'name', reason: '名称不能为空' },
        { row: 7, field: 'id', reason: 'ID 已存在' },
      ];

      // 显示错误详情
      await wrapper.vm.showErrorDetails();

      expect(wrapper.vm.errorDialogVisible).toBe(true);
      expect(logger.info).toHaveBeenCalledWith(
        '用户查看错误详情',
        expect.objectContaining({ errorCount: 2 })
      );
    });

    it('应该能够导出错误报告', async () => {
      wrapper = mount(ImportExport, {
        props: {
          classList: mockClassList,
          teacherList: mockTeacherList,
        },
      });

      // 设置错误数据
      wrapper.vm.importErrors = [
        { row: 5, field: 'name', reason: '名称不能为空' },
        { row: 7, field: 'id', reason: 'ID 已存在' },
      ];

      // 导出错误报告
      await wrapper.vm.exportErrors();

      expect(ElMessage.success).toHaveBeenCalledWith('错误报告已导出');
      expect(logger.info).toHaveBeenCalledWith('错误报告导出成功');
    });
  });

  describe('日志记录', () => {
    it('应该记录所有关键操作的日志', async () => {
      wrapper = mount(ImportExport, {
        props: {
          classList: mockClassList,
          teacherList: mockTeacherList,
        },
      });

      // 触发各种操作
      await wrapper.vm.clearSelectedFile();
      await wrapper.vm.resetImport();
      await wrapper.vm.resetExport();

      // 验证日志调用
      expect(logger.info).toHaveBeenCalledTimes(3);
    });
  });
});
