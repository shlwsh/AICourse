<!--
  Header 组件 - 顶部导航栏
  功能：
  - 显示应用标题和 Logo
  - 导航菜单
  - 用户信息/设置按钮
  - 主题切换按钮
-->
<template>
  <el-header class="app-header">
    <div class="header-content">
      <!-- Logo 和标题区域 -->
      <div class="logo-section">
        <el-icon class="logo-icon" :size="28">
          <Calendar />
        </el-icon>
        <div class="title-group">
          <h1 class="app-title">排课系统</h1>
          <span class="app-subtitle">智能课程调度</span>
        </div>
      </div>

      <!-- 导航菜单 -->
      <el-menu
        :default-active="activeMenu"
        mode="horizontal"
        :ellipsis="false"
        class="header-menu"
        @select="handleMenuSelect"
      >
        <el-menu-item index="/">
          <el-icon><HomeFilled /></el-icon>
          <span>首页</span>
        </el-menu-item>
        <el-menu-item index="/schedule">
          <el-icon><Calendar /></el-icon>
          <span>课表管理</span>
        </el-menu-item>
        <el-menu-item index="/teacher">
          <el-icon><User /></el-icon>
          <span>教师管理</span>
        </el-menu-item>
        <el-menu-item index="/import-export">
          <el-icon><Upload /></el-icon>
          <span>导入导出</span>
        </el-menu-item>
        <el-menu-item index="/statistics">
          <el-icon><DataAnalysis /></el-icon>
          <span>统计分析</span>
        </el-menu-item>
      </el-menu>

      <!-- 右侧操作区域 -->
      <div class="header-actions">
        <!-- 主题切换按钮 -->
        <el-tooltip :content="isDark ? '切换到亮色主题' : '切换到暗色主题'" placement="bottom">
          <el-button
            :icon="isDark ? Sunny : Moon"
            circle
            @click="toggleTheme"
            class="theme-toggle"
          />
        </el-tooltip>

        <!-- 帮助按钮 -->
        <el-tooltip content="帮助中心" placement="bottom">
          <el-button
            :icon="QuestionFilled"
            circle
            @click="goToHelp"
            class="help-button"
          />
        </el-tooltip>

        <!-- 设置按钮 -->
        <el-tooltip content="系统设置" placement="bottom">
          <el-button
            :icon="Setting"
            circle
            @click="goToSettings"
            class="settings-button"
          />
        </el-tooltip>
      </div>
    </div>
  </el-header>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useDark, useToggle } from '@vueuse/core';
import {
  Calendar,
  HomeFilled,
  User,
  Upload,
  DataAnalysis,
  Setting,
  QuestionFilled,
  Sunny,
  Moon,
} from '@element-plus/icons-vue';
import { logger } from '@/utils/logger';

// 路由实例
const route = useRoute();
const router = useRouter();

// 主题管理
const isDark = useDark();
const toggleDark = useToggle(isDark);

// 当前激活的菜单项
const activeMenu = computed(() => route.path);

/**
 * 处理菜单选择事件
 * @param index 菜单索引（路由路径）
 */
const handleMenuSelect = (index: string) => {
  logger.info('Header: 导航到页面', { path: index });
  router.push(index);
};

/**
 * 切换主题
 */
const toggleTheme = () => {
  toggleDark();
  logger.info('Header: 切换主题', { isDark: isDark.value });
};

/**
 * 跳转到帮助页面
 */
const goToHelp = () => {
  logger.info('Header: 打开帮助中心');
  router.push('/help');
};

/**
 * 跳转到设置页面
 */
const goToSettings = () => {
  logger.info('Header: 打开系统设置');
  router.push('/settings');
};
</script>

<style scoped>
/* 顶部导航栏样式 */
.app-header {
  background: var(--el-bg-color);
  border-bottom: 1px solid var(--el-border-color);
  padding: 0;
  height: 60px;
  display: flex;
  align-items: center;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.08);
}

.header-content {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 20px;
  gap: 20px;
}

/* Logo 和标题区域 */
.logo-section {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-shrink: 0;
}

.logo-icon {
  color: var(--el-color-primary);
}

.title-group {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.app-title {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
  color: var(--el-text-color-primary);
  line-height: 1.2;
}

.app-subtitle {
  font-size: 12px;
  color: var(--el-text-color-secondary);
  line-height: 1;
}

/* 导航菜单样式 */
.header-menu {
  flex: 1;
  border-bottom: none;
  background: transparent;
}

.header-menu .el-menu-item {
  display: flex;
  align-items: center;
  gap: 6px;
}

/* 右侧操作区域 */
.header-actions {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
}

.theme-toggle,
.help-button,
.settings-button {
  transition: all 0.3s ease;
}

.theme-toggle:hover,
.help-button:hover,
.settings-button:hover {
  transform: scale(1.1);
}

/* 响应式设计 */
@media (max-width: 768px) {
  .header-content {
    padding: 0 12px;
    gap: 12px;
  }

  .app-title {
    font-size: 16px;
  }

  .app-subtitle {
    display: none;
  }

  .header-menu .el-menu-item span {
    display: none;
  }

  .header-actions {
    gap: 4px;
  }
}
</style>
