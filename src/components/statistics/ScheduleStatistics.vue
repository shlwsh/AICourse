<!--
  课表统计组件
  展示课表的整体统计信息，包括课程总数、班级数、教师数等
-->
<template>
  <div class="schedule-statistics-container">
    <!-- 统计概览卡片 -->
    <div class="statistics-overview">
      <el-card shadow="hover" class="stat-card">
        <div class="stat-item">
          <div class="stat-icon" style="background-color: #409eff">
            <el-icon :size="32"><Document /></el-icon>
          </div>
          <div class="stat-content">
            <div class="stat-label">课程总数</div>
            <div class="stat-value">{{ totalCourses }}</div>
          </div>
        </div>
      </el-card>

      <el-card shadow="hover" class="stat-card">
        <div class="stat-item">
          <div class="stat-icon" style="background-color: #67c23a">
            <el-icon :size="32"><User /></el-icon>
          </div>
          <div class="stat-content">
            <div class="stat-label">教师总数</div>
            <div class="stat-value">{{ totalTeachers }}</div>
          </div>
        </div>
      </el-card>

      <el-card shadow="hover" class="stat-card">
        <div class="stat-item">
          <div class="stat-icon" style="background-color: #e6a23c">
            <el-icon :size="32"><School /></el-icon>
          </div>
          <div class="stat-content">
            <div class="stat-label">班级总数</div>
            <div class="stat-value">{{ totalClasses }}</div>
          </div>
        </div>
      </el-card>

      <el-card shadow="hover" class="stat-card">
        <div class="stat-item">
          <div class="stat-icon" style="background-color: #f56c6c">
            <el-icon :size="32"><TrendCharts /></el-icon>
          </div>
          <div class="stat-content">
            <div class="stat-label">课表代价值</div>
            <div class="stat-value">{{ scheduleCost }}</div>
          </div>
        </div>
      </el-card>
    </div>

    <!-- 详细统计 -->
    <div class="detailed-statistics">
      <el-row :gutter="20">
        <!-- 科目统计 -->
        <el-col :xs="24" :sm="12" :lg="8">
          <el-card shadow="hover" class="detail-card">
            <template #header>
              <div class="card-header">
                <span>科目统计</span>
                <el-button type="primary" link @click="handleViewSubjectDetail">
                  查看详情
                </el-button>
              </div>
            </template>
            <div class="subject-stats">
              <div
                v-for="subject in subjectStats"
                :key="subject.name"
                class="subject-item"
              >
                <div class="subject-name">{{ subject.name }}</div>
                <div class="subject-count">
                  <el-tag size="small">{{ subject.count }} 节</el-tag>
                </div>
              </div>
              <div v-if="subjectStats.length === 0" class="empty-text">
                暂无数据
              </div>
            </div>
          </el-card>
        </el-col>

        <!-- 教师统计 -->
        <el-col :xs="24" :sm="12" :lg="8">
          <el-card shadow="hover" class="detail-card">
            <template #header>
              <div class="card-header">
                <span>教师课时分布</span>
                <el-button type="primary" link @click="handleViewTeacherDetail">
                  查看详情
                </el-button>
              </div>
            </template>
            <div class="teacher-stats">
              <div class="stat-row">
                <span class="label">平均课时：</span>
                <span class="value">{{ averageTeacherSessions.toFixed(1) }} 节</span>
              </div>
              <div class="stat-row">
                <span class="label">最高课时：</span>
                <span class="value">{{ maxTeacherSessions }} 节</span>
              </div>
              <div class="stat-row">
                <span class="label">最低课时：</span>
                <span class="value">{{ minTeacherSessions }} 节</span>
              </div>
              <div class="stat-row">
                <span class="label">标准差：</span>
                <span class="value">{{ teacherSessionsStdDev.toFixed(2) }}</span>
              </div>
            </div>
          </el-card>
        </el-col>

        <!-- 班级统计 -->
        <el-col :xs="24" :sm="12" :lg="8">
          <el-card shadow="hover" class="detail-card">
            <template #header>
              <div class="card-header">
                <span>班级课时分布</span>
                <el-button type="primary" link @click="handleViewClassDetail">
                  查看详情
                </el-button>
              </div>
            </template>
            <div class="class-stats">
              <div class="stat-row">
                <span class="label">平均课时：</span>
                <span class="value">{{ averageClassSessions.toFixed(1) }} 节</span>
              </div>
              <div class="stat-row">
                <span class="label">最高课时：</span>
                <span class="value">{{ maxClassSessions }} 节</span>
              </div>
              <div class="stat-row">
                <span class="label">最低课时：</span>
                <span class="value">{{ minClassSessions }} 节</span>
              </div>
              <div class="stat-row">
                <span class="label">标准差：</span>
                <span class="value">{{ classSessionsStdDev.toFixed(2) }}</span>
              </div>
            </div>
          </el-card>
        </el-col>
      </el-row>
    </div>

    <!-- 图表展示 -->
    <div class="charts-section">
      <el-card shadow="hover">
        <template #header>
          <div class="card-header">
            <span>课表质量分析</span>
            <el-radio-group v-model="chartType" size="small">
              <el-radio-button label="bar">柱状图</el-radio-button>
              <el-radio-button label="line">折线图</el-radio-button>
              <el-radio-button label="radar">雷达图</el-radio-button>
            </el-radio-group>
          </div>
        </template>
        <div ref="chartRef" class="chart-container" style="height: 400px"></div>
      </el-card>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch, nextTick } from 'vue';
