<!--
  工作量统计组件
  用于展示教师的工作量统计信息，支持按教研组分组显示、排序、筛选和导出功能
-->
<template>
  <div class="workload-statistics-container">
    <!-- 工具栏 -->
    <div class="statistics-toolbar">
      <div class="toolbar-left">
        <el-input
          v-model="searchKeyword"
          placeholder="搜索教师姓名"
          :prefix-icon="Search"
          clearable
          style="width: 240px"
          @input="handleSearch"
        />
        <el-select
          v-model="selectedGroupId"
          placeholder="按教研组筛选"
          clearable
          style="width: 180px"
          @change="handleGroupFilter"
        >
          <el-option label="全部教研组" :value="null" />
          <el-option
            v-for="group in teachingGroups"
            :key="group.id"
            :label="group.name"
            :value="group.id"
          />
        </el-select>
      </div>

      <div class="toolbar-right">
        <el-button
          type="primary"
          :icon="Refresh"
          :loading="isLoading"
          @click="handleRefresh"
        >
          刷新统计
        </el-button>
        <el-button
          type="success"
          :icon="Download"
          :disabled="filteredStatistics.length === 0"
          @click="handleExport"
        >
          导出 Excel
        </el-button>
        <el-button
          :icon="PieChart"
          :disabled="filteredStatistics.length === 0"
          @click="handleShowChart"
        >
          查看图表
        </el-button>
      </div>
    </div>

    <!-- 统计概览 -->
    <div class="statistics-summary">
      <el-card shadow="hover">
        <div class="summary-item">
          <div class="summary-label">教师总数</div>
          <div class="summary-value">{{ totalTeachers }}</div>
        </div>
      </el-card>
      <el-card shadow="hover">
        <div class="summary-item">
          <div class="summary-label">平均课时</div>
          <div class="summary-value">{{ averageSessions.toFixed(1) }}</div>
        </div>
      </el-card>
      <el-card shadow="hover">
        <div class="summary-item">
          <div class="summary-label">最高课时</div>
          <div class="summary-value">{{ maxSessions }}</div>
        </div>
      </el-card>
      <el-card shadow="hover">
        <div class="summary-item">
          <div class="summary-label">最低课时</div>
          <div class="summary-value">{{ minSessions }}</div>
        </div>
      </el-card>
    </div>

    <!-- 统计表格 -->
    <div class="statistics-table-wrapper">
      <el-table
        ref="tableRef"
        :data="paginatedStatistics"
        border
        stripe
        :default-sort="{ prop: 'totalSessions', order: 'descending' }"
        @sort-change="handleSortChange"
      >
        <!-- 序号 -->
        <el-table-column
          type="index"
          label="序号"
          width="60"
          align="center"
          :index="getTableIndex"
        />

        <!-- 教师姓名 -->
        <el-table-column
          prop="teacherName"
          label="教师姓名"
          width="120"
          sortable="custom"
          fixed
        >
          <template #default="{ row }">
            <div class="teacher-name">
              {{ row.teacherName }}
            </div>
          </template>
        </el-table-column>

        <!-- 教研组 -->
        <el-table-column
          prop="teachingGroupName"
          label="教研组"
          width="120"
          sortable="custom"
        >
          <template #default="{ row }">
            <el-tag v-if="row.teachingGroupName" size="small">
              {{ row.teachingGroupName }}
            </el-tag>
            <span v-else class="text-muted">-</span>
          </template>
        </el-table-column>

        <!-- 总课时数 -->
        <el-table-column
          prop="totalSessions"
          label="总课时数"
          width="120"
          sortable="custom"
          align="center"
        >
          <template #default="{ row }">
            <el-tag :type="getSessionsTagType(row.totalSessions)" size="large">
              {{ row.totalSessions }}
            </el-tag>
          </template>
        </el-table-column>

        <!-- 授课班级数 -->
        <el-table-column
          prop="classCount"
          label="授课班级数"
          width="120"
          sortable="custom"
          align="center"
        >
          <template #default="{ row }">
            {{ row.classCount }}
          </template>
        </el-table-column>

        <!-- 授课科目 -->
        <el-table-column
          prop="subjects"
          label="授课科目"
          min-width="180"
        >
          <template #default="{ row }">
            <el-tag
              v-for="subject in row.subjects"
              :key="subject"
              size="small"
              style="margin-right: 4px"
            >
              {{ subject }}
            </el-tag>
          </template>
        </el-table-column>

        <!-- 早课节数 -->
        <el-table-column
          prop="earlySessions"
          label="早课节数"
          width="110"
          sortable="custom"
          align="center"
        >
          <template #default="{ row }">
            {{ row.earlySessions }}
          </template>
        </el-table-column>

        <!-- 晚课节数 -->
        <el-table-column
          prop="lateSessions"
          label="晚课节数"
          width="110"
          sortable="custom"
          align="center"
        >
          <template #default="{ row }">
            {{ row.lateSessions }}
          </template>
        </el-table-column>

        <!-- 工作量百分比 -->
        <el-table-column
          prop="workloadPercentage"
          label="工作量占比"
          width="140"
          sortable="custom"
          align="center"
        >
          <template #default="{ row }">
            <el-progress
              :percentage="row.workloadPercentage"
              :color="getProgressColor(row.workloadPercentage)"
            />
          </template>
        </el-table-column>

        <!-- 操作 -->
        <el-table-column label="操作" width="100" fixed="right" align="center">
          <template #default="{ row }">
            <el-button
              size="small"
              type="primary"
              link
              @click="handleViewDetail(row)"
            >
              详情
            </el-button>
          </template>
        </el-table-column>
      </el-table>

      <!-- 分页 -->
      <div class="pagination-wrapper">
        <el-pagination
          v-model:current-page="currentPage"
          v-model:page-size="pageSize"
          :page-sizes="[10, 20, 50, 100]"
          :total="filteredStatistics.length"
          layout="total, sizes, prev, pager, next, jumper"
          @size-change="handleSizeChange"
          @current-change="handleCurrentChange"
        />
      </div>
    </div>

    <!-- 图表对话框 -->
    <el-dialog
      v-model="chartDialogVisible"
      title="工作量统计图表"
      width="900px"
      @close="handleChartDialogClose"
    >
      <div class="chart-container">
        <el-tabs v-model="activeChartTab">
          <el-tab-pane label="柱状图" name="bar">
            <div ref="barChartRef" class="chart" style="height: 400px"></div>
          </el-tab-pane>
          <el-tab-pane label="饼图" name="pie">
            <div ref="pieChartRef" class="chart" style="height: 400px"></div>
          </el-tab-pane>
          <el-tab-pane label="工作量分布" name="distribution">
            <div ref="distributionChartRef" class="chart" style="height: 400px"></div>
          </el-tab-pane>
        </el-tabs>
      </div>

      <template #footer>
        <el-button type="primary" @click="chartDialogVisible = false">关闭</el-button>
      </template>
    </el-dialog>

    <!-- 详情对话框 -->
    <el-dialog
      v-model="detailDialogVisible"
      :title="`工作量详情 - ${currentStatistic?.teacherName || ''}`"
      width="700px"
    >
      <el-descriptions v-if="currentStatistic" :column="2" border>
        <el-descriptions-item label="教师姓名">
          {{ currentStatistic.teacherName }}
        </el-descriptions-item>
        <el-descriptions-item label="教研组">
          {{ currentStatistic.teachingGroupName || '-' }}
        </el-descriptions-item>
        <el-descriptions-item label="总课时数">
          <el-tag :type="getSessionsTagType(currentStatistic.totalSessions)" size="large">
            {{ currentStatistic.totalSessions }}
          </el-tag>
        </el-descriptions-item>
        <el-descriptions-item label="授课班级数">
          {{ currentStatistic.classCount }}
        </el-descriptions-item>
        <el-descriptions-item label="早课节数">
          {{ currentStatistic.earlySessions }}
        </el-descriptions-item>
        <el-descriptions-item label="晚课节数">
          {{ currentStatistic.lateSessions }}
        </el-descriptions-item>
        <el-descriptions-item label="工作量占比" :span="2">
          <el-progress
            :percentage="currentStatistic.workloadPercentage"
            :color="getProgressColor(currentStatistic.workloadPercentage)"
          />
        </el-descriptions-item>
        <el-descriptions-item label="授课科目" :span="2">
          <el-tag
            v-for="subject in currentStatistic.subjects"
            :key="subject"
            size="small"
            style="margin-right: 4px"
          >
            {{ subject }}
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
import { ElMessage, ElMessageBox } from 'element-plus';
import { Search, Refresh, Download, PieChart } from '@element-plus/icons-vue';
import { TeacherApi, type WorkloadStatistics } from '@/api/teacher';
import { logger } from '@/utils/logger';
import * as echarts from 'echarts';
import type { ECharts } from 'echarts';

