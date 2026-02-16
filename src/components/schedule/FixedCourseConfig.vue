<!--
  固定课程配置组件
  提供固定课程的设置、查看和管理功能

  功能特性：
  - 显示当前所有固定课程列表
  - 支持添加新的固定课程
  - 支持批量设置固定课程
  - 支持解除固定课程
  - 提供固定课程的筛选和搜索
-->
<template>
  <div class="fixed-course-config">
    <!-- 工具栏 -->
    <div class="toolbar">
      <div class="toolbar-left">
        <el-input
          v-model="searchText"
          placeholder="搜索班级、科目或教师"
          :prefix-icon="Search"
          clearable
          style="width: 300px"
          @input="handleSearch"
        />
      </div>
      <div class="toolbar-right">
        <el-button type="primary" :icon="Plus" @click="handleAdd">
          添加固定课程
        </el-button>
        <el-button :icon="Delete" :disabled="selectedRows.length === 0" @click="handleBatchRemove">
          批量解除 ({{ selectedRows.length }})
        </el-button>
      </div>
    </div>

    <!-- 固定课程列表 -->
    <el-table
      ref="tableRef"
      :data="filteredData"
      stripe
      border
      height="500"
      @selection-change="handleSelectionChange"
    >
      <el-table-column type="selection" width="55" />
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
      <el-table-column prop="weekType" label="周类型" width="100">
        <template #default="{ row }">
          <el-tag v-if="row.weekType === 'Every'" type="success" size="small">每周</el-tag>
          <el-tag v-else-if="row.weekType === 'Odd'" type="warning" size="small">单周</el-tag>
          <el-tag v-else-if="row.weekType === 'Even'" type="info" size="small">双周</el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="createdAt" label="设置时间" width="180" />
      <el-table-column label="操作" width="120" fixed="right">
        <template #default="{ row }">
          <el-button type="danger" size="small" link @click="handleRemove(row)">
            解除固定
          </el-button>
        </template>
      </el-table-column>
    </el-table>

    <!-- 分页 -->
    <div class="pagination">
      <el-pagination
        v-model:current-page="currentPage"
        v-model:page-size="pageSize"
        :page-sizes="[10, 20, 50, 100]"
        :total="totalCount"
        layout="total, sizes, prev, pager, next, jumper"
        @size-change="handleSizeChange"
        @current-change="handleCurrentChange"
      />
    </div>

    <!-- 添加固定课程对话框 -->
    <el-dialog
      v-model="dialogVisible"
      title="添加固定课程"
      width="600px"
      :before-close="handleDialogClose"
    >
      <el-form
        ref="formRef"
        :model="formData"
        :rules="formRules"
        label-width="100px"
      >
        <el-form-item label="班级" prop="classId">
          <el-select
            v-model="formData.classId"
            placeholder="请选择班级"
            filterable
            style="width: 100%"
          >
            <el-option
              v-for="cls in classList"
              :key="cls.id"
              :label="cls.name"
              :value="cls.id"
            />
          </el-select>
        </el-form-item>

        <el-form-item label="科目" prop="subjectId">
          <el-select
            v-model="formData.subjectId"
            placeholder="请选择科目"
            filterable
            style="width: 100%"
          >
            <el-option
              v-for="subject in subjectList"
              :key="subject.id"
              :label="subject.name"
              :value="subject.id"
            />
          </el-select>
        </el-form-item>

        <el-form-item label="教师" prop="teacherId">
          <el-select
            v-model="formData.teacherId"
            placeholder="请选择教师"
            filterable
            style="width: 100%"
          >
            <el-option
              v-for="teacher in teacherList"
              :key="teacher.id"
              :label="teacher.name"
              :value="teacher.id"
            />
          </el-select>
        </el-form-item>

        <el-form-item label="星期" prop="day">
          <el-select v-model="formData.day" placeholder="请选择星期" style="width: 100%">
            <el-option
              v-for="day in cycleDays"
              :key="day"
              :label="`星期${day + 1}`"
              :value="day"
            />
          </el-select>
        </el-form-item>

        <el-form-item label="节次" prop="period">
          <el-select v-model="formData.period" placeholder="请选择节次" style="width: 100%">
            <el-option
              v-for="period in periodsPerDay"
              :key="period"
              :label="`第${period + 1}节`"
              :value="period"
            />
          </el-select>
        </el-form-item>

        <el-form-item label="周类型" prop="weekType">
          <el-radio-group v-model="formData.weekType">
            <el-radio label="Every">每周</el-radio>
            <el-radio label="Odd">单周</el-radio>
            <el-radio label="Even">双周</el-radio>
          </el-radio-group>
        </el-form-item>
      </el-form>

      <template #footer>
        <el-button @click="handleDialogClose">取消</el-button>
        <el-button type="primary" :loading="isSubmitting" @click="handleSubmit">
          确定
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { ElMessage, ElMessageBox, type FormInstance, type FormRules } from 'element-plus';
import { Search, Plus, Delete } from '@element-plus/icons-vue';
import { logger } from '@/utils/logger';
import type { ScheduleEntry, TimeSlot } from '@/stores/scheduleStore';

