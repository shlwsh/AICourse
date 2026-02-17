<!--
  教研组字典组件
-->
<template>
  <div class="teaching-group-dictionary">
    <div class="toolbar">
      <el-input
        v-model="searchKeyword"
        placeholder="搜索教研组名称"
        :prefix-icon="Search"
        clearable
        style="width: 240px"
      />
      <el-button type="primary" :icon="Plus" @click="handleAdd">添加教研组</el-button>
    </div>

    <el-table
      :data="filteredTeachingGroups"
      border
      stripe
      max-height="600"
      style="width: 100%"
    >
      <el-table-column type="index" label="序号" width="60" align="center" />
      <el-table-column prop="name" label="教研组名称" width="200" />
      <el-table-column prop="description" label="描述" min-width="300">
        <template #default="{ row }">
          {{ row.description || '-' }}
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
      v-if="filteredTeachingGroups.length === 0"
      description="暂无教研组数据"
    />

    <!-- 添加/编辑对话框 -->
    <el-dialog
      v-model="dialogVisible"
      :title="dialogTitle"
      width="500px"
    >
      <el-form :model="formData" label-width="100px">
        <el-form-item label="教研组名称" required>
          <el-input v-model="formData.name" placeholder="请输入教研组名称" />
        </el-form-item>
        <el-form-item label="描述">
          <el-input
            v-model="formData.description"
            type="textarea"
            :rows="3"
            placeholder="请输入描述"
          />
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
import { useConfigStore, type TeachingGroupConfig } from '@/stores/configStore';

const configStore = useConfigStore();
const searchKeyword = ref('');
const dialogVisible = ref(false);
const isEditing = ref(false);
const currentId = ref<number>();

const formData = ref<Partial<TeachingGroupConfig>>({
  id: 0,
  name: '',
  description: '',
  createdAt: '',
});

const dialogTitle = computed(() => isEditing.value ? '编辑教研组' : '添加教研组');

const filteredTeachingGroups = computed(() => {
  let result = [...configStore.teachingGroupConfigs];
  if (searchKeyword.value) {
    const keyword = searchKeyword.value.toLowerCase();
    result = result.filter(g => g.name.toLowerCase().includes(keyword));
  }
  return result;
});

const formatDate = (dateStr?: string): string => {
  if (!dateStr) return '-';
  return new Date(dateStr).toLocaleString('zh-CN');
};

const handleAdd = () => {
  isEditing.value = false;
  formData.value = { id: Date.now(), name: '', description: '', createdAt: '' };
  dialogVisible.value = true;
};

const handleEdit = (row: TeachingGroupConfig) => {
  isEditing.value = true;
  currentId.value = row.id;
  formData.value = { ...row };
  dialogVisible.value = true;
};

const handleSave = async () => {
  if (!formData.value.name?.trim()) {
    ElMessage.warning('请输入教研组名称');
    return;
  }

  try {
    if (!isEditing.value) {
      formData.value.createdAt = new Date().toISOString();
    }
    await configStore.saveTeachingGroupConfig(formData.value as TeachingGroupConfig);
    ElMessage.success(isEditing.value ? '更新成功' : '添加成功');
    dialogVisible.value = false;
  } catch (error) {
    ElMessage.error('保存失败');
  }
};

const handleDelete = async (row: TeachingGroupConfig) => {
  try {
    await ElMessageBox.confirm('确定要删除该教研组吗？', '提示', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning',
    });
    await configStore.deleteTeachingGroupConfig(row.id);
    ElMessage.success('删除成功');
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error('删除失败');
    }
  }
};
</script>

<style scoped lang="scss">
.teaching-group-dictionary {
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
