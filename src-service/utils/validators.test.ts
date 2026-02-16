/**
 * 数据验证工具模块单元测试
 *
 * 测试所有验证函数的正常情况和异常情况
 */

import { describe, it, expect } from 'vitest';
import {
  validateString,
  validateNumber,
  validateTeacherId,
  validateClassId,
  validateSubjectId,
  validateTimeSlot,
  validateTimeBias,
  validateWeight,
  validateBitmask,
  validateFilePath,
  validateFileExtension,
  validateFileSize,
  validateNumberRange,
  validateStringLength,
  validateArrayLength,
  validateEmail,
  validatePhone,
  validateDateFormat,
  validateUrl,
  validateTeacherPreference,
  validateCourseMove,
  validateExcelImportFile,
  validateExcelExportPath,
} from './validators';

// ============================================================================
// 通用数据类型验证测试
// ============================================================================

describe('通用数据类型验证', () => {
  describe('validateString', () => {
    it('应该通过有效的字符串', () => {
      expect(() => validateString('hello')).not.toThrow();
      expect(() => validateString('测试')).not.toThrow();
    });

    it('应该拒绝空字符串', () => {
      expect(() => validateString('')).toThrow('字符串不能为空字符串');
      expect(() => validateString('   ')).toThrow('字符串不能为空字符串');
    });

    it('应该拒绝非字符串类型', () => {
      expect(() => validateString(123)).toThrow('字符串必须是字符串类型');
      expect(() => validateString(null)).toThrow('字符串必须是字符串类型');
      expect(() => validateString(undefined)).toThrow('字符串必须是字符串类型');
    });

    it('应该支持 allowNull 选项', () => {
      expect(() => validateString(null, { allowNull: true })).not.toThrow();
    });

    it('应该支持 allowUndefined 选项', () => {
      expect(() => validateString(undefined, { allowUndefined: true })).not.toThrow();
    });
  });

  describe('validateNumber', () => {
    it('应该通过有效的数字', () => {
      expect(() => validateNumber(0)).not.toThrow();
      expect(() => validateNumber(42)).not.toThrow();
      expect(() => validateNumber(-10)).not.toThrow();
      expect(() => validateNumber(3.14)).not.toThrow();
    });

    it('应该拒绝非数字类型', () => {
      expect(() => validateNumber('123')).toThrow('数字必须是数字类型');
      expect(() => validateNumber(null)).toThrow('数字必须是数字类型');
    });

    it('应该拒绝 NaN', () => {
      expect(() => validateNumber(NaN)).toThrow('数字不能是 NaN');
    });

    it('应该拒绝无限大', () => {
      expect(() => validateNumber(Infinity)).toThrow('数字必须是有限数字');
      expect(() => validateNumber(-Infinity)).toThrow('数字必须是有限数字');
    });
  });
});

// ============================================================================
// 业务数据验证测试
// ============================================================================

