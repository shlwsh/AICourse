/**
 * teacherStore 单元测试
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import {
  useTeacherStore,
  type Teacher,
  type TeacherPreference,
  type TeacherStatus,
  type TeacherWorkload,
} from '@/stores/teacherStore';

describe('teacherStore', () => {
  beforeEach(() => {
    // 为每个测试创建新的 Pinia 实例
    setActivePinia(createPinia());
  });

  describe('初始状态', () => {
    it('应该有正确的初始状态', () => {
      const store = useTeacherStore();

      expect(store.teachers).toEqual([]);
      expect(store.preferences.size).toBe(0);
      expect(store.teacherStatuses.size).toBe(0);
      expect(store.workloadStatistics).toEqual([]);
      expect(store.isLoading).toBe(false);
      expect(store.selectedTeacher).toBeNull();
    });

    it('计算属性应该返回正确的初始值', () => {
      const store = useTeacherStore();

      expect(store.teacherCount).toBe(0);
      expect(store.hasTeachers).toBe(false);
      expect(store.freeTeachers).toEqual([]);
      expect(store.busyTeachers).toEqual([]);
    });
  });

  describe('教师列表管理', () => {
    it('loadTeachers 应该更新教师列表', async () => {
      const store = useTeacherStore();

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
      ];

      // 手动设置教师数据（模拟 Tauri 调用）
      store.teachers = mockTeachers;

      expect(store.teacherCount).toBe(2);
      expect(store.hasTeachers).toBe(true);
      expect(store.teachers[0].name).toBe('张老师');
    });

    it('findTeacherById 应该返回正确的教师', () => {
      const store = useTeacherStore();

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
      ];

      store.teachers = mockTeachers;

      const teacher = store.findTeacherById(1);
      expect(teacher).toBeDefined();
      expect(teacher?.name).toBe('张老师');

      const notFound = store.findTeacherById(999);
      expect(notFound).toBeUndefined();
    });

    it('filterTeachersByGroup 应该返回指定教研组的教师', () => {
      const store = useTeacherStore();

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

      store.teachers = mockTeachers;

      const group1Teachers = store.filterTeachersByGroup(1);
      expect(group1Teachers.length).toBe(2);
      expect(group1Teachers[0].name).toBe('张老师');
      expect(group1Teachers[1].name).toBe('王老师');
    });
  });

  describe('教师偏好管理', () => {
    it('saveTeacherPreference 应该保存教师偏好', async () => {
      const store = useTeacherStore();

      const mockPreference: TeacherPreference = {
        teacherId: 1,
        preferredSlots: '0xFFFFFFFF',
        timeBias: 1,
        weight: 2,
        blockedSlots: '0x0',
      };

      // 手动设置偏好（模拟 Tauri 调用）
      store.preferences.set(mockPreference.teacherId, mockPreference);

      const savedPref = store.getTeacherPreference(1);
      expect(savedPref).toBeDefined();
      expect(savedPref?.timeBias).toBe(1);
      expect(savedPref?.weight).toBe(2);
    });

    it('batchSaveTeacherPreferences 应该批量保存教师偏好', async () => {
      const store = useTeacherStore();

      const mockPreferences: TeacherPreference[] = [
        {
          teacherId: 1,
          preferredSlots: '0xFFFFFFFF',
          timeBias: 1,
          weight: 2,
          blockedSlots: '0x0',
        },
        {
          teacherId: 2,
          preferredSlots: '0xFFFFFFFF',
          timeBias: 2,
          weight: 1,
          blockedSlots: '0x0',
        },
      ];

      // 手动设置偏好（模拟 Tauri 调用）
      mockPreferences.forEach((pref) => {
        store.preferences.set(pref.teacherId, pref);
      });

      expect(store.preferences.size).toBe(2);
      expect(store.getTeacherPreference(1)?.timeBias).toBe(1);
      expect(store.getTeacherPreference(2)?.timeBias).toBe(2);
    });

    it('getTeacherPreference 应该返回正确的偏好', () => {
      const store = useTeacherStore();

      const mockPreference: TeacherPreference = {
        teacherId: 1,
        preferredSlots: '0xFFFFFFFF',
        timeBias: 1,
        weight: 2,
        blockedSlots: '0x0',
      };

      store.preferences.set(1, mockPreference);

      const pref = store.getTeacherPreference(1);
      expect(pref).toBeDefined();
      expect(pref?.teacherId).toBe(1);

      const notFound = store.getTeacherPreference(999);
      expect(notFound).toBeUndefined();
    });
  });

  describe('教师状态查询', () => {
    it('queryTeacherStatus 应该更新教师状态', async () => {
      const store = useTeacherStore();

      const mockStatuses: TeacherStatus[] = [
        {
          teacherId: 1,
          teacherName: '张老师',
          isBusy: true,
          currentClass: 101,
          currentSubject: '数学',
        },
        {
          teacherId: 2,
          teacherName: '李老师',
          isBusy: false,
        },
      ];

      // 手动设置状态（模拟 Tauri 调用）
      mockStatuses.forEach((status) => {
        store.teacherStatuses.set(status.teacherId, status);
      });

      expect(store.teacherStatuses.size).toBe(2);
      expect(store.busyTeachers.length).toBe(1);
      expect(store.freeTeachers.length).toBe(1);
    });

    it('busyTeachers 应该返回忙碌的教师', () => {
      const store = useTeacherStore();

      const mockStatuses: TeacherStatus[] = [
        {
          teacherId: 1,
          teacherName: '张老师',
          isBusy: true,
          currentClass: 101,
          currentSubject: '数学',
        },
        {
          teacherId: 2,
          teacherName: '李老师',
          isBusy: false,
        },
        {
          teacherId: 3,
          teacherName: '王老师',
          isBusy: true,
          currentClass: 102,
          currentSubject: '语文',
        },
      ];

      mockStatuses.forEach((status) => {
        store.teacherStatuses.set(status.teacherId, status);
      });

      const busy = store.busyTeachers;
      expect(busy.length).toBe(2);
      expect(busy[0].teacherName).toBe('张老师');
      expect(busy[1].teacherName).toBe('王老师');
    });

    it('freeTeachers 应该返回空闲的教师', () => {
      const store = useTeacherStore();

      const mockStatuses: TeacherStatus[] = [
        {
          teacherId: 1,
          teacherName: '张老师',
          isBusy: true,
          currentClass: 101,
          currentSubject: '数学',
        },
        {
          teacherId: 2,
          teacherName: '李老师',
          isBusy: false,
        },
        {
          teacherId: 3,
          teacherName: '王老师',
          isBusy: false,
        },
      ];

      mockStatuses.forEach((status) => {
        store.teacherStatuses.set(status.teacherId, status);
      });

      const free = store.freeTeachers;
      expect(free.length).toBe(2);
      expect(free[0].teacherName).toBe('李老师');
      expect(free[1].teacherName).toBe('王老师');
    });
  });

  describe('工作量统计', () => {
    it('calculateWorkloadStatistics 应该计算工作量统计', async () => {
      const store = useTeacherStore();

      const mockWorkload: TeacherWorkload[] = [
        {
          teacherId: 1,
          teacherName: '张老师',
          totalSessions: 20,
          classCount: 3,
          subjects: ['数学'],
          earlySessions: 5,
          lateSessions: 3,
        },
        {
          teacherId: 2,
          teacherName: '李老师',
          totalSessions: 18,
          classCount: 2,
          subjects: ['语文', '历史'],
          earlySessions: 4,
          lateSessions: 2,
        },
      ];

      // 手动设置工作量统计（模拟 Tauri 调用）
      store.workloadStatistics = mockWorkload;

      expect(store.workloadStatistics.length).toBe(2);
      expect(store.workloadStatistics[0].totalSessions).toBe(20);
      expect(store.workloadStatistics[1].subjects.length).toBe(2);
    });
  });

  describe('选择教师', () => {
    it('selectTeacher 应该设置选中的教师', () => {
      const store = useTeacherStore();

      const mockTeacher: Teacher = {
        id: 1,
        name: '张老师',
        teachingGroupId: 1,
        createdAt: '2024-01-01',
        updatedAt: '2024-01-01',
      };

      store.selectTeacher(mockTeacher);
      expect(store.selectedTeacher).toEqual(mockTeacher);
      expect(store.selectedTeacher?.id).toBe(1);

      store.selectTeacher(null);
      expect(store.selectedTeacher).toBeNull();
    });
  });

  describe('重置状态', () => {
    it('reset 应该清空所有状态', () => {
      const store = useTeacherStore();

      // 设置一些数据
      store.teachers = [
        {
          id: 1,
          name: '张老师',
          teachingGroupId: 1,
          createdAt: '2024-01-01',
          updatedAt: '2024-01-01',
        },
      ];
      store.preferences.set(1, {
        teacherId: 1,
        preferredSlots: '0xFFFFFFFF',
        timeBias: 1,
        weight: 2,
        blockedSlots: '0x0',
      });
      store.isLoading = true;

      // 重置
      store.reset();

      // 验证所有状态都被清空
      expect(store.teachers).toEqual([]);
      expect(store.preferences.size).toBe(0);
      expect(store.teacherStatuses.size).toBe(0);
      expect(store.workloadStatistics).toEqual([]);
      expect(store.isLoading).toBe(false);
      expect(store.selectedTeacher).toBeNull();
    });
  });
});
