<template>
  <div class="help-container">
    <el-card>
      <template #header>
        <div class="card-header">
          <span>帮助中心</span>
        </div>
      </template>
      <div class="help-content">
        <el-row :gutter="20">
          <!-- 左侧导航 -->
          <el-col :span="6">
            <el-menu :default-active="activeSection" @select="handleMenuSelect">
              <el-menu-item index="quick-start">
                <el-icon><Document /></el-icon>
                <span>快速开始</span>
              </el-menu-item>
              <el-menu-item index="schedule">
                <el-icon><Calendar /></el-icon>
                <span>自动排课</span>
              </el-menu-item>
              <el-menu-item index="manual">
                <el-icon><Edit /></el-icon>
                <span>手动调课</span>
              </el-menu-item>
              <el-menu-item index="teacher">
                <el-icon><User /></el-icon>
                <span>教师管理</span>
              </el-menu-item>
              <el-menu-item index="import-export">
                <el-icon><Upload /></el-icon>
                <span>导入导出</span>
              </el-menu-item>
              <el-menu-item index="faq">
                <el-icon><QuestionFilled /></el-icon>
                <span>常见问题</span>
              </el-menu-item>
            </el-menu>
          </el-col>

          <!-- 右侧内容 -->
          <el-col :span="18">
            <div class="help-section">
              <!-- 快速开始 -->
              <div v-if="activeSection === 'quick-start'" class="section-content">
                <h2>快速开始</h2>
                <el-divider />
                <h3>1. 系统配置</h3>
                <p>首次使用系统时，请先完成基础配置：</p>
                <ul>
                  <li>配置作息时间和排课周期</li>
                  <li>添加教师信息和教研组</li>
                  <li>配置科目和场地信息</li>
                  <li>设置班级和教学计划</li>
                </ul>

                <h3>2. 自动排课</h3>
                <p>完成配置后，点击"自动排课"按钮，系统将自动生成满足所有约束的课表。</p>

                <h3>3. 手动调整</h3>
                <p>如需调整课表，可使用拖拽功能手动调课，系统会实时检测冲突。</p>
              </div>

              <!-- 自动排课 -->
              <div v-else-if="activeSection === 'schedule'" class="section-content">
                <h2>自动排课</h2>
                <el-divider />
                <h3>功能说明</h3>
                <p>自动排课功能使用智能算法生成课表，确保满足所有硬约束并尽量优化软约束。</p>

                <h3>硬约束</h3>
                <ul>
                  <li>体育、音乐、美术课程不安排在第1-3节</li>
                  <li>每个班级的课时数达到教学计划要求</li>
                  <li>同一教师同一时间只能在一个班级上课</li>
                  <li>同一班级同一时间只有一门课程</li>
                </ul>

                <h3>软约束</h3>
                <ul>
                  <li>尽量满足教师的时间偏好</li>
                  <li>避免主科连续3节以上</li>
                  <li>同一教师多班课程进度保持一致</li>
                </ul>
              </div>

              <!-- 手动调课 -->
              <div v-else-if="activeSection === 'manual'" class="section-content">
                <h2>手动调课</h2>
                <el-divider />
                <h3>拖拽调课</h3>
                <p>在课表中直接拖拽课程卡片到目标位置，系统会实时显示：</p>
                <ul>
                  <li><span class="color-tag green">绿色</span>：可以安排</li>
                  <li><span class="color-tag yellow">黄色</span>：不推荐（违反软约束）</li>
                  <li><span class="color-tag red">红色</span>：不可安排（违反硬约束）</li>
                </ul>

                <h3>交换建议</h3>
                <p>当目标位置被占用时，系统会自动提供智能交换方案。</p>
              </div>

              <!-- 教师管理 -->
              <div v-else-if="activeSection === 'teacher'" class="section-content">
                <h2>教师管理</h2>
                <el-divider />
                <h3>教师偏好设置</h3>
                <p>可以为每位教师配置：</p>
                <ul>
                  <li>偏好时间段</li>
                  <li>早晚课偏好</li>
                  <li>不排课时段</li>
                  <li>重要性权重</li>
                </ul>

                <h3>工作量统计</h3>
                <p>系统自动统计教师的总课时、授课班级数、早晚课节数等信息。</p>
              </div>

              <!-- 导入导出 -->
              <div v-else-if="activeSection === 'import-export'" class="section-content">
                <h2>导入导出</h2>
                <el-divider />
                <h3>Excel 导入</h3>
                <p>支持从 Excel 文件批量导入排课条件，包括教师信息、课程配置、教学计划等。</p>

                <h3>课表导出</h3>
                <p>支持导出班级课表、教师课表和总课表到 Excel 或 PDF 格式。</p>
              </div>

              <!-- 常见问题 -->
              <div v-else-if="activeSection === 'faq'" class="section-content">
                <h2>常见问题</h2>
                <el-divider />
                <el-collapse>
                  <el-collapse-item title="Q: 自动排课失败怎么办？" name="1">
                    <p>
                      A:
                      自动排课失败通常是因为约束条件过于严格，导致无法找到可行解。建议检查以下配置：
                    </p>
                    <ul>
                      <li>总课时数是否超过可用时间槽位</li>
                      <li>教师不排课时段是否设置过多</li>
                      <li>场地容量是否足够</li>
                    </ul>
                  </el-collapse-item>
                  <el-collapse-item title="Q: 如何提高课表质量？" name="2">
                    <p>A: 可以通过以下方式优化课表质量：</p>
                    <ul>
                      <li>合理设置教师偏好和权重</li>
                      <li>适当放宽软约束条件</li>
                      <li>使用手动预排课功能先安排难排的课程</li>
                    </ul>
                  </el-collapse-item>
                  <el-collapse-item title="Q: 如何处理临时调课？" name="3">
                    <p>A: 系统支持临时调课功能：</p>
                    <ul>
                      <li>创建临时课表副本</li>
                      <li>在副本中进行调整</li>
                      <li>自动生成调课通知</li>
                      <li>临时调课期结束后自动恢复</li>
                    </ul>
                  </el-collapse-item>
                </el-collapse>
              </div>
            </div>
          </el-col>
        </el-row>
      </div>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import {
  Document,
  Calendar,
  Edit,
  User,
  Upload,
  QuestionFilled,
} from '@element-plus/icons-vue';
import { logger } from '@/utils/logger';

