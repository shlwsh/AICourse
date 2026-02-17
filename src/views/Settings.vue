<template>
  <div class="settings-container">
    <!-- 页面标题 -->
    <div class="page-header">
      <h2>系统设置</h2>
      <p class="page-description">配置排课系统的基本参数和规则</p>
    </div>

    <!-- 标签页 -->
    <el-tabs v-model="activeTab" type="border-card" class="settings-tabs">
      <!-- 系统配置 -->
      <el-tab-pane label="系统配置" name="system">
        <SystemConfig />
      </el-tab-pane>

      <!-- 科目配置 -->
      <el-tab-pane label="科目配置" name="subject">
        <SubjectConfig />
      </el-tab-pane>

      <!-- 场地配置 -->
      <el-tab-pane label="场地配置" name="venue">
        <VenueConfig />
      </el-tab-pane>

      <!-- 教研组配置 -->
      <el-tab-pane label="教研组配置" name="group">
        <TeachingGroupConfig />
      </el-tab-pane>
    </el-tabs>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { logger } from '@/utils/logger';
import { useConfigStore } from '@/stores/configStore';
import SystemConfig from '@/components/settings/SystemConfig.vue';
import SubjectConfig from '@/components/settings/SubjectConfig.vue';
import VenueConfig from '@/components/settings/VenueConfig.vue';
import TeachingGroupConfig from '@/components/settings/TeachingGroupConfig.vue';

// 组件初始化日志
logger.info('系统设置页面加载');

// 状态管理
const configStore = useConfigStore();

// 当前激活的标签页
const activeTab = ref('system');

// 组件挂载时检查配置是否已加载
onMounted(async () => {
  // 如果配置尚未加载，则加载配置
  if (!configStore.isConfigLoaded) {
    logger.info('配置未加载，开始加载系统配置');
    try {
      await configStore.loadConfig();
      logger.info('系统配置加载成功');
    } catch (error) {
      logger.error('系统配置加载失败', { error });
    }
  } else {
    logger.info('配置已加载，跳过重复加载');
  }
});
</script>

<style scoped>
.settings-container {
  max-width: 1400px;
  margin: 0 auto;
  padding: 20px;
}

.page-header {
  margin-bottom: 24px;
}

.page-header h2 {
  margin: 0 0 8px 0;
  font-size: 24px;
  font-weight: 600;
  color: #303133;
}

.page-description {
  margin: 0;
  font-size: 14px;
  color: #909399;
}

.settings-tabs {
  background: #fff;
  border-radius: 4px;
  box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.1);
}

.settings-tabs :deep(.el-tabs__content) {
  padding: 20px;
  min-height: 500px;
}
</style>
