<!--
  课程卡片组件
  用于显示课程的详细信息，可用于课表网格和其他需要显示课程信息的地方

  功能特性：
  - 显示科目名称、教师姓名、班级信息
  - 显示时间槽位信息（星期、节次）
  - 支持固定课程标识
  - 支持单双周标记
  - 支持不同尺寸（small、default、large）
  - 可选的拖拽功能
  - 包含完整的日志记录
-->
<template>
  <div
    ref="cardRef"
    class="course-card"
    :class="cardClasses"
    :draggable="draggable && !isFixed"
    :data-class-id="classId"
    :data-subject-id="subjectId"
    :data-teacher-id="teacherId"
    @click="handleClick"
    @dragstart="handleDragStart"
    @dragend="handleDragEnd"
  >
    <!-- 固定课程图标 -->
    <el-icon v-if="isFixed" class="fixed-icon" :title="fixedTooltip">
      <Lock />
    </el-icon>

    <!-- 单双周标记 -->
    <span v-if="weekType !== 'Every'" class="week-type-badge" :title="weekTypeTooltip">
      {{ weekTypeLabel }}
    </span>

    <!-- 课程内容 -->
    <div class="course-content">
      <!-- 科目名称 -->
      <div class="course-subject" :title="subjectName">
        {{ subjectName }}
      </div>

      <!-- 教师姓名 -->
      <div v-if="showTeacher" class="course-teacher" :title="teacherName">
        {{ teacherName }}
      </div>

      <!-- 班级信息 -->
      <div v-if="showClass" class="course-class" :title="className">
        {{ className }}
      </div>

      <!-- 时间槽位信息 -->
      <div v-if="showTimeSlot && timeSlot" class="course-time">
        {{ timeSlotLabel }}
      </div>
    </div>

    <!-- 额外信息插槽 -->
    <div v-if="$slots.extra" class="course-extra">
      <slot name="extra"></slot>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { Lock } from '@element-plus/icons-vue';
import { logger } from '@/utils/logger';
import type { TimeSlot } from '@/stores/scheduleStore';

// ========== 组件日志 ==========
const componentLogger = logger;

// ========== Props ==========
interface Props {
  /** 班级 ID */
  classId: number;
  /** 科目 ID */
  subjectId: string;
  /** 教师 ID */
  teacherId: number;
  /** 科目名称 */
  subjectName: string;
  /** 教师姓名 */
  teacherName: string;
  /** 班级名称 */
  className?: string;
  /** 时间槽位 */
  timeSlot?: TimeSlot;
  /** 是否固定课程 */
  isFixed?: boolean;
  /** 单双周类型 */
  weekType?: 'Every' | 'Odd' | 'Even';
  /** 是否可拖拽 */
  draggable?: boolean;
  /** 是否显示教师 */
  showTeacher?: boolean;
  /** 是否显示班级 */
  showClass?: boolean;
  /** 是否显示时间槽位 */
  showTimeSlot?: boolean;
  /** 卡片尺寸 */
  size?: 'small' | 'default' | 'large';
  /** 是否选中 */
  isSelected?: boolean;
  /** 是否悬停 */
  isHovering?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  className: '',
  timeSlot: undefined,
  isFixed: false,
  weekType: 'Every',
  draggable: false,
  showTeacher: true,
  showClass: false,
  showTimeSlot: false,
  size: 'default',
  isSelected: false,
  isHovering: false,
});

// ========== Emits ==========
const emit = defineEmits<{
  /** 点击事件 */
  click: [classId: number, subjectId: string, teacherId: number];
  /** 拖拽开始事件 */
  dragStart: [classId: number, subjectId: string, teacherId: number, timeSlot?: TimeSlot];
  /** 拖拽结束事件 */
  dragEnd: [];
}>();

// ========== 状态 ==========
const cardRef = ref<HTMLDivElement | null>(null);
const isDragging = ref(false);

// ========== 计算属性 ==========

/**
 * 卡片样式类
 */
const cardClasses = computed(() => {
  const classes: string[] = [];

  // 尺寸
  classes.push(`size-${props.size}`);

  // 固定课程
  if (props.isFixed) {
    classes.push('fixed');
  }

  // 选中状态
  if (props.isSelected) {
    classes.push('selected');
  }

  // 悬停状态
  if (props.isHovering) {
    classes.push('hovering');
  }

  // 拖拽状态
  if (isDragging.value) {
    classes.push('dragging');
  }

  // 可拖拽
  if (props.draggable && !props.isFixed) {
    classes.push('draggable');
  }

  return classes;
});

