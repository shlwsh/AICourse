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
  teachingGroup?: string; // 教研组名称
  teachingGroupId?: number; // 教研组 ID（用于排课系统）
  maxHoursPerDay?: number; // 每天最大课时
  maxConsecutiveHours?: number; // 最大连续课时
  unavailableSlots?: string[]; // 不可用时段
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
   * 设置教师列表
   */
  const setTeachers = (data: Omit<Teacher, 'id' | 'createdAt' | 'updatedAt'>[]): void => {
    const timestamp = new Date().toISOString();
    teachers.value = data.map((item, index) => ({
      ...item,
      id: index + 1,
      createdAt: timestamp,
      updatedAt: timestamp,
    }));

    logger.info('[TeacherStore] 设置教师数据', { count: teachers.value.length });
  };

  /**
   * 加载所有教师
   */
  const loadTeachers = async (): Promise<void> => {
    try {
      logger.info('开始加载教师列表');
      isLoading.value = true;

      // 从后端 API 获取教师数据
      const { fetchTeachers } = await import('@/api/data');
      const result = await fetchTeachers();

      if (result && Array.isArray(result)) {
        teachers.value = result.map((t: any) => ({
          id: t.id,
          name: t.name,
          teachingGroup: t.teaching_group_name,
          teachingGroupId: t.teaching_group_id,
          maxHoursPerDay: t.max_hours_per_day || undefined,
          maxConsecutiveHours: t.max_consecutive_hours || undefined,
          unavailableSlots: t.unavailable_slots ? (typeof t.unavailable_slots === 'string' ? JSON.parse(t.unavailable_slots) : t.unavailable_slots) : undefined,
          createdAt: t.created_at || new Date().toISOString(),
          updatedAt: t.updated_at || new Date().toISOString(),
        }));
      }

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
   * 从字典 store 同步教师数据
   */
  const syncFromDictionary = (teacherData: Teacher[]): void => {
    logger.info('从字典 store 同步教师数据', { count: teacherData.length });
    teachers.value = teacherData;
  };

  /**
   * 添加教师
   */
  const addTeacher = (teacher: Omit<Teacher, 'id' | 'createdAt' | 'updatedAt'>): void => {
    const timestamp = new Date().toISOString();
    const newTeacher: Teacher = {
      ...teacher,
      id: teachers.value.length + 1,
      createdAt: timestamp,
      updatedAt: timestamp,
    };
    teachers.value.push(newTeacher);

    logger.info('[TeacherStore] 添加教师', { name: teacher.name });
  };

  /**
   * 更新教师
   */
  const updateTeacher = (id: number, teacher: Partial<Omit<Teacher, 'id' | 'createdAt'>>): void => {
    const index = teachers.value.findIndex(t => t.id === id);
    if (index !== -1) {
      const current = teachers.value[index];
      if (current) {
        teachers.value[index] = {
          ...current,
          ...teacher,
          name: teacher.name ?? current.name,
          updatedAt: new Date().toISOString(),
        };

        logger.info('[TeacherStore] 更新教师', { id, name: teacher.name });
      }
    }
  };

  /**
   * 删除教师
   */
  const deleteTeacher = (id: number): void => {
    const index = teachers.value.findIndex(t => t.id === id);
    if (index !== -1) {
      const teacher = teachers.value[index];
      teachers.value.splice(index, 1);

      logger.info('[TeacherStore] 删除教师', { id, name: teacher?.name });
    }
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
    setTeachers,
    loadTeachers,
    addTeacher,
    updateTeacher,
    deleteTeacher,
    saveTeacherPreference,
    batchSaveTeacherPreferences,
    queryTeacherStatus,
    calculateWorkloadStatistics,
    getTeacherPreference,
    selectTeacher,
    findTeacherById,
    filterTeachersByGroup,
    syncFromDictionary,
    reset,
  };
});
