/**
 * Vue Router 路由配置
 * 定义应用的所有路由规则
 */
import { createRouter, createWebHistory, RouteRecordRaw } from 'vue-router';
import { logger } from '@/utils/logger';

// 路由配置
const routes: RouteRecordRaw[] = [
  {
    path: '/',
    name: 'Home',
    component: () => import('@/views/Home.vue'),
    meta: {
      title: '首页',
      requiresAuth: false,
    },
  },
  {
    path: '/schedule',
    name: 'Schedule',
    component: () => import('@/views/Schedule.vue'),
    meta: {
      title: '课表管理',
      requiresAuth: false,
    },
  },
  {
    path: '/schedule/generate',
    name: 'ScheduleGenerate',
    component: () => import('@/views/Schedule.vue'),
    meta: {
      title: '自动排课',
      requiresAuth: false,
    },
  },
  {
    path: '/schedule/manual',
    name: 'ScheduleManual',
    component: () => import('@/views/Schedule.vue'),
    meta: {
      title: '手动调课',
      requiresAuth: false,
    },
  },
  {
    path: '/teacher',
    name: 'Teacher',
    component: () => import('@/views/Teacher.vue'),
    meta: {
      title: '教师管理',
      requiresAuth: false,
    },
  },
  {
    path: '/teacher/preference',
    name: 'TeacherPreference',
    component: () => import('@/views/Teacher.vue'),
    meta: {
      title: '偏好设置',
      requiresAuth: false,
    },
  },
  {
    path: '/teacher/workload',
    name: 'TeacherWorkload',
    component: () => import('@/views/Teacher.vue'),
    meta: {
      title: '工作量统计',
      requiresAuth: false,
    },
  },
  {
    path: '/settings',
    name: 'Settings',
    component: () => import('@/views/Settings.vue'),
    meta: {
      title: '系统设置',
      requiresAuth: false,
    },
  },
  {
    path: '/import-export',
    name: 'ImportExport',
    component: () => import('@/views/ImportExport.vue'),
    meta: {
      title: '导入导出',
      requiresAuth: false,
    },
  },
  {
    path: '/statistics',
    name: 'Statistics',
    component: () => import('@/views/Statistics.vue'),
    meta: {
      title: '统计分析',
      requiresAuth: false,
    },
  },
  {
    path: '/help',
    name: 'Help',
    component: () => import('@/views/Help.vue'),
    meta: {
      title: '帮助中心',
      requiresAuth: false,
    },
  },
  {
    path: '/:pathMatch(.*)*',
    name: 'NotFound',
    component: () => import('@/views/NotFound.vue'),
    meta: {
      title: '页面未找到',
    },
  },
];

// 创建路由实例
const router = createRouter({
  history: createWebHistory(),
  routes,
});

// 全局前置守卫
router.beforeEach((to, from, next) => {
  logger.info('路由导航', {
    from: from.path,
    to: to.path,
    name: to.name,
  });

  // 设置页面标题
  if (to.meta.title) {
    document.title = `${to.meta.title} - 排课系统`;
  }

  next();
});

// 全局后置钩子
router.afterEach((to, from) => {
  logger.debug('路由导航完成', {
    from: from.path,
    to: to.path,
  });
});

// 路由错误处理
router.onError((error) => {
  logger.error('路由错误', { error: error.message, stack: error.stack });
});

export default router;
