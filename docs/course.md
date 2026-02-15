这不仅是对需求的完善，更是将排课系统从“可用”提升到“好用”和“人性化”的关键一步。在算法领域，这标志着我们从单纯的**CSP（约束满足问题）转向了COP（约束优化问题）**。

为了在 **Bun + Rust + Tauri** 架构中高效实现这些需求，我们需要引入**权重系统（Weight System）和智能调课引擎**。

以下是针对新需求的详细技术实现方案：

### 1. 需求模型化：硬约束 vs 软约束

首先，我们需要在 Rust 后端明确区分两类约束：

| 约束类型 | 定义 | 示例（新需求） | 处理方式 |
| --- | --- | --- | --- |
| **硬约束 (Hard)** | **绝对不能违反**，否则课表无效。 | 1. 体育/音乐/美术禁排第1-3节。<br>

<br>2. 某课程总课时数必须达标。<br>

<br>3. 老师同一时间不能出现在两个班。 | **搜索空间剪枝**（直接排除不合法的时间槽）。 |
| **软约束 (Soft)** | **尽量满足**，违反会降低课表评分。 | 1. 老师偏好（早出勤 vs 晚出勤）。<br>

<br>2. 老师喜好（上午课 vs 下午课）。<br>

<br>3. 尽量不连排3节主科。 | **惩罚分机制**（Cost Function），违反一项扣除相应权重分。 |

---

### 2. Rust 数据结构设计 (src-tauri/src/models.rs)

我们需要重新设计数据结构来容纳这些“个性化”和“动态”配置。

```rust
use serde::{Deserialize, Serialize};
use std::collections::HashMap;

// 1. 时间槽位掩码 (Bitmask)：极大提升性能
// 使用 u64 代表一周的时间槽 (5天 * 8节 = 40位 < 64)
// 1 = 可用/占用，0 = 不可用
type TimeSlotMask = u64;

// 2. 课程/科目配置
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct SubjectConfig {
    pub id: String,
    pub name: String, // e.g., "体育"
    // 硬约束：禁止排课的时段（如：每日 1,2,3 节）
    pub forbidden_slots: TimeSlotMask, 
    // 连堂限制：是否允许两节连排
    pub allow_double_session: bool,
}

// 3. 班级教学计划
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ClassCurriculum {
    pub class_id: u32,
    pub subject_id: String,
    pub teacher_id: u32,
    // 硬约束：目标总课时数
    pub target_sessions: u8, 
}

// 4. 教师个性化配置 (关键点)
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct TeacherPreference {
    pub teacher_id: u32,
    // 软约束：偏好时段（例如：只喜欢上午，则下午的时段位设为 1）
    // 算法会计算：安排的时段 & preferred_slots == 0 则完美，否则扣分
    pub preferred_slots: TimeSlotMask, 
    
    // 软约束：早晚偏好权重
    // 0 = 无偏好, 1 = 厌恶早读(第1节), 2 = 厌恶晚课(第8节)
    pub time_bias: u8, 
    
    // 权重系数：该老师的重要性（老教授可能权重更高）
    pub weight: u32, 
}

```

---

### 3. 核心算法升级：带权重的代价函数

在求解器（Solver）中，我们需要计算每个可行解的 `Cost`（代价）。`Cost` 越低，课表越完美。

**算法逻辑伪代码 (Rust):**

```rust
fn calculate_cost(schedule: &Schedule, preferences: &Vec<TeacherPreference>) -> u32 {
    let mut cost = 0;

    for entry in schedule.entries {
        let teacher = get_teacher(entry.teacher_id);
        let slot_bit = 1 << (entry.day * 8 + entry.period);

        // 1. 检查软约束：老师的时段偏好
        // 如果当前排课时间不在老师喜欢的掩码中
        if (slot_bit & teacher.preferred_slots) == 0 {
            cost += 10 * teacher.weight; // 扣分
        }

        // 2. 检查软约束：早晚出勤喜好
        if teacher.time_bias == 1 && entry.period == 0 { // 厌恶早课却排了第1节
            cost += 50; 
        }
        
        // 3. 检查全局软约束：科目分布均匀度等
        // ...
    }
    cost
}

```

