<!--
  导入导出页面
  功能：
  1. 集成 ImportExport 组件
  2. 提供数据导入导出的完整界面
  3. 支持 Excel 文件的导入和导出
  4. 支持模板下载
  5. 显示导入导出进度和结果
  6. 添加完善的日志记录
-->
<template>
  <div class="import-export-page">
    <!-- 页面标题 -->
    <div class="page-header">
      <h1 class="page-title">
        <el-icon><Upload /></el-icon>
        数据导入导出
      </h1>
      <p class="page-description">
        支持从 Excel 批量导入排课条件，导出班级课表、教师课表和总课表
      </p>
    </div>

    <!-- 导入导出组件 -->
    <ImportExport :class-list="classList" :teacher-list="teacherList" />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { Upload } from '@element-plus/icons-vue';
import { ElMessage } from 'element-plus';
import ImportExport from '@/components/import-export/ImportExport.vue';
import { logger } from '@/utils/logger';

/**
 * 班级列表
 */
const classList = ref<Array<{ id: number; name: string }>>([]);

/**
 * 教师列表
 */
const teacherList = ref<Array<{ id: number; name: string }>>([]);

/**
 * 加载班级列表
 */
const loadClassList = async () => {
  logger.info('加载班级列表');
  try {
    // TODO: 调用 API 获取班级列表
    // const response = await ClassApi.getAllClasses();
    // if (response.success && response.data) {
    //   classList.value = response.data;
    //   logger.info('班级列表加载成功', { count: classList.value.length });
    // }

    // 临时模拟数据
    classList.value = [
      { id: 1, name: '初一(1)班' },
      { id: 2, name: '初一(2)班' },
      { id: 3, name: '初一(3)班' },
      { id: 4, name: '初二(1)班' },
      { id: 5, name: '初二(2)班' },
    ];
    logger.debug('使用模拟班级数据', { count: classList.value.length });
  } catch (error: any) {
    logger.error('加载班级列表失败', { error: error.message });
    ElMessage.error('加载班级列表失败：' + error.message);
  }
};

/**
 * 加载教师列表
 */
const loadTeacherList = async () => {
  logger.info('加载教师列表');
  try {
    // TODO: 调用 API 获取教师列表
    // const response = await TeacherApi.getAllTeachers();
    // if (response.success && response.data) {
    //   teacherList.value = response.data;
    //   logger.info('教师列表加载成功', { count: teacherList.value.length });
    // }

    // 临时模拟数据
    teacherList.value = [
      { id: 1, name: '张老师' },
      { id: 2, name: '李老师' },
      { id: 3, name: '王老师' },
      { id: 4, name: '赵老师' },
      { id: 5, name: '刘老师' },
    ];
    logger.debug('使用模拟教师数据', { count: teacherList.value.length });
  } catch (error: any) {
    logger.error('加载教师列表失败', { error: error.message });
    ElMessage.error('加载教师列表失败：' + error.message);
  }
};

/**
 * 组件挂载时加载数据
 */
onMounted(async () => {
  logger.info('导入导出页面已挂载');
  await Promise.all([loadClassList(), loadTeacherList()]);
});
</script>

<style scoped>
.import-export-page {
  padding: 20px;
  min-height: 100vh;
  background-color: #f5f7fa;
}

.page-header {
  margin-bottom: 20px;
  padding: 20px;
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.page-title {
  display: flex;
  align-items: center;
  gap: 10px;
  margin: 0 0 10px 0;
  font-size: 24px;
  font-weight: 600;
  color: #303133;
}

.page-description {
  margin: 0;
  font-size: 14px;
  color: #606266;
  line-height: 1.6;
}
</style>
