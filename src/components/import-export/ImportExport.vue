<!--
  导入导出组件
  功能：
  1. 支持 Excel 文件的导入和导出
  2. 支持导入排课条件（教师、班级、科目、教学计划等）
  3. 支持导出课表（班级课表、教师课表、总课表）
  4. 支持下载导入模板
  5. 显示导入进度和结果
  6. 显示导入错误详情
  7. 支持文件拖拽上传
-->
<template>
  <div class="import-export-container">
    <el-card class="main-card">
      <template #header>
        <div class="card-header">
          <el-icon><Upload /></el-icon>
          <span>数据导入导出</span>
        </div>
      </template>

      <el-tabs v-model="activeTab" class="import-export-tabs">
        <!-- 导入数据选项卡 -->
        <el-tab-pane label="导入数据" name="import">
          <div class="import-section">
            <!-- 导入说明 -->
            <el-alert
              title="导入说明"
              type="info"
              :closable="false"
              show-icon
              class="info-alert"
            >
              <template #default>
                <p>支持从 Excel 文件批量导入排课条件，包括：</p>
                <ul>
                  <li>教师信息（姓名、教研组、偏好设置等）</li>
                  <li>班级信息（班级名称、年级等）</li>
                  <li>科目配置（科目名称、约束规则等）</li>
                  <li>教学计划（班级、科目、教师、课时数等）</li>
                </ul>
              </template>
            </el-alert>

            <!-- 操作按钮区 -->
            <div class="action-buttons">
              <el-button
                type="primary"
                :icon="Download"
                @click="handleDownloadTemplate"
                :loading="downloadingTemplate"
              >
                下载导入模板
              </el-button>

              <el-button
                type="success"
                :icon="Upload"
                @click="triggerFileSelect"
                :disabled="importing"
              >
                选择文件导入
              </el-button>

              <el-dropdown @command="handleClearData" :disabled="importing">
                <el-button type="danger" :disabled="importing">
                  清除数据<el-icon class="el-icon--right"><arrow-down /></el-icon>
                </el-button>
                <template #dropdown>
                  <el-dropdown-menu>
                    <el-dropdown-item command="dictionaries">清除字典数据</el-dropdown-item>
                    <el-dropdown-item command="business">清除业务数据</el-dropdown-item>
                    <el-dropdown-item command="all" divided>清除所有数据</el-dropdown-item>
                  </el-dropdown-menu>
                </template>
              </el-dropdown>
            </div>

            <!-- 文件上传区域（支持拖拽） -->
            <el-upload
              ref="uploadRef"
              class="upload-area"
              drag
              action="#"
              :auto-upload="false"
              :on-change="handleFileChange"
              :show-file-list="false"
              accept=".xlsx,.xls"
              :disabled="importing"
            >
              <el-icon class="el-icon--upload"><upload-filled /></el-icon>
              <div class="el-upload__text">
                将 Excel 文件拖到此处，或<em>点击选择文件</em>
              </div>
              <template #tip>
                <div class="el-upload__tip">
                  支持 .xlsx 和 .xls 格式，文件大小不超过 10MB
                </div>
              </template>
            </el-upload>

            <!-- 选中的文件信息 -->
            <div v-if="selectedFile" class="selected-file">
              <el-icon><Document /></el-icon>
              <span class="file-name">{{ selectedFile.name }}</span>
              <span class="file-size">{{ formatFileSize(selectedFile.size) }}</span>
              <el-button
                type="danger"
                size="small"
                :icon="Delete"
                circle
                @click="clearSelectedFile"
                :disabled="importing"
              />
            </div>

            <!-- 冲突处理策略 -->
            <div v-if="selectedFile" class="conflict-strategy">
              <el-form :model="importForm" label-width="120px">
                <el-form-item label="冲突处理策略">
                  <el-radio-group v-model="importForm.conflictStrategy" :disabled="importing">
                    <el-radio value="skip">跳过冲突数据</el-radio>
                    <el-radio value="overwrite">覆盖已有数据</el-radio>
                    <el-radio value="merge">合并数据</el-radio>
                  </el-radio-group>
                </el-form-item>
              </el-form>
            </div>

            <!-- 导入按钮 -->
            <div v-if="selectedFile" class="import-action">
              <el-button
                type="primary"
                size="large"
                @click="handleImport"
                :loading="importing"
                :disabled="!selectedFile"
              >
                {{ importing ? '导入中...' : '开始导入' }}
              </el-button>
            </div>

            <!-- 导入进度 -->
            <div v-if="importing" class="import-progress">
              <el-progress
                :percentage="importProgress"
                :status="importStatus"
                :stroke-width="20"
              />
              <p class="progress-message">{{ importMessage }}</p>
            </div>

            <!-- 导入结果 -->
            <div v-if="importResult" class="import-result">
              <el-result
                :icon="importResult.failureCount === 0 ? 'success' : 'warning'"
                :title="importResult.failureCount === 0 ? '导入成功' : '导入完成（部分失败）'"
              >
                <template #sub-title>
                  <div class="result-summary">
                    <p>成功导入：<strong>{{ importResult.successCount }}</strong> 条记录</p>
                    <p v-if="importResult.failureCount > 0">
                      失败：<strong class="error-count">{{ importResult.failureCount }}</strong> 条记录
                    </p>
                  </div>
                </template>
                <template #extra>
                  <el-button type="primary" @click="resetImport">继续导入</el-button>
                  <el-button
                    v-if="importResult.errors && importResult.errors.length > 0"
                    @click="showErrorDetails"
                  >
                    查看错误详情
                  </el-button>
                </template>
              </el-result>
            </div>
          </div>
        </el-tab-pane>

        <!-- 导出课表选项卡 -->
        <el-tab-pane label="导出课表" name="export">
          <div class="export-section">
            <!-- 导出说明 -->
            <el-alert
              title="导出说明"
              type="info"
              :closable="false"
              show-icon
              class="info-alert"
            >
              <template #default>
                <p>支持导出以下类型的课表：</p>
                <ul>
                  <li>班级课表：每个班级的完整课程安排</li>
                  <li>教师课表：每位教师的授课安排</li>
                  <li>总课表：全校所有班级和教师的课表汇总</li>
                  <li>工作量统计：教师教学工作量统计表</li>
                </ul>
              </template>
            </el-alert>

            <!-- 导出表单 -->
            <el-form :model="exportForm" label-width="120px" class="export-form">
              <el-form-item label="导出类型" required>
                <el-radio-group v-model="exportForm.exportType">
                  <el-radio value="class">班级课表</el-radio>
                  <el-radio value="teacher">教师课表</el-radio>
                  <el-radio value="all">总课表</el-radio>
                </el-radio-group>
              </el-form-item>

              <el-form-item
                v-if="exportForm.exportType === 'class'"
                label="选择班级"
              >
                <el-select
                  v-model="exportForm.targetIds"
                  multiple
                  placeholder="请选择班级（不选则导出全部）"
                  style="width: 100%"
                  clearable
                >
                  <el-option
                    v-for="cls in classList"
                    :key="cls.id"
                    :label="cls.name"
                    :value="cls.id"
                  />
                </el-select>
              </el-form-item>

              <el-form-item
                v-if="exportForm.exportType === 'teacher'"
                label="选择教师"
              >
                <el-select
                  v-model="exportForm.targetIds"
                  multiple
                  placeholder="请选择教师（不选则导出全部）"
                  style="width: 100%"
                  clearable
                >
                  <el-option
                    v-for="teacher in teacherList"
                    :key="teacher.id"
                    :label="teacher.name"
                    :value="teacher.id"
                  />
                </el-select>
              </el-form-item>

              <el-form-item label="包含工作量统计">
                <el-switch v-model="exportForm.includeWorkload" />
              </el-form-item>

              <el-form-item label="模板样式">
                <el-select v-model="exportForm.templateStyle" placeholder="请选择模板样式">
                  <el-option label="标准样式" value="standard" />
                  <el-option label="简洁样式" value="simple" />
                  <el-option label="详细样式" value="detailed" />
                </el-select>
              </el-form-item>

              <el-form-item>
                <el-button
                  type="primary"
                  size="large"
                  @click="handleExport"
                  :loading="exporting"
                  :icon="Download"
                >
                  {{ exporting ? '导出中...' : '开始导出' }}
                </el-button>
              </el-form-item>
            </el-form>

            <!-- 导出进度 -->
            <div v-if="exporting" class="export-progress">
              <el-progress
                :percentage="exportProgress"
                :status="exportStatus"
                :stroke-width="20"
              />
              <p class="progress-message">{{ exportMessage }}</p>
            </div>

            <!-- 导出结果 -->
            <div v-if="exportResult" class="export-result">
              <el-result icon="success" title="导出成功">
                <template #sub-title>
                  <p>文件已生成：{{ exportResult.fileName }}</p>
                </template>
                <template #extra>
                  <el-button type="primary" @click="downloadExportedFile">
                    下载文件
                  </el-button>
                  <el-button @click="resetExport">继续导出</el-button>
                </template>
              </el-result>
            </div>
          </div>
        </el-tab-pane>
      </el-tabs>
    </el-card>

    <!-- 错误详情对话框 -->
    <el-dialog
      v-model="errorDialogVisible"
      title="导入错误详情"
      width="70%"
      :close-on-click-modal="false"
    >
      <el-table :data="importErrors" stripe max-height="400">
        <el-table-column prop="row" label="行号" width="80" />
        <el-table-column prop="field" label="字段" width="120" />
        <el-table-column prop="reason" label="错误原因" />
      </el-table>
      <template #footer>
        <el-button type="primary" @click="errorDialogVisible = false">
          关闭
        </el-button>
        <el-button @click="exportErrors">导出错误报告</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import {
  Upload,
  Download,
  Document,
  Delete,
  UploadFilled,
  ArrowDown,
} from '@element-plus/icons-vue';
import { ImportExportApi, type ImportResult, type ExportResult, type ImportError } from '@/api/importExport';
import { fetchDataStats, clearDictionaries, clearBusinessData, clearAllData, type DataStats } from '@/api/data';
import { logger } from '@/utils/logger';
import { useDictionaryStore } from '@/stores/dictionaryStore';
import { useConfigStore } from '@/stores/configStore';
import { useTeacherStore } from '@/stores/teacherStore';
import { useClassStore } from '@/stores/classStore';
import { useCurriculumStore } from '@/stores/curriculumStore';

