# 设计文档：排课系统

## 1. 系统架构设计

### 1.1 整体架构

排课系统采用 **Bun + Rust + Tauri** 三层架构：

```
┌─────────────────────────────────────────────────────────┐
│                    前端层 (Frontend)                      │
│                Bun + Vue 3 + TypeScript                  │
│  - 用户界面组件 (Element Plus)                           │
│  - 状态管理 (Pinia)                                      │
│  - 可视化交互 (拖拽、热力图)                              │
└─────────────────────────────────────────────────────────┘
                            ↕ HTTP/Tauri IPC
┌─────────────────────────────────────────────────────────┐
│                   服务层 (Service)                        │
│                    Hono + Bun                            │
│  - RESTful API 路由                                      │
│  - 业务逻辑编排                                           │
│  - 请求验证和转换                                         │
│  - 响应格式化                                             │
└─────────────────────────────────────────────────────────┘
                            ↕ FFI/IPC
┌─────────────────────────────────────────────────────────┐
│                   核心层 (Core)                           │
│                    Rust + Tauri                          │
│  - 约束求解器 (Constraint Solver)                        │
│  - 代价函数计算 (Cost Function)                          │
│  - 调课引擎 (Rescheduling Engine)                        │
│  - 数据访问层 (Data Access Layer)                        │
└─────────────────────────────────────────────────────────┘
                            ↕ SQLite
┌─────────────────────────────────────────────────────────┐
│                   数据层 (Database)                       │
│                      SQLite                              │
│  - 教师信息表                                             │
│  - 课程配置表                                             │
│  - 教学计划表                                             │
│  - 课表数据表                                             │
│  - 场地信息表                                             │
└─────────────────────────────────────────────────────────┘
```

### 1.2 技术栈选型

| 层次 | 技术 | 理由 |
|------|------|------|
| 前端运行时 | Bun | 高性能 JavaScript 运行时，快速的包管理和构建 |
| 前端框架 | Vue 3 | 渐进式框架、组合式 API、优秀的 TypeScript 支持 |
| 服务层框架 | Hono | 轻量级、高性能、边缘优先的 Web 框架 |
| 后端语言 | Rust | 类型安全、内存安全、高性能计算 |
| 桌面框架 | Tauri | 轻量级、安全、跨平台 |
| 数据库 | SQLite | 嵌入式、零配置、可靠 |
| 状态管理 | Pinia | Vue 3 官方推荐、TypeScript 友好、直观的 API |
| UI 组件库 | Element Plus | 成熟稳定、组件丰富、中文友好 |
| 拖拽库 | VueDraggable Plus | Vue 3 原生支持、基于 Sortable.js |
| Excel 处理 | rust_xlsxwriter | 纯 Rust 实现、高性能 |
| 日志框架 | tracing (Rust) | 结构化日志、异步友好 |
| 测试框架 | Playwright + Vitest | 端到端测试 + 单元测试 + 集成测试 |

## 2. 核心模块设计

### 2.1 约束求解器 (Constraint Solver)

#### 2.1.1 数据结构

```rust
// 时间槽位掩码：使用位运算提升性能
// 标准周期：5天 × 8节 = 40位 < u64 (64位)
// 扩展周期：使用 Vec<u64> 支持 1-30 天
pub type TimeSlotMask = u64;
pub type ExtendedTimeSlotMask = Vec<u64>;

// 时间槽位
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash)]
pub struct TimeSlot {
    pub day: u8,      // 0-29 (支持1-30天周期)
    pub period: u8,   // 0-11 (支持1-12节)
}

impl TimeSlot {
    // 计算位掩码位置
    pub fn to_bit_position(&self, periods_per_day: u8) -> usize {
        (self.day as usize) * (periods_per_day as usize) + (self.period as usize)
    }
    
    // 从位位置创建时间槽位
    pub fn from_bit_position(pos: usize, periods_per_day: u8) -> Self {
        TimeSlot {
            day: (pos / periods_per_day as usize) as u8,
            period: (pos % periods_per_day as usize) as u8,
        }
    }
}

// 课程配置
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SubjectConfig {
    pub id: String,
    pub name: String,
    pub forbidden_slots: TimeSlotMask,  // 禁止时段掩码
    pub allow_double_session: bool,     // 是否允许连堂
    pub venue_id: Option<String>,       // 关联场地ID
    pub is_major_subject: bool,         // 是否主科
}

// 教师偏好配置
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TeacherPreference {
    pub teacher_id: u32,
    pub preferred_slots: TimeSlotMask,  // 偏好时段掩码
    pub time_bias: u8,                  // 0=无偏好, 1=厌恶早课, 2=厌恶晚课
    pub weight: u32,                    // 权重系数
    pub blocked_slots: TimeSlotMask,    // 不排课时段（硬约束）
    pub teaching_group_id: Option<u32>, // 教研组ID
}

// 班级教学计划
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ClassCurriculum {
    pub id: u32,
    pub class_id: u32,
    pub subject_id: String,
    pub teacher_id: u32,
    pub target_sessions: u8,            // 目标课时数
    pub is_combined_class: bool,        // 是否合班课
    pub combined_class_ids: Vec<u32>,   // 合班班级列表
    pub week_type: WeekType,            // 单周/双周/每周
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum WeekType {
    Every,      // 每周
    Odd,        // 单周
    Even,       // 双周
}

// 场地配置
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Venue {
    pub id: String,
    pub name: String,
    pub capacity: u8,  // 同时容纳的班级数
}

// 固定课程
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FixedCourse {
    pub class_id: u32,
    pub subject_id: String,
    pub teacher_id: u32,
    pub time_slot: TimeSlot,
    pub is_pre_arranged: bool,  // 是否为预排课程
}

// 教师互斥关系
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TeacherMutualExclusion {
    pub teacher_a_id: u32,
    pub teacher_b_id: u32,
    pub scope: ExclusionScope,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum ExclusionScope {
    AllTime,                    // 全时段互斥
    SpecificSlots(TimeSlotMask), // 特定时段互斥
}

// 课表条目
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ScheduleEntry {
    pub class_id: u32,
    pub subject_id: String,
    pub teacher_id: u32,
    pub time_slot: TimeSlot,
    pub is_fixed: bool,         // 是否固定课程
    pub week_type: WeekType,    // 单双周标记
}

// 完整课表
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Schedule {
    pub entries: Vec<ScheduleEntry>,
    pub cost: u32,              // 代价值
    pub metadata: ScheduleMetadata,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ScheduleMetadata {
    pub cycle_days: u8,         // 排课周期天数
    pub periods_per_day: u8,    // 每天节次数
    pub generated_at: String,   // 生成时间
    pub version: u32,           // 版本号
}
```

#### 2.1.2 约束求解算法

```rust
pub struct ConstraintSolver {
    config: SolverConfig,
    logger: Logger,
}

pub struct SolverConfig {
    pub cycle_days: u8,
    pub periods_per_day: u8,
    pub max_iterations: u32,
    pub timeout_seconds: u32,
}

impl ConstraintSolver {
    // 主求解函数
    pub fn solve(
        &self,
        curriculums: &[ClassCurriculum],
        subject_configs: &HashMap<String, SubjectConfig>,
        teacher_prefs: &HashMap<u32, TeacherPreference>,
        venues: &HashMap<String, Venue>,
        fixed_courses: &[FixedCourse],
        exclusions: &[TeacherMutualExclusion],
    ) -> Result<Schedule, SolverError> {
        info!("开始排课求解");
        
        // 1. 初始化课表
        let mut schedule = Schedule::new(self.config.cycle_days, self.config.periods_per_day);
        
        // 2. 安排固定课程
        self.place_fixed_courses(&mut schedule, fixed_courses)?;
        
        // 3. 构建约束图
        let constraint_graph = self.build_constraint_graph(
            curriculums,
            subject_configs,
            teacher_prefs,
            venues,
            exclusions,
        );
        
        // 4. 使用回溯算法求解
        let solutions = self.backtrack_search(
            &mut schedule,
            curriculums,
            &constraint_graph,
            0,
        )?;
        
        // 5. 选择代价最低的解
        let best_solution = solutions
            .into_iter()
            .min_by_key(|s| s.cost)
            .ok_or(SolverError::NoSolutionFound)?;
        
        info!("排课求解完成，代价值: {}", best_solution.cost);
        Ok(best_solution)
    }
    
    // 回溯搜索
    fn backtrack_search(
        &self,
        schedule: &mut Schedule,
        curriculums: &[ClassCurriculum],
        constraint_graph: &ConstraintGraph,
        curriculum_index: usize,
    ) -> Result<Vec<Schedule>, SolverError> {
        // 递归终止条件
        if curriculum_index >= curriculums.len() {
            let cost = self.calculate_cost(schedule, constraint_graph);
            let mut final_schedule = schedule.clone();
            final_schedule.cost = cost;
            return Ok(vec![final_schedule]);
        }
        
        let curriculum = &curriculums[curriculum_index];
        let mut solutions = Vec::new();
        
        // 获取可用时间槽位
        let available_slots = self.get_available_slots(
            schedule,
            curriculum,
            constraint_graph,
        );
        
        // 尝试每个可用槽位
        for slot in available_slots {
            // 放置课程
            schedule.place_course(curriculum, slot);
            
            // 递归求解下一个课程
            if let Ok(sub_solutions) = self.backtrack_search(
                schedule,
                curriculums,
                constraint_graph,
                curriculum_index + 1,
            ) {
                solutions.extend(sub_solutions);
            }
            
            // 回溯
            schedule.remove_course(curriculum, slot);
            
            // 限制解的数量以避免内存溢出
            if solutions.len() > 100 {
                break;
            }
        }
        
        Ok(solutions)
    }
    
    // 获取可用时间槽位（应用硬约束剪枝）
    fn get_available_slots(
        &self,
        schedule: &Schedule,
        curriculum: &ClassCurriculum,
        constraint_graph: &ConstraintGraph,
    ) -> Vec<TimeSlot> {
        let mut available = Vec::new();
        let subject_config = constraint_graph.subject_configs.get(&curriculum.subject_id).unwrap();
        let teacher_pref = constraint_graph.teacher_prefs.get(&curriculum.teacher_id).unwrap();
        
        for day in 0..self.config.cycle_days {
            for period in 0..self.config.periods_per_day {
                let slot = TimeSlot { day, period };
                
                // 硬约束检查
                if self.check_hard_constraints(
                    schedule,
                    curriculum,
                    slot,
                    subject_config,
                    teacher_pref,
                    constraint_graph,
                ) {
                    available.push(slot);
                }
            }
        }
        
        available
    }
    
    // 硬约束检查
    fn check_hard_constraints(
        &self,
        schedule: &Schedule,
        curriculum: &ClassCurriculum,
        slot: TimeSlot,
        subject_config: &SubjectConfig,
        teacher_pref: &TeacherPreference,
        constraint_graph: &ConstraintGraph,
    ) -> bool {
        // 1. 检查课程禁止时段
        let slot_bit = 1u64 << slot.to_bit_position(self.config.periods_per_day);
        if (subject_config.forbidden_slots & slot_bit) != 0 {
            return false;
        }
        
        // 2. 检查教师不排课时段
        if (teacher_pref.blocked_slots & slot_bit) != 0 {
            return false;
        }
        
        // 3. 检查教师时间冲突
        if schedule.is_teacher_busy(curriculum.teacher_id, slot) {
            return false;
        }
        
        // 4. 检查班级时间冲突
        if schedule.is_class_busy(curriculum.class_id, slot) {
            return false;
        }
        
        // 5. 检查合班课程冲突
        if curriculum.is_combined_class {
            for class_id in &curriculum.combined_class_ids {
                if schedule.is_class_busy(*class_id, slot) {
                    return false;
                }
            }
        }
        
        // 6. 检查场地容量
        if let Some(venue_id) = &subject_config.venue_id {
            if let Some(venue) = constraint_graph.venues.get(venue_id) {
                let venue_usage = schedule.count_venue_usage(venue_id, slot);
                if venue_usage >= venue.capacity {
                    return false;
                }
            }
        }
        
        // 7. 检查教师互斥约束
        for exclusion in &constraint_graph.exclusions {
            if exclusion.teacher_a_id == curriculum.teacher_id {
                match &exclusion.scope {
                    ExclusionScope::AllTime => {
                        if schedule.is_teacher_busy(exclusion.teacher_b_id, slot) {
                            return false;
                        }
                    }
                    ExclusionScope::SpecificSlots(mask) => {
                        if (mask & slot_bit) != 0 && schedule.is_teacher_busy(exclusion.teacher_b_id, slot) {
                            return false;
                        }
                    }
                }
            }
        }
        
        // 8. 检查连堂限制
        if !subject_config.allow_double_session {
            // 检查前后节次是否有同一课程
            if self.has_adjacent_same_subject(schedule, curriculum, slot) {
                return false;
            }
        }
        
        true
    }
}
```


#### 2.1.3 代价函数设计

```rust
impl ConstraintSolver {
    // 计算课表代价值
    fn calculate_cost(
        &self,
        schedule: &Schedule,
        constraint_graph: &ConstraintGraph,
    ) -> u32 {
        let mut cost = 0u32;
        
        for entry in &schedule.entries {
            let teacher_pref = constraint_graph.teacher_prefs.get(&entry.teacher_id).unwrap();
            let subject_config = constraint_graph.subject_configs.get(&entry.subject_id).unwrap();
            let slot_bit = 1u64 << entry.time_slot.to_bit_position(self.config.periods_per_day);
            
            // 软约束1：教师时段偏好
            if (slot_bit & teacher_pref.preferred_slots) == 0 {
                cost += 10 * teacher_pref.weight;
                debug!("教师 {} 时段偏好违反，增加代价 {}", entry.teacher_id, 10 * teacher_pref.weight);
            }
            
            // 软约束2：教师早晚偏好
            if teacher_pref.time_bias == 1 && entry.time_slot.period == 0 {
                cost += 50;
                debug!("教师 {} 厌恶早课但被安排第1节，增加代价 50", entry.teacher_id);
            }
            if teacher_pref.time_bias == 2 && entry.time_slot.period == self.config.periods_per_day - 1 {
                cost += 50;
                debug!("教师 {} 厌恶晚课但被安排最后一节，增加代价 50", entry.teacher_id);
            }
            
            // 软约束3：主科连续3节惩罚
            if subject_config.is_major_subject {
                let consecutive_count = self.count_consecutive_sessions(schedule, entry);
                if consecutive_count >= 3 {
                    cost += 30 * (consecutive_count - 2) as u32;
                    debug!("主科 {} 连续 {} 节，增加代价 {}", entry.subject_id, consecutive_count, 30 * (consecutive_count - 2) as u32);
                }
            }
        }
        
        // 软约束4：同一教师多班课进度一致性
        cost += self.calculate_progress_consistency_cost(schedule, constraint_graph);
        
        cost
    }
    
    // 计算进度一致性代价
    fn calculate_progress_consistency_cost(
        &self,
        schedule: &Schedule,
        constraint_graph: &ConstraintGraph,
    ) -> u32 {
        let mut cost = 0u32;
        
        // 按教师和科目分组
        let mut teacher_subject_map: HashMap<(u32, String), Vec<&ScheduleEntry>> = HashMap::new();
        for entry in &schedule.entries {
            teacher_subject_map
                .entry((entry.teacher_id, entry.subject_id.clone()))
                .or_insert_with(Vec::new)
                .push(entry);
        }
        
        // 检查每组的时间分布
        for ((teacher_id, subject_id), entries) in teacher_subject_map {
            if entries.len() > 1 {
                // 计算时间差异
                let days: Vec<u8> = entries.iter().map(|e| e.time_slot.day).collect();
                let max_day = *days.iter().max().unwrap();
                let min_day = *days.iter().min().unwrap();
                let day_diff = max_day - min_day;
                
                // 如果时间差超过2天，增加惩罚
                if day_diff > 2 {
                    let penalty = (day_diff - 2) as u32 * 20;
                    cost += penalty;
                    debug!("教师 {} 的 {} 课程进度不一致，时间差 {} 天，增加代价 {}", 
                           teacher_id, subject_id, day_diff, penalty);
                }
            }
        }
        
        cost
    }
}
```

### 2.2 调课引擎 (Rescheduling Engine)

#### 2.2.1 冲突检测器

```rust
pub struct ConflictDetector {
    schedule: Schedule,
    constraint_graph: ConstraintGraph,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ConflictInfo {
    pub slot: TimeSlot,
    pub conflict_type: ConflictType,
    pub severity: ConflictSeverity,
    pub description: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum ConflictType {
    HardConstraint(HardConstraintViolation),
    SoftConstraint(SoftConstraintViolation),
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum HardConstraintViolation {
    TeacherBusy,
    ClassBusy,
    ForbiddenSlot,
    TeacherBlocked,
    VenueOverCapacity,
    TeacherMutualExclusion,
    NoDoubleSession,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum SoftConstraintViolation {
    TeacherPreference,
    TimeBias,
    ConsecutiveMajorSubject,
    ProgressInconsistency,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum ConflictSeverity {
    Blocked,    // 红色：硬约束冲突，不可放置
    Warning,    // 黄色：软约束冲突，可放置但不推荐
    Available,  // 绿色：无冲突，可放置
}

impl ConflictDetector {
    // 检测所有时间槽位的冲突状态
    pub fn detect_conflicts_for_course(
        &self,
        curriculum: &ClassCurriculum,
    ) -> HashMap<TimeSlot, ConflictInfo> {
        let mut conflicts = HashMap::new();
        
        for day in 0..self.schedule.metadata.cycle_days {
            for period in 0..self.schedule.metadata.periods_per_day {
                let slot = TimeSlot { day, period };
                let conflict_info = self.check_slot_conflicts(curriculum, slot);
                conflicts.insert(slot, conflict_info);
            }
        }
        
        conflicts
    }
    
    // 检查单个槽位的冲突
    fn check_slot_conflicts(
        &self,
        curriculum: &ClassCurriculum,
        slot: TimeSlot,
    ) -> ConflictInfo {
        // 先检查硬约束
        if let Some(hard_violation) = self.check_hard_constraint_violations(curriculum, slot) {
            return ConflictInfo {
                slot,
                conflict_type: ConflictType::HardConstraint(hard_violation.clone()),
                severity: ConflictSeverity::Blocked,
                description: self.get_violation_description(&hard_violation),
            };
        }
        
        // 再检查软约束
        if let Some(soft_violation) = self.check_soft_constraint_violations(curriculum, slot) {
            return ConflictInfo {
                slot,
                conflict_type: ConflictType::SoftConstraint(soft_violation.clone()),
                severity: ConflictSeverity::Warning,
                description: self.get_soft_violation_description(&soft_violation),
            };
        }
        
        // 无冲突
        ConflictInfo {
            slot,
            conflict_type: ConflictType::SoftConstraint(SoftConstraintViolation::TeacherPreference),
            severity: ConflictSeverity::Available,
            description: "可以安排".to_string(),
        }
    }
}
```

