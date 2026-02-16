<!--
  课程分布组件
  展示课程在不同维度的分布情况（按科目、按时段、按教师等）
-->
<template>
  <div class="course-distribution-container">
    <!-- 工具栏 -->
    <div class="distribution-toolbar">
      <div class="toolbar-left">
        <el-select v-model="distributionType" placeholder="选择分布类型" style="width: 200px">
          <el-option label="按科目分布" value="subject" />
          <el-option label="按时段分布" value="timeslot" />
          <el-option label="按教师分布" value="teacher" />
          <el-option label="按班级分布" value="class" />
          <el-option label="按星期分布" value="weekday" />
        </el-select>

        <el-radio-group v-model="chartType" size="default">
          <el-radio-button label="pie">饼图</el-radio-button>
          <el-radio-button label="bar">柱状图</el-radio-button>
          <el-radio-button label="line">折线图</el-radio-button>
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
          :disabled="distributionData.length === 0"
          @click="handleExport"
        >
          导出
        </el-button>
      </div>
    </div>

    <!-- 统计概览 -->
    <div class="distribution-summary">
      <el-card shadow="hover">
        <div class="summary-item">
          <div class="summary-label">分类总数</div>
          <div class="summary-value">{{ distributionData.length }}</div>
        </div>
      </el-card>
      <el-card shadow="hover">
        <div class="summary-item">
          <div class="summary-label">最多课程</div>
          <div class="summary-value">{{ maxCourseCount }}</div>
        </div>
      </el-card>
      <el-card shadow="hover">
        <div class="summary-item">
          <div class="summary-label">最少课程</div>
          <div class="summary-value">{{ minCourseCount }}</div>
        </div>
      </el-card>
      <el-card shadow="hover">
        <div class="summary-item">
          <div class="summary-label">平均课程</div>
          <div class="summary-value">{{ averageCourseCount.toFixed(1) }}</div>
        </div>
      </el-card>
    </div>

    <!-- 图表展示 -->
    <div class="distribution-chart">
      <el-card shadow="hover">
        <template #header>
          <div class="card-header">
            <span>{{ getChartTitle() }}</span>
            <el-button type="primary" link @click="handleViewTable">
              查看表格
            </el-button>
          </div>
        </template>
        <div ref="chartRef" class="chart-container" style="height: 500px"></div>
      </el-card>
    </div>

    <!-- 详细数据表格 -->
    <div class="distribution-table">
      <el-card shadow="hover">
        <template #header>
          <div class="card-header">
            <span>详细数据</span>
            <el-input
              v-model="searchKeyword"
              placeholder="搜索"
              :prefix-icon="Search"
              clearable
              style="width: 240px"
            />
          </div>
        </template>
        <el-table
          :data="filteredDistributionData"
          border
          stripe
          :default-sort="{ prop: 'count', order: 'descending' }"
          max-height="400"
        >
          <el-table-column type="index" label="序号" width="60" align="center" />

          <el-table-column prop="name" label="名称" min-width="150" sortable>
            <template #default="{ row }">
              <div class="name-cell">
                <el-tag size="small" :type="getTagType(row.count)">
                  {{ row.name }}
                </el-tag>
              </div>
            </template>
          </el-table-column>

          <el-table-column prop="count" label="课程数" width="120" sortable align="center">
            <template #default="{ row }">
              <el-tag :type="getCountTagType(row.count)" size="large">
                {{ row.count }}
              </el-tag>
            </template>
          </el-table-column>

          <el-table-column prop="percentage" label="占比" width="150" sortable align="center">
            <template #default="{ row }">
              <el-progress
                :percentage="row.percentage"
                :color="getProgressColor(row.percentage)"
              />
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
      </el-card>
    </div>

    <!-- 详情对话框 -->
    <el-dialog
      v-model="detailDialogVisible"
      :title="`分布详情 - ${currentItem?.name || ''}`"
      width="700px"
    >
      <el-descriptions v-if="currentItem" :column="2" border>
        <el-descriptions-item label="名称">
          {{ currentItem.name }}
        </el-descriptions-item>
        <el-descriptions-item label="课程数">
          <el-tag :type="getCountTagType(currentItem.count)" size="large">
            {{ currentItem.count }}
          </el-tag>
        </el-descriptions-item>
        <el-descriptions-item label="占比" :span="2">
          <el-progress
            :percentage="currentItem.percentage"
            :color="getProgressColor(currentItem.percentage)"
          />
        </el-descriptions-item>
        <el-descriptions-item label="排名" :span="2">
          第 {{ currentItem.rank }} 名
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
import { Refresh, Download, Search } from '@element-plus/icons-vue';
import { useScheduleStore } from '@/stores/scheduleStore';
import { logger } from '@/utils/logger';
import * as echarts from 'echarts';
import type { ECharts } from 'echarts';

// ========== 组件日志 ==========
const logPrefix = '[CourseDistribution]';

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