/**
 * 单双周标签
 */
const weekTypeLabel = computed(() => {
  switch (props.weekType) {
    case 'Odd':
      return '单';
    case 'Even':
      return '双';
    default:
      return '';
  }
});

/**
 * 单双周提示文本
 */
const weekTypeTooltip = computed(() => {
  switch (props.weekType) {
    case 'Odd':
      return '单周课程';
    case 'Even':
      return '双周课程';
    default:
      return '';
  }
});

/**
 * 固定课程提示文本
 */
const fixedTooltip = computed(() => {
  return '固定课程（不可移动）';
});

/**
 * 时间槽位标签
 */
const timeSlotLabel = computed(() => {
  if (!props.timeSlot) {
    return '';
  }

  const dayLabels = ['一', '二', '三', '四', '五', '六', '日'];
  const dayLabel = props.timeSlot.day < dayLabels.length
    ? `星期${dayLabels[props.timeSlot.day]}`
    : `第${props.timeSlot.day + 1}天`;

  return `${dayLabel} 第${props.timeSlot.period + 1}节`;
});

// ========== 方法 ==========

/**
 * 处理点击事件
 */
const handleClick = (event: MouseEvent): void => {
  componentLogger.debug('课程卡片点击', {
    classId: props.classId,
    subjectId: props.subjectId,
    teacherId: props.teacherId,
  });

  emit('click', props.classId, props.subjectId, props.teacherId);
};

/**
 * 处理拖拽开始
 */
const handleDragStart = (event: DragEvent): void => {
  // 固定课程不允许拖拽
  if (props.isFixed) {
    event.preventDefault();
    componentLogger.warn('尝试拖拽固定课程', {
      classId: props.classId,
      subjectId: props.subjectId,
    });
    return;
  }

  // 不可拖拽
  if (!props.draggable) {
    event.preventDefault();
    return;
  }

  componentLogger.info('拖拽课程开始', {
    classId: props.classId,
    subjectId: props.subjectId,
    teacherId: props.teacherId,
    timeSlot: props.timeSlot,
  });

  isDragging.value = true;

  // 设置拖拽数据
  if (event.dataTransfer) {
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData(
      'application/json',
      JSON.stringify({
        classId: props.classId,
        subjectId: props.subjectId,
        teacherId: props.teacherId,
        timeSlot: props.timeSlot,
      })
    );

    // 设置拖拽图像（可选）
    const dragImage = cardRef.value?.cloneNode(true) as HTMLElement;
    if (dragImage) {
      dragImage.style.opacity = '0.8';
      dragImage.style.transform = 'rotate(2deg)';
      document.body.appendChild(dragImage);
      event.dataTransfer.setDragImage(dragImage, 0, 0);

      // 拖拽结束后移除克隆元素
      setTimeout(() => {
        document.body.removeChild(dragImage);
      }, 0);
    }
  }

  emit('dragStart', props.classId, props.subjectId, props.teacherId, props.timeSlot);
};

/**
 * 处理拖拽结束
 */
const handleDragEnd = (): void => {
  componentLogger.debug('拖拽课程结束');

  isDragging.value = false;
  emit('dragEnd');
};

// ========== 暴露方法 ==========
defineExpose({
  cardRef,
});
</script>

