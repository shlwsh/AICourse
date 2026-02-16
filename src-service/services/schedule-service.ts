/**
 * 排课服务类
 *
 * 功能：
 * - 封装排课相关的业务逻辑
 * - 实现课表生成、获取、移动、冲突检测、交换建议等方法
 * - 调用 Tauri 命令与 Rust 后端交互
 * - 实现数据验证和业务规则检查
 * - 添加完善的日志记录
 *
 * 使用示例：
 * ```typescript
 * import { ScheduleService } from '@/services/schedule-service';
 *
 * const scheduleService = new ScheduleService();
 *
 * // 生成课表
 * const schedule = await scheduleService.generateSchedule();
 *
 * // 移动课程
 * await scheduleService.moveEntry(101, '数学', 1001, { day: 0, period: 0 }, { day: 0, period: 1 });
 * ```
 */

import { invoke } from '@tauri-apps/api/tauri';
import { createLogger } from '../utils/logger';

// 创建服务专用日志记录器
const logger = createLogger('ScheduleService');

// ============================================================================
// 类型定义
// ============================================================================

/**
 * 时间槽位
 */
export interface TimeSlot {
  /** 星期（0-29，支持1-30天周期） */
  day: number;
  /** 节次（0-11，支持1-12节） */
  period: number;
}

/**
 * 课表条目
 */
export interface ScheduleEntry {
  /** 班级ID */
  classId: number;
  /** 科目ID */
  subjectId: string;
  /** 教师ID */
  teacherId: number;
  /** 时间槽位 */
  timeSlot: TimeSlot;
  /** 是否固定课程 */
  isFixed: boolean;
  /** 单双周标记 */
  weekType: 'Every' | 'Odd' | 'Even';
}

/**
 * 课表元数据
 */
export interface ScheduleMetadata {
  /** 排课周期天数 */
  cycleDays: number;
  /** 每天节次数 */
  periodsPerDay: number;
  /** 生成时间 */
  generatedAt: string;
  /** 版本号 */
  version: number;
}

/**
 * 完整课表
 */
export interface Schedule {
  /** 课表条目列表 */
  entries: ScheduleEntry[];
  /** 代价值 */
  cost: number;
  /** 元数据 */
  metadata: ScheduleMetadata;
}

/**
 * 冲突类型
 */
export type ConflictType =
  | { HardConstraint: HardConstraintViolation }
  | { SoftConstraint: SoftConstraintViolation };

/**
 * 硬约束违反类型
 */
export type HardConstraintViolation =
  | 'TeacherBusy'
  | 'ClassBusy'
  | 'ForbiddenSlot'
  | 'TeacherBlocked'
  | 'VenueOverCapacity'
  | 'TeacherMutualExclusion'
  | 'NoDoubleSession';

/**
 * 软约束违反类型
 */
export type SoftConstraintViolation =
  | 'TeacherPreference'
  | 'TimeBias'
  | 'ConsecutiveMajorSubject'
  | 'ProgressInconsistency';

/**
 * 冲突严重程度
 */
export type ConflictSeverity = 'Blocked' | 'Warning' | 'Available';

/**
 * 冲突信息
 */
export interface ConflictInfo {
  /** 时间槽位 */
  slot: TimeSlot;
  /** 冲突类型 */
  conflictType: ConflictType;
  /** 严重程度 */
  severity: ConflictSeverity;
  /** 描述信息 */
  description: string;
}

/**
 * 交换类型
 */
export type SwapType = 'Simple' | 'Triangle' | 'Chain';

/**
 * 课程移动
 */
export interface CourseMove {
  /** 班级ID */
  classId: number;
  /** 科目ID */
  subjectId: string;
  /** 教师ID */
  teacherId: number;
  /** 源时间槽位 */
  fromSlot: TimeSlot;
  /** 目标时间槽位 */
  toSlot: TimeSlot;
}

/**
 * 交换选项
 */
export interface SwapOption {
  /** 交换类型 */
  swapType: SwapType;
  /** 移动列表 */
  moves: CourseMove[];
  /** 代价影响（负数表示改善） */
  costImpact: number;
  /** 描述信息 */
  description: string;
}

// ============================================================================
// 排课服务类
// ============================================================================

/**
 * 排课服务类
 *
 * 负责处理所有与排课相关的业务逻辑，包括：
 * - 课表生成
 * - 课表查询
 * - 课程移动
 * - 冲突检测
 * - 交换建议
 * - 交换执行
 */