import { ElMessage } from 'element-plus';
import { Document, User, School, TrendCharts } from '@element-plus/icons-vue';
import { useScheduleStore } from '@/stores/scheduleStore';
import { logger } from '@/utils/logger';
import * as echarts from 'echarts';
import type { ECharts } from 'echarts';

// ========== 组件日志 ==========
const logPrefix = '[ScheduleStatistics]';

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
const chartType = ref<'bar' | 'line' | 'radar'>('bar');
const chartRef = ref<HTMLDivElement>();
let chart: ECharts | null = null;

// ========== 计算属性 ==========

/** 课程总数 */
const totalCourses = computed(() => {
  return scheduleStore.schedule?.entries.length || 0;
});

/** 教师总数 */
const totalTeachers = computed(() => {
  if (!scheduleStore.schedule) return 0;
  const teacherIds = new Set(scheduleStore.schedule.entries.map((e) => e.teacherId));
  return teacherIds.size;
});

/** 班级总数 */
const totalClasses = computed(() => {
  if (!scheduleStore.schedule) return 0;
  const classIds = new Set(scheduleStore.schedule.entries.map((e) => e.classId));
  return classIds.size;
});

/** 课表代价值 */
const scheduleCost = computed(() => {
  return scheduleStore.schedule?.cost || 0;
});

/** 科目统计 */
const subjectStats = computed(() => {
  if (!scheduleStore.schedule) return [];

  const subjectMap = new Map<string, number>();
  scheduleStore.schedule.entries.forEach((entry) => {
    const count = subjectMap.get(entry.subjectId) || 0;
    subjectMap.set(entry.subjectId, count + 1);
  });

  return Array.from(subjectMap.entries())
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10); // 只显示前10个
});

/** 教师课时统计 */
const teacherSessionsStats = computed(() => {
  if (!scheduleStore.schedule) return [];

  const teacherMap = new Map<number, number>();
  scheduleStore.schedule.entries.forEach((entry) => {
    const count = teacherMap.get(entry.teacherId) || 0;
    teacherMap.set(entry.teacherId, count + 1);
  });

  return Array.from(teacherMap.values());
});

/** 教师平均课时 */
const averageTeacherSessions = computed(() => {
  const stats = teacherSessionsStats.value;
  if (stats.length === 0) return 0;
  return stats.reduce((sum, count) => sum + count, 0) / stats.length;
});

/** 教师最高课时 */
const maxTeacherSessions = computed(() => {
  const stats = teacherSessionsStats.value;
  return stats.length > 0 ? Math.max(...stats) : 0;
});

/** 教师最低课时 */
const minTeacherSessions = computed(() => {
  const stats = teacherSessionsStats.value;
  return stats.length > 0 ? Math.min(...stats) : 0;
});