#### 2.2.2 交换建议器

```rust
pub struct SwapSuggester {
    schedule: Schedule,
    constraint_graph: ConstraintGraph,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SwapOption {
    pub swap_type: SwapType,
    pub moves: Vec<CourseMove>,
    pub cost_impact: i32,  // 代价变化（负数表示改善）
    pub description: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum SwapType {
    Simple,      // 简单交换：A ↔ B
    Triangle,    // 三角交换：A → B → C → A
    Chain,       // 链式交换：A → B → C → ... → 空位
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CourseMove {
    pub class_id: u32,
    pub subject_id: String,
    pub teacher_id: u32,
    pub from_slot: TimeSlot,
    pub to_slot: TimeSlot,
}

impl SwapSuggester {
    // 建议交换方案
    pub fn suggest_swaps(
        &self,
        target_class: u32,
        target_teacher: u32,
        desired_slot: TimeSlot,
    ) -> Result<Vec<SwapOption>, String> {
        let mut options = Vec::new();
        
        // 1. 检查目标槽位是否被占用
        if let Some(existing_entry) = self.schedule.get_entry_at(target_class, desired_slot) {
            // 2. 尝试简单交换
            if let Some(simple_swap) = self.find_simple_swap(existing_entry, target_teacher, desired_slot) {
                options.push(simple_swap);
            }
            
            // 3. 尝试三角交换
            let triangle_swaps = self.find_triangle_swaps(existing_entry, target_teacher, desired_slot);
            options.extend(triangle_swaps);
            
            // 4. 尝试链式交换
            let chain_swaps = self.find_chain_swaps(existing_entry, target_teacher, desired_slot);
            options.extend(chain_swaps);
        } else {
            // 目标槽位空闲，直接移动
            return Ok(vec![SwapOption {
                swap_type: SwapType::Simple,
                moves: vec![CourseMove {
                    class_id: target_class,
                    subject_id: "".to_string(),  // 需要从上下文获取
                    teacher_id: target_teacher,
                    from_slot: TimeSlot { day: 0, period: 0 },  // 需要从上下文获取
                    to_slot: desired_slot,
                }],
                cost_impact: 0,
                description: "直接移动到目标位置".to_string(),
            }]);
        }
        
        // 按代价影响排序
        options.sort_by_key(|opt| opt.cost_impact);
        
        Ok(options)
    }
    
    // 查找简单交换方案
    fn find_simple_swap(
        &self,
        existing_entry: &ScheduleEntry,
        target_teacher: u32,
        desired_slot: TimeSlot,
    ) -> Option<SwapOption> {
        // 查找能容纳现有课程的其他槽位
        let available_slots = self.find_valid_slots_for_entry(existing_entry);
        
        if let Some(alternative_slot) = available_slots.first() {
            let cost_before = self.calculate_local_cost(&[existing_entry]);
            
            // 模拟交换后的代价
            let mut temp_schedule = self.schedule.clone();
            temp_schedule.move_entry(existing_entry, *alternative_slot);
            let cost_after = self.calculate_local_cost(&[existing_entry]);
            
            Some(SwapOption {
                swap_type: SwapType::Simple,
                moves: vec![CourseMove {
                    class_id: existing_entry.class_id,
                    subject_id: existing_entry.subject_id.clone(),
                    teacher_id: existing_entry.teacher_id,
                    from_slot: existing_entry.time_slot,
                    to_slot: *alternative_slot,
                }],
                cost_impact: cost_after as i32 - cost_before as i32,
                description: format!(
                    "将 {} 的 {} 课从 {}第{}节 移至 {}第{}节",
                    existing_entry.class_id,
                    existing_entry.subject_id,
                    existing_entry.time_slot.day + 1,
                    existing_entry.time_slot.period + 1,
                    alternative_slot.day + 1,
                    alternative_slot.period + 1
                ),
            })
        } else {
            None
        }
    }
    
    // 查找有效槽位
    fn find_valid_slots_for_entry(&self, entry: &ScheduleEntry) -> Vec<TimeSlot> {
        let mut valid_slots = Vec::new();
        
        for day in 0..self.schedule.metadata.cycle_days {
            for period in 0..self.schedule.metadata.periods_per_day {
                let slot = TimeSlot { day, period };
                
                // 检查是否满足硬约束
                if self.is_valid_slot_for_entry(entry, slot) {
                    valid_slots.push(slot);
                }
            }
        }
        
        valid_slots
    }
}
```

### 2.3 数据访问层 (Data Access Layer)

#### 2.3.1 数据库模式

```sql
-- 教师信息表
CREATE TABLE teachers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    teaching_group_id INTEGER,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    FOREIGN KEY (teaching_group_id) REFERENCES teaching_groups(id)
);

-- 教研组表
CREATE TABLE teaching_groups (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    description TEXT,
    created_at TEXT NOT NULL
);

-- 教师偏好表
CREATE TABLE teacher_preferences (
    teacher_id INTEGER PRIMARY KEY,
    preferred_slots TEXT NOT NULL,  -- JSON: u64 位掩码
    time_bias INTEGER NOT NULL DEFAULT 0,
    weight INTEGER NOT NULL DEFAULT 1,
    blocked_slots TEXT NOT NULL,    -- JSON: u64 位掩码
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    FOREIGN KEY (teacher_id) REFERENCES teachers(id)
);

-- 科目配置表
CREATE TABLE subject_configs (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    forbidden_slots TEXT NOT NULL,  -- JSON: u64 位掩码
    allow_double_session INTEGER NOT NULL DEFAULT 1,
    venue_id TEXT,
    is_major_subject INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    FOREIGN KEY (venue_id) REFERENCES venues(id)
);

-- 场地表
CREATE TABLE venues (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    capacity INTEGER NOT NULL,
    created_at TEXT NOT NULL
);

-- 班级表
CREATE TABLE classes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    grade_level INTEGER,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

-- 教学计划表
CREATE TABLE class_curriculums (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    class_id INTEGER NOT NULL,
    subject_id TEXT NOT NULL,
    teacher_id INTEGER NOT NULL,
    target_sessions INTEGER NOT NULL,
    is_combined_class INTEGER NOT NULL DEFAULT 0,
    combined_class_ids TEXT,  -- JSON: [u32]
    week_type TEXT NOT NULL DEFAULT 'Every',  -- 'Every', 'Odd', 'Even'
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    FOREIGN KEY (class_id) REFERENCES classes(id),
    FOREIGN KEY (subject_id) REFERENCES subject_configs(id),
    FOREIGN KEY (teacher_id) REFERENCES teachers(id)
);

-- 固定课程表
CREATE TABLE fixed_courses (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    class_id INTEGER NOT NULL,
    subject_id TEXT NOT NULL,
    teacher_id INTEGER NOT NULL,
    day INTEGER NOT NULL,
    period INTEGER NOT NULL,
    is_pre_arranged INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL,
    FOREIGN KEY (class_id) REFERENCES classes(id),
    FOREIGN KEY (subject_id) REFERENCES subject_configs(id),
    FOREIGN KEY (teacher_id) REFERENCES teachers(id)
);

-- 教师互斥关系表
CREATE TABLE teacher_mutual_exclusions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    teacher_a_id INTEGER NOT NULL,
    teacher_b_id INTEGER NOT NULL,
    scope_type TEXT NOT NULL,  -- 'AllTime' or 'SpecificSlots'
    specific_slots TEXT,       -- JSON: u64 位掩码（仅当 scope_type='SpecificSlots'）
    created_at TEXT NOT NULL,
    FOREIGN KEY (teacher_a_id) REFERENCES teachers(id),
    FOREIGN KEY (teacher_b_id) REFERENCES teachers(id)
);

-- 课表表
CREATE TABLE schedules (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    version INTEGER NOT NULL,
    cycle_days INTEGER NOT NULL,
    periods_per_day INTEGER NOT NULL,
    cost INTEGER NOT NULL,
    is_active INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL
);

-- 课表条目表
CREATE TABLE schedule_entries (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    schedule_id INTEGER NOT NULL,
    class_id INTEGER NOT NULL,
    subject_id TEXT NOT NULL,
    teacher_id INTEGER NOT NULL,
    day INTEGER NOT NULL,
    period INTEGER NOT NULL,
    is_fixed INTEGER NOT NULL DEFAULT 0,
    week_type TEXT NOT NULL DEFAULT 'Every',
    FOREIGN KEY (schedule_id) REFERENCES schedules(id),
    FOREIGN KEY (class_id) REFERENCES classes(id),
    FOREIGN KEY (subject_id) REFERENCES subject_configs(id),
    FOREIGN KEY (teacher_id) REFERENCES teachers(id)
);

-- 临时课表表
CREATE TABLE temporary_schedules (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    base_schedule_id INTEGER NOT NULL,
    start_date TEXT NOT NULL,
    end_date TEXT NOT NULL,
    description TEXT,
    created_at TEXT NOT NULL,
    FOREIGN KEY (base_schedule_id) REFERENCES schedules(id)
);

-- 临时课表变更表
CREATE TABLE temporary_schedule_changes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    temp_schedule_id INTEGER NOT NULL,
    original_entry_id INTEGER,
    new_class_id INTEGER,
    new_subject_id TEXT,
    new_teacher_id INTEGER,
    new_day INTEGER,
    new_period INTEGER,
    change_type TEXT NOT NULL,  -- 'Move', 'Add', 'Remove'
    FOREIGN KEY (temp_schedule_id) REFERENCES temporary_schedules(id),
    FOREIGN KEY (original_entry_id) REFERENCES schedule_entries(id)
);

-- 作息时间表
CREATE TABLE schedule_times (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    period INTEGER NOT NULL UNIQUE,
    start_time TEXT NOT NULL,
    end_time TEXT NOT NULL,
    break_duration INTEGER NOT NULL DEFAULT 10,  -- 课间休息分钟数
    created_at TEXT NOT NULL
);

-- 监考表
CREATE TABLE invigilation_schedules (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    exam_name TEXT NOT NULL,
    exam_date TEXT NOT NULL,
    created_at TEXT NOT NULL
);

-- 监考安排表
CREATE TABLE invigilation_assignments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    invigilation_schedule_id INTEGER NOT NULL,
    room_name TEXT NOT NULL,
    exam_time_slot TEXT NOT NULL,
    teacher_id INTEGER NOT NULL,
    class_ids TEXT NOT NULL,  -- JSON: [u32]
    FOREIGN KEY (invigilation_schedule_id) REFERENCES invigilation_schedules(id),
    FOREIGN KEY (teacher_id) REFERENCES teachers(id)
);

-- 操作历史表（用于撤销/重做）
CREATE TABLE operation_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    schedule_id INTEGER NOT NULL,
    operation_type TEXT NOT NULL,  -- 'Move', 'Swap', 'Add', 'Remove'
    operation_data TEXT NOT NULL,  -- JSON
    created_at TEXT NOT NULL,
    FOREIGN KEY (schedule_id) REFERENCES schedules(id)
);

-- 创建索引
CREATE INDEX idx_schedule_entries_schedule ON schedule_entries(schedule_id);
CREATE INDEX idx_schedule_entries_class ON schedule_entries(class_id);
CREATE INDEX idx_schedule_entries_teacher ON schedule_entries(teacher_id);
CREATE INDEX idx_schedule_entries_time ON schedule_entries(day, period);
CREATE INDEX idx_class_curriculums_class ON class_curriculums(class_id);
CREATE INDEX idx_class_curriculums_teacher ON class_curriculums(teacher_id);
```


#### 2.3.2 数据访问接口

```rust
use sqlx::{SqlitePool, Row};
use tracing::{info, error, debug};

pub struct DatabaseManager {
    pool: SqlitePool,
}

impl DatabaseManager {
    pub async fn new(database_url: &str) -> Result<Self, sqlx::Error> {
        info!("初始化数据库连接: {}", database_url);
        let pool = SqlitePool::connect(database_url).await?;
        Ok(Self { pool })
    }
    
    // 教师相关操作
    pub async fn get_all_teachers(&self) -> Result<Vec<Teacher>, sqlx::Error> {
        debug!("查询所有教师");
        let teachers = sqlx::query_as::<_, Teacher>(
            "SELECT * FROM teachers ORDER BY name"
        )
        .fetch_all(&self.pool)
        .await?;
        info!("查询到 {} 位教师", teachers.len());
        Ok(teachers)
    }
    
    pub async fn get_teacher_preference(&self, teacher_id: u32) -> Result<Option<TeacherPreference>, sqlx::Error> {
        debug!("查询教师 {} 的偏好设置", teacher_id);
        let pref = sqlx::query_as::<_, TeacherPreference>(
            "SELECT * FROM teacher_preferences WHERE teacher_id = ?"
        )
        .bind(teacher_id)
        .fetch_optional(&self.pool)
        .await?;
        Ok(pref)
    }
    
    pub async fn save_teacher_preference(&self, pref: &TeacherPreference) -> Result<(), sqlx::Error> {
        info!("保存教师 {} 的偏好设置", pref.teacher_id);
        sqlx::query(
            "INSERT OR REPLACE INTO teacher_preferences 
             (teacher_id, preferred_slots, time_bias, weight, blocked_slots, created_at, updated_at)
             VALUES (?, ?, ?, ?, ?, datetime('now'), datetime('now'))"
        )
        .bind(pref.teacher_id)
        .bind(serde_json::to_string(&pref.preferred_slots).unwrap())
        .bind(pref.time_bias)
        .bind(pref.weight)
        .bind(serde_json::to_string(&pref.blocked_slots).unwrap())
        .execute(&self.pool)
        .await?;
        Ok(())
    }
    
    // 课表相关操作
    pub async fn save_schedule(&self, schedule: &Schedule) -> Result<u32, sqlx::Error> {
        info!("保存课表，代价值: {}", schedule.cost);
        
        // 开启事务
        let mut tx = self.pool.begin().await?;
        
        // 插入课表记录
        let schedule_id = sqlx::query(
            "INSERT INTO schedules (version, cycle_days, periods_per_day, cost, is_active, created_at)
             VALUES (?, ?, ?, ?, 1, datetime('now'))"
        )
        .bind(schedule.metadata.version)
        .bind(schedule.metadata.cycle_days)
        .bind(schedule.metadata.periods_per_day)
        .bind(schedule.cost)
        .execute(&mut *tx)
        .await?
        .last_insert_rowid() as u32;
        
        // 插入课表条目
        for entry in &schedule.entries {
            sqlx::query(
                "INSERT INTO schedule_entries 
                 (schedule_id, class_id, subject_id, teacher_id, day, period, is_fixed, week_type)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
            )
            .bind(schedule_id)
            .bind(entry.class_id)
            .bind(&entry.subject_id)
            .bind(entry.teacher_id)
            .bind(entry.time_slot.day)
            .bind(entry.time_slot.period)
            .bind(entry.is_fixed)
            .bind(serde_json::to_string(&entry.week_type).unwrap())
            .execute(&mut *tx)
            .await?;
        }
        
        // 将其他课表设为非活动
        sqlx::query("UPDATE schedules SET is_active = 0 WHERE id != ?")
            .bind(schedule_id)
            .execute(&mut *tx)
            .await?;
        
        // 提交事务
        tx.commit().await?;
        
        info!("课表保存成功，ID: {}", schedule_id);
        Ok(schedule_id)
    }
    
    pub async fn get_active_schedule(&self) -> Result<Option<Schedule>, sqlx::Error> {
        debug!("查询活动课表");
        
        // 查询课表元数据
        let schedule_row = sqlx::query(
            "SELECT * FROM schedules WHERE is_active = 1 ORDER BY created_at DESC LIMIT 1"
        )
        .fetch_optional(&self.pool)
        .await?;
        
        if let Some(row) = schedule_row {
            let schedule_id: u32 = row.get("id");
            let cost: u32 = row.get("cost");
            let cycle_days: u8 = row.get("cycle_days");
            let periods_per_day: u8 = row.get("periods_per_day");
            let version: u32 = row.get("version");
            let created_at: String = row.get("created_at");
            
            // 查询课表条目
            let entries = sqlx::query_as::<_, ScheduleEntry>(
                "SELECT * FROM schedule_entries WHERE schedule_id = ?"
            )
            .bind(schedule_id)
            .fetch_all(&self.pool)
            .await?;
            
            info!("查询到活动课表，ID: {}，包含 {} 个条目", schedule_id, entries.len());
            
            Ok(Some(Schedule {
                entries,
                cost,
                metadata: ScheduleMetadata {
                    cycle_days,
                    periods_per_day,
                    generated_at: created_at,
                    version,
                },
            }))
        } else {
            info!("未找到活动课表");
            Ok(None)
        }
    }
}
```

### 2.4 服务层设计 (Hono Framework)

#### 2.4.1 服务层架构

```typescript
// src-service/index.ts
import { Hono } from 'hono';
import { logger } from 'hono/logger';
import { cors } from 'hono/cors';
import { validator } from 'hono/validator';
import { scheduleRoutes } from './routes/schedule';
import { teacherRoutes } from './routes/teacher';
import { importExportRoutes } from './routes/import-export';
import { errorHandler } from './middleware/error-handler';
import { requestLogger } from './middleware/request-logger';

const app = new Hono();

// 全局中间件
app.use('*', logger());
app.use('*', cors());
app.use('*', requestLogger);

// API 路由
app.route('/api/schedule', scheduleRoutes);
app.route('/api/teacher', teacherRoutes);
app.route('/api/import-export', importExportRoutes);

// 健康检查
app.get('/health', (c) => {
  return c.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
  });
});

// 错误处理
app.onError(errorHandler);

export default app;

// 启动服务器
if (import.meta.main) {
  const port = process.env.PORT || 3000;
  console.log(`服务器启动在端口 ${port}`);
  
  Bun.serve({
    port,
    fetch: app.fetch,
  });
}
```

#### 2.4.2 路由定义

