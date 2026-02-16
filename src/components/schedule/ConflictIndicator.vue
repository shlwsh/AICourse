<!--
  冲突指示器组件
  用于可视化显示课表冲突状态

  功能特性：
  - 支持三种冲突级别：Available（绿色）、Warning（黄色）、Blocked（红色）
  - 显示冲突类型图标和描述信息
  - 支持 Tooltip 提示详细冲突信息
  - 可配置显示位置和样式
  - 包含完整的中文注释和日志记录
-->
<template>
  <div
    v-if="conflict"
    class="conflict-indicator"
    :class="indicatorClasses"
    :style="indicatorStyles"
  >
    <!-- 冲突图标 -->
    <el-tooltip
      :content="tooltipContent"
      :placement="tooltipPlacement"
      :disabled="!showTooltip"
      :show-after="tooltipDelay"
    >
      <div class="indicator-icon-wrapper">
        <el-icon class="indicator-icon" :size="iconSize">
          <component :is="conflictIcon" />
        </el-icon>
      </div>
    </el-tooltip>

    <!-- 冲突描述（可选） -->
    <div v-if="showDescription" class="indicator-description">
      {{ conflict.description }}
    </div>

    <!-- 冲突详情（可选） -->
    <div v-if="showDetails && conflictDetails" class="indicator-details">
      <div class="details-title">冲突详情：</div>
      <ul class="details-list">
        <li v-for="(detail, index) in conflictDetails" :key="index" class="detail-item">
          {{ detail }}
        </li>
      </ul>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { CircleCheck, Warning, CircleClose, InfoFilled } from '@element-plus/icons-vue';
import { logger } from '@/utils/logger';
import type { ConflictInfo, ConflictSeverity } from '@/stores/scheduleStore';

// ========== 组件日志 ==========
const componentLogger = logger;

// ========== Props ==========
interface Props {
  /** 冲突信息 */
  conflict: ConflictInfo | null;
  /** 是否显示 Tooltip */
  showTooltip?: boolean;
  /** Tooltip 位置 */
  tooltipPlacement?: 'top' | 'bottom' | 'left' | 'right';
  /** Tooltip 延迟显示时间（毫秒） */
  tooltipDelay?: number;
  /** 是否显示描述文本 */
  showDescription?: boolean;
  /** 是否显示详细信息 */
  showDetails?: boolean;
  /** 图标大小 */
  iconSize?: number;
  /** 指示器位置 */
  position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'center';
  /** 自定义样式 */
  customStyle?: Record<string, string>;
}

const props = withDefaults(defineProps<Props>(), {
  showTooltip: true,
  tooltipPlacement: 'top',
  tooltipDelay: 300,
  showDescription: false,
  showDetails: false,
  iconSize: 16,
  position: 'top-right',
  customStyle: () => ({}),
});

// ========== Emits ==========
const emit = defineEmits<{
  /** 点击事件 */
  click: [conflict: ConflictInfo];
  /** 鼠标悬停事件 */
  hover: [conflict: ConflictInfo];
}>();

// ========== 计算属性 ==========

/**
 * 指示器样式类
 */
const indicatorClasses = computed(() => {
  const classes: string[] = [];

  if (!props.conflict) {
    return classes;
  }

  // 冲突严重程度
  const severity = props.conflict.severity.toLowerCase();
  classes.push(`severity-${severity}`);

  // 位置
  classes.push(`position-${props.position}`);

  // 是否显示描述
  if (props.showDescription) {
    classes.push('with-description');
  }

  // 是否显示详情
  if (props.showDetails) {
    classes.push('with-details');
  }

  return classes;
});

/**
 * 指示器内联样式
 */
const indicatorStyles = computed(() => {
  return {
    ...props.customStyle,
  };
});

/**
 * 冲突图标组件
 */
const conflictIcon = computed(() => {
  if (!props.conflict) {
    return InfoFilled;
  }

  switch (props.conflict.severity) {
    case 'Available':
      return CircleCheck;
    case 'Warning':
      return Warning;
    case 'Blocked':
      return CircleClose;
    default:
      componentLogger.warn('未知的冲突严重程度', {
        severity: props.conflict.severity,
      });
      return InfoFilled;
  }
});

/**
 * Tooltip 内容
 */
