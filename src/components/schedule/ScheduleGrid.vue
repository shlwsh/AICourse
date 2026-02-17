<!--
  课表网格组件
  用于显示完整的课表，支持班级、教师、场地三种视图模式
  集成拖拽功能，支持热力图模式切换
-->
<template>
  <div class="schedule-grid-container">
    <!-- 工具栏 -->
    <div class="schedule-toolbar">
      <div class="toolbar-left">
        <el-radio-group v-model="currentViewMode" size="default" @change="handleViewModeChange">
          <el-radio-button value="class">班级视图</el-radio-button>
          <el-radio-button value="teacher">教师视图</el-radio-button>
          <el-radio-button value="venue">场地视图</el-radio-button>
        </el-radio-group>
      </div>

      <div class="toolbar-right">
        <el-switch
          v-model="isHeatmapEnabled"
          active-text="热力图"
          inactive-text="普通"
          @change="handleHeatmapToggle"
        />
        <el-button type="primary" :icon="Refresh" @click="handleRefresh">
          刷新
        </el-button>
      </div>
    </div>

    <!-- 课表网格 -->
    <div class="schedule-grid-wrapper" :class="{ 'heatmap-mode': isHeatmapEnabled }">
      <el-scrollbar>
        <table class="schedule-table">
          <thead>
            <tr>
              <th class="header-cell entity-header">
                {{ viewModeLabel }}
              </th>
              <th
                v-for="day in days"
                :key="`day-${day}`"
                class="header-cell day-header"
                :colspan="periodsPerDay"
              >
                {{ getDayLabel(day) }}
              </th>
            </tr>
            <tr>
              <th class="header-cell period-spacer"></th>
              <template v-for="day in days" :key="`periods-${day}`">
                <th
                  v-for="period in periods"
                  :key="`period-${day}-${period}`"
                  class="header-cell period-header"
                >
                  第{{ period + 1 }}节
                </th>
              </template>
            </tr>
          </thead>
          <tbody>
            <tr v-for="entity in entities" :key="`entity-${entity.id}`" class="entity-row">
              <td class="entity-name-cell">
                <div class="entity-name">{{ entity.name }}</div>
              </td>
              <template v-for="day in days" :key="`day-${entity.id}-${day}`">
                <td
                  v-for="period in periods"
                  :key="`cell-${entity.id}-${day}-${period}`"
                  class="schedule-cell"
                  :class="getCellClass(entity.id, day, period)"
                  :style="getCellStyle(entity.id, day, period)"
                  :data-entity-id="entity.id"
                  :data-day="day"
                  :data-period="period"
                  @click="handleCellClick(entity.id, day, period)"
                  @dragover.prevent="handleDragOver($event, entity.id, day, period)"
                  @drop="handleDrop($event, entity.id, day, period)"
                >
                  <div
                    v-if="getCellEntry(entity.id, day, period)"
                    class="course-card"
                    draggable="true"
                    @dragstart="handleDragStart($event, entity.id, day, period)"
                    @dragend="handleDragEnd"
                  >
                    <div class="course-content">
                      <div class="course-subject">
                        {{ dataStore.getSubjectName(getCellEntry(entity.id, day, period)?.subjectId || '') }}
                      </div>
                      <div class="course-info">
                        <span v-if="currentViewMode === 'class'" class="course-teacher">
                          {{ getTeacherName(getCellEntry(entity.id, day, period)?.teacherId) }}
                        </span>
                        <span v-else-if="currentViewMode === 'teacher'" class="course-class">
                          {{ getClassName(getCellEntry(entity.id, day, period)?.classId) }}
                        </span>
                        <span v-else-if="currentViewMode === 'venue'" class="course-class">
                          {{ getClassName(getCellEntry(entity.id, day, period)?.classId) }}
                        </span>
                      </div>
                    </div>
                    <el-icon v-if="getCellEntry(entity.id, day, period)?.isFixed" class="fixed-icon">
                      <Lock />
                    </el-icon>
                  </div>
                  <div v-else class="empty-cell">
                    <span class="empty-text">-</span>
                  </div>
                </td>
              </template>
            </tr>
          </tbody>
        </table>
      </el-scrollbar>
    </div>

    <!-- 加载状态 -->
    <div v-if="isLoading" class="loading-overlay">
      <el-icon class="is-loading">
        <Loading />
      </el-icon>
      <span>加载中...</span>
    </div>

    <!-- 空状态 -->
    <el-empty
      v-if="!isLoading && !hasSchedule"
      description="暂无课表数据"
      :image-size="200"
    >
      <el-button type="primary" @click="handleGenerate">生成课表</el-button>
    </el-empty>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue';