// ========== 组件日志 ==========
const logPrefix = '[WorkloadStatistics]';

// ========== Props ==========
interface Props {
  /** 是否自动加载数据 */
  autoLoad?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  autoLoad: true,
});

// ========== Emits ==========
const emit = defineEmits<{
  loaded: [statistics: WorkloadStatistics[]];
  export: [];
}>();

// ========== 状态 ==========
const searchKeyword = ref('');
const selectedGroupId = ref<number | null>(null);
const isLoading = ref(false);
const statistics = ref<WorkloadStatistics[]>([]);

// 分页状态
const currentPage = ref(1);
const pageSize = ref(20);

// 排序状态
const sortProp = ref('totalSessions');
const sortOrder = ref<'ascending' | 'descending'>('descending');

// 对话框状态
const chartDialogVisible = ref(false);
const detailDialogVisible = ref(false);

// 当前查看的统计数据
const currentStatistic = ref<WorkloadStatistics | null>(null);

// 图表相关
const activeChartTab = ref('bar');
const barChartRef = ref<HTMLDivElement>();
const pieChartRef = ref<HTMLDivElement>();
const distributionChartRef = ref<HTMLDivElement>();
let barChart: ECharts | null = null;
let pieChart: ECharts | null = null;
let distributionChart: ECharts | null = null;

