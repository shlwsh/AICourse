/**
 * 前端表单验证工具
 * 提供统一的表单验证规则和验证方法
 */

import { logger } from './logger'

/**
 * 验证结果接口
 */
export interface ValidationResult {
  valid: boolean
  message?: string
}

/**
 * 验证规则接口
 */
export interface ValidationRule {
  required?: boolean
  min?: number
  max?: number
  minLength?: number
  maxLength?: number
  pattern?: RegExp
  validator?: (value: any) => boolean | string
  message?: string
}

/**
 * 表单验证器类
 */
export class FormValidator {
  /**
   * 验证单个字段
   */
  static validateField(value: any, rules: ValidationRule[]): ValidationResult {
    logger.debug('验证字段', { value, rules })

    for (const rule of rules) {
      // 必填验证
      if (rule.required && (value === null || value === undefined || value === '')) {
        return {
          valid: false,
          message: rule.message || '此字段为必填项'
        }
      }

      // 如果值为空且非必填，跳过后续验证
      if (!rule.required && (value === null || value === undefined || value === '')) {
        continue
      }

      // 最小值验证
      if (rule.min !== undefined && Number(value) < rule.min) {
        return {
          valid: false,
          message: rule.message || `值不能小于 ${rule.min}`
        }
      }

      // 最大值验证
      if (rule.max !== undefined && Number(value) > rule.max) {
        return {
          valid: false,
          message: rule.message || `值不能大于 ${rule.max}`
        }
      }

      // 最小长度验证
      if (rule.minLength !== undefined && String(value).length < rule.minLength) {
        return {
          valid: false,
          message: rule.message || `长度不能少于 ${rule.minLength} 个字符`
        }
      }

      // 最大长度验证
      if (rule.maxLength !== undefined && String(value).length > rule.maxLength) {
        return {
          valid: false,
          message: rule.message || `长度不能超过 ${rule.maxLength} 个字符`
        }
      }

      // 正则表达式验证
      if (rule.pattern && !rule.pattern.test(String(value))) {
        return {
          valid: false,
          message: rule.message || '格式不正确'
        }
      }

      // 自定义验证器
      if (rule.validator) {
        const result = rule.validator(value)
        if (result === false) {
          return {
            valid: false,
            message: rule.message || '验证失败'
          }
        }
        if (typeof result === 'string') {
          return {
            valid: false,
            message: result
          }
        }
      }
    }

    return { valid: true }
  }

  /**
   * 验证整个表单
   */
  static validateForm(
    formData: Record<string, any>,
    rules: Record<string, ValidationRule[]>
  ): { valid: boolean; errors: Record<string, string> } {
    logger.debug('验证表单', { formData, rules })

    const errors: Record<string, string> = {}
    let valid = true

    for (const [field, fieldRules] of Object.entries(rules)) {
      const result = this.validateField(formData[field], fieldRules)
      if (!result.valid) {
        valid = false
        errors[field] = result.message || '验证失败'
      }
    }

    logger.info('表单验证结果', { valid, errors })
    return { valid, errors }
  }
}

/**
 * 常用验证规则
 */
export const CommonRules = {
  /**
   * 必填规则
   */
  required: (message?: string): ValidationRule => ({
    required: true,
    message: message || '此字段为必填项'
  }),

  /**
   * 数字范围规则
   */
  numberRange: (min: number, max: number, message?: string): ValidationRule => ({
    min,
    max,
    message: message || `请输入 ${min} 到 ${max} 之间的数字`
  }),

  /**
   * 字符串长度规则
   */
  stringLength: (minLength: number, maxLength: number, message?: string): ValidationRule => ({
    minLength,
    maxLength,
    message: message || `长度必须在 ${minLength} 到 ${maxLength} 个字符之间`
  }),

  /**
   * 邮箱规则
   */
  email: (message?: string): ValidationRule => ({
    pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    message: message || '请输入有效的邮箱地址'
  }),

  /**
   * 手机号规则
   */
  phone: (message?: string): ValidationRule => ({
    pattern: /^1[3-9]\d{9}$/,
    message: message || '请输入有效的手机号码'
  }),

  /**
   * 正整数规则
   */
  positiveInteger: (message?: string): ValidationRule => ({
    validator: (value: any) => {
      const num = Number(value)
      return Number.isInteger(num) && num > 0
    },
    message: message || '请输入正整数'
  }),

  /**
   * 非负整数规则
   */
  nonNegativeInteger: (message?: string): ValidationRule => ({
    validator: (value: any) => {
      const num = Number(value)
      return Number.isInteger(num) && num >= 0
    },
    message: message || '请输入非负整数'
  })
}

