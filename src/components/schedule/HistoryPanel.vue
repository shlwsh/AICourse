<!--
  历史记录面板组件
  显示操作历史并提供撤销/重做功能

  功能特性：
  - 显示操作历史列表
  - 撤销/重做按钮
  - 快捷键支持（Ctrl+Z / Ctrl+Y）
  - 清空历史记录
  - 导出/导入历史记录
  - 包含完整的日志记录
-->
<template>
  <div class="history-panel">
    <!-- 工具栏 -->
    <div class="history-toolbar">
      <div class="toolbar-left">
        <el-button
          :icon="RefreshLeft"
          :disabled="!canUndo"
          size="small"
          @click="handleUndo"
        >
          撤销 (Ctrl+Z)
        </el-button>

        <el-button
          :icon="RefreshRight"
          :disabled="!canRedo"
          size="small"
          @click="handleRedo"
        >
          重做 (Ctrl+Y)
        </el-button>
      </div>

      <div class="toolbar-right">
        <el-dropdown @command="handleCommand">
          <el-button :icon="More" size="small" />
          <template #dropdown>
            <el-dropdown-menu>
              <el-dropdown-item command="clear" :icon="Delete">
                清空历史
              </el-dropdown-item>
              <el-dropdown-item command="export" :icon="Download">
                导出历史
              </el-dropdown-item>
              <el-dropdown-item command="import" :icon="Upload">
                导入历史
              </el-dropdown-item>
            </el-dropdown-menu>
          </template>
        </el-dropdown>
      </div>
    </div>

    <!-- 历史记录列表 -->
    <div class="history-list">
      <el-scrollbar>
        <div v-if="historyCount === 0" class="empty-state">
          <el-empty description="暂无操作历史" :image-size="80" />
        </div>

        <div v-else class="history-items">
          <!-- 可撤销的操作 -->
          <div v-if="undoList.length > 0" class="history-section">
            <div class="section-title">可撤销操作</div>
            <div
              v-for="(operation, index) in undoList"
              :key="operation.id"
              class="history-item"
              :class="{
                'is-current': index === 0,
                'can-undo': operation.canUndo,
              }"
              @click="handleOperationClick(operation)"
            >
              <div class="item-icon">
                <el-icon>
                  <component :is="getOperationIcon(operation.type)" />
                </el-icon>
              </div>

              <div class="item-content">
                <div class="item-description">
                  {{ operation.description }}
                </div>
                <div class="item-time">
                  {{ formatTime(operation.timestamp) }}
                </div>
              </div>

              <div class="item-actions">
                <el-tag v-if="index === 0" type="success" size="small">
                  当前
                </el-tag>
                <el-tag v-if="!operation.canUndo" type="info" size="small">
                  不可撤销
                </el-tag>
              </div>
            </div>
          </div>

          <!-- 可重做的操作 -->
          <div v-if="redoList.length > 0" class="history-section">
            <div class="section-title">可重做操作</div>
            <div
              v-for="operation in redoList"
              :key="operation.id"
              class="history-item can-redo"
              @click="handleOperationClick(operation)"
            >
              <div class="item-icon">
                <el-icon>
                  <component :is="getOperationIcon(operation.type)" />
                </el-icon>
              </div>

              <div class="item-content">
                <div class="item-description">
                  {{ operation.description }}
                </div>
                <div class="item-time">
                  {{ formatTime(operation.timestamp) }}
                </div>
              </div>
            </div>
          </div>
        </div>
      </el-scrollbar>
    </div>

    <!-- 导入对话框 -->
    <el-dialog
      v-model="showImportDialog"
      title="导入历史记录"
      width="600px"
    >
      <el-input
        v-model="importData"
        type="textarea"
        :rows="10"
        placeholder="请粘贴历史记录 JSON 数据"
      />

      <template #footer>
        <el-button @click="showImportDialog = false">取消</el-button>
        <el-button type="primary" @click="handleImport">导入</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import {
  RefreshLeft,
  RefreshRight,
  More,
  Delete,
  Download,
  Upload,
  Position,
  Sort,
  Lock,
  Unlock,
  Refresh,
  FolderOpened,
} from '@element-plus/icons-vue';
import { useHistory, OperationType } from '@/composables/useHistory';
import { logger } from '@/utils/logger';

