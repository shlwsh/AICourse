<!--
  教师偏好设置组件
  用于配置教师的排课偏好，包括时段偏好、早晚偏好、权重系数等
  支持单个教师设置和批量设置功能
-->
<template>
  <div class="teacher-preference-container">
    <!-- 工具栏 -->
    <div class="preference-toolbar">
      <div class="toolbar-left">
        <el-input
          v-model="searchKeyword"
          placeholder="搜索教师姓名"
          :prefix-icon="Search"
          clearable
          style="width: 240px"
          @input="handleSearch"
        />
        <el-select
          v-model="selectedGroupId"
          placeholder="按教研组筛选"
          clearable
          style="width: 180px"
          @change="handleGroupFilter"
        >
          <el-option label="全部教研组" :value="null" />
          <el-option
            v-for="group in teachingGroups"
            :key="group.id"
            :label="group.name"
            :value="group.id"
          />
        </el-select>
      </div>

      <div class="toolbar-right">
        <el-button
          type="primary"
          :icon="Setting"
          :disabled="selectedTeachers.length === 0"
          @click="handleBatchSetting"
        >
          批量设置 ({{ selectedTeachers.length }})
        </el-button>
        <el-button
          type="success"
          :icon="Check"
          :loading="isSaving"
          :disabled="!hasChanges"
          @click="handleSave"
        >
          保存
        </el-button>
        <el-button :icon="Refresh" @click="handleReset">
          重置
        </el-button>
      </div>
    </div>

    <!-- 教师列表表格 -->
    <div class="preference-table-wrapper">
      <el-table
        ref="tableRef"
        :data="filteredTeachers"
        border
        stripe
        max-height="600"
        @selection-change="handleSelectionChange"
      >
        <!-- 选择列 -->
        <el-table-column type="selection" width="55" align="center" />

        <!-- 教师姓名 -->
        <el-table-column prop="name" label="教师姓名" width="120" fixed>
          <template #default="{ row }">
            <div class="teacher-name">
              {{ row.name }}
            </div>
          </template>
        </el-table-column>

        <!-- 教研组 -->
        <el-table-column prop="teachingGroupId" label="教研组" width="120">
          <template #default="{ row }">
            <el-tag v-if="row.teachingGroupId" size="small">
              {{ getGroupName(row.teachingGroupId) }}
            </el-tag>
            <span v-else class="text-muted">-</span>
          </template>
        </el-table-column>

        <!-- 时段偏好 -->
        <el-table-column label="时段偏好" width="200">
          <template #default="{ row }">
            <el-button
              size="small"
              :type="hasPreferredSlots(row.id) ? 'primary' : 'default'"
              @click="handleEditSlots(row)"
            >
              {{ hasPreferredSlots(row.id) ? '已设置' : '未设置' }}
            </el-button>
          </template>
        </el-table-column>

        <!-- 早晚偏好 -->
        <el-table-column label="早晚偏好" width="150">
          <template #default="{ row }">
            <el-select
              v-model="getPreference(row.id).timeBias"
              size="small"
              @change="handlePreferenceChange(row.id)"
            >
              <el-option label="无偏好" :value="0" />
              <el-option label="厌恶早课" :value="1" />
              <el-option label="厌恶晚课" :value="2" />
            </el-select>
          </template>
        </el-table-column>

        <!-- 权重系数 -->
        <el-table-column label="权重系数" width="150">
          <template #default="{ row }">
            <el-input-number
              v-model="getPreference(row.id).weight"
              :min="1"
              :max="10"
              size="small"
              @change="handlePreferenceChange(row.id)"
            />
          </template>
        </el-table-column>

        <!-- 不排课时段 -->
        <el-table-column label="不排课时段" width="200">
          <template #default="{ row }">
            <el-button
              size="small"
              :type="hasBlockedSlots(row.id) ? 'danger' : 'default'"
              @click="handleEditBlockedSlots(row)"
            >
              {{ hasBlockedSlots(row.id) ? '已设置' : '未设置' }}
            </el-button>
          </template>
        </el-table-column>

        <!-- 操作 -->
        <el-table-column label="操作" width="120" fixed="right">
          <template #default="{ row }">
            <el-button
              size="small"
              type="primary"
              link
              @click="handleViewPreference(row)"
            >
              查看
            </el-button>
          </template>
        </el-table-column>
      </el-table>
    </div>

    <!-- 时段偏好设置对话框 -->
    <el-dialog
      v-model="slotsDialogVisible"
      :title="`设置时段偏好 - ${currentTeacher?.name || ''}`"
      width="800px"
      @close="handleSlotsDialogClose"
    >
      <div class="slots-editor">
        <div class="slots-header">
          <el-radio-group v-model="slotEditMode" size="small">
            <el-radio-button value="prefer">喜欢</el-radio-button>
            <el-radio-button value="dislike">不喜欢</el-radio-button>
            <el-radio-button value="forbidden">禁止</el-radio-button>
          </el-radio-group>
          <el-button size="small" @click="handleClearSlots">清空</el-button>
        </div>

        <div class="slots-grid">
          <table class="slots-table">
            <thead>
              <tr>
                <th>节次</th>
                <th v-for="day in 5" :key="day">星期{{ ['一', '二', '三', '四', '五'][day - 1] }}</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="period in 8" :key="period">
                <td class="period-label">第{{ period }}节</td>
                <td
                  v-for="day in 5"
                  :key="`${day}-${period}`"
                  class="slot-cell"
                  :class="getSlotClass(day - 1, period - 1)"
                  @click="handleSlotClick(day - 1, period - 1)"
                >
                  <div class="slot-content">
                    {{ getSlotLabel(day - 1, period - 1) }}
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <div class="slots-legend">
          <div class="legend-item">
            <span class="legend-color prefer"></span>
            <span>喜欢</span>
          </div>
          <div class="legend-item">
            <span class="legend-color dislike"></span>
            <span>不喜欢</span>
          </div>
          <div class="legend-item">
            <span class="legend-color forbidden"></span>
            <span>禁止</span>
          </div>
        </div>
      </div>

      <template #footer>
        <el-button @click="slotsDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handleSlotsConfirm">确定</el-button>
      </template>
    </el-dialog>

    <!-- 批量设置对话框 -->
    <el-dialog
      v-model="batchDialogVisible"
      title="批量设置教师偏好"
      width="600px"
    >
      <el-form :model="batchForm" label-width="120px">
        <el-form-item label="早晚偏好">
          <el-select v-model="batchForm.timeBias" placeholder="请选择">
            <el-option label="无偏好" :value="0" />
            <el-option label="厌恶早课" :value="1" />
            <el-option label="厌恶晚课" :value="2" />
          </el-select>
        </el-form-item>

        <el-form-item label="权重系数">
          <el-input-number
            v-model="batchForm.weight"
            :min="1"
            :max="10"
          />
        </el-form-item>

        <el-form-item label="应用到">
          <el-tag
            v-for="teacher in selectedTeachers"
            :key="teacher.id"
            closable
            @close="handleRemoveFromBatch(teacher)"
          >
            {{ teacher.name }}
          </el-tag>
        </el-form-item>
      </el-form>

      <template #footer>
        <el-button @click="batchDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handleBatchConfirm">确定</el-button>
      </template>
    </el-dialog>

    <!-- 偏好详情对话框 -->
    <el-dialog
      v-model="detailDialogVisible"
      :title="`教师偏好详情 - ${currentTeacher?.name || ''}`"
      width="700px"
    >
      <el-descriptions :column="2" border>
        <el-descriptions-item label="教师姓名">
          {{ currentTeacher?.name }}
        </el-descriptions-item>
        <el-descriptions-item label="教研组">
          {{ currentTeacher?.teachingGroupId ? getGroupName(currentTeacher.teachingGroupId) : '-' }}
        </el-descriptions-item>
        <el-descriptions-item label="早晚偏好">
          {{ getTimeBiasLabel(getPreference(currentTeacher?.id || 0).timeBias) }}
        </el-descriptions-item>
        <el-descriptions-item label="权重系数">
          {{ getPreference(currentTeacher?.id || 0).weight }}
        </el-descriptions-item>
        <el-descriptions-item label="时段偏好" :span="2">
          {{ hasPreferredSlots(currentTeacher?.id || 0) ? '已设置' : '未设置' }}
        </el-descriptions-item>
        <el-descriptions-item label="不排课时段" :span="2">
          {{ hasBlockedSlots(currentTeacher?.id || 0) ? '已设置' : '未设置' }}
        </el-descriptions-item>
      </el-descriptions>

      <template #footer>
        <el-button type="primary" @click="detailDialogVisible = false">关闭</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, reactive } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import { Search, Setting, Check, Refresh } from '@element-plus/icons-vue';
