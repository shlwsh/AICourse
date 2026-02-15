// ============================================================================
// 时间槽位数据结构和位运算
// ============================================================================
// 本模块定义了排课系统的核心数据结构，使用位掩码技术实现高性能的时间槽位表示
//
// 设计说明：
// - 标准周期：5天 × 8节 = 40位 < u64 (64位)
// - 扩展周期：使用 Vec<u64> 支持 1-30 天
// - 位运算：使用位与、位或等操作提升性能
// ============================================================================

use serde::{Deserialize, Serialize};
use tracing::{debug, info, trace};

/// 时间槽位掩码：使用 u64 位掩码表示一周的时间槽位
/// 标准周期：5天 × 8节 = 40位 < u64 (64位)
pub type TimeSlotMask = u64;

/// 扩展时间槽位掩码：使用 Vec<u64> 支持 1-30 天的灵活排课周期
/// 当总槽位数超过 64 位时使用
pub type ExtendedTimeSlotMask = Vec<u64>;

/// 时间槽位
///
/// 表示一周内的具体上课时段，由星期和节次组成
///
/// # 字段
/// - `day`: 星期几，范围 0-29（支持1-30天周期）
/// - `period`: 节次，范围 0-11（支持1-12节）
///
/// # 示例
/// ```rust
/// use course_scheduling_system::algorithm::TimeSlot;
///
/// // 创建星期一第一节课的时间槽位
/// let slot = TimeSlot { day: 0, period: 0 };
///
/// // 计算位掩码位置
/// let pos = slot.to_bit_position(8);
/// assert_eq!(pos, 0);
///
/// // 转换为位掩码
/// let mask = slot.to_mask(8);
/// assert_eq!(mask, 1);
/// ```
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
pub struct TimeSlot {
    /// 星期几，范围 0-29（0=第1天，1=第2天，...，29=第30天）
    pub day: u8,
    /// 节次，范围 0-11（0=第1节，1=第2节，...，11=第12节）
    pub period: u8,
}

impl TimeSlot {
    /// 创建新的时间槽位
    ///
    /// # 参数
    /// - `day`: 星期几，范围 0-29
    /// - `period`: 节次，范围 0-11
    ///
    /// # 示例
    /// ```rust
    /// use course_scheduling_system::algorithm::TimeSlot;
    ///
    /// let slot = TimeSlot::new(0, 0);
    /// assert_eq!(slot.day, 0);
    /// assert_eq!(slot.period, 0);
    /// ```
    pub fn new(day: u8, period: u8) -> Self {
        trace!("创建时间槽位: day={}, period={}", day, period);
        Self { day, period }
    }

    /// 计算位掩码位置
    ///
    /// 使用公式：`day * periods_per_day + period`
    ///
    /// # 参数
    /// - `periods_per_day`: 每天的节次数
    ///
    /// # 返回
    /// 位掩码中的位置索引
    ///
    /// # 示例
    /// ```rust
    /// use course_scheduling_system::algorithm::TimeSlot;
    ///
    /// let slot = TimeSlot { day: 1, period: 3 };
    /// let pos = slot.to_bit_position(8);
    /// assert_eq!(pos, 11); // 1 * 8 + 3 = 11
    /// ```
    pub fn to_bit_position(&self, periods_per_day: u8) -> usize {
        let pos = (self.day as usize) * (periods_per_day as usize) + (self.period as usize);
        trace!(
            "计算位位置: day={}, period={}, periods_per_day={}, position={}",
            self.day,
            self.period,
            periods_per_day,
            pos
        );
        pos
    }

    /// 从位位置创建时间槽位
    ///
    /// 使用公式：
    /// - `day = pos / periods_per_day`
    /// - `period = pos % periods_per_day`
    ///
    /// # 参数
    /// - `pos`: 位掩码中的位置索引
    /// - `periods_per_day`: 每天的节次数
    ///
    /// # 返回
    /// 时间槽位实例
    ///
    /// # 示例
    /// ```rust
    /// use course_scheduling_system::algorithm::TimeSlot;
    ///
    /// let slot = TimeSlot::from_bit_position(11, 8);
    /// assert_eq!(slot.day, 1);
    /// assert_eq!(slot.period, 3);
    /// ```
    pub fn from_bit_position(pos: usize, periods_per_day: u8) -> Self {
        let day = (pos / periods_per_day as usize) as u8;
        let period = (pos % periods_per_day as usize) as u8;
        trace!(
            "从位位置创建时间槽位: position={}, periods_per_day={}, day={}, period={}",
            pos,
            periods_per_day,
            day,
            period
        );
        Self { day, period }
    }

    /// 转换为位掩码
    ///
    /// 使用公式：`1 << (day * periods_per_day + period)`
    ///
    /// # 参数
    /// - `periods_per_day`: 每天的节次数
    ///
    /// # 返回
    /// 位掩码值
    ///
    /// # 示例
    /// ```rust
    /// use course_scheduling_system::algorithm::TimeSlot;
    ///
    /// let slot = TimeSlot { day: 0, period: 0 };
    /// let mask = slot.to_mask(8);
    /// assert_eq!(mask, 1); // 1 << 0 = 1
    ///
    /// let slot2 = TimeSlot { day: 0, period: 1 };
    /// let mask2 = slot2.to_mask(8);
    /// assert_eq!(mask2, 2); // 1 << 1 = 2
    /// ```
    pub fn to_mask(&self, periods_per_day: u8) -> TimeSlotMask {
        let pos = self.to_bit_position(periods_per_day);
        let mask = 1u64 << pos;
        trace!(
            "转换为位掩码: day={}, period={}, position={}, mask={:#066b}",
            self.day,
            self.period,
            pos,
            mask
        );
        mask
    }

    /// 验证时间槽位有效性
    ///
    /// # 参数
    /// - `max_days`: 最大天数（1-30）
    /// - `max_periods`: 最大节次数（1-12）
    ///
    /// # 返回
    /// 如果时间槽位有效返回 `true`，否则返回 `false`
    ///
    /// # 示例
    /// ```rust
    /// use course_scheduling_system::algorithm::TimeSlot;
    ///
    /// let slot = TimeSlot { day: 0, period: 0 };
    /// assert!(slot.is_valid(5, 8));
    ///
    /// let invalid_slot = TimeSlot { day: 10, period: 0 };
    /// assert!(!invalid_slot.is_valid(5, 8));
    /// ```
    pub fn is_valid(&self, max_days: u8, max_periods: u8) -> bool {
        let valid = self.day < max_days && self.period < max_periods;
        if !valid {
            debug!(
                "时间槽位无效: day={}, period={}, max_days={}, max_periods={}",
                self.day, self.period, max_days, max_periods
            );
        }
        valid
    }
}

// ============================================================================
// 位运算辅助函数
// ============================================================================

/// 设置时间槽位
///
/// 使用位或运算将指定的时间槽位设置为 1
///
/// # 参数
/// - `mask`: 当前位掩码
/// - `slot`: 要设置的时间槽位
/// - `periods_per_day`: 每天的节次数
///
/// # 返回
/// 更新后的位掩码
///
/// # 示例
/// ```rust
/// use course_scheduling_system::algorithm::{TimeSlot, set_slot};
///
/// let mut mask = 0u64;
/// let slot = TimeSlot { day: 0, period: 0 };
/// mask = set_slot(mask, &slot, 8);
/// assert_eq!(mask, 1);
/// ```
pub fn set_slot(mask: TimeSlotMask, slot: &TimeSlot, periods_per_day: u8) -> TimeSlotMask {
    let slot_mask = slot.to_mask(periods_per_day);
    let new_mask = mask | slot_mask;
    trace!(
        "设置时间槽位: day={}, period={}, 原掩码={:#066b}, 新掩码={:#066b}",
        slot.day,
        slot.period,
        mask,
        new_mask
    );
    new_mask
}

/// 清除时间槽位
///
/// 使用位与非运算将指定的时间槽位设置为 0
///
/// # 参数
/// - `mask`: 当前位掩码
/// - `slot`: 要清除的时间槽位
/// - `periods_per_day`: 每天的节次数
///
/// # 返回
/// 更新后的位掩码
///
/// # 示例
/// ```rust
/// use course_scheduling_system::algorithm::{TimeSlot, set_slot, clear_slot};
///
/// let mut mask = 0u64;
/// let slot = TimeSlot { day: 0, period: 0 };
/// mask = set_slot(mask, &slot, 8);
/// assert_eq!(mask, 1);
///
/// mask = clear_slot(mask, &slot, 8);
/// assert_eq!(mask, 0);
/// ```
pub fn clear_slot(mask: TimeSlotMask, slot: &TimeSlot, periods_per_day: u8) -> TimeSlotMask {
    let slot_mask = slot.to_mask(periods_per_day);
    let new_mask = mask & !slot_mask;
    trace!(
        "清除时间槽位: day={}, period={}, 原掩码={:#066b}, 新掩码={:#066b}",
        slot.day,
        slot.period,
        mask,
        new_mask
    );
    new_mask
}

/// 检查时间槽位是否被设置
///
/// 使用位与运算检查指定的时间槽位是否为 1
///
/// # 参数
/// - `mask`: 当前位掩码
/// - `slot`: 要检查的时间槽位
/// - `periods_per_day`: 每天的节次数
///
/// # 返回
/// 如果时间槽位被设置返回 `true`，否则返回 `false`
///
/// # 示例
/// ```rust
/// use course_scheduling_system::algorithm::{TimeSlot, set_slot, is_slot_set};
///
/// let mut mask = 0u64;
/// let slot = TimeSlot { day: 0, period: 0 };
/// assert!(!is_slot_set(mask, &slot, 8));
///
/// mask = set_slot(mask, &slot, 8);
/// assert!(is_slot_set(mask, &slot, 8));
/// ```
pub fn is_slot_set(mask: TimeSlotMask, slot: &TimeSlot, periods_per_day: u8) -> bool {
    let slot_mask = slot.to_mask(periods_per_day);
    let is_set = (mask & slot_mask) != 0;
    trace!(
        "检查时间槽位: day={}, period={}, 掩码={:#066b}, 是否设置={}",
        slot.day,
        slot.period,
        mask,
        is_set
    );
    is_set
}

/// 统计设置的时间槽位数量
///
/// 使用 count_ones 方法统计位掩码中 1 的个数
///
/// # 参数
/// - `mask`: 当前位掩码
///
/// # 返回
/// 设置的时间槽位数量
///
/// # 示例
/// ```rust
/// use course_scheduling_system::algorithm::{TimeSlot, set_slot, count_slots};
///
/// let mut mask = 0u64;
/// assert_eq!(count_slots(mask), 0);
///
/// let slot1 = TimeSlot { day: 0, period: 0 };
/// mask = set_slot(mask, &slot1, 8);
/// assert_eq!(count_slots(mask), 1);
///
/// let slot2 = TimeSlot { day: 0, period: 1 };
/// mask = set_slot(mask, &slot2, 8);
/// assert_eq!(count_slots(mask), 2);
/// ```
pub fn count_slots(mask: TimeSlotMask) -> u32 {
    let count = mask.count_ones();
    trace!("统计时间槽位数量: 掩码={:#066b}, 数量={}", mask, count);
    count
}

// ============================================================================
// 课程配置数据结构
// ============================================================================

/// 课程配置
///
/// 定义课程的约束规则和属性
///
/// # 字段
/// - `id`: 课程唯一标识符
/// - `name`: 课程名称
/// - `forbidden_slots`: 禁止时段掩码（使用位掩码表示）
/// - `allow_double_session`: 是否允许连堂
/// - `venue_id`: 关联场地ID（可选）
/// - `is_major_subject`: 是否主科
///
/// # 示例
/// ```rust
/// use course_scheduling_system::algorithm::SubjectConfig;
///
/// let config = SubjectConfig {
///     id: "math".to_string(),
///     name: "数学".to_string(),
///     forbidden_slots: 0,
///     allow_double_session: true,
///     venue_id: None,
///     is_major_subject: true,
/// };
/// ```
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SubjectConfig {
    /// 课程唯一标识符
    pub id: String,
    /// 课程名称
    pub name: String,
    /// 禁止时段掩码（使用位掩码表示）
    pub forbidden_slots: TimeSlotMask,
    /// 是否允许连堂
    pub allow_double_session: bool,
    /// 关联场地ID（可选）
    pub venue_id: Option<String>,
    /// 是否主科
    pub is_major_subject: bool,
}

impl SubjectConfig {
    /// 创建新的课程配置
    ///
    /// # 参数
    /// - `id`: 课程唯一标识符
    /// - `name`: 课程名称
    ///
    /// # 返回
    /// 默认配置的课程实例
    ///
    /// # 示例
    /// ```rust
    /// use course_scheduling_system::algorithm::SubjectConfig;
    ///
    /// let config = SubjectConfig::new("math".to_string(), "数学".to_string());
    /// assert_eq!(config.id, "math");
    /// assert_eq!(config.name, "数学");
    /// assert_eq!(config.forbidden_slots, 0);
    /// assert!(config.allow_double_session);
    /// assert_eq!(config.venue_id, None);
    /// assert!(!config.is_major_subject);
    /// ```
    pub fn new(id: String, name: String) -> Self {
        debug!("创建课程配置: id={}, name={}", id, name);
        Self {
            id,
            name,
            forbidden_slots: 0,
            allow_double_session: true,
            venue_id: None,
            is_major_subject: false,
        }
    }

    /// 检查时间槽位是否被禁止
    ///
    /// # 参数
    /// - `slot`: 要检查的时间槽位
    /// - `periods_per_day`: 每天的节次数
    ///
    /// # 返回
    /// 如果时间槽位被禁止返回 `true`，否则返回 `false`
    ///
    /// # 示例
    /// ```rust
    /// use course_scheduling_system::algorithm::{SubjectConfig, TimeSlot};
    ///
    /// let mut config = SubjectConfig::new("pe".to_string(), "体育".to_string());
    /// config.forbidden_slots = 0b111; // 禁止前3节
    ///
    /// let slot1 = TimeSlot { day: 0, period: 0 };
    /// assert!(config.is_slot_forbidden(&slot1, 8));
    ///
    /// let slot2 = TimeSlot { day: 0, period: 3 };
    /// assert!(!config.is_slot_forbidden(&slot2, 8));
    /// ```
    pub fn is_slot_forbidden(&self, slot: &TimeSlot, periods_per_day: u8) -> bool {
        is_slot_set(self.forbidden_slots, slot, periods_per_day)
    }

    /// 设置禁止时段
    ///
    /// # 参数
    /// - `slot`: 要禁止的时间槽位
    /// - `periods_per_day`: 每天的节次数
    ///
    /// # 示例
    /// ```rust
    /// use course_scheduling_system::algorithm::{SubjectConfig, TimeSlot};
    ///
    /// let mut config = SubjectConfig::new("pe".to_string(), "体育".to_string());
    /// let slot = TimeSlot { day: 0, period: 0 };
    /// config.set_forbidden_slot(&slot, 8);
    /// assert!(config.is_slot_forbidden(&slot, 8));
    /// ```
    pub fn set_forbidden_slot(&mut self, slot: &TimeSlot, periods_per_day: u8) {
        self.forbidden_slots = set_slot(self.forbidden_slots, slot, periods_per_day);
        debug!(
            "设置禁止时段: id={}, slot=({}, {})",
            self.id, slot.day, slot.period
        );
    }

    /// 清除禁止时段
    ///
    /// # 参数
    /// - `slot`: 要清除的时间槽位
    /// - `periods_per_day`: 每天的节次数
    ///
    /// # 示例
    /// ```rust
    /// use course_scheduling_system::algorithm::{SubjectConfig, TimeSlot};
    ///
    /// let mut config = SubjectConfig::new("pe".to_string(), "体育".to_string());
    /// let slot = TimeSlot { day: 0, period: 0 };
    /// config.set_forbidden_slot(&slot, 8);
    /// assert!(config.is_slot_forbidden(&slot, 8));
    ///
    /// config.clear_forbidden_slot(&slot, 8);
    /// assert!(!config.is_slot_forbidden(&slot, 8));
    /// ```
    pub fn clear_forbidden_slot(&mut self, slot: &TimeSlot, periods_per_day: u8) {
        self.forbidden_slots = clear_slot(self.forbidden_slots, slot, periods_per_day);
        debug!(
            "清除禁止时段: id={}, slot=({}, {})",
            self.id, slot.day, slot.period
        );
    }
}

// ============================================================================
// 教师偏好数据结构
// ============================================================================

/// 教师偏好配置
///
/// 定义教师的个性化上课偏好和约束
///
/// # 字段
/// - `teacher_id`: 教师ID
/// - `preferred_slots`: 偏好时段掩码（使用位掩码表示）
/// - `time_bias`: 早晚偏好（0=无偏好, 1=厌恶早课, 2=厌恶晚课）
/// - `weight`: 权重系数（用于计算代价函数）
/// - `blocked_slots`: 不排课时段掩码（硬约束）
/// - `teaching_group_id`: 教研组ID（可选）
///
/// # 示例
/// ```rust
/// use course_scheduling_system::algorithm::TeacherPreference;
///
/// let preference = TeacherPreference {
///     teacher_id: 1,
///     preferred_slots: 0,
///     time_bias: 0,
///     weight: 1,
///     blocked_slots: 0,
///     teaching_group_id: None,
/// };
/// ```
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TeacherPreference {
    /// 教师ID
    pub teacher_id: u32,
    /// 偏好时段掩码（使用位掩码表示）
    pub preferred_slots: TimeSlotMask,
    /// 早晚偏好（0=无偏好, 1=厌恶早课, 2=厌恶晚课）
    pub time_bias: u8,
    /// 权重系数（用于计算代价函数）
    pub weight: u32,
    /// 不排课时段掩码（硬约束）
    pub blocked_slots: TimeSlotMask,
    /// 教研组ID（可选）
    pub teaching_group_id: Option<u32>,
}

impl TeacherPreference {
    /// 创建新的教师偏好配置
    ///
    /// # 参数
    /// - `teacher_id`: 教师ID
    ///
    /// # 返回
    /// 默认配置的教师偏好实例
    ///
    /// # 示例
    /// ```rust
    /// use course_scheduling_system::algorithm::TeacherPreference;
    ///
    /// let preference = TeacherPreference::new(1);
    /// assert_eq!(preference.teacher_id, 1);
    /// assert_eq!(preference.preferred_slots, 0);
    /// assert_eq!(preference.time_bias, 0);
    /// assert_eq!(preference.weight, 1);
    /// assert_eq!(preference.blocked_slots, 0);
    /// assert_eq!(preference.teaching_group_id, None);
    /// ```
    pub fn new(teacher_id: u32) -> Self {
        debug!("创建教师偏好配置: teacher_id={}", teacher_id);
        Self {
            teacher_id,
            preferred_slots: 0,
            time_bias: 0,
            weight: 1,
            blocked_slots: 0,
            teaching_group_id: None,
        }
    }

    /// 检查时间槽位是否为偏好时段
    ///
    /// # 参数
    /// - `slot`: 要检查的时间槽位
    /// - `periods_per_day`: 每天的节次数
    ///
    /// # 返回
    /// 如果时间槽位为偏好时段返回 `true`，否则返回 `false`
    ///
    /// # 示例
    /// ```rust
    /// use course_scheduling_system::algorithm::{TeacherPreference, TimeSlot};
    ///
    /// let mut preference = TeacherPreference::new(1);
    /// preference.preferred_slots = 0b111; // 偏好前3节
    ///
    /// let slot1 = TimeSlot { day: 0, period: 0 };
    /// assert!(preference.is_slot_preferred(&slot1, 8));
    ///
    /// let slot2 = TimeSlot { day: 0, period: 3 };
    /// assert!(!preference.is_slot_preferred(&slot2, 8));
    /// ```
    pub fn is_slot_preferred(&self, slot: &TimeSlot, periods_per_day: u8) -> bool {
        is_slot_set(self.preferred_slots, slot, periods_per_day)
    }

    /// 检查时间槽位是否为不排课时段
    ///
    /// # 参数
    /// - `slot`: 要检查的时间槽位
    /// - `periods_per_day`: 每天的节次数
    ///
    /// # 返回
    /// 如果时间槽位为不排课时段返回 `true`，否则返回 `false`
    ///
    /// # 示例
    /// ```rust
    /// use course_scheduling_system::algorithm::{TeacherPreference, TimeSlot};
    ///
    /// let mut preference = TeacherPreference::new(1);
    /// preference.blocked_slots = 0b111; // 不排课前3节
    ///
    /// let slot1 = TimeSlot { day: 0, period: 0 };
    /// assert!(preference.is_slot_blocked(&slot1, 8));
    ///
    /// let slot2 = TimeSlot { day: 0, period: 3 };
    /// assert!(!preference.is_slot_blocked(&slot2, 8));
    /// ```
    pub fn is_slot_blocked(&self, slot: &TimeSlot, periods_per_day: u8) -> bool {
        is_slot_set(self.blocked_slots, slot, periods_per_day)
    }

    /// 设置偏好时段
    ///
    /// # 参数
    /// - `slot`: 要设置的时间槽位
    /// - `periods_per_day`: 每天的节次数
    ///
    /// # 示例
    /// ```rust
    /// use course_scheduling_system::algorithm::{TeacherPreference, TimeSlot};
    ///
    /// let mut preference = TeacherPreference::new(1);
    /// let slot = TimeSlot { day: 0, period: 0 };
    /// preference.set_preferred_slot(&slot, 8);
    /// assert!(preference.is_slot_preferred(&slot, 8));
    /// ```
    pub fn set_preferred_slot(&mut self, slot: &TimeSlot, periods_per_day: u8) {
        self.preferred_slots = set_slot(self.preferred_slots, slot, periods_per_day);
        debug!(
            "设置偏好时段: teacher_id={}, slot=({}, {})",
            self.teacher_id, slot.day, slot.period
        );
    }

    /// 设置不排课时段
    ///
    /// # 参数
    /// - `slot`: 要设置的时间槽位
    /// - `periods_per_day`: 每天的节次数
    ///
    /// # 示例
    /// ```rust
    /// use course_scheduling_system::algorithm::{TeacherPreference, TimeSlot};
    ///
    /// let mut preference = TeacherPreference::new(1);
    /// let slot = TimeSlot { day: 0, period: 0 };
    /// preference.set_blocked_slot(&slot, 8);
    /// assert!(preference.is_slot_blocked(&slot, 8));
    /// ```
    pub fn set_blocked_slot(&mut self, slot: &TimeSlot, periods_per_day: u8) {
        self.blocked_slots = set_slot(self.blocked_slots, slot, periods_per_day);
        debug!(
            "设置不排课时段: teacher_id={}, slot=({}, {})",
            self.teacher_id, slot.day, slot.period
        );
    }
}

// ============================================================================
// 单双周枚举
// ============================================================================

/// 单双周类型
///
/// 表示课程的周期类型
///
/// # 变体
/// - `Every`: 每周都上课
/// - `Odd`: 仅单周上课
/// - `Even`: 仅双周上课
///
/// # 示例
/// ```rust
/// use course_scheduling_system::algorithm::WeekType;
///
/// let week_type = WeekType::Every;
/// assert_eq!(week_type, WeekType::Every);
/// ```
#[derive(Debug, Clone, PartialEq, Eq, Hash, Serialize, Deserialize)]
pub enum WeekType {
    /// 每周都上课
    Every,
    /// 仅单周上课
    Odd,
    /// 仅双周上课
    Even,
}

impl Default for WeekType {
    fn default() -> Self {
        WeekType::Every
    }
}

// ============================================================================
// 班级教学计划数据结构
// ============================================================================

/// 班级教学计划
///
/// 定义班级的课程安排计划，包含科目、教师和课时数
///
/// # 字段
/// - `id`: 教学计划ID
/// - `class_id`: 班级ID
/// - `subject_id`: 科目ID
/// - `teacher_id`: 教师ID
/// - `target_sessions`: 目标课时数
/// - `is_combined_class`: 是否合班课
/// - `combined_class_ids`: 合班班级列表
/// - `week_type`: 单周/双周/每周
///
/// # 示例
/// ```rust
/// use course_scheduling_system::algorithm::{ClassCurriculum, WeekType};
///
/// let curriculum = ClassCurriculum::new(
///     1,
///     101,
///     "math".to_string(),
///     1001,
///     5,
/// );
/// assert_eq!(curriculum.class_id, 101);
/// assert_eq!(curriculum.subject_id, "math");
/// assert_eq!(curriculum.target_sessions, 5);
/// ```
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ClassCurriculum {
    /// 教学计划ID
    pub id: u32,
    /// 班级ID
    pub class_id: u32,
    /// 科目ID
    pub subject_id: String,
    /// 教师ID
    pub teacher_id: u32,
    /// 目标课时数
    pub target_sessions: u8,
    /// 是否合班课
    pub is_combined_class: bool,
    /// 合班班级列表
    pub combined_class_ids: Vec<u32>,
    /// 单周/双周/每周
    pub week_type: WeekType,
}

impl ClassCurriculum {
    /// 创建新的教学计划
    ///
    /// # 参数
    /// - `id`: 教学计划ID
    /// - `class_id`: 班级ID
    /// - `subject_id`: 科目ID
    /// - `teacher_id`: 教师ID
    /// - `target_sessions`: 目标课时数
    ///
    /// # 返回
    /// 默认配置的教学计划实例
    ///
    /// # 示例
    /// ```rust
    /// use course_scheduling_system::algorithm::ClassCurriculum;
    ///
    /// let curriculum = ClassCurriculum::new(
    ///     1,
    ///     101,
    ///     "math".to_string(),
    ///     1001,
    ///     5,
    /// );
    /// assert_eq!(curriculum.id, 1);
    /// assert_eq!(curriculum.class_id, 101);
    /// assert_eq!(curriculum.subject_id, "math");
    /// assert_eq!(curriculum.teacher_id, 1001);
    /// assert_eq!(curriculum.target_sessions, 5);
    /// assert!(!curriculum.is_combined_class);
    /// assert!(curriculum.combined_class_ids.is_empty());
    /// ```
    pub fn new(
        id: u32,
        class_id: u32,
        subject_id: String,
        teacher_id: u32,
        target_sessions: u8,
    ) -> Self {
        debug!(
            "创建教学计划: id={}, class_id={}, subject_id={}, teacher_id={}, target_sessions={}",
            id, class_id, subject_id, teacher_id, target_sessions
        );
        Self {
            id,
            class_id,
            subject_id,
            teacher_id,
            target_sessions,
            is_combined_class: false,
            combined_class_ids: Vec::new(),
            week_type: WeekType::Every,
        }
    }

