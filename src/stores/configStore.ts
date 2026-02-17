/**
 * 配置状态管理
 * 使用 Pinia 管理系统配置相关的状态和操作
 */
import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { logger } from '@/utils/logger';

// ========== 类型定义 ==========

/**
 * 科目配置接口
 */
export interface SubjectConfig {
  /** 科目ID */
  id: string;
  /** 科目名称 */
  name: string;
  /** 禁止时段掩码（u64 位掩码的 JSON 字符串） */
  forbiddenSlots: string;
  /** 是否允许连堂 */
  allowDoubleSession: boolean;
  /** 关联场地ID */
  venueId?: string;
  /** 是否主科 */
  isMajorSubject: boolean;
}

/**
 * 班级配置接口
 */
export interface ClassConfig {
  /** 班级ID */
  id: number;
  /** 班级名称 */
  name: string;
  /** 年级 */
  gradeLevel?: number;
  /** 创建时间 */
  createdAt: string;
  /** 更新时间 */
  updatedAt: string;
}

/**
 * 场地配置接口
 */
export interface VenueConfig {
  /** 场地ID */
  id: string;
  /** 场地名称 */
  name: string;
  /** 容量（同时容纳的班级数） */
  capacity: number;
  /** 类型（可选） */
  type?: string;
  /** 创建时间 */
  createdAt: string;
}

/**
 * 教研组配置接口
 */
export interface TeachingGroupConfig {
  /** 教研组ID */
  id: number;
  /** 教研组名称 */
  name: string;
  /** 描述 */
  description?: string;
  /** 创建时间 */
  createdAt: string;
}

/**
 * 固定课程配置接口
 */
export interface FixedCourseConfig {
  /** ID */
  id?: number;
  /** 班级ID */
  classId: number;
  /** 科目ID */
  subjectId: string;
  /** 教师ID */
  teacherId: number;
  /** 星期（0-29） */
  day: number;
  /** 节次（0-11） */
  period: number;
  /** 是否预排课程 */
  isPreArranged: boolean;
  /** 创建时间 */
  createdAt?: string;
}

/**
 * 教师互斥关系配置接口
 */
export interface TeacherMutualExclusionConfig {
  /** ID */
  id?: number;
  /** 教师A的ID */
  teacherAId: number;
  /** 教师B的ID */
  teacherBId: number;
  /** 互斥范围类型 */
  scopeType: 'AllTime' | 'SpecificSlots';
  /** 特定时段掩码（仅当 scopeType='SpecificSlots'） */
  specificSlots?: string;
  /** 创建时间 */
  createdAt?: string;
}

/**
 * 排课周期配置接口
 */
export interface ScheduleCycleConfig {
  /** 排课周期天数（1-30） */
  cycleDays: number;
  /** 每天节次数（1-12） */
  periodsPerDay: number;
}

/**
 * 配置验证结果接口
 */
export interface ConfigValidationResult {
  /** 是否有效 */
  isValid: boolean;
  /** 错误列表 */
  errors: string[];
  /** 警告列表 */
  warnings: string[];
}

/**
 * 配置状态管理 Store
 */
