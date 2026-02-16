/**
 * TeacherService 单元测试
 *
 * 测试覆盖：
 * - 获取教师列表
 * - 保存教师偏好
 * - 批量保存教师偏好
 * - 查询教师状态
 * - 统计教学工作量
 * - 数据验证
 * - 错误处理
 */

import { describe, it, expect, beforeEach, vi, afterEach, Mock } from 'vitest';
import { TeacherService } from './teacher-service';
import type {
  Teacher,
  TeacherPreference,
  TimeSlot,
  TeacherStatusResult,
  WorkloadStatistics,
} from './teacher-service';

// Mock Tauri invoke 函数
vi.mock('@tauri-apps/api/tauri', () => ({
  invoke: vi.fn(),
}));

import { invoke } from '@tauri-apps/api/tauri';

const mockInvoke = invoke as Mock;

describe('TeacherService', () => {
  let teacherService: TeacherService;

  beforeEach(() => {
    teacherService = new TeacherService();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ============================================================================
  // 辅助函数
  // ============================================================================

  /**
   * 创建模拟教师列表
   */
  function createMockTeachers(): Teacher[] {
    return [
      {
        id: 1001,
        name: '张老师',
        teachingGroupId: 1,
        createdAt: '2024-01-01 00:00:00',
        updatedAt: '2024-01-01 00:00:00',
      },
      {
        id: 1002,
        name: '李老师',
        teachingGroupId: 1,
        createdAt: '2024-01-01 00:00:00',
        updatedAt: '2024-01-01 00:00:00',
      },
      {
        id: 1003,
        name: '王老师',
        teachingGroupId: 2,
        createdAt: '2024-01-01 00:00:00',
        updatedAt: '2024-01-01 00:00:00',
      },
    ];
  }

  /**
   * 创建模拟教师偏好
   */
  function createMockPreference(): TeacherPreference {
    return {
      teacherId: 1001,
      preferredSlots: '18446744073709551615', // 全部时段
      timeBias: 0,
      weight: 1,
      blockedSlots: '0',
    };
  }

  /**
   * 创建模拟教师状态结果
   */
  function createMockTeacherStatus(): TeacherStatusResult {
    return {
      busyTeachers: [
        {
          teacherId: 1001,
          teacherName: '张老师',
          isBusy: true,
          classId: 101,
          subjectId: '数学',
        },
      ],
      freeTeachers: [
        {
          teacherId: 1002,
          teacherName: '李老师',
          isBusy: false,
        },
        {
          teacherId: 1003,
          teacherName: '王老师',
          isBusy: false,
        },
      ],
    };
  }

  /**
   * 创建模拟工作量统计
   */
  function createMockWorkloadStatistics(): WorkloadStatistics[] {
    return [
      {
        teacherId: 1001,
        teacherName: '张老师',
        totalSessions: 18,
        classCount: 3,
        subjects: ['数学'],
        morningSessions: 4,
        eveningSessions: 2,
      },
      {
        teacherId: 1002,
        teacherName: '李老师',
        totalSessions: 16,
        classCount: 4,
        subjects: ['语文'],
        morningSessions: 3,
        eveningSessions: 3,
      },
    ];
  }

  // ============================================================================
  // 获取教师列表测试
  // ============================================================================

  describe('getAllTeachers', () => {
    it('应该成功获取所有教师', async () => {
      const mockTeachers = createMockTeachers();
      mockInvoke.mockResolvedValue({
        teachers: mockTeachers,
        totalCount: mockTeachers.length,
        success: true,
      });

      const result = await teacherService.getAllTeachers();

      expect(invoke).toHaveBeenCalledWith('get_all_teachers', {
        input: {
          teachingGroupId: null,
        },
      });
      expect(result).toEqual(mockTeachers);
      expect(result).toHaveLength(3);
    });

    it('应该支持按教研组筛选教师', async () => {
      const mockTeachers = createMockTeachers().filter((t) => t.teachingGroupId === 1);
      mockInvoke.mockResolvedValue({
        teachers: mockTeachers,
        totalCount: mockTeachers.length,
        success: true,
      });

      const result = await teacherService.getAllTeachers(1);

      expect(invoke).toHaveBeenCalledWith('get_all_teachers', {
        input: {
          teachingGroupId: 1,
        },
      });
      expect(result).toHaveLength(2);
      expect(result.every((t) => t.teachingGroupId === 1)).toBe(true);
    });

    it('应该验证教研组ID', async () => {
      await expect(teacherService.getAllTeachers(0)).rejects.toThrow('教研组ID必须为正整数');
      await expect(teacherService.getAllTeachers(-1)).rejects.toThrow('教研组ID必须为正整数');
    });

    it('应该处理查询失败的情况', async () => {
      mockInvoke.mockResolvedValue({
        teachers: [],
        totalCount: 0,
        success: false,
        errorMessage: '数据库连接失败',
      });

      await expect(teacherService.getAllTeachers()).rejects.toThrow('获取教师列表失败');
    });

    it('应该处理异常情况', async () => {
      mockInvoke.mockRejectedValue(new Error('网络错误'));

      await expect(teacherService.getAllTeachers()).rejects.toThrow('获取教师列表失败');
    });
  });

  // ============================================================================
  // 保存教师偏好测试
  // ============================================================================

  describe('savePreference', () => {
    it('应该成功保存教师偏好', async () => {
      const mockPreference = createMockPreference();
      mockInvoke.mockResolvedValue({
        success: true,
        message: '教师 1001 的偏好配置已保存',
      });

      await teacherService.savePreference(mockPreference);

      expect(invoke).toHaveBeenCalledWith('save_teacher_preference', {
        input: {
          teacherId: 1001,
          preferredSlots: expect.any(Number),
          timeBias: 0,
          weight: 1,
          blockedSlots: expect.any(Number),
        },
      });
    });

    it('应该验证教师ID', async () => {
      const invalidPreference = {
        ...createMockPreference(),
        teacherId: 0,
      };

      await expect(teacherService.savePreference(invalidPreference)).rejects.toThrow(
        '教师ID必须为正整数',
      );
    });

    it('应该验证早晚偏好值', async () => {
      const invalidPreference = {
        ...createMockPreference(),
        timeBias: 3,
      };

      await expect(teacherService.savePreference(invalidPreference)).rejects.toThrow(
        '早晚偏好值必须在 0-2 之间',
      );

      const invalidPreference2 = {
        ...createMockPreference(),
        timeBias: -1,
      };

      await expect(teacherService.savePreference(invalidPreference2)).rejects.toThrow(
        '早晚偏好值必须在 0-2 之间',
      );
    });

    it('应该验证权重系数', async () => {
      const invalidPreference = {
        ...createMockPreference(),
        weight: 101,
      };

      await expect(teacherService.savePreference(invalidPreference)).rejects.toThrow(
        '权重系数必须在 0-100 之间',
      );

      const invalidPreference2 = {
        ...createMockPreference(),
        weight: -1,
      };

      await expect(teacherService.savePreference(invalidPreference2)).rejects.toThrow(
        '权重系数必须在 0-100 之间',
      );
    });

    it('应该验证位掩码格式', async () => {
      const invalidPreference = {
        ...createMockPreference(),
        preferredSlots: 'invalid',
      };

      await expect(teacherService.savePreference(invalidPreference)).rejects.toThrow(
        '偏好时段掩码格式无效',
      );

      const invalidPreference2 = {
        ...createMockPreference(),
        blockedSlots: 'invalid',
      };

      await expect(teacherService.savePreference(invalidPreference2)).rejects.toThrow(
        '不排课时段掩码格式无效',
      );
    });

    it('应该处理保存失败的情况', async () => {
      const mockPreference = createMockPreference();
      mockInvoke.mockResolvedValue({
        success: false,
        message: '',
        errorMessage: '数据库写入失败',
      });

      await expect(teacherService.savePreference(mockPreference)).rejects.toThrow(
        '保存教师偏好失败',
      );
    });

    it('应该处理异常情况', async () => {
      const mockPreference = createMockPreference();
      mockInvoke.mockRejectedValue(new Error('网络错误'));

      await expect(teacherService.savePreference(mockPreference)).rejects.toThrow(
        '保存教师偏好失败',
      );
    });
  });

  // ============================================================================
  // 批量保存教师偏好测试
  // ============================================================================

  describe('batchSavePreferences', () => {
    it('应该成功批量保存教师偏好', async () => {
      const mockPreferences = [
        createMockPreference(),
        { ...createMockPreference(), teacherId: 1002 },
      ];
      mockInvoke.mockResolvedValue({
        success: true,
        successCount: 2,
        failedCount: 0,
        message: '成功保存 2 位教师的偏好配置',
      });

      const result = await teacherService.batchSavePreferences(mockPreferences);

      expect(invoke).toHaveBeenCalledWith('batch_save_teacher_preferences', {
        input: {
          preferences: expect.arrayContaining([
            expect.objectContaining({
              teacherId: 1001,
            }),
            expect.objectContaining({
              teacherId: 1002,
            }),
          ]),
        },
      });
      expect(result.successCount).toBe(2);
      expect(result.failedCount).toBe(0);
    });

    it('应该验证偏好列表不能为空', async () => {
      await expect(teacherService.batchSavePreferences([])).rejects.toThrow(
        '教师偏好列表不能为空',
      );
    });

    it('应该验证每个偏好配置', async () => {
      const invalidPreferences = [
        createMockPreference(),
        { ...createMockPreference(), teacherId: 0 }, // 无效的教师ID
      ];

      await expect(teacherService.batchSavePreferences(invalidPreferences)).rejects.toThrow(
        '教师ID必须为正整数',
      );
    });

    it('应该处理部分失败的情况', async () => {
      const mockPreferences = [
        createMockPreference(),
        { ...createMockPreference(), teacherId: 1002 },
        { ...createMockPreference(), teacherId: 1003 },
      ];
      mockInvoke.mockResolvedValue({
        success: true,
        successCount: 2,
        failedCount: 1,
        message: '成功保存 2 位教师的偏好配置，1 位失败',
      });

      const result = await teacherService.batchSavePreferences(mockPreferences);

      expect(result.successCount).toBe(2);
      expect(result.failedCount).toBe(1);
    });

    it('应该处理批量保存失败的情况', async () => {
      const mockPreferences = [createMockPreference()];
      mockInvoke.mockResolvedValue({
        success: false,
        successCount: 0,
        failedCount: 1,
        message: '',
        errorMessage: '数据库事务失败',
      });

      await expect(teacherService.batchSavePreferences(mockPreferences)).rejects.toThrow(
        '批量保存教师偏好失败',
      );
    });

    it('应该处理异常情况', async () => {
      const mockPreferences = [createMockPreference()];
      mockInvoke.mockRejectedValue(new Error('网络错误'));

      await expect(teacherService.batchSavePreferences(mockPreferences)).rejects.toThrow(
        '批量保存教师偏好失败',
      );
    });
  });

  // ============================================================================
  // 查询教师状态测试
  // ============================================================================

  describe('queryStatus', () => {
    it('应该成功查询教师状态', async () => {
      const mockTimeSlots: TimeSlot[] = [
        { day: 0, period: 0 },
        { day: 0, period: 1 },
      ];
      const mockStatus = createMockTeacherStatus();
      mockInvoke.mockResolvedValue({
        success: true,
        busyTeachers: mockStatus.busyTeachers,
        freeTeachers: mockStatus.freeTeachers,
      });

      const result = await teacherService.queryStatus(mockTimeSlots);

      expect(invoke).toHaveBeenCalledWith('query_teacher_status', {
        input: {
          timeSlots: mockTimeSlots,
        },
      });
      expect(result.busyTeachers).toHaveLength(1);
      expect(result.freeTeachers).toHaveLength(2);
      expect(result.busyTeachers[0].isBusy).toBe(true);
      expect(result.freeTeachers[0].isBusy).toBe(false);
    });

    it('应该验证时间槽位列表不能为空', async () => {
      await expect(teacherService.queryStatus([])).rejects.toThrow('时间槽位列表不能为空');
    });

    it('应该验证时间槽位的 day 值', async () => {
      const invalidTimeSlots: TimeSlot[] = [{ day: -1, period: 0 }];

      await expect(teacherService.queryStatus(invalidTimeSlots)).rejects.toThrow(
        '时间槽位的 day 值无效',
      );

      const invalidTimeSlots2: TimeSlot[] = [{ day: 30, period: 0 }];

      await expect(teacherService.queryStatus(invalidTimeSlots2)).rejects.toThrow(
        '时间槽位的 day 值无效',
      );
    });

    it('应该验证时间槽位的 period 值', async () => {
      const invalidTimeSlots: TimeSlot[] = [{ day: 0, period: -1 }];

      await expect(teacherService.queryStatus(invalidTimeSlots)).rejects.toThrow(
        '时间槽位的 period 值无效',
      );

      const invalidTimeSlots2: TimeSlot[] = [{ day: 0, period: 12 }];

      await expect(teacherService.queryStatus(invalidTimeSlots2)).rejects.toThrow(
        '时间槽位的 period 值无效',
      );
    });

    it('应该处理查询失败的情况', async () => {
      const mockTimeSlots: TimeSlot[] = [{ day: 0, period: 0 }];
      mockInvoke.mockResolvedValue({
        success: false,
        busyTeachers: [],
        freeTeachers: [],
        errorMessage: '课表数据不存在',
      });

      await expect(teacherService.queryStatus(mockTimeSlots)).rejects.toThrow(
        '查询教师状态失败',
      );
    });

    it('应该处理异常情况', async () => {
      const mockTimeSlots: TimeSlot[] = [{ day: 0, period: 0 }];
      mockInvoke.mockRejectedValue(new Error('网络错误'));

      await expect(teacherService.queryStatus(mockTimeSlots)).rejects.toThrow(
        '查询教师状态失败',
      );
    });
  });

  // ============================================================================
  // 统计教学工作量测试
  // ============================================================================

  describe('calculateWorkload', () => {
    it('应该成功统计教学工作量', async () => {
      const mockStatistics = createMockWorkloadStatistics();
      mockInvoke.mockResolvedValue({
        success: true,
        statistics: mockStatistics,
      });

      const result = await teacherService.calculateWorkload();

      expect(invoke).toHaveBeenCalledWith('calculate_workload_statistics');
      expect(result).toEqual(mockStatistics);
      expect(result).toHaveLength(2);
      expect(result[0].totalSessions).toBe(18);
      expect(result[0].classCount).toBe(3);
      expect(result[0].subjects).toContain('数学');
    });

    it('应该处理无教师的情况', async () => {
      mockInvoke.mockResolvedValue({
        success: true,
        statistics: [],
      });

      const result = await teacherService.calculateWorkload();

      expect(result).toEqual([]);
    });

    it('应该处理统计失败的情况', async () => {
      mockInvoke.mockResolvedValue({
        success: false,
        statistics: [],
        errorMessage: '课表数据不存在',
      });

      await expect(teacherService.calculateWorkload()).rejects.toThrow('统计教学工作量失败');
    });

    it('应该处理异常情况', async () => {
      mockInvoke.mockRejectedValue(new Error('网络错误'));

      await expect(teacherService.calculateWorkload()).rejects.toThrow('统计教学工作量失败');
    });
  });

  // ============================================================================
  // 数据验证测试
  // ============================================================================

  describe('数据验证', () => {
    it('应该拒绝空的教师偏好配置', async () => {
      await expect(teacherService.savePreference(null as any)).rejects.toThrow(
        '教师偏好配置不能为空',
      );
    });

    it('应该拒绝无效的教师ID', async () => {
      const invalidPreference = {
        ...createMockPreference(),
        teacherId: 0,
      };

      await expect(teacherService.savePreference(invalidPreference)).rejects.toThrow(
        '教师ID必须为正整数',
      );
    });

    it('应该拒绝无效的早晚偏好值', async () => {
      const invalidPreference = {
        ...createMockPreference(),
        timeBias: 3,
      };

      await expect(teacherService.savePreference(invalidPreference)).rejects.toThrow(
        '早晚偏好值必须在 0-2 之间',
      );
    });

    it('应该拒绝无效的权重系数', async () => {
      const invalidPreference = {
        ...createMockPreference(),
        weight: 101,
      };

      await expect(teacherService.savePreference(invalidPreference)).rejects.toThrow(
        '权重系数必须在 0-100 之间',
      );
    });

    it('应该拒绝无效的位掩码格式', async () => {
      const invalidPreference = {
        ...createMockPreference(),
        preferredSlots: 'invalid',
      };

      await expect(teacherService.savePreference(invalidPreference)).rejects.toThrow(
        '偏好时段掩码格式无效',
      );
    });

    it('应该拒绝无效的时间槽位', async () => {
      const invalidTimeSlots: TimeSlot[] = [{ day: -1, period: 0 }];

      await expect(teacherService.queryStatus(invalidTimeSlots)).rejects.toThrow(
        '时间槽位的 day 值无效',
      );
    });
  });
});