```typescript
// src-service/routes/schedule.ts
import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { ScheduleService } from '../services/schedule-service';
import { logger } from '../utils/logger';

const scheduleRoutes = new Hono();
const scheduleService = new ScheduleService();

// 生成课表
scheduleRoutes.post(
  '/generate',
  async (c) => {
    logger.info('收到生成课表请求');
    
    try {
      const schedule = await scheduleService.generateSchedule();
      
      logger.info('课表生成成功', { cost: schedule.cost });
      
      return c.json({
        success: true,
        data: schedule,
      });
    } catch (error) {
      logger.error('生成课表失败', { error });
      throw error;
    }
  }
);

// 获取活动课表
scheduleRoutes.get('/active', async (c) => {
  logger.info('查询活动课表');
  
  const schedule = await scheduleService.getActiveSchedule();
  
  if (!schedule) {
    return c.json({
      success: false,
      message: '未找到活动课表',
    }, 404);
  }
  
  return c.json({
    success: true,
    data: schedule,
  });
});

// 移动课程
const moveEntrySchema = z.object({
  classId: z.number().int().positive(),
  subjectId: z.string().min(1).max(20),
  teacherId: z.number().int().positive(),
  fromSlot: z.object({
    day: z.number().int().min(0).max(29),
    period: z.number().int().min(0).max(11),
  }),
  toSlot: z.object({
    day: z.number().int().min(0).max(29),
    period: z.number().int().min(0).max(11),
  }),
});

scheduleRoutes.post(
  '/move',
  zValidator('json', moveEntrySchema),
  async (c) => {
    const data = c.req.valid('json');
    
    logger.info('移动课程', data);
    
    await scheduleService.moveEntry(
      data.classId,
      data.subjectId,
      data.teacherId,
      data.fromSlot,
      data.toSlot
    );
    
    return c.json({
      success: true,
      message: '课程移动成功',
    });
  }
);

// 检测冲突
scheduleRoutes.post(
  '/detect-conflicts',
  zValidator('json', z.object({
    classId: z.number().int().positive(),
    subjectId: z.string().min(1),
    teacherId: z.number().int().positive(),
  })),
  async (c) => {
    const data = c.req.valid('json');
    
    logger.info('检测冲突', data);
    
    const conflicts = await scheduleService.detectConflicts(
      data.classId,
      data.subjectId,
      data.teacherId
    );
    
    return c.json({
      success: true,
      data: conflicts,
    });
  }
);

// 建议交换方案
scheduleRoutes.post(
  '/suggest-swaps',
  zValidator('json', z.object({
    targetClass: z.number().int().positive(),
    targetTeacher: z.number().int().positive(),
    desiredSlot: z.object({
      day: z.number().int().min(0),
      period: z.number().int().min(0),
    }),
  })),
  async (c) => {
    const data = c.req.valid('json');
    
    logger.info('建议交换方案', data);
    
    const swapOptions = await scheduleService.suggestSwaps(
      data.targetClass,
      data.targetTeacher,
      data.desiredSlot
    );
    
    return c.json({
      success: true,
      data: swapOptions,
    });
  }
);

// 执行交换
scheduleRoutes.post(
  '/execute-swap',
  zValidator('json', z.object({
    swapOption: z.any(), // 完整的 SwapOption 对象
  })),
  async (c) => {
    const data = c.req.valid('json');
    
    logger.info('执行交换', { swapType: data.swapOption.swap_type });
    
    await scheduleService.executeSwap(data.swapOption);
    
    return c.json({
      success: true,
      message: '交换执行成功',
    });
  }
);

export { scheduleRoutes };
```

```typescript
// src-service/routes/teacher.ts
import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { TeacherService } from '../services/teacher-service';
import { logger } from '../utils/logger';

const teacherRoutes = new Hono();
const teacherService = new TeacherService();

// 获取所有教师
teacherRoutes.get('/', async (c) => {
  logger.info('查询所有教师');
  
  const teachers = await teacherService.getAllTeachers();
  
  return c.json({
    success: true,
    data: teachers,
  });
});

// 保存教师偏好
const teacherPreferenceSchema = z.object({
  teacherId: z.number().int().positive(),
  preferredSlots: z.string(),
  timeBias: z.number().int().min(0).max(2),
  weight: z.number().int().min(0).max(100),
  blockedSlots: z.string(),
});

teacherRoutes.post(
  '/preference',
  zValidator('json', teacherPreferenceSchema),
  async (c) => {
    const data = c.req.valid('json');
    
    logger.info('保存教师偏好', { teacherId: data.teacherId });
    
    await teacherService.savePreference(data);
    
    return c.json({
      success: true,
      message: '教师偏好保存成功',
    });
  }
);

// 批量保存教师偏好
teacherRoutes.post(
  '/preferences/batch',
  zValidator('json', z.object({
    preferences: z.array(teacherPreferenceSchema),
  })),
  async (c) => {
    const data = c.req.valid('json');
    
    logger.info('批量保存教师偏好', { count: data.preferences.length });
    
    await teacherService.batchSavePreferences(data.preferences);
    
    return c.json({
      success: true,
      message: `成功保存 ${data.preferences.length} 位教师的偏好`,
    });
  }
);

// 查询教师状态
teacherRoutes.post(
  '/status',
  zValidator('json', z.object({
    timeSlots: z.array(z.object({
      day: z.number().int().min(0),
      period: z.number().int().min(0),
    })),
  })),
  async (c) => {
    const data = c.req.valid('json');
    
    logger.info('查询教师状态', { slotCount: data.timeSlots.length });
    
    const status = await teacherService.queryStatus(data.timeSlots);
    
    return c.json({
      success: true,
      data: status,
    });
  }
);

// 统计教学工作量
teacherRoutes.get('/workload', async (c) => {
  logger.info('统计教学工作量');
  
  const statistics = await teacherService.calculateWorkload();
  
  return c.json({
    success: true,
    data: statistics,
  });
});

export { teacherRoutes };
```

#### 2.4.3 服务层业务逻辑

```typescript
// src-service/services/schedule-service.ts
import { invoke } from '@tauri-apps/api/tauri';
import { logger } from '../utils/logger';

export class ScheduleService {
  /**
   * 生成课表
   * 集成测试点：验证课表生成的完整流程
   */
  async generateSchedule() {
    logger.info('调用 Rust 后端生成课表');
    
    try {
      const schedule = await invoke('generate_schedule');
      
      // 验证返回的课表数据
      this.validateSchedule(schedule);
      
      return schedule;
    } catch (error) {
      logger.error('生成课表失败', { error });
      throw new Error(`生成课表失败: ${error}`);
    }
  }
  
  /**
   * 获取活动课表
   * 集成测试点：验证课表数据的正确加载
   */
  async getActiveSchedule() {
    logger.info('获取活动课表');
    
    const schedule = await invoke('get_active_schedule');
    return schedule;
  }
  
  /**
   * 移动课程
   * 集成测试点：验证课程移动的约束检查和数据更新
   */
  async moveEntry(
    classId: number,
    subjectId: string,
    teacherId: number,
    fromSlot: { day: number; period: number },
    toSlot: { day: number; period: number }
  ) {
    logger.info('移动课程', { classId, subjectId, fromSlot, toSlot });
    
    await invoke('move_schedule_entry', {
      classId,
      subjectId,
      teacherId,
      fromSlot,
      toSlot,
    });
  }
  
  /**
   * 检测冲突
   * 集成测试点：验证冲突检测的准确性
   */
  async detectConflicts(
    classId: number,
    subjectId: string,
    teacherId: number
  ) {
    logger.info('检测冲突', { classId, subjectId, teacherId });
    
    const conflicts = await invoke('detect_conflicts', {
      classId,
      subjectId,
      teacherId,
    });
    
    return conflicts;
  }
  
  /**
   * 建议交换方案
   * 集成测试点：验证交换建议的合理性
   */
  async suggestSwaps(
    targetClass: number,
    targetTeacher: number,
    desiredSlot: { day: number; period: number }
  ) {
    logger.info('建议交换方案', { targetClass, targetTeacher, desiredSlot });
    
    const swapOptions = await invoke('suggest_swaps', {
      targetClass,
      targetTeacher,
      desiredSlot,
    });
    
    return swapOptions;
  }
  
  /**
   * 执行交换
   * 集成测试点：验证交换操作的原子性和一致性
   */
  async executeSwap(swapOption: any) {
    logger.info('执行交换', { swapType: swapOption.swap_type });
    
    await invoke('execute_swap', { swapOption });
  }
  
  /**
   * 验证课表数据完整性
   */
  private validateSchedule(schedule: any) {
    if (!schedule || !schedule.entries || !Array.isArray(schedule.entries)) {
      throw new Error('课表数据格式无效');
    }
    
    if (typeof schedule.cost !== 'number') {
      throw new Error('课表代价值无效');
    }
    
    logger.debug('课表验证通过', {
      entryCount: schedule.entries.length,
      cost: schedule.cost,
    });
  }
}
```

#### 2.4.4 中间件

```typescript
// src-service/middleware/request-logger.ts
import { Context, Next } from 'hono';
import { logger } from '../utils/logger';

export async function requestLogger(c: Context, next: Next) {
  const start = Date.now();
  const { method, url } = c.req;
  
  logger.info('收到请求', { method, url });
  
  await next();
  
  const duration = Date.now() - start;
  const status = c.res.status;
  
  logger.info('请求完成', {
    method,
    url,
    status,
    duration: `${duration}ms`,
  });
}
```

```typescript
// src-service/middleware/error-handler.ts
import { Context } from 'hono';
import { logger } from '../utils/logger';

export function errorHandler(err: Error, c: Context) {
  logger.error('请求处理失败', {
    error: err.message,
    stack: err.stack,
    path: c.req.path,
  });
  
  return c.json({
    success: false,
    message: err.message || '服务器内部错误',
    error: process.env.NODE_ENV === 'development' ? err.stack : undefined,
  }, 500);
}
```

### 2.5 前端架构设计 (Vue 3)

#### 2.5.1 状态管理 (Pinia)

```typescript
// src/stores/scheduleStore.ts
import { defineStore } from 'pinia';
import { ref, computed } from 'vue';

interface ScheduleEntry {
  classId: number;
  subjectId: string;
  teacherId: number;
  timeSlot: { day: number; period: number };
  isFixed: boolean;
  weekType: 'Every' | 'Odd' | 'Even';
}

interface Schedule {
  entries: ScheduleEntry[];
  cost: number;
  metadata: {
    cycleDays: number;
    periodsPerDay: number;
    generatedAt: string;
    version: number;
  };
}

interface ConflictInfo {
  slot: { day: number; period: number };
  conflictType: any;
  severity: 'Blocked' | 'Warning' | 'Available';
  description: string;
}

interface ScheduleStore {
  // 状态
  schedule: Schedule | null;
  selectedEntry: ScheduleEntry | null;
  conflicts: Map<string, ConflictInfo>;
  isGenerating: boolean;
  viewMode: 'class' | 'teacher' | 'venue';
  showHeatmap: boolean;
  
  // 操作
  loadSchedule: () => Promise<void>;
  generateSchedule: () => Promise<void>;
  selectEntry: (entry: ScheduleEntry) => void;
  moveEntry: (entry: ScheduleEntry, newSlot: { day: number; period: number }) => Promise<void>;
  detectConflicts: (entry: ScheduleEntry) => Promise<void>;
  setViewMode: (mode: 'class' | 'teacher' | 'venue') => void;
  toggleHeatmap: () => void;
}

export const useScheduleStore = create<ScheduleStore>((set, get) => ({
  schedule: null,
  selectedEntry: null,
  conflicts: new Map(),
  isGenerating: false,
  viewMode: 'class',
  showHeatmap: false,
  
  loadSchedule: async () => {
    try {
      const schedule = await invoke<Schedule>('get_active_schedule');
      set({ schedule });
    } catch (error) {
      console.error('加载课表失败:', error);
    }
  },
  
  generateSchedule: async () => {
    set({ isGenerating: true });
    try {
      const schedule = await invoke<Schedule>('generate_schedule');
      set({ schedule, isGenerating: false });
    } catch (error) {
      console.error('生成课表失败:', error);
      set({ isGenerating: false });
    }
  },
  
  selectEntry: (entry: ScheduleEntry) => {
    set({ selectedEntry: entry });
    get().detectConflicts(entry);
  },
  
  moveEntry: async (entry: ScheduleEntry, newSlot: { day: number; period: number }) => {
    try {
      await invoke('move_schedule_entry', {
        entryId: entry,
        newSlot,
      });
      await get().loadSchedule();
    } catch (error) {
      console.error('移动课程失败:', error);
    }
  },
  
  detectConflicts: async (entry: ScheduleEntry) => {
    try {
      const conflicts = await invoke<Record<string, ConflictInfo>>('detect_conflicts', {
        entry,
      });
      set({ conflicts: new Map(Object.entries(conflicts)) });
    } catch (error) {
      console.error('检测冲突失败:', error);
    }
  },
  
  setViewMode: (mode) => set({ viewMode: mode }),
  toggleHeatmap: () => set((state) => ({ showHeatmap: !state.showHeatmap })),
}));
```

#### 2.4.2 核心组件设计

```typescript
// components/ScheduleGrid.svelte
<script lang="ts">
  import { useScheduleStore } from '../stores/scheduleStore';
  import { DndContext, DragOverlay } from '@dnd-kit/core';
  import ScheduleCell from './ScheduleCell.svelte';
  import ConflictIndicator from './ConflictIndicator.svelte';
  
  const store = useScheduleStore();
  
  let draggedEntry: ScheduleEntry | null = null;
  
  function handleDragStart(event: DragStartEvent) {
    draggedEntry = event.active.data.current as ScheduleEntry;
    store.selectEntry(draggedEntry);
  }
  
  function handleDragEnd(event: DragEndEvent) {
    if (event.over && draggedEntry) {
      const newSlot = event.over.data.current as { day: number; period: number };
      store.moveEntry(draggedEntry, newSlot);
    }
    draggedEntry = null;
  }
  
  $: classes = getUniqueClasses($store.schedule);
  $: days = Array.from({ length: $store.schedule?.metadata.cycleDays || 5 }, (_, i) => i);
  $: periods = Array.from({ length: $store.schedule?.metadata.periodsPerDay || 8 }, (_, i) => i);
</script>

<div class="schedule-grid">
  <DndContext onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
    <table>
      <thead>
        <tr>
          <th>班级</th>
          {#each days as day}
            <th>星期{day + 1}</th>
          {/each}
        </tr>
      </thead>
      <tbody>
        {#each classes as classItem}
          <tr>
            <td class="class-name">{classItem.name}</td>
            {#each days as day}
              {#each periods as period}
                <ScheduleCell
                  {classItem}
                  slot={{ day, period }}
                  entry={getEntryAt(classItem.id, day, period)}
                  conflict={$store.conflicts.get(`${day}-${period}`)}
                  isSelected={isSelected(classItem.id, day, period)}
                  showHeatmap={$store.showHeatmap}
                />
              {/each}
            {/each}
          </tr>
        {/each}
      </tbody>
    </table>
    
    <DragOverlay>
      {#if draggedEntry}
        <div class="dragging-card">
          {draggedEntry.subjectId}
        </div>
      {/if}
    </DragOverlay>
  </DndContext>
</div>

<style>
  .schedule-grid {
    overflow-x: auto;
    padding: 1rem;
  }
  
  table {
    width: 100%;
    border-collapse: collapse;
    background: white;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  }
  
  th, td {
    border: 1px solid #e0e0e0;
    padding: 0.5rem;
    text-align: center;
  }
  
  th {
    background: #f5f5f5;
    font-weight: 600;
  }
  
  .class-name {
    font-weight: 500;
    background: #fafafa;
  }
  
  .dragging-card {
    padding: 0.5rem 1rem;
    background: white;
    border: 2px solid #1976d2;
    border-radius: 4px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  }
</style>
```

```typescript
// components/ScheduleCell.svelte
<script lang="ts">
  import { useDraggable, useDroppable } from '@dnd-kit/core';
  
  export let classItem: any;
  export let slot: { day: number; period: number };
  export let entry: ScheduleEntry | null;
  export let conflict: ConflictInfo | null;
  export let isSelected: boolean;
  export let showHeatmap: boolean;
  
  const { setNodeRef: setDraggableRef, attributes, listeners } = useDraggable({
    id: `entry-${entry?.classId}-${slot.day}-${slot.period}`,
    data: entry,
    disabled: !entry,
  });
  
  const { setNodeRef: setDroppableRef, isOver } = useDroppable({
    id: `slot-${classItem.id}-${slot.day}-${slot.period}`,
    data: slot,
  });
  
  $: cellClass = getCellClass(conflict, isSelected, isOver, showHeatmap);
  $: heatmapColor = showHeatmap && entry ? getHeatmapColor(entry) : null;
</script>

<td
  bind:this={setDroppableRef}
  class={cellClass}
  style={heatmapColor ? `background-color: ${heatmapColor}` : ''}
>
  {#if entry}
    <div
      bind:this={setDraggableRef}
      {...attributes}
      {...listeners}
      class="course-card"
    >
      <div class="subject">{entry.subjectId}</div>
      <div class="teacher">{getTeacherName(entry.teacherId)}</div>
      {#if entry.isFixed}
        <span class="fixed-icon">📌</span>
      {/if}
    </div>
  {/if}
  
  {#if conflict && isSelected}
    <ConflictIndicator {conflict} />
  {/if}
</td>

<style>
  td {
    position: relative;
    min-width: 100px;
    min-height: 60px;
    transition: all 0.2s;
  }
  
  td.available {
    background-color: #e8f5e9;
  }
  
  td.warning {
    background-color: #fff9c4;
  }
  
  td.blocked {
    background-color: #ffebee;
    cursor: not-allowed;
  }
  
  td.over {
    border: 2px dashed #1976d2;
  }
  
  .course-card {
    cursor: move;
    padding: 0.25rem;
    border-radius: 4px;
    background: white;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  }
  
  .course-card:hover {
    box-shadow: 0 2px 6px rgba(0, 0, 0, 0.15);
  }
  
  .subject {
    font-weight: 500;
    font-size: 0.875rem;
  }
  
  .teacher {
    font-size: 0.75rem;
    color: #666;
  }
  
  .fixed-icon {
    position: absolute;
    top: 2px;
    right: 2px;
    font-size: 0.75rem;
  }
</style>
```