    /// 检查是否为合班课
    ///
    /// # 返回
    /// 如果是合班课返回 `true`，否则返回 `false`
    ///
    /// # 示例
    /// ```rust
    /// use course_scheduling_system::algorithm::ClassCurriculum;
    ///
    /// let mut curriculum = ClassCurriculum::new(1, 101, "math".to_string(), 1001, 5);
    /// assert!(!curriculum.is_combined());
    ///
    /// curriculum.add_combined_class(102);
    /// assert!(curriculum.is_combined());
    /// ```
    pub fn is_combined(&self) -> bool {
        self.is_combined_class && !self.combined_class_ids.is_empty()
    }

    /// 添加合班班级
    ///
    /// # 参数
    /// - `class_id`: 要添加的班级ID
    ///
    /// # 示例
    /// ```rust
    /// use course_scheduling_system::algorithm::ClassCurriculum;
    ///
    /// let mut curriculum = ClassCurriculum::new(1, 101, "math".to_string(), 1001, 5);
    /// curriculum.add_combined_class(102);
    /// curriculum.add_combined_class(103);
    /// assert!(curriculum.is_combined());
    /// assert_eq!(curriculum.combined_class_ids.len(), 2);
    /// ```
    pub fn add_combined_class(&mut self, class_id: u32) {
        if !self.combined_class_ids.contains(&class_id) {
            self.combined_class_ids.push(class_id);
            self.is_combined_class = true;
            debug!(
                "添加合班班级: curriculum_id={}, class_id={}",
                self.id, class_id
            );
        }
    }

    /// 移除合班班级
    ///
    /// # 参数
    /// - `class_id`: 要移除的班级ID
    ///
    /// # 返回
    /// 如果成功移除返回 `true`，否则返回 `false`
    ///
    /// # 示例
    /// ```rust
    /// use course_scheduling_system::algorithm::ClassCurriculum;
    ///
    /// let mut curriculum = ClassCurriculum::new(1, 101, "math".to_string(), 1001, 5);
    /// curriculum.add_combined_class(102);
    /// curriculum.add_combined_class(103);
    /// assert_eq!(curriculum.combined_class_ids.len(), 2);
    ///
    /// assert!(curriculum.remove_combined_class(102));
    /// assert_eq!(curriculum.combined_class_ids.len(), 1);
    ///
    /// assert!(curriculum.remove_combined_class(103));
    /// assert_eq!(curriculum.combined_class_ids.len(), 0);
    /// assert!(!curriculum.is_combined());
    /// ```
    pub fn remove_combined_class(&mut self, class_id: u32) -> bool {
        if let Some(pos) = self
            .combined_class_ids
            .iter()
            .position(|&id| id == class_id)
        {
            self.combined_class_ids.remove(pos);
            if self.combined_class_ids.is_empty() {
                self.is_combined_class = false;
            }
            debug!(
                "移除合班班级: curriculum_id={}, class_id={}",
                self.id, class_id
            );
            true
        } else {
            false
        }
    }
}

// ============================================================================
// 场地配置数据结构
// ============================================================================

/// 场地配置
///
/// 定义场地的容量限制和属性
///
/// # 字段
/// - `id`: 场地唯一标识符
/// - `name`: 场地名称
/// - `capacity`: 同时容纳的班级数
///
/// # 示例
/// ```rust
/// use course_scheduling_system::algorithm::Venue;
///
/// let venue = Venue::new(
///     "computer_lab".to_string(),
///     "微机室".to_string(),
///     1,
/// );
/// assert_eq!(venue.id, "computer_lab");
/// assert_eq!(venue.name, "微机室");
/// assert_eq!(venue.capacity, 1);
/// ```
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Venue {
    /// 场地唯一标识符
    pub id: String,
    /// 场地名称
    pub name: String,
    /// 同时容纳的班级数
    pub capacity: u8,
}

impl Venue {
    /// 创建新的场地配置
    ///
    /// # 参数
    /// - `id`: 场地唯一标识符
    /// - `name`: 场地名称
    /// - `capacity`: 同时容纳的班级数
    ///
    /// # 返回
    /// 场地配置实例
    ///
    /// # 示例
    /// ```rust
    /// use course_scheduling_system::algorithm::Venue;
    ///
    /// let venue = Venue::new(
    ///     "gym".to_string(),
    ///     "体育馆".to_string(),
    ///     4,
    /// );
    /// assert_eq!(venue.id, "gym");
    /// assert_eq!(venue.name, "体育馆");
    /// assert_eq!(venue.capacity, 4);
    /// ```
    pub fn new(id: String, name: String, capacity: u8) -> Self {
        debug!(
            "创建场地配置: id={}, name={}, capacity={}",
            id, name, capacity
        );
        Self { id, name, capacity }
    }

    /// 检查是否还能容纳更多班级
    ///
    /// # 参数
    /// - `current_usage`: 当前使用的班级数
    ///
    /// # 返回
    /// 如果还能容纳更多班级返回 `true`，否则返回 `false`
    ///
    /// # 示例
    /// ```rust
    /// use course_scheduling_system::algorithm::Venue;
    ///
    /// let venue = Venue::new(
    ///     "lab".to_string(),
    ///     "实验室".to_string(),
    ///     2,
    /// );
    ///
    /// assert!(venue.can_accommodate(0));
    /// assert!(venue.can_accommodate(1));
    /// assert!(!venue.can_accommodate(2));
    /// assert!(!venue.can_accommodate(3));
    /// ```
    pub fn can_accommodate(&self, current_usage: u8) -> bool {
        let can_accommodate = current_usage < self.capacity;
        trace!(
            "检查场地容量: id={}, current_usage={}, capacity={}, can_accommodate={}",
            self.id,
            current_usage,
            self.capacity,
            can_accommodate
        );
        can_accommodate
    }
}

// ============================================================================
// 教师互斥关系数据结构
// ============================================================================

/// 互斥范围
///
/// 定义教师互斥的时间范围
///
/// # 变体
/// - `AllTime`: 全时段互斥，两位教师在任何时段都不能同时上课
/// - `SpecificSlots`: 特定时段互斥，仅在指定的时段不能同时上课
///
/// # 示例
/// ```rust
/// use course_scheduling_system::algorithm::ExclusionScope;
///
/// // 全时段互斥
/// let all_time = ExclusionScope::AllTime;
///
/// // 特定时段互斥（前3节）
/// let specific = ExclusionScope::SpecificSlots(0b111);
/// ```
#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum ExclusionScope {
    /// 全时段互斥
    AllTime,
    /// 特定时段互斥（使用位掩码表示）
    SpecificSlots(TimeSlotMask),
}

impl ExclusionScope {
    /// 检查指定时段是否在互斥范围内
    ///
    /// # 参数
    /// - `slot`: 要检查的时间槽位
    /// - `periods_per_day`: 每天的节次数
    ///
    /// # 返回
    /// 如果时段在互斥范围内返回 `true`，否则返回 `false`
    ///
    /// # 示例
    /// ```rust
    /// use course_scheduling_system::algorithm::{ExclusionScope, TimeSlot};
    ///
    /// // 全时段互斥
    /// let all_time = ExclusionScope::AllTime;
    /// let slot = TimeSlot { day: 0, period: 0 };
    /// assert!(all_time.is_excluded_at(&slot, 8));
    ///
    /// // 特定时段互斥
    /// let specific = ExclusionScope::SpecificSlots(0b111); // 前3节
    /// let slot1 = TimeSlot { day: 0, period: 0 };
    /// assert!(specific.is_excluded_at(&slot1, 8));
    ///
    /// let slot2 = TimeSlot { day: 0, period: 3 };
    /// assert!(!specific.is_excluded_at(&slot2, 8));
    /// ```
    pub fn is_excluded_at(&self, slot: &TimeSlot, periods_per_day: u8) -> bool {
        match self {
            ExclusionScope::AllTime => {
                trace!(
                    "检查全时段互斥: slot=({}, {}), 结果=true",
                    slot.day,
                    slot.period
                );
                true
            }
            ExclusionScope::SpecificSlots(mask) => {
                let is_excluded = is_slot_set(*mask, slot, periods_per_day);
                trace!(
                    "检查特定时段互斥: slot=({}, {}), mask={:#066b}, 结果={}",
                    slot.day,
                    slot.period,
                    mask,
                    is_excluded
                );
                is_excluded
            }
        }
    }
}

/// 教师互斥关系
///
/// 定义两位教师之间的互斥约束，确保他们不能在指定的时段同时上课
///
/// # 字段
/// - `teacher_a_id`: 教师A的ID
/// - `teacher_b_id`: 教师B的ID
/// - `scope`: 互斥范围（全时段或特定时段）
///
/// # 示例
/// ```rust
/// use course_scheduling_system::algorithm::{TeacherMutualExclusion, ExclusionScope};
///
/// // 创建全时段互斥关系
/// let exclusion = TeacherMutualExclusion::new_all_time(1, 2);
/// assert_eq!(exclusion.teacher_a_id, 1);
/// assert_eq!(exclusion.teacher_b_id, 2);
///
/// // 创建特定时段互斥关系
/// let exclusion2 = TeacherMutualExclusion::new_specific_slots(1, 2, 0b111);
/// ```
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TeacherMutualExclusion {
    /// 教师A的ID
    pub teacher_a_id: u32,
    /// 教师B的ID
    pub teacher_b_id: u32,
    /// 互斥范围
    pub scope: ExclusionScope,
}

impl TeacherMutualExclusion {
    /// 创建全时段互斥关系
    ///
    /// # 参数
    /// - `teacher_a_id`: 教师A的ID
    /// - `teacher_b_id`: 教师B的ID
    ///
    /// # 返回
    /// 全时段互斥的教师互斥关系实例
    ///
    /// # 示例
    /// ```rust
    /// use course_scheduling_system::algorithm::TeacherMutualExclusion;
    ///
    /// let exclusion = TeacherMutualExclusion::new_all_time(1, 2);
    /// assert_eq!(exclusion.teacher_a_id, 1);
    /// assert_eq!(exclusion.teacher_b_id, 2);
    /// ```
    pub fn new_all_time(teacher_a_id: u32, teacher_b_id: u32) -> Self {
        debug!(
            "创建全时段教师互斥关系: teacher_a_id={}, teacher_b_id={}",
            teacher_a_id, teacher_b_id
        );
        Self {
            teacher_a_id,
            teacher_b_id,
            scope: ExclusionScope::AllTime,
        }
    }

    /// 创建特定时段互斥关系
    ///
    /// # 参数
    /// - `teacher_a_id`: 教师A的ID
    /// - `teacher_b_id`: 教师B的ID
    /// - `slots_mask`: 互斥时段的位掩码
    ///
    /// # 返回
    /// 特定时段互斥的教师互斥关系实例
    ///
    /// # 示例
    /// ```rust
    /// use course_scheduling_system::algorithm::TeacherMutualExclusion;
    ///
    /// // 前3节互斥
    /// let exclusion = TeacherMutualExclusion::new_specific_slots(1, 2, 0b111);
    /// assert_eq!(exclusion.teacher_a_id, 1);
    /// assert_eq!(exclusion.teacher_b_id, 2);
    /// ```
    pub fn new_specific_slots(
        teacher_a_id: u32,
        teacher_b_id: u32,
        slots_mask: TimeSlotMask,
    ) -> Self {
        debug!(
            "创建特定时段教师互斥关系: teacher_a_id={}, teacher_b_id={}, slots_mask={:#066b}",
            teacher_a_id, teacher_b_id, slots_mask
        );
        Self {
            teacher_a_id,
            teacher_b_id,
            scope: ExclusionScope::SpecificSlots(slots_mask),
        }
    }

    /// 检查指定时段是否互斥
    ///
    /// # 参数
    /// - `slot`: 要检查的时间槽位
    /// - `periods_per_day`: 每天的节次数
    ///
    /// # 返回
    /// 如果指定时段互斥返回 `true`，否则返回 `false`
    ///
    /// # 示例
    /// ```rust
    /// use course_scheduling_system::algorithm::{TeacherMutualExclusion, TimeSlot};
    ///
    /// // 全时段互斥
    /// let exclusion = TeacherMutualExclusion::new_all_time(1, 2);
    /// let slot = TimeSlot { day: 0, period: 0 };
    /// assert!(exclusion.is_excluded_at(&slot, 8));
    ///
    /// // 特定时段互斥
    /// let exclusion2 = TeacherMutualExclusion::new_specific_slots(1, 2, 0b111);
    /// let slot1 = TimeSlot { day: 0, period: 0 };
    /// assert!(exclusion2.is_excluded_at(&slot1, 8));
    ///
    /// let slot2 = TimeSlot { day: 0, period: 3 };
    /// assert!(!exclusion2.is_excluded_at(&slot2, 8));
    /// ```
    pub fn is_excluded_at(&self, slot: &TimeSlot, periods_per_day: u8) -> bool {
        self.scope.is_excluded_at(slot, periods_per_day)
    }
}

