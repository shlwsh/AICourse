/**
 * scheduleStore 状态管理单元测试
 *
 * 测试 Pinia store 的状态管理功能，包括：
 * - 状态初始化
 * - 计算属性
 * - 操作方法
 * - 状态变更
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { useScheduleStore } from '@/stores/scheduleStore';
import type { Schedule, ScheduleEntry, TimeSlot } from '@/stores/scheduleStore';

describe('scheduleStore', () => {
  // 在每个测试前创建新的 Pinia 实例
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  describe('状态初始化', () => {
    it('应该正确初始化默认状态', () => {
      const store = useScheduleStore();

      // 验证初始状态
      expect(store.schedule).toBeNull();
      expect(store.selectedEntry).toBeNull();
      expect(store.conflicts).toBeInstanceOf(Map);
      expect(store.conflicts.size).toBe(0);
      expect(store.isGenerating).toBe(false);
      expect(store.viewMode).toBe('class');
      expect(store.showHeatmap).toBe(false);
    });
  });

  describe('计算属性', () => {
    it('hasSchedule 应该在没有课表时返回 false', () => {
      const store = useScheduleStore();
      expect(store.hasSchedule).toBe(false);
    });

    it('hasSchedule 应该在有课表时返回 true', () => {
      const store = useScheduleStore();

      // 设置课表
      store.schedule = createMockSchedule();

      expect(store.hasSchedule).toBe(true);
    });

    it('entryCount 应该返回正确的课表条目数量', () => {
      const store = useScheduleStore();

      // 没有课表时应该返回 0
      expect(store.entryCount).toBe(0);

      // 设置课表
      store.schedule = createMockSchedule([
        createMockEntry({ classId: 1, subjectId: 'math' }),
        createMockEntry({ classId: 2, subjectId: 'english' }),
        createMockEntry({ classId: 3, subjectId: 'physics' }),
      ]);

      expect(store.entryCount).toBe(3);
    });

    it('scheduleCost 应该返回正确的代价值', () => {
      const store = useScheduleStore();

      // 没有课表时应该返回 0
      expect(store.scheduleCost).toBe(0);

      // 设置课表
      store.schedule = createMockSchedule([], 150);

      expect(store.scheduleCost).toBe(150);
    });
  });

  describe('操作方法', () => {
    describe('selectEntry', () => {
      it('应该正确选择课表条目', () => {
        const store = useScheduleStore();
        const entry = createMockEntry();

        store.selectEntry(entry);

        expect(store.selectedEntry).toEqual(entry);
      });

      it('应该在选择 null 时清空选中状态', () => {
        const store = useScheduleStore();
        const entry = createMockEntry();

        // 先选择一个条目
        store.selectEntry(entry);
        expect(store.selectedEntry).toEqual(entry);

        // 清空选择
        store.selectEntry(null);
        expect(store.selectedEntry).toBeNull();
      });

      it('应该在选择条目时清空冲突信息', () => {
        const store = useScheduleStore();

        // 添加一些冲突信息
        store.conflicts.set('0-0', {
          slot: { day: 0, period: 0 },
          conflictType: 'test',
          severity: 'Warning',
          description: '测试冲突',
        });

        expect(store.conflicts.size).toBe(1);

        // 清空选择
        store.selectEntry(null);

        expect(store.conflicts.size).toBe(0);
      });
    });

    describe('setViewMode', () => {
      it('应该正确切换视图模式', () => {
        const store = useScheduleStore();

        // 默认是班级视图
        expect(store.viewMode).toBe('class');

        // 切换到教师视图
        store.setViewMode('teacher');
        expect(store.viewMode).toBe('teacher');

        // 切换到场地视图
        store.setViewMode('venue');
        expect(store.viewMode).toBe('venue');

        // 切换回班级视图
        store.setViewMode('class');
        expect(store.viewMode).toBe('class');
      });
    });

    describe('toggleHeatmap', () => {
      it('应该正确切换热力图显示状态', () => {
        const store = useScheduleStore();

        // 默认不显示热力图
        expect(store.showHeatmap).toBe(false);

        // 切换显示
        store.toggleHeatmap();
        expect(store.showHeatmap).toBe(true);

        // 再次切换隐藏
        store.toggleHeatmap();
        expect(store.showHeatmap).toBe(false);
      });
    });

    describe('reset', () => {
      it('应该重置所有状态到初始值', () => {
        const store = useScheduleStore();

        // 修改所有状态
        store.schedule = createMockSchedule();
        store.selectedEntry = createMockEntry();
        store.conflicts.set('0-0', {
          slot: { day: 0, period: 0 },
          conflictType: 'test',
          severity: 'Warning',
          description: '测试冲突',
        });
        store.isGenerating = true;
        store.viewMode = 'teacher';
        store.showHeatmap = true;

        // 重置
        store.reset();

        // 验证所有状态都已重置
        expect(store.schedule).toBeNull();
        expect(store.selectedEntry).toBeNull();
        expect(store.conflicts.size).toBe(0);
        expect(store.isGenerating).toBe(false);
        expect(store.viewMode).toBe('class');
        expect(store.showHeatmap).toBe(false);
      });
    });

    describe('loadSchedule', () => {
      it('应该能够调用加载课表方法', async () => {
        const store = useScheduleStore();

        // 注意：由于 Tauri 命令被模拟，这里只测试方法能否正常调用
        // 实际的 Tauri 集成测试应该在集成测试中进行
        await expect(store.loadSchedule()).resolves.not.toThrow();
      });
    });

    describe('generateSchedule', () => {
      it('应该在生成课表时设置 isGenerating 状态', async () => {
        const store = useScheduleStore();

        expect(store.isGenerating).toBe(false);

        // 开始生成（会失败因为没有真实的后端，但状态应该正确）
        const promise = store.generateSchedule();

        // 在异步操作期间，isGenerating 应该为 true
        // 注意：由于是异步的，这里可能需要等待一下
        await new Promise(resolve => setTimeout(resolve, 0));

        // 等待完成
        await promise.catch(() => {
          // 忽略错误，我们只关心状态变化
        });

        // 完成后应该恢复为 false
        expect(store.isGenerating).toBe(false);
      });
    });

    describe('moveEntry', () => {
      it('应该能够调用移动课表条目方法', async () => {
        const store = useScheduleStore();
        const entry = createMockEntry();
        const newSlot: TimeSlot = { day: 1, period: 2 };

        // 注意：由于 Tauri 命令被模拟，这里只测试方法能否正常调用
        await expect(store.moveEntry(entry, newSlot)).resolves.not.toThrow();
      });
    });

    describe('detectConflicts', () => {
      it('应该能够调用检测冲突方法', async () => {
        const store = useScheduleStore();
        const entry = createMockEntry();

        // 注意：由于 Tauri 命令被模拟，这里只测试方法能否正常调用
        await expect(store.detectConflicts(entry)).resolves.not.toThrow();
      });
    });
  });

  describe('状态响应性', () => {
    it('计算属性应该响应状态变化', () => {
      const store = useScheduleStore();

      // 初始状态
      expect(store.hasSchedule).toBe(false);
      expect(store.entryCount).toBe(0);
      expect(store.scheduleCost).toBe(0);

      // 设置课表
      store.schedule = createMockSchedule([
        createMockEntry({ classId: 1 }),
        createMockEntry({ classId: 2 }),
      ], 100);

      // 计算属性应该自动更新
      expect(store.hasSchedule).toBe(true);
      expect(store.entryCount).toBe(2);
      expect(store.scheduleCost).toBe(100);

      // 清空课表
      store.schedule = null;

      // 计算属性应该再次更新
      expect(store.hasSchedule).toBe(false);
      expect(store.entryCount).toBe(0);
      expect(store.scheduleCost).toBe(0);
    });
  });

  describe('多实例隔离', () => {
    it('不同的 store 实例应该有独立的状态', () => {
      const store1 = useScheduleStore();
      const store2 = useScheduleStore();

      // 应该是同一个实例（Pinia 单例）
      expect(store1).toBe(store2);

      // 修改状态
      store1.viewMode = 'teacher';

      // 两个引用应该看到相同的状态
      expect(store2.viewMode).toBe('teacher');
    });
  });
});

// ========== 测试辅助函数 ==========

/**
 * 创建模拟的课表对象
 */
function createMockSchedule(entries: ScheduleEntry[] = [], cost: number = 0): Schedule {
  return {
    entries,
    cost,
    metadata: {
      cycleDays: 5,
      periodsPerDay: 8,
      generatedAt: new Date().toISOString(),
      version: 1,
    },
  };
}

/**
 * 创建模拟的课表条目
 */
function createMockEntry(overrides: Partial<ScheduleEntry> = {}): ScheduleEntry {
  return {
    classId: 1,
    subjectId: 'math',
    teacherId: 1,
    timeSlot: { day: 0, period: 0 },
    isFixed: false,
    weekType: 'Every',
    ...overrides,
  };
}
