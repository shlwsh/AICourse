/**
 * 清除数据路由模块
 *
 * 提供清除字典数据和业务数据的 API
 */

import { Hono } from 'hono';
import { createRouteLogger } from '../middleware/request-logger';
import { getDatabase } from '../db/database';

// 创建路由实例
const clearDataRoutes = new Hono();

/**
 * POST /api/clear-data/dictionaries
 * 清除所有字典数据（教师、班级、科目、场地、教研组）
 */
clearDataRoutes.post('/dictionaries', async (c) => {
  const log = createRouteLogger('清除字典数据');
  log.start();

  try {
    const db = getDatabase();

    // 开始事务
    db.exec('BEGIN TRANSACTION');

    try {
      // 清除字典数据（保留表结构）
      // 注意：需要先清除引用字典数据的业务数据
      db.exec('DELETE FROM class_curriculums');
      db.exec('DELETE FROM fixed_courses');
      db.exec('DELETE FROM schedule_entries');
      db.exec('DELETE FROM invigilation_assignments');

      // 然后清除字典数据
      db.exec('DELETE FROM teachers');
      db.exec('DELETE FROM classes');
      db.exec('DELETE FROM subject_configs');
      db.exec('DELETE FROM venues');
      db.exec('DELETE FROM teaching_groups');

      // 重置自增 ID
      db.exec(`DELETE FROM sqlite_sequence WHERE name IN (
        'teachers', 'classes', 'teaching_groups',
        'class_curriculums', 'fixed_courses',
        'schedule_entries', 'invigilation_assignments'
      )`);

      // 提交事务
      db.exec('COMMIT');

      log.success({ message: '字典数据清除成功' });

      return c.json({
        success: true,
        message: '字典数据清除成功',
        data: {
          cleared: ['teachers', 'classes', 'subject_configs', 'venues', 'teaching_groups'],
        },
      });
    } catch (error) {
      // 回滚事务
      db.exec('ROLLBACK');
      throw error;
    }
  } catch (error) {
    log.error('清除字典数据失败', {
      error: error instanceof Error ? error.message : String(error),
    });

    return c.json(
      {
        success: false,
        error: '清除字典数据失败',
        message: error instanceof Error ? error.message : String(error),
      },
      500,
    );
  }
});

/**
 * POST /api/clear-data/all
 * 清除所有业务数据（包括字典数据和业务数据）
 */
clearDataRoutes.post('/all', async (c) => {
  const log = createRouteLogger('清除所有数据');
  log.start();

  try {
    const db = getDatabase();

    // 开始事务
    db.exec('BEGIN TRANSACTION');

    try {
      // 清除业务数据
      db.exec('DELETE FROM schedule_entries');
      db.exec('DELETE FROM fixed_courses');
      db.exec('DELETE FROM invigilation_assignments');
      db.exec('DELETE FROM class_curriculums');

      // 清除字典数据
      db.exec('DELETE FROM teachers');
      db.exec('DELETE FROM classes');
      db.exec('DELETE FROM subject_configs');
      db.exec('DELETE FROM venues');
      db.exec('DELETE FROM teaching_groups');

      // 重置自增 ID
      db.exec(`DELETE FROM sqlite_sequence WHERE name IN (
        'teachers', 'classes', 'teaching_groups',
        'class_curriculums', 'fixed_courses',
        'schedule_entries', 'invigilation_assignments'
      )`);

      // 提交事务
      db.exec('COMMIT');

      log.success({ message: '所有数据清除成功' });

      return c.json({
        success: true,
        message: '所有数据清除成功',
        data: {
          cleared: [
            'schedule_entries',
            'fixed_courses',
            'invigilation_assignments',
            'class_curriculums',
            'teachers',
            'classes',
            'subject_configs',
            'venues',
            'teaching_groups',
          ],
        },
      });
    } catch (error) {
      // 回滚事务
      db.exec('ROLLBACK');
      throw error;
    }
  } catch (error) {
    log.error('清除所有数据失败', {
      error: error instanceof Error ? error.message : String(error),
    });

    return c.json(
      {
        success: false,
        error: '清除所有数据失败',
        message: error instanceof Error ? error.message : String(error),
      },
      500,
    );
  }
});

/**
 * POST /api/clear-data/business
 * 仅清除业务数据（保留字典数据）
 */
clearDataRoutes.post('/business', async (c) => {
  const log = createRouteLogger('清除业务数据');
  log.start();

  try {
    const db = getDatabase();

    // 开始事务
    db.exec('BEGIN TRANSACTION');

    try {
      // 清除业务数据
      db.exec('DELETE FROM schedule_entries');
      db.exec('DELETE FROM fixed_courses');
      db.exec('DELETE FROM invigilation_assignments');
      db.exec('DELETE FROM class_curriculums');

      // 重置自增 ID
      db.exec(`DELETE FROM sqlite_sequence WHERE name IN (
        'class_curriculums', 'fixed_courses',
        'schedule_entries', 'invigilation_assignments'
      )`);

      // 提交事务
      db.exec('COMMIT');

      log.success({ message: '业务数据清除成功' });

      return c.json({
        success: true,
        message: '业务数据清除成功',
        data: {
          cleared: [
            'schedule_entries',
            'fixed_courses',
            'invigilation_assignments',
            'class_curriculums',
          ],
        },
      });
    } catch (error) {
      // 回滚事务
      db.exec('ROLLBACK');
      throw error;
    }
  } catch (error) {
    log.error('清除业务数据失败', {
      error: error instanceof Error ? error.message : String(error),
    });

    return c.json(
      {
        success: false,
        error: '清除业务数据失败',
        message: error instanceof Error ? error.message : String(error),
      },
      500,
    );
  }
});

/**
 * GET /api/clear-data/stats
 * 获取数据统计信息
 */
clearDataRoutes.get('/stats', async (c) => {
  const log = createRouteLogger('获取数据统计');
  log.start();

  try {
    const db = getDatabase();

    const stats = {
      dictionaries: {
        teachers: db.query('SELECT COUNT(*) as count FROM teachers').get() as { count: number },
        classes: db.query('SELECT COUNT(*) as count FROM classes').get() as { count: number },
        subjects: db.query('SELECT COUNT(*) as count FROM subject_configs').get() as { count: number },
        venues: db.query('SELECT COUNT(*) as count FROM venues').get() as { count: number },
        teachingGroups: db.query('SELECT COUNT(*) as count FROM teaching_groups').get() as { count: number },
      },
      business: {
        curriculums: db.query('SELECT COUNT(*) as count FROM class_curriculums').get() as { count: number },
        fixedCourses: db.query('SELECT COUNT(*) as count FROM fixed_courses').get() as { count: number },
        scheduleEntries: db.query('SELECT COUNT(*) as count FROM schedule_entries').get() as { count: number },
        invigilations: db.query('SELECT COUNT(*) as count FROM invigilation_assignments').get() as { count: number },
      },
    };

    log.success({ stats });

    return c.json({
      success: true,
      data: stats,
    });
  } catch (error) {
    log.error('获取数据统计失败', {
      error: error instanceof Error ? error.message : String(error),
    });

    return c.json(
      {
        success: false,
        error: '获取数据统计失败',
        message: error instanceof Error ? error.message : String(error),
      },
      500,
    );
  }
});

export { clearDataRoutes };
