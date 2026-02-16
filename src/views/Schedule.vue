<!--
  课表管理页面
  系统核心功能页面，提供课表的查看、生成、调整等功能

  功能特性：
  - 支持班级视图、教师视图、场地视图三种模式
  - 集成热力图功能，可视化显示软约束违反程度
  - 支持拖拽调课功能
  - 显示冲突检测和交换建议
  - 提供课表操作工具栏（生成、刷新、导出等）
  - 响应式设计，适配不同屏幕尺寸
-->
<template>
  <div class="schedule-page">
    <!-- 页面头部 -->
    <div class="page-header">
      <div class="header-left">
        <h2 class="page-title">课表管理</h2>
        <el-tag v-if="hasSchedule" type="success" size="large">
          已生成课表 (代价值: {{ scheduleCost }})
        </el-tag>
        <el-tag v-else type="info" size="large">未生成课表</el-tag>
      </div>

      <div class="header-right">
        <el-button-group>
          <el-button
            type="primary"
            :icon="MagicStick"
            :loading="isGenerating"
            @click="handleGenerate"
          >
            {{ isGenerating ? '生成中...' : '自动排课' }}
          </el-button>
          <el-button :icon="Lock" :disabled="!hasSchedule" @click="fixedCourseDialogVisible = true">
            固定课程
          </el-button>
          <el-button :icon="Refresh" :disabled="!hasSchedule" @click="handleRefresh">
            刷新
          </el-button>
          <el-button :icon="Download" :disabled="!hasSchedule" @click="handleExport">
            导出
          </el-button>
        </el-button-group>
      </div>
    </div>

    <!-- 课表网格 -->
    <div class="schedule-content">
      <el-card v-if="hasSchedule" class="schedule-card" shadow="never">
        <ScheduleGrid
          :cycle-days="cycleDays"
          :periods-per-day="periodsPerDay"
          @cell-click="handleCellClick"
          @entry-move="handleEntryMove"
          @refresh="handleRefresh"
          @generate="handleGenerate"
        />
      </el-card>

      <!-- 空状态 -->
      <el-card v-else class="empty-card" shadow="never">
        <el-empty description="暂无课表数据，请先生成课表" :image-size="200">
          <el-button type="primary" :icon="MagicStick" @click="handleGenerate">
            开始自动排课
          </el-button>
        </el-empty>
      </el-card>
    </div>

    <!-- 侧边栏：冲突检测和交换建议 -->
    <el-drawer
      v-model="drawerVisible"
      :title="drawerTitle"
      direction="rtl"
      size="400px"
      :before-close="handleDrawerClose"
    >
      <div v-if="selectedEntry" class="drawer-content">
        <!-- 课程信息 -->
        <el-descriptions title="课程信息" :column="1" border>
          <el-descriptions-item label="班级">
            {{ getClassName(selectedEntry.classId) }}
          </el-descriptions-item>
          <el-descriptions-item label="科目">
            {{ selectedEntry.subjectId }}
          </el-descriptions-item>
          <el-descriptions-item label="教师">
            {{ getTeacherName(selectedEntry.teacherId) }}
          </el-descriptions-item>
          <el-descriptions-item label="时间">
            星期{{ selectedEntry.timeSlot.day + 1 }} 第{{ selectedEntry.timeSlot.period + 1 }}节
          </el-descriptions-item>
          <el-descriptions-item label="类型">
            <el-tag v-if="selectedEntry.isFixed" type="warning" size="small">固定课程</el-tag>
            <el-tag v-else type="success" size="small">普通课程</el-tag>
          </el-descriptions-item>
        </el-descriptions>

        <!-- 固定课程操作 -->
        <el-divider />
        <div class="fixed-course-actions">
          <el-button
            v-if="!selectedEntry.isFixed"
            type="primary"
            :icon="Lock"
            @click="handleSetFixed"
          >
            设为固定课程
          </el-button>
          <el-button
            v-else
            type="warning"
            :icon="Unlock"
            @click="handleUnsetFixed"
          >
            解除固定
          </el-button>
        </div>

        <!-- 冲突检测结果 -->
        <el-divider />
        <h3 class="section-title">冲突检测</h3>
        <div v-if="hasConflicts" class="conflicts-list">
          <ConflictIndicator
            v-for="(conflict, index) in conflictList"
            :key="index"
            :conflict="conflict"
            :show-description="true"
            :show-details="true"
            position="center"
          />
        </div>
        <el-empty v-else description="无冲突" :image-size="100" />

        <!-- 交换建议 -->
        <el-divider />
        <h3 class="section-title">交换建议</h3>
        <SwapSuggestion
          v-if="showSwapSuggestion"
          :suggestions="swapSuggestions"
          @execute="handleExecuteSwap"
        />
        <el-empty v-else description="暂无交换建议" :image-size="100" />
      </div>
    </el-drawer>

    <!-- 固定课程管理对话框 -->
    <el-dialog
      v-model="fixedCourseDialogVisible"
      title="固定课程管理"
      width="90%"
      :before-close="handleFixedCourseDialogClose"
    >
      <FixedCourseConfig
        :cycle-days="cycleDays"
        :periods-per-day="periodsPerDay"
        @add="handleAddFixedCourse"
        @remove="handleRemoveFixedCourse"
        @batch-remove="handleBatchRemoveFixedCourse"
        @refresh="handleRefresh"
      />
    </el-dialog>

    <!-- 热力图说明对话框 -->
    <el-dialog v-model="heatmapDialogVisible" title="热力图说明" width="500px">
      <div class="heatmap-legend">
        <p>热力图根据软约束违反程度为课表单元格着色：</p>
        <ul>
          <li>
            <span class="color-box" style="background-color: rgba(0, 255, 0, 0.3)"></span>
            绿色：无违反或违反程度低
          </li>
          <li>
            <span class="color-box" style="background-color: rgba(255, 255, 0, 0.3)"></span>
            黄色：中等程度违反
          </li>
          <li>
            <span class="color-box" style="background-color: rgba(255, 0, 0, 0.3)"></span>
            红色：严重违反
          </li>
        </ul>
        <p>颜色越深，表示该时段的软约束违反越严重，建议优先调整。</p>
      </div>
      <template #footer>
        <el-button type="primary" @click="heatmapDialogVisible = false">知道了</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import { MagicStick, Refresh, Download, Lock, Unlock } from '@element-plus/icons-vue';
