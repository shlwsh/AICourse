<!--
  教学计划管理页面
  独立的教学计划管理界面，提供人性化的添加和编辑功能
-->
<template>
  <div class="curriculum-page">
    <!-- 页面头部 -->
    <div class="page-header">
      <div class="header-left">
        <h2 class="page-title">教学计划管理</h2>
        <el-breadcrumb separator="/">
          <el-breadcrumb-item :to="{ path: '/' }">首页</el-breadcrumb-item>
          <el-breadcrumb-item>教学计划</el-breadcrumb-item>
        </el-breadcrumb>
      </div>

      <div class="header-right">
        <el-tag type="info" size="large">
          总计：{{ curriculumCount }} 条计划
        </el-tag>
        <el-button type="primary" :icon="Plus" @click="handleAdd">添加教学计划</el-button>
      </div>
    </div>

    <!-- 筛选工具栏 -->
    <div class="filter-toolbar">
      <el-input
        v-model="searchKeyword"
        placeholder="搜索班级/科目/教师"
        :prefix-icon="Search"
        clearable
        style="width: 240px"
      />
      <el-select
        v-model="selectedClass"
        placeholder="按班级筛选"
        clearable
        style="width: 180px"
      >
        <el-option label="全部班级" value="" />
        <el-option
          v-for="cls in classList"
          :key="cls.name"
          :label="cls.name"
          :value="cls.name"
        />
      </el-select>
      <el-select
        v-model="selectedSubject"
        placeholder="按科目筛选"
        clearable
        style="width: 180px"
      >
        <el-option label="全部科目" value="" />
        <el-option
          v-for="subject in subjectList"
          :key="subject.name"
          :label="subject.name"
          :value="subject.name"
        />
      </el-select>
    </div>

    <!-- 数据表格 -->
    <div class="page-content">
      <el-table
        :data="filteredCurriculums"
        border
        stripe
        max-height="600"
        style="width: 100%"
      >
        <el-table-column type="index" label="序号" width="60" align="center" />
        <el-table-column prop="className" label="班级" width="150" sortable />
        <el-table-column prop="subjectName" label="科目" width="150" sortable />
        <el-table-column prop="teacherName" label="教师" width="150" sortable />
        <el-table-column prop="hoursPerWeek" label="周课时数" width="120" align="center" sortable />
        <el-table-column prop="requiresConsecutive" label="需要连排" width="120" align="center">
          <template #default="{ row }">
            <el-tag v-if="row.requiresConsecutive" size="small" type="danger">是</el-tag>
            <el-tag v-else size="small" type="info">否</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="createdAt" label="创建时间" width="180">
          <template #default="{ row }">
            {{ formatDate(row.createdAt) }}
          </template>
        </el-table-column>
        <el-table-column label="操作" width="150" align="center" fixed="right">
          <template #default="{ row }">
            <el-button type="primary" size="small" :icon="Edit" @click="handleEdit(row)" />
            <el-button type="danger" size="small" :icon="Delete" @click="handleDelete(row)" />
          </template>
        </el-table-column>
      </el-table>

      <el-empty
        v-if="filteredCurriculums.length === 0"
        description="暂无教学计划数据，请先导入数据或手动添加"
      />
    </div>

    <!-- 添加/编辑对话框 -->
    <el-dialog
      v-model="dialogVisible"
      :title="dialogTitle"
      width="600px"
    >
      <el-form :model="formData" label-width="120px">
        <el-form-item label="班级" required>
          <el-select
            v-model="formData.className"
            placeholder="请选择班级"
            filterable
            style="width: 100%"
          >
            <el-option
              v-for="cls in classList"
              :key="cls.name"
              :label="cls.name"
              :value="cls.name"
            />
          </el-select>
        </el-form-item>

        <el-form-item label="科目" required>
          <el-select
            v-model="formData.subjectName"
            placeholder="请选择科目"
            filterable
            style="width: 100%"
          >
            <el-option
              v-for="subject in subjectList"
              :key="subject.name"
              :label="subject.name"
              :value="subject.name"
            />
          </el-select>
        </el-form-item>

        <el-form-item label="教师" required>
          <el-select
            v-model="formData.teacherName"
            placeholder="请选择教师"
            filterable
            style="width: 100%"
          >
            <el-option
              v-for="teacher in teacherList"
              :key="teacher.name"
              :label="`${teacher.name}${teacher.teachingGroup ? ' (' + teacher.teachingGroup + ')' : ''}`"
              :value="teacher.name"
            />
          </el-select>
        </el-form-item>

        <el-form-item label="周课时数" required>
          <el-input-number
            v-model="formData.hoursPerWeek"
            :min="1"
            :max="20"
            style="width: 100%"
          />
        </el-form-item>

        <el-form-item label="需要连排">
          <el-switch v-model="formData.requiresConsecutive" />
          <span class="form-tip">（连排：同一天内连续上课）</span>
        </el-form-item>
      </el-form>

      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handleSave">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { Search, Plus, Edit, Delete } from '@element-plus/icons-vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import { useCurriculumStore, type Curriculum } from '@/stores/curriculumStore';
