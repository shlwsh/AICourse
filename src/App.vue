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
import { useConfigStore } from '@/stores/configStore';
import { useTeacherStore } from '@/stores/teacherStore';
import { useClassStore } from '@/stores/classStore';
import { useCurriculumStore } from '@/stores/curriculumStore';

/**
 * 应用初始化
 */
onMounted(async () => {
  logger.info('排课系统应用启动', {
    version: '0.1.0',
    environment: import.meta.env.MODE,
  });

  // 初始化各个 store
  const configStore = useConfigStore();
  const teacherStore = useTeacherStore();
  const classStore = useClassStore();
  const curriculumStore = useCurriculumStore();

  try {
    // 并行加载所有数据
    logger.info('开始从数据库加载数据');
    await Promise.all([
      configStore.loadConfig(),
      teacherStore.loadTeachers(),
      classStore.loadClasses(),
      curriculumStore.loadCurriculums(),
    ]);
    logger.info('所有数据加载完成');
  } catch (error) {
    logger.error('数据加载失败', { error });
  }
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