// ============================================================================
// 单元测试
// ============================================================================

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_timeslot_new() {
        let slot = TimeSlot::new(0, 0);
        assert_eq!(slot.day, 0);
        assert_eq!(slot.period, 0);
    }

    #[test]
    fn test_timeslot_to_bit_position() {
        // 测试标准周期（5天 × 8节）
        let slot1 = TimeSlot { day: 0, period: 0 };
        assert_eq!(slot1.to_bit_position(8), 0);

        let slot2 = TimeSlot { day: 0, period: 7 };
        assert_eq!(slot2.to_bit_position(8), 7);

        let slot3 = TimeSlot { day: 1, period: 0 };
        assert_eq!(slot3.to_bit_position(8), 8);

        let slot4 = TimeSlot { day: 4, period: 7 };
        assert_eq!(slot4.to_bit_position(8), 39);

        // 测试扩展周期（30天 × 12节）
        let slot5 = TimeSlot {
            day: 29,
            period: 11,
        };
        assert_eq!(slot5.to_bit_position(12), 359);
    }

    #[test]
    fn test_timeslot_from_bit_position() {
        // 测试标准周期
        let slot1 = TimeSlot::from_bit_position(0, 8);
        assert_eq!(slot1.day, 0);
        assert_eq!(slot1.period, 0);

        let slot2 = TimeSlot::from_bit_position(7, 8);
        assert_eq!(slot2.day, 0);
        assert_eq!(slot2.period, 7);

        let slot3 = TimeSlot::from_bit_position(8, 8);
        assert_eq!(slot3.day, 1);
        assert_eq!(slot3.period, 0);

        let slot4 = TimeSlot::from_bit_position(39, 8);
        assert_eq!(slot4.day, 4);
        assert_eq!(slot4.period, 7);

        // 测试扩展周期
        let slot5 = TimeSlot::from_bit_position(359, 12);
        assert_eq!(slot5.day, 29);
        assert_eq!(slot5.period, 11);
    }

    #[test]
    fn test_timeslot_to_mask() {
        let slot1 = TimeSlot { day: 0, period: 0 };
        assert_eq!(slot1.to_mask(8), 1u64);

        let slot2 = TimeSlot { day: 0, period: 1 };
        assert_eq!(slot2.to_mask(8), 2u64);

        let slot3 = TimeSlot { day: 1, period: 0 };
        assert_eq!(slot3.to_mask(8), 256u64);

        let slot4 = TimeSlot { day: 0, period: 3 };
        assert_eq!(slot4.to_mask(8), 8u64);
    }

    #[test]
    fn test_timeslot_is_valid() {
        // 有效的时间槽位
        let slot1 = TimeSlot { day: 0, period: 0 };
        assert!(slot1.is_valid(5, 8));

        let slot2 = TimeSlot { day: 4, period: 7 };
        assert!(slot2.is_valid(5, 8));

        // 无效的时间槽位
        let slot3 = TimeSlot { day: 5, period: 0 };
        assert!(!slot3.is_valid(5, 8));

        let slot4 = TimeSlot { day: 0, period: 8 };
        assert!(!slot4.is_valid(5, 8));

        let slot5 = TimeSlot {
            day: 10,
            period: 10,
        };
        assert!(!slot5.is_valid(5, 8));

        // 测试扩展周期
        let slot6 = TimeSlot {
            day: 29,
            period: 11,
        };
        assert!(slot6.is_valid(30, 12));

        let slot7 = TimeSlot { day: 30, period: 0 };
        assert!(!slot7.is_valid(30, 12));
    }

    #[test]
    fn test_set_slot() {
        let mut mask = 0u64;
        let slot1 = TimeSlot { day: 0, period: 0 };
        mask = set_slot(mask, &slot1, 8);
        assert_eq!(mask, 1u64);

        let slot2 = TimeSlot { day: 0, period: 1 };
        mask = set_slot(mask, &slot2, 8);
        assert_eq!(mask, 3u64); // 0b11

        let slot3 = TimeSlot { day: 1, period: 0 };
        mask = set_slot(mask, &slot3, 8);
        assert_eq!(mask, 259u64); // 0b100000011
    }

    #[test]
    fn test_clear_slot() {
        let mut mask = 0u64;
        let slot1 = TimeSlot { day: 0, period: 0 };
        let slot2 = TimeSlot { day: 0, period: 1 };

        mask = set_slot(mask, &slot1, 8);
        mask = set_slot(mask, &slot2, 8);
        assert_eq!(mask, 3u64);

        mask = clear_slot(mask, &slot1, 8);
        assert_eq!(mask, 2u64);

        mask = clear_slot(mask, &slot2, 8);
        assert_eq!(mask, 0u64);
    }

    #[test]
    fn test_is_slot_set() {
        let mut mask = 0u64;
        let slot1 = TimeSlot { day: 0, period: 0 };
        let slot2 = TimeSlot { day: 0, period: 1 };

        assert!(!is_slot_set(mask, &slot1, 8));
        assert!(!is_slot_set(mask, &slot2, 8));

        mask = set_slot(mask, &slot1, 8);
        assert!(is_slot_set(mask, &slot1, 8));
        assert!(!is_slot_set(mask, &slot2, 8));

        mask = set_slot(mask, &slot2, 8);
        assert!(is_slot_set(mask, &slot1, 8));
        assert!(is_slot_set(mask, &slot2, 8));
    }

    #[test]
    fn test_count_slots() {
        let mut mask = 0u64;
        assert_eq!(count_slots(mask), 0);

        let slot1 = TimeSlot { day: 0, period: 0 };
        mask = set_slot(mask, &slot1, 8);
        assert_eq!(count_slots(mask), 1);

        let slot2 = TimeSlot { day: 0, period: 1 };
        mask = set_slot(mask, &slot2, 8);
        assert_eq!(count_slots(mask), 2);

        let slot3 = TimeSlot { day: 1, period: 0 };
        mask = set_slot(mask, &slot3, 8);
        assert_eq!(count_slots(mask), 3);

        mask = clear_slot(mask, &slot1, 8);
        assert_eq!(count_slots(mask), 2);
    }

    #[test]
    fn test_roundtrip_conversion() {
        // 测试位位置和时间槽位之间的往返转换
        for day in 0..5 {
            for period in 0..8 {
                let original = TimeSlot { day, period };
                let pos = original.to_bit_position(8);
                let converted = TimeSlot::from_bit_position(pos, 8);
                assert_eq!(original, converted);
            }
        }
    }

    #[test]
    fn test_mask_operations() {
        // 测试位掩码操作的组合使用
        let mut mask = 0u64;

        // 设置多个时间槽位
        let slots = vec![
            TimeSlot { day: 0, period: 0 },
            TimeSlot { day: 0, period: 2 },
            TimeSlot { day: 1, period: 1 },
            TimeSlot { day: 2, period: 3 },
        ];

        for slot in &slots {
            mask = set_slot(mask, slot, 8);
        }

        // 验证所有槽位都被设置
        for slot in &slots {
            assert!(is_slot_set(mask, slot, 8));
        }

        // 验证未设置的槽位
        let unset_slot = TimeSlot { day: 0, period: 1 };
        assert!(!is_slot_set(mask, &unset_slot, 8));

        // 验证槽位数量
        assert_eq!(count_slots(mask), 4);

        // 清除一个槽位
        mask = clear_slot(mask, &slots[0], 8);
        assert!(!is_slot_set(mask, &slots[0], 8));
        assert_eq!(count_slots(mask), 3);
    }

    #[test]
    fn test_extended_period() {
        // 测试扩展周期（30天 × 12节 = 360个槽位）
        let slot = TimeSlot { day: 15, period: 6 };
        let pos = slot.to_bit_position(12);
        assert_eq!(pos, 186); // 15 * 12 + 6 = 186

        let converted = TimeSlot::from_bit_position(186, 12);
        assert_eq!(converted.day, 15);
        assert_eq!(converted.period, 6);

        // 验证最大槽位
        let max_slot = TimeSlot {
            day: 29,
            period: 11,
        };
        assert!(max_slot.is_valid(30, 12));
        let max_pos = max_slot.to_bit_position(12);
        assert_eq!(max_pos, 359); // 29 * 12 + 11 = 359
    }

    // ============================================================================
    // SubjectConfig 测试
    // ============================================================================

    #[test]
    fn test_subject_config_new() {
        let config = SubjectConfig::new("math".to_string(), "数学".to_string());
        assert_eq!(config.id, "math");
        assert_eq!(config.name, "数学");
        assert_eq!(config.forbidden_slots, 0);
        assert!(config.allow_double_session);
        assert_eq!(config.venue_id, None);
        assert!(!config.is_major_subject);
    }

    #[test]
    fn test_subject_config_creation() {
        // 测试直接创建
        let config = SubjectConfig {
            id: "physics".to_string(),
            name: "物理".to_string(),
            forbidden_slots: 0,
            allow_double_session: true,
            venue_id: Some("lab1".to_string()),
            is_major_subject: true,
        };

        assert_eq!(config.id, "physics");
        assert_eq!(config.name, "物理");
        assert_eq!(config.forbidden_slots, 0);
        assert!(config.allow_double_session);
        assert_eq!(config.venue_id, Some("lab1".to_string()));
        assert!(config.is_major_subject);
    }

    #[test]
    fn test_subject_config_forbidden_slots() {
        let mut config = SubjectConfig::new("pe".to_string(), "体育".to_string());

        // 设置禁止时段
        let slot1 = TimeSlot { day: 0, period: 0 };
        let slot2 = TimeSlot { day: 0, period: 1 };
        let slot3 = TimeSlot { day: 0, period: 2 };

        config.set_forbidden_slot(&slot1, 8);
        config.set_forbidden_slot(&slot2, 8);
        config.set_forbidden_slot(&slot3, 8);

        // 验证禁止时段
        assert!(config.is_slot_forbidden(&slot1, 8));
        assert!(config.is_slot_forbidden(&slot2, 8));
        assert!(config.is_slot_forbidden(&slot3, 8));

        // 验证非禁止时段
        let slot4 = TimeSlot { day: 0, period: 3 };
        assert!(!config.is_slot_forbidden(&slot4, 8));

        // 清除禁止时段
        config.clear_forbidden_slot(&slot1, 8);
        assert!(!config.is_slot_forbidden(&slot1, 8));
        assert!(config.is_slot_forbidden(&slot2, 8));
        assert!(config.is_slot_forbidden(&slot3, 8));
    }

    #[test]
    fn test_subject_config_serialization() {
        let config = SubjectConfig {
            id: "chemistry".to_string(),
            name: "化学".to_string(),
            forbidden_slots: 0b111, // 禁止前3节
            allow_double_session: false,
            venue_id: Some("lab2".to_string()),
            is_major_subject: true,
        };

        // 序列化
        let json = serde_json::to_string(&config).unwrap();
        assert!(json.contains("chemistry"));
        assert!(json.contains("化学"));

        // 反序列化
        let deserialized: SubjectConfig = serde_json::from_str(&json).unwrap();
        assert_eq!(deserialized.id, config.id);
        assert_eq!(deserialized.name, config.name);
        assert_eq!(deserialized.forbidden_slots, config.forbidden_slots);
        assert_eq!(
            deserialized.allow_double_session,
            config.allow_double_session
        );
        assert_eq!(deserialized.venue_id, config.venue_id);
        assert_eq!(deserialized.is_major_subject, config.is_major_subject);
    }

    #[test]
    fn test_subject_config_clone() {
        let config = SubjectConfig {
            id: "english".to_string(),
            name: "英语".to_string(),
            forbidden_slots: 0,
            allow_double_session: true,
            venue_id: None,
            is_major_subject: true,
        };

        let cloned = config.clone();
        assert_eq!(cloned.id, config.id);
        assert_eq!(cloned.name, config.name);
        assert_eq!(cloned.forbidden_slots, config.forbidden_slots);
        assert_eq!(cloned.allow_double_session, config.allow_double_session);
        assert_eq!(cloned.venue_id, config.venue_id);
        assert_eq!(cloned.is_major_subject, config.is_major_subject);
    }

    #[test]
    fn test_subject_config_debug() {
        let config = SubjectConfig::new("history".to_string(), "历史".to_string());
        let debug_str = format!("{:?}", config);
        assert!(debug_str.contains("history"));
        assert!(debug_str.contains("历史"));
    }

    #[test]
    fn test_subject_config_field_access() {
        let mut config = SubjectConfig::new("biology".to_string(), "生物".to_string());

        // 测试字段访问
        assert_eq!(config.id, "biology");
        assert_eq!(config.name, "生物");

        // 测试字段修改
        config.name = "生物学".to_string();
        assert_eq!(config.name, "生物学");

        config.allow_double_session = false;
        assert!(!config.allow_double_session);

        config.venue_id = Some("lab3".to_string());
        assert_eq!(config.venue_id, Some("lab3".to_string()));

        config.is_major_subject = true;
        assert!(config.is_major_subject);
    }

    #[test]
    fn test_subject_config_pe_constraint() {
        // 测试体育课不能排在前3节的约束
        let mut config = SubjectConfig::new("pe".to_string(), "体育".to_string());

        // 设置禁止前3节
        for period in 0..3 {
            let slot = TimeSlot { day: 0, period };
            config.set_forbidden_slot(&slot, 8);
        }

        // 验证前3节被禁止
        for period in 0..3 {
            let slot = TimeSlot { day: 0, period };
            assert!(config.is_slot_forbidden(&slot, 8));
        }

        // 验证第4节及以后可用
        for period in 3..8 {
            let slot = TimeSlot { day: 0, period };
            assert!(!config.is_slot_forbidden(&slot, 8));
        }
    }

    #[test]
    fn test_subject_config_multiple_days() {
        // 测试多天的禁止时段设置
        let mut config = SubjectConfig::new("music".to_string(), "音乐".to_string());

        // 在不同天设置禁止时段
        let slots = vec![
            TimeSlot { day: 0, period: 0 },
            TimeSlot { day: 1, period: 1 },
            TimeSlot { day: 2, period: 2 },
            TimeSlot { day: 3, period: 3 },
            TimeSlot { day: 4, period: 4 },
        ];

        for slot in &slots {
            config.set_forbidden_slot(slot, 8);
        }

        // 验证所有设置的时段都被禁止
        for slot in &slots {
            assert!(config.is_slot_forbidden(slot, 8));
        }

        // 验证其他时段不被禁止
        let other_slot = TimeSlot { day: 0, period: 1 };
        assert!(!config.is_slot_forbidden(&other_slot, 8));
    }

    // ============================================================================
    // TeacherPreference 测试
    // ============================================================================

    #[test]
    fn test_teacher_preference_new() {
        let preference = TeacherPreference::new(1);
        assert_eq!(preference.teacher_id, 1);
        assert_eq!(preference.preferred_slots, 0);
        assert_eq!(preference.time_bias, 0);
        assert_eq!(preference.weight, 1);
        assert_eq!(preference.blocked_slots, 0);
        assert_eq!(preference.teaching_group_id, None);
    }

    #[test]
    fn test_teacher_preference_creation() {
        // 测试直接创建
        let preference = TeacherPreference {
            teacher_id: 100,
            preferred_slots: 0b11111111, // 偏好前8节
            time_bias: 1,                // 厌恶早课
            weight: 2,
            blocked_slots: 0b11, // 不排课前2节
            teaching_group_id: Some(5),
        };

        assert_eq!(preference.teacher_id, 100);
        assert_eq!(preference.preferred_slots, 0b11111111);
        assert_eq!(preference.time_bias, 1);
        assert_eq!(preference.weight, 2);
        assert_eq!(preference.blocked_slots, 0b11);
        assert_eq!(preference.teaching_group_id, Some(5));
    }

    #[test]
    fn test_teacher_preference_preferred_slots() {
        let mut preference = TeacherPreference::new(1);

        // 设置偏好时段
        let slot1 = TimeSlot { day: 0, period: 2 };
        let slot2 = TimeSlot { day: 0, period: 3 };
        let slot3 = TimeSlot { day: 1, period: 2 };

        preference.set_preferred_slot(&slot1, 8);
        preference.set_preferred_slot(&slot2, 8);
        preference.set_preferred_slot(&slot3, 8);

        // 验证偏好时段
        assert!(preference.is_slot_preferred(&slot1, 8));
        assert!(preference.is_slot_preferred(&slot2, 8));
        assert!(preference.is_slot_preferred(&slot3, 8));

        // 验证非偏好时段
        let slot4 = TimeSlot { day: 0, period: 0 };
        assert!(!preference.is_slot_preferred(&slot4, 8));
    }

    #[test]
    fn test_teacher_preference_blocked_slots() {
        let mut preference = TeacherPreference::new(1);

        // 设置不排课时段
        let slot1 = TimeSlot { day: 0, period: 0 };
        let slot2 = TimeSlot { day: 0, period: 7 };
        let slot3 = TimeSlot { day: 4, period: 7 };

        preference.set_blocked_slot(&slot1, 8);
        preference.set_blocked_slot(&slot2, 8);
        preference.set_blocked_slot(&slot3, 8);

        // 验证不排课时段
        assert!(preference.is_slot_blocked(&slot1, 8));
        assert!(preference.is_slot_blocked(&slot2, 8));
        assert!(preference.is_slot_blocked(&slot3, 8));

        // 验证可排课时段
        let slot4 = TimeSlot { day: 0, period: 3 };
        assert!(!preference.is_slot_blocked(&slot4, 8));
    }

    #[test]
    fn test_teacher_preference_time_bias() {
        // 测试无偏好
        let preference1 = TeacherPreference {
            teacher_id: 1,
            preferred_slots: 0,
            time_bias: 0,
            weight: 1,
            blocked_slots: 0,
            teaching_group_id: None,
        };
        assert_eq!(preference1.time_bias, 0);

        // 测试厌恶早课
        let preference2 = TeacherPreference {
            teacher_id: 2,
            preferred_slots: 0,
            time_bias: 1,
            weight: 1,
            blocked_slots: 0,
            teaching_group_id: None,
        };
        assert_eq!(preference2.time_bias, 1);

        // 测试厌恶晚课
        let preference3 = TeacherPreference {
            teacher_id: 3,
            preferred_slots: 0,
            time_bias: 2,
            weight: 1,
            blocked_slots: 0,
            teaching_group_id: None,
        };
        assert_eq!(preference3.time_bias, 2);
    }

    #[test]
    fn test_teacher_preference_weight() {
        let mut preference = TeacherPreference::new(1);
        assert_eq!(preference.weight, 1);

        preference.weight = 5;
        assert_eq!(preference.weight, 5);

        preference.weight = 10;
        assert_eq!(preference.weight, 10);
    }

    #[test]
    fn test_teacher_preference_teaching_group() {
        let mut preference = TeacherPreference::new(1);
        assert_eq!(preference.teaching_group_id, None);

        preference.teaching_group_id = Some(3);
        assert_eq!(preference.teaching_group_id, Some(3));

        preference.teaching_group_id = None;
        assert_eq!(preference.teaching_group_id, None);
    }

    #[test]
    fn test_teacher_preference_serialization() {
        let preference = TeacherPreference {
            teacher_id: 100,
            preferred_slots: 0b11111111,
            time_bias: 1,
            weight: 2,
            blocked_slots: 0b11,
            teaching_group_id: Some(5),
        };

        // 序列化
        let json = serde_json::to_string(&preference).unwrap();
        assert!(json.contains("100"));
        assert!(json.contains("\"time_bias\":1"));
        assert!(json.contains("\"weight\":2"));

        // 反序列化
        let deserialized: TeacherPreference = serde_json::from_str(&json).unwrap();
        assert_eq!(deserialized.teacher_id, preference.teacher_id);
        assert_eq!(deserialized.preferred_slots, preference.preferred_slots);
        assert_eq!(deserialized.time_bias, preference.time_bias);
        assert_eq!(deserialized.weight, preference.weight);
        assert_eq!(deserialized.blocked_slots, preference.blocked_slots);
        assert_eq!(deserialized.teaching_group_id, preference.teaching_group_id);
    }

    #[test]
    fn test_teacher_preference_clone() {
        let preference = TeacherPreference {
            teacher_id: 50,
            preferred_slots: 0b1111,
            time_bias: 2,
            weight: 3,
            blocked_slots: 0b1,
            teaching_group_id: Some(2),
        };

        let cloned = preference.clone();
        assert_eq!(cloned.teacher_id, preference.teacher_id);
        assert_eq!(cloned.preferred_slots, preference.preferred_slots);
        assert_eq!(cloned.time_bias, preference.time_bias);
        assert_eq!(cloned.weight, preference.weight);
        assert_eq!(cloned.blocked_slots, preference.blocked_slots);
        assert_eq!(cloned.teaching_group_id, preference.teaching_group_id);
    }

    #[test]
    fn test_teacher_preference_debug() {
        let preference = TeacherPreference::new(1);
        let debug_str = format!("{:?}", preference);
        assert!(debug_str.contains("teacher_id"));
        assert!(debug_str.contains("preferred_slots"));
        assert!(debug_str.contains("time_bias"));
        assert!(debug_str.contains("weight"));
        assert!(debug_str.contains("blocked_slots"));
    }

    #[test]
    fn test_teacher_preference_combined_slots() {
        // 测试同时设置偏好时段和不排课时段
        let mut preference = TeacherPreference::new(1);

        // 设置偏好时段（上午）
        for period in 0..4 {
            let slot = TimeSlot { day: 0, period };
            preference.set_preferred_slot(&slot, 8);
        }

        // 设置不排课时段（第1节和最后一节）
        let blocked1 = TimeSlot { day: 0, period: 0 };
        let blocked2 = TimeSlot { day: 0, period: 7 };
        preference.set_blocked_slot(&blocked1, 8);
        preference.set_blocked_slot(&blocked2, 8);

        // 验证偏好时段
        for period in 0..4 {
            let slot = TimeSlot { day: 0, period };
            assert!(preference.is_slot_preferred(&slot, 8));
        }

        // 验证不排课时段
        assert!(preference.is_slot_blocked(&blocked1, 8));
        assert!(preference.is_slot_blocked(&blocked2, 8));

        // 验证非偏好时段
        let non_preferred = TimeSlot { day: 0, period: 5 };
        assert!(!preference.is_slot_preferred(&non_preferred, 8));
    }

    #[test]
    fn test_teacher_preference_multiple_days() {
        // 测试多天的偏好和不排课时段设置
        let mut preference = TeacherPreference::new(1);

        // 在不同天设置偏好时段
        let preferred_slots = vec![
            TimeSlot { day: 0, period: 2 },
            TimeSlot { day: 1, period: 2 },
            TimeSlot { day: 2, period: 2 },
            TimeSlot { day: 3, period: 2 },
            TimeSlot { day: 4, period: 2 },
        ];

        for slot in &preferred_slots {
            preference.set_preferred_slot(slot, 8);
        }

        // 验证所有设置的偏好时段
        for slot in &preferred_slots {
            assert!(preference.is_slot_preferred(slot, 8));
        }

        // 在不同天设置不排课时段
        let blocked_slots = vec![
            TimeSlot { day: 0, period: 0 },
            TimeSlot { day: 1, period: 0 },
            TimeSlot { day: 2, period: 0 },
        ];

        for slot in &blocked_slots {
            preference.set_blocked_slot(slot, 8);
        }

        // 验证所有设置的不排课时段
        for slot in &blocked_slots {
            assert!(preference.is_slot_blocked(slot, 8));
        }
    }

    #[test]
    fn test_teacher_preference_realistic_scenario() {
        // 测试真实场景：教师偏好上午上课，不排第1节和最后一节
        let mut preference = TeacherPreference::new(1);
        preference.time_bias = 1; // 厌恶早课
        preference.weight = 2;
        preference.teaching_group_id = Some(1);

        // 设置偏好时段（第2-4节）
        for period in 1..4 {
            let slot = TimeSlot { day: 0, period };
            preference.set_preferred_slot(&slot, 8);
        }

        // 设置不排课时段（第1节）
        let blocked = TimeSlot { day: 0, period: 0 };
        preference.set_blocked_slot(&blocked, 8);

        // 验证配置
        assert_eq!(preference.time_bias, 1);
        assert_eq!(preference.weight, 2);
        assert_eq!(preference.teaching_group_id, Some(1));
        assert!(preference.is_slot_blocked(&blocked, 8));

        // 验证偏好时段
        for period in 1..4 {
            let slot = TimeSlot { day: 0, period };
            assert!(preference.is_slot_preferred(&slot, 8));
        }

        // 验证非偏好时段
        let non_preferred = TimeSlot { day: 0, period: 7 };
        assert!(!preference.is_slot_preferred(&non_preferred, 8));
    }

    // ============================================================================
    // WeekType 测试
    // ============================================================================

    #[test]
    fn test_week_type_variants() {
        // 测试所有变体
        let every = WeekType::Every;
        let odd = WeekType::Odd;
        let even = WeekType::Even;

        assert_eq!(every, WeekType::Every);
        assert_eq!(odd, WeekType::Odd);
        assert_eq!(even, WeekType::Even);
    }

    #[test]
    fn test_week_type_default() {
        let default_week_type = WeekType::default();
        assert_eq!(default_week_type, WeekType::Every);
    }

    #[test]
    fn test_week_type_equality() {
        let every1 = WeekType::Every;
        let every2 = WeekType::Every;
        let odd = WeekType::Odd;

        assert_eq!(every1, every2);
        assert_ne!(every1, odd);
    }

    #[test]
    fn test_week_type_clone() {
        let original = WeekType::Odd;
        let cloned = original.clone();
        assert_eq!(original, cloned);
    }

    #[test]
    fn test_week_type_debug() {
        let every = WeekType::Every;
        let debug_str = format!("{:?}", every);
        assert!(debug_str.contains("Every"));
    }

    #[test]
    fn test_week_type_serialization() {
        // 测试每周
        let every = WeekType::Every;
        let json = serde_json::to_string(&every).unwrap();
        assert_eq!(json, "\"Every\"");
        let deserialized: WeekType = serde_json::from_str(&json).unwrap();
        assert_eq!(deserialized, WeekType::Every);

        // 测试单周
        let odd = WeekType::Odd;
        let json = serde_json::to_string(&odd).unwrap();
        assert_eq!(json, "\"Odd\"");
        let deserialized: WeekType = serde_json::from_str(&json).unwrap();
        assert_eq!(deserialized, WeekType::Odd);

        // 测试双周
        let even = WeekType::Even;
        let json = serde_json::to_string(&even).unwrap();
        assert_eq!(json, "\"Even\"");
        let deserialized: WeekType = serde_json::from_str(&json).unwrap();
        assert_eq!(deserialized, WeekType::Even);
    }

    // ============================================================================
    // ClassCurriculum 测试
    // ============================================================================

    #[test]
    fn test_class_curriculum_new() {
        let curriculum = ClassCurriculum::new(1, 101, "math".to_string(), 1001, 5);

        assert_eq!(curriculum.id, 1);
        assert_eq!(curriculum.class_id, 101);
        assert_eq!(curriculum.subject_id, "math");
        assert_eq!(curriculum.teacher_id, 1001);
        assert_eq!(curriculum.target_sessions, 5);
        assert!(!curriculum.is_combined_class);
        assert!(curriculum.combined_class_ids.is_empty());
        assert_eq!(curriculum.week_type, WeekType::Every);
    }

    #[test]
    fn test_class_curriculum_creation() {
        // 测试直接创建
        let curriculum = ClassCurriculum {
            id: 100,
            class_id: 201,
            subject_id: "physics".to_string(),
            teacher_id: 2001,
            target_sessions: 4,
            is_combined_class: true,
            combined_class_ids: vec![202, 203],
            week_type: WeekType::Odd,
        };

        assert_eq!(curriculum.id, 100);
        assert_eq!(curriculum.class_id, 201);
        assert_eq!(curriculum.subject_id, "physics");
        assert_eq!(curriculum.teacher_id, 2001);
        assert_eq!(curriculum.target_sessions, 4);
        assert!(curriculum.is_combined_class);
        assert_eq!(curriculum.combined_class_ids, vec![202, 203]);
        assert_eq!(curriculum.week_type, WeekType::Odd);
    }

    #[test]
    fn test_class_curriculum_is_combined() {
        let mut curriculum = ClassCurriculum::new(1, 101, "math".to_string(), 1001, 5);

        // 初始状态不是合班课
        assert!(!curriculum.is_combined());

        // 添加合班班级后变成合班课
        curriculum.add_combined_class(102);
        assert!(curriculum.is_combined());

        // 移除所有合班班级后不再是合班课
        curriculum.remove_combined_class(102);
        assert!(!curriculum.is_combined());
    }

    #[test]
    fn test_class_curriculum_add_combined_class() {
        let mut curriculum = ClassCurriculum::new(1, 101, "math".to_string(), 1001, 5);

        // 添加第一个合班班级
        curriculum.add_combined_class(102);
        assert!(curriculum.is_combined_class);
        assert_eq!(curriculum.combined_class_ids.len(), 1);
        assert!(curriculum.combined_class_ids.contains(&102));

        // 添加第二个合班班级
        curriculum.add_combined_class(103);
        assert_eq!(curriculum.combined_class_ids.len(), 2);
        assert!(curriculum.combined_class_ids.contains(&103));

        // 重复添加同一个班级不会增加
        curriculum.add_combined_class(102);
        assert_eq!(curriculum.combined_class_ids.len(), 2);
    }

    #[test]
    fn test_class_curriculum_remove_combined_class() {
        let mut curriculum = ClassCurriculum::new(1, 101, "math".to_string(), 1001, 5);

        // 添加多个合班班级
        curriculum.add_combined_class(102);
        curriculum.add_combined_class(103);
        curriculum.add_combined_class(104);
        assert_eq!(curriculum.combined_class_ids.len(), 3);

        // 移除一个班级
        assert!(curriculum.remove_combined_class(102));
        assert_eq!(curriculum.combined_class_ids.len(), 2);
        assert!(!curriculum.combined_class_ids.contains(&102));
        assert!(curriculum.is_combined_class);

        // 移除不存在的班级
        assert!(!curriculum.remove_combined_class(999));
        assert_eq!(curriculum.combined_class_ids.len(), 2);

        // 移除剩余的班级
        assert!(curriculum.remove_combined_class(103));
        assert!(curriculum.remove_combined_class(104));
        assert_eq!(curriculum.combined_class_ids.len(), 0);
        assert!(!curriculum.is_combined_class);
    }

    #[test]
    fn test_class_curriculum_week_type() {
        // 测试每周
        let mut curriculum = ClassCurriculum::new(1, 101, "math".to_string(), 1001, 5);
        assert_eq!(curriculum.week_type, WeekType::Every);

        // 测试单周
        curriculum.week_type = WeekType::Odd;
        assert_eq!(curriculum.week_type, WeekType::Odd);

        // 测试双周
        curriculum.week_type = WeekType::Even;
        assert_eq!(curriculum.week_type, WeekType::Even);
    }

    #[test]
    fn test_class_curriculum_serialization() {
        let curriculum = ClassCurriculum {
            id: 1,
            class_id: 101,
            subject_id: "chemistry".to_string(),
            teacher_id: 1001,
            target_sessions: 3,
            is_combined_class: true,
            combined_class_ids: vec![102, 103],
            week_type: WeekType::Odd,
        };

        // 序列化
        let json = serde_json::to_string(&curriculum).unwrap();
        assert!(json.contains("chemistry"));
        assert!(json.contains("\"id\":1"));
        assert!(json.contains("\"class_id\":101"));
        assert!(json.contains("\"teacher_id\":1001"));
        assert!(json.contains("\"target_sessions\":3"));

        // 反序列化
        let deserialized: ClassCurriculum = serde_json::from_str(&json).unwrap();
        assert_eq!(deserialized.id, curriculum.id);
        assert_eq!(deserialized.class_id, curriculum.class_id);
        assert_eq!(deserialized.subject_id, curriculum.subject_id);
        assert_eq!(deserialized.teacher_id, curriculum.teacher_id);
        assert_eq!(deserialized.target_sessions, curriculum.target_sessions);
        assert_eq!(deserialized.is_combined_class, curriculum.is_combined_class);
        assert_eq!(
            deserialized.combined_class_ids,
            curriculum.combined_class_ids
        );
        assert_eq!(deserialized.week_type, curriculum.week_type);
    }

    #[test]
    fn test_class_curriculum_clone() {
        let curriculum = ClassCurriculum {
            id: 1,
            class_id: 101,
            subject_id: "english".to_string(),
            teacher_id: 1001,
            target_sessions: 5,
            is_combined_class: true,
            combined_class_ids: vec![102],
            week_type: WeekType::Even,
        };

        let cloned = curriculum.clone();
        assert_eq!(cloned.id, curriculum.id);
        assert_eq!(cloned.class_id, curriculum.class_id);
        assert_eq!(cloned.subject_id, curriculum.subject_id);
        assert_eq!(cloned.teacher_id, curriculum.teacher_id);
        assert_eq!(cloned.target_sessions, curriculum.target_sessions);
        assert_eq!(cloned.is_combined_class, curriculum.is_combined_class);
        assert_eq!(cloned.combined_class_ids, curriculum.combined_class_ids);
        assert_eq!(cloned.week_type, curriculum.week_type);
    }

    #[test]
    fn test_class_curriculum_debug() {
        let curriculum = ClassCurriculum::new(1, 101, "history".to_string(), 1001, 4);
        let debug_str = format!("{:?}", curriculum);
        assert!(debug_str.contains("id"));
        assert!(debug_str.contains("class_id"));
        assert!(debug_str.contains("subject_id"));
        assert!(debug_str.contains("teacher_id"));
        assert!(debug_str.contains("target_sessions"));
        assert!(debug_str.contains("history"));
    }

    #[test]
    fn test_class_curriculum_combined_class_scenario() {
        // 测试真实场景：体育课合班
        let mut curriculum = ClassCurriculum::new(1, 101, "pe".to_string(), 1001, 2);

        // 添加合班班级
        curriculum.add_combined_class(102);
        curriculum.add_combined_class(103);
        curriculum.add_combined_class(104);

        // 验证合班状态
        assert!(curriculum.is_combined());
        assert_eq!(curriculum.combined_class_ids.len(), 3);

        // 验证所有合班班级
        assert!(curriculum.combined_class_ids.contains(&102));
        assert!(curriculum.combined_class_ids.contains(&103));
        assert!(curriculum.combined_class_ids.contains(&104));
    }

    #[test]
    fn test_class_curriculum_single_double_week() {
        // 测试单双周场景
        let mut curriculum1 = ClassCurriculum::new(1, 101, "biology".to_string(), 1001, 2);
        curriculum1.week_type = WeekType::Odd;

        let mut curriculum2 = ClassCurriculum::new(2, 101, "geography".to_string(), 1002, 2);
        curriculum2.week_type = WeekType::Even;

        // 验证单双周设置
        assert_eq!(curriculum1.week_type, WeekType::Odd);
        assert_eq!(curriculum2.week_type, WeekType::Even);
        assert_ne!(curriculum1.week_type, curriculum2.week_type);
    }

    #[test]
    fn test_class_curriculum_target_sessions() {
        // 测试不同课时数
        let curriculum1 = ClassCurriculum::new(1, 101, "math".to_string(), 1001, 5);
        let curriculum2 = ClassCurriculum::new(2, 101, "art".to_string(), 1002, 2);
        let curriculum3 = ClassCurriculum::new(3, 101, "chinese".to_string(), 1003, 6);

        assert_eq!(curriculum1.target_sessions, 5);
        assert_eq!(curriculum2.target_sessions, 2);
        assert_eq!(curriculum3.target_sessions, 6);
    }

    #[test]
    fn test_class_curriculum_field_access() {
        let mut curriculum = ClassCurriculum::new(1, 101, "music".to_string(), 1001, 2);

        // 测试字段访问
        assert_eq!(curriculum.id, 1);
        assert_eq!(curriculum.class_id, 101);
        assert_eq!(curriculum.subject_id, "music");
        assert_eq!(curriculum.teacher_id, 1001);
        assert_eq!(curriculum.target_sessions, 2);

        // 测试字段修改
        curriculum.id = 999;
        assert_eq!(curriculum.id, 999);

        curriculum.class_id = 999;
        assert_eq!(curriculum.class_id, 999);

        curriculum.subject_id = "art".to_string();
        assert_eq!(curriculum.subject_id, "art");

        curriculum.teacher_id = 9999;
        assert_eq!(curriculum.teacher_id, 9999);

        curriculum.target_sessions = 10;
        assert_eq!(curriculum.target_sessions, 10);
    }

    // ============================================================================
    // Venue 测试
    // ============================================================================

    #[test]
    fn test_venue_new() {
        let venue = Venue::new("computer_lab".to_string(), "微机室".to_string(), 1);

        assert_eq!(venue.id, "computer_lab");
        assert_eq!(venue.name, "微机室");
        assert_eq!(venue.capacity, 1);
    }

    #[test]
    fn test_venue_creation() {
        // 测试直接创建
        let venue = Venue {
            id: "gym".to_string(),
            name: "体育馆".to_string(),
            capacity: 4,
        };

        assert_eq!(venue.id, "gym");
        assert_eq!(venue.name, "体育馆");
        assert_eq!(venue.capacity, 4);
    }

    #[test]
    fn test_venue_can_accommodate() {
        let venue = Venue::new("lab".to_string(), "实验室".to_string(), 2);

        // 测试容量检查
        assert!(venue.can_accommodate(0));
        assert!(venue.can_accommodate(1));
        assert!(!venue.can_accommodate(2));
        assert!(!venue.can_accommodate(3));
        assert!(!venue.can_accommodate(10));
    }

    #[test]
    fn test_venue_single_capacity() {
        // 测试容量为1的场地（如微机室）
        let venue = Venue::new("computer_lab".to_string(), "微机室".to_string(), 1);

        assert!(venue.can_accommodate(0));
        assert!(!venue.can_accommodate(1));
        assert!(!venue.can_accommodate(2));
    }

    #[test]
    fn test_venue_multiple_capacity() {
        // 测试容量为多个的场地（如操场）
        let venue = Venue::new("playground".to_string(), "操场".to_string(), 6);

        assert!(venue.can_accommodate(0));
        assert!(venue.can_accommodate(1));
        assert!(venue.can_accommodate(2));
        assert!(venue.can_accommodate(3));
        assert!(venue.can_accommodate(4));
        assert!(venue.can_accommodate(5));
        assert!(!venue.can_accommodate(6));
        assert!(!venue.can_accommodate(7));
    }

    #[test]
    fn test_venue_serialization() {
        let venue = Venue {
            id: "music_room".to_string(),
            name: "音乐室".to_string(),
            capacity: 2,
        };

        // 序列化
        let json = serde_json::to_string(&venue).unwrap();
        assert!(json.contains("music_room"));
        assert!(json.contains("音乐室"));
        assert!(json.contains("\"capacity\":2"));

        // 反序列化
        let deserialized: Venue = serde_json::from_str(&json).unwrap();
        assert_eq!(deserialized.id, venue.id);
        assert_eq!(deserialized.name, venue.name);
        assert_eq!(deserialized.capacity, venue.capacity);
    }

    #[test]
    fn test_venue_clone() {
        let venue = Venue {
            id: "art_room".to_string(),
            name: "美术室".to_string(),
            capacity: 3,
        };

        let cloned = venue.clone();
        assert_eq!(cloned.id, venue.id);
        assert_eq!(cloned.name, venue.name);
        assert_eq!(cloned.capacity, venue.capacity);
    }

    #[test]
    fn test_venue_debug() {
        let venue = Venue::new("language_lab".to_string(), "语音室".to_string(), 2);

        let debug_str = format!("{:?}", venue);
        assert!(debug_str.contains("language_lab"));
        assert!(debug_str.contains("语音室"));
        assert!(debug_str.contains("capacity"));
    }

    #[test]
    fn test_venue_field_access() {
        let mut venue = Venue::new("library".to_string(), "图书馆".to_string(), 10);

        // 测试字段访问
        assert_eq!(venue.id, "library");
        assert_eq!(venue.name, "图书馆");
        assert_eq!(venue.capacity, 10);

        // 测试字段修改
        venue.id = "new_library".to_string();
        assert_eq!(venue.id, "new_library");

        venue.name = "新图书馆".to_string();
        assert_eq!(venue.name, "新图书馆");

        venue.capacity = 20;
        assert_eq!(venue.capacity, 20);
    }

    #[test]
    fn test_venue_realistic_scenarios() {
        // 测试真实场景：微机室（容量1）
        let computer_lab = Venue::new("computer_lab_1".to_string(), "微机室1".to_string(), 1);
        assert_eq!(computer_lab.capacity, 1);
        assert!(computer_lab.can_accommodate(0));
        assert!(!computer_lab.can_accommodate(1));

        // 测试真实场景：操场（容量6）
        let playground = Venue::new("main_playground".to_string(), "主操场".to_string(), 6);
        assert_eq!(playground.capacity, 6);
        assert!(playground.can_accommodate(5));
        assert!(!playground.can_accommodate(6));

        // 测试真实场景：实验室（容量2）
        let lab = Venue::new("physics_lab".to_string(), "物理实验室".to_string(), 2);
        assert_eq!(lab.capacity, 2);
        assert!(lab.can_accommodate(1));
        assert!(!lab.can_accommodate(2));
    }

    #[test]
    fn test_venue_boundary_conditions() {
        // 测试边界条件
        let venue = Venue::new("test_venue".to_string(), "测试场地".to_string(), 5);

        // 边界值测试
        assert!(venue.can_accommodate(0)); // 最小值
        assert!(venue.can_accommodate(4)); // 容量-1
        assert!(!venue.can_accommodate(5)); // 等于容量
        assert!(!venue.can_accommodate(u8::MAX)); // 最大值
    }

    #[test]
    fn test_venue_zero_capacity() {
        // 测试容量为0的场地（边界情况）
        let venue = Venue::new("closed_venue".to_string(), "关闭场地".to_string(), 0);

        assert_eq!(venue.capacity, 0);
        assert!(!venue.can_accommodate(0));
        assert!(!venue.can_accommodate(1));
    }

    #[test]
    fn test_venue_max_capacity() {
        // 测试最大容量
        let venue = Venue::new("large_venue".to_string(), "大型场地".to_string(), u8::MAX);

        assert_eq!(venue.capacity, u8::MAX);
        assert!(venue.can_accommodate(0));
        assert!(venue.can_accommodate(u8::MAX - 1));
        assert!(!venue.can_accommodate(u8::MAX));
    }

    #[test]
    fn test_venue_usage_tracking() {
        // 测试场地使用情况跟踪
        let venue = Venue::new("multi_purpose_room".to_string(), "多功能室".to_string(), 3);

        // 模拟逐步增加使用量
        let mut current_usage = 0u8;

        assert!(venue.can_accommodate(current_usage));
        current_usage += 1;

        assert!(venue.can_accommodate(current_usage));
        current_usage += 1;

        assert!(venue.can_accommodate(current_usage));
        current_usage += 1;

        assert!(!venue.can_accommodate(current_usage));
    }
}

