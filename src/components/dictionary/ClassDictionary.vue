<!--
  班级字典组件
-->
<template>
  <div class="class-dictionary">
    <div class="toolbar">
      <el-input
        v-model="searchKeyword"
        placeholder="搜索班级名称"
        :prefix-icon="Search"
        clearable
        style="width: 240px"
      />
      <el-select
        v-model="selectedGrade"
        placeholder="按年级筛选"
        clearable
        style="width: 180px"
      >
        <el-option label="全部年级" value="" />
        <el-option
          v-for="grade in grades"
          :key="grade"
          :label="grade"
          :value="grade"
        />
      </el-select>
      <el-button type="primary" :icon="Plus" @click="handleAdd">添加班级</el-button>
    </div>

    <el-table
      :data="filteredClasses"
      border
      stripe
      max-height="600"
      style="width: 100%"
    >
      <el-table-column type="index" label="序号" width="60" align="center" />
      <el-table-column prop="name" label="班级名称" width="150" />
      <el-table-column prop="grade" label="年级" width="120">
        <template #default="{ row }">
          <el-tag v-if="row.grade" size="small" type="success">
            {{ row.grade }}
          </el-tag>
          <span v-else class="text-muted">-</span>
        </template>
      </el-table-column>
      <el-table-column prop="studentCount" label="学生人数" width="120" align="center">
        <template #default="{ row }">
          {{ row.studentCount || '-' }}
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
      v-if="filteredClasses.length === 0"
      description="暂无班级数据，请先导入数据或手动添加"
    />

    <!-- 添加/编辑对话框 -->
    <el-dialog
      v-model="dialogVisible"
      :title="dialogTitle"
      width="500px"
    >
      <el-form :model="formData" label-width="100px">
        <el-form-item label="班级名称" required>
          <el-input v-model="formData.name" placeholder="请输入班级名称" />
        </el-form-item>
        <el-form-item label="年级">
          <el-select v-model="formData.grade" placeholder="请选择年级" clearable style="width: 100%">
            <el-option
              v-for="grade in allGrades"
              :key="grade.name"
              :label="grade.name"
              :value="grade.name"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="学生人数">
          <el-input-number v-model="formData.studentCount" :min="1" :max="100" />
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
import { ref, computed } from 'vue';
import { Search, Plus, Edit, Delete } from '@element-plus/icons-vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import { useClassStore, type Class } from '@/stores/classStore';
import { useGradeStore } from '@/stores/gradeStore';

const classStore = useClassStore();
const gradeStore = useGradeStore();
const searchKeyword = ref('');
const selectedGrade = ref('');
const dialogVisible = ref(false);
const isEditing = ref(false);
const currentId = ref<number>();

const formData = ref<Partial<Class>>({
  name: '',
  grade: '',
  studentCount: undefined,
});

const dialogTitle = computed(() => isEditing.value ? '编辑班级' : '添加班级');

// 所有年级列表
const allGrades = computed(() => gradeStore.grades);

const grades = computed(() => {
  const gradeSet = new Set<string>();
  classStore.classes.forEach(c => {
    if (c.grade) gradeSet.add(c.grade);
  });
  return Array.from(gradeSet).sort();
});

const filteredClasses = computed(() => {
  let result = [...classStore.classes];
  if (selectedGrade.value) {
    result = result.filter(c => c.grade === selectedGrade.value);
  }
  if (searchKeyword.value) {
    const keyword = searchKeyword.value.toLowerCase();
    result = result.filter(c => c.name.toLowerCase().includes(keyword));
  }
  return result;
});

const formatDate = (dateStr?: string): string => {
  if (!dateStr) return '-';
  return new Date(dateStr).toLocaleString('zh-CN');
};

const handleAdd = () => {
  isEditing.value = false;
  formData.value = { name: '', grade: '', studentCount: undefined };
  dialogVisible.value = true;
};

const handleEdit = (row: Class) => {
  isEditing.value = true;
  currentId.value = row.id;
  formData.value = { ...row };
  dialogVisible.value = true;
};

const handleSave = () => {
  if (!formData.value.name?.trim()) {
    ElMessage.warning('请输入班级名称');
    return;
  }

  if (isEditing.value && currentId.value) {
    classStore.updateClass(currentId.value, formData.value);
    ElMessage.success('更新成功');
  } else {
    classStore.addClass(formData.value as Omit<Class, 'id' | 'createdAt' | 'updatedAt'>);
    ElMessage.success('添加成功');
  }

  dialogVisible.value = false;
};

const handleDelete = (row: Class) => {
  ElMessageBox.confirm(`确定要删除班级"${row.name}"吗？`, '提示', {
    confirmButtonText: '确定',
    cancelButtonText: '取消',
    type: 'warning',
  }).then(() => {
    if (row.id) {
      classStore.deleteClass(row.id);
      ElMessage.success('删除成功');
    }
  });
};
</script>

<style scoped lang="scss">
.class-dictionary {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.toolbar {
  display: flex;
  gap: 12px;
  padding: 16px;
  background-color: #f5f7fa;
  border-radius: 4px;
}

.text-muted {
  color: #909399;
}
</style>
