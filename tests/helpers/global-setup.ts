import { FullConfig } from '@playwright/test';
import { existsSync, mkdirSync } from 'fs';
import { join } from 'path';

/**
 * Playwright 全局设置
 *
 * 在所有测试运行之前执行一次
 *
 * 主要职责：
 * - 创建必要的目录结构
 * - 初始化测试数据库
 * - 设置测试环境变量
 * - 记录测试开始日志
 *
 * @param config Playwright 完整配置对象
 */
async function globalSetup(config: FullConfig) {
  console.log('\n========================================');
  console.log('🚀 开始 Playwright 测试环境初始化');
  console.log('========================================\n');

  try {
    // 1. 创建必要的目录
    await createDirectories();

    // 2. 初始化测试数据库
    await initializeTestDatabase();

    // 3. 设置环境变量
    setupEnvironmentVariables();

    // 4. 记录配置信息
    logConfiguration(config);

    console.log('\n✅ 测试环境初始化完成\n');
  } catch (error) {
    console.error('\n❌ 测试环境初始化失败:', error);
    throw error;
  }
}

/**
 * 创建必要的目录结构
 *
 * 确保以下目录存在：
 * - tests/reports: 测试报告目录
 * - tests/reports/html: HTML 报告
 * - tests/reports/screenshots: 截图
 * - tests/reports/videos: 视频录制
 * - tests/reports/traces: 追踪文件
 * - data/test: 测试数据目录
 * - logs/test: 测试日志目录
 */
async function createDirectories() {
  console.log('📁 创建测试目录结构...');

  const directories = [
    'tests/reports',
    'tests/reports/html',
    'tests/reports/screenshots',
    'tests/reports/videos',
    'tests/reports/traces',
    'tests/reports/test-results',
    'data/test',
    'logs/test',
  ];

  for (const dir of directories) {
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
      console.log(`  ✓ 创建目录: ${dir}`);
    } else {
      console.log(`  ○ 目录已存在: ${dir}`);
    }
  }
}

/**
 * 初始化测试数据库
 *
 * 创建一个干净的测试数据库，包含：
 * - 基础表结构
 * - 测试数据种子
 *
 * 注意：每次测试运行前都会重新创建数据库，确保测试隔离
 */
async function initializeTestDatabase() {
  console.log('\n🗄️  初始化测试数据库...');

  try {
    // 导入数据库辅助工具
    const { createDatabaseHelper } = await import('./database-helper');
    const { generateCompleteTestData } = await import('./test-data-generator');

    // 创建数据库辅助工具
    const dbHelper = createDatabaseHelper();

    // 初始化数据库
    await dbHelper.initialize();
    console.log('  ✓ 数据库结构创建完成');

    // 生成测试数据
    const testData = generateCompleteTestData({
      teacherCount: 30,
      classCount: 10,
      daysPerWeek: 5,
      periodsPerDay: 8,
    });

    // 插入测试数据
    await dbHelper.insertSubjects(testData.subjects);
    console.log(`  ✓ 插入 ${testData.subjects.length} 条科目数据`);

    await dbHelper.insertTeachers(testData.teachers);
    console.log(`  ✓ 插入 ${testData.teachers.length} 条教师数据`);

    await dbHelper.insertClasses(testData.classes);
    console.log(`  ✓ 插入 ${testData.classes.length} 条班级数据`);

    await dbHelper.insertCurriculums(testData.curriculums);
    console.log(`  ✓ 插入 ${testData.curriculums.length} 条教学计划数据`);

    console.log('  ✓ 测试数据库初始化完成');
  } catch (error) {
    console.error('  ❌ 数据库初始化失败:', error);
    console.log('  ℹ️  将在测试中使用模拟数据');
  }
}

/**
 * 设置环境变量
 *
 * 为测试环境设置特定的环境变量
 */
function setupEnvironmentVariables() {
  console.log('\n🔧 设置测试环境变量...');

  // 设置测试模式标志
  process.env.NODE_ENV = 'test';
  process.env.TEST_MODE = 'true';

  // 设置测试数据库路径
  process.env.DATABASE_URL = 'sqlite:data/test/scheduling.db';

  // 设置日志级别
  process.env.LOG_LEVEL = process.env.LOG_LEVEL || 'info';

  // 设置测试基础 URL（如果未设置）
  if (!process.env.TEST_BASE_URL) {
    process.env.TEST_BASE_URL = 'http://localhost:1420';
  }

  console.log('  ✓ NODE_ENV:', process.env.NODE_ENV);
  console.log('  ✓ TEST_MODE:', process.env.TEST_MODE);
  console.log('  ✓ DATABASE_URL:', process.env.DATABASE_URL);
  console.log('  ✓ TEST_BASE_URL:', process.env.TEST_BASE_URL);
  console.log('  ✓ LOG_LEVEL:', process.env.LOG_LEVEL);
}

/**
 * 记录配置信息
 *
 * 输出关键的测试配置信息，便于调试
 */
function logConfiguration(config: FullConfig) {
  console.log('\n⚙️  测试配置信息:');
  console.log('  ✓ 测试目录:', config.projects[0]?.testDir || 'N/A');
  console.log('  ✓ 并行执行:', config.fullyParallel ? '是' : '否');
  console.log('  ✓ Worker 数量:', config.workers);
  console.log('  ✓ 最大失败数:', config.maxFailures || '无限制');
  console.log('  ✓ 重试次数:', config.retries);
  console.log('  ✓ 超时时间:', config.timeout, 'ms');
  console.log('  ✓ 浏览器项目:');

  for (const project of config.projects) {
    console.log(`    - ${project.name}`);
  }
}

export default globalSetup;
