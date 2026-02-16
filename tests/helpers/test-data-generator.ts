/**
 * 测试数据生成器
 *
 * 提供生成各种测试数据的工具函数
 *
 * 功能特性：
 * - 生成教师测试数据
 * - 生成班级测试数据
 * - 生成科目测试数据
 * - 生成教学计划测试数据
 * - 生成课表测试数据
 * - 支持自定义数据量
 * - 确保数据一致性和有效性
 */

/**
 * 教师数据接口
 */
export interface TestTeacher {
  id: number;
  name: string;
  subject: string;
  teachingGroup?: string;
  maxHoursPerDay?: number;
  maxHoursPerWeek?: number;
}

/**
 * 班级数据接口
 */
export interface TestClass {
  id: number;
  name: string;
  grade: number;
  studentCount: number;
}

/**
 * 科目数据接口
 */
export interface TestSubject {
  id: number;
  name: string;
  category: 'main' | 'minor' | 'elective';
  hoursPerWeek: number;
  forbiddenSlots?: number;
}

/**
 * 教学计划数据接口
 */
export interface TestCurriculum {
  id: number;
  classId: number;
  subjectId: number;
  teacherId: number;
  hoursPerWeek: number;
}

/**
 * 课表条目数据接口
 */
export interface TestScheduleEntry {
  id: number;
  classId: number;
  subjectId: number;
  teacherId: number;
  dayOfWeek: number;
  period: number;
  venueId?: number;
}

/**
 * 测试数据生成器类
 */
export class TestDataGenerator {
  private teacherIdCounter = 1;
  private classIdCounter = 1;
  private subjectIdCounter = 1;
  private curriculumIdCounter = 1;
  private scheduleEntryIdCounter = 1;

  /**
   * 生成教师测试数据
   *
   * @param count 生成数量
   * @param options 自定义选项
   * @returns 教师数据数组
   */
  generateTeachers(
    count: number,
    options: Partial<TestTeacher> = {},
  ): TestTeacher[] {
    const teachers: TestTeacher[] = [];
    const subjects = ['语文', '数学', '英语', '物理', '化学', '生物', '政治', '历史', '地理', '体育', '音乐', '美术'];

    for (let i = 0; i < count; i++) {
      const id = this.teacherIdCounter++;
      const subject = options.subject || subjects[i % subjects.length];

      teachers.push({
        id,
        name: options.name || `教师${id}`,
        subject,
        teachingGroup: options.teachingGroup,
        maxHoursPerDay: options.maxHoursPerDay || 6,
        maxHoursPerWeek: options.maxHoursPerWeek || 20,
      });
    }

    return teachers;
  }

  /**
   * 生成班级测试数据
   *
   * @param count 生成数量
   * @param options 自定义选项
   * @returns 班级数据数组
   */
  generateClasses(
    count: number,
    options: Partial<TestClass> = {},
  ): TestClass[] {
    const classes: TestClass[] = [];

    for (let i = 0; i < count; i++) {
      const id = this.classIdCounter++;
      const grade = options.grade || Math.floor(i / 10) + 1; // 每10个班级一个年级

      classes.push({
        id,
        name: options.name || `${grade}年级${(i % 10) + 1}班`,
        grade,
        studentCount: options.studentCount || 40,
      });
    }

    return classes;
  }

  /**
   * 生成科目测试数据
   *
   * @returns 科目数据数组
   */
  generateSubjects(): TestSubject[] {
    const subjects: TestSubject[] = [
      // 主科
      { id: this.subjectIdCounter++, name: '语文', category: 'main', hoursPerWeek: 5 },
      { id: this.subjectIdCounter++, name: '数学', category: 'main', hoursPerWeek: 5 },
      { id: this.subjectIdCounter++, name: '英语', category: 'main', hoursPerWeek: 5 },

      // 理科
      { id: this.subjectIdCounter++, name: '物理', category: 'minor', hoursPerWeek: 3 },
      { id: this.subjectIdCounter++, name: '化学', category: 'minor', hoursPerWeek: 3 },
      { id: this.subjectIdCounter++, name: '生物', category: 'minor', hoursPerWeek: 3 },

      // 文科
      { id: this.subjectIdCounter++, name: '政治', category: 'minor', hoursPerWeek: 3 },
      { id: this.subjectIdCounter++, name: '历史', category: 'minor', hoursPerWeek: 3 },
      { id: this.subjectIdCounter++, name: '地理', category: 'minor', hoursPerWeek: 3 },

      // 副科
      { id: this.subjectIdCounter++, name: '体育', category: 'elective', hoursPerWeek: 2, forbiddenSlots: 0b111 }, // 禁止第1-3节
      { id: this.subjectIdCounter++, name: '音乐', category: 'elective', hoursPerWeek: 1 },
      { id: this.subjectIdCounter++, name: '美术', category: 'elective', hoursPerWeek: 1 },
    ];

    return subjects;
  }

