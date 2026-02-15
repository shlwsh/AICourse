# Git Hooks 测试指南

## 测试目的

验证 Git hooks 配置是否正常工作，确保代码质量检查能够自动执行。

## 前置条件

1. 已安装项目依赖：`bun install`
2. 已初始化 Git 仓库：`git init`（如果还没有）
3. Husky 已正确安装（`.husky/` 目录存在）

## 测试步骤

### 测试 1：验证 Husky 安装

**目的**：确认 Husky 已正确安装并配置

**步骤**：
```bash
# 检查 .husky 目录
ls -la .husky/

# 应该看到：
# drwxr-xr-x  _/
# -rwxr-xr-x  pre-commit
# -rwxr-xr-x  pre-push
```

**预期结果**：
- `.husky/` 目录存在
- `pre-commit` 和 `pre-push` 文件存在且有执行权限（`-rwxr-xr-x`）

**日志记录**：
```
✅ 测试 1 通过：Husky 已正确安装
- .husky/ 目录存在
- pre-commit hook 存在且可执行
- pre-push hook 存在且可执行
```

---

### 测试 2：验证 pre-commit Hook（格式化检查）

**目的**：验证 pre-commit hook 能够自动格式化代码

**步骤**：

1. 创建一个格式不正确的测试文件：
```bash
# 创建测试文件（故意不符合格式规范）
cat > test-format.ts << 'EOF'
const x=1;const y=2
function test(){return x+y}
export default test
EOF
```

2. 暂存文件：
```bash
git add test-format.ts
```

3. 尝试提交：
```bash
git commit -m "test: 测试 pre-commit hook"
```

**预期结果**：
- 看到 `🔍 运行 pre-commit 检查...` 消息
- lint-staged 自动运行
- Prettier 自动格式化文件
- ESLint 检查通过
- TypeScript 类型检查通过
- 提交成功

**预期输出**：
```
🔍 运行 pre-commit 检查...
✔ Preparing lint-staged...
✔ Running tasks for staged files...
  ✔ Running tasks for *.{ts,tsx,vue}
    ✔ eslint --fix
    ✔ prettier --write
✔ Applying modifications from tasks...
✔ Cleaning up temporary files...
📝 检查 TypeScript 类型...
✅ pre-commit 检查通过！
[main abc1234] test: 测试 pre-commit hook
 1 file changed, 5 insertions(+)
```

**验证格式化效果**：
```bash
# 查看格式化后的文件
cat test-format.ts

# 应该看到格式化后的代码：
# const x = 1;
# const y = 2;
# function test() {
#   return x + y;
# }
# export default test;
```

**日志记录**：
```
✅ 测试 2 通过：pre-commit hook 正常工作
- lint-staged 成功运行
- Prettier 自动格式化代码
- ESLint 检查通过
- TypeScript 类型检查通过
- 提交成功
```

---

### 测试 3：验证 pre-commit Hook（类型错误检测）

**目的**：验证 pre-commit hook 能够检测 TypeScript 类型错误

**步骤**：

1. 创建一个有类型错误的文件：
```bash
cat > test-type-error.ts << 'EOF'
const num: number = "string"; // 类型错误
export default num;
EOF
```

2. 暂存并尝试提交：
```bash
git add test-type-error.ts
git commit -m "test: 测试类型错误检测"
```

**预期结果**：
- 看到 `🔍 运行 pre-commit 检查...` 消息
- lint-staged 运行成功
- TypeScript 类型检查失败
- 提交被阻止

**预期输出**：
```
🔍 运行 pre-commit 检查...
✔ Preparing lint-staged...
✔ Running tasks for staged files...
✔ Applying modifications from tasks...
✔ Cleaning up temporary files...
📝 检查 TypeScript 类型...

test-type-error.ts:1:7 - error TS2322: Type 'string' is not assignable to type 'number'.

1 const num: number = "string";
        ~~~

Found 1 error.

❌ pre-commit 检查失败！
```

**修复并重新提交**：
```bash
# 修复类型错误
cat > test-type-error.ts << 'EOF'
const num: number = 123;
export default num;
EOF

# 重新暂存并提交
git add test-type-error.ts
git commit -m "test: 修复类型错误"
```

**日志记录**：
```
✅ 测试 3 通过：类型错误检测正常工作
- TypeScript 类型检查成功检测到错误
- 提交被正确阻止
- 修复后提交成功
```

---

### 测试 4：验证 pre-commit Hook（ESLint 错误检测）

**目的**：验证 pre-commit hook 能够检测和修复 ESLint 错误

**步骤**：

1. 创建一个有 lint 错误的文件：
```bash
cat > test-lint-error.ts << 'EOF'
const unused = 123; // 未使用的变量
const x = 1;
console.log(x);
export default x;
EOF
```