// ========== 状态 ==========
const isLoading = ref(false);
const distributionType = ref<'subject' | 'timeslot' | 'teacher' | 'class' | 'weekday'>('subject');
const chartType = ref<'pie' | 'bar' | 'line'>('pie');
const searchKeyword = ref('');
const detailDialogVisible = ref(false);
const currentItem = ref<any>(null);
const chartRef = ref<HTMLDivElement>();
let chart: ECharts | null = null;

// ========== 计算属性 ==========

/** 分布数据 */
const distributionData = computed(() => {
  if (!scheduleStore.schedule) return [];

  let dataMap = new Map<string, number>();

  if (distributionType.value === 'subject') {
    // 按科目统计
    scheduleStore.schedule.entries.forEach((entry) => {
      const count = dataMap.get(entry.subjectId) || 0;
      dataMap.set(entry.subjectId, count + 1);
    });
  } else if (distributionType.value === 'timeslot') {
    // 按时段统计
    scheduleStore.schedule.entries.forEach((entry) => {
      const key = `第${entry.timeSlot.period + 1}节`;
      const count = dataMap.get(key) || 0;
      dataMap.set(key, count + 1);
    });
  } else if (distributionType.value === 'teacher') {
    // 按教师统计
    scheduleStore.schedule.entries.forEach((entry) => {
      const key = `教师${entry.teacherId}`;
      const count = dataMap.get(key) || 0;
      dataMap.set(key, count + 1);
    });
  } else if (distributionType.value === 'class') {
    // 按班级统计
    scheduleStore.schedule.entries.forEach((entry) => {
      const key = `班级${entry.classId}`;
      const count = dataMap.get(key) || 0;
      dataMap.set(key, count + 1);
    });
  } else if (distributionType.value === 'weekday') {
    // 按星期统计
    scheduleStore.schedule.entries.forEach((entry) => {
      const key = `星期${entry.timeSlot.day + 1}`;
      const count = dataMap.get(key) || 0;
      dataMap.set(key, count + 1);
    });
  }

  // 计算总数和百分比
  const total = Array.from(dataMap.values()).reduce((sum, count) => sum + count, 0);
  const data = Array.from(dataMap.entries())
    .map(([name, count]) => ({
      name,
      count,
      percentage: total > 0 ? (count / total) * 100 : 0,
      rank: 0,
    }))
    .sort((a, b) => b.count - a.count);

  // 设置排名
  data.forEach((item, index) => {
    item.rank = index + 1;
  });

  return data;
});

/** 过滤后的分布数据 */
const filteredDistributionData = computed(() => {
  if (!searchKeyword.value) {
    return distributionData.value;
  }

  const keyword = searchKeyword.value.toLowerCase();
  return distributionData.value.filter((item) =>
    item.name.toLowerCase().includes(keyword)
  );
});

/** 最多课程数 */
const maxCourseCount = computed(() => {
  if (distributionData.value.length === 0) return 0;
  return Math.max(...distributionData.value.map((item) => item.count));
});

/** 最少课程数 */
const minCourseCount = computed(() => {
  if (distributionData.value.length === 0) return 0;
  return Math.min(...distributionData.value.map((item) => item.count));
});

/** 平均课程数 */
const averageCourseCount = computed(() => {
  if (distributionData.value.length === 0) return 0;
  const total = distributionData.value.reduce((sum, item) => sum + item.count, 0);
  return total / distributionData.value.length;
});

// ========== 方法 ==========

/**
 * 加载分布数据
 */
const loadDistribution = async (): Promise<void> => {
  try {
    logger.info(`${logPrefix} 加载课程分布数据`);
    isLoading.value = true;

    // 确保课表数据已加载
    if (!scheduleStore.schedule) {
      await scheduleStore.loadSchedule();
    }

    const data = {
      distributionType: distributionType.value,
      distributionData: distributionData.value,
      maxCourseCount: maxCourseCount.value,
      minCourseCount: minCourseCount.value,
      averageCourseCount: averageCourseCount.value,
    };

    emit('loaded', data);
    logger.info(`${logPrefix} 课程分布数据加载成功`);

    // 初始化图表
    nextTick(() => {
      initChart();
    });
  } catch (error: any) {
    logger.error(`${logPrefix} 加载课程分布数据失败`, { error });
    ElMessage.error('加载课程分布数据失败');
  } finally {
    isLoading.value = false;
  }
};

/**
 * 获取图表标题
 */
const getChartTitle = (): string => {
  const titles = {
    subject: '课程按科目分布',
    timeslot: '课程按时段分布',
    teacher: '课程按教师分布',
    class: '课程按班级分布',
    weekday: '课程按星期分布',
  };
  return titles[distributionType.value];
};

/**
 * 获取标签类型
 */
const getTagType = (count: number): string => {
  if (count >= maxCourseCount.value * 0.8) return 'danger';
  if (count >= maxCourseCount.value * 0.6) return 'warning';
  if (count >= maxCourseCount.value * 0.4) return 'primary';
  return 'success';
};

/**
 * 获取数量标签类型
 */
const getCountTagType = (count: number): string => {
  if (count >= maxCourseCount.value * 0.8) return 'danger';
  if (count >= maxCourseCount.value * 0.6) return 'warning';
  if (count >= maxCourseCount.value * 0.4) return '';
  return 'success';
};