// ========== 组件日志 ==========
const componentLogger = logger;

// ========== Composables ==========
const {
  canUndo,
  canRedo,
  historyCount,
  undoList,
  redoList,
  undo,
  redo,
  clear,
  exportHistory,
  importHistory,
} = useHistory();

// ========== 状态 ==========
const showImportDialog = ref(false);
const importData = ref('');

// ========== 方法 ==========

/**
 * 获取操作类型图标
 */
const getOperationIcon = (type: OperationType): any => {
  const iconMap: Record<OperationType, any> = {
    [OperationType.MOVE]: Position,
    [OperationType.SWAP]: Sort,
    [OperationType.SET_FIXED]: Lock,
    [OperationType.UNSET_FIXED]: Unlock,
    [OperationType.GENERATE]: Refresh,
    [OperationType.BATCH]: FolderOpened,
  };

  return iconMap[type] || Position;
};

/**
 * 格式化时间
 */
const formatTime = (timestamp: number): string => {
  const date = new Date(timestamp);
  const now = new Date();
  const diff = now.getTime() - date.getTime();

  // 小于1分钟
  if (diff < 60 * 1000) {
    return '刚刚';
  }

  // 小于1小时
  if (diff < 60 * 60 * 1000) {
    const minutes = Math.floor(diff / (60 * 1000));
    return `${minutes}分钟前`;
  }

  // 小于1天
  if (diff < 24 * 60 * 60 * 1000) {
    const hours = Math.floor(diff / (60 * 60 * 1000));
    return `${hours}小时前`;
  }

  // 显示完整时间
  return date.toLocaleString('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
};

/**
 * 处理撤销
 */
const handleUndo = async (): Promise<void> => {
  componentLogger.info('用户点击撤销按钮');

  try {
    const success = await undo();

    if (success) {
      ElMessage.success('撤销成功');
    } else {
      ElMessage.warning('撤销失败');
    }
  } catch (error) {
    componentLogger.error('撤销操作失败', { error });
    ElMessage.error('撤销操作失败');
  }
};

/**
 * 处理重做
 */
const handleRedo = async (): Promise<void> => {
  componentLogger.info('用户点击重做按钮');

  try {
    const success = await redo();

    if (success) {
      ElMessage.success('重做成功');
    } else {
      ElMessage.warning('重做失败');
    }
  } catch (error) {
    componentLogger.error('重做操作失败', { error });
    ElMessage.error('重做操作失败');
  }
};

/**
 * 处理操作点击
 */
const handleOperationClick = (operation: any): void => {
  componentLogger.debug('用户点击操作记录', { operation });

  // TODO: 显示操作详情
  ElMessage.info(`操作：${operation.description}`);
};

/**
 * 处理命令
 */
const handleCommand = async (command: string): Promise<void> => {
  componentLogger.info('用户执行命令', { command });

  switch (command) {
    case 'clear':
      await handleClear();
      break;
    case 'export':
      handleExport();
      break;
    case 'import':
      showImportDialog.value = true;
      break;
  }
};

/**
 * 处理清空历史
 */
const handleClear = async (): Promise<void> => {
  try {
    await ElMessageBox.confirm(
      '确定要清空所有历史记录吗？此操作不可恢复。',
      '清空历史记录',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning',
      }
    );

    clear();
    ElMessage.success('历史记录已清空');
  } catch {
    // 用户取消
  }
};

/**
 * 处理导出历史
 */
const handleExport = (): void => {
  try {
    const data = exportHistory();

    // 创建下载链接
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `schedule-history-${Date.now()}.json`;
    link.click();

    URL.revokeObjectURL(url);

    ElMessage.success('历史记录已导出');
  } catch (error) {
    componentLogger.error('导出历史记录失败', { error });
    ElMessage.error('导出历史记录失败');
  }
};

/**
 * 处理导入历史
 */
