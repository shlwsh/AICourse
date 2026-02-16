/**
 * 业务规则检查工具模块
 *
 * 功能：
 * - 实现课表完整性检查（课时数是否满足教学计划）
 * - 实现教师工作量检查（是否超过合理范围）
 * - 实现时间冲突检查（教师/班级时间冲突）
 * - 实现场地容量检查（是否超过场地容量限制）
 * - 实现课程分布检查（课程是否合理分布在一周内）
 * - 实现连堂课程检查（连堂课程是否符合规则）
 * - 实现固定课程检查（固定课程是否被正确保留）
 * - 提供清晰的检查结果和错误消息
 * - 添加完善的日志记录
 *
 * 使用示例：
 * ```typescript
 * import { checkScheduleCompleteness, checkTeacherWorkload } from '@/utils/business-rules';
 *
 * // 检查课表完整性
 * const completenessResult = checkScheduleCompleteness(schedule, curriculums);
 * if (!completenessResult.isValid) {
 *   console.error('课表不完整:', completenessResult.errors);
 * }
 *
 * // 检查教师工作量
 * const workloadResult = checkTeacherWorkload(schedule, maxSessionsPerWeek);
 * if (!workloadResult.isValid) {
 *   console.warn('教师工作量超标:', workloadResult.warnings);
 * }
 * ```
 */

import { createLogger } from './logger';

// 创建业务规则检查专用日志记录器
const logger = createLogger('BusinessRules');

// ============================================================================
// 类型定义
// ============================================================================

/**
 * 时间槽位
 */
export interface TimeSlot {
  /** 星期（0-29，支持1-30天周期） */
  day: number;
  /** 节次（0-11，支持1-12节） */
  period: number;
}

/**
 * 课表条目
 */
export interface ScheduleEntry {
  /** 班级ID */
  classId: number;
  /** 科目ID */
  subjectId: string;
  /** 教师ID */
  teacherId: number;
  /** 时间槽位 */
  timeSlot: TimeSlot;
  /** 是否固定课程 */
  isFixed: boolean;
  /** 单双周标记 */
  weekType: 'Every' | 'Odd' | 'Even';
}

/**
 * 课表
 */
export interface Schedule {
  /** 课表条目列表 */
  entries: ScheduleEntry[];
  /** 代价值 */
  cost: number;
  /** 元数据 */
  metadata: {
    cycleDays: number;
    periodsPerDay: number;
    generatedAt: string;
    version: number;
  };
}

/**
 * 教学计划
 */
export interface ClassCurriculum {
  /** ID */
  id: number;
  /** 班级ID */
  classId: number;
  /** 科目ID */
  subjectId: string;
  /** 教师ID */
  teacherId: number;
  /** 目标课时数 */
  targetSessions: number;
  /** 是否合班课 */
  isCombinedClass: boolean;
  /** 合班班级列表 */
  combinedClassIds: number[];
  /** 单双周标记 */
  weekType: 'Every' | 'Odd' | 'Even';
}

/**
 * 场地配置
 */
export interface Venue {
  /** 场地ID */
  id: string;
  /** 场地名称 */
  name: string;
  /** 容量（同时容纳的班级数） */
  capacity: number;
}

/**
 * 科目配置
 */
export interface SubjectConfig {
  /** 科目ID */
  id: string;
  /** 科目名称 */
  name: string;
  /** 禁止时段掩码 */
  forbiddenSlots: string;
  /** 是否允许连堂 */
  allowDoubleSession: boolean;
  /** 关联场地ID */
  venueId?: string;
  /** 是否主科 */
  isMajorSubject: boolean;
}

/**
 * 固定课程
 */
export interface FixedCourse {
  /** 班级ID */
  classId: number;
  /** 科目ID */
  subjectId: string;
  /** 教师ID */
  teacherId: number;
  /** 时间槽位 */
  timeSlot: TimeSlot;
  /** 是否预排课程 */
  isPreArranged: boolean;
}

/**
 * 检查结果
 */
export interface CheckResult {
  /** 是否有效 */
  isValid: boolean;
  /** 错误列表 */
  errors: string[];
  /** 警告列表 */
  warnings: string[];
  /** 详细信息 */
  details?: Record<string, any>;
}

