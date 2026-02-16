/**
 * useSearch Composable 单元测试
 * 测试搜索和筛选功能
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useSearch } from '@/composables/useSearch';
import type { ScheduleEntry } from '@/stores/scheduleStore';

// 模拟课表数据
const mockEntries: ScheduleEntry[] = [
  {
    classId: 1,
    subjectId: 'math',
    teacherId: 101,
    timeSlot: { day: 0, period: 0 },
    isFixed: false,
    weekType: 'Every',
  },
  {
    classId: 1,
    subjectId: 'chinese',
    teacherId: 102,
    timeSlot: { day: 0, period: 1 },
    isFixed: true,
    weekType: 'Every',
  },
  {
    classId: 2,
    subjectId: 'english',
    teacherId: 103,
    timeSlot: { day: 1, period: 0 },
    isFixed: false,
    weekType: 'Odd',
  },
  {
    classId: 2,
    subjectId: 'math',
    teacherId: 101,
    timeSlot: { day: 1, period: 1 },
    isFixed: false,
    weekType: 'Even',
  },
  {
    classId: 3,
    subjectId: 'pe',
    teacherId: 104,
    timeSlot: { day: 2, period: 0 },
    isFixed: true,
    weekType: 'Every',
  },
];

describe('useSearch', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  describe('基础功能', () => {
    it('应该正确初始化', () => {
      const search = useSearch();

      expect(search.hasCriteria.value).toBe(false);
      expect(search.hasResults.value).toBe(false);
      expect(search.resultCount.value).toBe(0);
      expect(search.isSearching.value).toBe(false);
    });

    it('应该能够设置搜索条件', () => {
      const search = useSearch();

      search.setKeyword('math');
      expect(search.criteria.value.keyword).toBe('math');

      search.setTeacherFilter([101, 102]);
      expect(search.criteria.value.teacherIds).toEqual([101, 102]);

      search.setClassFilter([1, 2]);
      expect(search.criteria.value.classIds).toEqual([1, 2]);

      search.setSubjectFilter(['math', 'chinese']);
      expect(search.criteria.value.subjectIds).toEqual(['math', 'chinese']);

      search.setFixedFilter(true);
      expect(search.criteria.value.fixedOnly).toBe(true);

      search.setWeekTypeFilter('Odd');
      expect(search.criteria.value.weekType).toBe('Odd');
    });

    it('应该能够清空搜索条件', () => {
      const search = useSearch();

      search.setKeyword('math');
      search.setTeacherFilter([101]);
      expect(search.hasCriteria.value).toBe(true);

      search.clearCriteria();
      expect(search.hasCriteria.value).toBe(false);
      expect(search.criteria.value.keyword).toBeUndefined();
      expect(search.criteria.value.teacherIds).toBeUndefined();
    });
  });

  describe('关键词搜索', () => {
    it('应该能够按关键词搜索科目', async () => {
      const search = useSearch();

      search.setKeyword('math');
      await search.search(mockEntries);

      expect(search.hasResults.value).toBe(true);
      expect(search.resultCount.value).toBe(2);
      expect(search.result.value.entries.every((e) => e.subjectId === 'math')).toBe(true);
    });

    it('应该能够按关键词搜索教师', async () => {
      const search = useSearch();

      search.setKeyword('101');
      await search.search(mockEntries);

      expect(search.hasResults.value).toBe(true);
      expect(search.resultCount.value).toBe(2);
      expect(search.result.value.entries.every((e) => e.teacherId === 101)).toBe(true);
    });

    it('应该能够按关键词搜索班级', async () => {
      const search = useSearch();

      search.setKeyword('1');
      await search.search(mockEntries);

      expect(search.hasResults.value).toBe(true);
      expect(search.resultCount.value).toBeGreaterThan(0);
    });

    it('空关键词应该返回所有结果', async () => {
      const search = useSearch();

      search.setKeyword('');
      await search.search(mockEntries);

      expect(search.resultCount.value).toBe(mockEntries.length);
    });

    it('不匹配的关键词应该返回空结果', async () => {
      const search = useSearch();

      search.setKeyword('notexist');
      await search.search(mockEntries);

      expect(search.hasResults.value).toBe(false);
      expect(search.resultCount.value).toBe(0);
    });
  });

  describe('教师筛选', () => {
    it('应该能够按教师筛选', async () => {
      const search = useSearch();

      search.setTeacherFilter([101]);
      await search.search(mockEntries);

      expect(search.hasResults.value).toBe(true);
      expect(search.resultCount.value).toBe(2);
      expect(search.result.value.entries.every((e) => e.teacherId === 101)).toBe(true);
    });

    it('应该能够按多个教师筛选', async () => {
      const search = useSearch();

      search.setTeacherFilter([101, 102]);
      await search.search(mockEntries);

      expect(search.hasResults.value).toBe(true);
      expect(search.resultCount.value).toBe(3);
      expect(
        search.result.value.entries.every((e) => e.teacherId === 101 || e.teacherId === 102)
      ).toBe(true);
    });

    it('空教师列表应该返回所有结果', async () => {
      const search = useSearch();

      search.setTeacherFilter([]);
      await search.search(mockEntries);

      expect(search.resultCount.value).toBe(mockEntries.length);
    });
  });

  describe('班级筛选', () => {
    it('应该能够按班级筛选', async () => {
      const search = useSearch();

      search.setClassFilter([1]);
      await search.search(mockEntries);

      expect(search.hasResults.value).toBe(true);
      expect(search.resultCount.value).toBe(2);
      expect(search.result.value.entries.every((e) => e.classId === 1)).toBe(true);
    });

    it('应该能够按多个班级筛选', async () => {
      const search = useSearch();

      search.setClassFilter([1, 2]);
      await search.search(mockEntries);

      expect(search.hasResults.value).toBe(true);
      expect(search.resultCount.value).toBe(4);
      expect(
        search.result.value.entries.every((e) => e.classId === 1 || e.classId === 2)
      ).toBe(true);
    });
  });

  describe('科目筛选', () => {
    it('应该能够按科目筛选', async () => {
      const search = useSearch();

      search.setSubjectFilter(['math']);
      await search.search(mockEntries);

      expect(search.hasResults.value).toBe(true);
      expect(search.resultCount.value).toBe(2);
      expect(search.result.value.entries.every((e) => e.subjectId === 'math')).toBe(true);
    });

    it('应该能够按多个科目筛选', async () => {
      const search = useSearch();

      search.setSubjectFilter(['math', 'chinese']);
      await search.search(mockEntries);

      expect(search.hasResults.value).toBe(true);
      expect(search.resultCount.value).toBe(3);
      expect(
        search.result.value.entries.every(
          (e) => e.subjectId === 'math' || e.subjectId === 'chinese'
        )
      ).toBe(true);
    });
  });

  describe('固定课程筛选', () => {
    it('应该能够筛选固定课程', async () => {
      const search = useSearch();

      search.setFixedFilter(true);
      await search.search(mockEntries);

      expect(search.hasResults.value).toBe(true);
      expect(search.resultCount.value).toBe(2);
      expect(search.result.value.entries.every((e) => e.isFixed)).toBe(true);
    });

    it('不筛选固定课程应该返回所有结果', async () => {
      const search = useSearch();

      search.setFixedFilter(false);
      await search.search(mockEntries);

      expect(search.resultCount.value).toBe(mockEntries.length);
    });
  });

  describe('周类型筛选', () => {
    it('应该能够筛选单周课程', async () => {
      const search = useSearch();

      search.setWeekTypeFilter('Odd');
      await search.search(mockEntries);

      expect(search.hasResults.value).toBe(true);
      expect(search.resultCount.value).toBe(1);
      expect(search.result.value.entries.every((e) => e.weekType === 'Odd')).toBe(true);
    });

    it('应该能够筛选双周课程', async () => {
      const search = useSearch();

      search.setWeekTypeFilter('Even');
      await search.search(mockEntries);

      expect(search.hasResults.value).toBe(true);
      expect(search.resultCount.value).toBe(1);
      expect(search.result.value.entries.every((e) => e.weekType === 'Even')).toBe(true);
    });

    it('应该能够筛选每周课程', async () => {
      const search = useSearch();

      search.setWeekTypeFilter('Every');
      await search.search(mockEntries);

      expect(search.hasResults.value).toBe(true);
      expect(search.resultCount.value).toBe(3);
      expect(search.result.value.entries.every((e) => e.weekType === 'Every')).toBe(true);
    });
  });

  describe('时间槽位筛选', () => {
    it('应该能够按时间槽位筛选', async () => {
      const search = useSearch();

      search.setTimeSlotFilter([{ day: 0, period: 0 }]);
      await search.search(mockEntries);

      expect(search.hasResults.value).toBe(true);
      expect(search.resultCount.value).toBe(1);
      expect(search.result.value.entries[0]?.timeSlot).toEqual({ day: 0, period: 0 });
    });

    it('应该能够按多个时间槽位筛选', async () => {
      const search = useSearch();

      search.setTimeSlotFilter([
        { day: 0, period: 0 },
        { day: 1, period: 0 },
      ]);
      await search.search(mockEntries);

      expect(search.hasResults.value).toBe(true);
      expect(search.resultCount.value).toBe(2);
    });
  });

  describe('组合筛选', () => {
    it('应该能够组合多个筛选条件', async () => {
      const search = useSearch();

      search.setKeyword('math');
      search.setTeacherFilter([101]);
      search.setClassFilter([1]);
      await search.search(mockEntries);

      expect(search.hasResults.value).toBe(true);
      expect(search.resultCount.value).toBe(1);

      const result = search.result.value.entries[0];
      expect(result?.subjectId).toBe('math');
      expect(result?.teacherId).toBe(101);
      expect(result?.classId).toBe(1);
    });

    it('组合条件无匹配时应该返回空结果', async () => {
      const search = useSearch();

      search.setKeyword('math');
      search.setTeacherFilter([102]); // 102 不教 math
      await search.search(mockEntries);

      expect(search.hasResults.value).toBe(false);
      expect(search.resultCount.value).toBe(0);
    });
  });

  describe('搜索历史', () => {
    it('应该能够记录搜索历史', async () => {
      const search = useSearch({ enableHistory: true });

      search.setKeyword('math');
      await search.search(mockEntries);

      expect(search.historyCount.value).toBe(1);
      expect(search.searchHistory.value[0]?.criteria.keyword).toBe('math');
      expect(search.searchHistory.value[0]?.resultCount).toBe(2);
    });

    it('应该能够从历史记录加载搜索条件', async () => {
      const search = useSearch({ enableHistory: true });

      search.setKeyword('math');
      await search.search(mockEntries);

      const historyId = search.searchHistory.value[0]?.id;
      expect(historyId).toBeTruthy();

      search.clearCriteria();
      expect(search.criteria.value.keyword).toBeUndefined();

      const success = search.loadFromHistory(historyId!);
      expect(success).toBe(true);
      expect(search.criteria.value.keyword).toBe('math');
    });

    it('应该能够删除搜索历史', async () => {
      const search = useSearch({ enableHistory: true });

      search.setKeyword('math');
      await search.search(mockEntries);

      expect(search.historyCount.value).toBe(1);

      const historyId = search.searchHistory.value[0]?.id;
      search.deleteHistory(historyId!);

      expect(search.historyCount.value).toBe(0);
    });

    it('应该能够清空搜索历史', async () => {
      const search = useSearch({ enableHistory: true });

      // 添加多条历史记录
      search.setKeyword('math');
      await search.search(mockEntries);

      search.setKeyword('chinese');
      await search.search(mockEntries);

      expect(search.historyCount.value).toBe(2);

      search.clearHistory();
      expect(search.historyCount.value).toBe(0);
    });

    it('应该限制历史记录数量', async () => {
      const search = useSearch({ enableHistory: true, maxHistorySize: 3 });

      // 添加 5 条历史记录
      for (let i = 0; i < 5; i++) {
        search.setKeyword(`keyword${i}`);
        await search.search(mockEntries);
      }

      // 应该只保留最后 3 条
      expect(search.historyCount.value).toBe(3);
      expect(search.searchHistory.value[0]?.criteria.keyword).toBe('keyword4');
    });

    it('禁用历史记录时不应该记录', async () => {
      const search = useSearch({ enableHistory: false });

      search.setKeyword('math');
      await search.search(mockEntries);

      expect(search.historyCount.value).toBe(0);
    });
  });

  describe('本地存储', () => {
    it('应该能够保存搜索历史到本地存储', async () => {
      const search = useSearch({ enableHistory: true });

      search.setKeyword('math');
      await search.search(mockEntries);

      const saved = localStorage.getItem('search-history');
      expect(saved).toBeTruthy();

      const data = JSON.parse(saved!);
      expect(data.length).toBe(1);
      expect(data[0].criteria.keyword).toBe('math');
    });

    it('应该能够从本地存储加载搜索历史', async () => {
      // 先保存历史记录
      const search1 = useSearch({ enableHistory: true });
      search1.setKeyword('math');
      await search1.search(mockEntries);

      // 创建新实例，应该自动加载历史记录
      const search2 = useSearch({ enableHistory: true });
      expect(search2.historyCount.value).toBe(1);
      expect(search2.searchHistory.value[0]?.criteria.keyword).toBe('math');
    });
  });

  describe('大小写敏感', () => {
    it('默认应该不区分大小写', async () => {
      const search = useSearch({ caseSensitive: false });

      search.setKeyword('MATH');
      await search.search(mockEntries);

      expect(search.hasResults.value).toBe(true);
      expect(search.resultCount.value).toBe(2);
    });

    it('启用大小写敏感时应该区分大小写', async () => {
      const search = useSearch({ caseSensitive: true });

      search.setKeyword('MATH');
      await search.search(mockEntries);

      expect(search.hasResults.value).toBe(false);
      expect(search.resultCount.value).toBe(0);
    });
  });

  describe('模糊匹配', () => {
    it('默认应该启用模糊匹配', async () => {
      const search = useSearch({ fuzzyMatch: true });

      search.setKeyword('mat');
      await search.search(mockEntries);

      expect(search.hasResults.value).toBe(true);
      expect(search.resultCount.value).toBe(2);
    });

    it('禁用模糊匹配时应该精确匹配', async () => {
      const search = useSearch({ fuzzyMatch: false });

      search.setKeyword('mat');
      await search.search(mockEntries);

      expect(search.hasResults.value).toBe(false);
      expect(search.resultCount.value).toBe(0);
    });
  });
});
