/**
 * 数据格式化工具单元测试
 */

import { describe, it, expect } from 'vitest';
import {
  formatNumber,
  formatFileSize,
  formatPercent,
  formatCurrency,
  truncateText,
  formatPhone,
  formatLessons,
  formatTimeSlot,
  formatClassName,
  formatTeacherName,
  formatArray,
  formatBoolean,
  formatEmpty,
  formatEnum,
} from './format';

describe('数据格式化工具', () => {
  describe('formatNumber', () => {
    it('应该正确格式化数字', () => {
      expect(formatNumber(1234567.89)).toBe('1,234,567.89');
      expect(formatNumber(1000)).toBe('1,000.00');
      expect(formatNumber(123)).toBe('123.00');
    });

    it('应该支持自定义小数位数', () => {
      expect(formatNumber(1234.5678, 0)).toBe('1,235');
      expect(formatNumber(1234.5678, 3)).toBe('1,234.568');
    });

    it('应该处理字符串输入', () => {
      expect(formatNumber('1234.56')).toBe('1,234.56');
    });

    it('应该处理无效输入', () => {
      expect(formatNumber('invalid')).toBe('0');
    });
  });

  describe('formatFileSize', () => {
    it('应该正确格式化文件大小', () => {
      expect(formatFileSize(0)).toBe('0 Bytes');
      expect(formatFileSize(1024)).toBe('1.00 KB');
      expect(formatFileSize(1024 * 1024)).toBe('1.00 MB');
      expect(formatFileSize(1024 * 1024 * 1024)).toBe('1.00 GB');
    });

    it('应该支持自定义小数位数', () => {
      expect(formatFileSize(1536, 0)).toBe('2 KB');
      expect(formatFileSize(1536, 3)).toBe('1.500 KB');
    });

    it('应该处理负数', () => {
      expect(formatFileSize(-100)).toBe('0 Bytes');
    });
  });

  describe('formatPercent', () => {
    it('应该正确格式化百分比', () => {
      expect(formatPercent(0.856)).toBe('85.60%');
      expect(formatPercent(1)).toBe('100.00%');
      expect(formatPercent(0)).toBe('0.00%');
    });

    it('应该支持自定义小数位数', () => {
      expect(formatPercent(0.856, 0)).toBe('86%');
      expect(formatPercent(0.856, 3)).toBe('85.600%');
    });

    it('应该处理无效输入', () => {
      expect(formatPercent(NaN)).toBe('0.00%');
    });
  });

  describe('formatCurrency', () => {
    it('应该正确格式化货币', () => {
      expect(formatCurrency(1234.56)).toBe('¥1,234.56');
      expect(formatCurrency(1000000)).toBe('¥1,000,000.00');
    });

    it('应该支持自定义货币符号', () => {
      expect(formatCurrency(1234.56, '$')).toBe('$1,234.56');
      expect(formatCurrency(1234.56, '€')).toBe('€1,234.56');
    });

    it('应该处理无效输入', () => {
      expect(formatCurrency(NaN)).toBe('¥0.00');
    });
  });

  describe('truncateText', () => {
    it('应该正确截断文本', () => {
      expect(truncateText('这是一段很长的文本', 5)).toBe('这是...'); // 5 - 3(省略号) = 2
      expect(truncateText('短文本', 10)).toBe('短文本');
    });

    it('应该支持自定义省略号', () => {
      expect(truncateText('这是一段很长的文本', 5, '…')).toBe('这是一段…');
    });

    it('应该处理空字符串', () => {
      expect(truncateText('', 10)).toBe('');
    });
  });

  describe('formatPhone', () => {
    it('应该正确格式化手机号码', () => {
      expect(formatPhone('13812345678')).toBe('138-1234-5678');
    });

    it('应该正确格式化固定电话', () => {
      // 11位数字会被当作手机号处理，固定电话通常是7-8位区号+号码
      expect(formatPhone('01012345678')).toBe('010-1234-5678');
    });

    it('应该移除非数字字符', () => {
      expect(formatPhone('138-1234-5678')).toBe('138-1234-5678');
    });
  });

  describe('formatLessons', () => {
    it('应该正确格式化课时数', () => {
      expect(formatLessons(12)).toBe('12 节');
      expect(formatLessons(0)).toBe('0 节');
    });

    it('应该处理无效输入', () => {
      expect(formatLessons(-5)).toBe('0 节');
      expect(formatLessons(NaN)).toBe('0 节');
    });
  });

  describe('formatTimeSlot', () => {
    it('应该正确格式化时间段', () => {
      expect(formatTimeSlot(1, 1)).toBe('周一第1节');
      expect(formatTimeSlot(5, 3)).toBe('周五第3节');
    });
  });

  describe('formatClassName', () => {
    it('应该正确格式化班级名称', () => {
      expect(formatClassName('高一', 1)).toBe('高一(1)班');
      expect(formatClassName('初三', 5)).toBe('初三(5)班');
    });
  });

  describe('formatTeacherName', () => {
    it('应该正确格式化教师姓名', () => {
      expect(formatTeacherName('张三', '数学')).toBe('张三(数学)');
      expect(formatTeacherName('李四')).toBe('李四');
    });

    it('应该处理空字符串', () => {
      expect(formatTeacherName('')).toBe('');
    });
  });

  describe('formatArray', () => {
    it('应该正确格式化数组', () => {
      expect(formatArray(['数学', '语文', '英语'])).toBe('数学、语文、英语');
      expect(formatArray([])).toBe('');
    });

    it('应该支持自定义分隔符', () => {
      expect(formatArray(['数学', '语文', '英语'], ', ')).toBe('数学, 语文, 英语');
    });

    it('应该支持限制显示项数', () => {
      expect(formatArray(['数学', '语文', '英语', '物理', '化学'], '、', 3)).toBe(
        '数学、语文、英语 等5项',
      );
    });
  });

  describe('formatBoolean', () => {
    it('应该正确格式化布尔值', () => {
      expect(formatBoolean(true)).toBe('是');
      expect(formatBoolean(false)).toBe('否');
    });

    it('应该支持自定义文本', () => {
      expect(formatBoolean(true, '启用', '禁用')).toBe('启用');
      expect(formatBoolean(false, '启用', '禁用')).toBe('禁用');
    });
  });

  describe('formatEmpty', () => {
    it('应该正确格式化空值', () => {
      expect(formatEmpty(null)).toBe('-');
      expect(formatEmpty(undefined)).toBe('-');
      expect(formatEmpty('')).toBe('-');
      expect(formatEmpty('有值')).toBe('有值');
      expect(formatEmpty(0)).toBe('0');
    });

    it('应该支持自定义占位符', () => {
      expect(formatEmpty(null, 'N/A')).toBe('N/A');
    });
  });

  describe('formatEnum', () => {
    it('应该正确格式化枚举值', () => {
      const enumMap = {
        1: '启用',
        2: '禁用',
        3: '待审核',
      };
      expect(formatEnum(1, enumMap)).toBe('启用');
      expect(formatEnum(2, enumMap)).toBe('禁用');
      expect(formatEnum(99, enumMap)).toBe('99');
    });
  });
});
