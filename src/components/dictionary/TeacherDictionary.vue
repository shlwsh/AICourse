<!--
  教师字典组件
  显示和管理教师数据
-->
<template>
  <div class="teacher-dictionary">
    <!-- 工具栏 -->
    <div class="toolbar">
      <el-input
        v-model="searchKeyword"
        placeholder="搜索教师姓名"
        :prefix-icon="Search"
        clearable
        style="width: 240px"
      />
      <el-select
        v-model="selectedGroup"
        placeholder="按教研组筛选"
        clearable
        style="width: 180px"
      >
        <el-option label="全部教研组" value="" />
        <el-option
          v-for="group in teachingGroups"
          :key="group"
          :label="group"
          :value="group"
        />
      </el-select>
      <el-button type="primary" :icon="Plus" @click="handleAdd">添加教师</el-button>
    </div>

    <!-- 数据表格 -->
    <el-table
      :data="filteredTeachers"
      border
      stripe
      max-height="600"
      style="width: 100%"
    >
      <el-table-column type="index" label="序号" width="60" align="center" />
      <el-table-column prop="name" label="教师姓名" width="150" />
      <el-table-column prop="teachingGroup" label="教研组" width="150">
        <template #default="{ row }">
          <el-tag v-if="row.teachingGroup" size="small">
            {{ row.teachingGroup }}
          </el-tag>
          <span v-else class="text-muted">-</span>
        </template>
      </el-table-column>
      <el-table-column prop="maxHoursPerDay" label="每天最大课时" width="120" align="center">
        <template #default="{ row }">
          {{ row.maxHoursPerDay || '-' }}
        </template>
      </el-table-column>
      <el-table-column prop="maxConsecutiveHours" label="最大连续课时" width="120" align="center">
        <template #default="{ row }">
          {{ row.maxConsecutiveHours || '-' }}
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

    <!-- 空状态 -->
    <el-empty
      v-if="filteredTeachers.length === 0"
      description="暂无教师数据，请先导入数据或手动添加"
    />

    <!-- 添加/编辑对话框 -->
    <el-dialog
      v-model="dialogVisible"
      :title="dialogTitle"
      width="600px"
    >
      <el-form :model="formData" label-width="140px">
        <el-form-item label="教师姓名" required>
          <el-input v-model="formData.name" placeholder="请输入教师姓名" />
        </el-form-item>
        <el-form-item label="教研组">
          <el-select v-model="formData.teachingGroup" placeholder="请选择教研组" clearable style="width: 100%">
            <el-option
              v-for="group in allTeachingGroups"
              :key="group.name"
              :label="group.name"
              :value="group.name"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="每天最大课时">
          <el-input-number v-model="formData.maxHoursPerDay" :min="1" :max="12" />
        </el-form-item>
        <el-form-item label="最大连续课时">
          <el-input-number v-model="formData.maxConsecutiveHours" :min="1" :max="6" />
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
import { useTeacherStore, type Teacher } from '@/stores/teacherStore';
import { useConfigStore } from '@/stores/configStore';

const teacherStore = useTeacherStore();
const configStore = useConfigStore();

// 搜索和筛选
const searchKeyword = ref('');
const selectedGroup = ref('');
const dialogVisible = ref(false);
const isEditing = ref(false);
const currentId = ref<number>();

const formData = ref<Partial<Teacher>>({
  name: '',
  teachingGroup: '',
  maxHoursPerDay: undefined,
  maxConsecutiveHours: undefined,
});

const dialogTitle = computed(() => isEditing.value ? '编辑教师' : '添加教师');

// 所有教研组列表
const allTeachingGroups = computed(() => configStore.teachingGroupConfigs);

// 教研组列表（从数据中提取）
const teachingGroups = computed(() => {
  const groups = new Set<string>();
  teacherStore.teachers.forEach(t => {
    if (t.teachingGroup) {
      groups.add(t.teachingGroup);
    }
  });
  return Array.from(groups).sort();
});

// 过滤后的教师列表
const filteredTeachers = computed(() => {
  let result = [...teacherStore.teachers];

  if (selectedGroup.value) {
    result = result.filter(t => t.teachingGroup === selectedGroup.value);
  }

  if (searchKeyword.value) {
    const keyword = searchKeyword.value.toLowerCase();
    result = result.filter(t => t.name.toLowerCase().includes(keyword));
  }

  return result;
});

// 格式化日期
const formatDate = (dateStr?: string): string => {
  if (!dateStr) return '-';
  return new Date(dateStr).toLocaleString('zh-CN');
};

const handleAdd = () => {
  isEditing.value = false;
  formData.value = {
    name: '',
    teachingGroup: '',
    maxHoursPerDay: undefined,
    maxConsecutiveHours: undefined,
  };
  dialogVisible.value = true;
};

const handleEdit = (row: Teacher) => {
  isEditing.value = true;
  currentId.value = row.id;
  formData.value = { ...row };
  dialogVisible.value = true;
};

const handleSave = () => {
  if (!formData.value.name?.trim()) {
    ElMessage.warning('请输入教师姓名');
    return;
  }

  if (isEditing.value && currentId.value) {
    teacherStore.updateTeacher(currentId.value, formData.value);
    ElMessage.success('更新成功');
  } else {
    teacherStore.addTeacher(formData.value as Omit<Teacher, 'id' | 'createdAt' | 'updatedAt'>);
    ElMessage.success('添加成功');
  }

  dialogVisible.value = false;
};

const handleDelete = (row: Teacher) => {
  ElMessageBox.confirm(`确定要删除教师"${row.name}"吗？`, '提示', {
    confirmButtonText: '确定',
    cancelButtonText: '取消',
    type: 'warning',
  }).then(() => {
    if (row.id) {
      teacherStore.deleteTeacher(row.id);
      ElMessage.success('删除成功');
    }
  });
};
</script>

<style scoped lang="scss">
.teacher-dictionary {
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
