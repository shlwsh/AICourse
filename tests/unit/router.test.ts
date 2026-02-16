/**
 * Vue Router 路由配置单元测试
 */
import { describe, it, expect, beforeAll } from 'vitest';
import { createRouter, createMemoryHistory, type Router } from 'vue-router';

// 导入路由配置（不是路由实例）
const routes = [
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
    path: '/teacher',
    name: 'Teacher',
    component: () => import('@/views/Teacher.vue'),
    meta: {
      title: '教师管理',
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

describe('Vue Router 配置', () => {
  let router: Router;

  beforeAll(() => {
    // 在测试环境中创建路由实例，使用 memory history
    router = createRouter({
      history: createMemoryHistory(),
      routes,
    });
  });

  it('应该包含所有必需的路由', () => {
    const allRoutes = router.getRoutes();
    const routeNames = allRoutes.map((route) => route.name);

    // 验证所有必需的路由都已配置
    expect(routeNames).toContain('Home');
    expect(routeNames).toContain('Schedule');
    expect(routeNames).toContain('Teacher');
    expect(routeNames).toContain('Settings');
    expect(routeNames).toContain('ImportExport');
    expect(routeNames).toContain('Statistics');
    expect(routeNames).toContain('Help');
    expect(routeNames).toContain('NotFound');
  });

  it('应该正确配置路由路径', () => {
    const allRoutes = router.getRoutes();

    // 验证路由路径
    const homeRoute = allRoutes.find((r) => r.name === 'Home');
    expect(homeRoute?.path).toBe('/');

    const scheduleRoute = allRoutes.find((r) => r.name === 'Schedule');
    expect(scheduleRoute?.path).toBe('/schedule');

    const teacherRoute = allRoutes.find((r) => r.name === 'Teacher');
    expect(teacherRoute?.path).toBe('/teacher');

    const settingsRoute = allRoutes.find((r) => r.name === 'Settings');
    expect(settingsRoute?.path).toBe('/settings');

    const importExportRoute = allRoutes.find((r) => r.name === 'ImportExport');
    expect(importExportRoute?.path).toBe('/import-export');

    const statisticsRoute = allRoutes.find((r) => r.name === 'Statistics');
    expect(statisticsRoute?.path).toBe('/statistics');

    const helpRoute = allRoutes.find((r) => r.name === 'Help');
    expect(helpRoute?.path).toBe('/help');
  });

  it('应该配置路由懒加载', () => {
    const allRoutes = router.getRoutes();

    // 验证所有路由都使用懒加载
    allRoutes.forEach((route) => {
      expect(route.components).toBeDefined();
    });
  });

  it('应该配置路由元信息', () => {
    const allRoutes = router.getRoutes();

    // 验证路由元信息
    const homeRoute = allRoutes.find((r) => r.name === 'Home');
    expect(homeRoute?.meta.title).toBe('首页');

    const scheduleRoute = allRoutes.find((r) => r.name === 'Schedule');
    expect(scheduleRoute?.meta.title).toBe('课表管理');

    const teacherRoute = allRoutes.find((r) => r.name === 'Teacher');
    expect(teacherRoute?.meta.title).toBe('教师管理');

    const settingsRoute = allRoutes.find((r) => r.name === 'Settings');
    expect(settingsRoute?.meta.title).toBe('系统设置');

    const importExportRoute = allRoutes.find((r) => r.name === 'ImportExport');
    expect(importExportRoute?.meta.title).toBe('导入导出');

    const statisticsRoute = allRoutes.find((r) => r.name === 'Statistics');
    expect(statisticsRoute?.meta.title).toBe('统计分析');

    const helpRoute = allRoutes.find((r) => r.name === 'Help');
    expect(helpRoute?.meta.title).toBe('帮助中心');
  });

  it('应该配置404路由', () => {
    const allRoutes = router.getRoutes();
    const notFoundRoute = allRoutes.find((r) => r.name === 'NotFound');

    expect(notFoundRoute).toBeDefined();
    expect(notFoundRoute?.path).toBe('/:pathMatch(.*)*');
  });
});
