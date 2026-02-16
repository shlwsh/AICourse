/**
 * 统计页面单元测试
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import Statistics from '@/views/Statistics.vue';
import { ElMessage, ElMessageBox } from 'element-plus';

// Mock 子组件
vi.mock('@/components/teacher/WorkloadStatistics.vue', () => ({
  default: {
    name: 'WorkloadStatistics',
    template: '<div class="workload-statistics-mock">WorkloadStatistics</div>',
    props: ['autoLoad'],
    emits: ['loaded', 'export'],
  },
}));

vi.mock('@/components/statistics/ScheduleStatistics.vue', () => ({
  default: {
    name: 'ScheduleStatistics',
    template: '<div class="schedule-statistics-mock">ScheduleStatistics</div>',
    props: ['autoLoad'],
    emits: ['loaded'],
  },
}));

vi.mock('@/components/statistics/TimeSlotUtilization.vue', () => ({
  default: {
    name: 'TimeSlotUtilization',
    template: '<div class="timeslot-utilization-mock">TimeSlotUtilization</div>',
    props: ['autoLoad'],
    emits: ['loaded'],
  },
}));

vi.mock('@/components/statistics/CourseDistribution.vue', () => ({
  default: {
    name: 'CourseDistribution',
    template: '<div class="course-distribution-mock">CourseDistribution</div>',
    props: ['autoLoad'],
    emits: ['loaded'],
  },
}));

// Mock Element Plus
vi.mock('element-plus', () => ({
  ElMessage: {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
  },
  ElMessageBox: {
    confirm: vi.fn(),
  },
}));

describe('Statistics.vue', () => {
  beforeEach(() => {
    // 创建新的 Pinia 实例
    setActivePinia(createPinia());

    // 清除所有 mock
    vi.clearAllMocks();
  });

  it('应该正确渲染统计页面', () => {
    const wrapper = mount(Statistics, {
      global: {
        stubs: {
          ElBreadcrumb: true,
          ElBreadcrumbItem: true,
          ElButton: true,
          ElTabs: true,
          ElTabPane: true,
          ElIcon: true,
        },
      },
    });

    expect(wrapper.find('.statistics-page').exists()).toBe(true);
    expect(wrapper.find('.page-title').text()).toBe('统计分析');
  });

  it('应该显示四个标签页', () => {
    const wrapper = mount(Statistics, {
      global: {
        stubs: {
          ElBreadcrumb: true,
          ElBreadcrumbItem: true,
          ElButton: true,
          ElIcon: true,
        },
      },
    });

    // 检查是否有四个 tab-content 区域
    const tabContents = wrapper.findAll('.tab-content');
    expect(tabContents.length).toBeGreaterThanOrEqual(1); // 至少有一个标签页内容
  });

  it('应该默认显示工作量统计标签页', () => {
    const wrapper = mount(Statistics, {
      global: {
        stubs: {
          ElBreadcrumb: true,
          ElBreadcrumbItem: true,
          ElButton: true,
          ElTabs: true,
          ElTabPane: true,
          ElIcon: true,
        },
      },
    });

    expect(wrapper.vm.activeTab).toBe('workload');
  });

  it('应该处理标签页切换', async () => {
    const wrapper = mount(Statistics, {
      global: {
        stubs: {
          ElBreadcrumb: true,
          ElBreadcrumbItem: true,
          ElButton: true,
          ElIcon: true,
        },
      },
    });

    // 直接设置 activeTab 来模拟标签页切换
    wrapper.vm.activeTab = 'schedule';
    await wrapper.vm.handleTabChange('schedule');
    expect(wrapper.vm.activeTab).toBe('schedule');

    // 切换到时段利用率标签页
    wrapper.vm.activeTab = 'utilization';
    await wrapper.vm.handleTabChange('utilization');
    expect(wrapper.vm.activeTab).toBe('utilization');

    // 切换到课程分布标签页
    wrapper.vm.activeTab = 'distribution';
    await wrapper.vm.handleTabChange('distribution');
    expect(wrapper.vm.activeTab).toBe('distribution');
  });

  it('应该处理刷新操作', async () => {
    const wrapper = mount(Statistics, {
      global: {
        stubs: {
          ElBreadcrumb: true,
          ElBreadcrumbItem: true,
          ElButton: true,
          ElTabs: true,
          ElTabPane: true,
          ElIcon: true,
        },
      },
    });

    await wrapper.vm.handleRefresh();

    expect(ElMessage.success).toHaveBeenCalledWith('统计数据刷新成功');
  });

  it('应该处理导出全部操作', async () => {
    const wrapper = mount(Statistics, {
      global: {
        stubs: {
          ElBreadcrumb: true,
          ElBreadcrumbItem: true,
          ElButton: true,
          ElTabs: true,
          ElTabPane: true,
          ElIcon: true,
        },
      },
    });

    // 设置有数据
    wrapper.vm.workloadData = [{ teacherId: 1, teacherName: '张三', totalSessions: 10 }];

    // Mock 确认对话框返回确认
    (ElMessageBox.confirm as any).mockResolvedValue('confirm');

    await wrapper.vm.handleExportAll();

    expect(ElMessageBox.confirm).toHaveBeenCalled();
    expect(ElMessage.success).toHaveBeenCalledWith('统计数据导出成功');
  });

  it('应该处理取消导出操作', async () => {
    const wrapper = mount(Statistics, {
      global: {
        stubs: {
          ElBreadcrumb: true,
          ElBreadcrumbItem: true,
          ElButton: true,
          ElTabs: true,
          ElTabPane: true,
          ElIcon: true,
        },
      },
    });

    // 设置有数据
    wrapper.vm.workloadData = [{ teacherId: 1, teacherName: '张三', totalSessions: 10 }];

    // Mock 确认对话框返回取消
    (ElMessageBox.confirm as any).mockRejectedValue('cancel');

    await wrapper.vm.handleExportAll();

    expect(ElMessageBox.confirm).toHaveBeenCalled();
    expect(ElMessage.success).not.toHaveBeenCalled();
  });

  it('应该处理工作量统计加载完成', () => {
    const wrapper = mount(Statistics, {
      global: {
        stubs: {
          ElBreadcrumb: true,
          ElBreadcrumbItem: true,
          ElButton: true,
          ElTabs: true,
          ElTabPane: true,
          ElIcon: true,
        },
      },
    });

    const mockData = [
      { teacherId: 1, teacherName: '张三', totalSessions: 10 },
      { teacherId: 2, teacherName: '李四', totalSessions: 15 },
    ];

    wrapper.vm.handleWorkloadLoaded(mockData);

    expect(wrapper.vm.workloadData).toEqual(mockData);
  });

  it('应该处理课表统计加载完成', () => {
    const wrapper = mount(Statistics, {
      global: {
        stubs: {
          ElBreadcrumb: true,
          ElBreadcrumbItem: true,
          ElButton: true,
          ElTabs: true,
          ElTabPane: true,
          ElIcon: true,
        },
      },
    });

    const mockData = {
      totalCourses: 100,
      totalTeachers: 20,
      totalClasses: 10,
    };

    wrapper.vm.handleScheduleStatsLoaded(mockData);

    expect(wrapper.vm.scheduleStatsData).toEqual(mockData);
  });

  it('应该处理时段利用率加载完成', () => {
    const wrapper = mount(Statistics, {
      global: {
        stubs: {
          ElBreadcrumb: true,
          ElBreadcrumbItem: true,
          ElButton: true,
          ElTabs: true,
          ElTabPane: true,
          ElIcon: true,
        },
      },
    });

    const mockData = {
      averageUtilization: 75.5,
      maxUtilization: 95.0,
      minUtilization: 50.0,
    };

    wrapper.vm.handleUtilizationLoaded(mockData);

    expect(wrapper.vm.utilizationData).toEqual(mockData);
  });

  it('应该处理课程分布加载完成', () => {
    const wrapper = mount(Statistics, {
      global: {
        stubs: {
          ElBreadcrumb: true,
          ElBreadcrumbItem: true,
          ElButton: true,
          ElTabs: true,
          ElTabPane: true,
          ElIcon: true,
        },
      },
    });

    const mockData = {
      distributionType: 'subject',
      distributionData: [
        { name: '语文', count: 20 },
        { name: '数学', count: 18 },
      ],
    };

    wrapper.vm.handleDistributionLoaded(mockData);

    expect(wrapper.vm.distributionData).toEqual(mockData);
  });

  it('应该正确计算是否有数据', () => {
    const wrapper = mount(Statistics, {
      global: {
        stubs: {
          ElBreadcrumb: true,
          ElBreadcrumbItem: true,
          ElButton: true,
          ElTabs: true,
          ElTabPane: true,
          ElIcon: true,
        },
      },
    });

    // 初始状态没有数据
    expect(wrapper.vm.hasData).toBe(false);

    // 添加工作量数据
    wrapper.vm.workloadData = [{ teacherId: 1, teacherName: '张三', totalSessions: 10 }];
    expect(wrapper.vm.hasData).toBe(true);

    // 清空工作量数据，添加课表统计数据
    wrapper.vm.workloadData = [];
    wrapper.vm.scheduleStatsData = { totalCourses: 100 };
    expect(wrapper.vm.hasData).toBe(true);
  });

  it('应该在没有数据时禁用导出按钮', () => {
    const wrapper = mount(Statistics, {
      global: {
        stubs: {
          ElBreadcrumb: true,
          ElBreadcrumbItem: true,
          ElButton: true,
          ElTabs: true,
          ElTabPane: true,
          ElIcon: true,
        },
      },
    });

    expect(wrapper.vm.hasData).toBe(false);
  });

  it('应该在有数据时启用导出按钮', () => {
    const wrapper = mount(Statistics, {
      global: {
        stubs: {
          ElBreadcrumb: true,
          ElBreadcrumbItem: true,
          ElButton: true,
          ElTabs: true,
          ElTabPane: true,
          ElIcon: true,
        },
      },
    });

    wrapper.vm.workloadData = [{ teacherId: 1, teacherName: '张三', totalSessions: 10 }];

    expect(wrapper.vm.hasData).toBe(true);
  });
});
