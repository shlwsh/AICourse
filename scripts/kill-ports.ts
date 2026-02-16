#!/usr/bin/env bun
/**
 * 端口清理脚本
 * 自动清除项目使用的端口，确保端口空闲
 */

import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

// 项目使用的端口列表
const PORTS = [
  { port: 3000, name: 'Hono 服务层' },
  { port: 5173, name: 'Vite 开发服务器' },
  { port: 1420, name: 'Tauri 应用' },
];

/**
 * 获取占用指定端口的进程 PID
 */
async function getProcessByPort(port: number): Promise<string[]> {
  try {
    const { stdout } = await execAsync(`lsof -ti :${port}`);
    return stdout
      .trim()
      .split('\n')
      .filter((pid) => pid);
  } catch (error) {
    // 端口未被占用时 lsof 会返回错误
    return [];
  }
}

/**
 * 杀死指定 PID 的进程
 */
async function killProcess(pid: string): Promise<boolean> {
  try {
    await execAsync(`kill -9 ${pid}`);
    return true;
  } catch (error) {
    console.error(`  ✗ 无法杀死进程 ${pid}:`, (error as Error).message);
    return false;
  }
}

/**
 * 清理指定端口
 */
async function cleanPort(port: number, name: string): Promise<void> {
  console.log(`\n检查端口 ${port} (${name})...`);

  const pids = await getProcessByPort(port);

  if (pids.length === 0) {
    console.log(`  ✓ 端口 ${port} 空闲`);
    return;
  }

  console.log(`  ! 发现 ${pids.length} 个进程占用端口 ${port}`);

  for (const pid of pids) {
    console.log(`  → 正在终止进程 ${pid}...`);
    const success = await killProcess(pid);
    if (success) {
      console.log(`  ✓ 进程 ${pid} 已终止`);
    }
  }

  // 再次检查端口是否已释放
  const remainingPids = await getProcessByPort(port);
  if (remainingPids.length === 0) {
    console.log(`  ✓ 端口 ${port} 已释放`);
  } else {
    console.log(`  ✗ 端口 ${port} 仍被占用`);
  }
}

/**
 * 主函数
 */
async function main() {
  console.log('='.repeat(50));
  console.log('端口清理工具');
  console.log('='.repeat(50));

  for (const { port, name } of PORTS) {
    await cleanPort(port, name);
  }

  console.log('\n' + '='.repeat(50));
  console.log('端口清理完成！');
  console.log('='.repeat(50));
}

// 执行主函数
main().catch((error) => {
  console.error('\n执行出错:', error);
  process.exit(1);
});
