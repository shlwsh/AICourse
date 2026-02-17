<!--
  科目字典组件
-->
<template>
  <div class="subject-dictionary">
    <div class="toolbar">
      <el-input
        v-model="searchKeyword"
        placeholder="搜索科目名称"
        :prefix-icon="Search"
        clearable
        style="width: 240px"
      />
      <el-select
        v-model="selectedCategory"
        placeholder="按类别筛选"
        clearable
        style="width: 180px"
      >
        <el-option label="全部类别" value="" />
        <el-option
          v-for="category in categories"
          :key="category"
          :label="category"
          :value="category"
        />
      </el-select>
      <el-button type="primary" :icon="Plus" @click="handleAdd">添加科目</el-button>
    </div>

    <el-table
      :data="filteredSubjects"
      border
      stripe
      max-height="600"
      style="width: 100%"
    >
      <el-table-column type="index" label="序号" width="60" align="center" />
      <el-table-column prop="id" label="科目ID" width="120" />
      <el-table-column prop="name" label="科目名称" width="150" />
      <el-table-column label="是否主科" width="100" align="center">
        <template #default="{ row }">
          <el-tag :type="row.isMajorSubject ? 'success' : 'info'" size="small">
            {{ row.isMajorSubject ? '是' : '否' }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column label="允许连堂" width="100" align="center">
        <template #default="{ row }">
          <el-tag :type="row.allowDoubleSession ? 'success' : 'warning'" size="small">
            {{ row.allowDoubleSession ? '是' : '否' }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="venueId" label="关联场地" width="150">
        <template #default="{ row }">
          <span v-if="row.venueId">{{ row.venueId }}</span>
          <span v-else class="text-muted">无</span>
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
      v-if="filteredSubjects.length === 0"
      description="暂无科目数据，请先导入数据或手动添加"
    />

    <!-- 添加/编辑对话框 -->
    <el-dialog
      v-model="dialogVisible"
      :title="dialogTitle"
      width="500px"
    >
      <el-form :model="formData" label-width="100px">
        <el-form-item label="科目ID" required>
          <el-input v-model="formData.id" placeholder="请输入科目ID（如：math）" :disabled="isEditing" />
        </el-form-item>
        <el-form-item label="科目名称" required>
          <el-input v-model="formData.name" placeholder="请输入科目名称" />
        </el-form-item>
        <el-form-item label="是否主科">
          <el-switch v-model="formData.isMajorSubject" />
        </el-form-item>
        <el-form-item label="允许连堂">
          <el-switch v-model="formData.allowDoubleSession" />
        </el-form-item>
        <el-form-item label="关联场地">
          <el-select v-model="formData.venueId" placeholder="请选择场地（可选）" clearable style="width: 100%">
            <el-option
              v-for="venue in configStore.venueConfigs"
              :key="venue.id"
              :label="venue.name"
              :value="venue.id"
            />
          </el-select>
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
import { useConfigStore, type SubjectConfig } from '@/stores/configStore';

const configStore = useConfigStore();
const searchKeyword = ref('');
const selectedCategory = ref('');
const dialogVisible = ref(false);
const isEditing = ref(false);
const currentId = ref<string>();

// 科目类别列表（可根据实际需求扩展）
const categories = ref<string[]>([
  '主科',
  '副科',
  '艺术',
  '体育',
  '实验',
  '其他',
]);

const formData = ref<Partial<SubjectConfig>>({
  id: '',
  name: '',
  forbiddenSlots: '0',
  allowDoubleSession: true,
  isMajorSubject: false,
});

const dialogTitle = computed(() => isEditing.value ? '编辑科目' : '添加科目');

const filteredSubjects = computed(() => {
  let result = [...configStore.subjectConfigs];
  if (searchKeyword.value) {
    const keyword = searchKeyword.value.toLowerCase();
    result = result.filter(s => s.name.toLowerCase().includes(keyword));
  }
  return result;
});

const formatDate = (dateStr?: string): string => {
  if (!dateStr) return '-';
  return new Date(dateStr).toLocaleString('zh-CN');
};

const handleAdd = () => {
  isEditing.value = false;
  formData.value = {
    id: '',
    name: '',
    forbiddenSlots: '0',
    allowDoubleSession: true,
    isMajorSubject: false,
  };
  dialogVisible.value = true;
};

const handleEdit = (row: SubjectConfig) => {
  isEditing.value = true;
  currentId.value = row.id;
  formData.value = { ...row };
  dialogVisible.value = true;
};

const handleSave = async () => {
  if (!formData.value.name?.trim()) {
    ElMessage.warning('请输入科目名称');
    return;
  }

  if (!formData.value.id?.trim()) {
    ElMessage.warning('请输入科目ID');
    return;
  }

  try {
    await configStore.saveSubjectConfig(formData.value as SubjectConfig);
    ElMessage.success(isEditing.value ? '更新成功' : '添加成功');
    dialogVisible.value = false;
  } catch (error) {
    ElMessage.error('保存失败');
  }
};

const handleDelete = async (row: SubjectConfig) => {
  try {
    await ElMessageBox.confirm(`确定要删除科目"${row.name}"吗？`, '提示', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning',
    });
    await configStore.deleteSubjectConfig(row.id);
    ElMessage.success('删除成功');
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error('删除失败');
    }
  }
};
</script>

<style scoped lang="scss">
.subject-dictionary {
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
