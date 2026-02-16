/**
 * 自定义测试报告生成器
 *
 * 扩展 Playwright 的默认报告功能，提供更详细的测试报告
 *
 * 功能特性：
 * - 生成中文测试报告
 * - 记录测试执行时间
 * - 统计测试结果
 * - 生成测试摘要
 * - 支持自定义报告格式
 */

import type {
  Reporter,
  FullConfig,
  Suite,
  TestCase,
  TestResult,
  FullResult,
} from '@playwright/test/reporter';
import { writeFileSync, mkdirSync, existsSync } from 'fs';
import { join } from 'path';

/**
 * 测试统计信息
 */
interface TestStats {
  total: number;
  passed: number;
  failed: number;
  skipped: number;
  flaky: number;
  duration: number;
}

/**
 * 测试用例信息
 */
interface TestCaseInfo {
  title: string;
  file: string;
  line: number;
  status: string;
  duration: number;
  error?: string;
  retries: number;
}

/**
 * 自定义测试报告生成器类
 */
export class CustomReporter implements Reporter {
  private stats: TestStats = {
    total: 0,
    passed: 0,
    failed: 0,
    skipped: 0,
    flaky: 0,
    duration: 0,
  };

  private testCases: TestCaseInfo[] = [];
  private startTime: number = 0;
  private config: FullConfig | null = null;

  /**
   * 测试运行开始时调用
   */
  onBegin(config: FullConfig, _suite: Suite): void {
    this.config = config;
    this.startTime = Date.now();

    console.log('\n========================================');
    console.log('📋 开始执行集成测试');
    console.log('========================================\n');
  }

  /**
   * 测试用例开始时调用
   */
  onTestBegin(test: TestCase, _result: TestResult): void {
    console.log(`\n▶️  执行测试: ${test.title}`);
    console.log(`   文件: ${test.location.file}:${test.location.line}`);
  }

  /**
   * 测试用例结束时调用
   */
  onTestEnd(test: TestCase, result: TestResult): void {
    this.stats.total++;

    const testInfo: TestCaseInfo = {
      title: test.title,
      file: test.location.file,
      line: test.location.line,
      status: result.status,
      duration: result.duration,
      retries: result.retry,
    };

    // 统计测试结果
    switch (result.status) {
      case 'passed':
        this.stats.passed++;
        console.log(`✅ 测试通过 (${result.duration}ms)`);
        break;

      case 'failed':
        this.stats.failed++;
        testInfo.error = result.error?.message || '未知错误';
        console.log(`❌ 测试失败 (${result.duration}ms)`);
        if (result.error) {
          console.log(`   错误: ${result.error.message}`);
        }
        break;

      case 'skipped':
        this.stats.skipped++;
        console.log(`⏭️  测试跳过`);
        break;

      case 'timedOut':
        this.stats.failed++;
        testInfo.error = '测试超时';
        console.log(`⏱️  测试超时 (${result.duration}ms)`);
        break;
    }

    // 检查是否为 flaky 测试（重试后通过）
    if (result.status === 'passed' && result.retry > 0) {
      this.stats.flaky++;
      console.log(`⚠️  测试不稳定（重试 ${result.retry} 次后通过）`);
    }

    this.testCases.push(testInfo);
  }

  /**
   * 测试运行结束时调用
   */
  async onEnd(result: FullResult): void {
    this.stats.duration = Date.now() - this.startTime;

    console.log('\n========================================');
    console.log('📊 测试执行完成');
    console.log('========================================\n');

    // 打印测试统计
    this.printStats();

    // 生成测试报告文件
    await this.generateReportFiles(result);

    console.log('\n========================================\n');
  }

  /**
   * 打印测试统计信息
   */
  private printStats(): void {
    console.log('测试统计:');
    console.log('─────────────────────────────');
    console.log(`总计:     ${this.stats.total} 个测试`);
    console.log(`通过:     ${this.stats.passed} ✅`);
    console.log(`失败:     ${this.stats.failed} ❌`);
    console.log(`跳过:     ${this.stats.skipped} ⏭️`);
    console.log(`不稳定:   ${this.stats.flaky} ⚠️`);
    console.log(`总耗时:   ${(this.stats.duration / 1000).toFixed(2)} 秒`);
    console.log('─────────────────────────────');

    // 计算通过率
    const passRate = this.stats.total > 0
      ? ((this.stats.passed / this.stats.total) * 100).toFixed(2)
      : '0.00';

    console.log(`\n通过率: ${passRate}%`);

    // 如果有失败的测试，列出失败的测试
    if (this.stats.failed > 0) {
      console.log('\n失败的测试:');
      const failedTests = this.testCases.filter(
        t => t.status === 'failed' || t.status === 'timedOut',
      );

      for (const test of failedTests) {
        console.log(`  ❌ ${test.title}`);
        console.log(`     文件: ${test.file}:${test.line}`);
        if (test.error) {
          console.log(`     错误: ${test.error}`);
        }
      }
    }

    // 如果有不稳定的测试，列出它们
    if (this.stats.flaky > 0) {
      console.log('\n不稳定的测试（需要关注）:');
      const flakyTests = this.testCases.filter(
        t => t.status === 'passed' && t.retries > 0,
      );

      for (const test of flakyTests) {
        console.log(`  ⚠️  ${test.title}`);
        console.log(`     文件: ${test.file}:${test.line}`);
        console.log(`     重试次数: ${test.retries}`);
      }
    }
  }

