<!--
  交换建议组件
  展示系统推荐的课程交换方案，支持简单交换、三角交换、链式交换
  用户可以预览交换效果并执行交换操作
-->
<template>
  <div class="swap-suggestion-container">
    <!-- 标题栏 -->
    <div class="suggestion-header">
      <h3 class="title">交换建议</h3>
      <el-button
        size="small"
        :icon="Refresh"
        :loading="isLoading"
        @click="handleRefresh"
      >
        刷新建议
      </el-button>
    </div>

    <!-- 加载状态 -->
    <div v-if="isLoading" class="loading-container">
      <el-skeleton :rows="3" animated />
    </div>

    <!-- 无建议提示 -->
    <el-empty
      v-else-if="suggestions.length === 0"
      description="暂无交换建议"
      :image-size="120"
    >
      <el-button type="primary" @click="handleRefresh">
        重新获取建议
      </el-button>
    </el-empty>

    <!-- 建议列表 -->
    <div v-else class="suggestions-list">
      <el-card
        v-for="(suggestion, index) in suggestions"
        :key="index"
        class="suggestion-card"
        :class="{ 'best-suggestion': index === 0 }"
        shadow="hover"
      >
        <!-- 卡片头部 -->
        <template #header>
          <div class="card-header">
            <div class="header-left">
              <el-tag :type="getSwapTypeTagType(suggestion.swapType)" size="large">
                {{ getSwapTypeLabel(suggestion.swapType) }}
              </el-tag>
              <el-tag
                v-if="index === 0"
                type="success"
                size="small"
                effect="dark"
              >
                推荐
              </el-tag>
            </div>
            <div class="header-right">
              <el-tag
                :type="getCostImpactTagType(suggestion.costImpact)"
                size="large"
              >
                代价变化: {{ formatCostImpact(suggestion.costImpact) }}
              </el-tag>
            </div>
          </div>
        </template>

        <!-- 卡片内容 -->
        <div class="card-content">
          <!-- 描述 -->
          <div class="description">
            <el-icon><InfoFilled /></el-icon>
            <span>{{ suggestion.description }}</span>
          </div>

          <!-- 移动列表 -->
          <div class="moves-list">
            <div class="moves-title">涉及的课程移动：</div>
            <el-timeline>
              <el-timeline-item
                v-for="(move, moveIndex) in suggestion.moves"
                :key="moveIndex"
                :icon="ArrowRight"
                :color="getMoveColor(moveIndex)"
              >
                <div class="move-item">
                  <div class="move-info">
                    <span class="class-name">班级 {{ move.classId }}</span>
                    <span class="subject-name">{{ move.subjectId }}</span>
                    <span class="teacher-name">教师 {{ move.teacherId }}</span>
                  </div>
                  <div class="move-slots">
                    <el-tag size="small" type="info">
                      星期{{ getDayLabel(move.fromSlot.day) }} 第{{ move.fromSlot.period + 1 }}节
                    </el-tag>
                    <el-icon><Right /></el-icon>
                    <el-tag size="small" type="success">
                      星期{{ getDayLabel(move.toSlot.day) }} 第{{ move.toSlot.period + 1 }}节
                    </el-tag>
                  </div>
                </div>
              </el-timeline-item>
            </el-timeline>
          </div>
        </div>

        <!-- 卡片操作 -->
        <template #footer>
          <div class="card-footer">
            <el-button
              size="small"
              @click="handlePreview(suggestion)"
            >
              预览效果
            </el-button>
            <el-button
              type="primary"
              size="small"
              :loading="isExecuting"
              @click="handleExecute(suggestion)"
            >
              执行交换
            </el-button>
          </div>
        </template>
      </el-card>
    </div>

    <!-- 预览对话框 -->
    <el-dialog
      v-model="previewDialogVisible"
      title="交换预览"
      width="700px"
    >
      <div v-if="previewSuggestion" class="preview-content">
        <el-descriptions :column="2" border>
          <el-descriptions-item label="交换类型">
            {{ getSwapTypeLabel(previewSuggestion.swapType) }}
          </el-descriptions-item>
          <el-descriptions-item label="代价变化">
            <el-tag :type="getCostImpactTagType(previewSuggestion.costImpact)">
              {{ formatCostImpact(previewSuggestion.costImpact) }}
            </el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="移动数量" :span="2">
            {{ previewSuggestion.moves.length }} 个课程
          </el-descriptions-item>
          <el-descriptions-item label="描述" :span="2">
            {{ previewSuggestion.description }}
          </el-descriptions-item>
        </el-descriptions>

        <div class="preview-moves">
          <h4>课程移动详情：</h4>
          <el-table :data="previewSuggestion.moves" border stripe>
            <el-table-column prop="classId" label="班级" width="80" />
            <el-table-column prop="subjectId" label="科目" width="100" />
            <el-table-column prop="teacherId" label="教师" width="80" />
            <el-table-column label="原时段" width="150">
              <template #default="{ row }">
                星期{{ getDayLabel(row.fromSlot.day) }} 第{{ row.fromSlot.period + 1 }}节
              </template>
            </el-table-column>
            <el-table-column label="新时段" width="150">
              <template #default="{ row }">
                星期{{ getDayLabel(row.toSlot.day) }} 第{{ row.toSlot.period + 1 }}节
              </template>
            </el-table-column>
          </el-table>
        </div>
      </div>

      <template #footer>
        <el-button @click="previewDialogVisible = false">关闭</el-button>
        <el-button
          type="primary"
          :loading="isExecuting"
          @click="handleExecuteFromPreview"
        >
          确认执行
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import {
  Refresh,
  InfoFilled,
  ArrowRight,
  Right,
} from '@element-plus/icons-vue';
import { logger } from '@/utils/logger';
import { ScheduleApi } from '@/api/schedule';

