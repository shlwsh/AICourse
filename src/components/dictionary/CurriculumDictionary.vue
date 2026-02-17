<!--
  教学计划字典组件
-->
<template>
  <div class="curriculum-dictionary">
    <div class="toolbar">
      <el-input
        v-model="searchKeyword"
        placeholder="搜索班级/科目/教师"
        :prefix-icon="Search"
        clearable
        style="width: 240px"
      />
    </div>

    <el-table
      :data="filteredCurriculums"
      border
      stripe
      max-height="600"
      style="width: 100%"
    >
      <el-table-column type="index" label="序号" width="60" align="center" />
      <el-table-column prop="className" label="班级" width="120" />
      <el-table-column prop="subjectName" label="科目" width="120" />
      <el-table-column prop="teacherName" label="教师" width="120" />
      <el-table-column prop="hoursPerWeek" label="周课时数" width="100" align="center" />
      <el-table-column prop="requiresConsecutive" label="需要连排" width="100" align="center">
        <template #default="{ row }">
          <el-tag v-if="row.requiresConsecutive" size="small" type="danger">是</el-tag>
          <el-tag v-else size="small" type="info">否</el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="createdAt" label="创建时间" width="180">
        <template #default="{ row }">
          {{ formatDate(row.createdAt) }}
        </template>
      </el-table-column>
    </el-table>

    <el-empty
      v-if="filteredCurriculums.length === 0"
      description="暂无教学计划数据，请先导入数据"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { Search } from '@element-plus/icons-vue';
import { useDictionaryStore } from '@/stores/dictionaryStore';

const dictionaryStore = useDictionaryStore();
const searchKeyword = ref('');

const filteredCurriculums = computed(() => {
  let result = [...dictionaryStore.curriculums];
  if (searchKeyword.value) {
    const keyword = searchKeyword.value.toLowerCase();
    result = result.filter(c =>
      c.className.toLowerCase().includes(keyword) ||
      c.subjectName.toLowerCase().includes(keyword) ||
      c.teacherName.toLowerCase().includes(keyword)
    );
  }
  return result;
});

const formatDate = (dateStr?: string): string => {
  if (!dateStr) return '-';
  return new Date(dateStr).toLocaleString('zh-CN');
};
</script>

<style scoped lang="scss">
.curriculum-dictionary {
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
