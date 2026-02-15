/**
 * AI Git 提交工具 - AI 服务模块
 */

import type { AIConfig, GenerateCommitMessageRequest, GenerateCommitMessageResponse } from './types';
import { Logger } from './logger';

const logger = new Logger('AIService');

/**
 * AI 服务类
 */
export class AIService {
  private config: AIConfig;

  constructor(config: AIConfig) {
    this.config = config;
    logger.debug('AIService 初始化', {
      baseUrl: config.baseUrl,
      model: config.model,
    });
  }

  /**
   * 验证配置
   */
  validateConfig(): boolean {
    logger.debug('验证 AI 配置');

    if (!this.config.apiKey) {
      logger.error('API 密钥缺失');
      return false;
    }

    if (!this.config.baseUrl) {
      logger.error('API 基础 URL 缺失');
      return false;
    }

    if (!this.config.model) {
      logger.error('模型名称缺失');
      return false;
    }

    return true;
  }

  /**
   * 生成提交信息
   */
  async generateCommitMessage(
    request: GenerateCommitMessageRequest,
  ): Promise<GenerateCommitMessageResponse> {
    logger.info('开始生成提交信息', {
      changesCount: request.changes.length,
    });

    try {
      // 构建提示词
      const prompt = this.buildPrompt(request.changes);

      logger.debug('发送 API 请求', {
        model: this.config.model,
        promptLength: prompt.length,
      });

      // 调用 API
      const response = await fetch(`${this.config.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.config.apiKey}`,
        },
        body: JSON.stringify({
          model: this.config.model,
          messages: [
            {
              role: 'system',
              content: '你是一个专业的 Git 提交信息生成助手。请根据代码变更生成简洁、清晰的中文提交信息。',
            },
            {
              role: 'user',
              content: prompt,
            },
          ],
          max_tokens: request.maxTokens || 500,
          temperature: 0.7,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        logger.error('API 请求失败', undefined, {
          status: response.status,
          statusText: response.statusText,
          error: errorText,
        });
        throw new Error(`API 请求失败: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();

      logger.debug('API 响应成功', {
        usage: data.usage,
      });

      const message = data.choices[0]?.message?.content?.trim() || '';

      if (!message) {
        throw new Error('API 返回的提交信息为空');
      }

      return {
        message,
        usage: data.usage ? {
          promptTokens: data.usage.prompt_tokens,
          completionTokens: data.usage.completion_tokens,
          totalTokens: data.usage.total_tokens,
        } : undefined,
      };
    } catch (error) {
      logger.error('生成提交信息失败', error as Error);
      throw error;
    }
  }

  /**
   * 构建提示词
   */
  private buildPrompt(changes: any[]): string {
    let prompt = '请根据以下代码变更生成一个简洁的 Git 提交信息：\n\n';

    // 添加变更摘要
    const summary = {
      added: changes.filter(c => c.type === 'added').length,
      modified: changes.filter(c => c.type === 'modified').length,
      deleted: changes.filter(c => c.type === 'deleted').length,
    };

    prompt += '变更摘要：\n';
    if (summary.added > 0) prompt += `- 新增 ${summary.added} 个文件\n`;
    if (summary.modified > 0) prompt += `- 修改 ${summary.modified} 个文件\n`;
    if (summary.deleted > 0) prompt += `- 删除 ${summary.deleted} 个文件\n`;
    prompt += '\n';

    // 添加文件列表和 diff（限制长度）
    prompt += '变更详情：\n';
    for (const change of changes) {
      prompt += `\n${this.getChangeTypeText(change.type)}: ${change.path}\n`;

      if (change.diff) {
        // 限制 diff 长度，避免超过 token 限制
        const diffLines = change.diff.split('\n');
        const limitedDiff = diffLines.slice(0, 50).join('\n');
        prompt += `\`\`\`diff\n${  limitedDiff  }\n\`\`\`\n`;
      }
    }

    prompt += '\n要求：\n';
    prompt += '1. 使用中文\n';
    prompt += '2. 第一行是简短的标题（不超过 50 字符）\n';
    prompt += '3. 如果需要，空一行后添加详细说明\n';
    prompt += '4. 使用常见的提交类型前缀（如：feat、fix、docs、style、refactor、test、chore）\n';
    prompt += '5. 描述要清晰、准确，说明做了什么改动\n';

    return prompt;
  }

  /**
   * 获取变更类型文本
   */
  private getChangeTypeText(type: string): string {
    switch (type) {
      case 'added':
        return '新增';
      case 'modified':
        return '修改';
      case 'deleted':
        return '删除';
      default:
        return '变更';
    }
  }
}