import ScheduleGrid from '@/components/schedule/ScheduleGrid.vue';
import ConflictIndicator from '@/components/schedule/ConflictIndicator.vue';
import SwapSuggestion from '@/components/schedule/SwapSuggestion.vue';
import FixedCourseConfig from '@/components/schedule/FixedCourseConfig.vue';
import { useScheduleStore } from '@/stores/scheduleStore';
import type { ScheduleEntry, TimeSlot } from '@/stores/scheduleStore';
import { logger } from '@/utils/logger';

// ========== 组件日志 ==========
const componentLogger = logger;

// ========== Store ==========
const scheduleStore = useScheduleStore();

// ========== 状态 ==========

/** 排课周期天数 */
const cycleDays = ref(5);

/** 每天节次数 */
const periodsPerDay = ref(8);

/** 抽屉是否可见 */
const drawerVisible = ref(false);

/** 热力图说明对话框是否可见 */
const heatmapDialogVisible = ref(false);

/** 固定课程管理对话框是否可见 */
const fixedCourseDialogVisible = ref(false);

/** 交换建议列表 */
const swapSuggestions = ref<any[]>([]);

// ========== 计算属性 ==========

/** 是否有课表 */
const hasSchedule = computed(() => scheduleStore.hasSchedule);

/** 课表代价值 */
const scheduleCost = computed(() => scheduleStore.scheduleCost);

/** 是否正在生成课表 */
const isGenerating = computed(() => scheduleStore.isGenerating);

/** 选中的课表条目 */
const selectedEntry = computed(() => scheduleStore.selectedEntry);

/** 抽屉标题 */
const drawerTitle = computed(() => {
  if (!selectedEntry.value) {
    return '课程详情';
  }
  return `${selectedEntry.value.subjectId} - ${getClassName(selectedEntry.value.classId)}`;
});

/** 是否有冲突 */
const hasConflicts = computed(() => scheduleStore.conflicts.size > 0);

/** 冲突列表 */
const conflictList = computed(() => {
  return Array.from(scheduleStore.conflicts.values());
});

/** 是否显示交换建议 */
const showSwapSuggestion = computed(() => swapSuggestions.value.length > 0);

// ========== 方法 ==========

/**
 * 获取班级名称
 */
const getClassName = (classId: number): string => {
  // TODO: 从 classStore 获取班级名称
  return `班级${classId}`;
};

/**
 * 获取教师姓名
 */
const getTeacherName = (teacherId: number): string => {
  // TODO: 从 teacherStore 获取教师姓名
  return `教师${teacherId}`;
};

/**
 * 处理自动排课
 */
