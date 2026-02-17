<template>
  <div class="home-container">
    <!-- 欢迎横幅 -->
    <el-card class="welcome-banner" shadow="never">
      <div class="banner-content">
        <div class="banner-text">
          <h1>欢迎使用排课系统</h1>
          <p>智能课程调度系统 - 基于约束优化问题（COP）的自动排课解决方案</p>
        </div>
        <div class="banner-actions">
          <el-button type="primary" size="large" :icon="Calendar" @click="goToSchedule">
            开始排课
          </el-button>
          <el-button size="large" :icon="Setting" @click="goToSettings"> 系统设置 </el-button>
        </div>
      </div>
    </el-card>

    <!-- 系统概览统计卡片 -->
    <el-row :gutter="20" class="stats-row">
      <el-col :xs="24" :sm="12" :md="6">
        <el-card shadow="hover" class="stat-card">
          <div class="stat-content">
            <div class="stat-icon" style="background-color: #ecf5ff">
              <el-icon :size="32" color="#409eff">
                <Calendar />
              </el-icon>
            </div>
            <div class="stat-info">
              <div class="stat-label">课表状态</div>
              <div class="stat-value">
                <el-tag v-if="scheduleStore.hasSchedule" type="success" size="large">
                  已生成
                </el-tag>
                <el-tag v-else type="info" size="large">未生成</el-tag>
              </div>
            </div>
          </div>
        </el-card>
      </el-col>

      <el-col :xs="24" :sm="12" :md="6">
        <el-card shadow="hover" class="stat-card">
          <div class="stat-content">
            <div class="stat-icon" style="background-color: #f0f9ff">
              <el-icon :size="32" color="#67c23a">
                <Document />
              </el-icon>
            </div>
            <div class="stat-info">
              <div class="stat-label">课程总数</div>
              <div class="stat-value">{{ scheduleStore.entryCount }}</div>
            </div>
          </div>
        </el-card>
      </el-col>

      <el-col :xs="24" :sm="12" :md="6">
        <el-card shadow="hover" class="stat-card">
          <div class="stat-content">
            <div class="stat-icon" style="background-color: #fef0f0">
              <el-icon :size="32" color="#f56c6c">
                <TrendCharts />
              </el-icon>
            </div>
            <div class="stat-info">
              <div class="stat-label">课表代价值</div>
              <div class="stat-value">{{ scheduleStore.scheduleCost }}</div>
            </div>
          </div>
        </el-card>
      </el-col>

      <el-col :xs="24" :sm="12" :md="6">
        <el-card shadow="hover" class="stat-card">
          <div class="stat-content">
            <div class="stat-icon" style="background-color: #fdf6ec">
              <el-icon :size="32" color="#e6a23c">
                <User />
              </el-icon>
            </div>
            <div class="stat-info">
              <div class="stat-label">教师总数</div>
              <div class="stat-value">{{ teacherCount }}</div>
            </div>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <!-- 快捷操作区域 -->
    <el-row :gutter="20" class="quick-actions-row">
      <el-col :xs="24" :sm="12" :md="8">
        <el-card shadow="hover" class="action-card" @click="handleGenerateSchedule">
          <div class="action-content">
            <el-icon :size="48" color="#409eff">
              <MagicStick />
            </el-icon>
            <h3>生成课表</h3>
            <p>使用智能算法自动生成满足所有约束的课表</p>
          </div>
        </el-card>
      </el-col>

      <el-col :xs="24" :sm="12" :md="8">
        <el-card shadow="hover" class="action-card" @click="goToSchedule">
          <div class="action-content">
            <el-icon :size="48" color="#67c23a">
              <View />
            </el-icon>
            <h3>查看课表</h3>
            <p>查看和管理当前课表，支持拖拽调整</p>
          </div>
        </el-card>
      </el-col>

      <el-col :xs="24" :sm="12" :md="8">
        <el-card shadow="hover" class="action-card" @click="goToTeacher">
          <div class="action-content">
            <el-icon :size="48" color="#e6a23c">
              <User />
            </el-icon>
            <h3>教师管理</h3>
            <p>配置教师偏好和查看工作量统计</p>
          </div>
        </el-card>
      </el-col>

      <el-col :xs="24" :sm="12" :md="8">
        <el-card shadow="hover" class="action-card" @click="goToImportExport">
          <div class="action-content">
            <el-icon :size="48" color="#909399">
              <Upload />
            </el-icon>
            <h3>导入导出</h3>
            <p>批量导入排课条件或导出课表数据</p>
          </div>
        </el-card>
      </el-col>

      <el-col :xs="24" :sm="12" :md="8">
        <el-card shadow="hover" class="action-card" @click="goToStatistics">
          <div class="action-content">
            <el-icon :size="48" color="#f56c6c">
              <DataAnalysis />
            </el-icon>
            <h3>统计分析</h3>
            <p>查看教学工作量和课表质量分析</p>
          </div>
        </el-card>
      </el-col>

      <el-col :xs="24" :sm="12" :md="8">
        <el-card shadow="hover" class="action-card" @click="goToSettings">
          <div class="action-content">
            <el-icon :size="48" color="#606266">
              <Setting />
            </el-icon>
            <h3>系统设置</h3>
            <p>配置系统参数和约束规则</p>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <!-- 最近操作历史 -->
    <el-card class="recent-activities" shadow="never">
      <template #header>
        <div class="card-header">
          <span>最近操作</span>
          <el-button text type="primary" @click="clearActivities">清空</el-button>
        </div>
      </template>
      <el-empty v-if="recentActivities.length === 0" description="暂无操作记录" />
      <el-timeline v-else>
        <el-timeline-item
          v-for="(activity, index) in recentActivities"
          :key="index"
          :timestamp="activity.timestamp"
          :type="activity.type"
          placement="top"
        >
          <div class="activity-content">
            <strong>{{ activity.title }}</strong>
            <p v-if="activity.description">{{ activity.description }}</p>
          </div>
        </el-timeline-item>
      </el-timeline>
    </el-card>

    <!-- 系统通知 -->
    <el-card v-if="systemNotifications.length > 0" class="notifications" shadow="never">
      <template #header>
        <div class="card-header">
          <span>系统通知</span>
        </div>
      </template>
      <el-alert
        v-for="(notification, index) in systemNotifications"
        :key="index"
        :title="notification.title"
        :type="notification.type"
        :description="notification.description"
        :closable="true"
        show-icon
        class="notification-item"
        @close="removeNotification(index)"
      />
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { useRouter } from 'vue-router';
import { ElMessage, ElMessageBox } from 'element-plus';
import {
  Calendar,
  Setting,
  Document,
  TrendCharts,
  User,
  MagicStick,
  View,
  Upload,
  DataAnalysis,
} from '@element-plus/icons-vue';
import { useScheduleStore } from '@/stores/scheduleStore';
import { useDataStore } from '@/stores/dataStore';
import { useTeacherStore } from '@/stores/teacherStore';
import { logger } from '@/utils/logger';

