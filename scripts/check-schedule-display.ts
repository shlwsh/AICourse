/**
 * 检查课表显示数据
 * 验证班级视图、教师视图、场地视图的数据是否正确
 */

const API_BASE = 'http://localhost:3000/api';

interface ScheduleEntry {
  classId: number;
  subjectId: string;
  teacherId: number;
  timeSlot: { day: number; period: number };
  isFixed: boolean;
  weekType: string;
}

interface Schedule {
  entries: ScheduleEntry[];
  cost: number;
  metadata: any;
}

async function fetchData(endpoint: string) {
  const response = await fetch(`${API_BASE}${endpoint}`);
  const data = await response.json();
  return data;
}

async function main() {
  console.log('='.repeat(60));
  console.log('课表显示数据检查');
  console.log('='.repeat(60));
  console.log('');

  // 1. 获取课表数据
  console.log('1. 获取课表数据...');
  const scheduleRes = await fetchData('/schedule/active');
  if (!scheduleRes.success) {
    console.error('❌ 获取课表失败:', scheduleRes.message);
    return;
  }
  const schedule: Schedule = scheduleRes.data;
  console.log(`✓ 课表条目数: ${schedule.entries.length}`);
  console.log('');

  // 2. 获取基础数据
  console.log('2. 获取基础数据...');
  const [teachersRes, classesRes, subjectsRes, venuesRes] = await Promise.all([
    fetchData('/data/teachers'),
    fetchData('/data/classes'),
    fetchData('/data/subjects'),
    fetchData('/data/venues'),
  ]);

  const teachers = teachersRes.data || [];
  const classes = classesRes.data || [];
  const subjects = subjectsRes.data || [];
  const venues = venuesRes.data || [];

  console.log(`✓ 教师数: ${teachers.length}`);
  console.log(`✓ 班级数: ${classes.length}`);
  console.log(`✓ 科目数: ${subjects.length}`);
  console.log(`✓ 场地数: ${venues.length}`);
  console.log('');

  // 3. 分析班级视图
  console.log('3. 班级视图分析');
  console.log('-'.repeat(60));
  const classIds = new Set(schedule.entries.map(e => e.classId));
  console.log(`班级数量: ${classIds.size}`);
  classIds.forEach(id => {
    const cls = classes.find((c: any) => c.id === id);
    const entryCount = schedule.entries.filter(e => e.classId === id).length;
    console.log(`  - ${cls?.name || `班级${id}`}: ${entryCount} 个课程`);
  });
  console.log('');

  // 4. 分析教师视图
  console.log('4. 教师视图分析');
  console.log('-'.repeat(60));
  const teacherIds = new Set(schedule.entries.map(e => e.teacherId));
  console.log(`教师数量: ${teacherIds.size}`);
  teacherIds.forEach(id => {
    const teacher = teachers.find((t: any) => t.id === id);
    const entryCount = schedule.entries.filter(e => e.teacherId === id).length;
    console.log(`  - ${teacher?.name || `教师${id}`}: ${entryCount} 个课程`);
  });
  console.log('');

  // 5. 分析场地视图
  console.log('5. 场地视图分析');
  console.log('-'.repeat(60));

  // 创建科目到场地的映射
  const subjectVenueMap = new Map<string, string>();
  subjects.forEach((s: any) => {
    if (s.venue_id) {
      subjectVenueMap.set(s.id, s.venue_id);
    }
  });

  console.log(`配置了场地的科目数: ${subjectVenueMap.size}`);
  subjectVenueMap.forEach((venueId, subjectId) => {
    const subject = subjects.find((s: any) => s.id === subjectId);
    const venue = venues.find((v: any) => v.id === venueId);
    console.log(`  - ${subject?.name || subjectId} → ${venue?.name || venueId}`);
  });
  console.log('');

  // 统计每个场地的课程数
  const venueEntryCount = new Map<string, number>();
  schedule.entries.forEach(entry => {
    const venueId = subjectVenueMap.get(entry.subjectId);
    if (venueId) {
      venueEntryCount.set(venueId, (venueEntryCount.get(venueId) || 0) + 1);
    }
  });

  console.log('场地课程统计:');
  if (venueEntryCount.size === 0) {
    console.log('  ⚠️  没有课程使用场地（科目未配置场地或课表中没有这些科目）');
  } else {
    venueEntryCount.forEach((count, venueId) => {
      const venue = venues.find((v: any) => v.id === venueId);
      console.log(`  - ${venue?.name || venueId}: ${count} 个课程`);
    });
  }
  console.log('');

  // 6. 检查数据完整性
  console.log('6. 数据完整性检查');
  console.log('-'.repeat(60));

  let missingTeachers = 0;
  let missingClasses = 0;
  let missingSubjects = 0;

  schedule.entries.forEach(entry => {
    if (!teachers.find((t: any) => t.id === entry.teacherId)) {
      missingTeachers++;
    }
    if (!classes.find((c: any) => c.id === entry.classId)) {
      missingClasses++;
    }
    if (!subjects.find((s: any) => s.id === entry.subjectId)) {
      missingSubjects++;
    }
  });

  if (missingTeachers === 0 && missingClasses === 0 && missingSubjects === 0) {
    console.log('✓ 所有课表条目的数据都完整');
  } else {
    if (missingTeachers > 0) {
      console.log(`❌ 缺失教师数据: ${missingTeachers} 个条目`);
    }
    if (missingClasses > 0) {
      console.log(`❌ 缺失班级数据: ${missingClasses} 个条目`);
    }
    if (missingSubjects > 0) {
      console.log(`❌ 缺失科目数据: ${missingSubjects} 个条目`);
    }
  }
  console.log('');

  console.log('='.repeat(60));
  console.log('检查完成');
  console.log('='.repeat(60));
}

main().catch(console.error);
