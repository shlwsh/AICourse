/**
 * 教师 API 单元测试
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { TeacherApi } from '@/api/teacher';
import type {
  Teacher,
  TeacherPreference,
  TeacherStatusQuery,
  TeacherStatus,
  WorkloadStatistics,
} from '@/api/teacher';
import { http } from '@/api/http';
import { logger } from '@/utils/logger';

// Mock logger 模块
vi.mock('@/utils/logger', () => ({
  logger: {
    info: vi.fn(),
    debug: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

describe('TeacherApi', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // 重置 http 方法的 mock
    vi.spyOn(http, 'get').mockReset();
    vi.spyOn(http, 'post').mockReset();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('getAllTeachers', () => {
    it('应该成功获取所有教师', async () => {
      // 准备测试数据
      const mockTeachers: Teacher[] = [
        {
          id: 1,
          name: '张老师',
          teachingGroupId: 1,
          createdAt: '2024-01-01T00:00:00Z',
          updatedAt: '2024-01-01T00:00:00Z',
        },
        {
          id: 2,
          name: '李老师',
          teachingGroupId: 2,
          createdAt: '2024-01-01T00:00:00Z',
          updatedAt: '2024-01-01T00:00:00Z',
        },
      ];

      const mockResponse = {
        success: true,
        data: mockTeachers,
        message: '获取成功',
      };

      vi.spyOn(http, 'get').mockResolvedValue(mockResponse);

      // 执行测试
      const result = await TeacherApi.getAllTeachers();

      // 验证结果
      expect(result).toEqual(mockResponse);
      expect(http.get).toHaveBeenCalledWith('/teacher');
      expect(logger.info).toHaveBeenCalledWith('调用获取所有教师 API');
      expect(logger.debug).toHaveBeenCalledWith('获取教师列表成功', {
        count: 2,
      });
    });

    it('应该处理获取教师失败的情况', async () => {
      // 准备错误
      const mockError = new Error('网络错误');
      vi.spyOn(http, 'get').mockRejectedValue(mockError);

      // 执行测试并验证错误
      await expect(TeacherApi.getAllTeachers()).rejects.toThrow('网络错误');
      expect(logger.error).toHaveBeenCalledWith('获取教师列表失败', {
        error: mockError,
      });
    });
  });

  describe('savePreference', () => {
    it('应该成功保存教师偏好', async () => {
      // 准备测试数据
      const mockPreference: TeacherPreference = {
        teacherId: 1,
        preferredSlots: '0x1234567890ABCDEF',
        timeBias: 1,
        weight: 2,
        blockedSlots: '0x0',
      };

      const mockResponse = {
        success: true,
        data: undefined,
        message: '保存成功',
      };

      vi.spyOn(http, 'post').mockResolvedValue(mockResponse);

      // 执行测试
      const result = await TeacherApi.savePreference(mockPreference);

      // 验证结果
      expect(result).toEqual(mockResponse);
      expect(http.post).toHaveBeenCalledWith(
        '/teacher/preference',
        mockPreference,
      );
      expect(logger.info).toHaveBeenCalledWith('调用保存教师偏好 API', {
        teacherId: 1,
      });
      expect(logger.debug).toHaveBeenCalledWith('保存教师偏好成功', {
        teacherId: 1,
      });
    });

    it('应该处理保存教师偏好失败的情况', async () => {
      // 准备测试数据和错误
      const mockPreference: TeacherPreference = {
        teacherId: 1,
        preferredSlots: '0x1234567890ABCDEF',
        timeBias: 1,
        weight: 2,
        blockedSlots: '0x0',
      };

      const mockError = new Error('保存失败');
      vi.spyOn(http, 'post').mockRejectedValue(mockError);

      // 执行测试并验证错误
      await expect(TeacherApi.savePreference(mockPreference)).rejects.toThrow(
        '保存失败',
      );
      expect(logger.error).toHaveBeenCalledWith('保存教师偏好失败', {
        teacherId: 1,
        error: mockError,
      });
    });
  });

  describe('batchSavePreferences', () => {
    it('应该成功批量保存教师偏好', async () => {
      // 准备测试数据
      const mockPreferences: TeacherPreference[] = [
        {
          teacherId: 1,
          preferredSlots: '0x1234567890ABCDEF',
          timeBias: 1,
          weight: 2,
          blockedSlots: '0x0',
        },
        {
          teacherId: 2,
          preferredSlots: '0xFEDCBA0987654321',
          timeBias: 2,
          weight: 1,
          blockedSlots: '0x0',
        },
      ];

      const mockResponse = {
        success: true,
        data: undefined,
        message: '批量保存成功',
      };

      vi.spyOn(http, 'post').mockResolvedValue(mockResponse);

      // 执行测试
      const result = await TeacherApi.batchSavePreferences(mockPreferences);

      // 验证结果
      expect(result).toEqual(mockResponse);
      expect(http.post).toHaveBeenCalledWith('/teacher/preferences/batch', {
        preferences: mockPreferences,
      });
      expect(logger.info).toHaveBeenCalledWith('调用批量保存教师偏好 API', {
        count: 2,
      });
      expect(logger.debug).toHaveBeenCalledWith('批量保存教师偏好成功', {
        count: 2,
      });
    });

    it('应该处理批量保存教师偏好失败的情况', async () => {
      // 准备测试数据和错误
      const mockPreferences: TeacherPreference[] = [
        {
          teacherId: 1,
          preferredSlots: '0x1234567890ABCDEF',
          timeBias: 1,
          weight: 2,
          blockedSlots: '0x0',
        },
      ];

      const mockError = new Error('批量保存失败');
      vi.spyOn(http, 'post').mockRejectedValue(mockError);

      // 执行测试并验证错误
      await expect(
        TeacherApi.batchSavePreferences(mockPreferences),
      ).rejects.toThrow('批量保存失败');
      expect(logger.error).toHaveBeenCalledWith('批量保存教师偏好失败', {
        count: 1,
        error: mockError,
      });
    });
  });

  describe('queryStatus', () => {
    it('应该成功查询教师状态', async () => {
      // 准备测试数据
      const mockQuery: TeacherStatusQuery = {
        day: 1,
        period: 2,
      };

      const mockStatuses: TeacherStatus[] = [
        {
          teacherId: 1,
          teacherName: '张老师',
          isBusy: true,
          currentClass: 101,
          currentSubject: '数学',
        },
        {
          teacherId: 2,
          teacherName: '李老师',
          isBusy: false,
        },
      ];

      const mockResponse = {
        success: true,
        data: mockStatuses,
        message: '查询成功',
      };

      vi.spyOn(http, 'post').mockResolvedValue(mockResponse);

      // 执行测试
      const result = await TeacherApi.queryStatus(mockQuery);

      // 验证结果
      expect(result).toEqual(mockResponse);
      expect(http.post).toHaveBeenCalledWith('/teacher/status', mockQuery);
      expect(logger.info).toHaveBeenCalledWith('调用查询教师状态 API', {
        day: 1,
        period: 2,
      });
      expect(logger.debug).toHaveBeenCalledWith('查询教师状态成功', {
        day: 1,
        period: 2,
        count: 2,
      });
    });

    it('应该处理查询教师状态失败的情况', async () => {
      // 准备测试数据和错误
      const mockQuery: TeacherStatusQuery = {
        day: 1,
        period: 2,
      };

      const mockError = new Error('查询失败');
      vi.spyOn(http, 'post').mockRejectedValue(mockError);

      // 执行测试并验证错误
      await expect(TeacherApi.queryStatus(mockQuery)).rejects.toThrow(
        '查询失败',
      );
      expect(logger.error).toHaveBeenCalledWith('查询教师状态失败', {
        day: 1,
        period: 2,
        error: mockError,
      });
    });
  });

  describe('getWorkloadStatistics', () => {
    it('应该成功获取工作量统计', async () => {
      // 准备测试数据
      const mockStatistics: WorkloadStatistics[] = [
        {
          teacherId: 1,
          teacherName: '张老师',
          totalSessions: 20,
          classCount: 3,
          subjects: ['数学', '物理'],
          earlySessions: 5,
          lateSessions: 3,
        },
        {
          teacherId: 2,
          teacherName: '李老师',
          totalSessions: 18,
          classCount: 2,
          subjects: ['语文'],
          earlySessions: 4,
          lateSessions: 2,
        },
      ];

      const mockResponse = {
        success: true,
        data: mockStatistics,
        message: '获取成功',
      };

      vi.spyOn(http, 'get').mockResolvedValue(mockResponse);

      // 执行测试
      const result = await TeacherApi.getWorkloadStatistics();

      // 验证结果
      expect(result).toEqual(mockResponse);
      expect(http.get).toHaveBeenCalledWith('/teacher/workload');
      expect(logger.info).toHaveBeenCalledWith('调用获取工作量统计 API');
      expect(logger.debug).toHaveBeenCalledWith('获取工作量统计成功', {
        count: 2,
      });
    });

    it('应该处理获取工作量统计失败的情况', async () => {
      // 准备错误
      const mockError = new Error('获取失败');
      vi.spyOn(http, 'get').mockRejectedValue(mockError);

      // 执行测试并验证错误
      await expect(TeacherApi.getWorkloadStatistics()).rejects.toThrow(
        '获取失败',
      );
      expect(logger.error).toHaveBeenCalledWith('获取工作量统计失败', {
        error: mockError,
      });
    });
  });
});
