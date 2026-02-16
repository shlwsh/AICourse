<!--
  教师管理页面
  提供教师列表展示、偏好设置、工作量统计等功能
-->
<template>
  <div class="teacher-page">
    <!-- 页面头部 -->
    <div class="page-header">
      <div class="header-left">
        <h2 class="page-title">教师管理</h2>
        <el-breadcrumb separator="/">
          <el-breadcrumb-item :to="{ path: '/' }">首页</el-breadcrumb-item>
          <el-breadcrumb-item>教师管理</el-breadcrumb-item>
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
      </div>
    </div>

    <!-- 标签页 -->
    <div class="page-content">
      <el-tabs v-model="activeTab" @tab-change="handleTabChange">
        <!-- 教师列表 -->
        <el-tab-pane label="教师列表" name="list">
          <div class="tab-content">
            <TeacherList
              :teachers="teachers"
              :loading="isLoading"
              @view-preference="handleViewPreference"
              @view-workload="handleViewWorkload"
              @refresh="loadTeachers"
            />
          </div>
        </el-tab-pane>

        <!-- 偏好设置 -->
        <el-tab-pane label="偏好设置" name="preference">
          <div class="tab-content">
            <TeacherPreferenceComponent
              :cycle-days="cycleDays"
              :periods-per-day="periodsPerDay"
              @save="handlePreferenceSave"
              @change="handlePreferenceChange"
            />
          </div>
        </el-tab-pane>

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
      </el-tabs>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue';
import { ElMessage } from 'element-plus';
import { Refresh } from '@element-plus/icons-vue';
import { useTeacherStore, type Teacher, type TeacherPreference } from '@/stores/teacherStore';
import { useConfigStore } from '@/stores/configStore';
import TeacherPreferenceComponent from '@/components/teacher/TeacherPreference.vue';
import WorkloadStatisticsComponent from '@/components/teacher/WorkloadStatistics.vue';
import { logger } from '@/utils/logger';

// ========== 组件日志 ==========
const logPrefix = '[TeacherPage]';

// ========== Store ==========
const teacherStore = useTeacherStore();
const configStore = useConfigStore();

// ========== 状态 ==========
const activeTab = ref('list');
const isLoading = ref(false);
const isRefreshing = ref(false);

// ========== 计算属性 ==========

/** 教师列表 */
const teachers = computed(() => teacherStore.teachers);

/** 排课周期天数 */
const cycleDays = computed(() => configStore.cycleDays || 5);

/** 每天节次数 */
const periodsPerDay = computed(() => configStore.periodsPerDay || 8);

// ========== 方法 ==========

/**
 * 加载教师数据
 */
const loadTeachers = async (): Promise<void> => {
  try {
    logger.info(`${logPrefix} 加载教师数据`);
    isLoading.value = true;

    await teacherStore.loadTeachers();

    logger.info(`${logPrefix} 教师数据加载成功`, {
      count: teacherStore.teacherCount,
    });
  } catch (error) {
    logger.error(`${logPrefix} 加载教师数据失败`, { error });
    ElMessage.error('加载教师数据失败');
  } finally {
    isLoading.value = false;
  }
};

/**
 * 处理标签页切换
 */
const handleTabChange = (tabName: string): void => {
  logger.info(`${logPrefix} 切换标签页`, { tabName });

  // 根据标签页加载相应数据
  if (tabName === 'list' && teachers.value.length === 0) {
    loadTeachers();
  } else if (tabName === 'workload') {
    // 工作量统计组件会自动加载
  }
};

/**
 * 处理刷新
 */
const handleRefresh = async (): Promise<void> => {
  try {
    logger.info(`${logPrefix} 刷新数据`, { activeTab: activeTab.value });
    isRefreshing.value = true;

    if (activeTab.value === 'list' || activeTab.value === 'preference') {
      await loadTeachers();
    }

    ElMessage.success('数据刷新成功');
  } catch (error) {
    logger.error(`${logPrefix} 刷新数据失败`, { error });
    ElMessage.error('刷新数据失败');
  } finally {
    isRefreshing.value = false;
  }
};

/**
 * 处理查看教师偏好
 */
const handleViewPreference = (teacher: Teacher): void => {
  logger.info(`${logPrefix} 查看教师偏好`, {
    teacherId: teacher.id,
    teacherName: teacher.name,
  });

  // 切换到偏好设置标签页
  activeTab.value = 'preference';

  // 选中该教师
  teacherStore.selectTeacher(teacher);
};

/**
 * 处理查看教师工作量
 */
const handleViewWorkload = (teacher: Teacher): void => {
  logger.info(`${logPrefix} 查看教师工作量`, {
    teacherId: teacher.id,
    teacherName: teacher.name,
  });

  // 切换到工作量统计标签页
  activeTab.value = 'workload';

  // 选中该教师
  teacherStore.selectTeacher(teacher);
};

/**
 * 处理偏好保存
 */
const handlePreferenceSave = (preferences: TeacherPreference[]): void => {
  logger.info(`${logPrefix} 偏好保存成功`, { count: preferences.length });
  ElMessage.success(`成功保存 ${preferences.length} 位教师的偏好设置`);
};

/**
 * 处理偏好变更
 */
const handlePreferenceChange = (): void => {
  logger.debug(`${logPrefix} 偏好设置已变更`);
};

/**
 * 处理工作量统计加载完成
 */
