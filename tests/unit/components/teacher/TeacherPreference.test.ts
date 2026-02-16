/**
 * TeacherPreference 组件单元测试
 * 测试教师偏好设置组件的各项功能
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { mount, VueWrapper } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { ElMessage, ElMessageBox } from 'element-plus';
import TeacherPreference from '@/components/teacher/TeacherPreference.vue';
import { useTeacherStore } from '@/stores/teacherStore';
import type { Teacher, TeacherPreference as TeacherPref } from '@/stores/teacherStore';

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

describe('TeacherPreference 组件', () => {
  let wrapper: VueWrapper<any>;
  let teacherStore: ReturnType<typeof useTeacherStore>;

  // 模拟教师数据
  const mockTeachers: Teacher[] = [
    {
      id: 1,
      name: '张老师',
      teachingGroupId: 1,
      createdAt: '2024-01-01',
      updatedAt: '2024-01-01',
    },
    {
      id: 2,
      name: '李老师',
      teachingGroupId: 2,
      createdAt: '2024-01-01',
      updatedAt: '2024-01-01',
    },
    {
      id: 3,
      name: '王老师',
      teachingGroupId: 1,
      createdAt: '2024-01-01',
      updatedAt: '2024-01-01',
    },
  ];

  beforeEach(() => {
    // 创建新的 Pinia 实例
    setActivePinia(createPinia());
    teacherStore = useTeacherStore();

    // 设置模拟数据
    teacherStore.teachers = [...mockTeachers];

    // Mock store 方法
    vi.spyOn(teacherStore, 'loadTeachers').mockResolvedValue();
    vi.spyOn(teacherStore, 'saveTeacherPreference').mockResolvedValue();
    vi.spyOn(teacherStore, 'batchSaveTeacherPreferences').mockResolvedValue();

    // 挂载组件
    wrapper = mount(TeacherPreference, {
      global: {
        plugins: [createPinia()],
        stubs: {
          ElTable: true,
          ElTableColumn: true,
          ElInput: true,
          ElSelect: true,
          ElOption: true,
          ElButton: true,
          ElDialog: true,
          ElRadioGroup: true,
          ElRadioButton: true,
          ElInputNumber: true,
          ElTag: true,
          ElDescriptions: true,
          ElDescriptionsItem: true,
          ElForm: true,
          ElFormItem: true,
          ElScrollbar: true,
        },
      },
    });
  });

  describe('组件渲染', () => {
    it('应该正确渲染组件', () => {
      expect(wrapper.exists()).toBe(true);
      expect(wrapper.find('.teacher-preference-container').exists()).toBe(true);
    });

    it('应该显示工具栏', () => {
      expect(wrapper.find('.preference-toolbar').exists()).toBe(true);
      expect(wrapper.find('.toolbar-left').exists()).toBe(true);
      expect(wrapper.find('.toolbar-right').exists()).toBe(true);
    });

    it('应该显示教师列表表格', () => {
      expect(wrapper.find('.preference-table-wrapper').exists()).toBe(true);
    });
  });

  describe('搜索和筛选功能', () => {
    it('应该支持按教师姓名搜索', async () => {
      const searchInput = wrapper.find('input[placeholder="搜索教师姓名"]');
      expect(searchInput.exists()).toBe(true);

      // 模拟搜索
      wrapper.vm.searchKeyword = '张';
      await wrapper.vm.$nextTick();

      // 验证过滤结果
      const filtered = wrapper.vm.filteredTeachers;
      expect(filtered.length).toBe(1);
      expect(filtered[0].name).toBe('张老师');
    });

    it('应该支持按教研组筛选', async () => {
      // 设置教研组筛选
      wrapper.vm.selectedGroupId = 1;
      await wrapper.vm.$nextTick();

      // 验证过滤结果
      const filtered = wrapper.vm.filteredTeachers;
      expect(filtered.length).toBe(2);
      expect(filtered.every((t: Teacher) => t.teachingGroupId === 1)).toBe(true);
    });

    it('应该支持组合搜索和筛选', async () => {
      // 设置教研组和搜索关键词
      wrapper.vm.selectedGroupId = 1;
      wrapper.vm.searchKeyword = '张';
      await wrapper.vm.$nextTick();

      // 验证过滤结果
      const filtered = wrapper.vm.filteredTeachers;
      expect(filtered.length).toBe(1);
      expect(filtered[0].name).toBe('张老师');
      expect(filtered[0].teachingGroupId).toBe(1);
    });
  });

  describe('教师偏好设置', () => {
    it('应该为每个教师创建默认偏好', () => {
      mockTeachers.forEach((teacher) => {
        const pref = wrapper.vm.getPreference(teacher.id);
        expect(pref).toBeDefined();
        expect(pref.teacherId).toBe(teacher.id);
        expect(pref.timeBias).toBe(0);
        expect(pref.weight).toBe(1);
        expect(pref.preferredSlots).toBe('0');
        expect(pref.blockedSlots).toBe('0');
      });
    });

    it('应该正确检测偏好时段设置', () => {
      // 设置偏好时段
      const pref = wrapper.vm.getPreference(1);
      pref.preferredSlots = '15'; // 二进制: 1111

      expect(wrapper.vm.hasPreferredSlots(1)).toBe(true);
      expect(wrapper.vm.hasPreferredSlots(2)).toBe(false);
    });

    it('应该正确检测不排课时段设置', () => {
      // 设置不排课时段
      const pref = wrapper.vm.getPreference(1);
      pref.blockedSlots = '255'; // 二进制: 11111111

      expect(wrapper.vm.hasBlockedSlots(1)).toBe(true);
      expect(wrapper.vm.hasBlockedSlots(2)).toBe(false);
    });

    it('应该正确获取早晚偏好标签', () => {
      expect(wrapper.vm.getTimeBiasLabel(0)).toBe('无偏好');
      expect(wrapper.vm.getTimeBiasLabel(1)).toBe('厌恶早课');
      expect(wrapper.vm.getTimeBiasLabel(2)).toBe('厌恶晚课');
    });
  });

  describe('位掩码操作', () => {
    it('应该正确计算时间槽位的位位置', () => {
      // 5天 × 8节
      expect(wrapper.vm.getSlotBitPosition(0, 0)).toBe(0); // 星期一第1节
      expect(wrapper.vm.getSlotBitPosition(0, 7)).toBe(7); // 星期一第8节
      expect(wrapper.vm.getSlotBitPosition(1, 0)).toBe(8); // 星期二第1节
      expect(wrapper.vm.getSlotBitPosition(4, 7)).toBe(39); // 星期五第8节
    });

    it('应该正确检查时间槽位是否在掩码中', () => {
      const mask = '15'; // 二进制: 1111，表示前4个槽位

      expect(wrapper.vm.isSlotInMask(mask, 0, 0)).toBe(true); // 位0
      expect(wrapper.vm.isSlotInMask(mask, 0, 1)).toBe(true); // 位1
      expect(wrapper.vm.isSlotInMask(mask, 0, 2)).toBe(true); // 位2
      expect(wrapper.vm.isSlotInMask(mask, 0, 3)).toBe(true); // 位3
      expect(wrapper.vm.isSlotInMask(mask, 0, 4)).toBe(false); // 位4
    });

    it('应该正确设置时间槽位到掩码', () => {
      let mask = '0';

      // 设置位0
      mask = wrapper.vm.setSlotInMask(mask, 0, 0, true);
      expect(mask).toBe('1');

      // 设置位1
      mask = wrapper.vm.setSlotInMask(mask, 0, 1, true);
      expect(mask).toBe('3'); // 二进制: 11

      // 清除位0
      mask = wrapper.vm.setSlotInMask(mask, 0, 0, false);
      expect(mask).toBe('2'); // 二进制: 10
    });
  });

  describe('批量设置功能', () => {
    it('应该支持选择多个教师', async () => {
      const selection = [mockTeachers[0], mockTeachers[1]];
      await wrapper.vm.handleSelectionChange(selection);

      expect(wrapper.vm.selectedTeachers).toEqual(selection);
      expect(wrapper.vm.selectedTeachers.length).toBe(2);
    });

    it('应该在未选择教师时禁用批量设置按钮', () => {
      wrapper.vm.selectedTeachers = [];
      expect(wrapper.vm.selectedTeachers.length).toBe(0);
    });

    it('应该打开批量设置对话框', async () => {
      wrapper.vm.selectedTeachers = [mockTeachers[0], mockTeachers[1]];
      await wrapper.vm.handleBatchSetting();

      expect(wrapper.vm.batchDialogVisible).toBe(true);
    });

    it('应该批量应用偏好设置', async () => {
      wrapper.vm.selectedTeachers = [mockTeachers[0], mockTeachers[1]];
      wrapper.vm.batchForm.timeBias = 1;
      wrapper.vm.batchForm.weight = 5;

      await wrapper.vm.handleBatchConfirm();

      // 验证设置已应用
      const pref1 = wrapper.vm.getPreference(mockTeachers[0].id);
      const pref2 = wrapper.vm.getPreference(mockTeachers[1].id);

      expect(pref1.timeBias).toBe(1);
      expect(pref1.weight).toBe(5);
      expect(pref2.timeBias).toBe(1);
      expect(pref2.weight).toBe(5);

      expect(wrapper.vm.hasChanges).toBe(true);
      expect(wrapper.vm.batchDialogVisible).toBe(false);
    });
  });

  describe('时段编辑功能', () => {
    it('应该打开时段编辑对话框', async () => {
      await wrapper.vm.handleEditSlots(mockTeachers[0]);

      expect(wrapper.vm.slotsDialogVisible).toBe(true);
      expect(wrapper.vm.currentTeacher).toEqual(mockTeachers[0]);
    });

    it('应该支持点击时间槽位切换状态', async () => {
      wrapper.vm.slotEditMode = 'prefer';
      wrapper.vm.tempSlots.preferred.clear();

      // 点击槽位
      await wrapper.vm.handleSlotClick(0, 0);

      expect(wrapper.vm.tempSlots.preferred.has(0)).toBe(true);

      // 再次点击取消
      await wrapper.vm.handleSlotClick(0, 0);

      expect(wrapper.vm.tempSlots.preferred.has(0)).toBe(false);
    });

    it('应该支持清空时段设置', async () => {
      wrapper.vm.tempSlots.preferred.add(0);
      wrapper.vm.tempSlots.preferred.add(1);
      wrapper.vm.tempSlots.blocked.add(2);

      await wrapper.vm.handleClearSlots();

      expect(wrapper.vm.tempSlots.preferred.size).toBe(0);
      expect(wrapper.vm.tempSlots.blocked.size).toBe(0);
    });

    it('应该正确保存时段设置', async () => {
      wrapper.vm.currentTeacher = mockTeachers[0];
      wrapper.vm.tempSlots.preferred.add(0);
      wrapper.vm.tempSlots.preferred.add(1);
      wrapper.vm.tempSlots.blocked.add(8);

      await wrapper.vm.handleSlotsConfirm();

      const pref = wrapper.vm.getPreference(mockTeachers[0].id);
      expect(pref.preferredSlots).toBe('3'); // 二进制: 11
      expect(pref.blockedSlots).toBe('256'); // 二进制: 100000000

      expect(wrapper.vm.hasChanges).toBe(true);
      expect(wrapper.vm.slotsDialogVisible).toBe(false);
    });

    it('应该确保偏好和禁止时段互斥', async () => {
      wrapper.vm.slotEditMode = 'prefer';
      wrapper.vm.tempSlots.blocked.add(0);

      // 设置为偏好时段
      await wrapper.vm.handleSlotClick(0, 0);

      expect(wrapper.vm.tempSlots.preferred.has(0)).toBe(true);
      expect(wrapper.vm.tempSlots.blocked.has(0)).toBe(false);
    });
  });

  describe('保存和重置功能', () => {
    it('应该在有更改时启用保存按钮', async () => {
      wrapper.vm.hasChanges = false;
      expect(wrapper.vm.hasChanges).toBe(false);

      // 修改偏好
      await wrapper.vm.handlePreferenceChange(1);

      expect(wrapper.vm.hasChanges).toBe(true);
    });

    it('应该保存所有教师偏好', async () => {
      // Mock 确认对话框
      vi.mocked(ElMessageBox.confirm).mockResolvedValue('confirm' as any);

      // 设置一些偏好
      const pref1 = wrapper.vm.getPreference(1);
      pref1.timeBias = 1;
      pref1.weight = 5;

      const pref2 = wrapper.vm.getPreference(2);
      pref2.timeBias = 2;
      pref2.weight = 3;

      wrapper.vm.hasChanges = true;

      await wrapper.vm.handleSave();

      expect(teacherStore.batchSaveTeacherPreferences).toHaveBeenCalled();
      expect(ElMessage.success).toHaveBeenCalledWith('教师偏好保存成功');
      expect(wrapper.vm.hasChanges).toBe(false);
    });

    it('应该在取消确认时不保存', async () => {
      // Mock 取消确认
      vi.mocked(ElMessageBox.confirm).mockRejectedValue('cancel');

      wrapper.vm.hasChanges = true;

      await wrapper.vm.handleSave();

      expect(teacherStore.batchSaveTeacherPreferences).not.toHaveBeenCalled();
      expect(wrapper.vm.hasChanges).toBe(true);
    });

    it('应该重置所有未保存的更改', async () => {
      // Mock 确认对话框
      vi.mocked(ElMessageBox.confirm).mockResolvedValue('confirm' as any);

      // 修改偏好
      const pref = wrapper.vm.getPreference(1);
      pref.timeBias = 1;
      wrapper.vm.hasChanges = true;

      await wrapper.vm.handleReset();

      expect(teacherStore.loadTeachers).toHaveBeenCalled();
      expect(ElMessage.success).toHaveBeenCalledWith('已重置所有更改');
      expect(wrapper.vm.hasChanges).toBe(false);
    });
  });

  describe('组件生命周期', () => {
    it('应该在挂载时加载教师数据', () => {
      expect(teacherStore.loadTeachers).toHaveBeenCalled();
    });
  });

  describe('事件发射', () => {
    it('应该在偏好变更时发射 change 事件', async () => {
      await wrapper.vm.handlePreferenceChange(1);

      expect(wrapper.emitted('change')).toBeTruthy();
    });

    it('应该在保存时发射 save 事件', async () => {
      vi.mocked(ElMessageBox.confirm).mockResolvedValue('confirm' as any);

      wrapper.vm.hasChanges = true;
      await wrapper.vm.handleSave();

      expect(wrapper.emitted('save')).toBeTruthy();
    });
  });
});