import { useTeacherStore, type Teacher, type TeacherPreference } from '@/stores/teacherStore';
import { logger } from '@/utils/logger';

// ========== 组件日志 ==========
// 使用统一的日志记录器，在日志消息中包含组件名称
const logPrefix = '[TeacherPreference]';

// ========== Props ==========
interface Props {
  /** 排课周期天数 */
  cycleDays?: number;
  /** 每天节次数 */
  periodsPerDay?: number;
}

const props = withDefaults(defineProps<Props>(), {
  cycleDays: 5,
  periodsPerDay: 8,
});

// ========== Emits ==========
const emit = defineEmits<{
  save: [preferences: TeacherPreference[]];
  change: [];
}>();

// ========== Store ==========
const teacherStore = useTeacherStore();

// ========== 状态 ==========
const searchKeyword = ref('');
const selectedGroupId = ref<number | null>(null);
const selectedTeachers = ref<Teacher[]>([]);
const isSaving = ref(false);
const hasChanges = ref(false);

// 对话框状态
const slotsDialogVisible = ref(false);
const batchDialogVisible = ref(false);
const detailDialogVisible = ref(false);

// 当前编辑的教师
const currentTeacher = ref<Teacher | null>(null);

// 时段编辑模式
const slotEditMode = ref<'prefer' | 'dislike' | 'forbidden'>('prefer');

