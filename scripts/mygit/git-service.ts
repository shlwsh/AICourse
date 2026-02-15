/**
 * AI Git 提交工具 - Git 服务模块
 */

import type { GitStatus, GitChange, GitChangeType } from './types';
import { Logger } from './logger';

const logger = new Logger('GitService');

/**
 * Git 服务类
 */
export class GitService {
  /**
   * 检查是否在 Git 仓库中
   */
  async isGitRepository(): Promise<boolean> {
    logger.debug('检查是否在 Git 仓库中');
    try {
      const proc = Bun.spawn(['git', 'rev-parse', '--git-dir'], {
        stdout: 'pipe',
        stderr: 'pipe',
      });
      const exitCode = await proc.exited;
      return exitCode === 0;
    } catch (error) {
      logger.error('检查 Git 仓库失败', error as Error);
      return false;
    }
  }

  /**
   * 获取当前状态
   */
  async getStatus(): Promise<GitStatus> {
    logger.debug('获取 Git 状态');

    try {
      // 执行 git status --porcelain
      const proc = Bun.spawn(['git', 'status', '--porcelain'], {
        stdout: 'pipe',
        stderr: 'pipe',
      });

      const output = await new Response(proc.stdout).text();
      const exitCode = await proc.exited;

      if (exitCode !== 0) {
        throw new Error('获取 Git 状态失败');
      }

      const changes: GitChange[] = [];
      const summary = { added: 0, modified: 0, deleted: 0 };

      // 解析 git status 输出
      const lines = output.trim().split('\n').filter(line => line.length > 0);

      for (const line of lines) {
        const status = line.substring(0, 2);
        const filePath = line.substring(3);

        let type: GitChangeType;
        if (status.includes('A') || status.includes('?')) {
          type = 'added';
          summary.added++;
        } else if (status.includes('D')) {
          type = 'deleted';
          summary.deleted++;
        } else {
          type = 'modified';
          summary.modified++;
        }

        // 获取文件的 diff
        const diff = type !== 'deleted' ? await this.getDiff(filePath) : undefined;

        changes.push({ type, path: filePath, diff });
      }

      return {
        hasChanges: changes.length > 0,
        changes,
        summary,
      };
    } catch (error) {
      logger.error('获取 Git 状态失败', error as Error);
      throw error;
    }
  }

  /**
   * 获取文件 diff
   */
  async getDiff(filePath: string): Promise<string> {
    logger.debug('获取文件 diff', { filePath });

    try {
      // 先尝试获取已暂存的 diff
      let proc = Bun.spawn(['git', 'diff', '--cached', '--', filePath], {
        stdout: 'pipe',
        stderr: 'pipe',
      });

      let output = await new Response(proc.stdout).text();

      // 如果没有已暂存的 diff，获取工作区的 diff
      if (!output.trim()) {
        proc = Bun.spawn(['git', 'diff', '--', filePath], {
          stdout: 'pipe',
          stderr: 'pipe',
        });
        output = await new Response(proc.stdout).text();
      }

      // 如果还是没有 diff，可能是新文件
      if (!output.trim()) {
        proc = Bun.spawn(['git', 'diff', '--no-index', '/dev/null', filePath], {
          stdout: 'pipe',
          stderr: 'pipe',
        });
        output = await new Response(proc.stdout).text();
      }

      return output;
    } catch (error) {
      logger.warn('获取文件 diff 失败', { filePath, error });
      return '';
    }
  }

  /**
   * 添加所有变更到暂存区
   */
  async addAll(): Promise<void> {
    logger.info('执行 git add .');

    try {
      const proc = Bun.spawn(['git', 'add', '.'], {
        stdout: 'pipe',
        stderr: 'pipe',
      });

      const exitCode = await proc.exited;

      if (exitCode !== 0) {
        const error = await new Response(proc.stderr).text();
        throw new Error(`git add 失败: ${error}`);
      }

      logger.info('git add 执行成功');
    } catch (error) {
      logger.error('git add 执行失败', error as Error);
      throw error;
    }
  }

  /**
   * 创建提交
   */
  async commit(message: string): Promise<void> {
    logger.info('执行 git commit', { messageLength: message.length });

    try {
      const proc = Bun.spawn(['git', 'commit', '-m', message], {
        stdout: 'pipe',
        stderr: 'pipe',
      });

      const exitCode = await proc.exited;

      if (exitCode !== 0) {
        const error = await new Response(proc.stderr).text();
        throw new Error(`git commit 失败: ${error}`);
      }

      logger.info('git commit 执行成功');
    } catch (error) {
      logger.error('git commit 执行失败', error as Error);
      throw error;
    }
  }

  /**
   * 获取当前分支名
   */
  async getCurrentBranch(): Promise<string> {
    logger.debug('获取当前分支名');

    try {
      const proc = Bun.spawn(['git', 'rev-parse', '--abbrev-ref', 'HEAD'], {
        stdout: 'pipe',
        stderr: 'pipe',
      });

      const output = await new Response(proc.stdout).text();
      const exitCode = await proc.exited;

      if (exitCode !== 0) {
        throw new Error('获取当前分支名失败');
      }

      return output.trim();
    } catch (error) {
      logger.error('获取当前分支名失败', error as Error);
      throw error;
    }
  }

  /**
   * 推送到远程仓库
   */
  async push(): Promise<void> {
    logger.info('执行 git push');

    try {
      // 先尝试普通推送
      let proc = Bun.spawn(['git', 'push'], {
        stdout: 'pipe',
        stderr: 'pipe',
      });

      let exitCode = await proc.exited;

      if (exitCode !== 0) {
        const error = await new Response(proc.stderr).text();

        // 如果是因为没有设置上游分支，尝试设置上游分支并推送
        if (error.includes('no upstream branch') || error.includes('set-upstream')) {
          logger.info('首次推送，设置上游分支');
          const branch = await this.getCurrentBranch();

          proc = Bun.spawn(['git', 'push', '-u', 'origin', branch], {
            stdout: 'pipe',
            stderr: 'pipe',
          });

          exitCode = await proc.exited;

          if (exitCode !== 0) {
            const pushError = await new Response(proc.stderr).text();
            throw new Error(`git push 失败: ${pushError}`);
          }

          logger.info('git push 执行成功（已设置上游分支）');
        } else {
          throw new Error(`git push 失败: ${error}`);
        }
      } else {
        logger.info('git push 执行成功');
      }
    } catch (error) {
      logger.error('git push 执行失败', error as Error);
      throw error;
    }
  }
}
