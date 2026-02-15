#!/usr/bin/env bun

/**
 * Bun 配置验证脚本
 * Bun Configuration Verification Script
 *
 * 用途：验证 Bun 运行时环境配置是否正确
 * Usage: bun run scripts/verify-bun-config.ts
 */

import { existsSync } from 'fs';
import { resolve } from 'path';

// 颜色输出工具
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
};

function log(message: string, color: keyof typeof colors = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function success(message: string) {
  log(`✓ ${message}`, 'green');
}

function error(message: string) {
  log(`✗ ${message}`, 'red');
}

function warning(message: string) {
  log(`⚠ ${message}`, 'yellow');
}

function info(message: string) {
  log(`ℹ ${message}`, 'blue');
}

// 验证结果统计
let passCount = 0;
let failCount = 0;
let warnCount = 0;

/**
 * 检查文件是否存在
 */
function checkFileExists(filePath: string, description: string): boolean {
  const fullPath = resolve(process.cwd(), filePath);
  if (existsSync(fullPath)) {
    success(`${description}: ${filePath}`);
    passCount++;
    return true;
  }
  error(`${description}不存在: ${filePath}`);
  failCount++;
  return false;

}

/**
 * 检查目录是否存在
 */
function checkDirectoryExists(dirPath: string, description: string): boolean {
  const fullPath = resolve(process.cwd(), dirPath);
  if (existsSync(fullPath)) {
    success(`${description}: ${dirPath}`);
    passCount++;
    return true;
  }
  warning(`${description}不存在: ${dirPath} (将在运行时创建)`);
  warnCount++;
  return false;

}

/**
 * 检查 Bun 版本
 */
async function checkBunVersion() {
  try {
    const version = Bun.version;
    const [major] = version.split('.').map(Number);

    if (major !== undefined && major >= 1) {
      success(`Bun 版本: ${version} (满足要求 >= 1.0.0)`);
      passCount++;
    } else {
      error(`Bun 版本过低: ${version} (要求 >= 1.0.0)`);
      failCount++;
    }
  } catch (err) {
    error(`无法获取 Bun 版本: ${err}`);
    failCount++;
  }
}

/**
 * 验证 package.json 配置
 */
async function checkPackageJson() {
  try {
    const packageJson = await Bun.file('package.json').json();

    // 检查必需的脚本命令
    const requiredScripts = [
      'dev',
      'build',
      'service:dev',
      'service:build',
      'service:start',
      'tauri:dev',
      'tauri:build',
      'test',
      'test:unit',
      'test:integration',
    ];

    for (const script of requiredScripts) {
      if (packageJson.scripts && packageJson.scripts[script]) {
        success(`脚本命令存在: ${script}`);
        passCount++;
      } else {
        error(`脚本命令缺失: ${script}`);
        failCount++;
      }
    }

    // 检查引擎要求
    if (packageJson.engines?.bun) {
      success(`Bun 引擎要求: ${packageJson.engines.bun}`);
      passCount++;
    } else {
      warning('未指定 Bun 引擎版本要求');
      warnCount++;
    }

  } catch (err) {
    error(`读取 package.json 失败: ${err}`);
    failCount++;
  }
}

/**
 * 验证 bunfig.toml 配置
 */
async function checkBunfigToml() {
  try {
    const content = await Bun.file('bunfig.toml').text();

    // 检查关键配置项
    const requiredConfigs = [
      '[runtime]',
      '[install]',
      '[dev]',
      '[build]',
      '[test]',
      '[log]',
      '[performance]',
    ];

    for (const config of requiredConfigs) {
      if (content.includes(config)) {
        success(`配置节存在: ${config}`);
        passCount++;
      } else {
        warning(`配置节缺失: ${config}`);
        warnCount++;
      }
    }

  } catch (err) {
    error(`读取 bunfig.toml 失败: ${err}`);
    failCount++;
  }
}

/**
 * 验证环境变量文件
 */
async function checkEnvFiles() {
  const envFiles = [
    { path: '.env.example', required: true },
    { path: '.env.development', required: true },
    { path: '.env.production', required: true },
  ];

  for (const { path, required } of envFiles) {
    if (required) {
      checkFileExists(path, '环境变量文件');
    }
  }
}

/**
 * 主验证流程
 */
async function main() {
  console.log('\n');
  info('========================================');
  info('  Bun 运行时环境配置验证');
  info('  Bun Runtime Configuration Verification');
  info('========================================');
  console.log('\n');

  // 1. 检查 Bun 版本
  info('1. 检查 Bun 版本...');
  await checkBunVersion();
  console.log('\n');

  // 2. 检查配置文件
  info('2. 检查配置文件...');
  checkFileExists('package.json', 'package.json');
  checkFileExists('bunfig.toml', 'bunfig.toml');
  checkFileExists('bun.config.ts', 'bun.config.ts');
  console.log('\n');

  // 3. 检查环境变量文件
  info('3. 检查环境变量文件...');
  await checkEnvFiles();
  console.log('\n');

  // 4. 检查必需目录
  info('4. 检查必需目录...');
  checkDirectoryExists('src-service', '服务层源码目录');
  checkDirectoryExists('data', '数据目录');
  checkDirectoryExists('logs', '日志目录');
  checkDirectoryExists('backups', '备份目录');
  console.log('\n');

  // 5. 验证 package.json 配置
  info('5. 验证 package.json 配置...');
  await checkPackageJson();
  console.log('\n');

  // 6. 验证 bunfig.toml 配置
  info('6. 验证 bunfig.toml 配置...');
  await checkBunfigToml();
  console.log('\n');

  // 7. 检查文档
  info('7. 检查文档...');
  checkFileExists('docs/bun-runtime-guide.md', 'Bun 运行时配置指南');
  checkFileExists('docs/quick-start.md', '快速开始指南');
  console.log('\n');

  // 输出验证结果
  info('========================================');
  info('  验证结果汇总');
  info('========================================');
  success(`通过: ${passCount} 项`);
  if (warnCount > 0) {
    warning(`警告: ${warnCount} 项`);
  }
  if (failCount > 0) {
    error(`失败: ${failCount} 项`);
  }
  console.log('\n');

  // 返回退出码
  if (failCount > 0) {
    error('配置验证失败！请修复上述错误后重试。');
    process.exit(1);
  } else if (warnCount > 0) {
    warning('配置验证通过，但存在警告项。');
    process.exit(0);
  } else {
    success('配置验证完全通过！✨');
    process.exit(0);
  }
}

// 运行验证
main().catch((err) => {
  error(`验证过程发生错误: ${err}`);
  process.exit(1);
});
