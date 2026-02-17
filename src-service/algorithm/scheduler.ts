/**
 * TypeScript 排课算法实现
 *
 * 使用回溯搜索算法生成满足约束的课表
 */

import { logger } from '../utils/logger';
import { createDatabaseLogger, DatabaseLogger } from '../db/database-logger';
import { getDatabase } from '../db/database';

// ============================================================================
// 类型定义
// ============================================================================

export interface TimeSlot {
  day: number;
  period: number;
}

export interface ScheduleEntry {
  classId: number;
  subjectId: string;
  teacherId: number;
  timeSlot: TimeSlot;
  isFixed: boolean;
  weekType: 'Every' | 'Odd' | 'Even';
}

export interface Schedule {
  entries: ScheduleEntry[];
  cost: number;
  metadata: {
    cycleDays: number;
    periodsPerDay: number;
    generatedAt: string;
    version: number;
  };
}

interface Curriculum {
  id: number;
  classId: number;
  subjectId: string;
  teacherId: number;
  hoursPerWeek: number;
}

interface SubjectConfig {
  id: string;
  name: string;
  forbiddenSlots: string;
  allowDoubleSession: boolean;
  isMajorSubject: boolean;
  venueId?: string;
}

interface TeacherPreference {
  teacherId: number;
  preferredSlots?: string; // 偏好时间槽位掩码
  timeBias?: number; // 0=无偏好、1=厌恶早课、2=厌恶晚课
  weight?: number; // 权重系数
  maxHoursPerDay?: number;
  maxConsecutiveHours?: number;
  unavailableSlots?: string;
}

interface VenueConfig {
  id: string;
  name: string;
  capacity: number; // 同时容纳的班级数
}

interface FixedCourse {
  classId: number;
  subjectId: string;
  teacherId: number;
  day: number;
  period: number;
  weekType: 'Every' | 'Odd' | 'Even';
}

// ============================================================================
// 排课器类
// ============================================================================

export class Scheduler {
  private cycleDays: number = 5;
  private periodsPerDay: number = 8;
  private entries: ScheduleEntry[] = [];
  private teacherSchedule: Map<number, Set<string>> = new Map();
  private classSchedule: Map<number, Set<string>> = new Map();
  private venueSchedule: Map<string, Map<string, number>> = new Map(); // venue -> slot -> count
  private curriculums: Curriculum[] = [];
  private subjectConfigs: Map<string, SubjectConfig> = new Map();
  private teacherPrefs: Map<number, TeacherPreference> = new Map();
  private venueConfigs: Map<string, VenueConfig> = new Map();
  private fixedCourses: FixedCourse[] = [];
  private dbLogger?: DatabaseLogger;
  private requestId?: string;

  // 特殊科目列表（体育、音乐、美术）
  private readonly SPECIAL_SUBJECTS = ['体育', '音乐', '美术', 'PE', 'Music', 'Art'];

  /**
   * 设置请求 ID（用于日志追踪）
   */
  setRequestId(requestId: string): void {
    this.requestId = requestId;
    this.dbLogger = createDatabaseLogger(getDatabase(), requestId);
  }

  /**
   * 生成课表
   */
  async generate(): Promise<Schedule> {
    logger.info('[Scheduler] 开始生成课表', { requestId: this.requestId });
    const startTime = Date.now();

    try {
      // 1. 加载配置和数据
      await this.loadData();

      // 2. 初始化数据结构
      this.initializeSchedule();

      // 3. 执行排课算法
      const success = await this.scheduleAllCourses();

      if (!success) {
        throw new Error('无法生成满足所有约束的课表');
      }

      // 4. 计算代价值
      const cost = this.calculateCost();

      const duration = Date.now() - startTime;
      logger.info('[Scheduler] 课表生成成功', {
        requestId: this.requestId,
        entryCount: this.entries.length,
        cost,
        duration: `${duration}ms`,
      });

      return {
        entries: this.entries,
        cost,
        metadata: {
          cycleDays: this.cycleDays,
          periodsPerDay: this.periodsPerDay,
          generatedAt: new Date().toISOString(),
          version: 1,
        },
      };
    } catch (error) {
      const duration = Date.now() - startTime;
      logger.error('[Scheduler] 课表生成失败', {
        requestId: this.requestId,
        error: error instanceof Error ? error.message : String(error),
        duration: `${duration}ms`,
      });
      throw error;
    }
  }

