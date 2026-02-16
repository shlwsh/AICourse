#!/usr/bin/env bun

/**
 * Tauri 2.x 升级验证脚本
 *
 * 验证项目是否成功升级到 Tauri 2.x
 */

import { readFileSync } from 'fs';
import { join } from 'path';

interface VerificationResult {
  name: string;
  passed: boolean;
  message: string;
}

const results: VerificationResult[] = [];

console.log('========================================');
console.log('Tauri 2.x 升级验证');
console.log('========================================\n');

// 1. 检查 package.json 中的 Tauri 版本
console.log('1. 检查前端依赖版本...');
try {
  const packageJson = JSON.parse(
    readFileSync(join(process.cwd(), 'package.json'), 'utf-8')
  );

  // 检查 @tauri-apps/api
  const tauriApiVersion = packageJson.dependencies?.['@tauri-apps/api'];
  if (tauriApiVersion && tauriApiVersion.startsWith('^2.')) {
    results.push({
      name: '@tauri-apps/api',
      passed: true,
      message: `版本: ${tauriApiVersion}`,
    });
  } else {
    results.push({
      name: '@tauri-apps/api',
      passed: false,
      message: `版本不正确: ${tauriApiVersion || '未安装'}，应该是 ^2.x`,
    });
  }

  // 检查 @tauri-apps/cli
  const tauriCliVersion = packageJson.devDependencies?.['@tauri-apps/cli'];
  if (tauriCliVersion && tauriCliVersion.startsWith('^2.')) {
    results.push({
      name: '@tauri-apps/cli',
      passed: true,
      message: `版本: ${tauriCliVersion}`,
    });
  } else {
    results.push({
      name: '@tauri-apps/cli',
      passed: false,
      message: `版本不正确: ${tauriCliVersion || '未安装'}，应该是 ^2.x`,
    });
  }

  // 检查插件
  const plugins = [
    '@tauri-apps/plugin-shell',
    '@tauri-apps/plugin-dialog',
    '@tauri-apps/plugin-fs',
    '@tauri-apps/plugin-notification',
  ];

  for (const plugin of plugins) {
    const version = packageJson.dependencies?.[plugin];
    if (version && version.startsWith('^2.')) {
      results.push({
        name: plugin,
        passed: true,
        message: `版本: ${version}`,
      });
    } else {
      results.push({
        name: plugin,
        passed: false,
        message: `版本不正确: ${version || '未安装'}，应该是 ^2.x`,
      });
    }
  }
} catch (error) {
  results.push({
    name: 'package.json',
    passed: false,
    message: `读取失败: ${error}`,
  });
}

// 2. 检查 Cargo.toml 中的 Tauri 版本
console.log('\n2. 检查 Rust 依赖版本...');
try {
  const cargoToml = readFileSync(
    join(process.cwd(), 'src-tauri', 'Cargo.toml'),
    'utf-8'
  );

  // 检查 tauri 版本
  const tauriMatch = cargoToml.match(/tauri\s*=\s*{\s*version\s*=\s*"([^"]+)"/);
  if (tauriMatch && tauriMatch[1].startsWith('2')) {
    results.push({
      name: 'tauri (Rust)',
      passed: true,
      message: `版本: ${tauriMatch[1]}`,
    });
  } else {
    results.push({
      name: 'tauri (Rust)',
      passed: false,
      message: `版本不正确: ${tauriMatch?.[1] || '未找到'}，应该是 2.x`,
    });
  }

  // 检查 tauri-build 版本
  const tauriBuildMatch = cargoToml.match(/tauri-build\s*=\s*{\s*version\s*=\s*"([^"]+)"/);
  if (tauriBuildMatch && tauriBuildMatch[1].startsWith('2')) {
    results.push({
      name: 'tauri-build (Rust)',
      passed: true,
      message: `版本: ${tauriBuildMatch[1]}`,
    });
  } else {
    results.push({
      name: 'tauri-build (Rust)',
      passed: false,
      message: `版本不正确: ${tauriBuildMatch?.[1] || '未找到'}，应该是 2.x`,
    });
  }

  // 检查插件
  const rustPlugins = [
    'tauri-plugin-shell',
    'tauri-plugin-dialog',
    'tauri-plugin-fs',
    'tauri-plugin-notification',
  ];

  for (const plugin of rustPlugins) {
    const pluginMatch = cargoToml.match(
      new RegExp(`${plugin}\\s*=\\s*"([^"]+)"`)
    );
    if (pluginMatch && pluginMatch[1].startsWith('2')) {
      results.push({
        name: `${plugin} (Rust)`,
        passed: true,
        message: `版本: ${pluginMatch[1]}`,
      });
    } else {
      results.push({
        name: `${plugin} (Rust)`,
        passed: false,
        message: `版本不正确: ${pluginMatch?.[1] || '未找到'}，应该是 2.x`,
      });
    }
  }
} catch (error) {
  results.push({
    name: 'Cargo.toml',
    passed: false,
    message: `读取失败: ${error}`,
  });
}

