-- 添加课表条目的固定课程和周类型字段
-- 迁移时间: 2024-01-04

-- 添加 is_fixed 字段（是否固定课程）
ALTER TABLE schedule_entries ADD COLUMN is_fixed INTEGER DEFAULT 0;

-- 添加 week_type 字段（单双周标记）
ALTER TABLE schedule_entries ADD COLUMN week_type TEXT DEFAULT 'Every';

-- 创建索引以提高查询性能
CREATE INDEX IF NOT EXISTS idx_schedule_entries_is_fixed ON schedule_entries(is_fixed);
CREATE INDEX IF NOT EXISTS idx_schedule_entries_week_type ON schedule_entries(week_type);
