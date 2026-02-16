/**
 * 数据验证工具模块
 *
 * 功能：
 * - 提供通用的数据验证函数
 * - 实现业务数据验证（教师ID、班级ID、科目ID、时间槽位等）
 * - 实现文件验证（文件路径、文件大小、文件类型等）
 * - 实现数据范围验证（数值范围、字符串长度等）
 * - 实现数据格式验证（邮箱、电话、日期格式等）
 * - 提供清晰的错误消息
 *
 * 使用示例：
 * ```typescript
 * import { validateTeacherId, validateTimeSlot, validateFilePath } from '@/utils/validators';
 *
 * // 验证教师ID
 * validateTeacherId(1001); // 通过
 * validateTeacherId(-1);   // 抛出错误
 *
 * // 验证时间槽位
 * validateTimeSlot({ day: 0, period: 0 }); // 通过
 * validateTimeSlot({ day: 30, period: 0 }); // 抛出错误
 *
 * // 验证文件路径
 * validateFilePath('/path/to/file.xlsx'); // 通过
 * validateFilePath('../../../etc/passwd'); // 抛出错误
 * ```
 */

import { createLogger } from './logger';

// 创建验证器专用日志记录器
const logger = createLogger('Validators');

// ============================================================================
// 类型定义
// ============================================================================

/**
 * 时间槽位接口
 */
export interface TimeSlot {
  /** 星期（0-29，支持1-30天周期） */
  day: number;
  /** 节次（0-11，支持1-12节） */
  period: number;
}

/**
 * 验证选项
 */
export interface ValidationOptions {
  /** 字段名称（用于错误消息） */
  fieldName?: string;
  /** 是否允许为空 */
  allowNull?: boolean;
  /** 是否允许为undefined */
  allowUndefined?: boolean;
}

// ============================================================================
// 通用数据类型验证
// ============================================================================

/**
 * 验证字符串
 *
 * @param value - 要验证的值
 * @param options - 验证选项
 * @throws 如果验证失败则抛出错误
 *
 * @example
 * ```typescript
 * validateString('hello', { fieldName: '名称' }); // 通过
 * validateString('', { fieldName: '名称' }); // 抛出错误
 * validateString(null, { fieldName: '名称', allowNull: true }); // 通过
 * ```
 */
export function validateString(value: any, options: ValidationOptions = {}): asserts value is string {
  const { fieldName = '字符串', allowNull = false, allowUndefined = false } = options;

  if (value === null && allowNull) {
    return;
  }

  if (value === undefined && allowUndefined) {
    return;
  }

  if (typeof value !== 'string') {
    throw new Error(`${fieldName}必须是字符串类型`);
  }

  if (value.trim().length === 0) {
    throw new Error(`${fieldName}不能为空字符串`);
  }
}

/**
 * 验证数字
 *
 * @param value - 要验证的值
 * @param options - 验证选项
 * @throws 如果验证失败则抛出错误
 *
 * @example
 * ```typescript
 * validateNumber(42, { fieldName: '年龄' }); // 通过
 * validateNumber('42', { fieldName: '年龄' }); // 抛出错误
 * validateNumber(NaN, { fieldName: '年龄' }); // 抛出错误
 * ```
 */
export function validateNumber(value: any, options: ValidationOptions = {}): asserts value is number {
  const { fieldName = '数字', allowNull = false, allowUndefined = false } = options;

  if (value === null && allowNull) {
    return;
  }

  if (value === undefined && allowUndefined) {
    return;
  }

  if (typeof value !== 'number') {
    throw new Error(`${fieldName}必须是数字类型`);
  }

  if (isNaN(value)) {
    throw new Error(`${fieldName}不能是 NaN`);
  }

  if (!isFinite(value)) {
    throw new Error(`${fieldName}必须是有限数字`);
  }
}

// ============================================================================
// 业务数据验证
// ============================================================================

/**
 * 验证教师ID
 *
 * @param teacherId - 教师ID
 * @param options - 验证选项
 * @throws 如果教师ID无效则抛出错误
 *
 * @example
 * ```typescript
 * validateTeacherId(1001); // 通过
 * validateTeacherId(0);    // 抛出错误
 * validateTeacherId(-1);   // 抛出错误
 * ```
 */
export function validateTeacherId(teacherId: any, options: ValidationOptions = {}): asserts teacherId is number {
  const { fieldName = '教师ID' } = options;

  validateNumber(teacherId, { fieldName, ...options });

  if (teacherId <= 0) {
    throw new Error(`${fieldName}必须为正整数`);
  }

  if (!Number.isInteger(teacherId)) {
    throw new Error(`${fieldName}必须是整数`);
  }

  logger.debug('教师ID验证通过', { teacherId });
}