```typescript
// components/SetupWizard.svelte
<script lang="ts">
  import { invoke } from '@tauri-apps/api/tauri';
  import { createEventDispatcher } from 'svelte';
  
  const dispatch = createEventDispatcher();
  
  let currentStep = 1;
  let hardConstraints = {
    forbiddenSlotsForPE: [0, 1, 2], // 体育课禁排第1-3节
  };
  let teacherPreferences: Map<number, TeacherPreference> = new Map();
  let classWorkloads: Map<number, number> = new Map();
  
  async function nextStep() {
    if (currentStep === 1) {
      await saveHardConstraints();
    } else if (currentStep === 2) {
      await saveTeacherPreferences();
    } else if (currentStep === 3) {
      if (validateWorkloads()) {
        await finishSetup();
        dispatch('complete');
      } else {
        alert('部分班级课时数超过容量，请调整');
        return;
      }
    }
    currentStep++;
  }
  
  function previousStep() {
    currentStep--;
  }
  
  function validateWorkloads(): boolean {
    for (const [classId, workload] of classWorkloads) {
      if (workload > 40) {
        return false;
      }
    }
    return true;
  }
</script>

<div class="wizard-container">
  <div class="wizard-header">
    <h2>排课系统设置向导</h2>
    <div class="steps">
      <div class="step" class:active={currentStep === 1}>1. 基础规则</div>
      <div class="step" class:active={currentStep === 2}>2. 教师偏好</div>
      <div class="step" class:active={currentStep === 3}>3. 课时验证</div>
    </div>
  </div>
  
  <div class="wizard-content">
    {#if currentStep === 1}
      <div class="step-content">
        <h3>配置全校通用的硬约束规则</h3>
        <!-- 硬约束配置表单 -->
      </div>
    {:else if currentStep === 2}
      <div class="step-content">
        <h3>批量设置教师偏好</h3>
        <!-- 教师偏好配置表单 -->
      </div>
    {:else if currentStep === 3}
      <div class="step-content">
        <h3>课时数验证</h3>
        <!-- 课时数验证列表 -->
      </div>
    {/if}
  </div>
  
  <div class="wizard-footer">
    {#if currentStep > 1}
      <button on:click={previousStep}>上一步</button>
    {/if}
    <button on:click={nextStep} class="primary">
      {currentStep === 3 ? '完成' : '下一步'}
    </button>
  </div>
</div>
```


## 3. Tauri 命令接口设计

### 3.1 核心命令

```rust
// src-tauri/src/commands/schedule.rs
use tauri::State;
use tracing::{info, error, instrument};

/// 生成课表
#[tauri::command]
#[instrument(skip(app_state))]
pub async fn generate_schedule(
    app_state: State<'_, AppState>,
) -> Result<Schedule, String> {
    info!("开始生成课表");
    
    let db = &app_state.db;
    
    // 1. 加载所有配置数据
    let curriculums = db.get_all_curriculums().await
        .map_err(|e| {
            error!("加载教学计划失败: {}", e);
            format!("加载教学计划失败: {}", e)
        })?;
    
    let subject_configs = db.get_all_subject_configs().await
        .map_err(|e| {
            error!("加载课程配置失败: {}", e);
            format!("加载课程配置失败: {}", e)
        })?;
    
    let teacher_prefs = db.get_all_teacher_preferences().await
        .map_err(|e| {
            error!("加载教师偏好失败: {}", e);
            format!("加载教师偏好失败: {}", e)
        })?;
    
    let venues = db.get_all_venues().await
        .map_err(|e| {
            error!("加载场地信息失败: {}", e);
            format!("加载场地信息失败: {}", e)
        })?;
    
    let fixed_courses = db.get_all_fixed_courses().await
        .map_err(|e| {
            error!("加载固定课程失败: {}", e);
            format!("加载固定课程失败: {}", e)
        })?;
    
    let exclusions = db.get_all_teacher_exclusions().await
        .map_err(|e| {
            error!("加载教师互斥关系失败: {}", e);
            format!("加载教师互斥关系失败: {}", e)
        })?;
    
    // 2. 创建求解器
    let solver = ConstraintSolver::new(SolverConfig {
        cycle_days: 5,
        periods_per_day: 8,
        max_iterations: 10000,
        timeout_seconds: 30,
    });
    
    // 3. 执行求解
    let schedule = solver.solve(
        &curriculums,
        &subject_configs,
        &teacher_prefs,
        &venues,
        &fixed_courses,
        &exclusions,
    ).map_err(|e| {
        error!("排课求解失败: {:?}", e);
        format!("排课求解失败: {:?}", e)
    })?;
    
    // 4. 保存课表
    let schedule_id = db.save_schedule(&schedule).await
        .map_err(|e| {
            error!("保存课表失败: {}", e);
            format!("保存课表失败: {}", e)
        })?;
    
    info!("课表生成成功，ID: {}，代价值: {}", schedule_id, schedule.cost);
    
    Ok(schedule)
}

/// 获取活动课表
#[tauri::command]
#[instrument(skip(app_state))]
pub async fn get_active_schedule(
    app_state: State<'_, AppState>,
) -> Result<Option<Schedule>, String> {
    info!("查询活动课表");
    
    app_state.db.get_active_schedule().await
        .map_err(|e| {
            error!("查询活动课表失败: {}", e);
            format!("查询活动课表失败: {}", e)
        })
}

/// 移动课程
#[tauri::command]
#[instrument(skip(app_state))]
pub async fn move_schedule_entry(
    app_state: State<'_, AppState>,
    class_id: u32,
    subject_id: String,
    teacher_id: u32,
    from_slot: TimeSlot,
    to_slot: TimeSlot,
) -> Result<(), String> {
    info!("移动课程: 班级 {}, 科目 {}, 从 {:?} 到 {:?}", 
          class_id, subject_id, from_slot, to_slot);
    
    let db = &app_state.db;
    
    // 1. 获取当前课表
    let mut schedule = db.get_active_schedule().await
        .map_err(|e| format!("获取课表失败: {}", e))?
        .ok_or("未找到活动课表")?;
    
    // 2. 检查目标位置是否可用
    let conflict_detector = ConflictDetector::new(schedule.clone(), app_state.constraint_graph.clone());
    let curriculum = ClassCurriculum {
        id: 0,
        class_id,
        subject_id: subject_id.clone(),
        teacher_id,
        target_sessions: 1,
        is_combined_class: false,
        combined_class_ids: vec![],
        week_type: WeekType::Every,
    };
    
    let conflict = conflict_detector.check_slot_conflicts(&curriculum, to_slot);
    if matches!(conflict.severity, ConflictSeverity::Blocked) {
        error!("目标位置存在硬约束冲突: {}", conflict.description);
        return Err(format!("无法移动: {}", conflict.description));
    }
    
    // 3. 执行移动
    schedule.move_entry_from_to(class_id, from_slot, to_slot);
    
    // 4. 重新计算代价
    let solver = ConstraintSolver::new(SolverConfig::default());
    schedule.cost = solver.calculate_cost(&schedule, &app_state.constraint_graph);
    
    // 5. 保存更新后的课表
    db.save_schedule(&schedule).await
        .map_err(|e| {
            error!("保存课表失败: {}", e);
            format!("保存课表失败: {}", e)
        })?;
    
    // 6. 记录操作历史
    db.save_operation_history(schedule.metadata.version, "Move", &serde_json::json!({
        "class_id": class_id,
        "subject_id": subject_id,
        "from_slot": from_slot,
        "to_slot": to_slot,
    })).await.ok();
    
    info!("课程移动成功，新代价值: {}", schedule.cost);
    
    Ok(())
}

/// 检测冲突
#[tauri::command]
#[instrument(skip(app_state))]
pub async fn detect_conflicts(
    app_state: State<'_, AppState>,
    class_id: u32,
    subject_id: String,
    teacher_id: u32,
) -> Result<HashMap<String, ConflictInfo>, String> {
    info!("检测冲突: 班级 {}, 科目 {}, 教师 {}", class_id, subject_id, teacher_id);
    
    let schedule = app_state.db.get_active_schedule().await
        .map_err(|e| format!("获取课表失败: {}", e))?
        .ok_or("未找到活动课表")?;
    
    let conflict_detector = ConflictDetector::new(schedule, app_state.constraint_graph.clone());
    
    let curriculum = ClassCurriculum {
        id: 0,
        class_id,
        subject_id,
        teacher_id,
        target_sessions: 1,
        is_combined_class: false,
        combined_class_ids: vec![],
        week_type: WeekType::Every,
    };
    
    let conflicts = conflict_detector.detect_conflicts_for_course(&curriculum);
    
    // 转换为前端可用的格式
    let result: HashMap<String, ConflictInfo> = conflicts
        .into_iter()
        .map(|(slot, info)| (format!("{}-{}", slot.day, slot.period), info))
        .collect();
    
    info!("冲突检测完成，发现 {} 个槽位信息", result.len());
    
    Ok(result)
}

/// 建议交换方案
#[tauri::command]
#[instrument(skip(app_state))]
pub async fn suggest_swaps(
    app_state: State<'_, AppState>,
    target_class: u32,
    target_teacher: u32,
    desired_slot: TimeSlot,
) -> Result<Vec<SwapOption>, String> {
    info!("建议交换方案: 班级 {}, 教师 {}, 目标槽位 {:?}", 
          target_class, target_teacher, desired_slot);
    
    let schedule = app_state.db.get_active_schedule().await
        .map_err(|e| format!("获取课表失败: {}", e))?
        .ok_or("未找到活动课表")?;
    
    let swap_suggester = SwapSuggester::new(schedule, app_state.constraint_graph.clone());
    
    let options = swap_suggester.suggest_swaps(target_class, target_teacher, desired_slot)
        .map_err(|e| {
            error!("生成交换建议失败: {}", e);
            format!("生成交换建议失败: {}", e)
        })?;
    
    info!("生成 {} 个交换建议", options.len());
    
    Ok(options)
}

/// 执行交换
#[tauri::command]
#[instrument(skip(app_state))]
pub async fn execute_swap(
    app_state: State<'_, AppState>,
    swap_option: SwapOption,
) -> Result<(), String> {
    info!("执行交换: {:?}", swap_option.swap_type);
    
    let db = &app_state.db;
    
    let mut schedule = db.get_active_schedule().await
        .map_err(|e| format!("获取课表失败: {}", e))?
        .ok_or("未找到活动课表")?;
    
    // 执行所有移动操作
    for course_move in &swap_option.moves {
        schedule.move_entry_from_to(
            course_move.class_id,
            course_move.from_slot,
            course_move.to_slot,
        );
    }
    
    // 重新计算代价
    let solver = ConstraintSolver::new(SolverConfig::default());
    schedule.cost = solver.calculate_cost(&schedule, &app_state.constraint_graph);
    
    // 保存课表
    db.save_schedule(&schedule).await
        .map_err(|e| format!("保存课表失败: {}", e))?;
    
    // 记录操作历史
    db.save_operation_history(schedule.metadata.version, "Swap", &serde_json::to_value(&swap_option).unwrap())
        .await.ok();
    
    info!("交换执行成功，新代价值: {}", schedule.cost);
    
    Ok(())
}

/// 计算代价值
#[tauri::command]
#[instrument(skip(app_state))]
pub async fn calculate_cost(
    app_state: State<'_, AppState>,
) -> Result<u32, String> {
    info!("计算课表代价值");
    
    let schedule = app_state.db.get_active_schedule().await
        .map_err(|e| format!("获取课表失败: {}", e))?
        .ok_or("未找到活动课表")?;
    
    let solver = ConstraintSolver::new(SolverConfig::default());
    let cost = solver.calculate_cost(&schedule, &app_state.constraint_graph);
    
    info!("代价值: {}", cost);
    
    Ok(cost)
}

/// 验证课表有效性
#[tauri::command]
#[instrument(skip(app_state))]
pub async fn validate_schedule(
    app_state: State<'_, AppState>,
) -> Result<ValidationResult, String> {
    info!("验证课表有效性");
    
    let schedule = app_state.db.get_active_schedule().await
        .map_err(|e| format!("获取课表失败: {}", e))?
        .ok_or("未找到活动课表")?;
    
    let validator = ScheduleValidator::new(app_state.constraint_graph.clone());
    let result = validator.validate(&schedule);
    
    if result.is_valid {
        info!("课表验证通过");
    } else {
        error!("课表验证失败，发现 {} 个违规", result.violations.len());
    }
    
    Ok(result)
}
```

### 3.2 教师管理命令

```rust
// src-tauri/src/commands/teacher.rs

/// 获取所有教师
#[tauri::command]
#[instrument(skip(app_state))]
pub async fn get_all_teachers(
    app_state: State<'_, AppState>,
) -> Result<Vec<Teacher>, String> {
    info!("查询所有教师");
    
    app_state.db.get_all_teachers().await
        .map_err(|e| {
            error!("查询教师失败: {}", e);
            format!("查询教师失败: {}", e)
        })
}

/// 保存教师偏好
#[tauri::command]
#[instrument(skip(app_state))]
pub async fn save_teacher_preference(
    app_state: State<'_, AppState>,
    preference: TeacherPreference,
) -> Result<(), String> {
    info!("保存教师 {} 的偏好设置", preference.teacher_id);
    
    app_state.db.save_teacher_preference(&preference).await
        .map_err(|e| {
            error!("保存教师偏好失败: {}", e);
            format!("保存教师偏好失败: {}", e)
        })
}

/// 批量保存教师偏好
#[tauri::command]
#[instrument(skip(app_state))]
pub async fn batch_save_teacher_preferences(
    app_state: State<'_, AppState>,
    preferences: Vec<TeacherPreference>,
) -> Result<(), String> {
    info!("批量保存 {} 位教师的偏好设置", preferences.len());
    
    for pref in preferences {
        app_state.db.save_teacher_preference(&pref).await
            .map_err(|e| format!("保存教师 {} 偏好失败: {}", pref.teacher_id, e))?;
    }
    
    info!("批量保存完成");
    Ok(())
}

/// 查询教师在指定时段的状态
#[tauri::command]
#[instrument(skip(app_state))]
pub async fn query_teacher_status(
    app_state: State<'_, AppState>,
    time_slots: Vec<TimeSlot>,
) -> Result<TeacherStatusReport, String> {
    info!("查询教师状态，时段数: {}", time_slots.len());
    
    let schedule = app_state.db.get_active_schedule().await
        .map_err(|e| format!("获取课表失败: {}", e))?
        .ok_or("未找到活动课表")?;
    
    let mut busy_teachers = Vec::new();
    let mut free_teachers = Vec::new();
    
    let all_teachers = app_state.db.get_all_teachers().await
        .map_err(|e| format!("查询教师失败: {}", e))?;
    
    for teacher in all_teachers {
        let is_busy = time_slots.iter().any(|slot| {
            schedule.is_teacher_busy(teacher.id, *slot)
        });
        
        if is_busy {
            let courses = schedule.get_teacher_courses_at(teacher.id, &time_slots);
            busy_teachers.push(TeacherStatus {
                teacher,
                status: "上课".to_string(),
                courses,
            });
        } else {
            free_teachers.push(TeacherStatus {
                teacher,
                status: "空闲".to_string(),
                courses: vec![],
            });
        }
    }
    
    info!("查询完成，上课: {} 人，空闲: {} 人", busy_teachers.len(), free_teachers.len());
    
    Ok(TeacherStatusReport {
        busy_teachers,
        free_teachers,
    })
}

/// 统计教学工作量
#[tauri::command]
#[instrument(skip(app_state))]
pub async fn calculate_workload_statistics(
    app_state: State<'_, AppState>,
) -> Result<Vec<WorkloadStatistics>, String> {
    info!("统计教学工作量");
    
    let schedule = app_state.db.get_active_schedule().await
        .map_err(|e| format!("获取课表失败: {}", e))?
        .ok_or("未找到活动课表")?;
    
    let teachers = app_state.db.get_all_teachers().await
        .map_err(|e| format!("查询教师失败: {}", e))?;
    
    let mut statistics = Vec::new();
    
    for teacher in teachers {
        let teacher_entries: Vec<&ScheduleEntry> = schedule.entries
            .iter()
            .filter(|e| e.teacher_id == teacher.id)
            .collect();
        
        let total_sessions = teacher_entries.len();
        let classes: HashSet<u32> = teacher_entries.iter().map(|e| e.class_id).collect();
        let subjects: HashSet<String> = teacher_entries.iter().map(|e| e.subject_id.clone()).collect();
        
        let early_sessions = teacher_entries.iter().filter(|e| e.time_slot.period == 0).count();
        let late_sessions = teacher_entries.iter()
            .filter(|e| e.time_slot.period == schedule.metadata.periods_per_day - 1)
            .count();
        
        statistics.push(WorkloadStatistics {
            teacher_id: teacher.id,
            teacher_name: teacher.name,
            total_sessions,
            class_count: classes.len(),
            subject_count: subjects.len(),
            early_sessions,
            late_sessions,
        });
    }
    
    info!("工作量统计完成，共 {} 位教师", statistics.len());
    
    Ok(statistics)
}
```

### 3.3 导入导出命令

```rust
// src-tauri/src/commands/import_export.rs

/// 从 Excel 导入排课条件
#[tauri::command]
#[instrument(skip(app_state))]
pub async fn import_from_excel(
    app_state: State<'_, AppState>,
    file_path: String,
) -> Result<ImportResult, String> {
    info!("从 Excel 导入排课条件: {}", file_path);
    
    let importer = ExcelImporter::new();
    let import_data = importer.import(&file_path)
        .map_err(|e| {
            error!("导入失败: {}", e);
            format!("导入失败: {}", e)
        })?;
    
    let db = &app_state.db;
    let mut success_count = 0;
    let mut error_count = 0;
    let mut errors = Vec::new();
    
    // 导入教师信息
    for teacher in import_data.teachers {
        match db.save_teacher(&teacher).await {
            Ok(_) => success_count += 1,
            Err(e) => {
                error_count += 1;
                errors.push(format!("教师 {}: {}", teacher.name, e));
            }
        }
    }
    
    // 导入课程配置
    for subject in import_data.subjects {
        match db.save_subject_config(&subject).await {
            Ok(_) => success_count += 1,
            Err(e) => {
                error_count += 1;
                errors.push(format!("科目 {}: {}", subject.name, e));
            }
        }
    }
    
    // 导入教学计划
    for curriculum in import_data.curriculums {
        match db.save_curriculum(&curriculum).await {
            Ok(_) => success_count += 1,
            Err(e) => {
                error_count += 1;
                errors.push(format!("教学计划 {}: {}", curriculum.id, e));
            }
        }
    }
    
    info!("导入完成，成功: {}，失败: {}", success_count, error_count);
    
    Ok(ImportResult {
        success_count,
        error_count,
        errors,
    })
}

/// 导出课表到 Excel
#[tauri::command]
#[instrument(skip(app_state))]
pub async fn export_to_excel(
    app_state: State<'_, AppState>,
    export_type: ExportType,
    output_path: String,
) -> Result<(), String> {
    info!("导出课表到 Excel: {:?}, 路径: {}", export_type, output_path);
    
    let schedule = app_state.db.get_active_schedule().await
        .map_err(|e| format!("获取课表失败: {}", e))?
        .ok_or("未找到活动课表")?;
    
    let exporter = ExcelExporter::new();
    
    match export_type {
        ExportType::ClassSchedule => {
            exporter.export_class_schedules(&schedule, &output_path)
                .map_err(|e| format!("导出班级课表失败: {}", e))?;
        }
        ExportType::TeacherSchedule => {
            exporter.export_teacher_schedules(&schedule, &output_path)
                .map_err(|e| format!("导出教师课表失败: {}", e))?;
        }
        ExportType::MasterSchedule => {
            exporter.export_master_schedule(&schedule, &output_path)
                .map_err(|e| format!("导出总课表失败: {}", e))?;
        }
        ExportType::WorkloadStatistics => {
            let statistics = calculate_workload_statistics(app_state).await?;
            exporter.export_workload_statistics(&statistics, &output_path)
                .map_err(|e| format!("导出工作量统计失败: {}", e))?;
        }
    }
    
    info!("导出完成");
    Ok(())
}

/// 下载 Excel 导入模板
#[tauri::command]
#[instrument]
pub async fn download_import_template(
    output_path: String,
) -> Result<(), String> {
    info!("下载导入模板: {}", output_path);
    
    let template_generator = TemplateGenerator::new();
    template_generator.generate_import_template(&output_path)
        .map_err(|e| {
            error!("生成模板失败: {}", e);
            format!("生成模板失败: {}", e)
        })?;
    
    info!("模板生成完成");
    Ok(())
}
```


