#!/usr/bin/env bun

/**
 * 配置验证脚本
 * 验证 TypeScript 和 ESLint 配置是否正确
 */

import { existsSync } from 'fs';
import { resolve } from 'path';

// 日志颜色
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

function checkFile(filePath: string, description: string): boolean {
  const fullPath = resolve(process.cwd(), filePath);
  const exists = existsSync(fullPath);

  if (exists) {
    log(`✓ ${description}: ${filePath}`, 'green');
  } else {
    log(`✗ ${description}缺失: ${filePath}`, 'red');
  }

  return exists;
}

async function main() {
  log('\n=== 开始验证配置文件 ===\n', 'blue');

  const checks = [
    // TypeScript 配置
    { path: 'tsconfig.json', desc: 'TypeScript 主配置' },
    { path: 'tsconfig.node.json', desc: 'TypeScript Node 配置' },
    { path: 'src/vite-env.d.ts', desc: 'Vite 类型声明' },
    { path: 'src/types/global.d.ts', desc: '全局类型声明' },

    // ESLint 配置
    { path: '.eslintrc.cjs', desc: 'ESLint 配置' },
    { path: '.eslintignore', desc: 'ESLint 忽略文件' },

    // Prettier 配置
    { path: '.prettierrc', desc: 'Prettier 配置' },
    { path: '.prettierignore', desc: 'Prettier 忽略文件' },

    // EditorConfig
    { path: '.editorconfig', desc: 'EditorConfig 配置' },

    // Package.json
    { path: 'package.json', desc: 'Package 配置' },
  ];

  let allPassed = true;

  for (const check of checks) {
    const passed = checkFile(check.path, check.desc);
    if (!passed) {
      allPassed = false;
    }
  }

  log('\n=== 验证 package.json 依赖 ===\n', 'blue');

  try {
    const packageJson = await Bun.file('package.json').json();
    const devDeps = packageJson.devDependencies || {};

    const requiredDeps = [
      'typescript',
      'eslint',
      '@typescript-eslint/eslint-plugin',
      '@typescript-eslint/parser',
      'eslint-plugin-vue',
      'prettier',
      'vite',
      '@vitejs/plugin-vue',
    ];

    for (const dep of requiredDeps) {
      if (devDeps[dep]) {
        log(`✓ 依赖已安装: ${dep} (${devDeps[dep]})`, 'green');
      } else {
        log(`✗ 依赖缺失: ${dep}`, 'red');
        allPassed = false;
      }
    }
  } catch (error) {
    log(`✗ 读取 package.json 失败: ${error}`, 'red');
    allPassed = false;
  }

  log('\n=== 验证 TypeScript 配置 ===\n', 'blue');

  try {
    // 读取文件内容并移除注释（更完善的处理）
    const tsconfigContent = await Bun.file('tsconfig.json').text();
    const tsconfigWithoutComments = tsconfigContent
      .split('\n')
      .map(line => {
        // 移除行尾注释
        const commentIndex = line.indexOf('//');
        if (commentIndex !== -1) {
          return line.substring(0, commentIndex);
        }
        return line;
      })
      .join('\n')
      .replace(/\/\*[\s\S]*?\*\//g, '') // 移除多行注释
      .replace(/,(\s*[}\]])/g, '$1'); // 移除尾随逗号

    const tsconfig = JSON.parse(tsconfigWithoutComments);

    // 检查关键配置项
    const checks = [
      { key: 'compilerOptions.strict', value: tsconfig.compilerOptions?.strict, expected: true },
      { key: 'compilerOptions.target', value: tsconfig.compilerOptions?.target, expected: 'ES2020' },
      { key: 'compilerOptions.module', value: tsconfig.compilerOptions?.module, expected: 'ESNext' },
      { key: 'compilerOptions.moduleResolution', value: tsconfig.compilerOptions?.moduleResolution, expected: 'bundler' },
    ];

    for (const check of checks) {
      if (check.value === check.expected) {
        log(`✓ ${check.key}: ${check.value}`, 'green');
      } else {
        log(`✗ ${check.key}: ${check.value} (期望: ${check.expected})`, 'red');
        allPassed = false;
      }
    }

    // 检查路径映射
    if (tsconfig.compilerOptions?.paths) {
      log('✓ 路径映射已配置', 'green');
      const paths = tsconfig.compilerOptions.paths;
      for (const [alias, target] of Object.entries(paths)) {
        log(`  ${alias} -> ${target}`, 'blue');
      }
    } else {
      log('✗ 路径映射未配置', 'red');
      allPassed = false;
    }
  } catch (error) {
    log(`✗ 读取 tsconfig.json 失败: ${error}`, 'red');
    allPassed = false;
  }

  log('\n=== 验证结果 ===\n', 'blue');

  if (allPassed) {
    log('✓ 所有配置验证通过！', 'green');
    process.exit(0);
  } else {
    log('✗ 配置验证失败，请检查上述错误', 'red');
    process.exit(1);
  }
}

main().catch((error) => {
  log(`\n✗ 验证过程出错: ${error}`, 'red');
  process.exit(1);
});
