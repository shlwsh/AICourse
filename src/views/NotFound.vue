<template>
  <div class="not-found-container">
    <el-result icon="warning" title="404" sub-title="抱歉，您访问的页面不存在">
      <template #extra>
        <el-button type="primary" @click="goHome">
          返回首页
        </el-button>
      </template>
    </el-result>
  </div>
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router';
import { logger } from '@/utils/logger';

const router = useRouter();

/**
 * 返回首页
 */
const goHome = () => {
  logger.info('从404页面返回首页');
  router.push('/');
};
</script>

<style scoped>
.not-found-container {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 500px;
}
</style>
