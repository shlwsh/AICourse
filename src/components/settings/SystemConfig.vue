<template>
  <div class="system-config">
    <el-form :model="formData" :rules="rules" ref="formRef" label-width="140px">
      <el-card shadow="never" class="config-card">
        <template #header>
          <div class="card-header">
            <span class="card-title">排课周期配置</span>
            <span class="card-description">设置排课的时间周期和每天的节次数</span>
          </div>
        </template>

        <el-form-item label="排课周期天数" prop="cycleDays">
          <el-input-number
            v-model="formData.cycleDays"
            :min="1"
            :max="30"
            :step="1"
            controls-position="right"
            style="width: 200px"
          />
          <span class="form-tip">支持 1-30 天的灵活排课周期</span>
        </el-form-item>

        <el-form-item label="每天节次数" prop="periodsPerDay">
          <el-input-number
            v-model="formData.periodsPerDay"
            :min="1"
            :max="12"
            :step="1"
            controls-position="right"
            style="width: 200px"
          />
          <span class="form-tip">支持 1-12 节课</span>
        </el-form-item>

        <el-form-item>
          <el-button type="primary" @click="handleSave" :loading="isSaving">
            保存配置
          </el-button>
          <el-button @click="handleReset">重置</el-button>
        </el-form-item>
      </el-card>

      <el-card shadow="never" class="config-card">
        <template #header>
          <div class="card-header">
            <span class="card-title">配置信息</span>
            <span class="card-description">当前系统配置概览</span>
          </div>
        </template>

        <el-descriptions :column="2" border>
          <el-descriptions-item label="科目数量">
            {{ configStore.subjectCount }}
          </el-descriptions-item>
          <el-descriptions-item label="班级数量">
            {{ configStore.classCount }}
          </el-descriptions-item>
          <el-descriptions-item label="场地数量">
            {{ configStore.venueCount }}
          </el-descriptions-item>
          <el-descriptions-item label="固定课程数量">
            {{ configStore.fixedCourseCount }}
          </el-descriptions-item>
          <el-descriptions-item label="教师互斥关系">
            {{ configStore.mutualExclusionCount }}
          </el-descriptions-item>
          <el-descriptions-item label="配置状态">
            <el-tag :type="configStore.hasConfig ? 'success' : 'warning'">
              {{ configStore.hasConfig ? '已配置' : '未配置' }}
            </el-tag>
          </el-descriptions-item>
        </el-descriptions>
      </el-card>
    </el-form>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue';
import { ElMessage, type FormInstance, type FormRules } from 'element-plus';
import { useConfigStore } from '@/stores/configStore';
import { logger } from '@/utils/logger';

// 状态管理
const configStore = useConfigStore();

// 表单引用
const formRef = ref<FormInstance>();

// 表单数据
const formData = reactive({
  cycleDays: 5,
  periodsPerDay: 8,
});

// 保存状态
const isSaving = ref(false);

// 表单验证规则
const rules: FormRules = {
  cycleDays: [
    { required: true, message: '请输入排课周期天数', trigger: 'blur' },
    {
      type: 'number',
      min: 1,
      max: 30,
      message: '排课周期天数必须在 1-30 之间',
      trigger: 'blur',
    },
  ],
  periodsPerDay: [
    { required: true, message: '请输入每天节次数', trigger: 'blur' },
    {
      type: 'number',
      min: 1,
      max: 12,
      message: '每天节次数必须在 1-12 之间',
      trigger: 'blur',
    },
  ],
};

/**
 * 加载配置数据
 */
const loadConfig = () => {
  logger.info('加载系统配置');
  formData.cycleDays = configStore.cycleConfig.cycleDays;
  formData.periodsPerDay = configStore.cycleConfig.periodsPerDay;
};

/**
 * 保存配置
 */
const handleSave = async () => {
  if (!formRef.value) return;

  try {
    // 验证表单
    await formRef.value.validate();

    logger.info('保存系统配置', formData);
    isSaving.value = true;

    // 保存配置
    await configStore.saveCycleConfig({
      cycleDays: formData.cycleDays,
      periodsPerDay: formData.periodsPerDay,
    });

    ElMessage.success('系统配置保存成功');
    logger.info('系统配置保存成功');
  } catch (error) {
    logger.error('保存系统配置失败', { error });
    if (error instanceof Error) {
      ElMessage.error(`保存失败: ${error.message}`);
    } else {
      ElMessage.error('保存失败，请重试');
    }
  } finally {
    isSaving.value = false;
  }
};

/**
 * 重置表单
 */
const handleReset = () => {
  logger.info('重置系统配置表单');
  loadConfig();
  formRef.value?.clearValidate();
};

// 组件挂载时加载配置
onMounted(() => {
  loadConfig();
});
</script>

<style scoped>
.system-config {
  max-width: 800px;
}

.config-card {
  margin-bottom: 20px;
}

.config-card:last-child {
  margin-bottom: 0;
}

.card-header {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.card-title {
  font-size: 16px;
  font-weight: 600;
  color: #303133;
}

.card-description {
  font-size: 13px;
  color: #909399;
}

.form-tip {
  margin-left: 12px;
  font-size: 13px;
  color: #909399;
}
</style>