import { ElMessage } from 'element-plus';
import { Refresh, Lock, Loading } from '@element-plus/icons-vue';
import { useScheduleStore } from '@/stores/scheduleStore';
import { useDataStore } from '@/stores/dataStore';
import { logger } from '@/utils/logger';
import type { ScheduleEntry, TimeSlot } from '@/stores/scheduleStore';

// ========== 组件日志 ==========
const componentLogger = logger;

// ========== Props ==========
interface Props {
  /** 排课周期天数（1-30） */
  cycleDays?: number;
  /** 每天节次数（1-12） */
  periodsPerDay?: number;
}

const props = withDefaults(defineProps<Props>(), {
  cycleDays: 5,
  periodsPerDay: 8,
});

// ========== Emits ==========
const emit = defineEmits<{
  cellClick: [entityId: number, day: number, period: number];
  entryMove: [entry: ScheduleEntry, newSlot: TimeSlot];
  refresh: [];
  generate: [];
}>();

// ========== Store ==========
const scheduleStore = useScheduleStore();
const dataStore = useDataStore();

// ========== 状态 ==========
const isLoading = ref(false);
const currentViewMode = ref<'class' | 'teacher' | 'venue'>('class');
const isHeatmapEnabled = ref(false);
const draggedEntry = ref<{ entityId: number; day: number; period: number } | null>(null);
const dragOverCell = ref<{ entityId: number; day: number; period: number } | null>(null);

// ========== 计算属性 ==========

/** 是否有课表数据 */
const hasSchedule = computed(() => scheduleStore.hasSchedule);

/** 视图模式标签 */
const viewModeLabel = computed(() => {
  const labels = {
    class: '班级',
    teacher: '教师',
    venue: '场地',
  };
  return labels[currentViewMode.value];
});

/** 天数数组 */
const days = computed(() => {
  return Array.from({ length: props.cycleDays }, (_, i) => i);
});

/** 节次数组 */
const periods = computed(() => {
  return Array.from({ length: props.periodsPerDay }, (_, i) => i);
});

/** 实体列表（班级/教师/场地） */
const entities = computed(() => {
  componentLogger.debug('获取实体列表', { viewMode: currentViewMode.value });

  if (!scheduleStore.schedule) {
    return [];
  }

  const entries = scheduleStore.schedule.entries;

  if (currentViewMode.value === 'class') {
    // 从课表条目中提取所有班级ID，并使用 dataStore 获取名称
    const classIds = new Set(entries.map(e => e.classId));
    return Array.from(classIds).sort((a, b) => a - b).map(id => ({
      id,
      name: dataStore.getClassName(id),
    }));
  } else if (currentViewMode.value === 'teacher') {
    // 从课表条目中提取所有教师ID，并使用 dataStore 获取名称
    const teacherIds = new Set(entries.map(e => e.teacherId));
    return Array.from(teacherIds).sort((a, b) => a - b).map(id => ({
      id,
      name: dataStore.getTeacherName(id),
    }));
  } else {
    // 场地视图：从科目配置中获取场地信息
    const venueIds = new Set<string>();

    // 遍历所有科目，收集使用场地的科目
    dataStore.subjects.forEach(subject => {
      if (subject.venue_id) {
        venueIds.add(subject.venue_id);
      }
    });

    if (venueIds.size === 0) {
      componentLogger.warn('没有配置场地的科目');
      return [];
    }

    return Array.from(venueIds).sort().map(id => ({
      id: id as any, // 场地ID是字符串，但为了统一接口使用 any
      name: dataStore.getVenueName(id),
    }));
  }
});

// ========== 方法 ==========

/**
 * 获取天数标签
 */
