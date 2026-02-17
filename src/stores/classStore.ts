/**
 * 班级状态管理
 * 使用 Pinia 管理班级相关的状态和操作
 */
import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { logger } from '@/utils/logger';

// 班级接口
export interface Class {
  id: number;
  name: string;
  grade?: string;
  studentCount?: number;
  createdAt: string;
  updatedAt: string;
}

/**
 * 班级状态管理 Store
 */
export const useClassStore = defineStore('class', () => {
  // ========== 状态 ==========

  // 班级列表
  const classes = ref<Class[]>([]);

  // 是否正在加载
  const isLoading = ref(false);

  // ========== 计算属性 ==========

  // 班级总数
  const classCount = computed(() => classes.value.length);

  // 是否有班级数据
  const hasClasses = computed(() => classes.value.length > 0);

  // ========== 操作方法 ==========

  /**
   * 设置班级列表
   */
  const setClasses = (data: Omit<Class, 'id' | 'createdAt' | 'updatedAt'>[]): void => {
    const timestamp = new Date().toISOString();
    classes.value = data.map((item, index) => ({
      ...item,
      id: index + 1,
      createdAt: timestamp,
      updatedAt: timestamp,
    }));

    logger.info('[ClassStore] 设置班级数据', { count: classes.value.length });
  };

  /**
   * 添加班级
   */
  const addClass = (classData: Omit<Class, 'id' | 'createdAt' | 'updatedAt'>): void => {
    const timestamp = new Date().toISOString();
    const newClass: Class = {
      ...classData,
      id: classes.value.length + 1,
      createdAt: timestamp,
      updatedAt: timestamp,
    };
    classes.value.push(newClass);

    logger.info('[ClassStore] 添加班级', { name: classData.name });
  };

  /**
   * 更新班级
   */
  const updateClass = (id: number, classData: Partial<Omit<Class, 'id' | 'createdAt'>>): void => {
    const index = classes.value.findIndex(c => c.id === id);
    if (index !== -1) {
      const current = classes.value[index];
      if (current) {
        classes.value[index] = {
          ...current,
          ...classData,
          name: classData.name ?? current.name,
          updatedAt: new Date().toISOString(),
        };

        logger.info('[ClassStore] 更新班级', { id, name: classData.name });
      }
    }
  };

  /**
   * 删除班级
   */
  const deleteClass = (id: number): void => {
    const index = classes.value.findIndex(c => c.id === id);
    if (index !== -1) {
      const classData = classes.value[index];
      classes.value.splice(index, 1);

      logger.info('[ClassStore] 删除班级', { id, name: classData?.name });
    }
  };

  /**
   * 加载所有班级
   */
  const loadClasses = async (): Promise<void> => {
    try {
      logger.info('开始加载班级列表');
      isLoading.value = true;

      // 从后端 API 获取班级数据
      const { fetchClasses } = await import('@/api/data');
      const result = await fetchClasses();

      if (result && Array.isArray(result)) {
        classes.value = result.map((c: any) => ({
          id: c.id,
          name: c.name,
          grade: c.grade_level,
          studentCount: c.student_count,
          createdAt: c.created_at || new Date().toISOString(),
          updatedAt: c.updated_at || new Date().toISOString(),
        }));
      }

      logger.info('班级列表加载成功', { count: classCount.value });
    } catch (error) {
      logger.error('加载班级列表失败', { error });
      throw error;
    } finally {
      isLoading.value = false;
    }
  };

  /**
   * 根据 ID 查找班级
   */
  const findClassById = (classId: number): Class | undefined => {
    return classes.value.find((c) => c.id === classId);
  };

  /**
   * 根据年级筛选班级
   */
  const filterClassesByGrade = (grade: string): Class[] => {
    return classes.value.filter((c) => c.grade === grade);
  };

  /**
   * 重置状态
   */
  const reset = (): void => {
    logger.info('[ClassStore] 重置班级状态');
    classes.value = [];
    isLoading.value = false;
  };

  // 返回状态和方法
  return {
    // 状态
    classes,
    isLoading,

    // 计算属性
    classCount,
    hasClasses,

    // 方法
    setClasses,
    loadClasses,
    addClass,
    updateClass,
    deleteClass,
    findClassById,
    filterClassesByGrade,
    reset,
  };
}, {
  persist: true, // 持久化存储
});
