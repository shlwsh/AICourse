/**
 * ConflictIndicator 组件单元测试
 * 测试冲突指示器组件的各种功能和状态
 */

import { describe, it, expect, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import ConflictIndicator from '@/components/schedule/ConflictIndicator.vue';
import type { ConflictInfo, ConflictSeverity } from '@/stores/scheduleStore';

// Mock logger
vi.mock('@/utils/logger', () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

// ========== 测试辅助函数 ==========

/**
 * 创建冲突信息对象
 */
function createConflictInfo(
  severity: ConflictSeverity,
  description: string,
  conflictType?: any
): ConflictInfo {
  return {
    slot: { day: 0, period: 0 },
    conflictType: conflictType || { HardConstraint: 'TeacherBusy' },
    severity,
    description,
  };
}

// ========== 测试套件 ==========

describe('ConflictIndicator 组件', () => {
  const mountOptions = {
    global: {
      stubs: {
        ElTooltip: {
          template: '<div class="el-tooltip-stub"><slot /></div>',
        },
        ElIcon: {
          template: '<span class="el-icon-stub"><slot /></span>',
        },
      },
    },
  };

  // ========== 基础渲染测试 ==========

  describe('基础渲染', () => {
    it('当 conflict 为 null 时不渲染任何内容', () => {
      const wrapper = mount(ConflictIndicator, {
        props: { conflict: null },
        ...mountOptions,
      });
      expect(wrapper.find('.conflict-indicator').exists()).toBe(false);
    });

    it('当 conflict 存在时渲染指示器', () => {
      const conflict = createConflictInfo('Available', '可以安排');
      const wrapper = mount(ConflictIndicator, {
        props: { conflict },
        ...mountOptions,
      });
      expect(wrapper.find('.conflict-indicator').exists()).toBe(true);
    });

    it('渲染图标包装器', () => {
      const conflict = createConflictInfo('Available', '可以安排');
      const wrapper = mount(ConflictIndicator, {
        props: { conflict },
        ...mountOptions,
      });
      expect(wrapper.find('.indicator-icon-wrapper').exists()).toBe(true);
    });
  });

  // ========== 冲突级别测试 ==========

  describe('冲突级别', () => {
    it('Available 级别显示绿色图标', () => {
      const conflict = createConflictInfo('Available', '可以安排');
      const wrapper = mount(ConflictIndicator, {
        props: { conflict },
        ...mountOptions,
      });
      expect(wrapper.find('.conflict-indicator').classes()).toContain('severity-available');
    });

    it('Warning 级别显示黄色图标', () => {
      const conflict = createConflictInfo('Warning', '不推荐');
      const wrapper = mount(ConflictIndicator, {
        props: { conflict },
        ...mountOptions,
      });
      expect(wrapper.find('.conflict-indicator').classes()).toContain('severity-warning');
    });

    it('Blocked 级别显示红色图标', () => {
      const conflict = createConflictInfo('Blocked', '不允许');
      const wrapper = mount(ConflictIndicator, {
        props: { conflict },
        ...mountOptions,
      });
      expect(wrapper.find('.conflict-indicator').classes()).toContain('severity-blocked');
    });
  });

  // ========== 位置测试 ==========

  describe('位置配置', () => {
    it('默认位置为 top-right', () => {
      const conflict = createConflictInfo('Available', '可以安排');
      const wrapper = mount(ConflictIndicator, {
        props: { conflict },
        ...mountOptions,
      });
      expect(wrapper.find('.conflict-indicator').classes()).toContain('position-top-right');
    });

    it('可以设置为 top-left', () => {
      const conflict = createConflictInfo('Available', '可以安排');
      const wrapper = mount(ConflictIndicator, {
        props: { conflict, position: 'top-left' },
        ...mountOptions,
      });
      expect(wrapper.find('.conflict-indicator').classes()).toContain('position-top-left');
    });

    it('可以设置为 center', () => {
      const conflict = createConflictInfo('Available', '可以安排');
      const wrapper = mount(ConflictIndicator, {
        props: { conflict, position: 'center' },
        ...mountOptions,
      });
      expect(wrapper.find('.conflict-indicator').classes()).toContain('position-center');
    });
  });

  // ========== 描述文本测试 ==========

  describe('描述文本', () => {
    it('默认不显示描述文本', () => {
      const conflict = createConflictInfo('Available', '可以安排');
      const wrapper = mount(ConflictIndicator, {
        props: { conflict },
        ...mountOptions,
      });
      expect(wrapper.find('.indicator-description').exists()).toBe(false);
    });

    it('可以显示描述文本', () => {
      const conflict = createConflictInfo('Available', '可以安排');
      const wrapper = mount(ConflictIndicator, {
        props: { conflict, showDescription: true },
        ...mountOptions,
      });
      expect(wrapper.find('.indicator-description').exists()).toBe(true);
      expect(wrapper.find('.indicator-description').text()).toBe('可以安排');
    });

    it('显示描述时添加对应的样式类', () => {
      const conflict = createConflictInfo('Available', '可以安排');
      const wrapper = mount(ConflictIndicator, {
        props: { conflict, showDescription: true },
        ...mountOptions,
      });
      expect(wrapper.find('.conflict-indicator').classes()).toContain('with-description');
    });
  });

  // ========== 详细信息测试 ==========

  describe('详细信息', () => {
    it('默认不显示详细信息', () => {
      const conflict = createConflictInfo('Available', '可以安排');
      const wrapper = mount(ConflictIndicator, {
        props: { conflict },
        ...mountOptions,
      });
      expect(wrapper.find('.indicator-details').exists()).toBe(false);
    });

    it('可以显示详细信息', () => {
      const conflict = createConflictInfo('Blocked', '教师时间冲突', {
        HardConstraint: 'TeacherBusy',
      });
      const wrapper = mount(ConflictIndicator, {
        props: { conflict, showDetails: true },
        ...mountOptions,
      });
      expect(wrapper.find('.indicator-details').exists()).toBe(true);
    });

    it('详细信息包含冲突类型', () => {
      const conflict = createConflictInfo('Blocked', '教师时间冲突', {
        HardConstraint: 'TeacherBusy',
      });
      const wrapper = mount(ConflictIndicator, {
        props: { conflict, showDetails: true },
        ...mountOptions,
      });
      const detailsText = wrapper.find('.indicator-details').text();
      expect(detailsText).toContain('硬约束冲突');
    });

    it('显示详情时添加对应的样式类', () => {
      const conflict = createConflictInfo('Blocked', '教师时间冲突', {
        HardConstraint: 'TeacherBusy',
      });
      const wrapper = mount(ConflictIndicator, {
        props: { conflict, showDetails: true },
        ...mountOptions,
      });
      expect(wrapper.find('.conflict-indicator').classes()).toContain('with-details');
    });
  });

  // ========== 自定义样式测试 ==========

  describe('自定义样式', () => {
    it('可以应用自定义样式', () => {
      const conflict = createConflictInfo('Available', '可以安排');
      const customStyle = { backgroundColor: 'red', padding: '10px' };
      const wrapper = mount(ConflictIndicator, {
        props: { conflict, customStyle },
        ...mountOptions,
      });
      const indicator = wrapper.find('.conflict-indicator');
      expect(indicator.attributes('style')).toContain('background-color: red');
      expect(indicator.attributes('style')).toContain('padding: 10px');
    });
  });

  // ========== 边界情况测试 ==========

  describe('边界情况', () => {
    it('处理没有 conflictType 的冲突信息', () => {
      const conflict: ConflictInfo = {
        slot: { day: 0, period: 0 },
        conflictType: undefined,
        severity: 'Available',
        description: '可以安排',
      };

      const wrapper = mount(ConflictIndicator, {
        props: { conflict },
        ...mountOptions,
      });
      expect(wrapper.find('.conflict-indicator').exists()).toBe(true);
    });

    it('处理空描述的冲突信息', () => {
      const conflict = createConflictInfo('Available', '');
      const wrapper = mount(ConflictIndicator, {
        props: { conflict },
        ...mountOptions,
      });
      expect(wrapper.find('.conflict-indicator').exists()).toBe(true);
    });
  });

  // ========== 响应式测试 ==========

  describe('响应式行为', () => {
    it('conflict 变化时更新显示', async () => {
      const conflict1 = createConflictInfo('Available', '可以安排');
      const wrapper = mount(ConflictIndicator, {
        props: { conflict: conflict1 },
        ...mountOptions,
      });

      expect(wrapper.find('.conflict-indicator').classes()).toContain('severity-available');

      const conflict2 = createConflictInfo('Blocked', '不允许');
      await wrapper.setProps({ conflict: conflict2 });

      expect(wrapper.find('.conflict-indicator').classes()).toContain('severity-blocked');
    });

    it('showDescription 变化时更新显示', async () => {
      const conflict = createConflictInfo('Available', '可以安排');
      const wrapper = mount(ConflictIndicator, {
        props: { conflict, showDescription: false },
        ...mountOptions,
      });

      expect(wrapper.find('.indicator-description').exists()).toBe(false);

      await wrapper.setProps({ showDescription: true });

      expect(wrapper.find('.indicator-description').exists()).toBe(true);
    });

    it('position 变化时更新位置', async () => {
      const conflict = createConflictInfo('Available', '可以安排');
      const wrapper = mount(ConflictIndicator, {
        props: { conflict, position: 'top-right' },
        ...mountOptions,
      });

      expect(wrapper.find('.conflict-indicator').classes()).toContain('position-top-right');

      await wrapper.setProps({ position: 'bottom-left' });

      expect(wrapper.find('.conflict-indicator').classes()).toContain('position-bottom-left');
    });
  });
});
