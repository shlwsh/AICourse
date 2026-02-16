/**
 * 测试数据生成工具
 *
 * 功能：
 * - 生成教师数据
 * - 生成科目配置
 * - 生成班级数据
 * - 生成教学计划
 * - 生成教师偏好设置
 * - 导出为 Excel 文件
 */

import ExcelJS from 'exceljs';
import path from 'path';
import fs from 'fs/promises';

// 数据配置
const CONFIG = {
  // 年级配置
  grades: ['高一', '高二', '高三'],
  classesPerGrade: 6, // 每个年级的班级数

  // 科目配置
  subjects: [
    { id: 'chinese', name: '语文', hoursPerWeek: 5, category: '主科' },
    { id: 'math', name: '数学', hoursPerWeek: 5, category: '主科' },
    { id: 'english', name: '英语', hoursPerWeek: 5, category: '主科' },
    { id: 'physics', name: '物理', hoursPerWeek: 4, category: '理科' },
    { id: 'chemistry', name: '化学', hoursPerWeek: 4, category: '理科' },
    { id: 'biology', name: '生物', hoursPerWeek: 3, category: '理科' },
    { id: 'politics', name: '政治', hoursPerWeek: 3, category: '文科' },
    { id: 'history', name: '历史', hoursPerWeek: 3, category: '文科' },
    { id: 'geography', name: '地理', hoursPerWeek: 3, category: '文科' },
    { id: 'pe', name: '体育', hoursPerWeek: 2, category: '其他' },
    { id: 'music', name: '音乐', hoursPerWeek: 1, category: '其他' },
    { id: 'art', name: '美术', hoursPerWeek: 1, category: '其他' },
  ],

  // 教师配置
  teacherGroups: {
    '语文组': ['张老师', '李老师', '王老师', '赵老师'],
    '数学组': ['刘老师', '陈老师', '杨老师', '黄老师'],
    '英语组': ['周老师', '吴老师', '郑老师', '孙老师'],
    '物理组': ['朱老师', '徐老师', '马老师'],
    '化学组': ['胡老师', '林老师', '何老师'],
    '生物组': ['高老师', '梁老师'],
    '政治组': ['郭老师', '罗老师'],
    '历史组': ['宋老师', '谢老师'],
    '地理组': ['韩老师', '唐老师'],
    '体育组': ['冯老师', '于老师', '董老师'],
    '音乐组': ['程老师'],
    '美术组': ['曹老师'],
  },

  // 时间配置
  daysPerWeek: 5,
  periodsPerDay: 8,
};

// 科目到教研组的映射
const SUBJECT_TO_GROUP: Record<string, string> = {
  'chinese': '语文组',
  'math': '数学组',
  'english': '英语组',
  'physics': '物理组',
  'chemistry': '化学组',
  'biology': '生物组',
  'politics': '政治组',
  'history': '历史组',
  'geography': '地理组',
  'pe': '体育组',
  'music': '音乐组',
  'art': '美术组',
};

/**
 * 生成教师数据
 */
function generateTeachers() {
  const teachers: any[] = [];
  let teacherId = 1;

  for (const [group, names] of Object.entries(CONFIG.teacherGroups)) {
    for (const name of names) {
      teachers.push({
        id: teacherId++,
        name,
        group,
      });
    }
  }

  return teachers;
}

/**
 * 生成班级数据
 */
function generateClasses() {
  const classes: any[] = [];
  let classId = 1;

  for (const grade of CONFIG.grades) {
    for (let i = 1; i <= CONFIG.classesPerGrade; i++) {
      classes.push({
        id: classId++,
        name: `${grade}${i}班`,
        grade,
        studentCount: 40 + Math.floor(Math.random() * 10), // 40-50人
      });
    }
  }

  return classes;
}

/**
 * 为班级分配教师
 */
function assignTeachersToClasses(teachers: any[], classes: any[]) {
  const assignments: any[] = [];

  // 按科目分组教师
  const teachersBySubject: Record<string, any[]> = {};
  for (const subject of CONFIG.subjects) {
    const group = SUBJECT_TO_GROUP[subject.id];
    teachersBySubject[subject.id] = teachers.filter(t => t.group === group);
  }

  // 为每个班级分配教师
  for (const cls of classes) {
    for (const subject of CONFIG.subjects) {
      const availableTeachers = teachersBySubject[subject.id];
      if (availableTeachers.length === 0) {
        console.warn(`警告: 科目 ${subject.name} 没有可用教师`);
        continue;
      }

      // 随机选择一个教师（实际应该考虑工作量平衡）
      const teacher = availableTeachers[Math.floor(Math.random() * availableTeachers.length)];

      assignments.push({
        classId: cls.id,
        className: cls.name,
        subjectId: subject.id,
        subjectName: subject.name,
        teacherId: teacher.id,
        teacherName: teacher.name,
        hoursPerWeek: subject.hoursPerWeek,
      });
    }
  }

  return assignments;
}

