/**
 * 课表状态管理
 * 使用 Pinia 管理课表相关的状态和操作
 */
import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { logger } from '@/utils/logger';

// 时间槽位接口
export interface TimeSlot {
  day: number;
  period: number;
}

// 课表条目接口
export interface ScheduleEntry {
  classId: number;
  subjectId: string;
  teacherId: number;
  timeSlot: TimeSlot;
  isFixed: boolean;
  weekType: 'Every' | 'Odd' | 'Even';
}

// 课表元数据接口
export interface ScheduleMetadata {
  cycleDays: number;
  periodsPerDay: number;
  generatedAt: string;
  version: number;
}

// 课表接口
export interface Schedule {
  entries: ScheduleEntry[];
  cost: number;
  metadata: ScheduleMetadata;
}

// 冲突信息接口
export interface ConflictInfo {
  slot: TimeSlot;
  conflictType: any;
  severity: 'Blocked' | 'Warning' | 'Available';
  description: string;
}

/**
 * 课表状态管理 Store
 */
export const useScheduleStore = defineStore('schedule', () => {
  // ========== 状态 ==========

  // 当前课表
  const schedule = ref<Schedule | null>(null);

  // 选中的课表条目
  const selectedEntry = ref<ScheduleEntry | null>(null);

  // 冲突信息映射
  const conflicts = ref<Map<string, ConflictInfo>>(new Map());

  // 是否正在生成课表
  const isGenerating = ref(false);

  // 视图模式：班级视图、教师视图、场地视图
  const viewMode = ref<'class' | 'teacher' | 'venue'>('class');

  // 是否显示热力图
  const showHeatmap = ref(false);

  // ========== 计算属性 ==========

  // 是否有活动课表
  const hasSchedule = computed(() => schedule.value !== null);

  // 课表条目数量
  const entryCount = computed(() => schedule.value?.entries.length || 0);

  // 课表代价值
  const scheduleCost = computed(() => schedule.value?.cost || 0);

  // ========== 操作方法 ==========

  /**
   * 加载活动课表
   */
  const loadSchedule = async (): Promise<void> => {
    try {
      logger.info('开始加载课表');

      // TODO: 调用 Tauri 命令获取课表
      // const result = await invoke<Schedule>('get_active_schedule');
      // schedule.value = result;

      logger.info('课表加载成功', { entryCount: entryCount.value });
    } catch (error) {
      logger.error('加载课表失败', { error });
      throw error;
    }
  };

  /**
   * 生成新课表
   */
  const generateSchedule = async (): Promise<void> => {
    try {
      logger.info('开始生成课表');
      isGenerating.value = true;

      // TODO: 调用 Tauri 命令生成课表
      // const result = await invoke<Schedule>('generate_schedule');
      // schedule.value = result;

      logger.info('课表生成成功', {
        cost: scheduleCost.value,
        entryCount: entryCount.value,
      });
    } catch (error) {
      logger.error('生成课表失败', { error });
      throw error;
    } finally {
      isGenerating.value = false;
    }
  };

  /**
   * 选择课表条目
   */
  const selectEntry = (entry: ScheduleEntry | null): void => {
    logger.debug('选择课表条目', { entry });
    selectedEntry.value = entry;

    if (entry) {
      detectConflicts(entry);
    } else {
      conflicts.value.clear();
    }
  };

  /**
   * 移动课表条目
   */
  const moveEntry = async (entry: ScheduleEntry, newSlot: TimeSlot): Promise<void> => {
    try {
      logger.info('移动课程', {
        from: entry.timeSlot,
        to: newSlot,
      });

      // TODO: 调用 Tauri 命令移动课程
      // await invoke('move_schedule_entry', {
      //   classId: entry.classId,
      //   subjectId: entry.subjectId,
      //   teacherId: entry.teacherId,
      //   fromSlot: entry.timeSlot,
      //   toSlot: newSlot,
      // });

      // 重新加载课表
      await loadSchedule();

      logger.info('课程移动成功');
    } catch (error) {
      logger.error('移动课程失败', { error });
      throw error;
    }
  };

  /**
   * 检测冲突
   */
  const detectConflicts = async (entry: ScheduleEntry): Promise<void> => {
    try {
      logger.debug('检测冲突', { entry });

      // TODO: 调用 Tauri 命令检测冲突
      // const result = await invoke<Record<string, ConflictInfo>>('detect_conflicts', {
      //   classId: entry.classId,
      //   subjectId: entry.subjectId,
      //   teacherId: entry.teacherId,
      // });

      // conflicts.value = new Map(Object.entries(result));

      logger.debug('冲突检测完成', { conflictCount: conflicts.value.size });
    } catch (error) {
      logger.error('检测冲突失败', { error });
      throw error;
    }
  };

  /**
   * 设置视图模式
   */
  const setViewMode = (mode: 'class' | 'teacher' | 'venue'): void => {
    logger.info('切换视图模式', { mode });
    viewMode.value = mode;
  };

  /**
   * 切换热力图显示
   */
  const toggleHeatmap = (): void => {
    showHeatmap.value = !showHeatmap.value;
    logger.info('切换热力图显示', { enabled: showHeatmap.value });
  };

  /**
   * 设置固定课程
   */
  const setFixedCourse = async (entry: ScheduleEntry): Promise<void> => {
    try {
      logger.info('设置固定课程', { entry });

      // TODO: 调用 Tauri 命令设置固定课程
      // await invoke('set_fixed_course', {
      //   classId: entry.classId,
      //   subjectId: entry.subjectId,
      //   teacherId: entry.teacherId,
      //   timeSlot: entry.timeSlot,
      //   weekType: entry.weekType,
      // });

      // 重新加载课表
      await loadSchedule();

      logger.info('固定课程设置成功');
    } catch (error) {
      logger.error('设置固定课程失败', { error });
      throw error;
    }
  };

  /**
   * 解除固定课程
   */
  const unsetFixedCourse = async (entry: ScheduleEntry): Promise<void> => {
    try {
      logger.info('解除固定课程', { entry });

      // TODO: 调用 Tauri 命令解除固定课程
      // await invoke('unset_fixed_course', {
      //   classId: entry.classId,
      //   subjectId: entry.subjectId,
      //   teacherId: entry.teacherId,
      //   timeSlot: entry.timeSlot,
      // });

      // 重新加载课表
      await loadSchedule();

      logger.info('固定课程解除成功');
    } catch (error) {
      logger.error('解除固定课程失败', { error });
      throw error;
    }
  };

  /**
   * 批量设置固定课程
   */
  const batchSetFixedCourses = async (entries: ScheduleEntry[]): Promise<void> => {
    try {
      logger.info('批量设置固定课程', { count: entries.length });

      // TODO: 调用 Tauri 命令批量设置固定课程
      // await invoke('batch_set_fixed_courses', {
      //   entries: entries.map(e => ({
      //     classId: e.classId,
      //     subjectId: e.subjectId,
      //     teacherId: e.teacherId,
      //     timeSlot: e.timeSlot,
      //     weekType: e.weekType,
      //   })),
      // });

      // 重新加载课表
      await loadSchedule();

      logger.info('批量设置固定课程成功');
    } catch (error) {
      logger.error('批量设置固定课程失败', { error });
      throw error;
    }
  };

  /**
   * 批量解除固定课程
   */
  const batchUnsetFixedCourses = async (entries: ScheduleEntry[]): Promise<void> => {
    try {
      logger.info('批量解除固定课程', { count: entries.length });

      // TODO: 调用 Tauri 命令批量解除固定课程
      // await invoke('batch_unset_fixed_courses', {
      //   entries: entries.map(e => ({
      //     classId: e.classId,
      //     subjectId: e.subjectId,
      //     teacherId: e.teacherId,
      //     timeSlot: e.timeSlot,
      //   })),
      // });

      // 重新加载课表
      await loadSchedule();

      logger.info('批量解除固定课程成功');
    } catch (error) {
      logger.error('批量解除固定课程失败', { error });
      throw error;
    }
  };

  /**
   * 获取所有固定课程
   */
  const getFixedCourses = (): ScheduleEntry[] => {
    if (!schedule.value) {
      return [];
    }

    return schedule.value.entries.filter(entry => entry.isFixed);
  };

  /**
   * 重置状态
   */
  const reset = (): void => {
    logger.info('重置课表状态');
    schedule.value = null;
    selectedEntry.value = null;
    conflicts.value.clear();
    isGenerating.value = false;
    viewMode.value = 'class';
    showHeatmap.value = false;
  };

  // 返回状态和方法
  return {
    // 状态
    schedule,
    selectedEntry,
    conflicts,
    isGenerating,
    viewMode,
    showHeatmap,

    // 计算属性
    hasSchedule,
    entryCount,
    scheduleCost,

    // 方法
    loadSchedule,
    generateSchedule,
    selectEntry,
    moveEntry,
    detectConflicts,
    setViewMode,
    toggleHeatmap,
    setFixedCourse,
    unsetFixedCourse,
    batchSetFixedCourses,
    batchUnsetFixedCourses,
    getFixedCourses,
    reset,
  };
});
