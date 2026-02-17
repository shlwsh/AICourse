<!--
  年级字典组件
-->
<template>
  <div class="grade-dictionary">
    <div class="toolbar">
      <el-input
        v-model="searchKeyword"
        placeholder="搜索年级名称"
        :prefix-icon="Search"
        clearable
        style="width: 240px"
      />
      <el-button type="primary" :icon="Plus" @click="handleAdd">添加年级</el-button>
    </div>

    <el-table
      :data="filteredGrades"
      border
      stripe
      max-height="600"
      style="width: 100%"
    >
      <el-table-column type="index" label="序号" width="60" align="center" />
      <el-table-column prop="name" label="年级名称" width="200" />
      <el-table-column prop="order" label="排序" width="100" align="center">
        <template #default="{ row }">
          {{ row.order || '-' }}
        </template>
      </el-table-column>
      <el-table-column prop="createdAt" label="创建时间" width="180">
        <template #default="{ row }">
          {{ formatDate(row.createdAt) }}
        </template>
      </el-table-column>
      <el-table-column label="操作" width="150" align="center">
        <template #default="{ row }">
          <el-button type="primary" size="small" :icon="Edit" @click="handleEdit(row)" />
          <el-button type="danger" size="small" :icon="Delete" @click="handleDelete(row)" />
        </template>
      </el-table-column>
    </el-table>

    <el-empty
      v-if="filteredGrades.length === 0"
      description="暂无年级数据"
    />

    <!-- 添加/编辑对话框 -->
    <el-dialog
      v-model="dialogVisible"
      :title="dialogTitle"
      width="500px"
    >
      <el-form :model="formData" label-width="100px">
        <el-form-item label="年级名称" required>
          <el-input v-model="formData.name" placeholder="请输入年级名称" />
        </el-form-item>
        <el-form-item label="排序">
          <el-input-number v-model="formData.order" :min="1" :max="100" />
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
import { useGradeStore, type Grade } from '@/stores/gradeStore';

const gradeStore = useGradeStore();
const searchKeyword = ref('');
const dialogVisible = ref(false);
const isEditing = ref(false);
const currentId = ref<number>();

const formData = ref<Partial<Grade>>({
  name: '',
  order: 1,
});

const dialogTitle = computed(() => isEditing.value ? '编辑年级' : '添加年级');

const filteredGrades = computed(() => {
  let result = [...gradeStore.grades];
  if (searchKeyword.value) {
    const keyword = searchKeyword.value.toLowerCase();
    result = result.filter(g => g.name.toLowerCase().includes(keyword));
  }
  return result.sort((a, b) => (a.order || 0) - (b.order || 0));
});

const formatDate = (dateStr?: string): string => {
  if (!dateStr) return '-';
  return new Date(dateStr).toLocaleString('zh-CN');
};

const handleAdd = () => {
  isEditing.value = false;
  formData.value = { name: '', order: 1 };
  dialogVisible.value = true;
};

const handleEdit = (row: Grade) => {
  isEditing.value = true;
  currentId.value = row.id;
  formData.value = { ...row };
  dialogVisible.value = true;
};

const handleSave = () => {
  if (!formData.value.name?.trim()) {
    ElMessage.warning('请输入年级名称');
    return;
  }

  if (isEditing.value && currentId.value) {
    gradeStore.updateGrade(currentId.value, formData.value);
    ElMessage.success('更新成功');
  } else {
    gradeStore.addGrade(formData.value as Omit<Grade, 'id' | 'createdAt' | 'updatedAt'>);
    ElMessage.success('添加成功');
  }

  dialogVisible.value = false;
};

const handleDelete = (row: Grade) => {
  ElMessageBox.confirm('确定要删除该年级吗？', '提示', {
    confirmButtonText: '确定',
    cancelButtonText: '取消',
    type: 'warning',
  }).then(() => {
    if (row.id) {
      gradeStore.deleteGrade(row.id);
      ElMessage.success('删除成功');
    }
  });
};
</script>

<style scoped lang="scss">
.grade-dictionary {
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
</style>
