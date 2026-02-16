<!--
  Sidebar 组件 - 侧边栏
  功能：
  - 导航菜单
  - 可折叠功能
  - 响应式设计
-->
<template>
  <el-aside :width="isCollapsed ? '64px' : '200px'" class="app-sidebar">
    <div class="sidebar-content">
      <!-- 折叠按钮 -->
      <div class="collapse-button-wrapper">
        <el-button
          :icon="isCollapsed ? Expand : Fold"
          circle
          size="small"
          @click="toggleCollapse"
          class="collapse-button"
        />
      </div>

      <!-- 侧边栏菜单 -->
      <el-menu
        :default-active="activeMenu"
        :collapse="isCollapsed"
        :collapse-transition="true"
        class="sidebar-menu"
        @select="handleMenuSelect"
      >
        <!-- 首页 -->
        <el-menu-item index="/">
          <el-icon><HomeFilled /></el-icon>
          <template #title>首页</template>
        </el-menu-item>

        <!-- 课表管理 -->
        <el-sub-menu index="schedule">
          <template #title>
            <el-icon><Calendar /></el-icon>
            <span>课表管理</span>
          </template>
          <el-menu-item index="/schedule">
            <el-icon><View /></el-icon>
            <template #title>查看课表</template>
          </el-menu-item>
          <el-menu-item index="/schedule/generate">
            <el-icon><MagicStick /></el-icon>
            <template #title>自动排课</template>
          </el-menu-item>
          <el-menu-item index="/schedule/manual">
            <el-icon><Edit /></el-icon>
            <template #title>手动调课</template>
          </el-menu-item>
        </el-sub-menu>

        <!-- 教师管理 -->
        <el-sub-menu index="teacher">
          <template #title>
            <el-icon><User /></el-icon>
            <span>教师管理</span>
          </template>
          <el-menu-item index="/teacher">
            <el-icon><UserFilled /></el-icon>
            <template #title>教师列表</template>
          </el-menu-item>
          <el-menu-item index="/teacher/preference">
            <el-icon><Setting /></el-icon>
            <template #title>偏好设置</template>
          </el-menu-item>
          <el-menu-item index="/teacher/workload">
            <el-icon><DataLine /></el-icon>
            <template #title>工作量统计</template>
          </el-menu-item>
        </el-sub-menu>

        <!-- 导入导出 -->
        <el-menu-item index="/import-export">
          <el-icon><Upload /></el-icon>
          <template #title>导入导出</template>
        </el-menu-item>

        <!-- 统计分析 -->
        <el-menu-item index="/statistics">
          <el-icon><DataAnalysis /></el-icon>
          <template #title>统计分析</template>
        </el-menu-item>

        <!-- 系统设置 -->
        <el-menu-item index="/settings">
          <el-icon><Tools /></el-icon>
          <template #title>系统设置</template>
        </el-menu-item>

        <!-- 帮助中心 -->
        <el-menu-item index="/help">
          <el-icon><QuestionFilled /></el-icon>
          <template #title>帮助中心</template>
        </el-menu-item>
      </el-menu>
    </div>
  </el-aside>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import {
  HomeFilled,
  Calendar,
  User,
  UserFilled,
  Upload,
  DataAnalysis,
  Tools,
  QuestionFilled,
  Fold,
  Expand,
  View,
  MagicStick,
  Edit,
  Setting,
  DataLine,
} from '@element-plus/icons-vue';
import { logger } from '@/utils/logger';

// 路由实例
const route = useRoute();
const router = useRouter();

// 折叠状态
const isCollapsed = ref(false);

// 当前激活的菜单项
const activeMenu = computed(() => {
  const path = route.path;
  // 处理子路由，返回父级菜单项
  if (path.startsWith('/schedule')) return path;
  if (path.startsWith('/teacher')) return path;
  return path;
});

/**
 * 切换折叠状态
 */
const toggleCollapse = () => {
  isCollapsed.value = !isCollapsed.value;
  logger.info('Sidebar: 切换折叠状态', { isCollapsed: isCollapsed.value });
};

/**
 * 处理菜单选择事件
 * @param index 菜单索引（路由路径）
 */
const handleMenuSelect = (index: string) => {
  logger.info('Sidebar: 导航到页面', { path: index });
  router.push(index);
};
</script>

<style scoped>
/* 侧边栏样式 */
.app-sidebar {
  background: var(--el-bg-color);
  border-right: 1px solid var(--el-border-color);
  transition: width 0.3s ease;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.sidebar-content {
  height: 100%;
  display: flex;
  flex-direction: column;
}

/* 折叠按钮 */
.collapse-button-wrapper {
  padding: 12px;
  display: flex;
  justify-content: flex-end;
  border-bottom: 1px solid var(--el-border-color-lighter);
}

.collapse-button {
  transition: transform 0.3s ease;
}

.collapse-button:hover {
  transform: scale(1.1);
}

/* 侧边栏菜单 */
.sidebar-menu {
  flex: 1;
  border-right: none;
  overflow-y: auto;
  overflow-x: hidden;
}

/* 滚动条样式 */
.sidebar-menu::-webkit-scrollbar {
  width: 6px;
}

.sidebar-menu::-webkit-scrollbar-thumb {
  background: var(--el-border-color);
  border-radius: 3px;
}

.sidebar-menu::-webkit-scrollbar-thumb:hover {
  background: var(--el-border-color-dark);
}

/* 菜单项样式 */
.sidebar-menu .el-menu-item,
.sidebar-menu .el-sub-menu__title {
  display: flex;
  align-items: center;
  gap: 8px;
}

/* 折叠状态下的样式 */
.sidebar-menu.el-menu--collapse {
  width: 64px;
}

.sidebar-menu.el-menu--collapse .el-menu-item,
.sidebar-menu.el-menu--collapse .el-sub-menu__title {
  justify-content: center;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .app-sidebar {
    position: fixed;
    left: 0;
    top: 60px;
    bottom: 40px;
    z-index: 1000;
    box-shadow: 2px 0 8px rgba(0, 0, 0, 0.15);
  }

  /* 移动端默认折叠 */
  .app-sidebar:not(:hover) {
    width: 0 !important;
    border-right: none;
  }

  .app-sidebar:hover {
    width: 200px !important;
  }
}
</style>
