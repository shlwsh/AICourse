/**
 * 业务规则检查工具模块单元测试
 *
 * 测试内容：
 * - 课表完整性检查
 * - 教师工作量检查
 * - 时间冲突检查
 * - 场地容量检查
 * - 课程分布检查
 * - 连堂课程检查
 * - 固定课程检查
 * - 综合检查函数
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  checkScheduleCompleteness,
  checkTeacherWorkload,
  checkTimeConflicts,
  checkVenueCapacity,
  checkCourseDistribution,
  checkDoubleSession,
  checkFixedCourses,
  checkAllBusinessRules,
  type Schedule,
  type ScheduleEntry,
  type ClassCurriculum,
  type SubjectConfig,
  type Venue,
  type FixedCourse,
} from './business-rules';

// ============================================================================
// 测试数据准备
// ============================================================================

/**
 * 创建测试课表
 */
function createTestSchedule(entries: ScheduleEntry[]): Schedule {
  return {
    entries,
    cost: 0,
    metadata: {
      cycleDays: 5,
      periodsPerDay: 8,
      generatedAt: '2024-01-15T10:00:00Z',
      version: 1,
    },
  };
}

/**
 * 创建测试课表条目
 */
function createEntry(
  classId: number,
  subjectId: string,
  teacherId: number,
  day: number,
  period: number,
  isFixed: boolean = false
): ScheduleEntry {
  return {
    classId,
    subjectId,
    teacherId,
    timeSlot: { day, period },
    isFixed,
    weekType: 'Every',
  };
}

// ============================================================================
// 1. 课表完整性检查测试
// ============================================================================

describe('checkScheduleCompleteness', () => {
  it('应该通过完整的课表检查', () => {
    const schedule = createTestSchedule([
      createEntry(101, '数学', 1001, 0, 0),
      createEntry(101, '数学', 1001, 0, 1),
      createEntry(101, '数学', 1001, 1, 0),
      createEntry(101, '语文', 1002, 0, 2),
      createEntry(101, '语文', 1002, 1, 1),
    ]);

    const curriculums: ClassCurriculum[] = [
      {
        id: 1,
        classId: 101,
        subjectId: '数学',
        teacherId: 1001,
        targetSessions: 3,
        isCombinedClass: false,
        combinedClassIds: [],
        weekType: 'Every',
      },
      {
        id: 2,
        classId: 101,
        subjectId: '语文',
        teacherId: 1002,
        targetSessions: 2,
        isCombinedClass: false,
        combinedClassIds: [],
        weekType: 'Every',
      },
    ];

    const result = checkScheduleCompleteness(schedule, curriculums);

    expect(result.isValid).toBe(true);
    expect(result.errors).toHaveLength(0);
    expect(result.warnings).toHaveLength(0);
  });

  it('应该检测到课时不足', () => {
    const schedule = createTestSchedule([
      createEntry(101, '数学', 1001, 0, 0),
      createEntry(101, '数学', 1001, 0, 1),
    ]);

    const curriculums: ClassCurriculum[] = [
      {
        id: 1,
        classId: 101,
        subjectId: '数学',
        teacherId: 1001,
        targetSessions: 5,
        isCombinedClass: false,
        combinedClassIds: [],
        weekType: 'Every',
      },
    ];

    const result = checkScheduleCompleteness(schedule, curriculums);

    expect(result.isValid).toBe(false);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0]).toContain('课时不足');
    expect(result.errors[0]).toContain('实际 2 节');
    expect(result.errors[0]).toContain('目标 5 节');
  });

  it('应该警告课时超出', () => {
    const schedule = createTestSchedule([
      createEntry(101, '数学', 1001, 0, 0),
      createEntry(101, '数学', 1001, 0, 1),
      createEntry(101, '数学', 1001, 1, 0),
      createEntry(101, '数学', 1001, 1, 1),
      createEntry(101, '数学', 1001, 2, 0),
    ]);

    const curriculums: ClassCurriculum[] = [
      {
        id: 1,
        classId: 101,
        subjectId: '数学',
        teacherId: 1001,
        targetSessions: 3,
        isCombinedClass: false,
        combinedClassIds: [],
        weekType: 'Every',
      },
    ];

    const result = checkScheduleCompleteness(schedule, curriculums);

    expect(result.isValid).toBe(true);
    expect(result.warnings).toHaveLength(1);
    expect(result.warnings[0]).toContain('课时超出');
    expect(result.warnings[0]).toContain('实际 5 节');
    expect(result.warnings[0]).toContain('目标 3 节');
  });
});

// ============================================================================
// 2. 教师工作量检查测试
// ============================================================================