const getDayLabel = (day: number): string => {
  const dayLabels = ['一', '二', '三', '四', '五', '六', '日'];
  if (day < dayLabels.length) {
    return `星期${dayLabels[day]}`;
  }
  return `第${day + 1}天`;
};

/**
 * 获取单元格的课程条目
 */
const getCellEntry = (entityId: number | string, day: number, period: number): ScheduleEntry | null => {
  if (!scheduleStore.schedule) {
    return null;
  }

  // 根据视图模式查找对应的课程条目
  const entry = scheduleStore.schedule.entries.find((e) => {
    if (currentViewMode.value === 'class') {
      return e.classId === entityId && e.timeSlot.day === day && e.timeSlot.period === period;
    } else if (currentViewMode.value === 'teacher') {
      return e.teacherId === entityId && e.timeSlot.day === day && e.timeSlot.period === period;
    } else if (currentViewMode.value === 'venue') {
      // 场地视图：通过科目的场地ID匹配
      const subject = dataStore.subjectMap.get(e.subjectId);
      return subject?.venue_id === entityId && e.timeSlot.day === day && e.timeSlot.period === period;
    }
    return false;
  });

  return entry || null;
};

/**
 * 获取教师姓名
 */
const getTeacherName = (teacherId: number | undefined): string => {
  if (!teacherId) {
    return '';
  }

  return dataStore.getTeacherName(teacherId);
};

/**
 * 获取班级名称
 */
const getClassName = (classId: number | undefined): string => {
  if (!classId) {
    return '';
  }

  return dataStore.getClassName(classId);
};

/**
 * 获取单元格样式类
 */
const getCellClass = (entityId: number, day: number, period: number): string[] => {
  const classes: string[] = [];

  const entry = getCellEntry(entityId, day, period);
  if (entry) {
    classes.push('has-entry');
    if (entry.isFixed) {
      classes.push('fixed-entry');
    }
  } else {
    classes.push('empty-entry');
  }

  // 拖拽状态
  if (
    draggedEntry.value &&
    draggedEntry.value.entityId === entityId &&
    draggedEntry.value.day === day &&
    draggedEntry.value.period === period
  ) {
    classes.push('dragging');
  }

  if (
    dragOverCell.value &&
    dragOverCell.value.entityId === entityId &&
    dragOverCell.value.day === day &&
    dragOverCell.value.period === period
  ) {
    classes.push('drag-over');
  }

  // 选中状态
  if (
    scheduleStore.selectedEntry &&
    scheduleStore.selectedEntry.timeSlot.day === day &&
    scheduleStore.selectedEntry.timeSlot.period === period
  ) {
    classes.push('selected');
  }

  // 冲突状态
  const conflictKey = `${day}-${period}`;
  const conflict = scheduleStore.conflicts.get(conflictKey);
  if (conflict) {
    if (conflict.severity === 'Blocked') {
      classes.push('conflict-blocked');
    } else if (conflict.severity === 'Warning') {
      classes.push('conflict-warning');
    } else if (conflict.severity === 'Available') {
      classes.push('conflict-available');
    }
  }

  return classes;
};

/**
 * 获取单元格样式（热力图模式）
 */
const getCellStyle = (entityId: number, day: number, period: number): Record<string, string> => {
  if (!isHeatmapEnabled.value) {
    return {};
  }

  const entry = getCellEntry(entityId, day, period);
  if (!entry) {
    return {};
  }

  // TODO: 根据代价值计算热力图颜色
  // 这里使用简单的颜色映射
  const cost = scheduleStore.scheduleCost;
  const intensity = Math.min(cost / 1000, 1);
  const red = Math.floor(255 * intensity);
  const green = Math.floor(255 * (1 - intensity));

  return {
    backgroundColor: `rgba(${red}, ${green}, 0, 0.3)`,
  };
};

/**
 * 处理单元格点击
 */
const handleCellClick = (entityId: number, day: number, period: number): void => {
  componentLogger.info('单元格点击', { entityId, day, period });

  const entry = getCellEntry(entityId, day, period);
  if (entry) {
    scheduleStore.selectEntry(entry);
  } else {
    scheduleStore.selectEntry(null);
  }

  emit('cellClick', entityId, day, period);
};

/**
 * 处理拖拽开始
 */
