<!--
  App.vue - 应用根组件
  使用 Layout 组件提供统一的应用布局
-->
<template>
  <div id="app">
    <Layout />
  </div>
</template>

<script setup lang="ts">
import { onMounted } from 'vue';
import { Layout } from '@/components/layout';
import { logger } from '@/utils/logger';

/**
 * 应用初始化
 */
onMounted(() => {
  logger.info('排课系统应用启动', {
    version: '0.1.0',
    environment: import.meta.env.MODE,
  });
});
</script>

<style>
/* 全局样式 */
#app {
  width: 100%;
  height: 100vh;
  overflow: hidden;
}

/* 确保 body 和 html 占满整个视口 */
html,
body {
  margin: 0;
  padding: 0;
  width: 100%;
  height: 100%;
  overflow: hidden;
}
</style>