  /**
   * 加载数据
   */
  private async loadData(): Promise<void> {
    logger.info('[Scheduler] 加载数据', { requestId: this.requestId });
    const db = this.dbLogger || getDatabase();

    // 加载教学计划
    const curriculums = db.query(`
      SELECT id, class_id, subject_id, teacher_id, target_sessions
      FROM class_curriculums
    `).all() as any[];

    this.curriculums = curriculums.map(c => ({
      id: c.id,
      classId: c.class_id,
      subjectId: c.subject_id,
      teacherId: c.teacher_id,
      hoursPerWeek: c.target_sessions,
    }));

    logger.info('[Scheduler] 加载教学计划', { requestId: this.requestId, count: this.curriculums.length });

    // 加载科目配置
    const subjects = db.query(`
      SELECT id, name, forbidden_slots, allow_double_session, is_major_subject, venue_id
      FROM subject_configs
    `).all() as any[];

    subjects.forEach(s => {
      this.subjectConfigs.set(s.id, {
        id: s.id,
        name: s.name,
        forbiddenSlots: s.forbidden_slots || '0',
        allowDoubleSession: s.allow_double_session === 1,
        isMajorSubject: s.is_major_subject === 1,
        venueId: s.venue_id,
      });
    });

    logger.info('[Scheduler] 加载科目配置', { requestId: this.requestId, count: subjects.length });

    // 加载教师偏好
    const teachers = db.query(`
      SELECT id, preferred_slots, time_bias, weight, max_hours_per_day, max_consecutive_hours, unavailable_slots
      FROM teachers
    `).all() as any[];

    teachers.forEach(t => {
      this.teacherPrefs.set(t.id, {
        teacherId: t.id,
        preferredSlots: t.preferred_slots,
        timeBias: t.time_bias,
        weight: t.weight || 1,
        maxHoursPerDay: t.max_hours_per_day,
        maxConsecutiveHours: t.max_consecutive_hours,
        unavailableSlots: t.unavailable_slots,
      });
    });

    logger.info('[Scheduler] 加载教师偏好', { requestId: this.requestId, count: teachers.length });

    // 加载场地配置
    const venues = db.query(`
      SELECT id, name, capacity
      FROM venues
    `).all() as any[];

    venues.forEach(v => {
      this.venueConfigs.set(v.id, {
        id: v.id,
        name: v.name,
        capacity: v.capacity || 1,
      });
    });

    logger.info('[Scheduler] 加载场地配置', { requestId: this.requestId, count: venues.length });

    // 加载固定课程
    const fixed = db.query(`
      SELECT class_id, subject_id, teacher_id, day, period, week_type
      FROM schedule_entries
      WHERE is_fixed = 1
    `).all() as any[];

    this.fixedCourses = fixed.map(f => ({
      classId: f.class_id,
      subjectId: f.subject_id,
      teacherId: f.teacher_id,
      day: f.day,
      period: f.period,
      weekType: f.week_type || 'Every',
    }));

    logger.info('[Scheduler] 加载固定课程', { requestId: this.requestId, count: this.fixedCourses.length });
  }