// 表格引用
const tableRef = ref();

// 教研组列表（模拟数据，实际应从后端获取）
const teachingGroups = ref([
  { id: 1, name: '语文组' },
  { id: 2, name: '数学组' },
  { id: 3, name: '英语组' },
  { id: 4, name: '理科组' },
  { id: 5, name: '文科组' },
]);

// ========== 计算属性 ==========

/** 过滤后的统计数据 */
const filteredStatistics = computed(() => {
  let result = [...statistics.value];

  // 按教研组筛选
  if (selectedGroupId.value !== null) {
    result = result.filter((s) => {
      const teacher = getTeacherById(s.teacherId);
      return teacher?.teachingGroupId === selectedGroupId.value;
    });
  }

  // 按关键词搜索
  if (searchKeyword.value) {
    const keyword = searchKeyword.value.toLowerCase();
    result = result.filter((s) => s.teacherName.toLowerCase().includes(keyword));
  }

  // 排序
  result.sort((a, b) => {
    let aValue: any = a[sortProp.value as keyof WorkloadStatistics];
    let bValue: any = b[sortProp.value as keyof WorkloadStatistics];

    // 处理数组类型（如 subjects）
    if (Array.isArray(aValue)) {
      aValue = aValue.length;
    }
    if (Array.isArray(bValue)) {
      bValue = bValue.length;
    }

    // 处理字符串类型
    if (typeof aValue === 'string') {
      aValue = aValue.toLowerCase();
    }
    if (typeof bValue === 'string') {
      bValue = bValue.toLowerCase();
    }

    if (sortOrder.value === 'ascending') {
      return aValue > bValue ? 1 : aValue < bValue ? -1 : 0;
    } else {
      return aValue < bValue ? 1 : aValue > bValue ? -1 : 0;
    }
  });

  return result;
});

/** 分页后的统计数据 */
const paginatedStatistics = computed(() => {
  const start = (currentPage.value - 1) * pageSize.value;
  const end = start + pageSize.value;
  return filteredStatistics.value.slice(start, end);
});