describe('业务数据验证', () => {
  describe('validateTeacherId', () => {
    it('应该通过有效的教师ID', () => {
      expect(() => validateTeacherId(1)).not.toThrow();
      expect(() => validateTeacherId(1001)).not.toThrow();
      expect(() => validateTeacherId(9999)).not.toThrow();
    });

    it('应该拒绝零和负数', () => {
      expect(() => validateTeacherId(0)).toThrow('教师ID必须为正整数');
      expect(() => validateTeacherId(-1)).toThrow('教师ID必须为正整数');
    });

    it('应该拒绝小数', () => {
      expect(() => validateTeacherId(1.5)).toThrow('教师ID必须是整数');
    });
  });

  describe('validateClassId', () => {
    it('应该通过有效的班级ID', () => {
      expect(() => validateClassId(101)).not.toThrow();
      expect(() => validateClassId(999)).not.toThrow();
    });

    it('应该拒绝零和负数', () => {
      expect(() => validateClassId(0)).toThrow('班级ID必须为正整数');
      expect(() => validateClassId(-1)).toThrow('班级ID必须为正整数');
    });
  });

  describe('validateSubjectId', () => {
    it('应该通过有效的科目ID', () => {
      expect(() => validateSubjectId('数学')).not.toThrow();
      expect(() => validateSubjectId('English')).not.toThrow();
    });

    it('应该拒绝空字符串', () => {
      expect(() => validateSubjectId('')).toThrow('科目ID不能为空字符串');
    });

    it('应该拒绝过长的科目ID', () => {
      const longId = 'a'.repeat(51);
      expect(() => validateSubjectId(longId)).toThrow('科目ID长度不能超过50个字符');
    });
  });

  describe('validateTimeSlot', () => {
    it('应该通过有效的时间槽位', () => {
      expect(() => validateTimeSlot({ day: 0, period: 0 })).not.toThrow();
      expect(() => validateTimeSlot({ day: 4, period: 7 })).not.toThrow();
      expect(() => validateTimeSlot({ day: 29, period: 11 })).not.toThrow();
    });

    it('应该拒绝无效的 day 值', () => {
      expect(() => validateTimeSlot({ day: -1, period: 0 })).toThrow('day 值无效');
      expect(() => validateTimeSlot({ day: 30, period: 0 })).toThrow('day 值无效');
    });

    it('应该拒绝无效的 period 值', () => {
      expect(() => validateTimeSlot({ day: 0, period: -1 })).toThrow('period 值无效');
      expect(() => validateTimeSlot({ day: 0, period: 12 })).toThrow('period 值无效');
    });

    it('应该拒绝非对象类型', () => {
      expect(() => validateTimeSlot(null)).toThrow('时间槽位必须是对象类型');
      expect(() => validateTimeSlot('invalid')).toThrow('时间槽位必须是对象类型');
    });
  });

  describe('validateTimeBias', () => {
    it('应该通过有效的时间偏好值', () => {
      expect(() => validateTimeBias(0)).not.toThrow();
      expect(() => validateTimeBias(1)).not.toThrow();
      expect(() => validateTimeBias(2)).not.toThrow();
    });

    it('应该拒绝超出范围的值', () => {
      expect(() => validateTimeBias(-1)).toThrow('时间偏好值必须在 0-2 之间');
      expect(() => validateTimeBias(3)).toThrow('时间偏好值必须在 0-2 之间');
    });

    it('应该拒绝小数', () => {
      expect(() => validateTimeBias(1.5)).toThrow('时间偏好必须是整数');
    });
  });

  describe('validateWeight', () => {
    it('应该通过有效的权重系数', () => {
      expect(() => validateWeight(0)).not.toThrow();
      expect(() => validateWeight(1)).not.toThrow();
      expect(() => validateWeight(50)).not.toThrow();
      expect(() => validateWeight(100)).not.toThrow();
    });

    it('应该拒绝超出范围的值', () => {
      expect(() => validateWeight(-1)).toThrow('权重系数必须在 0-100 之间');
      expect(() => validateWeight(101)).toThrow('权重系数必须在 0-100 之间');
    });
  });

  describe('validateBitmask', () => {
    it('应该通过有效的位掩码', () => {
      expect(() => validateBitmask('0')).not.toThrow();
      expect(() => validateBitmask('18446744073709551615')).not.toThrow();
    });

    it('应该拒绝无效的位掩码格式', () => {
      expect(() => validateBitmask('invalid')).toThrow('位掩码格式无效');
      expect(() => validateBitmask('12.34')).toThrow('位掩码格式无效');
    });
  });
});

// ============================================================================
// 文件验证测试
// ============================================================================

describe('文件验证', () => {
  describe('validateFilePath', () => {
    it('应该通过有效的文件路径', () => {
      expect(() => validateFilePath('/path/to/file.xlsx')).not.toThrow();
      expect(() => validateFilePath('relative/path/file.xlsx')).not.toThrow();
    });

    it('应该拒绝包含路径遍历的路径', () => {
      expect(() => validateFilePath('../../../etc/passwd')).toThrow('文件路径包含非法字符');
      expect(() => validateFilePath('path/../file.xlsx')).toThrow('文件路径包含非法字符');
    });

    it('应该拒绝空路径', () => {
      expect(() => validateFilePath('')).toThrow('文件路径不能为空字符串');
    });
  });

  describe('validateFileExtension', () => {
    it('应该通过允许的文件扩展名', () => {
      expect(() => validateFileExtension('/path/to/file.xlsx', ['.xlsx', '.xls'])).not.toThrow();
      expect(() => validateFileExtension('/path/to/file.xls', ['.xlsx', '.xls'])).not.toThrow();
    });

    it('应该拒绝不允许的文件扩展名', () => {
      expect(() => validateFileExtension('/path/to/file.txt', ['.xlsx', '.xls'])).toThrow('文件类型不支持');
      expect(() => validateFileExtension('/path/to/file.pdf', ['.xlsx', '.xls'])).toThrow('文件类型不支持');
    });

    it('应该不区分大小写', () => {
      expect(() => validateFileExtension('/path/to/file.XLSX', ['.xlsx', '.xls'])).not.toThrow();
    });
  });

  describe('validateFileSize', () => {
    it('应该通过有效的文件大小', () => {
      const maxSize = 10 * 1024 * 1024; // 10MB
      expect(() => validateFileSize(1024, maxSize)).not.toThrow();
      expect(() => validateFileSize(maxSize, maxSize)).not.toThrow();
    });

    it('应该拒绝超过限制的文件大小', () => {
      const maxSize = 10 * 1024 * 1024; // 10MB
      const largeSize = 20 * 1024 * 1024; // 20MB
      expect(() => validateFileSize(largeSize, maxSize)).toThrow('文件大小超过限制');
    });

    it('应该拒绝负数文件大小', () => {
      expect(() => validateFileSize(-1, 1024)).toThrow('文件大小不能为负数');
    });
  });
});