  /**
   * 初始化排课数据结构
   */
  private initializeSchedule(): void {
    this.entries = [];
    this.teacherSchedule.clear();
    this.classSchedule.clear();
    this.venueSchedule.clear();

    // 先安排所有固定课程
    this.scheduleFixedCourses();
  }
  /**
   * 安排固定课程
   */
  private scheduleFixedCourses(): void {
    logger.info('[Scheduler] 安排固定课程', { requestId: this.requestId, count: this.fixedCourses.length });

    for (const fixed of this.fixedCourses) {
      const slot: TimeSlot = { day: fixed.day, period: fixed.period };

      // 检查是否有冲突
      if (this.isTeacherBusy(fixed.teacherId, slot)) {
        logger.warn('[Scheduler] 固定课程教师时间冲突', { fixed });
        continue;
      }

      if (this.isClassBusy(fixed.classId, slot)) {
        logger.warn('[Scheduler] 固定课程班级时间冲突', { fixed });
        continue;
      }

      // 添加固定课程
      const entry: ScheduleEntry = {
        classId: fixed.classId,
        subjectId: fixed.subjectId,
        teacherId: fixed.teacherId,
        timeSlot: slot,
        isFixed: true,
        weekType: fixed.weekType,
      };

      this.entries.push(entry);

      // 更新教师排课表
      if (!this.teacherSchedule.has(fixed.teacherId)) {
        this.teacherSchedule.set(fixed.teacherId, new Set());
      }
      this.teacherSchedule.get(fixed.teacherId)!.add(this.slotKey(slot));

      // 更新班级排课表
      if (!this.classSchedule.has(fixed.classId)) {
        this.classSchedule.set(fixed.classId, new Set());
      }
      this.classSchedule.get(fixed.classId)!.add(this.slotKey(slot));

      // 更新场地排课表
      const subjectConfig = this.subjectConfigs.get(fixed.subjectId);
      if (subjectConfig?.venueId) {
        this.updateVenueSchedule(subjectConfig.venueId, slot, 1);
      }
    }

    logger.info('[Scheduler] 固定课程安排完成', { requestId: this.requestId, scheduledCount: this.fixedCourses.length });
  }
  /**
   * 判断是否为特殊科目（体育、音乐、美术）
   */
  private isSpecialSubject(subjectId: string): boolean {
    const subjectConfig = this.subjectConfigs.get(subjectId);
    if (!subjectConfig) return false;

    return this.SPECIAL_SUBJECTS.some(special =>
      subjectConfig.name.includes(special)
    );
  }
  /**
   * 检查场地容量
   */
  private checkVenueCapacity(venueId: string, slot: TimeSlot): boolean {
    const venueConfig = this.venueConfigs.get(venueId);
    if (!venueConfig) return true; // 没有配置场地，默认通过

    const slotKey = this.slotKey(slot);
    const venueMap = this.venueSchedule.get(venueId);

    if (!venueMap) return true; // 场地还没有被使用

    const currentCount = venueMap.get(slotKey) || 0;
    return currentCount < venueConfig.capacity;
  }
  /**
   * 更新场地排课表
   */
  private updateVenueSchedule(venueId: string, slot: TimeSlot, delta: number): void {
    if (!this.venueSchedule.has(venueId)) {
      this.venueSchedule.set(venueId, new Map());
    }

    const venueMap = this.venueSchedule.get(venueId)!;
    const slotKey = this.slotKey(slot);
    const currentCount = venueMap.get(slotKey) || 0;
    venueMap.set(slotKey, currentCount + delta);
  }

  /**
   * 排课所有课程
   */
  private async scheduleAllCourses(): Promise<boolean> {
    logger.info('[Scheduler] 开始排课', { requestId: this.requestId, curriculumCount: this.curriculums.length });

    // 按难度排序（优先排难排的课程）
    const sortedCurriculums = this.sortCurriculumsByDifficulty();

    for (const curriculum of sortedCurriculums) {
      const success = await this.scheduleCurriculum(curriculum);
      if (!success) {
        logger.error('[Scheduler] 无法安排课程', {
          classId: curriculum.classId,
          subjectId: curriculum.subjectId,
          teacherId: curriculum.teacherId,
        });
        return false;
      }
    }

    return true;
  }

  /**
   * 按难度排序教学计划
   */
  private sortCurriculumsByDifficulty(): Curriculum[] {
    return [...this.curriculums].sort((a, b) => {
      // 优先排课时多的课程
      if (a.hoursPerWeek !== b.hoursPerWeek) {
        return b.hoursPerWeek - a.hoursPerWeek;
      }
      // 其次按科目ID排序（保证稳定性）
      return a.subjectId.localeCompare(b.subjectId);
    });
  }

  /**
   * 排课单个教学计划
   */
  private async scheduleCurriculum(curriculum: Curriculum): Promise<boolean> {
    const { classId, subjectId, teacherId, hoursPerWeek } = curriculum;

    logger.debug('[Scheduler] 排课', { classId, subjectId, teacherId, hoursPerWeek });

    let scheduledCount = 0;

    // 尝试为每节课找到合适的时间槽位
    for (let attempt = 0; attempt < hoursPerWeek; attempt++) {
      const slot = this.findAvailableSlot(classId, subjectId, teacherId);

      if (!slot) {
        logger.warn('[Scheduler] 无法找到可用时间槽位', {
          classId,
          subjectId,
          teacherId,
          scheduledCount,
          targetCount: hoursPerWeek,
        });
        return false;
      }

      // 添加课程
      this.addEntry(classId, subjectId, teacherId, slot);
      scheduledCount++;
    }

    logger.debug('[Scheduler] 课程排课完成', {
      classId,
      subjectId,
      scheduledCount,
    });

    return true;
  }

