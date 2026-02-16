<!--
  Footer 组件 - 页脚
  功能：
  - 版权信息
  - 版本号
  - 其他链接
-->
<template>
  <el-footer class="app-footer">
    <div class="footer-content">
      <!-- 左侧：版权信息 -->
      <div class="footer-left">
        <span class="copyright">
          © {{ currentYear }} 排课系统 - 基于约束优化的智能课程调度
        </span>
      </div>

      <!-- 中间：快捷链接 -->
      <div class="footer-center">
        <el-link
          :underline="false"
          @click="goToHelp"
          class="footer-link"
        >
          <el-icon><QuestionFilled /></el-icon>
          帮助文档
        </el-link>
        <el-divider direction="vertical" />
        <el-link
          :underline="false"
          @click="showAbout"
          class="footer-link"
        >
          <el-icon><InfoFilled /></el-icon>
          关于系统
        </el-link>
        <el-divider direction="vertical" />
        <el-link
          :underline="false"
          @click="showFeedback"
          class="footer-link"
        >
          <el-icon><ChatDotRound /></el-icon>
          反馈建议
        </el-link>
      </div>

      <!-- 右侧：版本信息和状态 -->
      <div class="footer-right">
        <el-tag size="small" type="info" effect="plain">
          版本 {{ version }}
        </el-tag>
        <el-tag
          size="small"
          :type="systemStatus.type"
          effect="plain"
          class="status-tag"
        >
          <el-icon class="status-icon">
            <component :is="systemStatus.icon" />
          </el-icon>
          {{ systemStatus.text }}
        </el-tag>
      </div>
    </div>

    <!-- 关于对话框 -->
    <el-dialog
      v-model="aboutDialogVisible"
      title="关于排课系统"
      width="500px"
      :close-on-click-modal="true"
    >
      <div class="about-content">
        <div class="about-logo">
          <el-icon :size="64" color="var(--el-color-primary)">
            <Calendar />
          </el-icon>
        </div>
        <h2>排课系统</h2>
        <p class="about-subtitle">基于约束优化的智能课程调度系统</p>
        <el-divider />
        <div class="about-info">
          <p><strong>版本：</strong>{{ version }}</p>
          <p><strong>技术栈：</strong>Bun + Rust + Tauri + Vue 3</p>
          <p><strong>开发团队：</strong>排课系统开发组</p>
          <p><strong>发布日期：</strong>{{ releaseDate }}</p>
        </div>
        <el-divider />
        <div class="about-features">
          <h4>核心功能</h4>
          <ul>
            <li>智能自动排课算法</li>
            <li>可视化手动调课</li>
            <li>教师偏好管理</li>
            <li>冲突检测与建议</li>
            <li>数据导入导出</li>
            <li>工作量统计分析</li>
          </ul>
        </div>
      </div>
      <template #footer>
        <el-button @click="aboutDialogVisible = false">关闭</el-button>
      </template>
    </el-dialog>

    <!-- 反馈对话框 -->
    <el-dialog
      v-model="feedbackDialogVisible"
      title="反馈建议"
      width="500px"
      :close-on-click-modal="true"
    >
      <el-form :model="feedbackForm" label-width="80px">
        <el-form-item label="反馈类型">
          <el-select v-model="feedbackForm.type" placeholder="请选择反馈类型">
            <el-option label="功能建议" value="feature" />
            <el-option label="问题反馈" value="bug" />
            <el-option label="使用咨询" value="question" />
            <el-option label="其他" value="other" />
          </el-select>
        </el-form-item>
        <el-form-item label="反馈内容">
          <el-input
            v-model="feedbackForm.content"
            type="textarea"
            :rows="6"
            placeholder="请详细描述您的反馈内容..."
          />
        </el-form-item>
        <el-form-item label="联系方式">
          <el-input
            v-model="feedbackForm.contact"
            placeholder="选填：邮箱或电话（方便我们联系您）"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="feedbackDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="submitFeedback">提交</el-button>
      </template>
    </el-dialog>
  </el-footer>
</template>