/**
 * 生成教师偏好设置
 */
function generateTeacherPreferences(teachers: any[]) {
  const preferences: any[] = [];

  // 为部分教师生成偏好设置
  const teachersWithPreferences = teachers.slice(0, Math.floor(teachers.length / 3));

  for (const teacher of teachersWithPreferences) {
    // 随机生成 1-3 个偏好时段
    const prefCount = 1 + Math.floor(Math.random() * 3);

    for (let i = 0; i < prefCount; i++) {
      const day = Math.floor(Math.random() * CONFIG.daysPerWeek);
      const period = Math.floor(Math.random() * CONFIG.periodsPerDay);
      const types = ['preferred', 'unavailable'];
      const type = types[Math.floor(Math.random() * types.length)];

      preferences.push({
        teacherId: teacher.id,
        teacherName: teacher.name,
        day: day + 1, // 1-5 (星期一到星期五)
        period: period + 1, // 1-8
        type,
        typeLabel: type === 'preferred' ? '偏好' : '不可用',
      });
    }
  }

  return preferences;
}

/**
 * 创建 Excel 工作簿
 */
async function createExcelWorkbook(
  teachers: any[],
  classes: any[],
  subjects: any[],
  curriculums: any[],
  preferences: any[]
) {
  const workbook = new ExcelJS.Workbook();

  // 1. 教师信息工作表
  const teacherSheet = workbook.addWorksheet('教师信息');
  teacherSheet.columns = [
    { header: '教师ID', key: 'id', width: 10 },
    { header: '姓名', key: 'name', width: 15 },
    { header: '教研组', key: 'group', width: 15 },
  ];
  teacherSheet.addRows(teachers);
  styleSheet(teacherSheet);

  // 2. 班级信息工作表
  const classSheet = workbook.addWorksheet('班级信息');
  classSheet.columns = [
    { header: '班级ID', key: 'id', width: 10 },
    { header: '班级名称', key: 'name', width: 15 },
    { header: '年级', key: 'grade', width: 10 },
    { header: '学生人数', key: 'studentCount', width: 12 },
  ];
  classSheet.addRows(classes);
  styleSheet(classSheet);

  // 3. 科目配置工作表
  const subjectSheet = workbook.addWorksheet('科目配置');
  subjectSheet.columns = [
    { header: '科目ID', key: 'id', width: 15 },
    { header: '科目名称', key: 'name', width: 15 },
    { header: '周课时数', key: 'hoursPerWeek', width: 12 },
    { header: '类别', key: 'category', width: 10 },
  ];
  subjectSheet.addRows(subjects);
  styleSheet(subjectSheet);

  // 4. 教学计划工作表
  const curriculumSheet = workbook.addWorksheet('教学计划');
  curriculumSheet.columns = [
    { header: '班级ID', key: 'classId', width: 10 },
    { header: '班级名称', key: 'className', width: 15 },
    { header: '科目ID', key: 'subjectId', width: 15 },
    { header: '科目名称', key: 'subjectName', width: 15 },
    { header: '教师ID', key: 'teacherId', width: 10 },
    { header: '教师姓名', key: 'teacherName', width: 15 },
    { header: '周课时数', key: 'hoursPerWeek', width: 12 },
  ];
  curriculumSheet.addRows(curriculums);
  styleSheet(curriculumSheet);

  // 5. 教师偏好工作表
  const preferenceSheet = workbook.addWorksheet('教师偏好');
  preferenceSheet.columns = [
    { header: '教师ID', key: 'teacherId', width: 10 },
    { header: '教师姓名', key: 'teacherName', width: 15 },
    { header: '星期', key: 'day', width: 10 },
    { header: '节次', key: 'period', width: 10 },
    { header: '偏好类型', key: 'type', width: 15 },
    { header: '类型说明', key: 'typeLabel', width: 15 },
  ];
  preferenceSheet.addRows(preferences);
  styleSheet(preferenceSheet);

  return workbook;
}

/**
 * 设置工作表样式
 */