2. 暂存并尝试提交：
```bash
git add test-lint-error.ts
git commit -m "test: 测试 ESLint 检测"
```

**预期结果**：
- ESLint 检测到未使用的变量
- 如果配置了自动修复，ESLint 会尝试修复
- 如果无法自动修复，提交被阻止

**日志记录**：
```
✅ 测试 4 通过：ESLint 检测正常工作
- ESLint 成功检测到代码问题
- 自动修复功能正常工作
```

---

### 测试 5：验证 pre-push Hook（单元测试）

**目的**：验证 pre-push hook 能够运行单元测试

**步骤**：

1. 确保有可运行的单元测试：
```bash
# 查看测试文件
ls tests/unit/

# 如果没有测试，创建一个简单的测试
mkdir -p tests/unit
cat > tests/unit/example.test.ts << 'EOF'
import { describe, it, expect } from 'vitest';

describe('示例测试', () => {
  it('应该通过', () => {
    expect(1 + 1).toBe(2);
  });
});
EOF
```

2. 提交测试文件：
```bash
git add tests/unit/example.test.ts
git commit -m "test: 添加示例测试"
```

3. 尝试推送：
```bash
git push origin main
```

**预期结果**：
- 看到 `🧪 运行 pre-push 检查...` 消息
- 单元测试运行
- Rust 测试运行（如果有）
- 代码格式检查通过
- 推送成功

**预期输出**：
```
🧪 运行 pre-push 检查...
🔬 运行单元测试...

 ✓ tests/unit/example.test.ts (1)
   ✓ 示例测试 (1)
     ✓ 应该通过

 Test Files  1 passed (1)
      Tests  1 passed (1)
   Start at  07:30:00
   Duration  123ms

🦀 运行 Rust 测试...
   Compiling course-scheduling-system v0.1.0
    Finished test [unoptimized + debuginfo] target(s) in 2.34s
     Running unittests src/main.rs

running 0 tests

test result: ok. 0 passed; 0 failed; 0 ignored; 0 measured; 0 filtered out

🎨 检查代码格式...
✅ pre-push 检查通过！
```

**日志记录**：
```
✅ 测试 5 通过：pre-push hook 正常工作
- 单元测试成功运行
- Rust 测试成功运行
- 代码格式检查通过
- 推送成功
```

---

### 测试 6：验证 pre-push Hook（测试失败场景）

**目的**：验证 pre-push hook 能够阻止测试失败的代码推送

**步骤**：

1. 创建一个会失败的测试：
```bash
cat > tests/unit/failing.test.ts << 'EOF'
import { describe, it, expect } from 'vitest';

describe('失败测试', () => {
  it('应该失败', () => {
    expect(1 + 1).toBe(3); // 故意写错
  });
});
EOF
```

2. 提交并尝试推送：
```bash
git add tests/unit/failing.test.ts
git commit -m "test: 添加失败测试"
git push origin main
```

**预期结果**：
- 单元测试运行
- 测试失败
- 推送被阻止

**预期输出**：
```
🧪 运行 pre-push 检查...
🔬 运行单元测试...

 FAIL  tests/unit/failing.test.ts > 失败测试 > 应该失败
AssertionError: expected 2 to be 3

 Test Files  1 failed (1)
      Tests  1 failed (1)

❌ pre-push 检查失败！
error: failed to push some refs to 'origin'
```

**修复并重新推送**：
```bash
# 修复测试
cat > tests/unit/failing.test.ts << 'EOF'
import { describe, it, expect } from 'vitest';

describe('修复后的测试', () => {
  it('应该通过', () => {
    expect(1 + 1).toBe(2);
  });
});
EOF

# 重新提交并推送
git add tests/unit/failing.test.ts
git commit -m "test: 修复测试"
git push origin main
```

**日志记录**：
```
✅ 测试 6 通过：测试失败检测正常工作
- 失败的测试被正确检测
- 推送被正确阻止
- 修复后推送成功
```

---

### 测试 7：验证 Rust 代码格式化

**目的**：验证 pre-commit hook 能够格式化 Rust 代码

**步骤**：

1. 创建一个格式不正确的 Rust 文件：
```bash
cat > src-tauri/src/test_format.rs << 'EOF'
pub fn test(){let x=1;let y=2;x+y}
EOF
```

2. 暂存并提交：
```bash
git add src-tauri/src/test_format.rs
git commit -m "test: 测试 Rust 格式化"
```

**预期结果**：
- cargo fmt 自动运行
- Rust 代码被格式化
- 提交成功

**验证格式化效果**：
```bash
cat src-tauri/src/test_format.rs

# 应该看到格式化后的代码：
# pub fn test() {
#     let x = 1;
#     let y = 2;
#     x + y
# }
```