const handleGenerate = async (): Promise<void> => {
  componentLogger.info('用户触发自动排课');

  try {
    // 确认操作
    if (hasSchedule.value) {
      await ElMessageBox.confirm('生成新课表将覆盖当前课表，是否继续？', '确认操作', {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning',
      });
    }

    // 生成课表
    await scheduleStore.generateSchedule();

    componentLogger.info('课表生成成功', {
      cost: scheduleCost.value,
      entryCount: scheduleStore.entryCount,
    });

    ElMessage.success('课表生成成功');
  } catch (error: any) {
    if (error === 'cancel') {
      componentLogger.info('用户取消生成课表');
      return;
    }

    componentLogger.error('生成课表失败', { error });
    ElMessage.error('生成课表失败，请检查配置后重试');
  }
};

/**
 * 处理刷新
 */
const handleRefresh = async (): Promise<void> => {
  componentLogger.info('用户触发刷新课表');

  try {
    await scheduleStore.loadSchedule();
    ElMessage.success('课表刷新成功');
  } catch (error) {
    componentLogger.error('刷新课表失败', { error });
    ElMessage.error('刷新课表失败');
  }
};

/**
 * 处理导出
 */
const handleExport = async (): Promise<void> => {
  componentLogger.info('用户触发导出课表');

  try {
    // TODO: 实现导出功能
    ElMessage.info('导出功能开发中');
  } catch (error) {
    componentLogger.error('导出课表失败', { error });
    ElMessage.error('导出课表失败');
  }
};

/**
 * 处理单元格点击
 */
const handleCellClick = (entityId: number, day: number, period: number): void => {
  componentLogger.info('单元格点击', { entityId, day, period });

  // 如果有选中的课程，显示抽屉
  if (selectedEntry.value) {
    drawerVisible.value = true;

    // 加载交换建议
    loadSwapSuggestions();
  } else {
    drawerVisible.value = false;
    swapSuggestions.value = [];
  }
};

/**
 * 处理课程移动
 */
const handleEntryMove = async (entry: ScheduleEntry, newSlot: TimeSlot): Promise<void> => {
  componentLogger.info('课程移动', {
    entry,
    newSlot,
  });

  // 移动成功后，重新加载交换建议
  if (drawerVisible.value) {
    await loadSwapSuggestions();
  }
};

/**
 * 处理抽屉关闭
 */
const handleDrawerClose = (done: () => void): void => {
  componentLogger.debug('关闭抽屉');
  scheduleStore.selectEntry(null);
  swapSuggestions.value = [];
  done();
};

/**
 * 加载交换建议
 */
const loadSwapSuggestions = async (): Promise<void> => {
  if (!selectedEntry.value) {
    return;
  }

  componentLogger.info('加载交换建议', {
    entry: selectedEntry.value,
  });

  try {
    // TODO: 调用 API 获取交换建议
    // const suggestions = await scheduleApi.suggestSwaps({
    //   targetClass: selectedEntry.value.classId,
    //   targetTeacher: selectedEntry.value.teacherId,
    //   desiredSlot: selectedEntry.value.timeSlot,
    // });
    // swapSuggestions.value = suggestions;

    componentLogger.debug('交换建议加载完成', {
      count: swapSuggestions.value.length,
    });
  } catch (error) {
    componentLogger.error('加载交换建议失败', { error });
  }
};

/**
 * 处理执行交换
 */
const handleExecuteSwap = async (swapOption: any): Promise<void> => {
  componentLogger.info('执行交换', { swapOption });

  try {
    // TODO: 调用 API 执行交换
    // await scheduleApi.executeSwap(swapOption);

    ElMessage.success('交换执行成功');

    // 刷新课表
    await handleRefresh();

    // 关闭抽屉
    drawerVisible.value = false;
  } catch (error) {
    componentLogger.error('执行交换失败', { error });
    ElMessage.error('执行交换失败');
  }
};

/**
 * 处理设置固定课程
 */
const handleSetFixed = async (): Promise<void> => {
  if (!selectedEntry.value) {
    return;
  }

  componentLogger.info('设置固定课程', { entry: selectedEntry.value });

  try {
    await ElMessageBox.confirm('确定要将该课程设为固定课程吗？', '确认操作', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'info',
    });

    await scheduleStore.setFixedCourse(selectedEntry.value);
    ElMessage.success('设置成功');

    // 刷新课表
    await handleRefresh();
  } catch (error: any) {
    if (error === 'cancel') {
      componentLogger.info('用户取消设置固定课程');
      return;
    }

    componentLogger.error('设置固定课程失败', { error });
    ElMessage.error('设置失败');
  }
};

/**
 * 处理解除固定课程
 */
