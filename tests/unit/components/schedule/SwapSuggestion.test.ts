/**
 * SwapSuggestion 组件单元测试
 * 测试交换建议组件的各项功能
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { mount, VueWrapper } from '@vue/test-utils';
import { ElMessage, ElMessageBox } from 'element-plus';
import SwapSuggestion from '@/components/schedule/SwapSuggestion.vue';
import { ScheduleApi } from '@/api/schedule';

// Mock Element Plus 组件
vi.mock('element-plus', () => ({
  ElMessage: {
    success: vi.fn(),
    error: vi.fn(),
    warning: vi.fn(),
  },
  ElMessageBox: {
    confirm: vi.fn(),
  },
}));

// Mock ScheduleApi
vi.mock('@/api/schedule', () => ({
  ScheduleApi: {
    suggestSwaps: vi.fn(),
    executeSwap: vi.fn(),
  },
}));

describe('SwapSuggestion 组件', () => {
  let wrapper: VueWrapper<any>;

  // 模拟交换建议数据
  const mockSuggestions = [
    {
      swapType: 'Simple',
      moves: [
        {
          classId: 101,
          subjectId: '数学',
          teacherId: 1001,
          fromSlot: { day: 0, period: 0 },
          toSlot: { day: 0, period: 1 },
        },
      ],
      costImpact: -10,
      description: '简单交换：将数学课从第1节移至第2节',
    },
    {
      swapType: 'Triangle',
      moves: [
        {
          classId: 101,
          subjectId: '数学',
          teacherId: 1001,
          fromSlot: { day: 0, period: 0 },
          toSlot: { day: 0, period: 1 },
        },
        {
          classId: 102,
          subjectId: '语文',
          teacherId: 1002,
          fromSlot: { day: 0, period: 1 },
          toSlot: { day: 0, period: 2 },
        },
        {
          classId: 103,
          subjectId: '英语',
          teacherId: 1003,
          fromSlot: { day: 0, period: 2 },
          toSlot: { day: 0, period: 0 },
        },
      ],
      costImpact: 5,
      description: '三角交换：涉及3个班级的课程',
    },
  ];

  beforeEach(() => {
    // 重置所有 mock
    vi.clearAllMocks();

    // Mock API 响应
    (ScheduleApi.suggestSwaps as any).mockResolvedValue({
      success: true,
      data: mockSuggestions,
      message: '',
    });

    (ScheduleApi.executeSwap as any).mockResolvedValue({
      success: true,
      data: undefined,
      message: '',
    });

    // 挂载组件
    wrapper = mount(SwapSuggestion, {
      props: {
        targetClass: 101,
        targetTeacher: 1001,
        desiredSlot: { day: 0, period: 0 },
        autoLoad: false, // 禁用自动加载以便手动控制
      },
      global: {
        stubs: {
          ElCard: true,
          ElButton: true,
          ElTag: true,
          ElEmpty: true,
          ElSkeleton: true,
          ElTimeline: true,
          ElTimelineItem: true,
          ElIcon: true,
          ElDialog: true,
          ElDescriptions: true,
          ElDescriptionsItem: true,
          ElTable: true,
          ElTableColumn: true,
        },
      },
    });
  });

  describe('组件渲染', () => {
    it('应该正确渲染组件', () => {
      expect(wrapper.exists()).toBe(true);
      expect(wrapper.find('.swap-suggestion-container').exists()).toBe(true);
    });

    it('应该显示标题栏', () => {
      expect(wrapper.find('.suggestion-header').exists()).toBe(true);
      expect(wrapper.find('.title').text()).toBe('交换建议');
    });

    it('应该显示刷新按钮', () => {
      const refreshButton = wrapper.findAll('button').find(btn =>
        btn.text().includes('刷新建议')
      );
      expect(refreshButton).toBeDefined();
    });
  });

  describe('加载状态', () => {
    it('应该在加载时显示骨架屏', async () => {
      wrapper.vm.isLoading = true;
      await wrapper.vm.$nextTick();

      expect(wrapper.find('.loading-container').exists()).toBe(true);
    });

    it('应该在无建议时显示空状态', async () => {
      wrapper.vm.suggestions = [];
      wrapper.vm.isLoading = false;
      await wrapper.vm.$nextTick();

      expect(wrapper.findComponent({ name: 'ElEmpty' }).exists()).toBe(true);
    });
  });

  describe('建议列表', () => {
    beforeEach(async () => {
      wrapper.vm.suggestions = mockSuggestions;
      wrapper.vm.isLoading = false;
      await wrapper.vm.$nextTick();
    });

    it('应该显示建议列表', () => {
      expect(wrapper.find('.suggestions-list').exists()).toBe(true);
    });

    it('应该显示正确数量的建议卡片', () => {
      const cards = wrapper.findAll('.suggestion-card');
      expect(cards.length).toBe(mockSuggestions.length);
    });

    it('应该标记第一个建议为推荐', () => {
      const firstCard = wrapper.find('.suggestion-card');
      expect(firstCard.classes()).toContain('best-suggestion');
    });
  });

  describe('交换类型标签', () => {
    it('应该正确显示简单交换标签', () => {
      const label = wrapper.vm.getSwapTypeLabel('Simple');
      expect(label).toBe('简单交换');
    });

    it('应该正确显示三角交换标签', () => {
      const label = wrapper.vm.getSwapTypeLabel('Triangle');
      expect(label).toBe('三角交换');
    });

    it('应该正确显示链式交换标签', () => {
      const label = wrapper.vm.getSwapTypeLabel('Chain');
      expect(label).toBe('链式交换');
    });

    it('应该为简单交换返回 success 类型', () => {
      const type = wrapper.vm.getSwapTypeTagType('Simple');
      expect(type).toBe('success');
    });

    it('应该为三角交换返回 warning 类型', () => {
      const type = wrapper.vm.getSwapTypeTagType('Triangle');
      expect(type).toBe('warning');
    });

    it('应该为链式交换返回 info 类型', () => {
      const type = wrapper.vm.getSwapTypeTagType('Chain');
      expect(type).toBe('info');
    });
  });

  describe('代价影响显示', () => {
    it('应该为负代价返回 success 类型', () => {
      const type = wrapper.vm.getCostImpactTagType(-10);
      expect(type).toBe('success');
    });

    it('应该为零代价返回 warning 类型', () => {
      const type = wrapper.vm.getCostImpactTagType(0);
      expect(type).toBe('warning');
    });

    it('应该为正代价返回 danger 类型', () => {
      const type = wrapper.vm.getCostImpactTagType(10);
      expect(type).toBe('danger');
    });

    it('应该正确格式化负代价', () => {
      const formatted = wrapper.vm.formatCostImpact(-10);
      expect(formatted).toBe('-10 (改善)');
    });

    it('应该正确格式化零代价', () => {
      const formatted = wrapper.vm.formatCostImpact(0);
      expect(formatted).toBe('0 (无变化)');
    });

    it('应该正确格式化正代价', () => {
      const formatted = wrapper.vm.formatCostImpact(10);
      expect(formatted).toBe('+10 (增加)');
    });
  });

  describe('星期标签', () => {
    it('应该正确显示星期一', () => {
      expect(wrapper.vm.getDayLabel(0)).toBe('一');
    });

    it('应该正确显示星期五', () => {
      expect(wrapper.vm.getDayLabel(4)).toBe('五');
    });

    it('应该正确显示星期日', () => {
      expect(wrapper.vm.getDayLabel(6)).toBe('日');
    });
  });

  describe('加载建议功能', () => {
    it('应该调用 API 加载建议', async () => {
      await wrapper.vm.loadSuggestions();

      expect(ScheduleApi.suggestSwaps).toHaveBeenCalledWith(
        101,
        1001,
        { day: 0, period: 0 }
      );
    });

    it('应该在加载成功后更新建议列表', async () => {
      await wrapper.vm.loadSuggestions();

      expect(wrapper.vm.suggestions).toEqual(mockSuggestions);
    });

    it('应该在缺少参数时不加载', async () => {
      await wrapper.setProps({ targetClass: 0 });
      await wrapper.vm.loadSuggestions();

      expect(ScheduleApi.suggestSwaps).not.toHaveBeenCalled();
    });

    it('应该在加载失败时显示错误消息', async () => {
      (ScheduleApi.suggestSwaps as any).mockResolvedValue({
        success: false,
        data: null,
        message: '加载失败',
        error: '网络错误',
      });

      await wrapper.vm.loadSuggestions();

      expect(ElMessage.error).toHaveBeenCalledWith('加载交换建议失败');
    });
  });

  describe('刷新功能', () => {
    it('应该调用加载建议方法', async () => {
      const loadSpy = vi.spyOn(wrapper.vm, 'loadSuggestions');
      await wrapper.vm.handleRefresh();

      expect(loadSpy).toHaveBeenCalled();
    });

    it('应该发射 refresh 事件', async () => {
      await wrapper.vm.handleRefresh();

      expect(wrapper.emitted('refresh')).toBeTruthy();
    });
  });

  describe('预览功能', () => {
    it('应该打开预览对话框', async () => {
      await wrapper.vm.handlePreview(mockSuggestions[0]);

      expect(wrapper.vm.previewDialogVisible).toBe(true);
      expect(wrapper.vm.previewSuggestion).toEqual(mockSuggestions[0]);
    });

    it('应该显示预览内容', async () => {
      wrapper.vm.previewSuggestion = mockSuggestions[0];
      wrapper.vm.previewDialogVisible = true;
      await wrapper.vm.$nextTick();

      expect(wrapper.find('.preview-content').exists()).toBe(true);
    });
  });

  describe('执行交换功能', () => {
    it('应该显示确认对话框', async () => {
      (ElMessageBox.confirm as any).mockResolvedValue('confirm');

      await wrapper.vm.handleExecute(mockSuggestions[0]);

      expect(ElMessageBox.confirm).toHaveBeenCalled();
    });

    it('应该在确认后调用 API 执行交换', async () => {
      (ElMessageBox.confirm as any).mockResolvedValue('confirm');

      await wrapper.vm.handleExecute(mockSuggestions[0]);

      expect(ScheduleApi.executeSwap).toHaveBeenCalledWith(mockSuggestions[0]);
    });

    it('应该在执行成功后显示成功消息', async () => {
      (ElMessageBox.confirm as any).mockResolvedValue('confirm');

      await wrapper.vm.handleExecute(mockSuggestions[0]);

      expect(ElMessage.success).toHaveBeenCalledWith('交换执行成功');
    });

    it('应该在执行成功后发射 executed 事件', async () => {
      (ElMessageBox.confirm as any).mockResolvedValue('confirm');

      await wrapper.vm.handleExecute(mockSuggestions[0]);

      expect(wrapper.emitted('executed')).toBeTruthy();
    });

    it('应该在执行成功后清空建议列表', async () => {
      (ElMessageBox.confirm as any).mockResolvedValue('confirm');
      wrapper.vm.suggestions = [...mockSuggestions];

      await wrapper.vm.handleExecute(mockSuggestions[0]);

      expect(wrapper.vm.suggestions).toEqual([]);
    });

    it('应该在取消确认时不执行交换', async () => {
      (ElMessageBox.confirm as any).mockRejectedValue('cancel');

      await wrapper.vm.handleExecute(mockSuggestions[0]);

      expect(ScheduleApi.executeSwap).not.toHaveBeenCalled();
    });

    it('应该在执行失败时显示错误消息', async () => {
      (ElMessageBox.confirm as any).mockResolvedValue('confirm');
      (ScheduleApi.executeSwap as any).mockResolvedValue({
        success: false,
        data: undefined,
        message: '执行失败',
        error: '网络错误',
      });

      await wrapper.vm.handleExecute(mockSuggestions[0]);

      expect(ElMessage.error).toHaveBeenCalledWith('交换执行失败');
    });
  });

  describe('从预览执行交换', () => {
    it('应该关闭预览对话框并执行交换', async () => {
      (ElMessageBox.confirm as any).mockResolvedValue('confirm');
      wrapper.vm.previewSuggestion = mockSuggestions[0];
      wrapper.vm.previewDialogVisible = true;

      await wrapper.vm.handleExecuteFromPreview();

      expect(wrapper.vm.previewDialogVisible).toBe(false);
      expect(ScheduleApi.executeSwap).toHaveBeenCalled();
    });
  });

  describe('Props 监听', () => {
    it('应该在 props 变化时重新加载建议', async () => {
      await wrapper.setProps({ autoLoad: true });
      const loadSpy = vi.spyOn(wrapper.vm, 'loadSuggestions');

      await wrapper.setProps({ targetClass: 102 });
      await wrapper.vm.$nextTick();

      expect(loadSpy).toHaveBeenCalled();
    });
  });

  describe('辅助方法', () => {
    it('应该为不同索引返回不同的移动颜色', () => {
      const color0 = wrapper.vm.getMoveColor(0);
      const color1 = wrapper.vm.getMoveColor(1);
      const color2 = wrapper.vm.getMoveColor(2);

      expect(color0).not.toBe(color1);
      expect(color1).not.toBe(color2);
    });

    it('应该循环使用颜色', () => {
      const color0 = wrapper.vm.getMoveColor(0);
      const color5 = wrapper.vm.getMoveColor(5);

      expect(color0).toBe(color5);
    });
  });
});
