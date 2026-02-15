#!/usr/bin/env bun

/**
 * AI Git 提交工具 - 简化版
 * 功能：自动获取代码变更，使用 AI 生成提交信息并提交
 */

// 加载配置
async function loadConfig() {
  try {
    const envFile = Bun.file('.env.mygit');
    const envContent = await envFile.text();
    const env: Record<string, string> = {};

    for (const line of envContent.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const [key, ...valueParts] = trimmed.split('=');
      if (key && valueParts.length > 0) {
        env[key.trim()] = valueParts.join('=').trim();
      }
    }

    return {
      apiKey: env.DASHSCOPE_API_KEY || '',
      baseUrl: env.DASHSCOPE_BASE_URL || '',
      model: env.DASHSCOPE_MODEL || '',
    };
  } catch (error) {
    console.error('❌ 配置文件加载失败，请确保 .env.mygit 文件存在');
    return null;
  }
}

// 执行命令
async function execCommand(cmd: string[]): Promise<string> {
  const proc = Bun.spawn(cmd, { stdout: 'pipe', stderr: 'pipe' });
  const output = await new Response(proc.stdout).text();
  const exitCode = await proc.exited;
  if (exitCode !== 0) {
    const error = await new Response(proc.stderr).text();
    throw new Error(error || '命令执行失败');
  }
  return output;
}

// 获取 Git 变更
async function getGitChanges() {
  const status = await execCommand(['git', 'status', '--porcelain']);
  if (!status.trim()) {
    return null;
  }

  const lines = status.trim().split('\n');
  const changes = [];

  for (const line of lines) {
    const filePath = line.substring(3);
    const statusCode = line.substring(0, 2);

    let type = '修改';
    if (statusCode.includes('A') || statusCode.includes('?')) type = '新增';
    else if (statusCode.includes('D')) type = '删除';

    changes.push({ type, path: filePath });
  }

  return changes;
}

// 使用 AI 生成提交信息
async function generateCommitMessage(config: any, changes: any[]) {
  const summary = changes.reduce((acc, c) => {
    if (c.type === '新增') acc.added++;
    else if (c.type === '删除') acc.deleted++;
    else acc.modified++;
    return acc;
  }, { added: 0, modified: 0, deleted: 0 });

  const prompt = `请根据以下代码变更生成一个简洁的 Git 提交信息：

变更摘要：
${summary.added > 0 ? `- 新增 ${summary.added} 个文件\n` : ''}${summary.modified > 0 ? `- 修改 ${summary.modified} 个文件\n` : ''}${summary.deleted > 0 ? `- 删除 ${summary.deleted} 个文件\n` : ''}
变更文件列表：
${changes.map(c => `- ${c.type}: ${c.path}`).join('\n')}

要求：
1. 使用中文
2. 第一行是简短的标题（不超过 50 字符）
3. 使用常见的提交类型前缀（如：feat、fix、docs、style、refactor、test、chore）
4. 描述要清晰、准确`;

  const response = await fetch(`${config.baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${config.apiKey}`,
    },
    body: JSON.stringify({
      model: config.model,
      messages: [
        {
          role: 'system',
          content: '你是一个专业的 Git 提交信息生成助手。请根据代码变更生成简洁、清晰的中文提交信息。',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      max_tokens: 300,
      temperature: 0.7,
    }),
  });

  if (!response.ok) {
    throw new Error(`API 请求失败: ${response.status}`);
  }

  const data = await response.json();
  return data.choices[0]?.message?.content?.trim() || '';
}

// 主函数
async function main() {
  console.log('🚀 AI Git 提交工具启动\n');

  // 1. 加载配置
  const config = await loadConfig();
  if (!config || !config.apiKey || !config.baseUrl || !config.model) {
    console.error('❌ 配置不完整，请检查 .env.mygit 文件');
    process.exit(1);
  }

  // 2. 检查 Git 仓库
  try {
    await execCommand(['git', 'rev-parse', '--git-dir']);
  } catch {
    console.error('❌ 当前目录不是 Git 仓库');
    process.exit(1);
  }

  // 3. 获取变更
  console.log('📝 正在检查代码变更...');
  const changes = await getGitChanges();

  if (!changes) {
    console.log('✅ 没有检测到代码变更');
    process.exit(0);
  }

  console.log(`\n发现 ${changes.length} 个文件变更：`);
  changes.forEach(c => console.log(`  ${c.type}: ${c.path}`));

  // 4. 生成提交信息
  console.log('\n🤖 正在使用 AI 生成提交信息...');
  const commitMessage = await generateCommitMessage(config, changes);

  console.log('\n生成的提交信息：');
  console.log('─'.repeat(50));
  console.log(commitMessage);
  console.log('─'.repeat(50));

  // 5. 执行提交
  console.log('\n📦 正在添加变更到暂存区...');
  await execCommand(['git', 'add', '.']);

  console.log('💾 正在创建提交...');
  await execCommand(['git', 'commit', '-m', commitMessage, '--no-verify']);

  // 6. 推送到远程仓库
  console.log('🚀 正在推送到远程仓库...');
  try {
    // 获取当前分支名
    const branch = (await execCommand(['git', 'rev-parse', '--abbrev-ref', 'HEAD'])).trim();

    // 获取远程仓库名称（默认使用第一个远程仓库）
    const remotes = (await execCommand(['git', 'remote'])).trim().split('\n').filter(r => r.trim());
    const remoteName = remotes[0] || 'origin';

    console.log(`📡 远程仓库: ${remoteName}, 分支: ${branch}`);

    // 尝试推送到远程仓库（跳过 pre-push hooks）
    try {
      await execCommand(['git', 'push', '--no-verify', remoteName, branch]);
      console.log('\n✨ 提交并推送成功！');
    } catch (pushError: any) {
      // 如果推送失败，尝试设置上游分支并推送
      console.log('⚠️  首次推送，正在设置上游分支...');
      await execCommand(['git', 'push', '--no-verify', '--set-upstream', remoteName, branch]);
      console.log('\n✨ 提交并推送成功！');
    }
  } catch (error: any) {
    console.error('\n❌ 推送失败:', error.message);
    console.error('提示：本地提交已完成，但推送到远程仓库失败');
    console.error('你可以稍后手动执行: git push --no-verify');
    process.exit(1);
  }
}

// 执行
main().catch((error) => {
  console.error('\n❌ 执行失败:', error.message);
  process.exit(1);
});
