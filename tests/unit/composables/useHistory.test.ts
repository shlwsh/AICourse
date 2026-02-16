/**
 * useHistory Composable 单元测试
 * 测试操作历史记录、撤销、重做功能
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useHistory, OperationType } from '@/composables/useHistory';

describe('useHistory', () => {
  beforeEach(() => {
    // 清空 localStorage
    localStorage.clear();
    vi.clearAllMocks();
  });

  describe('基础功能', () => {
    it('应该正确初始化', () => {
      const history = useHistory();

      expect(history.historyCount.value).toBe(0);
      expect(history.canUndo.value).toBe(false);
      expect(history.canRedo.value).toBe(false);
      expect(history.currentOperation.value).toBeNull();
    });

    it('应该添加操作记录', () => {
      const history = useHistory();

      const operationId = history.addOperation(
        OperationType.MOVE,
        '移动课程',
        {
          move: {
            entry: {
              classId: 1,
              subjectId: 'math',
              teacherId: 101,
              timeSlot: { day: 0, period: 0 },
              isFixed: false,
              weekType: 'Every',
            },
            fromSlot: { day: 0, period: 0 },
            toSlot: { day: 0, period: 1 },
          },
        }
      );

      expect(operationId).toBeTruthy();
      expect(history.historyCount.value).toBe(1);
      expect(history.canUndo.value).toBe(true);
      expect(history.canRedo.value).toBe(false);
    });

    it('应该限制历史记录数量', () => {
      const history = useHistory({ maxSize: 5, autoSave: false });

      // 添加 10 条记录
      for (let i = 0; i < 10; i++) {
        history.addOperation(
          OperationType.MOVE,
          `操作 ${i}`,
          {
            move: {
              entry: {
                classId: 1,
                subjectId: 'math',
                teacherId: 101,
                timeSlot: { day: 0, period: i },
                isFixed: false,
                weekType: 'Every',
              },
              fromSlot: { day: 0, period: i },
              toSlot: { day: 0, period: i + 1 },
            },
          }
        );
      }

      // 应该只保留最后 5 条
      expect(history.historyCount.value).toBe(5);
    });
  });

  describe('撤销功能', () => {
    it('应该能够撤销操作', async () => {
      const history = useHistory({ autoSave: false });

      // 添加操作
      history.addOperation(
        OperationType.MOVE,
        '移动课程',
        {
          move: {
            entry: {
              classId: 1,
              subjectId: 'math',
              teacherId: 101,
              timeSlot: { day: 0, period: 0 },
              isFixed: false,
              weekType: 'Every',
            },
            fromSlot: { day: 0, period: 0 },
            toSlot: { day: 0, period: 1 },
          },
        }
      );

      expect(history.canUndo.value).toBe(true);

      // 撤销
      const success = await history.undo();

      expect(success).toBe(true);
      expect(history.canUndo.value).toBe(false);
      expect(history.canRedo.value).toBe(true);
    });

    it('应该能够连续撤销多个操作', async () => {
      const history = useHistory({ autoSave: false });

      // 添加 3 个操作
      for (let i = 0; i < 3; i++) {
        history.addOperation(
          OperationType.MOVE,
          `操作 ${i}`,
          {
            move: {
              entry: {
                classId: 1,
                subjectId: 'math',
                teacherId: 101,
                timeSlot: { day: 0, period: i },
                isFixed: false,
                weekType: 'Every',
              },
              fromSlot: { day: 0, period: i },
              toSlot: { day: 0, period: i + 1 },
            },
          }
        );
      }

      expect(history.historyCount.value).toBe(3);

      // 撤销 2 次
      await history.undo();
      await history.undo();

      expect(history.canUndo.value).toBe(true);
      expect(history.undoList.value.length).toBe(1);
      expect(history.redoList.value.length).toBe(2);
    });

    it('当没有可撤销操作时应该返回 false', async () => {
      const history = useHistory({ autoSave: false });

      expect(history.canUndo.value).toBe(false);

      const success = await history.undo();

      expect(success).toBe(false);
    });

    it('不可撤销的操作应该返回 false', async () => {
      const history = useHistory({ autoSave: false });

      // 添加不可撤销的操作
      history.addOperation(
        OperationType.GENERATE,
        '生成课表',
        {
          generate: {
            oldSchedule: null,
          },
        },
        false // 不可撤销
      );

      expect(history.canUndo.value).toBe(true);

      const success = await history.undo();

      expect(success).toBe(false);
    });
  });

  describe('重做功能', () => {
    it('应该能够重做操作', async () => {
      const history = useHistory({ autoSave: false });

      // 添加操作
      history.addOperation(
        OperationType.MOVE,
        '移动课程',
        {
          move: {
            entry: {
              classId: 1,
              subjectId: 'math',
              teacherId: 101,
              timeSlot: { day: 0, period: 0 },
              isFixed: false,
              weekType: 'Every',
            },
            fromSlot: { day: 0, period: 0 },
            toSlot: { day: 0, period: 1 },
          },
        }
      );

      // 撤销
      await history.undo();

      expect(history.canRedo.value).toBe(true);

      // 重做
      const success = await history.redo();

      expect(success).toBe(true);
      expect(history.canUndo.value).toBe(true);
      expect(history.canRedo.value).toBe(false);
    });

    it('应该能够连续重做多个操作', async () => {
      const history = useHistory({ autoSave: false });

      // 添加 3 个操作
      for (let i = 0; i < 3; i++) {
        history.addOperation(
          OperationType.MOVE,
          `操作 ${i}`,
          {
            move: {
              entry: {
                classId: 1,
                subjectId: 'math',
                teacherId: 101,
                timeSlot: { day: 0, period: i },
                isFixed: false,
                weekType: 'Every',
              },
              fromSlot: { day: 0, period: i },
              toSlot: { day: 0, period: i + 1 },
            },
          }
        );
      }

      // 撤销 3 次
      await history.undo();
      await history.undo();
      await history.undo();

      expect(history.canRedo.value).toBe(true);
      expect(history.redoList.value.length).toBe(3);

      // 重做 2 次
      await history.redo();
      await history.redo();

      expect(history.undoList.value.length).toBe(2);
      expect(history.redoList.value.length).toBe(1);
    });

    it('当没有可重做操作时应该返回 false', async () => {
      const history = useHistory({ autoSave: false });

      expect(history.canRedo.value).toBe(false);

      const success = await history.redo();

      expect(success).toBe(false);
    });

    it('添加新操作后应该清除重做历史', () => {
      const history = useHistory({ autoSave: false });

      // 添加 3 个操作
      for (let i = 0; i < 3; i++) {
        history.addOperation(
          OperationType.MOVE,
          `操作 ${i}`,
          {
            move: {
              entry: {
                classId: 1,
                subjectId: 'math',
                teacherId: 101,
                timeSlot: { day: 0, period: i },
                isFixed: false,
                weekType: 'Every',
              },
              fromSlot: { day: 0, period: i },
              toSlot: { day: 0, period: i + 1 },
            },
          }
        );
      }

      // 撤销 2 次
      history.undo();
      history.undo();

      expect(history.redoList.value.length).toBe(2);

      // 添加新操作
      history.addOperation(
        OperationType.MOVE,
        '新操作',
        {
          move: {
            entry: {
              classId: 1,
              subjectId: 'math',
              teacherId: 101,
              timeSlot: { day: 0, period: 5 },
              isFixed: false,
              weekType: 'Every',
            },
            fromSlot: { day: 0, period: 5 },
            toSlot: { day: 0, period: 6 },
          },
        }
      );

      // 重做历史应该被清除
      expect(history.redoList.value.length).toBe(0);
      expect(history.historyCount.value).toBe(2);
    });
  });

  describe('历史记录管理', () => {
    it('应该能够清空历史记录', () => {
      const history = useHistory({ autoSave: false });

      // 添加操作
      history.addOperation(
        OperationType.MOVE,
        '移动课程',
        {
          move: {
            entry: {
              classId: 1,
              subjectId: 'math',
              teacherId: 101,
              timeSlot: { day: 0, period: 0 },
              isFixed: false,
              weekType: 'Every',
            },
            fromSlot: { day: 0, period: 0 },
            toSlot: { day: 0, period: 1 },
          },
        }
      );

      expect(history.historyCount.value).toBe(1);

      // 清空
      history.clear();

      expect(history.historyCount.value).toBe(0);
      expect(history.canUndo.value).toBe(false);
      expect(history.canRedo.value).toBe(false);
    });

    it('应该能够获取指定操作', () => {
      const history = useHistory({ autoSave: false });

      const operationId = history.addOperation(
        OperationType.MOVE,
        '移动课程',
        {
          move: {
            entry: {
              classId: 1,
              subjectId: 'math',
              teacherId: 101,
              timeSlot: { day: 0, period: 0 },
              isFixed: false,
              weekType: 'Every',
            },
            fromSlot: { day: 0, period: 0 },
            toSlot: { day: 0, period: 1 },
          },
        }
      );

      const operation = history.getOperation(operationId);

      expect(operation).toBeTruthy();
      expect(operation?.id).toBe(operationId);
      expect(operation?.type).toBe(OperationType.MOVE);
      expect(operation?.description).toBe('移动课程');
    });

    it('应该能够获取历史记录列表', () => {
      const history = useHistory({ autoSave: false });

      // 添加 3 个操作
      for (let i = 0; i < 3; i++) {
        history.addOperation(
          OperationType.MOVE,
          `操作 ${i}`,
          {
            move: {
              entry: {
                classId: 1,
                subjectId: 'math',
                teacherId: 101,
                timeSlot: { day: 0, period: i },
                isFixed: false,
                weekType: 'Every',
              },
              fromSlot: { day: 0, period: i },
              toSlot: { day: 0, period: i + 1 },
            },
          }
        );
      }

      const historyList = history.getHistory();

      expect(historyList.length).toBe(3);
      expect(historyList[0]?.description).toBe('操作 0');
      expect(historyList[2]?.description).toBe('操作 2');
    });
  });

  describe('导入导出', () => {
    it('应该能够导出历史记录', () => {
      const history = useHistory({ autoSave: false });

      // 添加操作
      history.addOperation(
        OperationType.MOVE,
        '移动课程',
        {
          move: {
            entry: {
              classId: 1,
              subjectId: 'math',
              teacherId: 101,
              timeSlot: { day: 0, period: 0 },
              isFixed: false,
              weekType: 'Every',
            },
            fromSlot: { day: 0, period: 0 },
            toSlot: { day: 0, period: 1 },
          },
        }
      );

      const exported = history.exportHistory();

      expect(exported).toBeTruthy();
      expect(typeof exported).toBe('string');

      const data = JSON.parse(exported);
      expect(data.historyStack).toBeTruthy();
      expect(data.currentIndex).toBe(0);
      expect(data.exportedAt).toBeTruthy();
    });

    it('应该能够导入历史记录', () => {
      const history1 = useHistory({ autoSave: false });

      // 添加操作
      history1.addOperation(
        OperationType.MOVE,
        '移动课程',
        {
          move: {
            entry: {
              classId: 1,
              subjectId: 'math',
              teacherId: 101,
              timeSlot: { day: 0, period: 0 },
              isFixed: false,
              weekType: 'Every',
            },
            fromSlot: { day: 0, period: 0 },
            toSlot: { day: 0, period: 1 },
          },
        }
      );

      // 导出
      const exported = history1.exportHistory();

      // 创建新实例并导入
      const history2 = useHistory({ autoSave: false });
      const success = history2.importHistory(exported);

      expect(success).toBe(true);
      expect(history2.historyCount.value).toBe(1);
      expect(history2.currentOperation.value?.description).toBe('移动课程');
    });

    it('导入无效数据应该返回 false', () => {
      const history = useHistory({ autoSave: false });

      const success = history.importHistory('invalid json');

      expect(success).toBe(false);
      expect(history.historyCount.value).toBe(0);
    });
  });

  describe('本地存储', () => {
    it('应该能够保存到本地存储', () => {
      const history = useHistory({ autoSave: false });

      // 添加操作
      history.addOperation(
        OperationType.MOVE,
        '移动课程',
        {
          move: {
            entry: {
              classId: 1,
              subjectId: 'math',
              teacherId: 101,
              timeSlot: { day: 0, period: 0 },
              isFixed: false,
              weekType: 'Every',
            },
            fromSlot: { day: 0, period: 0 },
            toSlot: { day: 0, period: 1 },
          },
        }
      );

      // 保存
      history.saveToLocalStorage();

      // 检查 localStorage
      const saved = localStorage.getItem('schedule-history');
      expect(saved).toBeTruthy();

      const data = JSON.parse(saved!);
      expect(data.historyStack.length).toBe(1);
      expect(data.currentIndex).toBe(0);
    });

    it('应该能够从本地存储加载', () => {
      // 先保存数据
      const history1 = useHistory({ autoSave: false });
      history1.addOperation(
        OperationType.MOVE,
        '移动课程',
        {
          move: {
            entry: {
              classId: 1,
              subjectId: 'math',
              teacherId: 101,
              timeSlot: { day: 0, period: 0 },
              isFixed: false,
              weekType: 'Every',
            },
            fromSlot: { day: 0, period: 0 },
            toSlot: { day: 0, period: 1 },
          },
        }
      );
      history1.saveToLocalStorage();

      // 创建新实例并加载
      const history2 = useHistory({ autoSave: false });
      history2.loadFromLocalStorage();

      expect(history2.historyCount.value).toBe(1);
      expect(history2.currentOperation.value?.description).toBe('移动课程');
    });

    it('启用自动保存时应该自动保存', () => {
      const history = useHistory({ autoSave: true });

      // 添加操作
      history.addOperation(
        OperationType.MOVE,
        '移动课程',
        {
          move: {
            entry: {
              classId: 1,
              subjectId: 'math',
              teacherId: 101,
              timeSlot: { day: 0, period: 0 },
              isFixed: false,
              weekType: 'Every',
            },
            fromSlot: { day: 0, period: 0 },
            toSlot: { day: 0, period: 1 },
          },
        }
      );

      // 应该自动保存到 localStorage
      const saved = localStorage.getItem('schedule-history');
      expect(saved).toBeTruthy();
    });
  });

  describe('操作类型', () => {
    it('应该支持移动操作', () => {
      const history = useHistory({ autoSave: false });

      history.addOperation(
        OperationType.MOVE,
        '移动课程',
        {
          move: {
            entry: {
              classId: 1,
              subjectId: 'math',
              teacherId: 101,
              timeSlot: { day: 0, period: 0 },
              isFixed: false,
              weekType: 'Every',
            },
            fromSlot: { day: 0, period: 0 },
            toSlot: { day: 0, period: 1 },
          },
        }
      );

      expect(history.currentOperation.value?.type).toBe(OperationType.MOVE);
    });

    it('应该支持交换操作', () => {
      const history = useHistory({ autoSave: false });

      history.addOperation(
        OperationType.SWAP,
        '交换课程',
        {
          swap: {
            entry1: {
              classId: 1,
              subjectId: 'math',
              teacherId: 101,
              timeSlot: { day: 0, period: 0 },
              isFixed: false,
              weekType: 'Every',
            },
            entry2: {
              classId: 1,
              subjectId: 'english',
              teacherId: 102,
              timeSlot: { day: 0, period: 1 },
              isFixed: false,
              weekType: 'Every',
            },
          },
        }
      );

      expect(history.currentOperation.value?.type).toBe(OperationType.SWAP);
    });

    it('应该支持固定课程操作', () => {
      const history = useHistory({ autoSave: false });

      history.addOperation(
        OperationType.SET_FIXED,
        '设置固定课程',
        {
          fixed: {
            entry: {
              classId: 1,
              subjectId: 'math',
              teacherId: 101,
              timeSlot: { day: 0, period: 0 },
              isFixed: true,
              weekType: 'Every',
            },
          },
        }
      );

      expect(history.currentOperation.value?.type).toBe(OperationType.SET_FIXED);
    });

    it('应该支持批量操作', () => {
      const history = useHistory({ autoSave: false });

      history.addOperation(
        OperationType.BATCH,
        '批量操作',
        {
          batch: {
            operations: [],
          },
        }
      );

      expect(history.currentOperation.value?.type).toBe(OperationType.BATCH);
    });
  });
});