const handleWorkloadLoaded = (statistics: any[]): void => {
  logger.info(`${logPrefix} 工作量统计加载完成`, { count: statistics.length });
};

/**
 * 处理工作量统计导出
 */
const handleWorkloadExport = (): void => {
  logger.info(`${logPrefix} 导出工作量统计`);
  ElMessage.success('工作量统计导出成功');
};

// ========== 生命周期 ==========
onMounted(() => {
  logger.info(`${logPrefix} Teacher 页面挂载`);

  // 加载配置
  configStore.loadConfig();

  // 加载教师数据
  if (activeTab.value === 'list') {
    loadTeachers();
  }
});
</script>

<script lang="ts">
/**
 * 教师列表组件（内联实现）
 */
import { defineComponent, ref, computed } from 'vue';
import { ElTable, ElTableColumn, ElButton, ElInput, ElSelect, ElOption, ElTag } from 'element-plus';
import { Search } from '@element-plus/icons-vue';

const TeacherList = defineComponent({
  name: 'TeacherList',
  props: {
    teachers: {
      type: Array as () => Teacher[],
      required: true,
    },
    loading: {
      type: Boolean,
      default: false,
    },
  },
  emits: ['view-preference', 'view-workload', 'refresh'],
  setup(props, { emit }) {
    const searchKeyword = ref('');
    const selectedGroupId = ref<number | null>(null);

    // 教研组列表（模拟数据）
    const teachingGroups = ref([
      { id: 1, name: '语文组' },
      { id: 2, name: '数学组' },
      { id: 3, name: '英语组' },
      { id: 4, name: '理科组' },
      { id: 5, name: '文科组' },
    ]);

    // 过滤后的教师列表
    const filteredTeachers = computed(() => {
      let result = [...props.teachers];

      // 按教研组筛选
      if (selectedGroupId.value !== null) {
        result = result.filter((t: any) => t.teachingGroupId === selectedGroupId.value);
      }

      // 按关键词搜索
      if (searchKeyword.value) {
        const keyword = searchKeyword.value.toLowerCase();
        result = result.filter((t: any) => t.name.toLowerCase().includes(keyword));
      }

      return result;
    });

    // 获取教研组名称
    const getGroupName = (groupId: number): string => {
      const group = teachingGroups.value.find((g) => g.id === groupId);
      return group?.name || '未知';
    };

    // 处理查看偏好
    const handleViewPreference = (teacher: Teacher): void => {
      emit('view-preference', teacher);
    };

    // 处理查看工作量
    const handleViewWorkload = (teacher: Teacher): void => {
      emit('view-workload', teacher);
    };

    // 处理刷新
    const handleRefresh = (): void => {
      emit('refresh');
    };

    return {
      searchKeyword,
      selectedGroupId,
      teachingGroups,
      filteredTeachers,
      getGroupName,
      handleViewPreference,
      handleViewWorkload,
      handleRefresh,
      Search,
    };
  },
  template: `
    <div class="teacher-list-container">
      <!-- 工具栏 -->
      <div class="list-toolbar">
        <div class="toolbar-left">
          <el-input
            v-model="searchKeyword"
            placeholder="搜索教师姓名"
            :prefix-icon="Search"
            clearable
            style="width: 240px"
          />
          <el-select
            v-model="selectedGroupId"
            placeholder="按教研组筛选"
            clearable
            style="width: 180px"
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
          <el-button @click="handleRefresh">
            刷新
          </el-button>
        </div>
      </div>

      <!-- 教师表格 -->
      <div class="list-table-wrapper">
        <el-table
          :data="filteredTeachers"
          border
          stripe
          v-loading="loading"
          max-height="600"
        >
          <!-- 序号 -->
          <el-table-column type="index" label="序号" width="60" align="center" />

          <!-- 教师姓名 -->
          <el-table-column prop="name" label="教师姓名" width="150" />

          <!-- 教研组 -->
          <el-table-column prop="teachingGroupId" label="教研组" width="150">
            <template #default="{ row }">
              <el-tag v-if="row.teachingGroupId" size="small">
                {{ getGroupName(row.teachingGroupId) }}
              </el-tag>
              <span v-else class="text-muted">-</span>
            </template>
          </el-table-column>

          <!-- 创建时间 -->
          <el-table-column prop="createdAt" label="创建时间" width="180" />

          <!-- 更新时间 -->
          <el-table-column prop="updatedAt" label="更新时间" width="180" />

          <!-- 操作 -->
          <el-table-column label="操作" width="200" fixed="right" align="center">
            <template #default="{ row }">
              <el-button
                size="small"
                type="primary"
                link
                @click="handleViewPreference(row)"
              >
                偏好设置
              </el-button>
              <el-button
                size="small"
                type="success"
                link
                @click="handleViewWorkload(row)"
              >
                工作量
              </el-button>
            </template>
          </el-table-column>
        </el-table>
      </div>
    </div>
  `,
});

export default TeacherList;
</script>

<style scoped lang="scss">
.teacher-page {
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

// 教师列表样式
.teacher-list-container {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;

  .list-toolbar {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 16px;
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

  .list-table-wrapper {
    flex: 1;
    overflow: hidden;
  }

  .text-muted {
    color: #909399;
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

  .list-toolbar {
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
  .teacher-page {
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

  .list-toolbar {
    .toolbar-left,
    .toolbar-right {
      flex-direction: column;
    }
  }
}
</style>