/**
 * 获取进度条颜色
 */
const getProgressColor = (percentage: number): string => {
  if (percentage >= 20) return '#f56c6c';
  if (percentage >= 15) return '#e6a23c';
  if (percentage >= 10) return '#409eff';
  return '#67c23a';
};

/**
 * 处理刷新
 */
const handleRefresh = async (): Promise<void> => {
  logger.info(`${logPrefix} 刷新课程分布数据`);
  await loadDistribution();
  ElMessage.success('课程分布数据刷新成功');
};

/**
 * 处理导出
 */
const handleExport = (): void => {
  logger.info(`${logPrefix} 导出课程分布数据`);
  ElMessage.info('导出功能开发中');
};

/**
 * 处理查看表格
 */
const handleViewTable = (): void => {
  logger.info(`${logPrefix} 查看表格`);
  // 滚动到表格位置
  const tableElement = document.querySelector('.distribution-table');
  if (tableElement) {
    tableElement.scrollIntoView({ behavior: 'smooth' });
  }
};

/**
 * 处理查看详情
 */
const handleViewDetail = (item: any): void => {
  logger.info(`${logPrefix} 查看分布详情`, { name: item.name });
  currentItem.value = item;
  detailDialogVisible.value = true;
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

  if (chartType.value === 'pie') {
    updatePieChart();
  } else if (chartType.value === 'bar') {
    updateBarChart();
  } else if (chartType.value === 'line') {
    updateLineChart();
  }
};

/**
 * 更新饼图
 */
const updatePieChart = (): void => {
  if (!chart) return;

  const option = {
    title: {
      text: getChartTitle(),
      left: 'center',
    },
    tooltip: {
      trigger: 'item',
      formatter: '{a} <br/>{b}: {c} ({d}%)',
    },
    legend: {
      orient: 'vertical',
      left: 'left',
      top: 'middle',
      data: distributionData.value.map((item) => item.name),
    },
    series: [
      {
        name: '课程数',
        type: 'pie',
        radius: ['40%', '70%'],
        center: ['60%', '50%'],
        data: distributionData.value.map((item) => ({
          name: item.name,
          value: item.count,
        })),
        emphasis: {
          itemStyle: {
            shadowBlur: 10,
            shadowOffsetX: 0,
            shadowColor: 'rgba(0, 0, 0, 0.5)',
          },
        },
        label: {
          formatter: '{b}: {c} ({d}%)',
        },
      },
    ],
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
      text: getChartTitle(),
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
      data: distributionData.value.map((item) => item.name),
      axisLabel: {
        rotate: 45,
      },
    },
    yAxis: {
      type: 'value',
      name: '课程数',
    },
    series: [
      {
        name: '课程数',
        type: 'bar',
        data: distributionData.value.map((item) => item.count),
        itemStyle: {
          color: (params: any) => {
            const colors = ['#f56c6c', '#e6a23c', '#409eff', '#67c23a', '#909399'];
            return colors[params.dataIndex % colors.length];
          },
        },
      },
    ],
  };

  chart.setOption(option);
};

/**
 * 更新折线图
 */
const updateLineChart = (): void => {
  if (!chart) return;

  const option = {
    title: {
      text: getChartTitle(),
      left: 'center',
    },
    tooltip: {
      trigger: 'axis',
    },
    grid: {
      left: '3%',
      right: '4%',
      bottom: '3%',
      containLabel: true,
    },
    xAxis: {
      type: 'category',
      data: distributionData.value.map((item) => item.name),
      axisLabel: {
        rotate: 45,
      },
    },
    yAxis: {
      type: 'value',
      name: '课程数',
    },
    series: [
      {
        name: '课程数',
        type: 'line',
        data: distributionData.value.map((item) => item.count),
        smooth: true,
        itemStyle: {
          color: '#409eff',
        },
        areaStyle: {
          color: 'rgba(64, 158, 255, 0.2)',
        },
      },
    ],
  };

  chart.setOption(option);
};

// ========== 监听器 ==========

// 监听分布类型变化
watch(distributionType, () => {
  logger.debug(`${logPrefix} 切换分布类型`, { type: distributionType.value });
  updateChart();
});

// 监听图表类型变化
watch(chartType, () => {
  updateChart();
});

// ========== 生命周期 ==========
onMounted(() => {
  logger.info(`${logPrefix} CourseDistribution 组件挂载`);

  if (props.autoLoad) {
    loadDistribution();
  }
});
</script>

<style scoped lang="scss">
.course-distribution-container {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.distribution-toolbar {
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

.distribution-summary {
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

.distribution-chart {
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

.distribution-table {
  .card-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-weight: 600;
  }

  .name-cell {
    display: flex;
    align-items: center;
  }
}

// 响应式设计
@media (max-width: 1200px) {
  .distribution-summary {
    grid-template-columns: repeat(2, 1fr);
  }

  .distribution-toolbar {
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
  .distribution-summary {
    grid-template-columns: 1fr;
  }

  .distribution-toolbar {
    .toolbar-left,
    .toolbar-right {
      flex-direction: column;
    }
  }
}
</style>
