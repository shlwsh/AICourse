#!/bin/bash

# Excel 数据导入测试脚本
# 使用 Playwright 测试 Excel 导入功能

echo "=========================================="
echo "Excel 数据导入集成测试"
echo "=========================================="
echo ""

# 检查测试数据文件是否存在
if [ ! -f "data/测试数据.xlsx" ]; then
  echo "❌ 错误: 测试数据文件不存在"
  echo "   请先运行: bun run generate:testdata"
  exit 1
fi

echo "✓ 测试数据文件存在"
echo ""

# 检查服务是否运行
echo "检查服务状态..."
if ! curl -s http://localhost:3000/health > /dev/null 2>&1; then
  echo "❌ 错误: 后端服务未运行"
  echo "   请先运行: bun run dev:service"
  exit 1
fi

echo "✓ 后端服务正在运行"
echo ""

# 运行测试
echo "开始运行测试..."
echo ""

bunx playwright test tests/integration/excel-import.spec.ts \
  --config=playwright.api.config.ts \
  --reporter=list

# 检查测试结果
if [ $? -eq 0 ]; then
  echo ""
  echo "=========================================="
  echo "✓ 所有测试通过"
  echo "=========================================="
  exit 0
else
  echo ""
  echo "=========================================="
  echo "❌ 测试失败"
  echo "=========================================="
  exit 1
fi