  /**
   * 生成教学计划测试数据
   *
   * @param classes 班级数据
   * @param subjects 科目数据
   * @param teachers 教师数据
   * @returns 教学计划数据数组
   */
  generateCurriculums(
    classes: TestClass[],
    subjects: TestSubject[],
    teachers: TestTeacher[],
  ): TestCurriculum[] {
    const curriculums: TestCurriculum[] = [];

    // 为每个班级分配所有科目
    for (const cls of classes) {
      for (const subject of subjects) {
        // 找到教授该科目的教师
        const teacher = teachers.find(t => t.subject === subject.name);

        if (teacher) {
          curriculums.push({
            id: this.curriculumIdCounter++,
            classId: cls.id,
            subjectId: subject.id,
            teacherId: teacher.id,
            hoursPerWeek: subject.hoursPerWeek,
          });
        }
      }
    }

    return curriculums;
  }

  /**
   * 生成简单的课表测试数据
   *
   * 注意：这只是生成一个简单的示例课表，不保证满足所有约束
   *
   * @param curriculums 教学计划数据
   * @param daysPerWeek 每周天数
   * @param periodsPerDay 每天节次数
   * @returns 课表条目数据数组
   */
  generateSimpleSchedule(
    curriculums: TestCurriculum[],
    daysPerWeek: number = 5,
    periodsPerDay: number = 8,
  ): TestScheduleEntry[] {
    const scheduleEntries: TestScheduleEntry[] = [];

    // 按班级分组
    const curriculumsByClass = new Map<number, TestCurriculum[]>();
    for (const curriculum of curriculums) {
      if (!curriculumsByClass.has(curriculum.classId)) {
        curriculumsByClass.set(curriculum.classId, []);
      }
      curriculumsByClass.get(curriculum.classId)!.push(curriculum);
    }

    // 为每个班级生成课表
    for (const [classId, classCurriculums] of curriculumsByClass) {
      let slotIndex = 0;

      // 为每个科目分配时间槽
      for (const curriculum of classCurriculums) {
        for (let i = 0; i < curriculum.hoursPerWeek; i++) {
          if (slotIndex >= daysPerWeek * periodsPerDay) {
            break; // 时间槽用完了
          }

          const dayOfWeek = Math.floor(slotIndex / periodsPerDay);
          const period = slotIndex % periodsPerDay;

          scheduleEntries.push({
            id: this.scheduleEntryIdCounter++,
            classId,
            subjectId: curriculum.subjectId,
            teacherId: curriculum.teacherId,
            dayOfWeek,
            period,
          });

          slotIndex++;
        }
      }
    }

    return scheduleEntries;
  }

  /**
   * 重置所有计数器
   *
   * 用于在测试之间重置状态
   */
  reset(): void {
    this.teacherIdCounter = 1;
    this.classIdCounter = 1;
    this.subjectIdCounter = 1;
    this.curriculumIdCounter = 1;
    this.scheduleEntryIdCounter = 1;
  }
}

/**
 * 创建测试数据生成器的工厂函数
 *
 * @returns 测试数据生成器实例
 */
export function createTestDataGenerator(): TestDataGenerator {
  return new TestDataGenerator();
}

/**
 * 生成完整的测试数据集
 *
 * @param options 配置选项
 * @returns 完整的测试数据集
 */
export function generateCompleteTestData(options: {
  teacherCount?: number;
  classCount?: number;
  daysPerWeek?: number;
  periodsPerDay?: number;
} = {}) {
  const {
    teacherCount = 30,
    classCount = 10,
    daysPerWeek = 5,
    periodsPerDay = 8,
  } = options;

  const generator = createTestDataGenerator();

  // 生成基础数据
  const subjects = generator.generateSubjects();
  const teachers = generator.generateTeachers(teacherCount);
  const classes = generator.generateClasses(classCount);

  // 生成教学计划
  const curriculums = generator.generateCurriculums(classes, subjects, teachers);

  // 生成简单课表
  const scheduleEntries = generator.generateSimpleSchedule(
    curriculums,
    daysPerWeek,
    periodsPerDay,
  );

  return {
    subjects,
    teachers,
    classes,
    curriculums,
    scheduleEntries,
    config: {
      daysPerWeek,
      periodsPerDay,
    },
  };
}