<style scoped lang="scss">
.course-card {
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  padding: 8px;
  border-radius: 6px;
  background-color: #fff;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  transition: all 0.2s ease;
  position: relative;
  cursor: pointer;
  user-select: none;

  // ========== 尺寸变体 ==========

  &.size-small {
    padding: 4px;
    border-radius: 4px;

    .course-content {
      gap: 2px;
    }

    .course-subject {
      font-size: 11px;
    }

    .course-teacher,
    .course-class,
    .course-time {
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

  &.size-default {
    padding: 8px;
    border-radius: 6px;

    .course-content {
      gap: 4px;
    }

    .course-subject {
      font-size: 13px;
    }

    .course-teacher,
    .course-class,
    .course-time {
      font-size: 11px;
    }

    .fixed-icon {
      font-size: 12px;
      top: 2px;
      right: 2px;
    }

    .week-type-badge {
      font-size: 10px;
      padding: 1px 4px;
      top: 2px;
      left: 2px;
    }
  }

  &.size-large {
    padding: 12px;
    border-radius: 8px;

    .course-content {
      gap: 6px;
    }

    .course-subject {
      font-size: 15px;
    }

    .course-teacher,
    .course-class,
    .course-time {
      font-size: 13px;
    }

    .fixed-icon {
      font-size: 14px;
      top: 4px;
      right: 4px;
    }

    .week-type-badge {
      font-size: 11px;
      padding: 2px 6px;
      top: 4px;
      left: 4px;
    }
  }

  // ========== 状态样式 ==========

  &.fixed {
    background-color: #e6f7ff;
    border: 1px solid #91d5ff;
    cursor: default;
  }

  &.selected {
    border: 2px solid #409eff;
    box-shadow: 0 0 8px rgba(64, 158, 255, 0.4);
    transform: translateY(-2px);
  }

  &.hovering:not(.dragging) {
    box-shadow: 0 4px 8px rgba(0, 0, 0, 0.15);
    transform: translateY(-2px);
  }

  &.dragging {
    opacity: 0.6;
    cursor: move;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
    transform: scale(1.05);
  }

  &.draggable:not(.fixed) {
    cursor: move;

    &:hover {
      box-shadow: 0 3px 6px rgba(0, 0, 0, 0.12);
      transform: translateY(-1px);
    }

    &:active {
      transform: scale(0.98);
    }
  }

  // ========== 固定课程图标 ==========

  .fixed-icon {
    position: absolute;
    color: #409eff;
    z-index: 2;
  }

  // ========== 单双周标记 ==========

  .week-type-badge {
    position: absolute;
    font-weight: 600;
    color: #fff;
    background-color: #409eff;
    border-radius: 3px;
    line-height: 1;
    z-index: 2;
  }

  // ========== 课程内容 ==========

  .course-content {
    display: flex;
    flex-direction: column;
    align-items: center;
    width: 100%;
    z-index: 1;
  }

  .course-subject {
    font-weight: 600;
    color: #303133;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    max-width: 100%;
    line-height: 1.4;
    text-align: center;
  }

  .course-teacher,
  .course-class {
    color: #606266;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    max-width: 100%;
    line-height: 1.3;
    text-align: center;
  }

  .course-time {
    color: #909399;
    font-size: 10px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    max-width: 100%;
    line-height: 1.2;
    text-align: center;
    margin-top: 2px;
  }

  // ========== 额外信息 ==========

  .course-extra {
    margin-top: 4px;
    width: 100%;
    display: flex;
    justify-content: center;
    align-items: center;
  }
}

// ========== 响应式设计 ==========

@media (max-width: 1200px) {
  .course-card {
    &.size-default {
      padding: 6px;

      .course-subject {
        font-size: 12px;
      }

      .course-teacher,
      .course-class,
      .course-time {
        font-size: 10px;
      }
    }

    &.size-large {
      padding: 10px;

      .course-subject {
        font-size: 14px;
      }

      .course-teacher,
      .course-class,
      .course-time {
        font-size: 12px;
      }
    }
  }
}

@media (max-width: 768px) {
  .course-card {
    &.size-default {
      padding: 4px;

      .course-subject {
        font-size: 11px;
      }

      .course-teacher,
      .course-class,
      .course-time {
        font-size: 9px;
      }
    }

    &.size-large {
      padding: 8px;

      .course-subject {
        font-size: 13px;
      }

      .course-teacher,
      .course-class,
      .course-time {
        font-size: 11px;
      }
    }
  }
}

// ========== 打印样式 ==========

@media print {
  .course-card {
    box-shadow: none;
    border: 1px solid #000;
    page-break-inside: avoid;

    &.dragging,
    &.hovering,
    &.selected {
      transform: none;
      box-shadow: none;
      border: 1px solid #000;
    }

    &.fixed {
      border: 1px solid #000;
      background-color: #f0f0f0;
    }

    .fixed-icon {
      display: none;
    }

    .week-type-badge {
      color: #000;
      background-color: #fff;
      border: 1px solid #000;
    }
  }
}
</style>
