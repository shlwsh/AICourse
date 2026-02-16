/**
 * 搜索和筛选 Composable
 * 实现课程搜索、教师筛选、班级筛选、科目筛选功能
 *
 * 功能特性：
 * - 课程全文搜索
 * - 教师筛选
 * - 班级筛选
 * - 科目筛选
 * - 多条件组合筛选
 * - 搜索历史记录
 * - 包含完整的日志记录
 */
import { ref, computed, watch } from 'vue';
import { logger } from '@/utils/logger';
import type { ScheduleEntry } from '@/stores/scheduleStore';

// ========== 类型定义 ==========

/**
 * 搜索条件接口
 */
export interface SearchCriteria {
  /** 搜索关键词 */
  keyword?: string;
  /** 教师ID列表 */
  teacherIds?: number[];
  /** 班级ID列表 */
  classIds?: number[];
  /** 科目ID列表 */
  subjectIds?: string[];
  /** 是否只显示固定课程 */
  fixedOnly?: boolean;
  /** 周类型筛选 */
  weekType?: 'Every' | 'Odd' | 'Even' | null;
  /** 时间槽位筛选 */
  timeSlots?: Array<{ day: number; period: number }>;
}

/**
 * 搜索结果接口
 */
export interface SearchResult {
  /** 匹配的课表条目 */
  entries: ScheduleEntry[];
  /** 总数量 */
  total: number;
  /** 匹配的关键词高亮信息 */
  highlights: Map<string, string[]>;
}

/**
 * 搜索历史记录接口
 */
export interface SearchHistoryItem {
  /** 历史记录ID */
  id: string;
  /** 搜索条件 */
  criteria: SearchCriteria;
  /** 搜索时间 */
  timestamp: number;
  /** 结果数量 */
  resultCount: number;
}

/**
 * 搜索配置
 */
export interface SearchConfig {
  /** 是否启用搜索历史 */
  enableHistory?: boolean;
  /** 最大历史记录数量 */
  maxHistorySize?: number;
  /** 是否区分大小写 */
  caseSensitive?: boolean;
  /** 是否模糊匹配 */
  fuzzyMatch?: boolean;
}

// ========== Composable ==========

/**
 * 使用搜索和筛选功能
 */
