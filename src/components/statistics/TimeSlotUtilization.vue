<!--
  时段利用率组件
  展示各个时间槽位的利用率统计和热力图
-->
<template>
  <div class="timeslot-utilization-container">
    <!-- 工具栏 -->
    <div class="utilization-toolbar">
      <div class="toolbar-left">
        <el-radio-group v-model="viewMode" size="default">
          <el-radio-button value="table">表格视图</el-radio-button>
          <el-radio-button value="heatmap">热力图</el-radio-button>
          <el-radio-button value="chart">图表</el-radio-button>
        </el-radio-group>
      </div>

      <div class="toolbar-right">
        <el-button
          type="primary"
          :icon="Refresh"
          :loading="isLoading"
          @click="handleRefresh"
        >
          刷新
        </el-button>
        <el-button
          type="success"
          :icon="Download"
          :disabled="utilizationData.length === 0"
          @click="handleExport"
        >
          导出
        </el-button>
      </div>
    </div>

    <!-- 统计概览 -->
    <div class="utilization-summary">
      <el-card shadow="hover">
        <div class="summary-item">
          <div class="summary-label">平均利用率</div>
          <div class="summary-value">{{ averageUtilization.toFixed(1) }}%</div>
        </div>
      </el-card>
      <el-card shadow="hover">
        <div class="summary-item">
          <div class="summary-label">最高利用率</div>
          <div class="summary-value">{{ maxUtilization.toFixed(1) }}%</div>
        </div>
      </el-card>
      <el-card shadow="hover">
        <div class="summary-item">
          <div class="summary-label">最低利用率</div>
          <div class="summary-value">{{ minUtilization.toFixed(1) }}%</div>
        </div>
      </el-card>
      <el-card shadow="hover">
        <div class="summary-item">
          <div class="summary-label">空闲时段</div>
          <div class="summary-value">{{ emptySlots }}</div>
        </div>
      </el-card>
    </div>

    <!-- 内容区域 -->
    <div class="utilization-content">
      <!-- 表格视图 -->
      <div v-if="viewMode === 'table'" class="table-view">
        <el-table
          :data="utilizationData"
          border
          stripe
          :default-sort="{ prop: 'utilization', order: 'descending' }"
        >
          <el-table-column prop="day" label="星期" width="100" align="center">
            <template #default="{ row }">
              星期{{ row.day + 1 }}
            </template>
          </el-table-column>

          <el-table-column prop="period" label="节次" width="100" align="center">
            <template #default="{ row }">
              第{{ row.period + 1 }}节
            </template>
          </el-table-column>

          <el-table-column prop="usedCount" label="已排课程数" width="120" align="center" />

          <el-table-column prop="totalCapacity" label="总容量" width="100" align="center" />

          <el-table-column
            prop="utilization"
            label="利用率"
            width="150"
            sortable
            align="center"
          >
            <template #default="{ row }">
              <el-progress
                :percentage="row.utilization"
                :color="getUtilizationColor(row.utilization)"
              />
            </template>
          </el-table-column>

          <el-table-column prop="status" label="状态" width="100" align="center">
            <template #default="{ row }">
              <el-tag :type="getStatusTagType(row.utilization)" size="small">
                {{ getStatusText(row.utilization) }}
              </el-tag>
            </template>
          </el-table-column>

          <el-table-column label="操作" width="120" fixed="right" align="center">
            <template #default="{ row }">
              <el-button
                size="small"
                type="primary"
                link
                @click="handleViewDetail(row)"
              >
                查看详情
              </el-button>
            </template>
          </el-table-column>
        </el-table>
      </div>

      <!-- 热力图视图 -->
      <div v-if="viewMode === 'heatmap'" class="heatmap-view">
        <el-card shadow="hover">
          <div class="heatmap-container">
            <div class="heatmap-header">
              <div class="header-cell"></div>
              <div
                v-for="day in cycleDays"
                :key="day"
                class="header-cell"
              >
                星期{{ day + 1 }}
              </div>
            </div>
            <div class="heatmap-body">
              <div
                v-for="period in periodsPerDay"
                :key="period"
                class="heatmap-row"
              >
                <div class="row-header">第{{ period + 1 }}节</div>
                <div
                  v-for="day in cycleDays"
                  :key="day"
                  class="heatmap-cell"
                  :style="getHeatmapCellStyle(day, period)"
                  @click="handleCellClick(day, period)"
                >
                  <div class="cell-value">
                    {{ getUtilizationValue(day, period).toFixed(0) }}%
                  </div>
                </div>
              </div>
            </div>
            <div class="heatmap-legend">
              <div class="legend-label">利用率：</div>
              <div class="legend-gradient">
                <div class="gradient-bar"></div>
                <div class="gradient-labels">
                  <span>0%</span>
                  <span>25%</span>
                  <span>50%</span>
                  <span>75%</span>
                  <span>100%</span>
                </div>
              </div>
            </div>
          </div>
        </el-card>
      </div>

      <!-- 图表视图 -->
      <div v-if="viewMode === 'chart'" class="chart-view">
        <el-card shadow="hover">
          <template #header>
            <div class="card-header">
              <span>时段利用率分析</span>
              <el-radio-group v-model="chartType" size="small">
                <el-radio-button value="line">折线图</el-radio-button>
                <el-radio-button value="bar">柱状图</el-radio-button>
                <el-radio-button value="scatter">散点图</el-radio-button>
              </el-radio-group>
            </div>
          </template>
          <div ref="chartRef" class="chart-container" style="height: 500px"></div>
        </el-card>
      </div>
    </div>

    <!-- 详情对话框 -->
    <el-dialog
      v-model="detailDialogVisible"
      :title="`时段详情 - 星期${currentSlot?.day + 1} 第${currentSlot?.period + 1}节`"
      width="600px"
    >
      <el-descriptions v-if="currentSlot" :column="2" border>
        <el-descriptions-item label="时间槽位">
          星期{{ currentSlot.day + 1 }} 第{{ currentSlot.period + 1 }}节
        </el-descriptions-item>
        <el-descriptions-item label="已排课程数">
          {{ currentSlot.usedCount }}
        </el-descriptions-item>
        <el-descriptions-item label="总容量">
          {{ currentSlot.totalCapacity }}
        </el-descriptions-item>
        <el-descriptions-item label="利用率">
          <el-progress
            :percentage="currentSlot.utilization"
            :color="getUtilizationColor(currentSlot.utilization)"
          />
        </el-descriptions-item>
        <el-descriptions-item label="状态" :span="2">
          <el-tag :type="getStatusTagType(currentSlot.utilization)">
            {{ getStatusText(currentSlot.utilization) }}
          </el-tag>
        </el-descriptions-item>
      </el-descriptions>

      <template #footer>
        <el-button type="primary" @click="detailDialogVisible = false">关闭</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch, nextTick } from 'vue';
