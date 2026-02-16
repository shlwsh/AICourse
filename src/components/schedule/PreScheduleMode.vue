<!--
  预排课模式组件
  提供手动预排课功能，允许用户在自动排课前手动安排部分课程

  功能特性：
  - 切换预排课模式
  - 显示预排课程列表
  - 支持拖拽添加预排课程
  - 预排课程在自动排课时保留
  - 支持清除预排课程
-->
<template>
  <div class="pre-schedule-mode">
    <!-- 模式切换 -->
    <div class="mode-toggle">
      <el-switch
        v-model="isPreScheduleMode"
        active-text="预排课模式"
        inactive-text="正常模式"
        @change="handleModeChange"
      />
      <el-tooltip content="在预排课模式下，您可以手动安排部分课程，这些课程在自动排课时会被保留" placement="top">
        <el-icon class="help-icon"><QuestionFilled /></el-icon>
      </el-tooltip>
    </div>

    <!-- 预排课模式提示 -->
    <el-alert
      v-if="isPreScheduleMode"
      type="info"
      :closable="false"
      show-icon
      class="mode-alert"
    >
      <template #title>
        预排课模式已启用
      </template>
      <template #default>
        拖拽课程到课表中进行预排课。预排课程将在自动排课时保留。
      </template>
    </el-alert>

    <!-- 预排课程列表 -->
    <div v-if="isPreScheduleMode" class="pre-schedule-list">
      <div class="list-header">
        <h3>预排课程列表</h3>
        <el-button size="small" type="danger" :icon="Delete" @click="handleClearAll">
          清除全部
        </el-button>
      </div>

      <el-table :data="preScheduledCourses" stripe border max-height="400">
        <el-table-column prop="classId" label="班级" width="120">
          <template #default="{ row }">
            {{ getClassName(row.classId) }}
          </template>
        </el-table-column>
        <el-table-column prop="subjectId" label="科目" width="120" />
        <el-table-column prop="teacherId" label="教师" width="120">
          <template #default="{ row }">
            {{ getTeacherName(row.teacherId) }}
          </template>
        </el-table-column>
        <el-table-column prop="timeSlot" label="时间" width="150">
          <template #default="{ row }">
            星期{{ row.timeSlot.day + 1 }} 第{{ row.timeSlot.period + 1 }}节
          </template>
        </el-table-column>
        <el-table-column label="操作" width="100" fixed="right">
          <template #default="{ row }">
            <el-button type="danger" size="small" link @click="handleRemove(row)">
              移除
            </el-button>
          </template>
        </el-table-column>
      </el-table>

      <div class="list-footer">
        <span>共 {{ preScheduledCourses.length }} 个预排课程</span>
      </div>
    </div>

    <!-- 可拖拽课程列表 -->
    <div v-if="isPreScheduleMode" class="draggable-courses">
      <h3>待排课程</h3>
      <el-input
        v-model="searchText"
        placeholder="搜索班级、科目或教师"
        :prefix-icon="Search"
        clearable
        class="search-input"
      />

      <div class="course-list">
        <div
          v-for="course in filteredCourses"
          :key="`${course.classId}-${course.subjectId}-${course.teacherId}`"
          class="course-item"
          draggable="true"
          @dragstart="handleDragStart($event, course)"
          @dragend="handleDragEnd"
        >
          <div class="course-info">
            <div class="course-class">{{ getClassName(course.classId) }}</div>
            <div class="course-subject">{{ course.subjectId }}</div>
            <div class="course-teacher">{{ getTeacherName(course.teacherId) }}</div>
          </div>
          <el-icon class="drag-icon"><Rank /></el-icon>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import { QuestionFilled, Delete, Search, Rank } from '@element-plus/icons-vue';
import { logger } from '@/utils/logger';
import type { ScheduleEntry } from '@/stores/scheduleStore';

// ========== Props ==========
interface Props {
  modelValue?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  modelValue: false,
});

// ========== Emits ==========
const emit = defineEmits<{
  'update:modelValue': [value: boolean];
  add: [entry: ScheduleEntry];
  remove: [entry: ScheduleEntry];
  clearAll: [];
}>();

// ========== 状态 ==========

/** 是否为预排课模式 */
const isPreScheduleMode = ref(props.modelValue);

/** 搜索文本 */
const searchText = ref('');

/** 预排课程列表 */
const preScheduledCourses = ref<ScheduleEntry[]>([]);

/** 待排课程列表 */
const pendingCourses = ref<Array<{
  classId: number;
  subjectId: string;
  teacherId: number;
  remainingCount: number;
}>>([]);

// ========== 计算属性 ==========

/** 过滤后的课程列表 */
const filteredCourses = computed(() => {
  if (!searchText.value) {
    return pendingCourses.value;
  }

  const keyword = searchText.value.toLowerCase();
  return pendingCourses.value.filter((course) => {
    const className = getClassName(course.classId).toLowerCase();
    const subjectId = course.subjectId.toLowerCase();
    const teacherName = getTeacherName(course.teacherId).toLowerCase();
    return (
      className.includes(keyword) ||
      subjectId.includes(keyword) ||
      teacherName.includes(keyword)
    );
  });
});

// ========== 方法 ==========

/**
 * 获取班级名称
 */
const getClassName = (classId: number): string => {
  // TODO: 从 classStore 获取班级名称
  return `班级${classId}`;
};

/**
 * 获取教师姓名
 */