/** 教师课时标准差 */
const teacherSessionsStdDev = computed(() => {
  const stats = teacherSessionsStats.value;
  if (stats.length === 0) return 0;

  const avg = averageTeacherSessions.value;
  const variance = stats.reduce((sum, count) => sum + Math.pow(count - avg, 2), 0) / stats.length;
  return Math.sqrt(variance);
});

/** 班级课时统计 */
const classSessionsStats = computed(() => {
  if (!scheduleStore.schedule) return [];

  const classMap = new Map<number, number>();
  scheduleStore.schedule.entries.forEach((entry) => {
    const count = classMap.get(entry.classId) || 0;
    classMap.set(entry.classId, count + 1);
  });

  return Array.from(classMap.values());
});

/** 班级平均课时 */
const averageClassSessions = computed(() => {
  const stats = classSessionsStats.value;
  if (stats.length === 0) return 0;
  return stats.reduce((sum, count) => sum + count, 0) / stats.length;
});

/** 班级最高课时 */
const maxClassSessions = computed(() => {
  const stats = classSessionsStats.value;
  return stats.length > 0 ? Math.max(...stats) : 0;
});

/** 班级最低课时 */
const minClassSessions = computed(() => {
  const stats = classSessionsStats.value;
  return stats.length > 0 ? Math.min(...stats) : 0;
});

/** 班级课时标准差 */
const classSessionsStdDev = computed(() => {
  const stats = classSessionsStats.value;
  if (stats.length === 0) return 0;

  const avg = averageClassSessions.value;
  const variance = stats.reduce((sum, count) => sum + Math.pow(count - avg, 2), 0) / stats.length;
  return Math.sqrt(variance);
});

// ========== 方法 ==========

/**
 * 加载统计数据
 */