import { useClassStore } from '@/stores/classStore';
import { useConfigStore } from '@/stores/configStore';
import { useTeacherStore } from '@/stores/teacherStore';
import { logger } from '@/utils/logger';

// ========== Store ==========
const curriculumStore = useCurriculumStore();
const classStore = useClassStore();
const configStore = useConfigStore();
const teacherStore = useTeacherStore();

// ========== 状态 ==========
const searchKeyword = ref('');
const selectedClass = ref('');
const selectedSubject = ref('');
const dialogVisible = ref(false);
const isEditing = ref(false);
const currentId = ref<number>();

const formData = ref<Partial<Curriculum>>({
  className: '',
  subjectName: '',
  teacherName: '',
  hoursPerWeek: 2,
  requiresConsecutive: false,
});

// ========== 计算属性 ==========
const curriculumCount = computed(() => curriculumStore.curriculumCount);
const classList = computed(() => classStore.classes);
const subjectList = computed(() => configStore.subjectConfigs);
const teacherList = computed(() => teacherStore.teachers);

const dialogTitle = computed(() => isEditing.value ? '编辑教学计划' : '添加教学计划');

const filteredCurriculums = computed(() => {
  let result = [...curriculumStore.curriculums];

  if (selectedClass.value) {
    result = result.filter(c => c.className === selectedClass.value);
  }

  if (selectedSubject.value) {
    result = result.filter(c => c.subjectName === selectedSubject.value);
  }

  if (searchKeyword.value) {
    const keyword = searchKeyword.value.toLowerCase();
    result = result.filter(c =>
      c.className.toLowerCase().includes(keyword) ||
      c.subjectName.toLowerCase().includes(keyword) ||
      c.teacherName.toLowerCase().includes(keyword)
    );
  }

  return result;
});

// ========== 方法 ==========
const formatDate = (dateStr?: string): string => {
  if (!dateStr) return '-';
  return new Date(dateStr).toLocaleString('zh-CN');
};

const handleAdd = () => {
  isEditing.value = false;
  formData.value = {
    className: '',
    subjectName: '',
    teacherName: '',
    hoursPerWeek: 2,
    requiresConsecutive: false,
  };
  dialogVisible.value = true;
};

const handleEdit = (row: Curriculum) => {
  isEditing.value = true;
  currentId.value = row.id;
  formData.value = { ...row };
  dialogVisible.value = true;
};

const handleSave = () => {
  if (!formData.value.className?.trim()) {
    ElMessage.warning('请选择班级');
    return;
  }
  if (!formData.value.subjectName?.trim()) {
    ElMessage.warning('请选择科目');
    return;
  }
  if (!formData.value.teacherName?.trim()) {
    ElMessage.warning('请选择教师');
    return;
  }
  if (!formData.value.hoursPerWeek || formData.value.hoursPerWeek < 1) {
    ElMessage.warning('请输入有效的周课时数');
    return;
  }

  if (isEditing.value && currentId.value) {
    curriculumStore.updateCurriculum(currentId.value, formData.value);
    ElMessage.success('更新成功');
  } else {
    curriculumStore.addCurriculum(formData.value as Omit<Curriculum, 'id' | 'createdAt' | 'updatedAt'>);
    ElMessage.success('添加成功');
  }

  dialogVisible.value = false;
};

const handleDelete = (row: Curriculum) => {
  ElMessageBox.confirm(
    `确定要删除教学计划"${row.className} - ${row.subjectName} - ${row.teacherName}"吗？`,
    '提示',
    {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning',
    }
  ).then(() => {
    if (row.id) {
      curriculumStore.deleteCurriculum(row.id);
      ElMessage.success('删除成功');
    }
  });
};

// ========== 生命周期 ==========
onMounted(() => {
  logger.info('[CurriculumPage] 教学计划管理页面挂载');
});
</script>

<style scoped lang="scss">
.curriculum-page {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  background-color: #f5f7fa;
  padding: 20px;
  gap: 16px;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  background-color: #fff;
  border-radius: 4px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);

  .header-left {
    display: flex;
    flex-direction: column;
    gap: 8px;

    .page-title {
      margin: 0;
      font-size: 24px;
      font-weight: 600;
      color: #303133;
    }
  }

  .header-right {
    display: flex;
    gap: 12px;
    align-items: center;
  }
}

.filter-toolbar {
  display: flex;
  gap: 12px;
  padding: 16px;
  background-color: #fff;
  border-radius: 4px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.page-content {
  flex: 1;
  overflow: hidden;
  background-color: #fff;
  border-radius: 4px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  padding: 20px;
}

.form-tip {
  margin-left: 12px;
  font-size: 12px;
  color: #909399;
}

@media (max-width: 1200px) {
  .page-header {
    flex-direction: column;
    gap: 16px;

    .header-left,
    .header-right {
      width: 100%;
      justify-content: center;
    }
  }

  .filter-toolbar {
    flex-wrap: wrap;
  }
}

@media (max-width: 768px) {
  .curriculum-page {
    padding: 10px;
  }

  .page-header {
    padding: 12px;

    .page-title {
      font-size: 20px;
    }
  }

  .page-content {
    padding: 12px;
  }
}
</style>