const handleDragStart = (event: DragEvent, entityId: number, day: number, period: number): void => {
  componentLogger.debug('拖拽开始', { entityId, day, period });

  const entry = getCellEntry(entityId, day, period);
  if (!entry) {
    event.preventDefault();
    return;
  }

  // 固定课程不允许拖拽
  if (entry.isFixed) {
    event.preventDefault();
    ElMessage.warning('固定课程不允许移动');
    return;
  }

  draggedEntry.value = { entityId, day, period };
  scheduleStore.selectEntry(entry);

  // 设置拖拽数据
  if (event.dataTransfer) {
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/plain', JSON.stringify({ entityId, day, period }));
  }
};

/**
 * 处理拖拽经过
 */
const handleDragOver = (event: DragEvent, entityId: number, day: number, period: number): void => {
  event.preventDefault();

  if (!draggedEntry.value) {
    return;
  }

  dragOverCell.value = { entityId, day, period };

  // 实时检测冲突
  const conflictResult = checkDropConflict(entityId, day, period);

  // 根据冲突结果设置拖放效果
  if (event.dataTransfer) {
    if (conflictResult.canDrop) {
      event.dataTransfer.dropEffect = 'move';
    } else {
      event.dataTransfer.dropEffect = 'none';
    }
  }

  // 记录冲突检测日志
  if (!conflictResult.canDrop) {
    componentLogger.debug('拖拽目标位置存在冲突', {
      entityId,
      day,
      period,
      conflicts: conflictResult.conflicts,
    });
  }
};

/**
 * 处理拖拽放下
 */
const handleDrop = async (event: DragEvent, entityId: number, day: number, period: number): Promise<void> => {
  event.preventDefault();
  componentLogger.info('拖拽放下', { entityId, day, period });

  if (!draggedEntry.value) {
    return;
  }

  const entry = getCellEntry(draggedEntry.value.entityId, draggedEntry.value.day, draggedEntry.value.period);
  if (!entry) {
    return;
  }

  // 检查是否可以放置
  const conflictResult = checkDropConflict(entityId, day, period);
  if (!conflictResult.canDrop) {
    componentLogger.warn('放置位置存在冲突', {
      conflicts: conflictResult.conflicts,
    });
    ElMessage.error(`无法放置：${conflictResult.conflicts.join('；')}`);
    return;
  }

  // 检查是否移动到相同位置
  if (
    draggedEntry.value.entityId === entityId &&
    draggedEntry.value.day === day &&
    draggedEntry.value.period === period
  ) {
    return;
  }

  // 显示警告信息（如果有软约束冲突）
  if (conflictResult.conflicts.length > 0) {
    componentLogger.warn('放置位置存在软约束冲突', {
      conflicts: conflictResult.conflicts,
    });
    ElMessage.warning(`注意：${conflictResult.conflicts.join('；')}`);
  }

  try {
    const newSlot: TimeSlot = { day, period };
    await scheduleStore.moveEntry(entry, newSlot);

    componentLogger.info('课程移动成功', {
      from: { day: draggedEntry.value.day, period: draggedEntry.value.period },
      to: newSlot,
    });

    ElMessage.success('课程移动成功');
    emit('entryMove', entry, newSlot);
  } catch (error) {
    componentLogger.error('移动课程失败', { error });
    ElMessage.error('移动课程失败');
  }
};

/**
 * 处理拖拽结束
 */
const handleDragEnd = (): void => {
  componentLogger.debug('拖拽结束');
  draggedEntry.value = null;
  dragOverCell.value = null;
};

/**
 * 检查是否可以放置
 */
const checkCanDrop = (entityId: number, day: number, period: number): boolean => {
  const result = checkDropConflict(entityId, day, period);
  return result.canDrop;
};

/**
 * 检查拖放冲突（增强版）
 */
