# 测试数据说明

本目录包含用于测试自动排课功能的模拟数据。

## 数据文件

### 1. 测试数据.xlsx
Excel 格式的测试数据，包含以下工作表：

- **教师信息**: 31 名教师，分布在 12 个教研组
- **班级信息**: 18 个班级（高一、高二、高三各 6 个班）
- **科目配置**: 12 门科目（语文、数学、英语等）
- **教学计划**: 216 条教学计划（每个班级的所有科目安排）
- **教师偏好**: 部分教师的时间偏好设置

### 2. 测试数据.json
JSON 格式的测试数据，包含与 Excel 相同的数据，便于程序直接读取。

## 数据统计

- **教师总数**: 31 人
- **班级总数**: 18 个（3 个年级 × 6 个班）
- **科目总数**: 12 门
- **教学计划**: 216 条
- **总课时需求**: 702 课时/周
- **可用时间槽**: 720 个（5 天 × 8 节 × 18 个班）
- **时间槽利用率**: 97.5%

## 使用方法

### 方法 1: 通过系统界面导入

1. 启动系统：`bun run dev`
2. 进入"导入导出"页面
3. 点击"选择文件导入"
4. 选择 `data/测试数据.xlsx`
5. 选择冲突处理策略（建议选择"覆盖已有数据"）
6. 点击"开始导入"

### 方法 2: 在测试代码中使用

```typescript
import testData from '../data/测试数据.json';

// 使用教师数据
const teachers = testData.teachers;

// 使用班级数据
const classes = testData.classes;

// 使用教学计划
const curriculums = testData.curriculums;
```

### 方法 3: 重新生成测试数据

如果需要重新生成测试数据（例如修改了数据规模）：

```bash
bun run generate:testdata
```

## 数据结构

### 教师信息
```json
{
  "id": 1,
  "name": "张老师",
  "group": "语文组"
}
```

### 班级信息
```json
{
  "id": 1,
  "name": "高一1班",
  "grade": "高一",
  "studentCount": 45
}
```

### 科目配置
```json
{
  "id": "chinese",
  "name": "语文",
  "hoursPerWeek": 5,
  "category": "主科"
}
```

### 教学计划
```json
{
  "classId": 1,
  "className": "高一1班",
  "subjectId": "chinese",
  "subjectName": "语文",
  "teacherId": 1,
  "teacherName": "张老师",
  "hoursPerWeek": 5
}
```

### 教师偏好
```json
{
  "teacherId": 1,
  "teacherName": "张老师",
  "day": 1,
  "period": 3,
  "type": "preferred",
  "typeLabel": "偏好"
}
```

## 验证自动排课

导入测试数据后，可以进行以下验证：

1. **基础验证**
   - 进入"课表管理"页面
   - 点击"自动排课"按钮
   - 等待排课完成
   - 查看生成的课表

2. **约束验证**
   - 检查是否有教师冲突（同一教师同一时间不能在多个班级）
   - 检查是否有班级冲突（同一班级同一时间不能有多门课）
   - 检查课时是否满足要求（每门课的周课时数是否正确）

3. **偏好验证**
   - 查看有偏好设置的教师的课表
   - 验证是否尽量满足了教师的时间偏好

4. **手动调课验证**
   - 尝试拖拽调整课程
   - 验证冲突检测是否正常工作
   - 验证交换建议是否合理

## 自定义测试数据

如需自定义测试数据，可以修改 `scripts/generate-test-data.ts` 中的配置：

```typescript
const CONFIG = {
  grades: ['高一', '高二', '高三'],
  classesPerGrade: 6,  // 修改每个年级的班级数
  daysPerWeek: 5,      // 修改每周天数
  periodsPerDay: 8,    // 修改每天节次数
  // ...
};
```

修改后重新运行 `bun run generate:testdata` 即可生成新的测试数据。
