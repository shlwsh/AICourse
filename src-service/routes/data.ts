/**
 * 数据查询路由模块
 *
 * 提供从数据库查询各类数据的 API
 */

import '../types/hono'; // 导入类型扩展
import { Hono } from 'hono';
import { createRouteLogger } from '../middleware/request-logger';
import { createDatabaseLogger } from '../db/database-logger';
import { getDatabase } from '../db/database';
import {
  TeacherRepository,
  ClassRepository,
  SubjectRepository,
  CurriculumRepository,
  VenueRepository,
  TeachingGroupRepository,
} from '../db/repositories';

// 创建路由实例
const dataRoutes = new Hono();

/**
 * GET /api/data/teachers
 * 获取所有教师
 */
dataRoutes.get('/teachers', async (c) => {
  const log = createRouteLogger('获取教师列表');
  const requestId = c.get('requestId');
  log.start();

  try {
    const dbLogger = createDatabaseLogger(getDatabase(), requestId);
    const teachers = TeacherRepository.findAll(dbLogger);
    
    log.success({ 
      count: teachers.length,
      data: teachers,
    });

    return c.json({
      success: true,
      data: teachers,
    });
  } catch (error) {
    log.error('获取教师列表失败', {
      error: error instanceof Error ? error.message : String(error),
    });

    return c.json(
      {
        success: false,
        error: '获取教师列表失败',
        message: error instanceof Error ? error.message : String(error),
      },
      500,
    );
  }
});

/**
 * GET /api/data/classes
 * 获取所有班级
 */
dataRoutes.get('/classes', async (c) => {
  const log = createRouteLogger('获取班级列表');
  const requestId = c.get('requestId');
  log.start();

  try {
    const dbLogger = createDatabaseLogger(getDatabase(), requestId);
    const classes = ClassRepository.findAll(dbLogger);
    
    log.success({ 
      count: classes.length,
      data: classes,
    });

    return c.json({
      success: true,
      data: classes,
    });
  } catch (error) {
    log.error('获取班级列表失败', {
      error: error instanceof Error ? error.message : String(error),
    });

    return c.json(
      {
        success: false,
        error: '获取班级列表失败',
        message: error instanceof Error ? error.message : String(error),
      },
      500,
    );
  }
});

/**
 * GET /api/data/subjects
 * 获取所有科目配置
 */
dataRoutes.get('/subjects', async (c) => {
  const log = createRouteLogger('获取科目列表');
  const requestId = c.get('requestId');
  log.start();

  try {
    const dbLogger = createDatabaseLogger(getDatabase(), requestId);
    const subjects = SubjectRepository.findAll(dbLogger);
    
    log.success({ 
      count: subjects.length,
      data: subjects,
    });

    return c.json({
      success: true,
      data: subjects,
    });
  } catch (error) {
    log.error('获取科目列表失败', {
      error: error instanceof Error ? error.message : String(error),
    });

    return c.json(
      {
        success: false,
        error: '获取科目列表失败',
        message: error instanceof Error ? error.message : String(error),
      },
      500,
    );
  }
});

/**
 * GET /api/data/curriculums
 * 获取所有教学计划
 */
dataRoutes.get('/curriculums', async (c) => {
  const log = createRouteLogger('获取教学计划列表');
  const requestId = c.get('requestId');
  log.start();

  try {
    const dbLogger = createDatabaseLogger(getDatabase(), requestId);
    const curriculums = CurriculumRepository.findAll(dbLogger);
    
    log.success({ 
      count: curriculums.length,
      data: curriculums,
    });

    return c.json({
      success: true,
      data: curriculums,
    });
  } catch (error) {
    log.error('获取教学计划列表失败', {
      error: error instanceof Error ? error.message : String(error),
    });

    return c.json(
      {
        success: false,
        error: '获取教学计划列表失败',
        message: error instanceof Error ? error.message : String(error),
      },
      500,
    );
  }
});

/**
 * GET /api/data/venues
 * 获取所有场地
 */
dataRoutes.get('/venues', async (c) => {
  const log = createRouteLogger('获取场地列表');
  const requestId = c.get('requestId');
  log.start();

  try {
    const dbLogger = createDatabaseLogger(getDatabase(), requestId);
    const venues = VenueRepository.findAll(dbLogger);
    
    log.success({ 
      count: venues.length,
      data: venues,
    });

    return c.json({
      success: true,
      data: venues,
    });
  } catch (error) {
    log.error('获取场地列表失败', {
      error: error instanceof Error ? error.message : String(error),
    });

    return c.json(
      {
        success: false,
        error: '获取场地列表失败',
        message: error instanceof Error ? error.message : String(error),
      },
      500,
    );
  }
});

/**
 * GET /api/data/teaching-groups
 * 获取所有教研组
 */
dataRoutes.get('/teaching-groups', async (c) => {
  const log = createRouteLogger('获取教研组列表');
  const requestId = c.get('requestId');
  log.start();

  try {
    const dbLogger = createDatabaseLogger(getDatabase(), requestId);
    const groups = TeachingGroupRepository.findAll(dbLogger);
    
    log.success({ 
      count: groups.length,
      data: groups,
    });

    return c.json({
      success: true,
      data: groups,
    });
  } catch (error) {
    log.error('获取教研组列表失败', {
      error: error instanceof Error ? error.message : String(error),
    });

    return c.json(
      {
        success: false,
        error: '获取教研组列表失败',
        message: error instanceof Error ? error.message : String(error),
      },
      500,
    );
  }
});

export { dataRoutes };
