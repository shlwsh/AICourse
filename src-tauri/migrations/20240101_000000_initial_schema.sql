-- ============================================
-- 迁移脚本：初始数据库模式
-- 版本：1.0.0
-- 创建日期：2024-01-01
-- 作者：排课系统开发团队
-- 描述：创建排课系统的初始数据库模式，包括所有核心表和索引
-- ============================================

BEGIN TRANSACTION;

-- ============================================
-- 1. 迁移版本管理表
-- ============================================

CREATE TABLE IF NOT EXISTS schema_migrations (
    version TEXT PRIMARY KEY,
    applied_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ============================================
-- 2. 教研组表
-- ============================================

CREATE TABLE IF NOT EXISTS teaching_groups (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    description TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ============================================
-- 3. 教师信息表
-- ============================================

CREATE TABLE IF NOT EXISTS teachers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    teaching_group_id INTEGER,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (teaching_group_id) REFERENCES teaching_groups(id)
);

-- ============================================
-- 4. 教师偏好表
-- ============================================

CREATE TABLE IF NOT EXISTS teacher_preferences (
    teacher_id INTEGER PRIMARY KEY,
    preferred_slots TEXT NOT NULL,  -- JSON: u64 位掩码
    time_bias INTEGER NOT NULL DEFAULT 0,  -- 0=无偏好, 1=厌恶早课, 2=厌恶晚课
    weight INTEGER NOT NULL DEFAULT 1,
    blocked_slots TEXT NOT NULL,    -- JSON: u64 位掩码
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (teacher_id) REFERENCES teachers(id) ON DELETE CASCADE,
    CHECK (time_bias >= 0 AND time_bias <= 2),
    CHECK (weight >= 0)
);

-- ============================================
-- 5. 场地表
-- ============================================

CREATE TABLE IF NOT EXISTS venues (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    capacity INTEGER NOT NULL,  -- 同时容纳的班级数
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    CHECK (capacity > 0)
);

-- ============================================
-- 6. 科目配置表
-- ============================================

CREATE TABLE IF NOT EXISTS subject_configs (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    forbidden_slots TEXT NOT NULL,  -- JSON: u64 位掩码
    allow_double_session INTEGER NOT NULL DEFAULT 1,  -- 是否允许连堂
    venue_id TEXT,
    is_major_subject INTEGER NOT NULL DEFAULT 0,  -- 是否主科
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (venue_id) REFERENCES venues(id),
    CHECK (allow_double_session IN (0, 1)),
    CHECK (is_major_subject IN (0, 1))
);

-- ============================================
-- 7. 班级表
-- ============================================

CREATE TABLE IF NOT EXISTS classes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    grade_level INTEGER,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ============================================
-- 8. 教学计划表
-- ============================================

CREATE TABLE IF NOT EXISTS class_curriculums (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    class_id INTEGER NOT NULL,
    subject_id TEXT NOT NULL,
    teacher_id INTEGER NOT NULL,
    target_sessions INTEGER NOT NULL,  -- 目标课时数
    is_combined_class INTEGER NOT NULL DEFAULT 0,  -- 是否合班课
    combined_class_ids TEXT,  -- JSON: [u32]
    week_type TEXT NOT NULL DEFAULT 'Every',  -- 'Every', 'Odd', 'Even'
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE CASCADE,
    FOREIGN KEY (subject_id) REFERENCES subject_configs(id),
    FOREIGN KEY (teacher_id) REFERENCES teachers(id),
    CHECK (target_sessions > 0),
    CHECK (is_combined_class IN (0, 1)),
    CHECK (week_type IN ('Every', 'Odd', 'Even'))
);

-- ============================================
-- 9. 固定课程表
-- ============================================

CREATE TABLE IF NOT EXISTS fixed_courses (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    class_id INTEGER NOT NULL,
    subject_id TEXT NOT NULL,
    teacher_id INTEGER NOT NULL,
    day INTEGER NOT NULL,  -- 0-29（支持1-30天周期）
    period INTEGER NOT NULL,  -- 0-11（支持1-12节）
    is_pre_arranged INTEGER NOT NULL DEFAULT 0,  -- 是否为预排课程
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE CASCADE,
    FOREIGN KEY (subject_id) REFERENCES subject_configs(id),
    FOREIGN KEY (teacher_id) REFERENCES teachers(id),
    CHECK (day >= 0 AND day <= 29),
    CHECK (period >= 0 AND period <= 11),
    CHECK (is_pre_arranged IN (0, 1))
);

-- ============================================
-- 10. 教师互斥关系表
-- ============================================

CREATE TABLE IF NOT EXISTS teacher_mutual_exclusions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    teacher_a_id INTEGER NOT NULL,
    teacher_b_id INTEGER NOT NULL,
    scope_type TEXT NOT NULL,  -- 'AllTime' or 'SpecificSlots'
    specific_slots TEXT,       -- JSON: u64 位掩码（仅当 scope_type='SpecificSlots'）
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (teacher_a_id) REFERENCES teachers(id) ON DELETE CASCADE,
    FOREIGN KEY (teacher_b_id) REFERENCES teachers(id) ON DELETE CASCADE,
    CHECK (scope_type IN ('AllTime', 'SpecificSlots')),
    CHECK (teacher_a_id != teacher_b_id)
);

