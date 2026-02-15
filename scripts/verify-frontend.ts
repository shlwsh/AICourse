/**
 * 前端项目验证脚本
 * 验证 Vue 3 前端项目的配置是否正确
 */

import { existsSync } from 'fs';
import { resolve } from 'path';

// 需要检查的关键文件
const requiredFiles = [
  'index.html',
  'vite.config.ts',
  'tsconfig.json',
  'tsconfig.node.json',
  'package.json',
  'src/main.ts',
  'src/App.vue',
  'src/router/index.ts',
  'src/stores/scheduleStore.ts',
  'src/utils/logger.ts',
  'src/api/http.ts',
  'src/api/schedule.ts',
  'src/styles/index.css',
  'src/views/Home.vue',
  'src/views/Schedule.vue',
  'src/views/Teacher.vue',
  'src/views/Settings.vue',
  'src/views/NotFound.vue',
];

// 需要检查的目录
const requiredDirs = [
  'src',
  'src/api',
  'src/assets',
  'src/components',
  'src/router',
  'src/stores',
  'src/styles',
  'src/utils',
  'src/views',
];

console.log('🔍 开始验证 Vue 3 前端项目配置...\n');

let hasError = false;

// 检查文件
console.log('📄 检查必需文件:');
for (const file of requiredFiles) {
  const filePath = resolve(process.cwd(), file);
  const exists = existsSync(filePath);

  if (exists) {
    console.log(`  ✅ ${file}`);
  } else {
    console.log(`  ❌ ${file} - 文件不存在`);
    hasError = true;
  }
}

console.log('\n📁 检查必需目录:');
for (const dir of requiredDirs) {
  const dirPath = resolve(process.cwd(), dir);
  const exists = existsSync(dirPath);

  if (exists) {
    console.log(`  ✅ ${dir}`);
  } else {
    console.log(`  ❌ ${dir} - 目录不存在`);
    hasError = true;
  }
}

// 检查 package.json 中的依赖
console.log('\n📦 检查关键依赖:');
try {
  const packageJson = require('../package.json');
  const requiredDeps = [
    'vue',
    'vue-router',
    'pinia',
    'element-plus',
    '@element-plus/icons-vue',
    '@tauri-apps/api',
  ];

  const requiredDevDeps = [
    '@vitejs/plugin-vue',
    'vite',
    'typescript',
    '@types/node',
  ];

  for (const dep of requiredDeps) {
    if (packageJson.dependencies && packageJson.dependencies[dep]) {
      console.log(`  ✅ ${dep} - ${packageJson.dependencies[dep]}`);
    } else {
      console.log(`  ❌ ${dep} - 依赖缺失`);
      hasError = true;
    }
  }

  for (const dep of requiredDevDeps) {
    if (packageJson.devDependencies && packageJson.devDependencies[dep]) {
      console.log(`  ✅ ${dep} - ${packageJson.devDependencies[dep]}`);
    } else {
      console.log(`  ❌ ${dep} - 开发依赖缺失`);
      hasError = true;
    }
  }
} catch (error) {
  console.log('  ❌ 无法读取 package.json');
  hasError = true;
}

// 输出结果
console.log(`\n${  '='.repeat(50)}`);
if (hasError) {
  console.log('❌ 验证失败：发现配置问题');
  process.exit(1);
} else {
  console.log('✅ 验证成功：Vue 3 前端项目配置正确');
  console.log('\n📝 后续步骤:');
  console.log('  1. 运行 bun run dev 启动开发服务器');
  console.log('  2. 访问 http://localhost:5173 查看应用');
  console.log('  3. 继续开发其他功能模块');
  process.exit(0);
}
