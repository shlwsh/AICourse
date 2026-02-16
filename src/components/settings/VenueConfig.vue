<template>
  <div class="venue-config">
    <!-- 操作栏 -->
    <div class="action-bar">
      <el-button type="primary" :icon="Plus" @click="handleAdd">添加场地</el-button>
      <el-button :icon="Refresh" @click="handleRefresh">刷新</el-button>
    </div>

    <!-- 场地列表 -->
    <el-table :data="configStore.venueConfigs" border stripe style="width: 100%">
      <el-table-column prop="id" label="场地ID" width="150" />
      <el-table-column prop="name" label="场地名称" width="200" />
      <el-table-column prop="capacity" label="容量" width="120" align="center">
        <template #default="{ row }">
          <el-tag type="success">{{ row.capacity }} 个班级</el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="createdAt" label="创建时间" width="180">
        <template #default="{ row }">
          {{ formatDate(row.createdAt) }}
        </template>
      </el-table-column>
      <el-table-column label="使用情况" min-width="200">
        <template #default="{ row }">
          <span class="text-info">{{ getUsageInfo(row.id) }}</span>
        </template>
      </el-table-column>
      <el-table-column label="操作" width="180" fixed="right">
        <template #default="{ row }">
          <el-button link type="primary" size="small" @click="handleEdit(row)">
            编辑
          </el-button>
          <el-button link type="danger" size="small" @click="handleDelete(row)">
            删除
          </el-button>
        </template>
      </el-table-column>
    </el-table>

    <!-- 空状态 -->
    <el-empty v-if="configStore.venueConfigs.length === 0" description="暂无场地配置">
      <el-button type="primary" @click="handleAdd">添加第一个场地</el-button>
    </el-empty>

    <!-- 编辑对话框 -->
    <el-dialog
      v-model="dialogVisible"
      :title="isEditing ? '编辑场地' : '添加场地'"
      width="500px"
      @close="handleDialogClose"
    >
      <el-form :model="formData" :rules="rules" ref="formRef" label-width="100px">
        <el-form-item label="场地ID" prop="id">
          <el-input
            v-model="formData.id"
            placeholder="请输入场地ID（如：computer-room-1）"
            :disabled="isEditing"
          />
          <div class="form-tip">场地的唯一标识符</div>
        </el-form-item>

        <el-form-item label="场地名称" prop="name">
          <el-input v-model="formData.name" placeholder="请输入场地名称（如：微机室1）" />
        </el-form-item>

        <el-form-item label="容量" prop="capacity">
          <el-input-number
            v-model="formData.capacity"
            :min="1"
            :max="50"
            :step="1"
            controls-position="right"
            style="width: 100%"
          />
          <div class="form-tip">同一时段可容纳的班级数量</div>
        </el-form-item>

        <el-alert
          title="提示"
          type="info"
          :closable="false"
          show-icon
          style="margin-top: 16px"
        >
          <template #default>
            <div>场地容量限制将作为硬约束，排课时会确保同一时段使用该场地的课程数不超过容量。</div>
          </template>
        </el-alert>
      </el-form>

      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handleSubmit" :loading="isSaving">
          确定
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive } from 'vue';
import { ElMessage, ElMessageBox, type FormInstance, type FormRules } from 'element-plus';
import { Plus, Refresh } from '@element-plus/icons-vue';
import { useConfigStore, type VenueConfig } from '@/stores/configStore';
import { logger } from '@/utils/logger';

// 状态管理
const configStore = useConfigStore();

// 表单引用
const formRef = ref<FormInstance>();

// 对话框显示状态
const dialogVisible = ref(false);

// 是否编辑模式
const isEditing = ref(false);

// 保存状态
const isSaving = ref(false);

// 表单数据
const formData = reactive<VenueConfig>({
  id: '',
  name: '',
  capacity: 1,
  createdAt: '',
});

