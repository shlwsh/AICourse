-- ============================================
-- 迁移脚本模板
-- 版本：[版本号，例如：1.0.0]
-- 创建日期：[YYYY-MM-DD]
-- 作者：[作者名]
-- 描述：[详细描述本次迁移的目的和内容]
-- ============================================

-- 开始事务
-- 使用事务确保迁移操作的原子性，如果任何步骤失败，所有更改都会回滚
BEGIN TRANSACTION;

-- ============================================
-- 1. 创建表
-- ============================================

-- 示例：创建新表
CREATE TABLE IF NOT EXISTS example_table (
    -- 主键：自增整数
    id INTEGER PRIMARY KEY AUTOINCREMENT,

    -- 必填字段
    name TEXT NOT NULL,

    -- 可选字段
    description TEXT,

    -- 整数字段（带默认值）
    status INTEGER NOT NULL DEFAULT 0,

    -- 外键字段
    parent_id INTEGER,

    -- JSON 字段（存储为 TEXT）
    metadata TEXT,

    -- 时间戳字段
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),

    -- 外键约束
    FOREIGN KEY (parent_id) REFERENCES parent_table(id) ON DELETE CASCADE,

    -- 检查约束
    CHECK (status >= 0 AND status <= 2)
);

-- ============================================
-- 2. 创建索引
-- ============================================

-- 单列索引
CREATE INDEX IF NOT EXISTS idx_example_table_name
ON example_table(name);

-- 复合索引
CREATE INDEX IF NOT EXISTS idx_example_table_status_created
ON example_table(status, created_at);

-- 唯一索引
CREATE UNIQUE INDEX IF NOT EXISTS idx_example_table_unique_name
ON example_table(name);

-- ============================================
-- 3. 修改表结构（如果需要）
-- ============================================

-- SQLite 不支持直接修改列，需要重建表
-- 步骤：
-- 1. 创建新表（包含修改后的结构）
-- 2. 复制数据
-- 3. 删除旧表
-- 4. 重命名新表

-- 示例：添加新列到现有表
-- 注意：SQLite 支持 ALTER TABLE ADD COLUMN，但有限制
-- ALTER TABLE existing_table ADD COLUMN new_column TEXT;

-- 示例：修改列类型或约束（需要重建表）
/*
-- 1. 创建新表
CREATE TABLE new_existing_table (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    new_column TEXT,  -- 新增列
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

-- 2. 复制数据
INSERT INTO new_existing_table (id, name, created_at, updated_at)
SELECT id, name, created_at, updated_at FROM existing_table;

-- 3. 删除旧表
DROP TABLE existing_table;

-- 4. 重命名新表
ALTER TABLE new_existing_table RENAME TO existing_table;

-- 5. 重建索引
CREATE INDEX IF NOT EXISTS idx_existing_table_name
ON existing_table(name);
*/

-- ============================================
-- 4. 插入初始数据
-- ============================================

-- 使用 INSERT OR IGNORE 避免重复插入
INSERT OR IGNORE INTO example_table (id, name, description, status)
VALUES
    (1, '示例数据1', '这是第一条示例数据', 0),
    (2, '示例数据2', '这是第二条示例数据', 1);

-- ============================================
-- 5. 更新现有数据（如果需要）
-- ============================================

-- 示例：更新特定条件的数据
-- UPDATE example_table
-- SET status = 1, updated_at = datetime('now')
-- WHERE status = 0 AND created_at < datetime('now', '-30 days');

-- ============================================
-- 6. 删除数据（谨慎使用）
-- ============================================

-- 示例：删除过期数据
-- DELETE FROM example_table
-- WHERE status = 2 AND updated_at < datetime('now', '-90 days');

-- ============================================
-- 7. 创建触发器（如果需要）
-- ============================================

-- 示例：自动更新 updated_at 字段
CREATE TRIGGER IF NOT EXISTS update_example_table_timestamp
AFTER UPDATE ON example_table
FOR EACH ROW
BEGIN
    UPDATE example_table
    SET updated_at = datetime('now')
    WHERE id = NEW.id;
END;

-- ============================================
-- 8. 创建视图（如果需要）
-- ============================================

-- 示例：创建常用查询的视图
CREATE VIEW IF NOT EXISTS v_active_examples AS
SELECT
    id,
    name,
    description,
    status,
    created_at
FROM example_table
WHERE status = 1;

-- ============================================
-- 9. 记录迁移版本
-- ============================================

-- 确保 schema_migrations 表存在
CREATE TABLE IF NOT EXISTS schema_migrations (
    version TEXT PRIMARY KEY,
    applied_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- 记录本次迁移（使用文件名作为版本号）
-- 注意：实际执行时，迁移工具会自动处理这一步
-- INSERT OR IGNORE INTO schema_migrations (version)
-- VALUES ('YYYYMMDD_HHMMSS_description');

-- ============================================
-- 提交事务
-- ============================================

COMMIT;

-- ============================================
-- 迁移完成
-- ============================================

-- 验证步骤（可选，用于手动测试）
-- SELECT COUNT(*) FROM example_table;
-- SELECT * FROM schema_migrations ORDER BY applied_at DESC LIMIT 1;

-- ============================================
-- 回滚脚本（可选，单独文件）
-- ============================================

-- 如果需要回滚此迁移，创建对应的回滚脚本：
-- YYYYMMDD_HHMMSS_description_rollback.sql

/*
BEGIN TRANSACTION;

-- 删除创建的表
DROP TABLE IF EXISTS example_table;

-- 删除创建的索引
-- DROP INDEX IF EXISTS idx_example_table_name;

-- 删除创建的触发器
DROP TRIGGER IF EXISTS update_example_table_timestamp;

-- 删除创建的视图
DROP VIEW IF EXISTS v_active_examples;

-- 从迁移记录中删除版本
DELETE FROM schema_migrations
WHERE version = 'YYYYMMDD_HHMMSS_description';

COMMIT;
*/

-- ============================================
-- 注意事项
-- ============================================

-- 1. 始终在事务中执行迁移操作
-- 2. 使用 IF NOT EXISTS 避免重复创建
-- 3. 使用 INSERT OR IGNORE 避免重复插入
-- 4. 添加详细的注释说明每个步骤
-- 5. 在测试环境先验证迁移脚本
-- 6. 执行前备份数据库
-- 7. 记录迁移的执行时间和结果
-- 8. 为复杂迁移准备回滚脚本
