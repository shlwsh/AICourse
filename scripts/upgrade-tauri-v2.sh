#!/bin/bash

# Tauri 2.x 升级脚本
# 自动化升级 Tauri 从 1.x 到 2.x

set -e  # 遇到错误立即退出

echo "=========================================="
echo "Tauri 2.x 升级脚本"
echo "=========================================="
echo ""

# 检查是否在项目根目录
if [ ! -f "package.json" ] || [ ! -d "src-tauri" ]; then
  echo "❌ 错误: 请在项目根目录运行此脚本"
  exit 1
fi

echo "✓ 项目目录检查通过"
echo ""

# 步骤 1: 创建备份
echo "步骤 1/6: 创建备份..."
BACKUP_BRANCH="backup-tauri-v1-$(date +%Y%m%d-%H%M%S)"
git checkout -b "$BACKUP_BRANCH" 2>/dev/null || true
git add -A
git commit -m "备份: Tauri 1.x 版本" 2>/dev/null || true
echo "✓ 备份分支已创建: $BACKUP_BRANCH"
echo ""

# 步骤 2: 更新前端依赖
echo "步骤 2/6: 更新前端依赖..."
echo "  移除旧版本..."
bun remove @tauri-apps/api

echo "  安装 Tauri 2.x..."
bun add @tauri-apps/api@^2.0.0

echo "  安装 Tauri 插件..."
bun add @tauri-apps/plugin-shell@^2.0.0
bun add @tauri-apps/plugin-dialog@^2.0.0
bun add @tauri-apps/plugin-fs@^2.0.0
bun add @tauri-apps/plugin-notification@^2.0.0

echo "✓ 前端依赖更新完成"
echo ""

# 步骤 3: 更新 Rust 依赖
echo "步骤 3/6: 更新 Rust 依赖..."
echo "  请手动编辑 src-tauri/Cargo.toml"
echo "  参考: docs/development/tauri-v2-upgrade-guide.md"
echo ""
read -p "按 Enter 继续（完成 Cargo.toml 编辑后）..."

# 步骤 4: 清理构建缓存
echo "步骤 4/6: 清理构建缓存..."
rm -rf src-tauri/target
rm -rf dist
rm -rf node_modules/.cache
echo "✓ 构建缓存已清理"
echo ""

# 步骤 5: 重新构建
echo "步骤 5/6: 重新构建项目..."
echo "  Rust 构建..."
cd src-tauri
cargo clean
cargo build
cd ..
echo "✓ Rust 构建完成"
echo ""

# 步骤 6: 提示后续步骤
echo "步骤 6/6: 后续步骤"
echo "=========================================="
echo ""
echo "自动化升级完成！请执行以下手动步骤："
echo ""
echo "1. 更新 Rust 代码："
echo "   - 更新 src-tauri/src/main.rs（添加插件初始化）"
echo "   - 更新对话框 API 调用"
echo "   - 更新文件系统 API 调用"
echo ""
echo "2. 更新前端代码："
echo "   - 更新导入路径（@tauri-apps/api → @tauri-apps/plugin-*）"
echo "   - 测试所有 Tauri 命令调用"
echo ""
echo "3. 更新配置文件："
echo "   - 更新 src-tauri/tauri.conf.json"
echo "   - 参考: https://v2.tauri.app/start/migrate/from-tauri-1/"
echo ""
echo "4. 测试功能："
echo "   bun run dev"
echo "   - 测试下载模板"
echo "   - 测试文件导入"
echo "   - 测试数据导出"
echo ""
echo "5. 如果遇到问题，回滚到备份分支："
echo "   git checkout $BACKUP_BRANCH"
echo ""
echo "详细升级指南: docs/development/tauri-v2-upgrade-guide.md"
echo ""
echo "=========================================="
