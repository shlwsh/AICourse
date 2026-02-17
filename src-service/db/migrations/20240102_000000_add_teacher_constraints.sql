-- 添加教师约束字段
-- 创建时间: 2024-01-02

-- 为教师表添加约束字段
ALTER TABLE teachers ADD COLUMN max_hours_per_day INTEGER;
ALTER TABLE teachers ADD COLUMN max_consecutive_hours INTEGER;
ALTER TABLE teachers ADD COLUMN unavailable_slots TEXT;
