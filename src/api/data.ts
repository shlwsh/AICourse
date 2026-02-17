/**
 * 数据 API 客户端
 *
 * 从后端数据库获取各类数据
 */

import { http } from './http';
import { logger } from '@/utils/logger';

/**
 * 获取所有教师
 */
export async function fetchTeachers() {
  try {
    logger.debug('[DataAPI] 获取教师列表');
    const response = await http.get('/data/teachers');
    return response.data;
  } catch (error) {
    logger.error('[DataAPI] 获取教师列表失败', { error });
    throw error;
  }
}

/**
 * 获取所有班级
 */
export async function fetchClasses() {
  try {
    logger.debug('[DataAPI] 获取班级列表');
    const response = await http.get('/data/classes');
    return response.data;
  } catch (error) {
    logger.error('[DataAPI] 获取班级列表失败', { error });
    throw error;
  }
}

/**
 * 获取所有科目配置
 */
export async function fetchSubjects() {
  try {
    logger.debug('[DataAPI] 获取科目列表');
    const response = await http.get('/data/subjects');
    return response.data;
  } catch (error) {
    logger.error('[DataAPI] 获取科目列表失败', { error });
    throw error;
  }
}

/**
 * 获取所有教学计划
 */
export async function fetchCurriculums() {
  try {
    logger.debug('[DataAPI] 获取教学计划列表');
    const response = await http.get('/data/curriculums');
    return response.data;
  } catch (error) {
    logger.error('[DataAPI] 获取教学计划列表失败', { error });
    throw error;
  }
}

/**
 * 获取所有场地
 */
export async function fetchVenues() {
  try {
    logger.debug('[DataAPI] 获取场地列表');
    const response = await http.get('/data/venues');
    return response.data;
  } catch (error) {
    logger.error('[DataAPI] 获取场地列表失败', { error });
    throw error;
  }
}

/**
 * 获取所有教研组
 */
export async function fetchTeachingGroups() {
  try {
    logger.debug('[DataAPI] 获取教研组列表');
    const response = await http.get('/data/teaching-groups');
    return response.data;
  } catch (error) {
    logger.error('[DataAPI] 获取教研组列表失败', { error });
    throw error;
  }
}

/**
 * 获取所有数据
 */
export async function fetchAllData() {
  try {
    logger.debug('[DataAPI] 获取所有数据');
    const [teachers, classes, subjects, curriculums, venues, teachingGroups] = await Promise.all([
      fetchTeachers(),
      fetchClasses(),
      fetchSubjects(),
      fetchCurriculums(),
      fetchVenues(),
      fetchTeachingGroups(),
    ]);

    return {
      teachers,
      classes,
      subjects,
      curriculums,
      venues,
      teachingGroups,
    };
  } catch (error) {
    logger.error('[DataAPI] 获取所有数据失败', { error });
    throw error;
  }
}

/**
 * 数据统计信息
 */
export interface DataStats {
  dictionaries: {
    teachers: { count: number };
    classes: { count: number };
    subjects: { count: number };
    venues: { count: number };
    teachingGroups: { count: number };
  };
  business: {
    curriculums: { count: number };
    fixedCourses: { count: number };
    scheduleEntries: { count: number };
    invigilations: { count: number };
  };
}

/**
 * 获取数据统计信息
 */
export async function fetchDataStats(): Promise<DataStats> {
  try {
    logger.debug('[DataAPI] 获取数据统计信息');
    const response = await http.get('/clear-data/stats');
    return response.data;
  } catch (error) {
    logger.error('[DataAPI] 获取数据统计信息失败', { error });
    throw error;
  }
}

/**
 * 清除字典数据
 */
export async function clearDictionaries() {
  try {
    logger.info('[DataAPI] 清除字典数据');
    const response = await http.post('/clear-data/dictionaries');
    return response;
  } catch (error) {
    logger.error('[DataAPI] 清除字典数据失败', { error });
    throw error;
  }
}

/**
 * 清除业务数据
 */
export async function clearBusinessData() {
  try {
    logger.info('[DataAPI] 清除业务数据');
    const response = await http.post('/clear-data/business');
    return response;
  } catch (error) {
    logger.error('[DataAPI] 清除业务数据失败', { error });
    throw error;
  }
}

/**
 * 清除所有数据
 */
export async function clearAllData() {
  try {
    logger.info('[DataAPI] 清除所有数据');
    const response = await http.post('/clear-data/all');
    return response;
  } catch (error) {
    logger.error('[DataAPI] 清除所有数据失败', { error });
    throw error;
  }
}