describe('checkTeacherWorkload', () => {
  it('应该通过合理的工作量检查', () => {
    const schedule = createTestSchedule([
      createEntry(101, '数学', 1001, 0, 0),
      createEntry(101, '数学', 1001, 0, 1),
      createEntry(102, '数学', 1001, 1, 0),
      createEntry(102, '数学', 1001, 1, 1),
      createEntry(103, '数学', 1001, 2, 0),
      createEntry(103, '数学', 1001, 2, 1),
      createEntry(104, '数学', 1001, 3, 0),
      createEntry(104, '数学', 1001, 3, 1),
      createEntry(105, '数学', 1001, 4, 0),
      createEntry(105, '数学', 1001, 4, 1),
    ]);

    const result = checkTeacherWorkload(schedule, 30, 5);

    expect(result.isValid).toBe(true);
    expect(result.errors).toHaveLength(0);
    expect(result.warnings).toHaveLength(0);
  });

  it('应该检测到工作量超标', () => {
    const entries: ScheduleEntry[] = [];
    for (let i = 0; i < 35; i++) {
      entries.push(createEntry(101 + i, '数学', 1001, i % 5, i % 8));
    }

    const schedule = createTestSchedule(entries);
    const result = checkTeacherWorkload(schedule, 30, 5);

    expect(result.isValid).toBe(false);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0]).toContain('工作量超标');
    expect(result.errors[0]).toContain('教师 1001');
  });

  it('应该警告工作量偏低', () => {
    const schedule = createTestSchedule([
      createEntry(101, '数学', 1001, 0, 0),
      createEntry(101, '数学', 1001, 0, 1),
    ]);

    const result = checkTeacherWorkload(schedule, 30, 5);

    expect(result.isValid).toBe(true);
    expect(result.warnings).toHaveLength(1);
    expect(result.warnings[0]).toContain('工作量偏低');
    expect(result.warnings[0]).toContain('教师 1001');
  });
});

// ============================================================================
// 3. 时间冲突检查测试
// ============================================================================

describe('checkTimeConflicts', () => {
  it('应该通过无冲突的课表检查', () => {
    const schedule = createTestSchedule([
      createEntry(101, '数学', 1001, 0, 0),
      createEntry(102, '数学', 1001, 0, 1),
      createEntry(101, '语文', 1002, 0, 1),
      createEntry(102, '语文', 1002, 0, 2),
    ]);

    const result = checkTimeConflicts(schedule);

    expect(result.isValid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('应该检测到教师时间冲突', () => {
    const schedule = createTestSchedule([
      createEntry(101, '数学', 1001, 0, 0),
      createEntry(102, '数学', 1001, 0, 0), // 同一教师同一时间在两个班级
    ]);

    const result = checkTimeConflicts(schedule);

    expect(result.isValid).toBe(false);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0]).toContain('教师 1001');
    expect(result.errors[0]).toContain('存在冲突');
  });

  it('应该检测到班级时间冲突', () => {
    const schedule = createTestSchedule([
      createEntry(101, '数学', 1001, 0, 0),
      createEntry(101, '语文', 1002, 0, 0), // 同一班级同一时间有两门课
    ]);

    const result = checkTimeConflicts(schedule);

    expect(result.isValid).toBe(false);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0]).toContain('班级 101');
    expect(result.errors[0]).toContain('存在冲突');
  });
});

// ============================================================================
// 4. 场地容量检查测试
// ============================================================================