// ========== 组件日志 ==========
const logPrefix = '[SwapSuggestion]';

// ========== Props ==========
interface Props {
  /** 目标班级ID */
  targetClass?: number;
  /** 目标教师ID */
  targetTeacher?: number;
  /** 期望的时间槽位 */
  desiredSlot?: {
    day: number;
    period: number;
  };
  /** 是否自动加载 */
  autoLoad?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  targetClass: 0,
  targetTeacher: 0,
  desiredSlot: () => ({ day: 0, period: 0 }),
  autoLoad: true,
});

// ========== Emits ==========
const emit = defineEmits<{
  executed: [];
  refresh: [];
}>();

// ========== 类型定义 ==========
interface TimeSlot {
  day: number;
  period: number;
}

interface CourseMove {
  classId: number;
  subjectId: string;
  teacherId: number;
  fromSlot: TimeSlot;
  toSlot: TimeSlot;
}

interface SwapSuggestion {
  swapType: 'Simple' | 'Triangle' | 'Chain';
  moves: CourseMove[];
  costImpact: number;
  description: string;
}

// ========== 状态 ==========
const suggestions = ref<SwapSuggestion[]>([]);
const isLoading = ref(false);
const isExecuting = ref(false);
const previewDialogVisible = ref(false);
const previewSuggestion = ref<SwapSuggestion | null>(null);

// ========== 方法 ==========

/**
 * 加载交换建议
 */
const loadSuggestions = async (): Promise<void> => {
  if (!props.targetClass || !props.targetTeacher) {
    logger.warn(`${logPrefix} 缺少必要参数，无法加载交换建议`);
    return;
  }

  try {
    logger.info(`${logPrefix} 加载交换建议`, {
      targetClass: props.targetClass,
      targetTeacher: props.targetTeacher,
      desiredSlot: props.desiredSlot,
    });

    isLoading.value = true;

    const response = await ScheduleApi.suggestSwaps(
      props.targetClass,
      props.targetTeacher,
      props.desiredSlot
    );

    if (response.success && response.data) {
      suggestions.value = response.data;
      logger.info(`${logPrefix} 交换建议加载成功`, {
        count: suggestions.value.length,
      });
    } else {
      logger.error(`${logPrefix} 交换建议加载失败`, {
        error: response.error || response.message,
      });
      ElMessage.error('加载交换建议失败');
    }
  } catch (error) {
    logger.error(`${logPrefix} 加载交换建议异常`, { error });
    ElMessage.error('加载交换建议失败');
  } finally {
    isLoading.value = false;
  }
};

/**
 * 刷新建议
 */
const handleRefresh = async (): Promise<void> => {
  logger.info(`${logPrefix} 刷新交换建议`);
  await loadSuggestions();
  emit('refresh');
};

/**
 * 预览交换效果
 */
const handlePreview = (suggestion: SwapSuggestion): void => {
  logger.info(`${logPrefix} 预览交换效果`, {
    swapType: suggestion.swapType,
    moveCount: suggestion.moves.length,
  });

  previewSuggestion.value = suggestion;
  previewDialogVisible.value = true;
};

/**
 * 执行交换
 */
const handleExecute = async (suggestion: SwapSuggestion): Promise<void> => {
  try {
    logger.info(`${logPrefix} 执行交换`, {
      swapType: suggestion.swapType,
      moveCount: suggestion.moves.length,
    });

    const result = await ElMessageBox.confirm(
      `确定要执行此交换方案吗？将移动 ${suggestion.moves.length} 个课程。`,
      '确认交换',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning',
      }
    );

    if (result !== 'confirm') {
      return;
    }

    isExecuting.value = true;

    const response = await ScheduleApi.executeSwap(suggestion);

    if (response.success) {
      ElMessage.success('交换执行成功');
      logger.info(`${logPrefix} 交换执行成功`);
      emit('executed');

      // 清空建议列表
      suggestions.value = [];
    } else {
      logger.error(`${logPrefix} 交换执行失败`, {
        error: response.error || response.message,
      });
      ElMessage.error('交换执行失败');
    }
  } catch (error: any) {
    if (error !== 'cancel') {
      logger.error(`${logPrefix} 交换执行异常`, { error });
      ElMessage.error('交换执行失败');
    }
  } finally {
    isExecuting.value = false;
  }
};

