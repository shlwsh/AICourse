#!/usr/bin/env bun

/**
 * AI Git 提交工具 - 测试脚本
 */

import { GitService } from './git-service';
import { AIService } from './ai-service';

/**
 * 测试 Git 服务
 */
async function testGitService() {
  console.log('\n=== 测试 Git 服务 ===\n');

  const gitService = new GitService();

  // 1. 检查是否在 Git 仓库中
  const isRepo = await gitService.isGitRepository();
  console.log(`✓ 是否在 Git 仓库中: ${isRepo}`);

  if (!isRepo) {
    console.log('✗ 不在 Git 仓库中，跳过后续测试');
    return false;
  }

  // 2. 获取 Git 状态
  const status = await gitService.getStatus();
  console.log(`✓ 检测到变更: ${status.hasChanges}`);
  console.log(`  - 新增: ${status.summary.added} 个文件`);
  console.log(`  - 修改: ${status.summary.modified} 个文件`);
  console.log(`  - 删除: ${status.summary.deleted} 个文件`);

  if (status.changes.length > 0) {
    console.log('\n变更文件列表（前 5 个）:');
    status.changes.slice(0, 5).forEach(change => {
      console.log(`  ${change.type}: ${change.path}`);
    });
  }

  return status.hasChanges;
}

/**
 * 测试 AI 服务
 */
async function testAIService() {
  console.log('\n=== 测试 AI 服务 ===\n');

  // 加载配置
  const envFile = Bun.file('.env.mygit');
  let envContent: string;

  try {
    envContent = await envFile.text();
  } catch (error) {
    console.log('✗ 无法读取 .env.mygit 文件');
    return false;
  }

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

  const apiKey = env.DASHSCOPE_API_KEY || '';
  const baseUrl = env.DASHSCOPE_BASE_URL || '';
  const model = env.DASHSCOPE_MODEL || '';

  if (!apiKey || !baseUrl || !model) {
    console.log('✗ 配置不完整');
    return false;
  }

  console.log(`✓ API 密钥: ${apiKey.substring(0, 10)}...`);
  console.log(`✓ API 基础 URL: ${baseUrl}`);
  console.log(`✓ 模型: ${model}`);

  // 创建 AI 服务
  const aiService = new AIService({ apiKey, baseUrl, model });

  // 验证配置
  const isValid = aiService.validateConfig();
  console.log(`✓ 配置验证: ${isValid ? '通过' : '失败'}`);

  // 测试生成提交信息（使用简单的测试数据）
  if (isValid) {
    console.log('\n测试生成提交信息...');
    try {
      const result = await aiService.generateCommitMessage({
        changes: [
          {
            type: 'added',
            path: 'test.ts',
            diff: '+console.log("Hello World");',
          },
        ],
      });

      console.log('✓ 生成成功:');
      console.log('─'.repeat(50));
      console.log(result.message);
      console.log('─'.repeat(50));

      if (result.usage) {
        console.log(`\nToken 使用: ${result.usage.totalTokens}`);
      }

      return true;
    } catch (error) {
      console.log(`✗ 生成失败: ${(error as Error).message}`);
      return false;
    }
  }

  return isValid;
}

/**
 * 主函数
 */
async function main() {
  console.log('\n╔════════════════════════════════════════╗');
  console.log('║   AI Git 提交工具 - 功能测试          ║');
  console.log('╚════════════════════════════════════════╝');

  try {
    // 测试 Git 服务
    const gitOk = await testGitService();

    // 测试 AI 服务
    const aiOk = await testAIService();

    // 输出结果
    console.log('\n=== 测试结果 ===\n');
    console.log(`Git 服务: ${gitOk ? '✓ 通过' : '✗ 失败'}`);
    console.log(`AI 服务: ${aiOk ? '✓ 通过' : '✗ 失败'}`);

    if (gitOk && aiOk) {
      console.log('\n✨ 所有测试通过！工具可以正常使用。');
      console.log('\n运行 `bun run mygit` 开始使用。');
      process.exit(0);
    } else {
      console.log('\n⚠ 部分测试失败，请检查配置。');
      process.exit(1);
    }
  } catch (error) {
    console.error('\n✗ 测试过程出错:', error);
    process.exit(1);
  }
}

// 运行测试
main();