function styleSheet(sheet: ExcelJS.Worksheet) {
  // 设置表头样式
  const headerRow = sheet.getRow(1);
  headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
  headerRow.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF4472C4' },
  };
  headerRow.alignment = { vertical: 'middle', horizontal: 'center' };
  headerRow.height = 25;

  // 设置数据行样式
  sheet.eachRow((row, rowNumber) => {
    if (rowNumber > 1) {
      row.alignment = { vertical: 'middle', horizontal: 'left' };
      row.height = 20;

      // 交替行颜色
      if (rowNumber % 2 === 0) {
        row.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFF2F2F2' },
        };
      }
    }

    // 添加边框
    row.eachCell((cell) => {
      cell.border = {
        top: { style: 'thin', color: { argb: 'FFD0D0D0' } },
        left: { style: 'thin', color: { argb: 'FFD0D0D0' } },
        bottom: { style: 'thin', color: { argb: 'FFD0D0D0' } },
        right: { style: 'thin', color: { argb: 'FFD0D0D0' } },
      };
    });
  });
}

/**
 * 生成统计信息
 */
function generateStatistics(
  teachers: any[],
  classes: any[],
  subjects: any[],
  curriculums: any[]
) {
  console.log('\n========================================');
  console.log('测试数据统计');
  console.log('========================================\n');

  console.log(`教师总数: ${teachers.length}`);
  console.log(`班级总数: ${classes.length}`);
  console.log(`科目总数: ${subjects.length}`);
  console.log(`教学计划总数: ${curriculums.length}`);

  console.log('\n按年级统计班级:');
  for (const grade of CONFIG.grades) {
    const count = classes.filter(c => c.grade === grade).length;
    console.log(`  ${grade}: ${count} 个班级`);
  }

  console.log('\n按教研组统计教师:');
  for (const [group, names] of Object.entries(CONFIG.teacherGroups)) {
    console.log(`  ${group}: ${names.length} 人`);
  }

  console.log('\n按科目统计课时:');
  for (const subject of subjects) {
    const totalHours = curriculums
      .filter(c => c.subjectId === subject.id)
      .reduce((sum, c) => sum + c.hoursPerWeek, 0);
    console.log(`  ${subject.name}: ${totalHours} 课时/周`);
  }

  // 计算总课时
  const totalHours = curriculums.reduce((sum, c) => sum + c.hoursPerWeek, 0);
  const totalSlots = CONFIG.daysPerWeek * CONFIG.periodsPerDay * classes.length;
  const utilization = ((totalHours / totalSlots) * 100).toFixed(1);

  console.log(`\n总课时需求: ${totalHours} 课时/周`);
  console.log(`可用时间槽: ${totalSlots} 个`);
  console.log(`时间槽利用率: ${utilization}%`);

  console.log('\n========================================\n');
}

/**
 * 主函数
 */
async function main() {
  console.log('开始生成测试数据...\n');

  // 1. 生成基础数据
  console.log('生成教师数据...');
  const teachers = generateTeachers();

  console.log('生成班级数据...');
  const classes = generateClasses();

  console.log('生成科目配置...');
  const subjects = CONFIG.subjects;

  console.log('生成教学计划...');
  const curriculums = assignTeachersToClasses(teachers, classes);

  console.log('生成教师偏好...');
  const preferences = generateTeacherPreferences(teachers);

  // 2. 生成统计信息
  generateStatistics(teachers, classes, subjects, curriculums);

  // 3. 创建 Excel 文件
  console.log('创建 Excel 文件...');
  const workbook = await createExcelWorkbook(
    teachers,
    classes,
    subjects,
    curriculums,
    preferences
  );

  // 4. 保存文件
  const dataDir = path.join(process.cwd(), 'data');
  await fs.mkdir(dataDir, { recursive: true });

  const outputPath = path.join(dataDir, '测试数据.xlsx');
  await workbook.xlsx.writeFile(outputPath);

  console.log(`✓ 测试数据已生成: ${outputPath}`);

  // 5. 生成 JSON 格式（用于程序直接导入）
  const jsonData = {
    teachers,
    classes,
    subjects,
    curriculums,
    preferences,
    config: {
      daysPerWeek: CONFIG.daysPerWeek,
      periodsPerDay: CONFIG.periodsPerDay,
    },
  };

  const jsonPath = path.join(dataDir, '测试数据.json');
  await fs.writeFile(jsonPath, JSON.stringify(jsonData, null, 2), 'utf-8');

  console.log(`✓ JSON 数据已生成: ${jsonPath}`);

  console.log('\n测试数据生成完成！');
  console.log('\n使用方法:');
  console.log('  1. Excel 文件: 可以在系统中通过"导入导出"功能导入');
  console.log('  2. JSON 文件: 可以在测试代码中直接使用');
}

// 运行主函数
main().catch((error) => {
  console.error('生成测试数据失败:', error);
  process.exit(1);
});