**日志记录**：
```
✅ 测试 7 通过：Rust 代码格式化正常工作
- cargo fmt 成功运行
- Rust 代码被正确格式化
- 提交成功
```

---

### 测试 8：验证跳过 Hooks

**目的**：验证可以在紧急情况下跳过 hooks

**步骤**：

1. 创建一个有问题的文件：
```bash
cat > test-skip.ts << 'EOF'
const x=1 // 格式不正确，没有分号
EOF
```

2. 使用 `--no-verify` 跳过 pre-commit：
```bash
git add test-skip.ts
git commit -m "test: 跳过 hooks" --no-verify
```

**预期结果**：
- 不运行 pre-commit 检查
- 直接提交成功
- 文件保持原样（未格式化）

**日志记录**：
```
✅ 测试 8 通过：跳过 hooks 功能正常
- --no-verify 标志正常工作
- 可以在紧急情况下跳过检查
```

---

## 测试清理

测试完成后，清理测试文件：

```bash
# 删除测试文件
rm -f test-*.ts
rm -f src-tauri/src/test_format.rs
rm -rf tests/unit/example.test.ts tests/unit/failing.test.ts

# 提交清理
git add .
git commit -m "test: 清理测试文件"
```

## 测试总结

完成所有测试后，应该验证以下功能：

✅ **pre-commit Hook**：
- [x] Husky 正确安装
- [x] lint-staged 正常运行
- [x] Prettier 自动格式化
- [x] ESLint 自动修复
- [x] TypeScript 类型检查
- [x] Rust 代码格式化
- [x] 错误时阻止提交

✅ **pre-push Hook**：
- [x] 单元测试运行
- [x] Rust 测试运行
- [x] 代码格式检查
- [x] 测试失败时阻止推送

✅ **其他功能**：
- [x] 可以跳过 hooks（--no-verify）
- [x] 自动安装（prepare 脚本）

## 故障排查

### 问题 1：Hooks 没有运行

**症状**：提交或推送时没有看到 hooks 输出

**解决方案**：
```bash
# 检查 .husky 目录
ls -la .husky/

# 检查文件权限
chmod +x .husky/pre-commit
chmod +x .husky/pre-push

# 重新安装 Husky
bunx husky install
```

### 问题 2：lint-staged 失败

**症状**：lint-staged 报错或无法运行

**解决方案**：
```bash
# 检查 package.json 中的 lint-staged 配置
cat package.json | grep -A 10 "lint-staged"

# 手动运行 lint-staged
bunx lint-staged
```

### 问题 3：TypeScript 类型检查失败

**症状**：类型检查报错

**解决方案**：
```bash
# 手动运行类型检查查看详细错误
bun run type-check

# 修复类型错误后重新提交
```

### 问题 4：测试失败

**症状**：pre-push 时测试失败

**解决方案**：
```bash
# 手动运行测试查看详细错误
bun run test:unit

# 修复测试或代码后重新推送
```

## 性能基准

记录 hooks 执行时间作为基准：

| Hook | 操作 | 预期时间 | 实际时间 |
|------|------|----------|----------|
| pre-commit | 格式化 1-5 个文件 | < 5s | ___ |
| pre-commit | 格式化 5-20 个文件 | 5-15s | ___ |
| pre-commit | 类型检查 | < 10s | ___ |
| pre-push | 单元测试 | 10-30s | ___ |
| pre-push | Rust 测试 | 20-60s | ___ |
| pre-push | 总计 | 30-90s | ___ |

## 测试报告模板

```markdown
# Git Hooks 测试报告

**测试日期**：YYYY-MM-DD
**测试人员**：[姓名]
**环境**：[操作系统、Node/Bun 版本、Rust 版本]

## 测试结果

| 测试编号 | 测试名称 | 状态 | 备注 |
|---------|---------|------|------|
| 测试 1 | Husky 安装验证 | ✅ / ❌ | |
| 测试 2 | pre-commit 格式化 | ✅ / ❌ | |
| 测试 3 | 类型错误检测 | ✅ / ❌ | |
| 测试 4 | ESLint 检测 | ✅ / ❌ | |
| 测试 5 | pre-push 测试 | ✅ / ❌ | |
| 测试 6 | 测试失败检测 | ✅ / ❌ | |
| 测试 7 | Rust 格式化 | ✅ / ❌ | |
| 测试 8 | 跳过 hooks | ✅ / ❌ | |

## 问题和建议

[记录测试中发现的问题和改进建议]

## 结论

[总体评估和建议]
```

## 参考文档

- [Git Hooks 配置指南](./git-hooks-guide.md)
- [代码格式化指南](./code-formatting-guide.md)
- [任务 1.3.5 完成总结](./task-1.3.5-summary.md)