import { ElMessage } from 'element-plus';
import { Refresh, Download } from '@element-plus/icons-vue';
import { useScheduleStore } from '@/stores/scheduleStore';
import { useConfigStore } from '@/stores/configStore';
import { logger } from '@/utils/logger';
import * as echarts from 'echarts';
import type { ECharts } from 'echarts';

// ========== 组件日志 ==========
const logPrefix = '[TimeSlotUtilization]';

// ========== Props ==========
interface Props {
  autoLoad?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  autoLoad: true,
});

// ========== Emits ==========
const emit = defineEmits<{
  loaded: [data: any];
}>();

// ========== Store ==========
const scheduleStore = useScheduleStore();
const configStore = useConfigStore();

// ========== 状态 ==========
const isLoading = ref(false);
const viewMode = ref<'table' | 'heatmap' | 'chart'>('heatmap');
const chartType = ref<'line' | 'bar' | 'scatter'>('line');
const detailDialogVisible = ref(false);
const currentSlot = ref<any>(null);
const chartRef = ref<HTMLDivElement>();
let chart: ECharts | null = null;

// ========== 计算属性 ==========

/** 排课周期天数 */
const cycleDays = computed(() => {
  return Array.from({ length: configStore.cycleDays || 5 }, (_, i) => i);
});

/** 每天节次数 */
const periodsPerDay = computed(() => {
  return Array.from({ length: configStore.periodsPerDay || 8 }, (_, i) => i);
});

/** 班级总数 */
const totalClasses = computed(() => {
  if (!scheduleStore.schedule) return 0;
  const classIds = new Set(scheduleStore.schedule.entries.map((e) => e.classId));
  return classIds.size;
});

