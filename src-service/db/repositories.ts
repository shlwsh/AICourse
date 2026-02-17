/**
 * 数据仓库模块
 *
 * 提供数据库 CRUD 操作
 */

import { getDatabase } from './database';
import { logger } from '../utils/logger';
import type { DatabaseLogger } from './database-logger';

/**
 * 教师仓库
 */
export class TeacherRepository {
  /**
   * 创建教师
   */
  static create(data: { name: string; teachingGroup?: string }, dbLogger?: DatabaseLogger): number {
    const db = dbLogger || getDatabase();

    // 查找或创建教研组
    let teachingGroupId: number | null = null;
    if (data.teachingGroup) {
      const group = db.prepare('SELECT id FROM teaching_groups WHERE name = ?').get(data.teachingGroup) as { id: number } | undefined;

      if (group) {
        teachingGroupId = group.id;
      } else {
        const result = db.prepare('INSERT INTO teaching_groups (name) VALUES (?)').run(data.teachingGroup);
        teachingGroupId = result.lastInsertRowid as number;
      }
    }

    const stmt = db.prepare('INSERT INTO teachers (name, teaching_group_id) VALUES (?, ?)');
    const result = stmt.run(data.name, teachingGroupId);

    logger.debug('创建教师', { id: result.lastInsertRowid, name: data.name });
    return result.lastInsertRowid as number;
  }

  /**
   * 查询所有教师
   */
  static findAll(dbLogger?: DatabaseLogger): any[] {
    const db = dbLogger || getDatabase();
    const stmt = db.prepare(`
      SELECT t.*, tg.name as teaching_group_name
      FROM teachers t
      LEFT JOIN teaching_groups tg ON t.teaching_group_id = tg.id
    `);
    return stmt.all();
  }

  /**
   * 根据姓名查找教师
   */
  static findByName(name: string, dbLogger?: DatabaseLogger): any | undefined {
    const db = dbLogger || getDatabase();
    const stmt = db.prepare('SELECT * FROM teachers WHERE name = ?');
    return stmt.get(name);
  }
}

/**
 * 班级仓库
 */
export class ClassRepository {
  /**
   * 创建班级
   */
  static create(data: { name: string; grade?: string }, dbLogger?: DatabaseLogger): number {
    const db = dbLogger || getDatabase();
    const stmt = db.prepare('INSERT INTO classes (name, grade_level) VALUES (?, ?)');
    const result = stmt.run(data.name, data.grade || null);

    logger.debug('创建班级', { id: result.lastInsertRowid, name: data.name });
    return result.lastInsertRowid as number;
  }

  /**
   * 查询所有班级
   */
  static findAll(dbLogger?: DatabaseLogger): any[] {
    const db = dbLogger || getDatabase();
    const stmt = db.prepare('SELECT * FROM classes');
    return stmt.all();
  }

  /**
   * 根据名称查找班级
   */
  static findByName(name: string, dbLogger?: DatabaseLogger): any | undefined {
    const db = dbLogger || getDatabase();
    const stmt = db.prepare('SELECT * FROM classes WHERE name = ?');
    return stmt.get(name);
  }
}

/**
 * 科目仓库
 */
export class SubjectRepository {
  /**
   * 创建科目配置
   */
  static create(data: {
    id: string;
    name: string;
    forbiddenSlots?: string;
    allowDoubleSession?: boolean;
    venueId?: string;
    isMajorSubject?: boolean;
  }, dbLogger?: DatabaseLogger): void {
    const db = dbLogger || getDatabase();

    // 如果指定了场地，先创建场地
    if (data.venueId) {
      const venue = db.prepare('SELECT id FROM venues WHERE id = ?').get(data.venueId);
      if (!venue) {
        db.prepare('INSERT OR IGNORE INTO venues (id, name, capacity) VALUES (?, ?, ?)').run(
          data.venueId,
          data.venueId,
          1
        );
      }
    }

    const stmt = db.prepare(`
      INSERT INTO subject_configs (id, name, forbidden_slots, allow_double_session, venue_id, is_major_subject)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      data.id,
      data.name,
      data.forbiddenSlots || '0',
      data.allowDoubleSession ? 1 : 0,
      data.venueId || null,
      data.isMajorSubject ? 1 : 0
    );

    logger.debug('创建科目配置', { id: data.id, name: data.name });
  }

  /**
   * 查询所有科目
   */
  static findAll(dbLogger?: DatabaseLogger): any[] {
    const db = dbLogger || getDatabase();
    const stmt = db.prepare('SELECT * FROM subject_configs');
    return stmt.all();
  }
}

/**
 * 教学计划仓库
 */
export class CurriculumRepository {
  /**
   * 创建教学计划
   */
  static create(data: {
    classId: number;
    subjectId: string;
    teacherId: number;
    targetSessions: number;
  }, dbLogger?: DatabaseLogger): number {
    const db = dbLogger || getDatabase();
    const stmt = db.prepare(`
      INSERT INTO class_curriculums (class_id, subject_id, teacher_id, target_sessions)
      VALUES (?, ?, ?, ?)
    `);
    const result = stmt.run(data.classId, data.subjectId, data.teacherId, data.targetSessions);

    logger.debug('创建教学计划', { id: result.lastInsertRowid });
    return result.lastInsertRowid as number;
  }

  /**
   * 查询所有教学计划
   */
  static findAll(dbLogger?: DatabaseLogger): any[] {
    const db = dbLogger || getDatabase();
    const stmt = db.prepare(`
      SELECT cc.*, c.name as class_name, sc.name as subject_name, t.name as teacher_name
      FROM class_curriculums cc
      JOIN classes c ON cc.class_id = c.id
      JOIN subject_configs sc ON cc.subject_id = sc.id
      JOIN teachers t ON cc.teacher_id = t.id
    `);
    return stmt.all();
  }
}

/**
 * 场地仓库
 */
export class VenueRepository {
  /**
   * 创建场地
   */
  static create(data: { id: string; name: string; type?: string; capacity?: number }, dbLogger?: DatabaseLogger): void {
    const db = dbLogger || getDatabase();
    const stmt = db.prepare('INSERT INTO venues (id, name, capacity) VALUES (?, ?, ?)');
    stmt.run(data.id, data.name, data.capacity || 1);

    logger.debug('创建场地', { id: data.id, name: data.name });
  }

  /**
   * 查询所有场地
   */
  static findAll(dbLogger?: DatabaseLogger): any[] {
    const db = dbLogger || getDatabase();
    const stmt = db.prepare('SELECT * FROM venues');
    return stmt.all();
  }
}

/**
 * 教研组仓库
 */
export class TeachingGroupRepository {
  /**
   * 查询所有教研组
   */
  static findAll(dbLogger?: DatabaseLogger): any[] {
    const db = dbLogger || getDatabase();
    const stmt = db.prepare('SELECT * FROM teaching_groups');
    return stmt.all();
  }
}
