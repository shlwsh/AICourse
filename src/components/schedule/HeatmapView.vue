<!--
  热力图视图组件
  用于可视化显示课表中软约束违反程度

  功能特性：
  - 根据软约束违反程度为单元格着色（颜色越深表示违反越严重）
  - 支持热力图模式切换
  - 显示热力图图例
  - 点击单元格显示具体的软约束违反详情
  - 支持不同的颜色方案（红绿、蓝黄等）
  - 包含完整的日志记录
-->
<template>
  <div class="heatmap-view-container">
    <!-- 工具栏 -->
    <div class="heatmap-toolbar">
      <div class="toolbar-left">
        <el-switch
          v-model="isEnabled"
          active-text="热力图模式"
          inactive-text="普通模式"
          size="default"
          @change="handleToggle"
        />

        <el-select
          v-model="colorScheme"
          placeholder="选择配色方案"
          size="default"
          style="width: 150px"
          :disabled="!isEnabled"
          @change="handleColorSchemeChange"
        >
          <el-option label="红绿渐变" value="red-green" />
          <el-option label="蓝黄渐变" value="blue-yellow" />
          <el-option label="热力渐变" value="heat" />
          <el-option label="灰度渐变" value="grayscale" />
        </el-select>
      </div>

      <div class="toolbar-right">
        <el-button
          :icon="InfoFilled"
          size="default"
          @click="showLegendDialog = true"
        >
          图例说明
        </el-button>
      </div>
    </div>

    <!-- 热力图网格 -->
    <div v-if="isEnabled" class="heatmap-grid-wrapper">
      <el-scrollbar>
        <table class="heatmap-table">
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
                  class="heatmap-cell"
                  :class="getHeatmapCellClass(entity.id, day, period)"
                  :style="getHeatmapCellStyle(entity.id, day, period)"
                  :data-entity-id="entity.id"
                  :data-day="day"
                  :data-period="period"
                  @click="handleCellClick(entity.id, day, period)"
                >
                  <div class="cell-content">
                    <div v-if="getCellEntry(entity.id, day, period)" class="course-info">
                      <div class="course-subject">
                        {{ getCellEntry(entity.id, day, period)?.subjectId }}
                      </div>
                      <div class="course-teacher">
                        {{ getTeacherName(getCellEntry(entity.id, day, period)?.teacherId) }}
                      </div>
                    </div>
                    <div v-else class="empty-cell">-</div>

                    <!-- 代价值显示 -->
                    <div v-if="getCellCost(entity.id, day, period) > 0" class="cost-badge">
                      {{ getCellCost(entity.id, day, period) }}
                    </div>
                  </div>
                </td>
              </template>
            </tr>
          </tbody>
        </table>
      </el-scrollbar>
    </div>

    <!-- 图例对话框 -->
    <el-dialog
      v-model="showLegendDialog"
      title="热力图图例说明"
      width="500px"
    >
      <div class="legend-content">
        <div class="legend-description">
          <p>热力图通过颜色深度表示软约束违反程度：</p>
          <ul>
            <li>颜色越深，表示该时段的软约束违反越严重</li>
            <li>颜色越浅，表示该时段的软约束违反越轻微</li>
            <li>无颜色（白色），表示该时段无软约束违反</li>
          </ul>
        </div>

        <div class="legend-scale">
          <div class="scale-title">代价值范围：</div>
          <div class="scale-bar" :style="getLegendGradient()">
            <span class="scale-label scale-min">0</span>
            <span class="scale-label scale-mid">{{ Math.floor(maxCost / 2) }}</span>
            <span class="scale-label scale-max">{{ maxCost }}</span>
          </div>
        </div>

        <div class="legend-violations">
          <div class="violations-title">常见软约束违反类型：</div>
          <ul>
            <li><strong>教师时段偏好违反</strong>：教师被安排在非偏好时段（代价：10 × 权重）</li>
            <li><strong>教师早晚偏好违反</strong>：厌恶早课的教师被安排第1节，或厌恶晚课的教师被安排最后一节（代价：50）</li>
            <li><strong>主科连续3节</strong>：主科课程连续安排3节或更多（代价：30 × 超出节数）</li>
            <li><strong>进度不一致</strong>：同一教师多班课程时间差超过2天（代价：20 × 超出天数）</li>
          </ul>
        </div>
      </div>

      <template #footer>
        <el-button type="primary" @click="showLegendDialog = false">
          关闭
        </el-button>
      </template>
    </el-dialog>

    <!-- 详情对话框 -->
    <el-dialog
      v-model="showDetailDialog"
      title="软约束违反详情"
      width="600px"
    >
      <div v-if="selectedCellDetail" class="detail-content">
        <div class="detail-header">
          <div class="detail-info">
            <span class="detail-label">位置：</span>
            <span class="detail-value">
              {{ getDayLabel(selectedCellDetail.slot.day) }} 第{{ selectedCellDetail.slot.period + 1 }}节
            </span>
          </div>
          <div class="detail-info">
            <span class="detail-label">课程：</span>
            <span class="detail-value">
              {{ selectedCellDetail.entry?.subjectId || '-' }}
            </span>
          </div>
          <div class="detail-info">
            <span class="detail-label">教师：</span>
            <span class="detail-value">
              {{ getTeacherName(selectedCellDetail.entry?.teacherId) }}
            </span>
          </div>
          <div class="detail-info">
            <span class="detail-label">代价值：</span>
            <span class="detail-value cost-value">
              {{ selectedCellDetail.cost }}
            </span>
          </div>
        </div>

        <el-divider />

        <div class="violations-list">
          <div class="violations-title">违反的软约束：</div>
          <el-empty
            v-if="selectedCellDetail.violations.length === 0"
            description="无软约束违反"
            :image-size="80"
          />
          <div
            v-for="(violation, index) in selectedCellDetail.violations"
            :key="index"
            class="violation-item"
          >
            <div class="violation-header">
              <el-tag :type="getViolationTagType(violation.type)" size="small">
                {{ violation.type }}
              </el-tag>
              <span class="violation-cost">+{{ violation.cost }}</span>
            </div>
            <div class="violation-description">
              {{ violation.description }}
            </div>
          </div>
        </div>
      </div>

      <template #footer>
        <el-button type="primary" @click="showDetailDialog = false">
          关闭
        </el-button>
      </template>
    </el-dialog>

    <!-- 加载状态 -->
    <div v-if="isLoading" class="loading-overlay">
      <el-icon class="is-loading">
        <Loading />
      </el-icon>
      <span>计算热力图数据...</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue';
