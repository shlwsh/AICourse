/**
 * Layout 组件单元测试
 * 测试主布局容器的功能
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { mount } from '@vue/test-utils';
import { createRouter, createMemoryHistory } from 'vue-router';
import Layout from '@/components/layout/Layout.vue';

// 创建测试路由
const createTestRouter = () => {
  return createRouter({
    history: createMemoryHistory(),
    routes: [
      {
        path: '/',
        name: 'Home',
        component: { template: '<div>Home</div>' },
        meta: { title: '首页' },
      },
      {
        path: '/schedule',
        name: 'Schedule',
        component: { template: '<div>Schedule</div>' },
        meta: { title: '课表管理' },
      },
      {
        path: '/teacher',
        name: 'Teacher',
        component: { template: '<div>Teacher</div>' },
        meta: { title: '教师管理' },
      },
    ],
  });
};

describe('Layout 组件', () => {
  let router: ReturnType<typeof createTestRouter>;

  beforeEach(() => {
    router = createTestRouter();
  });

  it('应该正确渲染组件', async () => {
    const wrapper = mount(Layout, {
      global: {
        plugins: [router],
        stubs: {
          Header: true,
          Sidebar: true,
          Footer: true,
          ElContainer: true,
          ElAside: true,
          ElMain: true,
          ElBreadcrumb: true,
          ElBreadcrumbItem: true,
          ElBacktop: true,
          ElIcon: true,
          RouterView: true,
        },
      },
    });

    // 验证组件已挂载
    expect(wrapper.exists()).toBe(true);
  });

  it('应该在首页隐藏面包屑导航', async () => {
    await router.push('/');
    await router.isReady();

    const wrapper = mount(Layout, {
      global: {
        plugins: [router],
        stubs: {
          Header: true,
          Sidebar: true,
          Footer: true,
          ElContainer: true,
          ElAside: true,
          ElMain: true,
          ElBreadcrumb: true,
          ElBreadcrumbItem: true,
          ElBacktop: true,
          ElIcon: true,
          RouterView: true,
        },
      },
    });

    // 首页不应该显示面包屑（除了首页本身）
    const breadcrumbItems = wrapper.vm.breadcrumbItems;
    expect(breadcrumbItems.length).toBe(0);
  });

  it('应该根据路由生成正确的面包屑', async () => {
    await router.push('/schedule');
    await router.isReady();

    const wrapper = mount(Layout, {
      global: {
        plugins: [router],
        stubs: {
          Header: true,
          Sidebar: true,
          Footer: true,
          ElContainer: true,
          ElAside: true,
          ElMain: true,
          ElBreadcrumb: true,
          ElBreadcrumbItem: true,
          ElBacktop: true,
          ElIcon: true,
          RouterView: true,
        },
      },
    });

    // 验证面包屑内容
    const breadcrumbItems = wrapper.vm.breadcrumbItems;
    expect(breadcrumbItems.length).toBeGreaterThan(0);
    expect(breadcrumbItems[0].title).toBe('课表管理');
  });

  it('应该支持缓存视图', async () => {
    const wrapper = mount(Layout, {
      global: {
        plugins: [router],
        stubs: {
          Header: true,
          Sidebar: true,
          Footer: true,
          ElContainer: true,
          ElAside: true,
          ElMain: true,
          ElBreadcrumb: true,
          ElBreadcrumbItem: true,
          ElBacktop: true,
          ElIcon: true,
          RouterView: true,
        },
      },
    });

    // 验证缓存视图配置存在
    expect(wrapper.vm.cachedViews).toBeDefined();
    expect(Array.isArray(wrapper.vm.cachedViews)).toBe(true);
  });
});
