# 数据库迁移脚本

## 简介

本目录包含排课系统的数据库迁移脚本。迁移脚本用于创建和更新数据库模式，确保数据库结构与应用程序版本保持一致。

## 目录结构

```
migrations/
├── README.md           # 本文档
├── template.sql        # 迁移脚本模板
└── YYYYMMDD_HHMMSS_description.sql  # 实际迁移脚本
```

## 迁移脚本命名规范

迁移脚本文件名格式：`YYYYMMDD_HHMMSS_description.sql`

- `YYYYMMDD`：日期（年月日）
- `HHMMSS`：时间（时分秒）
- `description`：简短的描述（使用下划线分隔单词）

**示例**：
- `20240101_120000_initial_schema.sql` - 初始数据库模式
- `20240115_143000_add_venue_table.sql` - 添加场地表
- `20240201_090000_add_teacher_mutual_exclusion.sql` - 添加教师互斥关系表

## 迁移脚本编写规范

### 1. 基本结构

每个迁移脚本应包含以下部分：

```sql
-- ============================================
-- 迁移脚本：[描述]
-- 版本：[版本号]
-- 创建日期：[YYYY-MM-DD]
-- 作者：[作者名]
-- 描述：[详细描述]
-- ============================================

-- 开始事务
BEGIN TRANSACTION;

-- 迁移操作
-- ...

-- 提交事务
COMMIT;
```

### 2. 创建表

```sql
-- 创建表时使用 IF NOT EXISTS 避免重复创建
CREATE TABLE IF NOT EXISTS table_name (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
```

### 3. 创建索引

```sql
-- 创建索引时使用 IF NOT EXISTS
CREATE INDEX IF NOT EXISTS idx_table_column
ON table_name(column_name);
```

### 4. 修改表结构

SQLite 不支持直接修改列，需要使用以下步骤：

```sql
-- 1. 创建新表
CREATE TABLE new_table_name (
    -- 新的表结构
);

-- 2. 复制数据
INSERT INTO new_table_name SELECT * FROM old_table_name;

-- 3. 删除旧表
DROP TABLE old_table_name;

-- 4. 重命名新表
ALTER TABLE new_table_name RENAME TO old_table_name;
```

### 5. 插入初始数据

```sql
-- 使用 INSERT OR IGNORE 避免重复插入
INSERT OR IGNORE INTO table_name (id, name)
VALUES (1, '示例数据');
```

## 使用方法

### 自动迁移（推荐）

应用程序启动时会自动检测并执行未应用的迁移脚本。

### 手动迁移

如果需要手动执行迁移脚本：

```bash
# 使用 SQLite 命令行工具
sqlite3 database.db < migrations/20240101_120000_initial_schema.sql
```

## 迁移脚本执行顺序

迁移脚本按文件名的字典序执行，因此时间戳格式非常重要。系统会：

1. 扫描 `migrations/` 目录下的所有 `.sql` 文件
2. 按文件名排序
3. 检查哪些迁移已经执行过（通过 `schema_migrations` 表）
4. 依次执行未执行的迁移脚本

## 迁移版本管理

系统使用 `schema_migrations` 表记录已执行的迁移：

```sql
CREATE TABLE IF NOT EXISTS schema_migrations (
    version TEXT PRIMARY KEY,
    applied_at TEXT NOT NULL DEFAULT (datetime('now'))
);
```

每个迁移脚本执行后，其文件名会被记录到此表中。

## 回滚策略

SQLite 不支持自动回滚迁移。如果需要回滚：

1. 手动编写回滚脚本（反向操作）
2. 备份数据库后执行回滚脚本
3. 从 `schema_migrations` 表中删除对应的版本记录

**建议**：在执行迁移前始终备份数据库文件。

## 最佳实践

### 1. 向后兼容

- 添加新列时使用 `DEFAULT` 值或 `NULL` 约束
- 避免删除现有列（除非确认不再使用）
- 重命名列时保留旧列一段时间

### 2. 数据完整性

- 使用外键约束确保数据一致性
- 添加必要的 `CHECK` 约束
- 使用 `NOT NULL` 约束防止空值

### 3. 性能优化

- 为频繁查询的列创建索引
- 避免在大表上创建过多索引
- 使用复合索引优化多列查询

### 4. 测试

- 在测试数据库上先执行迁移
- 验证数据完整性
- 检查应用程序功能是否正常

### 5. 文档

- 在迁移脚本中添加详细注释
- 说明迁移的目的和影响
- 记录任何特殊的注意事项

## 常见问题

### Q: 如何查看已执行的迁移？

```sql
SELECT * FROM schema_migrations ORDER BY applied_at;
```

### Q: 如何跳过某个迁移？

不建议跳过迁移。如果必须跳过，可以手动插入版本记录：

```sql
INSERT INTO schema_migrations (version) VALUES ('20240101_120000_description');
```

### Q: 迁移执行失败怎么办？

1. 检查错误日志
2. 恢复数据库备份
3. 修复迁移脚本
4. 重新执行迁移

### Q: 如何处理开发环境和生产环境的差异？

- 使用条件语句检查环境
- 为不同环境准备不同的初始数据
- 在迁移脚本中添加环境检测逻辑

## 示例迁移脚本

参考 `template.sql` 文件查看完整的迁移脚本模板。

## 注意事项

1. **备份优先**：执行迁移前务必备份数据库
2. **测试先行**：在测试环境验证迁移脚本
3. **事务保护**：使用事务确保迁移的原子性
4. **版本控制**：将迁移脚本纳入版本控制系统
5. **文档同步**：更新数据库文档以反映模式变更

## 相关资源

- [SQLite 官方文档](https://www.sqlite.org/docs.html)
- [SQLite ALTER TABLE 语法](https://www.sqlite.org/lang_altertable.html)
- [SQLite 数据类型](https://www.sqlite.org/datatype3.html)
- [SQLite 约束](https://www.sqlite.org/lang_createtable.html#constraints)

## 联系方式

如有问题或建议，请联系开发团队。