  /**
   * 生成测试报告文件
   */
  private async generateReportFiles(result: FullResult): Promise<void> {
    const reportsDir = join(process.cwd(), 'tests/reports');

    // 确保报告目录存在
    if (!existsSync(reportsDir)) {
      mkdirSync(reportsDir, { recursive: true });
    }

    // 生成 JSON 格式的详细报告
    const jsonReport = {
      summary: {
        status: result.status,
        startTime: new Date(this.startTime).toISOString(),
        duration: this.stats.duration,
        stats: this.stats,
      },
      tests: this.testCases,
      config: {
        workers: this.config?.workers,
        timeout: this.config?.timeout,
        retries: this.config?.retries,
      },
    };

    const jsonPath = join(reportsDir, 'custom-report.json');
    writeFileSync(jsonPath, JSON.stringify(jsonReport, null, 2), 'utf-8');
    console.log(`\n📄 详细报告已生成: ${jsonPath}`);

    // 生成 Markdown 格式的摘要报告
    const markdownReport = this.generateMarkdownReport();
    const markdownPath = join(reportsDir, 'test-summary.md');
    writeFileSync(markdownPath, markdownReport, 'utf-8');
    console.log(`📄 摘要报告已生成: ${markdownPath}`);
  }

  /**
   * 生成 Markdown 格式的报告
   */
  private generateMarkdownReport(): string {
    const lines: string[] = [];

    lines.push('# 集成测试报告\n');
    lines.push(`**生成时间**: ${new Date().toLocaleString('zh-CN')}\n`);
    lines.push('## 测试统计\n');
    lines.push('| 指标 | 数值 |');
    lines.push('|------|------|');
    lines.push(`| 总计 | ${this.stats.total} |`);
    lines.push(`| 通过 | ${this.stats.passed} ✅ |`);
    lines.push(`| 失败 | ${this.stats.failed} ❌ |`);
    lines.push(`| 跳过 | ${this.stats.skipped} ⏭️ |`);
    lines.push(`| 不稳定 | ${this.stats.flaky} ⚠️ |`);
    lines.push(`| 总耗时 | ${(this.stats.duration / 1000).toFixed(2)} 秒 |`);

    const passRate = this.stats.total > 0
      ? ((this.stats.passed / this.stats.total) * 100).toFixed(2)
      : '0.00';
    lines.push(`| 通过率 | ${passRate}% |`);

    // 失败的测试
    if (this.stats.failed > 0) {
      lines.push('\n## 失败的测试\n');
      const failedTests = this.testCases.filter(
        t => t.status === 'failed' || t.status === 'timedOut',
      );

      for (const test of failedTests) {
        lines.push(`### ❌ ${test.title}\n`);
        lines.push(`- **文件**: \`${test.file}:${test.line}\``);
        lines.push(`- **耗时**: ${test.duration}ms`);
        if (test.error) {
          lines.push(`- **错误**: ${test.error}`);
        }
        lines.push('');
      }
    }

    // 不稳定的测试
    if (this.stats.flaky > 0) {
      lines.push('\n## 不稳定的测试\n');
      const flakyTests = this.testCases.filter(
        t => t.status === 'passed' && t.retries > 0,
      );

      for (const test of flakyTests) {
        lines.push(`### ⚠️ ${test.title}\n`);
        lines.push(`- **文件**: \`${test.file}:${test.line}\``);
        lines.push(`- **重试次数**: ${test.retries}`);
        lines.push('');
      }
    }

    // 所有测试用例
    lines.push('\n## 所有测试用例\n');
    lines.push('| 状态 | 测试用例 | 耗时 |');
    lines.push('|------|----------|------|');

    for (const test of this.testCases) {
      const statusIcon = this.getStatusIcon(test.status);
      const duration = `${test.duration}ms`;
      lines.push(`| ${statusIcon} | ${test.title} | ${duration} |`);
    }

    return lines.join('\n');
  }

  /**
   * 获取状态图标
   */
  private getStatusIcon(status: string): string {
    switch (status) {
      case 'passed':
        return '✅';
      case 'failed':
        return '❌';
      case 'skipped':
        return '⏭️';
      case 'timedOut':
        return '⏱️';
      default:
        return '❓';
    }
  }
}

export default CustomReporter;