/**
 * 验证班级ID
 *
 * @param classId - 班级ID
 * @param options - 验证选项
 * @throws 如果班级ID无效则抛出错误
 *
 * @example
 * ```typescript
 * validateClassId(101); // 通过
 * validateClassId(0);   // 抛出错误
 * ```
 */
export function validateClassId(classId: any, options: ValidationOptions = {}): asserts classId is number {
  const { fieldName = '班级ID' } = options;

  validateNumber(classId, { fieldName, ...options });

  if (classId <= 0) {
    throw new Error(`${fieldName}必须为正整数`);
  }

  if (!Number.isInteger(classId)) {
    throw new Error(`${fieldName}必须是整数`);
  }

  logger.debug('班级ID验证通过', { classId });
}

/**
 * 验证科目ID
 *
 * @param subjectId - 科目ID
 * @param options - 验证选项
 * @throws 如果科目ID无效则抛出错误
 *
 * @example
 * ```typescript
 * validateSubjectId('数学'); // 通过
 * validateSubjectId('');     // 抛出错误
 * ```
 */
export function validateSubjectId(subjectId: any, options: ValidationOptions = {}): asserts subjectId is string {
  const { fieldName = '科目ID' } = options;

  validateString(subjectId, { fieldName, ...options });

  // 科目ID长度限制
  if (subjectId.length > 50) {
    throw new Error(`${fieldName}长度不能超过50个字符`);
  }

  logger.debug('科目ID验证通过', { subjectId });
}

/**
 * 验证时间槽位
 *
 * @param slot - 时间槽位
 * @param options - 验证选项
 * @throws 如果时间槽位无效则抛出错误
 *
 * @example
 * ```typescript
 * validateTimeSlot({ day: 0, period: 0 }); // 通过
 * validateTimeSlot({ day: 30, period: 0 }); // 抛出错误
 * validateTimeSlot({ day: 0, period: 12 }); // 抛出错误
 * ```
 */
export function validateTimeSlot(slot: any, options: ValidationOptions = {}): asserts slot is TimeSlot {
  const { fieldName = '时间槽位' } = options;

  if (!slot || typeof slot !== 'object') {
    throw new Error(`${fieldName}必须是对象类型`);
  }

  if (typeof slot.day !== 'number' || slot.day < 0 || slot.day > 29) {
    throw new Error(`${fieldName}的 day 值无效: ${slot.day}，必须在 0-29 之间`);
  }

  if (typeof slot.period !== 'number' || slot.period < 0 || slot.period > 11) {
    throw new Error(`${fieldName}的 period 值无效: ${slot.period}，必须在 0-11 之间`);
  }

  logger.debug('时间槽位验证通过', { slot });
}

/**
 * 验证教师偏好时间偏好值
 *
 * @param timeBias - 时间偏好值（0=无偏好, 1=厌恶早课, 2=厌恶晚课）
 * @param options - 验证选项
 * @throws 如果时间偏好值无效则抛出错误
 */
export function validateTimeBias(timeBias: any, options: ValidationOptions = {}): asserts timeBias is number {
  const { fieldName = '时间偏好' } = options;

  validateNumber(timeBias, { fieldName, ...options });

  if (timeBias < 0 || timeBias > 2) {
    throw new Error(`${fieldName}值必须在 0-2 之间（0=无偏好, 1=厌恶早课, 2=厌恶晚课）`);
  }

  if (!Number.isInteger(timeBias)) {
    throw new Error(`${fieldName}必须是整数`);
  }

  logger.debug('时间偏好验证通过', { timeBias });
}

/**
 * 验证权重系数
 *
 * @param weight - 权重系数
 * @param options - 验证选项
 * @throws 如果权重系数无效则抛出错误
 */
export function validateWeight(weight: any, options: ValidationOptions = {}): asserts weight is number {
  const { fieldName = '权重系数' } = options;

  validateNumber(weight, { fieldName, ...options });

  if (weight < 0 || weight > 100) {
    throw new Error(`${fieldName}必须在 0-100 之间`);
  }

  logger.debug('权重系数验证通过', { weight });
}

/**
 * 验证位掩码
 *
 * @param mask - 位掩码（字符串格式的数字）
 * @param options - 验证选项
 * @throws 如果位掩码无效则抛出错误
 */
export function validateBitmask(mask: any, options: ValidationOptions = {}): asserts mask is string {
  const { fieldName = '位掩码' } = options;

  validateString(mask, { fieldName, ...options });

  try {
    BigInt(mask);
  } catch {
    throw new Error(`${fieldName}格式无效，必须是有效的数字字符串`);
  }

  logger.debug('位掩码验证通过', { mask });
}