<script setup lang="ts">
import { computed, ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { ElMessage } from 'element-plus';
import {
  QuestionFilled,
  InfoFilled,
  ChatDotRound,
  Calendar,
  CircleCheck,
  Warning,
} from '@element-plus/icons-vue';
import { logger } from '@/utils/logger';

// 路由实例
const router = useRouter();

// 版本信息
const version = ref('0.1.0');
const releaseDate = ref('2024-01-01');

// 当前年份
const currentYear = computed(() => new Date().getFullYear());

// 系统状态
const systemStatus = ref({
  type: 'success' as 'success' | 'warning' | 'danger',
  icon: CircleCheck,
  text: '运行正常',
});

// 对话框状态
const aboutDialogVisible = ref(false);
const feedbackDialogVisible = ref(false);

// 反馈表单
const feedbackForm = ref({
  type: '',
  content: '',
  contact: '',
});

/**
 * 跳转到帮助页面
 */
const goToHelp = () => {
  logger.info('Footer: 打开帮助文档');
  router.push('/help');
};

/**
 * 显示关于对话框
 */
const showAbout = () => {
  logger.info('Footer: 显示关于对话框');
  aboutDialogVisible.value = true;
};

/**
 * 显示反馈对话框
 */
const showFeedback = () => {
  logger.info('Footer: 显示反馈对话框');
  feedbackDialogVisible.value = true;
};

/**
 * 提交反馈
 */
const submitFeedback = () => {
  if (!feedbackForm.value.type) {
    ElMessage.warning('请选择反馈类型');
    return;
  }
  if (!feedbackForm.value.content.trim()) {
    ElMessage.warning('请填写反馈内容');
    return;
  }

  logger.info('Footer: 提交反馈', {
    type: feedbackForm.value.type,
    contentLength: feedbackForm.value.content.length,
    hasContact: !!feedbackForm.value.contact,
  });

  // TODO: 实际提交反馈到后端
  ElMessage.success('感谢您的反馈！我们会认真处理。');
  feedbackDialogVisible.value = false;

  // 重置表单
  feedbackForm.value = {
    type: '',
    content: '',
    contact: '',
  };
};

/**
 * 检查系统状态
 */
const checkSystemStatus = async () => {
  try {
    // TODO: 实际调用后端健康检查接口
    logger.debug('Footer: 检查系统状态');
    systemStatus.value = {
      type: 'success',
      icon: CircleCheck,
      text: '运行正常',
    };
  } catch (error) {
    logger.error('Footer: 系统状态检查失败', { error });
    systemStatus.value = {
      type: 'warning',
      icon: Warning,
      text: '连接异常',
    };
  }
};

// 组件挂载时检查系统状态
onMounted(() => {
  checkSystemStatus();
  // 每30秒检查一次系统状态
  setInterval(checkSystemStatus, 30000);
});
</script>

<style scoped>
/* 页脚样式 */
.app-footer {
  background: var(--el-bg-color);
  border-top: 1px solid var(--el-border-color);
  height: 40px;
  display: flex;
  align-items: center;
  padding: 0 20px;
  box-shadow: 0 -1px 4px rgba(0, 0, 0, 0.08);
}

.footer-content {
  width: 100%;
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 12px;
  color: var(--el-text-color-secondary);
  gap: 16px;
}

/* 左侧版权信息 */
.footer-left {
  flex-shrink: 0;
}

.copyright {
  white-space: nowrap;
}

/* 中间快捷链接 */
.footer-center {
  display: flex;
  align-items: center;
  gap: 8px;
  flex: 1;
  justify-content: center;
}

.footer-link {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  color: var(--el-text-color-secondary);
  transition: color 0.3s ease;
}

.footer-link:hover {
  color: var(--el-color-primary);
}

/* 右侧版本和状态 */
.footer-right {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
}

.status-tag {
  display: flex;
  align-items: center;
  gap: 4px;
}

.status-icon {
  font-size: 12px;
}

/* 关于对话框内容 */
.about-content {
  text-align: center;
}

.about-logo {
  margin-bottom: 16px;
}

.about-content h2 {
  margin: 0 0 8px 0;
  font-size: 24px;
  color: var(--el-text-color-primary);
}

.about-subtitle {
  color: var(--el-text-color-secondary);
  margin-bottom: 16px;
}

.about-info {
  text-align: left;
  padding: 0 20px;
}

.about-info p {
  margin: 8px 0;
  color: var(--el-text-color-regular);
}

.about-features {
  text-align: left;
  padding: 0 20px;
}

.about-features h4 {
  margin: 0 0 12px 0;
  color: var(--el-text-color-primary);
}

.about-features ul {
  margin: 0;
  padding-left: 20px;
}

.about-features li {
  margin: 6px 0;
  color: var(--el-text-color-regular);
}

/* 响应式设计 */
@media (max-width: 768px) {
  .footer-content {
    font-size: 11px;
    gap: 8px;
  }

  .footer-center {
    display: none;
  }

  .copyright {
    font-size: 10px;
  }

  .footer-right {
    gap: 4px;
  }
}

@media (max-width: 480px) {
  .app-footer {
    padding: 0 12px;
  }

  .copyright {
    display: none;
  }

  .footer-left::after {
    content: '© 排课系统';
    font-size: 10px;
  }
}
</style>