// ========== 路由和状态管理 ==========
const router = useRouter();
const scheduleStore = useScheduleStore();
const dataStore = useDataStore();
const teacherStore = useTeacherStore();

// ========== 响应式数据 ==========

// 教师总数
const teacherCount = computed(() => teacherStore.teachers.length);

// 最近操作历史
interface Activity {
  title: string;
  description?: string;
  timestamp: string;
  type: 'primary' | 'success' | 'warning' | 'danger' | 'info';
}

const recentActivities = ref<Activity[]>([]);

// 系统通知
interface Notification {
  title: string;
  description: string;
  type: 'success' | 'warning' | 'info' | 'error';
}

const systemNotifications = ref<Notification[]>([]);

// ========== 生命周期钩子 ==========

onMounted(async () => {
  logger.info('主页加载');

  // 加载课表数据
  try {
    await scheduleStore.loadSchedule();
    logger.info('课表数据加载成功');
  } catch (error) {
    logger.error('加载课表数据失败', { error });
  }

  // 加载教师数据
  try {
    await teacherStore.loadTeachers();
    logger.info('教师数据加载成功');
  } catch (error) {
    logger.error('加载教师数据失败', { error });
  }

  // 加载最近操作历史
  loadRecentActivities();

  // 检查系统状态并生成通知
  checkSystemStatus();
});

