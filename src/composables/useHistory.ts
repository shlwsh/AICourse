/**
 * 操作历史记录 Composable
 * 实现撤销/重做功能
 *
 * 功能特性：
 * - 记录所有课表操作历史
 * - 支持撤销操作（Undo）
 * - 支持重做操作（Redo）
 * - 限制历史记录数量
 * - 包含完整的日志记录
 */
import { ref, computed, readonly } from 'vue';
import { logger } from '@/utils/logger';
import type { ScheduleEntry, TimeSlot } from '@/stores/scheduleStore';

// ========== 类型定义 ==========

/**
 * 操作类型枚举
 */
export enum OperationType {
  /** 移动课程 */
  MOVE = 'move',
  /** 交换课程 */
  SWAP = 'swap',
  /** 设置固定课程 */
  SET_FIXED = 'set_fixed',
  /** 解除固定课程 */
  UNSET_FIXED = 'unset_fixed',
  /** 生成课表 */
  GENERATE = 'generate',
  /** 批量操作 */
  BATCH = 'batch',
}

/**
 * 操作记录接口
 */
export interface OperationRecord {
  /** 操作ID */
  id: string;
  /** 操作类型 */
  type: OperationType;
  /** 操作描述 */
  description: string;
  /** 操作时间戳 */
  timestamp: number;
  /** 操作数据（用于撤销） */
  data: OperationData;
  /** 是否可撤销 */
  canUndo: boolean;
}

/**
 * 操作数据接口
 */
export interface OperationData {
  /** 移动操作：课程条目和原始/目标时间槽 */
  move?: {
    entry: ScheduleEntry;
    fromSlot: TimeSlot;
    toSlot: TimeSlot;
  };
  /** 交换操作：两个课程条目 */
  swap?: {
    entry1: ScheduleEntry;
    entry2: ScheduleEntry;
  };
  /** 固定课程操作：课程条目 */
  fixed?: {
    entry: ScheduleEntry;
  };
  /** 生成课表操作：旧课表快照 */
  generate?: {
    oldSchedule: any;
  };
  /** 批量操作：多个子操作 */
  batch?: {
    operations: OperationRecord[];
  };
}

/**
 * 历史记录配置
 */
export interface HistoryConfig {
  /** 最大历史记录数量 */
  maxSize?: number;
  /** 是否启用自动保存 */
  autoSave?: boolean;
}

// ========== Composable ==========

/**
 * 使用操作历史记录
 */
