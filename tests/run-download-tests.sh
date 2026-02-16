#!/bin/bash

# 模板下载功能测试脚本
# 自动启动服务、运行测试、查看日志

set -e

echo "=========================================="
echo "模板下载功能自动化测试"
echo "=========================================="
echo ""

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 创建临时目录
mkdir -p tests/temp

# 检查服务是否运行
echo "检查服务状态..."
if ! curl -s http://localhost:3000/health > /dev/null 2>&1; then
    echo -e "${YELLOW}警告: 服务层未运行${NC}"
    echo "请先运行: bun run service:dev"
    echo ""
    read -p "是否继续测试（假设服务已在其他终端运行）？(y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
else
    echo -e "${GREEN}✓ 服务层运行正常${NC}"
fi

if ! curl -s http://localhost:5173 > /dev/null 2>&1; then
    echo -e "${YELLOW}警告: 前端服务未运行${NC}"
    echo "请先运行: bun run dev"
    echo ""
    read -p "是否继续测试（假设前端已在其他终端运行）？(y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
else
    echo -e "${GREEN}✓ 前端服务运行正常${NC}"
fi

echo ""
echo "=========================================="
echo "开始运行测试"
echo "=========================================="
echo ""

# 运行测试
bunx playwright test tests/integration/template-download-browser.spec.ts \
    --config=playwright.browser.config.ts \
    --reporter=list \
    --workers=1

TEST_EXIT_CODE=$?

echo ""
echo "=========================================="
echo "测试完成"
echo "=========================================="
echo ""

if [ $TEST_EXIT_CODE -eq 0 ]; then
    echo -e "${GREEN}✓ 所有测试通过${NC}"
else
    echo -e "${RED}✗ 测试失败${NC}"
    echo ""
    echo "查看详细日志:"
    echo "  - 浏览器日志: 在测试输出中查看 [浏览器日志] 标记的行"
    echo "  - 服务端日志: logs/service.*.log"
    echo "  - 前端日志: 浏览器控制台"
fi

# 清理临时文件
echo ""
echo "清理临时文件..."
rm -rf tests/temp

echo ""
echo "=========================================="
echo "测试报告"
echo "=========================================="
echo ""

if [ $TEST_EXIT_CODE -eq 0 ]; then
    echo -e "${GREEN}状态: 成功${NC}"
    echo ""
    echo "下一步:"
    echo "  1. 浏览器模式下载功能正常"
    echo "  2. 可以继续测试 Tauri 模式"
else
    echo -e "${RED}状态: 失败${NC}"
    echo ""
    echo "建议:"
    echo "  1. 检查服务端日志: logs/service.*.log"
    echo "  2. 检查测试输出中的错误信息"
    echo "  3. 确认服务和前端都在运行"
fi

exit $TEST_EXIT_CODE