// ========== Props ==========
interface Props {
  cycleDays?: number;
  periodsPerDay?: number;
}

const props = withDefaults(defineProps<Props>(), {
  cycleDays: 5,
  periodsPerDay: 8,
});

// ========== Emits ==========
const emit = defineEmits<{
  add: [entry: ScheduleEntry];
  remove: [entry: ScheduleEntry];
  batchRemove: [entries: ScheduleEntry[]];
  refresh: [];
}>();

// ========== 状态 ==========

/** 搜索文本 */
const searchText = ref('');

/** 选中的行 */
const selectedRows = ref<ScheduleEntry[]>([]);

/** 当前页码 */
const currentPage = ref(1);

/** 每页大小 */
const pageSize = ref(20);

/** 固定课程列表 */
const fixedCourses = ref<ScheduleEntry[]>([]);

/** 班级列表 */
const classList = ref<Array<{ id: number; name: string }>>([]);

/** 科目列表 */
const subjectList = ref<Array<{ id: string; name: string }>>([]);

/** 教师列表 */
const teacherList = ref<Array<{ id: number; name: string }>>([]);

/** 对话框是否可见 */
const dialogVisible = ref(false);

/** 是否正在提交 */
const isSubmitting = ref(false);

/** 表单引用 */
const formRef = ref<FormInstance>();

/** 表单数据 */
const formData = ref({
  classId: null as number | null,
  subjectId: null as string | null,
  teacherId: null as number | null,
  day: null as number | null,
  period: null as number | null,
  weekType: 'Every' as 'Every' | 'Odd' | 'Even',
});

/** 表单验证规则 */
const formRules: FormRules = {
  classId: [{ required: true, message: '请选择班级', trigger: 'change' }],
  subjectId: [{ required: true, message: '请选择科目', trigger: 'change' }],
  teacherId: [{ required: true, message: '请选择教师', trigger: 'change' }],
  day: [{ required: true, message: '请选择星期', trigger: 'change' }],
  period: [{ required: true, message: '请选择节次', trigger: 'change' }],
  weekType: [{ required: true, message: '请选择周类型', trigger: 'change' }],
};

// ========== 计算属性 ==========

/** 过滤后的数据 */
const filteredData = computed(() => {
  if (!searchText.value) {
    return paginatedData.value;
  }

  const keyword = searchText.value.toLowerCase();
  return fixedCourses.value.filter((item) => {
    const className = getClassName(item.classId).toLowerCase();
    const subjectId = item.subjectId.toLowerCase();
    const teacherName = getTeacherName(item.teacherId).toLowerCase();
    return (
      className.includes(keyword) ||
      subjectId.includes(keyword) ||
      teacherName.includes(keyword)
    );
  });
});

/** 分页后的数据 */
const paginatedData = computed(() => {
  const start = (currentPage.value - 1) * pageSize.value;
  const end = start + pageSize.value;
  return fixedCourses.value.slice(start, end);
});

/** 总数 */
const totalCount = computed(() => fixedCourses.value.length);

// ========== 方法 ==========

/**
 * 获取班级名称
 */
const getClassName = (classId: number): string => {
  const cls = classList.value.find((c) => c.id === classId);
  return cls?.name || `班级${classId}`;
};

/**
 * 获取教师姓名
 */
const getTeacherName = (teacherId: number): string => {
  const teacher = teacherList.value.find((t) => t.id === teacherId);
  return teacher?.name || `教师${teacherId}`;
};

/**
 * 处理搜索
 */
const handleSearch = (): void => {
  logger.debug('搜索固定课程', { keyword: searchText.value });
  currentPage.value = 1;
};

/**
 * 处理选择变更
 */
const handleSelectionChange = (selection: ScheduleEntry[]): void => {
  selectedRows.value = selection;
  logger.debug('选择变更', { count: selection.length });
};

/**
 * 处理添加
 */
const handleAdd = (): void => {
  logger.info('打开添加固定课程对话框');
  dialogVisible.value = true;
};

/**
 * 处理移除
 */