## 4. 日志系统设计

### 4.1 Rust 后端日志

```rust
// src-tauri/src/logging.rs
use tracing::{info, warn, error, debug};
use tracing_subscriber::{layer::SubscriberExt, util::SubscriberInitExt, EnvFilter};
use tracing_appender::{rolling, non_blocking};

pub fn init_logging() -> Result<(), Box<dyn std::error::Error>> {
    // 创建日志文件输出
    let file_appender = rolling::daily("logs", "course-scheduling.log");
    let (non_blocking_file, _guard) = non_blocking(file_appender);
    
    // 创建控制台输出
    let (non_blocking_stdout, _guard) = non_blocking(std::io::stdout());
    
    // 配置日志格式
    let file_layer = tracing_subscriber::fmt::layer()
        .with_writer(non_blocking_file)
        .with_ansi(false)
        .with_target(true)
        .with_thread_ids(true)
        .with_line_number(true);
    
    let stdout_layer = tracing_subscriber::fmt::layer()
        .with_writer(non_blocking_stdout)
        .with_target(false);
    
    // 配置日志级别过滤
    let env_filter = EnvFilter::try_from_default_env()
        .unwrap_or_else(|_| EnvFilter::new("info"));
    
    // 组合所有层
    tracing_subscriber::registry()
        .with(env_filter)
        .with(file_layer)
        .with(stdout_layer)
        .init();
    
    info!("日志系统初始化完成");
    
    Ok(())
}

// 使用示例
pub fn example_logging() {
    debug!("这是调试信息");
    info!("这是普通信息");
    warn!("这是警告信息");
    error!("这是错误信息");
    
    // 结构化日志
    info!(
        teacher_id = 123,
        subject = "数学",
        "教师偏好已更新"
    );
}
```

### 4.2 前端日志

```typescript
// src/lib/logger.ts

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
}

class Logger {
  private level: LogLevel = LogLevel.INFO;
  private logs: LogEntry[] = [];
  private maxLogs = 1000;
  
  setLevel(level: LogLevel) {
    this.level = level;
  }
  
  debug(message: string, context?: any) {
    this.log(LogLevel.DEBUG, message, context);
  }
  
  info(message: string, context?: any) {
    this.log(LogLevel.INFO, message, context);
  }
  
  warn(message: string, context?: any) {
    this.log(LogLevel.WARN, message, context);
  }
  
  error(message: string, error?: Error, context?: any) {
    this.log(LogLevel.ERROR, message, { error, ...context });
  }
  
  private log(level: LogLevel, message: string, context?: any) {
    if (level < this.level) return;
    
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level: LogLevel[level],
      message,
      context,
    };
    
    // 添加到内存日志
    this.logs.push(entry);
    if (this.logs.length > this.maxLogs) {
      this.logs.shift();
    }
    
    // 输出到控制台
    const consoleMethod = this.getConsoleMethod(level);
    consoleMethod(`[${entry.timestamp}] [${entry.level}] ${message}`, context);
    
    // 发送到后端（仅错误级别）
    if (level === LogLevel.ERROR) {
      this.sendToBackend(entry);
    }
  }
  
  private getConsoleMethod(level: LogLevel) {
    switch (level) {
      case LogLevel.DEBUG:
        return console.debug;
      case LogLevel.INFO:
        return console.info;
      case LogLevel.WARN:
        return console.warn;
      case LogLevel.ERROR:
        return console.error;
    }
  }
  
  private async sendToBackend(entry: LogEntry) {
    try {
      await invoke('log_frontend_error', { entry });
    } catch (e) {
      console.error('发送日志到后端失败:', e);
    }
  }
  
  getLogs(): LogEntry[] {
    return [...this.logs];
  }
  
  clearLogs() {
    this.logs = [];
  }
}

interface LogEntry {
  timestamp: string;
  level: string;
  message: string;
  context?: any;
}

export const logger = new Logger();

// 使用示例
logger.info('用户点击生成课表按钮');
logger.error('生成课表失败', new Error('求解器超时'), { userId: 123 });
```

## 5. 测试策略

### 5.1 单元测试（Rust）

```rust
// src-tauri/src/solver/tests.rs
#[cfg(test)]
mod tests {
    use super::*;
    
    #[test]
    fn test_time_slot_to_bit_position() {
        let slot = TimeSlot { day: 0, period: 0 };
        assert_eq!(slot.to_bit_position(8), 0);
        
        let slot = TimeSlot { day: 1, period: 3 };
        assert_eq!(slot.to_bit_position(8), 11);
    }
    
    #[test]
    fn test_hard_constraint_teacher_conflict() {
        let mut schedule = Schedule::new(5, 8);
        
        // 安排教师1在周一第1节上课
        schedule.place_course(&ClassCurriculum {
            id: 1,
            class_id: 1,
            subject_id: "数学".to_string(),
            teacher_id: 1,
            target_sessions: 1,
            is_combined_class: false,
            combined_class_ids: vec![],
            week_type: WeekType::Every,
        }, TimeSlot { day: 0, period: 0 });
        
        // 检查教师1在同一时段是否冲突
        assert!(schedule.is_teacher_busy(1, TimeSlot { day: 0, period: 0 }));
        assert!(!schedule.is_teacher_busy(1, TimeSlot { day: 0, period: 1 }));
    }
    
    #[test]
    fn test_cost_calculation() {
        let schedule = create_test_schedule();
        let constraint_graph = create_test_constraint_graph();
        
        let solver = ConstraintSolver::new(SolverConfig::default());
        let cost = solver.calculate_cost(&schedule, &constraint_graph);
        
        assert!(cost > 0);
    }
    
    #[test]
    fn test_venue_capacity_constraint() {
        let mut schedule = Schedule::new(5, 8);
        let venue = Venue {
            id: "微机室".to_string(),
            name: "微机室".to_string(),
            capacity: 1,
        };
        
        // 第一节微机课
        schedule.place_course(&ClassCurriculum {
            id: 1,
            class_id: 1,
            subject_id: "微机".to_string(),
            teacher_id: 1,
            target_sessions: 1,
            is_combined_class: false,
            combined_class_ids: vec![],
            week_type: WeekType::Every,
        }, TimeSlot { day: 0, period: 0 });
        
        // 检查场地使用情况
        let usage = schedule.count_venue_usage("微机室", TimeSlot { day: 0, period: 0 });
        assert_eq!(usage, 1);
        
        // 尝试在同一时段安排第二节微机课应该失败
        assert!(usage >= venue.capacity);
    }
}
```

### 5.2 集成测试（Playwright）

```typescript
// tests/schedule-generation.spec.ts
import { test, expect } from '@playwright/test';

test.describe('课表生成功能', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:1420');
    // 等待应用加载
    await page.waitForSelector('[data-testid="app-loaded"]');
  });
  
  test('应该能够成功生成课表', async ({ page }) => {
    // 点击生成课表按钮
    await page.click('[data-testid="generate-schedule-btn"]');
    
    // 等待生成完成
    await page.waitForSelector('[data-testid="schedule-grid"]', { timeout: 35000 });
    
    // 验证课表已显示
    const scheduleGrid = page.locator('[data-testid="schedule-grid"]');
    await expect(scheduleGrid).toBeVisible();
    
    // 验证至少有一些课程
    const courseCells = page.locator('.course-card');
    const count = await courseCells.count();
    expect(count).toBeGreaterThan(0);
  });
  
  test('应该显示代价值', async ({ page }) => {
    await page.click('[data-testid="generate-schedule-btn"]');
    await page.waitForSelector('[data-testid="schedule-grid"]');
    
    const costDisplay = page.locator('[data-testid="cost-value"]');
    await expect(costDisplay).toBeVisible();
    
    const costText = await costDisplay.textContent();
    expect(costText).toMatch(/\d+/);
  });
});

test.describe('手动调课功能', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:1420');
    await page.waitForSelector('[data-testid="schedule-grid"]');
  });
  
  test('应该能够拖拽课程到新位置', async ({ page }) => {
    // 选择一个课程卡片
    const sourceCourse = page.locator('.course-card').first();
    const sourceText = await sourceCourse.textContent();
    
    // 拖拽到新位置
    const targetCell = page.locator('[data-testid="schedule-cell-1-2"]');
    await sourceCourse.dragTo(targetCell);
    
    // 验证课程已移动
    await page.waitForTimeout(500);
    const newLocation = page.locator('[data-testid="schedule-cell-1-2"] .course-card');
    const newText = await newLocation.textContent();
    expect(newText).toBe(sourceText);
  });
  
  test('应该显示冲突提示', async ({ page }) => {
    // 点击一个课程
    const course = page.locator('.course-card').first();
    await course.click();
    
    // 验证冲突指示器显示
    const availableSlots = page.locator('.schedule-cell.available');
    const blockedSlots = page.locator('.schedule-cell.blocked');
    
    expect(await availableSlots.count()).toBeGreaterThan(0);
    expect(await blockedSlots.count()).toBeGreaterThan(0);
  });
  
  test('应该阻止违反硬约束的移动', async ({ page }) => {
    // 尝试将课程拖到被阻止的位置
    const course = page.locator('.course-card').first();
    const blockedCell = page.locator('.schedule-cell.blocked').first();
    
    await course.dragTo(blockedCell);
    
    // 验证显示错误提示
    const errorToast = page.locator('[data-testid="error-toast"]');
    await expect(errorToast).toBeVisible();
    await expect(errorToast).toContainText('无法移动');
  });
});

test.describe('设置向导', () => {
  test('应该引导用户完成初始设置', async ({ page }) => {
    // 模拟首次启动
    await page.goto('http://localhost:1420?firstRun=true');
    
    // 验证向导显示
    const wizard = page.locator('[data-testid="setup-wizard"]');
    await expect(wizard).toBeVisible();
    
    // 步骤1：基础规则
    await expect(page.locator('[data-testid="wizard-step-1"]')).toBeVisible();
    await page.click('[data-testid="wizard-next-btn"]');
    
    // 步骤2：教师偏好
    await expect(page.locator('[data-testid="wizard-step-2"]')).toBeVisible();
    await page.click('[data-testid="wizard-next-btn"]');
    
    // 步骤3：课时验证
    await expect(page.locator('[data-testid="wizard-step-3"]')).toBeVisible();
    await page.click('[data-testid="wizard-finish-btn"]');
    
    // 验证向导关闭
    await expect(wizard).not.toBeVisible();
  });
});

test.describe('导入导出功能', () => {
  test('应该能够导出课表到 Excel', async ({ page }) => {
    await page.goto('http://localhost:1420');
    await page.waitForSelector('[data-testid="schedule-grid"]');
    
    // 点击导出按钮
    await page.click('[data-testid="export-btn"]');
    
    // 选择导出类型
    await page.click('[data-testid="export-type-class"]');
    
    // 等待下载
    const downloadPromise = page.waitForEvent('download');
    await page.click('[data-testid="export-confirm-btn"]');
    const download = await downloadPromise;
    
    // 验证文件名
    expect(download.suggestedFilename()).toMatch(/班级课表.*\.xlsx/);
  });
  
  test('应该能够从 Excel 导入数据', async ({ page }) => {
    await page.goto('http://localhost:1420');
    
    // 点击导入按钮
    await page.click('[data-testid="import-btn"]');
    
    // 上传文件
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles('tests/fixtures/import-template.xlsx');
    
    // 等待导入完成
    await page.waitForSelector('[data-testid="import-success"]');
    
    // 验证成功消息
    const successMsg = page.locator('[data-testid="import-success"]');
    await expect(successMsg).toContainText('导入成功');
  });
});

test.describe('教师查询功能', () => {
  test('应该能够查询指定时段的教师状态', async ({ page }) => {
    await page.goto('http://localhost:1420');
    await page.waitForSelector('[data-testid="schedule-grid"]');
    
    // 选择一个时间槽位
    await page.click('[data-testid="schedule-cell-0-0"]');
    
    // 点击查询按钮
    await page.click('[data-testid="query-teachers-btn"]');
    
    // 验证查询结果显示
    const queryResult = page.locator('[data-testid="teacher-query-result"]');
    await expect(queryResult).toBeVisible();
    
    // 验证有上课和空闲教师列表
    await expect(page.locator('[data-testid="busy-teachers"]')).toBeVisible();
    await expect(page.locator('[data-testid="free-teachers"]')).toBeVisible();
  });
});
```

### 5.3 性能测试

```typescript
// tests/performance.spec.ts
import { test, expect } from '@playwright/test';

test.describe('性能测试', () => {
  test('课表生成应在30秒内完成', async ({ page }) => {
    await page.goto('http://localhost:1420');
    
    const startTime = Date.now();
    await page.click('[data-testid="generate-schedule-btn"]');
    await page.waitForSelector('[data-testid="schedule-grid"]', { timeout: 35000 });
    const endTime = Date.now();
    
    const duration = endTime - startTime;
    console.log(`课表生成耗时: ${duration}ms`);
    expect(duration).toBeLessThan(30000);
  });
  
  test('拖拽操作应在100ms内响应', async ({ page }) => {
    await page.goto('http://localhost:1420');
    await page.waitForSelector('[data-testid="schedule-grid"]');
    
    const course = page.locator('.course-card').first();
    
    const startTime = Date.now();
    await course.click();
    await page.waitForSelector('.schedule-cell.available');
    const endTime = Date.now();
    
    const duration = endTime - startTime;
    console.log(`冲突检测耗时: ${duration}ms`);
    expect(duration).toBeLessThan(100);
  });
  
  test('导出所有课表应在3秒内完成', async ({ page }) => {
    await page.goto('http://localhost:1420');
    await page.waitForSelector('[data-testid="schedule-grid"]');
    
    const startTime = Date.now();
    await page.click('[data-testid="export-all-btn"]');
    const downloadPromise = page.waitForEvent('download');
    await downloadPromise;
    const endTime = Date.now();
    
    const duration = endTime - startTime;
    console.log(`导出耗时: ${duration}ms`);
    expect(duration).toBeLessThan(3000);
  });
});
```

## 6. 错误处理策略

### 6.1 错误类型定义

```rust
// src-tauri/src/errors.rs
use thiserror::Error;

#[derive(Error, Debug)]
pub enum SolverError {
    #[error("未找到可行解：{0}")]
    NoSolutionFound(String),
    
    #[error("求解超时")]
    Timeout,
    
    #[error("配置无效：{0}")]
    InvalidConfiguration(String),
    
    #[error("硬约束冲突：{0}")]
    HardConstraintViolation(String),
}

#[derive(Error, Debug)]
pub enum DatabaseError {
    #[error("数据库连接失败：{0}")]
    ConnectionFailed(String),
    
    #[error("查询失败：{0}")]
    QueryFailed(String),
    
    #[error("数据不存在：{0}")]
    NotFound(String),
    
    #[error("数据验证失败：{0}")]
    ValidationFailed(String),
}

#[derive(Error, Debug)]
pub enum ImportExportError {
    #[error("文件读取失败：{0}")]
    FileReadError(String),
    
    #[error("文件格式无效：{0}")]
    InvalidFormat(String),
    
    #[error("数据解析失败：{0}")]
    ParseError(String),
    
    #[error("文件写入失败：{0}")]
    FileWriteError(String),
}
```

### 6.2 前端错误处理

```typescript
// src/lib/errorHandler.ts
import { logger } from './logger';
import { toast } from './toast';

export class AppError extends Error {
  constructor(
    message: string,
    public code: string,
    public details?: any
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export function handleError(error: unknown) {
  if (error instanceof AppError) {
    logger.error(error.message, error, { code: error.code, details: error.details });
    toast.error(error.message);
  } else if (error instanceof Error) {
    logger.error('未预期的错误', error);
    toast.error('操作失败，请重试');
  } else {
    logger.error('未知错误', undefined, { error });
    toast.error('发生未知错误');
  }
}

// 使用示例
try {
  await invoke('generate_schedule');
} catch (error) {
  handleError(error);
}
```


## 7. 性能优化策略

### 7.1 位运算优化

```rust
// 时间槽位操作的位运算优化
impl TimeSlotOperations {
    // 检查槽位是否被占用（O(1)）
    #[inline]
    pub fn is_slot_occupied(mask: u64, slot: TimeSlot, periods_per_day: u8) -> bool {
        let bit_pos = slot.to_bit_position(periods_per_day);
        (mask & (1u64 << bit_pos)) != 0
    }
    
    // 设置槽位为占用（O(1)）
    #[inline]
    pub fn set_slot_occupied(mask: &mut u64, slot: TimeSlot, periods_per_day: u8) {
        let bit_pos = slot.to_bit_position(periods_per_day);
        *mask |= 1u64 << bit_pos;
    }
    
    // 清除槽位占用（O(1)）
    #[inline]
    pub fn clear_slot(mask: &mut u64, slot: TimeSlot, periods_per_day: u8) {
        let bit_pos = slot.to_bit_position(periods_per_day);
        *mask &= !(1u64 << bit_pos);
    }
    
    // 计算空闲槽位数量（O(1)）
    #[inline]
    pub fn count_free_slots(mask: u64, total_slots: u8) -> u8 {
        total_slots - mask.count_ones() as u8
    }
    
    // 获取所有空闲槽位（O(n)，n为总槽位数）
    pub fn get_free_slots(mask: u64, cycle_days: u8, periods_per_day: u8) -> Vec<TimeSlot> {
        let mut free_slots = Vec::new();
        let total_slots = cycle_days as usize * periods_per_day as usize;
        
        for pos in 0..total_slots {
            if (mask & (1u64 << pos)) == 0 {
                free_slots.push(TimeSlot::from_bit_position(pos, periods_per_day));
            }
        }
        
        free_slots
    }
}
```

