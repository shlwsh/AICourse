/**
 * 教师相关 API 接口
 * 提供教师管理的所有 API 调用方法
 */
import { http, ApiResponse } from './http';
import { logger } from '@/utils/logger';

/**
 * 教师信息接口
 */
export interface Teacher {
  id: number;
  name: string;
  teachingGroupId?: number;
  createdAt: string;
  updatedAt: string;
}

/**
 * 教师偏好接口
 */
export interface TeacherPreference {
  teacherId: number;
  preferredSlots: string; // JSON: u64 位掩码
  timeBias: number; // 0=无偏好, 1=厌恶早课, 2=厌恶晚课
  weight: number; // 权重系数
  blockedSlots: string; // JSON: u64 位掩码
}

/**
 * 教师状态查询参数
 */
export interface TeacherStatusQuery {
  day: number;
  period: number;
}

/**
 * 教师状态信息
 */
export interface TeacherStatus {
  teacherId: number;
  teacherName: string;
  isBusy: boolean;
  currentClass?: number;
  currentSubject?: string;
}

/**
 * 教师工作量统计
 */
export interface WorkloadStatistics {
  teacherId: number;
  teacherName: string;
  totalSessions: number; // 总课时数
  classCount: number; // 授课班级数
  subjects: string[]; // 授课科目列表
  earlySessions: number; // 早课节数
  lateSessions: number; // 晚课节数
  workloadPercentage?: number; // 工作量百分比（前端计算）
  teachingGroupName?: string; // 教研组名称（前端填充）
}

/**
 * 教师 API 类
 */