-- ============================================
-- 11. 课表表
-- ============================================

CREATE TABLE IF NOT EXISTS schedules (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    version INTEGER NOT NULL,
    cycle_days INTEGER NOT NULL,  -- 排课周期天数（1-30）
    periods_per_day INTEGER NOT NULL,  -- 每天节次数（1-12）
    cost INTEGER NOT NULL,  -- 代价值
    is_active INTEGER NOT NULL DEFAULT 1,  -- 是否为活动课表
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    CHECK (cycle_days >= 1 AND cycle_days <= 30),
    CHECK (periods_per_day >= 1 AND periods_per_day <= 12),
    CHECK (cost >= 0),
    CHECK (is_active IN (0, 1))
);

-- ============================================
-- 12. 课表条目表
-- ============================================

CREATE TABLE IF NOT EXISTS schedule_entries (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    schedule_id INTEGER NOT NULL,
    class_id INTEGER NOT NULL,
    subject_id TEXT NOT NULL,
    teacher_id INTEGER NOT NULL,
    day INTEGER NOT NULL,
    period INTEGER NOT NULL,
    is_fixed INTEGER NOT NULL DEFAULT 0,  -- 是否固定课程
    week_type TEXT NOT NULL DEFAULT 'Every',  -- 'Every', 'Odd', 'Even'
    FOREIGN KEY (schedule_id) REFERENCES schedules(id) ON DELETE CASCADE,
    FOREIGN KEY (class_id) REFERENCES classes(id),
    FOREIGN KEY (subject_id) REFERENCES subject_configs(id),
    FOREIGN KEY (teacher_id) REFERENCES teachers(id),
    CHECK (day >= 0 AND day <= 29),
    CHECK (period >= 0 AND period <= 11),
    CHECK (is_fixed IN (0, 1)),
    CHECK (week_type IN ('Every', 'Odd', 'Even'))
);

-- ============================================
-- 13. 临时课表表
-- ============================================

CREATE TABLE IF NOT EXISTS temporary_schedules (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    base_schedule_id INTEGER NOT NULL,
    start_date TEXT NOT NULL,
    end_date TEXT NOT NULL,
    description TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (base_schedule_id) REFERENCES schedules(id) ON DELETE CASCADE
);

-- ============================================
-- 14. 临时课表变更表
-- ============================================

CREATE TABLE IF NOT EXISTS temporary_schedule_changes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    temp_schedule_id INTEGER NOT NULL,
    original_entry_id INTEGER,
    new_class_id INTEGER,
    new_subject_id TEXT,
    new_teacher_id INTEGER,
    new_day INTEGER,
    new_period INTEGER,
    change_type TEXT NOT NULL,  -- 'Move', 'Add', 'Remove'
    FOREIGN KEY (temp_schedule_id) REFERENCES temporary_schedules(id) ON DELETE CASCADE,
    FOREIGN KEY (original_entry_id) REFERENCES schedule_entries(id),
    CHECK (change_type IN ('Move', 'Add', 'Remove'))
);

-- ============================================
-- 15. 作息时间表
-- ============================================

CREATE TABLE IF NOT EXISTS schedule_times (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    period INTEGER NOT NULL UNIQUE,
    start_time TEXT NOT NULL,
    end_time TEXT NOT NULL,
    break_duration INTEGER NOT NULL DEFAULT 10,  -- 课间休息分钟数
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    CHECK (period >= 0 AND period <= 11),
    CHECK (break_duration >= 0)
);

-- ============================================
-- 16. 监考表
-- ============================================

CREATE TABLE IF NOT EXISTS invigilation_schedules (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    exam_name TEXT NOT NULL,
    exam_date TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ============================================
-- 17. 监考安排表
-- ============================================

CREATE TABLE IF NOT EXISTS invigilation_assignments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    invigilation_schedule_id INTEGER NOT NULL,
    room_name TEXT NOT NULL,
    exam_time_slot TEXT NOT NULL,
    teacher_id INTEGER NOT NULL,
    class_ids TEXT NOT NULL,  -- JSON: [u32]
    FOREIGN KEY (invigilation_schedule_id) REFERENCES invigilation_schedules(id) ON DELETE CASCADE,
    FOREIGN KEY (teacher_id) REFERENCES teachers(id)
);