/**
 * 组件属性
 */
interface Props {
  classList?: Array<{ id: number; name: string }>;
  teacherList?: Array<{ id: number; name: string }>;
}

const props = withDefaults(defineProps<Props>(), {
  classList: () => [],
  teacherList: () => [],
});

// ==================== Store ====================

const dictionaryStore = useDictionaryStore();
const configStore = useConfigStore();
const teacherStore = useTeacherStore();
const classStore = useClassStore();
const curriculumStore = useCurriculumStore();

// ==================== 状态管理 ====================

// 当前激活的选项卡
const activeTab = ref<'import' | 'export'>('import');

// 上传组件引用
const uploadRef = ref();

// ==================== 导入相关状态 ====================

// 选中的文件
const selectedFile = ref<File | null>(null);

// 导入表单
const importForm = reactive({
  conflictStrategy: 'skip' as 'skip' | 'overwrite' | 'merge',
});

// 导入状态
const importing = ref(false);
const importProgress = ref(0);
const importStatus = ref<'success' | 'exception' | 'warning' | ''>('');
const importMessage = ref('');
const importResult = ref<ImportResult | null>(null);
const importErrors = ref<ImportError[]>([]);

// 模板下载状态
const downloadingTemplate = ref(false);

// 错误详情对话框
const errorDialogVisible = ref(false);

