/**
 * 教学计划状态管理
 * 使用 Pinia 管理教学计划相关的状态和操作
 */
import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { logger } from '@/utils/logger';

// 教学计划接口
export interface Curriculum {
  id: number;
  className: string;
  subjectName: string;
  teacherName: string;
  hoursPerWeek: number;
  requiresConsecutive?: boolean;
  createdAt: string;
  updatedAt: string;
}

/**
 * 教学计划状态管理 Store
 */
export const useCurriculumStore = defineStore('curriculum', () => {
  // ========== 状态 ==========

  // 教学计划列表
  const curriculums = ref<Curriculum[]>([]);

  // 是否正在加载
  const isLoading = ref(false);

  // ========== 计算属性 ==========

  // 教学计划总数
  const curriculumCount = computed(() => curriculums.value.length);

  // 是否有教学计划数据
  const hasCurriculums = computed(() => curriculums.value.length > 0);

  // ========== 操作方法 ==========

  /**
   * 设置教学计划列表
   */
  const setCurriculums = (data: Omit<Curriculum, 'id' | 'createdAt' | 'updatedAt'>[]): void => {
    const timestamp = new Date().toISOString();
    curriculums.value = data.map((item, index) => ({
      ...item,
      id: index + 1,
      createdAt: timestamp,
      updatedAt: timestamp,
    }));

    logger.info('[CurriculumStore] 设置教学计划数据', { count: curriculums.value.length });
  };

  /**
   * 添加教学计划
   */
  const addCurriculum = (curriculum: Omit<Curriculum, 'id' | 'createdAt' | 'updatedAt'>): void => {
    const timestamp = new Date().toISOString();
    const newCurriculum: Curriculum = {
      ...curriculum,
      id: curriculums.value.length + 1,
      createdAt: timestamp,
      updatedAt: timestamp,
    };
    curriculums.value.push(newCurriculum);

    logger.info('[CurriculumStore] 添加教学计划', {
      className: curriculum.className,
      subjectName: curriculum.subjectName,
    });
  };

  /**
   * 更新教学计划
   */
  const updateCurriculum = (id: number, curriculum: Partial<Omit<Curriculum, 'id' | 'createdAt'>>): void => {
    const index = curriculums.value.findIndex(c => c.id === id);
    if (index !== -1) {
      const current = curriculums.value[index];
      if (current) {
        curriculums.value[index] = {
          ...current,
          ...curriculum,
          className: curriculum.className ?? current.className,
          subjectName: curriculum.subjectName ?? current.subjectName,
          teacherName: curriculum.teacherName ?? current.teacherName,
          hoursPerWeek: curriculum.hoursPerWeek ?? current.hoursPerWeek,
          updatedAt: new Date().toISOString(),
        };

        logger.info('[CurriculumStore] 更新教学计划', { id });
      }
    }
  };

  /**
   * 删除教学计划
   */
  const deleteCurriculum = (id: number): void => {
    const index = curriculums.value.findIndex(c => c.id === id);
    if (index !== -1) {
      curriculums.value.splice(index, 1);

      logger.info('[CurriculumStore] 删除教学计划', { id });
    }
  };

  /**
   * 加载所有教学计划
   */
  const loadCurriculums = async (): Promise<void> => {
    try {
      logger.info('开始加载教学计划列表');
      isLoading.value = true;

      // 从后端 API 获取教学计划数据
      const { fetchCurriculums } = await import('@/api/data');
      const result = await fetchCurriculums();

      if (result && Array.isArray(result)) {
        curriculums.value = result.map((c: any) => ({
          id: c.id,
          className: c.class_name,
          subjectName: c.subject_name,
          teacherName: c.teacher_name,
          hoursPerWeek: c.target_sessions,
          requiresConsecutive: c.requires_consecutive,
          createdAt: c.created_at || new Date().toISOString(),
          updatedAt: c.updated_at || new Date().toISOString(),
        }));
      }

      logger.info('教学计划列表加载成功', { count: curriculumCount.value });
    } catch (error) {
      logger.error('加载教学计划列表失败', { error });
      throw error;
    } finally {
      isLoading.value = false;
    }
  };

  /**
   * 根据 ID 查找教学计划
   */
  const findCurriculumById = (curriculumId: number): Curriculum | undefined => {
    return curriculums.value.find((c) => c.id === curriculumId);
  };

  /**
   * 根据班级筛选教学计划
   */
  const filterCurriculumsByClass = (className: string): Curriculum[] => {
    return curriculums.value.filter((c) => c.className === className);
  };

  /**
   * 根据科目筛选教学计划
   */
  const filterCurriculumsBySubject = (subjectName: string): Curriculum[] => {
    return curriculums.value.filter((c) => c.subjectName === subjectName);
  };

  /**
   * 根据教师筛选教学计划
   */
  const filterCurriculumsByTeacher = (teacherName: string): Curriculum[] => {
    return curriculums.value.filter((c) => c.teacherName === teacherName);
  };

  /**
   * 重置状态
   */
  const reset = (): void => {
    logger.info('[CurriculumStore] 重置教学计划状态');
    curriculums.value = [];
    isLoading.value = false;
  };

  // 返回状态和方法
  return {
    // 状态
    curriculums,
    isLoading,

    // 计算属性
    curriculumCount,
    hasCurriculums,

    // 方法
    setCurriculums,
    loadCurriculums,
    addCurriculum,
    updateCurriculum,
    deleteCurriculum,
    findCurriculumById,
    filterCurriculumsByClass,
    filterCurriculumsBySubject,
    filterCurriculumsByTeacher,
    reset,
  };
}, {
  persist: true, // 持久化存储
});