// ============================================================================
// 文件验证
// ============================================================================

/**
 * 验证文件路径
 *
 * @param filePath - 文件路径
 * @param options - 验证选项
 * @throws 如果文件路径无效则抛出错误
 *
 * @example
 * ```typescript
 * validateFilePath('/path/to/file.xlsx'); // 通过
 * validateFilePath('../../../etc/passwd'); // 抛出错误（路径遍历攻击）
 * validateFilePath(''); // 抛出错误
 * ```
 */
export function validateFilePath(filePath: any, options: ValidationOptions = {}): asserts filePath is string {
  const { fieldName = '文件路径' } = options;

  validateString(filePath, { fieldName, ...options });

  // 检查路径遍历攻击
  if (filePath.includes('..')) {
    throw new Error(`${fieldName}包含非法字符（..）`);
  }

  // 检查绝对路径（可选，根据需求调整）
  // 这里允许相对路径和绝对路径

  logger.debug('文件路径验证通过', { filePath });
}

/**
 * 验证文件扩展名
 *
 * @param filePath - 文件路径
 * @param allowedExtensions - 允许的扩展名列表（如 ['.xlsx', '.xls']）
 * @param options - 验证选项
 * @throws 如果文件扩展名不在允许列表中则抛出错误
 *
 * @example
 * ```typescript
 * validateFileExtension('/path/to/file.xlsx', ['.xlsx', '.xls']); // 通过
 * validateFileExtension('/path/to/file.txt', ['.xlsx', '.xls']); // 抛出错误
 * ```
 */
export function validateFileExtension(
  filePath: string,
  allowedExtensions: string[],
  options: ValidationOptions = {}
): void {
  const { fieldName = '文件' } = options;

  validateFilePath(filePath, { fieldName, ...options });

  const ext = filePath.substring(filePath.lastIndexOf('.')).toLowerCase();

  if (!allowedExtensions.includes(ext)) {
    throw new Error(
      `${fieldName}类型不支持: ${ext}。仅支持: ${allowedExtensions.join(', ')}`
    );
  }

  logger.debug('文件扩展名验证通过', { filePath, ext });
}

/**
 * 验证文件大小
 *
 * @param fileSize - 文件大小（字节）
 * @param maxSize - 最大允许大小（字节）
 * @param options - 验证选项
 * @throws 如果文件大小超过限制则抛出错误
 *
 * @example
 * ```typescript
 * validateFileSize(1024 * 1024, 10 * 1024 * 1024); // 1MB < 10MB，通过
 * validateFileSize(20 * 1024 * 1024, 10 * 1024 * 1024); // 20MB > 10MB，抛出错误
 * ```
 */
export function validateFileSize(
  fileSize: any,
  maxSize: number,
  options: ValidationOptions = {}
): asserts fileSize is number {
  const { fieldName = '文件大小' } = options;

  validateNumber(fileSize, { fieldName, ...options });

  if (fileSize < 0) {
    throw new Error(`${fieldName}不能为负数`);
  }

  if (fileSize > maxSize) {
    const fileSizeMB = (fileSize / (1024 * 1024)).toFixed(2);
    const maxSizeMB = (maxSize / (1024 * 1024)).toFixed(2);
    throw new Error(`${fieldName}超过限制: ${fileSizeMB}MB > ${maxSizeMB}MB`);
  }

  logger.debug('文件大小验证通过', { fileSize, maxSize });
}

// ============================================================================
// 数据范围验证
// ============================================================================

/**
 * 验证数值范围
 *
 * @param value - 要验证的值
 * @param min - 最小值（包含）
 * @param max - 最大值（包含）
 * @param options - 验证选项
 * @throws 如果值不在范围内则抛出错误
 *
 * @example
 * ```typescript
 * validateNumberRange(5, 1, 10); // 通过
 * validateNumberRange(0, 1, 10); // 抛出错误
 * validateNumberRange(11, 1, 10); // 抛出错误
 * ```
 */
export function validateNumberRange(
  value: any,
  min: number,
  max: number,
  options: ValidationOptions = {}
): asserts value is number {
  const { fieldName = '数值' } = options;

  validateNumber(value, { fieldName, ...options });

  if (value < min || value > max) {
    throw new Error(`${fieldName}必须在 ${min} 到 ${max} 之间，当前值: ${value}`);
  }

  logger.debug('数值范围验证通过', { value, min, max });
}

