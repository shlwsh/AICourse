<template>
  <div id="app" class="app-container">
    <!-- 主布局容器 -->
    <el-container class="layout-container">
      <!-- 顶部导航栏 -->
      <el-header class="app-header">
        <div class="header-content">
          <div class="logo-section">
            <h1 class="app-title">
              排课系统
            </h1>
            <span class="app-subtitle">智能课程调度</span>
          </div>
          <el-menu
            :default-active="activeMenu"
            mode="horizontal"
            :ellipsis="false"
            @select="handleMenuSelect"
          >
            <el-menu-item index="/">
              首页
            </el-menu-item>
            <el-menu-item index="/schedule">
              课表管理
            </el-menu-item>
            <el-menu-item index="/teacher">
              教师管理
            </el-menu-item>
            <el-menu-item index="/settings">
              系统设置
            </el-menu-item>
          </el-menu>
        </div>
      </el-header>

      <!-- 主内容区域 -->
      <el-main class="app-main">
        <router-view v-slot="{ Component }">
          <transition name="fade" mode="out-in">
            <component :is="Component" />
          </transition>
        </router-view>
      </el-main>

      <!-- 底部信息栏 -->
      <el-footer class="app-footer">
        <div class="footer-content">
          <span>© 2024 排课系统 - 基于约束优化的智能课程调度</span>
          <span>版本: {{ version }}</span>
        </div>
      </el-footer>
    </el-container>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { logger } from '@/utils/logger';

// 路由实例
const route = useRoute();
const router = useRouter();

// 应用版本
const version = ref('0.1.0');

// 当前激活的菜单项
const activeMenu = computed(() => route.path);

/**
 * 处理菜单选择事件
 * @param index 菜单索引（路由路径）
 */
const handleMenuSelect = (index: string) => {
  logger.info('导航到页面', { path: index });
  router.push(index);
};

// 组件挂载时的初始化
onMounted(() => {
  logger.info('应用启动', { version: version.value });
});
</script>

<style scoped>
.app-container {
  width: 100%;
  height: 100vh;
  overflow: hidden;
}

.layout-container {
  height: 100%;
  display: flex;
  flex-direction: column;
}

/* 顶部导航栏样式 */
.app-header {
  background: #ffffff;
  border-bottom: 1px solid #e4e7ed;
  padding: 0;
  height: 60px;
  display: flex;
  align-items: center;
}

.header-content {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 20px;
}

.logo-section {
  display: flex;
  align-items: baseline;
  gap: 12px;
}

.app-title {
  margin: 0;
  font-size: 20px;
  font-weight: 600;
  color: #303133;
}

.app-subtitle {
  font-size: 14px;
  color: #909399;
}

/* 主内容区域样式 */
.app-main {
  flex: 1;
  overflow-y: auto;
  background: #f5f7fa;
  padding: 20px;
}

/* 底部信息栏样式 */
.app-footer {
  background: #ffffff;
  border-top: 1px solid #e4e7ed;
  height: 40px;
  display: flex;
  align-items: center;
  padding: 0 20px;
}

.footer-content {
  width: 100%;
  display: flex;
  justify-content: space-between;
  font-size: 12px;
  color: #909399;
}

/* 页面切换动画 */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