// ==================== 导出相关状态 ====================

// 导出表单
const exportForm = reactive({
  exportType: 'class' as 'class' | 'teacher' | 'all',
  targetIds: [] as number[],
  includeWorkload: false,
  templateStyle: 'standard',
});

// 导出状态
const exporting = ref(false);
const exportProgress = ref(0);
const exportStatus = ref<'success' | 'exception' | 'warning' | ''>('');
const exportMessage = ref('');
const exportResult = ref<ExportResult | null>(null);

// ==================== 导入功能 ====================

/**
 * 触发文件选择
 */
const triggerFileSelect = () => {
  logger.info('用户触发文件选择');

  // 检查是否在 Tauri 环境中
  const isTauri = typeof window !== 'undefined' && (window as any).__TAURI__;

  if (isTauri) {
    logger.info('Tauri 环境：使用标准 HTML file input');
  } else {
    logger.info('浏览器环境：使用标准 HTML file input');
  }

  // 统一使用标准的 HTML file input，避免 Tauri 对话框 API 卡死问题
  uploadRef.value?.$el.querySelector('input[type="file"]')?.click();
};

/**
 * 处理文件变化
 */
const handleFileChange = (file: any) => {
  logger.info('用户选择文件', { fileName: file.name, fileSize: file.size });

  // 验证文件类型
  const validTypes = [
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-excel',
  ];
  if (!validTypes.includes(file.raw.type)) {
    ElMessage.error('文件格式不正确，请选择 Excel 文件（.xlsx 或 .xls）');
    logger.warn('文件格式不正确', { fileType: file.raw.type });
    return;
  }

  // 验证文件大小（10MB）
  const maxSize = 10 * 1024 * 1024;
  if (file.size > maxSize) {
    ElMessage.error('文件大小超过限制（最大 10MB）');
    logger.warn('文件大小超过限制', { fileSize: file.size, maxSize });
    return;
  }

  selectedFile.value = file.raw;
  logger.info('文件选择成功', { fileName: file.name });
};