// ========== 导航方法 ==========

/**
 * 导航到课表管理页面
 */
const goToSchedule = () => {
  logger.info('用户点击查看课表');
  addActivity('查看课表', '进入课表管理页面', 'primary');
  router.push('/schedule');
};

/**
 * 导航到教师管理页面
 */
const goToTeacher = () => {
  logger.info('用户点击教师管理');
  addActivity('教师管理', '进入教师管理页面', 'primary');
  router.push('/teacher');
};

/**
 * 导航到导入导出页面
 */
const goToImportExport = () => {
  logger.info('用户点击导入导出');
  addActivity('导入导出', '进入导入导出页面', 'primary');
  router.push('/import-export');
};

/**
 * 导航到统计分析页面
 */
const goToStatistics = () => {
  logger.info('用户点击统计分析');
  addActivity('统计分析', '进入统计分析页面', 'primary');
  router.push('/statistics');
};

/**
 * 导航到系统设置页面
 */
const goToSettings = () => {
  logger.info('用户点击系统设置');
  addActivity('系统设置', '进入系统设置页面', 'primary');
  router.push('/settings');
};

// ========== 操作方法 ==========

/**
 * 处理生成课表操作
 */
const handleGenerateSchedule = async () => {
  logger.info('用户点击生成课表');

  try {
    await ElMessageBox.confirm('确定要生成新的课表吗？这将覆盖现有课表。', '确认操作', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning',
    });

    logger.info('用户确认生成课表');
    addActivity('生成课表', '开始生成新课表', 'warning');

    // 先加载基础数据（确保数据是最新的）
    await dataStore.loadAllData();

    await scheduleStore.generateSchedule();

    ElMessage.success('课表生成成功');
    addActivity('生成课表', '课表生成成功', 'success');
    logger.info('课表生成成功');
  } catch (error: any) {
    if (error !== 'cancel') {
      ElMessage.error('生成课表失败：' + error.message);
      addActivity('生成课表', '课表生成失败', 'danger');
      logger.error('生成课表失败', { error });
    } else {
      logger.info('用户取消生成课表');
    }
  }
};

/**
 * 添加操作记录
 */
const addActivity = (title: string, description: string, type: Activity['type']) => {
  const activity: Activity = {
    title,
    description,
    timestamp: new Date().toLocaleString('zh-CN'),
    type,
  };

  recentActivities.value.unshift(activity);

  // 只保留最近10条记录
  if (recentActivities.value.length > 10) {
    recentActivities.value = recentActivities.value.slice(0, 10);
  }

  // 保存到本地存储
  saveActivitiesToStorage();
};

/**
 * 清空操作历史
 */
const clearActivities = () => {
  logger.info('清空操作历史');
  recentActivities.value = [];
  localStorage.removeItem('recentActivities');
  ElMessage.success('操作历史已清空');
};

/**
 * 从本地存储加载操作历史
 */
const loadRecentActivities = () => {
  try {
    const stored = localStorage.getItem('recentActivities');
    if (stored) {
      recentActivities.value = JSON.parse(stored);
      logger.debug('加载操作历史', { count: recentActivities.value.length });
    }
  } catch (error) {
    logger.error('加载操作历史失败', { error });
  }
};

/**
 * 保存操作历史到本地存储
 */
