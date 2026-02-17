/**
 * 字典数据 Store
 * 作为导入的统一入口，将数据分发到各个专门的 store
 */
import { defineStore } from 'pinia';
import { logger } from '@/utils/logger';

/**
 * 教师数据接口（用于导入）
 */
export interface TeacherImportData {
  name: string;
  teachingGroup?: string;
  maxHoursPerDay?: number;
  maxConsecutiveHours?: number;
  unavailableSlots?: string[];
}

/**
 * 班级数据接口（用于导入）
 */
export interface ClassImportData {
  name: string;
  grade?: string;
  studentCount?: number;
}

/**
 * 科目数据接口（用于导入）
 */
export interface SubjectImportData {
  id?: string;
  name: string;
  isMajorSubject?: boolean;
  allowDoubleSession?: boolean;
  venueId?: string;
  forbiddenSlots?: string;
  // 保留兼容性字段
  category?: string;
  requiresLab?: boolean;
}

/**
 * 教学计划数据接口（用于导入）
 */
export interface CurriculumImportData {
  className: string;
  subjectName: string;
  teacherName: string;
  hoursPerWeek: number;
  requiresConsecutive?: boolean;
}

/**
 * 教研组数据接口（用于导入）
 */
export interface TeachingGroupImportData {
  name: string;
  description?: string;
}

/**
 * 年级数据接口（用于导入）
 */
export interface GradeImportData {
  name: string;
  order?: number;
}

/**
 * 场地数据接口（用于导入）
 */
export interface VenueImportData {
  id?: string;
  name: string;
  capacity?: number;
  type?: string;
}

/**
 * 字典数据 Store
 * 作为导入的统一入口
 */
export const useDictionaryStore = defineStore('dictionary', () => {
  /**
   * 从导入结果设置所有数据
   * 将数据分发到各个专门的 store
   */
  async function setImportedData(data: {
    teachers?: TeacherImportData[];
    classes?: ClassImportData[];
    subjects?: SubjectImportData[];
    curriculums?: CurriculumImportData[];
    teachingGroups?: TeachingGroupImportData[];
    grades?: GradeImportData[];
    venues?: VenueImportData[];
  }): Promise<void> {
    logger.info('[DictionaryStore] 开始导入数据', {
      teachers: data.teachers?.length || 0,
      classes: data.classes?.length || 0,
      subjects: data.subjects?.length || 0,
      curriculums: data.curriculums?.length || 0,
      teachingGroups: data.teachingGroups?.length || 0,
      grades: data.grades?.length || 0,
      venues: data.venues?.length || 0,
    });

    try {
      // 动态导入各个 store 并分发数据
      const [
        { useTeacherStore },
        { useClassStore },
        { useCurriculumStore },
        { useGradeStore },
        { useConfigStore },
      ] = await Promise.all([
        import('./teacherStore'),
        import('./classStore'),
        import('./curriculumStore'),
        import('./gradeStore'),
        import('./configStore'),
      ]);

      const configStore = useConfigStore();

      // 先导入场地到 configStore（需要在科目之前，因为科目可能引用场地）
      if (data.venues && data.venues.length > 0) {
        const venueConfigs = data.venues.map((v) => ({
          id: v.id || `venue-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          name: v.name,
          capacity: v.capacity || 1,
          type: v.type,
          createdAt: new Date().toISOString(),
        }));
        await configStore.batchSaveVenueConfigs(venueConfigs);
      }

      // 导入教研组到 configStore
      if (data.teachingGroups && data.teachingGroups.length > 0) {
        const teachingGroupConfigs = data.teachingGroups.map((tg, index) => ({
          id: Date.now() + index,
          name: tg.name,
          description: tg.description,
          createdAt: new Date().toISOString(),
        }));
        await configStore.batchSaveTeachingGroupConfigs(teachingGroupConfigs);
      }

      // 导入科目到 configStore
      if (data.subjects && data.subjects.length > 0) {
        const subjectConfigs = data.subjects.map((s) => ({
          id: s.id || `subject-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          name: s.name,
          forbiddenSlots: s.forbiddenSlots || '0',
          allowDoubleSession: s.allowDoubleSession !== undefined ? s.allowDoubleSession : true,
          isMajorSubject: s.isMajorSubject !== undefined ? s.isMajorSubject : false,
          venueId: s.venueId || undefined,
        }));
        await configStore.batchSaveSubjectConfigs(subjectConfigs);
      }

      // 导入年级
      if (data.grades && data.grades.length > 0) {
        const gradeStore = useGradeStore();
        gradeStore.setGrades(data.grades);
      }

      // 再导入主要数据（教师、班级、教学计划）
      if (data.teachers && data.teachers.length > 0) {
        const teacherStore = useTeacherStore();
        teacherStore.setTeachers(data.teachers);
      }

      if (data.classes && data.classes.length > 0) {
        const classStore = useClassStore();
        classStore.setClasses(data.classes);
      }

      if (data.curriculums && data.curriculums.length > 0) {
        const curriculumStore = useCurriculumStore();
        curriculumStore.setCurriculums(data.curriculums);
      }

      logger.info('[DictionaryStore] 数据导入完成');
    } catch (error) {
      logger.error('[DictionaryStore] 数据导入失败', { error });
      throw error;
    }
  }

  /**
   * 清空所有数据
   */
  function clearAll(): void {
    logger.info('[DictionaryStore] 清空所有数据');

    Promise.all([
      import('./teacherStore'),
      import('./classStore'),
      import('./curriculumStore'),
      import('./gradeStore'),
      import('./configStore'),
    ]).then(([
      { useTeacherStore },
      { useClassStore },
      { useCurriculumStore },
      { useGradeStore },
      { useConfigStore },
    ]) => {
      useTeacherStore().reset();
      useClassStore().reset();
      useCurriculumStore().reset();
      useGradeStore().reset();
      useConfigStore().reset();
    });
  }

  /**
   * 初始化默认字典数据
   */
  function initializeDefaults(): void {
    logger.info('[DictionaryStore] 初始化默认字典数据');

    Promise.all([
      import('./gradeStore'),
    ]).then(([
      { useGradeStore },
    ]) => {
      useGradeStore().initializeDefaults();
    });
  }

  return {
    setImportedData,
    clearAll,
    initializeDefaults,
  };
});