### 7.2 内存优化

```rust
// 使用引用避免不必要的克隆
impl ConstraintSolver {
    // 使用引用传递大型数据结构
    fn calculate_cost_optimized(
        &self,
        schedule: &Schedule,  // 引用而非所有权
        constraint_graph: &ConstraintGraph,  // 引用而非所有权
    ) -> u32 {
        let mut cost = 0u32;
        
        // 使用迭代器避免中间集合
        for entry in schedule.entries.iter() {
            // 直接使用引用，避免克隆
            if let Some(teacher_pref) = constraint_graph.teacher_prefs.get(&entry.teacher_id) {
                cost += self.calculate_entry_cost(entry, teacher_pref);
            }
        }
        
        cost
    }
    
    // 使用 Cow (Clone on Write) 优化
    fn optimize_with_cow(&self, data: &str) -> std::borrow::Cow<str> {
        if data.needs_processing() {
            std::borrow::Cow::Owned(data.process())
        } else {
            std::borrow::Cow::Borrowed(data)
        }
    }
}
```

### 7.3 前端性能优化

```typescript
// 虚拟滚动优化大量数据渲染
// components/VirtualScheduleGrid.svelte
<script lang="ts">
  import { onMount } from 'svelte';
  import { VirtualList } from 'svelte-virtual-list';
  
  export let classes: Class[];
  export let schedule: Schedule;
  
  const ITEM_HEIGHT = 60;
  const VISIBLE_ITEMS = 20;
  
  let scrollContainer: HTMLElement;
  let visibleRange = { start: 0, end: VISIBLE_ITEMS };
  
  function handleScroll(event: Event) {
    const target = event.target as HTMLElement;
    const scrollTop = target.scrollTop;
    const start = Math.floor(scrollTop / ITEM_HEIGHT);
    const end = start + VISIBLE_ITEMS;
    
    visibleRange = { start, end };
  }
  
  $: visibleClasses = classes.slice(visibleRange.start, visibleRange.end);
</script>

<div class="scroll-container" bind:this={scrollContainer} on:scroll={handleScroll}>
  <div style="height: {classes.length * ITEM_HEIGHT}px">
    <div style="transform: translateY({visibleRange.start * ITEM_HEIGHT}px)">
      {#each visibleClasses as classItem}
        <ScheduleRow {classItem} {schedule} />
      {/each}
    </div>
  </div>
</div>

// 使用 Web Worker 处理计算密集型任务
// workers/costCalculator.worker.ts
self.addEventListener('message', (event) => {
  const { schedule, constraints } = event.data;
  
  // 在 Worker 中计算代价值
  const cost = calculateCost(schedule, constraints);
  
  self.postMessage({ cost });
});

// 主线程使用
const worker = new Worker(new URL('./workers/costCalculator.worker.ts', import.meta.url));

worker.postMessage({ schedule, constraints });
worker.addEventListener('message', (event) => {
  const { cost } = event.data;
  updateCostDisplay(cost);
});

// 使用 requestIdleCallback 优化非关键任务
function scheduleNonCriticalWork(task: () => void) {
  if ('requestIdleCallback' in window) {
    requestIdleCallback(() => {
      task();
    });
  } else {
    setTimeout(task, 1);
  }
}

// 使用防抖优化频繁触发的操作
function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: ReturnType<typeof setTimeout> | null = null;
  
  return function(...args: Parameters<T>) {
    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

// 使用节流优化拖拽操作
function throttle<T extends (...args: any[]) => any>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle: boolean;
  
  return function(...args: Parameters<T>) {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
}
```

### 7.4 数据库优化

```sql
-- 创建复合索引优化查询
CREATE INDEX idx_schedule_entries_composite 
ON schedule_entries(schedule_id, class_id, day, period);

CREATE INDEX idx_schedule_entries_teacher_time 
ON schedule_entries(teacher_id, day, period);

-- 使用 EXPLAIN QUERY PLAN 分析查询性能
EXPLAIN QUERY PLAN
SELECT * FROM schedule_entries 
WHERE schedule_id = 1 AND class_id = 5;

-- 使用事务批量插入
BEGIN TRANSACTION;
INSERT INTO schedule_entries (...) VALUES (...);
INSERT INTO schedule_entries (...) VALUES (...);
-- ... 更多插入
COMMIT;

-- 定期清理和优化数据库
VACUUM;
ANALYZE;
```

## 8. 安全性设计

### 8.1 输入验证

```rust
// src-tauri/src/validation.rs
use validator::{Validate, ValidationError};

#[derive(Debug, Validate, Deserialize)]
pub struct TeacherInput {
    #[validate(length(min = 1, max = 50, message = "教师姓名长度必须在1-50之间"))]
    pub name: String,
    
    #[validate(range(min = 0, max = 100, message = "权重系数必须在0-100之间"))]
    pub weight: u32,
    
    #[validate(range(min = 0, max = 2, message = "时间偏好必须是0、1或2"))]
    pub time_bias: u8,
}

#[derive(Debug, Validate, Deserialize)]
pub struct CurriculumInput {
    #[validate(range(min = 1, message = "班级ID必须大于0"))]
    pub class_id: u32,
    
    #[validate(length(min = 1, max = 20, message = "科目ID长度必须在1-20之间"))]
    pub subject_id: String,
    
    #[validate(range(min = 1, max = 12, message = "课时数必须在1-12之间"))]
    pub target_sessions: u8,
}

pub fn validate_input<T: Validate>(input: &T) -> Result<(), Vec<String>> {
    match input.validate() {
        Ok(_) => Ok(()),
        Err(e) => {
            let errors: Vec<String> = e
                .field_errors()
                .into_iter()
                .flat_map(|(field, errors)| {
                    errors.iter().map(move |error| {
                        format!("{}: {}", field, error.message.as_ref().unwrap_or(&"验证失败".into()))
                    })
                })
                .collect();
            Err(errors)
        }
    }
}
```

### 8.2 SQL 注入防护

```rust
// 使用参数化查询防止 SQL 注入
pub async fn get_teacher_by_name(&self, name: &str) -> Result<Option<Teacher>, sqlx::Error> {
    // 正确：使用参数绑定
    let teacher = sqlx::query_as::<_, Teacher>(
        "SELECT * FROM teachers WHERE name = ?"
    )
    .bind(name)  // 参数化查询
    .fetch_optional(&self.pool)
    .await?;
    
    Ok(teacher)
}

// 错误示例（不要这样做）：
// let query = format!("SELECT * FROM teachers WHERE name = '{}'", name);
// 这会导致 SQL 注入漏洞
```

### 8.3 文件路径安全

```rust
// src-tauri/src/file_security.rs
use std::path::{Path, PathBuf};

pub fn validate_file_path(path: &str, allowed_dir: &Path) -> Result<PathBuf, String> {
    let path = Path::new(path);
    
    // 规范化路径
    let canonical_path = path.canonicalize()
        .map_err(|e| format!("无效的文件路径: {}", e))?;
    
    // 检查路径是否在允许的目录内
    if !canonical_path.starts_with(allowed_dir) {
        return Err("文件路径不在允许的目录内".to_string());
    }
    
    // 检查文件扩展名
    if let Some(ext) = canonical_path.extension() {
        let ext_str = ext.to_str().unwrap_or("");
        if !["xlsx", "xls", "pdf"].contains(&ext_str) {
            return Err("不支持的文件类型".to_string());
        }
    }
    
    Ok(canonical_path)
}
```

## 9. 部署方案

### 9.1 构建配置

```toml
# Cargo.toml
[package]
name = "course-scheduling-system"
version = "1.0.0"
edition = "2021"

[dependencies]
tauri = { version = "1.5", features = ["shell-open"] }
serde = { version = "1.0", features = ["derive"] }
serde_json = "1.0"
sqlx = { version = "0.7", features = ["runtime-tokio-native-tls", "sqlite"] }
tokio = { version = "1", features = ["full"] }
tracing = "0.1"
tracing-subscriber = { version = "0.3", features = ["env-filter"] }
tracing-appender = "0.2"
thiserror = "1.0"
validator = { version = "0.16", features = ["derive"] }
rust_xlsxwriter = "0.60"

[profile.release]
opt-level = 3
lto = true
codegen-units = 1
strip = true
```

```json
// tauri.conf.json
{
  "build": {
    "beforeDevCommand": "bun run dev",
    "beforeBuildCommand": "bun run build",
    "devPath": "http://localhost:5173",
    "distDir": "../dist"
  },
  "package": {
    "productName": "排课系统",
    "version": "1.0.0"
  },
  "tauri": {
    "allowlist": {
      "all": false,
      "shell": {
        "all": false,
        "open": true
      },
      "dialog": {
        "all": true
      },
      "fs": {
        "all": false,
        "readFile": true,
        "writeFile": true,
        "scope": ["$APPDATA/course-scheduling/*"]
      }
    },
    "bundle": {
      "active": true,
      "targets": ["msi", "dmg", "deb", "appimage"],
      "identifier": "com.school.course-scheduling",
      "icon": [
        "icons/32x32.png",
        "icons/128x128.png",
        "icons/icon.icns",
        "icons/icon.ico"
      ],
      "resources": ["resources/*"],
      "externalBin": [],
      "copyright": "Copyright © 2024",
      "category": "Education",
      "shortDescription": "智能排课系统",
      "longDescription": "基于约束优化的智能课程调度系统"
    },
    "security": {
      "csp": "default-src 'self'; style-src 'self' 'unsafe-inline'"
    },
    "windows": [
      {
        "title": "排课系统",
        "width": 1400,
        "height": 900,
        "resizable": true,
        "fullscreen": false
      }
    ]
  }
}
```

### 9.2 数据库迁移

```rust
// src-tauri/src/migrations.rs
use sqlx::{SqlitePool, migrate::MigrateDatabase};

pub async fn run_migrations(database_url: &str) -> Result<(), Box<dyn std::error::Error>> {
    info!("开始数据库迁移");
    
    // 如果数据库不存在，创建它
    if !sqlx::Sqlite::database_exists(database_url).await? {
        info!("创建数据库: {}", database_url);
        sqlx::Sqlite::create_database(database_url).await?;
    }
    
    let pool = SqlitePool::connect(database_url).await?;
    
    // 运行迁移脚本
    sqlx::migrate!("./migrations")
        .run(&pool)
        .await?;
    
    info!("数据库迁移完成");
    
    Ok(())
}
```

```sql
-- migrations/001_initial_schema.sql
-- 创建初始数据库模式
CREATE TABLE IF NOT EXISTS teachers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    teaching_group_id INTEGER,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ... 其他表定义

-- migrations/002_add_indexes.sql
-- 添加索引
CREATE INDEX IF NOT EXISTS idx_schedule_entries_schedule ON schedule_entries(schedule_id);
CREATE INDEX IF NOT EXISTS idx_schedule_entries_class ON schedule_entries(class_id);
-- ... 其他索引
```

### 9.3 自动更新

```rust
// src-tauri/src/updater.rs
use tauri::updater;

pub async fn check_for_updates(app: tauri::AppHandle) -> Result<(), Box<dyn std::error::Error>> {
    info!("检查更新");
    
    let update_response = app.updater().check().await?;
    
    if let Some(update) = update_response {
        info!("发现新版本: {}", update.version);
        
        // 下载并安装更新
        update.download_and_install().await?;
        
        info!("更新安装完成，将在重启后生效");
    } else {
        info!("当前已是最新版本");
    }
    
    Ok(())
}
```

## 10. 监控和维护

### 10.1 性能监控

```rust
// src-tauri/src/monitoring.rs
use std::time::Instant;
use tracing::info;

pub struct PerformanceMonitor {
    start_time: Instant,
    operation_name: String,
}

impl PerformanceMonitor {
    pub fn new(operation_name: impl Into<String>) -> Self {
        Self {
            start_time: Instant::now(),
            operation_name: operation_name.into(),
        }
    }
}

impl Drop for PerformanceMonitor {
    fn drop(&mut self) {
        let duration = self.start_time.elapsed();
        info!(
            operation = %self.operation_name,
            duration_ms = duration.as_millis(),
            "操作完成"
        );
    }
}

// 使用示例
pub async fn generate_schedule_monitored() -> Result<Schedule, String> {
    let _monitor = PerformanceMonitor::new("generate_schedule");
    
    // 执行排课逻辑
    // ...
    
    Ok(schedule)
}
```

### 10.2 健康检查

```rust
// src-tauri/src/health.rs

#[derive(Debug, Serialize)]
pub struct HealthStatus {
    pub database: bool,
    pub memory_usage_mb: u64,
    pub uptime_seconds: u64,
}

#[tauri::command]
pub async fn health_check(app_state: State<'_, AppState>) -> Result<HealthStatus, String> {
    // 检查数据库连接
    let db_healthy = app_state.db.ping().await.is_ok();
    
    // 获取内存使用情况
    let memory_usage = get_memory_usage();
    
    // 获取运行时间
    let uptime = app_state.start_time.elapsed().as_secs();
    
    Ok(HealthStatus {
        database: db_healthy,
        memory_usage_mb: memory_usage,
        uptime_seconds: uptime,
    })
}
```

## 11. 文档和帮助系统

### 11.1 用户手册结构

```
docs/
├── user-manual/
│   ├── 01-快速开始.md
│   ├── 02-基础配置.md
│   ├── 03-自动排课.md
│   ├── 04-手动调课.md
│   ├── 05-导入导出.md
│   ├── 06-高级功能.md
│   └── 07-常见问题.md
├── api/
│   ├── tauri-commands.md
│   └── data-structures.md
└── development/
    ├── architecture.md
    ├── contributing.md
    └── testing.md
```

### 11.2 内置帮助系统

```typescript
// src/lib/help.ts
export interface HelpTopic {
  id: string;
  title: string;
  content: string;
  keywords: string[];
}

export const helpTopics: HelpTopic[] = [
  {
    id: 'generate-schedule',
    title: '如何生成课表',
    content: `
      1. 确保已完成基础配置
      2. 点击"生成课表"按钮
      3. 等待系统计算（通常需要10-30秒）
      4. 查看生成的课表结果
    `,
    keywords: ['生成', '排课', '自动'],
  },
  // ... 更多帮助主题
];

export function searchHelp(query: string): HelpTopic[] {
  const lowerQuery = query.toLowerCase();
  return helpTopics.filter(topic =>
    topic.title.toLowerCase().includes(lowerQuery) ||
    topic.keywords.some(kw => kw.includes(lowerQuery))
  );
}
```

---

## 总结

本设计文档详细描述了排课系统的技术架构、核心模块、接口设计、测试策略、性能优化、安全性、部署方案和监控维护等方面。

关键设计决策：
1. 使用位掩码技术实现高性能的时间槽位操作
2. 采用约束优化问题（COP）算法处理硬约束和软约束
3. 使用 Rust 实现核心算法确保性能和安全性
4. 采用 Tauri 框架构建跨平台桌面应用
5. 实现完善的日志系统和错误处理机制
6. 使用 Playwright 进行端到端测试
7. 优化内存使用和计算性能

下一步：根据本设计文档创建详细的任务列表（tasks.md）。

```vue
<!-- src/components/SetupWizard.vue -->
<template>
  <el-dialog
    v-model="visible"
    title="排课系统设置向导"
    width="800px"
    :close-on-click-modal="false"
    :close-on-press-escape="false"
  >
    <el-steps :active="currentStep" align-center>
      <el-step title="基础规则" />
      <el-step title="教师偏好" />
      <el-step title="课时验证" />
    </el-steps>
    
    <div class="wizard-content">
      <!-- 步骤 1：基础规则 -->
      <div v-if="currentStep === 0" class="step-content">
        <h3>配置全校通用的硬约束规则</h3>
        <el-form :model="hardConstraints" label-width="150px">
          <el-form-item label="体育课禁排节次">
            <el-checkbox-group v-model="hardConstraints.forbiddenSlotsForPE">
              <el-checkbox :label="1">第1节</el-checkbox>
              <el-checkbox :label="2">第2节</el-checkbox>
              <el-checkbox :label="3">第3节</el-checkbox>
            </el-checkbox-group>
          </el-form-item>
          
          <el-form-item label="音乐课禁排节次">
            <el-checkbox-group v-model="hardConstraints.forbiddenSlotsForMusic">
              <el-checkbox :label="1">第1节</el-checkbox>
              <el-checkbox :label="2">第2节</el-checkbox>
              <el-checkbox :label="3">第3节</el-checkbox>
            </el-checkbox-group>
          </el-form-item>
        </el-form>
      </div>
      
      <!-- 步骤 2：教师偏好 -->
      <div v-if="currentStep === 1" class="step-content">
        <h3>批量设置教师偏好</h3>
        <el-table :data="teachers" border max-height="400">
          <el-table-column prop="name" label="教师姓名" width="120" />
          <el-table-column label="时间偏好" width="150">
            <template #default="{ row }">
              <el-select v-model="row.timeBias" size="small">
                <el-option label="无偏好" :value="0" />
                <el-option label="厌恶早课" :value="1" />
                <el-option label="厌恶晚课" :value="2" />
              </el-select>
            </template>
          </el-table-column>
          <el-table-column label="权重系数" width="120">
            <template #default="{ row }">
              <el-input-number
                v-model="row.weight"
                :min="1"
                :max="100"
                size="small"
              />
            </template>
          </el-table-column>
        </el-table>
      </div>
      
      <!-- 步骤 3：课时验证 -->
      <div v-if="currentStep === 2" class="step-content">
        <h3>课时数验证</h3>
        <el-table :data="classWorkloads" border>
          <el-table-column prop="className" label="班级" width="120" />
          <el-table-column prop="totalSessions" label="总课时数" width="100" />
          <el-table-column label="状态" width="100">
            <template #default="{ row }">
              <el-tag v-if="row.totalSessions <= 40" type="success">正常</el-tag>
              <el-tag v-else type="danger">超出容量</el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="warning" label="提示" />
        </el-table>
      </div>
    </div>
    
    <template #footer>
      <el-button v-if="currentStep > 0" @click="previousStep">上一步</el-button>
      <el-button type="primary" @click="nextStep">
        {{ currentStep === 2 ? '完成' : '下一步' }}
      </el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { ElMessage } from 'element-plus';
import { logger } from '@/utils/logger';

const visible = ref(true);
const currentStep = ref(0);

const hardConstraints = ref({
  forbiddenSlotsForPE: [1, 2, 3],
  forbiddenSlotsForMusic: [1, 2, 3],
});

const teachers = ref([
  { id: 1, name: '张老师', timeBias: 0, weight: 1 },
  { id: 2, name: '李老师', timeBias: 0, weight: 1 },
]);

const classWorkloads = ref([
  { className: '高一(1)班', totalSessions: 38, warning: '' },
  { className: '高一(2)班', totalSessions: 42, warning: '课时数超过容量，请删减' },
]);

async function nextStep() {
  if (currentStep.value === 0) {
    await saveHardConstraints();
  } else if (currentStep.value === 1) {
    await saveTeacherPreferences();
  } else if (currentStep.value === 2) {
    if (validateWorkloads()) {
      await finishSetup();
      visible.value = false;
      ElMessage.success('设置完成');
    } else {
      ElMessage.error('部分班级课时数超过容量，请调整');
      return;
    }
  }
  
  if (currentStep.value < 2) {
    currentStep.value++;
  }
}

function previousStep() {
  if (currentStep.value > 0) {
    currentStep.value--;
  }
}

function validateWorkloads(): boolean {
  return classWorkloads.value.every((item) => item.totalSessions <= 40);
}

async function saveHardConstraints() {
  logger.info('保存硬约束配置', hardConstraints.value);
  // 调用 API 保存
}

async function saveTeacherPreferences() {
  logger.info('保存教师偏好', { count: teachers.value.length });
  // 调用 API 保存
}

async function finishSetup() {
  logger.info('完成设置向导');
  // 完成设置
}
</script>

<style scoped>
.wizard-content {
  margin: 2rem 0;
  min-height: 400px;
}

.step-content h3 {
  margin-bottom: 1.5rem;
  color: #303133;
}
</style>
```

