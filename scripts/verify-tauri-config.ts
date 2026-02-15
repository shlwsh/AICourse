#!/usr/bin/env bun

/**
 * Tauri 配置验证脚本
 *
 * 功能：
 * 1. 验证 tauri.conf.json 配置的正确性
 * 2. 检查端口配置是否一致
 * 3. 验证文件路径是否存在
 * 4. 检查必要的依赖是否安装
 * 5. 输出详细的验证报告
 */

import { existsSync, readFileSync } from 'fs';
import { resolve } from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

// ANSI 颜色代码
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

// 日志工具
const log = {
  info: (msg: string) => console.log(`${colors.blue}ℹ${colors.reset} ${msg}`),
  success: (msg: string) => console.log(`${colors.green}✓${colors.reset} ${msg}`),
  error: (msg: string) => console.log(`${colors.red}✗${colors.reset} ${msg}`),
  warning: (msg: string) => console.log(`${colors.yellow}⚠${colors.reset} ${msg}`),
  section: (msg: string) => console.log(`\n${colors.cyan}${msg}${colors.reset}`),
};

interface ValidationResult {
  passed: boolean;
  message: string;
  details?: string;
}

class TauriConfigValidator {
  private tauriConfigPath: string;
  private viteConfigPath: string;
  private tauriConfig: any;
  private viteConfig: string;
  private results: ValidationResult[] = [];

  constructor() {
    this.tauriConfigPath = resolve(process.cwd(), 'src-tauri/tauri.conf.json');
    this.viteConfigPath = resolve(process.cwd(), 'vite.config.ts');
    this.tauriConfig = null;
    this.viteConfig = '';
  }

  /**
   * 运行所有验证检查
   */
  async validate(): Promise<boolean> {
    log.section('🔍 开始验证 Tauri 配置...');

    // 1. 检查配置文件是否存在
    this.checkConfigFilesExist();

    // 2. 加载配置文件
    this.loadConfigs();

    // 3. 验证 Tauri 配置
    this.validateTauriConfig();

    // 4. 验证端口配置一致性
    this.validatePortConsistency();

    // 5. 验证文件路径
    this.validateFilePaths();

    // 6. 检查依赖
    await this.checkDependencies();

    // 7. 验证 API 权限配置
    this.validateApiPermissions();

    // 8. 验证窗口配置
    this.validateWindowConfig();

    // 9. 输出验证报告
    this.printReport();

    // 返回验证结果
    return this.results.every(r => r.passed);
  }

  /**
   * 检查配置文件是否存在
   */
  private checkConfigFilesExist(): void {
    log.section('📁 检查配置文件');

    // 检查 tauri.conf.json
    if (existsSync(this.tauriConfigPath)) {
      this.addResult(true, 'tauri.conf.json 文件存在');
    } else {
      this.addResult(false, 'tauri.conf.json 文件不存在', this.tauriConfigPath);
    }

    // 检查 vite.config.ts
    if (existsSync(this.viteConfigPath)) {
      this.addResult(true, 'vite.config.ts 文件存在');
    } else {
      this.addResult(false, 'vite.config.ts 文件不存在', this.viteConfigPath);
    }

    // 检查 package.json
    const packageJsonPath = resolve(process.cwd(), 'package.json');
    if (existsSync(packageJsonPath)) {
      this.addResult(true, 'package.json 文件存在');
    } else {
      this.addResult(false, 'package.json 文件不存在');
    }
  }

  /**
   * 加载配置文件
   */
  private loadConfigs(): void {
    log.section('📖 加载配置文件');

    try {
      const tauriConfigContent = readFileSync(this.tauriConfigPath, 'utf-8');
      this.tauriConfig = JSON.parse(tauriConfigContent);
      this.addResult(true, '成功解析 tauri.conf.json');
    } catch (error) {
      this.addResult(false, '解析 tauri.conf.json 失败', String(error));
    }

    try {
      this.viteConfig = readFileSync(this.viteConfigPath, 'utf-8');
      this.addResult(true, '成功读取 vite.config.ts');
    } catch (error) {
      this.addResult(false, '读取 vite.config.ts 失败', String(error));
    }
  }

  /**
   * 验证 Tauri 配置结构
   */
  private validateTauriConfig(): void {
    log.section('🔧 验证 Tauri 配置结构');

    if (!this.tauriConfig) {
      this.addResult(false, 'Tauri 配置未加载');
      return;
    }

    // 检查必需的顶级字段
    const requiredFields = ['build', 'package', 'tauri'];
    for (const field of requiredFields) {
      if (this.tauriConfig[field]) {
        this.addResult(true, `配置包含必需字段: ${field}`);
      } else {
        this.addResult(false, `配置缺少必需字段: ${field}`);
      }
    }

    // 检查 build 配置
    if (this.tauriConfig.build) {
      const buildFields = ['beforeDevCommand', 'beforeBuildCommand', 'devPath', 'distDir'];
      for (const field of buildFields) {
        if (this.tauriConfig.build[field]) {
          this.addResult(true, `build.${field} 已配置`);
        } else {
          this.addResult(false, `build.${field} 未配置`);
        }
      }
    }

    // 检查 package 配置
    if (this.tauriConfig.package) {
      if (this.tauriConfig.package.productName) {
        this.addResult(true, `产品名称: ${this.tauriConfig.package.productName}`);
      } else {
        this.addResult(false, 'package.productName 未配置');
      }

      if (this.tauriConfig.package.version) {
        this.addResult(true, `版本号: ${this.tauriConfig.package.version}`);
      } else {
        this.addResult(false, 'package.version 未配置');
      }
    }
  }