// ============================================================================
// 固定课程数据结构
// ============================================================================

/// 固定课程
///
/// 定义固定在特定时间槽位的课程，包括预排课程和固定课程
///
/// # 字段
/// - `class_id`: 班级ID
/// - `subject_id`: 科目ID
/// - `teacher_id`: 教师ID
/// - `time_slot`: 固定的时间槽位
/// - `is_pre_arranged`: 是否为预排课程
///
/// # 示例
/// ```rust
/// use course_scheduling_system::algorithm::{FixedCourse, TimeSlot};
///
/// let time_slot = TimeSlot { day: 0, period: 0 };
/// let fixed_course = FixedCourse::new(
///     101,
///     "class_meeting".to_string(),
///     1001,
///     time_slot,
/// );
/// assert_eq!(fixed_course.class_id, 101);
/// assert_eq!(fixed_course.subject_id, "class_meeting");
/// assert_eq!(fixed_course.teacher_id, 1001);
/// assert_eq!(fixed_course.time_slot, time_slot);
/// assert!(!fixed_course.is_pre_arranged);
/// ```
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FixedCourse {
    /// 班级ID
    pub class_id: u32,
    /// 科目ID
    pub subject_id: String,
    /// 教师ID
    pub teacher_id: u32,
    /// 固定的时间槽位
    pub time_slot: TimeSlot,
    /// 是否为预排课程
    pub is_pre_arranged: bool,
}

impl FixedCourse {
    /// 创建新的固定课程
    ///
    /// # 参数
    /// - `class_id`: 班级ID
    /// - `subject_id`: 科目ID
    /// - `teacher_id`: 教师ID
    /// - `time_slot`: 固定的时间槽位
    ///
    /// # 返回
    /// 固定课程实例，默认不是预排课程
    ///
    /// # 示例
    /// ```rust
    /// use course_scheduling_system::algorithm::{FixedCourse, TimeSlot};
    ///
    /// let time_slot = TimeSlot { day: 4, period: 7 };
    /// let fixed_course = FixedCourse::new(
    ///     101,
    ///     "class_meeting".to_string(),
    ///     1001,
    ///     time_slot,
    /// );
    /// assert_eq!(fixed_course.class_id, 101);
    /// assert_eq!(fixed_course.subject_id, "class_meeting");
    /// assert_eq!(fixed_course.teacher_id, 1001);
    /// assert_eq!(fixed_course.time_slot.day, 4);
    /// assert_eq!(fixed_course.time_slot.period, 7);
    /// assert!(!fixed_course.is_pre_arranged);
    /// ```
    pub fn new(class_id: u32, subject_id: String, teacher_id: u32, time_slot: TimeSlot) -> Self {
        debug!(
            "创建固定课程: class_id={}, subject_id={}, teacher_id={}, time_slot=({}, {})",
            class_id, subject_id, teacher_id, time_slot.day, time_slot.period
        );
        Self {
            class_id,
            subject_id,
            teacher_id,
            time_slot,
            is_pre_arranged: false,
        }
    }

    /// 检查是否为预排课程
    ///
    /// # 返回
    /// 如果是预排课程返回 `true`，否则返回 `false`
    ///
    /// # 示例
    /// ```rust
    /// use course_scheduling_system::algorithm::{FixedCourse, TimeSlot};
    ///
    /// let time_slot = TimeSlot { day: 0, period: 0 };
    /// let mut fixed_course = FixedCourse::new(
    ///     101,
    ///     "math".to_string(),
    ///     1001,
    ///     time_slot,
    /// );
    /// assert!(!fixed_course.is_pre_arranged());
    ///
    /// fixed_course.is_pre_arranged = true;
    /// assert!(fixed_course.is_pre_arranged());
    /// ```
    pub fn is_pre_arranged(&self) -> bool {
        self.is_pre_arranged
    }

    /// 设置为预排课程
    ///
    /// # 示例
    /// ```rust
    /// use course_scheduling_system::algorithm::{FixedCourse, TimeSlot};
    ///
    /// let time_slot = TimeSlot { day: 0, period: 0 };
    /// let mut fixed_course = FixedCourse::new(
    ///     101,
    ///     "math".to_string(),
    ///     1001,
    ///     time_slot,
    /// );
    /// assert!(!fixed_course.is_pre_arranged());
    ///
    /// fixed_course.set_pre_arranged(true);
    /// assert!(fixed_course.is_pre_arranged());
    /// ```
    pub fn set_pre_arranged(&mut self, is_pre_arranged: bool) {
        self.is_pre_arranged = is_pre_arranged;
        debug!(
            "设置预排课程标记: class_id={}, subject_id={}, is_pre_arranged={}",
            self.class_id, self.subject_id, is_pre_arranged
        );
    }
}

// ============================================================================
// 单元测试
// ============================================================================

#[cfg(test)]
mod fixed_course_tests {
    use super::*;

    #[test]
    fn test_fixed_course_new() {
        let time_slot = TimeSlot { day: 0, period: 0 };
        let fixed_course = FixedCourse::new(101, "class_meeting".to_string(), 1001, time_slot);

        assert_eq!(fixed_course.class_id, 101);
        assert_eq!(fixed_course.subject_id, "class_meeting");
        assert_eq!(fixed_course.teacher_id, 1001);
        assert_eq!(fixed_course.time_slot, time_slot);
        assert!(!fixed_course.is_pre_arranged);
    }

    #[test]
    fn test_fixed_course_creation() {
        // 测试直接创建
        let time_slot = TimeSlot { day: 4, period: 7 };
        let fixed_course = FixedCourse {
            class_id: 201,
            subject_id: "labor".to_string(),
            teacher_id: 2001,
            time_slot,
            is_pre_arranged: true,
        };

        assert_eq!(fixed_course.class_id, 201);
        assert_eq!(fixed_course.subject_id, "labor");
        assert_eq!(fixed_course.teacher_id, 2001);
        assert_eq!(fixed_course.time_slot.day, 4);
        assert_eq!(fixed_course.time_slot.period, 7);
        assert!(fixed_course.is_pre_arranged);
    }

    #[test]
    fn test_fixed_course_is_pre_arranged() {
        let time_slot = TimeSlot { day: 0, period: 0 };
        let mut fixed_course = FixedCourse::new(101, "math".to_string(), 1001, time_slot);

        // 初始状态不是预排课程
        assert!(!fixed_course.is_pre_arranged());

        // 设置为预排课程
        fixed_course.is_pre_arranged = true;
        assert!(fixed_course.is_pre_arranged());

        // 取消预排课程标记
        fixed_course.is_pre_arranged = false;
        assert!(!fixed_course.is_pre_arranged());
    }

    #[test]
    fn test_fixed_course_set_pre_arranged() {
        let time_slot = TimeSlot { day: 0, period: 0 };
        let mut fixed_course = FixedCourse::new(101, "math".to_string(), 1001, time_slot);

        // 初始状态
        assert!(!fixed_course.is_pre_arranged());

        // 设置为预排课程
        fixed_course.set_pre_arranged(true);
        assert!(fixed_course.is_pre_arranged());

        // 取消预排课程标记
        fixed_course.set_pre_arranged(false);
        assert!(!fixed_course.is_pre_arranged());
    }

    #[test]
    fn test_fixed_course_time_slot() {
        // 测试不同的时间槽位
        let time_slot1 = TimeSlot { day: 0, period: 0 };
        let fixed_course1 = FixedCourse::new(101, "class_meeting".to_string(), 1001, time_slot1);
        assert_eq!(fixed_course1.time_slot.day, 0);
        assert_eq!(fixed_course1.time_slot.period, 0);

        let time_slot2 = TimeSlot { day: 4, period: 7 };
        let fixed_course2 = FixedCourse::new(102, "labor".to_string(), 1002, time_slot2);
        assert_eq!(fixed_course2.time_slot.day, 4);
        assert_eq!(fixed_course2.time_slot.period, 7);

        let time_slot3 = TimeSlot { day: 2, period: 3 };
        let fixed_course3 = FixedCourse::new(103, "self_study".to_string(), 1003, time_slot3);
        assert_eq!(fixed_course3.time_slot.day, 2);
        assert_eq!(fixed_course3.time_slot.period, 3);
    }

    #[test]
    fn test_fixed_course_serialization() {
        let time_slot = TimeSlot { day: 1, period: 2 };
        let fixed_course = FixedCourse {
            class_id: 101,
            subject_id: "class_meeting".to_string(),
            teacher_id: 1001,
            time_slot,
            is_pre_arranged: true,
        };

        // 序列化
        let json = serde_json::to_string(&fixed_course).unwrap();
        assert!(json.contains("\"class_id\":101"));
        assert!(json.contains("class_meeting"));
        assert!(json.contains("\"teacher_id\":1001"));
        assert!(json.contains("\"is_pre_arranged\":true"));

        // 反序列化
        let deserialized: FixedCourse = serde_json::from_str(&json).unwrap();
        assert_eq!(deserialized.class_id, fixed_course.class_id);
        assert_eq!(deserialized.subject_id, fixed_course.subject_id);
        assert_eq!(deserialized.teacher_id, fixed_course.teacher_id);
        assert_eq!(deserialized.time_slot, fixed_course.time_slot);
        assert_eq!(deserialized.is_pre_arranged, fixed_course.is_pre_arranged);
    }

    #[test]
    fn test_fixed_course_clone() {
        let time_slot = TimeSlot { day: 3, period: 5 };
        let fixed_course = FixedCourse {
            class_id: 101,
            subject_id: "self_study".to_string(),
            teacher_id: 1001,
            time_slot,
            is_pre_arranged: false,
        };

        let cloned = fixed_course.clone();
        assert_eq!(cloned.class_id, fixed_course.class_id);
        assert_eq!(cloned.subject_id, fixed_course.subject_id);
        assert_eq!(cloned.teacher_id, fixed_course.teacher_id);
        assert_eq!(cloned.time_slot, fixed_course.time_slot);
        assert_eq!(cloned.is_pre_arranged, fixed_course.is_pre_arranged);
    }

    #[test]
    fn test_fixed_course_debug() {
        let time_slot = TimeSlot { day: 0, period: 0 };
        let fixed_course = FixedCourse::new(101, "class_meeting".to_string(), 1001, time_slot);

        let debug_str = format!("{:?}", fixed_course);
        assert!(debug_str.contains("class_id"));
        assert!(debug_str.contains("subject_id"));
        assert!(debug_str.contains("teacher_id"));
        assert!(debug_str.contains("time_slot"));
        assert!(debug_str.contains("is_pre_arranged"));
        assert!(debug_str.contains("class_meeting"));
    }

    #[test]
    fn test_fixed_course_field_access() {
        let time_slot = TimeSlot { day: 1, period: 2 };
        let mut fixed_course = FixedCourse::new(101, "class_meeting".to_string(), 1001, time_slot);

        // 测试字段访问
        assert_eq!(fixed_course.class_id, 101);
        assert_eq!(fixed_course.subject_id, "class_meeting");
        assert_eq!(fixed_course.teacher_id, 1001);
        assert_eq!(fixed_course.time_slot.day, 1);
        assert_eq!(fixed_course.time_slot.period, 2);
        assert!(!fixed_course.is_pre_arranged);

        // 测试字段修改
        fixed_course.class_id = 999;
        assert_eq!(fixed_course.class_id, 999);

        fixed_course.subject_id = "labor".to_string();
        assert_eq!(fixed_course.subject_id, "labor");

        fixed_course.teacher_id = 9999;
        assert_eq!(fixed_course.teacher_id, 9999);

        fixed_course.time_slot = TimeSlot { day: 4, period: 7 };
        assert_eq!(fixed_course.time_slot.day, 4);
        assert_eq!(fixed_course.time_slot.period, 7);

        fixed_course.is_pre_arranged = true;
        assert!(fixed_course.is_pre_arranged);
    }

    #[test]
    fn test_fixed_course_class_meeting_scenario() {
        // 测试真实场景：班会课固定在周五最后一节
        let time_slot = TimeSlot { day: 4, period: 7 };
        let fixed_course = FixedCourse::new(101, "class_meeting".to_string(), 1001, time_slot);

        assert_eq!(fixed_course.class_id, 101);
        assert_eq!(fixed_course.subject_id, "class_meeting");
        assert_eq!(fixed_course.time_slot.day, 4); // 周五
        assert_eq!(fixed_course.time_slot.period, 7); // 最后一节
        assert!(!fixed_course.is_pre_arranged);
    }

    #[test]
    fn test_fixed_course_labor_scenario() {
        // 测试真实场景：劳动课固定在周三下午
        let time_slot = TimeSlot { day: 2, period: 6 };
        let fixed_course = FixedCourse::new(102, "labor".to_string(), 1002, time_slot);

        assert_eq!(fixed_course.class_id, 102);
        assert_eq!(fixed_course.subject_id, "labor");
        assert_eq!(fixed_course.time_slot.day, 2); // 周三
        assert_eq!(fixed_course.time_slot.period, 6); // 下午
        assert!(!fixed_course.is_pre_arranged);
    }

    #[test]
    fn test_fixed_course_pre_arranged_scenario() {
        // 测试真实场景：手动预排的数学课
        let time_slot = TimeSlot { day: 1, period: 2 };
        let mut fixed_course = FixedCourse::new(101, "math".to_string(), 1001, time_slot);

        // 设置为预排课程
        fixed_course.set_pre_arranged(true);

        assert_eq!(fixed_course.class_id, 101);
        assert_eq!(fixed_course.subject_id, "math");
        assert_eq!(fixed_course.time_slot.day, 1); // 周二
        assert_eq!(fixed_course.time_slot.period, 2); // 第3节
        assert!(fixed_course.is_pre_arranged);
    }

    #[test]
    fn test_fixed_course_multiple_classes() {
        // 测试多个班级的固定课程
        let time_slot1 = TimeSlot { day: 4, period: 7 };
        let fixed_course1 = FixedCourse::new(101, "class_meeting".to_string(), 1001, time_slot1);

        let time_slot2 = TimeSlot { day: 4, period: 7 };
        let fixed_course2 = FixedCourse::new(102, "class_meeting".to_string(), 1002, time_slot2);

        let time_slot3 = TimeSlot { day: 4, period: 7 };
        let fixed_course3 = FixedCourse::new(103, "class_meeting".to_string(), 1003, time_slot3);

        // 验证所有班级的班会课都在同一时间
        assert_eq!(fixed_course1.time_slot, fixed_course2.time_slot);
        assert_eq!(fixed_course2.time_slot, fixed_course3.time_slot);
        assert_eq!(fixed_course1.subject_id, fixed_course2.subject_id);
        assert_eq!(fixed_course2.subject_id, fixed_course3.subject_id);
    }

    #[test]
    fn test_fixed_course_equality() {
        let time_slot = TimeSlot { day: 0, period: 0 };
        let fixed_course1 = FixedCourse::new(101, "class_meeting".to_string(), 1001, time_slot);

        let fixed_course2 = FixedCourse::new(101, "class_meeting".to_string(), 1001, time_slot);

        // 验证克隆的相等性
        let cloned = fixed_course1.clone();
        assert_eq!(cloned.class_id, fixed_course1.class_id);
        assert_eq!(cloned.subject_id, fixed_course1.subject_id);
        assert_eq!(cloned.teacher_id, fixed_course1.teacher_id);
        assert_eq!(cloned.time_slot, fixed_course1.time_slot);
        assert_eq!(cloned.is_pre_arranged, fixed_course1.is_pre_arranged);

        // 验证独立创建的相等性
        assert_eq!(fixed_course1.class_id, fixed_course2.class_id);
        assert_eq!(fixed_course1.subject_id, fixed_course2.subject_id);
        assert_eq!(fixed_course1.teacher_id, fixed_course2.teacher_id);
        assert_eq!(fixed_course1.time_slot, fixed_course2.time_slot);
        assert_eq!(fixed_course1.is_pre_arranged, fixed_course2.is_pre_arranged);
    }

    #[test]
    fn test_fixed_course_different_time_slots() {
        // 测试不同时间槽位的固定课程
        let slots = vec![
            TimeSlot { day: 0, period: 0 },
            TimeSlot { day: 1, period: 3 },
            TimeSlot { day: 2, period: 5 },
            TimeSlot { day: 3, period: 2 },
            TimeSlot { day: 4, period: 7 },
        ];

        for (i, slot) in slots.iter().enumerate() {
            let fixed_course = FixedCourse::new(
                (101 + i) as u32,
                format!("subject_{}", i),
                (1001 + i) as u32,
                *slot,
            );

            assert_eq!(fixed_course.class_id, (101 + i) as u32);
            assert_eq!(fixed_course.subject_id, format!("subject_{}", i));
            assert_eq!(fixed_course.teacher_id, (1001 + i) as u32);
            assert_eq!(fixed_course.time_slot, *slot);
            assert!(!fixed_course.is_pre_arranged);
        }
    }

    // ============================================================================
    // ExclusionScope 测试
    // ============================================================================

    #[test]
    fn test_exclusion_scope_all_time() {
        // 测试全时段互斥
        let scope = ExclusionScope::AllTime;

        // 验证任何时段都互斥
        let slot1 = TimeSlot { day: 0, period: 0 };
        assert!(scope.is_excluded_at(&slot1, 8));

        let slot2 = TimeSlot { day: 2, period: 5 };
        assert!(scope.is_excluded_at(&slot2, 8));

        let slot3 = TimeSlot { day: 4, period: 7 };
        assert!(scope.is_excluded_at(&slot3, 8));
    }

    #[test]
    fn test_exclusion_scope_specific_slots() {
        // 测试特定时段互斥（前3节）
        let scope = ExclusionScope::SpecificSlots(0b111);

        // 验证前3节互斥
        let slot1 = TimeSlot { day: 0, period: 0 };
        assert!(scope.is_excluded_at(&slot1, 8));

        let slot2 = TimeSlot { day: 0, period: 1 };
        assert!(scope.is_excluded_at(&slot2, 8));

        let slot3 = TimeSlot { day: 0, period: 2 };
        assert!(scope.is_excluded_at(&slot3, 8));

        // 验证其他时段不互斥
        let slot4 = TimeSlot { day: 0, period: 3 };
        assert!(!scope.is_excluded_at(&slot4, 8));

        let slot5 = TimeSlot { day: 1, period: 0 };
        assert!(!scope.is_excluded_at(&slot5, 8));
    }

    #[test]
    fn test_exclusion_scope_specific_multiple_slots() {
        // 测试多个特定时段互斥
        let mut mask = 0u64;
        mask = set_slot(mask, &TimeSlot { day: 0, period: 0 }, 8);
        mask = set_slot(mask, &TimeSlot { day: 1, period: 2 }, 8);
        mask = set_slot(mask, &TimeSlot { day: 2, period: 4 }, 8);

        let scope = ExclusionScope::SpecificSlots(mask);

        // 验证设置的时段互斥
        assert!(scope.is_excluded_at(&TimeSlot { day: 0, period: 0 }, 8));
        assert!(scope.is_excluded_at(&TimeSlot { day: 1, period: 2 }, 8));
        assert!(scope.is_excluded_at(&TimeSlot { day: 2, period: 4 }, 8));

        // 验证其他时段不互斥
        assert!(!scope.is_excluded_at(&TimeSlot { day: 0, period: 1 }, 8));
        assert!(!scope.is_excluded_at(&TimeSlot { day: 1, period: 3 }, 8));
        assert!(!scope.is_excluded_at(&TimeSlot { day: 3, period: 0 }, 8));
    }

    #[test]
    fn test_exclusion_scope_serialization() {
        // 测试全时段互斥序列化
        let all_time = ExclusionScope::AllTime;
        let json = serde_json::to_string(&all_time).unwrap();
        assert!(json.contains("AllTime"));
        let deserialized: ExclusionScope = serde_json::from_str(&json).unwrap();
        match deserialized {
            ExclusionScope::AllTime => (),
            _ => panic!("反序列化失败"),
        }

        // 测试特定时段互斥序列化
        let specific = ExclusionScope::SpecificSlots(0b111);
        let json = serde_json::to_string(&specific).unwrap();
        assert!(json.contains("SpecificSlots"));
        let deserialized: ExclusionScope = serde_json::from_str(&json).unwrap();
        match deserialized {
            ExclusionScope::SpecificSlots(mask) => assert_eq!(mask, 0b111),
            _ => panic!("反序列化失败"),
        }
    }

    #[test]
    fn test_exclusion_scope_clone() {
        // 测试全时段互斥克隆
        let all_time = ExclusionScope::AllTime;
        let cloned = all_time.clone();
        match cloned {
            ExclusionScope::AllTime => (),
            _ => panic!("克隆失败"),
        }

        // 测试特定时段互斥克隆
        let specific = ExclusionScope::SpecificSlots(0b111);
        let cloned = specific.clone();
        match cloned {
            ExclusionScope::SpecificSlots(mask) => assert_eq!(mask, 0b111),
            _ => panic!("克隆失败"),
        }
    }

    #[test]
    fn test_exclusion_scope_debug() {
        // 测试全时段互斥调试输出
        let all_time = ExclusionScope::AllTime;
        let debug_str = format!("{:?}", all_time);
        assert!(debug_str.contains("AllTime"));

        // 测试特定时段互斥调试输出
        let specific = ExclusionScope::SpecificSlots(0b111);
        let debug_str = format!("{:?}", specific);
        assert!(debug_str.contains("SpecificSlots"));
    }

    // ============================================================================
    // TeacherMutualExclusion 测试
    // ============================================================================

    #[test]
    fn test_teacher_mutual_exclusion_new_all_time() {
        // 测试创建全时段互斥关系
        let exclusion = TeacherMutualExclusion::new_all_time(1, 2);

        assert_eq!(exclusion.teacher_a_id, 1);
        assert_eq!(exclusion.teacher_b_id, 2);
        match exclusion.scope {
            ExclusionScope::AllTime => (),
            _ => panic!("互斥范围应为全时段"),
        }
    }

    #[test]
    fn test_teacher_mutual_exclusion_new_specific_slots() {
        // 测试创建特定时段互斥关系
        let exclusion = TeacherMutualExclusion::new_specific_slots(1, 2, 0b111);

        assert_eq!(exclusion.teacher_a_id, 1);
        assert_eq!(exclusion.teacher_b_id, 2);
        match exclusion.scope {
            ExclusionScope::SpecificSlots(mask) => assert_eq!(mask, 0b111),
            _ => panic!("互斥范围应为特定时段"),
        }
    }

    #[test]
    fn test_teacher_mutual_exclusion_is_excluded_at_all_time() {
        // 测试全时段互斥检查
        let exclusion = TeacherMutualExclusion::new_all_time(1, 2);

        // 验证任何时段都互斥
        let slot1 = TimeSlot { day: 0, period: 0 };
        assert!(exclusion.is_excluded_at(&slot1, 8));

        let slot2 = TimeSlot { day: 2, period: 5 };
        assert!(exclusion.is_excluded_at(&slot2, 8));

        let slot3 = TimeSlot { day: 4, period: 7 };
        assert!(exclusion.is_excluded_at(&slot3, 8));
    }

    #[test]
    fn test_teacher_mutual_exclusion_is_excluded_at_specific_slots() {
        // 测试特定时段互斥检查
        let exclusion = TeacherMutualExclusion::new_specific_slots(1, 2, 0b111);

        // 验证前3节互斥
        let slot1 = TimeSlot { day: 0, period: 0 };
        assert!(exclusion.is_excluded_at(&slot1, 8));

        let slot2 = TimeSlot { day: 0, period: 1 };
        assert!(exclusion.is_excluded_at(&slot2, 8));

        let slot3 = TimeSlot { day: 0, period: 2 };
        assert!(exclusion.is_excluded_at(&slot3, 8));

        // 验证其他时段不互斥
        let slot4 = TimeSlot { day: 0, period: 3 };
        assert!(!exclusion.is_excluded_at(&slot4, 8));

        let slot5 = TimeSlot { day: 1, period: 0 };
        assert!(!exclusion.is_excluded_at(&slot5, 8));
    }