const getTeacherName = (teacherId: number): string => {
  // TODO: 从 teacherStore 获取教师姓名
  return `教师${teacherId}`;
};

/**
 * 处理模式切换
 */
const handleModeChange = (value: boolean): void => {
  logger.info('切换预排课模式', { enabled: value });
  emit('update:modelValue', value);

  if (value) {
    ElMessage.info('已进入预排课模式，可以拖拽课程到课表中');
  } else {
    ElMessage.info('已退出预排课模式');
  }
};

/**
 * 处理拖拽开始
 */
const handleDragStart = (event: DragEvent, course: any): void => {
  logger.debug('开始拖拽课程', { course });

  if (event.dataTransfer) {
    event.dataTransfer.effectAllowed = 'copy';
    event.dataTransfer.setData(
      'application/json',
      JSON.stringify({
        type: 'pre-schedule',
        course,
      })
    );
  }
};

/**
 * 处理拖拽结束
 */
const handleDragEnd = (): void => {
  logger.debug('拖拽结束');
};

/**
 * 处理移除预排课程
 */
const handleRemove = async (entry: ScheduleEntry): Promise<void> => {
  logger.info('移除预排课程', { entry });

  try {
    await ElMessageBox.confirm('确定要移除该预排课程吗？', '确认操作', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning',
    });

    emit('remove', entry);
    await loadPreScheduledCourses();
    ElMessage.success('移除成功');
  } catch (error: any) {
    if (error === 'cancel') {
      logger.info('用户取消移除预排课程');
      return;
    }
    logger.error('移除预排课程失败', { error });
    ElMessage.error('移除失败');
  }
};

/**
 * 处理清除全部
 */
const handleClearAll = async (): Promise<void> => {
  logger.info('清除全部预排课程');

  try {
    await ElMessageBox.confirm(
      `确定要清除全部 ${preScheduledCourses.value.length} 个预排课程吗？`,
      '确认操作',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning',
      },
    );

    emit('clearAll');
    await loadPreScheduledCourses();
    ElMessage.success('清除成功');
  } catch (error: any) {
    if (error === 'cancel') {
      logger.info('用户取消清除全部预排课程');
      return;
    }
    logger.error('清除全部预排课程失败', { error });
    ElMessage.error('清除失败');
  }
};

/**
 * 加载预排课程列表
 */
const loadPreScheduledCourses = async (): Promise<void> => {
  try {
    logger.info('加载预排课程列表');

    // TODO: 调用 API 获取预排课程列表
    // const response = await ScheduleApi.getPreScheduledCourses();
    // preScheduledCourses.value = response.data || [];

    logger.info('预排课程列表加载成功', { count: preScheduledCourses.value.length });
  } catch (error) {
    logger.error('加载预排课程列表失败', { error });
    ElMessage.error('加载失败');
  }
};

/**
 * 加载待排课程列表
 */
const loadPendingCourses = async (): Promise<void> => {
  try {
    logger.info('加载待排课程列表');

    // TODO: 调用 API 获取待排课程列表
    // const response = await ScheduleApi.getPendingCourses();
    // pendingCourses.value = response.data || [];

    logger.info('待排课程列表加载成功', { count: pendingCourses.value.length });
  } catch (error) {
    logger.error('加载待排课程列表失败', { error });
  }
};

// ========== 生命周期 ==========
onMounted(() => {
  logger.info('预排课模式组件挂载');
  loadPreScheduledCourses();
  loadPendingCourses();
});
</script>

<style scoped lang="scss">
.pre-schedule-mode {
  width: 100%;
  padding: 20px;
  background-color: #fff;
  border-radius: 8px;
}

.mode-toggle {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 20px;

  .help-icon {
    font-size: 16px;
    color: #909399;
    cursor: help;
  }
}

.mode-alert {
  margin-bottom: 20px;
}

.pre-schedule-list {
  margin-bottom: 20px;

  .list-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 12px;

    h3 {
      margin: 0;
      font-size: 16px;
      font-weight: 600;
      color: #303133;
    }
  }

  .list-footer {
    margin-top: 12px;
    text-align: right;
    font-size: 14px;
    color: #606266;
  }
}

.draggable-courses {
  h3 {
    margin: 0 0 12px;
    font-size: 16px;
    font-weight: 600;
    color: #303133;
  }

  .search-input {
    margin-bottom: 12px;
  }

  .course-list {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
    gap: 12px;
    max-height: 400px;
    overflow-y: auto;
  }

  .course-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 12px;
    background-color: #f5f7fa;
    border: 1px solid #e4e7ed;
    border-radius: 4px;
    cursor: move;
    transition: all 0.2s ease;

    &:hover {
      background-color: #ecf5ff;
      border-color: #409eff;
      box-shadow: 0 2px 8px rgba(64, 158, 255, 0.2);
    }

    .course-info {
      flex: 1;

      .course-class {
        font-size: 14px;
        font-weight: 600;
        color: #303133;
        margin-bottom: 4px;
      }

      .course-subject {
        font-size: 13px;
        color: #606266;
        margin-bottom: 2px;
      }

      .course-teacher {
        font-size: 12px;
        color: #909399;
      }
    }

    .drag-icon {
      font-size: 20px;
      color: #909399;
    }
  }
}

// 响应式设计
@media (max-width: 768px) {
  .pre-schedule-mode {
    padding: 12px;
  }

  .draggable-courses {
    .course-list {
      grid-template-columns: 1fr;
    }
  }
}
</style>