// ============================================================================
// 1. 课表完整性检查
// ============================================================================

/**
 * 检查课表完整性
 *
 * 验证每个班级的每门课程总课时数是否达到教学计划中设定的目标课时数。
 *
 * @param schedule - 课表
 * @param curriculums - 教学计划列表
 * @returns 检查结果
 *
 * @example
 * ```typescript
 * const result = checkScheduleCompleteness(schedule, curriculums);
 * if (!result.isValid) {
 *   console.error('课表不完整:', result.errors);
 * }
 * ```
 */
export function checkScheduleCompleteness(
  schedule: Schedule,
  curriculums: ClassCurriculum[]
): CheckResult {
  logger.info('开始检查课表完整性', {
    entryCount: schedule.entries.length,
    curriculumCount: curriculums.length,
  });

  const errors: string[] = [];
  const warnings: string[] = [];
  const details: Record<string, any> = {};

  // 统计每个班级每门课程的实际课时数
  const actualSessions = new Map<string, number>();

  for (const entry of schedule.entries) {
    const key = `${entry.classId}-${entry.subjectId}-${entry.teacherId}`;
    actualSessions.set(key, (actualSessions.get(key) || 0) + 1);
  }

  // 检查每个教学计划
  for (const curriculum of curriculums) {
    const key = `${curriculum.classId}-${curriculum.subjectId}-${curriculum.teacherId}`;
    const actual = actualSessions.get(key) || 0;
    const target = curriculum.targetSessions;

    if (actual < target) {
      errors.push(
        `班级 ${curriculum.classId} 的 ${curriculum.subjectId} 课程课时不足：` +
        `实际 ${actual} 节，目标 ${target} 节，缺少 ${target - actual} 节`
      );
    } else if (actual > target) {
      warnings.push(
        `班级 ${curriculum.classId} 的 ${curriculum.subjectId} 课程课时超出：` +
        `实际 ${actual} 节，目标 ${target} 节，超出 ${actual - target} 节`
      );
    }

    details[key] = {
      classId: curriculum.classId,
      subjectId: curriculum.subjectId,
      teacherId: curriculum.teacherId,
      actual,
      target,
      difference: actual - target,
    };
  }

  const isValid = errors.length === 0;

  logger.info('课表完整性检查完成', {
    isValid,
    errorCount: errors.length,
    warningCount: warnings.length,
  });

  return {
    isValid,
    errors,
    warnings,
    details,
  };
}

// ============================================================================
// 2. 教师工作量检查
// ============================================================================

/**
 * 检查教师工作量
 *
 * 验证每位教师的工作量是否在合理范围内。
 *
 * @param schedule - 课表
 * @param maxSessionsPerWeek - 每周最大课时数（默认30节）
 * @param minSessionsPerWeek - 每周最小课时数（默认5节）
 * @returns 检查结果
 *
 * @example
 * ```typescript
 * const result = checkTeacherWorkload(schedule, 30, 5);
 * if (!result.isValid) {
 *   console.warn('教师工作量异常:', result.warnings);
 * }
 * ```
 */
