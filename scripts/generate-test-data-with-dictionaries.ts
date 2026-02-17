/**
 * 生成包含所有字典的测试数据文件
 * 包括：教师、班级、科目、教学计划、教研组、年级、场地
 */
import ExcelJS from 'exceljs';
import path from 'path';

async function generateTestData() {
  const workbook = new ExcelJS.Workbook();

  // 1. 教师信息工作表
  const teacherSheet = workbook.addWorksheet('教师信息');
  teacherSheet.columns = [
    { header: '教师ID', key: 'id', width: 10 },
    { header: '姓名', key: 'name', width: 15 },
    { header: '教研组', key: 'teachingGroup', width: 15 },
  ];

  const teachers = [
    { id: 1, name: '张老师', teachingGroup: '语文组' },
    { id: 2, name: '李老师', teachingGroup: '数学组' },
    { id: 3, name: '王老师', teachingGroup: '英语组' },
    { id: 4, name: '赵老师', teachingGroup: '物理组' },
    { id: 5, name: '刘老师', teachingGroup: '化学组' },
    { id: 6, name: '陈老师', teachingGroup: '生物组' },
    { id: 7, name: '杨老师', teachingGroup: '历史组' },
    { id: 8, name: '周老师', teachingGroup: '地理组' },
    { id: 9, name: '吴老师', teachingGroup: '政治组' },
    { id: 10, name: '郑老师', teachingGroup: '体育组' },
  ];

  teachers.forEach(teacher => teacherSheet.addRow(teacher));

  // 2. 班级信息工作表
  const classSheet = workbook.addWorksheet('班级信息');
  classSheet.columns = [
    { header: '班级ID', key: 'id', width: 10 },
    { header: '班级名称', key: 'name', width: 15 },
    { header: '年级', key: 'grade', width: 10 },
    { header: '学生人数', key: 'studentCount', width: 12 },
  ];

  const classes = [
    { id: 1, name: '高一1班', grade: '高一', studentCount: 45 },
    { id: 2, name: '高一2班', grade: '高一', studentCount: 46 },
    { id: 3, name: '高一3班', grade: '高一', studentCount: 44 },
    { id: 4, name: '高二1班', grade: '高二', studentCount: 43 },
    { id: 5, name: '高二2班', grade: '高二', studentCount: 45 },
    { id: 6, name: '高二3班', grade: '高二', studentCount: 44 },
    { id: 7, name: '高三1班', grade: '高三', studentCount: 42 },
    { id: 8, name: '高三2班', grade: '高三', studentCount: 43 },
    { id: 9, name: '高三3班', grade: '高三', studentCount: 41 },
  ];

  classes.forEach(cls => classSheet.addRow(cls));

  // 3. 科目配置工作表
  const subjectSheet = workbook.addWorksheet('科目配置');
  subjectSheet.columns = [
    { header: '科目ID', key: 'id', width: 12 },
    { header: '科目名称', key: 'name', width: 15 },
    { header: '是否主科', key: 'isMajorSubject', width: 12 },
    { header: '允许连堂', key: 'allowDoubleSession', width: 12 },
    { header: '关联场地ID', key: 'venueId', width: 15 },
    { header: '禁止时段', key: 'forbiddenSlots', width: 15 },
  ];

  const subjects = [
    { id: 'chinese', name: '语文', isMajorSubject: '是', allowDoubleSession: '是', venueId: '', forbiddenSlots: '0' },
    { id: 'math', name: '数学', isMajorSubject: '是', allowDoubleSession: '是', venueId: '', forbiddenSlots: '0' },
    { id: 'english', name: '英语', isMajorSubject: '是', allowDoubleSession: '是', venueId: '', forbiddenSlots: '0' },
    { id: 'physics', name: '物理', isMajorSubject: '否', allowDoubleSession: '是', venueId: 'lab-physics', forbiddenSlots: '0' },
    { id: 'chemistry', name: '化学', isMajorSubject: '否', allowDoubleSession: '是', venueId: 'lab-chemistry', forbiddenSlots: '0' },
    { id: 'biology', name: '生物', isMajorSubject: '否', allowDoubleSession: '否', venueId: 'lab-biology', forbiddenSlots: '0' },
    { id: 'history', name: '历史', isMajorSubject: '否', allowDoubleSession: '否', venueId: '', forbiddenSlots: '0' },
    { id: 'geography', name: '地理', isMajorSubject: '否', allowDoubleSession: '否', venueId: '', forbiddenSlots: '0' },
    { id: 'politics', name: '政治', isMajorSubject: '否', allowDoubleSession: '否', venueId: '', forbiddenSlots: '0' },
    { id: 'pe', name: '体育', isMajorSubject: '否', allowDoubleSession: '否', venueId: 'gym', forbiddenSlots: '0' },
  ];

  subjects.forEach(subject => subjectSheet.addRow(subject));

  // 4. 教学计划工作表
  const curriculumSheet = workbook.addWorksheet('教学计划');
  curriculumSheet.columns = [
    { header: '班级ID', key: 'classId', width: 10 },
    { header: '班级名称', key: 'className', width: 15 },
    { header: '科目ID', key: 'subjectId', width: 10 },
    { header: '科目名称', key: 'subjectName', width: 15 },
    { header: '教师ID', key: 'teacherId', width: 10 },
    { header: '教师姓名', key: 'teacherName', width: 15 },
    { header: '周课时数', key: 'hoursPerWeek', width: 12 },
  ];

  const curriculums = [
    // 高一1班
    { classId: 1, className: '高一1班', subjectId: 'chinese', subjectName: '语文', teacherId: 1, teacherName: '张老师', hoursPerWeek: 5 },
    { classId: 1, className: '高一1班', subjectId: 'math', subjectName: '数学', teacherId: 2, teacherName: '李老师', hoursPerWeek: 5 },
    { classId: 1, className: '高一1班', subjectId: 'english', subjectName: '英语', teacherId: 3, teacherName: '王老师', hoursPerWeek: 5 },
    { classId: 1, className: '高一1班', subjectId: 'physics', subjectName: '物理', teacherId: 4, teacherName: '赵老师', hoursPerWeek: 4 },
    { classId: 1, className: '高一1班', subjectId: 'chemistry', subjectName: '化学', teacherId: 5, teacherName: '刘老师', hoursPerWeek: 4 },
    // 高一2班
    { classId: 2, className: '高一2班', subjectId: 'chinese', subjectName: '语文', teacherId: 1, teacherName: '张老师', hoursPerWeek: 5 },
    { classId: 2, className: '高一2班', subjectId: 'math', subjectName: '数学', teacherId: 2, teacherName: '李老师', hoursPerWeek: 5 },
    { classId: 2, className: '高一2班', subjectId: 'english', subjectName: '英语', teacherId: 3, teacherName: '王老师', hoursPerWeek: 5 },
    { classId: 2, className: '高一2班', subjectId: 'biology', subjectName: '生物', teacherId: 6, teacherName: '陈老师', hoursPerWeek: 3 },
    { classId: 2, className: '高一2班', subjectId: 'history', subjectName: '历史', teacherId: 7, teacherName: '杨老师', hoursPerWeek: 3 },
    // 高二1班
    { classId: 4, className: '高二1班', subjectId: 'chinese', subjectName: '语文', teacherId: 1, teacherName: '张老师', hoursPerWeek: 5 },
    { classId: 4, className: '高二1班', subjectId: 'math', subjectName: '数学', teacherId: 2, teacherName: '李老师', hoursPerWeek: 5 },
    { classId: 4, className: '高二1班', subjectId: 'english', subjectName: '英语', teacherId: 3, teacherName: '王老师', hoursPerWeek: 5 },
    { classId: 4, className: '高二1班', subjectId: 'geography', subjectName: '地理', teacherId: 8, teacherName: '周老师', hoursPerWeek: 3 },
    { classId: 4, className: '高二1班', subjectId: 'politics', subjectName: '政治', teacherId: 9, teacherName: '吴老师', hoursPerWeek: 3 },
  ];

  curriculums.forEach(curriculum => curriculumSheet.addRow(curriculum));

  // 5. 教研组工作表
  const teachingGroupSheet = workbook.addWorksheet('教研组');
  teachingGroupSheet.columns = [
    { header: '教研组ID', key: 'id', width: 12 },
    { header: '名称', key: 'name', width: 15 },
    { header: '描述', key: 'description', width: 30 },
  ];

  const teachingGroups = [
    { id: 1, name: '语文组', description: '负责语文学科教学研究' },
    { id: 2, name: '数学组', description: '负责数学学科教学研究' },
    { id: 3, name: '英语组', description: '负责英语学科教学研究' },
    { id: 4, name: '物理组', description: '负责物理学科教学研究' },
    { id: 5, name: '化学组', description: '负责化学学科教学研究' },
    { id: 6, name: '生物组', description: '负责生物学科教学研究' },
    { id: 7, name: '历史组', description: '负责历史学科教学研究' },
    { id: 8, name: '地理组', description: '负责地理学科教学研究' },
    { id: 9, name: '政治组', description: '负责政治学科教学研究' },
    { id: 10, name: '体育组', description: '负责体育学科教学研究' },
  ];

  teachingGroups.forEach(group => teachingGroupSheet.addRow(group));

  // 6. 年级工作表
  const gradeSheet = workbook.addWorksheet('年级');
  gradeSheet.columns = [
    { header: '年级ID', key: 'id', width: 10 },
    { header: '名称', key: 'name', width: 15 },
    { header: '排序', key: 'order', width: 10 },
  ];

  const grades = [
    { id: 1, name: '高一', order: 1 },
    { id: 2, name: '高二', order: 2 },
    { id: 3, name: '高三', order: 3 },
  ];

  grades.forEach(grade => gradeSheet.addRow(grade));

  // 7. 场地工作表
  const venueSheet = workbook.addWorksheet('场地');
  venueSheet.columns = [
    { header: '场地ID', key: 'id', width: 15 },
    { header: '场地名称', key: 'name', width: 20 },
    { header: '类型', key: 'type', width: 15 },
    { header: '容量', key: 'capacity', width: 12 },
  ];

  const venues = [
    { id: 'classroom-a101', name: '教学楼A101', type: '普通教室', capacity: 1 },
    { id: 'classroom-a102', name: '教学楼A102', type: '普通教室', capacity: 1 },
    { id: 'classroom-a103', name: '教学楼A103', type: '普通教室', capacity: 1 },
    { id: 'lab-physics', name: '实验楼B201', type: '物理实验室', capacity: 1 },
    { id: 'lab-chemistry', name: '实验楼B202', type: '化学实验室', capacity: 1 },
    { id: 'lab-biology', name: '实验楼B203', type: '生物实验室', capacity: 1 },
    { id: 'multimedia-c301', name: '多媒体楼C301', type: '多媒体教室', capacity: 1 },
    { id: 'multimedia-c302', name: '多媒体楼C302', type: '多媒体教室', capacity: 1 },
    { id: 'gym', name: '体育馆', type: '体育场馆', capacity: 2 },
    { id: 'playground', name: '操场', type: '体育场馆', capacity: 5 },
  ];

  venues.forEach(venue => venueSheet.addRow(venue));

  // 8. 教师偏好工作表（Rust 后端需要）
  const teacherPreferenceSheet = workbook.addWorksheet('教师偏好');
  teacherPreferenceSheet.columns = [
    { header: '教师姓名', key: 'teacherName', width: 15 },
    { header: '偏好时段', key: 'preferredSlots', width: 30 },
    { header: '早晚偏好', key: 'timeBias', width: 12 },
    { header: '权重系数', key: 'weight', width: 12 },
    { header: '不排课时段', key: 'blockedSlots', width: 30 },
  ];

  // 添加一些示例教师偏好
  const teacherPreferences = [
    { teacherName: '张老师', preferredSlots: '', timeBias: 0, weight: 1, blockedSlots: '' },
    { teacherName: '李老师', preferredSlots: '', timeBias: 0, weight: 1, blockedSlots: '' },
    { teacherName: '王老师', preferredSlots: '', timeBias: 0, weight: 1, blockedSlots: '' },
  ];

  teacherPreferences.forEach(pref => teacherPreferenceSheet.addRow(pref));

  // 保存文件
  const outputPath = path.resolve(process.cwd(), 'data/测试数据.xlsx');
  await workbook.xlsx.writeFile(outputPath);

  console.log('✓ 测试数据文件生成成功:', outputPath);
  console.log('  - 教师信息:', teachers.length, '条');
  console.log('  - 班级信息:', classes.length, '条');
  console.log('  - 科目配置:', subjects.length, '条');
  console.log('  - 教学计划:', curriculums.length, '条');
  console.log('  - 教研组:', teachingGroups.length, '条');
  console.log('  - 年级:', grades.length, '条');
  console.log('  - 场地:', venues.length, '条');
  console.log('  - 教师偏好:', teacherPreferences.length, '条');
  console.log('  总计:', teachers.length + classes.length + subjects.length + curriculums.length + teachingGroups.length + grades.length + venues.length + teacherPreferences.length, '条记录');
}

// 执行生成
generateTestData().catch(error => {
  console.error('生成测试数据失败:', error);
  process.exit(1);
});