    #[test]
    fn test_teacher_mutual_exclusion_creation() {
        // 测试直接创建
        let exclusion = TeacherMutualExclusion {
            teacher_a_id: 100,
            teacher_b_id: 200,
            scope: ExclusionScope::AllTime,
        };

        assert_eq!(exclusion.teacher_a_id, 100);
        assert_eq!(exclusion.teacher_b_id, 200);
        match exclusion.scope {
            ExclusionScope::AllTime => (),
            _ => panic!("互斥范围应为全时段"),
        }
    }

    #[test]
    fn test_teacher_mutual_exclusion_serialization() {
        // 测试全时段互斥序列化
        let exclusion = TeacherMutualExclusion::new_all_time(1, 2);
        let json = serde_json::to_string(&exclusion).unwrap();
        assert!(json.contains("\"teacher_a_id\":1"));
        assert!(json.contains("\"teacher_b_id\":2"));
        assert!(json.contains("AllTime"));

        let deserialized: TeacherMutualExclusion = serde_json::from_str(&json).unwrap();
        assert_eq!(deserialized.teacher_a_id, exclusion.teacher_a_id);
        assert_eq!(deserialized.teacher_b_id, exclusion.teacher_b_id);

        // 测试特定时段互斥序列化
        let exclusion2 = TeacherMutualExclusion::new_specific_slots(3, 4, 0b111);
        let json2 = serde_json::to_string(&exclusion2).unwrap();
        assert!(json2.contains("\"teacher_a_id\":3"));
        assert!(json2.contains("\"teacher_b_id\":4"));
        assert!(json2.contains("SpecificSlots"));

        let deserialized2: TeacherMutualExclusion = serde_json::from_str(&json2).unwrap();
        assert_eq!(deserialized2.teacher_a_id, exclusion2.teacher_a_id);
        assert_eq!(deserialized2.teacher_b_id, exclusion2.teacher_b_id);
    }

    #[test]
    fn test_teacher_mutual_exclusion_clone() {
        // 测试全时段互斥克隆
        let exclusion = TeacherMutualExclusion::new_all_time(1, 2);
        let cloned = exclusion.clone();
        assert_eq!(cloned.teacher_a_id, exclusion.teacher_a_id);
        assert_eq!(cloned.teacher_b_id, exclusion.teacher_b_id);

        // 测试特定时段互斥克隆
        let exclusion2 = TeacherMutualExclusion::new_specific_slots(3, 4, 0b111);
        let cloned2 = exclusion2.clone();
        assert_eq!(cloned2.teacher_a_id, exclusion2.teacher_a_id);
        assert_eq!(cloned2.teacher_b_id, exclusion2.teacher_b_id);
    }

    #[test]
    fn test_teacher_mutual_exclusion_debug() {
        let exclusion = TeacherMutualExclusion::new_all_time(1, 2);
        let debug_str = format!("{:?}", exclusion);
        assert!(debug_str.contains("teacher_a_id"));
        assert!(debug_str.contains("teacher_b_id"));
        assert!(debug_str.contains("scope"));
        assert!(debug_str.contains("AllTime"));
    }

    #[test]
    fn test_teacher_mutual_exclusion_field_access() {
        let mut exclusion = TeacherMutualExclusion::new_all_time(1, 2);

        // 测试字段访问
        assert_eq!(exclusion.teacher_a_id, 1);
        assert_eq!(exclusion.teacher_b_id, 2);

        // 测试字段修改
        exclusion.teacher_a_id = 100;
        assert_eq!(exclusion.teacher_a_id, 100);

        exclusion.teacher_b_id = 200;
        assert_eq!(exclusion.teacher_b_id, 200);

        exclusion.scope = ExclusionScope::SpecificSlots(0b111);
        match exclusion.scope {
            ExclusionScope::SpecificSlots(mask) => assert_eq!(mask, 0b111),
            _ => panic!("互斥范围应为特定时段"),
        }
    }

    #[test]
    fn test_teacher_mutual_exclusion_realistic_scenario() {
        // 测试真实场景：两位教师全时段互斥
        let exclusion = TeacherMutualExclusion::new_all_time(1, 2);

        // 验证任何时段都互斥
        for day in 0..5 {
            for period in 0..8 {
                let slot = TimeSlot { day, period };
                assert!(exclusion.is_excluded_at(&slot, 8));
            }
        }
    }

    #[test]
    fn test_teacher_mutual_exclusion_morning_only() {
        // 测试真实场景：两位教师仅上午互斥
        let mut mask = 0u64;
        for period in 0..4 {
            mask = set_slot(mask, &TimeSlot { day: 0, period }, 8);
        }

        let exclusion = TeacherMutualExclusion::new_specific_slots(1, 2, mask);

        // 验证上午时段互斥
        for period in 0..4 {
            let slot = TimeSlot { day: 0, period };
            assert!(exclusion.is_excluded_at(&slot, 8));
        }

        // 验证下午时段不互斥
        for period in 4..8 {
            let slot = TimeSlot { day: 0, period };
            assert!(!exclusion.is_excluded_at(&slot, 8));
        }
    }

    #[test]
    fn test_teacher_mutual_exclusion_multiple_days() {
        // 测试真实场景：两位教师在多天的特定时段互斥
        let mut mask = 0u64;
        for day in 0..5 {
            mask = set_slot(mask, &TimeSlot { day, period: 0 }, 8);
            mask = set_slot(mask, &TimeSlot { day, period: 7 }, 8);
        }

        let exclusion = TeacherMutualExclusion::new_specific_slots(1, 2, mask);

        // 验证第1节和最后一节互斥
        for day in 0..5 {
            assert!(exclusion.is_excluded_at(&TimeSlot { day, period: 0 }, 8));
            assert!(exclusion.is_excluded_at(&TimeSlot { day, period: 7 }, 8));
        }

        // 验证其他时段不互斥
        for day in 0..5 {
            for period in 1..7 {
                let slot = TimeSlot { day, period };
                assert!(!exclusion.is_excluded_at(&slot, 8));
            }
        }
    }

    #[test]
    fn test_teacher_mutual_exclusion_different_teachers() {
        // 测试不同教师对的互斥关系
        let exclusion1 = TeacherMutualExclusion::new_all_time(1, 2);
        let exclusion2 = TeacherMutualExclusion::new_all_time(3, 4);
        let exclusion3 = TeacherMutualExclusion::new_all_time(5, 6);

        assert_eq!(exclusion1.teacher_a_id, 1);
        assert_eq!(exclusion1.teacher_b_id, 2);

        assert_eq!(exclusion2.teacher_a_id, 3);
        assert_eq!(exclusion2.teacher_b_id, 4);

        assert_eq!(exclusion3.teacher_a_id, 5);
        assert_eq!(exclusion3.teacher_b_id, 6);

        // 验证它们都是全时段互斥
        let slot = TimeSlot { day: 0, period: 0 };
        assert!(exclusion1.is_excluded_at(&slot, 8));
        assert!(exclusion2.is_excluded_at(&slot, 8));
        assert!(exclusion3.is_excluded_at(&slot, 8));
    }

    #[test]
    fn test_teacher_mutual_exclusion_mixed_scopes() {
        // 测试混合互斥范围
        let exclusion1 = TeacherMutualExclusion::new_all_time(1, 2);
        let exclusion2 = TeacherMutualExclusion::new_specific_slots(3, 4, 0b111);

        let slot1 = TimeSlot { day: 0, period: 0 };
        let slot2 = TimeSlot { day: 0, period: 5 };

        // 全时段互斥在任何时段都互斥
        assert!(exclusion1.is_excluded_at(&slot1, 8));
        assert!(exclusion1.is_excluded_at(&slot2, 8));

        // 特定时段互斥仅在指定时段互斥
        assert!(exclusion2.is_excluded_at(&slot1, 8));
        assert!(!exclusion2.is_excluded_at(&slot2, 8));
    }

    #[test]
    fn test_teacher_mutual_exclusion_empty_specific_slots() {
        // 测试空的特定时段互斥（边界情况）
        let exclusion = TeacherMutualExclusion::new_specific_slots(1, 2, 0);

        // 验证所有时段都不互斥
        for day in 0..5 {
            for period in 0..8 {
                let slot = TimeSlot { day, period };
                assert!(!exclusion.is_excluded_at(&slot, 8));
            }
        }
    }

    #[test]
    fn test_teacher_mutual_exclusion_full_specific_slots() {
        // 测试全部时段的特定时段互斥（等同于全时段互斥）
        let mut mask = 0u64;
        for day in 0..5 {
            for period in 0..8 {
                mask = set_slot(mask, &TimeSlot { day, period }, 8);
            }
        }

        let exclusion = TeacherMutualExclusion::new_specific_slots(1, 2, mask);

        // 验证所有时段都互斥
        for day in 0..5 {
            for period in 0..8 {
                let slot = TimeSlot { day, period };
                assert!(exclusion.is_excluded_at(&slot, 8));
            }
        }
    }

    #[test]
    fn test_teacher_mutual_exclusion_symmetry() {
        // 测试互斥关系的对称性（虽然数据结构不强制对称，但逻辑上应该对称）
        let exclusion1 = TeacherMutualExclusion::new_all_time(1, 2);
        let exclusion2 = TeacherMutualExclusion::new_all_time(2, 1);

        let slot = TimeSlot { day: 0, period: 0 };

        // 两个方向的互斥关系应该都有效
        assert!(exclusion1.is_excluded_at(&slot, 8));
        assert!(exclusion2.is_excluded_at(&slot, 8));
    }
}

// ============================================================================
// 课表条目数据结构
// ============================================================================

/// 课表条目
///
/// 表示课表中的一个具体课程安排，包含班级、科目、教师、时间槽位等信息
///
/// # 字段
/// - `class_id`: 班级ID
/// - `subject_id`: 科目ID
/// - `teacher_id`: 教师ID
/// - `time_slot`: 时间槽位
/// - `is_fixed`: 是否固定课程
/// - `week_type`: 单双周标记
///
/// # 示例
/// ```rust
/// use course_scheduling_system::algorithm::{ScheduleEntry, TimeSlot, WeekType};
///
/// let time_slot = TimeSlot { day: 0, period: 0 };
/// let entry = ScheduleEntry::new(
///     101,
///     "math".to_string(),
///     1001,
///     time_slot,
/// );
/// assert_eq!(entry.class_id, 101);
/// assert_eq!(entry.subject_id, "math");
/// assert_eq!(entry.teacher_id, 1001);
/// assert_eq!(entry.time_slot, time_slot);
/// assert!(!entry.is_fixed);
/// assert_eq!(entry.week_type, WeekType::Every);
/// ```
#[derive(Debug, Clone, PartialEq, Eq, Hash, Serialize, Deserialize)]
pub struct ScheduleEntry {
    /// 班级ID
    pub class_id: u32,
    /// 科目ID
    pub subject_id: String,
    /// 教师ID
    pub teacher_id: u32,
    /// 时间槽位
    pub time_slot: TimeSlot,
    /// 是否固定课程
    pub is_fixed: bool,
    /// 单双周标记
    pub week_type: WeekType,
}

impl ScheduleEntry {
    /// 创建新的课表条目
    ///
    /// # 参数
    /// - `class_id`: 班级ID
    /// - `subject_id`: 科目ID
    /// - `teacher_id`: 教师ID
    /// - `time_slot`: 时间槽位
    ///
    /// # 返回
    /// 课表条目实例，默认不是固定课程，每周都上课
    ///
    /// # 示例
    /// ```rust
    /// use course_scheduling_system::algorithm::{ScheduleEntry, TimeSlot};
    ///
    /// let time_slot = TimeSlot { day: 1, period: 2 };
    /// let entry = ScheduleEntry::new(
    ///     101,
    ///     "math".to_string(),
    ///     1001,
    ///     time_slot,
    /// );
    /// assert_eq!(entry.class_id, 101);
    /// assert_eq!(entry.subject_id, "math");
    /// assert_eq!(entry.teacher_id, 1001);
    /// assert_eq!(entry.time_slot.day, 1);
    /// assert_eq!(entry.time_slot.period, 2);
    /// assert!(!entry.is_fixed);
    /// ```
    pub fn new(class_id: u32, subject_id: String, teacher_id: u32, time_slot: TimeSlot) -> Self {
        debug!(
            "创建课表条目: class_id={}, subject_id={}, teacher_id={}, time_slot=({}, {})",
            class_id, subject_id, teacher_id, time_slot.day, time_slot.period
        );
        Self {
            class_id,
            subject_id,
            teacher_id,
            time_slot,
            is_fixed: false,
            week_type: WeekType::Every,
        }
    }

    /// 检查是否为固定课程
    ///
    /// # 返回
    /// 如果是固定课程返回 `true`，否则返回 `false`
    ///
    /// # 示例
    /// ```rust
    /// use course_scheduling_system::algorithm::{ScheduleEntry, TimeSlot};
    ///
    /// let time_slot = TimeSlot { day: 0, period: 0 };
    /// let mut entry = ScheduleEntry::new(
    ///     101,
    ///     "math".to_string(),
    ///     1001,
    ///     time_slot,
    /// );
    /// assert!(!entry.is_fixed());
    ///
    /// entry.is_fixed = true;
    /// assert!(entry.is_fixed());
    /// ```
    pub fn is_fixed(&self) -> bool {
        self.is_fixed
    }

    /// 设置固定课程标记
    ///
    /// # 参数
    /// - `is_fixed`: 是否为固定课程
    ///
    /// # 示例
    /// ```rust
    /// use course_scheduling_system::algorithm::{ScheduleEntry, TimeSlot};
    ///
    /// let time_slot = TimeSlot { day: 0, period: 0 };
    /// let mut entry = ScheduleEntry::new(
    ///     101,
    ///     "math".to_string(),
    ///     1001,
    ///     time_slot,
    /// );
    /// assert!(!entry.is_fixed());
    ///
    /// entry.set_fixed(true);
    /// assert!(entry.is_fixed());
    /// ```
    pub fn set_fixed(&mut self, is_fixed: bool) {
        self.is_fixed = is_fixed;
        debug!(
            "设置固定课程标记: class_id={}, subject_id={}, is_fixed={}",
            self.class_id, self.subject_id, is_fixed
        );
    }
}

// ============================================================================
// 单元测试
// ============================================================================

#[cfg(test)]
mod schedule_entry_tests {
    use super::*;

    #[test]
    fn test_schedule_entry_new() {
        let time_slot = TimeSlot { day: 0, period: 0 };
        let entry = ScheduleEntry::new(101, "math".to_string(), 1001, time_slot);

        assert_eq!(entry.class_id, 101);
        assert_eq!(entry.subject_id, "math");
        assert_eq!(entry.teacher_id, 1001);
        assert_eq!(entry.time_slot, time_slot);
        assert!(!entry.is_fixed);
        assert_eq!(entry.week_type, WeekType::Every);
    }

    #[test]
    fn test_schedule_entry_creation() {
        // 测试直接创建
        let time_slot = TimeSlot { day: 1, period: 2 };
        let entry = ScheduleEntry {
            class_id: 201,
            subject_id: "physics".to_string(),
            teacher_id: 2001,
            time_slot,
            is_fixed: true,
            week_type: WeekType::Odd,
        };

        assert_eq!(entry.class_id, 201);
        assert_eq!(entry.subject_id, "physics");
        assert_eq!(entry.teacher_id, 2001);
        assert_eq!(entry.time_slot.day, 1);
        assert_eq!(entry.time_slot.period, 2);
        assert!(entry.is_fixed);
        assert_eq!(entry.week_type, WeekType::Odd);
    }

    #[test]
    fn test_schedule_entry_is_fixed() {
        let time_slot = TimeSlot { day: 0, period: 0 };
        let mut entry = ScheduleEntry::new(101, "math".to_string(), 1001, time_slot);

        // 初始状态不是固定课程
        assert!(!entry.is_fixed());

        // 设置为固定课程
        entry.is_fixed = true;
        assert!(entry.is_fixed());

        // 取消固定课程标记
        entry.is_fixed = false;
        assert!(!entry.is_fixed());
    }

    #[test]
    fn test_schedule_entry_set_fixed() {
        let time_slot = TimeSlot { day: 0, period: 0 };
        let mut entry = ScheduleEntry::new(101, "math".to_string(), 1001, time_slot);

        // 初始状态
        assert!(!entry.is_fixed());

        // 设置为固定课程
        entry.set_fixed(true);
        assert!(entry.is_fixed());

        // 取消固定课程标记
        entry.set_fixed(false);
        assert!(!entry.is_fixed());
    }

    #[test]
    fn test_schedule_entry_week_type() {
        let time_slot = TimeSlot { day: 0, period: 0 };

        // 测试每周
        let mut entry = ScheduleEntry::new(101, "math".to_string(), 1001, time_slot);
        assert_eq!(entry.week_type, WeekType::Every);

        // 测试单周
        entry.week_type = WeekType::Odd;
        assert_eq!(entry.week_type, WeekType::Odd);

        // 测试双周
        entry.week_type = WeekType::Even;
        assert_eq!(entry.week_type, WeekType::Even);
    }

    #[test]
    fn test_schedule_entry_serialization() {
        let time_slot = TimeSlot { day: 1, period: 2 };
        let entry = ScheduleEntry {
            class_id: 101,
            subject_id: "chemistry".to_string(),
            teacher_id: 1001,
            time_slot,
            is_fixed: true,
            week_type: WeekType::Odd,
        };

        // 序列化
        let json = serde_json::to_string(&entry).unwrap();
        assert!(json.contains("\"class_id\":101"));
        assert!(json.contains("chemistry"));
        assert!(json.contains("\"teacher_id\":1001"));
        assert!(json.contains("\"is_fixed\":true"));

        // 反序列化
        let deserialized: ScheduleEntry = serde_json::from_str(&json).unwrap();
        assert_eq!(deserialized.class_id, entry.class_id);
        assert_eq!(deserialized.subject_id, entry.subject_id);
        assert_eq!(deserialized.teacher_id, entry.teacher_id);
        assert_eq!(deserialized.time_slot, entry.time_slot);
        assert_eq!(deserialized.is_fixed, entry.is_fixed);
        assert_eq!(deserialized.week_type, entry.week_type);
    }

    #[test]
    fn test_schedule_entry_clone() {
        let time_slot = TimeSlot { day: 3, period: 5 };
        let entry = ScheduleEntry {
            class_id: 101,
            subject_id: "english".to_string(),
            teacher_id: 1001,
            time_slot,
            is_fixed: false,
            week_type: WeekType::Even,
        };

        let cloned = entry.clone();
        assert_eq!(cloned.class_id, entry.class_id);
        assert_eq!(cloned.subject_id, entry.subject_id);
        assert_eq!(cloned.teacher_id, entry.teacher_id);
        assert_eq!(cloned.time_slot, entry.time_slot);
        assert_eq!(cloned.is_fixed, entry.is_fixed);
        assert_eq!(cloned.week_type, entry.week_type);
    }

    #[test]
    fn test_schedule_entry_debug() {
        let time_slot = TimeSlot { day: 0, period: 0 };
        let entry = ScheduleEntry::new(101, "math".to_string(), 1001, time_slot);

        let debug_str = format!("{:?}", entry);
        assert!(debug_str.contains("class_id"));
        assert!(debug_str.contains("subject_id"));
        assert!(debug_str.contains("teacher_id"));
        assert!(debug_str.contains("time_slot"));
        assert!(debug_str.contains("is_fixed"));
        assert!(debug_str.contains("week_type"));
        assert!(debug_str.contains("math"));
    }

    #[test]
    fn test_schedule_entry_equality() {
        let time_slot = TimeSlot { day: 0, period: 0 };
        let entry1 = ScheduleEntry::new(101, "math".to_string(), 1001, time_slot);
        let entry2 = ScheduleEntry::new(101, "math".to_string(), 1001, time_slot);

        // 测试相等性
        assert_eq!(entry1, entry2);

        // 测试不相等性
        let entry3 = ScheduleEntry::new(102, "math".to_string(), 1001, time_slot);
        assert_ne!(entry1, entry3);

        let entry4 = ScheduleEntry::new(101, "physics".to_string(), 1001, time_slot);
        assert_ne!(entry1, entry4);

        let entry5 = ScheduleEntry::new(101, "math".to_string(), 1002, time_slot);
        assert_ne!(entry1, entry5);

        let time_slot2 = TimeSlot { day: 1, period: 0 };
        let entry6 = ScheduleEntry::new(101, "math".to_string(), 1001, time_slot2);
        assert_ne!(entry1, entry6);
    }

    #[test]
    fn test_schedule_entry_field_access() {
        let time_slot = TimeSlot { day: 1, period: 2 };
        let mut entry = ScheduleEntry::new(101, "math".to_string(), 1001, time_slot);

        // 测试字段访问
        assert_eq!(entry.class_id, 101);
        assert_eq!(entry.subject_id, "math");
        assert_eq!(entry.teacher_id, 1001);
        assert_eq!(entry.time_slot.day, 1);
        assert_eq!(entry.time_slot.period, 2);
        assert!(!entry.is_fixed);
        assert_eq!(entry.week_type, WeekType::Every);

        // 测试字段修改
        entry.class_id = 999;
        assert_eq!(entry.class_id, 999);

        entry.subject_id = "physics".to_string();
        assert_eq!(entry.subject_id, "physics");

        entry.teacher_id = 9999;
        assert_eq!(entry.teacher_id, 9999);

        entry.time_slot = TimeSlot { day: 4, period: 7 };
        assert_eq!(entry.time_slot.day, 4);
        assert_eq!(entry.time_slot.period, 7);

        entry.is_fixed = true;
        assert!(entry.is_fixed);

        entry.week_type = WeekType::Odd;
        assert_eq!(entry.week_type, WeekType::Odd);
    }

    #[test]
    fn test_schedule_entry_fixed_course_scenario() {
        // 测试真实场景：固定的班会课
        let time_slot = TimeSlot { day: 4, period: 7 };
        let mut entry = ScheduleEntry::new(101, "class_meeting".to_string(), 1001, time_slot);

        // 设置为固定课程
        entry.set_fixed(true);

        assert_eq!(entry.class_id, 101);
        assert_eq!(entry.subject_id, "class_meeting");
        assert_eq!(entry.time_slot.day, 4); // 周五
        assert_eq!(entry.time_slot.period, 7); // 最后一节
        assert!(entry.is_fixed);
        assert_eq!(entry.week_type, WeekType::Every);
    }

    #[test]
    fn test_schedule_entry_single_week_scenario() {
        // 测试真实场景：单周的生物课
        let time_slot = TimeSlot { day: 2, period: 3 };
        let mut entry = ScheduleEntry::new(101, "biology".to_string(), 1001, time_slot);

        // 设置为单周
        entry.week_type = WeekType::Odd;

        assert_eq!(entry.class_id, 101);
        assert_eq!(entry.subject_id, "biology");
        assert_eq!(entry.time_slot.day, 2); // 周三
        assert_eq!(entry.time_slot.period, 3); // 第4节
        assert!(!entry.is_fixed);
        assert_eq!(entry.week_type, WeekType::Odd);
    }

    #[test]
    fn test_schedule_entry_double_week_scenario() {
        // 测试真实场景：双周的地理课
        let time_slot = TimeSlot { day: 1, period: 4 };
        let mut entry = ScheduleEntry::new(102, "geography".to_string(), 1002, time_slot);

        // 设置为双周
        entry.week_type = WeekType::Even;

        assert_eq!(entry.class_id, 102);
        assert_eq!(entry.subject_id, "geography");
        assert_eq!(entry.time_slot.day, 1); // 周二
        assert_eq!(entry.time_slot.period, 4); // 第5节
        assert!(!entry.is_fixed);
        assert_eq!(entry.week_type, WeekType::Even);
    }

    #[test]
    fn test_schedule_entry_multiple_entries() {
        // 测试多个课表条目
        let entries = vec![
            ScheduleEntry::new(
                101,
                "math".to_string(),
                1001,
                TimeSlot { day: 0, period: 0 },
            ),
            ScheduleEntry::new(
                101,
                "chinese".to_string(),
                1002,
                TimeSlot { day: 0, period: 1 },
            ),
            ScheduleEntry::new(
                101,
                "english".to_string(),
                1003,
                TimeSlot { day: 0, period: 2 },
            ),
            ScheduleEntry::new(
                101,
                "physics".to_string(),
                1004,
                TimeSlot { day: 0, period: 3 },
            ),
        ];

        // 验证所有条目
        assert_eq!(entries.len(), 4);
        assert_eq!(entries[0].subject_id, "math");
        assert_eq!(entries[1].subject_id, "chinese");
        assert_eq!(entries[2].subject_id, "english");
        assert_eq!(entries[3].subject_id, "physics");

        // 验证所有条目都是同一个班级
        for entry in &entries {
            assert_eq!(entry.class_id, 101);
        }

        // 验证所有条目都是同一天
        for entry in &entries {
            assert_eq!(entry.time_slot.day, 0);
        }
    }

    #[test]
    fn test_schedule_entry_different_time_slots() {
        // 测试不同时间槽位的课表条目
        let slots = vec![
            TimeSlot { day: 0, period: 0 },
            TimeSlot { day: 1, period: 3 },
            TimeSlot { day: 2, period: 5 },
            TimeSlot { day: 3, period: 2 },
            TimeSlot { day: 4, period: 7 },
        ];

        for (i, slot) in slots.iter().enumerate() {
            let entry = ScheduleEntry::new(
                (101 + i) as u32,
                format!("subject_{}", i),
                (1001 + i) as u32,
                *slot,
            );

            assert_eq!(entry.class_id, (101 + i) as u32);
            assert_eq!(entry.subject_id, format!("subject_{}", i));
            assert_eq!(entry.teacher_id, (1001 + i) as u32);
            assert_eq!(entry.time_slot, *slot);
            assert!(!entry.is_fixed);
            assert_eq!(entry.week_type, WeekType::Every);
        }
    }