export function checkTeacherWorkload(
  schedule: Schedule,
  maxSessionsPerWeek: number = 30,
  minSessionsPerWeek: number = 5
): CheckResult {
  logger.info('开始检查教师工作量', {
    entryCount: schedule.entries.length,
    maxSessionsPerWeek,
    minSessionsPerWeek,
  });

  const errors: string[] = [];
  const warnings: string[] = [];
  const details: Record<string, any> = {};

  // 统计每位教师的课时数
  const teacherSessions = new Map<number, number>();

  for (const entry of schedule.entries) {
    teacherSessions.set(entry.teacherId, (teacherSessions.get(entry.teacherId) || 0) + 1);
  }

  // 检查每位教师的工作量
  for (const [teacherId, sessions] of teacherSessions.entries()) {
    if (sessions > maxSessionsPerWeek) {
      errors.push(
        `教师 ${teacherId} 工作量超标：` +
        `实际 ${sessions} 节/周，最大 ${maxSessionsPerWeek} 节/周，超出 ${sessions - maxSessionsPerWeek} 节`
      );
    } else if (sessions < minSessionsPerWeek) {
      warnings.push(
        `教师 ${teacherId} 工作量偏低：` +
        `实际 ${sessions} 节/周，最小 ${minSessionsPerWeek} 节/周，不足 ${minSessionsPerWeek - sessions} 节`
      );
    }

    details[`teacher-${teacherId}`] = {
      teacherId,
      sessions,
      maxSessions: maxSessionsPerWeek,
      minSessions: minSessionsPerWeek,
      isOverloaded: sessions > maxSessionsPerWeek,
      isUnderloaded: sessions < minSessionsPerWeek,
    };
  }

  const isValid = errors.length === 0;

  logger.info('教师工作量检查完成', {
    isValid,
    errorCount: errors.length,
    warningCount: warnings.length,
    teacherCount: teacherSessions.size,
  });

  return {
    isValid,
    errors,
    warnings,
    details,
  };
}

// ============================================================================
// 3. 时间冲突检查
// ============================================================================

/**
 * 检查时间冲突
 *
 * 验证是否存在教师或班级的时间冲突。
 *
 * @param schedule - 课表
 * @returns 检查结果
 *
 * @example
 * ```typescript
 * const result = checkTimeConflicts(schedule);
 * if (!result.isValid) {
 *   console.error('存在时间冲突:', result.errors);
 * }
 * ```
 */
export function checkTimeConflicts(schedule: Schedule): CheckResult {
  logger.info('开始检查时间冲突', {
    entryCount: schedule.entries.length,
  });

  const errors: string[] = [];
  const warnings: string[] = [];
  const details: Record<string, any> = {
    teacherConflicts: [],
    classConflicts: [],
  };

  // 按时间槽位分组
  const slotMap = new Map<string, ScheduleEntry[]>();

  for (const entry of schedule.entries) {
    const slotKey = `${entry.timeSlot.day}-${entry.timeSlot.period}`;
    if (!slotMap.has(slotKey)) {
      slotMap.set(slotKey, []);
    }
    slotMap.get(slotKey)!.push(entry);
  }

  // 检查每个时间槽位
  for (const [slotKey, entries] of slotMap.entries()) {
    // 检查教师冲突
    const teacherMap = new Map<number, ScheduleEntry[]>();
    for (const entry of entries) {
      if (!teacherMap.has(entry.teacherId)) {
        teacherMap.set(entry.teacherId, []);
      }
      teacherMap.get(entry.teacherId)!.push(entry);
    }

    for (const [teacherId, teacherEntries] of teacherMap.entries()) {
      if (teacherEntries.length > 1) {
        const conflict = {
          teacherId,
          slot: slotKey,
          entries: teacherEntries.map(e => ({
            classId: e.classId,
            subjectId: e.subjectId,
          })),
        };
        details.teacherConflicts.push(conflict);
        errors.push(
          `教师 ${teacherId} 在时间槽位 ${slotKey} 存在冲突：` +
          `同时在 ${teacherEntries.length} 个班级上课`
        );
      }
    }

    // 检查班级冲突
    const classMap = new Map<number, ScheduleEntry[]>();
    for (const entry of entries) {
      if (!classMap.has(entry.classId)) {
        classMap.set(entry.classId, []);
      }
      classMap.get(entry.classId)!.push(entry);
    }

    for (const [classId, classEntries] of classMap.entries()) {
      if (classEntries.length > 1) {
        const conflict = {
          classId,
          slot: slotKey,
          entries: classEntries.map(e => ({
            teacherId: e.teacherId,
            subjectId: e.subjectId,
          })),
        };
        details.classConflicts.push(conflict);
        errors.push(
          `班级 ${classId} 在时间槽位 ${slotKey} 存在冲突：` +
          `同时有 ${classEntries.length} 门课程`
        );
      }
    }
  }

  const isValid = errors.length === 0;

  logger.info('时间冲突检查完成', {
    isValid,
    errorCount: errors.length,
    teacherConflictCount: details.teacherConflicts.length,
    classConflictCount: details.classConflicts.length,
  });

  return {
    isValid,
    errors,
    warnings,
    details,
  };
}