/** 教师总数 */
const totalTeachers = computed(() => filteredStatistics.value.length);

/** 平均课时数 */
const averageSessions = computed(() => {
  if (filteredStatistics.value.length === 0) return 0;
  const total = filteredStatistics.value.reduce((sum, s) => sum + s.totalSessions, 0);
  return total / filteredStatistics.value.length;
});

/** 最高课时数 */
const maxSessions = computed(() => {
  if (filteredStatistics.value.length === 0) return 0;
  return Math.max(...filteredStatistics.value.map((s) => s.totalSessions));
});

/** 最低课时数 */
const minSessions = computed(() => {
  if (filteredStatistics.value.length === 0) return 0;
  return Math.min(...filteredStatistics.value.map((s) => s.totalSessions));
});

// ========== 方法 ==========

/**
 * 获取教师信息（模拟，实际应从 store 获取）
 */
const getTeacherById = (teacherId: number) => {
  // TODO: 从 teacherStore 获取教师信息
  return null;
};

/**
 * 获取教研组名称
 */
const getGroupName = (groupId: number): string => {
  const group = teachingGroups.value.find((g) => g.id === groupId);
  return group?.name || '未知';
};

/**
 * 获取课时数标签类型
 */
const getSessionsTagType = (sessions: number): string => {
  if (sessions >= 20) return 'danger';
  if (sessions >= 15) return 'warning';
  if (sessions >= 10) return 'success';
  return 'info';
};

/**
 * 获取进度条颜色
 */
const getProgressColor = (percentage: number): string => {
  if (percentage >= 80) return '#f56c6c';
  if (percentage >= 60) return '#e6a23c';
  if (percentage >= 40) return '#409eff';
  return '#67c23a';
};

/**
 * 获取表格索引
 */
const getTableIndex = (index: number): number => {
  return (currentPage.value - 1) * pageSize.value + index + 1;
};

/**
 * 处理搜索
 */
const handleSearch = (): void => {
  logger.debug(`${logPrefix} 搜索教师`, { keyword: searchKeyword.value });
  currentPage.value = 1; // 重置到第一页
};

/**
 * 处理教研组筛选
 */
const handleGroupFilter = (): void => {
  logger.debug(`${logPrefix} 筛选教研组`, { groupId: selectedGroupId.value });
  currentPage.value = 1; // 重置到第一页
};

/**
 * 处理排序变更
 */
const handleSortChange = ({ prop, order }: { prop: string; order: string | null }): void => {
  logger.debug(`${logPrefix} 排序变更`, { prop, order });

  if (prop && order) {
    sortProp.value = prop;
    sortOrder.value = order as 'ascending' | 'descending';
  }
};

/**
 * 处理分页大小变更
 */
const handleSizeChange = (size: number): void => {
  logger.debug(`${logPrefix} 分页大小变更`, { size });
  pageSize.value = size;
  currentPage.value = 1;
};

/**
 * 处理当前页变更
 */
const handleCurrentChange = (page: number): void => {
  logger.debug(`${logPrefix} 当前页变更`, { page });
  currentPage.value = page;
};

/**
 * 加载工作量统计数据
 */
const loadStatistics = async (): Promise<void> => {
  try {
    logger.info(`${logPrefix} 开始加载工作量统计数据`);
    isLoading.value = true;

    const response = await TeacherApi.getWorkloadStatistics();

    if (response.success && response.data) {
      // 计算工作量百分比
      const maxWorkload = Math.max(...response.data.map((s) => s.totalSessions));
      statistics.value = response.data.map((s) => ({
        ...s,
        workloadPercentage: maxWorkload > 0 ? Math.round((s.totalSessions / maxWorkload) * 100) : 0,
        teachingGroupName: getTeacherGroupName(s.teacherId),
      }));

      logger.info(`${logPrefix} 工作量统计数据加载成功`, {
        count: statistics.value.length,
      });

      emit('loaded', statistics.value);
      ElMessage.success('工作量统计数据加载成功');
    } else {
      logger.error(`${logPrefix} 工作量统计数据加载失败`, {
        error: response.error || response.message,
      });
      ElMessage.error(response.message || '加载工作量统计数据失败');
    }
  } catch (error: any) {
    logger.error(`${logPrefix} 加载工作量统计数据异常`, { error });
    ElMessage.error('加载工作量统计数据失败');
  } finally {
    isLoading.value = false;
  }
};