/**
 * 验证字符串长度
 *
 * @param value - 要验证的字符串
 * @param minLength - 最小长度（包含）
 * @param maxLength - 最大长度（包含）
 * @param options - 验证选项
 * @throws 如果字符串长度不在范围内则抛出错误
 *
 * @example
 * ```typescript
 * validateStringLength('hello', 1, 10); // 通过
 * validateStringLength('', 1, 10); // 抛出错误
 * validateStringLength('very long string', 1, 10); // 抛出错误
 * ```
 */
export function validateStringLength(
  value: any,
  minLength: number,
  maxLength: number,
  options: ValidationOptions = {}
): asserts value is string {
  const { fieldName = '字符串' } = options;

  // 先检查类型
  if (typeof value !== 'string') {
    throw new Error(`${fieldName}必须是字符串类型`);
  }

  // 检查长度（允许空字符串，因为长度验证会处理）
  if (value.length < minLength || value.length > maxLength) {
    throw new Error(
      `${fieldName}长度必须在 ${minLength} 到 ${maxLength} 之间，当前长度: ${value.length}`
    );
  }

  logger.debug('字符串长度验证通过', { value, length: value.length, minLength, maxLength });
}

/**
 * 验证数组长度
 *
 * @param array - 要验证的数组
 * @param minLength - 最小长度（包含）
 * @param maxLength - 最大长度（包含）
 * @param options - 验证选项
 * @throws 如果数组长度不在范围内则抛出错误
 *
 * @example
 * ```typescript
 * validateArrayLength([1, 2, 3], 1, 5); // 通过
 * validateArrayLength([], 1, 5); // 抛出错误
 * ```
 */
export function validateArrayLength(
  array: any,
  minLength: number,
  maxLength: number,
  options: ValidationOptions = {}
): asserts array is any[] {
  const { fieldName = '数组' } = options;

  if (!Array.isArray(array)) {
    throw new Error(`${fieldName}必须是数组类型`);
  }

  if (array.length < minLength || array.length > maxLength) {
    throw new Error(
      `${fieldName}长度必须在 ${minLength} 到 ${maxLength} 之间，当前长度: ${array.length}`
    );
  }

  logger.debug('数组长度验证通过', { length: array.length, minLength, maxLength });
}

// ============================================================================
// 数据格式验证
// ============================================================================

/**
 * 验证邮箱格式
 *
 * @param email - 邮箱地址
 * @param options - 验证选项
 * @throws 如果邮箱格式无效则抛出错误
 *
 * @example
 * ```typescript
 * validateEmail('user@example.com'); // 通过
 * validateEmail('invalid-email'); // 抛出错误
 * ```
 */
export function validateEmail(email: any, options: ValidationOptions = {}): asserts email is string {
  const { fieldName = '邮箱地址' } = options;

  validateString(email, { fieldName, ...options });

  // 简单的邮箱正则表达式
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  if (!emailRegex.test(email)) {
    throw new Error(`${fieldName}格式无效: ${email}`);
  }

  logger.debug('邮箱格式验证通过', { email });
}

/**
 * 验证电话号码格式（中国大陆）
 *
 * @param phone - 电话号码
 * @param options - 验证选项
 * @throws 如果电话号码格式无效则抛出错误
 *
 * @example
 * ```typescript
 * validatePhone('13800138000'); // 通过
 * validatePhone('12345'); // 抛出错误
 * ```
 */
export function validatePhone(phone: any, options: ValidationOptions = {}): asserts phone is string {
  const { fieldName = '电话号码' } = options;

  validateString(phone, { fieldName, ...options });

  // 中国大陆手机号码正则表达式（简化版）
  const phoneRegex = /^1[3-9]\d{9}$/;

  if (!phoneRegex.test(phone)) {
    throw new Error(`${fieldName}格式无效: ${phone}（应为11位数字，以1开头）`);
  }

  logger.debug('电话号码格式验证通过', { phone });
}

/**
 * 验证日期格式（ISO 8601）
 *
 * @param dateString - 日期字符串
 * @param options - 验证选项
 * @throws 如果日期格式无效则抛出错误
 *
 * @example
 * ```typescript
 * validateDateFormat('2024-01-15'); // 通过
 * validateDateFormat('2024-01-15T10:30:00Z'); // 通过
 * validateDateFormat('invalid-date'); // 抛出错误
 * ```
 */
export function validateDateFormat(dateString: any, options: ValidationOptions = {}): asserts dateString is string {
  const { fieldName = '日期' } = options;

  validateString(dateString, { fieldName, ...options });

  const date = new Date(dateString);

  if (isNaN(date.getTime())) {
    throw new Error(`${fieldName}格式无效: ${dateString}`);
  }

  logger.debug('日期格式验证通过', { dateString });
}