// ============================================================================
// 4. 场地容量检查
// ============================================================================

/**
 * 检查场地容量
 *
 * 验证同一时段使用同一场地的课程数是否超过场地容量限制。
 *
 * @param schedule - 课表
 * @param subjectConfigs - 科目配置映射
 * @param venues - 场地配置映射
 * @returns 检查结果
 *
 * @example
 * ```typescript
 * const result = checkVenueCapacity(schedule, subjectConfigs, venues);
 * if (!result.isValid) {
 *   console.error('场地容量超限:', result.errors);
 * }
 * ```
 */
export function checkVenueCapacity(
  schedule: Schedule,
  subjectConfigs: Map<string, SubjectConfig>,
  venues: Map<string, Venue>
): CheckResult {
  logger.info('开始检查场地容量', {
    entryCount: schedule.entries.length,
    venueCount: venues.size,
  });

  const errors: string[] = [];
  const warnings: string[] = [];
  const details: Record<string, any> = {
    venueUsage: [],
  };

  // 按时间槽位和场地分组
  const slotVenueMap = new Map<string, Map<string, ScheduleEntry[]>>();

  for (const entry of schedule.entries) {
    const subjectConfig = subjectConfigs.get(entry.subjectId);
    if (!subjectConfig || !subjectConfig.venueId) {
      continue; // 跳过没有场地限制的课程
    }

    const slotKey = `${entry.timeSlot.day}-${entry.timeSlot.period}`;
    if (!slotVenueMap.has(slotKey)) {
      slotVenueMap.set(slotKey, new Map());
    }

    const venueMap = slotVenueMap.get(slotKey)!;
    if (!venueMap.has(subjectConfig.venueId)) {
      venueMap.set(subjectConfig.venueId, []);
    }

    venueMap.get(subjectConfig.venueId)!.push(entry);
  }

  // 检查每个时间槽位的场地使用情况
  for (const [slotKey, venueMap] of slotVenueMap.entries()) {
    for (const [venueId, entries] of venueMap.entries()) {
      const venue = venues.get(venueId);
      if (!venue) {
        warnings.push(`场地 ${venueId} 配置缺失`);
        continue;
      }

      const usage = {
        venueId,
        venueName: venue.name,
        slot: slotKey,
        capacity: venue.capacity,
        actual: entries.length,
        entries: entries.map(e => ({
          classId: e.classId,
          subjectId: e.subjectId,
          teacherId: e.teacherId,
        })),
      };

      details.venueUsage.push(usage);

      if (entries.length > venue.capacity) {
        errors.push(
          `场地 ${venue.name} 在时间槽位 ${slotKey} 容量超限：` +
          `实际使用 ${entries.length} 个班级，容量 ${venue.capacity} 个班级，超出 ${entries.length - venue.capacity} 个`
        );
      }
    }
  }

  const isValid = errors.length === 0;

  logger.info('场地容量检查完成', {
    isValid,
    errorCount: errors.length,
    warningCount: warnings.length,
    venueUsageCount: details.venueUsage.length,
  });

  return {
    isValid,
    errors,
    warnings,
    details,
  };
}

// ============================================================================
// 5. 课程分布检查
// ============================================================================

/**
 * 检查课程分布
 *
 * 验证课程是否合理分布在一周内，避免某些课程过于集中。
 *
 * @param schedule - 课表
 * @param maxConsecutiveDays - 最大连续天数（默认3天）
 * @returns 检查结果
 *
 * @example
 * ```typescript
 * const result = checkCourseDistribution(schedule, 3);
 * if (!result.isValid) {
 *   console.warn('课程分布不均:', result.warnings);
 * }
 * ```
 */