/**
 * 获取教师教研组名称（模拟，实际应从 store 获取）
 */
const getTeacherGroupName = (teacherId: number): string => {
  // TODO: 从 teacherStore 获取教师信息并返回教研组名称
  return '';
};

/**
 * 处理刷新
 */
const handleRefresh = async (): Promise<void> => {
  logger.info(`${logPrefix} 刷新工作量统计`);
  await loadStatistics();
};

/**
 * 处理导出
 */
const handleExport = async (): Promise<void> => {
  try {
    logger.info(`${logPrefix} 导出工作量统计到 Excel`);

    const result = await ElMessageBox.confirm(
      `确定要导出 ${filteredStatistics.value.length} 位教师的工作量统计数据吗？`,
      '确认导出',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'info',
      }
    );

    if (result !== 'confirm') {
      return;
    }

    // TODO: 调用导出 API
    // await exportWorkloadStatistics(filteredStatistics.value);

    emit('export');
    ElMessage.success('工作量统计导出成功');
    logger.info(`${logPrefix} 工作量统计导出成功`, {
      count: filteredStatistics.value.length,
    });
  } catch (error: any) {
    if (error !== 'cancel') {
      logger.error(`${logPrefix} 导出工作量统计失败`, { error });
      ElMessage.error('导出工作量统计失败');
    }
  }
};

/**
 * 处理查看详情
 */
const handleViewDetail = (statistic: WorkloadStatistics): void => {
  logger.info(`${logPrefix} 查看工作量详情`, {
    teacherId: statistic.teacherId,
    teacherName: statistic.teacherName,
  });
  currentStatistic.value = statistic;
  detailDialogVisible.value = true;
};

/**
 * 处理显示图表
 */
const handleShowChart = (): void => {
  logger.info(`${logPrefix} 显示工作量统计图表`);
  chartDialogVisible.value = true;

  // 等待对话框渲染完成后初始化图表
  nextTick(() => {
    initCharts();
  });
};

/**
 * 处理图表对话框关闭
 */
const handleChartDialogClose = (): void => {
  // 销毁图表实例
  if (barChart) {
    barChart.dispose();
    barChart = null;
  }
  if (pieChart) {
    pieChart.dispose();
    pieChart = null;
  }
  if (distributionChart) {
    distributionChart.dispose();
    distributionChart = null;
  }
};

/**
 * 初始化图表
 */
const initCharts = (): void => {
  logger.debug(`${logPrefix} 初始化图表`);

  // 初始化柱状图
  if (barChartRef.value) {
    barChart = echarts.init(barChartRef.value);
    updateBarChart();
  }

  // 初始化饼图
  if (pieChartRef.value) {
    pieChart = echarts.init(pieChartRef.value);
    updatePieChart();
  }

  // 初始化分布图
  if (distributionChartRef.value) {
    distributionChart = echarts.init(distributionChartRef.value);
    updateDistributionChart();
  }
};

/**
 * 更新柱状图
 */
const updateBarChart = (): void => {
  if (!barChart) return;

  const data = filteredStatistics.value
    .slice(0, 20) // 只显示前20位教师
    .sort((a, b) => b.totalSessions - a.totalSessions);

  const option = {
    title: {
      text: '教师课时数排名（前20）',
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
      data: data.map((s) => s.teacherName),
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
        data: data.map((s) => s.totalSessions),
        itemStyle: {
          color: (params: any) => {
            const value = params.value;
            if (value >= 20) return '#f56c6c';
            if (value >= 15) return '#e6a23c';
            if (value >= 10) return '#409eff';
            return '#67c23a';
          },
        },
      },
    ],
  };

  barChart.setOption(option);
};

/**
 * 更新饼图
 */
