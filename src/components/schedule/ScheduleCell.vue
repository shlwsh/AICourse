<!--
  课表单元格组件
  用于显示单个时间槽位的课程信息

  功能特性：
  - 支持拖拽功能（可拖拽和可放置）
  - 显示课程信息（科目、教师）
  - 显示冲突状态（绿色可用、黄色警告、红色禁止）
  - 显示固定课程标识
  - 支持热力图模式下的颜色渲染
  - 包含完整的日志记录
-->
<template>
  <td
    ref="cellRef"
    class="schedule-cell"
    :class="cellClasses"
    :style="cellStyles"
    :data-entity-id="entityId"
    :data-day="slot.day"
    :data-period="slot.period"
    @click="handleCellClick"
    @dragover.prevent="handleDragOver"
    @drop="handleDrop"
    @dragleave="handleDragLeave"
  >
    <!-- 课程卡片 -->
    <div
      v-if="entry"
      class="course-card"
      :draggable="!entry.isFixed"
      @dragstart="handleDragStart"
      @dragend="handleDragEnd"
    >
      <div class="course-content">
        <div class="course-subject">{{ entry.subjectId }}</div>
        <div class="course-teacher">{{ teacherName }}</div>
      </div>

      <!-- 固定课程图标 -->
      <el-icon v-if="entry.isFixed" class="fixed-icon" title="固定课程">
        <Lock />
      </el-icon>

      <!-- 单双周标记 -->
      <span v-if="entry.weekType !== 'Every'" class="week-type-badge">
        {{ weekTypeLabel }}
      </span>
    </div>

    <!-- 空单元格 -->
    <div v-else class="empty-cell">
      <span class="empty-text">-</span>
    </div>

    <!-- 冲突指示器 -->
    <div v-if="showConflictIndicator" class="conflict-indicator" :class="`conflict-${conflict?.severity.toLowerCase()}`">
      <el-icon class="conflict-icon">
        <component :is="conflictIcon" />
      </el-icon>
      <el-tooltip v-if="conflict" :content="conflict.description" placement="top">
        <span class="conflict-tooltip-trigger"></span>
      </el-tooltip>
    </div>

    <!-- 热力图覆盖层 -->
    <div v-if="showHeatmap && entry" class="heatmap-overlay" :style="heatmapStyle"></div>
  </td>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { Lock, CircleCheck, Warning, CircleClose } from '@element-plus/icons-vue';
import { logger } from '@/utils/logger';
import type { ScheduleEntry, TimeSlot, ConflictInfo } from '@/stores/scheduleStore';

// ========== 组件日志 ==========
const componentLogger = logger;

// ========== Props ==========
interface Props {
  /** 实体 ID（班级 ID、教师 ID 或场地 ID） */
  entityId: number;
  /** 时间槽位 */
  slot: TimeSlot;
  /** 课程条目（如果该槽位有课程） */
  entry: ScheduleEntry | null;
  /** 冲突信息 */
  conflict: ConflictInfo | null;
  /** 是否选中 */
  isSelected: boolean;
  /** 是否显示热力图 */
  showHeatmap: boolean;
  /** 教师姓名（用于显示） */
  teacherName?: string;
  /** 是否正在拖拽经过 */
  isDragOver?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  teacherName: '',
  isDragOver: false,
});

// ========== Emits ==========
const emit = defineEmits<{
  /** 单元格点击事件 */
  click: [entityId: number, slot: TimeSlot];
  /** 拖拽开始事件 */
  dragStart: [entry: ScheduleEntry, slot: TimeSlot];
  /** 拖拽结束事件 */
  dragEnd: [];
  /** 拖拽经过事件 */
  dragOver: [entityId: number, slot: TimeSlot];
  /** 拖拽离开事件 */
  dragLeave: [];
  /** 放置事件 */
  drop: [entityId: number, slot: TimeSlot];
}>();

// ========== 状态 ==========
const cellRef = ref<HTMLTableCellElement | null>(null);
const isDragging = ref(false);
const isHovering = ref(false);

// ========== 计算属性 ==========

/**
 * 单元格样式类
 */