export function checkCourseDistribution(
  schedule: Schedule,
  maxConsecutiveDays: number = 3
): CheckResult {
  logger.info('开始检查课程分布', {
    entryCount: schedule.entries.length,
    maxConsecutiveDays,
  });

  const errors: string[] = [];
  const warnings: string[] = [];
  const details: Record<string, any> = {
    distributions: [],
  };

  // 按班级和科目分组
  const classSubjectMap = new Map<string, ScheduleEntry[]>();

  for (const entry of schedule.entries) {
    const key = `${entry.classId}-${entry.subjectId}`;
    if (!classSubjectMap.has(key)) {
      classSubjectMap.set(key, []);
    }
    classSubjectMap.get(key)!.push(entry);
  }

  // 检查每个班级的每门课程
  for (const [key, entries] of classSubjectMap.entries()) {
    // 按天排序
    const days = entries.map(e => e.timeSlot.day).sort((a, b) => a - b);

    // 检查连续天数
    let consecutiveDays = 1;
    let maxConsecutive = 1;

    for (let i = 1; i < days.length; i++) {
      if (days[i] === days[i - 1] + 1) {
        consecutiveDays++;
        maxConsecutive = Math.max(maxConsecutive, consecutiveDays);
      } else {
        consecutiveDays = 1;
      }
    }

    const [classId, subjectId] = key.split('-');
    const distribution = {
      classId: parseInt(classId),
      subjectId,
      totalSessions: entries.length,
      days: [...new Set(days)],
      maxConsecutiveDays: maxConsecutive,
    };

    details.distributions.push(distribution);

    if (maxConsecutive > maxConsecutiveDays) {
      warnings.push(
        `班级 ${classId} 的 ${subjectId} 课程分布过于集中：` +
        `连续 ${maxConsecutive} 天有课，建议不超过 ${maxConsecutiveDays} 天`
      );
    }

    // 检查是否所有课程都集中在前几天或后几天
    const cycleDays = schedule.metadata.cycleDays;
    const firstHalf = days.filter(d => d < cycleDays / 2).length;
    const secondHalf = days.filter(d => d >= cycleDays / 2).length;

    if (firstHalf === 0 && secondHalf > 0) {
      warnings.push(
        `班级 ${classId} 的 ${subjectId} 课程全部集中在后半周`
      );
    } else if (secondHalf === 0 && firstHalf > 0) {
      warnings.push(
        `班级 ${classId} 的 ${subjectId} 课程全部集中在前半周`
      );
    }
  }

  const isValid = errors.length === 0;

  logger.info('课程分布检查完成', {
    isValid,
    errorCount: errors.length,
    warningCount: warnings.length,
    distributionCount: details.distributions.length,
  });

  return {
    isValid,
    errors,
    warnings,
    details,
  };
}

// ============================================================================
// 6. 连堂课程检查
// ============================================================================

/**
 * 检查连堂课程
 *
 * 验证连堂课程是否符合规则（不允许连堂的课程不应连续安排）。
 *
 * @param schedule - 课表
 * @param subjectConfigs - 科目配置映射
 * @returns 检查结果
 *
 * @example
 * ```typescript
 * const result = checkDoubleSession(schedule, subjectConfigs);
 * if (!result.isValid) {
 *   console.error('连堂课程违规:', result.errors);
 * }
 * ```
 */
export function checkDoubleSession(
  schedule: Schedule,
  subjectConfigs: Map<string, SubjectConfig>
): CheckResult {
  logger.info('开始检查连堂课程', {
    entryCount: schedule.entries.length,
  });

  const errors: string[] = [];
  const warnings: string[] = [];
  const details: Record<string, any> = {
    violations: [],
  };

  // 按班级和天分组
  const classDayMap = new Map<string, ScheduleEntry[]>();

  for (const entry of schedule.entries) {
    const key = `${entry.classId}-${entry.timeSlot.day}`;
    if (!classDayMap.has(key)) {
      classDayMap.set(key, []);
    }
    classDayMap.get(key)!.push(entry);
  }

  // 检查每个班级每天的课程
  for (const [key, entries] of classDayMap.entries()) {
    // 按节次排序
    const sortedEntries = entries.sort((a, b) => a.timeSlot.period - b.timeSlot.period);

    // 检查相邻节次
    for (let i = 0; i < sortedEntries.length - 1; i++) {
      const current = sortedEntries[i];
      const next = sortedEntries[i + 1];

      // 检查是否相邻
      if (next.timeSlot.period === current.timeSlot.period + 1) {
        // 检查是否同一科目
        if (current.subjectId === next.subjectId) {
          const subjectConfig = subjectConfigs.get(current.subjectId);

          if (subjectConfig && !subjectConfig.allowDoubleSession) {
            const violation = {
              classId: current.classId,
              subjectId: current.subjectId,
              day: current.timeSlot.day,
              periods: [current.timeSlot.period, next.timeSlot.period],
            };

            details.violations.push(violation);

            errors.push(
              `班级 ${current.classId} 的 ${current.subjectId} 课程在第 ${current.timeSlot.day + 1} 天` +
              `第 ${current.timeSlot.period + 1}-${next.timeSlot.period + 1} 节连堂，但该课程不允许连堂`
            );
          }
        }
      }
    }
  }

  const isValid = errors.length === 0;

  logger.info('连堂课程检查完成', {
    isValid,
    errorCount: errors.length,
    violationCount: details.violations.length,
  });

  return {
    isValid,
    errors,
    warnings,
    details,
  };
}

