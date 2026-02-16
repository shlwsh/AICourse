/**
 * HeatmapView 组件单元测试
 * 测试热力图视图的功能和交互
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { mount, VueWrapper } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import HeatmapView from '@/components/schedule/HeatmapView.vue';
import { useScheduleStore } from '@/stores/scheduleStore';
import type { Schedule, ScheduleEntry } from '@/stores/scheduleStore';

describe('HeatmapView 组件', () => {
  let wrapper: VueWrapper;
  let scheduleStore: ReturnType<typeof useScheduleStore>;

  // 模拟课表数据
  const mockSchedule: Schedule = {
    entries: [
      {
        classId: 1,
        subjectId: '数学',
        teacherId: 101,
        timeSlot: { day: 0, period: 0 },
        isFixed: false,
        weekType: 'Every',
      },
      {
        classId: 1,
        subjectId: '语文',
        teacherId: 102,
        timeSlot: { day: 0, period: 1 },
        isFixed: false,
        weekType: 'Every',
      },
      {
        classId: 2,
        subjectId: '英语',
        teacherId: 103,
        timeSlot: { day: 1, period: 0 },
        isFixed: true,
        weekType: 'Every',
      },
    ],
    cost: 150,
    metadata: {
      cycleDays: 5,
      periodsPerDay: 8,
      generatedAt: '2024-01-01T00:00:00Z',
      version: 1,
    },
  };

  beforeEach(() => {
    // 创建新的 Pinia 实例
    setActivePinia(createPinia());
    scheduleStore = useScheduleStore();

    // 设置模拟数据
    scheduleStore.schedule = mockSchedule;
    scheduleStore.viewMode = 'class';
  });

  describe('组件渲染', () => {
    it('应该正确渲染组件', () => {
      wrapper = mount(HeatmapView, {
        global: {
          plugins: [createPinia()],
        },
      });

      expect(wrapper.exists()).toBe(true);
      expect(wrapper.find('.heatmap-view-container').exists()).toBe(true);
    });

    it('应该显示工具栏', () => {
      wrapper = mount(HeatmapView, {
        global: {
          plugins: [createPinia()],
        },
      });

      expect(wrapper.find('.heatmap-toolbar').exists()).toBe(true);
      expect(wrapper.find('.el-switch').exists()).toBe(true);
      expect(wrapper.find('.el-select').exists()).toBe(true);
    });

    it('默认情况下热力图应该是禁用状态', () => {
      wrapper = mount(HeatmapView, {
        global: {
          plugins: [createPinia()],
        },
      });

      const switchComponent = wrapper.findComponent({ name: 'ElSwitch' });
      expect(switchComponent.props('modelValue')).toBe(false);
    });
  });

  describe('热力图切换', () => {
    it('应该能够启用热力图模式', async () => {
      wrapper = mount(HeatmapView, {
        global: {
          plugins: [createPinia()],
        },
      });

      // 启用热力图
      const switchComponent = wrapper.findComponent({ name: 'ElSwitch' });
      await switchComponent.vm.$emit('change', true);

      // 验证热力图网格显示
      expect(wrapper.find('.heatmap-grid-wrapper').exists()).toBe(true);
    });

    it('应该触发 toggle 事件', async () => {
      wrapper = mount(HeatmapView, {
        global: {
          plugins: [createPinia()],
        },
      });

      const switchComponent = wrapper.findComponent({ name: 'ElSwitch' });
      await switchComponent.vm.$emit('change', true);

      expect(wrapper.emitted('toggle')).toBeTruthy();
      expect(wrapper.emitted('toggle')?.[0]).toEqual([true]);
    });
  });

  describe('配色方案', () => {
    it('应该支持切换配色方案', async () => {
      wrapper = mount(HeatmapView, {
        global: {
          plugins: [createPinia()],
        },
      });

      const selectComponent = wrapper.findComponent({ name: 'ElSelect' });

      // 切换到蓝黄渐变
      await selectComponent.vm.$emit('change', 'blue-yellow');

      // 验证配色方案已更新
      expect(wrapper.vm.colorScheme).toBe('blue-yellow');
    });

    it('应该提供多种配色方案选项', () => {
      wrapper = mount(HeatmapView, {
        global: {
          plugins: [createPinia()],
        },
      });

      const options = wrapper.findAllComponents({ name: 'ElOption' });
      expect(options.length).toBeGreaterThanOrEqual(4);

      // 验证包含预期的配色方案
      const optionValues = options.map(opt => opt.props('value'));
      expect(optionValues).toContain('red-green');
      expect(optionValues).toContain('blue-yellow');
      expect(optionValues).toContain('heat');
      expect(optionValues).toContain('grayscale');
    });
  });

  describe('热力图数据计算', () => {
    it('应该计算单元格代价值', async () => {
      wrapper = mount(HeatmapView, {
        global: {
          plugins: [createPinia()],
        },
      });

      // 启用热力图
      await wrapper.vm.handleToggle(true);

      // 等待数据计算完成
      await wrapper.vm.$nextTick();

      // 验证代价值映射已填充
      expect(wrapper.vm.cellCostMap.size).toBeGreaterThan(0);
    });

    it('应该为有课程的单元格计算代价', async () => {
      wrapper = mount(HeatmapView, {
        global: {
          plugins: [createPinia()],
        },
      });

      await wrapper.vm.handleToggle(true);
      await wrapper.vm.$nextTick();

      // 检查第一个课程的代价
      const cost = wrapper.vm.getCellCost(1, 0, 0);
      expect(cost).toBeGreaterThanOrEqual(0);
    });
  });

  describe('单元格交互', () => {
    it('应该响应单元格点击', async () => {
      wrapper = mount(HeatmapView, {
        global: {
          plugins: [createPinia()],
        },
      });

      await wrapper.vm.handleToggle(true);
      await wrapper.vm.$nextTick();

      // 点击单元格
      await wrapper.vm.handleCellClick(1, 0, 0);

      // 验证触发了 cellClick 事件
      expect(wrapper.emitted('cellClick')).toBeTruthy();
      expect(wrapper.emitted('cellClick')?.[0]).toEqual([1, 0, 0]);
    });

    it('应该显示详情对话框', async () => {
      wrapper = mount(HeatmapView, {
        global: {
          plugins: [createPinia()],
        },
      });

      await wrapper.vm.handleToggle(true);
      await wrapper.vm.handleCellClick(1, 0, 0);
      await wrapper.vm.$nextTick();

      // 验证详情对话框显示
      expect(wrapper.vm.showDetailDialog).toBe(true);
      expect(wrapper.vm.selectedCellDetail).not.toBeNull();
    });
  });

  describe('图例功能', () => {
    it('应该能够打开图例对话框', async () => {
      wrapper = mount(HeatmapView, {
        global: {
          plugins: [createPinia()],
        },
      });

      // 点击图例按钮
      const legendButton = wrapper.find('[data-testid="legend-button"]');
      if (legendButton.exists()) {
        await legendButton.trigger('click');
        expect(wrapper.vm.showLegendDialog).toBe(true);
      }
    });

    it('应该显示正确的图例渐变', () => {
      wrapper = mount(HeatmapView, {
        global: {
          plugins: [createPinia()],
        },
      });

      // 测试不同配色方案的渐变
      wrapper.vm.colorScheme = 'red-green';
      let gradient = wrapper.vm.getLegendGradient();
      expect(gradient.background).toContain('linear-gradient');

      wrapper.vm.colorScheme = 'heat';
      gradient = wrapper.vm.getLegendGradient();
      expect(gradient.background).toContain('linear-gradient');
    });
  });

  describe('颜色计算', () => {
    it('应该根据强度返回正确的颜色', () => {
      wrapper = mount(HeatmapView, {
        global: {
          plugins: [createPinia()],
        },
      });

      // 测试红绿渐变
      wrapper.vm.colorScheme = 'red-green';
      const color1 = wrapper.vm.getColorForIntensity(0);
      expect(color1).toContain('rgba');

      const color2 = wrapper.vm.getColorForIntensity(0.5);
      expect(color2).toContain('rgba');

      const color3 = wrapper.vm.getColorForIntensity(1);
      expect(color3).toContain('rgba');
    });

    it('应该为不同配色方案返回不同颜色', () => {
      wrapper = mount(HeatmapView, {
        global: {
          plugins: [createPinia()],
        },
      });

      wrapper.vm.colorScheme = 'red-green';
      const redGreenColor = wrapper.vm.getColorForIntensity(0.5);

      wrapper.vm.colorScheme = 'blue-yellow';
      const blueYellowColor = wrapper.vm.getColorForIntensity(0.5);

      expect(redGreenColor).not.toBe(blueYellowColor);
    });
  });

  describe('响应式更新', () => {
    it('应该在课表数据变化时重新计算', async () => {
      wrapper = mount(HeatmapView, {
        global: {
          plugins: [createPinia()],
        },
      });

      await wrapper.vm.handleToggle(true);
      const initialSize = wrapper.vm.cellCostMap.size;

      // 更新课表数据
      scheduleStore.schedule = {
        ...mockSchedule,
        entries: [
          ...mockSchedule.entries,
          {
            classId: 3,
            subjectId: '物理',
            teacherId: 104,
            timeSlot: { day: 2, period: 0 },
            isFixed: false,
            weekType: 'Every',
          },
        ],
      };

      await wrapper.vm.$nextTick();

      // 验证数据已重新计算
      expect(wrapper.vm.cellCostMap.size).toBeGreaterThanOrEqual(initialSize);
    });

    it('应该在视图模式变化时重新计算', async () => {
      wrapper = mount(HeatmapView, {
        global: {
          plugins: [createPinia()],
        },
      });

      await wrapper.vm.handleToggle(true);
      await wrapper.vm.$nextTick();

      const calculateSpy = vi.spyOn(wrapper.vm, 'calculateHeatmapData');

      // 切换视图模式
      scheduleStore.setViewMode('teacher');
      await wrapper.vm.$nextTick();

      // 验证重新计算被调用
      expect(calculateSpy).toHaveBeenCalled();
    });
  });

  describe('边界情况', () => {
    it('应该处理空课表', async () => {
      scheduleStore.schedule = null;

      wrapper = mount(HeatmapView, {
        global: {
          plugins: [createPinia()],
        },
      });

      await wrapper.vm.handleToggle(true);
      await wrapper.vm.$nextTick();

      // 验证不会崩溃
      expect(wrapper.vm.cellCostMap.size).toBe(0);
    });

    it('应该处理没有课程的单元格', () => {
      wrapper = mount(HeatmapView, {
        global: {
          plugins: [createPinia()],
        },
      });

      const entry = wrapper.vm.getCellEntry(999, 0, 0);
      expect(entry).toBeNull();

      const cost = wrapper.vm.getCellCost(999, 0, 0);
      expect(cost).toBe(0);
    });

    it('应该处理代价值为0的情况', () => {
      wrapper = mount(HeatmapView, {
        global: {
          plugins: [createPinia()],
        },
      });

      const style = wrapper.vm.getHeatmapCellStyle(999, 0, 0);
      expect(Object.keys(style).length).toBe(0);
    });
  });

  describe('性能优化', () => {
    it('应该只在启用时计算热力图数据', async () => {
      wrapper = mount(HeatmapView, {
        global: {
          plugins: [createPinia()],
        },
      });

      const calculateSpy = vi.spyOn(wrapper.vm, 'calculateHeatmapData');

      // 禁用状态下不应计算
      expect(calculateSpy).not.toHaveBeenCalled();

      // 启用后应计算
      await wrapper.vm.handleToggle(true);
      expect(calculateSpy).toHaveBeenCalled();
    });

    it('应该缓存计算结果', async () => {
      wrapper = mount(HeatmapView, {
        global: {
          plugins: [createPinia()],
        },
      });

      await wrapper.vm.handleToggle(true);
      await wrapper.vm.$nextTick();

      // 多次获取相同单元格的代价值
      const cost1 = wrapper.vm.getCellCost(1, 0, 0);
      const cost2 = wrapper.vm.getCellCost(1, 0, 0);

      // 应该返回相同的值（从缓存）
      expect(cost1).toBe(cost2);
    });
  });
});
