<template>
  <div class="home-container">
    <el-card class="welcome-card">
      <template #header>
        <div class="card-header">
          <span>欢迎使用排课系统</span>
        </div>
      </template>
      <div class="welcome-content">
        <h2>智能课程调度系统</h2>
        <p>基于约束优化问题（COP）的自动排课解决方案</p>

        <el-row :gutter="20" class="feature-cards">
          <el-col :span="8">
            <el-card shadow="hover">
              <div class="feature-item">
                <el-icon :size="40" color="#409EFF">
                  <Calendar />
                </el-icon>
                <h3>自动排课</h3>
                <p>智能算法自动生成满足所有约束的课表</p>
              </div>
            </el-card>
          </el-col>
          <el-col :span="8">
            <el-card shadow="hover">
              <div class="feature-item">
                <el-icon :size="40" color="#67C23A">
                  <Edit />
                </el-icon>
                <h3>手动调课</h3>
                <p>可视化拖拽操作，实时冲突检测</p>
              </div>
            </el-card>
          </el-col>
          <el-col :span="8">
            <el-card shadow="hover">
              <div class="feature-item">
                <el-icon :size="40" color="#E6A23C">
                  <User />
                </el-icon>
                <h3>教师管理</h3>
                <p>灵活配置教师偏好和工作量统计</p>
              </div>
            </el-card>
          </el-col>
        </el-row>

        <div class="quick-actions">
          <el-button type="primary" size="large" @click="goToSchedule"> 开始排课 </el-button>
          <el-button size="large" @click="goToSettings"> 系统设置 </el-button>
        </div>
      </div>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router';
import { Calendar, Edit, User } from '@element-plus/icons-vue';
import { logger } from '@/utils/logger';

const router = useRouter();

/**
 * 导航到课表管理页面
 */
const goToSchedule = () => {
  logger.info('用户点击开始排课');
  router.push('/schedule');
};

/**
 * 导航到系统设置页面
 */
const goToSettings = () => {
  logger.info('用户点击系统设置');
  router.push('/settings');
};
</script>

<style scoped>
.home-container {
  max-width: 1200px;
  margin: 0 auto;
}

.welcome-card {
  margin-bottom: 20px;
}

.card-header {
  font-size: 18px;
  font-weight: 600;
}

.welcome-content {
  text-align: center;
  padding: 40px 20px;
}

.welcome-content h2 {
  font-size: 32px;
  margin-bottom: 10px;
  color: #303133;
}

.welcome-content > p {
  font-size: 16px;
  color: #606266;
  margin-bottom: 40px;
}

.feature-cards {
  margin-bottom: 40px;
}

.feature-item {
  text-align: center;
  padding: 20px;
}

.feature-item h3 {
  margin: 15px 0 10px;
  font-size: 18px;
  color: #303133;
}

.feature-item p {
  font-size: 14px;
  color: #909399;
  line-height: 1.6;
}

.quick-actions {
  display: flex;
  gap: 15px;
  justify-content: center;
}
</style>
