/**
 * 教师服务类
 *
 * 功能：
 * - 封装教师管理相关的业务逻辑
 * - 实现获取教师列表、保存教师偏好、查询教师状态、统计工作量等方法
 * - 调用 Tauri 命令与 Rust 后端交互
 * - 实现数据验证和业务规则检查
 * - 添加完善的日志记录
 *
 * 使用示例：
 * ```typescript
 * import { TeacherService } from '@/services/teacher-service';
 *
 * const teacherService = new TeacherService();
 *
 * // 获取所有教师
 * const teachers = await teacherService.getAllTeachers();
 *
 * // 保存教师偏好
 * await teacherService.savePreference({
 *   teacherId: 1001,
 *   preferredSlots: 0xFFFFFFFFFFFFFFFFn,
 *   timeBias: 0,
 *   weight: 1,
 *   blockedSlots: 0n,
 * });
 * ```
 */

import { invoke } from '@tauri-apps/api/tauri';
import { createLogger } from '../utils/logger';

// 创建服务专用日志记录器
const logger = createLogger('TeacherService');

// ============================================================================
// 类型定义
// ============================================================================

/**
 * 教师信息
 */
export interface Teacher {
  /** 教师ID */
  id: number;
  /** 教师姓名 */
  name: string;
  /** 教研组ID */
  teachingGroupId?: number;
  /** 创建时间 */
  createdAt: string;
  /** 更新时间 */
  updatedAt: string;
}

/**
 * 教师偏好配置
 */
export interface TeacherPreference {
  /** 教师ID */
  teacherId: number;
  /** 偏好时段掩码（u64 位掩码，使用字符串表示） */
  preferredSlots: string;
  /** 早晚偏好：0=无偏好, 1=厌恶早课, 2=厌恶晚课 */
  timeBias: number;
  /** 权重系数 */
  weight: number;
  /** 不排课时段掩码（u64 位掩码，使用字符串表示） */
  blockedSlots: string;
}

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
 * 教师状态信息
 */
export interface TeacherStatusInfo {
  /** 教师ID */
  teacherId: number;
  /** 教师姓名 */
  teacherName: string;
  /** 是否在上课 */
  isBusy: boolean;
  /** 如果在上课，所在的班级ID */
  classId?: number;
  /** 如果在上课，授课科目 */
  subjectId?: string;
}

/**
 * 教师状态查询结果
 */
export interface TeacherStatusResult {
  /** 上课的教师列表 */
  busyTeachers: TeacherStatusInfo[];
  /** 空闲的教师列表 */
  freeTeachers: TeacherStatusInfo[];
}

/**
 * 教学工作量统计信息
 */
export interface WorkloadStatistics {
  /** 教师ID */
  teacherId: number;
  /** 教师姓名 */
  teacherName: string;
  /** 总课时数 */
  totalSessions: number;
  /** 授课班级数量 */
  classCount: number;
  /** 授课科目列表 */
  subjects: string[];
  /** 早课节数（第1-2节） */
  morningSessions: number;
  /** 晚课节数（第7-8节） */
  eveningSessions: number;
}

// ============================================================================
// 教师服务类
// ============================================================================

/**
 * 教师服务类
 *
 * 负责处理所有与教师管理相关的业务逻辑，包括：
 * - 教师信息查询
 * - 教师偏好配置
 * - 教师状态查询
 * - 工作量统计
 */
