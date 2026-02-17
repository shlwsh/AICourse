<!--
  字典管理页面
  管理教师、班级、科目、教学计划等基础数据
-->
<template>
  <div class="dictionary-page">
    <!-- 页面头部 -->
    <div class="page-header">
      <div class="header-left">
        <h2 class="page-title">字典管理</h2>
        <el-breadcrumb separator="/">
          <el-breadcrumb-item :to="{ path: '/' }">首页</el-breadcrumb-item>
          <el-breadcrumb-item>字典管理</el-breadcrumb-item>
        </el-breadcrumb>
      </div>

      <div class="header-right">
        <el-tag type="info" size="large">
          总计：{{ totalCount }} 条记录
        </el-tag>
      </div>
    </div>

    <!-- 标签页 -->
    <div class="page-content">
      <el-tabs v-model="activeTab" @tab-change="handleTabChange">
        <!-- 教师字典 -->
        <el-tab-pane name="teachers">
          <template #label>
            <span>
              <el-icon><User /></el-icon>
              教师 ({{ teacherCount }})
            </span>
          </template>
          <div class="tab-content">
            <TeacherDictionary />
          </div>
        </el-tab-pane>

        <!-- 班级字典 -->
        <el-tab-pane name="classes">
          <template #label>
            <span>
              <el-icon><School /></el-icon>
              班级 ({{ classCount }})
            </span>
          </template>
          <div class="tab-content">
            <ClassDictionary />
          </div>
        </el-tab-pane>

        <!-- 科目字典 -->
        <el-tab-pane name="subjects">
          <template #label>
            <span>
              <el-icon><Reading /></el-icon>
              科目 ({{ subjectCount }})
            </span>
          </template>
          <div class="tab-content">
            <SubjectDictionary />
          </div>
        </el-tab-pane>

        <!-- 教研组字典 -->
        <el-tab-pane name="teachingGroups">
          <template #label>
            <span>
              <el-icon><OfficeBuilding /></el-icon>
              教研组 ({{ teachingGroupCount }})
            </span>
          </template>
          <div class="tab-content">
            <TeachingGroupDictionary />
          </div>
        </el-tab-pane>

        <!-- 年级字典 -->
        <el-tab-pane name="grades">
          <template #label>
            <span>
              <el-icon><TrendCharts /></el-icon>
              年级 ({{ gradeCount }})
            </span>
          </template>
          <div class="tab-content">
            <GradeDictionary />
          </div>
        </el-tab-pane>

        <!-- 场地字典 -->
        <el-tab-pane name="venues">
          <template #label>
            <span>
              <el-icon><Location /></el-icon>
              场地 ({{ venueCount }})
            </span>
          </template>
          <div class="tab-content">
            <VenueDictionary />
          </div>
        </el-tab-pane>
      </el-tabs>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { User, School, Reading, OfficeBuilding, TrendCharts, Location } from '@element-plus/icons-vue';
import { useTeacherStore } from '@/stores/teacherStore';
import { useClassStore } from '@/stores/classStore';
import { useCurriculumStore } from '@/stores/curriculumStore';
import { useGradeStore } from '@/stores/gradeStore';
import { useConfigStore } from '@/stores/configStore';
import { logger } from '@/utils/logger';
import TeacherDictionary from '@/components/dictionary/TeacherDictionary.vue';
import ClassDictionary from '@/components/dictionary/ClassDictionary.vue';
import SubjectDictionary from '@/components/dictionary/SubjectDictionary.vue';
import TeachingGroupDictionary from '@/components/dictionary/TeachingGroupDictionary.vue';
import GradeDictionary from '@/components/dictionary/GradeDictionary.vue';
import VenueDictionary from '@/components/dictionary/VenueDictionary.vue';

// ========== Store ==========
const teacherStore = useTeacherStore();
const classStore = useClassStore();
const gradeStore = useGradeStore();
const configStore = useConfigStore();

// ========== 状态 ==========
const activeTab = ref('teachers');

// ========== 计算属性 ==========
const teacherCount = computed(() => teacherStore.teacherCount);
const classCount = computed(() => classStore.classCount);
const subjectCount = computed(() => configStore.subjectCount);
const teachingGroupCount = computed(() => configStore.teachingGroupCount);
const gradeCount = computed(() => gradeStore.gradeCount);
const venueCount = computed(() => configStore.venueCount);
const totalCount = computed(() =>
  teacherCount.value + classCount.value + subjectCount.value +
  teachingGroupCount.value + gradeCount.value + venueCount.value
);

// ========== 方法 ==========
const handleTabChange = (tabName: string | number): void => {
  logger.info('[DictionaryPage] 切换标签页', { tabName });
};

// ========== 生命周期 ==========
onMounted(() => {
  // 初始化默认数据
  gradeStore.initializeDefaults();

  logger.info('[DictionaryPage] 字典管理页面挂载');
});
</script>

<style scoped lang="scss">
.dictionary-page {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  background-color: #f5f7fa;
  padding: 20px;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  padding: 16px 20px;
  background-color: #fff;
  border-radius: 4px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);

  .header-left {
    display: flex;
    flex-direction: column;
    gap: 8px;

    .page-title {
      margin: 0;
      font-size: 24px;
      font-weight: 600;
      color: #303133;
    }
  }

  .header-right {
    display: flex;
    gap: 12px;
    align-items: center;
  }
}

.page-content {
  flex: 1;
  overflow: hidden;
  background-color: #fff;
  border-radius: 4px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  padding: 20px;

  :deep(.el-tabs) {
    height: 100%;
    display: flex;
    flex-direction: column;

    .el-tabs__header {
      margin-bottom: 20px;
    }

    .el-tabs__content {
      flex: 1;
      overflow: hidden;
    }

    .el-tab-pane {
      height: 100%;
    }
  }

  .tab-content {
    height: 100%;
    overflow: auto;
  }
}

@media (max-width: 1200px) {
  .page-header {
    flex-direction: column;
    gap: 16px;

    .header-left,
    .header-right {
      width: 100%;
      justify-content: center;
    }
  }
}

@media (max-width: 768px) {
  .dictionary-page {
    padding: 10px;
  }

  .page-header {
    padding: 12px;

    .page-title {
      font-size: 20px;
    }
  }

  .page-content {
    padding: 12px;
  }
}
</style>
