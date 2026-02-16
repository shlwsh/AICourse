/**
 * Footer 组件单元测试
 * 测试页脚的功能
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { mount } from '@vue/test-utils';
import { createRouter, createMemoryHistory } from 'vue-router';
import Footer from '@/components/layout/Footer.vue';

// 创建测试路由
const createTestRouter = () => {
  return createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/', name: 'Home', component: { template: '<div>Home</div>' } },
      { path: '/help', name: 'Help', component: { template: '<div>Help</div>' } },
    ],
  });
};

describe('Footer 组件', () => {
  let router: ReturnType<typeof createTestRouter>;

  beforeEach(() => {
    router = createTestRouter();
  });

  it('应该正确渲染组件', async () => {
    const wrapper = mount(Footer, {
      global: {
        plugins: [router],
        stubs: {
          ElFooter: true,
          ElLink: true,
          ElDivider: true,
          ElTag: true,
          ElDialog: true,
          ElForm: true,
          ElFormItem: true,
          ElSelect: true,
          ElOption: true,
          ElInput: true,
          ElButton: true,
          ElIcon: true,
        },
      },
    });

    // 验证组件已挂载
    expect(wrapper.exists()).toBe(true);
  });

  it('应该显示版权信息', async () => {
    const wrapper = mount(Footer, {
      global: {
        plugins: [router],
        stubs: {
          ElFooter: true,
          ElLink: true,
          ElDivider: true,
          ElTag: true,
          ElDialog: true,
          ElForm: true,
          ElFormItem: true,
          ElSelect: true,
          ElOption: true,
          ElInput: true,
          ElButton: true,
          ElIcon: true,
        },
      },
    });

    // 验证版权信息存在
    expect(wrapper.html()).toContain('排课系统');
  });

  it('应该显示当前年份', async () => {
    const wrapper = mount(Footer, {
      global: {
        plugins: [router],
        stubs: {
          ElFooter: true,
          ElLink: true,
          ElDivider: true,
          ElTag: true,
          ElDialog: true,
          ElForm: true,
          ElFormItem: true,
          ElSelect: true,
          ElOption: true,
          ElInput: true,
          ElButton: true,
          ElIcon: true,
        },
      },
    });

    const currentYear = new Date().getFullYear();
    expect(wrapper.html()).toContain(currentYear.toString());
  });
});