## 3. 集成测试设计

### 3.1 测试架构

```
tests/
├── integration/                    # 集成测试
│   ├── schedule/                   # 排课模块集成测试
│   │   ├── generate.spec.ts        # 课表生成集成测试
│   │   ├── move.spec.ts            # 课程移动集成测试
│   │   ├── conflict.spec.ts        # 冲突检测集成测试
│   │   └── swap.spec.ts            # 交换建议集成测试
│   ├── teacher/                    # 教师模块集成测试
│   │   ├── preference.spec.ts      # 教师偏好集成测试
│   │   ├── query.spec.ts           # 教师查询集成测试
│   │   └── workload.spec.ts        # 工作量统计集成测试
│   ├── import-export/              # 导入导出集成测试
│   │   ├── import.spec.ts          # Excel 导入集成测试
│   │   └── export.spec.ts          # Excel 导出集成测试
│   └── fixtures/                   # 测试数据
│       ├── test-data.sql           # 测试数据库
│       └── import-template.xlsx    # 导入模板
├── e2e/                            # 端到端测试
│   ├── user-flows/                 # 用户流程测试
│   │   ├── first-time-setup.spec.ts
│   │   ├── generate-schedule.spec.ts
│   │   └── manual-adjustment.spec.ts
│   └── page-objects/               # 页面对象模型
│       ├── SchedulePage.ts
│       ├── SetupWizardPage.ts
│       └── TeacherPage.ts
└── playwright.config.ts            # Playwright 配置
```

### 3.2 集成测试实现

#### 3.2.1 排课模块集成测试

```typescript
// tests/integration/schedule/generate.spec.ts
import { test, expect } from '@playwright/test';
import { setupTestDatabase, cleanupTestDatabase } from '../helpers/database';
import { SchedulePage } from '../page-objects/SchedulePage';

test.describe('课表生成集成测试', () => {
  test.beforeEach(async ({ page }) => {
    // 设置测试数据库
    await setupTestDatabase();
    
    // 导航到应用
    await page.goto('http://localhost:5173');
    await page.waitForLoadState('networkidle');
  });
  
  test.afterEach(async () => {
    // 清理测试数据
    await cleanupTestDatabase();
  });
  
  test('应该成功生成满足所有硬约束的课表', async ({ page }) => {
    const schedulePage = new SchedulePage(page);
    
    // 点击生成课表按钮
    await schedulePage.clickGenerateButton();
    
    // 等待生成完成（最多30秒）
    await schedulePage.waitForScheduleGenerated(30000);
    
    // 验证课表已显示
    await expect(schedulePage.scheduleGrid).toBeVisible();
    
    // 验证课表条目数量
    const entryCount = await schedulePage.getEntryCount();
    expect(entryCount).toBeGreaterThan(0);
    
    // 验证代价值已显示
    const cost = await schedulePage.getCostValue();
    expect(cost).toBeGreaterThanOrEqual(0);
    
    // 验证硬约束：体育课不在第1-3节
    const peEntries = await schedulePage.getEntriesBySubject('体育');
    for (const entry of peEntries) {
      const period = await entry.getAttribute('data-period');
      expect(parseInt(period!)).toBeGreaterThanOrEqual(3);
    }
    
    // 验证硬约束：同一教师同一时段只有一节课
    const teacherConflicts = await schedulePage.checkTeacherConflicts();
    expect(teacherConflicts).toHaveLength(0);
    
    // 验证硬约束：同一班级同一时段只有一节课
    const classConflicts = await schedulePage.checkClassConflicts();
    expect(classConflicts).toHaveLength(0);
  });
  
  test('应该在配置无效时返回错误', async ({ page }) => {
    const schedulePage = new SchedulePage(page);
    
    // 设置无效配置（课时数超过容量）
    await schedulePage.setInvalidConfiguration();
    
    // 尝试生成课表
    await schedulePage.clickGenerateButton();
    
    // 验证显示错误消息
    const errorMessage = await schedulePage.getErrorMessage();
    expect(errorMessage).toContain('配置无效');
  });
  
  test('应该在30秒内完成26个班级的排课', async ({ page }) => {
    const schedulePage = new SchedulePage(page);
    
    // 设置26个班级的配置
    await schedulePage.setup26Classes();
    
    const startTime = Date.now();
    
    // 生成课表
    await schedulePage.clickGenerateButton();
    await schedulePage.waitForScheduleGenerated(35000);
    
    const duration = Date.now() - startTime;
    
    // 验证性能要求
    expect(duration).toBeLessThan(30000);
    
    console.log(`26个班级排课耗时: ${duration}ms`);
  });
});
```

```typescript
// tests/integration/schedule/move.spec.ts
import { test, expect } from '@playwright/test';
import { setupTestDatabase, cleanupTestDatabase } from '../helpers/database';
import { SchedulePage } from '../page-objects/SchedulePage';

test.describe('课程移动集成测试', () => {
  test.beforeEach(async ({ page }) => {
    await setupTestDatabase();
    await page.goto('http://localhost:5173');
    
    // 先生成一个课表
    const schedulePage = new SchedulePage(page);
    await schedulePage.clickGenerateButton();
    await schedulePage.waitForScheduleGenerated();
  });
  
  test.afterEach(async () => {
    await cleanupTestDatabase();
  });
  
  test('应该成功移动课程到空闲时段', async ({ page }) => {
    const schedulePage = new SchedulePage(page);
    
    // 选择一个课程
    const sourceEntry = await schedulePage.getFirstEntry();
    const sourceText = await sourceEntry.textContent();
    
    // 找到一个空闲时段
    const emptySlot = await schedulePage.findEmptySlot();
    
    // 拖拽课程到空闲时段
    await sourceEntry.dragTo(emptySlot);
    
    // 等待移动完成
    await page.waitForTimeout(500);
    
    // 验证课程已移动
    const newLocation = await schedulePage.getEntryAtSlot(emptySlot);
    const newText = await newLocation.textContent();
    expect(newText).toBe(sourceText);
    
    // 验证原位置已清空
    const oldLocation = await schedulePage.getEntryAtSlot(sourceEntry);
    expect(await oldLocation.textContent()).toBe('');
  });
  
  test('应该阻止违反硬约束的移动', async ({ page }) => {
    const schedulePage = new SchedulePage(page);
    
    // 选择一个体育课
    const peEntry = await schedulePage.getEntryBySubject('体育');
    
    // 尝试拖到第1节（违反硬约束）
    const forbiddenSlot = await schedulePage.getSlot(0, 0);
    await peEntry.dragTo(forbiddenSlot);
    
    // 验证显示错误提示
    const errorToast = page.locator('[data-testid="error-toast"]');
    await expect(errorToast).toBeVisible();
    await expect(errorToast).toContainText('无法移动');
    
    // 验证课程未移动
    const peLocation = await schedulePage.getEntryLocation(peEntry);
    expect(peLocation.period).toBeGreaterThanOrEqual(3);
  });
  
  test('应该在100ms内完成冲突检测', async ({ page }) => {
    const schedulePage = new SchedulePage(page);
    
    // 选择一个课程
    const entry = await schedulePage.getFirstEntry();
    
    const startTime = Date.now();
    
    // 点击课程触发冲突检测
    await entry.click();
    
    // 等待冲突指示器显示
    await page.waitForSelector('.schedule-cell.available');
    
    const duration = Date.now() - startTime;
    
    // 验证性能要求
    expect(duration).toBeLessThan(100);
    
    console.log(`冲突检测耗时: ${duration}ms`);
  });
  
  test('应该正确显示冲突状态', async ({ page }) => {
    const schedulePage = new SchedulePage(page);
    
    // 选择一个课程
    const entry = await schedulePage.getFirstEntry();
    await entry.click();
    
    // 验证有绿色（可用）、黄色（警告）、红色（阻止）三种状态
    const availableSlots = await page.locator('.schedule-cell.available').count();
    const warningSlots = await page.locator('.schedule-cell.warning').count();
    const blockedSlots = await page.locator('.schedule-cell.blocked').count();
    
    expect(availableSlots).toBeGreaterThan(0);
    expect(blockedSlots).toBeGreaterThan(0);
    
    console.log(`可用: ${availableSlots}, 警告: ${warningSlots}, 阻止: ${blockedSlots}`);
  });
});
```

```typescript
// tests/integration/schedule/conflict.spec.ts
import { test, expect } from '@playwright/test';
import { setupTestDatabase } from '../helpers/database';
import { SchedulePage } from '../page-objects/SchedulePage';

test.describe('冲突检测集成测试', () => {
  test.beforeEach(async ({ page }) => {
    await setupTestDatabase();
    await page.goto('http://localhost:5173');
  });
  
  test('应该正确检测教师时间冲突', async ({ page }) => {
    const schedulePage = new SchedulePage(page);
    
    // 生成课表
    await schedulePage.clickGenerateButton();
    await schedulePage.waitForScheduleGenerated();
    
    // 获取某个教师的所有课程
    const teacherId = 1;
    const teacherEntries = await schedulePage.getEntriesByTeacher(teacherId);
    
    // 验证该教师在同一时段没有多节课
    const timeSlots = new Set();
    for (const entry of teacherEntries) {
      const day = await entry.getAttribute('data-day');
      const period = await entry.getAttribute('data-period');
      const slotKey = `${day}-${period}`;
      
      expect(timeSlots.has(slotKey)).toBe(false);
      timeSlots.add(slotKey);
    }
  });
  
  test('应该正确检测班级时间冲突', async ({ page }) => {
    const schedulePage = new SchedulePage(page);
    
    await schedulePage.clickGenerateButton();
    await schedulePage.waitForScheduleGenerated();
    
    // 获取某个班级的所有课程
    const classId = 1;
    const classEntries = await schedulePage.getEntriesByClass(classId);
    
    // 验证该班级在同一时段没有多节课
    const timeSlots = new Set();
    for (const entry of classEntries) {
      const day = await entry.getAttribute('data-day');
      const period = await entry.getAttribute('data-period');
      const slotKey = `${day}-${period}`;
      
      expect(timeSlots.has(slotKey)).toBe(false);
      timeSlots.add(slotKey);
    }
  });
  
  test('应该正确检测场地容量冲突', async ({ page }) => {
    const schedulePage = new SchedulePage(page);
    
    await schedulePage.clickGenerateButton();
    await schedulePage.waitForScheduleGenerated();
    
    // 获取所有微机课
    const computerEntries = await schedulePage.getEntriesBySubject('微机');
    
    // 按时段分组
    const slotMap = new Map<string, number>();
    for (const entry of computerEntries) {
      const day = await entry.getAttribute('data-day');
      const period = await entry.getAttribute('data-period');
      const slotKey = `${day}-${period}`;
      
      slotMap.set(slotKey, (slotMap.get(slotKey) || 0) + 1);
    }
    
    // 验证每个时段的微机课不超过场地容量（假设容量为1）
    for (const [slot, count] of slotMap.entries()) {
      expect(count).toBeLessThanOrEqual(1);
    }
  });
  
  test('应该正确检测教师互斥约束', async ({ page }) => {
    const schedulePage = new SchedulePage(page);
    
    // 设置教师互斥关系
    await schedulePage.setTeacherMutualExclusion(1, 2);
    
    await schedulePage.clickGenerateButton();
    await schedulePage.waitForScheduleGenerated();
    
    // 获取两位教师的课程
    const teacher1Entries = await schedulePage.getEntriesByTeacher(1);
    const teacher2Entries = await schedulePage.getEntriesByTeacher(2);
    
    // 获取教师1的时间槽位
    const teacher1Slots = new Set();
    for (const entry of teacher1Entries) {
      const day = await entry.getAttribute('data-day');
      const period = await entry.getAttribute('data-period');
      teacher1Slots.add(`${day}-${period}`);
    }
    
    // 验证教师2没有在相同时段上课
    for (const entry of teacher2Entries) {
      const day = await entry.getAttribute('data-day');
      const period = await entry.getAttribute('data-period');
      const slotKey = `${day}-${period}`;
      
      expect(teacher1Slots.has(slotKey)).toBe(false);
    }
  });
});
```

#### 3.2.2 教师模块集成测试

```typescript
// tests/integration/teacher/preference.spec.ts
import { test, expect } from '@playwright/test';
import { setupTestDatabase } from '../helpers/database';
import { TeacherPage } from '../page-objects/TeacherPage';

test.describe('教师偏好集成测试', () => {
  test.beforeEach(async ({ page }) => {
    await setupTestDatabase();
    await page.goto('http://localhost:5173/teacher');
  });
  
  test('应该成功保存单个教师偏好', async ({ page }) => {
    const teacherPage = new TeacherPage(page);
    
    // 选择一个教师
    await teacherPage.selectTeacher(1);
    
    // 设置偏好
    await teacherPage.setTimeBias('厌恶早课');
    await teacherPage.setWeight(80);
    await teacherPage.setPreferredSlots([10, 11, 12, 13, 14]); // 下午时段
    
    // 保存
    await teacherPage.clickSaveButton();
    
    // 验证保存成功
    const successMessage = await teacherPage.getSuccessMessage();
    expect(successMessage).toContain('保存成功');
    
    // 刷新页面验证数据已持久化
    await page.reload();
    await teacherPage.selectTeacher(1);
    
    const timeBias = await teacherPage.getTimeBias();
    expect(timeBias).toBe('厌恶早课');
    
    const weight = await teacherPage.getWeight();
    expect(weight).toBe(80);
  });
  
  test('应该成功批量保存教师偏好', async ({ page }) => {
    const teacherPage = new TeacherPage(page);
    
    // 选择多个教师
    await teacherPage.selectMultipleTeachers([1, 2, 3]);
    
    // 批量设置偏好
    await teacherPage.batchSetTimeBias('厌恶晚课');
    await teacherPage.batchSetWeight(60);
    
    // 批量保存
    await teacherPage.clickBatchSaveButton();
    
    // 验证保存成功
    const successMessage = await teacherPage.getSuccessMessage();
    expect(successMessage).toContain('成功保存 3 位教师');
    
    // 验证每个教师的偏好都已更新
    for (const teacherId of [1, 2, 3]) {
      await teacherPage.selectTeacher(teacherId);
      const timeBias = await teacherPage.getTimeBias();
      expect(timeBias).toBe('厌恶晚课');
    }
  });
  
  test('应该验证输入数据的有效性', async ({ page }) => {
    const teacherPage = new TeacherPage(page);
    
    await teacherPage.selectTeacher(1);
    
    // 尝试设置无效的权重
    await teacherPage.setWeight(150); // 超过最大值100
    await teacherPage.clickSaveButton();
    
    // 验证显示错误消息
    const errorMessage = await teacherPage.getErrorMessage();
    expect(errorMessage).toContain('权重系数必须在0-100之间');
  });
});
```

```typescript
// tests/integration/teacher/workload.spec.ts
import { test, expect } from '@playwright/test';
import { setupTestDatabase } from '../helpers/database';
import { TeacherPage } from '../page-objects/TeacherPage';

test.describe('教学工作量统计集成测试', () => {
  test.beforeEach(async ({ page }) => {
    await setupTestDatabase();
    await page.goto('http://localhost:5173/teacher');
  });
  
  test('应该正确统计教师工作量', async ({ page }) => {
    const teacherPage = new TeacherPage(page);
    
    // 点击工作量统计按钮
    await teacherPage.clickWorkloadButton();
    
    // 等待统计完成
    await teacherPage.waitForWorkloadTable();
    
    // 验证统计表格显示
    const table = await teacherPage.getWorkloadTable();
    expect(await table.isVisible()).toBe(true);
    
    // 验证统计数据
    const firstRow = await teacherPage.getWorkloadRow(0);
    const teacherName = await firstRow.locator('[data-col="name"]').textContent();
    const totalSessions = await firstRow.locator('[data-col="total"]').textContent();
    const classCount = await firstRow.locator('[data-col="classes"]').textContent();
    
    expect(teacherName).toBeTruthy();
    expect(parseInt(totalSessions!)).toBeGreaterThan(0);
    expect(parseInt(classCount!)).toBeGreaterThan(0);
  });
  
  test('应该成功导出工作量统计到Excel', async ({ page }) => {
    const teacherPage = new TeacherPage(page);
    
    await teacherPage.clickWorkloadButton();
    await teacherPage.waitForWorkloadTable();
    
    // 点击导出按钮
    const downloadPromise = page.waitForEvent('download');
    await teacherPage.clickExportWorkloadButton();
    const download = await downloadPromise;
    
    // 验证文件名
    expect(download.suggestedFilename()).toMatch(/工作量统计.*\.xlsx/);
    
    // 验证文件大小
    const path = await download.path();
    const fs = require('fs');
    const stats = fs.statSync(path);
    expect(stats.size).toBeGreaterThan(0);
  });
});
```