// 表单验证规则
const rules: FormRules = {
  id: [
    { required: true, message: '请输入场地ID', trigger: 'blur' },
    {
      pattern: /^[a-zA-Z0-9_-]+$/,
      message: '场地ID只能包含字母、数字、下划线和连字符',
      trigger: 'blur',
    },
  ],
  name: [{ required: true, message: '请输入场地名称', trigger: 'blur' }],
  capacity: [
    { required: true, message: '请输入容量', trigger: 'blur' },
    {
      type: 'number',
      min: 1,
      max: 50,
      message: '容量必须在 1-50 之间',
      trigger: 'blur',
    },
  ],
};

/**
 * 格式化日期
 */
const formatDate = (dateStr: string): string => {
  if (!dateStr) return '-';
  try {
    const date = new Date(dateStr);
    return date.toLocaleString('zh-CN');
  } catch {
    return dateStr;
  }
};

/**
 * 获取场地使用情况
 */
const getUsageInfo = (venueId: string): string => {
  // 统计使用该场地的科目数量
  const count = configStore.subjectConfigs.filter((s) => s.venueId === venueId).length;
  if (count === 0) {
    return '暂无科目使用';
  }
  return `${count} 个科目使用此场地`;
};

/**
 * 添加场地
 */
const handleAdd = () => {
  logger.info('打开添加场地对话框');
  isEditing.value = false;
  resetForm();
  dialogVisible.value = true;
};

/**
 * 编辑场地
 */
const handleEdit = (row: VenueConfig) => {
  logger.info('打开编辑场地对话框', { venueId: row.id });
  isEditing.value = true;
  Object.assign(formData, row);
  dialogVisible.value = true;
};

/**
 * 删除场地
 */
const handleDelete = async (row: VenueConfig) => {
  // 检查是否有科目使用该场地
  const usedBySubjects = configStore.subjectConfigs.filter((s) => s.venueId === row.id);
  if (usedBySubjects.length > 0) {
    ElMessage.warning(
      `该场地正被 ${usedBySubjects.length} 个科目使用，请先解除关联后再删除`
    );
    return;
  }

  try {
    await ElMessageBox.confirm(`确定要删除场地"${row.name}"吗？`, '确认删除', {
      type: 'warning',
    });

    logger.info('删除场地', { venueId: row.id });
    await configStore.deleteVenueConfig(row.id);
    ElMessage.success('删除成功');
  } catch (error) {
    if (error !== 'cancel') {
      logger.error('删除场地失败', { error, venueId: row.id });
      ElMessage.error('删除失败');
    }
  }
};

/**
 * 提交表单
 */
const handleSubmit = async () => {
  if (!formRef.value) return;

  try {
    await formRef.value.validate();

    logger.info('保存场地配置', { venueId: formData.id });
    isSaving.value = true;

    // 设置创建时间
    if (!isEditing.value) {
      formData.createdAt = new Date().toISOString();
    }

    await configStore.saveVenueConfig({ ...formData });

    ElMessage.success(isEditing.value ? '修改成功' : '添加成功');
    dialogVisible.value = false;
  } catch (error) {
    logger.error('保存场地配置失败', { error });
    if (error instanceof Error) {
      ElMessage.error(`保存失败: ${error.message}`);
    }
  } finally {
    isSaving.value = false;
  }
};

/**
 * 刷新列表
 */
const handleRefresh = async () => {
  logger.info('刷新场地列表');
  try {
    await configStore.loadConfig();
    ElMessage.success('刷新成功');
  } catch (error) {
    logger.error('刷新场地列表失败', { error });
    ElMessage.error('刷新失败');
  }
};

/**
 * 重置表单
 */
const resetForm = () => {
  formData.id = '';
  formData.name = '';
  formData.capacity = 1;
  formData.createdAt = '';
  formRef.value?.clearValidate();
};

/**
 * 对话框关闭回调
 */
const handleDialogClose = () => {
  resetForm();
};
</script>

<style scoped>
.venue-config {
  width: 100%;
}

.action-bar {
  margin-bottom: 16px;
  display: flex;
  gap: 12px;
}

.text-info {
  color: #409eff;
}

.form-tip {
  margin-top: 4px;
  font-size: 12px;
  color: #909399;
}
</style>