/**
 * 验证URL格式
 *
 * @param url - URL字符串
 * @param options - 验证选项
 * @throws 如果URL格式无效则抛出错误
 *
 * @example
 * ```typescript
 * validateUrl('https://example.com'); // 通过
 * validateUrl('invalid-url'); // 抛出错误
 * ```
 */
export function validateUrl(url: any, options: ValidationOptions = {}): asserts url is string {
  const { fieldName = 'URL' } = options;

  validateString(url, { fieldName, ...options });

  try {
    new URL(url);
  } catch {
    throw new Error(`${fieldName}格式无效: ${url}`);
  }

  logger.debug('URL格式验证通过', { url });
}

// ============================================================================
// 组合验证函数
// ============================================================================

/**
 * 验证教师偏好配置对象
 *
 * @param preference - 教师偏好配置
 * @throws 如果配置无效则抛出错误
 *
 * @example
 * ```typescript
 * validateTeacherPreference({
 *   teacherId: 1001,
 *   preferredSlots: '18446744073709551615',
 *   timeBias: 0,
 *   weight: 1,
 *   blockedSlots: '0',
 * }); // 通过
 * ```
 */
export function validateTeacherPreference(preference: any): void {
  if (!preference || typeof preference !== 'object') {
    throw new Error('教师偏好配置不能为空');
  }

  validateTeacherId(preference.teacherId, { fieldName: '教师ID' });
  validateBitmask(preference.preferredSlots, { fieldName: '偏好时段掩码' });
  validateTimeBias(preference.timeBias, { fieldName: '时间偏好' });
  validateWeight(preference.weight, { fieldName: '权重系数' });
  validateBitmask(preference.blockedSlots, { fieldName: '不排课时段掩码' });

  logger.debug('教师偏好配置验证通过', { teacherId: preference.teacherId });
}

/**
 * 验证课程移动参数
 *
 * @param classId - 班级ID
 * @param subjectId - 科目ID
 * @param teacherId - 教师ID
 * @param fromSlot - 源时间槽位
 * @param toSlot - 目标时间槽位
 * @throws 如果参数无效则抛出错误
 */
export function validateCourseMove(
  classId: any,
  subjectId: any,
  teacherId: any,
  fromSlot: any,
  toSlot: any
): void {
  validateClassId(classId, { fieldName: '班级ID' });
  validateSubjectId(subjectId, { fieldName: '科目ID' });
  validateTeacherId(teacherId, { fieldName: '教师ID' });
  validateTimeSlot(fromSlot, { fieldName: '源时间槽位' });
  validateTimeSlot(toSlot, { fieldName: '目标时间槽位' });

  // 检查源位置和目标位置是否相同
  if (fromSlot.day === toSlot.day && fromSlot.period === toSlot.period) {
    logger.warn('源位置和目标位置相同', { fromSlot, toSlot });
  }

  logger.debug('课程移动参数验证通过', { classId, subjectId, teacherId });
}

/**
 * 验证Excel导入文件
 *
 * @param filePath - 文件路径
 * @throws 如果文件无效则抛出错误
 */
export function validateExcelImportFile(filePath: any): void {
  validateFilePath(filePath, { fieldName: 'Excel文件路径' });
  validateFileExtension(filePath, ['.xlsx', '.xls'], { fieldName: 'Excel文件' });

  logger.debug('Excel导入文件验证通过', { filePath });
}

/**
 * 验证Excel导出路径
 *
 * @param outputPath - 输出路径
 * @throws 如果路径无效则抛出错误
 */
export function validateExcelExportPath(outputPath: any): void {
  validateFilePath(outputPath, { fieldName: 'Excel输出路径' });
  validateFileExtension(outputPath, ['.xlsx'], { fieldName: 'Excel输出文件' });

  logger.debug('Excel导出路径验证通过', { outputPath });
}

// ============================================================================
// 导出所有验证函数
// ============================================================================

export default {
  // 通用数据类型验证
  validateString,
  validateNumber,

  // 业务数据验证
  validateTeacherId,
  validateClassId,
  validateSubjectId,
  validateTimeSlot,
  validateTimeBias,
  validateWeight,
  validateBitmask,

  // 文件验证
  validateFilePath,
  validateFileExtension,
  validateFileSize,

  // 数据范围验证
  validateNumberRange,
  validateStringLength,
  validateArrayLength,

  // 数据格式验证
  validateEmail,
  validatePhone,
  validateDateFormat,
  validateUrl,

  // 组合验证函数
  validateTeacherPreference,
  validateCourseMove,
  validateExcelImportFile,
  validateExcelExportPath,
};
