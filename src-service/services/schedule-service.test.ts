/**
 * ScheduleService 单元测试
 *
 * 测试覆盖：
 * - 课表生成
 * - 课表查询
 * - 课程移动
 * - 冲突检测
 * - 交换建议
 * - 交换执行
 * - 数据验证
 * - 错误处理
 */

import { describe, it, expect, beforeEach, vi, afterEach, Mock } from 'vitest';
import { ScheduleService } from './schedule-service';
import type { Schedule, TimeSlot, SwapOption, ConflictInfo } from './schedule-service';

// Mock Tauri invoke 函数
vi.mock('@tauri-apps/api/tauri', () => ({
  invoke: vi.fn(),
}));

import { invoke } from '@tauri-apps/api/tauri';

const mockInvoke = invoke as Mock;

describe('ScheduleService', () => {
  let scheduleService: ScheduleService;

  beforeEach(() => {
    scheduleService = new ScheduleService();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ============================================================================
  // 辅助函数
  // ============================================================================

  /**
   * 创建模拟课表
   */
  function createMockSchedule(): Schedule {
    return {
      entries: [
        {
          classId: 101,
          subjectId: '数学',
          teacherId: 1001,
          timeSlot: { day: 0, period: 0 },
          isFixed: false,
          weekType: 'Every',
        },
        {
          classId: 101,
          subjectId: '语文',
          teacherId: 1002,
          timeSlot: { day: 0, period: 1 },
          isFixed: false,
          weekType: 'Every',
        },
      ],
      cost: 100,
      metadata: {
        cycleDays: 5,
        periodsPerDay: 8,
        generatedAt: '2024-01-01T00:00:00Z',
        version: 1,
      },
    };
  }

  /**
   * 创建模拟冲突信息
   */
  function createMockConflicts(): Record<string, ConflictInfo> {
    return {
      '0-0': {
        slot: { day: 0, period: 0 },
        conflictType: { HardConstraint: 'TeacherBusy' },
        severity: 'Blocked',
        description: '教师在此时段已有课程',
      },
      '0-1': {
        slot: { day: 0, period: 1 },
        conflictType: { SoftConstraint: 'TeacherPreference' },
        severity: 'Warning',
        description: '不在教师偏好时段',
      },
      '0-2': {
        slot: { day: 0, period: 2 },
        conflictType: { SoftConstraint: 'TeacherPreference' },
        severity: 'Available',
        description: '可以安排',
      },
    };
  }

  /**
   * 创建模拟交换选项
   */
  function createMockSwapOptions(): SwapOption[] {
    return [
      {
        swapType: 'Simple',
        moves: [
          {
            classId: 101,
            subjectId: '数学',
            teacherId: 1001,
            fromSlot: { day: 0, period: 0 },
            toSlot: { day: 0, period: 2 },
          },
        ],
        costImpact: -10,
        description: '将数学课移至第3节',
      },
      {
        swapType: 'Triangle',
        moves: [
          {
            classId: 101,
            subjectId: '数学',
            teacherId: 1001,
            fromSlot: { day: 0, period: 0 },
            toSlot: { day: 0, period: 1 },
          },
          {
            classId: 102,
            subjectId: '语文',
            teacherId: 1002,
            fromSlot: { day: 0, period: 1 },
            toSlot: { day: 0, period: 2 },
          },
          {
            classId: 103,
            subjectId: '英语',
            teacherId: 1003,
            fromSlot: { day: 0, period: 2 },
            toSlot: { day: 0, period: 0 },
          },
        ],
        costImpact: 5,
        description: '三角交换',
      },
    ];
  }

  // ============================================================================
  // 课表生成测试
  // ============================================================================

  describe('generateSchedule', () => {
    it('应该成功生成课表', async () => {
      const mockSchedule = createMockSchedule();
      mockInvoke.mockResolvedValue(mockSchedule);

      const result = await scheduleService.generateSchedule();

      expect(invoke).toHaveBeenCalledWith('generate_schedule');
      expect(result).toEqual(mockSchedule);
      expect(result.entries).toHaveLength(2);
      expect(result.cost).toBe(100);
    });

    it('应该验证返回的课表数据', async () => {
      const invalidSchedule = {
        entries: null, // 无效的条目列表
        cost: 100,
        metadata: {
          cycleDays: 5,
          periodsPerDay: 8,
          generatedAt: '2024-01-01T00:00:00Z',
          version: 1,
        },
      };
      mockInvoke.mockResolvedValue(invalidSchedule);

      await expect(scheduleService.generateSchedule()).rejects.toThrow('课表条目列表无效');
    });

    it('应该处理生成失败的情况', async () => {
      mockInvoke.mockRejectedValue(new Error('约束求解失败'));

      await expect(scheduleService.generateSchedule()).rejects.toThrow('生成课表失败');
    });
  });

  // ============================================================================
  // 课表查询测试
  // ============================================================================

  describe('getActiveSchedule', () => {
    it('应该成功获取活动课表', async () => {
      const mockSchedule = createMockSchedule();
      mockInvoke.mockResolvedValue(mockSchedule);

      const result = await scheduleService.getActiveSchedule();

      expect(invoke).toHaveBeenCalledWith('get_active_schedule');
      expect(result).toEqual(mockSchedule);
    });

    it('应该处理未找到课表的情况', async () => {
      mockInvoke.mockResolvedValue(null);

      const result = await scheduleService.getActiveSchedule();

      expect(result).toBeNull();
    });

    it('应该处理查询失败的情况', async () => {
      mockInvoke.mockRejectedValue(new Error('数据库连接失败'));

      await expect(scheduleService.getActiveSchedule()).rejects.toThrow('获取活动课表失败');
    });
  });

  // ============================================================================
  // 课程移动测试
  // ============================================================================

  describe('moveEntry', () => {
    it('应该成功移动课程', async () => {
      mockInvoke.mockResolvedValue(undefined);

      await scheduleService.moveEntry(
        101,
        '数学',
        1001,
        { day: 0, period: 0 },
        { day: 0, period: 1 },
      );

      expect(invoke).toHaveBeenCalledWith('move_schedule_entry', {
        classId: 101,
        subjectId: '数学',
        teacherId: 1001,
        fromSlot: { day: 0, period: 0 },
        toSlot: { day: 0, period: 1 },
      });
    });

    it('应该验证班级ID', async () => {
      await expect(
        scheduleService.moveEntry(0, '数学', 1001, { day: 0, period: 0 }, { day: 0, period: 1 }),
      ).rejects.toThrow('班级ID必须为正整数');

      await expect(
        scheduleService.moveEntry(-1, '数学', 1001, { day: 0, period: 0 }, { day: 0, period: 1 }),
      ).rejects.toThrow('班级ID必须为正整数');
    });

    it('应该验证科目ID', async () => {
      await expect(
        scheduleService.moveEntry(101, '', 1001, { day: 0, period: 0 }, { day: 0, period: 1 }),
      ).rejects.toThrow('科目ID不能为空');

      await expect(
        scheduleService.moveEntry(101, '   ', 1001, { day: 0, period: 0 }, { day: 0, period: 1 }),
      ).rejects.toThrow('科目ID不能为空');
    });

    it('应该验证教师ID', async () => {
      await expect(
        scheduleService.moveEntry(101, '数学', 0, { day: 0, period: 0 }, { day: 0, period: 1 }),
      ).rejects.toThrow('教师ID必须为正整数');

      await expect(
        scheduleService.moveEntry(101, '数学', -1, { day: 0, period: 0 }, { day: 0, period: 1 }),
      ).rejects.toThrow('教师ID必须为正整数');
    });

    it('应该验证时间槽位', async () => {
      await expect(
        scheduleService.moveEntry(101, '数学', 1001, { day: -1, period: 0 }, { day: 0, period: 1 }),
      ).rejects.toThrow('时间槽位的 day 值无效');

      await expect(
        scheduleService.moveEntry(101, '数学', 1001, { day: 30, period: 0 }, { day: 0, period: 1 }),
      ).rejects.toThrow('时间槽位的 day 值无效');

      await expect(
        scheduleService.moveEntry(101, '数学', 1001, { day: 0, period: -1 }, { day: 0, period: 1 }),
      ).rejects.toThrow('时间槽位的 period 值无效');

      await expect(
        scheduleService.moveEntry(101, '数学', 1001, { day: 0, period: 12 }, { day: 0, period: 1 }),
      ).rejects.toThrow('时间槽位的 period 值无效');
    });

    it('应该处理源位置和目标位置相同的情况', async () => {
      await scheduleService.moveEntry(
        101,
        '数学',
        1001,
        { day: 0, period: 0 },
        { day: 0, period: 0 },
      );

      // 不应该调用 invoke
      expect(invoke).not.toHaveBeenCalled();
    });

    it('应该处理移动失败的情况', async () => {
      mockInvoke.mockRejectedValue(new Error('目标位置存在硬约束冲突'));

      await expect(
        scheduleService.moveEntry(101, '数学', 1001, { day: 0, period: 0 }, { day: 0, period: 1 }),
      ).rejects.toThrow('移动课程失败');
    });
  });

  // ============================================================================
  // 冲突检测测试
  // ============================================================================

  describe('detectConflicts', () => {
    it('应该成功检测冲突', async () => {
      const mockConflicts = createMockConflicts();
      mockInvoke.mockResolvedValue(mockConflicts);

      const result = await scheduleService.detectConflicts(101, '数学', 1001);

      expect(invoke).toHaveBeenCalledWith('detect_conflicts', {
        classId: 101,
        subjectId: '数学',
        teacherId: 1001,
      });
      expect(result).toEqual(mockConflicts);
      expect(Object.keys(result)).toHaveLength(3);
    });

    it('应该验证班级ID', async () => {
      await expect(scheduleService.detectConflicts(0, '数学', 1001)).rejects.toThrow(
        '班级ID必须为正整数',
      );
    });

    it('应该验证科目ID', async () => {
      await expect(scheduleService.detectConflicts(101, '', 1001)).rejects.toThrow(
        '科目ID不能为空',
      );
    });

    it('应该验证教师ID', async () => {
      await expect(scheduleService.detectConflicts(101, '数学', 0)).rejects.toThrow(
        '教师ID必须为正整数',
      );
    });

    it('应该处理检测失败的情况', async () => {
      mockInvoke.mockRejectedValue(new Error('课表数据不存在'));

      await expect(scheduleService.detectConflicts(101, '数学', 1001)).rejects.toThrow(
        '检测冲突失败',
      );
    });
  });

  // ============================================================================
  // 交换建议测试
  // ============================================================================

  describe('suggestSwaps', () => {
    it('应该成功建议交换方案', async () => {
      const mockSwapOptions = createMockSwapOptions();
      mockInvoke.mockResolvedValue(mockSwapOptions);

      const result = await scheduleService.suggestSwaps(101, 1001, { day: 0, period: 0 });

      expect(invoke).toHaveBeenCalledWith('suggest_swaps', {
        targetClass: 101,
        targetTeacher: 1001,
        desiredSlot: { day: 0, period: 0 },
      });
      expect(result).toEqual(mockSwapOptions);
      expect(result).toHaveLength(2);
    });

    it('应该验证目标班级ID', async () => {
      await expect(scheduleService.suggestSwaps(0, 1001, { day: 0, period: 0 })).rejects.toThrow(
        '目标班级ID必须为正整数',
      );
    });

    it('应该验证目标教师ID', async () => {
      await expect(scheduleService.suggestSwaps(101, 0, { day: 0, period: 0 })).rejects.toThrow(
        '目标教师ID必须为正整数',
      );
    });

    it('应该验证期望时间槽位', async () => {
      await expect(
        scheduleService.suggestSwaps(101, 1001, { day: -1, period: 0 }),
      ).rejects.toThrow('时间槽位的 day 值无效');

      await expect(
        scheduleService.suggestSwaps(101, 1001, { day: 0, period: 12 }),
      ).rejects.toThrow('时间槽位的 period 值无效');
    });

    it('应该处理无可用交换方案的情况', async () => {
      mockInvoke.mockResolvedValue([]);

      const result = await scheduleService.suggestSwaps(101, 1001, { day: 0, period: 0 });

      expect(result).toEqual([]);
    });

    it('应该处理建议失败的情况', async () => {
      mockInvoke.mockRejectedValue(new Error('目标槽位不存在'));

      await expect(
        scheduleService.suggestSwaps(101, 1001, { day: 0, period: 0 }),
      ).rejects.toThrow('建议交换方案失败');
    });
  });

  // ============================================================================
  // 交换执行测试
  // ============================================================================

  describe('executeSwap', () => {
    it('应该成功执行简单交换', async () => {
      const swapOption = createMockSwapOptions()[0];
      mockInvoke.mockResolvedValue(undefined);

      await scheduleService.executeSwap(swapOption);

      expect(invoke).toHaveBeenCalledWith('execute_swap', { swapOption });
    });

    it('应该成功执行三角交换', async () => {
      const swapOption = createMockSwapOptions()[1];
      mockInvoke.mockResolvedValue(undefined);

      await scheduleService.executeSwap(swapOption);

      expect(invoke).toHaveBeenCalledWith('execute_swap', { swapOption });
    });

    it('应该验证交换选项', async () => {
      // 测试 null
      await expect(scheduleService.executeSwap(null as any)).rejects.toThrow();

      // 测试空 moves
      await expect(scheduleService.executeSwap({ moves: [] } as any)).rejects.toThrow(
        '交换选项无效：缺少移动列表',
      );
    });

    it('应该验证移动中的班级ID', async () => {
      const invalidSwapOption: SwapOption = {
        swapType: 'Simple',
        moves: [
          {
            classId: 0,
            subjectId: '数学',
            teacherId: 1001,
            fromSlot: { day: 0, period: 0 },
            toSlot: { day: 0, period: 1 },
          },
        ],
        costImpact: 0,
        description: '测试',
      };

      await expect(scheduleService.executeSwap(invalidSwapOption)).rejects.toThrow(
        '移动中的班级ID必须为正整数',
      );
    });

    it('应该验证移动中的科目ID', async () => {
      const invalidSwapOption: SwapOption = {
        swapType: 'Simple',
        moves: [
          {
            classId: 101,
            subjectId: '',
            teacherId: 1001,
            fromSlot: { day: 0, period: 0 },
            toSlot: { day: 0, period: 1 },
          },
        ],
        costImpact: 0,
        description: '测试',
      };

      await expect(scheduleService.executeSwap(invalidSwapOption)).rejects.toThrow(
        '移动中的科目ID不能为空',
      );
    });

    it('应该验证移动中的教师ID', async () => {
      const invalidSwapOption: SwapOption = {
        swapType: 'Simple',
        moves: [
          {
            classId: 101,
            subjectId: '数学',
            teacherId: 0,
            fromSlot: { day: 0, period: 0 },
            toSlot: { day: 0, period: 1 },
          },
        ],
        costImpact: 0,
        description: '测试',
      };

      await expect(scheduleService.executeSwap(invalidSwapOption)).rejects.toThrow(
        '移动中的教师ID必须为正整数',
      );
    });

    it('应该验证移动中的时间槽位', async () => {
      const invalidSwapOption: SwapOption = {
        swapType: 'Simple',
        moves: [
          {
            classId: 101,
            subjectId: '数学',
            teacherId: 1001,
            fromSlot: { day: -1, period: 0 },
            toSlot: { day: 0, period: 1 },
          },
        ],
        costImpact: 0,
        description: '测试',
      };

      await expect(scheduleService.executeSwap(invalidSwapOption)).rejects.toThrow(
        '时间槽位的 day 值无效',
      );
    });

    it('应该处理执行失败的情况', async () => {
      const swapOption = createMockSwapOptions()[0];
      mockInvoke.mockRejectedValue(new Error('交换过程中发生冲突'));

      await expect(scheduleService.executeSwap(swapOption)).rejects.toThrow('执行交换失败');
    });
  });

  // ============================================================================
  // 代价计算测试
  // ============================================================================

  describe('calculateCost', () => {
    it('应该成功计算代价值', async () => {
      const mockSchedule = createMockSchedule();
      mockInvoke.mockResolvedValue(150);

      const result = await scheduleService.calculateCost(mockSchedule);

      expect(invoke).toHaveBeenCalledWith('calculate_cost', { schedule: mockSchedule });
      expect(result).toBe(150);
    });

    it('应该验证课表数据', async () => {
      const invalidSchedule = {
        entries: null,
        cost: 100,
        metadata: {
          cycleDays: 5,
          periodsPerDay: 8,
          generatedAt: '2024-01-01T00:00:00Z',
          version: 1,
        },
      };

      await expect(scheduleService.calculateCost(invalidSchedule as any)).rejects.toThrow();
    });

    it('应该处理计算失败的情况', async () => {
      const mockSchedule = createMockSchedule();
      mockInvoke.mockRejectedValue(new Error('代价函数计算错误'));

      await expect(scheduleService.calculateCost(mockSchedule)).rejects.toThrow(
        '计算代价值失败',
      );
    });
  });

  // ============================================================================
  // 约束验证测试
  // ============================================================================

  describe('validateScheduleConstraints', () => {
    it('应该成功验证有效课表', async () => {
      const mockSchedule = createMockSchedule();
      const mockResult = { isValid: true, errors: [] };
      mockInvoke.mockResolvedValue(mockResult);

      const result = await scheduleService.validateScheduleConstraints(mockSchedule);

      expect(invoke).toHaveBeenCalledWith('validate_schedule', { schedule: mockSchedule });
      expect(result).toEqual(mockResult);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('应该检测无效课表', async () => {
      const mockSchedule = createMockSchedule();
      const mockResult = {
        isValid: false,
        errors: ['教师时间冲突', '班级时间冲突'],
      };
      mockInvoke.mockResolvedValue(mockResult);

      const result = await scheduleService.validateScheduleConstraints(mockSchedule);

      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(2);
    });

    it('应该验证课表数据格式', async () => {
      const invalidSchedule = {
        entries: null,
        cost: 100,
        metadata: {
          cycleDays: 5,
          periodsPerDay: 8,
          generatedAt: '2024-01-01T00:00:00Z',
          version: 1,
        },
      };

      await expect(
        scheduleService.validateScheduleConstraints(invalidSchedule as any),
      ).rejects.toThrow();
    });

    it('应该处理验证失败的情况', async () => {
      const mockSchedule = createMockSchedule();
      mockInvoke.mockRejectedValue(new Error('约束检查失败'));

      await expect(scheduleService.validateScheduleConstraints(mockSchedule)).rejects.toThrow(
        '验证课表约束失败',
      );
    });
  });

  // ============================================================================
  // 数据验证测试
  // ============================================================================

  describe('数据验证', () => {
    it('应该拒绝空课表', async () => {
      mockInvoke.mockResolvedValue(null);

      await expect(scheduleService.generateSchedule()).rejects.toThrow('课表数据为空');
    });

    it('应该拒绝缺少条目列表的课表', async () => {
      const invalidSchedule = {
        cost: 100,
        metadata: {
          cycleDays: 5,
          periodsPerDay: 8,
          generatedAt: '2024-01-01T00:00:00Z',
          version: 1,
        },
      };
      mockInvoke.mockResolvedValue(invalidSchedule);

      await expect(scheduleService.generateSchedule()).rejects.toThrow('课表条目列表无效');
    });

    it('应该拒绝无效的代价值', async () => {
      const invalidSchedule = {
        entries: [],
        cost: -1,
        metadata: {
          cycleDays: 5,
          periodsPerDay: 8,
          generatedAt: '2024-01-01T00:00:00Z',
          version: 1,
        },
      };
      mockInvoke.mockResolvedValue(invalidSchedule);

      await expect(scheduleService.generateSchedule()).rejects.toThrow('课表代价值无效');
    });

    it('应该拒绝缺少元数据的课表', async () => {
      const invalidSchedule = {
        entries: [],
        cost: 100,
      };
      mockInvoke.mockResolvedValue(invalidSchedule);

      await expect(scheduleService.generateSchedule()).rejects.toThrow('课表元数据缺失');
    });

    it('应该拒绝无效的周期天数', async () => {
      const invalidSchedule = {
        entries: [],
        cost: 100,
        metadata: {
          cycleDays: 0,
          periodsPerDay: 8,
          generatedAt: '2024-01-01T00:00:00Z',
          version: 1,
        },
      };
      mockInvoke.mockResolvedValue(invalidSchedule);

      await expect(scheduleService.generateSchedule()).rejects.toThrow('排课周期天数无效');
    });

    it('应该拒绝无效的节次数', async () => {
      const invalidSchedule = {
        entries: [],
        cost: 100,
        metadata: {
          cycleDays: 5,
          periodsPerDay: 0,
          generatedAt: '2024-01-01T00:00:00Z',
          version: 1,
        },
      };
      mockInvoke.mockResolvedValue(invalidSchedule);

      await expect(scheduleService.generateSchedule()).rejects.toThrow('每天节次数无效');
    });
  });
});
