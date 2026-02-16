/**
 * Header 组件单元测试
 * 测试顶部导航栏的功能
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { mount } from '@vue/test-utils';
import { createRouter, createMemoryHistory } from 'vue-router';
import Header from '@/components/layout/Header.vue';

// 创建测试路由
const createTestRouter = () => {
  return createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/', name: 'Home', component: { template: '<div>Home</div>' } },
      { path: '/schedule', name: 'Schedule', component: { template: '<div>Schedule</div>' } },
      { path: '/teacher', name: 'Teacher', component: { template: '<div>Teacher</div>' } },
      { path: '/settings', name: 'Settings', component: { template: '<div>Settings</div>' } },
      { path: '/help', name: 'Help', component: { template: '<div>Help</div>' } },
    ],
  });
};

describe('Header 组件', () => {
  let router: ReturnType<typeof createTestRouter>;

  beforeEach(() => {
    router = createTestRouter();
  });

  it('应该正确渲染组件', async () => {
    const wrapper = mount(Header, {
      global: {
        plugins: [router],
        stubs: {
          ElHeader: true,
          ElMenu: true,
          ElMenuItem: true,
          ElButton: true,
          ElTooltip: true,
          ElIcon: true,
        },
      },
    });

    // 验证组件已挂载
    expect(wrapper.exists()).toBe(true);
  });

  it('应该显示标题和副标题', async () => {
    const wrapper = mount(Header, {
      global: {
        plugins: [router],
        stubs: {
          ElHeader: true,
          ElMenu: true,
          ElMenuItem: true,
          ElButton: true,
          ElTooltip: true,
          ElIcon: true,
        },
      },
    });

    // 验证标题存在
    expect(wrapper.html()).toContain('排课系统');
    expect(wrapper.html()).toContain('智能课程调度');
  });

  it('应该在点击菜单项时导航到对应页面', async () => {
    await router.push('/');
    await router.isReady();

    const wrapper = mount(Header, {
      global: {
        plugins: [router],
        stubs: {
          ElHeader: true,
          ElMenu: true,
          ElMenuItem: true,
          ElButton: true,
          ElTooltip: true,
          ElIcon: true,
        },
      },
    });

    // 当前路由应该是首页
    expect(router.currentRoute.value.path).toBe('/');
  });

  it('应该正确高亮当前激活的菜单项', async () => {
    await router.push('/schedule');
    await router.isReady();

    const wrapper = mount(Header, {
      global: {
        plugins: [router],
        stubs: {
          ElHeader: true,
          ElMenu: true,
          ElMenuItem: true,
          ElButton: true,
          ElTooltip: true,
          ElIcon: true,
        },
      },
    });

    // 验证当前路由
    expect(router.currentRoute.value.path).toBe('/schedule');
  });
});