export class TeacherApi {
  /**
   * 获取所有教师
   * @returns 教师列表
   */
  static async getAllTeachers(): Promise<ApiResponse<Teacher[]>> {
    const startTime = performance.now();
    logger.info('调用获取所有教师 API - 请求开始');

    try {
      const response = await http.get<Teacher[]>('/teacher');
      const endTime = performance.now();
      const responseTime = Math.round(endTime - startTime);

      if (response.success) {
        logger.info('获取所有教师 API - 响应成功', {
          responseTime: `${responseTime}ms`,
          count: response.data?.length || 0,
        });
        logger.debug('获取教师列表成功', { count: response.data?.length });
      } else {
        logger.error('获取所有教师 API - 响应失败', {
          responseTime: `${responseTime}ms`,
          error: response.error || response.message,
        });
      }

      return response;
    } catch (error: any) {
      const endTime = performance.now();
      const responseTime = Math.round(endTime - startTime);
      logger.error('获取所有教师 API - 请求异常', {
        responseTime: `${responseTime}ms`,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * 保存教师偏好
   * @param preference 教师偏好配置
   */
  static async savePreference(
    preference: TeacherPreference,
  ): Promise<ApiResponse<void>> {
    const startTime = performance.now();
    logger.info('调用保存教师偏好 API - 请求开始', {
      teacherId: preference.teacherId,
    });

    logger.debug('保存教师偏好 API - 请求参数', {
      preference,
    });

    try {
      const response = await http.post<void>('/teacher/preference', preference);
      const endTime = performance.now();
      const responseTime = Math.round(endTime - startTime);

      if (response.success) {
        logger.info('保存教师偏好 API - 响应成功', {
          responseTime: `${responseTime}ms`,
          teacherId: preference.teacherId,
        });
        logger.debug('保存教师偏好成功', {
          teacherId: preference.teacherId,
        });
      } else {
        logger.error('保存教师偏好 API - 响应失败', {
          responseTime: `${responseTime}ms`,
          teacherId: preference.teacherId,
          error: response.error || response.message,
        });
      }

      return response;
    } catch (error: any) {
      const endTime = performance.now();
      const responseTime = Math.round(endTime - startTime);
      logger.error('保存教师偏好 API - 请求异常', {
        responseTime: `${responseTime}ms`,
        teacherId: preference.teacherId,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * 批量保存教师偏好
   * @param preferences 教师偏好配置列表
   */
  static async batchSavePreferences(
    preferences: TeacherPreference[],
  ): Promise<ApiResponse<void>> {
    const startTime = performance.now();
    logger.info('调用批量保存教师偏好 API - 请求开始', {
      count: preferences.length,
    });

    logger.debug('批量保存教师偏好 API - 请求参数', {
      count: preferences.length,
      teacherIds: preferences.map(p => p.teacherId),
    });

    try {
      const response = await http.post<void>(
        '/teacher/preferences/batch',
        { preferences },
      );
      const endTime = performance.now();
      const responseTime = Math.round(endTime - startTime);

      if (response.success) {
        logger.info('批量保存教师偏好 API - 响应成功', {
          responseTime: `${responseTime}ms`,
          count: preferences.length,
        });
        logger.debug('批量保存教师偏好成功', {
          count: preferences.length,
        });
      } else {
        logger.error('批量保存教师偏好 API - 响应失败', {
          responseTime: `${responseTime}ms`,
          count: preferences.length,
          error: response.error || response.message,
        });
      }

      return response;
    } catch (error: any) {
      const endTime = performance.now();
      const responseTime = Math.round(endTime - startTime);
      logger.error('批量保存教师偏好 API - 请求异常', {
        responseTime: `${responseTime}ms`,
        count: preferences.length,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * 查询教师状态
   * @param query 查询参数（时间槽位）
   * @returns 教师状态列表
   */
  static async queryStatus(
    query: TeacherStatusQuery,
  ): Promise<ApiResponse<TeacherStatus[]>> {
    const startTime = performance.now();
    logger.info('调用查询教师状态 API - 请求开始', {
      day: query.day,
      period: query.period,
    });

    logger.debug('查询教师状态 API - 请求参数', {
      query,
    });

    try {
      const response = await http.post<TeacherStatus[]>(
        '/teacher/status',
        query,
      );
      const endTime = performance.now();
      const responseTime = Math.round(endTime - startTime);

      if (response.success) {
        logger.info('查询教师状态 API - 响应成功', {
          responseTime: `${responseTime}ms`,
          day: query.day,
          period: query.period,
          count: response.data?.length || 0,
        });
        logger.debug('查询教师状态成功', {
          day: query.day,
          period: query.period,
          count: response.data?.length,
        });
      } else {
        logger.error('查询教师状态 API - 响应失败', {
          responseTime: `${responseTime}ms`,
          day: query.day,
          period: query.period,
          error: response.error || response.message,
        });
      }

      return response;
    } catch (error: any) {
      const endTime = performance.now();
      const responseTime = Math.round(endTime - startTime);
      logger.error('查询教师状态 API - 请求异常', {
        responseTime: `${responseTime}ms`,
        day: query.day,
        period: query.period,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * 获取工作量统计
   * @returns 所有教师的工作量统计
   */
  static async getWorkloadStatistics(): Promise<
    ApiResponse<WorkloadStatistics[]>
  > {
    const startTime = performance.now();
    logger.info('调用获取工作量统计 API - 请求开始');

    try {
      const response = await http.get<WorkloadStatistics[]>(
        '/teacher/workload',
      );
      const endTime = performance.now();
      const responseTime = Math.round(endTime - startTime);

      if (response.success) {
        logger.info('获取工作量统计 API - 响应成功', {
          responseTime: `${responseTime}ms`,
          count: response.data?.length || 0,
        });
        logger.debug('获取工作量统计成功', {
          count: response.data?.length,
        });
      } else {
        logger.error('获取工作量统计 API - 响应失败', {
          responseTime: `${responseTime}ms`,
          error: response.error || response.message,
        });
      }

      return response;
    } catch (error: any) {
      const endTime = performance.now();
      const responseTime = Math.round(endTime - startTime);
      logger.error('获取工作量统计 API - 请求异常', {
        responseTime: `${responseTime}ms`,
        error: error.message,
      });
      throw error;
    }
  }
}

export default TeacherApi;