    #[test]
    fn test_schedule_entry_fixed_and_week_type() {
        // 测试固定课程和单双周的组合
        let time_slot = TimeSlot { day: 0, period: 0 };

        // 固定课程 + 每周
        let mut entry1 = ScheduleEntry::new(101, "class_meeting".to_string(), 1001, time_slot);
        entry1.set_fixed(true);
        entry1.week_type = WeekType::Every;
        assert!(entry1.is_fixed);
        assert_eq!(entry1.week_type, WeekType::Every);

        // 非固定课程 + 单周
        let mut entry2 = ScheduleEntry::new(102, "biology".to_string(), 1002, time_slot);
        entry2.set_fixed(false);
        entry2.week_type = WeekType::Odd;
        assert!(!entry2.is_fixed);
        assert_eq!(entry2.week_type, WeekType::Odd);

        // 非固定课程 + 双周
        let mut entry3 = ScheduleEntry::new(103, "geography".to_string(), 1003, time_slot);
        entry3.set_fixed(false);
        entry3.week_type = WeekType::Even;
        assert!(!entry3.is_fixed);
        assert_eq!(entry3.week_type, WeekType::Even);

        // 固定课程 + 单周（特殊情况）
        let mut entry4 = ScheduleEntry::new(104, "special".to_string(), 1004, time_slot);
        entry4.set_fixed(true);
        entry4.week_type = WeekType::Odd;
        assert!(entry4.is_fixed);
        assert_eq!(entry4.week_type, WeekType::Odd);
    }

    #[test]
    fn test_schedule_entry_realistic_schedule() {
        // 测试真实的课表场景：一个班级的周一课程
        let monday_schedule = vec![
            ScheduleEntry::new(
                101,
                "math".to_string(),
                1001,
                TimeSlot { day: 0, period: 0 },
            ),
            ScheduleEntry::new(
                101,
                "chinese".to_string(),
                1002,
                TimeSlot { day: 0, period: 1 },
            ),
            ScheduleEntry::new(
                101,
                "english".to_string(),
                1003,
                TimeSlot { day: 0, period: 2 },
            ),
            ScheduleEntry::new(
                101,
                "physics".to_string(),
                1004,
                TimeSlot { day: 0, period: 3 },
            ),
            ScheduleEntry::new(
                101,
                "chemistry".to_string(),
                1005,
                TimeSlot { day: 0, period: 4 },
            ),
            ScheduleEntry::new(101, "pe".to_string(), 1006, TimeSlot { day: 0, period: 5 }),
            ScheduleEntry::new(
                101,
                "history".to_string(),
                1007,
                TimeSlot { day: 0, period: 6 },
            ),
            ScheduleEntry::new(
                101,
                "politics".to_string(),
                1008,
                TimeSlot { day: 0, period: 7 },
            ),
        ];

        // 验证课表
        assert_eq!(monday_schedule.len(), 8);

        // 验证所有课程都是周一
        for entry in &monday_schedule {
            assert_eq!(entry.time_slot.day, 0);
        }

        // 验证所有课程都是同一个班级
        for entry in &monday_schedule {
            assert_eq!(entry.class_id, 101);
        }

        // 验证节次连续
        for (i, entry) in monday_schedule.iter().enumerate() {
            assert_eq!(entry.time_slot.period, i as u8);
        }

        // 验证所有课程都不是固定课程
        for entry in &monday_schedule {
            assert!(!entry.is_fixed);
        }

        // 验证所有课程都是每周
        for entry in &monday_schedule {
            assert_eq!(entry.week_type, WeekType::Every);
        }
    }

    #[test]
    fn test_schedule_entry_hash_and_eq() {
        use std::collections::HashSet;

        let time_slot = TimeSlot { day: 0, period: 0 };
        let entry1 = ScheduleEntry::new(101, "math".to_string(), 1001, time_slot);
        let entry2 = ScheduleEntry::new(101, "math".to_string(), 1001, time_slot);
        let entry3 = ScheduleEntry::new(102, "math".to_string(), 1001, time_slot);

        // 测试相等性
        assert_eq!(entry1, entry2);
        assert_ne!(entry1, entry3);

        // 测试在 HashSet 中的使用
        let mut set = HashSet::new();
        set.insert(entry1.clone());
        assert!(set.contains(&entry2));
        assert!(!set.contains(&entry3));
    }

    #[test]
    fn test_schedule_entry_vec_operations() {
        // 测试在 Vec 中的操作
        let mut entries = Vec::new();

        // 添加多个条目
        for i in 0..5 {
            let time_slot = TimeSlot { day: i, period: 0 };
            let entry =
                ScheduleEntry::new(101, format!("subject_{}", i), 1001 + i as u32, time_slot);
            entries.push(entry);
        }

        // 验证数量
        assert_eq!(entries.len(), 5);

        // 查找特定条目
        let target_entry = ScheduleEntry::new(
            101,
            "subject_2".to_string(),
            1003,
            TimeSlot { day: 2, period: 0 },
        );
        assert!(entries.contains(&target_entry));

        // 过滤条目
        let filtered: Vec<_> = entries
            .iter()
            .filter(|e| e.time_slot.day < 3)
            .cloned()
            .collect();
        assert_eq!(filtered.len(), 3);

        // 排序条目
        let mut sorted = entries.clone();
        sorted.sort_by_key(|e| (e.time_slot.day, e.time_slot.period));
        assert_eq!(sorted[0].time_slot.day, 0);
        assert_eq!(sorted[4].time_slot.day, 4);
    }
}

// ============================================================================
// 课表元数据和完整课表数据结构
// ============================================================================

/// 课表元数据
///
/// 包含课表的基本配置信息和版本信息
///
/// # 字段
/// - `cycle_days`: 排课周期天数（1-30天）
/// - `periods_per_day`: 每天节次数（1-12节）
/// - `generated_at`: 生成时间（ISO 8601 格式）
/// - `version`: 版本号
///
/// # 示例
/// ```rust
/// use course_scheduling_system::algorithm::ScheduleMetadata;
///
/// let metadata = ScheduleMetadata::new(5, 8);
/// assert_eq!(metadata.cycle_days, 5);
/// assert_eq!(metadata.periods_per_day, 8);
/// assert_eq!(metadata.version, 1);
/// ```
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ScheduleMetadata {
    /// 排课周期天数（1-30天）
    pub cycle_days: u8,
    /// 每天节次数（1-12节）
    pub periods_per_day: u8,
    /// 生成时间（ISO 8601 格式）
    pub generated_at: String,
    /// 版本号
    pub version: u32,
}

impl ScheduleMetadata {
    /// 创建新的课表元数据
    ///
    /// # 参数
    /// - `cycle_days`: 排课周期天数
    /// - `periods_per_day`: 每天节次数
    ///
    /// # 返回
    /// 课表元数据实例，版本号默认为 1，生成时间为当前时间
    ///
    /// # 示例
    /// ```rust
    /// use course_scheduling_system::algorithm::ScheduleMetadata;
    ///
    /// let metadata = ScheduleMetadata::new(5, 8);
    /// assert_eq!(metadata.cycle_days, 5);
    /// assert_eq!(metadata.periods_per_day, 8);
    /// assert_eq!(metadata.version, 1);
    /// ```
    pub fn new(cycle_days: u8, periods_per_day: u8) -> Self {
        use chrono::Utc;
        let generated_at = Utc::now().to_rfc3339();
        debug!(
            "创建课表元数据: cycle_days={}, periods_per_day={}, generated_at={}",
            cycle_days, periods_per_day, generated_at
        );
        Self {
            cycle_days,
            periods_per_day,
            generated_at,
            version: 1,
        }
    }

    /// 验证元数据有效性
    ///
    /// # 返回
    /// 如果元数据有效返回 `true`，否则返回 `false`
    ///
    /// # 示例
    /// ```rust
    /// use course_scheduling_system::algorithm::ScheduleMetadata;
    ///
    /// let metadata = ScheduleMetadata::new(5, 8);
    /// assert!(metadata.is_valid());
    ///
    /// let invalid_metadata = ScheduleMetadata {
    ///     cycle_days: 0,
    ///     periods_per_day: 8,
    ///     generated_at: String::new(),
    ///     version: 1,
    /// };
    /// assert!(!invalid_metadata.is_valid());
    /// ```
    pub fn is_valid(&self) -> bool {
        let valid = self.cycle_days >= 1
            && self.cycle_days <= 30
            && self.periods_per_day >= 1
            && self.periods_per_day <= 12;
        if !valid {
            debug!(
                "课表元数据无效: cycle_days={}, periods_per_day={}",
                self.cycle_days, self.periods_per_day
            );
        }
        valid
    }
}

/// 完整课表
///
/// 包含所有课表条目、代价值和元数据
///
/// # 字段
/// - `entries`: 课表条目列表
/// - `cost`: 代价值（越低越优）
/// - `metadata`: 课表元数据
///
/// # 示例
/// ```rust
/// use course_scheduling_system::algorithm::{Schedule, TimeSlot};
///
/// let schedule = Schedule::new(5, 8);
/// assert_eq!(schedule.entries.len(), 0);
/// assert_eq!(schedule.cost, 0);
/// assert_eq!(schedule.metadata.cycle_days, 5);
/// assert_eq!(schedule.metadata.periods_per_day, 8);
/// ```
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Schedule {
    /// 课表条目列表
    pub entries: Vec<ScheduleEntry>,
    /// 代价值（越低越优）
    pub cost: u32,
    /// 课表元数据
    pub metadata: ScheduleMetadata,
}

impl Schedule {
    /// 创建新的课表
    ///
    /// # 参数
    /// - `cycle_days`: 排课周期天数
    /// - `periods_per_day`: 每天节次数
    ///
    /// # 返回
    /// 空的课表实例，代价值为 0
    ///
    /// # 示例
    /// ```rust
    /// use course_scheduling_system::algorithm::Schedule;
    ///
    /// let schedule = Schedule::new(5, 8);
    /// assert_eq!(schedule.entries.len(), 0);
    /// assert_eq!(schedule.cost, 0);
    /// ```
    pub fn new(cycle_days: u8, periods_per_day: u8) -> Self {
        debug!(
            "创建新课表: cycle_days={}, periods_per_day={}",
            cycle_days, periods_per_day
        );
        Self {
            entries: Vec::new(),
            cost: 0,
            metadata: ScheduleMetadata::new(cycle_days, periods_per_day),
        }
    }

    /// 添加课表条目
    ///
    /// # 参数
    /// - `entry`: 要添加的课表条目
    ///
    /// # 示例
    /// ```rust
    /// use course_scheduling_system::algorithm::{Schedule, ScheduleEntry, TimeSlot};
    ///
    /// let mut schedule = Schedule::new(5, 8);
    /// let time_slot = TimeSlot { day: 0, period: 0 };
    /// let entry = ScheduleEntry::new(101, "math".to_string(), 1001, time_slot);
    /// schedule.add_entry(entry);
    /// assert_eq!(schedule.entries.len(), 1);
    /// ```
    pub fn add_entry(&mut self, entry: ScheduleEntry) {
        debug!(
            "添加课表条目: class_id={}, subject_id={}, teacher_id={}, time_slot=({}, {})",
            entry.class_id,
            entry.subject_id,
            entry.teacher_id,
            entry.time_slot.day,
            entry.time_slot.period
        );
        self.entries.push(entry);
    }

    /// 移除课表条目
    ///
    /// # 参数
    /// - `entry`: 要移除的课表条目
    ///
    /// # 返回
    /// 如果成功移除返回 `true`，否则返回 `false`
    ///
    /// # 示例
    /// ```rust
    /// use course_scheduling_system::algorithm::{Schedule, ScheduleEntry, TimeSlot};
    ///
    /// let mut schedule = Schedule::new(5, 8);
    /// let time_slot = TimeSlot { day: 0, period: 0 };
    /// let entry = ScheduleEntry::new(101, "math".to_string(), 1001, time_slot);
    /// schedule.add_entry(entry.clone());
    /// assert_eq!(schedule.entries.len(), 1);
    ///
    /// assert!(schedule.remove_entry(&entry));
    /// assert_eq!(schedule.entries.len(), 0);
    /// ```
    pub fn remove_entry(&mut self, entry: &ScheduleEntry) -> bool {
        if let Some(pos) = self.entries.iter().position(|e| e == entry) {
            self.entries.remove(pos);
            debug!(
                "移除课表条目: class_id={}, subject_id={}, teacher_id={}, time_slot=({}, {})",
                entry.class_id,
                entry.subject_id,
                entry.teacher_id,
                entry.time_slot.day,
                entry.time_slot.period
            );
            true
        } else {
            debug!("未找到要移除的课表条目");
            false
        }
    }

    /// 获取指定时间槽位的所有条目
    ///
    /// # 参数
    /// - `slot`: 时间槽位
    ///
    /// # 返回
    /// 该时间槽位的所有课表条目
    ///
    /// # 示例
    /// ```rust
    /// use course_scheduling_system::algorithm::{Schedule, ScheduleEntry, TimeSlot};
    ///
    /// let mut schedule = Schedule::new(5, 8);
    /// let time_slot = TimeSlot { day: 0, period: 0 };
    /// let entry1 = ScheduleEntry::new(101, "math".to_string(), 1001, time_slot);
    /// let entry2 = ScheduleEntry::new(102, "chinese".to_string(), 1002, time_slot);
    /// schedule.add_entry(entry1);
    /// schedule.add_entry(entry2);
    ///
    /// let entries = schedule.get_entries_at(&time_slot);
    /// assert_eq!(entries.len(), 2);
    /// ```
    pub fn get_entries_at(&self, slot: &TimeSlot) -> Vec<&ScheduleEntry> {
        let entries: Vec<&ScheduleEntry> = self
            .entries
            .iter()
            .filter(|e| e.time_slot == *slot)
            .collect();
        trace!(
            "获取时间槽位 ({}, {}) 的条目数量: {}",
            slot.day,
            slot.period,
            entries.len()
        );
        entries
    }

    /// 获取指定班级的所有条目
    ///
    /// # 参数
    /// - `class_id`: 班级ID
    ///
    /// # 返回
    /// 该班级的所有课表条目
    ///
    /// # 示例
    /// ```rust
    /// use course_scheduling_system::algorithm::{Schedule, ScheduleEntry, TimeSlot};
    ///
    /// let mut schedule = Schedule::new(5, 8);
    /// let entry1 = ScheduleEntry::new(101, "math".to_string(), 1001, TimeSlot { day: 0, period: 0 });
    /// let entry2 = ScheduleEntry::new(101, "chinese".to_string(), 1002, TimeSlot { day: 0, period: 1 });
    /// schedule.add_entry(entry1);
    /// schedule.add_entry(entry2);
    ///
    /// let entries = schedule.get_entries_for_class(101);
    /// assert_eq!(entries.len(), 2);
    /// ```
    pub fn get_entries_for_class(&self, class_id: u32) -> Vec<&ScheduleEntry> {
        let entries: Vec<&ScheduleEntry> = self
            .entries
            .iter()
            .filter(|e| e.class_id == class_id)
            .collect();
        trace!("获取班级 {} 的条目数量: {}", class_id, entries.len());
        entries
    }

    /// 获取指定教师的所有条目
    ///
    /// # 参数
    /// - `teacher_id`: 教师ID
    ///
    /// # 返回
    /// 该教师的所有课表条目
    ///
    /// # 示例
    /// ```rust
    /// use course_scheduling_system::algorithm::{Schedule, ScheduleEntry, TimeSlot};
    ///
    /// let mut schedule = Schedule::new(5, 8);
    /// let entry1 = ScheduleEntry::new(101, "math".to_string(), 1001, TimeSlot { day: 0, period: 0 });
    /// let entry2 = ScheduleEntry::new(102, "math".to_string(), 1001, TimeSlot { day: 0, period: 1 });
    /// schedule.add_entry(entry1);
    /// schedule.add_entry(entry2);
    ///
    /// let entries = schedule.get_entries_for_teacher(1001);
    /// assert_eq!(entries.len(), 2);
    /// ```
    pub fn get_entries_for_teacher(&self, teacher_id: u32) -> Vec<&ScheduleEntry> {
        let entries: Vec<&ScheduleEntry> = self
            .entries
            .iter()
            .filter(|e| e.teacher_id == teacher_id)
            .collect();
        trace!("获取教师 {} 的条目数量: {}", teacher_id, entries.len());
        entries
    }

    /// 检查教师是否在指定时段有课
    ///
    /// # 参数
    /// - `teacher_id`: 教师ID
    /// - `slot`: 时间槽位
    ///
    /// # 返回
    /// 如果教师在该时段有课返回 `true`，否则返回 `false`
    ///
    /// # 示例
    /// ```rust
    /// use course_scheduling_system::algorithm::{Schedule, ScheduleEntry, TimeSlot};
    ///
    /// let mut schedule = Schedule::new(5, 8);
    /// let time_slot = TimeSlot { day: 0, period: 0 };
    /// let entry = ScheduleEntry::new(101, "math".to_string(), 1001, time_slot);
    /// schedule.add_entry(entry);
    ///
    /// assert!(schedule.is_teacher_busy(1001, &time_slot));
    /// assert!(!schedule.is_teacher_busy(1002, &time_slot));
    /// ```
    pub fn is_teacher_busy(&self, teacher_id: u32, slot: &TimeSlot) -> bool {
        let is_busy = self
            .entries
            .iter()
            .any(|e| e.teacher_id == teacher_id && e.time_slot == *slot);
        trace!(
            "检查教师 {} 在时间槽位 ({}, {}) 是否有课: {}",
            teacher_id,
            slot.day,
            slot.period,
            is_busy
        );
        is_busy
    }

    /// 检查班级是否在指定时段有课
    ///
    /// # 参数
    /// - `class_id`: 班级ID
    /// - `slot`: 时间槽位
    ///
    /// # 返回
    /// 如果班级在该时段有课返回 `true`，否则返回 `false`
    ///
    /// # 示例
    /// ```rust
    /// use course_scheduling_system::algorithm::{Schedule, ScheduleEntry, TimeSlot};
    ///
    /// let mut schedule = Schedule::new(5, 8);
    /// let time_slot = TimeSlot { day: 0, period: 0 };
    /// let entry = ScheduleEntry::new(101, "math".to_string(), 1001, time_slot);
    /// schedule.add_entry(entry);
    ///
    /// assert!(schedule.is_class_busy(101, &time_slot));
    /// assert!(!schedule.is_class_busy(102, &time_slot));
    /// ```
    pub fn is_class_busy(&self, class_id: u32, slot: &TimeSlot) -> bool {
        let is_busy = self
            .entries
            .iter()
            .any(|e| e.class_id == class_id && e.time_slot == *slot);
        trace!(
            "检查班级 {} 在时间槽位 ({}, {}) 是否有课: {}",
            class_id,
            slot.day,
            slot.period,
            is_busy
        );
        is_busy
    }
}

// ============================================================================
// 单元测试
// ============================================================================

#[cfg(test)]
mod schedule_tests {
    use super::*;

    // ========================================================================
    // ScheduleMetadata 测试
    // ========================================================================

    #[test]
    fn test_schedule_metadata_new() {
        let metadata = ScheduleMetadata::new(5, 8);
        assert_eq!(metadata.cycle_days, 5);
        assert_eq!(metadata.periods_per_day, 8);
        assert_eq!(metadata.version, 1);
        assert!(!metadata.generated_at.is_empty());
    }

    #[test]
    fn test_schedule_metadata_creation() {
        // 测试直接创建
        let metadata = ScheduleMetadata {
            cycle_days: 7,
            periods_per_day: 10,
            generated_at: "2024-01-01T00:00:00Z".to_string(),
            version: 2,
        };

        assert_eq!(metadata.cycle_days, 7);
        assert_eq!(metadata.periods_per_day, 10);
        assert_eq!(metadata.generated_at, "2024-01-01T00:00:00Z");
        assert_eq!(metadata.version, 2);
    }

    #[test]
    fn test_schedule_metadata_is_valid() {
        // 有效的元数据
        let valid_metadata = ScheduleMetadata::new(5, 8);
        assert!(valid_metadata.is_valid());

        // 无效的元数据 - cycle_days 为 0
        let invalid_metadata1 = ScheduleMetadata {
            cycle_days: 0,
            periods_per_day: 8,
            generated_at: String::new(),
            version: 1,
        };
        assert!(!invalid_metadata1.is_valid());

        // 无效的元数据 - cycle_days 超过 30
        let invalid_metadata2 = ScheduleMetadata {
            cycle_days: 31,
            periods_per_day: 8,
            generated_at: String::new(),
            version: 1,
        };
        assert!(!invalid_metadata2.is_valid());

        // 无效的元数据 - periods_per_day 为 0
        let invalid_metadata3 = ScheduleMetadata {
            cycle_days: 5,
            periods_per_day: 0,
            generated_at: String::new(),
            version: 1,
        };
        assert!(!invalid_metadata3.is_valid());

        // 无效的元数据 - periods_per_day 超过 12
        let invalid_metadata4 = ScheduleMetadata {
            cycle_days: 5,
            periods_per_day: 13,
            generated_at: String::new(),
            version: 1,
        };
        assert!(!invalid_metadata4.is_valid());
    }

    #[test]
    fn test_schedule_metadata_serialization() {
        let metadata = ScheduleMetadata {
            cycle_days: 5,
            periods_per_day: 8,
            generated_at: "2024-01-01T00:00:00Z".to_string(),
            version: 1,
        };

        // 序列化
        let json = serde_json::to_string(&metadata).unwrap();
        assert!(json.contains("\"cycle_days\":5"));
        assert!(json.contains("\"periods_per_day\":8"));
        assert!(json.contains("\"version\":1"));

        // 反序列化
        let deserialized: ScheduleMetadata = serde_json::from_str(&json).unwrap();
        assert_eq!(deserialized.cycle_days, metadata.cycle_days);
        assert_eq!(deserialized.periods_per_day, metadata.periods_per_day);
        assert_eq!(deserialized.generated_at, metadata.generated_at);
        assert_eq!(deserialized.version, metadata.version);
    }

    #[test]
    fn test_schedule_metadata_clone() {
        let metadata = ScheduleMetadata::new(5, 8);
        let cloned = metadata.clone();
        assert_eq!(cloned.cycle_days, metadata.cycle_days);
        assert_eq!(cloned.periods_per_day, metadata.periods_per_day);
        assert_eq!(cloned.generated_at, metadata.generated_at);
        assert_eq!(cloned.version, metadata.version);
    }

    #[test]
    fn test_schedule_metadata_debug() {
        let metadata = ScheduleMetadata::new(5, 8);
        let debug_str = format!("{:?}", metadata);
        assert!(debug_str.contains("cycle_days"));
        assert!(debug_str.contains("periods_per_day"));
        assert!(debug_str.contains("generated_at"));
        assert!(debug_str.contains("version"));
    }

    // ========================================================================
    // Schedule 测试
    // ========================================================================

    #[test]
    fn test_schedule_new() {
        let schedule = Schedule::new(5, 8);
        assert_eq!(schedule.entries.len(), 0);
        assert_eq!(schedule.cost, 0);
        assert_eq!(schedule.metadata.cycle_days, 5);
        assert_eq!(schedule.metadata.periods_per_day, 8);
    }

    #[test]
    fn test_schedule_add_entry() {
        let mut schedule = Schedule::new(5, 8);
        let time_slot = TimeSlot { day: 0, period: 0 };
        let entry = ScheduleEntry::new(101, "math".to_string(), 1001, time_slot);

        schedule.add_entry(entry.clone());
        assert_eq!(schedule.entries.len(), 1);
        assert_eq!(schedule.entries[0], entry);
    }

    #[test]
    fn test_schedule_remove_entry() {
        let mut schedule = Schedule::new(5, 8);
        let time_slot = TimeSlot { day: 0, period: 0 };
        let entry = ScheduleEntry::new(101, "math".to_string(), 1001, time_slot);

        schedule.add_entry(entry.clone());
        assert_eq!(schedule.entries.len(), 1);

        assert!(schedule.remove_entry(&entry));
        assert_eq!(schedule.entries.len(), 0);

        // 尝试移除不存在的条目
        assert!(!schedule.remove_entry(&entry));
    }

    #[test]
    fn test_schedule_get_entries_at() {
        let mut schedule = Schedule::new(5, 8);
        let time_slot = TimeSlot { day: 0, period: 0 };
        let entry1 = ScheduleEntry::new(101, "math".to_string(), 1001, time_slot);
        let entry2 = ScheduleEntry::new(102, "chinese".to_string(), 1002, time_slot);

        schedule.add_entry(entry1);
        schedule.add_entry(entry2);

        let entries = schedule.get_entries_at(&time_slot);
        assert_eq!(entries.len(), 2);

        // 查询空时间槽位
        let empty_slot = TimeSlot { day: 1, period: 0 };
        let empty_entries = schedule.get_entries_at(&empty_slot);
        assert_eq!(empty_entries.len(), 0);
    }

    #[test]
    fn test_schedule_get_entries_for_class() {
        let mut schedule = Schedule::new(5, 8);
        let entry1 = ScheduleEntry::new(
            101,
            "math".to_string(),
            1001,
            TimeSlot { day: 0, period: 0 },
        );
        let entry2 = ScheduleEntry::new(
            101,
            "chinese".to_string(),
            1002,
            TimeSlot { day: 0, period: 1 },
        );
        let entry3 = ScheduleEntry::new(
            102,
            "math".to_string(),
            1001,
            TimeSlot { day: 0, period: 0 },
        );

        schedule.add_entry(entry1);
        schedule.add_entry(entry2);
        schedule.add_entry(entry3);

        let entries = schedule.get_entries_for_class(101);
        assert_eq!(entries.len(), 2);

        let entries2 = schedule.get_entries_for_class(102);
        assert_eq!(entries2.len(), 1);

        let entries3 = schedule.get_entries_for_class(103);
        assert_eq!(entries3.len(), 0);
    }

    #[test]
    fn test_schedule_get_entries_for_teacher() {
        let mut schedule = Schedule::new(5, 8);
        let entry1 = ScheduleEntry::new(
            101,
            "math".to_string(),
            1001,
            TimeSlot { day: 0, period: 0 },
        );
        let entry2 = ScheduleEntry::new(
            102,
            "math".to_string(),
            1001,
            TimeSlot { day: 0, period: 1 },
        );
        let entry3 = ScheduleEntry::new(
            101,
            "chinese".to_string(),
            1002,
            TimeSlot { day: 0, period: 2 },
        );

        schedule.add_entry(entry1);
        schedule.add_entry(entry2);
        schedule.add_entry(entry3);

        let entries = schedule.get_entries_for_teacher(1001);
        assert_eq!(entries.len(), 2);

        let entries2 = schedule.get_entries_for_teacher(1002);
        assert_eq!(entries2.len(), 1);

        let entries3 = schedule.get_entries_for_teacher(1003);
        assert_eq!(entries3.len(), 0);
    }

    #[test]
    fn test_schedule_is_teacher_busy() {
        let mut schedule = Schedule::new(5, 8);
        let time_slot = TimeSlot { day: 0, period: 0 };
        let entry = ScheduleEntry::new(101, "math".to_string(), 1001, time_slot);

        schedule.add_entry(entry);

        assert!(schedule.is_teacher_busy(1001, &time_slot));
        assert!(!schedule.is_teacher_busy(1002, &time_slot));

        let other_slot = TimeSlot { day: 0, period: 1 };
        assert!(!schedule.is_teacher_busy(1001, &other_slot));
    }

