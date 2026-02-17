<!--
  Store 调试页面
  用于检查各个 store 的状态
-->
<template>
  <div class="debug-store-page">
    <h2>Store 状态调试</h2>

    <el-card style="margin-bottom: 20px;">
      <template #header>
        <div>教师 Store (teacherStore)</div>
      </template>
      <div>
        <p>教师数量: {{ teacherStore.teacherCount }}</p>
        <p>是否有数据: {{ teacherStore.hasTeachers }}</p>
        <el-button @click="logTeachers">打印教师数据到控制台</el-button>
        <pre>{{ JSON.stringify(teacherStore.teachers, null, 2) }}</pre>
      </div>
    </el-card>

    <el-card style="margin-bottom: 20px;">
      <template #header>
        <div>班级 Store (classStore)</div>
      </template>
      <div>
        <p>班级数量: {{ classStore.classCount }}</p>
        <pre>{{ JSON.stringify(classStore.classes.slice(0, 3), null, 2) }}</pre>
      </div>
    </el-card>

    <el-card style="margin-bottom: 20px;">
      <template #header>
        <div>科目 Store (configStore.subjectConfigs)</div>
      </template>
      <div>
        <p>科目数量: {{ configStore.subjectCount }}</p>
        <pre>{{ JSON.stringify(configStore.subjectConfigs.slice(0, 3), null, 2) }}</pre>
      </div>
    </el-card>

    <el-card>
      <template #header>
        <div>教研组 Store (configStore.teachingGroupConfigs)</div>
      </template>
      <div>
        <p>教研组数量: {{ configStore.teachingGroupCount }}</p>
        <pre>{{ JSON.stringify(configStore.teachingGroupConfigs, null, 2) }}</pre>
      </div>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { useTeacherStore } from '@/stores/teacherStore';
import { useClassStore } from '@/stores/classStore';
import { useConfigStore } from '@/stores/configStore';

const teacherStore = useTeacherStore();
const classStore = useClassStore();
const configStore = useConfigStore();

const logTeachers = () => {
  console.log('=== 教师 Store 数据 ===');
  console.log('教师数量:', teacherStore.teacherCount);
  console.log('教师列表:', teacherStore.teachers);
  console.log('是否有数据:', teacherStore.hasTeachers);
};
</script>

<style scoped>
.debug-store-page {
  padding: 20px;
}

pre {
  background-color: #f5f5f5;
  padding: 10px;
  border-radius: 4px;
  overflow: auto;
  max-height: 300px;
}
</style>
