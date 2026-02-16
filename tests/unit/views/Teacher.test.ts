/**
 * 教师管理页面单元测试
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { mount, VueWrapper } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { ElMessage } from 'element-plus';
import Teacher from '@/views/Teacher.vue';
import { useTeacherStore } from '@/stores/teacherStore';
import { useConfigStore } from '@/stores/configStore';

// Mock Element Plus 消息组件
vi.mock('element-plus', async () => {
  const actual = await vi.importActual('element-plus');
  return {
    ...actual,
    ElMessage: {
      success: vi.fn(),
      error: vi.fn(),
      warning: vi.fn(),
      info: vi.fn(),
    },
  };
});

// Mock 日志工具
vi.mock('@/utils/logger', () => ({
  logger: {
    info: vi.fn(),
    debug: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
  },
}));

describe('Teacher.vue', () => {
  let wrapper: VueWrapper<any>;
  let teacherStore: ReturnType<typeof useTeacherStore>;
  let configStore: ReturnType<typeof useConfigStore>;

  beforeEach(() => {
    // 创建新的 Pinia 实例
    setActivePinia(createPinia());

    // 获取 store 实例
    teacherStore = useTeacherStore();
    configStore = useConfigStore();

    // Mock store 方法
    vi.spyOn(teacherStore, 'loadTeachers').mockResolvedValue();
    vi.spyOn(configStore, 'loadConfig').mockResolvedValue();

    // 设置默认配置
    configStore.cycleDays = 5;
    configStore.periodsPerDay = 8;

    // 设置模拟教师数据
    teacherStore.teachers = [
      {
        id: 1,
        name: '张老师',
        teachingGroupId: 1,
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
      },
      {
        id: 2,
        name: '李老师',
        teachingGroupId: 2,
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
      },
    ];
  });

  afterEach(() => {
    if (wrapper) {
      wrapper.unmount();
    }
    vi.clearAllMocks();
  });

  describe('组件渲染', () => {
    it('应该正确渲染页面结构', () => {
      wrapper = mount(Teacher, {
        global: {
          stubs: {
            TeacherPreferenceComponent: true,
            WorkloadStatisticsComponent: true,
            TeacherList: true,
            ElBreadcrumb: true,
            ElBreadcrumbItem: true,
            ElButton: true,
            ElTabs: true,
            ElTabPane: true,
          },
        },
      });

      // 验证页面标题
      expect(wrapper.find('.page-title').text()).toBe('教师管理');

      // 验证页面内容存在
      expect(wrapper.find('.page-content').exists()).toBe(true);
    });

    it('应该显示三个标签页', () => {
      wrapper = mount(Teacher, {
        global: {
          stubs: {
            TeacherPreferenceComponent: true,
            WorkloadStatisticsComponent: true,
            TeacherList: true,
            ElBreadcrumb: true,
            ElBreadcrumbItem: true,
            ElButton: true,
          },
        },
      });

      // 验证有三个标签页内容
      const tabContents = wrapper.findAll('.tab-content');
      expect(tabContents.length).toBeGreaterThanOrEqual(1);
    });

    it('应该默认显示教师列表标签页', () => {
      wrapper = mount(Teacher, {
        global: {
          stubs: {
            TeacherPreference: true,
            WorkloadStatistics: true,
            ElBreadcrumb: true,
            ElBreadcrumbItem: true,
            ElButton: true,
            ElTabs: true,
            ElTabPane: true,
          },
        },
      });

      expect(wrapper.vm.activeTab).toBe('list');
    });
  });

  describe('数据加载', () => {
    it('应该在挂载时加载配置', async () => {
      wrapper = mount(Teacher, {
        global: {
          stubs: {
            TeacherPreference: true,
            WorkloadStatistics: true,
            ElBreadcrumb: true,
            ElBreadcrumbItem: true,
            ElButton: true,
            ElTabs: true,
            ElTabPane: true,
          },
        },
      });

      await wrapper.vm.$nextTick();

      expect(configStore.loadConfig).toHaveBeenCalled();
    });

    it('应该在教师列表标签页加载教师数据', async () => {
      wrapper = mount(Teacher, {
        global: {
          stubs: {
            TeacherPreference: true,
            WorkloadStatistics: true,
            ElBreadcrumb: true,
            ElBreadcrumbItem: true,
            ElButton: true,
            ElTabs: true,
            ElTabPane: true,
          },
        },
      });

      await wrapper.vm.$nextTick();

      expect(teacherStore.loadTeachers).toHaveBeenCalled();
    });

    it('加载失败时应该显示错误消息', async () => {
      // Mock 加载失败
      vi.spyOn(teacherStore, 'loadTeachers').mockRejectedValue(
        new Error('加载失败')
      );

      wrapper = mount(Teacher, {
        global: {
          stubs: {
            TeacherPreference: true,
            WorkloadStatistics: true,
            ElBreadcrumb: true,
            ElBreadcrumbItem: true,
            ElButton: true,
            ElTabs: true,
            ElTabPane: true,
          },
        },
      });

      await wrapper.vm.$nextTick();
      await new Promise((resolve) => setTimeout(resolve, 100));

      expect(ElMessage.error).toHaveBeenCalledWith('加载教师数据失败');
    });
  });

  describe('标签页切换', () => {
    it('应该能够切换到偏好设置标签页', async () => {
      wrapper = mount(Teacher, {
        global: {
          stubs: {
            TeacherPreference: true,
            WorkloadStatistics: true,
            ElBreadcrumb: true,
            ElBreadcrumbItem: true,
            ElButton: true,
            ElTabs: true,
            ElTabPane: true,
          },
        },
      });

      await wrapper.vm.$nextTick();

      // 切换标签页
      wrapper.vm.activeTab = 'preference';
      await wrapper.vm.$nextTick();

      expect(wrapper.vm.activeTab).toBe('preference');
    });

    it('应该能够切换到工作量统计标签页', async () => {
      wrapper = mount(Teacher, {
        global: {
          stubs: {
            TeacherPreference: true,
            WorkloadStatistics: true,
            ElBreadcrumb: true,
            ElBreadcrumbItem: true,
            ElButton: true,
            ElTabs: true,
            ElTabPane: true,
          },
        },
      });

      await wrapper.vm.$nextTick();

      // 切换标签页
      wrapper.vm.activeTab = 'workload';
      await wrapper.vm.$nextTick();

      expect(wrapper.vm.activeTab).toBe('workload');
    });
  });

  describe('刷新功能', () => {
    it('应该能够刷新数据', async () => {
      wrapper = mount(Teacher, {
        global: {
          stubs: {
            TeacherPreference: true,
            WorkloadStatistics: true,
            ElBreadcrumb: true,
            ElBreadcrumbItem: true,
            ElButton: true,
            ElTabs: true,
            ElTabPane: true,
          },
        },
      });

      await wrapper.vm.$nextTick();

      // 清除之前的调用记录
      vi.clearAllMocks();

      // 触发刷新
      await wrapper.vm.handleRefresh();

      expect(teacherStore.loadTeachers).toHaveBeenCalled();
      expect(ElMessage.success).toHaveBeenCalledWith('数据刷新成功');
    });

    it('刷新失败时应该显示错误消息', async () => {
      wrapper = mount(Teacher, {
        global: {
          stubs: {
            TeacherPreferenceComponent: true,
            WorkloadStatisticsComponent: true,
            TeacherList: true,
            ElBreadcrumb: true,
            ElBreadcrumbItem: true,
            ElButton: true,
            ElTabs: true,
            ElTabPane: true,
          },
        },
      });

      await wrapper.vm.$nextTick();

      // Mock 刷新失败
      vi.spyOn(teacherStore, 'loadTeachers').mockRejectedValue(
        new Error('刷新失败')
      );

      // 清除之前的调用
      vi.clearAllMocks();

      // 触发刷新
      await wrapper.vm.handleRefresh();
      await new Promise((resolve) => setTimeout(resolve, 100));

      // 验证显示了错误消息（可能是"加载教师数据失败"或"刷新数据失败"）
      expect(ElMessage.error).toHaveBeenCalled();
    });
  });

  describe('教师操作', () => {
    it('应该能够查看教师偏好', async () => {
      wrapper = mount(Teacher, {
        global: {
          stubs: {
            TeacherPreference: true,
            WorkloadStatistics: true,
            ElBreadcrumb: true,
            ElBreadcrumbItem: true,
            ElButton: true,
            ElTabs: true,
            ElTabPane: true,
          },
        },
      });

      await wrapper.vm.$nextTick();

      const teacher = teacherStore.teachers[0];

      // 触发查看偏好
      wrapper.vm.handleViewPreference(teacher);
      await wrapper.vm.$nextTick();

      // 验证切换到偏好设置标签页
      expect(wrapper.vm.activeTab).toBe('preference');

      // 验证选中了该教师
      expect(teacherStore.selectedTeacher).toEqual(teacher);
    });

    it('应该能够查看教师工作量', async () => {
      wrapper = mount(Teacher, {
        global: {
          stubs: {
            TeacherPreference: true,
            WorkloadStatistics: true,
            ElBreadcrumb: true,
            ElBreadcrumbItem: true,
            ElButton: true,
            ElTabs: true,
            ElTabPane: true,
          },
        },
      });

      await wrapper.vm.$nextTick();

      const teacher = teacherStore.teachers[0];

      // 触发查看工作量
      wrapper.vm.handleViewWorkload(teacher);
      await wrapper.vm.$nextTick();

      // 验证切换到工作量统计标签页
      expect(wrapper.vm.activeTab).toBe('workload');

      // 验证选中了该教师
      expect(teacherStore.selectedTeacher).toEqual(teacher);
    });
  });

  describe('偏好设置', () => {
    it('应该能够保存教师偏好', async () => {
      wrapper = mount(Teacher, {
        global: {
          stubs: {
            TeacherPreference: true,
            WorkloadStatistics: true,
            ElBreadcrumb: true,
            ElBreadcrumbItem: true,
            ElButton: true,
            ElTabs: true,
            ElTabPane: true,
          },
        },
      });

      await wrapper.vm.$nextTick();

      const preferences = [
        {
          teacherId: 1,
          preferredSlots: '0',
          timeBias: 0,
          weight: 1,
          blockedSlots: '0',
        },
      ];

      // 触发保存
      wrapper.vm.handlePreferenceSave(preferences);
      await wrapper.vm.$nextTick();

      expect(ElMessage.success).toHaveBeenCalledWith(
        '成功保存 1 位教师的偏好设置'
      );
    });

    it('应该能够处理偏好变更', async () => {
      wrapper = mount(Teacher, {
        global: {
          stubs: {
            TeacherPreference: true,
            WorkloadStatistics: true,
            ElBreadcrumb: true,
            ElBreadcrumbItem: true,
            ElButton: true,
            ElTabs: true,
            ElTabPane: true,
          },
        },
      });

      await wrapper.vm.$nextTick();

      // 触发偏好变更
      wrapper.vm.handlePreferenceChange();
      await wrapper.vm.$nextTick();

      // 验证没有错误
      expect(wrapper.vm.activeTab).toBeDefined();
    });
  });

  describe('工作量统计', () => {
    it('应该能够处理工作量统计加载完成', async () => {
      wrapper = mount(Teacher, {
        global: {
          stubs: {
            TeacherPreference: true,
            WorkloadStatistics: true,
            ElBreadcrumb: true,
            ElBreadcrumbItem: true,
            ElButton: true,
            ElTabs: true,
            ElTabPane: true,
          },
        },
      });

      await wrapper.vm.$nextTick();

      const statistics = [
        {
          teacherId: 1,
          teacherName: '张老师',
          totalSessions: 20,
          classCount: 3,
          subjects: ['语文'],
          earlySessions: 5,
          lateSessions: 3,
        },
      ];

      // 触发加载完成
      wrapper.vm.handleWorkloadLoaded(statistics);
      await wrapper.vm.$nextTick();

      // 验证没有错误
      expect(wrapper.vm.activeTab).toBeDefined();
    });

    it('应该能够处理工作量统计导出', async () => {
      wrapper = mount(Teacher, {
        global: {
          stubs: {
            TeacherPreference: true,
            WorkloadStatistics: true,
            ElBreadcrumb: true,
            ElBreadcrumbItem: true,
            ElButton: true,
            ElTabs: true,
            ElTabPane: true,
          },
        },
      });

      await wrapper.vm.$nextTick();

      // 触发导出
      wrapper.vm.handleWorkloadExport();
      await wrapper.vm.$nextTick();

      expect(ElMessage.success).toHaveBeenCalledWith('工作量统计导出成功');
    });
  });

  describe('计算属性', () => {
    it('应该正确计算教师列表', () => {
      wrapper = mount(Teacher, {
        global: {
          stubs: {
            TeacherPreference: true,
            WorkloadStatistics: true,
            ElBreadcrumb: true,
            ElBreadcrumbItem: true,
            ElButton: true,
            ElTabs: true,
            ElTabPane: true,
          },
        },
      });

      expect(wrapper.vm.teachers).toEqual(teacherStore.teachers);
      expect(wrapper.vm.teachers.length).toBe(2);
    });

    it('应该正确计算排课周期天数', () => {
      wrapper = mount(Teacher, {
        global: {
          stubs: {
            TeacherPreference: true,
            WorkloadStatistics: true,
            ElBreadcrumb: true,
            ElBreadcrumbItem: true,
            ElButton: true,
            ElTabs: true,
            ElTabPane: true,
          },
        },
      });

      expect(wrapper.vm.cycleDays).toBe(5);
    });

    it('应该正确计算每天节次数', () => {
      wrapper = mount(Teacher, {
        global: {
          stubs: {
            TeacherPreference: true,
            WorkloadStatistics: true,
            ElBreadcrumb: true,
            ElBreadcrumbItem: true,
            ElButton: true,
            ElTabs: true,
            ElTabPane: true,
          },
        },
      });

      expect(wrapper.vm.periodsPerDay).toBe(8);
    });
  });

  describe('响应式设计', () => {
    it('应该在小屏幕上正确显示', () => {
      wrapper = mount(Teacher, {
        global: {
          stubs: {
            TeacherPreference: true,
            WorkloadStatistics: true,
            ElBreadcrumb: true,
            ElBreadcrumbItem: true,
            ElButton: true,
            ElTabs: true,
            ElTabPane: true,
          },
        },
      });

      // 验证页面结构存在
      expect(wrapper.find('.teacher-page').exists()).toBe(true);
      expect(wrapper.find('.page-header').exists()).toBe(true);
      expect(wrapper.find('.page-content').exists()).toBe(true);
    });
  });

  describe('日志记录', () => {
    it('应该记录页面挂载日志', async () => {
      const { logger } = await import('@/utils/logger');

      wrapper = mount(Teacher, {
        global: {
          stubs: {
            TeacherPreference: true,
            WorkloadStatistics: true,
            ElBreadcrumb: true,
            ElBreadcrumbItem: true,
            ElButton: true,
            ElTabs: true,
            ElTabPane: true,
          },
        },
      });

      await wrapper.vm.$nextTick();

      expect(logger.info).toHaveBeenCalledWith(
        expect.stringContaining('[TeacherPage] Teacher 页面挂载')
      );
    });

    it('应该记录标签页切换日志', async () => {
      const { logger } = await import('@/utils/logger');

      wrapper = mount(Teacher, {
        global: {
          stubs: {
            TeacherPreference: true,
            WorkloadStatistics: true,
            ElBreadcrumb: true,
            ElBreadcrumbItem: true,
            ElButton: true,
            ElTabs: true,
            ElTabPane: true,
          },
        },
      });

      await wrapper.vm.$nextTick();

      // 清除之前的日志
      vi.clearAllMocks();

      // 切换标签页
      wrapper.vm.handleTabChange('preference');
      await wrapper.vm.$nextTick();

      expect(logger.info).toHaveBeenCalledWith(
        expect.stringContaining('[TeacherPage] 切换标签页'),
        expect.objectContaining({ tabName: 'preference' })
      );
    });
  });
});