const updatePieChart = (): void => {
  if (!pieChart) return;

  // 按教研组统计课时数
  const groupStats = new Map<string, number>();
  filteredStatistics.value.forEach((s) => {
    const groupName = s.teachingGroupName || '未分组';
    groupStats.set(groupName, (groupStats.get(groupName) || 0) + s.totalSessions);
  });

  const data = Array.from(groupStats.entries()).map(([name, value]) => ({
    name,
    value,
  }));

  const option = {
    title: {
      text: '各教研组课时分布',
      left: 'center',
    },
    tooltip: {
      trigger: 'item',
      formatter: '{a} <br/>{b}: {c} ({d}%)',
    },
    legend: {
      orient: 'vertical',
      left: 'left',
    },
    series: [
      {
        name: '课时数',
        type: 'pie',
        radius: '50%',
        data,
        emphasis: {
          itemStyle: {
            shadowBlur: 10,
            shadowOffsetX: 0,
            shadowColor: 'rgba(0, 0, 0, 0.5)',
          },
        },
      },
    ],
  };

  pieChart.setOption(option);
};

/**
 * 更新分布图
 */
const updateDistributionChart = (): void => {
  if (!distributionChart) return;

  // 统计课时数分布
  const distribution = {
    '0-5': 0,
    '6-10': 0,
    '11-15': 0,
    '16-20': 0,
    '20+': 0,
  };

  filteredStatistics.value.forEach((s) => {
    const sessions = s.totalSessions;
    if (sessions <= 5) distribution['0-5']++;
    else if (sessions <= 10) distribution['6-10']++;
    else if (sessions <= 15) distribution['11-15']++;
    else if (sessions <= 20) distribution['16-20']++;
    else distribution['20+']++;
  });

  const option = {
    title: {
      text: '工作量分布情况',
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
      data: Object.keys(distribution),
      name: '课时数区间',
    },
    yAxis: {
      type: 'value',
      name: '教师人数',
    },
    series: [
      {
        name: '教师人数',
        type: 'bar',
        data: Object.values(distribution),
        itemStyle: {
          color: '#409eff',
        },
      },
    ],
  };

  distributionChart.setOption(option);
};

// ========== 监听器 ==========

// 监听图表标签页切换
watch(activeChartTab, (newTab) => {
  logger.debug(`${logPrefix} 切换图表标签页`, { tab: newTab });

  nextTick(() => {
    // 根据当前标签页更新对应的图表
    if (newTab === 'bar' && barChart) {
      barChart.resize();
      updateBarChart();
    } else if (newTab === 'pie' && pieChart) {
      pieChart.resize();
      updatePieChart();
    } else if (newTab === 'distribution' && distributionChart) {
      distributionChart.resize();
      updateDistributionChart();
    }
  });
});

// ========== 生命周期 ==========
onMounted(() => {
  logger.info(`${logPrefix} WorkloadStatistics 组件挂载`);

  // 自动加载数据
  if (props.autoLoad) {
    loadStatistics();
  }
});
</script>

<style scoped lang="scss">
.workload-statistics-container {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  background-color: #fff;
  border-radius: 4px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.statistics-toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px;
  border-bottom: 1px solid #e0e0e0;

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

.statistics-summary {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
  padding: 16px;
  background-color: #f5f7fa;

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

.statistics-table-wrapper {
  flex: 1;
  overflow: hidden;
  padding: 16px;
  display: flex;
  flex-direction: column;
}

.teacher-name {
  font-weight: 500;
  color: #303133;
}

.text-muted {
  color: #909399;
}

.pagination-wrapper {
  display: flex;
  justify-content: center;
  margin-top: 16px;
  padding-top: 16px;
  border-top: 1px solid #e0e0e0;
}

.chart-container {
  width: 100%;
  min-height: 450px;

  .chart {
    width: 100%;
  }
}

// 响应式设计
@media (max-width: 1200px) {
  .statistics-summary {
    grid-template-columns: repeat(2, 1fr);
  }

  .statistics-toolbar {
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
  .statistics-summary {
    grid-template-columns: 1fr;
  }

  .statistics-toolbar {
    .toolbar-left,
    .toolbar-right {
      flex-direction: column;
    }
  }
}
</style>