// 临时时段数据（用于对话框编辑）
const tempSlots = ref<{
  preferred: Set<number>;
  blocked: Set<number>;
}>({
  preferred: new Set(),
  blocked: new Set(),
});

// 批量设置表单
const batchForm = reactive({
  timeBias: 0,
  weight: 1,
});

// 教师偏好本地缓存（用于编辑）
const localPreferences = ref<Map<number, TeacherPreference>>(new Map());

// 教研组列表（模拟数据）
const teachingGroups = ref([
  { id: 1, name: '语文组' },
  { id: 2, name: '数学组' },
  { id: 3, name: '英语组' },
  { id: 4, name: '理科组' },
  { id: 5, name: '文科组' },
]);

// 表格引用
const tableRef = ref();

// ========== 计算属性 ==========

/** 过滤后的教师列表 */
const filteredTeachers = computed(() => {
  let teachers = teacherStore.teachers;

  // 按教研组筛选
  if (selectedGroupId.value !== null) {
    teachers = teachers.filter((t) => t.teachingGroupId === selectedGroupId.value);
  }

  // 按关键词搜索
  if (searchKeyword.value) {
    const keyword = searchKeyword.value.toLowerCase();
    teachers = teachers.filter((t) => t.name.toLowerCase().includes(keyword));
  }

  return teachers;
});

// ========== 方法 ==========

/**
 * 获取教师偏好（如果不存在则创建默认值）
 */
const getPreference = (teacherId: number): TeacherPreference => {
  if (!localPreferences.value.has(teacherId)) {
    // 创建默认偏好
    const defaultPref: TeacherPreference = {
      teacherId,
      preferredSlots: '0', // 空掩码
      timeBias: 0,
      weight: 1,
      blockedSlots: '0', // 空掩码
    };
    localPreferences.value.set(teacherId, defaultPref);
  }
  return localPreferences.value.get(teacherId)!;
};

/**
 * 获取教研组名称
 */