const loadStatistics = async (): Promise<void> => {
  try {
    logger.info(`${logPrefix} 加载课表统计数据`);
    isLoading.value = true;

    // 确保课表数据已加载
    if (!scheduleStore.schedule) {
      await scheduleStore.loadSchedule();
    }

    const data = {
      totalCourses: totalCourses.value,
      totalTeachers: totalTeachers.value,
      totalClasses: totalClasses.value,
      scheduleCost: scheduleCost.value,
      subjectStats: subjectStats.value,
      teacherStats: {
        average: averageTeacherSessions.value,
        max: maxTeacherSessions.value,
        min: minTeacherSessions.value,
        stdDev: teacherSessionsStdDev.value,
      },
      classStats: {
        average: averageClassSessions.value,
        max: maxClassSessions.value,
        min: minClassSessions.value,
        stdDev: classSessionsStdDev.value,
      },
    };

    emit('loaded', data);
    logger.info(`${logPrefix} 课表统计数据加载成功`);

    // 初始化图表
    nextTick(() => {
      initChart();
    });
  } catch (error: any) {
    logger.error(`${logPrefix} 加载课表统计数据失败`, { error });
    ElMessage.error('加载课表统计数据失败');
  } finally {
    isLoading.value = false;
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

  if (chartType.value === 'bar') {
    updateBarChart();
  } else if (chartType.value === 'line') {
    updateLineChart();
  } else if (chartType.value === 'radar') {
    updateRadarChart();
  }
};

/**
 * 更新柱状图
 */
const updateBarChart = (): void => {
  if (!chart) return;

  const option = {
    title: {
      text: '科目课时分布',
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
      data: subjectStats.value.map((s) => s.name),
      axisLabel: {
        rotate: 45,
      },
    },
    yAxis: {
      type: 'value',
      name: '课时数',
    },
    series: [
      {
        name: '课时数',
        type: 'bar',
        data: subjectStats.value.map((s) => s.count),
        itemStyle: {
          color: '#409eff',
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
      text: '科目课时趋势',
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
      data: subjectStats.value.map((s) => s.name),
      axisLabel: {
        rotate: 45,
      },
    },
    yAxis: {
      type: 'value',
      name: '课时数',
    },
    series: [
      {
        name: '课时数',
        type: 'line',
        data: subjectStats.value.map((s) => s.count),
        smooth: true,
        itemStyle: {
          color: '#67c23a',
        },
        areaStyle: {
          color: 'rgba(103, 194, 58, 0.2)',
        },
      },
    ],
  };

  chart.setOption(option);
};

/**
 * 更新雷达图
 */
const updateRadarChart = (): void => {
  if (!chart) return;

  const indicators = [
    { name: '课程总数', max: totalCourses.value * 1.2 },
    { name: '教师总数', max: totalTeachers.value * 1.2 },
    { name: '班级总数', max: totalClasses.value * 1.2 },
    { name: '平均教师课时', max: maxTeacherSessions.value * 1.2 },
    { name: '平均班级课时', max: maxClassSessions.value * 1.2 },
  ];

  const option = {
    title: {
      text: '课表质量雷达图',
      left: 'center',
    },
    tooltip: {},
    radar: {
      indicator: indicators,
    },
    series: [
      {
        name: '课表质量',
        type: 'radar',
        data: [
          {
            value: [
              totalCourses.value,
              totalTeachers.value,
              totalClasses.value,
              averageTeacherSessions.value,
              averageClassSessions.value,
            ],
            name: '当前课表',
          },
        ],
        itemStyle: {
          color: '#e6a23c',
        },
        areaStyle: {
          color: 'rgba(230, 162, 60, 0.2)',
        },
      },
    ],
  };

  chart.setOption(option);
};

/**
 * 处理查看科目详情
 */
const handleViewSubjectDetail = (): void => {
  logger.info(`${logPrefix} 查看科目详情`);
  ElMessage.info('科目详情功能开发中');
};

/**
 * 处理查看教师详情
 */
const handleViewTeacherDetail = (): void => {
  logger.info(`${logPrefix} 查看教师详情`);
  ElMessage.info('教师详情功能开发中');
};

/**
 * 处理查看班级详情
 */
const handleViewClassDetail = (): void => {
  logger.info(`${logPrefix} 查看班级详情`);
  ElMessage.info('班级详情功能开发中');
};

// ========== 监听器 ==========

// 监听图表类型变化
watch(chartType, () => {
  updateChart();
});

// ========== 生命周期 ==========
onMounted(() => {
  logger.info(`${logPrefix} ScheduleStatistics 组件挂载`);

  if (props.autoLoad) {
    loadStatistics();
  }
});
</script>

<style scoped lang="scss">
.schedule-statistics-container {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.statistics-overview {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;

  .stat-card {
    .stat-item {
      display: flex;
      align-items: center;
      gap: 16px;

      .stat-icon {
        width: 64px;
        height: 64px;
        border-radius: 8px;
        display: flex;
        align-items: center;
        justify-content: center;
        color: white;
      }

      .stat-content {
        flex: 1;

        .stat-label {
          font-size: 14px;
          color: #909399;
          margin-bottom: 8px;
        }

        .stat-value {
          font-size: 28px;
          font-weight: 600;
          color: #303133;
        }
      }
    }
  }
}

.detailed-statistics {
  .detail-card {
    height: 100%;

    .card-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-weight: 600;
    }

    .subject-stats {
      .subject-item {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 8px 0;
        border-bottom: 1px solid #f0f0f0;

        &:last-child {
          border-bottom: none;
        }

        .subject-name {
          font-size: 14px;
          color: #303133;
        }

        .subject-count {
          font-size: 14px;
        }
      }

      .empty-text {
        text-align: center;
        color: #909399;
        padding: 20px 0;
      }
    }

    .teacher-stats,
    .class-stats {
      .stat-row {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 12px 0;
        border-bottom: 1px solid #f0f0f0;

        &:last-child {
          border-bottom: none;
        }

        .label {
          font-size: 14px;
          color: #606266;
        }

        .value {
          font-size: 16px;
          font-weight: 600;
          color: #303133;
        }
      }
    }
  }
}

.charts-section {
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

// 响应式设计
@media (max-width: 1200px) {
  .statistics-overview {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 768px) {
  .statistics-overview {
    grid-template-columns: 1fr;
  }

  .detailed-statistics {
    :deep(.el-col) {
      margin-bottom: 16px;
    }
  }
}
</style>