/**
 * 清除选中的文件
 */
const clearSelectedFile = () => {
  logger.info('用户清除选中的文件');
  selectedFile.value = null;
  importResult.value = null;
};

/**
 * 格式化文件大小
 */
const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
};

/**
 * 下载导入模板
 */
const handleDownloadTemplate = async () => {
  logger.info('用户点击下载导入模板');
  downloadingTemplate.value = true;

  try {
    await ImportExportApi.downloadTemplate({
      templateType: 'all',
    });

    ElMessage.success('模板下载成功');
    logger.info('模板下载成功');
  } catch (error: any) {
    // 如果是用户取消保存，不显示错误提示
    if (error.message === '用户取消保存') {
      logger.info('用户取消保存模板');
      return;
    }

    const errorMessage = error.message || '模板下载失败';
    ElMessage.error('模板下载失败：' + errorMessage);
    logger.error('模板下载异常', {
      error: errorMessage,
      stack: error.stack,
    });
  } finally {
    downloadingTemplate.value = false;
  }
};

/**
 * 开始导入
 */
const handleImport = async () => {
  if (!selectedFile.value) {
    ElMessage.warning('请先选择要导入的文件');
    return;
  }

  logger.info('用户开始导入', {
    fileName: selectedFile.value.name,
    conflictStrategy: importForm.conflictStrategy,
  });

  // 确认导入
  try {
    await ElMessageBox.confirm(
      `确定要导入文件 "${selectedFile.value.name}" 吗？`,
      '确认导入',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning',
      }
    );
  } catch {
    logger.info('用户取消导入');
    return;
  }

  importing.value = true;
  importProgress.value = 0;
  importStatus.value = '';
  importMessage.value = '正在读取文件...';
  importResult.value = null;

  try {
    // 模拟进度更新
    const progressInterval = setInterval(() => {
      if (importProgress.value < 90) {
        importProgress.value += 10;
      }
    }, 200);

    importMessage.value = '正在解析数据...';

    // 调用导入 API
    const response = await ImportExportApi.importFromExcel({
      file: selectedFile.value,
      conflictStrategy: importForm.conflictStrategy,
    });

    clearInterval(progressInterval);
    importProgress.value = 100;

    if (response.success && response.data) {
      importStatus.value = response.data.failureCount > 0 ? 'warning' : 'success';
      importMessage.value = '导入完成';
      importResult.value = response.data;
      importErrors.value = response.data.errors || [];

      // 保存导入的数据到 store
      if (response.data.importedData) {
        await dictionaryStore.setImportedData(response.data.importedData);
        logger.info('导入数据已保存到 store', {
          teachers: response.data.importedData.teachers?.length || 0,
          classes: response.data.importedData.classes?.length || 0,
          subjects: response.data.importedData.subjects?.length || 0,
          curriculums: response.data.importedData.curriculums?.length || 0,
        });
      }

      if (response.data.failureCount === 0) {
        ElMessage.success(`导入成功！共导入 ${response.data.successCount} 条记录`);
        logger.info('导入成功', {
          successCount: response.data.successCount,
        });
      } else {
        ElMessage.warning(
          `导入完成，成功 ${response.data.successCount} 条，失败 ${response.data.failureCount} 条`
        );
        logger.warn('导入部分失败', {
          successCount: response.data.successCount,
          failureCount: response.data.failureCount,
        });
      }
    } else {
      importStatus.value = 'exception';
      importMessage.value = '导入失败';
      ElMessage.error(response.message || '导入失败');
      logger.error('导入失败', { error: response.message });
    }
  } catch (error: any) {
    importStatus.value = 'exception';
    importMessage.value = '导入异常';
    ElMessage.error('导入失败：' + error.message);
    logger.error('导入异常', { error: error.message });
  } finally {
    importing.value = false;
  }
};