    #[test]
    fn test_schedule_is_class_busy() {
        let mut schedule = Schedule::new(5, 8);
        let time_slot = TimeSlot { day: 0, period: 0 };
        let entry = ScheduleEntry::new(101, "math".to_string(), 1001, time_slot);

        schedule.add_entry(entry);

        assert!(schedule.is_class_busy(101, &time_slot));
        assert!(!schedule.is_class_busy(102, &time_slot));

        let other_slot = TimeSlot { day: 0, period: 1 };
        assert!(!schedule.is_class_busy(101, &other_slot));
    }

    #[test]
    fn test_schedule_serialization() {
        let mut schedule = Schedule::new(5, 8);
        let time_slot = TimeSlot { day: 0, period: 0 };
        let entry = ScheduleEntry::new(101, "math".to_string(), 1001, time_slot);
        schedule.add_entry(entry);
        schedule.cost = 100;

        // 序列化
        let json = serde_json::to_string(&schedule).unwrap();
        assert!(json.contains("\"cost\":100"));
        assert!(json.contains("math"));

        // 反序列化
        let deserialized: Schedule = serde_json::from_str(&json).unwrap();
        assert_eq!(deserialized.entries.len(), schedule.entries.len());
        assert_eq!(deserialized.cost, schedule.cost);
        assert_eq!(
            deserialized.metadata.cycle_days,
            schedule.metadata.cycle_days
        );
    }

    #[test]
    fn test_schedule_clone() {
        let mut schedule = Schedule::new(5, 8);
        let time_slot = TimeSlot { day: 0, period: 0 };
        let entry = ScheduleEntry::new(101, "math".to_string(), 1001, time_slot);
        schedule.add_entry(entry);
        schedule.cost = 50;

        let cloned = schedule.clone();
        assert_eq!(cloned.entries.len(), schedule.entries.len());
        assert_eq!(cloned.cost, schedule.cost);
        assert_eq!(cloned.metadata.cycle_days, schedule.metadata.cycle_days);
    }

    #[test]
    fn test_schedule_debug() {
        let schedule = Schedule::new(5, 8);
        let debug_str = format!("{:?}", schedule);
        assert!(debug_str.contains("entries"));
        assert!(debug_str.contains("cost"));
        assert!(debug_str.contains("metadata"));
    }

    #[test]
    fn test_schedule_conflict_detection() {
        // 测试冲突检测功能
        let mut schedule = Schedule::new(5, 8);
        let time_slot = TimeSlot { day: 0, period: 0 };

        // 添加第一个条目
        let entry1 = ScheduleEntry::new(101, "math".to_string(), 1001, time_slot);
        schedule.add_entry(entry1);

        // 检查教师冲突
        assert!(schedule.is_teacher_busy(1001, &time_slot));

        // 检查班级冲突
        assert!(schedule.is_class_busy(101, &time_slot));

        // 尝试添加冲突的条目（同一教师，同一时间）
        let entry2 = ScheduleEntry::new(102, "chinese".to_string(), 1001, time_slot);
        schedule.add_entry(entry2);

        // 验证冲突被检测到
        let entries_at_slot = schedule.get_entries_at(&time_slot);
        assert_eq!(entries_at_slot.len(), 2);
        assert!(schedule.is_teacher_busy(1001, &time_slot));
    }

    #[test]
    fn test_schedule_multiple_entries() {
        // 测试添加多个条目
        let mut schedule = Schedule::new(5, 8);

        // 添加一周的课程
        for day in 0..5 {
            for period in 0..8 {
                let time_slot = TimeSlot { day, period };
                let entry = ScheduleEntry::new(
                    101,
                    format!("subject_{}_{}", day, period),
                    1001 + (day * 8 + period) as u32,
                    time_slot,
                );
                schedule.add_entry(entry);
            }
        }

        // 验证总数
        assert_eq!(schedule.entries.len(), 40); // 5天 × 8节 = 40

        // 验证每个时间槽位都有课程
        for day in 0..5 {
            for period in 0..8 {
                let time_slot = TimeSlot { day, period };
                let entries = schedule.get_entries_at(&time_slot);
                assert_eq!(entries.len(), 1);
            }
        }
    }

    #[test]
    fn test_schedule_remove_multiple_entries() {
        // 测试移除多个条目
        let mut schedule = Schedule::new(5, 8);
        let entries: Vec<ScheduleEntry> = (0..5)
            .map(|i| {
                ScheduleEntry::new(
                    101,
                    format!("subject_{}", i),
                    1001 + i,
                    TimeSlot {
                        day: 0,
                        period: i as u8,
                    },
                )
            })
            .collect();

        // 添加所有条目
        for entry in &entries {
            schedule.add_entry(entry.clone());
        }
        assert_eq!(schedule.entries.len(), 5);

        // 移除部分条目
        assert!(schedule.remove_entry(&entries[0]));
        assert_eq!(schedule.entries.len(), 4);

        assert!(schedule.remove_entry(&entries[2]));
        assert_eq!(schedule.entries.len(), 3);

        // 验证剩余的条目
        assert!(schedule.entries.contains(&entries[1]));
        assert!(schedule.entries.contains(&entries[3]));
        assert!(schedule.entries.contains(&entries[4]));
    }

    #[test]
    fn test_schedule_teacher_workload() {
        // 测试教师工作量统计
        let mut schedule = Schedule::new(5, 8);

        // 为教师 1001 添加多节课
        for i in 0..10 {
            let time_slot = TimeSlot {
                day: i / 8,
                period: i % 8,
            };
            let entry = ScheduleEntry::new(101 + i as u32, "math".to_string(), 1001, time_slot);
            schedule.add_entry(entry);
        }

        // 为教师 1002 添加少量课程
        for i in 0..3 {
            let time_slot = TimeSlot { day: 2, period: i };
            let entry = ScheduleEntry::new(201 + i as u32, "chinese".to_string(), 1002, time_slot);
            schedule.add_entry(entry);
        }

        // 验证工作量
        let teacher1_entries = schedule.get_entries_for_teacher(1001);
        assert_eq!(teacher1_entries.len(), 10);

        let teacher2_entries = schedule.get_entries_for_teacher(1002);
        assert_eq!(teacher2_entries.len(), 3);
    }

    #[test]
    fn test_schedule_class_timetable() {
        // 测试班级课表
        let mut schedule = Schedule::new(5, 8);

        // 为班级 101 添加完整的一周课程
        let subjects = vec!["math", "chinese", "english", "physics", "chemistry"];
        let mut entry_count = 0;

        for day in 0..5 {
            for period in 0..8 {
                let time_slot = TimeSlot { day, period };
                let subject = subjects[entry_count % subjects.len()];
                let entry = ScheduleEntry::new(
                    101,
                    subject.to_string(),
                    1001 + entry_count as u32,
                    time_slot,
                );
                schedule.add_entry(entry);
                entry_count += 1;
            }
        }

        // 验证班级课表
        let class_entries = schedule.get_entries_for_class(101);
        assert_eq!(class_entries.len(), 40);

        // 验证每天都有课
        for day in 0..5 {
            let day_entries: Vec<_> = class_entries
                .iter()
                .filter(|e| e.time_slot.day == day)
                .collect();
            assert_eq!(day_entries.len(), 8);
        }
    }

    #[test]
    fn test_schedule_empty_operations() {
        // 测试空课表的操作
        let schedule = Schedule::new(5, 8);

        // 查询空课表
        let time_slot = TimeSlot { day: 0, period: 0 };
        assert_eq!(schedule.get_entries_at(&time_slot).len(), 0);
        assert_eq!(schedule.get_entries_for_class(101).len(), 0);
        assert_eq!(schedule.get_entries_for_teacher(1001).len(), 0);
        assert!(!schedule.is_teacher_busy(1001, &time_slot));
        assert!(!schedule.is_class_busy(101, &time_slot));
    }

    #[test]
    fn test_schedule_extended_period() {
        // 测试扩展周期（30天 × 12节）
        let mut schedule = Schedule::new(30, 12);
        assert_eq!(schedule.metadata.cycle_days, 30);
        assert_eq!(schedule.metadata.periods_per_day, 12);

        // 添加最后一天最后一节的课程
        let time_slot = TimeSlot {
            day: 29,
            period: 11,
        };
        let entry = ScheduleEntry::new(101, "math".to_string(), 1001, time_slot);
        schedule.add_entry(entry);

        assert_eq!(schedule.entries.len(), 1);
        assert!(schedule.is_class_busy(101, &time_slot));
    }

    #[test]
    fn test_schedule_cost_tracking() {
        // 测试代价值跟踪
        let mut schedule = Schedule::new(5, 8);
        assert_eq!(schedule.cost, 0);

        // 模拟设置代价值
        schedule.cost = 100;
        assert_eq!(schedule.cost, 100);

        schedule.cost = 50;
        assert_eq!(schedule.cost, 50);

        schedule.cost = 0;
        assert_eq!(schedule.cost, 0);
    }

    #[test]
    fn test_schedule_realistic_scenario() {
        // 测试真实场景：26个班级的排课
        let mut schedule = Schedule::new(5, 8);

        // 为26个班级各添加一节数学课
        for class_id in 101..=126 {
            let time_slot = TimeSlot {
                day: ((class_id - 101) / 8) as u8,
                period: ((class_id - 101) % 8) as u8,
            };
            let entry = ScheduleEntry::new(
                class_id,
                "math".to_string(),
                1001 + class_id - 101,
                time_slot,
            );
            schedule.add_entry(entry);
        }

        // 验证总数
        assert_eq!(schedule.entries.len(), 26);

        // 验证每个班级都有课
        for class_id in 101..=126 {
            let entries = schedule.get_entries_for_class(class_id);
            assert_eq!(entries.len(), 1);
        }
    }

    #[test]
    fn test_schedule_fixed_courses() {
        // 测试固定课程
        let mut schedule = Schedule::new(5, 8);

        // 添加固定的班会课（周五最后一节）
        let time_slot = TimeSlot { day: 4, period: 7 };
        let mut entry = ScheduleEntry::new(101, "class_meeting".to_string(), 1001, time_slot);
        entry.set_fixed(true);
        schedule.add_entry(entry);

        // 验证固定课程
        let entries = schedule.get_entries_at(&time_slot);
        assert_eq!(entries.len(), 1);
        assert!(entries[0].is_fixed());
    }

    #[test]
    fn test_schedule_week_type_entries() {
        // 测试单双周课程
        let mut schedule = Schedule::new(5, 8);

        // 添加单周课程
        let mut entry1 = ScheduleEntry::new(
            101,
            "biology".to_string(),
            1001,
            TimeSlot { day: 0, period: 0 },
        );
        entry1.week_type = WeekType::Odd;
        schedule.add_entry(entry1);

        // 添加双周课程
        let mut entry2 = ScheduleEntry::new(
            101,
            "geography".to_string(),
            1002,
            TimeSlot { day: 0, period: 1 },
        );
        entry2.week_type = WeekType::Even;
        schedule.add_entry(entry2);

        // 添加每周课程
        let entry3 = ScheduleEntry::new(
            101,
            "math".to_string(),
            1003,
            TimeSlot { day: 0, period: 2 },
        );
        schedule.add_entry(entry3);

        // 验证
        assert_eq!(schedule.entries.len(), 3);
        assert_eq!(schedule.entries[0].week_type, WeekType::Odd);
        assert_eq!(schedule.entries[1].week_type, WeekType::Even);
        assert_eq!(schedule.entries[2].week_type, WeekType::Every);
    }

    #[test]
    fn test_schedule_metadata_validation() {
        // 测试元数据验证
        let schedule1 = Schedule::new(5, 8);
        assert!(schedule1.metadata.is_valid());

        let schedule2 = Schedule::new(1, 1);
        assert!(schedule2.metadata.is_valid());

        let schedule3 = Schedule::new(30, 12);
        assert!(schedule3.metadata.is_valid());
    }

    #[test]
    fn test_schedule_comprehensive() {
        // 综合测试：模拟完整的排课场景
        let mut schedule = Schedule::new(5, 8);

        // 添加多个班级的课程
        let classes = vec![101, 102, 103];
        let subjects = vec!["math", "chinese", "english"];
        let teachers = vec![1001, 1002, 1003];

        for (i, class_id) in classes.iter().enumerate() {
            for (j, subject) in subjects.iter().enumerate() {
                let time_slot = TimeSlot {
                    day: i as u8,
                    period: j as u8,
                };
                let entry =
                    ScheduleEntry::new(*class_id, subject.to_string(), teachers[j], time_slot);
                schedule.add_entry(entry);
            }
        }

        // 验证总数
        assert_eq!(schedule.entries.len(), 9); // 3个班级 × 3门课程

        // 验证每个班级的课程数
        for class_id in &classes {
            let entries = schedule.get_entries_for_class(*class_id);
            assert_eq!(entries.len(), 3);
        }

        // 验证每个教师的课程数
        for teacher_id in &teachers {
            let entries = schedule.get_entries_for_teacher(*teacher_id);
            assert_eq!(entries.len(), 3);
        }

        // 验证没有冲突
        for class_id in &classes {
            for i in 0..3 {
                let time_slot = TimeSlot {
                    day: classes.iter().position(|&c| c == *class_id).unwrap() as u8,
                    period: i,
                };
                assert!(schedule.is_class_busy(*class_id, &time_slot));
            }
        }
    }
}

// ============================================================================
// 冲突检测相关数据结构
// ============================================================================

/// 冲突严重程度
///
/// 表示时间槽位的冲突状态，用于可视化显示
///
/// # 变体
/// - `Blocked`: 红色 - 硬约束冲突，不可放置
/// - `Warning`: 黄色 - 软约束冲突，可放置但不推荐
/// - `Available`: 绿色 - 无冲突，可放置
///
/// # 示例
/// ```rust
/// use course_scheduling_system::algorithm::ConflictSeverity;
///
/// let blocked = ConflictSeverity::Blocked;
/// let warning = ConflictSeverity::Warning;
/// let available = ConflictSeverity::Available;
/// ```
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub enum ConflictSeverity {
    /// 红色：硬约束冲突，不可放置
    Blocked,
    /// 黄色：软约束冲突，可放置但不推荐
    Warning,
    /// 绿色：无冲突，可放置
    Available,
}

/// 硬约束违反类型
///
/// 表示违反的具体硬约束类型
///
/// # 变体
/// - `TeacherBusy`: 教师时间冲突
/// - `ClassBusy`: 班级时间冲突
/// - `ForbiddenSlot`: 课程禁止时段
/// - `TeacherBlocked`: 教师不排课时段
/// - `VenueOverCapacity`: 场地容量超限
/// - `TeacherMutualExclusion`: 教师互斥约束
/// - `NoDoubleSession`: 不允许连堂
///
/// # 示例
/// ```rust
/// use course_scheduling_system::algorithm::HardConstraintViolation;
///
/// let teacher_busy = HardConstraintViolation::TeacherBusy;
/// let class_busy = HardConstraintViolation::ClassBusy;
/// ```
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub enum HardConstraintViolation {
    /// 教师时间冲突
    TeacherBusy,
    /// 班级时间冲突
    ClassBusy,
    /// 课程禁止时段
    ForbiddenSlot,
    /// 教师不排课时段
    TeacherBlocked,
    /// 场地容量超限
    VenueOverCapacity,
    /// 教师互斥约束
    TeacherMutualExclusion,
    /// 不允许连堂
    NoDoubleSession,
}

/// 软约束违反类型
///
/// 表示违反的具体软约束类型
///
/// # 变体
/// - `TeacherPreference`: 教师偏好违反
/// - `TimeBias`: 早晚偏好违反
/// - `ConsecutiveMajorSubject`: 主科连续3节
/// - `ProgressInconsistency`: 进度不一致
///
/// # 示例
/// ```rust
/// use course_scheduling_system::algorithm::SoftConstraintViolation;
///
/// let preference = SoftConstraintViolation::TeacherPreference;
/// let time_bias = SoftConstraintViolation::TimeBias;
/// ```
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub enum SoftConstraintViolation {
    /// 教师偏好违反
    TeacherPreference,
    /// 早晚偏好违反
    TimeBias,
    /// 主科连续3节
    ConsecutiveMajorSubject,
    /// 进度不一致
    ProgressInconsistency,
}

/// 冲突类型
///
/// 表示冲突的类型，包含硬约束冲突和软约束冲突
///
/// # 变体
/// - `HardConstraint`: 硬约束冲突，包含具体的违反类型
/// - `SoftConstraint`: 软约束冲突，包含具体的违反类型
///
/// # 示例
/// ```rust
/// use course_scheduling_system::algorithm::{ConflictType, HardConstraintViolation, SoftConstraintViolation};
///
/// let hard = ConflictType::HardConstraint(HardConstraintViolation::TeacherBusy);
/// let soft = ConflictType::SoftConstraint(SoftConstraintViolation::TeacherPreference);
/// ```
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub enum ConflictType {
    /// 硬约束冲突
    HardConstraint(HardConstraintViolation),
    /// 软约束冲突
    SoftConstraint(SoftConstraintViolation),
}

/// 冲突信息
///
/// 表示某个时间槽位的冲突状态和详细信息
///
/// # 字段
/// - `slot`: 时间槽位
/// - `conflict_type`: 冲突类型
/// - `severity`: 严重程度
/// - `description`: 描述信息
///
/// # 示例
/// ```rust
/// use course_scheduling_system::algorithm::{ConflictInfo, ConflictType, ConflictSeverity, HardConstraintViolation, TimeSlot};
///
/// let info = ConflictInfo::new(
///     TimeSlot { day: 0, period: 0 },
///     ConflictType::HardConstraint(HardConstraintViolation::TeacherBusy),
///     ConflictSeverity::Blocked,
///     "教师已有课程安排".to_string(),
/// );
/// ```
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ConflictInfo {
    /// 时间槽位
    pub slot: TimeSlot,
    /// 冲突类型
    pub conflict_type: ConflictType,
    /// 严重程度
    pub severity: ConflictSeverity,
    /// 描述信息
    pub description: String,
}

impl ConflictInfo {
    /// 创建新的冲突信息
    ///
    /// # 参数
    /// - `slot`: 时间槽位
    /// - `conflict_type`: 冲突类型
    /// - `severity`: 严重程度
    /// - `description`: 描述信息
    ///
    /// # 返回
    /// 冲突信息实例
    ///
    /// # 示例
    /// ```rust
    /// use course_scheduling_system::algorithm::{ConflictInfo, ConflictType, ConflictSeverity, HardConstraintViolation, TimeSlot};
    ///
    /// let info = ConflictInfo::new(
    ///     TimeSlot { day: 0, period: 0 },
    ///     ConflictType::HardConstraint(HardConstraintViolation::TeacherBusy),
    ///     ConflictSeverity::Blocked,
    ///     "教师已有课程安排".to_string(),
    /// );
    /// assert_eq!(info.slot.day, 0);
    /// assert_eq!(info.slot.period, 0);
    /// assert!(info.is_blocked());
    /// ```
    pub fn new(
        slot: TimeSlot,
        conflict_type: ConflictType,
        severity: ConflictSeverity,
        description: String,
    ) -> Self {
        debug!(
            "创建冲突信息: slot=({}, {}), severity={:?}, description={}",
            slot.day, slot.period, severity, description
        );
        Self {
            slot,
            conflict_type,
            severity,
            description,
        }
    }

    /// 检查是否被阻止
    ///
    /// # 返回
    /// 如果严重程度为 Blocked 返回 `true`，否则返回 `false`
    ///
    /// # 示例
    /// ```rust
    /// use course_scheduling_system::algorithm::{ConflictInfo, ConflictType, ConflictSeverity, HardConstraintViolation, TimeSlot};
    ///
    /// let blocked = ConflictInfo::new(
    ///     TimeSlot { day: 0, period: 0 },
    ///     ConflictType::HardConstraint(HardConstraintViolation::TeacherBusy),
    ///     ConflictSeverity::Blocked,
    ///     "教师已有课程安排".to_string(),
    /// );
    /// assert!(blocked.is_blocked());
    ///
    /// let warning = ConflictInfo::new(
    ///     TimeSlot { day: 0, period: 1 },
    ///     ConflictType::SoftConstraint(SoftConstraintViolation::TeacherPreference),
    ///     ConflictSeverity::Warning,
    ///     "不在教师偏好时段".to_string(),
    /// );
    /// assert!(!warning.is_blocked());
    /// ```
    pub fn is_blocked(&self) -> bool {
        matches!(self.severity, ConflictSeverity::Blocked)
    }

    /// 检查是否为警告
    ///
    /// # 返回
    /// 如果严重程度为 Warning 返回 `true`，否则返回 `false`
    ///
    /// # 示例
    /// ```rust
    /// use course_scheduling_system::algorithm::{ConflictInfo, ConflictType, ConflictSeverity, SoftConstraintViolation, TimeSlot};
    ///
    /// let warning = ConflictInfo::new(
    ///     TimeSlot { day: 0, period: 0 },
    ///     ConflictType::SoftConstraint(SoftConstraintViolation::TeacherPreference),
    ///     ConflictSeverity::Warning,
    ///     "不在教师偏好时段".to_string(),
    /// );
    /// assert!(warning.is_warning());
    ///
    /// let available = ConflictInfo::new(
    ///     TimeSlot { day: 0, period: 1 },
    ///     ConflictType::SoftConstraint(SoftConstraintViolation::TeacherPreference),
    ///     ConflictSeverity::Available,
    ///     "可以安排".to_string(),
    /// );
    /// assert!(!available.is_warning());
    /// ```
    pub fn is_warning(&self) -> bool {
        matches!(self.severity, ConflictSeverity::Warning)
    }

    /// 检查是否可用
    ///
    /// # 返回
    /// 如果严重程度为 Available 返回 `true`，否则返回 `false`
    ///
    /// # 示例
    /// ```rust
    /// use course_scheduling_system::algorithm::{ConflictInfo, ConflictType, ConflictSeverity, SoftConstraintViolation, TimeSlot};
    ///
    /// let available = ConflictInfo::new(
    ///     TimeSlot { day: 0, period: 0 },
    ///     ConflictType::SoftConstraint(SoftConstraintViolation::TeacherPreference),
    ///     ConflictSeverity::Available,
    ///     "可以安排".to_string(),
    /// );
    /// assert!(available.is_available());
    ///
    /// let blocked = ConflictInfo::new(
    ///     TimeSlot { day: 0, period: 1 },
    ///     ConflictType::HardConstraint(HardConstraintViolation::TeacherBusy),
    ///     ConflictSeverity::Blocked,
    ///     "教师已有课程安排".to_string(),
    /// );
    /// assert!(!blocked.is_available());
    /// ```
    pub fn is_available(&self) -> bool {
        matches!(self.severity, ConflictSeverity::Available)
    }
}

// ============================================================================
// ConflictInfo 相关测试
// ============================================================================

#[cfg(test)]
mod conflict_tests {
    use super::*;

    // ========================================================================
    // ConflictSeverity 测试
    // ========================================================================

    #[test]
    fn test_conflict_severity_variants() {
        // 测试所有变体
        let blocked = ConflictSeverity::Blocked;
        let warning = ConflictSeverity::Warning;
        let available = ConflictSeverity::Available;

        assert_eq!(blocked, ConflictSeverity::Blocked);
        assert_eq!(warning, ConflictSeverity::Warning);
        assert_eq!(available, ConflictSeverity::Available);
    }

    #[test]
    fn test_conflict_severity_serialization() {
        // 测试 Blocked
        let blocked = ConflictSeverity::Blocked;
        let json = serde_json::to_string(&blocked).unwrap();
        assert_eq!(json, "\"Blocked\"");
        let deserialized: ConflictSeverity = serde_json::from_str(&json).unwrap();
        assert_eq!(deserialized, ConflictSeverity::Blocked);

        // 测试 Warning
        let warning = ConflictSeverity::Warning;
        let json = serde_json::to_string(&warning).unwrap();
        assert_eq!(json, "\"Warning\"");
        let deserialized: ConflictSeverity = serde_json::from_str(&json).unwrap();
        assert_eq!(deserialized, ConflictSeverity::Warning);

        // 测试 Available
        let available = ConflictSeverity::Available;
        let json = serde_json::to_string(&available).unwrap();
        assert_eq!(json, "\"Available\"");
        let deserialized: ConflictSeverity = serde_json::from_str(&json).unwrap();
        assert_eq!(deserialized, ConflictSeverity::Available);
    }

    // ========================================================================
    // HardConstraintViolation 测试
    // ========================================================================

    #[test]
    fn test_hard_constraint_violation_variants() {
        // 测试所有变体
        let teacher_busy = HardConstraintViolation::TeacherBusy;
        let class_busy = HardConstraintViolation::ClassBusy;
        let forbidden_slot = HardConstraintViolation::ForbiddenSlot;
        let teacher_blocked = HardConstraintViolation::TeacherBlocked;
        let venue_over_capacity = HardConstraintViolation::VenueOverCapacity;
        let teacher_mutual_exclusion = HardConstraintViolation::TeacherMutualExclusion;
        let no_double_session = HardConstraintViolation::NoDoubleSession;

        assert_eq!(teacher_busy, HardConstraintViolation::TeacherBusy);
        assert_eq!(class_busy, HardConstraintViolation::ClassBusy);
        assert_eq!(forbidden_slot, HardConstraintViolation::ForbiddenSlot);
        assert_eq!(teacher_blocked, HardConstraintViolation::TeacherBlocked);
        assert_eq!(
            venue_over_capacity,
            HardConstraintViolation::VenueOverCapacity
        );
        assert_eq!(
            teacher_mutual_exclusion,
            HardConstraintViolation::TeacherMutualExclusion
        );
        assert_eq!(no_double_session, HardConstraintViolation::NoDoubleSession);
    }

    #[test]
    fn test_hard_constraint_violation_serialization() {
        // 测试 TeacherBusy
        let teacher_busy = HardConstraintViolation::TeacherBusy;
        let json = serde_json::to_string(&teacher_busy).unwrap();
        assert_eq!(json, "\"TeacherBusy\"");
        let deserialized: HardConstraintViolation = serde_json::from_str(&json).unwrap();
        assert_eq!(deserialized, HardConstraintViolation::TeacherBusy);

        // 测试 VenueOverCapacity
        let venue = HardConstraintViolation::VenueOverCapacity;
        let json = serde_json::to_string(&venue).unwrap();
        assert_eq!(json, "\"VenueOverCapacity\"");
        let deserialized: HardConstraintViolation = serde_json::from_str(&json).unwrap();
        assert_eq!(deserialized, HardConstraintViolation::VenueOverCapacity);
    }