// 当前激活的帮助章节
const activeSection = ref('quick-start');

/**
 * 处理菜单选择
 */
const handleMenuSelect = (index: string) => {
  logger.info('用户切换帮助章节', { section: index });
  activeSection.value = index;
};
</script>

<style scoped>
.help-container {
  max-width: 1400px;
  margin: 0 auto;
}

.card-header {
  font-size: 18px;
  font-weight: 600;
}

.help-content {
  min-height: 600px;
}

.help-section {
  padding: 20px;
}

.section-content h2 {
  font-size: 24px;
  margin-bottom: 10px;
  color: #303133;
}

.section-content h3 {
  font-size: 18px;
  margin: 20px 0 10px;
  color: #606266;
}

.section-content p {
  line-height: 1.8;
  color: #606266;
  margin-bottom: 15px;
}

.section-content ul {
  padding-left: 20px;
  margin-bottom: 15px;
}

.section-content li {
  line-height: 2;
  color: #606266;
}

.color-tag {
  display: inline-block;
  padding: 2px 8px;
  border-radius: 3px;
  font-weight: 600;
}

.color-tag.green {
  background-color: #67c23a;
  color: white;
}

.color-tag.yellow {
  background-color: #e6a23c;
  color: white;
}

.color-tag.red {
  background-color: #f56c6c;
  color: white;
}
</style>
