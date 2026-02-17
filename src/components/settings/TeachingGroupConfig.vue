<template>
  <div class="teaching-group-config">
    <!-- 操作栏 -->
    <div class="action-bar">
      <el-button type="primary" :icon="Plus" @click="handleAdd">添加教研组</el-button>
      <el-button :icon="Refresh" @click="handleRefresh">刷新</el-button>
    </div>

    <!-- 教研组列表 -->
    <el-row :gutter="20">
      <el-col
        v-for="group in teachingGroups"
        :key="group.id"
        :xs="24"
        :sm="12"
        :md="8"
        :lg="6"
      >
        <el-card shadow="hover" class="group-card">
          <template #header>
            <div class="card-header">
              <span class="group-name">{{ group.name }}</span>
              <el-dropdown trigger="click" @command="(cmd) => handleCommand(cmd, group)">
                <el-icon class="more-icon"><MoreFilled /></el-icon>
                <template #dropdown>
                  <el-dropdown-menu>
                    <el-dropdown-item command="edit">编辑</el-dropdown-item>
                    <el-dropdown-item command="delete" divided>删除</el-dropdown-item>
                  </el-dropdown-menu>
                </template>
              </el-dropdown>
            </div>
          </template>

          <div class="group-content">
            <div class="group-description">
              {{ group.description || '暂无描述' }}
            </div>

            <el-divider />

            <div class="group-stats">
              <div class="stat-item">
                <span class="stat-label">教师数量</span>
                <span class="stat-value">{{ getTeacherCount(group.id) }}</span>
              </div>
              <div class="stat-item">
                <span class="stat-label">创建时间</span>
                <span class="stat-value">{{ formatDate(group.createdAt) }}</span>
              </div>
            </div>

            <el-button
              text
              type="primary"
              class="view-teachers-btn"
              @click="handleViewTeachers(group)"
            >
              查看教师列表
            </el-button>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <!-- 空状态 -->
    <el-empty v-if="teachingGroups.length === 0" description="暂无教研组配置">
      <el-button type="primary" @click="handleAdd">添加第一个教研组</el-button>
    </el-empty>

    <!-- 编辑对话框 -->
    <el-dialog
      v-model="dialogVisible"
      :title="isEditing ? '编辑教研组' : '添加教研组'"
      width="500px"
      @close="handleDialogClose"
    >
      <el-form :model="formData" :rules="rules" ref="formRef" label-width="100px">
        <el-form-item label="教研组名称" prop="name">
          <el-input v-model="formData.name" placeholder="请输入教研组名称（如：数学组）" />
        </el-form-item>

        <el-form-item label="描述" prop="description">
          <el-input
            v-model="formData.description"
            type="textarea"
            :rows="3"
            placeholder="请输入教研组描述（可选）"
          />
        </el-form-item>

        <el-alert
          title="提示"
          type="info"
          :closable="false"
          show-icon
          style="margin-top: 16px"
        >
          <template #default>
            <div>教研组用于按学科分类管理教师，便于统计和查询。</div>
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

    <!-- 教师列表对话框 -->
    <el-dialog
      v-model="teachersDialogVisible"
      :title="`${selectedGroup?.name} - 教师列表`"
      width="600px"
    >
      <el-table :data="groupTeachers" border stripe max-height="400">
        <el-table-column prop="id" label="ID" width="80" />
        <el-table-column prop="name" label="姓名" width="120" />
        <el-table-column label="偏好设置" align="center">
          <template #default="{ row }">
            <el-tag v-if="hasPreference(row.id)" type="success" size="small">
              已设置
            </el-tag>
            <el-tag v-else type="info" size="small">未设置</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="createdAt" label="创建时间" width="180">
          <template #default="{ row }">
            {{ formatDate(row.createdAt) }}
          </template>
        </el-table-column>
      </el-table>

      <el-empty
        v-if="groupTeachers.length === 0"
        description="该教研组暂无教师"
        :image-size="80"
      />

      <template #footer>
        <el-button @click="teachersDialogVisible = false">关闭</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue';
import { ElMessage, ElMessageBox, type FormInstance, type FormRules } from 'element-plus';
import { Plus, Refresh, MoreFilled } from '@element-plus/icons-vue';
import { useTeacherStore } from '@/stores/teacherStore';
import { useConfigStore } from '@/stores/configStore';
import { logger } from '@/utils/logger';

// 教研组接口定义
interface TeachingGroup {
  id: number;
  name: string;
  description?: string;
  createdAt: string;
}

// 状态管理
const teacherStore = useTeacherStore();
const configStore = useConfigStore();

// 表单引用
const formRef = ref<FormInstance>();

// 对话框显示状态
const dialogVisible = ref(false);
const teachersDialogVisible = ref(false);

// 是否编辑模式
const isEditing = ref(false);

// 保存状态
const isSaving = ref(false);

// 选中的教研组
const selectedGroup = ref<TeachingGroup | null>(null);

// 教研组列表（从 configStore 获取）
const teachingGroups = computed(() => configStore.teachingGroupConfigs);

// 表单数据
const formData = reactive<Partial<TeachingGroup>>({
  name: '',
  description: '',
});