    // ========================================================================
    // SoftConstraintViolation 测试
    // ========================================================================

    #[test]
    fn test_soft_constraint_violation_variants() {
        // 测试所有变体
        let teacher_preference = SoftConstraintViolation::TeacherPreference;
        let time_bias = SoftConstraintViolation::TimeBias;
        let consecutive_major = SoftConstraintViolation::ConsecutiveMajorSubject;
        let progress = SoftConstraintViolation::ProgressInconsistency;

        assert_eq!(
            teacher_preference,
            SoftConstraintViolation::TeacherPreference
        );
        assert_eq!(time_bias, SoftConstraintViolation::TimeBias);
        assert_eq!(
            consecutive_major,
            SoftConstraintViolation::ConsecutiveMajorSubject
        );
        assert_eq!(progress, SoftConstraintViolation::ProgressInconsistency);
    }

    #[test]
    fn test_soft_constraint_violation_serialization() {
        // 测试 TeacherPreference
        let preference = SoftConstraintViolation::TeacherPreference;
        let json = serde_json::to_string(&preference).unwrap();
        assert_eq!(json, "\"TeacherPreference\"");
        let deserialized: SoftConstraintViolation = serde_json::from_str(&json).unwrap();
        assert_eq!(deserialized, SoftConstraintViolation::TeacherPreference);

        // 测试 ProgressInconsistency
        let progress = SoftConstraintViolation::ProgressInconsistency;
        let json = serde_json::to_string(&progress).unwrap();
        assert_eq!(json, "\"ProgressInconsistency\"");
        let deserialized: SoftConstraintViolation = serde_json::from_str(&json).unwrap();
        assert_eq!(deserialized, SoftConstraintViolation::ProgressInconsistency);
    }

    // ========================================================================
    // ConflictType 测试
    // ========================================================================

    #[test]
    fn test_conflict_type_hard_constraint() {
        let hard = ConflictType::HardConstraint(HardConstraintViolation::TeacherBusy);

        match hard {
            ConflictType::HardConstraint(violation) => {
                assert_eq!(violation, HardConstraintViolation::TeacherBusy);
            }
            _ => panic!("Expected HardConstraint"),
        }
    }

    #[test]
    fn test_conflict_type_soft_constraint() {
        let soft = ConflictType::SoftConstraint(SoftConstraintViolation::TeacherPreference);

        match soft {
            ConflictType::SoftConstraint(violation) => {
                assert_eq!(violation, SoftConstraintViolation::TeacherPreference);
            }
            _ => panic!("Expected SoftConstraint"),
        }
    }

    #[test]
    fn test_conflict_type_serialization() {
        // 测试硬约束
        let hard = ConflictType::HardConstraint(HardConstraintViolation::TeacherBusy);
        let json = serde_json::to_string(&hard).unwrap();
        let deserialized: ConflictType = serde_json::from_str(&json).unwrap();
        assert_eq!(deserialized, hard);

        // 测试软约束
        let soft = ConflictType::SoftConstraint(SoftConstraintViolation::TeacherPreference);
        let json = serde_json::to_string(&soft).unwrap();
        let deserialized: ConflictType = serde_json::from_str(&json).unwrap();
        assert_eq!(deserialized, soft);
    }

    // ========================================================================
    // ConflictInfo 测试
    // ========================================================================

    #[test]
    fn test_conflict_info_new() {
        let slot = TimeSlot { day: 0, period: 0 };
        let conflict_type = ConflictType::HardConstraint(HardConstraintViolation::TeacherBusy);
        let severity = ConflictSeverity::Blocked;
        let description = "教师已有课程安排".to_string();

        let info = ConflictInfo::new(
            slot,
            conflict_type.clone(),
            severity.clone(),
            description.clone(),
        );

        assert_eq!(info.slot.day, 0);
        assert_eq!(info.slot.period, 0);
        assert_eq!(info.conflict_type, conflict_type);
        assert_eq!(info.severity, severity);
        assert_eq!(info.description, description);
    }

    #[test]
    fn test_conflict_info_is_blocked() {
        // 测试 Blocked
        let blocked = ConflictInfo::new(
            TimeSlot { day: 0, period: 0 },
            ConflictType::HardConstraint(HardConstraintViolation::TeacherBusy),
            ConflictSeverity::Blocked,
            "教师已有课程安排".to_string(),
        );
        assert!(blocked.is_blocked());
        assert!(!blocked.is_warning());
        assert!(!blocked.is_available());
    }

    #[test]
    fn test_conflict_info_is_warning() {
        let warning = ConflictInfo::new(
            TimeSlot { day: 0, period: 1 },
            ConflictType::SoftConstraint(SoftConstraintViolation::TeacherPreference),
            ConflictSeverity::Warning,
            "不在教师偏好时段".to_string(),
        );
        assert!(!warning.is_blocked());
        assert!(warning.is_warning());
        assert!(!warning.is_available());
    }

    #[test]
    fn test_conflict_info_is_available() {
        let available = ConflictInfo::new(
            TimeSlot { day: 0, period: 2 },
            ConflictType::SoftConstraint(SoftConstraintViolation::TeacherPreference),
            ConflictSeverity::Available,
            "可以安排".to_string(),
        );
        assert!(!available.is_blocked());
        assert!(!available.is_warning());
        assert!(available.is_available());
    }

    #[test]
    fn test_conflict_info_serialization() {
        let info = ConflictInfo::new(
            TimeSlot { day: 2, period: 5 },
            ConflictType::SoftConstraint(SoftConstraintViolation::ConsecutiveMajorSubject),
            ConflictSeverity::Warning,
            "主科连续3节".to_string(),
        );

        // 序列化
        let json = serde_json::to_string(&info).unwrap();
        assert!(json.contains("slot"));
        assert!(json.contains("conflict_type"));
        assert!(json.contains("severity"));
        assert!(json.contains("description"));

        // 反序列化
        let deserialized: ConflictInfo = serde_json::from_str(&json).unwrap();
        assert_eq!(deserialized.slot, info.slot);
        assert_eq!(deserialized.conflict_type, info.conflict_type);
        assert_eq!(deserialized.severity, info.severity);
        assert_eq!(deserialized.description, info.description);
    }

    #[test]
    fn test_conflict_info_all_hard_violations() {
        // 测试所有硬约束违反类型
        let violations = vec![
            (HardConstraintViolation::TeacherBusy, "教师时间冲突"),
            (HardConstraintViolation::ClassBusy, "班级时间冲突"),
            (HardConstraintViolation::ForbiddenSlot, "课程禁止时段"),
            (HardConstraintViolation::TeacherBlocked, "教师不排课时段"),
            (HardConstraintViolation::VenueOverCapacity, "场地容量超限"),
            (
                HardConstraintViolation::TeacherMutualExclusion,
                "教师互斥约束",
            ),
            (HardConstraintViolation::NoDoubleSession, "不允许连堂"),
        ];

        for (i, (violation, description)) in violations.iter().enumerate() {
            let info = ConflictInfo::new(
                TimeSlot {
                    day: 0,
                    period: i as u8,
                },
                ConflictType::HardConstraint(violation.clone()),
                ConflictSeverity::Blocked,
                description.to_string(),
            );

            assert!(info.is_blocked());
            assert_eq!(info.description, *description);
        }
    }

    #[test]
    fn test_conflict_info_all_soft_violations() {
        // 测试所有软约束违反类型
        let violations = vec![
            (SoftConstraintViolation::TeacherPreference, "教师偏好违反"),
            (SoftConstraintViolation::TimeBias, "早晚偏好违反"),
            (
                SoftConstraintViolation::ConsecutiveMajorSubject,
                "主科连续3节",
            ),
            (SoftConstraintViolation::ProgressInconsistency, "进度不一致"),
        ];

        for (i, (violation, description)) in violations.iter().enumerate() {
            let info = ConflictInfo::new(
                TimeSlot {
                    day: 0,
                    period: i as u8,
                },
                ConflictType::SoftConstraint(violation.clone()),
                ConflictSeverity::Warning,
                description.to_string(),
            );

            assert!(info.is_warning());
            assert_eq!(info.description, *description);
        }
    }
}

// ============================================================================
// 约束图数据结构
// ============================================================================

/// 约束图
///
/// 用于存储和组织所有约束相关的配置数据，便于在求解过程中快速访问。
/// 约束图是不可变的，一旦构建完成就不应修改。
///
/// # 字段
/// - `subject_configs`: 科目配置映射 (HashMap<String, SubjectConfig>)
/// - `teacher_prefs`: 教师偏好映射 (HashMap<u32, TeacherPreference>)
/// - `venues`: 场地配置映射 (HashMap<String, Venue>)
/// - `exclusions`: 教师互斥关系列表 (Vec<TeacherMutualExclusion>)
///
/// # 示例
/// ```rust
/// use course_scheduling_system::algorithm::types::*;
/// use std::collections::HashMap;
///
/// let subject_configs = HashMap::new();
/// let teacher_prefs = HashMap::new();
/// let venues = HashMap::new();
/// let exclusions = vec![];
///
/// let graph = ConstraintGraph::new(
///     subject_configs,
///     teacher_prefs,
///     venues,
///     exclusions,
/// );
/// ```
#[derive(Debug, Clone)]
pub struct ConstraintGraph {
    /// 科目配置映射
    pub subject_configs: std::collections::HashMap<String, SubjectConfig>,
    /// 教师偏好映射
    pub teacher_prefs: std::collections::HashMap<u32, TeacherPreference>,
    /// 场地配置映射
    pub venues: std::collections::HashMap<String, Venue>,
    /// 教师互斥关系列表
    pub exclusions: Vec<TeacherMutualExclusion>,
}

impl ConstraintGraph {
    /// 创建新的约束图
    ///
    /// # 参数
    /// - `subject_configs`: 科目配置映射
    /// - `teacher_prefs`: 教师偏好映射
    /// - `venues`: 场地配置映射
    /// - `exclusions`: 教师互斥关系列表
    ///
    /// # 返回
    /// 约束图实例
    ///
    /// # 示例
    /// ```rust
    /// use course_scheduling_system::algorithm::types::*;
    /// use std::collections::HashMap;
    ///
    /// let subject_configs = HashMap::new();
    /// let teacher_prefs = HashMap::new();
    /// let venues = HashMap::new();
    /// let exclusions = vec![];
    ///
    /// let graph = ConstraintGraph::new(
    ///     subject_configs,
    ///     teacher_prefs,
    ///     venues,
    ///     exclusions,
    /// );
    /// ```
    pub fn new(
        subject_configs: std::collections::HashMap<String, SubjectConfig>,
        teacher_prefs: std::collections::HashMap<u32, TeacherPreference>,
        venues: std::collections::HashMap<String, Venue>,
        exclusions: Vec<TeacherMutualExclusion>,
    ) -> Self {
        info!(
            "创建约束图：科目配置 {} 个，教师偏好 {} 个，场地 {} 个，互斥关系 {} 个",
            subject_configs.len(),
            teacher_prefs.len(),
            venues.len(),
            exclusions.len()
        );

        Self {
            subject_configs,
            teacher_prefs,
            venues,
            exclusions,
        }
    }

    /// 获取科目配置
    ///
    /// # 参数
    /// - `subject_id`: 科目ID
    ///
    /// # 返回
    /// 科目配置的引用，如果不存在返回 None
    ///
    /// # 示例
    /// ```rust
    /// use course_scheduling_system::algorithm::types::*;
    /// use std::collections::HashMap;
    ///
    /// let mut subject_configs = HashMap::new();
    /// subject_configs.insert(
    ///     "math".to_string(),
    ///     SubjectConfig::new("math".to_string(), "数学".to_string()),
    /// );
    ///
    /// let graph = ConstraintGraph::new(
    ///     subject_configs,
    ///     HashMap::new(),
    ///     HashMap::new(),
    ///     vec![],
    /// );
    ///
    /// let config = graph.get_subject_config("math");
    /// assert!(config.is_some());
    /// assert_eq!(config.unwrap().name, "数学");
    /// ```
    pub fn get_subject_config(&self, subject_id: &str) -> Option<&SubjectConfig> {
        trace!("查询科目配置: subject_id={}", subject_id);
        self.subject_configs.get(subject_id)
    }

    /// 获取教师偏好
    ///
    /// # 参数
    /// - `teacher_id`: 教师ID
    ///
    /// # 返回
    /// 教师偏好的引用，如果不存在返回 None
    ///
    /// # 示例
    /// ```rust
    /// use course_scheduling_system::algorithm::types::*;
    /// use std::collections::HashMap;
    ///
    /// let mut teacher_prefs = HashMap::new();
    /// teacher_prefs.insert(1, TeacherPreference::new(1));
    ///
    /// let graph = ConstraintGraph::new(
    ///     HashMap::new(),
    ///     teacher_prefs,
    ///     HashMap::new(),
    ///     vec![],
    /// );
    ///
    /// let pref = graph.get_teacher_preference(1);
    /// assert!(pref.is_some());
    /// assert_eq!(pref.unwrap().teacher_id, 1);
    /// ```
    pub fn get_teacher_preference(&self, teacher_id: u32) -> Option<&TeacherPreference> {
        trace!("查询教师偏好: teacher_id={}", teacher_id);
        self.teacher_prefs.get(&teacher_id)
    }

    /// 获取场地配置
    ///
    /// # 参数
    /// - `venue_id`: 场地ID
    ///
    /// # 返回
    /// 场地配置的引用，如果不存在返回 None
    ///
    /// # 示例
    /// ```rust
    /// use course_scheduling_system::algorithm::types::*;
    /// use std::collections::HashMap;
    ///
    /// let mut venues = HashMap::new();
    /// venues.insert(
    ///     "gym".to_string(),
    ///     Venue::new("gym".to_string(), "体育馆".to_string(), 4),
    /// );
    ///
    /// let graph = ConstraintGraph::new(
    ///     HashMap::new(),
    ///     HashMap::new(),
    ///     venues,
    ///     vec![],
    /// );
    ///
    /// let venue = graph.get_venue("gym");
    /// assert!(venue.is_some());
    /// assert_eq!(venue.unwrap().name, "体育馆");
    /// ```
    pub fn get_venue(&self, venue_id: &str) -> Option<&Venue> {
        trace!("查询场地配置: venue_id={}", venue_id);
        self.venues.get(venue_id)
    }

    /// 获取教师的所有互斥关系
    ///
    /// # 参数
    /// - `teacher_id`: 教师ID
    ///
    /// # 返回
    /// 包含该教师的所有互斥关系的向量
    ///
    /// # 示例
    /// ```rust
    /// use course_scheduling_system::algorithm::types::*;
    /// use std::collections::HashMap;
    ///
    /// let exclusions = vec![
    ///     TeacherMutualExclusion::new_all_time(1, 2),
    ///     TeacherMutualExclusion::new_all_time(1, 3),
    ///     TeacherMutualExclusion::new_all_time(2, 4),
    /// ];
    ///
    /// let graph = ConstraintGraph::new(
    ///     HashMap::new(),
    ///     HashMap::new(),
    ///     HashMap::new(),
    ///     exclusions,
    /// );
    ///
    /// let teacher1_exclusions = graph.get_teacher_exclusions(1);
    /// assert_eq!(teacher1_exclusions.len(), 2);
    ///
    /// let teacher2_exclusions = graph.get_teacher_exclusions(2);
    /// assert_eq!(teacher2_exclusions.len(), 2);
    ///
    /// let teacher4_exclusions = graph.get_teacher_exclusions(4);
    /// assert_eq!(teacher4_exclusions.len(), 1);
    /// ```
    pub fn get_teacher_exclusions(&self, teacher_id: u32) -> Vec<&TeacherMutualExclusion> {
        trace!("查询教师互斥关系: teacher_id={}", teacher_id);
        self.exclusions
            .iter()
            .filter(|e| e.teacher_a_id == teacher_id || e.teacher_b_id == teacher_id)
            .collect()
    }

    /// 检查约束图是否为空
    ///
    /// # 返回
    /// 如果约束图中没有任何配置数据返回 true，否则返回 false
    ///
    /// # 示例
    /// ```rust
    /// use course_scheduling_system::algorithm::types::*;
    /// use std::collections::HashMap;
    ///
    /// let empty_graph = ConstraintGraph::new(
    ///     HashMap::new(),
    ///     HashMap::new(),
    ///     HashMap::new(),
    ///     vec![],
    /// );
    /// assert!(empty_graph.is_empty());
    ///
    /// let mut subject_configs = HashMap::new();
    /// subject_configs.insert(
    ///     "math".to_string(),
    ///     SubjectConfig::new("math".to_string(), "数学".to_string()),
    /// );
    /// let non_empty_graph = ConstraintGraph::new(
    ///     subject_configs,
    ///     HashMap::new(),
    ///     HashMap::new(),
    ///     vec![],
    /// );
    /// assert!(!non_empty_graph.is_empty());
    /// ```
    pub fn is_empty(&self) -> bool {
        self.subject_configs.is_empty()
            && self.teacher_prefs.is_empty()
            && self.venues.is_empty()
            && self.exclusions.is_empty()
    }

    /// 获取统计信息
    ///
    /// # 返回
    /// 包含各类配置数量的元组 (科目数, 教师数, 场地数, 互斥关系数)
    ///
    /// # 示例
    /// ```rust
    /// use course_scheduling_system::algorithm::types::*;
    /// use std::collections::HashMap;
    ///
    /// let mut subject_configs = HashMap::new();
    /// subject_configs.insert(
    ///     "math".to_string(),
    ///     SubjectConfig::new("math".to_string(), "数学".to_string()),
    /// );
    ///
    /// let mut teacher_prefs = HashMap::new();
    /// teacher_prefs.insert(1, TeacherPreference::new(1));
    /// teacher_prefs.insert(2, TeacherPreference::new(2));
    ///
    /// let graph = ConstraintGraph::new(
    ///     subject_configs,
    ///     teacher_prefs,
    ///     HashMap::new(),
    ///     vec![],
    /// );
    ///
    /// let (subjects, teachers, venues, exclusions) = graph.stats();
    /// assert_eq!(subjects, 1);
    /// assert_eq!(teachers, 2);
    /// assert_eq!(venues, 0);
    /// assert_eq!(exclusions, 0);
    /// ```
    pub fn stats(&self) -> (usize, usize, usize, usize) {
        (
            self.subject_configs.len(),
            self.teacher_prefs.len(),
            self.venues.len(),
            self.exclusions.len(),
        )
    }
}

// ============================================================================
// 约束图单元测试
// ============================================================================

#[cfg(test)]
mod constraint_graph_tests {
    use super::*;
    use std::collections::HashMap;

    #[test]
    fn test_constraint_graph_new_empty() {
        // 测试创建空约束图
        let graph = ConstraintGraph::new(HashMap::new(), HashMap::new(), HashMap::new(), vec![]);

        assert!(graph.is_empty());
        assert_eq!(graph.subject_configs.len(), 0);
        assert_eq!(graph.teacher_prefs.len(), 0);
        assert_eq!(graph.venues.len(), 0);
        assert_eq!(graph.exclusions.len(), 0);
    }

    #[test]
    fn test_constraint_graph_new_with_data() {
        // 测试创建包含数据的约束图
        let mut subject_configs = HashMap::new();
        subject_configs.insert(
            "math".to_string(),
            SubjectConfig::new("math".to_string(), "数学".to_string()),
        );
        subject_configs.insert(
            "english".to_string(),
            SubjectConfig::new("english".to_string(), "英语".to_string()),
        );

        let mut teacher_prefs = HashMap::new();
        teacher_prefs.insert(1, TeacherPreference::new(1));
        teacher_prefs.insert(2, TeacherPreference::new(2));

        let mut venues = HashMap::new();
        venues.insert(
            "gym".to_string(),
            Venue::new("gym".to_string(), "体育馆".to_string(), 4),
        );

        let exclusions = vec![TeacherMutualExclusion::new_all_time(1, 2)];

        let graph = ConstraintGraph::new(subject_configs, teacher_prefs, venues, exclusions);

        assert!(!graph.is_empty());
        assert_eq!(graph.subject_configs.len(), 2);
        assert_eq!(graph.teacher_prefs.len(), 2);
        assert_eq!(graph.venues.len(), 1);
        assert_eq!(graph.exclusions.len(), 1);
    }

    #[test]
    fn test_get_subject_config() {
        // 测试获取科目配置
        let mut subject_configs = HashMap::new();
        subject_configs.insert(
            "math".to_string(),
            SubjectConfig::new("math".to_string(), "数学".to_string()),
        );

        let graph = ConstraintGraph::new(subject_configs, HashMap::new(), HashMap::new(), vec![]);

        // 存在的科目
        let config = graph.get_subject_config("math");
        assert!(config.is_some());
        assert_eq!(config.unwrap().id, "math");
        assert_eq!(config.unwrap().name, "数学");

        // 不存在的科目
        let config = graph.get_subject_config("physics");
        assert!(config.is_none());
    }

    #[test]
    fn test_get_teacher_preference() {
        // 测试获取教师偏好
        let mut teacher_prefs = HashMap::new();
        teacher_prefs.insert(1, TeacherPreference::new(1));

        let graph = ConstraintGraph::new(HashMap::new(), teacher_prefs, HashMap::new(), vec![]);

        // 存在的教师
        let pref = graph.get_teacher_preference(1);
        assert!(pref.is_some());
        assert_eq!(pref.unwrap().teacher_id, 1);

        // 不存在的教师
        let pref = graph.get_teacher_preference(999);
        assert!(pref.is_none());
    }

    #[test]
    fn test_get_venue() {
        // 测试获取场地配置
        let mut venues = HashMap::new();
        venues.insert(
            "gym".to_string(),
            Venue::new("gym".to_string(), "体育馆".to_string(), 4),
        );

        let graph = ConstraintGraph::new(HashMap::new(), HashMap::new(), venues, vec![]);

        // 存在的场地
        let venue = graph.get_venue("gym");
        assert!(venue.is_some());
        assert_eq!(venue.unwrap().id, "gym");
        assert_eq!(venue.unwrap().name, "体育馆");
        assert_eq!(venue.unwrap().capacity, 4);

        // 不存在的场地
        let venue = graph.get_venue("lab");
        assert!(venue.is_none());
    }

    #[test]
    fn test_get_teacher_exclusions() {
        // 测试获取教师互斥关系
        let exclusions = vec![
            TeacherMutualExclusion::new_all_time(1, 2),
            TeacherMutualExclusion::new_all_time(1, 3),
            TeacherMutualExclusion::new_all_time(2, 4),
        ];

        let graph =
            ConstraintGraph::new(HashMap::new(), HashMap::new(), HashMap::new(), exclusions);

        // 教师1的互斥关系（与2和3互斥）
        let teacher1_exclusions = graph.get_teacher_exclusions(1);
        assert_eq!(teacher1_exclusions.len(), 2);

        // 教师2的互斥关系（与1和4互斥）
        let teacher2_exclusions = graph.get_teacher_exclusions(2);
        assert_eq!(teacher2_exclusions.len(), 2);

        // 教师3的互斥关系（与1互斥）
        let teacher3_exclusions = graph.get_teacher_exclusions(3);
        assert_eq!(teacher3_exclusions.len(), 1);

        // 教师4的互斥关系（与2互斥）
        let teacher4_exclusions = graph.get_teacher_exclusions(4);
        assert_eq!(teacher4_exclusions.len(), 1);

        // 不存在互斥关系的教师
        let teacher5_exclusions = graph.get_teacher_exclusions(5);
        assert_eq!(teacher5_exclusions.len(), 0);
    }

    #[test]
    fn test_constraint_graph_stats() {
        // 测试统计信息
        let mut subject_configs = HashMap::new();
        subject_configs.insert(
            "math".to_string(),
            SubjectConfig::new("math".to_string(), "数学".to_string()),
        );
        subject_configs.insert(
            "english".to_string(),
            SubjectConfig::new("english".to_string(), "英语".to_string()),
        );

        let mut teacher_prefs = HashMap::new();
        teacher_prefs.insert(1, TeacherPreference::new(1));
        teacher_prefs.insert(2, TeacherPreference::new(2));
        teacher_prefs.insert(3, TeacherPreference::new(3));

        let mut venues = HashMap::new();
        venues.insert(
            "gym".to_string(),
            Venue::new("gym".to_string(), "体育馆".to_string(), 4),
        );

        let exclusions = vec![
            TeacherMutualExclusion::new_all_time(1, 2),
            TeacherMutualExclusion::new_all_time(2, 3),
        ];

        let graph = ConstraintGraph::new(subject_configs, teacher_prefs, venues, exclusions);

        let (subjects, teachers, venues_count, exclusions_count) = graph.stats();
        assert_eq!(subjects, 2);
        assert_eq!(teachers, 3);
        assert_eq!(venues_count, 1);
        assert_eq!(exclusions_count, 2);
    }

    #[test]
    fn test_constraint_graph_is_empty() {
        // 测试空约束图
        let empty_graph =
            ConstraintGraph::new(HashMap::new(), HashMap::new(), HashMap::new(), vec![]);
        assert!(empty_graph.is_empty());

        // 测试非空约束图（只有科目配置）
        let mut subject_configs = HashMap::new();
        subject_configs.insert(
            "math".to_string(),
            SubjectConfig::new("math".to_string(), "数学".to_string()),
        );
        let graph1 = ConstraintGraph::new(subject_configs, HashMap::new(), HashMap::new(), vec![]);
        assert!(!graph1.is_empty());

        // 测试非空约束图（只有教师偏好）
        let mut teacher_prefs = HashMap::new();
        teacher_prefs.insert(1, TeacherPreference::new(1));
        let graph2 = ConstraintGraph::new(HashMap::new(), teacher_prefs, HashMap::new(), vec![]);
        assert!(!graph2.is_empty());

        // 测试非空约束图（只有场地）
        let mut venues = HashMap::new();
        venues.insert(
            "gym".to_string(),
            Venue::new("gym".to_string(), "体育馆".to_string(), 4),
        );
        let graph3 = ConstraintGraph::new(HashMap::new(), HashMap::new(), venues, vec![]);
        assert!(!graph3.is_empty());

        // 测试非空约束图（只有互斥关系）
        let exclusions = vec![TeacherMutualExclusion::new_all_time(1, 2)];
        let graph4 =
            ConstraintGraph::new(HashMap::new(), HashMap::new(), HashMap::new(), exclusions);
        assert!(!graph4.is_empty());
    }
}