const checkDropConflict = (
  entityId: number,
  day: number,
  period: number
): { canDrop: boolean; conflicts: string[] } => {
  const conflicts: string[] = [];

  if (!draggedEntry.value) {
    return { canDrop: false, conflicts: ['没有正在拖拽的课程'] };
  }

  const entry = getCellEntry(draggedEntry.value.entityId, draggedEntry.value.day, draggedEntry.value.period);
  if (!entry) {
    return { canDrop: false, conflicts: ['找不到拖拽的课程'] };
  }

  // 1. 检查是否拖到相同位置
  if (
    draggedEntry.value.entityId === entityId &&
    draggedEntry.value.day === day &&
    draggedEntry.value.period === period
  ) {
    return { canDrop: false, conflicts: ['不能拖到相同位置'] };
  }

  // 2. 检查目标位置是否已有课程
  const targetEntry = getCellEntry(entityId, day, period);
  if (targetEntry) {
    // 如果目标位置是固定课程，不允许交换
    if (targetEntry.isFixed) {
      conflicts.push('目标位置是固定课程');
    } else {
      // 可以交换，但需要提示用户
      componentLogger.debug('目标位置已有课程，将进行交换', {
        targetEntry,
      });
    }
  }

  // 3. 检查冲突状态
  const conflictKey = `${day}-${period}`;
  const conflict = scheduleStore.conflicts.get(conflictKey);
  if (conflict) {
    if (conflict.severity === 'Blocked') {
      conflicts.push(conflict.description);
    } else if (conflict.severity === 'Warning') {
      // 警告级别的冲突允许放置，但记录日志
      componentLogger.warn('目标位置存在软约束冲突', {
        conflict: conflict.description,
      });
    }
  }

  // 4. 检查教师时间冲突（如果是班级视图）
  if (currentViewMode.value === 'class') {
    const teacherConflict = checkTeacherTimeConflict(entry.teacherId, day, period, entry);
    if (teacherConflict) {
      conflicts.push(`教师在该时段已有课程：${teacherConflict}`);
    }
  }

  // 5. 检查班级时间冲突（如果是教师视图）
  if (currentViewMode.value === 'teacher') {
    const classConflict = checkClassTimeConflict(entry.classId, day, period, entry);
    if (classConflict) {
      conflicts.push(`班级在该时段已有课程：${classConflict}`);
    }
  }

  const canDrop = conflicts.length === 0 || !conflicts.some(c => c.includes('固定课程') || c.includes('已有课程'));

  return { canDrop, conflicts };
};

/**
 * 检查教师时间冲突
 */
const checkTeacherTimeConflict = (
  teacherId: number,
  day: number,
  period: number,
  excludeEntry: ScheduleEntry
): string | null => {
  if (!scheduleStore.schedule) {
    return null;
  }

  const conflictEntry = scheduleStore.schedule.entries.find((e) => {
    return (
      e.teacherId === teacherId &&
      e.timeSlot.day === day &&
      e.timeSlot.period === period &&
      e.classId !== excludeEntry.classId
    );
  });

  if (conflictEntry) {
    return `班级${conflictEntry.classId}`;
  }

  return null;
};

/**
 * 检查班级时间冲突
 */
const checkClassTimeConflict = (
  classId: number,
  day: number,
  period: number,
  excludeEntry: ScheduleEntry
): string | null => {
  if (!scheduleStore.schedule) {
    return null;
  }

  const conflictEntry = scheduleStore.schedule.entries.find((e) => {
    return (
      e.classId === classId &&
      e.timeSlot.day === day &&
      e.timeSlot.period === period &&
      e.teacherId !== excludeEntry.teacherId
    );
  });

  if (conflictEntry) {
    return `${conflictEntry.subjectId}`;
  }

  return null;
};

/**
 * 处理视图模式切换
 */
const handleViewModeChange = (mode: 'class' | 'teacher' | 'venue'): void => {
  componentLogger.info('切换视图模式', { mode });
  scheduleStore.setViewMode(mode);
};

/**
 * 处理热力图切换
 */
const handleHeatmapToggle = (enabled: boolean): void => {
  componentLogger.info('切换热力图模式', { enabled });
  scheduleStore.toggleHeatmap();
};

/**
 * 处理刷新
 */
const handleRefresh = async (): Promise<void> => {
  componentLogger.info('刷新课表');
  isLoading.value = true;

  try {
    await scheduleStore.loadSchedule();
    ElMessage.success('课表刷新成功');
    emit('refresh');
  } catch (error) {
    componentLogger.error('刷新课表失败', { error });
    ElMessage.error('刷新课表失败');
  } finally {
    isLoading.value = false;
  }
};

