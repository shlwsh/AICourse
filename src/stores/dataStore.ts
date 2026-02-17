/**
 * 基础数据状态管理
 * 管理班级、教师、科目、场地等基础数据
 */
import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { logger } from '@/utils/logger';
import * as DataApi from '@/api/data';

// 教师接口
export interface Teacher {
  id: number;
  name: string;
  teaching_group_id?: number;
  teaching_group_name?: string;
}

// 班级接口
export interface Class {
  id: number;
  name: string;
  grade_level?: string;
}

// 科目接口
export interface Subject {
  id: string;
  name: string;
  forbidden_slots?: string;
  allow_double_session?: boolean;
  venue_id?: string;
  is_major_subject?: boolean;
}

// 场地接口
export interface Venue {
  id: string;
  name: string;
  capacity?: number;
}

// 教研组接口
export interface TeachingGroup {
  id: number;
  name: string;
}

/**
 * 基础数据状态管理 Store
 */
export const useDataStore = defineStore('data', () => {
  // ========== 状态 ==========

  // 教师列表
  const teachers = ref<Teacher[]>([]);

  // 班级列表
  const classes = ref<Class[]>([]);

  // 科目列表
  const subjects = ref<Subject[]>([]);

  // 场地列表
  const venues = ref<Venue[]>([]);

  // 教研组列表
  const teachingGroups = ref<TeachingGroup[]>([]);

  // 是否正在加载
  const isLoading = ref(false);

  // 是否已加载
  const isLoaded = ref(false);

  // ========== 计算属性 ==========

  // 教师映射（ID -> 教师）
  const teacherMap = computed(() => {
    const map = new Map<number, Teacher>();
    teachers.value.forEach(t => map.set(t.id, t));
    return map;
  });

  // 班级映射（ID -> 班级）
  const classMap = computed(() => {
    const map = new Map<number, Class>();
    classes.value.forEach(c => map.set(c.id, c));
    return map;
  });

  // 科目映射（ID -> 科目）
  const subjectMap = computed(() => {
    const map = new Map<string, Subject>();
    subjects.value.forEach(s => map.set(s.id, s));
    return map;
  });

  // 场地映射（ID -> 场地）
  const venueMap = computed(() => {
    const map = new Map<string, Venue>();
    venues.value.forEach(v => map.set(v.id, v));
    return map;
  });

  // ========== 操作方法 ==========

  /**
   * 加载所有基础数据
   */
  const loadAllData = async (): Promise<void> => {
    if (isLoaded.value) {
      logger.debug('[DataStore] 数据已加载，跳过');
      return;
    }

    try {
      logger.info('[DataStore] 开始加载基础数据');
      isLoading.value = true;

      const [teachersRes, classesRes, subjectsRes, venuesRes, groupsRes] = await Promise.all([
        DataApi.fetchTeachers(),
        DataApi.fetchClasses(),
        DataApi.fetchSubjects(),
        DataApi.fetchVenues(),
        DataApi.fetchTeachingGroups(),
      ]);

      teachers.value = (teachersRes as any).data || [];
      classes.value = (classesRes as any).data || [];
      subjects.value = (subjectsRes as any).data || [];
      venues.value = (venuesRes as any).data || [];
      teachingGroups.value = (groupsRes as any).data || [];

      isLoaded.value = true;

      logger.info('[DataStore] 基础数据加载成功', {
        teachers: teachers.value.length,
        classes: classes.value.length,
        subjects: subjects.value.length,
        venues: venues.value.length,
        teachingGroups: teachingGroups.value.length,
      });
    } catch (error) {
      logger.error('[DataStore] 加载基础数据失败', { error });
      throw error;
    } finally {
      isLoading.value = false;
    }
  };

  /**
   * 重新加载数据
   */
  const reloadData = async (): Promise<void> => {
    isLoaded.value = false;
    await loadAllData();
  };

  /**
   * 获取教师名称
   */
  const getTeacherName = (teacherId: number): string => {
    const teacher = teacherMap.value.get(teacherId);
    return teacher?.name || `教师${teacherId}`;
  };

  /**
   * 获取班级名称
   */
  const getClassName = (classId: number): string => {
    const cls = classMap.value.get(classId);
    return cls?.name || `班级${classId}`;
  };

  /**
   * 获取科目名称
   */
  const getSubjectName = (subjectId: string): string => {
    const subject = subjectMap.value.get(subjectId);
    return subject?.name || subjectId;
  };

  /**
   * 获取场地名称
   */
  const getVenueName = (venueId: string): string => {
    const venue = venueMap.value.get(venueId);
    return venue?.name || venueId;
  };

  /**
   * 清空数据
   */
  const clearData = (): void => {
    teachers.value = [];
    classes.value = [];
    subjects.value = [];
    venues.value = [];
    teachingGroups.value = [];
    isLoaded.value = false;
    logger.info('[DataStore] 数据已清空');
  };

  return {
    // 状态
    teachers,
    classes,
    subjects,
    venues,
    teachingGroups,
    isLoading,
    isLoaded,

    // 计算属性
    teacherMap,
    classMap,
    subjectMap,
    venueMap,

    // 方法
    loadAllData,
    reloadData,
    getTeacherName,
    getClassName,
    getSubjectName,
    getVenueName,
    clearData,
  };
});
