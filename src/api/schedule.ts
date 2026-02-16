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
    const startTime = performance.now();
    logger.info('调用生成课表 API - 请求开始');

    try {
      const response = await http.post<Schedule>('/schedule/generate');
      const endTime = performance.now();
      const responseTime = Math.round(endTime - startTime);

      if (response.success) {
        logger.info('生成课表 API - 响应成功', {
          responseTime: `${responseTime}ms`,
          hasData: !!response.data,
        });
      } else {
        logger.error('生成课表 API - 响应失败', {
          responseTime: `${responseTime}ms`,
          error: response.error || response.message,
        });
      }

      return response;
    } catch (error: any) {
      const endTime = performance.now();
      const responseTime = Math.round(endTime - startTime);
      logger.error('生成课表 API - 请求异常', {
        responseTime: `${responseTime}ms`,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * 获取活动课表
   * @returns 当前活动的课表数据
   */
  static async getActive(): Promise<ApiResponse<Schedule>> {
    const startTime = performance.now();
    logger.info('调用获取活动课表 API - 请求开始');

    try {
      const response = await http.get<Schedule>('/schedule/active');
      const endTime = performance.now();
      const responseTime = Math.round(endTime - startTime);

      if (response.success) {
        logger.info('获取活动课表 API - 响应成功', {
          responseTime: `${responseTime}ms`,
          hasData: !!response.data,
        });
      } else {
        logger.error('获取活动课表 API - 响应失败', {
          responseTime: `${responseTime}ms`,
          error: response.error || response.message,
        });
      }

      return response;
    } catch (error: any) {
      const endTime = performance.now();
      const responseTime = Math.round(endTime - startTime);
      logger.error('获取活动课表 API - 请求异常', {
        responseTime: `${responseTime}ms`,
        error: error.message,
      });
      throw error;
    }
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
    const startTime = performance.now();
    logger.info('调用移动课程 API - 请求开始', {
      classId,
      subjectId,
      teacherId,
    });

    logger.debug('移动课程 API - 请求参数', {
      classId,
      subjectId,
      teacherId,
      fromSlot,
      toSlot,
    });

    try {
      const response = await http.post<void>('/schedule/move', {
        classId,
        subjectId,
        teacherId,
        fromSlot,
        toSlot,
      });

      const endTime = performance.now();
      const responseTime = Math.round(endTime - startTime);

      if (response.success) {
        logger.info('移动课程 API - 响应成功', {
          responseTime: `${responseTime}ms`,
          classId,
          subjectId,
        });
      } else {
        logger.error('移动课程 API - 响应失败', {
          responseTime: `${responseTime}ms`,
          classId,
          subjectId,
          error: response.error || response.message,
        });
      }

      return response;
    } catch (error: any) {
      const endTime = performance.now();
      const responseTime = Math.round(endTime - startTime);
      logger.error('移动课程 API - 请求异常', {
        responseTime: `${responseTime}ms`,
        classId,
        subjectId,
        error: error.message,
      });
      throw error;
    }
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
    const startTime = performance.now();
    logger.info('调用检测冲突 API - 请求开始', {
      classId,
      subjectId,
      teacherId,
    });

    logger.debug('检测冲突 API - 请求参数', {
      classId,
      subjectId,
      teacherId,
    });

    try {
      const response = await http.post<Record<string, any>>('/schedule/detect-conflicts', {
        classId,
        subjectId,
        teacherId,
      });

      const endTime = performance.now();
      const responseTime = Math.round(endTime - startTime);

      if (response.success) {
        logger.info('检测冲突 API - 响应成功', {
          responseTime: `${responseTime}ms`,
          classId,
          hasConflicts: !!response.data && Object.keys(response.data).length > 0,
        });
      } else {
        logger.error('检测冲突 API - 响应失败', {
          responseTime: `${responseTime}ms`,
          classId,
          error: response.error || response.message,
        });
      }

      return response;
    } catch (error: any) {
      const endTime = performance.now();
      const responseTime = Math.round(endTime - startTime);
      logger.error('检测冲突 API - 请求异常', {
        responseTime: `${responseTime}ms`,
        classId,
        error: error.message,
      });
      throw error;
    }
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
    const startTime = performance.now();
    logger.info('调用建议交换方案 API - 请求开始', {
      targetClass,
      targetTeacher,
    });

    logger.debug('建议交换方案 API - 请求参数', {
      targetClass,
      targetTeacher,
      desiredSlot,
    });

    try {
      const response = await http.post<any[]>('/schedule/suggest-swaps', {
        targetClass,
        targetTeacher,
        desiredSlot,
      });

      const endTime = performance.now();
      const responseTime = Math.round(endTime - startTime);

      if (response.success) {
        logger.info('建议交换方案 API - 响应成功', {
          responseTime: `${responseTime}ms`,
          targetClass,
          swapCount: response.data?.length || 0,
        });
      } else {
        logger.error('建议交换方案 API - 响应失败', {
          responseTime: `${responseTime}ms`,
          targetClass,
          error: response.error || response.message,
        });
      }

      return response;
    } catch (error: any) {
      const endTime = performance.now();
      const responseTime = Math.round(endTime - startTime);
      logger.error('建议交换方案 API - 请求异常', {
        responseTime: `${responseTime}ms`,
        targetClass,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * 执行交换
   * @param swapOption 交换方案
   */
  static async executeSwap(swapOption: any): Promise<ApiResponse<void>> {
    const startTime = performance.now();
    logger.info('调用执行交换 API - 请求开始', {
      swapType: swapOption.swap_type,
    });

    logger.debug('执行交换 API - 请求参数', {
      swapOption,
    });

    try {
      const response = await http.post<void>('/schedule/execute-swap', {
        swapOption,
      });

      const endTime = performance.now();
      const responseTime = Math.round(endTime - startTime);

      if (response.success) {
        logger.info('执行交换 API - 响应成功', {
          responseTime: `${responseTime}ms`,
          swapType: swapOption.swap_type,
        });
      } else {
        logger.error('执行交换 API - 响应失败', {
          responseTime: `${responseTime}ms`,
          swapType: swapOption.swap_type,
          error: response.error || response.message,
        });
      }

      return response;
    } catch (error: any) {
      const endTime = performance.now();
      const responseTime = Math.round(endTime - startTime);
      logger.error('执行交换 API - 请求异常', {
        responseTime: `${responseTime}ms`,
        swapType: swapOption.swap_type,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * 设置固定课程
   * @param classId 班级ID
   * @param subjectId 科目ID
   * @param teacherId 教师ID
   * @param timeSlot 时间槽位
   * @param weekType 周类型
   */
  static async setFixedCourse(
    classId: number,
    subjectId: string,
    teacherId: number,
    timeSlot: TimeSlot,
    weekType: 'Every' | 'Odd' | 'Even',
  ): Promise<ApiResponse<void>> {
    const startTime = performance.now();
    logger.info('调用设置固定课程 API - 请求开始', {
      classId,
      subjectId,
      teacherId,
    });

    try {
      const response = await http.post<void>('/schedule/fixed-course/set', {
        classId,
        subjectId,
        teacherId,
        timeSlot,
        weekType,
      });

      const endTime = performance.now();
      const responseTime = Math.round(endTime - startTime);

      if (response.success) {
        logger.info('设置固定课程 API - 响应成功', {
          responseTime: `${responseTime}ms`,
          classId,
          subjectId,
        });
      } else {
        logger.error('设置固定课程 API - 响应失败', {
          responseTime: `${responseTime}ms`,
          classId,
          subjectId,
          error: response.error || response.message,
        });
      }

      return response;
    } catch (error: any) {
      const endTime = performance.now();
      const responseTime = Math.round(endTime - startTime);
      logger.error('设置固定课程 API - 请求异常', {
        responseTime: `${responseTime}ms`,
        classId,
        subjectId,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * 解除固定课程
   * @param classId 班级ID
   * @param subjectId 科目ID
   * @param teacherId 教师ID
   * @param timeSlot 时间槽位
   */
  static async unsetFixedCourse(
    classId: number,
    subjectId: string,
    teacherId: number,
    timeSlot: TimeSlot,
  ): Promise<ApiResponse<void>> {
    const startTime = performance.now();
    logger.info('调用解除固定课程 API - 请求开始', {
      classId,
      subjectId,
      teacherId,
    });

    try {
      const response = await http.post<void>('/schedule/fixed-course/unset', {
        classId,
        subjectId,
        teacherId,
        timeSlot,
      });

      const endTime = performance.now();
      const responseTime = Math.round(endTime - startTime);

      if (response.success) {
        logger.info('解除固定课程 API - 响应成功', {
          responseTime: `${responseTime}ms`,
          classId,
          subjectId,
        });
      } else {
        logger.error('解除固定课程 API - 响应失败', {
          responseTime: `${responseTime}ms`,
          classId,
          subjectId,
          error: response.error || response.message,
        });
      }

      return response;
    } catch (error: any) {
      const endTime = performance.now();
      const responseTime = Math.round(endTime - startTime);
      logger.error('解除固定课程 API - 请求异常', {
        responseTime: `${responseTime}ms`,
        classId,
        subjectId,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * 批量设置固定课程
   * @param entries 课程条目列表
   */
  static async batchSetFixedCourses(
    entries: Array<{
      classId: number;
      subjectId: string;
      teacherId: number;
      timeSlot: TimeSlot;
      weekType: 'Every' | 'Odd' | 'Even';
    }>,
  ): Promise<ApiResponse<void>> {
    const startTime = performance.now();
    logger.info('调用批量设置固定课程 API - 请求开始', {
      count: entries.length,
    });

    try {
      const response = await http.post<void>('/schedule/fixed-course/batch-set', {
        entries,
      });

      const endTime = performance.now();
      const responseTime = Math.round(endTime - startTime);

      if (response.success) {
        logger.info('批量设置固定课程 API - 响应成功', {
          responseTime: `${responseTime}ms`,
          count: entries.length,
        });
      } else {
        logger.error('批量设置固定课程 API - 响应失败', {
          responseTime: `${responseTime}ms`,
          count: entries.length,
          error: response.error || response.message,
        });
      }

      return response;
    } catch (error: any) {
      const endTime = performance.now();
      const responseTime = Math.round(endTime - startTime);
      logger.error('批量设置固定课程 API - 请求异常', {
        responseTime: `${responseTime}ms`,
        count: entries.length,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * 批量解除固定课程
   * @param entries 课程条目列表
   */
  static async batchUnsetFixedCourses(
    entries: Array<{
      classId: number;
      subjectId: string;
      teacherId: number;
      timeSlot: TimeSlot;
    }>,
  ): Promise<ApiResponse<void>> {
    const startTime = performance.now();
    logger.info('调用批量解除固定课程 API - 请求开始', {
      count: entries.length,
    });

    try {
      const response = await http.post<void>('/schedule/fixed-course/batch-unset', {
        entries,
      });

      const endTime = performance.now();
      const responseTime = Math.round(endTime - startTime);

      if (response.success) {
        logger.info('批量解除固定课程 API - 响应成功', {
          responseTime: `${responseTime}ms`,
          count: entries.length,
        });
      } else {
        logger.error('批量解除固定课程 API - 响应失败', {
          responseTime: `${responseTime}ms`,
          count: entries.length,
          error: response.error || response.message,
        });
      }

      return response;
    } catch (error: any) {
      const endTime = performance.now();
      const responseTime = Math.round(endTime - startTime);
      logger.error('批量解除固定课程 API - 请求异常', {
        responseTime: `${responseTime}ms`,
        count: entries.length,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * 获取所有固定课程
   * @returns 固定课程列表
   */
  static async getFixedCourses(): Promise<ApiResponse<any[]>> {
    const startTime = performance.now();
    logger.info('调用获取固定课程列表 API - 请求开始');

    try {
      const response = await http.get<any[]>('/schedule/fixed-course/list');
      const endTime = performance.now();
      const responseTime = Math.round(endTime - startTime);

      if (response.success) {
        logger.info('获取固定课程列表 API - 响应成功', {
          responseTime: `${responseTime}ms`,
          count: response.data?.length || 0,
        });
      } else {
        logger.error('获取固定课程列表 API - 响应失败', {
          responseTime: `${responseTime}ms`,
          error: response.error || response.message,
        });
      }

      return response;
    } catch (error: any) {
      const endTime = performance.now();
      const responseTime = Math.round(endTime - startTime);
      logger.error('获取固定课程列表 API - 请求异常', {
        responseTime: `${responseTime}ms`,
        error: error.message,
      });
      throw error;
    }
  }
}

export default ScheduleApi;