// ============================================================================
// 7. 固定课程检查
// ============================================================================

/**
 * 检查固定课程
 *
 * 验证固定课程是否被正确保留在指定位置。
 *
 * @param schedule - 课表
 * @param fixedCourses - 固定课程列表
 * @returns 检查结果
 *
 * @example
 * ```typescript
 * const result = checkFixedCourses(schedule, fixedCourses);
 * if (!result.isValid) {
 *   console.error('固定课程缺失:', result.errors);
 * }
 * ```
 */
export function checkFixedCourses(
  schedule: Schedule,
  fixedCourses: FixedCourse[]
): CheckResult {
  logger.info('开始检查固定课程', {
    entryCount: schedule.entries.length,
    fixedCourseCount: fixedCourses.length,
  });

  const errors: string[] = [];
  const warnings: string[] = [];
  const details: Record<string, any> = {
    missing: [],
    misplaced: [],
  };

  // 创建课表条目索引
  const entryMap = new Map<string, ScheduleEntry>();

  for (const entry of schedule.entries) {
    const key = `${entry.classId}-${entry.timeSlot.day}-${entry.timeSlot.period}`;
    entryMap.set(key, entry);
  }

  // 检查每个固定课程
  for (const fixedCourse of fixedCourses) {
    const key = `${fixedCourse.classId}-${fixedCourse.timeSlot.day}-${fixedCourse.timeSlot.period}`;
    const entry = entryMap.get(key);

    if (!entry) {
      const missing = {
        classId: fixedCourse.classId,
        subjectId: fixedCourse.subjectId,
        teacherId: fixedCourse.teacherId,
        slot: fixedCourse.timeSlot,
      };

      details.missing.push(missing);

      errors.push(
        `固定课程缺失：班级 ${fixedCourse.classId} 的 ${fixedCourse.subjectId} 课程` +
        `应在第 ${fixedCourse.timeSlot.day + 1} 天第 ${fixedCourse.timeSlot.period + 1} 节，但未找到`
      );
    } else if (
      entry.subjectId !== fixedCourse.subjectId ||
      entry.teacherId !== fixedCourse.teacherId
    ) {
      const misplaced = {
        classId: fixedCourse.classId,
        slot: fixedCourse.timeSlot,
        expected: {
          subjectId: fixedCourse.subjectId,
          teacherId: fixedCourse.teacherId,
        },
        actual: {
          subjectId: entry.subjectId,
          teacherId: entry.teacherId,
        },
      };

      details.misplaced.push(misplaced);

      errors.push(
        `固定课程错位：班级 ${fixedCourse.classId} 在第 ${fixedCourse.timeSlot.day + 1} 天` +
        `第 ${fixedCourse.timeSlot.period + 1} 节应为 ${fixedCourse.subjectId}（教师 ${fixedCourse.teacherId}），` +
        `实际为 ${entry.subjectId}（教师 ${entry.teacherId}）`
      );
    }
  }

  const isValid = errors.length === 0;

  logger.info('固定课程检查完成', {
    isValid,
    errorCount: errors.length,
    missingCount: details.missing.length,
    misplacedCount: details.misplaced.length,
  });

  return {
    isValid,
    errors,
    warnings,
    details,
  };
}

