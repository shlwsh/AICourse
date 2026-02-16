<!--
  可拖拽课程列表组件
  使用 vue-draggable-plus 实现课程的拖拽排序

  功能特性：
  - 支持拖拽排序
  - 支持拖拽句柄
  - 平滑的拖拽动画
  - 完整的日志记录
-->
<template>
  <div class="draggable-course-list">
    <!-- 列表标题 -->
    <div v-if="title" class="list-title">
      <span>{{ title }}</span>
      <span class="course-count">（{{ courses.length }} 门课程）</span>
    </div>

    <!-- 可拖拽列表 -->
    <div ref="listRef" class="course-list">
      <div
        v-for="(course, index) in courses"
        :key="course.id"
        class="course-item"
        :class="{ 'is-dragging': isDragging && draggedIndex === index }"
      >
        <!-- 拖拽句柄 -->
        <el-icon class="drag-handle" title="拖动排序">
          <Rank />
        </el-icon>

        <!-- 课程信息 -->
        <div class="course-info">
          <div class="course-name">{{ course.name }}</div>
          <div class="course-meta">
            <span v-if="course.teacherName" class="teacher-name">
              {{ course.teacherName }}
            </span>
            <span v-if="course.sessions" class="sessions">
              {{ course.sessions }} 节/周
            </span>
          </div>
        </div>

        <!-- 操作按钮 -->
        <div class="course-actions">
          <slot name="actions" :course="course" :index="index"></slot>
        </div>
      </div>

      <!-- 空状态 -->
      <div v-if="courses.length === 0" class="empty-state">
        <el-empty description="暂无课程" :image-size="100" />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue';
import { Rank } from '@element-plus/icons-vue';
import { useDraggableCourseList } from '@/composables/useDraggableSchedule';
import { logger } from '@/utils/logger';

// 组件日志
const componentLogger = logger.child({ component: 'DraggableCourseList' });

// Props
interface Course {
  id: number | string;
  name: string;
  teacherName?: string;
  sessions?: number;
  [key: string]: any;
}

interface Props {
  /** 课程列表 */
  modelValue: Course[];
  /** 列表标题 */
  title?: string;
  /** 是否禁用拖拽 */
  disabled?: boolean;
  /** 拖拽动画时长 */
  animation?: number;
}

const props = withDefaults(defineProps<Props>(), {
  title: '',
  disabled: false,
  animation: 150,
});

// Emits
const emit = defineEmits<{
  'update:modelValue': [courses: Course[]];
  change: [oldIndex: number, newIndex: number];
  dragStart: [index: number];
  dragEnd: [index: number];
}>();

// 状态
const listRef = ref<HTMLElement | null>(null);
const courses = ref<Course[]>([...props.modelValue]);
const isDragging = ref(false);
const draggedIndex = ref<number>(-1);

// 初始化拖拽
const draggable = useDraggableCourseList(listRef, courses, {
  animation: props.animation,
  disabled: props.disabled,
  onStart: (event) => {
    isDragging.value = true;
    draggedIndex.value = event.oldIndex;

    componentLogger.info('开始拖拽课程', {
      index: event.oldIndex,
      course: courses.value[event.oldIndex],
    });

    emit('dragStart', event.oldIndex);
  },
  onEnd: (event) => {
    isDragging.value = false;
    const oldIndex = draggedIndex.value;
    draggedIndex.value = -1;

    componentLogger.info('拖拽课程结束', {
      oldIndex: event.oldIndex,
      newIndex: event.newIndex,
    });

    // 如果位置发生变化，触发 change 事件
    if (event.oldIndex !== event.newIndex) {
      componentLogger.info('课程顺序已改变', {
        from: event.oldIndex,
        to: event.newIndex,
      });

      emit('change', event.oldIndex, event.newIndex);
      emit('update:modelValue', [...courses.value]);
    }

    emit('dragEnd', oldIndex);
  },
});

// 监听外部数据变化
watch(
  () => props.modelValue,
  (newValue) => {
    courses.value = [...newValue];
    componentLogger.debug('课程列表更新', {
      count: newValue.length,
    });
  },
  { deep: true }
);

// 监听禁用状态变化
watch(
  () => props.disabled,
  (newValue) => {
    if (draggable.option) {
      draggable.option('disabled', newValue);
      componentLogger.debug('拖拽禁用状态更新', { disabled: newValue });
    }
  }
);
</script>

<style scoped lang="scss">
.draggable-course-list {
  width: 100%;
  background-color: #fff;
  border-radius: 4px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);

  .list-title {
    padding: 16px;
    border-bottom: 1px solid #e0e0e0;
    font-size: 16px;
    font-weight: 600;
    color: #303133;

    .course-count {
      font-size: 14px;
      font-weight: 400;
      color: #909399;
      margin-left: 8px;
    }
  }

  .course-list {
    padding: 8px;
    min-height: 200px;

    .course-item {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 12px;
      margin-bottom: 8px;
      background-color: #fff;
      border: 1px solid #e0e0e0;
      border-radius: 4px;
      transition: all 0.2s ease;
      cursor: move;

      &:hover {
        border-color: #409eff;
        box-shadow: 0 2px 8px rgba(64, 158, 255, 0.1);
      }

      &.is-dragging {
        opacity: 0.5;
      }

      .drag-handle {
        font-size: 18px;
        color: #909399;
        cursor: move;
        flex-shrink: 0;

        &:hover {
          color: #409eff;
        }
      }

      .course-info {
        flex: 1;
        min-width: 0;

        .course-name {
          font-size: 14px;
          font-weight: 500;
          color: #303133;
          margin-bottom: 4px;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .course-meta {
          display: flex;
          gap: 12px;
          font-size: 12px;
          color: #909399;

          .teacher-name,
          .sessions {
            white-space: nowrap;
          }
        }
      }

      .course-actions {
        flex-shrink: 0;
      }
    }

    .empty-state {
      padding: 40px 0;
    }
  }
}

// 拖拽样式
:global(.course-list-ghost) {
  opacity: 0.5;
  background-color: #ecf5ff;
  border: 2px dashed #409eff;
}

:global(.course-list-chosen) {
  cursor: move;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

:global(.course-list-drag) {
  opacity: 0.8;
  transform: rotate(2deg);
}

// 响应式设计
@media (max-width: 768px) {
  .draggable-course-list {
    .list-title {
      padding: 12px;
      font-size: 14px;

      .course-count {
        font-size: 12px;
      }
    }

    .course-list {
      .course-item {
        padding: 10px;
        gap: 8px;

        .drag-handle {
          font-size: 16px;
        }

        .course-info {
          .course-name {
            font-size: 13px;
          }

          .course-meta {
            font-size: 11px;
            gap: 8px;
          }
        }
      }
    }
  }
}
</style>