/**
 * 重置导入状态
 */
const resetImport = () => {
  logger.info('用户重置导入状态');
  selectedFile.value = null;
  importProgress.value = 0;
  importStatus.value = '';
  importMessage.value = '';
  importResult.value = null;
  importErrors.value = [];
};

/**
 * 显示错误详情
 */
const showErrorDetails = () => {
  logger.info('用户查看错误详情', { errorCount: importErrors.value.length });
  errorDialogVisible.value = true;
};

/**
 * 导出错误报告
 */
const exportErrors = () => {
  logger.info('用户导出错误报告');

  // 生成 CSV 格式的错误报告
  const csvContent = [
    ['行号', '字段', '错误原因'].join(','),
    ...importErrors.value.map(error =>
      [error.row, error.field || '', error.reason].join(',')
    ),
  ].join('\n');

  // 创建 Blob 并下载
  const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `导入错误报告_${new Date().getTime()}.csv`;
  link.click();
  URL.revokeObjectURL(url);

  ElMessage.success('错误报告已导出');
  logger.info('错误报告导出成功');
};

/**
 * 处理清除数据命令
 */
const handleClearData = async (command: 'dictionaries' | 'business' | 'all') => {
  logger.info('用户选择清除数据', { command });

  try {
    // 获取数据统计信息
    const stats = await fetchDataStats();

    // 根据命令类型构建确认消息
    let confirmMessage = '';
    let confirmTitle = '';
    let clearCount = 0;

    if (command === 'dictionaries') {
      confirmTitle = '清除字典数据';
      clearCount =
        stats.dictionaries.teachers.count +
        stats.dictionaries.classes.count +
        stats.dictionaries.subjects.count +
        stats.dictionaries.venues.count +
        stats.dictionaries.teachingGroups.count;

      confirmMessage = `
        <p>即将清除以下字典数据：</p>
        <ul style="text-align: left; margin: 10px 0;">
          <li>教师：${stats.dictionaries.teachers.count} 条</li>
          <li>班级：${stats.dictionaries.classes.count} 条</li>
          <li>科目：${stats.dictionaries.subjects.count} 条</li>
          <li>场地：${stats.dictionaries.venues.count} 条</li>
          <li>教研组：${stats.dictionaries.teachingGroups.count} 条</li>
        </ul>
        <p><strong>共计 ${clearCount} 条记录</strong></p>
        <p style="color: #f56c6c;">此操作不可恢复，确定要继续吗？</p>
      `;
    } else if (command === 'business') {
      confirmTitle = '清除业务数据';
      clearCount =
        stats.business.curriculums.count +
        stats.business.fixedCourses.count +
        stats.business.scheduleEntries.count +
        stats.business.invigilations.count;

      confirmMessage = `
        <p>即将清除以下业务数据：</p>
        <ul style="text-align: left; margin: 10px 0;">
          <li>教学计划：${stats.business.curriculums.count} 条</li>
          <li>固定课程：${stats.business.fixedCourses.count} 条</li>
          <li>课表记录：${stats.business.scheduleEntries.count} 条</li>
          <li>监考安排：${stats.business.invigilations.count} 条</li>
        </ul>
        <p><strong>共计 ${clearCount} 条记录</strong></p>
        <p style="color: #f56c6c;">此操作不可恢复，确定要继续吗？</p>
      `;
    } else {
      confirmTitle = '清除所有数据';
      const dictCount =
        stats.dictionaries.teachers.count +
        stats.dictionaries.classes.count +
        stats.dictionaries.subjects.count +
        stats.dictionaries.venues.count +
        stats.dictionaries.teachingGroups.count;
      const bizCount =
        stats.business.curriculums.count +
        stats.business.fixedCourses.count +
        stats.business.scheduleEntries.count +
        stats.business.invigilations.count;
      clearCount = dictCount + bizCount;

      confirmMessage = `
        <p>即将清除所有数据：</p>
        <ul style="text-align: left; margin: 10px 0;">
          <li><strong>字典数据：</strong>${dictCount} 条</li>
          <li><strong>业务数据：</strong>${bizCount} 条</li>
        </ul>
        <p><strong>共计 ${clearCount} 条记录</strong></p>
        <p style="color: #f56c6c; font-weight: bold;">此操作将清除所有数据且不可恢复，确定要继续吗？</p>
      `;
    }

    // 如果没有数据，提示用户
    if (clearCount === 0) {
      ElMessage.info('当前没有需要清除的数据');
      return;
    }

    // 二次确认
    await ElMessageBox.confirm(confirmMessage, confirmTitle, {
      confirmButtonText: '确定清除',
      cancelButtonText: '取消',
      type: 'warning',
      dangerouslyUseHTMLString: true,
      distinguishCancelAndClose: true,
    });

    // 执行清除操作
    logger.info('用户确认清除数据', { command });

    let response;
    if (command === 'dictionaries') {
      response = await clearDictionaries();
    } else if (command === 'business') {
      response = await clearBusinessData();
    } else {
      response = await clearAllData();
    }

    if (response.success) {
      ElMessage.success(`成功清除 ${clearCount} 条记录`);
      logger.info('数据清除成功', { command, count: clearCount });

      // 刷新页面数据
      await Promise.all([
        configStore.loadConfig(),
        teacherStore.loadTeachers(),
        classStore.loadClasses(),
        curriculumStore.loadCurriculums(),
      ]);
      logger.info('数据重新加载完成');
    } else {
      ElMessage.error(response.message || '清除数据失败');
      logger.error('数据清除失败', { error: response.message });
    }
  } catch (error: any) {
    // 用户取消操作
    if (error === 'cancel' || error === 'close') {
      logger.info('用户取消清除数据');
      return;
    }

    const errorMessage = error.message || '清除数据失败';
    ElMessage.error(errorMessage);
    logger.error('清除数据异常', { error: errorMessage });
  }
};