// ============================================================================
// 综合检查函数
// ============================================================================

/**
 * 执行所有业务规则检查
 *
 * 综合执行所有业务规则检查，返回汇总结果。
 *
 * @param schedule - 课表
 * @param curriculums - 教学计划列表
 * @param subjectConfigs - 科目配置映射
 * @param venues - 场地配置映射
 * @param fixedCourses - 固定课程列表
 * @param options - 检查选项
 * @returns 综合检查结果
 *
 * @example
 * ```typescript
 * const result = checkAllBusinessRules(
 *   schedule,
 *   curriculums,
 *   subjectConfigs,
 *   venues,
 *   fixedCourses
 * );
 *
 * if (!result.isValid) {
 *   console.error('业务规则检查失败:', result.errors);
 * }
 * ```
 */
export function checkAllBusinessRules(
  schedule: Schedule,
  curriculums: ClassCurriculum[],
  subjectConfigs: Map<string, SubjectConfig>,
  venues: Map<string, Venue>,
  fixedCourses: FixedCourse[],
  options: {
    maxSessionsPerWeek?: number;
    minSessionsPerWeek?: number;
    maxConsecutiveDays?: number;
  } = {}
): CheckResult {
  logger.info('开始执行所有业务规则检查');

  const allErrors: string[] = [];
  const allWarnings: string[] = [];
  const allDetails: Record<string, any> = {};

  // 1. 课表完整性检查
  const completenessResult = checkScheduleCompleteness(schedule, curriculums);
  allErrors.push(...completenessResult.errors);
  allWarnings.push(...completenessResult.warnings);
  allDetails.completeness = completenessResult.details;

  // 2. 教师工作量检查
  const workloadResult = checkTeacherWorkload(
    schedule,
    options.maxSessionsPerWeek,
    options.minSessionsPerWeek
  );
  allErrors.push(...workloadResult.errors);
  allWarnings.push(...workloadResult.warnings);
  allDetails.workload = workloadResult.details;

  // 3. 时间冲突检查
  const conflictResult = checkTimeConflicts(schedule);
  allErrors.push(...conflictResult.errors);
  allWarnings.push(...conflictResult.warnings);
  allDetails.conflicts = conflictResult.details;

  // 4. 场地容量检查
  const venueResult = checkVenueCapacity(schedule, subjectConfigs, venues);
  allErrors.push(...venueResult.errors);
  allWarnings.push(...venueResult.warnings);
  allDetails.venue = venueResult.details;

  // 5. 课程分布检查
  const distributionResult = checkCourseDistribution(schedule, options.maxConsecutiveDays);
  allErrors.push(...distributionResult.errors);
  allWarnings.push(...distributionResult.warnings);
  allDetails.distribution = distributionResult.details;

  // 6. 连堂课程检查
  const doubleSessionResult = checkDoubleSession(schedule, subjectConfigs);
  allErrors.push(...doubleSessionResult.errors);
  allWarnings.push(...doubleSessionResult.warnings);
  allDetails.doubleSession = doubleSessionResult.details;

  // 7. 固定课程检查
  const fixedCourseResult = checkFixedCourses(schedule, fixedCourses);
  allErrors.push(...fixedCourseResult.errors);
  allWarnings.push(...fixedCourseResult.warnings);
  allDetails.fixedCourse = fixedCourseResult.details;

  const isValid = allErrors.length === 0;

  logger.info('所有业务规则检查完成', {
    isValid,
    totalErrors: allErrors.length,
    totalWarnings: allWarnings.length,
  });

  return {
    isValid,
    errors: allErrors,
    warnings: allWarnings,
    details: allDetails,
  };
}

// ============================================================================
// 导出所有检查函数
// ============================================================================

export default {
  checkScheduleCompleteness,
  checkTeacherWorkload,
  checkTimeConflicts,
  checkVenueCapacity,
  checkCourseDistribution,
  checkDoubleSession,
  checkFixedCourses,
  checkAllBusinessRules,
};
