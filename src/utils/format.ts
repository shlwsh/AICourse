/**
 * 数据格式化工具模块
 *
 * 功能：
 * - 数字格式化
 * - 文件大小格式化
 * - 百分比格式化
 * - 货币格式化
 * - 文本截断
 * - 电话号码格式化
 *
 * 使用示例：
 * ```typescript
 * import { formatNumber, formatFileSize, formatPercent } from '@/utils/format';
 *
 * const num = formatNumber(1234567.89); // "1,234,567.89"
 * const size = formatFileSize(1024 * 1024); // "1.00 MB"
 * const percent = formatPercent(0.856); // "85.60%"
 * ```
 */

import { logger } from './logger';

/**
 * 格式化数字，添加千位分隔符
 *
 * @param value - 数字值
 * @param decimals - 小数位数（默认2位）
 * @param separator - 千位分隔符（默认逗号）
 * @returns 格式化后的字符串
 */
export function formatNumber(
  value: number | string,
  decimals: number = 2,
  separator: string = ',',
): string {
  try {
    const num = typeof value === 'string' ? parseFloat(value) : value;
    if (isNaN(num)) {
      logger.warn('无效的数字', { value });
      return '0';
    }

    // 固定小数位数
    const fixed = num.toFixed(decimals);
    const parts = fixed.split('.');

    // 添加千位分隔符
    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, separator);

    return parts.join('.');
  } catch (error) {
    logger.error('数字格式化失败', { value, error });
    return '0';
  }
}

/**
 * 格式化文件大小
 *
 * @param bytes - 字节数
 * @param decimals - 小数位数（默认2位）
 * @returns 格式化后的字符串（如 "1.50 MB"）
 */
export function formatFileSize(bytes: number, decimals: number = 2): string {
  try {
    if (bytes === 0) return '0 Bytes';
    if (bytes < 0) {
      logger.warn('文件大小不能为负数', { bytes });
      return '0 Bytes';
    }

    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    const value = bytes / Math.pow(k, i);
    return `${value.toFixed(decimals)} ${sizes[i]}`;
  } catch (error) {
    logger.error('文件大小格式化失败', { bytes, error });
    return '0 Bytes';
  }
}

/**
 * 格式化百分比
 *
 * @param value - 数值（0-1 之间）
 * @param decimals - 小数位数（默认2位）
 * @returns 格式化后的百分比字符串（如 "85.60%"）
 */
export function formatPercent(value: number, decimals: number = 2): string {
  try {
    if (isNaN(value)) {
      logger.warn('无效的百分比值', { value });
      return '0.00%';
    }

    const percent = value * 100;
    return `${percent.toFixed(decimals)}%`;
  } catch (error) {
    logger.error('百分比格式化失败', { value, error });
    return '0.00%';
  }
}

/**
 * 格式化货币
 *
 * @param value - 金额
 * @param currency - 货币符号（默认 ¥）
 * @param decimals - 小数位数（默认2位）
 * @returns 格式化后的货币字符串（如 "¥1,234.56"）
 */
export function formatCurrency(
  value: number,
  currency: string = '¥',
  decimals: number = 2,
): string {
  try {
    if (isNaN(value)) {
      logger.warn('无效的货币值', { value });
      return `${currency}0.00`;
    }

    const formatted = formatNumber(value, decimals);
    return `${currency}${formatted}`;
  } catch (error) {
    logger.error('货币格式化失败', { value, error });
    return `${currency}0.00`;
  }
}

/**
 * 截断文本，超出部分用省略号表示
 *
 * @param text - 原始文本
 * @param maxLength - 最大长度
 * @param ellipsis - 省略号（默认 "..."）
 * @returns 截断后的文本
 */
export function truncateText(
  text: string,
  maxLength: number,
  ellipsis: string = '...',
): string {
  try {
    if (!text) return '';
    if (text.length <= maxLength) return text;

    return text.substring(0, maxLength - ellipsis.length) + ellipsis;
  } catch (error) {
    logger.error('文本截断失败', { text, maxLength, error });
    return text || '';
  }
}

/**
 * 格式化电话号码
 *
 * @param phone - 电话号码
 * @returns 格式化后的电话号码（如 "138-1234-5678"）
 */
export function formatPhone(phone: string): string {
  try {
    // 移除所有非数字字符
    const cleaned = phone.replace(/\D/g, '');

    // 中国手机号码格式：138-1234-5678
    if (cleaned.length === 11) {
      return `${cleaned.substring(0, 3)}-${cleaned.substring(3, 7)}-${cleaned.substring(7)}`;
    }

    // 固定电话格式：010-12345678
    if (cleaned.length === 10) {
      return `${cleaned.substring(0, 3)}-${cleaned.substring(3)}`;
    }

    // 其他格式直接返回
    return phone;
  } catch (error) {
    logger.error('电话号码格式化失败', { phone, error });
    return phone;
  }
}

