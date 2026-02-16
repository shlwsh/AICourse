/**
 * configStore 单元测试
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import {
  useConfigStore,
  type SubjectConfig,
  type ClassConfig,
  type VenueConfig,
  type FixedCourseConfig,
  type TeacherMutualExclusionConfig,
  type ScheduleCycleConfig,
} from '@/stores/configStore';

describe('configStore', () => {
  beforeEach(() => {
    // 为每个测试创建新的 Pinia 实例
    setActivePinia(createPinia());
  });

  describe('初始状态', () => {
    it('应该有正确的初始状态', () => {
      const store = useConfigStore();

      expect(store.cycleConfig).toEqual({
        cycleDays: 5,
        periodsPerDay: 8,
      });
      expect(store.subjectConfigs).toEqual([]);
      expect(store.classConfigs).toEqual([]);
      expect(store.venueConfigs).toEqual([]);
      expect(store.fixedCourseConfigs).toEqual([]);
      expect(store.mutualExclusionConfigs).toEqual([]);
      expect(store.isLoading).toBe(false);
      expect(store.isConfigLoaded).toBe(false);
    });

    it('计算属性应该返回正确的初始值', () => {
      const store = useConfigStore();

      expect(store.subjectCount).toBe(0);
      expect(store.classCount).toBe(0);
      expect(store.venueCount).toBe(0);
      expect(store.fixedCourseCount).toBe(0);
      expect(store.mutualExclusionCount).toBe(0);
      expect(store.hasConfig).toBe(false);
    });
  });

  describe('排课周期配置', () => {
    it('应该能够保存排课周期配置', async () => {
      const store = useConfigStore();
      const config: ScheduleCycleConfig = {
        cycleDays: 7,
        periodsPerDay: 10,
      };

      await store.saveCycleConfig(config);

      expect(store.cycleConfig).toEqual(config);
    });

    it('应该验证排课周期天数范围', async () => {
      const store = useConfigStore();
      const invalidConfig: ScheduleCycleConfig = {
        cycleDays: 0,
        periodsPerDay: 8,
      };

      await expect(store.saveCycleConfig(invalidConfig)).rejects.toThrow(
        '排课周期天数必须在 1-30 之间'
      );
    });

    it('应该验证每天节次数范围', async () => {
      const store = useConfigStore();
      const invalidConfig: ScheduleCycleConfig = {
        cycleDays: 5,
        periodsPerDay: 13,
      };

      await expect(store.saveCycleConfig(invalidConfig)).rejects.toThrow(
        '每天节次数必须在 1-12 之间'
      );
    });
  });

  describe('科目配置', () => {
    it('应该能够保存科目配置', async () => {
      const store = useConfigStore();
      const config: SubjectConfig = {
        id: 'math',
        name: '数学',
        forbiddenSlots: '0',
        allowDoubleSession: true,
        isMajorSubject: true,
      };

      await store.saveSubjectConfig(config);

      expect(store.subjectConfigs).toHaveLength(1);
      expect(store.subjectConfigs[0]).toEqual(config);
      expect(store.subjectCount).toBe(1);
    });

    it('应该能够更新已存在的科目配置', async () => {
      const store = useConfigStore();
      const config: SubjectConfig = {
        id: 'math',
        name: '数学',
        forbiddenSlots: '0',
        allowDoubleSession: true,
        isMajorSubject: true,
      };

      await store.saveSubjectConfig(config);

      const updatedConfig: SubjectConfig = {
        ...config,
        name: '数学（更新）',
      };

      await store.saveSubjectConfig(updatedConfig);

      expect(store.subjectConfigs).toHaveLength(1);
      expect(store.subjectConfigs[0].name).toBe('数学（更新）');
    });

    it('应该能够批量保存科目配置', async () => {
      const store = useConfigStore();
      const configs: SubjectConfig[] = [
        {
          id: 'math',
          name: '数学',
          forbiddenSlots: '0',
          allowDoubleSession: true,
          isMajorSubject: true,
        },
        {
          id: 'chinese',
          name: '语文',
          forbiddenSlots: '0',
          allowDoubleSession: true,
          isMajorSubject: true,
        },
      ];

      await store.batchSaveSubjectConfigs(configs);

      expect(store.subjectConfigs).toHaveLength(2);
      expect(store.subjectCount).toBe(2);
    });

    it('应该能够删除科目配置', async () => {
      const store = useConfigStore();
      const config: SubjectConfig = {
        id: 'math',
        name: '数学',
        forbiddenSlots: '0',
        allowDoubleSession: true,
        isMajorSubject: true,
      };

      await store.saveSubjectConfig(config);
      expect(store.subjectCount).toBe(1);

      await store.deleteSubjectConfig('math');
      expect(store.subjectCount).toBe(0);
    });

    it('应该能够通过ID获取科目配置', async () => {
      const store = useConfigStore();
      const config: SubjectConfig = {
        id: 'math',
        name: '数学',
        forbiddenSlots: '0',
        allowDoubleSession: true,
        isMajorSubject: true,
      };

      await store.saveSubjectConfig(config);

      const retrieved = store.getSubjectConfig('math');
      expect(retrieved).toEqual(config);
    });
  });

  describe('班级配置', () => {
    it('应该能够保存班级配置', async () => {
      const store = useConfigStore();
      const config: ClassConfig = {
        id: 1,
        name: '一年级1班',
        gradeLevel: 1,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      await store.saveClassConfig(config);

      expect(store.classConfigs).toHaveLength(1);
      expect(store.classConfigs[0]).toEqual(config);
      expect(store.classCount).toBe(1);
    });

    it('应该能够批量保存班级配置', async () => {
      const store = useConfigStore();
      const configs: ClassConfig[] = [
        {
          id: 1,
          name: '一年级1班',
          gradeLevel: 1,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        {
          id: 2,
          name: '一年级2班',
          gradeLevel: 1,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ];

      await store.batchSaveClassConfigs(configs);

      expect(store.classConfigs).toHaveLength(2);
      expect(store.classCount).toBe(2);
    });

    it('应该能够删除班级配置', async () => {
      const store = useConfigStore();
      const config: ClassConfig = {
        id: 1,
        name: '一年级1班',
        gradeLevel: 1,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      await store.saveClassConfig(config);
      expect(store.classCount).toBe(1);

      await store.deleteClassConfig(1);
      expect(store.classCount).toBe(0);
    });

    it('应该能够通过ID获取班级配置', async () => {
      const store = useConfigStore();
      const config: ClassConfig = {
        id: 1,
        name: '一年级1班',
        gradeLevel: 1,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      await store.saveClassConfig(config);

      const retrieved = store.getClassConfig(1);
      expect(retrieved).toEqual(config);
    });
  });

  describe('场地配置', () => {
    it('应该能够保存场地配置', async () => {
      const store = useConfigStore();
      const config: VenueConfig = {
        id: 'computer-room',
        name: '微机室',
        capacity: 2,
        createdAt: new Date().toISOString(),
      };

      await store.saveVenueConfig(config);

      expect(store.venueConfigs).toHaveLength(1);
      expect(store.venueConfigs[0]).toEqual(config);
      expect(store.venueCount).toBe(1);
    });

    it('应该验证场地容量', async () => {
      const store = useConfigStore();
      const invalidConfig: VenueConfig = {
        id: 'computer-room',
        name: '微机室',
        capacity: 0,
        createdAt: new Date().toISOString(),
      };

      await expect(store.saveVenueConfig(invalidConfig)).rejects.toThrow(
        '场地容量必须大于 0'
      );
    });

    it('应该能够批量保存场地配置', async () => {
      const store = useConfigStore();
      const configs: VenueConfig[] = [
        {
          id: 'computer-room',
          name: '微机室',
          capacity: 2,
          createdAt: new Date().toISOString(),
        },
        {
          id: 'playground',
          name: '操场',
          capacity: 5,
          createdAt: new Date().toISOString(),
        },
      ];

      await store.batchSaveVenueConfigs(configs);

      expect(store.venueConfigs).toHaveLength(2);
      expect(store.venueCount).toBe(2);
    });

    it('应该能够删除场地配置', async () => {
      const store = useConfigStore();
      const config: VenueConfig = {
        id: 'computer-room',
        name: '微机室',
        capacity: 2,
        createdAt: new Date().toISOString(),
      };

      await store.saveVenueConfig(config);
      expect(store.venueCount).toBe(1);

      await store.deleteVenueConfig('computer-room');
      expect(store.venueCount).toBe(0);
    });

    it('应该能够通过ID获取场地配置', async () => {
      const store = useConfigStore();
      const config: VenueConfig = {
        id: 'computer-room',
        name: '微机室',
        capacity: 2,
        createdAt: new Date().toISOString(),
      };

      await store.saveVenueConfig(config);

      const retrieved = store.getVenueConfig('computer-room');
      expect(retrieved).toEqual(config);
    });
  });

  describe('固定课程配置', () => {
    it('应该能够保存固定课程配置', async () => {
      const store = useConfigStore();
      const config: FixedCourseConfig = {
        classId: 1,
        subjectId: 'math',
        teacherId: 1,
        day: 0,
        period: 0,
        isPreArranged: false,
      };

      await store.saveFixedCourseConfig(config);

      expect(store.fixedCourseConfigs).toHaveLength(1);
      expect(store.fixedCourseCount).toBe(1);
    });

    it('应该能够批量保存固定课程配置', async () => {
      const store = useConfigStore();
      const configs: FixedCourseConfig[] = [
        {
          classId: 1,
          subjectId: 'math',
          teacherId: 1,
          day: 0,
          period: 0,
          isPreArranged: false,
        },
        {
          classId: 2,
          subjectId: 'chinese',
          teacherId: 2,
          day: 1,
          period: 1,
          isPreArranged: false,
        },
      ];

      await store.batchSaveFixedCourseConfigs(configs);

      expect(store.fixedCourseConfigs).toHaveLength(2);
      expect(store.fixedCourseCount).toBe(2);
    });

    it('应该能够删除固定课程配置', async () => {
      const store = useConfigStore();
      const config: FixedCourseConfig = {
        id: 1,
        classId: 1,
        subjectId: 'math',
        teacherId: 1,
        day: 0,
        period: 0,
        isPreArranged: false,
      };

      await store.saveFixedCourseConfig(config);
      expect(store.fixedCourseCount).toBe(1);

      await store.deleteFixedCourseConfig(1);
      expect(store.fixedCourseCount).toBe(0);
    });
  });

  describe('教师互斥关系配置', () => {
    it('应该能够保存教师互斥关系配置', async () => {
      const store = useConfigStore();
      const config: TeacherMutualExclusionConfig = {
        teacherAId: 1,
        teacherBId: 2,
        scopeType: 'AllTime',
      };

      await store.saveMutualExclusionConfig(config);

      expect(store.mutualExclusionConfigs).toHaveLength(1);
      expect(store.mutualExclusionCount).toBe(1);
    });

    it('应该验证教师不能与自己互斥', async () => {
      const store = useConfigStore();
      const invalidConfig: TeacherMutualExclusionConfig = {
        teacherAId: 1,
        teacherBId: 1,
        scopeType: 'AllTime',
      };

      await expect(store.saveMutualExclusionConfig(invalidConfig)).rejects.toThrow(
        '不能设置教师与自己互斥'
      );
    });

    it('应该能够批量保存教师互斥关系配置', async () => {
      const store = useConfigStore();
      const configs: TeacherMutualExclusionConfig[] = [
        {
          teacherAId: 1,
          teacherBId: 2,
          scopeType: 'AllTime',
        },
        {
          teacherAId: 3,
          teacherBId: 4,
          scopeType: 'SpecificSlots',
          specificSlots: '0xFF',
        },
      ];

      await store.batchSaveMutualExclusionConfigs(configs);

      expect(store.mutualExclusionConfigs).toHaveLength(2);
      expect(store.mutualExclusionCount).toBe(2);
    });

    it('应该能够删除教师互斥关系配置', async () => {
      const store = useConfigStore();
      const config: TeacherMutualExclusionConfig = {
        id: 1,
        teacherAId: 1,
        teacherBId: 2,
        scopeType: 'AllTime',
      };

      await store.saveMutualExclusionConfig(config);
      expect(store.mutualExclusionCount).toBe(1);

      await store.deleteMutualExclusionConfig(1);
      expect(store.mutualExclusionCount).toBe(0);
    });
  });

  describe('配置验证', () => {
    it('应该验证有效的配置', async () => {
      const store = useConfigStore();

      // 设置有效配置
      await store.saveCycleConfig({
        cycleDays: 5,
        periodsPerDay: 8,
      });

      const result = store.validateConfig();

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('应该检测无效的排课周期配置', () => {
      const store = useConfigStore();

      // 设置无效配置
      store.cycleConfig.cycleDays = 0;

      const result = store.validateConfig();

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('排课周期天数必须在 1-30 之间');
    });

    it('应该检测无效的场地容量', async () => {
      const store = useConfigStore();

      // 直接修改状态以测试验证逻辑
      store.venueConfigs.push({
        id: 'test',
        name: '测试场地',
        capacity: 0,
        createdAt: new Date().toISOString(),
      });

      const result = store.validateConfig();

      expect(result.isValid).toBe(false);
      expect(result.errors.some((e) => e.includes('容量必须大于 0'))).toBe(true);
    });

    it('应该检测固定课程的时间槽位超出范围', async () => {
      const store = useConfigStore();

      // 设置排课周期
      await store.saveCycleConfig({
        cycleDays: 5,
        periodsPerDay: 8,
      });

      // 添加超出范围的固定课程
      store.fixedCourseConfigs.push({
        classId: 1,
        subjectId: 'math',
        teacherId: 1,
        day: 10, // 超出范围
        period: 0,
        isPreArranged: false,
      });

      const result = store.validateConfig();

      expect(result.isValid).toBe(false);
      expect(result.errors.some((e) => e.includes('星期超出范围'))).toBe(true);
    });

    it('应该生成警告当没有配置数据时', () => {
      const store = useConfigStore();

      const result = store.validateConfig();

      expect(result.warnings).toContain('未配置任何科目');
      expect(result.warnings).toContain('未配置任何班级');
    });
  });

  describe('hasConfig 计算属性', () => {
    it('当没有配置时应该返回 false', () => {
      const store = useConfigStore();
      expect(store.hasConfig).toBe(false);
    });

    it('当有科目配置时应该返回 true', async () => {
      const store = useConfigStore();
      await store.saveSubjectConfig({
        id: 'math',
        name: '数学',
        forbiddenSlots: '0',
        allowDoubleSession: true,
        isMajorSubject: true,
      });

      expect(store.hasConfig).toBe(true);
    });

    it('当有班级配置时应该返回 true', async () => {
      const store = useConfigStore();
      await store.saveClassConfig({
        id: 1,
        name: '一年级1班',
        gradeLevel: 1,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      expect(store.hasConfig).toBe(true);
    });

    it('当有场地配置时应该返回 true', async () => {
      const store = useConfigStore();
      await store.saveVenueConfig({
        id: 'computer-room',
        name: '微机室',
        capacity: 2,
        createdAt: new Date().toISOString(),
      });

      expect(store.hasConfig).toBe(true);
    });
  });

  describe('reset 方法', () => {
    it('应该重置所有状态', async () => {
      const store = useConfigStore();

      // 设置一些数据
      await store.saveCycleConfig({
        cycleDays: 7,
        periodsPerDay: 10,
      });
      await store.saveSubjectConfig({
        id: 'math',
        name: '数学',
        forbiddenSlots: '0',
        allowDoubleSession: true,
        isMajorSubject: true,
      });
      await store.saveClassConfig({
        id: 1,
        name: '一年级1班',
        gradeLevel: 1,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      // 重置
      store.reset();

      // 验证状态已重置
      expect(store.cycleConfig).toEqual({
        cycleDays: 5,
        periodsPerDay: 8,
      });
      expect(store.subjectConfigs).toEqual([]);
      expect(store.classConfigs).toEqual([]);
      expect(store.venueConfigs).toEqual([]);
      expect(store.fixedCourseConfigs).toEqual([]);
      expect(store.mutualExclusionConfigs).toEqual([]);
      expect(store.isLoading).toBe(false);
      expect(store.isConfigLoaded).toBe(false);
    });
  });
});