export function useHistory(config: HistoryConfig = {}) {
  const {
    maxSize = 50,
    autoSave = true,
  } = config;

  // ========== 状态 ==========

  /** 历史记录栈 */
  const historyStack = ref<OperationRecord[]>([]);

  /** 当前历史记录指针 */
  const currentIndex = ref(-1);

  /** 是否正在执行撤销/重做操作 */
  const isExecuting = ref(false);

  // ========== 计算属性 ==========

  /** 是否可以撤销 */
  const canUndo = computed(() => {
    return currentIndex.value >= 0 && !isExecuting.value;
  });

  /** 是否可以重做 */
  const canRedo = computed(() => {
    return currentIndex.value < historyStack.value.length - 1 && !isExecuting.value;
  });

  /** 历史记录数量 */
  const historyCount = computed(() => historyStack.value.length);

  /** 当前操作 */
  const currentOperation = computed(() => {
    if (currentIndex.value >= 0 && currentIndex.value < historyStack.value.length) {
      return historyStack.value[currentIndex.value];
    }
    return null;
  });

  /** 可撤销的操作列表 */
  const undoList = computed(() => {
    return historyStack.value.slice(0, currentIndex.value + 1).reverse();
  });

  /** 可重做的操作列表 */
  const redoList = computed(() => {
    return historyStack.value.slice(currentIndex.value + 1);
  });

  // ========== 方法 ==========

  /**
   * 生成操作ID
   */
  const generateOperationId = (): string => {
    return `op-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  };

  /**
   * 添加操作记录
   */
  const addOperation = (
    type: OperationType,
    description: string,
    data: OperationData,
    canUndo = true
  ): string => {
    const operation: OperationRecord = {
      id: generateOperationId(),
      type,
      description,
      timestamp: Date.now(),
      data,
      canUndo,
    };

    logger.info('添加操作记录', {
      type,
      description,
      canUndo,
    });

    // 如果当前不在历史记录末尾，删除后面的记录
    if (currentIndex.value < historyStack.value.length - 1) {
      historyStack.value = historyStack.value.slice(0, currentIndex.value + 1);
      logger.debug('清除重做历史', {
        removedCount: historyStack.value.length - currentIndex.value - 1,
      });
    }

    // 添加新记录
    historyStack.value.push(operation);
    currentIndex.value = historyStack.value.length - 1;

    // 限制历史记录数量
    if (historyStack.value.length > maxSize) {
      const removeCount = historyStack.value.length - maxSize;
      historyStack.value = historyStack.value.slice(removeCount);
      currentIndex.value -= removeCount;

      logger.debug('限制历史记录大小', {
        maxSize,
        removedCount: removeCount,
      });
    }

    // 自动保存
    if (autoSave) {
      saveToLocalStorage();
    }

    return operation.id;
  };

  /**
   * 撤销操作
   */
  const undo = async (): Promise<boolean> => {
    if (!canUndo.value) {
      logger.warn('无法撤销：没有可撤销的操作');
      return false;
    }

    const operation = historyStack.value[currentIndex.value];
    if (!operation) {
      logger.error('撤销失败：操作记录不存在');
      return false;
    }

    if (!operation.canUndo) {
      logger.warn('撤销失败：该操作不可撤销', { operation });
      return false;
    }

    logger.info('开始撤销操作', {
      type: operation.type,
      description: operation.description,
    });

    isExecuting.value = true;

    try {
      // 根据操作类型执行撤销
      await executeUndo(operation);

      // 移动指针
      currentIndex.value--;

      logger.info('撤销操作成功', {
        newIndex: currentIndex.value,
      });

      return true;
    } catch (error) {
      logger.error('撤销操作失败', { error, operation });
      return false;
    } finally {
      isExecuting.value = false;
    }
  };

  /**
   * 重做操作
   */
  const redo = async (): Promise<boolean> => {
    if (!canRedo.value) {
      logger.warn('无法重做：没有可重做的操作');
      return false;
    }

    const operation = historyStack.value[currentIndex.value + 1];
    if (!operation) {
      logger.error('重做失败：操作记录不存在');
      return false;
    }

    logger.info('开始重做操作', {
      type: operation.type,
      description: operation.description,
    });

    isExecuting.value = true;

    try {
      // 根据操作类型执行重做
      await executeRedo(operation);

      // 移动指针
      currentIndex.value++;

      logger.info('重做操作成功', {
        newIndex: currentIndex.value,
      });

      return true;
    } catch (error) {
      logger.error('重做操作失败', { error, operation });
      return false;
    } finally {
      isExecuting.value = false;
    }
  };

  /**
   * 执行撤销操作
   */
  const executeUndo = async (operation: OperationRecord): Promise<void> => {
    switch (operation.type) {
      case OperationType.MOVE:
        if (operation.data.move) {
          // 撤销移动：将课程移回原位置
          logger.debug('撤销移动操作', {
            from: operation.data.move.toSlot,
            to: operation.data.move.fromSlot,
          });
          // TODO: 调用 API 移动课程
          // await scheduleApi.moveEntry(
          //   operation.data.move.entry,
          //   operation.data.move.fromSlot
          // );
        }
        break;

      case OperationType.SWAP:
        if (operation.data.swap) {
          // 撤销交换：再次交换回来
          logger.debug('撤销交换操作', {
            entry1: operation.data.swap.entry1,
            entry2: operation.data.swap.entry2,
          });
          // TODO: 调用 API 交换课程
          // await scheduleApi.swapEntries(
          //   operation.data.swap.entry1,
          //   operation.data.swap.entry2
          // );
        }
        break;

      case OperationType.SET_FIXED:
        if (operation.data.fixed) {
          // 撤销设置固定：解除固定
          logger.debug('撤销设置固定操作', {
            entry: operation.data.fixed.entry,
          });
          // TODO: 调用 API 解除固定课程
          // await scheduleApi.unsetFixedCourse(operation.data.fixed.entry);
        }
        break;

      case OperationType.UNSET_FIXED:
        if (operation.data.fixed) {
          // 撤销解除固定：重新设置固定
          logger.debug('撤销解除固定操作', {
            entry: operation.data.fixed.entry,
          });
          // TODO: 调用 API 设置固定课程
          // await scheduleApi.setFixedCourse(operation.data.fixed.entry);
        }
        break;

      case OperationType.GENERATE:
        if (operation.data.generate) {
          // 撤销生成：恢复旧课表
          logger.debug('撤销生成课表操作');
          // TODO: 调用 API 恢复课表
          // await scheduleApi.restoreSchedule(operation.data.generate.oldSchedule);
        }
        break;

      case OperationType.BATCH:
        if (operation.data.batch) {
          // 撤销批量操作：逆序撤销所有子操作
          logger.debug('撤销批量操作', {
            count: operation.data.batch.operations.length,
          });
          for (let i = operation.data.batch.operations.length - 1; i >= 0; i--) {
            await executeUndo(operation.data.batch.operations[i]!);
          }
        }
        break;

      default:
        logger.warn('未知的操作类型', { type: operation.type });
    }
  };

  /**
   * 执行重做操作
   */
  const executeRedo = async (operation: OperationRecord): Promise<void> => {
    switch (operation.type) {
      case OperationType.MOVE:
        if (operation.data.move) {
          // 重做移动：将课程移到目标位置
          logger.debug('重做移动操作', {
            from: operation.data.move.fromSlot,
            to: operation.data.move.toSlot,
          });
          // TODO: 调用 API 移动课程
          // await scheduleApi.moveEntry(
          //   operation.data.move.entry,
          //   operation.data.move.toSlot
          // );
        }
        break;

      case OperationType.SWAP:
        if (operation.data.swap) {
          // 重做交换：再次交换
          logger.debug('重做交换操作', {
            entry1: operation.data.swap.entry1,
            entry2: operation.data.swap.entry2,
          });
          // TODO: 调用 API 交换课程
          // await scheduleApi.swapEntries(
          //   operation.data.swap.entry1,
          //   operation.data.swap.entry2
          // );
        }
        break;

      case OperationType.SET_FIXED:
        if (operation.data.fixed) {
          // 重做设置固定：设置固定
          logger.debug('重做设置固定操作', {
            entry: operation.data.fixed.entry,
          });
          // TODO: 调用 API 设置固定课程
          // await scheduleApi.setFixedCourse(operation.data.fixed.entry);
        }
        break;

      case OperationType.UNSET_FIXED:
        if (operation.data.fixed) {
          // 重做解除固定：解除固定
          logger.debug('重做解除固定操作', {
            entry: operation.data.fixed.entry,
          });
          // TODO: 调用 API 解除固定课程
          // await scheduleApi.unsetFixedCourse(operation.data.fixed.entry);
        }
        break;

      case OperationType.GENERATE:
        if (operation.data.generate) {
          // 重做生成：重新生成课表
          logger.debug('重做生成课表操作');
          // TODO: 调用 API 生成课表
          // await scheduleApi.generateSchedule();
        }
        break;

      case OperationType.BATCH:
        if (operation.data.batch) {
          // 重做批量操作：顺序重做所有子操作
          logger.debug('重做批量操作', {
            count: operation.data.batch.operations.length,
          });
          for (const subOp of operation.data.batch.operations) {
            await executeRedo(subOp);
          }
        }
        break;

      default:
        logger.warn('未知的操作类型', { type: operation.type });
    }
  };

  /**
   * 清空历史记录
   */
  const clear = (): void => {
    logger.info('清空历史记录', {
      count: historyStack.value.length,
    });

    historyStack.value = [];
    currentIndex.value = -1;

    if (autoSave) {
      saveToLocalStorage();
    }
  };

  /**
   * 获取指定操作
   */
  const getOperation = (id: string): OperationRecord | null => {
    return historyStack.value.find((op) => op.id === id) || null;
  };

  /**
   * 获取历史记录列表
   */
  const getHistory = (): readonly OperationRecord[] => {
    return readonly(historyStack.value);
  };

  /**
   * 保存到本地存储
   */
  const saveToLocalStorage = (): void => {
    try {
      const data = {
        historyStack: historyStack.value,
        currentIndex: currentIndex.value,
      };

      localStorage.setItem('schedule-history', JSON.stringify(data));
      logger.debug('历史记录已保存到本地存储');
    } catch (error) {
      logger.error('保存历史记录失败', { error });
    }
  };

  /**
   * 从本地存储加载
   */
  const loadFromLocalStorage = (): void => {
    try {
      const dataStr = localStorage.getItem('schedule-history');
      if (!dataStr) {
        logger.debug('本地存储中没有历史记录');
        return;
      }

      const data = JSON.parse(dataStr);
      historyStack.value = data.historyStack || [];
      currentIndex.value = data.currentIndex ?? -1;

      logger.info('历史记录已从本地存储加载', {
        count: historyStack.value.length,
        currentIndex: currentIndex.value,
      });
    } catch (error) {
      logger.error('加载历史记录失败', { error });
    }
  };

  /**
   * 导出历史记录
   */
  const exportHistory = (): string => {
    const data = {
      historyStack: historyStack.value,
      currentIndex: currentIndex.value,
      exportedAt: new Date().toISOString(),
    };

    return JSON.stringify(data, null, 2);
  };

  /**
   * 导入历史记录
   */
  const importHistory = (jsonStr: string): boolean => {
    try {
      const data = JSON.parse(jsonStr);

      if (!Array.isArray(data.historyStack)) {
        throw new Error('无效的历史记录格式');
      }

      historyStack.value = data.historyStack;
      currentIndex.value = data.currentIndex ?? -1;

      logger.info('历史记录导入成功', {
        count: historyStack.value.length,
      });

      if (autoSave) {
        saveToLocalStorage();
      }

      return true;
    } catch (error) {
      logger.error('导入历史记录失败', { error });
      return false;
    }
  };

  // ========== 初始化 ==========

  // 从本地存储加载历史记录
  if (autoSave) {
    loadFromLocalStorage();
  }

  // ========== 返回 ==========

  return {
    // 状态
    historyStack: readonly(historyStack),
    currentIndex: readonly(currentIndex),
    isExecuting: readonly(isExecuting),

    // 计算属性
    canUndo,
    canRedo,
    historyCount,
    currentOperation,
    undoList,
    redoList,

    // 方法
    addOperation,
    undo,
    redo,
    clear,
    getOperation,
    getHistory,
    saveToLocalStorage,
    loadFromLocalStorage,
    exportHistory,
    importHistory,
  };
}
