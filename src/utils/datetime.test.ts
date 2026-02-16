/**
 * 日期时间工具单元测试
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  formatDate,
  parseDate,
  now,
  startOfToday,
  endOfToday,
  addDays,
  addHours,
  addMinutes,
  diffDays,
  diffHours,
  isSameDay,
  isToday,
  isWeekday,
  isWeekend,
  getWeekdayName,
  formatRelativeTime,
  getDateRange,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  DATE_FORMATS,
} from './datetime';

describe('日期时间工具', () => {
  describe('formatDate', () => {
    it('应该正确格式化日期', () => {
      const date = new Date('2024-01-15 14:30:45');
      expect(formatDate(date, DATE_FORMATS.FULL)).toBe('2024-01-15 14:30:45');
      expect(formatDate(date, DATE_FORMATS.DATE)).toBe('2024-01-15');
      expect(formatDate(date, DATE_FORMATS.TIME)).toBe('14:30:45');
      expect(formatDate(date, DATE_FORMATS.SHORT_TIME)).toBe('14:30');
    });

    it('应该支持时间戳格式化', () => {
      const timestamp = new Date('2024-01-15').getTime();
      const result = formatDate(timestamp, DATE_FORMATS.DATE);
      expect(result).toBe('2024-01-15');
    });

    it('应该处理无效日期', () => {
      expect(formatDate('invalid', DATE_FORMATS.DATE)).toBe('');
    });
  });

  describe('parseDate', () => {
    it('应该正确解析日期对象', () => {
      const date = new Date('2024-01-15');
      const result = parseDate(date);
      expect(result).toBeInstanceOf(Date);
      expect(result?.getFullYear()).toBe(2024);
    });

    it('应该正确解析时间戳', () => {
      const timestamp = new Date('2024-01-15').getTime();
      const result = parseDate(timestamp);
      expect(result).toBeInstanceOf(Date);
    });

    it('应该正确解析日期字符串', () => {
      const result = parseDate('2024-01-15');
      expect(result).toBeInstanceOf(Date);
    });

    it('应该处理无效日期', () => {
      expect(parseDate('invalid')).toBeNull();
    });
  });

  describe('addDays', () => {
    it('应该正确添加天数', () => {
      const date = new Date('2024-01-15');
      const result = addDays(date, 7);
      expect(formatDate(result, DATE_FORMATS.DATE)).toBe('2024-01-22');
    });

    it('应该支持负数', () => {
      const date = new Date('2024-01-15');
      const result = addDays(date, -7);
      expect(formatDate(result, DATE_FORMATS.DATE)).toBe('2024-01-08');
    });
  });

  describe('diffDays', () => {
    it('应该正确计算天数差', () => {
      const date1 = new Date('2024-01-22');
      const date2 = new Date('2024-01-15');
      expect(diffDays(date1, date2)).toBe(7);
    });

    it('应该支持负数结果', () => {
      const date1 = new Date('2024-01-15');
      const date2 = new Date('2024-01-22');
      expect(diffDays(date1, date2)).toBe(-7);
    });
  });

  describe('isSameDay', () => {
    it('应该正确判断是否为同一天', () => {
      const date1 = new Date('2024-01-15 10:00:00');
      const date2 = new Date('2024-01-15 20:00:00');
      expect(isSameDay(date1, date2)).toBe(true);
    });

    it('应该正确判断不同天', () => {
      const date1 = new Date('2024-01-15');
      const date2 = new Date('2024-01-16');
      expect(isSameDay(date1, date2)).toBe(false);
    });
  });

  describe('isWeekday', () => {
    it('应该正确判断工作日', () => {
      const monday = new Date('2024-01-15'); // 周一
      expect(isWeekday(monday)).toBe(true);
    });

    it('应该正确判断周末', () => {
      const sunday = new Date('2024-01-14'); // 周日
      expect(isWeekday(sunday)).toBe(false);
    });
  });

  describe('isWeekend', () => {
    it('应该正确判断周末', () => {
      const sunday = new Date('2024-01-14'); // 周日
      expect(isWeekend(sunday)).toBe(true);
    });

    it('应该正确判断工作日', () => {
      const monday = new Date('2024-01-15'); // 周一
      expect(isWeekend(monday)).toBe(false);
    });
  });

  describe('getWeekdayName', () => {
    it('应该返回简短的星期名称', () => {
      const monday = new Date('2024-01-15'); // 周一
      expect(getWeekdayName(monday)).toBe('一');
    });

    it('应该返回完整的星期名称', () => {
      const monday = new Date('2024-01-15'); // 周一
      expect(getWeekdayName(monday, true)).toBe('星期一');
    });
  });

  describe('getDateRange', () => {
    it('应该返回日期范围内的所有日期', () => {
      const start = new Date('2024-01-15');
      const end = new Date('2024-01-17');
      const range = getDateRange(start, end);
      expect(range).toHaveLength(3);
      expect(formatDate(range[0], DATE_FORMATS.DATE)).toBe('2024-01-15');
      expect(formatDate(range[2], DATE_FORMATS.DATE)).toBe('2024-01-17');
    });
  });

  describe('startOfWeek', () => {
    it('应该返回本周的开始日期（周一）', () => {
      const date = new Date('2024-01-17'); // 周三
      const result = startOfWeek(date);
      expect(formatDate(result, DATE_FORMATS.DATE)).toBe('2024-01-15'); // 周一
    });
  });

  describe('endOfWeek', () => {
    it('应该返回本周的结束日期（周日）', () => {
      const date = new Date('2024-01-17'); // 周三
      const result = endOfWeek(date);
      expect(formatDate(result, DATE_FORMATS.DATE)).toBe('2024-01-21'); // 周日
    });
  });

  describe('startOfMonth', () => {
    it('应该返回本月的开始日期', () => {
      const date = new Date('2024-01-15');
      const result = startOfMonth(date);
      expect(formatDate(result, DATE_FORMATS.DATE)).toBe('2024-01-01');
    });
  });

  describe('endOfMonth', () => {
    it('应该返回本月的结束日期', () => {
      const date = new Date('2024-01-15');
      const result = endOfMonth(date);
      expect(formatDate(result, DATE_FORMATS.DATE)).toBe('2024-01-31');
    });
  });
});