/** 时段利用率数据 */
const utilizationData = computed(() => {
  if (!scheduleStore.schedule) return [];

  const data: any[] = [];
  const totalCapacity = totalClasses.value;

  cycleDays.value.forEach((day) => {
    periodsPerDay.value.forEach((period) => {
      // 统计该时段已排课程数
      const usedCount = scheduleStore.schedule!.entries.filter(
        (e) => e.timeSlot.day === day && e.timeSlot.period === period
      ).length;

      const utilization = totalCapacity > 0 ? (usedCount / totalCapacity) * 100 : 0;

      data.push({
        day,
        period,
        usedCount,
        totalCapacity,
        utilization,
      });
    });
  });

  return data;
});

/** 平均利用率 */
const averageUtilization = computed(() => {
  if (utilizationData.value.length === 0) return 0;
  const total = utilizationData.value.reduce((sum, item) => sum + item.utilization, 0);
  return total / utilizationData.value.length;
});

/** 最高利用率 */
const maxUtilization = computed(() => {
  if (utilizationData.value.length === 0) return 0;
  return Math.max(...utilizationData.value.map((item) => item.utilization));
});

/** 最低利用率 */
const minUtilization = computed(() => {
  if (utilizationData.value.length === 0) return 0;
  return Math.min(...utilizationData.value.map((item) => item.utilization));
});

/** 空闲时段数 */
const emptySlots = computed(() => {
  return utilizationData.value.filter((item) => item.usedCount === 0).length;
});

// ========== 方法 ==========

/**
 * 加载利用率数据
 */
const loadUtilization = async (): Promise<void> => {
  try {
    logger.info(`${logPrefix} 加载时段利用率数据`);
    isLoading.value = true;

    // 确保课表数据已加载
    if (!scheduleStore.schedule) {
      await scheduleStore.loadSchedule();
    }

    // 确保配置已加载
    if (!configStore.cycleDays) {
      await configStore.loadConfig();
    }

    const data = {
      utilizationData: utilizationData.value,
      averageUtilization: averageUtilization.value,
      maxUtilization: maxUtilization.value,
      minUtilization: minUtilization.value,
      emptySlots: emptySlots.value,
    };

    emit('loaded', data);
    logger.info(`${logPrefix} 时段利用率数据加载成功`);

    // 如果是图表视图，初始化图表
    if (viewMode.value === 'chart') {
      nextTick(() => {
        initChart();
      });
    }
  } catch (error: any) {
    logger.error(`${logPrefix} 加载时段利用率数据失败`, { error });
    ElMessage.error('加载时段利用率数据失败');
  } finally {
    isLoading.value = false;
  }
};

/**
 * 获取利用率值
 */
const getUtilizationValue = (day: number, period: number): number => {
  const item = utilizationData.value.find((d) => d.day === day && d.period === period);
  return item?.utilization || 0;
};

/**
 * 获取热力图单元格样式
 */
const getHeatmapCellStyle = (day: number, period: number): any => {
  const utilization = getUtilizationValue(day, period);
  const color = getUtilizationColor(utilization);

  return {
    backgroundColor: color,
    color: utilization > 50 ? '#fff' : '#303133',
  };
};

/**
 * 获取利用率颜色
 */
const getUtilizationColor = (utilization: number): string => {
  if (utilization >= 90) return '#f56c6c';
  if (utilization >= 75) return '#e6a23c';
  if (utilization >= 50) return '#409eff';
  if (utilization >= 25) return '#67c23a';
  return '#909399';
};

/**
 * 获取状态标签类型
 */
const getStatusTagType = (utilization: number): string => {
  if (utilization >= 90) return 'danger';
  if (utilization >= 75) return 'warning';
  if (utilization >= 50) return 'primary';
  if (utilization >= 25) return 'success';
  return 'info';
};

/**
 * 获取状态文本
 */
const getStatusText = (utilization: number): string => {
  if (utilization >= 90) return '饱和';
  if (utilization >= 75) return '较高';
  if (utilization >= 50) return '正常';
  if (utilization >= 25) return '较低';
  return '空闲';
};

/**
 * 处理刷新
 */
const handleRefresh = async (): Promise<void> => {
  logger.info(`${logPrefix} 刷新时段利用率数据`);
  await loadUtilization();
  ElMessage.success('时段利用率数据刷新成功');
};

/**
 * 处理导出
 */