-- ============================================
-- 18. 操作历史表（用于撤销/重做）
-- ============================================

CREATE TABLE IF NOT EXISTS operation_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    schedule_id INTEGER NOT NULL,
    operation_type TEXT NOT NULL,  -- 'Move', 'Swap', 'Add', 'Remove'
    operation_data TEXT NOT NULL,  -- JSON
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (schedule_id) REFERENCES schedules(id) ON DELETE CASCADE,
    CHECK (operation_type IN ('Move', 'Swap', 'Add', 'Remove'))
);

-- ============================================
-- 19. 创建索引
-- ============================================

-- 教师表索引
CREATE INDEX IF NOT EXISTS idx_teachers_teaching_group
ON teachers(teaching_group_id);

-- 科目配置表索引
CREATE INDEX IF NOT EXISTS idx_subject_configs_venue
ON subject_configs(venue_id);

-- 教学计划表索引
CREATE INDEX IF NOT EXISTS idx_class_curriculums_class
ON class_curriculums(class_id);

CREATE INDEX IF NOT EXISTS idx_class_curriculums_teacher
ON class_curriculums(teacher_id);

CREATE INDEX IF NOT EXISTS idx_class_curriculums_subject
ON class_curriculums(subject_id);

-- 固定课程表索引
CREATE INDEX IF NOT EXISTS idx_fixed_courses_class
ON fixed_courses(class_id);

CREATE INDEX IF NOT EXISTS idx_fixed_courses_teacher
ON fixed_courses(teacher_id);

CREATE INDEX IF NOT EXISTS idx_fixed_courses_time
ON fixed_courses(day, period);

-- 课表条目表索引
CREATE INDEX IF NOT EXISTS idx_schedule_entries_schedule
ON schedule_entries(schedule_id);

CREATE INDEX IF NOT EXISTS idx_schedule_entries_class
ON schedule_entries(class_id);

CREATE INDEX IF NOT EXISTS idx_schedule_entries_teacher
ON schedule_entries(teacher_id);

CREATE INDEX IF NOT EXISTS idx_schedule_entries_time
ON schedule_entries(day, period);

CREATE INDEX IF NOT EXISTS idx_schedule_entries_subject
ON schedule_entries(subject_id);

-- 课表表索引
CREATE INDEX IF NOT EXISTS idx_schedules_active
ON schedules(is_active, created_at DESC);

-- 临时课表变更表索引
CREATE INDEX IF NOT EXISTS idx_temp_schedule_changes_temp_schedule
ON temporary_schedule_changes(temp_schedule_id);

-- 监考安排表索引
CREATE INDEX IF NOT EXISTS idx_invigilation_assignments_schedule
ON invigilation_assignments(invigilation_schedule_id);

CREATE INDEX IF NOT EXISTS idx_invigilation_assignments_teacher
ON invigilation_assignments(teacher_id);

-- 操作历史表索引
CREATE INDEX IF NOT EXISTS idx_operation_history_schedule
ON operation_history(schedule_id, created_at DESC);

-- ============================================
-- 20. 插入初始数据
-- ============================================

-- 插入默认教研组
INSERT OR IGNORE INTO teaching_groups (id, name, description) VALUES
    (1, '语文组', '语文学科教研组'),
    (2, '数学组', '数学学科教研组'),
    (3, '英语组', '英语学科教研组'),
    (4, '理科组', '物理、化学、生物教研组'),
    (5, '文科组', '历史、地理、政治教研组'),
    (6, '艺体组', '音乐、美术、体育教研组');

-- 插入默认作息时间（8节课制）
INSERT OR IGNORE INTO schedule_times (period, start_time, end_time, break_duration) VALUES
    (0, '08:00', '08:45', 10),  -- 第1节
    (1, '08:55', '09:40', 20),  -- 第2节（大课间）
    (2, '10:00', '10:45', 10),  -- 第3节
    (3, '10:55', '11:40', 90),  -- 第4节（午休）
    (4, '13:10', '13:55', 10),  -- 第5节
    (5, '14:05', '14:50', 10),  -- 第6节
    (6, '15:00', '15:45', 10),  -- 第7节
    (7, '15:55', '16:40', 0);   -- 第8节

-- ============================================
-- 提交事务
-- ============================================

COMMIT;

-- ============================================
-- 迁移完成
-- ============================================