// ==================== 导出功能 ====================

/**
 * 开始导出
 */
const handleExport = async () => {
  logger.info('用户开始导出', exportForm);

  exporting.value = true;
  exportProgress.value = 0;
  exportStatus.value = '';
  exportMessage.value = '正在准备导出...';
  exportResult.value = null;

  try {
    // 模拟进度更新
    const progressInterval = setInterval(() => {
      if (exportProgress.value < 90) {
        exportProgress.value += 10;
      }
    }, 200);

    exportMessage.value = '正在生成文件...';

    // 调用导出 API
    const response = await ImportExportApi.exportToExcel({
      exportType: exportForm.exportType,
      targetIds: exportForm.targetIds.length > 0 ? exportForm.targetIds : undefined,
      includeWorkload: exportForm.includeWorkload,
      templateStyle: exportForm.templateStyle,
    });

    clearInterval(progressInterval);
    exportProgress.value = 100;

    if (response.success && response.data) {
      exportStatus.value = 'success';
      exportMessage.value = '导出完成';
      exportResult.value = response.data;
      ElMessage.success('导出成功！');
      logger.info('导出成功', { fileName: response.data.fileName });
    } else {
      exportStatus.value = 'exception';
      exportMessage.value = '导出失败';
      ElMessage.error(response.message || '导出失败');
      logger.error('导出失败', { error: response.message });
    }
  } catch (error: any) {
    exportStatus.value = 'exception';
    exportMessage.value = '导出异常';
    ElMessage.error('导出失败：' + error.message);
    logger.error('导出异常', { error: error.message });
  } finally {
    exporting.value = false;
  }
};