// 表单验证规则
const rules: FormRules = {
  name: [{ required: true, message: '请输入教研组名称', trigger: 'blur' }],
};

// 当前教研组的教师列表
const groupTeachers = computed(() => {
  if (!selectedGroup.value) return [];
  return teacherStore.filterTeachersByGroup(selectedGroup.value.id);
});

/**
 * 格式化日期
 */
const formatDate = (dateStr: string): string => {
  if (!dateStr) return '-';
  try {
    const date = new Date(dateStr);
    return date.toLocaleDateString('zh-CN');
  } catch {
    return dateStr;
  }
};

/**
 * 获取教研组的教师数量
 */
const getTeacherCount = (groupId: number): number => {
  return teacherStore.filterTeachersByGroup(groupId).length;
};

/**
 * 检查教师是否有偏好设置
 */
const hasPreference = (teacherId: number): boolean => {
  const preference = teacherStore.getTeacherPreference(teacherId);
  return preference !== null;
};

/**
 * 添加教研组
 */
const handleAdd = () => {
  logger.info('打开添加教研组对话框');
  isEditing.value = false;
  resetForm();
  dialogVisible.value = true;
};

/**
 * 处理下拉菜单命令
 */
const handleCommand = (command: string, group: TeachingGroup) => {
  if (command === 'edit') {
    handleEdit(group);
  } else if (command === 'delete') {
    handleDelete(group);
  }
};

/**
 * 编辑教研组
 */
const handleEdit = (group: TeachingGroup) => {
  logger.info('打开编辑教研组对话框', { groupId: group.id });
  isEditing.value = true;
  Object.assign(formData, group);
  dialogVisible.value = true;
};

/**
 * 删除教研组
 */
const handleDelete = async (group: TeachingGroup) => {
  // 检查是否有教师属于该教研组
  const teacherCount = getTeacherCount(group.id);
  if (teacherCount > 0) {
    ElMessage.warning(`该教研组有 ${teacherCount} 位教师，请先调整教师所属教研组后再删除`);
    return;
  }

  try {
    await ElMessageBox.confirm(`确定要删除教研组"${group.name}"吗？`, '确认删除', {
      type: 'warning',
    });

    logger.info('删除教研组', { groupId: group.id });

    // 调用 configStore 删除教研组
    await configStore.deleteTeachingGroupConfig(group.id);

    ElMessage.success('删除成功');
  } catch (error) {
    if (error !== 'cancel') {
      logger.error('删除教研组失败', { error, groupId: group.id });
      ElMessage.error('删除失败');
    }
  }
};

/**
 * 查看教师列表
 */
const handleViewTeachers = (group: TeachingGroup) => {
  logger.info('查看教研组教师列表', { groupId: group.id });
  selectedGroup.value = group;
  teachersDialogVisible.value = true;
};

/**
 * 提交表单
 */
const handleSubmit = async () => {
  if (!formRef.value) return;

  try {
    await formRef.value.validate();

    logger.info('保存教研组配置', { name: formData.name });
    isSaving.value = true;

    // 调用 configStore 保存教研组
    const groupData = {
      id: isEditing.value ? formData.id! : Date.now(),
      name: formData.name!,
      description: formData.description,
      createdAt: isEditing.value ? formData.createdAt! : new Date().toISOString(),
    };

    await configStore.saveTeachingGroupConfig(groupData);

    ElMessage.success(isEditing.value ? '修改成功' : '添加成功');
    dialogVisible.value = false;
  } catch (error) {
    logger.error('保存教研组配置失败', { error });
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
  logger.info('刷新教研组列表');
  try {
    // 重新加载配置数据
    await configStore.loadConfig();
    ElMessage.success('刷新成功');
  } catch (error) {
    logger.error('刷新教研组列表失败', { error });
    ElMessage.error('刷新失败');
  }
};

/**
 * 组件挂载时加载数据
 */
onMounted(async () => {
  logger.info('教研组配置组件挂载');

  // 如果配置未加载，则加载配置
  if (!configStore.isConfigLoaded) {
    try {
      await configStore.loadConfig();
    } catch (error) {
      logger.error('加载教研组配置失败', { error });
    }
  }
});

/**
 * 重置表单
 */
const resetForm = () => {
  formData.name = '';
  formData.description = '';
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
.teaching-group-config {
  width: 100%;
}

.action-bar {
  margin-bottom: 20px;
  display: flex;
  gap: 12px;
}

.group-card {
  margin-bottom: 20px;
  transition: all 0.3s;
}

.group-card:hover {
  transform: translateY(-4px);
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.group-name {
  font-size: 16px;
  font-weight: 600;
  color: #303133;
}

.more-icon {
  cursor: pointer;
  font-size: 18px;
  color: #909399;
  transition: color 0.3s;
}

.more-icon:hover {
  color: #409eff;
}

.group-content {
  min-height: 150px;
}

.group-description {
  font-size: 14px;
  color: #606266;
  line-height: 1.6;
  min-height: 40px;
}

.group-stats {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.stat-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 13px;
}

.stat-label {
  color: #909399;
}

.stat-value {
  color: #303133;
  font-weight: 500;
}

.view-teachers-btn {
  width: 100%;
  margin-top: 12px;
}
</style>