export class ScheduleService {
  /**
   * 生成课表
   *
   * 调用 Rust 后端的约束求解器生成满足所有约束的课表。
   *
   * @returns 生成的课表
   * @throws 如果生成失败则抛出错误
   *
   * @example
   * ```typescript
   * const schedule = await scheduleService.generateSchedule();
   * console.log(`课表生成成功，代价值: ${schedule.cost}`);
   * ```
   */
  async generateSchedule(): Promise<Schedule> {
    logger.info('开始生成课表');

    try {
      // 调用 Tauri 命令生成课表
      const schedule = await invoke<Schedule>('generate_schedule');

      // 验证返回的课表数据
      this.validateSchedule(schedule);

      logger.info('课表生成成功', {
        entryCount: schedule.entries.length,
        cost: schedule.cost,
        cycleDays: schedule.metadata.cycleDays,
        periodsPerDay: schedule.metadata.periodsPerDay,
      });

      return schedule;
    } catch (error) {
      logger.error('生成课表失败', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw new Error(`生成课表失败: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * 获取活动课表
   *
   * 从数据库加载当前活动的课表。
   *
   * @returns 活动课表，如果不存在则返回 null
   *
   * @example
   * ```typescript
   * const schedule = await scheduleService.getActiveSchedule();
   * if (schedule) {
   *   console.log(`找到活动课表，包含 ${schedule.entries.length} 个条目`);
   * }
   * ```
   */
  async getActiveSchedule(): Promise<Schedule | null> {
    logger.info('获取活动课表');

    try {
      const schedule = await invoke<Schedule | null>('get_active_schedule');

      if (schedule) {
        this.validateSchedule(schedule);
        logger.info('成功获取活动课表', {
          entryCount: schedule.entries.length,
          cost: schedule.cost,
        });
      } else {
        logger.warn('未找到活动课表');
      }

      return schedule;
    } catch (error) {
      logger.error('获取活动课表失败', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw new Error(
        `获取活动课表失败: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  /**
   * 移动课程
   *
   * 将指定的课程从一个时间槽位移动到另一个时间槽位。
   * 会自动检查目标位置是否存在硬约束冲突。
   *
   * @param classId - 班级ID
   * @param subjectId - 科目ID
   * @param teacherId - 教师ID
   * @param fromSlot - 源时间槽位
   * @param toSlot - 目标时间槽位
   * @throws 如果移动违反硬约束或操作失败则抛出错误
   *
   * @example
   * ```typescript
   * await scheduleService.moveEntry(
   *   101,
   *   '数学',
   *   1001,
   *   { day: 0, period: 0 },
   *   { day: 0, period: 1 }
   * );
   * ```
   */
  async moveEntry(
    classId: number,
    subjectId: string,
    teacherId: number,
    fromSlot: TimeSlot,
    toSlot: TimeSlot,
  ): Promise<void> {
    logger.info('移动课程', {
      classId,
      subjectId,
      teacherId,
      fromSlot,
      toSlot,
    });

    try {
      // 验证参数
      this.validateTimeSlot(fromSlot);
      this.validateTimeSlot(toSlot);

      if (classId <= 0) {
        throw new Error('班级ID必须为正整数');
      }

      if (!subjectId || subjectId.trim().length === 0) {
        throw new Error('科目ID不能为空');
      }

      if (teacherId <= 0) {
        throw new Error('教师ID必须为正整数');
      }

      // 检查源位置和目标位置是否相同
      if (fromSlot.day === toSlot.day && fromSlot.period === toSlot.period) {
        logger.warn('源位置和目标位置相同，无需移动');
        return;
      }

      // 调用 Tauri 命令移动课程
      await invoke('move_schedule_entry', {
        classId,
        subjectId,
        teacherId,
        fromSlot,
        toSlot,
      });

      logger.info('课程移动成功', {
        classId,
        subjectId,
        fromSlot,
        toSlot,
      });
    } catch (error) {
      logger.error('移动课程失败', {
        classId,
        subjectId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw new Error(`移动课程失败: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * 检测冲突
   *
   * 检测指定课程在所有时间槽位的冲突状态。
   * 返回每个时间槽位的冲突信息，包括硬约束和软约束违反情况。
   *
   * @param classId - 班级ID
   * @param subjectId - 科目ID
   * @param teacherId - 教师ID
   * @returns 时间槽位到冲突信息的映射
   *
   * @example
   * ```typescript
   * const conflicts = await scheduleService.detectConflicts(101, '数学', 1001);
   * for (const [slotKey, conflict] of Object.entries(conflicts)) {
   *   if (conflict.severity === 'Blocked') {
   *     console.log(`${slotKey}: ${conflict.description}`);
   *   }
   * }
   * ```
   */
  async detectConflicts(
    classId: number,
    subjectId: string,
    teacherId: number,
  ): Promise<Record<string, ConflictInfo>> {
    logger.info('检测冲突', { classId, subjectId, teacherId });

    try {
      // 验证参数
      if (classId <= 0) {
        throw new Error('班级ID必须为正整数');
      }

      if (!subjectId || subjectId.trim().length === 0) {
        throw new Error('科目ID不能为空');
      }

      if (teacherId <= 0) {
        throw new Error('教师ID必须为正整数');
      }

      // 调用 Tauri 命令检测冲突
      const conflicts = await invoke<Record<string, ConflictInfo>>('detect_conflicts', {
        classId,
        subjectId,
        teacherId,
      });

      // 统计冲突数量
      const conflictStats = this.analyzeConflicts(conflicts);

      logger.info('冲突检测完成', {
        classId,
        subjectId,
        teacherId,
        totalSlots: Object.keys(conflicts).length,
        ...conflictStats,
      });

      return conflicts;
    } catch (error) {
      logger.error('检测冲突失败', {
        classId,
        subjectId,
        teacherId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw new Error(`检测冲突失败: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * 建议交换方案
   *
   * 当目标时间槽位被占用时，计算可行的交换方案。
   * 包括简单交换、三角交换和链式交换。
   *
   * @param targetClass - 目标班级ID
   * @param targetTeacher - 目标教师ID
   * @param desiredSlot - 期望的时间槽位
   * @returns 交换选项列表，按代价影响排序
   *
   * @example
   * ```typescript
   * const swapOptions = await scheduleService.suggestSwaps(
   *   101,
   *   1001,
   *   { day: 0, period: 0 }
   * );
   * if (swapOptions.length > 0) {
   *   console.log(`找到 ${swapOptions.length} 个交换方案`);
   *   console.log(`最佳方案: ${swapOptions[0].description}`);
   * }
   * ```
   */
  async suggestSwaps(
    targetClass: number,
    targetTeacher: number,
    desiredSlot: TimeSlot,
  ): Promise<SwapOption[]> {
    logger.info('建议交换方案', {
      targetClass,
      targetTeacher,
      desiredSlot,
    });

    try {
      // 验证参数
      if (targetClass <= 0) {
        throw new Error('目标班级ID必须为正整数');
      }

      if (targetTeacher <= 0) {
        throw new Error('目标教师ID必须为正整数');
      }

      this.validateTimeSlot(desiredSlot);

      // 调用 Tauri 命令建议交换方案
      const swapOptions = await invoke<SwapOption[]>('suggest_swaps', {
        targetClass,
        targetTeacher,
        desiredSlot,
      });

      logger.info('交换方案建议完成', {
        targetClass,
        targetTeacher,
        desiredSlot,
        optionCount: swapOptions.length,
        bestCostImpact: swapOptions.length > 0 ? swapOptions[0].costImpact : null,
      });

      return swapOptions;
    } catch (error) {
      logger.error('建议交换方案失败', {
        targetClass,
        targetTeacher,
        desiredSlot,
        error: error instanceof Error ? error.message : String(error),
      });
      throw new Error(
        `建议交换方案失败: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  /**
   * 执行交换
   *
   * 执行指定的交换方案，原子性地完成所有课程移动。
   *
   * @param swapOption - 交换选项
   * @throws 如果交换失败则抛出错误
   *
   * @example
   * ```typescript
   * const swapOptions = await scheduleService.suggestSwaps(101, 1001, { day: 0, period: 0 });
   * if (swapOptions.length > 0) {
   *   await scheduleService.executeSwap(swapOptions[0]);
   *   console.log('交换执行成功');
   * }
   * ```
   */
  async executeSwap(swapOption: SwapOption): Promise<void> {
    logger.info('执行交换', {
      swapType: swapOption.swapType,
      moveCount: swapOption.moves.length,
      costImpact: swapOption.costImpact,
    });

    try {
      // 验证交换选项
      if (!swapOption || !swapOption.moves || swapOption.moves.length === 0) {
        throw new Error('交换选项无效：缺少移动列表');
      }

      // 验证所有移动
      for (const move of swapOption.moves) {
        this.validateTimeSlot(move.fromSlot);
        this.validateTimeSlot(move.toSlot);

        if (move.classId <= 0) {
          throw new Error('移动中的班级ID必须为正整数');
        }

        if (!move.subjectId || move.subjectId.trim().length === 0) {
          throw new Error('移动中的科目ID不能为空');
        }

        if (move.teacherId <= 0) {
          throw new Error('移动中的教师ID必须为正整数');
        }
      }

      // 调用 Tauri 命令执行交换
      await invoke('execute_swap', { swapOption });

      logger.info('交换执行成功', {
        swapType: swapOption.swapType,
        moveCount: swapOption.moves.length,
        costImpact: swapOption.costImpact,
      });
    } catch (error) {
      logger.error('执行交换失败', {
        swapType: swapOption.swapType,
        error: error instanceof Error ? error.message : String(error),
      });
      throw new Error(`执行交换失败: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * 计算课表代价值
   *
   * 计算指定课表的代价值，用于评估课表质量。
   *
   * @param schedule - 课表
   * @returns 代价值
   *
   * @example
   * ```typescript
   * const schedule = await scheduleService.getActiveSchedule();
   * if (schedule) {
   *   const cost = await scheduleService.calculateCost(schedule);
   *   console.log(`课表代价值: ${cost}`);
   * }
   * ```
   */
  async calculateCost(schedule: Schedule): Promise<number> {
    logger.debug('计算课表代价值', {
      entryCount: schedule.entries.length,
    });

    try {
      // 验证课表
      this.validateSchedule(schedule);

      // 调用 Tauri 命令计算代价
      const cost = await invoke<number>('calculate_cost', { schedule });

      logger.debug('代价值计算完成', { cost });

      return cost;
    } catch (error) {
      logger.error('计算代价值失败', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw new Error(`计算代价值失败: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * 验证课表有效性
   *
   * 验证课表是否满足所有硬约束。
   *
   * @param schedule - 课表
   * @returns 验证结果，包含是否有效和错误信息
   *
   * @example
   * ```typescript
   * const schedule = await scheduleService.getActiveSchedule();
   * if (schedule) {
   *   const result = await scheduleService.validateScheduleConstraints(schedule);
   *   if (!result.isValid) {
   *     console.error('课表验证失败:', result.errors);
   *   }
   * }
   * ```
   */
  async validateScheduleConstraints(
    schedule: Schedule,
  ): Promise<{ isValid: boolean; errors: string[] }> {
    logger.debug('验证课表约束', {
      entryCount: schedule.entries.length,
    });

    try {
      // 验证课表数据格式
      this.validateSchedule(schedule);

      // 调用 Tauri 命令验证约束
      const result = await invoke<{ isValid: boolean; errors: string[] }>('validate_schedule', {
        schedule,
      });

      logger.debug('课表约束验证完成', {
        isValid: result.isValid,
        errorCount: result.errors.length,
      });

      return result;
    } catch (error) {
      logger.error('验证课表约束失败', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw new Error(
        `验证课表约束失败: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  // ============================================================================
  // 私有辅助方法
  // ============================================================================

  /**
   * 验证课表数据完整性
   *
   * @param schedule - 课表
   * @throws 如果课表数据无效则抛出错误
   */
  private validateSchedule(schedule: any): asserts schedule is Schedule {
    if (!schedule) {
      throw new Error('课表数据为空');
    }

    if (!schedule.entries || !Array.isArray(schedule.entries)) {
      throw new Error('课表条目列表无效');
    }

    if (typeof schedule.cost !== 'number' || schedule.cost < 0) {
      throw new Error('课表代价值无效');
    }

    if (!schedule.metadata) {
      throw new Error('课表元数据缺失');
    }

    if (
      typeof schedule.metadata.cycleDays !== 'number' ||
      schedule.metadata.cycleDays < 1 ||
      schedule.metadata.cycleDays > 30
    ) {
      throw new Error('排课周期天数无效');
    }

    if (
      typeof schedule.metadata.periodsPerDay !== 'number' ||
      schedule.metadata.periodsPerDay < 1 ||
      schedule.metadata.periodsPerDay > 12
    ) {
      throw new Error('每天节次数无效');
    }

    logger.debug('课表验证通过', {
      entryCount: schedule.entries.length,
      cost: schedule.cost,
      cycleDays: schedule.metadata.cycleDays,
      periodsPerDay: schedule.metadata.periodsPerDay,
    });
  }

  /**
   * 验证时间槽位
   *
   * @param slot - 时间槽位
   * @throws 如果时间槽位无效则抛出错误
   */
  private validateTimeSlot(slot: TimeSlot): void {
    if (typeof slot.day !== 'number' || slot.day < 0 || slot.day > 29) {
      throw new Error(`时间槽位的 day 值无效: ${slot.day}，必须在 0-29 之间`);
    }

    if (typeof slot.period !== 'number' || slot.period < 0 || slot.period > 11) {
      throw new Error(`时间槽位的 period 值无效: ${slot.period}，必须在 0-11 之间`);
    }
  }

  /**
   * 分析冲突统计信息
   *
   * @param conflicts - 冲突信息映射
   * @returns 冲突统计
   */
  private analyzeConflicts(conflicts: Record<string, ConflictInfo>): {
    blockedCount: number;
    warningCount: number;
    availableCount: number;
  } {
    let blockedCount = 0;
    let warningCount = 0;
    let availableCount = 0;

    for (const conflict of Object.values(conflicts)) {
      switch (conflict.severity) {
        case 'Blocked':
          blockedCount++;
          break;
        case 'Warning':
          warningCount++;
          break;
        case 'Available':
          availableCount++;
          break;
      }
    }

    return { blockedCount, warningCount, availableCount };
  }
}
