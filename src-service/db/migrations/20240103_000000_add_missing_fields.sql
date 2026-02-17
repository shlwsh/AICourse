-- 添加缺失的字段
-- 创建时间: 2024-01-03

-- 为场地表添加类型字段
ALTER TABLE venues ADD COLUMN type TEXT;

-- 为班级表添加学生人数字段
ALTER TABLE classes ADD COLUMN student_count INTEGER;
