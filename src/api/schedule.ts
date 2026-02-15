/**
 * 课表相关 API 接口
 * 提供课表管理的所有 API 调用方法
 */
import { http, ApiResponse } from './http';
import type { Schedule, TimeSlot } from '@/stores/scheduleStore';
import { logger } from '@/utils/logger';

/**
 * 课表 API 类
 */
export class ScheduleApi {
  /**
   * 生成课表
   * @returns 生成的课表数据
   */
  static async generate(): Promise<ApiResponse<Schedule>> {
    logger.info('调用生成课表 API');
    return http.post<Schedule>('/schedule/generate');
  }

  /**
   * 获取活动课表
   * @returns 当前活动的课表数据
   */
  static async getActive(): Promise<ApiResponse<Schedule>> {
    logger.info('调用获取活动课表 API');
    return http.get<Schedule>('/schedule/active');
  }

  /**
   * 移动课程
   * @param classId 班级ID
   * @param subjectId 科目ID
   * @param teacherId 教师ID
   * @param fromSlot 原时间槽位
   * @param toSlot 目标时间槽位
   */
  static async moveEntry(
    classId: number,
    subjectId: string,
    teacherId: number,
    fromSlot: TimeSlot,
    toSlot: TimeSlot,
  ): Promise<ApiResponse<void>> {
    logger.info('调用移动课程 API', {
      classId,
      subjectId,
      fromSlot,
      toSlot,
    });

    return http.post<void>('/schedule/move', {
      classId,
      subjectId,
      teacherId,
      fromSlot,
      toSlot,
    });
  }

  /**
   * 检测冲突
   * @param classId 班级ID
   * @param subjectId 科目ID
   * @param teacherId 教师ID
   * @returns 冲突信息
   */
  static async detectConflicts(
    classId: number,
    subjectId: string,
    teacherId: number,
  ): Promise<ApiResponse<Record<string, any>>> {
    logger.info('调用检测冲突 API', {
      classId,
      subjectId,
      teacherId,
    });

    return http.post<Record<string, any>>('/schedule/detect-conflicts', {
      classId,
      subjectId,
      teacherId,
    });
  }

  /**
   * 建议交换方案
   * @param targetClass 目标班级
   * @param targetTeacher 目标教师
   * @param desiredSlot 期望的时间槽位
   * @returns 交换方案列表
   */
  static async suggestSwaps(
    targetClass: number,
    targetTeacher: number,
    desiredSlot: TimeSlot,
  ): Promise<ApiResponse<any[]>> {
    logger.info('调用建议交换方案 API', {
      targetClass,
      targetTeacher,
      desiredSlot,
    });

    return http.post<any[]>('/schedule/suggest-swaps', {
      targetClass,
      targetTeacher,
      desiredSlot,
    });
  }

  /**
   * 执行交换
   * @param swapOption 交换方案
   */
  static async executeSwap(swapOption: any): Promise<ApiResponse<void>> {
    logger.info('调用执行交换 API', {
      swapType: swapOption.swap_type,
    });

    return http.post<void>('/schedule/execute-swap', {
      swapOption,
    });
  }
}

export default ScheduleApi;
