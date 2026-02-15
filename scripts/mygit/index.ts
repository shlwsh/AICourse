#!/usr/bin/env bun

/**
 * AI Git 提交工具 - 主入口
 */

import { Logger } from './logger';
import { UI } from './ui';
import { GitService } from './git-service';
import { AIService } from './ai-service';

const logger = new Logger('Main');
const ui = new UI();

/**
 * 主函数
 */
async function main(): Promise<number> {
  try {
    logger.info('AI Git 提交工具启动');
    ui.info('欢迎使用 AI Git 提交工具\n');

    // 1. 加载配置
    const config = await loadConfig();
    if (!config) {
      ui.error('配置加载失败，请检查 .env.mygit 文件');
      return 1;
    }

    // 2. 初始化服务
    const gitService = new GitService();
    const aiService = new AIService(config);

    // 3. 验证配置
    if (!aiService.validateConfig()) {
      ui.error('AI 配置验证失败');
      return 1;
    }

    // 4. 检查是否在 Git 仓库中
    const isRepo = await gitService.isGitRepository();
    if (!isRepo) {
      ui.error('当前目录不是 Git 仓库');
      return 1;
    }

    // 5. 获取 Git 状态
    const stopLoading = ui.loading('正在检查代码变更...');
    const status = await gitService.getStatus();
    stopLoading();

    if (!status.hasChanges) {
      ui.info('没有检测到代码变更');
      return 0;
    }

    // 6. 显示变更摘要
    ui.showChanges(status);

    // 7. 确认是否继续
    const shouldContinue = await ui.confirm({
      message: '是否使用 AI 生成提交信息？',
      default: true,
    });

    if (!shouldContinue) {
      ui.info('操作已取消');
      return 0;
    }

    // 8. 生成提交信息
    const stopGenerating = ui.loading('正在生成提交信息...');
    const result = await aiService.generateCommitMessage({
      changes: status.changes,
    });
    stopGenerating();

    // 9. 显示生成的提交信息
    ui.showCommitMessage(result.message);

    if (result.usage) {
      logger.debug('Token 使用情况', result.usage);
    }

    // 10. 确认是否使用该提交信息
    const shouldUseMessage = await ui.confirm({
      message: '是否使用此提交信息？',
      default: true,
    });

    if (!shouldUseMessage) {
      // 允许用户手动编辑
      ui.info('请手动输入提交信息（输入完成后按回车两次）：');
      const customMessage = await ui.input({
        message: '',
        multiline: true,
        default: result.message,
      });

      if (!customMessage.trim()) {
        ui.info('操作已取消');
        return 0;
      }

      result.message = customMessage;
    }

    // 11. 执行 git add
    const stopAdding = ui.loading('正在添加变更到暂存区...');
    await gitService.addAll();
    stopAdding();
    ui.success('变更已添加到暂存区');

    // 12. 执行 git commit
    const stopCommitting = ui.loading('正在创建提交...');
    await gitService.commit(result.message);
    stopCommitting();
    ui.success('提交创建成功');

    // 13. 确认是否推送到远程
    const shouldPush = await ui.confirm({
      message: '是否推送到远程仓库？',
      default: true,
    });

    if (shouldPush) {
      const stopPushing = ui.loading('正在推送到远程仓库...');
      await gitService.push();
      stopPushing();
      ui.success('推送成功');
    }

    ui.success('\n✨ 所有操作完成！');
    return 0;
  } catch (error) {
    logger.error('执行失败', error as Error);
    ui.error(`执行失败: ${(error as Error).message}`);
    return 1;
  }
}

/**
 * 加载配置
 */
async function loadConfig(): Promise<{ apiKey: string; baseUrl: string; model: string } | null> {
  try {
    logger.debug('加载配置文件');

    // 读取 .env.mygit 文件
    const envFile = Bun.file('.env.mygit');
    const envContent = await envFile.text();

    // 解析环境变量
    const lines = envContent.split('\n');
    const env: Record<string, string> = {};

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;

      const [key, ...valueParts] = trimmed.split('=');
      if (key && valueParts.length > 0) {
        env[key.trim()] = valueParts.join('=').trim();
      }
    }

    const apiKey = env.DASHSCOPE_API_KEY || process.env.DASHSCOPE_API_KEY || '';
    const baseUrl = env.DASHSCOPE_BASE_URL || process.env.DASHSCOPE_BASE_URL || '';
    const model = env.DASHSCOPE_MODEL || process.env.DASHSCOPE_MODEL || '';

    if (!apiKey || !baseUrl || !model) {
      logger.error('配置不完整');
      logger.debug('配置检查结果', { hasApiKey: !!apiKey, hasBaseUrl: !!baseUrl, hasModel: !!model });
      return null;
    }

    logger.debug('配置加载成功');
    return { apiKey, baseUrl, model };
  } catch (error) {
    logger.error('加载配置失败', error as Error);
    return null;
  }
}

// 处理未捕获的异常
process.on('uncaughtException', (error) => {
  logger.error('未捕获的异常', error);
  process.exit(1);
});

// 处理 SIGINT 信号（Ctrl+C）
process.on('SIGINT', () => {
  logger.info('用户中断操作');
  ui.info('操作已取消');
  process.exit(0);
});

// 执行主函数
main().then((exitCode) => {
  process.exit(exitCode);
});