export const useConfigStore = defineStore(
  'config',
  () => {
  // ========== 状态 ==========

  // 排课周期配置
  const cycleConfig = ref<ScheduleCycleConfig>({
    cycleDays: 5,
    periodsPerDay: 8,
  });

  // 科目配置列表
  const subjectConfigs = ref<SubjectConfig[]>([]);

  // 班级配置列表
  const classConfigs = ref<ClassConfig[]>([]);

  // 场地配置列表
  const venueConfigs = ref<VenueConfig[]>([]);

  // 教研组配置列表
  const teachingGroupConfigs = ref<TeachingGroupConfig[]>([]);

  // 固定课程配置列表
  const fixedCourseConfigs = ref<FixedCourseConfig[]>([]);

  // 教师互斥关系配置列表
  const mutualExclusionConfigs = ref<TeacherMutualExclusionConfig[]>([]);

  // 是否正在加载
  const isLoading = ref(false);

  // 是否已加载配置
  const isConfigLoaded = ref(false);

  // ========== 计算属性 ==========

  // 科目配置数量
  const subjectCount = computed(() => subjectConfigs.value.length);

  // 班级配置数量
  const classCount = computed(() => classConfigs.value.length);

  // 场地配置数量
  const venueCount = computed(() => venueConfigs.value.length);

  // 教研组配置数量
  const teachingGroupCount = computed(() => teachingGroupConfigs.value.length);

  // 固定课程数量
  const fixedCourseCount = computed(() => fixedCourseConfigs.value.length);

  // 互斥关系数量
  const mutualExclusionCount = computed(() => mutualExclusionConfigs.value.length);

  // 是否有配置数据
  const hasConfig = computed(() => {
    return (
      subjectConfigs.value.length > 0 ||
      classConfigs.value.length > 0 ||
      venueConfigs.value.length > 0
    );
  });

  // 科目配置映射（按ID索引）
  const subjectConfigMap = computed(() => {
    const map = new Map<string, SubjectConfig>();
    subjectConfigs.value.forEach((config) => {
      map.set(config.id, config);
    });
    return map;
  });

  // 班级配置映射（按ID索引）
  const classConfigMap = computed(() => {
    const map = new Map<number, ClassConfig>();
    classConfigs.value.forEach((config) => {
      map.set(config.id, config);
    });
    return map;
  });

  // 场地配置映射（按ID索引）
  const venueConfigMap = computed(() => {
    const map = new Map<string, VenueConfig>();
    venueConfigs.value.forEach((config) => {
      map.set(config.id, config);
    });
    return map;
  });

  // 教研组配置映射（按ID索引）
  const teachingGroupConfigMap = computed(() => {
    const map = new Map<number, TeachingGroupConfig>();
    teachingGroupConfigs.value.forEach((config) => {
      map.set(config.id, config);
    });
    return map;
  });

  // ========== 操作方法 ==========

  /**
   * 加载所有配置
   */
  const loadConfig = async (): Promise<void> => {
    try {
      logger.info('开始加载系统配置');
      isLoading.value = true;

      // 从后端 API 获取配置数据
      const { fetchSubjects, fetchVenues, fetchTeachingGroups } = await import('@/api/data');

      const [subjects, venues, teachingGroups] = await Promise.all([
        fetchSubjects(),
        fetchVenues(),
        fetchTeachingGroups(),
      ]);

      // 转换数据格式并更新状态
      if (subjects && Array.isArray(subjects)) {
        subjectConfigs.value = subjects.map((s: any) => ({
          id: s.id,
          name: s.name,
          forbiddenSlots: s.forbidden_slots || '0',
          allowDoubleSession: Boolean(s.allow_double_session),
          venueId: s.venue_id,
          isMajorSubject: Boolean(s.is_major_subject),
        }));
      }

      if (venues && Array.isArray(venues)) {
        venueConfigs.value = venues.map((v: any) => ({
          id: v.id,
          name: v.name,
          capacity: v.capacity || 1,
          type: v.type,
          createdAt: v.created_at || new Date().toISOString(),
        }));
      }

      if (teachingGroups && Array.isArray(teachingGroups)) {
        teachingGroupConfigs.value = teachingGroups.map((tg: any) => ({
          id: tg.id,
          name: tg.name,
          description: tg.description,
          createdAt: tg.created_at || new Date().toISOString(),
        }));
      }

      isConfigLoaded.value = true;

      logger.info('系统配置加载成功', {
        subjectCount: subjectCount.value,
        venueCount: venueCount.value,
        teachingGroupCount: teachingGroupCount.value,
      });
    } catch (error) {
      logger.error('加载系统配置失败', { error });
      throw error;
    } finally {
      isLoading.value = false;
    }
  };

  /**
   * 保存排课周期配置
   */
  const saveCycleConfig = async (config: ScheduleCycleConfig): Promise<void> => {
    try {
      logger.info('保存排课周期配置', config);

      // 验证配置
      if (config.cycleDays < 1 || config.cycleDays > 30) {
        throw new Error('排课周期天数必须在 1-30 之间');
      }
      if (config.periodsPerDay < 1 || config.periodsPerDay > 12) {
        throw new Error('每天节次数必须在 1-12 之间');
      }

      // TODO: 调用 Tauri 命令或 API 保存配置
      // await invoke('save_cycle_config', { config });

      // 更新本地状态
      cycleConfig.value = { ...config };

      logger.info('排课周期配置保存成功', config);
    } catch (error) {
      logger.error('保存排课周期配置失败', { error, config });
      throw error;
    }
  };

  /**
   * 保存科目配置
   */
  const saveSubjectConfig = async (config: SubjectConfig): Promise<void> => {
    try {
      logger.info('保存科目配置', { subjectId: config.id });

      // TODO: 调用 Tauri 命令或 API 保存配置
      // await invoke('save_subject_config', { config });

      // 更新本地状态
      const index = subjectConfigs.value.findIndex((c) => c.id === config.id);
      if (index >= 0) {
        subjectConfigs.value[index] = { ...config };
      } else {
        subjectConfigs.value.push({ ...config });
      }

      logger.info('科目配置保存成功', { subjectId: config.id });
    } catch (error) {
      logger.error('保存科目配置失败', { error, subjectId: config.id });
      throw error;
    }
  };

  /**
   * 批量保存科目配置
   */
  const batchSaveSubjectConfigs = async (configs: SubjectConfig[]): Promise<void> => {
    try {
      logger.info('批量保存科目配置', { count: configs.length });

      // TODO: 调用 Tauri 命令或 API 批量保存配置
      // await invoke('batch_save_subject_configs', { configs });

      // 更新本地状态
      subjectConfigs.value = [...configs];

      logger.info('批量保存科目配置成功', { count: configs.length });
    } catch (error) {
      logger.error('批量保存科目配置失败', { error, count: configs.length });
      throw error;
    }
  };

  /**
   * 删除科目配置
   */
  const deleteSubjectConfig = async (subjectId: string): Promise<void> => {
    try {
      logger.info('删除科目配置', { subjectId });

      // TODO: 调用 Tauri 命令或 API 删除配置
      // await invoke('delete_subject_config', { subjectId });

      // 更新本地状态
      subjectConfigs.value = subjectConfigs.value.filter((c) => c.id !== subjectId);

      logger.info('科目配置删除成功', { subjectId });
    } catch (error) {
      logger.error('删除科目配置失败', { error, subjectId });
      throw error;
    }
  };

  /**
   * 保存班级配置
   */
  const saveClassConfig = async (config: ClassConfig): Promise<void> => {
    try {
      logger.info('保存班级配置', { classId: config.id });

      // TODO: 调用 Tauri 命令或 API 保存配置
      // await invoke('save_class_config', { config });

      // 更新本地状态
      const index = classConfigs.value.findIndex((c) => c.id === config.id);
      if (index >= 0) {
        classConfigs.value[index] = { ...config };
      } else {
        classConfigs.value.push({ ...config });
      }

      logger.info('班级配置保存成功', { classId: config.id });
    } catch (error) {
      logger.error('保存班级配置失败', { error, classId: config.id });
      throw error;
    }
  };

  /**
   * 批量保存班级配置
   */
  const batchSaveClassConfigs = async (configs: ClassConfig[]): Promise<void> => {
    try {
      logger.info('批量保存班级配置', { count: configs.length });

      // TODO: 调用 Tauri 命令或 API 批量保存配置
      // await invoke('batch_save_class_configs', { configs });

      // 更新本地状态
      classConfigs.value = [...configs];

      logger.info('批量保存班级配置成功', { count: configs.length });
    } catch (error) {
      logger.error('批量保存班级配置失败', { error, count: configs.length });
      throw error;
    }
  };

  /**
   * 删除班级配置
   */
  const deleteClassConfig = async (classId: number): Promise<void> => {
    try {
      logger.info('删除班级配置', { classId });

      // TODO: 调用 Tauri 命令或 API 删除配置
      // await invoke('delete_class_config', { classId });

      // 更新本地状态
      classConfigs.value = classConfigs.value.filter((c) => c.id !== classId);

      logger.info('班级配置删除成功', { classId });
    } catch (error) {
      logger.error('删除班级配置失败', { error, classId });
      throw error;
    }
  };

  /**
   * 保存场地配置
   */
  const saveVenueConfig = async (config: VenueConfig): Promise<void> => {
    try {
      logger.info('保存场地配置', { venueId: config.id });

      // 验证配置
      if (config.capacity < 1) {
        throw new Error('场地容量必须大于 0');
      }

      // TODO: 调用 Tauri 命令或 API 保存配置
      // await invoke('save_venue_config', { config });

      // 更新本地状态
      const index = venueConfigs.value.findIndex((c) => c.id === config.id);
      if (index >= 0) {
        venueConfigs.value[index] = { ...config };
      } else {
        venueConfigs.value.push({ ...config });
      }

      logger.info('场地配置保存成功', { venueId: config.id });
    } catch (error) {
      logger.error('保存场地配置失败', { error, venueId: config.id });
      throw error;
    }
  };

  /**
   * 批量保存场地配置
   */
  const batchSaveVenueConfigs = async (configs: VenueConfig[]): Promise<void> => {
    try {
      logger.info('批量保存场地配置', { count: configs.length });

      // TODO: 调用 Tauri 命令或 API 批量保存配置
      // await invoke('batch_save_venue_configs', { configs });

      // 更新本地状态
      venueConfigs.value = [...configs];

      logger.info('批量保存场地配置成功', { count: configs.length });
    } catch (error) {
      logger.error('批量保存场地配置失败', { error, count: configs.length });
      throw error;
    }
  };

  /**
   * 删除场地配置
   */
  const deleteVenueConfig = async (venueId: string): Promise<void> => {
    try {
      logger.info('删除场地配置', { venueId });

      // TODO: 调用 Tauri 命令或 API 删除配置
      // await invoke('delete_venue_config', { venueId });

      // 更新本地状态
      venueConfigs.value = venueConfigs.value.filter((c) => c.id !== venueId);

      logger.info('场地配置删除成功', { venueId });
    } catch (error) {
      logger.error('删除场地配置失败', { error, venueId });
      throw error;
    }
  };

  /**
   * 保存教研组配置
   */
  const saveTeachingGroupConfig = async (config: TeachingGroupConfig): Promise<void> => {
    try {
      logger.info('保存教研组配置', { groupId: config.id });

      // TODO: 调用 Tauri 命令或 API 保存配置
      // await invoke('save_teaching_group_config', { config });

      // 更新本地状态
      const index = teachingGroupConfigs.value.findIndex((c) => c.id === config.id);
      if (index >= 0) {
        teachingGroupConfigs.value[index] = { ...config };
      } else {
        teachingGroupConfigs.value.push({ ...config });
      }

      logger.info('教研组配置保存成功', { groupId: config.id });
    } catch (error) {
      logger.error('保存教研组配置失败', { error, groupId: config.id });
      throw error;
    }
  };

  /**
   * 批量保存教研组配置
   */
  const batchSaveTeachingGroupConfigs = async (configs: TeachingGroupConfig[]): Promise<void> => {
    try {
      logger.info('批量保存教研组配置', { count: configs.length });

      // TODO: 调用 Tauri 命令或 API 批量保存配置
      // await invoke('batch_save_teaching_group_configs', { configs });

      // 更新本地状态
      teachingGroupConfigs.value = [...configs];

      logger.info('批量保存教研组配置成功', { count: configs.length });
    } catch (error) {
      logger.error('批量保存教研组配置失败', { error, count: configs.length });
      throw error;
    }
  };

  /**
   * 删除教研组配置
   */
  const deleteTeachingGroupConfig = async (groupId: number): Promise<void> => {
    try {
      logger.info('删除教研组配置', { groupId });

      // TODO: 调用 Tauri 命令或 API 删除配置
      // await invoke('delete_teaching_group_config', { groupId });

      // 更新本地状态
      teachingGroupConfigs.value = teachingGroupConfigs.value.filter((c) => c.id !== groupId);

      logger.info('教研组配置删除成功', { groupId });
    } catch (error) {
      logger.error('删除教研组配置失败', { error, groupId });
      throw error;
    }
  };

  /**
   * 保存固定课程配置
   */
  const saveFixedCourseConfig = async (config: FixedCourseConfig): Promise<void> => {
    try {
      logger.info('保存固定课程配置', {
        classId: config.classId,
        subjectId: config.subjectId,
      });

      // TODO: 调用 Tauri 命令或 API 保存配置
      // await invoke('save_fixed_course_config', { config });

      // 更新本地状态
      if (config.id !== undefined) {
        const index = fixedCourseConfigs.value.findIndex((c) => c.id === config.id);
        if (index >= 0) {
          fixedCourseConfigs.value[index] = { ...config };
        } else {
          fixedCourseConfigs.value.push({ ...config });
        }
      } else {
        fixedCourseConfigs.value.push({ ...config });
      }

      logger.info('固定课程配置保存成功', {
        classId: config.classId,
        subjectId: config.subjectId,
      });
    } catch (error) {
      logger.error('保存固定课程配置失败', {
        error,
        classId: config.classId,
        subjectId: config.subjectId,
      });
      throw error;
    }
  };

  /**
   * 批量保存固定课程配置
   */
  const batchSaveFixedCourseConfigs = async (
    configs: FixedCourseConfig[]
  ): Promise<void> => {
    try {
      logger.info('批量保存固定课程配置', { count: configs.length });

      // TODO: 调用 Tauri 命令或 API 批量保存配置
      // await invoke('batch_save_fixed_course_configs', { configs });

      // 更新本地状态
      fixedCourseConfigs.value = [...configs];

      logger.info('批量保存固定课程配置成功', { count: configs.length });
    } catch (error) {
      logger.error('批量保存固定课程配置失败', { error, count: configs.length });
      throw error;
    }
  };

  /**
   * 删除固定课程配置
   */
  const deleteFixedCourseConfig = async (id: number): Promise<void> => {
    try {
      logger.info('删除固定课程配置', { id });

      // TODO: 调用 Tauri 命令或 API 删除配置
      // await invoke('delete_fixed_course_config', { id });

      // 更新本地状态
      fixedCourseConfigs.value = fixedCourseConfigs.value.filter((c) => c.id !== id);

      logger.info('固定课程配置删除成功', { id });
    } catch (error) {
      logger.error('删除固定课程配置失败', { error, id });
      throw error;
    }
  };

  /**
   * 保存教师互斥关系配置
   */
  const saveMutualExclusionConfig = async (
    config: TeacherMutualExclusionConfig
  ): Promise<void> => {
    try {
      logger.info('保存教师互斥关系配置', {
        teacherAId: config.teacherAId,
        teacherBId: config.teacherBId,
      });

      // 验证配置
      if (config.teacherAId === config.teacherBId) {
        throw new Error('不能设置教师与自己互斥');
      }

      // TODO: 调用 Tauri 命令或 API 保存配置
      // await invoke('save_mutual_exclusion_config', { config });

      // 更新本地状态
      if (config.id !== undefined) {
        const index = mutualExclusionConfigs.value.findIndex((c) => c.id === config.id);
        if (index >= 0) {
          mutualExclusionConfigs.value[index] = { ...config };
        } else {
          mutualExclusionConfigs.value.push({ ...config });
        }
      } else {
        mutualExclusionConfigs.value.push({ ...config });
      }

      logger.info('教师互斥关系配置保存成功', {
        teacherAId: config.teacherAId,
        teacherBId: config.teacherBId,
      });
    } catch (error) {
      logger.error('保存教师互斥关系配置失败', {
        error,
        teacherAId: config.teacherAId,
        teacherBId: config.teacherBId,
      });
      throw error;
    }
  };

  /**
   * 批量保存教师互斥关系配置
   */
  const batchSaveMutualExclusionConfigs = async (
    configs: TeacherMutualExclusionConfig[]
  ): Promise<void> => {
    try {
      logger.info('批量保存教师互斥关系配置', { count: configs.length });

      // TODO: 调用 Tauri 命令或 API 批量保存配置
      // await invoke('batch_save_mutual_exclusion_configs', { configs });

      // 更新本地状态
      mutualExclusionConfigs.value = [...configs];

      logger.info('批量保存教师互斥关系配置成功', { count: configs.length });
    } catch (error) {
      logger.error('批量保存教师互斥关系配置失败', { error, count: configs.length });
      throw error;
    }
  };

  /**
   * 删除教师互斥关系配置
   */
  const deleteMutualExclusionConfig = async (id: number): Promise<void> => {
    try {
      logger.info('删除教师互斥关系配置', { id });

      // TODO: 调用 Tauri 命令或 API 删除配置
      // await invoke('delete_mutual_exclusion_config', { id });

      // 更新本地状态
      mutualExclusionConfigs.value = mutualExclusionConfigs.value.filter(
        (c) => c.id !== id
      );

      logger.info('教师互斥关系配置删除成功', { id });
    } catch (error) {
      logger.error('删除教师互斥关系配置失败', { error, id });
      throw error;
    }
  };

  /**
   * 验证配置
   */
  const validateConfig = (): ConfigValidationResult => {
    logger.info('开始验证配置');

    const errors: string[] = [];
    const warnings: string[] = [];

    // 验证排课周期配置
    if (cycleConfig.value.cycleDays < 1 || cycleConfig.value.cycleDays > 30) {
      errors.push('排课周期天数必须在 1-30 之间');
    }
    if (cycleConfig.value.periodsPerDay < 1 || cycleConfig.value.periodsPerDay > 12) {
      errors.push('每天节次数必须在 1-12 之间');
    }

    // 验证科目配置
    if (subjectConfigs.value.length === 0) {
      warnings.push('未配置任何科目');
    }

    // 验证班级配置
    if (classConfigs.value.length === 0) {
      warnings.push('未配置任何班级');
    }

    // 验证场地配置
    venueConfigs.value.forEach((venue) => {
      if (venue.capacity < 1) {
        errors.push(`场地 ${venue.name} 的容量必须大于 0`);
      }
    });

    // 验证固定课程配置
    fixedCourseConfigs.value.forEach((fixed) => {
      if (fixed.day < 0 || fixed.day >= cycleConfig.value.cycleDays) {
        errors.push(
          `固定课程（班级 ${fixed.classId}，科目 ${fixed.subjectId}）的星期超出范围`
        );
      }
      if (fixed.period < 0 || fixed.period >= cycleConfig.value.periodsPerDay) {
        errors.push(
          `固定课程（班级 ${fixed.classId}，科目 ${fixed.subjectId}）的节次超出范围`
        );
      }
    });

    // 验证教师互斥关系配置
    mutualExclusionConfigs.value.forEach((exclusion) => {
      if (exclusion.teacherAId === exclusion.teacherBId) {
        errors.push('不能设置教师与自己互斥');
      }
    });

    const isValid = errors.length === 0;

    logger.info('配置验证完成', {
      isValid,
      errorCount: errors.length,
      warningCount: warnings.length,
    });

    return {
      isValid,
      errors,
      warnings,
    };
  };

  /**
   * 根据ID获取科目配置
   */
  const getSubjectConfig = (subjectId: string): SubjectConfig | undefined => {
    return subjectConfigMap.value.get(subjectId);
  };

  /**
   * 根据ID获取班级配置
   */
  const getClassConfig = (classId: number): ClassConfig | undefined => {
    return classConfigMap.value.get(classId);
  };

  /**
   * 根据ID获取场地配置
   */
  const getVenueConfig = (venueId: string): VenueConfig | undefined => {
    return venueConfigMap.value.get(venueId);
  };

  /**
   * 重置状态
   */
  const reset = (): void => {
    logger.info('重置配置状态');

    cycleConfig.value = {
      cycleDays: 5,
      periodsPerDay: 8,
    };
    subjectConfigs.value = [];
    classConfigs.value = [];
    venueConfigs.value = [];
    fixedCourseConfigs.value = [];
    mutualExclusionConfigs.value = [];
    isLoading.value = false;
    isConfigLoaded.value = false;
  };

  // 返回状态和方法
  return {
    // 状态
    cycleConfig,
    subjectConfigs,
    classConfigs,
    venueConfigs,
    teachingGroupConfigs,
    fixedCourseConfigs,
    mutualExclusionConfigs,
    isLoading,
    isConfigLoaded,

    // 计算属性
    subjectCount,
    classCount,
    venueCount,
    teachingGroupCount,
    fixedCourseCount,
    mutualExclusionCount,
    hasConfig,
    subjectConfigMap,
    classConfigMap,
    venueConfigMap,
    teachingGroupConfigMap,

    // 方法
    loadConfig,
    saveCycleConfig,
    saveSubjectConfig,
    batchSaveSubjectConfigs,
    deleteSubjectConfig,
    saveClassConfig,
    batchSaveClassConfigs,
    deleteClassConfig,
    saveVenueConfig,
    batchSaveVenueConfigs,
    deleteVenueConfig,
    saveTeachingGroupConfig,
    batchSaveTeachingGroupConfigs,
    deleteTeachingGroupConfig,
    saveFixedCourseConfig,
    batchSaveFixedCourseConfigs,
    deleteFixedCourseConfig,
    saveMutualExclusionConfig,
    batchSaveMutualExclusionConfigs,
    deleteMutualExclusionConfig,
    validateConfig,
    getSubjectConfig,
    getClassConfig,
    getVenueConfig,
    reset,
  };
},
  {
    // 持久化配置
    persist: {
      key: 'config-store',
      storage: typeof window !== 'undefined' ? window.localStorage : undefined,
      // 持久化所有配置数据
      paths: [
        'cycleConfig',
        'subjectConfigs',
        'classConfigs',
        'venueConfigs',
        'teachingGroupConfigs',
        'fixedCourseConfigs',
        'mutualExclusionConfigs',
        'isConfigLoaded',
      ],
    },
  }
);