const handleExport = (): void => {
  logger.info(`${logPrefix} 导出时段利用率数据`);
  ElMessage.info('导出功能开发中');
};

/**
 * 处理查看详情
 */
const handleViewDetail = (row: any): void => {
  logger.info(`${logPrefix} 查看时段详情`, { day: row.day, period: row.period });
  currentSlot.value = row;
  detailDialogVisible.value = true;
};

/**
 * 处理单元格点击
 */
const handleCellClick = (day: number, period: number): void => {
  const item = utilizationData.value.find((d) => d.day === day && d.period === period);
  if (item) {
    handleViewDetail(item);
  }
};

/**
 * 初始化图表
 */
const initChart = (): void => {
  if (!chartRef.value) return;

  logger.debug(`${logPrefix} 初始化图表`);
  chart = echarts.init(chartRef.value);
  updateChart();
};

/**
 * 更新图表
 */
const updateChart = (): void => {
  if (!chart) return;

  logger.debug(`${logPrefix} 更新图表`, { chartType: chartType.value });

  if (chartType.value === 'line') {
    updateLineChart();
  } else if (chartType.value === 'bar') {
    updateBarChart();
  } else if (chartType.value === 'scatter') {
    updateScatterChart();
  }
};

/**
 * 更新折线图
 */
const updateLineChart = (): void => {
  if (!chart) return;

  // 按节次分组
  const seriesData = periodsPerDay.value.map((period) => {
    return {
      name: `第${period + 1}节`,
      type: 'line',
      data: cycleDays.value.map((day) => getUtilizationValue(day, period)),
      smooth: true,
    };
  });

  const option = {
    title: {
      text: '各时段利用率趋势',
      left: 'center',
    },
    tooltip: {
      trigger: 'axis',
    },
    legend: {
      data: seriesData.map((s) => s.name),
      top: 30,
    },
    grid: {
      left: '3%',
      right: '4%',
      bottom: '3%',
      top: 80,
      containLabel: true,
    },
    xAxis: {
      type: 'category',
      data: cycleDays.value.map((d) => `星期${d + 1}`),
      name: '星期',
    },
    yAxis: {
      type: 'value',
      name: '利用率 (%)',
      max: 100,
    },
    series: seriesData,
  };

  chart.setOption(option);
};

/**
 * 更新柱状图
 */
const updateBarChart = (): void => {
  if (!chart) return;

  const option = {
    title: {
      text: '时段利用率分布',
      left: 'center',
    },
    tooltip: {
      trigger: 'axis',
      axisPointer: {
        type: 'shadow',
      },
    },
    grid: {
      left: '3%',
      right: '4%',
      bottom: '3%',
      containLabel: true,
    },
    xAxis: {
      type: 'category',
      data: utilizationData.value.map((d) => `周${d.day + 1}-${d.period + 1}`),
      axisLabel: {
        rotate: 45,
      },
    },
    yAxis: {
      type: 'value',
      name: '利用率 (%)',
      max: 100,
    },
    series: [
      {
        name: '利用率',
        type: 'bar',
        data: utilizationData.value.map((d) => d.utilization),
        itemStyle: {
          color: (params: any) => {
            return getUtilizationColor(params.value);
          },
        },
      },
    ],
  };

  chart.setOption(option);
};

/**
 * 更新散点图
 */
const updateScatterChart = (): void => {
  if (!chart) return;

  const option = {
    title: {
      text: '时段利用率散点分布',
      left: 'center',
    },
    tooltip: {
      trigger: 'item',
      formatter: (params: any) => {
        const data = params.data;
        return `星期${data[0] + 1} 第${data[1] + 1}节<br/>利用率: ${data[2].toFixed(1)}%`;
      },
    },
    grid: {
      left: '3%',
      right: '7%',
      bottom: '3%',
      containLabel: true,
    },
    xAxis: {
      type: 'category',
      data: cycleDays.value.map((d) => `星期${d + 1}`),
      name: '星期',
    },
    yAxis: {
      type: 'category',
      data: periodsPerDay.value.map((p) => `第${p + 1}节`),
      name: '节次',
    },
    visualMap: {
      min: 0,
      max: 100,
      calculable: true,
      orient: 'vertical',
      right: 10,
      top: 'center',
      text: ['高', '低'],
      inRange: {
        color: ['#909399', '#67c23a', '#409eff', '#e6a23c', '#f56c6c'],
      },
    },
    series: [
      {
        name: '利用率',
        type: 'scatter',
        symbolSize: (val: any) => {
          return val[2] / 2; // 根据利用率调整点的大小
        },
        data: utilizationData.value.map((d) => [d.day, d.period, d.utilization]),
        itemStyle: {
          shadowBlur: 10,
          shadowColor: 'rgba(0, 0, 0, 0.5)',
          shadowOffsetY: 5,
        },
      },
    ],
  };

  chart.setOption(option);
};