import { ElMessage } from 'element-plus';
import { InfoFilled, Loading } from '@element-plus/icons-vue';
import { useScheduleStore } from '@/stores/scheduleStore';
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
  toggle: [enabled: boolean];
  cellClick: [entityId: number, day: number, period: number];
}>();

// ========== Store ==========
const scheduleStore = useScheduleStore();

// ========== 状态 ==========
const isEnabled = ref(false);
const isLoading = ref(false);
const colorScheme = ref<'red-green' | 'blue-yellow' | 'heat' | 'grayscale'>('red-green');
const showLegendDialog = ref(false);
const showDetailDialog = ref(false);

// 单元格代价值映射
const cellCostMap = ref<Map<string, number>>(new Map());

// 软约束违反详情映射
const cellViolationsMap = ref<Map<string, ViolationDetail[]>>(new Map());

// 选中单元格的详情
const selectedCellDetail = ref<{
  slot: TimeSlot;
  entry: ScheduleEntry | null;
  cost: number;
  violations: ViolationDetail[];
} | null>(null);

// ========== 接口定义 ==========

/** 违反详情 */
interface ViolationDetail {
  type: string;
  description: string;
  cost: number;
}

// ========== 计算属性 ==========

/** 视图模式标签 */
const viewModeLabel = computed(() => {
  const labels = {
    class: '班级',
    teacher: '教师',
    venue: '场地',
  };
  return labels[scheduleStore.viewMode];
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
  // TODO: 根据视图模式从 store 获取对应的实体列表
  componentLogger.debug('获取实体列表', { viewMode: scheduleStore.viewMode });

  if (scheduleStore.viewMode === 'class') {
    return [
      { id: 1, name: '一年级1班' },
      { id: 2, name: '一年级2班' },
      { id: 3, name: '二年级1班' },
    ];
  } else if (scheduleStore.viewMode === 'teacher') {
    return [
      { id: 101, name: '张老师' },
      { id: 102, name: '李老师' },
      { id: 103, name: '王老师' },
    ];
  } else {
    return [
      { id: 201, name: '操场' },
      { id: 202, name: '微机室' },
      { id: 203, name: '音乐室' },
    ];
  }
});