/**
 * 下载导出的文件
 */
const downloadExportedFile = () => {
  if (exportResult.value && exportResult.value.fileUrl && exportResult.value.fileName) {
    logger.info('用户下载导出文件', { fileName: exportResult.value.fileName });
    ImportExportApi.triggerDownload(exportResult.value.fileUrl, exportResult.value.fileName);
  }
};

/**
 * 重置导出状态
 */
const resetExport = () => {
  logger.info('用户重置导出状态');
  exportProgress.value = 0;
  exportStatus.value = '';
  exportMessage.value = '';
  exportResult.value = null;
};
</script>

<style scoped>
.import-export-container {
  padding: 20px;
}

.main-card {
  max-width: 1200px;
  margin: 0 auto;
}

.card-header {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 18px;
  font-weight: 600;
}

.import-export-tabs {
  min-height: 600px;
}

.import-section,
.export-section {
  padding: 20px;
}

.info-alert {
  margin-bottom: 20px;
}

.info-alert ul {
  margin: 10px 0 0 20px;
  padding: 0;
}

.info-alert li {
  margin: 5px 0;
}

.action-buttons {
  display: flex;
  gap: 15px;
  margin-bottom: 20px;
}

.upload-area {
  margin: 20px 0;
}

.selected-file {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 15px;
  background-color: #f5f7fa;
  border-radius: 4px;
  margin: 20px 0;
}

.file-name {
  flex: 1;
  font-weight: 500;
}

.file-size {
  color: #909399;
  font-size: 14px;
}

.conflict-strategy {
  margin: 20px 0;
}

.import-action {
  text-align: center;
  margin: 30px 0;
}

.import-progress,
.export-progress {
  margin: 30px 0;
}

.progress-message {
  text-align: center;
  margin-top: 10px;
  color: #606266;
}

.progress-text {
  font-weight: 600;
}

.import-result,
.export-result {
  margin: 30px 0;
}

.result-summary {
  font-size: 16px;
}

.result-summary p {
  margin: 10px 0;
}

.error-count {
  color: #f56c6c;
}

.export-form {
  max-width: 600px;
  margin: 30px auto;
}
</style>