/**
 * 处理生成课表
 */
const handleGenerate = (): void => {
  componentLogger.info('触发生成课表');
  emit('generate');
};

/**
 * 加载课表数据
 */
const loadScheduleData = async (): Promise<void> => {
  componentLogger.info('加载课表数据');
  isLoading.value = true;

  try {
    // 先加载基础数据
    await dataStore.loadAllData();

    // 再加载课表数据
    await scheduleStore.loadSchedule();

    componentLogger.info('课表数据加载成功', {
      entryCount: scheduleStore.entryCount,
      cost: scheduleStore.scheduleCost,
    });
  } catch (error) {
    componentLogger.error('加载课表数据失败', { error });
    ElMessage.error('加载课表数据失败');
  } finally {
    isLoading.value = false;
  }
};

// ========== 生命周期 ==========
onMounted(() => {
  componentLogger.info('ScheduleGrid 组件挂载', {
    cycleDays: props.cycleDays,
    periodsPerDay: props.periodsPerDay,
  });

  // 加载课表数据
  loadScheduleData();
});

// ========== 监听 ==========
watch(
  () => scheduleStore.viewMode,
  (newMode) => {
    currentViewMode.value = newMode;
  }
);

watch(
  () => scheduleStore.showHeatmap,
  (newValue) => {
    isHeatmapEnabled.value = newValue;
  }
);
</script>

<style scoped lang="scss">
.schedule-grid-container {
  position: relative;
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  background-color: #fff;
  border-radius: 4px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.schedule-toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px;
  border-bottom: 1px solid #e0e0e0;

  .toolbar-left {
    display: flex;
    gap: 12px;
  }

  .toolbar-right {
    display: flex;
    gap: 12px;
    align-items: center;
  }
}

.schedule-grid-wrapper {
  flex: 1;
  overflow: hidden;
  position: relative;

  &.heatmap-mode {
    .course-card {
      opacity: 0.9;
    }
  }
}

.schedule-table {
  width: 100%;
  border-collapse: collapse;
  table-layout: fixed;
  min-width: 1200px;

  .header-cell {
    background-color: #f5f7fa;
    color: #606266;
    font-weight: 600;
    font-size: 14px;
    padding: 12px 8px;
    text-align: center;
    border: 1px solid #e0e0e0;
    white-space: nowrap;

    &.entity-header {
      width: 120px;
      min-width: 120px;
    }

    &.day-header {
      background-color: #409eff;
      color: #fff;
    }

    &.period-header {
      width: 100px;
      min-width: 100px;
      font-size: 12px;
    }

    &.period-spacer {
      width: 120px;
      min-width: 120px;
    }
  }

  .entity-row {
    &:hover {
      background-color: #f5f7fa;
    }
  }

  .entity-name-cell {
    background-color: #fafafa;
    border: 1px solid #e0e0e0;
    padding: 8px;
    font-weight: 500;
    text-align: center;
    position: sticky;
    left: 0;
    z-index: 10;

    .entity-name {
      font-size: 14px;
      color: #303133;
    }
  }

  .schedule-cell {
    border: 1px solid #e0e0e0;
    padding: 4px;
    text-align: center;
    vertical-align: middle;
    min-height: 80px;
    height: 80px;
    position: relative;
    cursor: pointer;
    transition: all 0.2s ease;

    &.has-entry {
      background-color: #fff;
      padding: 3px;
    }

    &.empty-entry {
      background-color: #fafafa;

      &:hover {
        background-color: #f0f0f0;
      }
    }

    &.fixed-entry {
      background-color: #fff8e1;
    }

    &.selected {
      border: 2px solid #409eff;
      box-shadow: 0 0 8px rgba(64, 158, 255, 0.3);
    }

    &.dragging {
      opacity: 0.5;
      cursor: move;
    }

    &.drag-over {
      border: 2px dashed #409eff;
      background-color: #ecf5ff;
    }

    &.conflict-blocked {
      background-color: #ffebee;
      cursor: not-allowed;

      &::after {
        content: '🚫';
        position: absolute;
        top: 2px;
        right: 2px;
        font-size: 12px;
      }
    }

    &.conflict-warning {
      background-color: #fff9c4;

      &::after {
        content: '⚠️';
        position: absolute;
        top: 2px;
        right: 2px;
        font-size: 12px;
      }
    }

    &.conflict-available {
      background-color: #e8f5e9;

      &::after {
        content: '✓';
        position: absolute;
        top: 2px;
        right: 2px;
        font-size: 12px;
        color: #4caf50;
      }
    }
  }

  .course-card {
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    padding: 8px 6px;
    border-radius: 4px;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: #fff;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
    cursor: move;
    transition: all 0.2s ease;
    position: relative;
    height: 100%;
    min-height: 68px;

    &:hover {
      box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
      transform: translateY(-2px);
    }

    .course-content {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 4px;
      width: 100%;
    }

    .course-subject {
      font-size: 14px;
      font-weight: 600;
      color: #fff;
      text-align: center;
      line-height: 1.4;
      word-break: break-word;
      max-width: 100%;
    }

    .course-info {
      font-size: 12px;
      color: rgba(255, 255, 255, 0.95);
      text-align: center;
      line-height: 1.3;

      .course-teacher,
      .course-class {
        display: inline-block;
        padding: 1px 4px;
        background: rgba(255, 255, 255, 0.2);
        border-radius: 2px;
      }
    }

    .fixed-icon {
      position: absolute;
      top: 2px;
      right: 2px;
      font-size: 12px;
      color: #ffd700;
      filter: drop-shadow(0 1px 2px rgba(0, 0, 0, 0.3));
    }
  }

  .empty-cell {
    display: flex;
    justify-content: center;
    align-items: center;
    height: 100%;
    color: #c0c4cc;
    font-size: 12px;

    .empty-text {
      user-select: none;
    }
  }
}

