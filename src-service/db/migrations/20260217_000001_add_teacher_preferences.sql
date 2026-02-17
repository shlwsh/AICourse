-- 添加教师偏好字段
-- 创建时间: 2026-02-17

-- 为 teachers 表添加偏好相关字段
ALTER TABLE teachers ADD COLUMN preferred_slots TEXT DEFAULT NULL;
ALTER TABLE teachers ADD COLUMN time_bias INTEGER DEFAULT 0;
ALTER TABLE teachers ADD COLUMN weight REAL DEFAULT 1.0;
ALTER TABLE teachers ADD COLUMN max_hours_per_day INTEGER DEFAULT NULL;
ALTER TABLE teachers ADD COLUMN max_consecutive_hours INTEGER DEFAULT NULL;
ALTER TABLE teachers ADD COLUMN unavailable_slots TEXT DEFAULT NULL;

-- 为 schedule_entries 表添加字段
ALTER TABLE schedule_entries ADD COLUMN is_fixed INTEGER DEFAULT 0;
ALTER TABLE schedule_entries ADD COLUMN week_type TEXT DEFAULT 'Every';

-- 为 venue_configs 表添加容量字段（如果不存在）
-- 注意：venues 表已经有 capacity 字段，这里只是确保一致性

-- 创建场地配置视图（如果需要）
CREATE VIEW IF NOT EXISTS venue_configs AS
SELECT id, name, capacity
FROM venues;
