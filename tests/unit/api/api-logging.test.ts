/**
 * API 日志记录功能测试
 * 验证所有 API 调用都有完善的日志记录
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { logger } from '@/utils/logger';
import ScheduleApi from '@/api/schedule';
import TeacherApi from '@/api/teacher';
import ImportExportApi from '@/api/importExport';

// Mock logger
const mockLogger = {
  info: vi.fn(),
  debug: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
};

vi.mock('@/utils/logger', () => ({
  logger: mockLogger,
}));

// Mock http client
const mockHttp = {
  get: vi.fn(),
  post: vi.fn(),
  put: vi.fn(),
  delete: vi.fn(),
  patch: vi.fn(),
};

vi.mock('@/api/http', () => ({
  http: mockHttp,
}));

describe('API 日志记录功能测试', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('ScheduleApi 日志记录', () => {
    it('应该记录生成课表 API 的完整日志', async () => {
      // 模拟成功响应
      mockHttp.post.mockResolvedValue({
        success: true,
        data: { entries: [], cost: 0, metadata: {} },
      });

      await ScheduleApi.generate();

      // 验证请求开始日志（INFO 级别）
      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.stringContaining('生成课表 API'),
        expect.any(Object),
      );

      // 验证响应成功日志包含响应时间
      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.stringContaining('响应成功'),
        expect.objectContaining({
          responseTime: expect.stringMatching(/\d+ms/),
        }),
      );
    });

    it('应该记录移动课程 API 的请求参数', async () => {
      mockHttp.post.mockResolvedValue({ success: true });

      const params = {
        classId: 1,
        subjectId: 'math',
        teacherId: 10,
        fromSlot: { day: 0, period: 0 },
        toSlot: { day: 1, period: 1 },
      };

      await ScheduleApi.moveEntry(
        params.classId,
        params.subjectId,
        params.teacherId,
        params.fromSlot,
        params.toSlot,
      );

      // 验证请求参数日志（DEBUG 级别）
      expect(mockLogger.debug).toHaveBeenCalledWith(
        expect.stringContaining('请求参数'),
        expect.objectContaining({
          classId: params.classId,
          subjectId: params.subjectId,
        }),
      );
    });

    it('应该记录响应失败日志', async () => {
      mockHttp.post.mockResolvedValue({
        success: false,
        error: '生成课表失败',
      });

      await ScheduleApi.generate();

      // 验证响应失败日志（ERROR 级别）
      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.stringContaining('响应失败'),
        expect.objectContaining({
          error: '生成课表失败',
          responseTime: expect.stringMatching(/\d+ms/),
        }),
      );
    });

    it('应该记录请求异常日志', async () => {
      const error = new Error('网络错误');
      mockHttp.post.mockRejectedValue(error);

      await expect(
        ScheduleApi.detectConflicts(1, 'math', 10),
      ).rejects.toThrow('网络错误');

      // 验证请求异常日志（ERROR 级别）
      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.stringContaining('请求异常'),
        expect.objectContaining({
          error: '网络错误',
          responseTime: expect.stringMatching(/\d+ms/),
        }),
      );
    });
  });

  describe('TeacherApi 日志记录', () => {
    it('应该记录获取所有教师 API 的完整日志', async () => {
      mockHttp.get.mockResolvedValue({
        success: true,
        data: [{ id: 1, name: '张老师' }],
      });

      await TeacherApi.getAllTeachers();

      // 验证请求开始日志
      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.stringContaining('获取所有教师 API'),
        expect.any(Object),
      );

      // 验证响应成功日志包含数据数量
      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.stringContaining('响应成功'),
        expect.objectContaining({
          count: 1,
          responseTime: expect.stringMatching(/\d+ms/),
        }),
      );
    });

    it('应该记录保存教师偏好 API 的请求参数', async () => {
      mockHttp.post.mockResolvedValue({ success: true });

      const preference = {
        teacherId: 1,
        preferredSlots: '0',
        timeBias: 0,
        weight: 1,
        blockedSlots: '0',
      };

      await TeacherApi.savePreference(preference);

      // 验证请求参数日志
      expect(mockLogger.debug).toHaveBeenCalledWith(
        expect.stringContaining('请求参数'),
        expect.objectContaining({
          preference,
        }),
      );
    });

    it('应该记录批量保存教师偏好的数量', async () => {
      mockHttp.post.mockResolvedValue({ success: true });

      const preferences = [
        {
          teacherId: 1,
          preferredSlots: '0',
          timeBias: 0,
          weight: 1,
          blockedSlots: '0',
        },
        {
          teacherId: 2,
          preferredSlots: '0',
          timeBias: 1,
          weight: 2,
          blockedSlots: '0',
        },
      ];

      await TeacherApi.batchSavePreferences(preferences);

      // 验证日志包含数量信息
      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.stringContaining('批量保存教师偏好 API'),
        expect.objectContaining({
          count: 2,
        }),
      );
    });
  });

  describe('ImportExportApi 日志记录', () => {
    it('应该记录从 Excel 导入数据的文件信息', async () => {
      const mockFile = new File(['test content'], 'test.xlsx', {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });

      // Mock fetch
      global.fetch = vi.fn().mockResolvedValue({
        json: async () => ({
          success: true,
          data: {
            successCount: 10,
            failureCount: 0,
          },
        }),
      });

      await ImportExportApi.importFromExcel({
        file: mockFile,
        conflictStrategy: 'skip',
      });

      // 验证请求开始日志包含文件信息
      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.stringContaining('导入数据 API'),
        expect.objectContaining({
          fileName: 'test.xlsx',
          fileSize: expect.any(Number),
          conflictStrategy: 'skip',
        }),
      );

      // 验证请求参数日志
      expect(mockLogger.debug).toHaveBeenCalledWith(
        expect.stringContaining('请求参数'),
        expect.objectContaining({
          fileName: 'test.xlsx',
        }),
      );
    });

    it('应该记录导出数据的导出类型和目标数量', async () => {
      mockHttp.post.mockResolvedValue({
        success: true,
        data: {
          fileUrl: '/downloads/schedule.xlsx',
          fileName: 'schedule.xlsx',
        },
      });

      const params = {
        exportType: 'class' as const,
        targetIds: [1, 2, 3],
        includeWorkload: true,
        templateStyle: 'default',
      };

      await ImportExportApi.exportToExcel(params);

      // 验证请求开始日志包含导出信息
      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.stringContaining('导出数据到 Excel API'),
        expect.objectContaining({
          exportType: 'class',
          targetCount: 3,
          includeWorkload: true,
        }),
      );
    });
  });

  describe('响应时间统计验证', () => {
    it('应该在所有 API 调用中记录响应时间', async () => {
      mockHttp.post.mockResolvedValue({
        success: true,
        data: {},
      });

      await ScheduleApi.generate();

      // 验证响应时间格式
      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          responseTime: expect.stringMatching(/^\d+ms$/),
        }),
      );
    });

    it('应该在请求失败时也记录响应时间', async () => {
      mockHttp.post.mockResolvedValue({
        success: false,
        error: '失败',
      });

      await ScheduleApi.generate();

      // 验证失败日志中包含响应时间
      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.stringContaining('响应失败'),
        expect.objectContaining({
          responseTime: expect.stringMatching(/^\d+ms$/),
        }),
      );
    });

    it('应该在请求异常时也记录响应时间', async () => {
      const error = new Error('异常');
      mockHttp.get.mockRejectedValue(error);

      await expect(TeacherApi.getAllTeachers()).rejects.toThrow('异常');

      // 验证异常日志中包含响应时间
      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.stringContaining('请求异常'),
        expect.objectContaining({
          responseTime: expect.stringMatching(/^\d+ms$/),
        }),
      );
    });
  });

  describe('日志级别验证', () => {
    it('应该使用正确的日志级别', async () => {
      mockHttp.post.mockResolvedValue({
        success: true,
        data: {},
      });

      await ScheduleApi.generate();

      // 验证使用了 INFO 级别记录请求开始
      expect(mockLogger.info).toHaveBeenCalled();

      // 验证使用了 INFO 级别记录响应成功
      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.stringContaining('响应成功'),
        expect.any(Object),
      );
    });

    it('应该使用 ERROR 级别记录失败', async () => {
      mockHttp.post.mockResolvedValue({
        success: false,
        error: '操作失败',
      });

      await ScheduleApi.generate();

      // 验证使用 ERROR 级别
      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.stringContaining('响应失败'),
        expect.objectContaining({
          error: '操作失败',
        }),
      );
    });
  });
});