  /**
   * 验证端口配置一致性
   */
  private validatePortConsistency(): void {
    log.section('🔌 验证端口配置一致性');

    if (!this.tauriConfig || !this.viteConfig) {
      this.addResult(false, '配置文件未加载，无法验证端口一致性');
      return;
    }

    // 从 Tauri 配置中提取端口
    const tauriDevPath = this.tauriConfig.build?.devPath || '';
    const tauriPortMatch = tauriDevPath.match(/:(\d+)/);
    const tauriPort = tauriPortMatch ? tauriPortMatch[1] : null;

    // 从 Vite 配置中提取端口
    const vitePortMatch = this.viteConfig.match(/port:\s*(\d+)/);
    const vitePort = vitePortMatch ? vitePortMatch[1] : null;

    if (tauriPort && vitePort) {
      if (tauriPort === vitePort) {
        this.addResult(
          true,
          `端口配置一致: ${tauriPort}`,
          `Tauri devPath 和 Vite server.port 都使用端口 ${tauriPort}`,
        );
      } else {
        this.addResult(
          false,
          '端口配置不一致',
          `Tauri devPath 使用端口 ${tauriPort}，但 Vite server.port 使用端口 ${vitePort}`,
        );
      }
    } else {
      this.addResult(false, '无法提取端口配置');
    }

    // 检查代理配置
    const proxyMatch = this.viteConfig.match(/target:\s*['"]http:\/\/localhost:(\d+)['"]/);
    const proxyPort = proxyMatch ? proxyMatch[1] : null;

    if (proxyPort) {
      this.addResult(
        true,
        'Vite 代理配置正确',
        `API 请求将被代理到 http://localhost:${proxyPort}`,
      );
    } else {
      this.addResult(false, 'Vite 代理配置未找到或格式不正确');
    }
  }

  /**
   * 验证文件路径
   */
  private validateFilePaths(): void {
    log.section('📂 验证文件路径');

    if (!this.tauriConfig) {
      this.addResult(false, '配置文件未加载，无法验证文件路径');
      return;
    }

    // 检查 distDir
    const distDir = this.tauriConfig.build?.distDir;
    if (distDir) {
      const distPath = resolve(process.cwd(), 'src-tauri', distDir);
      // dist 目录在构建前可能不存在，这是正常的
      this.addResult(
        true,
        `distDir 配置: ${distDir}`,
        `构建后的资源将从 ${distPath} 加载`,
      );
    } else {
      this.addResult(false, 'build.distDir 未配置');
    }

    // 检查图标文件
    const icons = this.tauriConfig.tauri?.bundle?.icon || [];
    let iconExists = false;
    for (const icon of icons) {
      const iconPath = resolve(process.cwd(), 'src-tauri', icon);
      if (existsSync(iconPath)) {
        iconExists = true;
        this.addResult(true, `图标文件存在: ${icon}`);
      }
    }

    if (!iconExists && icons.length > 0) {
      this.addResult(false, '所有配置的图标文件都不存在');
    }
  }

  /**
   * 检查依赖
   */
  private async checkDependencies(): Promise<void> {
    log.section('📦 检查依赖');

    try {
      // 检查 Bun
      const { stdout: bunVersion } = await execAsync('bun --version');
      this.addResult(true, `Bun 已安装: v${bunVersion.trim()}`);
    } catch (error) {
      this.addResult(false, 'Bun 未安装或不在 PATH 中');
    }

    try {
      // 检查 Rust
      const { stdout: rustVersion } = await execAsync('rustc --version');
      this.addResult(true, `Rust 已安装: ${rustVersion.trim()}`);
    } catch (error) {
      this.addResult(false, 'Rust 未安装或不在 PATH 中');
    }

    try {
      // 检查 Cargo
      const { stdout: cargoVersion } = await execAsync('cargo --version');
      this.addResult(true, `Cargo 已安装: ${cargoVersion.trim()}`);
    } catch (error) {
      this.addResult(false, 'Cargo 未安装或不在 PATH 中');
    }

    // 检查 Node 模块
    const nodeModulesPath = resolve(process.cwd(), 'node_modules');
    if (existsSync(nodeModulesPath)) {
      this.addResult(true, 'node_modules 目录存在');
    } else {
      this.addResult(false, 'node_modules 目录不存在，请运行 bun install');
    }

    // 检查关键依赖
    const packageJsonPath = resolve(process.cwd(), 'package.json');
    if (existsSync(packageJsonPath)) {
      const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf-8'));
      const requiredDeps = ['vue', 'vite', '@tauri-apps/api', '@tauri-apps/cli'];

      for (const dep of requiredDeps) {
        if (packageJson.dependencies?.[dep] || packageJson.devDependencies?.[dep]) {
          this.addResult(true, `依赖已配置: ${dep}`);
        } else {
          this.addResult(false, `缺少依赖: ${dep}`);
        }
      }
    }
  }

  /**
   * 验证 API 权限配置
   */
  private validateApiPermissions(): void {
    log.section('🔒 验证 API 权限配置');

    if (!this.tauriConfig?.tauri?.allowlist) {
      this.addResult(false, 'API 权限配置 (allowlist) 未找到');
      return;
    }

    const allowlist = this.tauriConfig.tauri.allowlist;

    // 检查是否使用白名单模式
    if (allowlist.all === false) {
      this.addResult(true, '使用白名单模式（推荐）');
    } else {
      this.addResult(
        false,
        '未使用白名单模式',
        '建议设置 allowlist.all = false 以提高安全性',
      );
    }

    // 检查文件系统权限
    if (allowlist.fs) {
      if (allowlist.fs.scope && Array.isArray(allowlist.fs.scope)) {
        this.addResult(
          true,
          `文件系统访问范围已限制: ${allowlist.fs.scope.join(', ')}`,
        );
      } else {
        this.addResult(
          false,
          '文件系统访问范围未限制',
          '建议配置 fs.scope 以限制文件访问范围',
        );
      }
    }

    // 检查 HTTP 权限
    if (allowlist.http) {
      if (allowlist.http.scope && Array.isArray(allowlist.http.scope)) {
        this.addResult(
          true,
          `HTTP 请求范围已限制: ${allowlist.http.scope.join(', ')}`,
        );
      } else {
        this.addResult(
          false,
          'HTTP 请求范围未限制',
          '建议配置 http.scope 以限制 HTTP 请求范围',
        );
      }
    }
  }

  /**
   * 验证窗口配置
   */
  private validateWindowConfig(): void {
    log.section('🪟 验证窗口配置');

    if (!this.tauriConfig?.tauri?.windows || !Array.isArray(this.tauriConfig.tauri.windows)) {
      this.addResult(false, '窗口配置未找到');
      return;
    }

    const windows = this.tauriConfig.tauri.windows;

    if (windows.length === 0) {
      this.addResult(false, '至少需要配置一个窗口');
      return;
    }

    const mainWindow = windows[0];

    // 检查窗口标题
    if (mainWindow.title) {
      this.addResult(true, `窗口标题: ${mainWindow.title}`);
    } else {
      this.addResult(false, '窗口标题未配置');
    }

    // 检查窗口尺寸
    if (mainWindow.width && mainWindow.height) {
      this.addResult(
        true,
        `窗口尺寸: ${mainWindow.width}x${mainWindow.height}`,
      );
    } else {
      this.addResult(false, '窗口尺寸未配置');
    }

    // 检查最小尺寸
    if (mainWindow.minWidth && mainWindow.minHeight) {
      this.addResult(
        true,
        `最小尺寸: ${mainWindow.minWidth}x${mainWindow.minHeight}`,
      );
    } else {
      this.addResult(
        false,
        '最小窗口尺寸未配置',
        '建议配置 minWidth 和 minHeight 以确保 UI 可用性',
      );
    }

    // 检查窗口是否可调整大小
    if (mainWindow.resizable !== undefined) {
      this.addResult(
        true,
        `窗口可调整大小: ${mainWindow.resizable ? '是' : '否'}`,
      );
    }
  }

  /**
   * 添加验证结果
   */
  private addResult(passed: boolean, message: string, details?: string): void {
    this.results.push({ passed, message, details });

    if (passed) {
      log.success(message);
    } else {
      log.error(message);
    }

    if (details) {
      console.log(`  ${colors.yellow}→${colors.reset} ${details}`);
    }
  }

  /**
   * 输出验证报告
   */
  private printReport(): void {
    log.section('📊 验证报告');

    const total = this.results.length;
    const passed = this.results.filter(r => r.passed).length;
    const failed = total - passed;

    console.log(`\n总计: ${total} 项检查`);
    console.log(`${colors.green}通过: ${passed}${colors.reset}`);
    console.log(`${colors.red}失败: ${failed}${colors.reset}`);

    if (failed > 0) {
      console.log(`\n${colors.red}❌ 验证失败，请修复以上问题${colors.reset}`);
      console.log('\n失败的检查项：');
      this.results
        .filter(r => !r.passed)
        .forEach((r, i) => {
          console.log(`${i + 1}. ${r.message}`);
          if (r.details) {
            console.log(`   ${r.details}`);
          }
        });
    } else {
      console.log(`\n${colors.green}✅ 所有检查通过！Tauri 配置正确${colors.reset}`);
    }

    console.log('\n');
  }
}

// 主函数
async function main() {
  const validator = new TauriConfigValidator();
  const success = await validator.validate();

  // 根据验证结果设置退出码
  process.exit(success ? 0 : 1);
}

// 运行验证
main().catch((error) => {
  log.error(`验证过程中发生错误: ${error.message}`);
  process.exit(1);
});
