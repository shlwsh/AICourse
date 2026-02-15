# 代码格式化工具配置指南

## 概述

本项目使用以下代码格式化工具来保持代码风格的一致性：

- **Prettier**：用于格式化前端代码（TypeScript、Vue、JSON、CSS 等）
- **Rustfmt**：用于格式化 Rust 后端代码

## Prettier 配置

### 配置文件

配置文件位于项目根目录：`.prettierrc`

### 主要配置项

```json
{
  "semi": true,                    // 使用分号
  "singleQuote": true,             // 使用单引号
  "tabWidth": 2,                   // 缩进宽度为 2 个空格
  "useTabs": false,                // 使用空格而非制表符
  "trailingComma": "all",          // 尾随逗号（多行时）
  "printWidth": 100,               // 每行最大字符数
  "arrowParens": "always",         // 箭头函数参数始终使用括号
  "endOfLine": "lf",               // 使用 Unix 风格换行符
  "bracketSpacing": true,          // 对象字面量的括号间距
  "vueIndentScriptAndStyle": false // Vue 文件中不缩进 script 和 style 标签
}
```

### 忽略文件

配置文件：`.prettierignore`

忽略的目录和文件：
- `node_modules/`
- `dist/`
- `dist-service/`
- `src-tauri/target/`
- `*.log`
- `*.md`（保留 Markdown 原始格式）
- 锁文件

## Rustfmt 配置

### 配置文件

配置文件位于：`src-tauri/rustfmt.toml`

### 主要配置项

```toml
edition = "2021"              # Rust 版本
max_width = 100               # 每行最大字符数
hard_tabs = false             # 使用空格而非制表符
tab_spaces = 4                # 缩进宽度为 4 个空格
newline_style = "Unix"        # 使用 Unix 风格换行符
reorder_imports = true        # 自动排序导入语句
use_field_init_shorthand = true   # 使用字段初始化简写
use_try_shorthand = true      # 使用 ? 操作符简写
```

### 注意事项

当前配置仅使用 Rust stable 版本支持的特性。如果需要使用更高级的格式化选项（如注释格式化、导入分组等），需要：

1. 安装 Rust nightly 版本
2. 在 `rustfmt.toml` 中取消注释相关配置项
3. 设置 `unstable_features = true`

## 使用方法

### 格式化所有代码

```bash
# 格式化前端、服务层和 Rust 代码
bun run format
```

### 分别格式化

```bash
# 仅格式化前端代码
bun run format:frontend

# 仅格式化服务层代码
bun run format:service

# 仅格式化 Rust 代码
bun run format:rust
```

### 检查代码格式

```bash
# 检查所有代码格式（不修改文件）
bun run format:check

# 分别检查
bun run format:check:frontend
bun run format:check:service
bun run format:check:rust
```

## 编辑器集成

### VS Code

#### 安装扩展

1. **Prettier - Code formatter**
   - 扩展 ID: `esbenp.prettier-vscode`
   - 用于格式化 TypeScript、Vue、JSON 等文件

2. **rust-analyzer**
   - 扩展 ID: `rust-lang.rust-analyzer`
   - 内置 Rustfmt 支持

#### 配置

在 `.vscode/settings.json` 中添加：

```json
{
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "[rust]": {
    "editor.defaultFormatter": "rust-lang.rust-analyzer",
    "editor.formatOnSave": true
  },
  "[typescript]": {
    "editor.defaultFormatter": "esbenp.prettier-vscode"
  },
  "[vue]": {
    "editor.defaultFormatter": "esbenp.prettier-vscode"
  },
  "[json]": {
    "editor.defaultFormatter": "esbenp.prettier-vscode"
  }
}
```

### WebStorm / IntelliJ IDEA

1. 打开 **Settings/Preferences**
2. 导航到 **Languages & Frameworks > JavaScript > Prettier**
3. 勾选 **On save** 和 **On code reformat**
4. 设置 Prettier 包路径为项目的 `node_modules/prettier`

对于 Rust：
1. 导航到 **Languages & Frameworks > Rust > Rustfmt**
2. 勾选 **Run rustfmt on Save**

## Git Hooks

建议配置 Git pre-commit hook 来自动格式化代码：

```bash
# 在 .git/hooks/pre-commit 中添加
#!/bin/sh
bun run format:check || {
  echo "代码格式检查失败，正在自动格式化..."
  bun run format
  git add -u
}
```

## 常见问题

### Q: Prettier 和 ESLint 冲突怎么办？

A: 项目已配置 `eslint-config-prettier` 来禁用与 Prettier 冲突的 ESLint 规则。如果仍有冲突，请检查 `.eslintrc.cjs` 配置。

### Q: Rustfmt 警告不稳定特性怎么办？

A: 这是正常的。当前配置使用 stable 版本的 Rust，某些高级特性需要 nightly 版本。如果需要这些特性：

```bash
# 安装 nightly 版本
rustup install nightly

# 在项目中使用 nightly
cd src-tauri
rustup override set nightly

# 然后在 rustfmt.toml 中启用不稳定特性
```

### Q: 如何在 CI/CD 中集成格式检查？

A: 在 CI 配置中添加：

```yaml
- name: 检查代码格式
  run: bun run format:check
```

如果格式检查失败，CI 将会失败，提示开发者修复格式问题。

## 最佳实践

1. **提交前格式化**：在提交代码前运行 `bun run format`
2. **启用编辑器自动格式化**：配置编辑器在保存时自动格式化
3. **团队统一配置**：确保所有团队成员使用相同的配置文件
4. **定期更新**：定期更新 Prettier 和 Rustfmt 到最新版本
5. **代码审查**：在代码审查时检查格式是否符合规范

## 相关文档

- [Prettier 官方文档](https://prettier.io/docs/en/index.html)
- [Rustfmt 官方文档](https://rust-lang.github.io/rustfmt/)
- [项目开发规则](../../project-rules.md)

## 更新日志

- **2024-01-XX**：初始配置，支持 Prettier 和 Rustfmt
- 配置 Prettier 用于前端和服务层代码格式化
- 配置 Rustfmt 用于 Rust 代码格式化（仅使用稳定特性）
- 添加格式化和检查脚本到 package.json