// 3. 检查 tauri.conf.json 配置格式
console.log('\n3. 检查 Tauri 配置文件...');
try {
  const tauriConf = JSON.parse(
    readFileSync(join(process.cwd(), 'src-tauri', 'tauri.conf.json'), 'utf-8')
  );

  // 检查 schema 版本
  if (tauriConf.$schema?.includes('/config/2')) {
    results.push({
      name: 'tauri.conf.json schema',
      passed: true,
      message: '使用 Tauri 2.x 配置格式',
    });
  } else {
    results.push({
      name: 'tauri.conf.json schema',
      passed: false,
      message: 'schema 版本不正确，应该是 /config/2',
    });
  }

  // 检查插件配置
  if (tauriConf.plugins) {
    results.push({
      name: 'tauri.conf.json plugins',
      passed: true,
      message: `已配置 ${Object.keys(tauriConf.plugins).length} 个插件`,
    });
  } else {
    results.push({
      name: 'tauri.conf.json plugins',
      passed: false,
      message: '缺少 plugins 配置',
    });
  }
} catch (error) {
  results.push({
    name: 'tauri.conf.json',
    passed: false,
    message: `读取失败: ${error}`,
  });
}

// 4. 检查 main.rs 是否使用了插件初始化
console.log('\n4. 检查 Rust 代码...');
try {
  const mainRs = readFileSync(
    join(process.cwd(), 'src-tauri', 'src', 'main.rs'),
    'utf-8'
  );

  // 检查插件初始化
  const pluginInits = [
    'tauri_plugin_shell::init()',
    'tauri_plugin_dialog::init()',
    'tauri_plugin_fs::init()',
    'tauri_plugin_notification::init()',
  ];

  for (const pluginInit of pluginInits) {
    if (mainRs.includes(pluginInit)) {
      results.push({
        name: `main.rs: ${pluginInit}`,
        passed: true,
        message: '已初始化',
      });
    } else {
      results.push({
        name: `main.rs: ${pluginInit}`,
        passed: false,
        message: '未找到插件初始化代码',
      });
    }
  }
} catch (error) {
  results.push({
    name: 'main.rs',
    passed: false,
    message: `读取失败: ${error}`,
  });
}

// 输出结果
console.log('\n========================================');
console.log('验证结果');
console.log('========================================\n');

let passedCount = 0;
let failedCount = 0;

for (const result of results) {
  const icon = result.passed ? '✓' : '✗';
  const color = result.passed ? '\x1b[32m' : '\x1b[31m';
  const reset = '\x1b[0m';

  console.log(`${color}${icon}${reset} ${result.name}`);
  console.log(`  ${result.message}`);

  if (result.passed) {
    passedCount++;
  } else {
    failedCount++;
  }
}

console.log('\n========================================');
console.log(`通过: ${passedCount} / ${results.length}`);
console.log(`失败: ${failedCount} / ${results.length}`);
console.log('========================================\n');

if (failedCount > 0) {
  console.log('❌ Tauri 2.x 升级验证失败');
  console.log('请检查上述失败项并修复\n');
  process.exit(1);
} else {
  console.log('✅ Tauri 2.x 升级验证通过');
  console.log('所有依赖和配置都已正确升级到 Tauri 2.x\n');
  process.exit(0);
}
