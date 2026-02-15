# AI Git 提交工具

基于 AI 的智能 Git 提交工具，自动生成高质量的中文提交信息。

## 快速开始

```bash
# 1. 配置 API 密钥（在项目根目录创建 .env.mygit 文件）
DASHSCOPE_API_KEY=your-api-key
DASHSCOPE_BASE_URL=https://dashscope.aliyuncs.com/compatible-mode/v1
DASHSCOPE_MODEL=deepseek-v3

# 2. 运行工具
bun run mygit
```

## 模块说明

### index.ts
主入口文件，协调各个模块完成整个工作流程。

### ai-service.ts
AI 服务模块，负责调用 DeepSeek API 生成提交信息。

主要功能：
- 配置验证
- 构建提示词
- 调用 API
- 解析响应

### git-service.ts
Git 服务模块，封装所有 Git 操作。

主要功能：
- 检查 Git 仓库
- 获取变更状态
- 获取文件 diff
- 执行 add/commit/push

### logger.ts
日志记录模块，提供完善的日志功能。

主要功能：
- 多级别日志（DEBUG、INFO、WARN、ERROR）
- 控制台输出（带颜色）
- 文件输出
- 敏感信息脱敏

### ui.ts
用户交互模块，提供友好的命令行界面。

主要功能：
- 信息展示（成功、错误、警告）
- 加载动画
- 确认对话框
- 输入对话框
- 变更摘要展示

### types.ts
类型定义文件，包含所有接口和类型。

## 详细文档

查看 [AI Git 提交工具使用指南](../../docs/development/mygit-guide.md) 获取更多信息。
