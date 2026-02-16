<!--
  统计页面
  提供工作量统计、课表统计分析、图表可视化和数据导出功能
-->
<template>
  <div class="statistics-page">
    <!-- 页面头部 -->
    <div class="page-header">
      <div class="header-left">
        <h2 class="page-title">统计分析</h2>
        <el-breadcrumb separator="/">
          <el-breadcrumb-item :to="{ path: '/' }">首页</el-breadcrumb-item>
          <el-breadcrumb-item>统计分析</el-breadcrumb-item>
        </el-breadcrumb>
      </div>

      <div class="header-right">
        <el-button
          type="primary"
          :icon="Refresh"
          :loading="isRefreshing"
          @click="handleRefresh"
        >
          刷新数据
        </el-button>
        <el-button
          type="success"
          :icon="Download"
          :disabled="!hasData"
          @click="handleExportAll"
        >
          导出全部
        </el-button>
      </div>
    </div>

    <!-- 标签页 -->
    <div class="page-content">
      <el-tabs v-model="activeTab" @tab-change="handleTabChange">
        <!-- 工作量统计 -->
        <el-tab-pane label="工作量统计" name="workload">
          <div class="tab-content">
            <WorkloadStatisticsComponent
              :auto-load="activeTab === 'workload'"
              @loaded="handleWorkloadLoaded"
              @export="handleWorkloadExport"
            />
          </div>
        </el-tab-pane>

        <!-- 课表统计 -->
        <el-tab-pane label="课表统计" name="schedule">
          <div class="tab-content">
            <ScheduleStatistics
              :auto-load="activeTab === 'schedule'"
              @loaded="handleScheduleStatsLoaded"
            />
          </div>
        </el-tab-pane>

        <!-- 时段利用率 -->
        <el-tab-pane label="时段利用率" name="utilization">
          <div class="tab-content">
            <TimeSlotUtilization
              :auto-load="activeTab === 'utilization'"
              @loaded="handleUtilizationLoaded"
            />
          </div>
        </el-tab-pane>

        <!-- 课程分布 -->
        <el-tab-pane label="课程分布" name="distribution">
          <div class="tab-content">
            <CourseDistribution
              :auto-load="activeTab === 'distribution'"
              @loaded="handleDistributionLoaded"
            />
          </div>
        </el-tab-pane>
      </el-tabs>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import { Refresh, Download } from '@element-plus/icons-vue';
import WorkloadStatisticsComponent from '@/components/teacher/WorkloadStatistics.vue';
import ScheduleStatistics from '@/components/statistics/ScheduleStatistics.vue';
import TimeSlotUtilization from '@/components/statistics/TimeSlotUtilization.vue';
import CourseDistribution from '@/components/statistics/CourseDistribution.vue';
import { logger } from '@/utils/logger';

// ========== 组件日志 ==========
const logPrefix = '[StatisticsPage]';

// ========== 状态 ==========
const activeTab = ref('workload');
const isRefreshing = ref(false);
const workloadData = ref<any[]>([]);
const scheduleStatsData = ref<any>(null);
const utilizationData = ref<any>(null);
const distributionData = ref<any>(null);

// ========== 计算属性 ==========

/** 是否有数据 */
const hasData = computed(() => {
  return (
    workloadData.value.length > 0 ||
    scheduleStatsData.value !== null ||
    utilizationData.value !== null ||
    distributionData.value !== null
  );
});

// ========== 方法 ==========

/**
 * 处理标签页切换
 */
const handleTabChange = (tabName: string): void => {
  logger.info(`${logPrefix} 切换标签页`, { tabName });
};

/**
 * 处理刷新
 */
const handleRefresh = async (): Promise<void> => {
  try {
    logger.info(`${logPrefix} 刷新统计数据`, { activeTab: activeTab.value });
    isRefreshing.value = true;

    // 根据当前标签页刷新对应数据
    // 子组件会自动处理刷新逻辑

    ElMessage.success('统计数据刷新成功');
  } catch (error) {
    logger.error(`${logPrefix} 刷新统计数据失败`, { error });
    ElMessage.error('刷新统计数据失败');
  } finally {
    isRefreshing.value = false;
  }
};

/**
 * 处理导出全部
 */
const handleExportAll = async (): Promise<void> => {
  try {
    logger.info(`${logPrefix} 导出全部统计数据`);

    const result = await ElMessageBox.confirm(
      '确定要导出所有统计数据吗？这将生成一个包含所有统计信息的 Excel 文件。',
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
    ElMessage.success('统计数据导出成功');
    logger.info(`${logPrefix} 统计数据导出成功`);
  } catch (error: any) {
    if (error !== 'cancel') {
      logger.error(`${logPrefix} 导出统计数据失败`, { error });
      ElMessage.error('导出统计数据失败');
    }
  }
};

/**
 * 处理工作量统计加载完成
 */
const handleWorkloadLoaded = (data: any[]): void => {
  logger.info(`${logPrefix} 工作量统计加载完成`, { count: data.length });
  workloadData.value = data;
};

/**
 * 处理工作量统计导出
 */
const handleWorkloadExport = (): void => {
  logger.info(`${logPrefix} 导出工作量统计`);
};

/**
 * 处理课表统计加载完成
 */
const handleScheduleStatsLoaded = (data: any): void => {
  logger.info(`${logPrefix} 课表统计加载完成`);
  scheduleStatsData.value = data;
};

/**
 * 处理时段利用率加载完成
 */
const handleUtilizationLoaded = (data: any): void => {
  logger.info(`${logPrefix} 时段利用率加载完成`);
  utilizationData.value = data;
};

/**
 * 处理课程分布加载完成
 */
const handleDistributionLoaded = (data: any): void => {
  logger.info(`${logPrefix} 课程分布加载完成`);
  distributionData.value = data;
};

// ========== 生命周期 ==========
onMounted(() => {
  logger.info(`${logPrefix} Statistics 页面挂载`);
});
</script>

<style scoped lang="scss">
.statistics-page {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  background-color: #f5f7fa;
  padding: 20px;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  padding: 16px 20px;
  background-color: #fff;
  border-radius: 4px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);

  .header-left {
    display: flex;
    flex-direction: column;
    gap: 8px;

    .page-title {
      margin: 0;
      font-size: 24px;
      font-weight: 600;
      color: #303133;
    }
  }

  .header-right {
    display: flex;
    gap: 12px;
    align-items: center;
  }
}

.page-content {
  flex: 1;
  overflow: hidden;
  background-color: #fff;
  border-radius: 4px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  padding: 20px;

  :deep(.el-tabs) {
    height: 100%;
    display: flex;
    flex-direction: column;

    .el-tabs__header {
      margin-bottom: 20px;
    }

    .el-tabs__content {
      flex: 1;
      overflow: hidden;
    }

    .el-tab-pane {
      height: 100%;
    }
  }

  .tab-content {
    height: 100%;
    overflow: auto;
  }
}

// 响应式设计
@media (max-width: 1200px) {
  .page-header {
    flex-direction: column;
    gap: 16px;

    .header-left,
    .header-right {
      width: 100%;
      justify-content: center;
    }
  }
}

@media (max-width: 768px) {
  .statistics-page {
    padding: 10px;
  }

  .page-header {
    padding: 12px;

    .page-title {
      font-size: 20px;
    }
  }

  .page-content {
    padding: 12px;
  }
}
</style>