const handleUnsetFixed = async (): Promise<void> => {
  if (!selectedEntry.value) {
    return;
  }

  componentLogger.info('解除固定课程', { entry: selectedEntry.value });

  try {
    await ElMessageBox.confirm('确定要解除该固定课程吗？', '确认操作', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning',
    });

    await scheduleStore.unsetFixedCourse(selectedEntry.value);
    ElMessage.success('解除成功');

    // 刷新课表
    await handleRefresh();
  } catch (error: any) {
    if (error === 'cancel') {
      componentLogger.info('用户取消解除固定课程');
      return;
    }

    componentLogger.error('解除固定课程失败', { error });
    ElMessage.error('解除失败');
  }
};

/**
 * 处理固定课程对话框关闭
 */
const handleFixedCourseDialogClose = (): void => {
  componentLogger.debug('关闭固定课程管理对话框');
  fixedCourseDialogVisible.value = false;
};

/**
 * 处理添加固定课程
 */
const handleAddFixedCourse = async (entry: ScheduleEntry): Promise<void> => {
  componentLogger.info('添加固定课程', { entry });

  try {
    await scheduleStore.setFixedCourse(entry);
    ElMessage.success('添加成功');
  } catch (error) {
    componentLogger.error('添加固定课程失败', { error });
    ElMessage.error('添加失败');
  }
};

/**
 * 处理移除固定课程
 */
const handleRemoveFixedCourse = async (entry: ScheduleEntry): Promise<void> => {
  componentLogger.info('移除固定课程', { entry });

  try {
    await scheduleStore.unsetFixedCourse(entry);
    ElMessage.success('移除成功');
  } catch (error) {
    componentLogger.error('移除固定课程失败', { error });
    ElMessage.error('移除失败');
  }
};

/**
 * 处理批量移除固定课程
 */
const handleBatchRemoveFixedCourse = async (entries: ScheduleEntry[]): Promise<void> => {
  componentLogger.info('批量移除固定课程', { count: entries.length });

  try {
    await scheduleStore.batchUnsetFixedCourses(entries);
    ElMessage.success('批量移除成功');
  } catch (error) {
    componentLogger.error('批量移除固定课程失败', { error });
    ElMessage.error('批量移除失败');
  }
};

// ========== 生命周期 ==========
onMounted(() => {
  componentLogger.info('课表页面挂载');

  // 加载课表数据
  if (hasSchedule.value) {
    scheduleStore.loadSchedule();
  }
});
</script>

<style scoped lang="scss">
.schedule-page {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  padding: 20px;
  background-color: #f5f7fa;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  padding: 16px 20px;
  background-color: #fff;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);

  .header-left {
    display: flex;
    align-items: center;
    gap: 16px;

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
  }
}

.schedule-content {
  flex: 1;
  overflow: hidden;

  .schedule-card,
  .empty-card {
    height: 100%;
    border-radius: 8px;

    :deep(.el-card__body) {
      height: 100%;
      padding: 0;
    }
  }

  .empty-card {
    display: flex;
    align-items: center;
    justify-content: center;
  }
}

.drawer-content {
  padding: 0 16px;

  .fixed-course-actions {
    display: flex;
    justify-content: center;
    margin: 16px 0;
  }

  .section-title {
    margin: 16px 0 12px;
    font-size: 16px;
    font-weight: 600;
    color: #303133;
  }

  .conflicts-list {
    display: flex;
    flex-direction: column;
    gap: 12px;
    margin-top: 12px;
  }
}

.heatmap-legend {
  padding: 16px;

  p {
    margin-bottom: 12px;
    line-height: 1.6;
    color: #606266;
  }

  ul {
    list-style: none;
    padding: 0;
    margin: 16px 0;

    li {
      display: flex;
      align-items: center;
      margin-bottom: 12px;
      font-size: 14px;
      color: #606266;

      .color-box {
        display: inline-block;
        width: 40px;
        height: 20px;
        margin-right: 12px;
        border: 1px solid #dcdfe6;
        border-radius: 4px;
      }
    }
  }
}

// 响应式设计
@media (max-width: 1200px) {
  .schedule-page {
    padding: 16px;
  }

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
  .schedule-page {
    padding: 12px;
  }

  .page-header {
    padding: 12px 16px;

    .header-left {
      flex-direction: column;
      gap: 8px;

      .page-title {
        font-size: 20px;
      }
    }

    .header-right {
      :deep(.el-button-group) {
        display: flex;
        flex-direction: column;
        width: 100%;

        .el-button {
          width: 100%;
          margin: 0;
          border-radius: 4px !important;

          & + .el-button {
            margin-top: 8px;
          }
        }
      }
    }
  }
}

// 动画效果
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

.page-header,
.schedule-content {
  animation: fadeIn 0.3s ease-out;
}

// 加载状态
.el-button.is-loading {
  position: relative;

  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background-color: rgba(255, 255, 255, 0.35);
    border-radius: inherit;
  }
}
</style>
