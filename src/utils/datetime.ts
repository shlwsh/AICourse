/**
 * 日期时间工具模块
 *
 * 功能：
 * - 日期格式化
 * - 日期解析
 * - 日期计算
 * - 时间段处理
 * - 工作日判断
 *
 * 使用示例：
 * ```typescript
 * import { formatDate, parseDate, addDays } from '@/utils/datetime';
 *
 * const now = new Date();
 * const formatted = formatDate(now, 'YYYY-MM-DD HH:mm:ss');
 * const nextWeek = addDays(now, 7);
 * ```
 */

import { logger } from './logger';

/**
 * 日期格式化模板
 */
export const DATE_FORMATS = {
  /** 完整日期时间：2024-01-15 14:30:45 */
  FULL: 'YYYY-MM-DD HH:mm:ss',
  /** 日期：2024-01-15 */
  DATE: 'YYYY-MM-DD',
  /** 时间：14:30:45 */
  TIME: 'HH:mm:ss',
  /** 短时间：14:30 */
  SHORT_TIME: 'HH:mm',
  /** 中文日期：2024年01月15日 */
  CN_DATE: 'YYYY年MM月DD日',
  /** 中文日期时间：2024年01月15日 14:30 */
  CN_DATETIME: 'YYYY年MM月DD日 HH:mm',
  /** ISO 格式：2024-01-15T14:30:45.000Z */
  ISO: 'ISO',
} as const;

/**
 * 星期映射
 */
const WEEKDAY_NAMES = ['日', '一', '二', '三', '四', '五', '六'];
const WEEKDAY_FULL_NAMES = [
  '星期日',
  '星期一',
  '星期二',
  '星期三',
  '星期四',
  '星期五',
  '星期六',
];

/**
 * 格式化日期
 *
 * @param date - 日期对象、时间戳或日期字符串
 * @param format - 格式化模板
 * @returns 格式化后的日期字符串
 */
export function formatDate(
  date: Date | number | string,
  format: string = DATE_FORMATS.FULL,
): string {
  try {
    const d = parseDate(date);
    if (!d) {
      logger.warn('无效的日期', { date });
      return '';
    }

    // ISO 格式
    if (format === DATE_FORMATS.ISO) {
      return d.toISOString();
    }

    // 获取日期组件
    const year = d.getFullYear();
    const month = d.getMonth() + 1;
    const day = d.getDate();
    const hours = d.getHours();
    const minutes = d.getMinutes();
    const seconds = d.getSeconds();
    const weekday = d.getDay();

    // 替换格式化标记
    return format
      .replace('YYYY', year.toString())
      .replace('MM', month.toString().padStart(2, '0'))
      .replace('M', month.toString())
      .replace('DD', day.toString().padStart(2, '0'))
      .replace('D', day.toString())
      .replace('HH', hours.toString().padStart(2, '0'))
      .replace('H', hours.toString())
      .replace('mm', minutes.toString().padStart(2, '0'))
      .replace('m', minutes.toString())
      .replace('ss', seconds.toString().padStart(2, '0'))
      .replace('s', seconds.toString())
      .replace('W', WEEKDAY_NAMES[weekday])
      .replace('WW', WEEKDAY_FULL_NAMES[weekday]);
  } catch (error) {
    logger.error('日期格式化失败', { date, format, error });
    return '';
  }
}

/**
 * 解析日期
 *
 * @param date - 日期对象、时间戳或日期字符串
 * @returns Date 对象，解析失败返回 null
 */
export function parseDate(date: Date | number | string): Date | null {
  try {
    if (date instanceof Date) {
      return isNaN(date.getTime()) ? null : date;
    }

    if (typeof date === 'number') {
      const d = new Date(date);
      return isNaN(d.getTime()) ? null : d;
    }

    if (typeof date === 'string') {
      const d = new Date(date);
      return isNaN(d.getTime()) ? null : d;
    }

    return null;
  } catch (error) {
    logger.error('日期解析失败', { date, error });
    return null;
  }
}