const getGroupName = (groupId: number): string => {
  const group = teachingGroups.value.find((g) => g.id === groupId);
  return group?.name || '未知';
};

/**
 * 检查是否有偏好时段设置
 */
const hasPreferredSlots = (teacherId: number): boolean => {
  const pref = getPreference(teacherId);
  return pref.preferredSlots !== '0' && pref.preferredSlots !== '';
};

/**
 * 检查是否有不排课时段设置
 */
const hasBlockedSlots = (teacherId: number): boolean => {
  const pref = getPreference(teacherId);
  return pref.blockedSlots !== '0' && pref.blockedSlots !== '';
};

/**
 * 获取早晚偏好标签
 */
const getTimeBiasLabel = (timeBias: number): string => {
  const labels = ['无偏好', '厌恶早课', '厌恶晚课'];
  return labels[timeBias] || '未知';
};

/**
 * 计算时间槽位的位位置
 */
const getSlotBitPosition = (day: number, period: number): number => {
  return day * props.periodsPerDay + period;
};

/**
 * 检查时间槽位是否在掩码中
 */
const isSlotInMask = (mask: string, day: number, period: number): boolean => {
  const bitPos = getSlotBitPosition(day, period);
  const maskValue = BigInt(mask);
  const bitMask = BigInt(1) << BigInt(bitPos);
  return (maskValue & bitMask) !== BigInt(0);
};

/**
 * 设置时间槽位到掩码
 */
const setSlotInMask = (mask: string, day: number, period: number, value: boolean): string => {
  const bitPos = getSlotBitPosition(day, period);
  let maskValue = BigInt(mask);
  const bitMask = BigInt(1) << BigInt(bitPos);

  if (value) {
    maskValue = maskValue | bitMask;
  } else {
    maskValue = maskValue & ~bitMask;
  }

  return maskValue.toString();
};

/**
 * 获取时间槽位的样式类
 */
const getSlotClass = (day: number, period: number): string[] => {
  const classes: string[] = [];

  const bitPos = getSlotBitPosition(day, period);

  if (tempSlots.value.preferred.has(bitPos)) {
    classes.push('slot-prefer');
  }

  if (tempSlots.value.blocked.has(bitPos)) {
    classes.push('slot-forbidden');
  }

  return classes;
};

/**
 * 获取时间槽位的标签
 */
const getSlotLabel = (day: number, period: number): string => {
  const bitPos = getSlotBitPosition(day, period);

  if (tempSlots.value.blocked.has(bitPos)) {
    return '禁';
  }

  if (tempSlots.value.preferred.has(bitPos)) {
    return '✓';
  }

  return '';
};

/**
 * 处理搜索
 */
const handleSearch = (): void => {
  logger.debug(`${logPrefix} 搜索教师`, { keyword: searchKeyword.value });
};

/**
 * 处理教研组筛选
 */
const handleGroupFilter = (): void => {
  logger.debug(`${logPrefix} 筛选教研组`, { groupId: selectedGroupId.value });
};

/**
 * 处理选择变更
 */
const handleSelectionChange = (selection: Teacher[]): void => {
  selectedTeachers.value = selection;
  logger.debug(`${logPrefix} 选择教师`, { count: selection.length });
};

/**
 * 处理偏好变更
 */
const handlePreferenceChange = (teacherId: number): void => {
  hasChanges.value = true;
  logger.debug(`${logPrefix} 偏好变更`, { teacherId });
  emit('change');
};

/**
 * 处理编辑时段偏好
 */
const handleEditSlots = (teacher: Teacher): void => {
  logger.info(`${logPrefix} 编辑时段偏好`, { teacherId: teacher.id, teacherName: teacher.name });

  currentTeacher.value = teacher;
  const pref = getPreference(teacher.id);

  // 加载当前偏好到临时数据
  tempSlots.value.preferred.clear();
  tempSlots.value.blocked.clear();

  for (let day = 0; day < props.cycleDays; day++) {
    for (let period = 0; period < props.periodsPerDay; period++) {
      const bitPos = getSlotBitPosition(day, period);
      if (isSlotInMask(pref.preferredSlots, day, period)) {
        tempSlots.value.preferred.add(bitPos);
      }
    }
  }

  slotsDialogVisible.value = true;
};