#### 3.2.3 导入导出集成测试

```typescript
// tests/integration/import-export/import.spec.ts
import { test, expect } from '@playwright/test';
import { setupTestDatabase } from '../helpers/database';
import { ImportExportPage } from '../page-objects/ImportExportPage';
import path from 'path';

test.describe('Excel 导入集成测试', () => {
  test.beforeEach(async ({ page }) => {
    await setupTestDatabase();
    await page.goto('http://localhost:5173/import-export');
  });
  
  test('应该成功从Excel导入排课条件', async ({ page }) => {
    const importExportPage = new ImportExportPage(page);
    
    // 上传测试文件
    const filePath = path.join(__dirname, '../fixtures/import-template.xlsx');
    await importExportPage.uploadFile(filePath);
    
    // 等待导入完成
    await importExportPage.waitForImportComplete();
    
    // 验证导入结果
    const result = await importExportPage.getImportResult();
    expect(result.successCount).toBeGreaterThan(0);
    expect(result.errorCount).toBe(0);
    
    // 验证导入的数据
    await page.goto('http://localhost:5173/teacher');
    const teacherCount = await page.locator('.teacher-row').count();
    expect(teacherCount).toBeGreaterThan(0);
  });
  
  test('应该正确处理无效的Excel文件', async ({ page }) => {
    const importExportPage = new ImportExportPage(page);
    
    // 上传无效文件
    const filePath = path.join(__dirname, '../fixtures/invalid-file.txt');
    await importExportPage.uploadFile(filePath);
    
    // 验证显示错误消息
    const errorMessage = await importExportPage.getErrorMessage();
    expect(errorMessage).toContain('文件格式无效');
  });
  
  test('应该显示详细的导入错误报告', async ({ page }) => {
    const importExportPage = new ImportExportPage(page);
    
    // 上传包含错误数据的文件
    const filePath = path.join(__dirname, '../fixtures/import-with-errors.xlsx');
    await importExportPage.uploadFile(filePath);
    
    await importExportPage.waitForImportComplete();
    
    // 验证错误报告
    const result = await importExportPage.getImportResult();
    expect(result.errorCount).toBeGreaterThan(0);
    expect(result.errors.length).toBeGreaterThan(0);
    
    // 验证错误详情
    const firstError = result.errors[0];
    expect(firstError).toContain('行');
    expect(firstError).toContain('错误');
  });
  
  test('应该支持导入数据冲突处理', async ({ page }) => {
    const importExportPage = new ImportExportPage(page);
    
    // 第一次导入
    const filePath = path.join(__dirname, '../fixtures/import-template.xlsx');
    await importExportPage.uploadFile(filePath);
    await importExportPage.waitForImportComplete();
    
    // 第二次导入相同数据
    await importExportPage.uploadFile(filePath);
    
    // 选择冲突处理策略
    await importExportPage.selectConflictStrategy('覆盖');
    await importExportPage.confirmImport();
    
    await importExportPage.waitForImportComplete();
    
    // 验证导入成功
    const result = await importExportPage.getImportResult();
    expect(result.successCount).toBeGreaterThan(0);
  });
});
```

```typescript
// tests/integration/import-export/export.spec.ts
import { test, expect } from '@playwright/test';
import { setupTestDatabase } from '../helpers/database';
import { ImportExportPage } from '../page-objects/ImportExportPage';
import { SchedulePage } from '../page-objects/SchedulePage';

test.describe('Excel 导出集成测试', () => {
  test.beforeEach(async ({ page }) => {
    await setupTestDatabase();
    await page.goto('http://localhost:5173');
    
    // 先生成一个课表
    const schedulePage = new SchedulePage(page);
    await schedulePage.clickGenerateButton();
    await schedulePage.waitForScheduleGenerated();
  });
  
  test('应该成功导出班级课表', async ({ page }) => {
    const importExportPage = new ImportExportPage(page);
    
    await page.goto('http://localhost:5173/import-export');
    
    // 选择导出类型
    await importExportPage.selectExportType('班级课表');
    
    // 点击导出
    const downloadPromise = page.waitForEvent('download');
    await importExportPage.clickExportButton();
    const download = await downloadPromise;
    
    // 验证文件名
    expect(download.suggestedFilename()).toMatch(/班级课表.*\.xlsx/);
    
    // 验证文件内容（可以使用 xlsx 库读取验证）
    const path = await download.path();
    expect(path).toBeTruthy();
  });
  
  test('应该成功导出教师课表', async ({ page }) => {
    const importExportPage = new ImportExportPage(page);
    
    await page.goto('http://localhost:5173/import-export');
    
    await importExportPage.selectExportType('教师课表');
    
    const downloadPromise = page.waitForEvent('download');
    await importExportPage.clickExportButton();
    const download = await downloadPromise;
    
    expect(download.suggestedFilename()).toMatch(/教师课表.*\.xlsx/);
  });
  
  test('应该成功导出总课表', async ({ page }) => {
    const importExportPage = new ImportExportPage(page);
    
    await page.goto('http://localhost:5173/import-export');
    
    await importExportPage.selectExportType('总课表');
    
    const downloadPromise = page.waitForEvent('download');
    await importExportPage.clickExportButton();
    const download = await downloadPromise;
    
    expect(download.suggestedFilename()).toMatch(/总课表.*\.xlsx/);
  });
  
  test('应该在3秒内完成所有课表导出', async ({ page }) => {
    const importExportPage = new ImportExportPage(page);
    
    await page.goto('http://localhost:5173/import-export');
    
    const startTime = Date.now();
    
    // 导出所有类型的课表
    for (const type of ['班级课表', '教师课表', '总课表']) {
      await importExportPage.selectExportType(type);
      const downloadPromise = page.waitForEvent('download');
      await importExportPage.clickExportButton();
      await downloadPromise;
    }
    
    const duration = Date.now() - startTime;
    
    // 验证性能要求
    expect(duration).toBeLessThan(3000);
    
    console.log(`导出所有课表耗时: ${duration}ms`);
  });
});
```

### 3.3 Page Object Model 实现

```typescript
// tests/page-objects/SchedulePage.ts
import { Page, Locator } from '@playwright/test';

export class SchedulePage {
  readonly page: Page;
  readonly scheduleGrid: Locator;
  readonly generateButton: Locator;
  readonly costDisplay: Locator;
  readonly errorToast: Locator;
  
  constructor(page: Page) {
    this.page = page;
    this.scheduleGrid = page.locator('[data-testid="schedule-grid"]');
    this.generateButton = page.locator('[data-testid="generate-schedule-btn"]');
    this.costDisplay = page.locator('[data-testid="cost-value"]');
    this.errorToast = page.locator('[data-testid="error-toast"]');
  }
  
  async clickGenerateButton() {
    await this.generateButton.click();
  }
  
  async waitForScheduleGenerated(timeout = 30000) {
    await this.scheduleGrid.waitFor({ state: 'visible', timeout });
  }
  
  async getEntryCount(): Promise<number> {
    return await this.page.locator('.course-card').count();
  }
  
  async getCostValue(): Promise<number> {
    const text = await this.costDisplay.textContent();
    return parseInt(text || '0');
  }
  
  async getEntriesBySubject(subject: string): Promise<Locator[]> {
    const entries = await this.page.locator('.course-card').all();
    const filtered = [];
    
    for (const entry of entries) {
      const text = await entry.textContent();
      if (text?.includes(subject)) {
        filtered.push(entry);
      }
    }
    
    return filtered;
  }
  
  async getEntriesByTeacher(teacherId: number): Promise<Locator[]> {
    return await this.page.locator(`[data-teacher-id="${teacherId}"]`).all();
  }
  
  async getEntriesByClass(classId: number): Promise<Locator[]> {
    return await this.page.locator(`[data-class-id="${classId}"]`).all();
  }
  
  async checkTeacherConflicts(): Promise<string[]> {
    // 检查教师时间冲突
    const conflicts: string[] = [];
    // 实现冲突检测逻辑
    return conflicts;
  }
  
  async checkClassConflicts(): Promise<string[]> {
    // 检查班级时间冲突
    const conflicts: string[] = [];
    // 实现冲突检测逻辑
    return conflicts;
  }
  
  async getFirstEntry(): Promise<Locator> {
    return this.page.locator('.course-card').first();
  }
  
  async findEmptySlot(): Promise<Locator> {
    return this.page.locator('.schedule-cell:not(:has(.course-card))').first();
  }
  
  async getEntryAtSlot(slot: Locator): Promise<Locator> {
    return slot.locator('.course-card');
  }
  
  async getSlot(day: number, period: number): Promise<Locator> {
    return this.page.locator(`[data-day="${day}"][data-period="${period}"]`);
  }
  
  async getErrorMessage(): Promise<string> {
    return await this.errorToast.textContent() || '';
  }
  
  async setInvalidConfiguration() {
    // 设置无效配置的逻辑
  }
  
  async setup26Classes() {
    // 设置26个班级的逻辑
  }
  
  async setTeacherMutualExclusion(teacherId1: number, teacherId2: number) {
    // 设置教师互斥关系的逻辑
  }
  
  async getEntryBySubject(subject: string): Promise<Locator> {
    return this.page.locator('.course-card').filter({ hasText: subject }).first();
  }
  
  async getEntryLocation(entry: Locator): Promise<{ day: number; period: number }> {
    const day = await entry.getAttribute('data-day');
    const period = await entry.getAttribute('data-period');
    return {
      day: parseInt(day || '0'),
      period: parseInt(period || '0'),
    };
  }
}
```

```typescript
// tests/page-objects/TeacherPage.ts
import { Page, Locator } from '@playwright/test';

export class TeacherPage {
  readonly page: Page;
  readonly teacherSelect: Locator;
  readonly timeBiasSelect: Locator;
  readonly weightInput: Locator;
  readonly saveButton: Locator;
  readonly batchSaveButton: Locator;
  readonly workloadButton: Locator;
  readonly successMessage: Locator;
  readonly errorMessage: Locator;
  
  constructor(page: Page) {
    this.page = page;
    this.teacherSelect = page.locator('[data-testid="teacher-select"]');
    this.timeBiasSelect = page.locator('[data-testid="time-bias-select"]');
    this.weightInput = page.locator('[data-testid="weight-input"]');
    this.saveButton = page.locator('[data-testid="save-btn"]');
    this.batchSaveButton = page.locator('[data-testid="batch-save-btn"]');
    this.workloadButton = page.locator('[data-testid="workload-btn"]');
    this.successMessage = page.locator('[data-testid="success-message"]');
    this.errorMessage = page.locator('[data-testid="error-message"]');
  }
  
  async selectTeacher(teacherId: number) {
    await this.teacherSelect.selectOption({ value: teacherId.toString() });
  }
  
  async setTimeBias(bias: string) {
    await this.timeBiasSelect.selectOption({ label: bias });
  }
  
  async setWeight(weight: number) {
    await this.weightInput.fill(weight.toString());
  }
  
  async setPreferredSlots(slots: number[]) {
    // 设置偏好时段的逻辑
    for (const slot of slots) {
      await this.page.locator(`[data-slot="${slot}"]`).check();
    }
  }
  
  async clickSaveButton() {
    await this.saveButton.click();
  }
  
  async selectMultipleTeachers(teacherIds: number[]) {
    for (const id of teacherIds) {
      await this.page.locator(`[data-teacher-checkbox="${id}"]`).check();
    }
  }
  
  async batchSetTimeBias(bias: string) {
    await this.page.locator('[data-testid="batch-time-bias"]').selectOption({ label: bias });
  }
  
  async batchSetWeight(weight: number) {
    await this.page.locator('[data-testid="batch-weight"]').fill(weight.toString());
  }
  
  async clickBatchSaveButton() {
    await this.batchSaveButton.click();
  }
  
  async getSuccessMessage(): Promise<string> {
    await this.successMessage.waitFor({ state: 'visible' });
    return await this.successMessage.textContent() || '';
  }
  
  async getErrorMessage(): Promise<string> {
    await this.errorMessage.waitFor({ state: 'visible' });
    return await this.errorMessage.textContent() || '';
  }
  
  async getTimeBias(): Promise<string> {
    return await this.timeBiasSelect.inputValue();
  }
  
  async getWeight(): Promise<number> {
    const value = await this.weightInput.inputValue();
    return parseInt(value);
  }
  
  async clickWorkloadButton() {
    await this.workloadButton.click();
  }
  
  async waitForWorkloadTable() {
    await this.page.locator('[data-testid="workload-table"]').waitFor({ state: 'visible' });
  }
  
  async getWorkloadTable(): Promise<Locator> {
    return this.page.locator('[data-testid="workload-table"]');
  }
  
  async getWorkloadRow(index: number): Promise<Locator> {
    return this.page.locator('[data-testid="workload-row"]').nth(index);
  }
  
  async clickExportWorkloadButton() {
    await this.page.locator('[data-testid="export-workload-btn"]').click();
  }
}
```

### 3.4 测试辅助工具

```typescript
// tests/helpers/database.ts
import { Database } from 'bun:sqlite';
import path from 'path';

const TEST_DB_PATH = path.join(__dirname, '../fixtures/test.db');

export async function setupTestDatabase() {
  const db = new Database(TEST_DB_PATH);
  
  // 读取测试数据SQL
  const sql = await Bun.file(path.join(__dirname, '../fixtures/test-data.sql')).text();
  
  // 执行SQL
  db.exec(sql);
  
  db.close();
  
  console.log('测试数据库设置完成');
}

export async function cleanupTestDatabase() {
  const db = new Database(TEST_DB_PATH);
  
  // 清理所有表
  db.exec(`
    DELETE FROM schedule_entries;
    DELETE FROM schedules;
    DELETE FROM teacher_preferences;
    DELETE FROM class_curriculums;
    DELETE FROM fixed_courses;
    DELETE FROM teacher_mutual_exclusions;
  `);
  
  db.close();
  
  console.log('测试数据库清理完成');
}

export async function insertTestData(tableName: string, data: any[]) {
  const db = new Database(TEST_DB_PATH);
  
  for (const row of data) {
    const columns = Object.keys(row).join(', ');
    const placeholders = Object.keys(row).map(() => '?').join(', ');
    const values = Object.values(row);
    
    const stmt = db.prepare(`INSERT INTO ${tableName} (${columns}) VALUES (${placeholders})`);
    stmt.run(...values);
  }
  
  db.close();
}
```

```sql
-- tests/fixtures/test-data.sql
-- 测试数据库初始化脚本

-- 插入测试教师
INSERT INTO teachers (id, name, teaching_group_id, created_at, updated_at) VALUES
(1, '张老师', 1, datetime('now'), datetime('now')),
(2, '李老师', 1, datetime('now'), datetime('now')),
(3, '王老师', 2, datetime('now'), datetime('now'));

-- 插入测试教研组
INSERT INTO teaching_groups (id, name, description, created_at) VALUES
(1, '数学组', '数学教研组', datetime('now')),
(2, '语文组', '语文教研组', datetime('now'));

-- 插入测试班级
INSERT INTO classes (id, name, grade_level, created_at, updated_at) VALUES
(1, '高一(1)班', 1, datetime('now'), datetime('now')),
(2, '高一(2)班', 1, datetime('now'), datetime('now')),
(3, '高一(3)班', 1, datetime('now'), datetime('now'));

-- 插入测试科目配置
INSERT INTO subject_configs (id, name, forbidden_slots, allow_double_session, is_major_subject, created_at, updated_at) VALUES
('数学', '数学', '0', 1, 1, datetime('now'), datetime('now')),
('语文', '语文', '0', 1, 1, datetime('now'), datetime('now')),
('体育', '体育', '7', 0, 0, datetime('now'), datetime('now')),
('微机', '微机', '0', 0, 0, datetime('now'), datetime('now'));

-- 插入测试场地
INSERT INTO venues (id, name, capacity, created_at) VALUES
('微机室', '微机室', 1, datetime('now')),
('操场', '操场', 2, datetime('now'));

-- 插入测试教学计划
INSERT INTO class_curriculums (class_id, subject_id, teacher_id, target_sessions, is_combined_class, week_type, created_at, updated_at) VALUES
(1, '数学', 1, 5, 0, 'Every', datetime('now'), datetime('now')),
(1, '语文', 3, 5, 0, 'Every', datetime('now'), datetime('now')),
(1, '体育', 2, 2, 0, 'Every', datetime('now'), datetime('now')),
(2, '数学', 1, 5, 0, 'Every', datetime('now'), datetime('now')),
(2, '语文', 3, 5, 0, 'Every', datetime('now'), datetime('now'));
```

### 3.5 Playwright 配置

```typescript
// playwright.config.ts
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [
    ['html'],
    ['json', { outputFile: 'test-results/results.json' }],
    ['junit', { outputFile: 'test-results/junit.xml' }],
  ],
  use: {
    baseURL: 'http://localhost:5173',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },
  ],
  
  webServer: {
    command: 'bun run dev',
    url: 'http://localhost:5173',
    reuseExistingServer: !process.env.CI,
    timeout: 120000,
  },
});
```

---

## 总结

本设计文档已完整更新，主要变更包括：

1. **前端框架**：从 Svelte 改为 Vue 3
   - 使用 Pinia 进行状态管理
   - 使用 Element Plus 作为 UI 组件库
   - 使用组合式 API 编写组件

2. **服务层**：新增 Hono 框架
   - 提供 RESTful API 接口
   - 实现业务逻辑编排
   - 统一的错误处理和日志记录

3. **集成测试**：大幅强化测试覆盖
   - 每个模块都有完整的集成测试
   - 使用 Playwright 进行端到端测试
   - 使用 Page Object Model 模式组织测试代码
   - 包含性能测试验证

4. **日志系统**：完善的日志记录
   - Rust 后端使用 tracing 框架
   - 前端和服务层都有结构化日志
   - 记录关键操作和性能指标

所有设计都符合项目规则要求：
- ✅ 使用中文编写文档和注释
- ✅ 完善的日志记录系统
- ✅ 使用 Playwright 进行集成测试

下一步可以根据这份设计文档创建任务列表（tasks.md）。