export class TeacherService {
  /**
   * 获取所有教师
   *
   * 从数据库查询所有教师信息，支持按教研组筛选。
   *
   * @param teachingGroupId - 可选的教研组ID，用于筛选特定教研组的教师
   * @returns 教师列表
   * @throws 如果查询失败则抛出错误
   *
   * @example
   * ```typescript
   * // 获取所有教师
   * const allTeachers = await teacherService.getAllTeachers();
   *
   * // 获取指定教研组的教师
   * const mathTeachers = await teacherService.getAllTeachers(1);
   * ```
   */
  async getAllTeachers(teachingGroupId?: number): Promise<Teacher[]> {
    logger.info('获取教师列表', { teachingGroupId });

    try {
      // 验证参数
      if (teachingGroupId !== undefined && teachingGroupId <= 0) {
        throw new Error('教研组ID必须为正整数');
      }

      // 调用 Tauri 命令获取教师列表
      const result = await invoke<{
        teachers: Teacher[];
        totalCount: number;
        success: boolean;
        errorMessage?: string;
      }>('get_all_teachers', {
        input: {
          teachingGroupId: teachingGroupId ?? null,
        },
      });

      // 检查结果
      if (!result.success) {
        throw new Error(result.errorMessage || '获取教师列表失败');
      }

      logger.info('教师列表获取成功', {
        totalCount: result.totalCount,
        teachingGroupId,
      });

      return result.teachers;
    } catch (error) {
      logger.error('获取教师列表失败', {
        teachingGroupId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw new Error(`获取教师列表失败: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * 保存教师偏好
   *
   * 保存单个教师的偏好配置到数据库。
   *
   * @param preference - 教师偏好配置
   * @throws 如果保存失败则抛出错误
   *
   * @example
   * ```typescript
   * await teacherService.savePreference({
   *   teacherId: 1001,
   *   preferredSlots: '18446744073709551615', // 全部时段
   *   timeBias: 1, // 厌恶早课
   *   weight: 2, // 权重系数2
   *   blockedSlots: '0', // 无不排课时段
   * });
   * ```
   */
  async savePreference(preference: TeacherPreference): Promise<void> {
    try {
      // 先验证参数
      this.validatePreference(preference);

      logger.info('保存教师偏好', {
        teacherId: preference.teacherId,
      });

      // 转换位掩码为数字（Rust 端需要 u64）
      const preferredSlotsNum = BigInt(preference.preferredSlots);
      const blockedSlotsNum = BigInt(preference.blockedSlots);

      // 调用 Tauri 命令保存教师偏好
      const result = await invoke<{
        success: boolean;
        message: string;
        errorMessage?: string;
      }>('save_teacher_preference', {
        input: {
          teacherId: preference.teacherId,
          preferredSlots: Number(preferredSlotsNum),
          timeBias: preference.timeBias,
          weight: preference.weight,
          blockedSlots: Number(blockedSlotsNum),
        },
      });

      // 检查结果
      if (!result.success) {
        throw new Error(result.errorMessage || '保存教师偏好失败');
      }

      logger.info('教师偏好保存成功', {
        teacherId: preference.teacherId,
        message: result.message,
      });
    } catch (error) {
      logger.error('保存教师偏好失败', {
        teacherId: preference?.teacherId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw new Error(`保存教师偏好失败: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * 批量保存教师偏好
   *
   * 批量保存多个教师的偏好配置到数据库。
   *
   * @param preferences - 教师偏好配置列表
   * @returns 保存结果，包含成功数量和失败数量
   * @throws 如果批量保存失败则抛出错误
   *
   * @example
   * ```typescript
   * const result = await teacherService.batchSavePreferences([
   *   {
   *     teacherId: 1001,
   *     preferredSlots: '18446744073709551615',
   *     timeBias: 0,
   *     weight: 1,
   *     blockedSlots: '0',
   *   },
   *   {
   *     teacherId: 1002,
   *     preferredSlots: '18446744073709551615',
   *     timeBias: 1,
   *     weight: 2,
   *     blockedSlots: '0',
   *   },
   * ]);
   * console.log(`成功保存 ${result.successCount} 位教师的偏好`);
   * ```
   */
  async batchSavePreferences(
    preferences: TeacherPreference[],
  ): Promise<{ successCount: number; failedCount: number }> {
    logger.info('批量保存教师偏好', {
      count: preferences.length,
    });

    try {
      // 验证参数
      if (!preferences || preferences.length === 0) {
        throw new Error('教师偏好列表不能为空');
      }

      // 验证每个偏好配置
      for (const preference of preferences) {
        this.validatePreference(preference);
      }

      // 转换数据格式
      const inputPreferences = preferences.map((p) => ({
        teacherId: p.teacherId,
        preferredSlots: Number(BigInt(p.preferredSlots)),
        timeBias: p.timeBias,
        weight: p.weight,
        blockedSlots: Number(BigInt(p.blockedSlots)),
      }));

      // 调用 Tauri 命令批量保存教师偏好
      const result = await invoke<{
        success: boolean;
        successCount: number;
        failedCount: number;
        message: string;
        errorMessage?: string;
      }>('batch_save_teacher_preferences', {
        input: {
          preferences: inputPreferences,
        },
      });

      // 检查结果
      if (!result.success) {
        throw new Error(result.errorMessage || '批量保存教师偏好失败');
      }

      logger.info('批量保存教师偏好成功', {
        successCount: result.successCount,
        failedCount: result.failedCount,
        message: result.message,
      });

      return {
        successCount: result.successCount,
        failedCount: result.failedCount,
      };
    } catch (error) {
      logger.error('批量保存教师偏好失败', {
        count: preferences.length,
        error: error instanceof Error ? error.message : String(error),
      });
      throw new Error(
        `批量保存教师偏好失败: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  /**
   * 查询教师状态
   *
   * 查询指定时段哪些教师在上课、哪些教师空闲。
   *
   * @param timeSlots - 要查询的时间槽位列表
   * @returns 教师状态查询结果，包含上课教师和空闲教师列表
   * @throws 如果查询失败则抛出错误
   *
   * @example
   * ```typescript
   * const status = await teacherService.queryStatus([
   *   { day: 0, period: 0 }, // 星期一第1节
   *   { day: 0, period: 1 }, // 星期一第2节
   * ]);
   * console.log(`上课教师: ${status.busyTeachers.length}`);
   * console.log(`空闲教师: ${status.freeTeachers.length}`);
   * ```
   */
  async queryStatus(timeSlots: TimeSlot[]): Promise<TeacherStatusResult> {
    logger.info('查询教师状态', {
      slotCount: timeSlots.length,
    });

    try {
      // 验证参数
      if (!timeSlots || timeSlots.length === 0) {
        throw new Error('时间槽位列表不能为空');
      }

      // 验证每个时间槽位
      for (const slot of timeSlots) {
        this.validateTimeSlot(slot);
      }

      // 调用 Tauri 命令查询教师状态
      const result = await invoke<{
        success: boolean;
        busyTeachers: Array<{
          teacherId: number;
          teacherName: string;
          isBusy: boolean;
          classId?: number;
          subjectId?: string;
        }>;
        freeTeachers: Array<{
          teacherId: number;
          teacherName: string;
          isBusy: boolean;
          classId?: number;
          subjectId?: string;
        }>;
        errorMessage?: string;
      }>('query_teacher_status', {
        input: {
          timeSlots,
        },
      });

      // 检查结果
      if (!result.success) {
        throw new Error(result.errorMessage || '查询教师状态失败');
      }

      // 转换数据格式
      const busyTeachers: TeacherStatusInfo[] = result.busyTeachers.map((t) => ({
        teacherId: t.teacherId,
        teacherName: t.teacherName,
        isBusy: t.isBusy,
        classId: t.classId,
        subjectId: t.subjectId,
      }));

      const freeTeachers: TeacherStatusInfo[] = result.freeTeachers.map((t) => ({
        teacherId: t.teacherId,
        teacherName: t.teacherName,
        isBusy: t.isBusy,
        classId: t.classId,
        subjectId: t.subjectId,
      }));

      logger.info('教师状态查询成功', {
        busyCount: busyTeachers.length,
        freeCount: freeTeachers.length,
      });

      return {
        busyTeachers,
        freeTeachers,
      };
    } catch (error) {
      logger.error('查询教师状态失败', {
        slotCount: timeSlots.length,
        error: error instanceof Error ? error.message : String(error),
      });
      throw new Error(`查询教师状态失败: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * 统计教学工作量
   *
   * 统计所有教师的教学工作量，包括总课时、班级数、早晚课等。
   *
   * @returns 工作量统计列表
   * @throws 如果统计失败则抛出错误
   *
   * @example
   * ```typescript
   * const statistics = await teacherService.calculateWorkload();
   * for (const stat of statistics) {
   *   console.log(`${stat.teacherName}: 总课时${stat.totalSessions}节`);
   * }
   * ```
   */
  async calculateWorkload(): Promise<WorkloadStatistics[]> {
    logger.info('开始统计教学工作量');

    try {
      // 调用 Tauri 命令计算工作量统计
      const result = await invoke<{
        success: boolean;
        statistics: Array<{
          teacherId: number;
          teacherName: string;
          totalSessions: number;
          classCount: number;
          subjects: string[];
          morningSessions: number;
          eveningSessions: number;
        }>;
        errorMessage?: string;
      }>('calculate_workload_statistics');

      // 检查结果
      if (!result.success) {
        throw new Error(result.errorMessage || '统计教学工作量失败');
      }

      // 转换数据格式
      const statistics: WorkloadStatistics[] = result.statistics.map((s) => ({
        teacherId: s.teacherId,
        teacherName: s.teacherName,
        totalSessions: s.totalSessions,
        classCount: s.classCount,
        subjects: s.subjects,
        morningSessions: s.morningSessions,
        eveningSessions: s.eveningSessions,
      }));

      logger.info('教学工作量统计完成', {
        teacherCount: statistics.length,
      });

      return statistics;
    } catch (error) {
      logger.error('统计教学工作量失败', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw new Error(
        `统计教学工作量失败: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  // ============================================================================
  // 私有辅助方法
  // ============================================================================

  /**
   * 验证教师偏好配置
   *
   * @param preference - 教师偏好配置
   * @throws 如果配置无效则抛出错误
   */
  private validatePreference(preference: TeacherPreference): void {
    if (!preference || typeof preference !== 'object') {
      throw new Error('教师偏好配置不能为空');
    }

    if (typeof preference.teacherId !== 'number' || preference.teacherId <= 0) {
      throw new Error('教师ID必须为正整数');
    }

    if (preference.timeBias < 0 || preference.timeBias > 2) {
      throw new Error('早晚偏好值必须在 0-2 之间');
    }

    if (preference.weight < 0 || preference.weight > 100) {
      throw new Error('权重系数必须在 0-100 之间');
    }

    // 验证位掩码格式
    try {
      BigInt(preference.preferredSlots);
    } catch {
      throw new Error('偏好时段掩码格式无效');
    }

    try {
      BigInt(preference.blockedSlots);
    } catch {
      throw new Error('不排课时段掩码格式无效');
    }

    logger.debug('教师偏好配置验证通过', {
      teacherId: preference.teacherId,
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
}