/**
 * 获取当前日期时间
 *
 * @returns 当前日期时间
 */
export function now(): Date {
  return new Date();
}

/**
 * 获取今天的开始时间（00:00:00）
 *
 * @returns 今天的开始时间
 */
export function startOfToday(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

/**
 * 获取今天的结束时间（23:59:59）
 *
 * @returns 今天的结束时间
 */
export function endOfToday(): Date {
  const d = new Date();
  d.setHours(23, 59, 59, 999);
  return d;
}

/**
 * 添加天数
 *
 * @param date - 基准日期
 * @param days - 要添加的天数（可以为负数）
 * @returns 新的日期
 */
export function addDays(date: Date | number | string, days: number): Date {
  const d = parseDate(date);
  if (!d) {
    throw new Error('无效的日期');
  }
  const result = new Date(d);
  result.setDate(result.getDate() + days);
  return result;
}

/**
 * 添加小时
 *
 * @param date - 基准日期
 * @param hours - 要添加的小时数（可以为负数）
 * @returns 新的日期
 */
export function addHours(date: Date | number | string, hours: number): Date {
  const d = parseDate(date);
  if (!d) {
    throw new Error('无效的日期');
  }
  const result = new Date(d);
  result.setHours(result.getHours() + hours);
  return result;
}

/**
 * 添加分钟
 *
 * @param date - 基准日期
 * @param minutes - 要添加的分钟数（可以为负数）
 * @returns 新的日期
 */
export function addMinutes(date: Date | number | string, minutes: number): Date {
  const d = parseDate(date);
  if (!d) {
    throw new Error('无效的日期');
  }
  const result = new Date(d);
  result.setMinutes(result.getMinutes() + minutes);
  return result;
}

/**
 * 计算两个日期之间的天数差
 *
 * @param date1 - 日期1
 * @param date2 - 日期2
 * @returns 天数差（date1 - date2）
 */
export function diffDays(
  date1: Date | number | string,
  date2: Date | number | string,
): number {
  const d1 = parseDate(date1);
  const d2 = parseDate(date2);
  if (!d1 || !d2) {
    throw new Error('无效的日期');
  }
  const diff = d1.getTime() - d2.getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24));
}

/**
 * 计算两个日期之间的小时差
 *
 * @param date1 - 日期1
 * @param date2 - 日期2
 * @returns 小时差（date1 - date2）
 */
export function diffHours(
  date1: Date | number | string,
  date2: Date | number | string,
): number {
  const d1 = parseDate(date1);
  const d2 = parseDate(date2);
  if (!d1 || !d2) {
    throw new Error('无效的日期');
  }
  const diff = d1.getTime() - d2.getTime();
  return Math.floor(diff / (1000 * 60 * 60));
}

/**
 * 判断是否为同一天
 *
 * @param date1 - 日期1
 * @param date2 - 日期2
 * @returns 是否为同一天
 */
export function isSameDay(
  date1: Date | number | string,
  date2: Date | number | string,
): boolean {
  const d1 = parseDate(date1);
  const d2 = parseDate(date2);
  if (!d1 || !d2) {
    return false;
  }
  return (
    d1.getFullYear() === d2.getFullYear() &&
    d1.getMonth() === d2.getMonth() &&
    d1.getDate() === d2.getDate()
  );
}

/**
 * 判断是否为今天
 *
 * @param date - 日期
 * @returns 是否为今天
 */
export function isToday(date: Date | number | string): boolean {
  return isSameDay(date, new Date());
}

/**
 * 判断是否为工作日（周一到周五）
 *
 * @param date - 日期
 * @returns 是否为工作日
 */
export function isWeekday(date: Date | number | string): boolean {
  const d = parseDate(date);
  if (!d) {
    return false;
  }
  const day = d.getDay();
  return day >= 1 && day <= 5;
}