export function useSearch(config: SearchConfig = {}) {
  const {
    enableHistory = true,
    maxHistorySize = 20,
    caseSensitive = false,
    fuzzyMatch = true,
  } = config;

  // ========== 状态 ==========

  /** 当前搜索条件 */
  const criteria = ref<SearchCriteria>({});

  /** 搜索结果 */
  const result = ref<SearchResult>({
    entries: [],
    total: 0,
    highlights: new Map(),
  });

  /** 是否正在搜索 */
  const isSearching = ref(false);

  /** 搜索历史记录 */
  const searchHistory = ref<SearchHistoryItem[]>([]);

  /** 可用的教师列表 */
  const availableTeachers = ref<Array<{ id: number; name: string }>>([]);

  /** 可用的班级列表 */
  const availableClasses = ref<Array<{ id: number; name: string }>>([]);

  /** 可用的科目列表 */
  const availableSubjects = ref<Array<{ id: string; name: string }>>([]);

  // ========== 计算属性 ==========

  /** 是否有搜索条件 */
  const hasCriteria = computed(() => {
    return !!(
      criteria.value.keyword ||
      (criteria.value.teacherIds && criteria.value.teacherIds.length > 0) ||
      (criteria.value.classIds && criteria.value.classIds.length > 0) ||
      (criteria.value.subjectIds && criteria.value.subjectIds.length > 0) ||
      criteria.value.fixedOnly ||
      criteria.value.weekType ||
      (criteria.value.timeSlots && criteria.value.timeSlots.length > 0)
    );
  });

  /** 是否有搜索结果 */
  const hasResults = computed(() => {
    return result.value.total > 0;
  });

  /** 搜索结果数量 */
  const resultCount = computed(() => {
    return result.value.total;
  });

  /** 搜索历史数量 */
  const historyCount = computed(() => {
    return searchHistory.value.length;
  });

  // ========== 方法 ==========

  /**
   * 设置搜索关键词
   */
  const setKeyword = (keyword: string): void => {
    logger.debug('设置搜索关键词', { keyword });
    criteria.value.keyword = keyword;
  };

  /**
   * 设置教师筛选
   */
  const setTeacherFilter = (teacherIds: number[]): void => {
    logger.debug('设置教师筛选', { teacherIds });
    criteria.value.teacherIds = teacherIds;
  };

  /**
   * 设置班级筛选
   */
  const setClassFilter = (classIds: number[]): void => {
    logger.debug('设置班级筛选', { classIds });
    criteria.value.classIds = classIds;
  };

  /**
   * 设置科目筛选
   */
  const setSubjectFilter = (subjectIds: string[]): void => {
    logger.debug('设置科目筛选', { subjectIds });
    criteria.value.subjectIds = subjectIds;
  };

  /**
   * 设置固定课程筛选
   */
  const setFixedFilter = (fixedOnly: boolean): void => {
    logger.debug('设置固定课程筛选', { fixedOnly });
    criteria.value.fixedOnly = fixedOnly;
  };

  /**
   * 设置周类型筛选
   */
  const setWeekTypeFilter = (weekType: 'Every' | 'Odd' | 'Even' | null): void => {
    logger.debug('设置周类型筛选', { weekType });
    criteria.value.weekType = weekType;
  };

  /**
   * 设置时间槽位筛选
   */
  const setTimeSlotFilter = (timeSlots: Array<{ day: number; period: number }>): void => {
    logger.debug('设置时间槽位筛选', { timeSlots });
    criteria.value.timeSlots = timeSlots;
  };

  /**
   * 执行搜索
   */
  const search = async (entries: ScheduleEntry[]): Promise<void> => {
    logger.info('开始搜索', { criteria: criteria.value });
    isSearching.value = true;

    try {
      // 过滤课表条目
      let filteredEntries = [...entries];

      // 关键词搜索
      if (criteria.value.keyword) {
        filteredEntries = filterByKeyword(filteredEntries, criteria.value.keyword);
      }

      // 教师筛选
      if (criteria.value.teacherIds && criteria.value.teacherIds.length > 0) {
        filteredEntries = filteredEntries.filter((entry) =>
          criteria.value.teacherIds!.includes(entry.teacherId)
        );
      }

      // 班级筛选
      if (criteria.value.classIds && criteria.value.classIds.length > 0) {
        filteredEntries = filteredEntries.filter((entry) =>
          criteria.value.classIds!.includes(entry.classId)
        );
      }

      // 科目筛选
      if (criteria.value.subjectIds && criteria.value.subjectIds.length > 0) {
        filteredEntries = filteredEntries.filter((entry) =>
          criteria.value.subjectIds!.includes(entry.subjectId)
        );
      }

      // 固定课程筛选
      if (criteria.value.fixedOnly) {
        filteredEntries = filteredEntries.filter((entry) => entry.isFixed);
      }

      // 周类型筛选
      if (criteria.value.weekType) {
        filteredEntries = filteredEntries.filter(
          (entry) => entry.weekType === criteria.value.weekType
        );
      }

      // 时间槽位筛选
      if (criteria.value.timeSlots && criteria.value.timeSlots.length > 0) {
        filteredEntries = filteredEntries.filter((entry) =>
          criteria.value.timeSlots!.some(
            (slot) =>
              slot.day === entry.timeSlot.day && slot.period === entry.timeSlot.period
          )
        );
      }

      // 生成高亮信息
      const highlights = new Map<string, string[]>();
      if (criteria.value.keyword) {
        filteredEntries.forEach((entry) => {
          const entryKey = `${entry.classId}-${entry.timeSlot.day}-${entry.timeSlot.period}`;
          const matchedFields: string[] = [];

          if (matchKeyword(entry.subjectId, criteria.value.keyword!)) {
            matchedFields.push('科目');
          }

          if (matchedFields.length > 0) {
            highlights.set(entryKey, matchedFields);
          }
        });
      }

      // 更新搜索结果
      result.value = {
        entries: filteredEntries,
        total: filteredEntries.length,
        highlights,
      };

      logger.info('搜索完成', {
        total: result.value.total,
        highlightCount: highlights.size,
      });

      // 添加到搜索历史
      if (enableHistory && hasCriteria.value) {
        addToHistory(criteria.value, result.value.total);
      }
    } catch (error) {
      logger.error('搜索失败', { error });
      throw error;
    } finally {
      isSearching.value = false;
    }
  };

  /**
   * 根据关键词过滤
   */
  const filterByKeyword = (entries: ScheduleEntry[], keyword: string): ScheduleEntry[] => {
    return entries.filter((entry) => {
      // 搜索科目ID
      if (matchKeyword(entry.subjectId, keyword)) {
        return true;
      }

      // 搜索教师ID（转换为字符串）
      if (matchKeyword(String(entry.teacherId), keyword)) {
        return true;
      }

      // 搜索班级ID（转换为字符串）
      if (matchKeyword(String(entry.classId), keyword)) {
        return true;
      }

      return false;
    });
  };

  /**
   * 匹配关键词
   */
  const matchKeyword = (text: string, keyword: string): boolean => {
    if (!text || !keyword) {
      return false;
    }

    const searchText = caseSensitive ? text : text.toLowerCase();
    const searchKeyword = caseSensitive ? keyword : keyword.toLowerCase();

    if (fuzzyMatch) {
      // 模糊匹配：包含关键词即可
      return searchText.includes(searchKeyword);
    } else {
      // 精确匹配：完全相等
      return searchText === searchKeyword;
    }
  };

  /**
   * 清空搜索条件
   */
  const clearCriteria = (): void => {
    logger.info('清空搜索条件');
    criteria.value = {};
    result.value = {
      entries: [],
      total: 0,
      highlights: new Map(),
    };
  };

  /**
   * 清空搜索结果
   */
  const clearResults = (): void => {
    logger.info('清空搜索结果');
    result.value = {
      entries: [],
      total: 0,
      highlights: new Map(),
    };
  };

  /**
   * 添加到搜索历史
   */
  const addToHistory = (searchCriteria: SearchCriteria, resultCount: number): void => {
    const historyItem: SearchHistoryItem = {
      id: `history-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      criteria: { ...searchCriteria },
      timestamp: Date.now(),
      resultCount,
    };

    logger.debug('添加搜索历史', { historyItem });

    // 添加到历史记录
    searchHistory.value.unshift(historyItem);

    // 限制历史记录数量
    if (searchHistory.value.length > maxHistorySize) {
      searchHistory.value = searchHistory.value.slice(0, maxHistorySize);
    }

    // 保存到本地存储
    saveHistoryToLocalStorage();
  };

  /**
   * 从历史记录加载搜索条件
   */
  const loadFromHistory = (historyId: string): boolean => {
    const historyItem = searchHistory.value.find((item) => item.id === historyId);

    if (!historyItem) {
      logger.warn('搜索历史记录不存在', { historyId });
      return false;
    }

    logger.info('从历史记录加载搜索条件', { historyItem });
    criteria.value = { ...historyItem.criteria };

    return true;
  };

  /**
   * 删除搜索历史记录
   */
  const deleteHistory = (historyId: string): void => {
    const index = searchHistory.value.findIndex((item) => item.id === historyId);

    if (index >= 0) {
      logger.info('删除搜索历史记录', { historyId });
      searchHistory.value.splice(index, 1);
      saveHistoryToLocalStorage();
    }
  };

  /**
   * 清空搜索历史
   */
  const clearHistory = (): void => {
    logger.info('清空搜索历史', { count: searchHistory.value.length });
    searchHistory.value = [];
    saveHistoryToLocalStorage();
  };

  /**
   * 保存历史记录到本地存储
   */
  const saveHistoryToLocalStorage = (): void => {
    try {
      localStorage.setItem('search-history', JSON.stringify(searchHistory.value));
      logger.debug('搜索历史已保存到本地存储');
    } catch (error) {
      logger.error('保存搜索历史失败', { error });
    }
  };

  /**
   * 从本地存储加载历史记录
   */
  const loadHistoryFromLocalStorage = (): void => {
    try {
      const dataStr = localStorage.getItem('search-history');
      if (!dataStr) {
        logger.debug('本地存储中没有搜索历史');
        return;
      }

      searchHistory.value = JSON.parse(dataStr);

      logger.info('搜索历史已从本地存储加载', {
        count: searchHistory.value.length,
      });
    } catch (error) {
      logger.error('加载搜索历史失败', { error });
    }
  };

  /**
   * 加载可用的筛选选项
   */
  const loadFilterOptions = async (): Promise<void> => {
    try {
      logger.info('加载筛选选项');

      // TODO: 从 API 加载教师、班级、科目列表
      // const teachers = await teacherApi.getAllTeachers();
      // availableTeachers.value = teachers;

      // const classes = await classApi.getAllClasses();
      // availableClasses.value = classes;

      // const subjects = await subjectApi.getAllSubjects();
      // availableSubjects.value = subjects;

      // 模拟数据
      availableTeachers.value = [
        { id: 101, name: '张老师' },
        { id: 102, name: '李老师' },
        { id: 103, name: '王老师' },
      ];

      availableClasses.value = [
        { id: 1, name: '一年级1班' },
        { id: 2, name: '一年级2班' },
        { id: 3, name: '二年级1班' },
      ];

      availableSubjects.value = [
        { id: 'math', name: '数学' },
        { id: 'chinese', name: '语文' },
        { id: 'english', name: '英语' },
      ];

      logger.info('筛选选项加载完成');
    } catch (error) {
      logger.error('加载筛选选项失败', { error });
      throw error;
    }
  };

  // ========== 初始化 ==========

  // 从本地存储加载搜索历史
  if (enableHistory) {
    loadHistoryFromLocalStorage();
  }

  // ========== 返回 ==========

  return {
    // 状态
    criteria,
    result,
    isSearching,
    searchHistory,
    availableTeachers,
    availableClasses,
    availableSubjects,

    // 计算属性
    hasCriteria,
    hasResults,
    resultCount,
    historyCount,

    // 方法
    setKeyword,
    setTeacherFilter,
    setClassFilter,
    setSubjectFilter,
    setFixedFilter,
    setWeekTypeFilter,
    setTimeSlotFilter,
    search,
    clearCriteria,
    clearResults,
    loadFromHistory,
    deleteHistory,
    clearHistory,
    loadFilterOptions,
  };
}
