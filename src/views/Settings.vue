<template>
  <div class="settings-container">
    <el-card>
      <template #header>
        <div class="card-header">
          <span>系统设置</span>
        </div>
      </template>
      <div class="settings-content">
        <el-empty description="系统设置功能开发中，敬请期待" />
      </div>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { logger } from '@/utils/logger';

// 组件初始化日志
logger.info('系统设置页面加载');
</script>

<style scoped>
.settings-container {
  max-width: 1400px;
  margin: 0 auto;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.settings-content {
  min-height: 400px;
  display: flex;
  align-items: center;
  justify-content: center;
}
</style>
