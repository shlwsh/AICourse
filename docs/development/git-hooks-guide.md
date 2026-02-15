# Git Hooks 配置指南

## 概述

本项目使用 [Husky](https://typicode.github.io/husky/) 管理 Git hooks，确保代码质量和一致性。

## 已配置的 Hooks

### 1. pre-commit Hook

**触发时机**：在执行 `git commit` 之前

**执行内容**：
- 运行 `lint-staged` 对暂存的文件进行格式化和 lint 检查
- 检查 TypeScript 类型（`tsc --noEmit`）

**检查项目**：
- **TypeScript/Vue 文件** (`*.ts`, `*.tsx`, `*.vue`)
  - ESLint 自动修复
  - Prettier 格式化
- **JavaScript/JSON/CSS 文件** (`*.js`, `*.jsx`, `*.json`, `*.css`, `*.scss`, `*.html`)
  - Prettier 格式化
- **Rust 文件** (`src-tauri/**/*.rs`)
  - Cargo fmt 格式化

**如何工作**：
```bash
# 当你执行 git commit 时
git commit -m "feat: 添加新功能"

# 自动执行以下步骤：
# 1. 对暂存的文件运行 ESLint 和 Prettier
# 2. 对 Rust 文件运行 cargo fmt
# 3. 检查 TypeScript 类型
# 4. 如果所有检查通过，提交成功
# 5. 如果有错误，提交被阻止
```

### 2. pre-push Hook

**触发时机**：在执行 `git push` 之前

**执行内容**：
- 运行单元测试（`bun run test:unit`）
- 运行 Rust 测试（`cargo test`）
- 检查代码格式（`bun run format:check`）

**如何工作**：
```bash
# 当你执行 git push 时
git push origin main

# 自动执行以下步骤：
# 1. 运行所有单元测试
# 2. 运行 Rust 测试
# 3. 检查代码格式是否符合规范
# 4. 如果所有检查通过，推送成功
# 5. 如果有错误，推送被阻止
```

## 安装和设置

### 首次安装

当你克隆项目并安装依赖时，Husky 会自动安装：

```bash
# 安装依赖
bun install

# prepare 脚本会自动运行，设置 Git hooks
```

### 手动重新安装

如果需要手动重新安装 Husky：

```bash
# 重新安装 Husky
bunx husky install
```

## 跳过 Hooks（不推荐）

在特殊情况下，你可以跳过 Git hooks：

### 跳过 pre-commit

```bash
git commit -m "message" --no-verify
# 或
git commit -m "message" -n
```

### 跳过 pre-push

```bash
git push --no-verify
# 或
git push -n
```

**⚠️ 警告**：跳过 hooks 可能导致代码质量问题，仅在紧急情况下使用。

## 常见问题

### 1. pre-commit 检查失败

**问题**：提交时 ESLint 或 Prettier 报错

**解决方案**：
```bash
# 手动运行格式化
bun run format

# 手动运行 lint 修复
bun run lint --fix

# 检查类型错误
bun run type-check

# 修复后重新提交
git add .
git commit -m "your message"
```

### 2. pre-push 测试失败

**问题**：推送时单元测试失败

**解决方案**：
```bash
# 手动运行测试查看详细错误
bun run test:unit

# 修复测试或代码
# ...

# 重新推送
git push
```

### 3. Rust 格式化失败

**问题**：Rust 代码格式不符合规范

**解决方案**：
```bash
# 手动格式化 Rust 代码
cd src-tauri
cargo fmt
cd ..

# 重新提交
git add .
git commit -m "your message"
```

### 4. Husky 未安装

**问题**：Git hooks 没有运行

**解决方案**：
```bash
# 重新安装依赖
bun install

# 或手动安装 Husky
bunx husky install
```

## 配置文件

### .husky/pre-commit

```bash
#!/usr/bin/env sh
. "$(dirname -- "$0")/_/husky.sh"

echo "🔍 运行 pre-commit 检查..."

# 运行 lint-staged 进行代码格式化和 lint 检查
bunx lint-staged

# 检查 TypeScript 类型
echo "📝 检查 TypeScript 类型..."
bun run type-check

echo "✅ pre-commit 检查通过！"
```

### .husky/pre-push

```bash
#!/usr/bin/env sh
. "$(dirname -- "$0")/_/husky.sh"

echo "🧪 运行 pre-push 检查..."

# 运行单元测试
echo "🔬 运行单元测试..."
bun run test:unit

# 运行 Rust 测试
echo "🦀 运行 Rust 测试..."
cd src-tauri && cargo test && cd ..

# 检查代码格式
echo "🎨 检查代码格式..."
bun run format:check

echo "✅ pre-push 检查通过！"
```

### package.json - lint-staged 配置

```json
{
  "lint-staged": {
    "*.{ts,tsx,vue}": [
      "eslint --fix",
      "prettier --write"
    ],
    "*.{js,jsx,json,css,scss,html}": [
      "prettier --write"
    ],
    "src-tauri/**/*.rs": [
      "sh -c 'cd src-tauri && cargo fmt'"
    ]
  }
}
```

## 最佳实践

### 1. 提交前自测

在提交前手动运行检查：

```bash
# 格式化代码
bun run format

# 运行 lint
bun run lint

# 检查类型
bun run type-check

# 运行测试
bun run test:unit
```

### 2. 小步提交

- 频繁提交小的改动
- 每次提交只包含相关的修改
- 确保每次提交都能通过所有检查

### 3. 及时修复问题

- 不要积累太多未提交的改动
- 发现问题立即修复
- 不要依赖 `--no-verify` 跳过检查

### 4. 团队协作

- 确保所有团队成员都安装了 Husky
- 统一使用相同的代码格式化配置
- 定期更新依赖和配置

## 相关命令

```bash
# 格式化所有代码
bun run format

# 检查代码格式
bun run format:check

# 运行 lint
bun run lint

# 检查类型
bun run type-check

# 运行单元测试
bun run test:unit

# 运行集成测试
bun run test:integration
```

## 日志记录

Git hooks 执行时会输出详细的日志信息：

```
🔍 运行 pre-commit 检查...
✔ Preparing lint-staged...
✔ Running tasks for staged files...
✔ Applying modifications from tasks...
✔ Cleaning up temporary files...
📝 检查 TypeScript 类型...
✅ pre-commit 检查通过！
```

如果检查失败，会显示详细的错误信息：

```
🔍 运行 pre-commit 检查...
✖ Running tasks for staged files...
  ✖ eslint --fix [FAILED]

  /path/to/file.ts
    10:5  error  'foo' is not defined  no-undef

✖ pre-commit 检查失败！
```

## 参考资料

- [Husky 官方文档](https://typicode.github.io/husky/)
- [lint-staged 官方文档](https://github.com/okonet/lint-staged)
- [ESLint 官方文档](https://eslint.org/)
- [Prettier 官方文档](https://prettier.io/)
- [Cargo fmt 文档](https://doc.rust-lang.org/cargo/commands/cargo-fmt.html)

## 更新日志

- **2024-01-XX**：初始配置 Git hooks
  - 添加 pre-commit hook（格式化和 lint）
  - 添加 pre-push hook（测试和格式检查）
  - 配置 lint-staged
  - 添加文档
