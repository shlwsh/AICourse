#!/bin/bash

# 模板下载功能集成测试执行脚本
# 按照项目规则，测试用例按顺序执行，失败时立即停止

echo "========================================"
echo "模板下载功能集成测试"
echo "========================================"
echo ""

# 检查服务是否运行
echo "[检查] 验证服务层是否运行..."
if ! curl -s http://localhost:3000/health > /dev/null; then
    echo "✗ 服务层未运行，请先启动服务: bun run service:dev"
    exit 1
fi
echo "✓ 服务层运行正常"
echo ""

# 运行测试
echo "[执行] 开始运行集成测试..."
echo ""

bunx playwright test tests/integration/template-download.spec.ts \
    --reporter=list \
    --max-failures=1

TEST_EXIT_CODE=$?

echo ""
echo "========================================"
if [ $TEST_EXIT_CODE -eq 0 ]; then
    echo "✓ 所有测试用例通过"
else
    echo "✗ 测试失败，退出码: $TEST_EXIT_CODE"
    echo "请修正失败的测试用例后重新运行"
fi
echo "========================================"

exit $TEST_EXIT_CODE