/**
 * 处理编辑不排课时段
 */
const handleEditBlockedSlots = (teacher: Teacher): void => {
  logger.info(`${logPrefix} 编辑不排课时段`, { teacherId: teacher.id, teacherName: teacher.name });

  currentTeacher.value = teacher;
  const pref = getPreference(teacher.id);

  // 加载当前不排课时段到临时数据
  tempSlots.value.preferred.clear();
  tempSlots.value.blocked.clear();

  for (let day = 0; day < props.cycleDays; day++) {
    for (let period = 0; period < props.periodsPerDay; period++) {
      const bitPos = getSlotBitPosition(day, period);
      if (isSlotInMask(pref.blockedSlots, day, period)) {
        tempSlots.value.blocked.add(bitPos);
      }
    }
  }

  slotEditMode.value = 'forbidden';
  slotsDialogVisible.value = true;
};

/**
 * 处理时间槽位点击
 */
const handleSlotClick = (day: number, period: number): void => {
  const bitPos = getSlotBitPosition(day, period);

  if (slotEditMode.value === 'prefer') {
    // 切换偏好状态
    if (tempSlots.value.preferred.has(bitPos)) {
      tempSlots.value.preferred.delete(bitPos);
    } else {
      tempSlots.value.preferred.add(bitPos);
      // 移除禁止标记（互斥）
      tempSlots.value.blocked.delete(bitPos);
    }
  } else if (slotEditMode.value === 'forbidden') {
    // 切换禁止状态
    if (tempSlots.value.blocked.has(bitPos)) {
      tempSlots.value.blocked.delete(bitPos);
    } else {
      tempSlots.value.blocked.add(bitPos);
      // 移除偏好标记（互斥）
      tempSlots.value.preferred.delete(bitPos);
    }
  } else if (slotEditMode.value === 'dislike') {
    // 移除所有标记
    tempSlots.value.preferred.delete(bitPos);
    tempSlots.value.blocked.delete(bitPos);
  }

  logger.debug(`${logPrefix} 时间槽位点击`, { day, period, mode: slotEditMode.value });
};

/**
 * 处理清空时段
 */
const handleClearSlots = (): void => {
  tempSlots.value.preferred.clear();
  tempSlots.value.blocked.clear();
  logger.info(`${logPrefix} 清空时段设置`);
};

/**
 * 处理时段对话框关闭
 */
const handleSlotsDialogClose = (): void => {
  tempSlots.value.preferred.clear();
  tempSlots.value.blocked.clear();
  currentTeacher.value = null;
};

/**
 * 处理时段确认
 */
const handleSlotsConfirm = (): void => {
  if (!currentTeacher.value) {
    return;
  }

  logger.info(`${logPrefix} 确认时段设置`, {
    teacherId: currentTeacher.value.id,
    preferredCount: tempSlots.value.preferred.size,
    blockedCount: tempSlots.value.blocked.size,
  });

  const pref = getPreference(currentTeacher.value.id);

  // 将临时数据转换为位掩码
  let preferredMask = BigInt(0);
  let blockedMask = BigInt(0);

  tempSlots.value.preferred.forEach((bitPos) => {
    preferredMask = preferredMask | (BigInt(1) << BigInt(bitPos));
  });

  tempSlots.value.blocked.forEach((bitPos) => {
    blockedMask = blockedMask | (BigInt(1) << BigInt(bitPos));
  });

  pref.preferredSlots = preferredMask.toString();
  pref.blockedSlots = blockedMask.toString();

  hasChanges.value = true;
  slotsDialogVisible.value = false;
  emit('change');

  ElMessage.success('时段设置已更新');
};

/**
 * 处理批量设置
 */
