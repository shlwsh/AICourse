/**
 * AI Git 提交工具 - 用户交互模块
 */

import type { GitStatus, ConfirmOptions, InputOptions } from './types';

/**
 * 用户交互类
 */
export class UI {
  /**
   * 显示成功信息
   */
  success(message: string): void {
    console.log(`\x1b[32m✓\x1b[0m ${message}`);
  }

  /**
   * 显示信息
   */
  info(message: string): void {
    console.log(`\x1b[34mℹ\x1b[0m ${message}`);
  }

  /**
   * 显示警告
   */
  warn(message: string): void {
    console.log(`\x1b[33m⚠\x1b[0m ${message}`);
  }

  /**
   * 显示错误
   */
  error(message: string): void {
    console.log(`\x1b[31m✗\x1b[0m ${message}`);
  }

  /**
   * 显示加载动画
   */
  loading(message: string): () => void {
    const frames = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];
    let frameIndex = 0;
    let isRunning = true;

    // 隐藏光标
    process.stdout.write('\x1b[?25l');

    const interval = setInterval(() => {
      if (!isRunning) return;

      const frame = frames[frameIndex];
      process.stdout.write(`\r\x1b[36m${frame}\x1b[0m ${message}`);
      frameIndex = (frameIndex + 1) % frames.length;
    }, 80);

    // 返回停止函数
    return () => {
      isRunning = false;
      clearInterval(interval);
      process.stdout.write('\r\x1b[K'); // 清除当前行
      process.stdout.write('\x1b[?25h'); // 显示光标
    };
  }

  /**
   * 确认对话框
   */
  async confirm(options: ConfirmOptions): Promise<boolean> {
    const defaultText = options.default === false ? 'n' : 'y';
    const prompt = `${options.message} (y/n) [${defaultText}]: `;

    process.stdout.write(`\x1b[33m?\x1b[0m ${prompt}`);

    // 读取用户输入
    const input = await this.readLine();

    if (input.trim() === '') {
      return options.default ?? true;
    }

    const normalized = input.trim().toLowerCase();
    return normalized === 'y' || normalized === 'yes' || normalized === '是';
  }

  /**
   * 输入对话框
   */
  async input(options: InputOptions): Promise<string> {
    process.stdout.write(`\x1b[36m?\x1b[0m ${options.message}\n`);

    if (options.multiline) {
      // 多行输入模式
      process.stdout.write('\x1b[90m(输入完成后按 Ctrl+D 或输入空行结束)\x1b[0m\n');
      const lines: string[] = [];

      while (true) {
        process.stdout.write('> ');
        const line = await this.readLine();

        // 如果是空行，结束输入
        if (line === '') {
          break;
        }

        lines.push(line);
      }

      return lines.join('\n').trim() || options.default || '';
    }
    // 单行输入模式
    if (options.default) {
      process.stdout.write(`\x1b[90m[默认: ${options.default}]\x1b[0m\n`);
    }
    process.stdout.write('> ');

    const input = await this.readLine();
    return input.trim() || options.default || '';

  }

  /**
   * 显示变更摘要
   */
  showChanges(status: GitStatus): void {
    console.log('\n\x1b[1m变更摘要：\x1b[0m');
    console.log(`  新增: ${status.summary.added} 个文件`);
    console.log(`  修改: ${status.summary.modified} 个文件`);
    console.log(`  删除: ${status.summary.deleted} 个文件`);
    console.log('\n变更文件列表：');

    for (const change of status.changes) {
      const icon = this.getIconForChangeType(change.type);
      const color = this.getColorForChangeType(change.type);
      console.log(`  ${color}${icon} ${change.path}\x1b[0m`);
    }
    console.log('');
  }

  /**
   * 显示提交信息预览
   */
  showCommitMessage(message: string): void {
    console.log('\n\x1b[1m生成的提交信息：\x1b[0m');
    console.log(`\x1b[36m${  '─'.repeat(50)  }\x1b[0m`);
    console.log(message);
    console.log(`\x1b[36m${  '─'.repeat(50)  }\x1b[0m\n`);
  }

  /**
   * 获取变更类型对应的图标
   */
  private getIconForChangeType(type: string): string {
    switch (type) {
      case 'added':
        return '+';
      case 'modified':
        return '~';
      case 'deleted':
        return '-';
      default:
        return '?';
    }
  }

  /**
   * 获取变更类型对应的颜色代码
   */
  private getColorForChangeType(type: string): string {
    switch (type) {
      case 'added':
        return '\x1b[32m'; // 绿色
      case 'modified':
        return '\x1b[33m'; // 黄色
      case 'deleted':
        return '\x1b[31m'; // 红色
      default:
        return '\x1b[0m'; // 默认
    }
  }

  /**
   * 读取一行用户输入
   */
  private async readLine(): Promise<string> {
    return new Promise((resolve) => {
      const stdin = process.stdin;

      // 设置为非原始模式，允许行缓冲
      if (stdin.isTTY) {
        stdin.setRawMode(false);
      }

      stdin.resume();
      stdin.setEncoding('utf8');

      const onData = (data: string) => {
        stdin.removeListener('data', onData);
        stdin.pause();
        resolve(data.toString().trim());
      };

      const onError = () => {
        stdin.removeListener('data', onData);
        stdin.removeListener('error', onError);
        stdin.pause();
        resolve(''); // 出错时返回空字符串
      };

      stdin.once('data', onData);
      stdin.once('error', onError);
    });
  }
}