/**
 * 格式化课时数
 *
 * @param lessons - 课时数
 * @returns 格式化后的课时字符串（如 "12 节"）
 */
export function formatLessons(lessons: number): string {
  try {
    if (isNaN(lessons) || lessons < 0) {
      logger.warn('无效的课时数', { lessons });
      return '0 节';
    }

    return `${lessons} 节`;
  } catch (error) {
    logger.error('课时数格式化失败', { lessons, error });
    return '0 节';
  }
}

/**
 * 格式化时间段
 *
 * @param dayOfWeek - 星期几（1-7，1表示周一）
 * @param period - 节次（1-N）
 * @returns 格式化后的时间段字符串（如 "周一第1节"）
 */
export function formatTimeSlot(dayOfWeek: number, period: number): string {
  try {
    const weekdays = ['', '周一', '周二', '周三', '周四', '周五', '周六', '周日'];
    const weekdayName = weekdays[dayOfWeek] || `周${dayOfWeek}`;
    return `${weekdayName}第${period}节`;
  } catch (error) {
    logger.error('时间段格式化失败', { dayOfWeek, period, error });
    return '';
  }
}

/**
 * 格式化班级名称
 *
 * @param grade - 年级
 * @param classNum - 班级号
 * @returns 格式化后的班级名称（如 "高一(1)班"）
 */
export function formatClassName(grade: string, classNum: number): string {
  try {
    return `${grade}(${classNum})班`;
  } catch (error) {
    logger.error('班级名称格式化失败', { grade, classNum, error });
    return '';
  }
}

/**
 * 格式化教师姓名
 *
 * @param name - 教师姓名
 * @param subject - 科目（可选）
 * @returns 格式化后的教师姓名（如 "张老师(数学)"）
 */
export function formatTeacherName(name: string, subject?: string): string {
  try {
    if (!name) return '';
    if (!subject) return name;
    return `${name}(${subject})`;
  } catch (error) {
    logger.error('教师姓名格式化失败', { name, subject, error });
    return name || '';
  }
}

/**
 * 格式化数组为字符串
 *
 * @param items - 数组
 * @param separator - 分隔符（默认 "、"）
 * @param maxItems - 最多显示的项数（默认不限制）
 * @returns 格式化后的字符串
 */
export function formatArray(
  items: any[],
  separator: string = '、',
  maxItems?: number,
): string {
  try {
    if (!Array.isArray(items) || items.length === 0) {
      return '';
    }

    let displayItems = items;
    let suffix = '';

    if (maxItems && items.length > maxItems) {
      displayItems = items.slice(0, maxItems);
      suffix = ` 等${items.length}项`;
    }

    return displayItems.join(separator) + suffix;
  } catch (error) {
    logger.error('数组格式化失败', { items, error });
    return '';
  }
}

/**
 * 格式化布尔值
 *
 * @param value - 布尔值
 * @param trueText - true 时的文本（默认 "是"）
 * @param falseText - false 时的文本（默认 "否"）
 * @returns 格式化后的文本
 */
export function formatBoolean(
  value: boolean,
  trueText: string = '是',
  falseText: string = '否',
): string {
  return value ? trueText : falseText;
}

/**
 * 格式化空值
 *
 * @param value - 值
 * @param placeholder - 空值时的占位符（默认 "-"）
 * @returns 格式化后的值
 */
export function formatEmpty(value: any, placeholder: string = '-'): string {
  if (value === null || value === undefined || value === '') {
    return placeholder;
  }
  return String(value);
}

/**
 * 高亮关键词
 *
 * @param text - 原始文本
 * @param keyword - 关键词
 * @param className - 高亮样式类名（默认 "highlight"）
 * @returns 包含高亮标记的 HTML 字符串
 */
export function highlightKeyword(
  text: string,
  keyword: string,
  className: string = 'highlight',
): string {
  try {
    if (!text || !keyword) return text;

    // 转义特殊字符
    const escapedKeyword = keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(escapedKeyword, 'gi');

    return text.replace(regex, (match) => `<span class="${className}">${match}</span>`);
  } catch (error) {
    logger.error('关键词高亮失败', { text, keyword, error });
    return text;
  }
}

/**
 * 格式化枚举值
 *
 * @param value - 枚举值
 * @param enumMap - 枚举映射表
 * @returns 格式化后的文本
 */
export function formatEnum(value: string | number, enumMap: Record<string | number, string>): string {
  try {
    return enumMap[value] || String(value);
  } catch (error) {
    logger.error('枚举值格式化失败', { value, error });
    return String(value);
  }
}