const handleBatchSetting = (): void => {
  if (selectedTeachers.value.length === 0) {
    ElMessage.warning('请先选择要设置的教师');
    return;
  }

  logger.info(`${logPrefix} 打开批量设置对话框`, { count: selectedTeachers.value.length });

  // 重置批量表单
  batchForm.timeBias = 0;
  batchForm.weight = 1;

  batchDialogVisible.value = true;
};

/**
 * 处理从批量设置中移除教师
 */
const handleRemoveFromBatch = (teacher: Teacher): void => {
  const index = selectedTeachers.value.findIndex((t) => t.id === teacher.id);
  if (index !== -1) {
    selectedTeachers.value.splice(index, 1);
  }
  logger.debug(`${logPrefix} 从批量设置中移除教师`, { teacherId: teacher.id });
};

/**
 * 处理批量确认
 */
const handleBatchConfirm = (): void => {
  logger.info(`${logPrefix} 批量设置教师偏好`, {
    count: selectedTeachers.value.length,
    timeBias: batchForm.timeBias,
    weight: batchForm.weight,
  });

  selectedTeachers.value.forEach((teacher) => {
    const pref = getPreference(teacher.id);
    pref.timeBias = batchForm.timeBias;
    pref.weight = batchForm.weight;
  });

  hasChanges.value = true;
  batchDialogVisible.value = false;
  emit('change');

  ElMessage.success(`已批量设置 ${selectedTeachers.value.length} 位教师的偏好`);
};

/**
 * 处理查看偏好详情
 */
const handleViewPreference = (teacher: Teacher): void => {
  logger.info(`${logPrefix} 查看教师偏好详情`, { teacherId: teacher.id, teacherName: teacher.name });
  currentTeacher.value = teacher;
  detailDialogVisible.value = true;
};

/**
 * 处理保存
 */
const handleSave = async (): Promise<void> => {
  try {
    logger.info(`${logPrefix} 保存教师偏好`, { count: localPreferences.value.size });

    const result = await ElMessageBox.confirm(
      `确定要保存 ${localPreferences.value.size} 位教师的偏好设置吗？`,
      '确认保存',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning',
      }
    );

    if (result !== 'confirm') {
      return;
    }

    isSaving.value = true;

    // 转换为数组
    const preferences = Array.from(localPreferences.value.values());

    // 调用 store 方法保存
    await teacherStore.batchSaveTeacherPreferences(preferences);

    hasChanges.value = false;
    emit('save', preferences);

    ElMessage.success('教师偏好保存成功');
    logger.info(`${logPrefix} 教师偏好保存成功`, { count: preferences.length });
  } catch (error: any) {
    if (error !== 'cancel') {
      logger.error(`${logPrefix} 保存教师偏好失败`, { error });
      ElMessage.error('保存教师偏好失败');
    }
  } finally {
    isSaving.value = false;
  }
};

/**
 * 处理重置
 */
const handleReset = async (): Promise<void> => {
  try {
    const result = await ElMessageBox.confirm(
      '确定要重置所有未保存的更改吗？',
      '确认重置',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning',
      }
    );

    if (result !== 'confirm') {
      return;
    }

    logger.info(`${logPrefix} 重置教师偏好`);

    // 重新加载数据
    await loadPreferences();

    hasChanges.value = false;
    ElMessage.success('已重置所有更改');
  } catch (error: any) {
    if (error !== 'cancel') {
      logger.error(`${logPrefix} 重置失败`, { error });
    }
  }
};

/**
 * 加载教师偏好数据
 */
const loadPreferences = async (): Promise<void> => {
  try {
    logger.info(`${logPrefix} 加载教师偏好数据`);

    // 加载教师列表
    await teacherStore.loadTeachers();

    // 从 store 加载已保存的偏好
    localPreferences.value.clear();
    teacherStore.preferences.forEach((pref, teacherId) => {
      localPreferences.value.set(teacherId, { ...pref });
    });

    logger.info(`${logPrefix} 教师偏好数据加载成功`, {
      teacherCount: teacherStore.teacherCount,
      preferenceCount: localPreferences.value.size,
    });
  } catch (error) {
    logger.error(`${logPrefix} 加载教师偏好数据失败`, { error });
    ElMessage.error('加载教师偏好数据失败');
  }
};