describe('checkVenueCapacity', () => {
  it('应该通过场地容量检查', () => {
    const schedule = createTestSchedule([
      createEntry(101, '体育', 1001, 0, 0),
      createEntry(102, '体育', 1001, 0, 1),
    ]);

    const subjectConfigs = new Map<string, SubjectConfig>([
      [
        '体育',
        {
          id: '体育',
          name: '体育',
          forbiddenSlots: '0',
          allowDoubleSession: true,
          venueId: 'playground',
          isMajorSubject: false,
        },
      ],
    ]);

    const venues = new Map<string, Venue>([
      [
        'playground',
        {
          id: 'playground',
          name: '操场',
          capacity: 3,
        },
      ],
    ]);

    const result = checkVenueCapacity(schedule, subjectConfigs, venues);

    expect(result.isValid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('应该检测到场地容量超限', () => {
    const schedule = createTestSchedule([
      createEntry(101, '体育', 1001, 0, 0),
      createEntry(102, '体育', 1002, 0, 0),
      createEntry(103, '体育', 1003, 0, 0),
    ]);

    const subjectConfigs = new Map<string, SubjectConfig>([
      [
        '体育',
        {
          id: '体育',
          name: '体育',
          forbiddenSlots: '0',
          allowDoubleSession: true,
          venueId: 'playground',
          isMajorSubject: false,
        },
      ],
    ]);

    const venues = new Map<string, Venue>([
      [
        'playground',
        {
          id: 'playground',
          name: '操场',
          capacity: 2,
        },
      ],
    ]);

    const result = checkVenueCapacity(schedule, subjectConfigs, venues);

    expect(result.isValid).toBe(false);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0]).toContain('操场');
    expect(result.errors[0]).toContain('容量超限');
  });
});

// ============================================================================
// 5. 课程分布检查测试
// ============================================================================

describe('checkCourseDistribution', () => {
  it('应该通过合理的课程分布检查', () => {
    const schedule = createTestSchedule([
      createEntry(101, '数学', 1001, 0, 0),
      createEntry(101, '数学', 1001, 2, 0),
      createEntry(101, '数学', 1001, 4, 0),
    ]);

    const result = checkCourseDistribution(schedule, 3);

    expect(result.isValid).toBe(true);
    expect(result.warnings).toHaveLength(0);
  });

  it('应该警告课程分布过于集中', () => {
    const schedule = createTestSchedule([
      createEntry(101, '数学', 1001, 0, 0),
      createEntry(101, '数学', 1001, 1, 0),
      createEntry(101, '数学', 1001, 2, 0),
      createEntry(101, '数学', 1001, 3, 0),
    ]);

    const result = checkCourseDistribution(schedule, 3);

    expect(result.isValid).toBe(true);
    expect(result.warnings.length).toBeGreaterThan(0);
    expect(result.warnings[0]).toContain('分布过于集中');
  });

  it('应该警告课程全部集中在前半周', () => {
    const schedule = createTestSchedule([
      createEntry(101, '数学', 1001, 0, 0),
      createEntry(101, '数学', 1001, 1, 0),
      createEntry(101, '数学', 1001, 2, 0),
    ]);

    const result = checkCourseDistribution(schedule, 3);

    expect(result.isValid).toBe(true);
    expect(result.warnings.some(w => w.includes('前半周'))).toBe(true);
  });

  it('应该警告课程全部集中在后半周', () => {
    const schedule = createTestSchedule([
      createEntry(101, '数学', 1001, 3, 0),
      createEntry(101, '数学', 1001, 4, 0),
    ]);

    const result = checkCourseDistribution(schedule, 3);

    expect(result.isValid).toBe(true);
    expect(result.warnings.some(w => w.includes('后半周'))).toBe(true);
  });
});

// ============================================================================
// 6. 连堂课程检查测试
// ============================================================================

describe('checkDoubleSession', () => {
  it('应该通过允许连堂的课程检查', () => {
    const schedule = createTestSchedule([
      createEntry(101, '数学', 1001, 0, 0),
      createEntry(101, '数学', 1001, 0, 1),
    ]);

    const subjectConfigs = new Map<string, SubjectConfig>([
      [
        '数学',
        {
          id: '数学',
          name: '数学',
          forbiddenSlots: '0',
          allowDoubleSession: true,
          isMajorSubject: true,
        },
      ],
    ]);

    const result = checkDoubleSession(schedule, subjectConfigs);

    expect(result.isValid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('应该检测到不允许连堂的课程违规', () => {
    const schedule = createTestSchedule([
      createEntry(101, '体育', 1001, 0, 0),
      createEntry(101, '体育', 1001, 0, 1),
    ]);

    const subjectConfigs = new Map<string, SubjectConfig>([
      [
        '体育',
        {
          id: '体育',
          name: '体育',
          forbiddenSlots: '0',
          allowDoubleSession: false,
          isMajorSubject: false,
        },
      ],
    ]);

    const result = checkDoubleSession(schedule, subjectConfigs);

    expect(result.isValid).toBe(false);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0]).toContain('体育');
    expect(result.errors[0]).toContain('连堂');
    expect(result.errors[0]).toContain('不允许');
  });

  it('应该允许不同科目相邻', () => {
    const schedule = createTestSchedule([
      createEntry(101, '数学', 1001, 0, 0),
      createEntry(101, '语文', 1002, 0, 1),
    ]);

    const subjectConfigs = new Map<string, SubjectConfig>([
      [
        '数学',
        {
          id: '数学',
          name: '数学',
          forbiddenSlots: '0',
          allowDoubleSession: false,
          isMajorSubject: true,
        },
      ],
      [
        '语文',
        {
          id: '语文',
          name: '语文',
          forbiddenSlots: '0',
          allowDoubleSession: false,
          isMajorSubject: true,
        },
      ],
    ]);

    const result = checkDoubleSession(schedule, subjectConfigs);

    expect(result.isValid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });
});

// ============================================================================
// 7. 固定课程检查测试
// ============================================================================

describe('checkFixedCourses', () => {
  it('应该通过固定课程检查', () => {
    const schedule = createTestSchedule([
      createEntry(101, '班会', 1001, 0, 0, true),
      createEntry(101, '数学', 1002, 0, 1),
    ]);

    const fixedCourses: FixedCourse[] = [
      {
        classId: 101,
        subjectId: '班会',
        teacherId: 1001,
        timeSlot: { day: 0, period: 0 },
        isPreArranged: false,
      },
    ];

    const result = checkFixedCourses(schedule, fixedCourses);

    expect(result.isValid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('应该检测到固定课程缺失', () => {
    const schedule = createTestSchedule([
      createEntry(101, '数学', 1002, 0, 1),
    ]);

    const fixedCourses: FixedCourse[] = [
      {
        classId: 101,
        subjectId: '班会',
        teacherId: 1001,
        timeSlot: { day: 0, period: 0 },
        isPreArranged: false,
      },
    ];

    const result = checkFixedCourses(schedule, fixedCourses);

    expect(result.isValid).toBe(false);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0]).toContain('固定课程缺失');
    expect(result.errors[0]).toContain('班会');
  });

  it('应该检测到固定课程错位', () => {
    const schedule = createTestSchedule([
      createEntry(101, '数学', 1002, 0, 0), // 应该是班会，但实际是数学
    ]);

    const fixedCourses: FixedCourse[] = [
      {
        classId: 101,
        subjectId: '班会',
        teacherId: 1001,
        timeSlot: { day: 0, period: 0 },
        isPreArranged: false,
      },
    ];

    const result = checkFixedCourses(schedule, fixedCourses);

    expect(result.isValid).toBe(false);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0]).toContain('固定课程错位');
    expect(result.errors[0]).toContain('班会');
    expect(result.errors[0]).toContain('数学');
  });
});

// ============================================================================
// 8. 综合检查函数测试
// ============================================================================

describe('checkAllBusinessRules', () => {
  it('应该通过所有业务规则检查', () => {
    const schedule = createTestSchedule([
      createEntry(101, '数学', 1001, 0, 0),
      createEntry(101, '数学', 1001, 1, 0),
      createEntry(101, '数学', 1001, 2, 0),
      createEntry(101, '语文', 1002, 0, 1),
      createEntry(101, '语文', 1002, 1, 1),
    ]);

    const curriculums: ClassCurriculum[] = [
      {
        id: 1,
        classId: 101,
        subjectId: '数学',
        teacherId: 1001,
        targetSessions: 3,
        isCombinedClass: false,
        combinedClassIds: [],
        weekType: 'Every',
      },
      {
        id: 2,
        classId: 101,
        subjectId: '语文',
        teacherId: 1002,
        targetSessions: 2,
        isCombinedClass: false,
        combinedClassIds: [],
        weekType: 'Every',
      },
    ];

    const subjectConfigs = new Map<string, SubjectConfig>([
      [
        '数学',
        {
          id: '数学',
          name: '数学',
          forbiddenSlots: '0',
          allowDoubleSession: true,
          isMajorSubject: true,
        },
      ],
      [
        '语文',
        {
          id: '语文',
          name: '语文',
          forbiddenSlots: '0',
          allowDoubleSession: true,
          isMajorSubject: true,
        },
      ],
    ]);

    const venues = new Map<string, Venue>();
    const fixedCourses: FixedCourse[] = [];

    const result = checkAllBusinessRules(
      schedule,
      curriculums,
      subjectConfigs,
      venues,
      fixedCourses
    );

    expect(result.isValid).toBe(true);
    expect(result.errors).toHaveLength(0);
    expect(result.details).toHaveProperty('completeness');
    expect(result.details).toHaveProperty('workload');
    expect(result.details).toHaveProperty('conflicts');
    expect(result.details).toHaveProperty('venue');
    expect(result.details).toHaveProperty('distribution');
    expect(result.details).toHaveProperty('doubleSession');
    expect(result.details).toHaveProperty('fixedCourse');
  });

  it('应该汇总所有错误和警告', () => {
    const schedule = createTestSchedule([
      createEntry(101, '数学', 1001, 0, 0),
      createEntry(102, '数学', 1001, 0, 0), // 教师冲突
    ]);

    const curriculums: ClassCurriculum[] = [
      {
        id: 1,
        classId: 101,
        subjectId: '数学',
        teacherId: 1001,
        targetSessions: 5, // 课时不足
        isCombinedClass: false,
        combinedClassIds: [],
        weekType: 'Every',
      },
    ];

    const subjectConfigs = new Map<string, SubjectConfig>();
    const venues = new Map<string, Venue>();
    const fixedCourses: FixedCourse[] = [];

    const result = checkAllBusinessRules(
      schedule,
      curriculums,
      subjectConfigs,
      venues,
      fixedCourses
    );

    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
    expect(result.errors.some(e => e.includes('课时不足'))).toBe(true);
    expect(result.errors.some(e => e.includes('冲突'))).toBe(true);
  });
});