.loading-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(255, 255, 255, 0.9);
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  gap: 12px;
  z-index: 100;

  .el-icon {
    font-size: 32px;
    color: #409eff;
  }

  span {
    font-size: 14px;
    color: #606266;
  }
}

// 响应式设计
@media (max-width: 1200px) {
  .schedule-table {
    .header-cell {
      &.entity-header,
      &.period-spacer {
        width: 100px;
        min-width: 100px;
      }

      &.period-header {
        width: 80px;
        min-width: 80px;
        font-size: 11px;
      }
    }

    .schedule-cell {
      min-height: 50px;
      height: 50px;
    }

    .course-card {
      padding: 4px 3px;
      min-height: 42px;

      .course-subject {
        font-size: 12px;
      }

      .course-info {
        font-size: 10px;
      }
    }
  }
}

@media (max-width: 768px) {
  .schedule-toolbar {
    flex-direction: column;
    gap: 12px;

    .toolbar-left,
    .toolbar-right {
      width: 100%;
      justify-content: center;
    }
  }

  .schedule-table {
    .header-cell {
      &.entity-header,
      &.period-spacer {
        width: 80px;
        min-width: 80px;
      }

      &.period-header {
        width: 60px;
        min-width: 60px;
        font-size: 10px;
      }
    }

    .schedule-cell {
      min-height: 40px;
      height: 40px;
      padding: 2px;
    }

    .course-card {
      padding: 3px 2px;
      min-height: 36px;

      .course-subject {
        font-size: 11px;
      }

      .course-info {
        font-size: 9px;
      }
    }
  }
}

// 拖拽动画效果
@keyframes dragPulse {
  0%, 100% {
    transform: scale(1);
    opacity: 1;
  }
  50% {
    transform: scale(1.05);
    opacity: 0.9;
  }
}

@keyframes dropBounce {
  0% {
    transform: scale(1);
  }
  50% {
    transform: scale(1.1);
  }
  100% {
    transform: scale(1);
  }
}

@keyframes slideIn {
  from {
    opacity: 0;
    transform: translateY(-10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

// 拖拽状态动画
.schedule-cell {
  &.dragging {
    animation: dragPulse 0.6s ease-in-out;

    .course-card {
      animation: dragPulse 0.6s ease-in-out;
    }
  }

  &.drag-over {
    animation: dropBounce 0.3s ease-in-out;
  }

  .course-card {
    animation: slideIn 0.3s ease-out;
  }
}
</style>