// ========== 生命周期 ==========
onMounted(() => {
  logger.info(`${logPrefix} TeacherPreference 组件挂载`, {
    cycleDays: props.cycleDays,
    periodsPerDay: props.periodsPerDay,
  });

  // 加载数据
  loadPreferences();
});
</script>

<style scoped lang="scss">
.teacher-preference-container {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  background-color: #fff;
  border-radius: 4px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.preference-toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px;
  border-bottom: 1px solid #e0e0e0;

  .toolbar-left {
    display: flex;
    gap: 12px;
    align-items: center;
  }

  .toolbar-right {
    display: flex;
    gap: 12px;
    align-items: center;
  }
}

.preference-table-wrapper {
  flex: 1;
  overflow: hidden;
  padding: 16px;
}

.teacher-name {
  font-weight: 500;
  color: #303133;
}

.text-muted {
  color: #909399;
}

// 时段编辑器样式
.slots-editor {
  .slots-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 16px;
  }

  .slots-grid {
    overflow-x: auto;
    margin-bottom: 16px;
  }

  .slots-table {
    width: 100%;
    border-collapse: collapse;
    table-layout: fixed;

    thead {
      th {
        background-color: #f5f7fa;
        color: #606266;
        font-weight: 600;
        font-size: 14px;
        padding: 12px 8px;
        text-align: center;
        border: 1px solid #e0e0e0;
        white-space: nowrap;
      }
    }

    tbody {
      .period-label {
        background-color: #fafafa;
        font-weight: 500;
        text-align: center;
        padding: 8px;
        border: 1px solid #e0e0e0;
        width: 80px;
      }

      .slot-cell {
        border: 1px solid #e0e0e0;
        padding: 8px;
        text-align: center;
        cursor: pointer;
        transition: all 0.2s ease;
        background-color: #fff;
        min-height: 50px;
        height: 50px;

        &:hover {
          background-color: #f5f7fa;
        }

        &.slot-prefer {
          background-color: #e8f5e9;
          color: #4caf50;
          font-weight: 600;

          &:hover {
            background-color: #c8e6c9;
          }
        }

        &.slot-forbidden {
          background-color: #ffebee;
          color: #f44336;
          font-weight: 600;

          &:hover {
            background-color: #ffcdd2;
          }
        }

        .slot-content {
          display: flex;
          justify-content: center;
          align-items: center;
          height: 100%;
          font-size: 16px;
        }
      }
    }
  }

  .slots-legend {
    display: flex;
    gap: 24px;
    justify-content: center;
    padding: 12px;
    background-color: #f5f7fa;
    border-radius: 4px;

    .legend-item {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 14px;
      color: #606266;

      .legend-color {
        width: 24px;
        height: 24px;
        border-radius: 4px;
        border: 1px solid #e0e0e0;

        &.prefer {
          background-color: #e8f5e9;
        }

        &.dislike {
          background-color: #fff;
        }

        &.forbidden {
          background-color: #ffebee;
        }
      }
    }
  }
}

// 响应式设计
@media (max-width: 1200px) {
  .preference-toolbar {
    flex-direction: column;
    gap: 12px;

    .toolbar-left,
    .toolbar-right {
      width: 100%;
      justify-content: center;
    }
  }

  .slots-table {
    font-size: 12px;

    .period-label {
      width: 60px;
      font-size: 12px;
    }

    .slot-cell {
      min-height: 40px;
      height: 40px;
      padding: 4px;

      .slot-content {
        font-size: 14px;
      }
    }
  }
}

@media (max-width: 768px) {
  .preference-toolbar {
    .toolbar-left,
    .toolbar-right {
      flex-direction: column;
    }
  }

  .slots-table {
    .period-label {
      width: 50px;
      font-size: 11px;
      padding: 4px;
    }

    .slot-cell {
      min-height: 35px;
      height: 35px;
      padding: 2px;

      .slot-content {
        font-size: 12px;
      }
    }
  }
}
</style>