const cellClasses = computed(() => {
  const classes: string[] = [];

  // 基础状态
  if (props.entry) {
    classes.push('has-entry');
    if (props.entry.isFixed) {
      classes.push('fixed-entry');
    }
  } else {
    classes.push('empty-entry');
  }

  // 选中状态
  if (props.isSelected) {
    classes.push('selected');
  }

  // 拖拽状态
  if (isDragging.value) {
    classes.push('dragging');
  }

  if (props.isDragOver) {
    classes.push('drag-over');
  }

  // 冲突状态
  if (props.conflict) {
    const severity = props.conflict.severity.toLowerCase();
    classes.push(`conflict-${severity}`);
  }

  // 悬停状态
  if (isHovering.value) {
    classes.push('hovering');
  }

  return classes;
});

/**
 * 单元格内联样式
 */
const cellStyles = computed(() => {
  const styles: Record<string, string> = {};

  // 热力图模式下的背景色
  if (props.showHeatmap && props.entry) {
    // 这里的样式会被 heatmapStyle 覆盖，保持空对象
  }

  return styles;
});

/**
 * 热力图样式
 */
const heatmapStyle = computed(() => {
  if (!props.showHeatmap || !props.entry) {
    return {};
  }

  // TODO: 根据课程的代价值计算热力图颜色
  // 这里使用简单的颜色映射作为示例
  // 实际应该从 store 或 props 获取该课程的代价贡献值
  const intensity = 0.3; // 示例值，实际应该根据代价计算
  const red = Math.floor(255 * intensity);
  const green = Math.floor(255 * (1 - intensity));

  return {
    backgroundColor: `rgba(${red}, ${green}, 0, 0.3)`,
  };
});

/**
 * 是否显示冲突指示器
 */
const showConflictIndicator = computed(() => {
  return props.conflict !== null && props.isSelected;
});

/**
 * 冲突图标组件
 */
const conflictIcon = computed(() => {
  if (!props.conflict) {
    return CircleCheck;
  }

  switch (props.conflict.severity) {
    case 'Available':
      return CircleCheck;
    case 'Warning':
      return Warning;
    case 'Blocked':
      return CircleClose;
    default:
      return CircleCheck;
  }
});

/**
 * 单双周标签
 */
const weekTypeLabel = computed(() => {
  if (!props.entry) {
    return '';
  }

  switch (props.entry.weekType) {
    case 'Odd':
      return '单';
    case 'Even':
      return '双';
    default:
      return '';
  }
});

// ========== 方法 ==========

/**
 * 处理单元格点击
 */
const handleCellClick = (): void => {
  componentLogger.debug('单元格点击', {
    entityId: props.entityId,
    slot: props.slot,
    hasEntry: !!props.entry,
  });

  emit('click', props.entityId, props.slot);
};

/**
 * 处理拖拽开始
 */
const handleDragStart = (event: DragEvent): void => {
  if (!props.entry) {
    event.preventDefault();
    return;
  }

  // 固定课程不允许拖拽
  if (props.entry.isFixed) {
    event.preventDefault();
    componentLogger.warn('尝试拖拽固定课程', {
      entry: props.entry,
    });
    return;
  }

  componentLogger.info('拖拽开始', {
    entry: props.entry,
    slot: props.slot,
  });

  isDragging.value = true;

  // 设置拖拽数据
  if (event.dataTransfer) {
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData(
      'application/json',
      JSON.stringify({
        entry: props.entry,
        slot: props.slot,
      })
    );

    // 创建自定义拖拽图像
    const dragImage = document.createElement('div');
    dragImage.className = 'custom-drag-image';
    dragImage.innerHTML = `
      <div style="
        padding: 8px 12px;
        background: white;
        border: 2px solid #409eff;
        border-radius: 4px;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        font-size: 13px;
        font-weight: 500;
        color: #303133;
        white-space: nowrap;
      ">
        ${props.entry.subjectId}
      </div>
    `;
    dragImage.style.position = 'absolute';
    dragImage.style.top = '-1000px';
    document.body.appendChild(dragImage);

    event.dataTransfer.setDragImage(dragImage, 0, 0);

    // 拖拽结束后移除
    setTimeout(() => {
      document.body.removeChild(dragImage);
    }, 0);
  }

  emit('dragStart', props.entry, props.slot);
};

/**
 * 处理拖拽结束
 */
const handleDragEnd = (): void => {
  componentLogger.debug('拖拽结束');

  isDragging.value = false;
  emit('dragEnd');
};

/**
 * 处理拖拽经过
 */
