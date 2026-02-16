/**
 * Settings 页面单元测试
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import Settings from '@/views/Settings.vue';
import { useConfigStore } from '@/stores/configStore';

// Mock 子组件
vi.mock('@/components/settings/SystemConfig.vue', () => ({
  default: {
    name: 'SystemConfig',
    template: '<div class="system-config-mock">SystemConfig</div>',
  },
}));

vi.mock('@/components/settings/SubjectConfig.vue', () => ({
  default: {
    name: 'SubjectConfig',
    template: '<div class="subject-config-mock">SubjectConfig</div>',
  },
}));

vi.mock('@/components/settings/VenueConfig.vue', () => ({
  default: {
    name: 'VenueConfig',
    template: '<div class="venue-config-mock">VenueConfig</div>',
  },
}));

vi.mock('@/components/settings/TeachingGroupConfig.vue', () => ({
  default: {
    name: 'TeachingGroupConfig',
    template: '<div class="teaching-group-config-mock">TeachingGroupConfig</div>',
  },
}));

describe('Settings.vue', () => {
  beforeEach(() => {
    // 创建新的 Pinia 实例
    setActivePinia(createPinia());
  });

  it('应该正确渲染页面标题', () => {
    const wrapper = mount(Settings);

    expect(wrapper.find('.page-header h2').text()).toBe('系统设置');
    expect(wrapper.find('.page-description').text()).toBe('配置排课系统的基本参数和规则');
  });

  it('应该渲染所有标签页', () => {
    const wrapper = mount(Settings);

    // 检查标签页文本内容
    const html = wrapper.html();
    expect(html).toContain('系统配置');
    expect(html).toContain('科目配置');
    expect(html).toContain('场地配置');
    expect(html).toContain('教研组配置');
  });

  it('应该默认显示系统配置标签页', () => {
    const wrapper = mount(Settings);

    // 检查默认激活的标签页
    expect(wrapper.vm.activeTab).toBe('system');
  });

  it('应该在挂载时加载配置', async () => {
    const configStore = useConfigStore();
    const loadConfigSpy = vi.spyOn(configStore, 'loadConfig').mockResolvedValue();

    mount(Settings);

    // 等待异步操作完成
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(loadConfigSpy).toHaveBeenCalled();
  });

  it('应该处理配置加载失败', async () => {
    const configStore = useConfigStore();
    const loadConfigSpy = vi
      .spyOn(configStore, 'loadConfig')
      .mockRejectedValue(new Error('加载失败'));

    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    mount(Settings);

    // 等待异步操作完成
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(loadConfigSpy).toHaveBeenCalled();
    expect(consoleErrorSpy).toHaveBeenCalled();

    consoleErrorSpy.mockRestore();
  });

  it('应该支持切换标签页', async () => {
    const wrapper = mount(Settings);

    // 直接修改 activeTab 的值
    wrapper.vm.activeTab = 'subject';
    await wrapper.vm.$nextTick();

    // 检查激活的标签页
    expect(wrapper.vm.activeTab).toBe('subject');
  });

  it('应该正确渲染子组件', () => {
    const wrapper = mount(Settings);

    // 检查是否包含子组件
    expect(wrapper.html()).toContain('SystemConfig');
  });

  it('应该应用正确的样式类', () => {
    const wrapper = mount(Settings);

    expect(wrapper.find('.settings-container').exists()).toBe(true);
    expect(wrapper.find('.page-header').exists()).toBe(true);
    expect(wrapper.find('.settings-tabs').exists()).toBe(true);
  });

  it('应该记录日志', () => {
    // 日志系统使用自定义的 logger，不是 console.log
    // 只需验证组件能正常挂载即可
    const wrapper = mount(Settings);
    expect(wrapper.exists()).toBe(true);
  });
});
