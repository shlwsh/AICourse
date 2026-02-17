/**
 * 年级状态管理
 * 使用 Pinia 管理年级相关的状态和操作
 */
import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { logger } from '@/utils/logger';

// 年级接口
export interface Grade {
  id: number;
  name: string;
  order?: number;
  createdAt: string;
  updatedAt: string;
}

/**
 * 年级状态管理 Store
 */
export const useGradeStore = defineStore('grade', () => {
  // ========== 状态 ==========

  // 年级列表
  const grades = ref<Grade[]>([]);

  // 是否正在加载
  const isLoading = ref(false);

  // ========== 计算属性 ==========

  // 年级总数
  const gradeCount = computed(() => grades.value.length);

  // 是否有年级数据
  const hasGrades = computed(() => grades.value.length > 0);

  // ========== 操作方法 ==========

  /**
   * 设置年级列表
   */
  const setGrades = (data: Omit<Grade, 'id' | 'createdAt' | 'updatedAt'>[]): void => {
    const timestamp = new Date().toISOString();
    grades.value = data.map((item, index) => ({
      ...item,
      id: index + 1,
      createdAt: timestamp,
      updatedAt: timestamp,
    }));

    logger.info('[GradeStore] 设置年级数据', { count: grades.value.length });
  };

  /**
   * 添加年级
   */
  const addGrade = (grade: Omit<Grade, 'id' | 'createdAt' | 'updatedAt'>): void => {
    const timestamp = new Date().toISOString();
    const newGrade: Grade = {
      ...grade,
      id: grades.value.length + 1,
      createdAt: timestamp,
      updatedAt: timestamp,
    };
    grades.value.push(newGrade);

    logger.info('[GradeStore] 添加年级', { name: grade.name });
  };

  /**
   * 更新年级
   */
  const updateGrade = (id: number, grade: Partial<Omit<Grade, 'id' | 'createdAt'>>): void => {
    const index = grades.value.findIndex(g => g.id === id);
    if (index !== -1) {
      const current = grades.value[index];
      if (current) {
        grades.value[index] = {
          ...current,
          ...grade,
          name: grade.name ?? current.name,
          updatedAt: new Date().toISOString(),
        };

        logger.info('[GradeStore] 更新年级', { id, name: grade.name });
      }
    }
  };

  /**
   * 删除年级
   */
  const deleteGrade = (id: number): void => {
    const index = grades.value.findIndex(g => g.id === id);
    if (index !== -1) {
      const grade = grades.value[index];
      grades.value.splice(index, 1);

      logger.info('[GradeStore] 删除年级', { id, name: grade?.name });
    }
  };

  /**
   * 根据 ID 查找年级
   */
  const findGradeById = (gradeId: number): Grade | undefined => {
    return grades.value.find((g) => g.id === gradeId);
  };

  /**
   * 根据名称查找年级
   */
  const findGradeByName = (name: string): Grade | undefined => {
    return grades.value.find((g) => g.name === name);
  };

  /**
   * 初始化默认年级
   */
  const initializeDefaults = (): void => {
    if (grades.value.length === 0) {
      const timestamp = new Date().toISOString();
      grades.value = [
        { id: 1, name: '高一', order: 1, createdAt: timestamp, updatedAt: timestamp },
        { id: 2, name: '高二', order: 2, createdAt: timestamp, updatedAt: timestamp },
        { id: 3, name: '高三', order: 3, createdAt: timestamp, updatedAt: timestamp },
      ];
      logger.info('[GradeStore] 初始化默认年级');
    }
  };

  /**
   * 重置状态
   */
  const reset = (): void => {
    logger.info('[GradeStore] 重置年级状态');
    grades.value = [];
    isLoading.value = false;
  };

  // 返回状态和方法
  return {
    // 状态
    grades,
    isLoading,

    // 计算属性
    gradeCount,
    hasGrades,

    // 方法
    setGrades,
    addGrade,
    updateGrade,
    deleteGrade,
    findGradeById,
    findGradeByName,
    initializeDefaults,
    reset,
  };
}, {
  persist: true, // 持久化存储
});