const handleDragOver = (event: DragEvent): void => {
  event.preventDefault();

  // 设置拖放效果
  if (event.dataTransfer) {
    // 根据冲突状态设置拖放效果
    if (props.conflict && props.conflict.severity === 'Blocked') {
      event.dataTransfer.dropEffect = 'none';
    } else {
      event.dataTransfer.dropEffect = 'move';
    }
  }

  emit('dragOver', props.entityId, props.slot);
};

/**
 * 处理拖拽离开
 */
const handleDragLeave = (): void => {
  emit('dragLeave');
};

/**
 * 处理放置
 */
const handleDrop = (event: DragEvent): void => {
  event.preventDefault();

  componentLogger.info('放置课程', {
    entityId: props.entityId,
    slot: props.slot,
    conflict: props.conflict?.severity,
  });

  // 检查是否允许放置
  if (props.conflict && props.conflict.severity === 'Blocked') {
    componentLogger.warn('放置位置被阻止', {
      conflict: props.conflict,
    });
    return;
  }

  emit('drop', props.entityId, props.slot);
};

// ========== 监听 ==========

/**
 * 监听选中状态变化
 */
watch(
  () => props.isSelected,
  (newValue) => {
    if (newValue) {
      componentLogger.debug('单元格被选中', {
        entityId: props.entityId,
        slot: props.slot,
      });
    }
  }
);

/**
 * 监听冲突信息变化
 */
watch(
  () => props.conflict,
  (newValue) => {
    if (newValue) {
      componentLogger.debug('冲突信息更新', {
        entityId: props.entityId,
        slot: props.slot,
        severity: newValue.severity,
        description: newValue.description,
      });
    }
  }
);
</script>

<style scoped lang="scss">
.schedule-cell {
  position: relative;
  border: 1px solid #e0e0e0;
  padding: 4px;
  text-align: center;
  vertical-align: middle;
  min-height: 60px;
  height: 60px;
  cursor: pointer;
  transition: all 0.2s ease;
  background-color: #fff;

  // ========== 基础状态样式 ==========

  &.has-entry {
    background-color: #fff;
  }

  &.empty-entry {
    background-color: #fafafa;

    &:hover {
      background-color: #f0f0f0;
    }
  }

  &.fixed-entry {
    background-color: #e6f7ff;
    border-color: #91d5ff;
  }

  // ========== 选中状态 ==========

  &.selected {
    border: 2px solid #409eff;
    box-shadow: 0 0 8px rgba(64, 158, 255, 0.3);
    z-index: 10;
  }

  // ========== 拖拽状态 ==========

  &.dragging {
    opacity: 0.5;
    cursor: move;
    border: 2px dashed #409eff;
    background-color: #f0f9ff;
  }

  &.drag-over {
    border: 2px dashed #409eff;
    background-color: #ecf5ff;
    box-shadow: inset 0 0 8px rgba(64, 158, 255, 0.2);
    animation: pulse 1s ease-in-out infinite;

    &.conflict-blocked {
      border-color: #f56c6c;
      background-color: #fef0f0;
      box-shadow: inset 0 0 8px rgba(245, 108, 108, 0.2);
      animation: shake 0.5s ease-in-out;
    }

    &.conflict-warning {
      border-color: #e6a23c;
      background-color: #fdf6ec;
      box-shadow: inset 0 0 8px rgba(230, 162, 60, 0.2);
      animation: pulse 1s ease-in-out infinite;
    }

    &.conflict-available {
      border-color: #67c23a;
      background-color: #f0f9ff;
      box-shadow: inset 0 0 8px rgba(103, 194, 58, 0.2);
      animation: pulse 1s ease-in-out infinite;
    }
  }

  // ========== 冲突状态 ==========

  &.conflict-blocked {
    background-color: #ffebee;
    cursor: not-allowed;

    &:hover {
      background-color: #ffcdd2;
    }
  }

  &.conflict-warning {
    background-color: #fff9c4;

    &:hover {
      background-color: #fff59d;
    }
  }

  &.conflict-available {
    background-color: #e8f5e9;

    &:hover {
      background-color: #c8e6c9;
    }
  }

  // ========== 悬停状态 ==========

  &.hovering:not(.dragging) {
    transform: translateY(-1px);
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  }

  // ========== 课程卡片 ==========

  .course-card {
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    padding: 4px;
    border-radius: 4px;
    background-color: #fff;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
    cursor: move;
    transition: all 0.2s ease;
    position: relative;
    height: 100%;
    min-height: 52px;

    &:hover {
      box-shadow: 0 2px 6px rgba(0, 0, 0, 0.15);
      transform: translateY(-1px);
    }

    .course-content {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 2px;
      width: 100%;
    }

    .course-subject {
      font-size: 13px;
      font-weight: 500;
      color: #303133;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      max-width: 100%;
      line-height: 1.4;
    }

    .course-teacher {
      font-size: 11px;
      color: #909399;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      max-width: 100%;
      line-height: 1.2;
    }

    .fixed-icon {
      position: absolute;
      top: 2px;
      right: 2px;
      font-size: 12px;
      color: #409eff;
      z-index: 1;
    }

    .week-type-badge {
      position: absolute;
      top: 2px;
      left: 2px;
      font-size: 10px;
      font-weight: 600;
      color: #fff;
      background-color: #409eff;
      border-radius: 2px;
      padding: 1px 4px;
      line-height: 1;
      z-index: 1;
    }
  }

  // ========== 空单元格 ==========

  .empty-cell {
    display: flex;
    justify-content: center;
    align-items: center;
    height: 100%;
    min-height: 52px;
    color: #c0c4cc;
    font-size: 12px;

    .empty-text {
      user-select: none;
    }
  }

  // ========== 冲突指示器 ==========

  .conflict-indicator {
    position: absolute;
    top: 4px;
    right: 4px;
    z-index: 2;

    .conflict-icon {
      font-size: 16px;
    }

    &.conflict-available {
      .conflict-icon {
        color: #67c23a;
      }
    }

    &.conflict-warning {
      .conflict-icon {
        color: #e6a23c;
      }
    }

    &.conflict-blocked {
      .conflict-icon {
        color: #f56c6c;
      }
    }

    .conflict-tooltip-trigger {
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
    }
  }

  // ========== 热力图覆盖层 ==========

  .heatmap-overlay {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    pointer-events: none;
    border-radius: 2px;
    transition: background-color 0.3s ease;
  }
}

