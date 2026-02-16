/**
 * 课表拖拽组合式函数
 * 使用 vue-draggable-plus 增强拖拽功能
 */
import { ref, type Ref } from 'vue';
import { useDraggable, type UseDraggableReturn } from 'vue-draggable-plus';
import { ElMessage } from 'element-plus';
import { logger } from '@/utils/logger';
import type { ScheduleEntry } from '@/stores/scheduleStore';

// 组件日志
const componentLogger = logger;

/**
 * 拖拽配置选项
 */
export interface DraggableScheduleOptions {
  /** 动画时长（毫秒） */
  animation?: number;
  /** 是否禁用拖拽 */
  disabled?: boolean;
  /** 拖拽组名 */
  group?: string;
  /** 拖拽句柄选择器 */
  handle?: string;
  /** 过滤不可拖拽的元素 */
  filter?: string;
  /** 拖拽开始回调 */
  onStart?: (event: any) => void;
  /** 拖拽结束回调 */
  onEnd?: (event: any) => void;
  /** 拖拽移动回调 */
  onMove?: (event: any) => boolean;
}

/**
 * 课表拖拽组合式函数
 *
 * @param el - 容器元素引用
 * @param list - 课程列表
 * @param options - 拖拽配置选项
 * @returns 拖拽实例
 */
export function useDraggableSchedule(
  el: Ref<HTMLElement | null>,
  list: Ref<ScheduleEntry[]>,
  options: DraggableScheduleOptions = {}
): UseDraggableReturn {
  componentLogger.info('初始化课表拖拽', {
    listLength: list.value.length,
    options,
  });

  // 默认配置
  const defaultOptions = {
    animation: 200,
    ghostClass: 'schedule-ghost',
    chosenClass: 'schedule-chosen',
    dragClass: 'schedule-drag',
    group: 'schedule',
    disabled: false,
    ...options,
  };

  // 拖拽状态
  const isDragging = ref(false);
  const draggedEntry = ref<ScheduleEntry | null>(null);

  // 拖拽开始处理
  const handleStart = (event: any): boolean | void => {
    const startTime = Date.now();

    componentLogger.info('拖拽开始', {
      oldIndex: event.oldIndex,
      entry: list.value[event.oldIndex],
      timestamp: new Date().toISOString(),
    });

    isDragging.value = true;
    const entry = list.value[event.oldIndex];
    if (entry) {
      draggedEntry.value = entry;
    }

    // 检查是否为固定课程
    if (draggedEntry.value?.isFixed) {
      componentLogger.warn('尝试拖拽固定课程', {
        entry: draggedEntry.value,
        timestamp: new Date().toISOString(),
      });
      ElMessage.warning('固定课程不允许移动');
      return false;
    }

    // 记录拖拽性能指标
    componentLogger.debug('拖拽初始化耗时', {
      duration: Date.now() - startTime,
      unit: 'ms',
    });

    // 调用用户自定义回调
    if (options.onStart) {
      options.onStart(event);
    }
  };

  // 拖拽结束处理
  const handleEnd = (event: any) => {
    const moved = event.oldIndex !== event.newIndex;

    componentLogger.info('拖拽结束', {
      oldIndex: event.oldIndex,
      newIndex: event.newIndex,
      entry: draggedEntry.value,
      moved,
      timestamp: new Date().toISOString(),
    });

    isDragging.value = false;

    // 检查是否实际移动了位置
    if (moved) {
      componentLogger.info('课程位置已改变', {
        from: event.oldIndex,
        to: event.newIndex,
        entry: draggedEntry.value,
        distance: Math.abs(event.newIndex - event.oldIndex),
      });

      // 记录操作历史（用于撤销/重做）
      componentLogger.debug('记录拖拽操作历史', {
        operation: 'drag',
        oldIndex: event.oldIndex,
        newIndex: event.newIndex,
        timestamp: new Date().toISOString(),
      });
    } else {
      componentLogger.debug('课程位置未改变');
    }

    // 调用用户自定义回调
    if (options.onEnd) {
      options.onEnd(event);
    }

    // 清空拖拽状态
    draggedEntry.value = null;
  };

  // 拖拽移动处理
  const handleMove = (event: any) => {
    // 检查目标位置是否可以放置
    const targetEntry = list.value[event.related];

    // 如果目标位置是固定课程，不允许交换
    if (targetEntry?.isFixed) {
      componentLogger.debug('目标位置是固定课程，不允许交换');
      return false;
    }

    // 调用用户自定义回调
    if (options.onMove) {
      return options.onMove(event);
    }

    return true;
  };

  // 创建拖拽实例
  const draggable = useDraggable(el as any, list, {
    ...defaultOptions,
    onStart: handleStart,
    onEnd: handleEnd,
    onMove: handleMove,
  });

  componentLogger.debug('课表拖拽初始化完成');

  return draggable;
}

/**
 * 课程列表拖拽组合式函数
 * 用于课程管理界面的拖拽排序
 *
 * @param el - 容器元素引用
 * @param list - 课程列表
 * @param options - 拖拽配置选项
 * @returns 拖拽实例
 */
export function useDraggableCourseList<T = any>(
  el: Ref<HTMLElement | null>,
  list: Ref<T[]>,
  options: DraggableScheduleOptions = {}
): UseDraggableReturn {
  componentLogger.info('初始化课程列表拖拽', {
    listLength: list.value.length,
  });

  // 默认配置
  const defaultOptions = {
    animation: 150,
    ghostClass: 'course-list-ghost',
    chosenClass: 'course-list-chosen',
    dragClass: 'course-list-drag',
    handle: '.drag-handle',
    ...options,
  };

  // 拖拽开始处理
  const handleStart = (event: any) => {
    componentLogger.info('课程列表拖拽开始', {
      oldIndex: event.oldIndex,
    });

    if (options.onStart) {
      options.onStart(event);
    }
  };

  // 拖拽结束处理
  const handleEnd = (event: any) => {
    componentLogger.info('课程列表拖拽结束', {
      oldIndex: event.oldIndex,
      newIndex: event.newIndex,
    });

    if (options.onEnd) {
      options.onEnd(event);
    }
  };

  // 创建拖拽实例
  const draggable = useDraggable(el as any, list, {
    ...defaultOptions,
    onStart: handleStart,
    onEnd: handleEnd,
  });

  componentLogger.debug('课程列表拖拽初始化完成');

  return draggable;
}