**针对“体育/美术/音乐”硬约束的处理：**
在生成解空间时，直接过滤。例如，当算法尝试为“体育”寻找位置时，循环变量 `period` 直接从 4 开始（跳过 1, 2, 3）。

---

### 4. 智能调课功能 (Dynamic Rescheduling)

这是用户体验的核心。当自动生成的课表不满足特殊情况时，用户需要手动调整。

#### 功能 A：可视化冲突检测 (Visual Conflict Detection)

前端（Svelte/React）需要做一个智能的交互界面。

* **交互**：用户点击某位老师周三第4节的“数学”。
* **响应**：
* **高亮可行域**：系统将该老师其他空闲、且班级也空闲的格子标为**绿色**。
* **高亮禁区**：将体育课禁排的上午时段、老师明确标注“请假”的时段标为**灰色**（不可拖入）。
* **警告区**：将老师“不喜欢”的时段（如偏好上午，当前是下午）标为**黄色**，并提示“老师偏好上午，强行排课将违反软约束”。



#### 功能 B：交换建议 (Swap Suggestion)

如果用户想把周五的课调到周一，但周一已满，系统需要计算“三角交换”或“链式交换”。

**Tauri Command 实现：**

```rust
#[tauri::command]
fn suggest_swaps(
    current_schedule: Schedule, 
    target_class: u32, 
    target_teacher: u32, 
    desired_slot: TimeSlot
) -> Result<Vec<SwapOption>, String> {
    // 1. 检查 desired_slot 是否被占用
    if let Some(existing_class) = current_schedule.get(target_class, desired_slot) {
        // 2. 寻找能容纳 existing_class 的其他位置
        let alternatives = find_valid_slots(existing_class, &current_schedule);
        
        // 3. 返回建议： "将原来的[英语]移至周二第3节，以腾出空间给[数学]"
        return Ok(alternatives);
    }
    Ok(vec![])
}

```

---

### 5. 完善后的 UI/UX 界面规划

为了配合这些高级功能，界面需要分层设计：

1. **设置向导（Setup Wizard）**：
* **步骤1：基础规则**。设置全校通用的硬规则（如：体音美不排上午）。
* **步骤2：教师画像**。列表展示所有教师，允许批量设置属性（如：勾选10位老师设为“必须排上午”）。
* **步骤3：课时核对**。自动计算并红字警示：“高一(3)班 总课时 42 节，超过每周 40 节容量，请删减”。


2. **排课结果视图**：
* **热力图模式**：点击“显示偏好冲突”，课表上颜色越深代表违反软约束越多（如某位老教师被排了太多晚课），方便教务主任人工干预。


3. **调课弹窗**：
* 当拖拽发生冲突时，弹出：“目标位置已有王老师的英语课。是否执行**自动交换**？（系统将自动把王老师移至周四第2节）”。



### 6. 开发建议

1. **优先级排序**：
* 先实现**硬约束**（体音美限时、总课时达标）。这是系统可用的底线。
* 再实现**基础调课**（手动拖拽，仅检测冲突）。
* 最后实现**软约束优化**和**智能交换建议**。


2. **性能陷阱**：
* 26个班级 x 软约束计算量很大。在 Rust 中计算 Cost 时，尽量避免内存分配（Clone），多用引用和位运算。


3. **数据持久化**：
* 在 SQLite 中增加 `teacher_preferences` 表，将复杂的偏好配置序列化为 JSON 存储，保持数据库结构简洁。



这个方案将硬性的数学求解与人性化的管理需求结合了起来，利用 Rust 的高性能处理复杂的偏好计算，利用 Tauri + Bun 打造流畅的交互体验。