  /**
   * 查找可用的时间槽位
   */
  private findAvailableSlot(
    classId: number,
    subjectId: string,
    teacherId: number
  ): TimeSlot | null {
    const subjectConfig = this.subjectConfigs.get(subjectId);
    const teacherPref = this.teacherPrefs.get(teacherId);
    const isSpecial = this.isSpecialSubject(subjectId);

    // 遍历所有时间槽位
    for (let day = 0; day < this.cycleDays; day++) {
      // 特殊科目（体音美）从第4节开始（period >= 3）
      const startPeriod = isSpecial ? 3 : 0;

      for (let period = startPeriod; period < this.periodsPerDay; period++) {
        const slot: TimeSlot = { day, period };

        // 检查硬约束
        if (!this.checkHardConstraints(classId, subjectId, teacherId, slot, subjectConfig, teacherPref)) {
          continue;
        }

        // 找到可用槽位
        return slot;
      }
    }

    return null;
  }

  /**
   * 检查硬约束
   */
  private checkHardConstraints(
    classId: number,
    subjectId: string,
    teacherId: number,
    slot: TimeSlot,
    subjectConfig?: SubjectConfig,
    teacherPref?: TeacherPreference
  ): boolean {
    // 1. 检查教师时间冲突
    if (this.isTeacherBusy(teacherId, slot)) {
      return false;
    }

    // 2. 检查班级时间冲突
    if (this.isClassBusy(classId, slot)) {
      return false;
    }

    // 3. 检查科目禁止时段
    if (subjectConfig && this.isSlotForbidden(subjectConfig, slot)) {
      return false;
    }

    // 4. 检查教师不可用时段
    if (teacherPref && this.isTeacherUnavailable(teacherPref, slot)) {
      return false;
    }

    // 5. 检查教师每天最大课时
    if (teacherPref?.maxHoursPerDay) {
      const dailyCount = this.getTeacherDailyHours(teacherId, slot.day);
      if (dailyCount >= teacherPref.maxHoursPerDay) {
        return false;
      }
    }

    // 6. 检查场地容量限制
    if (subjectConfig?.venueId) {
      if (!this.checkVenueCapacity(subjectConfig.venueId, slot)) {
        return false;
      }
    }

    return true;
  }

  /**
   * 检查教师是否忙碌
   */
  private isTeacherBusy(teacherId: number, slot: TimeSlot): boolean {
    const schedule = this.teacherSchedule.get(teacherId);
    if (!schedule) return false;
    return schedule.has(this.slotKey(slot));
  }

  /**
   * 检查班级是否忙碌
   */
  private isClassBusy(classId: number, slot: TimeSlot): boolean {
    const schedule = this.classSchedule.get(classId);
    if (!schedule) return false;
    return schedule.has(this.slotKey(slot));
  }

  /**
   * 检查时间槽位是否被禁止
   */
  private isSlotForbidden(subjectConfig: SubjectConfig, slot: TimeSlot): boolean {
    // 解析禁止时段掩码
    const forbiddenMask = BigInt(subjectConfig.forbiddenSlots);
    const bitPos = slot.day * this.periodsPerDay + slot.period;
    return (forbiddenMask & (1n << BigInt(bitPos))) !== 0n;
  }

  /**
   * 检查教师是否不可用
   */
  private isTeacherUnavailable(teacherPref: TeacherPreference, slot: TimeSlot): boolean {
    if (!teacherPref.unavailableSlots) return false;

    try {
      const unavailableSlots = JSON.parse(teacherPref.unavailableSlots) as string[];
      const slotStr = `${slot.day}-${slot.period}`;
      return unavailableSlots.includes(slotStr);
    } catch {
      return false;
    }
  }

  /**
   * 获取教师某天的课时数
   */
  private getTeacherDailyHours(teacherId: number, day: number): number {
    const schedule = this.teacherSchedule.get(teacherId);
    if (!schedule) return 0;

    let count = 0;
    for (let period = 0; period < this.periodsPerDay; period++) {
      if (schedule.has(this.slotKey({ day, period }))) {
        count++;
      }
    }
    return count;
  }

