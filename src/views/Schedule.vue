<template>
  <div class="schedule-container">
    <el-card>
      <template #header>
        <div class="card-header">
          <span>课表管理</span>
          <div class="header-actions">
            <el-button type="primary" @click="handleGenerate"> 自动排课 </el-button>
          </div>
        </div>
      </template>
      <div class="schedule-content">
        <el-empty description="课表功能开发中，敬请期待" />
      </div>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ElMessage } from 'element-plus';
import { logger } from '@/utils/logger';

/**
 * 处理自动排课
 */
const handleGenerate = () => {
  logger.info('用户触发自动排课');
  ElMessage.info('自动排课功能开发中');
};
</script>

<style scoped>
.schedule-container {
  max-width: 1400px;
  margin: 0 auto;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.schedule-content {
  min-height: 400px;
  display: flex;
  align-items: center;
  justify-content: center;
}
</style>