const handleRemove = async (entry: ScheduleEntry): Promise<void> => {
  logger.info('解除固定课程', { entry });

  try {
    await ElMessageBox.confirm('确定要解除该固定课程吗？', '确认操作', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning',
    });

    emit('remove', entry);
    await loadFixedCourses();
    ElMessage.success('解除成功');
  } catch (error: any) {
    if (error === 'cancel') {
      logger.info('用户取消解除固定课程');
      return;
    }
    logger.error('解除固定课程失败', { error });
    ElMessage.error('解除失败');
  }
};

/**
 * 处理批量移除
 */
const handleBatchRemove = async (): Promise<void> => {
  logger.info('批量解除固定课程', { count: selectedRows.value.length });

  try {
    await ElMessageBox.confirm(
      `确定要解除选中的 ${selectedRows.value.length} 个固定课程吗？`,
      '确认操作',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning',
      },
    );

    emit('batchRemove', selectedRows.value);
    await loadFixedCourses();
    selectedRows.value = [];
    ElMessage.success('批量解除成功');
  } catch (error: any) {
    if (error === 'cancel') {
      logger.info('用户取消批量解除固定课程');
      return;
    }
    logger.error('批量解除固定课程失败', { error });
    ElMessage.error('批量解除失败');
  }
};

/**
 * 处理对话框关闭
 */
const handleDialogClose = (): void => {
  logger.debug('关闭添加固定课程对话框');
  dialogVisible.value = false;
  formRef.value?.resetFields();
};

/**
 * 处理提交
 */
const handleSubmit = async (): Promise<void> => {
  logger.info('提交添加固定课程表单');

  try {
    await formRef.value?.validate();

    isSubmitting.value = true;

    const entry: ScheduleEntry = {
      classId: formData.value.classId!,
      subjectId: formData.value.subjectId!,
      teacherId: formData.value.teacherId!,
      timeSlot: {
        day: formData.value.day!,
        period: formData.value.period!,
      },
      isFixed: true,
      weekType: formData.value.weekType,
    };

    emit('add', entry);
    await loadFixedCourses();

    ElMessage.success('添加成功');
    handleDialogClose();
  } catch (error) {
    logger.error('添加固定课程失败', { error });
    ElMessage.error('添加失败');
  } finally {
    isSubmitting.value = false;
  }
};

/**
 * 处理页码变更
 */
const handleCurrentChange = (page: number): void => {
  logger.debug('页码变更', { page });
  currentPage.value = page;
};

/**
 * 处理每页大小变更
 */
const handleSizeChange = (size: number): void => {
  logger.debug('每页大小变更', { size });
  pageSize.value = size;
  currentPage.value = 1;
};

/**
 * 加载固定课程列表
 */
const loadFixedCourses = async (): Promise<void> => {
  try {
    logger.info('加载固定课程列表');

    // TODO: 调用 API 获取固定课程列表
    // const response = await ScheduleApi.getFixedCourses();
    // fixedCourses.value = response.data || [];

    logger.info('固定课程列表加载成功', { count: fixedCourses.value.length });
  } catch (error) {
    logger.error('加载固定课程列表失败', { error });
    ElMessage.error('加载失败');
  }
};

/**
 * 加载基础数据
 */
const loadBaseData = async (): Promise<void> => {
  try {
    logger.info('加载基础数据');

    // TODO: 调用 API 获取班级、科目、教师列表
    // const [classes, subjects, teachers] = await Promise.all([
    //   ClassApi.getAll(),
    //   SubjectApi.getAll(),
    //   TeacherApi.getAll(),
    // ]);
    // classList.value = classes.data || [];
    // subjectList.value = subjects.data || [];
    // teacherList.value = teachers.data || [];

    logger.info('基础数据加载成功');
  } catch (error) {
    logger.error('加载基础数据失败', { error });
  }
};

// ========== 生命周期 ==========
onMounted(() => {
  logger.info('固定课程配置组件挂载');
  loadFixedCourses();
  loadBaseData();
});
</script>

<style scoped lang="scss">
.fixed-course-config {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  padding: 20px;
  background-color: #fff;
}

.toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;

  .toolbar-left {
    display: flex;
    gap: 12px;
  }

  .toolbar-right {
    display: flex;
    gap: 12px;
  }
}

.pagination {
  display: flex;
  justify-content: flex-end;
  margin-top: 20px;
}

// 响应式设计
@media (max-width: 768px) {
  .fixed-course-config {
    padding: 12px;
  }

  .toolbar {
    flex-direction: column;
    gap: 12px;

    .toolbar-left,
    .toolbar-right {
      width: 100%;
      justify-content: center;
    }
  }
}
</style>