  /**
   * 添加课表条目
   */
  private addEntry(
    classId: number,
    subjectId: string,
    teacherId: number,
    slot: TimeSlot
  ): void {
    const entry: ScheduleEntry = {
      classId,
      subjectId,
      teacherId,
      timeSlot: slot,
      isFixed: false,
      weekType: 'Every',
    };

    this.entries.push(entry);

    // 更新教师排课表
    if (!this.teacherSchedule.has(teacherId)) {
      this.teacherSchedule.set(teacherId, new Set());
    }
    this.teacherSchedule.get(teacherId)!.add(this.slotKey(slot));

    // 更新班级排课表
    if (!this.classSchedule.has(classId)) {
      this.classSchedule.set(classId, new Set());
    }
    this.classSchedule.get(classId)!.add(this.slotKey(slot));

    // 更新场地排课表
    const subjectConfig = this.subjectConfigs.get(subjectId);
    if (subjectConfig?.venueId) {
      this.updateVenueSchedule(subjectConfig.venueId, slot, 1);
    }
  }

  /**
   * 生成时间槽位键
   */
  private slotKey(slot: TimeSlot): string {
    return `${slot.day}-${slot.period}`;
  }

  /**
   * 计算课表代价值
   */
  private calculateCost(): number {
    let cost = 0;

    // 遍历所有课表条目
    for (const entry of this.entries) {
      const subjectConfig = this.subjectConfigs.get(entry.subjectId);
      const teacherPref = this.teacherPrefs.get(entry.teacherId);

      // 1. 主科连续3节惩罚
      if (subjectConfig?.isMajorSubject) {
        const consecutiveCount = this.countConsecutiveSessions(entry);
        if (consecutiveCount >= 3) {
          cost += 30 * (consecutiveCount - 2);
        }
      }

      // 2. 教师偏好时段惩罚
      if (teacherPref) {
        // 2.1 不在偏好时段的惩罚
        if (teacherPref.preferredSlots && !this.isInPreferredSlots(teacherPref, entry.timeSlot)) {
          const weight = teacherPref.weight || 1;
          cost += 10 * weight;
        }

        // 2.2 早课/晚课偏好惩罚
        if (teacherPref.timeBias === 1 && entry.timeSlot.period === 0) {
          // 厌恶早课，被安排第1节
          cost += 50;
        } else if (teacherPref.timeBias === 2 && entry.timeSlot.period === this.periodsPerDay - 1) {
          // 厌恶晚课，被安排最后一节
          cost += 50;
        }
      }
    }

    return cost;
  }
  /**
   * 检查时段是否在教师偏好时段内
   */
  private isInPreferredSlots(teacherPref: TeacherPreference, slot: TimeSlot): boolean {
    if (!teacherPref.preferredSlots) return true; // 没有设置偏好，默认都可以

    try {
      // 解析偏好时段掩码
      const preferredMask = BigInt(teacherPref.preferredSlots);
      const bitPos = slot.day * this.periodsPerDay + slot.period;
      return (preferredMask & (1n << BigInt(bitPos))) !== 0n;
    } catch {
      return true; // 解析失败，默认通过
    }
  }

  /**
   * 统计连续课程数
   */
  private countConsecutiveSessions(entry: ScheduleEntry): number {
    let count = 1;
    const { classId, subjectId, timeSlot } = entry;

    // 向前统计
    for (let p = timeSlot.period - 1; p >= 0; p--) {
      if (this.hasEntry(classId, subjectId, { day: timeSlot.day, period: p })) {
        count++;
      } else {
        break;
      }
    }

    // 向后统计
    for (let p = timeSlot.period + 1; p < this.periodsPerDay; p++) {
      if (this.hasEntry(classId, subjectId, { day: timeSlot.day, period: p })) {
        count++;
      } else {
        break;
      }
    }

    return count;
  }

  /**
   * 检查是否存在指定的课表条目
   */
  private hasEntry(classId: number, subjectId: string, slot: TimeSlot): boolean {
    return this.entries.some(
      e =>
        e.classId === classId &&
        e.subjectId === subjectId &&
        e.timeSlot.day === slot.day &&
        e.timeSlot.period === slot.period
    );
  }
}
