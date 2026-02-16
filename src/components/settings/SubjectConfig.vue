<template>
  <div class="subject-config">
    <!-- 操作栏 -->
    <div class="action-bar">
      <el-button type="primary" :icon="Plus" @click="handleAdd">添加科目</el-button>
      <el-button :icon="Upload" @click="handleImport">批量导入</el-button>
      <el-button :icon="Download" @click="handleExport">导出配置</el-button>
    </div>

    <!-- 科目列表 -->
    <el-table :data="configStore.subjectConfigs" border stripe style="width: 100%">
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
          <span v-if="row.venueId">{{ getVenueName(row.venueId) }}</span>
          <span v-else class="text-muted">无</span>
        </template>
      </el-table-column>
      <el-table-column label="禁止时段" min-width="200">
        <template #default="{ row }">
          <span v-if="row.forbiddenSlots && row.forbiddenSlots !== '0'" class="text-info">
            已设置
          </span>
          <span v-else class="text-muted">无限制</span>
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
    <el-empty v-if="configStore.subjectConfigs.length === 0" description="暂无科目配置" />

    <!-- 编辑对话框 -->
    <el-dialog
      v-model="dialogVisible"
      :title="isEditing ? '编辑科目' : '添加科目'"
      width="600px"
      @close="handleDialogClose"
    >
      <el-form
        :model="formData"
        :rules="rules"
        ref="formRef"
        label-width="120px"
      >
        <el-form-item label="科目ID" prop="id">
          <el-input
            v-model="formData.id"
            placeholder="请输入科目ID（如：math）"
            :disabled="isEditing"
          />
        </el-form-item>

        <el-form-item label="科目名称" prop="name">
          <el-input v-model="formData.name" placeholder="请输入科目名称" />
        </el-form-item>

        <el-form-item label="是否主科" prop="isMajorSubject">
          <el-switch v-model="formData.isMajorSubject" />
          <span class="form-tip">主科连续3节会增加代价惩罚</span>
        </el-form-item>

        <el-form-item label="允许连堂" prop="allowDoubleSession">
          <el-switch v-model="formData.allowDoubleSession" />
          <span class="form-tip">是否允许连续两节课</span>
        </el-form-item>

        <el-form-item label="关联场地" prop="venueId">
          <el-select
            v-model="formData.venueId"
            placeholder="请选择场地（可选）"
            clearable
            style="width: 100%"
          >
            <el-option
              v-for="venue in configStore.venueConfigs"
              :key="venue.id"
              :label="venue.name"
              :value="venue.id"
            />
          </el-select>
        </el-form-item>

        <el-form-item label="禁止时段" prop="forbiddenSlots">
          <el-button size="small" @click="showTimeSlotSelector">
            设置禁止时段
          </el-button>
          <span class="form-tip">
            {{ getForbiddenSlotsDescription() }}
          </span>
        </el-form-item>
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
import { Plus, Upload, Download } from '@element-plus/icons-vue';
import { useConfigStore, type SubjectConfig } from '@/stores/configStore';
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
const formData = reactive<SubjectConfig>({
  id: '',
  name: '',
  forbiddenSlots: '0',
  allowDoubleSession: true,
  venueId: undefined,
  isMajorSubject: false,
});

// 表单验证规则
const rules: FormRules = {
  id: [
    { required: true, message: '请输入科目ID', trigger: 'blur' },
    {
      pattern: /^[a-zA-Z0-9_-]+$/,
      message: '科目ID只能包含字母、数字、下划线和连字符',
      trigger: 'blur',
    },
  ],
  name: [{ required: true, message: '请输入科目名称', trigger: 'blur' }],
};

/**
 * 获取场地名称
 */
const getVenueName = (venueId: string): string => {
  const venue = configStore.getVenueConfig(venueId);
  return venue?.name || venueId;
};

/**
 * 获取禁止时段描述
 */
const getForbiddenSlotsDescription = (): string => {
  if (!formData.forbiddenSlots || formData.forbiddenSlots === '0') {
    return '无限制';
  }
  return '已设置禁止时段';
};

/**
 * 显示时间槽位选择器
 */
const showTimeSlotSelector = () => {
  ElMessage.info('时间槽位选择器功能开发中');
  // TODO: 实现时间槽位选择器
};

/**
 * 添加科目
 */
const handleAdd = () => {
  logger.info('打开添加科目对话框');
  isEditing.value = false;
  resetForm();
  dialogVisible.value = true;
};

/**
 * 编辑科目
 */
const handleEdit = (row: SubjectConfig) => {
  logger.info('打开编辑科目对话框', { subjectId: row.id });
  isEditing.value = true;
  Object.assign(formData, row);
  dialogVisible.value = true;
};

/**
 * 删除科目
 */
const handleDelete = async (row: SubjectConfig) => {
  try {
    await ElMessageBox.confirm(`确定要删除科目"${row.name}"吗？`, '确认删除', {
      type: 'warning',
    });

    logger.info('删除科目', { subjectId: row.id });
    await configStore.deleteSubjectConfig(row.id);
    ElMessage.success('删除成功');
  } catch (error) {
    if (error !== 'cancel') {
      logger.error('删除科目失败', { error, subjectId: row.id });
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

    logger.info('保存科目配置', { subjectId: formData.id });
    isSaving.value = true;

    await configStore.saveSubjectConfig({ ...formData });

    ElMessage.success(isEditing.value ? '修改成功' : '添加成功');
    dialogVisible.value = false;
  } catch (error) {
    logger.error('保存科目配置失败', { error });
    if (error instanceof Error) {
      ElMessage.error(`保存失败: ${error.message}`);
    }
  } finally {
    isSaving.value = false;
  }
};

/**
 * 批量导入
 */
const handleImport = () => {
  ElMessage.info('批量导入功能开发中');
  // TODO: 实现批量导入
};

/**
 * 导出配置
 */
const handleExport = () => {
  ElMessage.info('导出配置功能开发中');
  // TODO: 实现导出配置
};

/**
 * 重置表单
 */
const resetForm = () => {
  formData.id = '';
  formData.name = '';
  formData.forbiddenSlots = '0';
  formData.allowDoubleSession = true;
  formData.venueId = undefined;
  formData.isMajorSubject = false;
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
.subject-config {
  width: 100%;
}

.action-bar {
  margin-bottom: 16px;
  display: flex;
  gap: 12px;
}

.text-muted {
  color: #909399;
}

.text-info {
  color: #409eff;
}

.form-tip {
  margin-left: 12px;
  font-size: 13px;
  color: #909399;
}
</style>