/**
 * 判断是否为周末（周六或周日）
 *
 * @param date - 日期
 * @returns 是否为周末
 */
export function isWeekend(date: Date | number | string): boolean {
  const d = parseDate(date);
  if (!d) {
    return false;
  }
  const day = d.getDay();
  return day === 0 || day === 6;
}

/**
 * 获取星期几的名称
 *
 * @param date - 日期
 * @param full - 是否返回完整名称（如"星期一"而不是"一"）
 * @returns 星期几的名称
 */
export function getWeekdayName(date: Date | number | string, full: boolean = false): string {
  const d = parseDate(date);
  if (!d) {
    return '';
  }
  const day = d.getDay();
  return full ? WEEKDAY_FULL_NAMES[day] : WEEKDAY_NAMES[day];
}

/**
 * 格式化相对时间（如"刚刚"、"5分钟前"、"2小时前"）
 *
 * @param date - 日期
 * @returns 相对时间字符串
 */
export function formatRelativeTime(date: Date | number | string): string {
  const d = parseDate(date);
  if (!d) {
    return '';
  }

  const now = new Date();
  const diff = now.getTime() - d.getTime();

  // 未来时间
  if (diff < 0) {
    return formatDate(d, DATE_FORMATS.FULL);
  }

  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (seconds < 60) {
    return '刚刚';
  } else if (minutes < 60) {
    return `${minutes}分钟前`;
  } else if (hours < 24) {
    return `${hours}小时前`;
  } else if (days < 7) {
    return `${days}天前`;
  } else {
    return formatDate(d, DATE_FORMATS.DATE);
  }
}

/**
 * 获取日期范围内的所有日期
 *
 * @param startDate - 开始日期
 * @param endDate - 结束日期
 * @returns 日期数组
 */
export function getDateRange(
  startDate: Date | number | string,
  endDate: Date | number | string,
): Date[] {
  const start = parseDate(startDate);
  const end = parseDate(endDate);
  if (!start || !end) {
    throw new Error('无效的日期');
  }

  const dates: Date[] = [];
  const current = new Date(start);

  while (current <= end) {
    dates.push(new Date(current));
    current.setDate(current.getDate() + 1);
  }

  return dates;
}

/**
 * 获取本周的开始日期（周一）
 *
 * @param date - 基准日期（默认为今天）
 * @returns 本周的开始日期
 */
export function startOfWeek(date: Date | number | string = new Date()): Date {
  const d = parseDate(date);
  if (!d) {
    throw new Error('无效的日期');
  }

  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day; // 周日特殊处理
  const result = new Date(d);
  result.setDate(result.getDate() + diff);
  result.setHours(0, 0, 0, 0);
  return result;
}

/**
 * 获取本周的结束日期（周日）
 *
 * @param date - 基准日期（默认为今天）
 * @returns 本周的结束日期
 */
export function endOfWeek(date: Date | number | string = new Date()): Date {
  const start = startOfWeek(date);
  const result = new Date(start);
  result.setDate(result.getDate() + 6);
  result.setHours(23, 59, 59, 999);
  return result;
}

/**
 * 获取本月的开始日期
 *
 * @param date - 基准日期（默认为今天）
 * @returns 本月的开始日期
 */
export function startOfMonth(date: Date | number | string = new Date()): Date {
  const d = parseDate(date);
  if (!d) {
    throw new Error('无效的日期');
  }

  const result = new Date(d);
  result.setDate(1);
  result.setHours(0, 0, 0, 0);
  return result;
}

/**
 * 获取本月的结束日期
 *
 * @param date - 基准日期（默认为今天）
 * @returns 本月的结束日期
 */
export function endOfMonth(date: Date | number | string = new Date()): Date {
  const d = parseDate(date);
  if (!d) {
    throw new Error('无效的日期');
  }

  const result = new Date(d);
  result.setMonth(result.getMonth() + 1);
  result.setDate(0);
  result.setHours(23, 59, 59, 999);
  return result;
}
