import { FullConfig } from '@playwright/test';
import { existsSync } from 'fs';
import { join } from 'path';

/**
 * Playwright 全局拆卸
 *
 * 在所有测试运行完成后执行一次
 *
 * 主要职责：
 * - 清理测试数据
 * - 关闭数据库连接
 * - 生成测试摘要报告
 * - 记录测试结束日志
 *
 * @param _config Playwright 完整配置对象
 */
async function globalTeardown(_config: FullConfig) {
  console.log('\n========================================');
  console.log('🧹 开始 Playwright 测试环境清理');
  console.log('========================================\n');

  try {
    // 1. 清理测试数据
    await cleanupTestData();

    // 2. 生成测试摘要
    await generateTestSummary();

    // 3. 记录完成信息
    logCompletion();

    console.log('\n✅ 测试环境清理完成\n');
  } catch (error) {
    console.error('\n⚠️  测试环境清理时发生错误:', error);
    // 清理失败不应该导致测试失败，只记录警告
  }
}

/**
 * 清理测试数据
 *
 * 可选操作：
 * - 删除测试数据库（如果需要保留用于调试，可以注释掉）
 * - 清理临时文件
 * - 清理日志文件（保留最近的）
 */
async function cleanupTestData() {
  console.log('🗑️  清理测试数据...');

  try {
    // 导入数据库辅助工具
    const { createDatabaseHelper } = await import('./database-helper');

    // 创建数据库辅助工具
    const dbHelper = createDatabaseHelper({
      deleteAfterTest: process.env.KEEP_TEST_DATA !== 'true',
    });

    // 清理数据库
    await dbHelper.cleanup();
  } catch (error) {
    console.error('  ⚠️  数据库清理失败:', error);
  }
}

/**
 * 生成测试摘要
 *
 * 读取测试结果并生成摘要报告
 */
// eslint-disable-next-line complexity, max-depth
async function generateTestSummary() {
  console.log('\n📊 生成测试摘要...');

  const resultsPath = join(process.cwd(), 'tests/reports/test-results.json');

  if (!existsSync(resultsPath)) {
    console.log('  ⚠️  未找到测试结果文件');
    return;
  }

  try {
    const fs = await import('fs/promises');
    const resultsContent = await fs.readFile(resultsPath, 'utf-8');
    const results = JSON.parse(resultsContent);

    // 统计测试结果
    const stats = {
      total: 0,
      passed: 0,
      failed: 0,
      skipped: 0,
      duration: 0,
    };

    // 遍历所有测试套件
    if (results.suites) {
      for (const suite of results.suites) {
        if (suite.specs) {
          for (const spec of suite.specs) {
            stats.total++;

            if (spec.ok) {
              stats.passed++;
            } else if (spec.tests && spec.tests.some((t: any) => t.status === 'skipped')) {
              stats.skipped++;
            } else {
              stats.failed++;
            }
          }
        }
      }
    }

    // 计算总耗时
    stats.duration = results.stats?.duration || 0;

    // 输出摘要
    console.log('\n  测试摘要:');
    console.log('  ─────────────────────────────');
    console.log(`  总计:   ${stats.total} 个测试`);
    console.log(`  通过:   ${stats.passed} ✓`);
    console.log(`  失败:   ${stats.failed} ✗`);
    console.log(`  跳过:   ${stats.skipped} ○`);
    console.log(`  耗时:   ${(stats.duration / 1000).toFixed(2)} 秒`);
    console.log('  ─────────────────────────────');

    // 如果有失败的测试，输出失败信息
    if (stats.failed > 0) {
      console.log('\n  ❌ 失败的测试:');

      if (results.suites) {
        for (const suite of results.suites) {
          if (suite.specs) {
            for (const spec of suite.specs) {
              if (!spec.ok) {
                console.log(`    - ${spec.title || spec.file}`);

                // 输出失败原因
                if (spec.tests) {
                  for (const test of spec.tests) {
                    if (test.status === 'failed' && test.results) {
                      for (const result of test.results) {
                        if (result.error) {
                          console.log(`      错误: ${result.error.message}`);
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    }

    // 输出报告位置
    console.log('\n  📄 详细报告:');
    console.log('    HTML: tests/reports/html/index.html');
    console.log('    JSON: tests/reports/test-results.json');

  } catch (error) {
    console.error('  ⚠️  解析测试结果失败:', error);
  }
}

/**
 * 记录完成信息
 */
function logCompletion() {
  const now = new Date();
  console.log('\n⏰ 测试完成时间:', now.toLocaleString('zh-CN', {
    timeZone: 'Asia/Shanghai',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }));
}

export default globalTeardown;
