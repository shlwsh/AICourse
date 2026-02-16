/**
 * 教师状态管理
 * 使用 Pinia 管理教师相关的状态和操作
 */
import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { logger } from '@/utils/logger';

// 教师接口
export interface Teacher {
  id: number;
  name: string;
  teachingGroupId?: number;
  createdAt: string;
  updatedAt: string;
}

// 教师偏好接口
export interface TeacherPreference {
  teacherId: number;
  preferredSlots: string; // u64 位掩码的 JSON 字符串
  timeBias: number; // 0=无偏好, 1=厌恶早课, 2=厌恶晚课
  weight: number; // 权重系数
  blockedSlots: string; // 不排课时段掩码的 JSON 字符串
}

// 教师状态接口
export interface TeacherStatus {
  teacherId: number;
  teacherName: string;
  isBusy: boolean;
  currentClass?: number;
  currentSubject?: string;
}

// 教师工作量统计接口
export interface TeacherWorkload {
  teacherId: number;
  teacherName: string;
  totalSessions: number; // 总课时数
  classCount: number; // 授课班级数
  subjects: string[]; // 授课科目列表
  earlySessions: number; // 早课节数
  lateSessions: number; // 晚课节数
}

/**
 * 教师状态管理 Store
 */
export const useTeacherStore = defineStore('teacher', () => {
  // ========== 状态 ==========

  // 教师列表
  const teachers = ref<Teacher[]>([]);

  // 教师偏好映射
  const preferences = ref<Map<number, TeacherPreference>>(new Map());

  // 教师状态映射（用于查询某时段的教师状态）
  const teacherStatuses = ref<Map<number, TeacherStatus>>(new Map());

  // 教师工作量统计
  const workloadStatistics = ref<TeacherWorkload[]>([]);

  // 是否正在加载
  const isLoading = ref(false);

  // 选中的教师
  const selectedTeacher = ref<Teacher | null>(null);

  // ========== 计算属性 ==========

  // 教师总数
  const teacherCount = computed(() => teachers.value.length);

  // 是否有教师数据
  const hasTeachers = computed(() => teachers.value.length > 0);

  // 空闲教师列表（根据当前查询的时段）
  const freeTeachers = computed(() => {
    return Array.from(teacherStatuses.value.values()).filter(
      (status) => !status.isBusy
    );
  });

  // 忙碌教师列表（根据当前查询的时段）
  const busyTeachers = computed(() => {
    return Array.from(teacherStatuses.value.values()).filter(
      (status) => status.isBusy
    );
  });

  // ========== 操作方法 ==========

  /**
   * 加载所有教师
   */
  const loadTeachers = async (): Promise<void> => {
    try {
      logger.info('开始加载教师列表');
      isLoading.value = true;

      // TODO: 调用 Tauri 命令获取教师列表
      // const result = await invoke<Teacher[]>('get_all_teachers');
      // teachers.value = result;

      logger.info('教师列表加载成功', { count: teacherCount.value });
    } catch (error) {
      logger.error('加载教师列表失败', { error });
      throw error;
    } finally {
      isLoading.value = false;
    }
  };

  /**
   * 保存教师偏好
   */
  const saveTeacherPreference = async (
    preference: TeacherPreference
  ): Promise<void> => {
    try {
      logger.info('保存教师偏好', { teacherId: preference.teacherId });

      // TODO: 调用 Tauri 命令保存教师偏好
      // await invoke('save_teacher_preference', { preference });

      // 更新本地状态
      preferences.value.set(preference.teacherId, preference);

      logger.info('教师偏好保存成功', { teacherId: preference.teacherId });
    } catch (error) {
      logger.error('保存教师偏好失败', { error, teacherId: preference.teacherId });
      throw error;
    }
  };

  /**
   * 批量保存教师偏好
   */
  const batchSaveTeacherPreferences = async (
    prefs: TeacherPreference[]
  ): Promise<void> => {
    try {
      logger.info('批量保存教师偏好', { count: prefs.length });

      // TODO: 调用 Tauri 命令批量保存教师偏好
      // await invoke('batch_save_teacher_preferences', { preferences: prefs });

      // 更新本地状态
      prefs.forEach((pref) => {
        preferences.value.set(pref.teacherId, pref);
      });

      logger.info('批量保存教师偏好成功', { count: prefs.length });
    } catch (error) {
      logger.error('批量保存教师偏好失败', { error, count: prefs.length });
      throw error;
    }
  };

  /**
   * 查询教师状态（指定时段）
   */
  const queryTeacherStatus = async (
    day: number,
    period: number
  ): Promise<void> => {
    try {
      logger.info('查询教师状态', { day, period });

      // TODO: 调用 Tauri 命令查询教师状态
      // const result = await invoke<TeacherStatus[]>('query_teacher_status', {
      //   day,
      //   period,
      // });

      // 更新本地状态
      // teacherStatuses.value.clear();
      // result.forEach((status) => {
      //   teacherStatuses.value.set(status.teacherId, status);
      // });

      logger.info('教师状态查询成功', {
        day,
        period,
        busyCount: busyTeachers.value.length,
        freeCount: freeTeachers.value.length,
      });
    } catch (error) {
      logger.error('查询教师状态失败', { error, day, period });
      throw error;
    }
  };

  /**
   * 计算工作量统计
   */
  const calculateWorkloadStatistics = async (): Promise<void> => {
    try {
      logger.info('开始计算工作量统计');
      isLoading.value = true;

      // TODO: 调用 Tauri 命令计算工作量统计
      // const result = await invoke<TeacherWorkload[]>('calculate_workload_statistics');
      // workloadStatistics.value = result;

      logger.info('工作量统计计算成功', {
        teacherCount: workloadStatistics.value.length,
      });
    } catch (error) {
      logger.error('计算工作量统计失败', { error });
      throw error;
    } finally {
      isLoading.value = false;
    }
  };

  /**
   * 获取教师偏好
   */
  const getTeacherPreference = (teacherId: number): TeacherPreference | undefined => {
    return preferences.value.get(teacherId);
  };

  /**
   * 选择教师
   */
  const selectTeacher = (teacher: Teacher | null): void => {
    logger.debug('选择教师', { teacher });
    selectedTeacher.value = teacher;
  };

  /**
   * 根据 ID 查找教师
   */
  const findTeacherById = (teacherId: number): Teacher | undefined => {
    return teachers.value.find((t) => t.id === teacherId);
  };

  /**
   * 根据教研组筛选教师
   */
  const filterTeachersByGroup = (groupId: number): Teacher[] => {
    return teachers.value.filter((t) => t.teachingGroupId === groupId);
  };

  /**
   * 重置状态
   */
  const reset = (): void => {
    logger.info('重置教师状态');
    teachers.value = [];
    preferences.value.clear();
    teacherStatuses.value.clear();
    workloadStatistics.value = [];
    isLoading.value = false;
    selectedTeacher.value = null;
  };

  // 返回状态和方法
  return {
    // 状态
    teachers,
    preferences,
    teacherStatuses,
    workloadStatistics,
    isLoading,
    selectedTeacher,

    // 计算属性
    teacherCount,
    hasTeachers,
    freeTeachers,
    busyTeachers,

    // 方法
    loadTeachers,
    saveTeacherPreference,
    batchSaveTeacherPreferences,
    queryTeacherStatus,
    calculateWorkloadStatistics,
    getTeacherPreference,
    selectTeacher,
    findTeacherById,
    filterTeachersByGroup,
    reset,
  };
});