/** 最大代价值 */
const maxCost = computed(() => {
  let max = 0;
  cellCostMap.value.forEach((cost) => {
    if (cost > max) {
      max = cost;
    }
  });
  return max || 100; // 默认最大值100
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
const getCellEntry = (entityId: number, day: number, period: number): ScheduleEntry | null => {
  if (!scheduleStore.schedule) {
    return null;
  }

  const entry = scheduleStore.schedule.entries.find((e) => {
    if (scheduleStore.viewMode === 'class') {
      return e.classId === entityId && e.timeSlot.day === day && e.timeSlot.period === period;
    } else if (scheduleStore.viewMode === 'teacher') {
      return e.teacherId === entityId && e.timeSlot.day === day && e.timeSlot.period === period;
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
  // TODO: 从 teacherStore 获取教师姓名
  return `教师${teacherId}`;
};

/**
 * 获取单元格代价值
 */
const getCellCost = (entityId: number, day: number, period: number): number => {
  const key = `${entityId}-${day}-${period}`;
  return cellCostMap.value.get(key) || 0;
};

/**
 * 获取热力图单元格样式类
 */
const getHeatmapCellClass = (entityId: number, day: number, period: number): string[] => {
  const classes: string[] = [];

  const entry = getCellEntry(entityId, day, period);
  if (entry) {
    classes.push('has-entry');
  } else {
    classes.push('empty-entry');
  }

  const cost = getCellCost(entityId, day, period);
  if (cost > 0) {
    classes.push('has-cost');
  }

  return classes;
};

/**
 * 获取热力图单元格样式
 */
const getHeatmapCellStyle = (entityId: number, day: number, period: number): Record<string, string> => {
  const cost = getCellCost(entityId, day, period);

  if (cost === 0) {
    return {};
  }

  // 计算颜色强度（0-1）
  const intensity = Math.min(cost / maxCost.value, 1);

  return {
    backgroundColor: getColorForIntensity(intensity),
  };
};

/**
 * 根据强度获取颜色
 */
const getColorForIntensity = (intensity: number): string => {
  switch (colorScheme.value) {
    case 'red-green': {
      // 红绿渐变：绿色(0) -> 黄色(0.5) -> 红色(1)
      const red = Math.floor(255 * intensity);
      const green = Math.floor(255 * (1 - intensity));
      return `rgba(${red}, ${green}, 0, ${0.3 + intensity * 0.5})`;
    }
    case 'blue-yellow': {
      // 蓝黄渐变：蓝色(0) -> 青色(0.5) -> 黄色(1)
      const red = Math.floor(255 * intensity);
      const green = Math.floor(255 * intensity);
      const blue = Math.floor(255 * (1 - intensity));
      return `rgba(${red}, ${green}, ${blue}, ${0.3 + intensity * 0.5})`;
    }
    case 'heat': {
      // 热力渐变：深蓝(0) -> 紫色(0.33) -> 红色(0.66) -> 黄色(1)
      let r, g, b;
      if (intensity < 0.33) {
        const t = intensity / 0.33;
        r = Math.floor(128 * t);
        g = 0;
        b = Math.floor(255 * (1 - t * 0.5));
      } else if (intensity < 0.66) {
        const t = (intensity - 0.33) / 0.33;
        r = Math.floor(128 + 127 * t);
        g = 0;
        b = Math.floor(128 * (1 - t));
      } else {
        const t = (intensity - 0.66) / 0.34;
        r = 255;
        g = Math.floor(255 * t);
        b = 0;
      }
      return `rgba(${r}, ${g}, ${b}, ${0.4 + intensity * 0.4})`;
    }
    case 'grayscale': {
      // 灰度渐变：白色(0) -> 黑色(1)
      const gray = Math.floor(255 * (1 - intensity));
      return `rgba(${gray}, ${gray}, ${gray}, 0.8)`;
    }
    default:
      return 'rgba(255, 0, 0, 0.3)';
  }
};

/**
 * 获取图例渐变样式
 */
const getLegendGradient = (): Record<string, string> => {
  let gradient = '';

  switch (colorScheme.value) {
    case 'red-green':
      gradient = 'linear-gradient(to right, rgba(0, 255, 0, 0.5), rgba(255, 255, 0, 0.7), rgba(255, 0, 0, 0.8))';
      break;
    case 'blue-yellow':
      gradient = 'linear-gradient(to right, rgba(0, 0, 255, 0.5), rgba(0, 255, 255, 0.7), rgba(255, 255, 0, 0.8))';
      break;
    case 'heat':
      gradient = 'linear-gradient(to right, rgba(0, 0, 255, 0.6), rgba(128, 0, 255, 0.7), rgba(255, 0, 0, 0.8), rgba(255, 255, 0, 0.8))';
      break;
    case 'grayscale':
      gradient = 'linear-gradient(to right, rgba(255, 255, 255, 0.8), rgba(128, 128, 128, 0.8), rgba(0, 0, 0, 0.8))';
      break;
  }

  return {
    background: gradient,
  };
};

/**
 * 获取违反类型的标签类型
 */
const getViolationTagType = (type: string): 'success' | 'warning' | 'danger' | 'info' => {
  if (type.includes('偏好')) {
    return 'warning';
  } else if (type.includes('连续')) {
    return 'danger';
  } else if (type.includes('进度')) {
    return 'info';
  }
  return 'warning';
};

/**
 * 处理热力图切换
 */
const handleToggle = (enabled: boolean): void => {
  componentLogger.info('切换热力图模式', { enabled });

  if (enabled) {
    calculateHeatmapData();
  }

  emit('toggle', enabled);
};

/**
 * 处理配色方案切换
 */
const handleColorSchemeChange = (scheme: string): void => {
  componentLogger.info('切换配色方案', { scheme });
};

/**
 * 处理单元格点击
 */
const handleCellClick = (entityId: number, day: number, period: number): void => {
  componentLogger.info('单元格点击', { entityId, day, period });

  const entry = getCellEntry(entityId, day, period);
  const cost = getCellCost(entityId, day, period);
  const key = `${entityId}-${day}-${period}`;
  const violations = cellViolationsMap.value.get(key) || [];

  selectedCellDetail.value = {
    slot: { day, period },
    entry,
    cost,
    violations,
  };

  showDetailDialog.value = true;
  emit('cellClick', entityId, day, period);
};

/**
 * 计算热力图数据
 */
const calculateHeatmapData = async (): Promise<void> => {
  if (!scheduleStore.schedule) {
    componentLogger.warn('没有课表数据，无法计算热力图');
    return;
  }

  componentLogger.info('开始计算热力图数据');
  isLoading.value = true;

  try {
    // 清空现有数据
    cellCostMap.value.clear();
    cellViolationsMap.value.clear();

    // 遍历所有课表条目，计算每个单元格的代价值
    for (const entry of scheduleStore.schedule.entries) {
      const entityId = scheduleStore.viewMode === 'class' ? entry.classId : entry.teacherId;
      const key = `${entityId}-${entry.timeSlot.day}-${entry.timeSlot.period}`;

      // 计算该课程的软约束违反代价
      const { cost, violations } = await calculateEntryCost(entry);

      cellCostMap.value.set(key, cost);
      cellViolationsMap.value.set(key, violations);
    }

    componentLogger.info('热力图数据计算完成', {
      totalCells: cellCostMap.value.size,
      maxCost: maxCost.value,
    });
  } catch (error) {
    componentLogger.error('计算热力图数据失败', { error });
    ElMessage.error('计算热力图数据失败');
  } finally {
    isLoading.value = false;
  }
};

/**
 * 计算单个课程条目的代价值
 */
const calculateEntryCost = async (entry: ScheduleEntry): Promise<{ cost: number; violations: ViolationDetail[] }> => {
  const violations: ViolationDetail[] = [];
  let totalCost = 0;

  // TODO: 调用后端 API 获取该课程的软约束违反详情
  // 这里使用模拟数据

  // 模拟：教师时段偏好违反
  if (Math.random() > 0.7) {
    const cost = 10;
    totalCost += cost;
    violations.push({
      type: '教师时段偏好违反',
      description: `教师被安排在非偏好时段`,
      cost,
    });
  }

  // 模拟：教师早晚偏好违反
  if (entry.timeSlot.period === 0 && Math.random() > 0.8) {
    const cost = 50;
    totalCost += cost;
    violations.push({
      type: '教师早晚偏好违反',
      description: `厌恶早课的教师被安排在第1节`,
      cost,
    });
  }

  // 模拟：主科连续3节
  if (Math.random() > 0.9) {
    const cost = 30;
    totalCost += cost;
    violations.push({
      type: '主科连续3节',
      description: `主科课程连续安排3节或更多`,
      cost,
    });
  }

  componentLogger.debug('计算课程代价', {
    entry,
    cost: totalCost,
    violationCount: violations.length,
  });

  return { cost: totalCost, violations };
};

/**
 * 加载热力图数据
 */
const loadHeatmapData = async (): Promise<void> => {
  if (!isEnabled.value) {
    return;
  }

  componentLogger.info('加载热力图数据');
  await calculateHeatmapData();
};

// ========== 生命周期 ==========
onMounted(() => {
  componentLogger.info('HeatmapView 组件挂载', {
    cycleDays: props.cycleDays,
    periodsPerDay: props.periodsPerDay,
  });

  // 如果热力图已启用，加载数据
  if (isEnabled.value) {
    loadHeatmapData();
  }
});

// ========== 监听 ==========

/**
 * 监听课表变化
 */
watch(
  () => scheduleStore.schedule,
  () => {
    if (isEnabled.value) {
      componentLogger.debug('课表数据变化，重新计算热力图');
      calculateHeatmapData();
    }
  }
);

/**
 * 监听视图模式变化
 */
watch(
  () => scheduleStore.viewMode,
  () => {
    if (isEnabled.value) {
      componentLogger.debug('视图模式变化，重新计算热力图');
      calculateHeatmapData();
    }
  }
);

/**
 * 监听热力图启用状态
 */
watch(isEnabled, (newValue) => {
  if (newValue) {
    loadHeatmapData();
  }
});
</script>

<style scoped lang="scss">
.heatmap-view-container {
  position: relative;
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  background-color: #fff;
  border-radius: 4px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

// ========== 工具栏 ==========
.heatmap-toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px;
  border-bottom: 1px solid #e0e0e0;

  .toolbar-left {
    display: flex;
    gap: 16px;
    align-items: center;
  }

  .toolbar-right {
    display: flex;
    gap: 12px;
    align-items: center;
  }
}

// ========== 热力图网格 ==========
.heatmap-grid-wrapper {
  flex: 1;
  overflow: hidden;
  position: relative;
}

.heatmap-table {
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

  .heatmap-cell {
    border: 1px solid #e0e0e0;
    padding: 4px;
    text-align: center;
    vertical-align: middle;
    min-height: 60px;
    height: 60px;
    position: relative;
    cursor: pointer;
    transition: all 0.3s ease;

    &.has-entry {
      background-color: #fff;
    }

    &.empty-entry {
      background-color: #fafafa;
    }

    &:hover {
      transform: scale(1.02);
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
      z-index: 5;
    }

    .cell-content {
      position: relative;
      width: 100%;
      height: 100%;
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: center;
    }

    .course-info {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 2px;

      .course-subject {
        font-size: 13px;
        font-weight: 500;
        color: #303133;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        max-width: 100%;
      }

      .course-teacher {
        font-size: 11px;
        color: #909399;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        max-width: 100%;
      }
    }

    .empty-cell {
      color: #c0c4cc;
      font-size: 12px;
      user-select: none;
    }

    .cost-badge {
      position: absolute;
      top: 2px;
      right: 2px;
      background-color: rgba(0, 0, 0, 0.6);
      color: #fff;
      font-size: 10px;
      font-weight: 600;
      padding: 2px 4px;
      border-radius: 2px;
      line-height: 1;
      z-index: 1;
    }
  }
}

// ========== 图例对话框 ==========
.legend-content {
  .legend-description {
    margin-bottom: 20px;

    p {
      margin-bottom: 8px;
      color: #606266;
      font-size: 14px;
    }

    ul {
      margin: 0;
      padding-left: 20px;

      li {
        margin-bottom: 6px;
        color: #606266;
        font-size: 13px;
      }
    }
  }

  .legend-scale {
    margin-bottom: 20px;

    .scale-title {
      margin-bottom: 8px;
      color: #303133;
      font-weight: 500;
      font-size: 14px;
    }

    .scale-bar {
      position: relative;
      height: 40px;
      border-radius: 4px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0 8px;

      .scale-label {
        color: #303133;
        font-size: 12px;
        font-weight: 600;
        background-color: rgba(255, 255, 255, 0.9);
        padding: 2px 6px;
        border-radius: 2px;
      }
    }
  }

  .legend-violations {
    .violations-title {
      margin-bottom: 8px;
      color: #303133;
      font-weight: 500;
      font-size: 14px;
    }

    ul {
      margin: 0;
      padding-left: 20px;

      li {
        margin-bottom: 8px;
        color: #606266;
        font-size: 13px;
        line-height: 1.6;

        strong {
          color: #303133;
        }
      }
    }
  }
}

// ========== 详情对话框 ==========
.detail-content {
  .detail-header {
    display: flex;
    flex-direction: column;
    gap: 12px;

    .detail-info {
      display: flex;
      align-items: center;
      gap: 8px;

      .detail-label {
        color: #909399;
        font-size: 13px;
        min-width: 60px;
      }

      .detail-value {
        color: #303133;
        font-size: 14px;
        font-weight: 500;

        &.cost-value {
          color: #f56c6c;
          font-size: 16px;
          font-weight: 600;
        }
      }
    }
  }

  .violations-list {
    .violations-title {
      margin-bottom: 12px;
      color: #303133;
      font-weight: 500;
      font-size: 14px;
    }

    .violation-item {
      padding: 12px;
      background-color: #f5f7fa;
      border-radius: 4px;
      margin-bottom: 8px;

      &:last-child {
        margin-bottom: 0;
      }

      .violation-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 8px;

        .violation-cost {
          color: #f56c6c;
          font-size: 14px;
          font-weight: 600;
        }
      }

      .violation-description {
        color: #606266;
        font-size: 13px;
        line-height: 1.6;
      }
    }
  }
}

// ========== 加载状态 ==========
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

// ========== 响应式设计 ==========
@media (max-width: 1200px) {
  .heatmap-table {
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

    .heatmap-cell {
      min-height: 50px;
      height: 50px;

      .course-info {
        .course-subject {
          font-size: 12px;
        }

        .course-teacher {
          font-size: 10px;
        }
      }

      .cost-badge {
        font-size: 9px;
        padding: 1px 3px;
      }
    }
  }
}

@media (max-width: 768px) {
  .heatmap-toolbar {
    flex-direction: column;
    gap: 12px;

    .toolbar-left,
    .toolbar-right {
      width: 100%;
      justify-content: center;
    }
  }

  .heatmap-table {
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

    .heatmap-cell {
      min-height: 40px;
      height: 40px;
      padding: 2px;

      .course-info {
        .course-subject {
          font-size: 11px;
        }

        .course-teacher {
          font-size: 9px;
        }
      }

      .cost-badge {
        font-size: 8px;
        padding: 1px 2px;
      }
    }
  }
}

// ========== 打印样式 ==========
@media print {
  .heatmap-toolbar {
    display: none;
  }

  .heatmap-cell {
    &:hover {
      transform: none;
      box-shadow: none;
    }
  }

  .cost-badge {
    background-color: rgba(0, 0, 0, 0.8) !important;
  }
}

// ========== 动画效果 ==========
@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(-10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.heatmap-cell {
  animation: fadeIn 0.3s ease-out;
}
</style>
