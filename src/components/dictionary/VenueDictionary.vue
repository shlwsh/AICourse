<!--
  场地字典组件
-->
<template>
  <div class="venue-dictionary">
    <div class="toolbar">
      <el-input
        v-model="searchKeyword"
        placeholder="搜索场地名称"
        :prefix-icon="Search"
        clearable
        style="width: 240px"
      />
      <el-button type="primary" :icon="Plus" @click="handleAdd">添加场地</el-button>
    </div>

    <el-table
      :data="filteredVenues"
      border
      stripe
      max-height="600"
      style="width: 100%"
    >
      <el-table-column type="index" label="序号" width="60" align="center" />
      <el-table-column prop="id" label="场地ID" width="150" />
      <el-table-column prop="name" label="场地名称" width="200" />
      <el-table-column prop="type" label="场地类型" width="150">
        <template #default="{ row }">
          <el-tag v-if="row.type" size="small">{{ row.type }}</el-tag>
          <span v-else class="text-muted">-</span>
        </template>
      </el-table-column>
      <el-table-column prop="capacity" label="容量" width="120" align="center">
        <template #default="{ row }">
          <el-tag type="success">{{ row.capacity }}</el-tag>
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
      v-if="filteredVenues.length === 0"
      description="暂无场地数据"
    />

    <!-- 添加/编辑对话框 -->
    <el-dialog
      v-model="dialogVisible"
      :title="dialogTitle"
      width="500px"
    >
      <el-form :model="formData" label-width="100px">
        <el-form-item label="场地ID" required>
          <el-input v-model="formData.id" placeholder="请输入场地ID" :disabled="isEditing" />
        </el-form-item>
        <el-form-item label="场地名称" required>
          <el-input v-model="formData.name" placeholder="请输入场地名称" />
        </el-form-item>
        <el-form-item label="场地类型">
          <el-select v-model="formData.type" placeholder="请选择场地类型" clearable>
            <el-option label="普通教室" value="普通教室" />
            <el-option label="实验室" value="实验室" />
            <el-option label="多媒体教室" value="多媒体教室" />
            <el-option label="体育场馆" value="体育场馆" />
            <el-option label="其他" value="其他" />
          </el-select>
        </el-form-item>
        <el-form-item label="容量" required>
          <el-input-number v-model="formData.capacity" :min="1" :max="1000" />
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
import { useConfigStore, type VenueConfig } from '@/stores/configStore';

const configStore = useConfigStore();
const searchKeyword = ref('');
const dialogVisible = ref(false);
const isEditing = ref(false);
const currentId = ref<string>();

const formData = ref<Partial<VenueConfig>>({
  id: '',
  name: '',
  type: '',
  capacity: 1,
  createdAt: '',
});

const dialogTitle = computed(() => isEditing.value ? '编辑场地' : '添加场地');

const filteredVenues = computed(() => {
  let result = [...configStore.venueConfigs];
  if (searchKeyword.value) {
    const keyword = searchKeyword.value.toLowerCase();
    result = result.filter(v => v.name.toLowerCase().includes(keyword));
  }
  return result;
});

const formatDate = (dateStr?: string): string => {
  if (!dateStr) return '-';
  return new Date(dateStr).toLocaleString('zh-CN');
};

const handleAdd = () => {
  isEditing.value = false;
  formData.value = { id: '', name: '', type: '', capacity: 1, createdAt: '' };
  dialogVisible.value = true;
};

const handleEdit = (row: VenueConfig) => {
  isEditing.value = true;
  currentId.value = row.id;
  formData.value = { ...row };
  dialogVisible.value = true;
};

const handleSave = async () => {
  if (!formData.value.name?.trim()) {
    ElMessage.warning('请输入场地名称');
    return;
  }

  if (!formData.value.id?.trim()) {
    ElMessage.warning('请输入场地ID');
    return;
  }

  if (!formData.value.capacity || formData.value.capacity < 1) {
    ElMessage.warning('请输入有效的容量');
    return;
  }

  try {
    if (!isEditing.value) {
      formData.value.createdAt = new Date().toISOString();
    }
    await configStore.saveVenueConfig(formData.value as VenueConfig);
    ElMessage.success(isEditing.value ? '更新成功' : '添加成功');
    dialogVisible.value = false;
  } catch (error) {
    ElMessage.error('保存失败');
  }
};

const handleDelete = async (row: VenueConfig) => {
  try {
    await ElMessageBox.confirm('确定要删除该场地吗？', '提示', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning',
    });
    await configStore.deleteVenueConfig(row.id);
    ElMessage.success('删除成功');
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error('删除失败');
    }
  }
};
</script>

<style scoped lang="scss">
.venue-dictionary {
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