const handleImport = (): void => {
  try {
    if (!importData.value.trim()) {
      ElMessage.warning('请输入历史记录数据');
      return;
    }

    const success = importHistory(importData.value);

    if (success) {
      ElMessage.success('历史记录已导入');
      showImportDialog.value = false;
      importData.value = '';
    } else {
      ElMessage.error('导入失败：数据格式无效');
    }
  } catch (error) {
    componentLogger.error('导入历史记录失败', { error });
    ElMessage.error('导入历史记录失败');
  }
};

/**
 * 处理键盘快捷键
 */
const handleKeydown = (event: KeyboardEvent): void => {
  // Ctrl+Z 或 Cmd+Z：撤销
  if ((event.ctrlKey || event.metaKey) && event.key === 'z' && !event.shiftKey) {
    event.preventDefault();
    if (canUndo.value) {
      handleUndo();
    }
  }

  // Ctrl+Y 或 Cmd+Shift+Z：重做
  if (
    ((event.ctrlKey || event.metaKey) && event.key === 'y') ||
    ((event.ctrlKey || event.metaKey) && event.shiftKey && event.key === 'z')
  ) {
    event.preventDefault();
    if (canRedo.value) {
      handleRedo();
    }
  }
};

// ========== 生命周期 ==========
onMounted(() => {
  componentLogger.info('HistoryPanel 组件挂载');

  // 注册键盘快捷键
  window.addEventListener('keydown', handleKeydown);
});

onUnmounted(() => {
  componentLogger.info('HistoryPanel 组件卸载');

  // 移除键盘快捷键
  window.removeEventListener('keydown', handleKeydown);
});
</script>

<style scoped lang="scss">
.history-panel {
  display: flex;
  flex-direction: column;
  height: 100%;
  background-color: #fff;
  border-radius: 4px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

// ========== 工具栏 ==========
.history-toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  border-bottom: 1px solid #e0e0e0;

  .toolbar-left {
    display: flex;
    gap: 8px;
  }

  .toolbar-right {
    display: flex;
    gap: 8px;
  }
}

// ========== 历史记录列表 ==========
.history-list {
  flex: 1;
  overflow: hidden;

  .empty-state {
    display: flex;
    justify-content: center;
    align-items: center;
    height: 100%;
    padding: 40px 20px;
  }

  .history-items {
    padding: 16px;
  }

  .history-section {
    margin-bottom: 24px;

    &:last-child {
      margin-bottom: 0;
    }

    .section-title {
      font-size: 13px;
      font-weight: 600;
      color: #909399;
      margin-bottom: 12px;
      padding-left: 4px;
    }
  }

  .history-item {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 12px;
    border-radius: 4px;
    margin-bottom: 8px;
    cursor: pointer;
    transition: all 0.2s ease;
    border: 1px solid transparent;

    &:last-child {
      margin-bottom: 0;
    }

    &:hover {
      background-color: #f5f7fa;
      border-color: #e0e0e0;
    }

    &.is-current {
      background-color: #ecf5ff;
      border-color: #b3d8ff;
    }

    &.can-undo {
      opacity: 1;
    }

    &.can-redo {
      opacity: 0.6;
    }

    .item-icon {
      flex-shrink: 0;
      width: 32px;
      height: 32px;
      display: flex;
      justify-content: center;
      align-items: center;
      background-color: #f0f2f5;
      border-radius: 50%;
      color: #606266;

      .el-icon {
        font-size: 16px;
      }
    }

    .item-content {
      flex: 1;
      min-width: 0;

      .item-description {
        font-size: 14px;
        color: #303133;
        margin-bottom: 4px;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }

      .item-time {
        font-size: 12px;
        color: #909399;
      }
    }

    .item-actions {
      flex-shrink: 0;
      display: flex;
      gap: 4px;
    }
  }
}

// ========== 响应式设计 ==========
@media (max-width: 768px) {
  .history-toolbar {
    flex-direction: column;
    gap: 8px;

    .toolbar-left,
    .toolbar-right {
      width: 100%;
      justify-content: center;
    }
  }

  .history-item {
    .item-description {
      font-size: 13px;
    }

    .item-time {
      font-size: 11px;
    }
  }
}

// ========== 打印样式 ==========
@media print {
  .history-toolbar {
    display: none;
  }

  .history-item {
    &:hover {
      background-color: transparent;
      border-color: transparent;
    }
  }
}
</style>
