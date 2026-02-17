-- 初始数据库表结构
-- 创建时间: 2024-01-01

-- 教研组表
CREATE TABLE IF NOT EXISTS teaching_groups (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 教师表
CREATE TABLE IF NOT EXISTS teachers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  teaching_group_id INTEGER,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (teaching_group_id) REFERENCES teaching_groups(id)
);

-- 班级表
CREATE TABLE IF NOT EXISTS classes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE,
  grade_level TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 场地表
CREATE TABLE IF NOT EXISTS venues (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  capacity INTEGER DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 科目配置表
CREATE TABLE IF NOT EXISTS subject_configs (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  forbidden_slots TEXT DEFAULT '0',
  allow_double_session INTEGER DEFAULT 1,
  venue_id TEXT,
  is_major_subject INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (venue_id) REFERENCES venues(id)
);

-- 教学计划表
CREATE TABLE IF NOT EXISTS class_curriculums (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  class_id INTEGER NOT NULL,
  subject_id TEXT NOT NULL,
  teacher_id INTEGER NOT NULL,
  target_sessions INTEGER NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (class_id) REFERENCES classes(id),
  FOREIGN KEY (subject_id) REFERENCES subject_configs(id),
  FOREIGN KEY (teacher_id) REFERENCES teachers(id)
);

-- 固定课程表
CREATE TABLE IF NOT EXISTS fixed_courses (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  class_id INTEGER NOT NULL,
  subject_id TEXT NOT NULL,
  teacher_id INTEGER NOT NULL,
  day INTEGER NOT NULL,
  period INTEGER NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (class_id) REFERENCES classes(id),
  FOREIGN KEY (subject_id) REFERENCES subject_configs(id),
  FOREIGN KEY (teacher_id) REFERENCES teachers(id)
);

-- 课表条目表
CREATE TABLE IF NOT EXISTS schedule_entries (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  class_id INTEGER NOT NULL,
  subject_id TEXT NOT NULL,
  teacher_id INTEGER NOT NULL,
  day INTEGER NOT NULL,
  period INTEGER NOT NULL,
  venue_id TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (class_id) REFERENCES classes(id),
  FOREIGN KEY (subject_id) REFERENCES subject_configs(id),
  FOREIGN KEY (teacher_id) REFERENCES teachers(id),
  FOREIGN KEY (venue_id) REFERENCES venues(id)
);

-- 监考安排表
CREATE TABLE IF NOT EXISTS invigilation_assignments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  teacher_id INTEGER NOT NULL,
  exam_name TEXT NOT NULL,
  exam_date DATE NOT NULL,
  exam_time TEXT NOT NULL,
  venue_id TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (teacher_id) REFERENCES teachers(id),
  FOREIGN KEY (venue_id) REFERENCES venues(id)
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_teachers_teaching_group ON teachers(teaching_group_id);
CREATE INDEX IF NOT EXISTS idx_class_curriculums_class ON class_curriculums(class_id);
CREATE INDEX IF NOT EXISTS idx_class_curriculums_teacher ON class_curriculums(teacher_id);
CREATE INDEX IF NOT EXISTS idx_class_curriculums_subject ON class_curriculums(subject_id);
CREATE INDEX IF NOT EXISTS idx_fixed_courses_class ON fixed_courses(class_id);
CREATE INDEX IF NOT EXISTS idx_fixed_courses_teacher ON fixed_courses(teacher_id);
CREATE INDEX IF NOT EXISTS idx_fixed_courses_time ON fixed_courses(day, period);
CREATE INDEX IF NOT EXISTS idx_schedule_entries_class ON schedule_entries(class_id);
CREATE INDEX IF NOT EXISTS idx_schedule_entries_teacher ON schedule_entries(teacher_id);
CREATE INDEX IF NOT EXISTS idx_schedule_entries_time ON schedule_entries(day, period);
CREATE INDEX IF NOT EXISTS idx_schedule_entries_subject ON schedule_entries(subject_id);
CREATE INDEX IF NOT EXISTS idx_invigilation_assignments_teacher ON invigilation_assignments(teacher_id);
CREATE INDEX IF NOT EXISTS idx_invigilation_assignments_date ON invigilation_assignments(exam_date);