// ========== 监听器 ==========

// 监听视图模式变化
watch(viewMode, (newMode) => {
  logger.debug(`${logPrefix} 切换视图模式`, { mode: newMode });

  if (newMode === 'chart') {
    nextTick(() => {
      initChart();
    });
  }
});

// 监听图表类型变化
watch(chartType, () => {
  updateChart();
});

// ========== 生命周期 ==========
onMounted(() => {
  logger.info(`${logPrefix} TimeSlotUtilization 组件挂载`);

  if (props.autoLoad) {
    loadUtilization();
  }
});
</script>

<style scoped lang="scss">
.timeslot-utilization-container {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.utilization-toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px;
  background-color: #f5f7fa;
  border-radius: 4px;

  .toolbar-left {
    display: flex;
    gap: 12px;
    align-items: center;
  }

  .toolbar-right {
    display: flex;
    gap: 12px;
    align-items: center;
  }
}

.utilization-summary {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;

  .summary-item {
    text-align: center;
    padding: 16px;

    .summary-label {
      font-size: 14px;
      color: #909399;
      margin-bottom: 8px;
    }

    .summary-value {
      font-size: 28px;
      font-weight: 600;
      color: #303133;
    }
  }
}

.utilization-content {
  flex: 1;
  overflow: auto;

  .table-view {
    width: 100%;
  }

  .heatmap-view {
    .heatmap-container {
      .heatmap-header {
        display: flex;
        border-bottom: 2px solid #dcdfe6;

        .header-cell {
          flex: 1;
          padding: 12px;
          text-align: center;
          font-weight: 600;
          background-color: #f5f7fa;

          &:first-child {
            width: 100px;
            flex: none;
          }
        }
      }

      .heatmap-body {
        .heatmap-row {
          display: flex;
          border-bottom: 1px solid #dcdfe6;

          &:last-child {
            border-bottom: none;
          }

          .row-header {
            width: 100px;
            padding: 12px;
            text-align: center;
            font-weight: 600;
            background-color: #f5f7fa;
            border-right: 2px solid #dcdfe6;
          }

          .heatmap-cell {
            flex: 1;
            padding: 12px;
            text-align: center;
            cursor: pointer;
            transition: all 0.3s;
            border-right: 1px solid #dcdfe6;

            &:last-child {
              border-right: none;
            }

            &:hover {
              transform: scale(1.05);
              box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
              z-index: 1;
            }

            .cell-value {
              font-size: 16px;
              font-weight: 600;
            }
          }
        }
      }

      .heatmap-legend {
        display: flex;
        align-items: center;
        gap: 16px;
        margin-top: 20px;
        padding: 16px;
        background-color: #f5f7fa;
        border-radius: 4px;

        .legend-label {
          font-weight: 600;
          color: #303133;
        }

        .legend-gradient {
          flex: 1;

          .gradient-bar {
            height: 20px;
            background: linear-gradient(
              to right,
              #909399,
              #67c23a,
              #409eff,
              #e6a23c,
              #f56c6c
            );
            border-radius: 4px;
          }

          .gradient-labels {
            display: flex;
            justify-content: space-between;
            margin-top: 8px;
            font-size: 12px;
            color: #606266;
          }
        }
      }
    }
  }

  .chart-view {
    .card-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-weight: 600;
    }

    .chart-container {
      width: 100%;
    }
  }
}

// 响应式设计
@media (max-width: 1200px) {
  .utilization-summary {
    grid-template-columns: repeat(2, 1fr);
  }

  .utilization-toolbar {
    flex-direction: column;
    gap: 12px;

    .toolbar-left,
    .toolbar-right {
      width: 100%;
      justify-content: center;
    }
  }
}

@media (max-width: 768px) {
  .utilization-summary {
    grid-template-columns: 1fr;
  }

  .heatmap-container {
    overflow-x: auto;
  }
}
</style>