// ============================================================================
// 数据范围验证测试
// ============================================================================

describe('数据范围验证', () => {
  describe('validateNumberRange', () => {
    it('应该通过范围内的数值', () => {
      expect(() => validateNumberRange(5, 1, 10)).not.toThrow();
      expect(() => validateNumberRange(1, 1, 10)).not.toThrow();
      expect(() => validateNumberRange(10, 1, 10)).not.toThrow();
    });

    it('应该拒绝超出范围的数值', () => {
      expect(() => validateNumberRange(0, 1, 10)).toThrow('数值必须在 1 到 10 之间');
      expect(() => validateNumberRange(11, 1, 10)).toThrow('数值必须在 1 到 10 之间');
    });
  });

  describe('validateStringLength', () => {
    it('应该通过长度范围内的字符串', () => {
      expect(() => validateStringLength('hello', 1, 10)).not.toThrow();
      expect(() => validateStringLength('a', 1, 10)).not.toThrow();
      expect(() => validateStringLength('1234567890', 1, 10)).not.toThrow();
    });

    it('应该拒绝超出长度范围的字符串', () => {
      expect(() => validateStringLength('', 1, 10)).toThrow('字符串长度必须在 1 到 10 之间');
      expect(() => validateStringLength('12345678901', 1, 10)).toThrow('字符串长度必须在 1 到 10 之间');
    });
  });

  describe('validateArrayLength', () => {
    it('应该通过长度范围内的数组', () => {
      expect(() => validateArrayLength([1, 2, 3], 1, 5)).not.toThrow();
      expect(() => validateArrayLength([1], 1, 5)).not.toThrow();
      expect(() => validateArrayLength([1, 2, 3, 4, 5], 1, 5)).not.toThrow();
    });

    it('应该拒绝超出长度范围的数组', () => {
      expect(() => validateArrayLength([], 1, 5)).toThrow('数组长度必须在 1 到 5 之间');
      expect(() => validateArrayLength([1, 2, 3, 4, 5, 6], 1, 5)).toThrow('数组长度必须在 1 到 5 之间');
    });

    it('应该拒绝非数组类型', () => {
      expect(() => validateArrayLength('not an array', 1, 5)).toThrow('数组必须是数组类型');
    });
  });
});

// ============================================================================
// 数据格式验证测试
// ============================================================================

describe('数据格式验证', () => {
  describe('validateEmail', () => {
    it('应该通过有效的邮箱地址', () => {
      expect(() => validateEmail('user@example.com')).not.toThrow();
      expect(() => validateEmail('test.user@domain.co.uk')).not.toThrow();
    });

    it('应该拒绝无效的邮箱地址', () => {
      expect(() => validateEmail('invalid-email')).toThrow('邮箱地址格式无效');
      expect(() => validateEmail('@example.com')).toThrow('邮箱地址格式无效');
      expect(() => validateEmail('user@')).toThrow('邮箱地址格式无效');
    });
  });

  describe('validatePhone', () => {
    it('应该通过有效的手机号码', () => {
      expect(() => validatePhone('13800138000')).not.toThrow();
      expect(() => validatePhone('15912345678')).not.toThrow();
    });

    it('应该拒绝无效的手机号码', () => {
      expect(() => validatePhone('12345')).toThrow('电话号码格式无效');
      expect(() => validatePhone('12345678901')).toThrow('电话号码格式无效');
      expect(() => validatePhone('01234567890')).toThrow('电话号码格式无效');
    });
  });

  describe('validateDateFormat', () => {
    it('应该通过有效的日期格式', () => {
      expect(() => validateDateFormat('2024-01-15')).not.toThrow();
      expect(() => validateDateFormat('2024-01-15T10:30:00Z')).not.toThrow();
    });

    it('应该拒绝无效的日期格式', () => {
      expect(() => validateDateFormat('invalid-date')).toThrow('日期格式无效');
      expect(() => validateDateFormat('2024-13-01')).toThrow('日期格式无效');
    });
  });

  describe('validateUrl', () => {
    it('应该通过有效的URL', () => {
      expect(() => validateUrl('https://example.com')).not.toThrow();
      expect(() => validateUrl('http://localhost:3000')).not.toThrow();
    });

    it('应该拒绝无效的URL', () => {
      expect(() => validateUrl('invalid-url')).toThrow('URL格式无效');
      expect(() => validateUrl('not a url')).toThrow('URL格式无效');
    });
  });
});