const tooltipContent = computed(() => {
  if (!props.conflict) {
    return '';
  }

  let content = props.conflict.description;

  // 添加冲突类型信息
  if (props.conflict.conflictType) {
    const typeLabel = getConflictTypeLabel(props.conflict.conflictType);
    content = `${typeLabel}: ${content}`;
  }

  componentLogger.debug('生成 Tooltip 内容', {
    severity: props.conflict.severity,
    content,
  });

  return content;
});

/**
 * 冲突详情列表
 */
const conflictDetails = computed(() => {
  if (!props.conflict || !props.showDetails) {
    return null;
  }

  const details: string[] = [];

  // 根据冲突类型添加详细信息
  if (props.conflict.conflictType) {
    const typeDetails = getConflictTypeDetails(props.conflict.conflictType);
    details.push(...typeDetails);
  }

  // 添加时间槽位信息
  if (props.conflict.slot) {
    const dayLabels = ['一', '二', '三', '四', '五', '六', '日'];
    const dayLabel = props.conflict.slot.day < dayLabels.length
      ? `星期${dayLabels[props.conflict.slot.day]}`
      : `第${props.conflict.slot.day + 1}天`;
    details.push(`时间：${dayLabel} 第${props.conflict.slot.period + 1}节`);
  }

  return details.length > 0 ? details : null;
});

// ========== 方法 ==========

/**
 * 获取冲突类型标签
 */
const getConflictTypeLabel = (conflictType: any): string => {
  if (typeof conflictType === 'object') {
    if ('HardConstraint' in conflictType) {
      return getHardConstraintLabel(conflictType.HardConstraint);
    } else if ('SoftConstraint' in conflictType) {
      return getSoftConstraintLabel(conflictType.SoftConstraint);
    }
  }

  return '未知冲突';
};

/**
 * 获取硬约束标签
 */
const getHardConstraintLabel = (violation: string): string => {
  const labels: Record<string, string> = {
    TeacherBusy: '教师时间冲突',
    ClassBusy: '班级时间冲突',
    ForbiddenSlot: '禁止时段',
    TeacherBlocked: '教师不排课时段',
    VenueOverCapacity: '场地容量超限',
    TeacherMutualExclusion: '教师互斥约束',
    NoDoubleSession: '不允许连堂',
  };

  return labels[violation] || '硬约束冲突';
};

/**
 * 获取软约束标签
 */
const getSoftConstraintLabel = (violation: string): string => {
  const labels: Record<string, string> = {
    TeacherPreference: '教师偏好',
    TimeBias: '早晚偏好',
    ConsecutiveMajorSubject: '主科连续',
    ProgressInconsistency: '进度不一致',
  };

  return labels[violation] || '软约束冲突';
};

/**
 * 获取冲突类型详细信息
 */
const getConflictTypeDetails = (conflictType: any): string[] => {
  const details: string[] = [];

  if (typeof conflictType === 'object') {
    if ('HardConstraint' in conflictType) {
      const violation = conflictType.HardConstraint;
      details.push(`类型：硬约束冲突`);
      details.push(`原因：${getHardConstraintLabel(violation)}`);
      details.push(`说明：该位置不允许放置课程`);
    } else if ('SoftConstraint' in conflictType) {
      const violation = conflictType.SoftConstraint;
      details.push(`类型：软约束冲突`);
      details.push(`原因：${getSoftConstraintLabel(violation)}`);
      details.push(`说明：可以放置但不推荐`);
    }
  }

  return details;
};

/**
 * 处理点击事件
 */
const handleClick = (): void => {
  if (!props.conflict) {
    return;
  }

  componentLogger.info('冲突指示器点击', {
    severity: props.conflict.severity,
    description: props.conflict.description,
  });

  emit('click', props.conflict);
};

/**
 * 处理鼠标悬停事件
 */
const handleHover = (): void => {
  if (!props.conflict) {
    return;
  }

  componentLogger.debug('冲突指示器悬停', {
    severity: props.conflict.severity,
  });

  emit('hover', props.conflict);
};
</script>

