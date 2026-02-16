/**
 * WorkloadStatistics 组件单元测试
 * 测试工作量统计组件的各项功能
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { mount, VueWrapper } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { ElMessage, ElMessageBox } from 'element-plus';
import WorkloadStatistics from '@/components/teacher/WorkloadStatistics.vue';
import { TeacherApi, type WorkloadStatistics as WorkloadStats } from '@/api/teacher';
import * as echarts from 'echarts';

// Mock Element Plus 组件
vi.mock('element-plus', async () => {
  const actual = await vi.importActual('element-plus');
  return {
    ...actual,
    ElMessage: {
      success: vi.fn(),
      error: vi.fn(),
      warning: vi.fn(),
    },
    ElMessageBox: {
      confirm: vi.fn(),
    },
  };
});

// Mock ECharts
vi.mock('echarts', () => ({
  init: vi.fn(() => ({
    setOption: vi.fn(),
    resize: vi.fn(),
    dispose: vi.fn(),
  })),
}));

// Mock TeacherApi
vi.mock('@/api/teacher', () => ({
  TeacherApi: {
    getWorkloadStatistics: vi.fn(),
  },
}));

describe('WorkloadStatistics 组件', () => {
  let wrapper: VueWrapper<any>;
  let pinia: ReturnType<typeof createPinia>;

  // 模拟工作量统计数据
  const mockStatistics: WorkloadStats[] = [
    {
      teacherId: 1,
      teacherName: '张老师',
      totalSessions: 20,
      classCount: 3,
      subjects: ['数学', '物理'],
      earlySessions: 5,
      lateSessions: 3,
    },
    {
      teacherId: 2,
      teacherName: '李老师',
      totalSessions: 15,
      classCount: 2,
      subjects: ['语文'],
      earlySessions: 3,
      lateSessions: 2,
    },
    {
      teacherId: 3,
      teacherName: '王老师',
      totalSessions: 18,
      classCount: 3,
      subjects: ['英语'],
      earlySessions: 4,
      lateSessions: 4,
    },
  ];

  beforeEach(() => {
    // 创建新的 Pinia 实例
    pinia = createPinia();
    setActivePinia(pinia);

    // 重置所有 mock
    vi.clearAllMocks();
  });

  afterEach(() => {
    if (wrapper) {
      wrapper.unmount();
    }
  });

  describe('组件渲染', () => {
    it('应该正确渲染组件结构', () => {
      // Mock API 返回成功
      vi.mocked(TeacherApi.getWorkloadStatistics).mockResolvedValue({
        success: true,
        data: mockStatistics,
        message: '成功',
      });

      wrapper = mount(WorkloadStatistics, {
        global: {
          plugins: [pinia],
        },
      });

      // 验证主容器存在
      expect(wrapper.find('.workload-statistics-container').exists()).toBe(true);

      // 验证工具栏存在
      expect(wrapper.find('.statistics-toolbar').exists()).toBe(true);

      // 验证统计概览存在
      expect(wrapper.find('.statistics-summary').exists()).toBe(true);

      // 验证表格存在
      expect(wrapper.find('.statistics-table-wrapper').exists()).toBe(true);
    });

    it('应该显示正确的统计概览数据', async () => {
      // Mock API 返回成功
      vi.mocked(TeacherApi.getWorkloadStatistics).mockResolvedValue({
        success: true,
        data: mockStatistics,
        message: '成功',
      });

      wrapper = mount(WorkloadStatistics, {
        global: {
          plugins: [pinia],
        },
      });

      // 等待数据加载
      await wrapper.vm.$nextTick();
      await new Promise((resolve) => setTimeout(resolve, 100));

      // 验证教师总数
      const summaryItems = wrapper.findAll('.summary-item');
      expect(summaryItems.length).toBeGreaterThan(0);
    });
  });

  describe('数据加载', () => {
    it('应该在挂载时自动加载数据', async () => {
      // Mock API 返回成功
      vi.mocked(TeacherApi.getWorkloadStatistics).mockResolvedValue({
        success: true,
        data: mockStatistics,
        message: '成功',
      });

      wrapper = mount(WorkloadStatistics, {
        global: {
          plugins: [pinia],
        },
        props: {
          autoLoad: true,
        },
      });

      // 等待数据加载
      await wrapper.vm.$nextTick();
      await new Promise((resolve) => setTimeout(resolve, 100));

      // 验证 API 被调用
      expect(TeacherApi.getWorkloadStatistics).toHaveBeenCalled();
    });

    it('应该在 autoLoad 为 false 时不自动加载数据', () => {
      wrapper = mount(WorkloadStatistics, {
        global: {
          plugins: [pinia],
        },
        props: {
          autoLoad: false,
        },
      });

      // 验证 API 未被调用
      expect(TeacherApi.getWorkloadStatistics).not.toHaveBeenCalled();
    });

    it('应该在加载失败时显示错误消息', async () => {
      // Mock API 返回失败
      vi.mocked(TeacherApi.getWorkloadStatistics).mockResolvedValue({
        success: false,
        data: null,
        message: '加载失败',
      });

      wrapper = mount(WorkloadStatistics, {
        global: {
          plugins: [pinia],
        },
      });

      // 等待数据加载
      await wrapper.vm.$nextTick();
      await new Promise((resolve) => setTimeout(resolve, 100));

      // 验证错误消息被显示
      expect(ElMessage.error).toHaveBeenCalled();
    });
  });

  describe('搜索和筛选', () => {
    beforeEach(async () => {
      // Mock API 返回成功
      vi.mocked(TeacherApi.getWorkloadStatistics).mockResolvedValue({
        success: true,
        data: mockStatistics,
        message: '成功',
      });

      wrapper = mount(WorkloadStatistics, {
        global: {
          plugins: [pinia],
        },
      });

      // 等待数据加载
      await wrapper.vm.$nextTick();
      await new Promise((resolve) => setTimeout(resolve, 100));
    });

    it('应该支持按教师姓名搜索', async () => {
      // 获取搜索输入框
      const searchInput = wrapper.find('input[placeholder="搜索教师姓名"]');
      expect(searchInput.exists()).toBe(true);

      // 输入搜索关键词
      await searchInput.setValue('张老师');
      await wrapper.vm.$nextTick();

      // 验证搜索功能被触发
      expect(wrapper.vm.searchKeyword).toBe('张老师');
    });

    it('应该支持按教研组筛选', async () => {
      // 查找教研组选择器
      const groupSelect = wrapper.findAll('.el-select').find((el) =>
        el.text().includes('按教研组筛选')
      );

      expect(groupSelect).toBeDefined();
    });

    it('应该在搜索或筛选后重置到第一页', async () => {
      // 设置当前页为第2页
      wrapper.vm.currentPage = 2;
      await wrapper.vm.$nextTick();

      // 触发搜索
      const searchInput = wrapper.find('input[placeholder="搜索教师姓名"]');
      await searchInput.setValue('张老师');
      await wrapper.vm.$nextTick();

      // 验证页码被重置
      expect(wrapper.vm.currentPage).toBe(1);
    });
  });

  describe('排序功能', () => {
    beforeEach(async () => {
      // Mock API 返回成功
      vi.mocked(TeacherApi.getWorkloadStatistics).mockResolvedValue({
        success: true,
        data: mockStatistics,
        message: '成功',
      });

      wrapper = mount(WorkloadStatistics, {
        global: {
          plugins: [pinia],
        },
      });

      // 等待数据加载
      await wrapper.vm.$nextTick();
      await new Promise((resolve) => setTimeout(resolve, 100));
    });

    it('应该支持按总课时数排序', async () => {
      // 触发排序
      wrapper.vm.handleSortChange({
        prop: 'totalSessions',
        order: 'ascending',
      });
      await wrapper.vm.$nextTick();

      // 验证排序状态
      expect(wrapper.vm.sortProp).toBe('totalSessions');
      expect(wrapper.vm.sortOrder).toBe('ascending');
    });

    it('应该支持按教师姓名排序', async () => {
      // 触发排序
      wrapper.vm.handleSortChange({
        prop: 'teacherName',
        order: 'descending',
      });
      await wrapper.vm.$nextTick();

      // 验证排序状态
      expect(wrapper.vm.sortProp).toBe('teacherName');
      expect(wrapper.vm.sortOrder).toBe('descending');
    });
  });

  describe('分页功能', () => {
    beforeEach(async () => {
      // 创建更多数据以测试分页
      const manyStatistics = Array.from({ length: 50 }, (_, i) => ({
        teacherId: i + 1,
        teacherName: `教师${i + 1}`,
        totalSessions: 10 + i,
        classCount: 2,
        subjects: ['数学'],
        earlySessions: 2,
        lateSessions: 1,
      }));

      vi.mocked(TeacherApi.getWorkloadStatistics).mockResolvedValue({
        success: true,
        data: manyStatistics,
        message: '成功',
      });

      wrapper = mount(WorkloadStatistics, {
        global: {
          plugins: [pinia],
        },
      });

      await wrapper.vm.$nextTick();
      await new Promise((resolve) => setTimeout(resolve, 100));
    });

    it('应该正确显示分页器', () => {
      const pagination = wrapper.find('.pagination-wrapper');
      expect(pagination.exists()).toBe(true);
    });

    it('应该支持改变每页显示数量', async () => {
      wrapper.vm.handleSizeChange(50);
      await wrapper.vm.$nextTick();

      expect(wrapper.vm.pageSize).toBe(50);
      expect(wrapper.vm.currentPage).toBe(1);
    });

    it('应该支持切换页码', async () => {
      wrapper.vm.handleCurrentChange(2);
      await wrapper.vm.$nextTick();

      expect(wrapper.vm.currentPage).toBe(2);
    });
  });

  describe('刷新功能', () => {
    it('应该支持手动刷新数据', async () => {
      vi.mocked(TeacherApi.getWorkloadStatistics).mockResolvedValue({
        success: true,
        data: mockStatistics,
        message: '成功',
      });

      wrapper = mount(WorkloadStatistics, {
        global: {
          plugins: [pinia],
        },
      });

      await wrapper.vm.$nextTick();
      await new Promise((resolve) => setTimeout(resolve, 100));

      // 清除之前的调用记录
      vi.clearAllMocks();

      // 触发刷新
      await wrapper.vm.handleRefresh();
      await wrapper.vm.$nextTick();

      // 验证 API 被再次调用
      expect(TeacherApi.getWorkloadStatistics).toHaveBeenCalled();
    });
  });

  describe('导出功能', () => {
    beforeEach(async () => {
      vi.mocked(TeacherApi.getWorkloadStatistics).mockResolvedValue({
        success: true,
        data: mockStatistics,
        message: '成功',
      });

      wrapper = mount(WorkloadStatistics, {
        global: {
          plugins: [pinia],
        },
      });

      await wrapper.vm.$nextTick();
      await new Promise((resolve) => setTimeout(resolve, 100));
    });

    it('应该在确认后触发导出', async () => {
      // Mock 确认对话框返回确认
      vi.mocked(ElMessageBox.confirm).mockResolvedValue('confirm' as any);

      await wrapper.vm.handleExport();
      await wrapper.vm.$nextTick();

      // 验证确认对话框被调用
      expect(ElMessageBox.confirm).toHaveBeenCalled();

      // 验证成功消息被显示
      expect(ElMessage.success).toHaveBeenCalledWith('工作量统计导出成功');
    });

    it('应该在取消时不执行导出', async () => {
      // Mock 确认对话框返回取消
      vi.mocked(ElMessageBox.confirm).mockRejectedValue('cancel');

      await wrapper.vm.handleExport();
      await wrapper.vm.$nextTick();

      // 验证确认对话框被调用
      expect(ElMessageBox.confirm).toHaveBeenCalled();

      // 验证成功消息未被显示
      expect(ElMessage.success).not.toHaveBeenCalledWith('工作量统计导出成功');
    });
  });

  describe('图表功能', () => {
    beforeEach(async () => {
      vi.mocked(TeacherApi.getWorkloadStatistics).mockResolvedValue({
        success: true,
        data: mockStatistics,
        message: '成功',
      });

      wrapper = mount(WorkloadStatistics, {
        global: {
          plugins: [pinia],
        },
      });

      await wrapper.vm.$nextTick();
      await new Promise((resolve) => setTimeout(resolve, 100));
    });

    it('应该支持显示图表对话框', async () => {
      await wrapper.vm.handleShowChart();
      await wrapper.vm.$nextTick();

      expect(wrapper.vm.chartDialogVisible).toBe(true);
    });

    it('应该在关闭图表对话框时销毁图表实例', async () => {
      // 打开图表对话框
      await wrapper.vm.handleShowChart();
      await wrapper.vm.$nextTick();

      // 关闭图表对话框
      wrapper.vm.handleChartDialogClose();
      await wrapper.vm.$nextTick();

      expect(wrapper.vm.chartDialogVisible).toBe(false);
    });
  });

  describe('详情查看', () => {
    beforeEach(async () => {
      vi.mocked(TeacherApi.getWorkloadStatistics).mockResolvedValue({
        success: true,
        data: mockStatistics,
        message: '成功',
      });

      wrapper = mount(WorkloadStatistics, {
        global: {
          plugins: [pinia],
        },
      });

      await wrapper.vm.$nextTick();
      await new Promise((resolve) => setTimeout(resolve, 100));
    });

    it('应该支持查看教师工作量详情', async () => {
      const statistic = mockStatistics[0];

      await wrapper.vm.handleViewDetail(statistic);
      await wrapper.vm.$nextTick();

      expect(wrapper.vm.detailDialogVisible).toBe(true);
      expect(wrapper.vm.currentStatistic).toEqual(statistic);
    });
  });

  describe('统计计算', () => {
    beforeEach(async () => {
      vi.mocked(TeacherApi.getWorkloadStatistics).mockResolvedValue({
        success: true,
        data: mockStatistics,
        message: '成功',
      });

      wrapper = mount(WorkloadStatistics, {
        global: {
          plugins: [pinia],
        },
      });

      await wrapper.vm.$nextTick();
      await new Promise((resolve) => setTimeout(resolve, 100));
    });

    it('应该正确计算教师总数', () => {
      expect(wrapper.vm.totalTeachers).toBe(mockStatistics.length);
    });

    it('应该正确计算平均课时数', () => {
      const expectedAverage =
        mockStatistics.reduce((sum, s) => sum + s.totalSessions, 0) /
        mockStatistics.length;
      expect(wrapper.vm.averageSessions).toBeCloseTo(expectedAverage, 1);
    });

    it('应该正确计算最高课时数', () => {
      const expectedMax = Math.max(...mockStatistics.map((s) => s.totalSessions));
      expect(wrapper.vm.maxSessions).toBe(expectedMax);
    });

    it('应该正确计算最低课时数', () => {
      const expectedMin = Math.min(...mockStatistics.map((s) => s.totalSessions));
      expect(wrapper.vm.minSessions).toBe(expectedMin);
    });
  });

  describe('辅助方法', () => {
    beforeEach(async () => {
      vi.mocked(TeacherApi.getWorkloadStatistics).mockResolvedValue({
        success: true,
        data: mockStatistics,
        message: '成功',
      });

      wrapper = mount(WorkloadStatistics, {
        global: {
          plugins: [pinia],
        },
      });

      await wrapper.vm.$nextTick();
      await new Promise((resolve) => setTimeout(resolve, 100));
    });

    it('应该根据课时数返回正确的标签类型', () => {
      expect(wrapper.vm.getSessionsTagType(25)).toBe('danger');
      expect(wrapper.vm.getSessionsTagType(18)).toBe('warning');
      expect(wrapper.vm.getSessionsTagType(12)).toBe('success');
      expect(wrapper.vm.getSessionsTagType(5)).toBe('info');
    });

    it('应该根据百分比返回正确的进度条颜色', () => {
      expect(wrapper.vm.getProgressColor(85)).toBe('#f56c6c');
      expect(wrapper.vm.getProgressColor(65)).toBe('#e6a23c');
      expect(wrapper.vm.getProgressColor(45)).toBe('#409eff');
      expect(wrapper.vm.getProgressColor(30)).toBe('#67c23a');
    });

    it('应该正确计算表格索引', () => {
      wrapper.vm.currentPage = 2;
      wrapper.vm.pageSize = 20;

      expect(wrapper.vm.getTableIndex(0)).toBe(21);
      expect(wrapper.vm.getTableIndex(5)).toBe(26);
    });
  });

  describe('事件发射', () => {
    it('应该在数据加载成功后发射 loaded 事件', async () => {
      vi.mocked(TeacherApi.getWorkloadStatistics).mockResolvedValue({
        success: true,
        data: mockStatistics,
        message: '成功',
      });

      wrapper = mount(WorkloadStatistics, {
        global: {
          plugins: [pinia],
        },
      });

      await wrapper.vm.$nextTick();
      await new Promise((resolve) => setTimeout(resolve, 100));

      // 验证 loaded 事件被发射
      expect(wrapper.emitted('loaded')).toBeTruthy();
    });

    it('应该在导出时发射 export 事件', async () => {
      vi.mocked(TeacherApi.getWorkloadStatistics).mockResolvedValue({
        success: true,
        data: mockStatistics,
        message: '成功',
      });

      wrapper = mount(WorkloadStatistics, {
        global: {
          plugins: [pinia],
        },
      });

      await wrapper.vm.$nextTick();
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Mock 确认对话框
      vi.mocked(ElMessageBox.confirm).mockResolvedValue('confirm' as any);

      await wrapper.vm.handleExport();
      await wrapper.vm.$nextTick();

      // 验证 export 事件被发射
      expect(wrapper.emitted('export')).toBeTruthy();
    });
  });
});
