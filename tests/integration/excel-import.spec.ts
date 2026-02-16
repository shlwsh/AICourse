/**
 * Excel 数据导入集成测试
 *
 * 测试从 Excel 文件导入数据到数据库的完整流程
 */

import { test, expect } from '@playwright/test';
import path from 'path';
import fs from 'fs';

const TEST_DATA_FILE = path.join(process.cwd(), 'data', '测试数据.xlsx');
const API_BASE_URL = 'http://localhost:3000';

test.describe('Excel 数据导入测试', () => {
  test.beforeAll(async () => {
    // 确保测试数据文件存在
    if (!fs.existsSync(TEST_DATA_FILE)) {
      throw new Error(`测试数据文件不存在: ${TEST_DATA_FILE}`);
    }
  });

  test('用例 1: 验证测试数据文件存在', async () => {
    console.log('检查测试数据文件...');

    const stats = fs.statSync(TEST_DATA_FILE);
    expect(stats.isFile()).toBeTruthy();
    expect(stats.size).toBeGreaterThan(0);

    console.log(`✓ 测试数据文件存在: ${TEST_DATA_FILE}`);
    console.log(`  文件大小: ${(stats.size / 1024).toFixed(2)} KB`);
  });

  test('用例 2: 通过 API 导入 Excel 数据', async ({ request }) => {
    console.log('开始导入 Excel 数据...');

    // 读取测试数据文件
    const fileBuffer = fs.readFileSync(TEST_DATA_FILE);

    // 发送导入请求
    const response = await request.post(`${API_BASE_URL}/api/import-export/import`, {
      multipart: {
        file: {
          name: '测试数据.xlsx',
          mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          buffer: fileBuffer,
        },
      },
      timeout: 30000, // 30秒超时
    });

    console.log(`响应状态: ${response.status()}`);

    expect(response.ok()).toBeTruthy();

    const result = await response.json();
    console.log('导入结果:', JSON.stringify(result, null, 2));

    // 验证导入结果
    expect(result.success).toBeTruthy();
    expect(result.success_count).toBeGreaterThan(0);
    expect(result.error_count).toBe(0);

    console.log(`✓ 导入成功: ${result.success_count} 条记录`);
    console.log(`  消息: ${result.message}`);
  });

  test('用例 3: 验证教师数据已保存', async ({ request }) => {
    console.log('验证教师数据...');

    const response = await request.get(`${API_BASE_URL}/api/teachers`);
    expect(response.ok()).toBeTruthy();

    const teachers = await response.json();
    console.log(`查询到 ${teachers.length} 位教师`);

    expect(teachers.length).toBeGreaterThan(0);

    // 验证教师数据结构
    const firstTeacher = teachers[0];
    expect(firstTeacher).toHaveProperty('id');
    expect(firstTeacher).toHaveProperty('name');

    console.log(`✓ 教师数据验证通过`);
    console.log(`  示例教师: ${firstTeacher.name} (ID: ${firstTeacher.id})`);
  });

  test('用例 4: 验证科目配置已保存', async ({ request }) => {
    console.log('验证科目配置...');

    const response = await request.get(`${API_BASE_URL}/api/subjects`);
    expect(response.ok()).toBeTruthy();

    const subjects = await response.json();
    console.log(`查询到 ${subjects.length} 个科目`);

    expect(subjects.length).toBeGreaterThan(0);

    // 验证科目数据结构
    const firstSubject = subjects[0];
    expect(firstSubject).toHaveProperty('id');
    expect(firstSubject).toHaveProperty('name');

    console.log(`✓ 科目配置验证通过`);
    console.log(`  示例科目: ${firstSubject.name} (ID: ${firstSubject.id})`);
  });

  test('用例 5: 验证班级数据已保存', async ({ request }) => {
    console.log('验证班级数据...');

    const response = await request.get(`${API_BASE_URL}/api/classes`);
    expect(response.ok()).toBeTruthy();

    const classes = await response.json();
    console.log(`查询到 ${classes.length} 个班级`);

    expect(classes.length).toBeGreaterThan(0);

    // 验证班级数据结构
    const firstClass = classes[0];
    expect(firstClass).toHaveProperty('id');
    expect(firstClass).toHaveProperty('name');

    console.log(`✓ 班级数据验证通过`);
    console.log(`  示例班级: ${firstClass.name} (ID: ${firstClass.id})`);
  });

  test('用例 6: 验证教学计划已保存', async ({ request }) => {
    console.log('验证教学计划...');

    const response = await request.get(`${API_BASE_URL}/api/curriculums`);
    expect(response.ok()).toBeTruthy();

    const curriculums = await response.json();
    console.log(`查询到 ${curriculums.length} 条教学计划`);

    expect(curriculums.length).toBeGreaterThan(0);

    // 验证教学计划数据结构
    const firstCurriculum = curriculums[0];
    expect(firstCurriculum).toHaveProperty('id');
    expect(firstCurriculum).toHaveProperty('class_id');
    expect(firstCurriculum).toHaveProperty('subject_id');
    expect(firstCurriculum).toHaveProperty('teacher_id');
    expect(firstCurriculum).toHaveProperty('target_sessions');

    console.log(`✓ 教学计划验证通过`);
    console.log(`  示例计划: 班级ID=${firstCurriculum.class_id}, 科目ID=${firstCurriculum.subject_id}`);
  });

  test('用例 7: 验证数据完整性', async ({ request }) => {
    console.log('验证数据完整性...');

    // 获取所有数据
    const [teachersRes, subjectsRes, classesRes, curriculumsRes] = await Promise.all([
      request.get(`${API_BASE_URL}/api/teachers`),
      request.get(`${API_BASE_URL}/api/subjects`),
      request.get(`${API_BASE_URL}/api/classes`),
      request.get(`${API_BASE_URL}/api/curriculums`),
    ]);

    const teachers = await teachersRes.json();
    const subjects = await subjectsRes.json();
    const classes = await classesRes.json();
    const curriculums = await curriculumsRes.json();

    console.log('数据统计:');
    console.log(`  教师: ${teachers.length} 位`);
    console.log(`  科目: ${subjects.length} 个`);
    console.log(`  班级: ${classes.length} 个`);
    console.log(`  教学计划: ${curriculums.length} 条`);

    // 验证数据关联完整性
    const teacherIds = new Set(teachers.map((t: any) => t.id));
    const subjectIds = new Set(subjects.map((s: any) => s.id));
    const classIds = new Set(classes.map((c: any) => c.id));

    let invalidCount = 0;
    for (const curriculum of curriculums) {
      if (!teacherIds.has(curriculum.teacher_id)) {
        console.error(`  ✗ 教学计划引用了不存在的教师ID: ${curriculum.teacher_id}`);
        invalidCount++;
      }
      if (!subjectIds.has(curriculum.subject_id)) {
        console.error(`  ✗ 教学计划引用了不存在的科目ID: ${curriculum.subject_id}`);
        invalidCount++;
      }
      if (!classIds.has(curriculum.class_id)) {
        console.error(`  ✗ 教学计划引用了不存在的班级ID: ${curriculum.class_id}`);
        invalidCount++;
      }
    }

    expect(invalidCount).toBe(0);
    console.log(`✓ 数据完整性验证通过，所有引用关系正确`);
  });
});