<style scoped lang="scss">
.conflict-indicator {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  position: relative;
  z-index: 10;
  transition: all 0.2s ease;

  // ========== 位置样式 ==========

  &.position-top-left {
    position: absolute;
    top: 4px;
    left: 4px;
  }

  &.position-top-right {
    position: absolute;
    top: 4px;
    right: 4px;
  }

  &.position-bottom-left {
    position: absolute;
    bottom: 4px;
    left: 4px;
  }

  &.position-bottom-right {
    position: absolute;
    bottom: 4px;
    right: 4px;
  }

  &.position-center {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
  }

  // ========== 严重程度样式 ==========

  &.severity-available {
    .indicator-icon {
      color: #67c23a;
    }

    .indicator-description {
      color: #67c23a;
    }
  }

  &.severity-warning {
    .indicator-icon {
      color: #e6a23c;
    }

    .indicator-description {
      color: #e6a23c;
    }
  }

  &.severity-blocked {
    .indicator-icon {
      color: #f56c6c;
    }

    .indicator-description {
      color: #f56c6c;
    }
  }

  // ========== 图标包装器 ==========

  .indicator-icon-wrapper {
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transition: transform 0.2s ease;

    &:hover {
      transform: scale(1.1);
    }

    &:active {
      transform: scale(0.95);
    }
  }

  .indicator-icon {
    display: flex;
    align-items: center;
    justify-content: center;
    filter: drop-shadow(0 1px 2px rgba(0, 0, 0, 0.1));
  }

  // ========== 描述文本 ==========

  .indicator-description {
    font-size: 12px;
    font-weight: 500;
    line-height: 1.4;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    max-width: 200px;
  }

  // ========== 详细信息 ==========

  &.with-details {
    flex-direction: column;
    align-items: flex-start;
    padding: 8px;
    background-color: rgba(255, 255, 255, 0.95);
    border-radius: 4px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
    max-width: 300px;
  }

  .indicator-details {
    margin-top: 8px;
    font-size: 12px;
    line-height: 1.5;

    .details-title {
      font-weight: 600;
      color: #303133;
      margin-bottom: 4px;
    }

    .details-list {
      list-style: none;
      padding: 0;
      margin: 0;

      .detail-item {
        color: #606266;
        padding: 2px 0;
        padding-left: 12px;
        position: relative;

        &::before {
          content: '•';
          position: absolute;
          left: 0;
          color: #909399;
        }
      }
    }
  }

  // ========== 带描述样式 ==========

  &.with-description {
    padding: 4px 8px;
    background-color: rgba(255, 255, 255, 0.9);
    border-radius: 4px;
    box-shadow: 0 1px 4px rgba(0, 0, 0, 0.1);
  }

  // ========== 悬停效果 ==========

  &:hover {
    .indicator-icon-wrapper {
      .indicator-icon {
        filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.2));
      }
    }

    &.with-description,
    &.with-details {
      box-shadow: 0 3px 12px rgba(0, 0, 0, 0.2);
    }
  }
}

// ========== 响应式设计 ==========

@media (max-width: 1200px) {
  .conflict-indicator {
    &.position-top-left,
    &.position-top-right,
    &.position-bottom-left,
    &.position-bottom-right {
      top: 2px;
      right: 2px;
      bottom: 2px;
      left: 2px;
    }

    .indicator-description {
      font-size: 11px;
      max-width: 150px;
    }

    .indicator-details {
      font-size: 11px;
      max-width: 250px;
    }
  }
}

@media (max-width: 768px) {
  .conflict-indicator {
    &.position-top-left,
    &.position-top-right,
    &.position-bottom-left,
    &.position-bottom-right {
      top: 1px;
      right: 1px;
      bottom: 1px;
      left: 1px;
    }

    .indicator-description {
      font-size: 10px;
      max-width: 120px;
    }

    .indicator-details {
      font-size: 10px;
      max-width: 200px;

      .details-list {
        .detail-item {
          padding-left: 10px;
        }
      }
    }

    &.with-description,
    &.with-details {
      padding: 4px 6px;
    }
  }
}

// ========== 打印样式 ==========

@media print {
  .conflict-indicator {
    position: static;
    transform: none;
    box-shadow: none;
    background-color: transparent;

    .indicator-icon {
      filter: none;
    }

    .indicator-description {
      color: #000;
    }

    .indicator-details {
      display: none;
    }

    &:hover {
      box-shadow: none;

      .indicator-icon-wrapper {
        transform: none;

        .indicator-icon {
          filter: none;
        }
      }
    }
  }
}

// ========== 动画效果 ==========

@keyframes pulse {
  0%,
  100% {
    opacity: 1;
  }
  50% {
    opacity: 0.7;
  }
}

.conflict-indicator {
  &.severity-blocked {
    .indicator-icon {
      animation: pulse 1.5s ease-in-out infinite;
    }
  }
}
</style>
