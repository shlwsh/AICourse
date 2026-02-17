/**
 * 验证教师名称显示
 */

const API_BASE = 'http://localhost:3000/api';

async function fetchData(endpoint: string) {
  const response = await fetch(`${API_BASE}${endpoint}`);
  const data = await response.json();
  return data;
}

async function main() {
  console.log('验证教师名称显示');
  console.log('='.repeat(60));

  // 获取教师数据
  const teachersRes = await fetchData('/data/teachers');
  const teachers = teachersRes.data || [];

  console.log(`\n教师列表（共 ${teachers.length} 个）：`);
  teachers.forEach((t: any) => {
    console.log(`  ID: ${t.id}, 姓名: ${t.name}`);
  });

  // 获取课表数据
  const scheduleRes = await fetchData('/schedule/active');
  const schedule = scheduleRes.data;

  // 提取课表中的教师ID
  const teacherIds = new Set(schedule.entries.map((e: any) => e.teacherId));

  console.log(`\n课表中的教师（共 ${teacherIds.size} 个）：`);
  teacherIds.forEach((id: any) => {
    const teacher = teachers.find((t: any) => t.id === id);
    if (teacher) {
      console.log(`  ID: ${id}, 姓名: ${teacher.name}`);
    } else {
      console.log(`  ID: ${id}, ❌ 未找到教师数据`);
    }
  });

  // 获取科目数据
  const subjectsRes = await fetchData('/data/subjects');
  const subjects = subjectsRes.data || [];

  console.log(`\n科目列表（共 ${subjects.length} 个）：`);
  subjects.forEach((s: any) => {
    console.log(`  ID: ${s.id}, 名称: ${s.name}`);
  });

  // 提取课表中的科目ID
  const subjectIds = new Set(schedule.entries.map((e: any) => e.subjectId));

  console.log(`\n课表中的科目（共 ${subjectIds.size} 个）：`);
  subjectIds.forEach((id: any) => {
    const subject = subjects.find((s: any) => s.id === id);
    if (subject) {
      console.log(`  ID: ${id}, 名称: ${subject.name}`);
    } else {
      console.log(`  ID: ${id}, ❌ 未找到科目数据`);
    }
  });

  console.log('\n' + '='.repeat(60));
}

main().catch(console.error);