/**
 * 从预览对话框执行交换
 */
const handleExecuteFromPreview = async (): Promise<void> => {
  if (previewSuggestion.value) {
    previewDialogVisible.value = false;
    await handleExecute(previewSuggestion.value);
  }
};

/**
 * 获取交换类型标签
 */
const getSwapTypeLabel = (type: string): string => {
  const labels: Record<string, string> = {
    Simple: '简单交换',
    Triangle: '三角交换',
    Chain: '链式交换',
  };
  return labels[type] || type;
};

/**
 * 获取交换类型标签类型
 */
const getSwapTypeTagType = (type: string): 'success' | 'warning' | 'info' => {
  const types: Record<string, 'success' | 'warning' | 'info'> = {
    Simple: 'success',
    Triangle: 'warning',
    Chain: 'info',
  };
  return types[type] || 'info';
};

/**
 * 获取代价影响标签类型
 */
const getCostImpactTagType = (impact: number): 'success' | 'warning' | 'danger' => {
  if (impact < 0) return 'success';
  if (impact === 0) return 'warning';
  return 'danger';
};

/**
 * 格式化代价影响
 */
const formatCostImpact = (impact: number): string => {
  if (impact < 0) return `${impact} (改善)`;
  if (impact === 0) return '0 (无变化)';
  return `+${impact} (增加)`;
};

/**
 * 获取星期标签
 */
const getDayLabel = (day: number): string => {
  const labels = ['一', '二', '三', '四', '五', '六', '日'];
  return labels[day] || String(day + 1);
};

/**
 * 获取移动颜色
 */
const getMoveColor = (index: number): string => {
  const colors = ['#409EFF', '#67C23A', '#E6A23C', '#F56C6C', '#909399'];
  return colors[index % colors.length];
};

// ========== 生命周期 ==========
onMounted(() => {
  logger.info(`${logPrefix} SwapSuggestion 组件挂载`, {
    targetClass: props.targetClass,
    targetTeacher: props.targetTeacher,
    autoLoad: props.autoLoad,
  });

  if (props.autoLoad) {
    loadSuggestions();
  }
});

// 监听 props 变化
watch(
  () => [props.targetClass, props.targetTeacher, props.desiredSlot],
  () => {
    if (props.autoLoad) {
      loadSuggestions();
    }
  },
  { deep: true }
);
</script>

<style scoped lang="scss">
.swap-suggestion-container {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  background-color: #fff;
  border-radius: 4px;
  padding: 16px;
}

.suggestion-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
  padding-bottom: 12px;
  border-bottom: 1px solid #e0e0e0;

  .title {
    margin: 0;
    font-size: 18px;
    font-weight: 600;
    color: #303133;
  }
}

.loading-container {
  padding: 20px;
}

.suggestions-list {
  flex: 1;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.suggestion-card {
  transition: all 0.3s ease;

  &.best-suggestion {
    border: 2px solid #67c23a;
  }

  &:hover {
    transform: translateY(-2px);
  }
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;

  .header-left {
    display: flex;
    gap: 8px;
    align-items: center;
  }

  .header-right {
    display: flex;
    gap: 8px;
    align-items: center;
  }
}

.card-content {
  .description {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 12px;
    background-color: #f5f7fa;
    border-radius: 4px;
    margin-bottom: 16px;
    font-size: 14px;
    color: #606266;
  }

  .moves-list {
    .moves-title {
      font-size: 14px;
      font-weight: 600;
      color: #303133;
      margin-bottom: 12px;
    }

    .move-item {
      display: flex;
      flex-direction: column;
      gap: 8px;

      .move-info {
        display: flex;
        gap: 12px;
        align-items: center;
        font-size: 14px;

        .class-name {
          font-weight: 600;
          color: #409eff;
        }

        .subject-name {
          color: #606266;
        }

        .teacher-name {
          color: #909399;
        }
      }

      .move-slots {
        display: flex;
        gap: 8px;
        align-items: center;
      }
    }
  }
}

.card-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}

.preview-content {
  .preview-moves {
    margin-top: 20px;

    h4 {
      margin-bottom: 12px;
      font-size: 14px;
      font-weight: 600;
      color: #303133;
    }
  }
}

// 响应式设计
@media (max-width: 768px) {
  .suggestion-header {
    flex-direction: column;
    gap: 12px;
    align-items: flex-start;
  }

  .card-header {
    flex-direction: column;
    gap: 12px;
    align-items: flex-start;
  }

  .move-item {
    .move-info {
      flex-direction: column;
      align-items: flex-start;
      gap: 4px;
    }
  }
}
</style>
