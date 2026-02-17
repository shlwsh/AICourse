#!/bin/bash

# 课表生成与导出集成测试运行脚本
#
# 功能：
# - 启动前端和后端服务
# - 运行课表生成与导出测试
# - 生成测试报告
# - 清理测试环境

set -e

echo "========================================"
echo "课表生成与导出集成测试"
echo "========================================"
echo ""

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 项目根目录
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$PROJECT_ROOT"

echo "项目目录: $PROJECT_ROOT"
echo ""

# 检查 Bun 是否安装
if ! command -v bun &> /dev/null; then
    echo -e "${RED}错误: 未安装 Bun${NC}"
    echo "请访问 https://bun.sh 安装 Bun"
    exit 1
fi

echo -e "${GREEN}✓ Bun 已安装${NC}"
echo ""

# 创建下载目录
DOWNLOADS_DIR="$PROJECT_ROOT/tests/downloads"
mkdir -p "$DOWNLOADS_DIR"
echo -e "${GREEN}✓ 下载目录已创建: $DOWNLOADS_DIR${NC}"
echo ""

# 启动后端服务
echo "========================================"
echo "启动后端服务"
echo "========================================"
bun run dev:service &
SERVICE_PID=$!
echo "后端服务 PID: $SERVICE_PID"
echo ""

# 等待后端服务启动
echo "等待后端服务启动..."
sleep 3
echo -e "${GREEN}✓ 后端服务已启动${NC}"
echo ""

# 启动前端服务
echo "========================================"
echo "启动前端服务"
echo "========================================"
bun run dev:frontend &
FRONTEND_PID=$!
echo "前端服务 PID: $FRONTEND_PID"
echo ""

# 等待前端服务启动
echo "等待前端服务启动..."
sleep 5
echo -e "${GREEN}✓ 前端服务已启动${NC}"
echo ""

# 清理函数
cleanup() {
    echo ""
    echo "========================================"
    echo "清理测试环境"
    echo "========================================"

    if [ ! -z "$FRONTEND_PID" ]; then
        echo "停止前端服务 (PID: $FRONTEND_PID)"
        kill $FRONTEND_PID 2>/dev/null || true
    fi

    if [ ! -z "$SERVICE_PID" ]; then
        echo "停止后端服务 (PID: $SERVICE_PID)"
        kill $SERVICE_PID 2>/dev/null || true
    fi

    echo -e "${GREEN}✓ 服务已停止${NC}"
}

# 注册清理函数
trap cleanup EXIT

# 运行测试
echo "========================================"
echo "运行集成测试"
echo "========================================"
echo ""

# 设置测试环境变量
export TEST_BASE_URL="http://localhost:5173"

bunx playwright test tests/integration/schedule-generation-and-export.spec.ts \
    --config=playwright.browser.schedule.config.ts \
    --reporter=list \
    --workers=1 \
    --timeout=90000

TEST_EXIT_CODE=$?

echo ""
echo "========================================"
echo "测试完成"
echo "========================================"

if [ $TEST_EXIT_CODE -eq 0 ]; then
    echo -e "${GREEN}✓ 所有测试通过${NC}"
    echo ""
    echo "下载的文件位置: $DOWNLOADS_DIR"
    ls -lh "$DOWNLOADS_DIR" | tail -n +2
else
    echo -e "${RED}✗ 测试失败${NC}"
    echo "退出码: $TEST_EXIT_CODE"
fi

echo ""
echo "测试报告: playwright-report/index.html"
echo ""

exit $TEST_EXIT_CODE