// ========== 响应式设计 ==========

@media (max-width: 1200px) {
  .schedule-cell {
    min-height: 50px;
    height: 50px;

    .course-card {
      min-height: 42px;

      .course-subject {
        font-size: 12px;
      }

      .course-teacher {
        font-size: 10px;
      }

      .fixed-icon {
        font-size: 11px;
      }

      .week-type-badge {
        font-size: 9px;
        padding: 1px 3px;
      }
    }

    .empty-cell {
      min-height: 42px;
      font-size: 11px;
    }

    .conflict-indicator {
      .conflict-icon {
        font-size: 14px;
      }
    }
  }
}

@media (max-width: 768px) {
  .schedule-cell {
    min-height: 40px;
    height: 40px;
    padding: 2px;

    .course-card {
      min-height: 36px;
      padding: 2px;

      .course-subject {
        font-size: 11px;
      }

      .course-teacher {
        font-size: 9px;
      }

      .fixed-icon {
        font-size: 10px;
        top: 1px;
        right: 1px;
      }

      .week-type-badge {
        font-size: 8px;
        padding: 0px 2px;
        top: 1px;
        left: 1px;
      }
    }

    .empty-cell {
      min-height: 36px;
      font-size: 10px;
    }

    .conflict-indicator {
      top: 2px;
      right: 2px;

      .conflict-icon {
        font-size: 12px;
      }
    }
  }
}

// ========== 打印样式 ==========

@media print {
  .schedule-cell {
    border: 1px solid #000;
    page-break-inside: avoid;

    &.dragging,
    &.drag-over {
      opacity: 1;
      border: 1px solid #000;
      box-shadow: none;
    }

    .course-card {
      box-shadow: none;

      &:hover {
        box-shadow: none;
        transform: none;
      }
    }

    .conflict-indicator {
      display: none;
    }

    .heatmap-overlay {
      display: none;
    }
  }
}

// ========== 拖拽动画 ==========

@keyframes pulse {
  0%, 100% {
    transform: scale(1);
  }
  50% {
    transform: scale(1.02);
  }
}

@keyframes shake {
  0%, 100% {
    transform: translateX(0);
  }
  25% {
    transform: translateX(-4px);
  }
  75% {
    transform: translateX(4px);
  }
}

@keyframes glow {
  0%, 100% {
    box-shadow: inset 0 0 8px rgba(64, 158, 255, 0.2);
  }
  50% {
    box-shadow: inset 0 0 16px rgba(64, 158, 255, 0.4);
  }
}
</style>