/**
 * 教师相关验证规则
 */
export const TeacherRules = {
  /**
   * 教师姓名规则
   */
  name: (): ValidationRule[] => [
    CommonRules.required('教师姓名不能为空'),
    CommonRules.stringLength(2, 20, '教师姓名长度必须在2到20个字符之间')
  ],

  /**
   * 教师工号规则
   */
  employeeId: (): ValidationRule[] => [
    CommonRules.required('教师工号不能为空'),
    {
      pattern: /^[A-Za-z0-9]{4,20}$/,
      message: '教师工号必须是4到20位的字母或数字'
    }
  ],

  /**
   * 教师科目规则
   */
  subject: (): ValidationRule[] => [CommonRules.required('教师科目不能为空')],

  /**
   * 教师周课时数规则
   */
  weeklyHours: (): ValidationRule[] => [
    CommonRules.required('周课时数不能为空'),
    CommonRules.numberRange(0, 40, '周课时数必须在0到40之间')
  ]
}

/**
 * 班级相关验证规则
 */
export const ClassRules = {
  /**
   * 班级名称规则
   */
  name: (): ValidationRule[] => [
    CommonRules.required('班级名称不能为空'),
    CommonRules.stringLength(2, 20, '班级名称长度必须在2到20个字符之间')
  ],

  /**
   * 班级人数规则
   */
  studentCount: (): ValidationRule[] => [
    CommonRules.required('班级人数不能为空'),
    CommonRules.numberRange(1, 100, '班级人数必须在1到100之间')
  ],

  /**
   * 年级规则
   */
  grade: (): ValidationRule[] => [
    CommonRules.required('年级不能为空'),
    CommonRules.numberRange(1, 12, '年级必须在1到12之间')
  ]
}

/**
 * 科目相关验证规则
 */
export const SubjectRules = {
  /**
   * 科目名称规则
   */
  name: (): ValidationRule[] => [
    CommonRules.required('科目名称不能为空'),
    CommonRules.stringLength(2, 20, '科目名称长度必须在2到20个字符之间')
  ],

  /**
   * 周课时数规则
   */
  weeklyHours: (): ValidationRule[] => [
    CommonRules.required('周课时数不能为空'),
    CommonRules.numberRange(1, 20, '周课时数必须在1到20之间')
  ],

  /**
   * 连堂数规则
   */
  consecutivePeriods: (): ValidationRule[] => [
    CommonRules.required('连堂数不能为空'),
    CommonRules.numberRange(1, 4, '连堂数必须在1到4之间')
  ]
}

/**
 * 场地相关验证规则
 */
export const VenueRules = {
  /**
   * 场地名称规则
   */
  name: (): ValidationRule[] => [
    CommonRules.required('场地名称不能为空'),
    CommonRules.stringLength(2, 30, '场地名称长度必须在2到30个字符之间')
  ],

  /**
   * 场地容量规则
   */
  capacity: (): ValidationRule[] => [
    CommonRules.required('场地容量不能为空'),
    CommonRules.numberRange(1, 200, '场地容量必须在1到200之间')
  ]
}

/**
 * 时间段相关验证规则
 */
export const TimeSlotRules = {
  /**
   * 星期规则
   */
  dayOfWeek: (): ValidationRule[] => [
    CommonRules.required('星期不能为空'),
    CommonRules.numberRange(1, 7, '星期必须在1到7之间')
  ],

  /**
   * 节次规则
   */
  period: (): ValidationRule[] => [
    CommonRules.required('节次不能为空'),
    CommonRules.numberRange(1, 12, '节次必须在1到12之间')
  ]
}
