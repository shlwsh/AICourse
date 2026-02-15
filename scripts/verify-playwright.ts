#!/usr/bin/env bun

/**
 * Playwright 配置验证脚本
 *
 * 验证 Playwright 测试环境是否正确配置
 *
 * 检查项：
 * - Playwright 依赖是否安装
 * - 配置文件是否存在
 * - 测试目录结构是否正确
 * - 浏览器是否已安装
 */

import { existsSync } from 'fs';
import { join } from 'path';

console.log('========================================');
console.log('🔍 Playwright 配置验证');
console.log('========================================\n');

let hasErrors = false;

/**
 * 检查文件是否存在
 */
function checkFile(path: string, description: string): boolean {
  const fullPath = join(process.cwd(), path);
  const exists = existsSync(fullPath);

  if (exists) {
    console.log(`✓ ${description}`);
    return true;
  }
  console.log(`✗ ${description} - 文件不存在: ${path}`);
  hasErrors = true;
  return false;

}

/**
 * 检查目录是否存在
 */
function checkDirectory(path: string, description: string): boolean {
  const fullPath = join(process.cwd(), path);
  const exists = existsSync(fullPath);

  if (exists) {
    console.log(`✓ ${description}`);
    return true;
  }
  console.log(`✗ ${description} - 目录不存在: ${path}`);
  hasErrors = true;
  return false;

}

// 1. 检查配置文件
console.log('1. 检查配置文件\n');
checkFile('playwright.config.ts', 'Playwright 配置文件');
console.log();

// 2. 检查测试目录结构
console.log('2. 检查测试目录结构\n');
checkDirectory('tests', '测试根目录');
checkDirectory('tests/integration', '集成测试目录');
checkDirectory('tests/unit', '单元测试目录');
checkDirectory('tests/fixtures', 'Fixtures 目录');
checkDirectory('tests/helpers', '辅助工具目录');
console.log();

// 3. 检查关键文件
console.log('3. 检查关键文件\n');
checkFile('tests/helpers/global-setup.ts', '全局设置文件');
checkFile('tests/helpers/global-teardown.ts', '全局清理文件');
checkFile('tests/helpers/test-logger.ts', '测试日志记录器');
checkFile('tests/fixtures/test-fixtures.ts', '测试 Fixtures');
checkFile('tests/integration/example.spec.ts', '示例测试文件');
checkFile('tests/README.md', '测试文档');
console.log();

// 4. 检查依赖
console.log('4. 检查依赖\n');
try {
  const packageJson = require('../package.json');

  if (packageJson.devDependencies['@playwright/test']) {
    console.log(`✓ @playwright/test 已安装 (${packageJson.devDependencies['@playwright/test']})`);
  } else {
    console.log('✗ @playwright/test 未安装');
    hasErrors = true;
  }
} catch (error) {
  console.log('✗ 无法读取 package.json');
  hasErrors = true;
}
console.log();

// 5. 检查测试脚本
console.log('5. 检查测试脚本\n');
try {
  const packageJson = require('../package.json');
  const scripts = packageJson.scripts || {};

  const requiredScripts = [
    'test:integration',
    'test:integration:ui',
    'test:integration:debug',
    'test:integration:report',
  ];

  for (const script of requiredScripts) {
    if (scripts[script]) {
      console.log(`✓ npm script: ${script}`);
    } else {
      console.log(`✗ npm script 缺失: ${script}`);
      hasErrors = true;
    }
  }
} catch (error) {
  console.log('✗ 无法检查测试脚本');
  hasErrors = true;
}
console.log();

// 6. 检查浏览器安装
console.log('6. 检查浏览器安装\n');
console.log('ℹ️  运行以下命令安装浏览器:');
console.log('   bunx playwright install chromium');
console.log();

// 总结
console.log('========================================');
if (hasErrors) {
  console.log('❌ 验证失败：发现配置问题');
  console.log('========================================\n');
  process.exit(1);
} else {
  console.log('✅ 验证通过：Playwright 配置正确');
  console.log('========================================\n');

  console.log('下一步：');
  console.log('1. 安装浏览器: bunx playwright install chromium');
  console.log('2. 运行测试: bun run test:integration');
  console.log('3. 查看报告: bun run test:integration:report');
  console.log();
}
