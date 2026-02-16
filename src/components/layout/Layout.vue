<!--
  Layout 组件 - 主布局容器
  功能：
  - 整合 Header、Sidebar、Footer
  - 响应式布局
  - 路由视图区域
-->
<template>
  <div class="app-layout">
    <el-container class="layout-container">
      <!-- 顶部导航栏 -->
      <Header />

      <!-- 主体容器 -->
      <el-container class="main-container">
        <!-- 侧边栏 -->
        <Sidebar v-if="showSidebar" />

        <!-- 主内容区域 -->
        <el-main class="app-main">
          <!-- 面包屑导航 -->
          <div v-if="showBreadcrumb" class="breadcrumb-wrapper">
            <el-breadcrumb separator="/">
              <el-breadcrumb-item :to="{ path: '/' }">
                <el-icon><HomeFilled /></el-icon>
                首页
              </el-breadcrumb-item>
              <el-breadcrumb-item
                v-for="item in breadcrumbItems"
                :key="item.path"
                :to="item.path ? { path: item.path } : undefined"
              >
                {{ item.title }}
              </el-breadcrumb-item>
            </el-breadcrumb>
          </div>

          <!-- 路由视图 -->
          <div class="content-wrapper">
            <router-view v-slot="{ Component, route }">
              <transition :name="transitionName" mode="out-in">
                <keep-alive :include="cachedViews">
                  <component :is="Component" :key="route.path" />
                </keep-alive>
              </transition>
            </router-view>
          </div>
        </el-main>
      </el-container>

      <!-- 底部信息栏 -->
      <Footer />
    </el-container>

    <!-- 回到顶部按钮 -->
    <el-backtop :right="40" :bottom="80" />
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { useRoute } from 'vue-router';
import { HomeFilled } from '@element-plus/icons-vue';
import Header from './Header.vue';
import Sidebar from './Sidebar.vue';
import Footer from './Footer.vue';
import { logger } from '@/utils/logger';

// 路由实例
const route = useRoute();

// 布局配置
const showSidebar = ref(true);
const showBreadcrumb = ref(true);
const transitionName = ref('fade');

// 需要缓存的视图组件
const cachedViews = ref<string[]>(['Home', 'Schedule', 'Teacher']);

// 面包屑数据
interface BreadcrumbItem {
  title: string;
  path?: string;
}

const breadcrumbItems = computed<BreadcrumbItem[]>(() => {
  const items: BreadcrumbItem[] = [];
  const path = route.path;
  const meta = route.meta;

  // 根据路由路径生成面包屑
  if (path === '/') {
    return [];
  }

  // 一级路由
  if (path === '/schedule') {
    items.push({ title: '课表管理', path: '/schedule' });
  } else if (path === '/teacher') {
    items.push({ title: '教师管理', path: '/teacher' });
  } else if (path === '/import-export') {
    items.push({ title: '导入导出', path: '/import-export' });
  } else if (path === '/statistics') {
    items.push({ title: '统计分析', path: '/statistics' });
  } else if (path === '/settings') {
    items.push({ title: '系统设置', path: '/settings' });
  } else if (path === '/help') {
    items.push({ title: '帮助中心', path: '/help' });
  }

  // 二级路由
  if (path.startsWith('/schedule/')) {
    items.push({ title: '课表管理', path: '/schedule' });
    if (path === '/schedule/generate') {
      items.push({ title: '自动排课' });
    } else if (path === '/schedule/manual') {
      items.push({ title: '手动调课' });
    }
  } else if (path.startsWith('/teacher/')) {
    items.push({ title: '教师管理', path: '/teacher' });
    if (path === '/teacher/preference') {
      items.push({ title: '偏好设置' });
    } else if (path === '/teacher/workload') {
      items.push({ title: '工作量统计' });
    }
  }

  // 如果路由 meta 中有 title，使用 meta.title
  if (meta.title && items.length === 0) {
    items.push({ title: meta.title as string });
  }

  return items;
});

// 监听路由变化
watch(
  () => route.path,
  (newPath, oldPath) => {
    logger.debug('Layout: 路由变化', { from: oldPath, to: newPath });

    // 根据路由配置布局
    if (route.meta.hideSidebar) {
      showSidebar.value = false;
    } else {
      showSidebar.value = true;
    }

    if (route.meta.hideBreadcrumb) {
      showBreadcrumb.value = false;
    } else {
      showBreadcrumb.value = true;
    }

    // 设置页面切换动画
    if (route.meta.transition) {
      transitionName.value = route.meta.transition as string;
    } else {
      transitionName.value = 'fade';
    }
  },
  { immediate: true }
);
</script>

<style scoped>
/* 主布局容器 */
.app-layout {
  width: 100%;
  height: 100vh;
  overflow: hidden;
}

.layout-container {
  height: 100%;
  display: flex;
  flex-direction: column;
}

/* 主体容器 */
.main-container {
  flex: 1;
  overflow: hidden;
}

/* 主内容区域 */
.app-main {
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
  background: var(--el-bg-color-page);
  padding: 0;
  display: flex;
  flex-direction: column;
}

/* 面包屑导航 */
.breadcrumb-wrapper {
  padding: 12px 20px;
  background: var(--el-bg-color);
  border-bottom: 1px solid var(--el-border-color-lighter);
}

.breadcrumb-wrapper :deep(.el-breadcrumb__item) {
  display: flex;
  align-items: center;
}

.breadcrumb-wrapper :deep(.el-breadcrumb__inner) {
  display: flex;
  align-items: center;
  gap: 4px;
}

/* 内容包装器 */
.content-wrapper {
  flex: 1;
  padding: 20px;
  overflow-y: auto;
}

/* 滚动条样式 */
.app-main::-webkit-scrollbar,
.content-wrapper::-webkit-scrollbar {
  width: 8px;
  height: 8px;
}

.app-main::-webkit-scrollbar-thumb,
.content-wrapper::-webkit-scrollbar-thumb {
  background: var(--el-border-color);
  border-radius: 4px;
}

.app-main::-webkit-scrollbar-thumb:hover,
.content-wrapper::-webkit-scrollbar-thumb:hover {
  background: var(--el-border-color-dark);
}

/* 页面切换动画 - 淡入淡出 */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

/* 页面切换动画 - 滑动 */
.slide-enter-active,
.slide-leave-active {
  transition: all 0.3s ease;
}

.slide-enter-from {
  transform: translateX(20px);
  opacity: 0;
}

.slide-leave-to {
  transform: translateX(-20px);
  opacity: 0;
}

/* 页面切换动画 - 缩放 */
.zoom-enter-active,
.zoom-leave-active {
  transition: all 0.3s ease;
}

.zoom-enter-from {
  transform: scale(0.95);
  opacity: 0;
}

.zoom-leave-to {
  transform: scale(1.05);
  opacity: 0;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .content-wrapper {
    padding: 12px;
  }

  .breadcrumb-wrapper {
    padding: 8px 12px;
  }
}

@media (max-width: 480px) {
  .content-wrapper {
    padding: 8px;
  }

  .breadcrumb-wrapper {
    font-size: 12px;
  }
}
</style>