// ============================================================================
// 组合验证函数测试
// ============================================================================

describe('组合验证函数', () => {
  describe('validateTeacherPreference', () => {
    it('应该通过有效的教师偏好配置', () => {
      const validPreference = {
        teacherId: 1001,
        preferredSlots: '18446744073709551615',
        timeBias: 0,
        weight: 1,
        blockedSlots: '0',
      };
      expect(() => validateTeacherPreference(validPreference)).not.toThrow();
    });

    it('应该拒绝无效的教师ID', () => {
      const invalidPreference = {
        teacherId: -1,
        preferredSlots: '0',
        timeBias: 0,
        weight: 1,
        blockedSlots: '0',
      };
      expect(() => validateTeacherPreference(invalidPreference)).toThrow('教师ID必须为正整数');
    });

    it('应该拒绝无效的时间偏好', () => {
      const invalidPreference = {
        teacherId: 1001,
        preferredSlots: '0',
        timeBias: 5,
        weight: 1,
        blockedSlots: '0',
      };
      expect(() => validateTeacherPreference(invalidPreference)).toThrow('时间偏好值必须在 0-2 之间');
    });

    it('应该拒绝无效的权重系数', () => {
      const invalidPreference = {
        teacherId: 1001,
        preferredSlots: '0',
        timeBias: 0,
        weight: 150,
        blockedSlots: '0',
      };
      expect(() => validateTeacherPreference(invalidPreference)).toThrow('权重系数必须在 0-100 之间');
    });
  });

  describe('validateCourseMove', () => {
    it('应该通过有效的课程移动参数', () => {
      expect(() =>
        validateCourseMove(
          101,
          '数学',
          1001,
          { day: 0, period: 0 },
          { day: 0, period: 1 }
        )
      ).not.toThrow();
    });

    it('应该拒绝无效的班级ID', () => {
      expect(() =>
        validateCourseMove(
          0,
          '数学',
          1001,
          { day: 0, period: 0 },
          { day: 0, period: 1 }
        )
      ).toThrow('班级ID必须为正整数');
    });

    it('应该拒绝无效的科目ID', () => {
      expect(() =>
        validateCourseMove(
          101,
          '',
          1001,
          { day: 0, period: 0 },
          { day: 0, period: 1 }
        )
      ).toThrow('科目ID不能为空字符串');
    });

    it('应该拒绝无效的时间槽位', () => {
      expect(() =>
        validateCourseMove(
          101,
          '数学',
          1001,
          { day: 30, period: 0 },
          { day: 0, period: 1 }
        )
      ).toThrow('day 值无效');
    });
  });

  describe('validateExcelImportFile', () => {
    it('应该通过有效的Excel文件路径', () => {
      expect(() => validateExcelImportFile('/path/to/file.xlsx')).not.toThrow();
      expect(() => validateExcelImportFile('/path/to/file.xls')).not.toThrow();
    });

    it('应该拒绝非Excel文件', () => {
      expect(() => validateExcelImportFile('/path/to/file.txt')).toThrow('Excel文件类型不支持');
    });

    it('应该拒绝包含路径遍历的路径', () => {
      expect(() => validateExcelImportFile('../../../file.xlsx')).toThrow('Excel文件路径包含非法字符');
    });
  });

  describe('validateExcelExportPath', () => {
    it('应该通过有效的Excel输出路径', () => {
      expect(() => validateExcelExportPath('/path/to/output.xlsx')).not.toThrow();
    });

    it('应该拒绝非.xlsx格式', () => {
      expect(() => validateExcelExportPath('/path/to/output.xls')).toThrow('Excel输出文件类型不支持');
    });
  });
});