const saveActivitiesToStorage = () => {
  try {
    localStorage.setItem('recentActivities', JSON.stringify(recentActivities.value));
  } catch (error) {
    logger.error('保存操作历史失败', { error });
  }
};

/**
 * 移除通知
 */
const removeNotification = (index: number) => {
  systemNotifications.value.splice(index, 1);
};

/**
 * 检查系统状态并生成通知
 */
const checkSystemStatus = () => {
  // 检查是否有课表
  if (!scheduleStore.hasSchedule) {
    systemNotifications.value.push({
      title: '提示',
      description: '系统中还没有课表，请先生成课表或导入数据。',
      type: 'info',
    });
  }

  // 检查课表代价值
  if (scheduleStore.hasSchedule && scheduleStore.scheduleCost > 1000) {
    systemNotifications.value.push({
      title: '课表质量提示',
      description: `当前课表代价值较高（${scheduleStore.scheduleCost}），建议调整教师偏好或手动优化课表。`,
      type: 'warning',
    });
  }

  // 检查教师数据
  if (teacherCount.value === 0) {
    systemNotifications.value.push({
      title: '提示',
      description: '系统中还没有教师数据，请先导入教师信息。',
      type: 'info',
    });
  }
};
</script>

<style scoped>
/* 容器样式 */
.home-container {
  padding: 20px;
  max-width: 1400px;
  margin: 0 auto;
}

/* 欢迎横幅 */
.welcome-banner {
  margin-bottom: 20px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border: none;
}

.welcome-banner :deep(.el-card__body) {
  padding: 30px;
}

.banner-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 20px;
}

.banner-text h1 {
  font-size: 28px;
  margin: 0 0 10px 0;
  font-weight: 600;
}

.banner-text p {
  font-size: 16px;
  margin: 0;
  opacity: 0.9;
}

.banner-actions {
  display: flex;
  gap: 12px;
}

/* 统计卡片行 */
.stats-row {
  margin-bottom: 20px;
}

.stat-card {
  height: 100%;
  transition: transform 0.2s;
}

.stat-card:hover {
  transform: translateY(-4px);
}

.stat-content {
  display: flex;
  align-items: center;
  gap: 16px;
}

.stat-icon {
  width: 64px;
  height: 64px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.stat-info {
  flex: 1;
}

.stat-label {
  font-size: 14px;
  color: #909399;
  margin-bottom: 8px;
}

.stat-value {
  font-size: 24px;
  font-weight: 600;
  color: #303133;
}

/* 快捷操作行 */
.quick-actions-row {
  margin-bottom: 20px;
}

.action-card {
  height: 100%;
  cursor: pointer;
  transition: all 0.3s;
}

.action-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.action-content {
  text-align: center;
  padding: 20px;
}

.action-content h3 {
  font-size: 18px;
  margin: 16px 0 8px;
  color: #303133;
}

.action-content p {
  font-size: 14px;
  color: #909399;
  line-height: 1.6;
  margin: 0;
}

/* 最近操作 */
.recent-activities {
  margin-bottom: 20px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 16px;
  font-weight: 600;
}

.activity-content strong {
  color: #303133;
  font-size: 14px;
}

.activity-content p {
  margin: 4px 0 0;
  font-size: 13px;
  color: #909399;
}

/* 系统通知 */
.notifications {
  margin-bottom: 20px;
}

.notification-item {
  margin-bottom: 12px;
}

.notification-item:last-child {
  margin-bottom: 0;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .home-container {
    padding: 12px;
  }

  .banner-content {
    flex-direction: column;
    text-align: center;
  }

  .banner-text h1 {
    font-size: 24px;
  }

  .banner-text p {
    font-size: 14px;
  }

  .banner-actions {
    width: 100%;
    justify-content: center;
  }

  .stat-value {
    font-size: 20px;
  }

  .action-content {
    padding: 16px;
  }

  .action-content h3 {
    font-size: 16px;
  }

  .action-content p {
    font-size: 13px;
  }
}
</style>
