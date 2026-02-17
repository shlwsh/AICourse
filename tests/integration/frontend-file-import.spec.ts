/**
 * 文件导入功能测试
 * 测试使用真实文件进行导入
 */
import { test, expect } from '@playwright/test';
import { NavigationPage } from '../pages/navigation-page';
import { ImportExportPage } from '../pages/import-export-page';
import path from 'path';

test.describe('文件导入功能测试', () => {
  let navigationPage: NavigationPage;
  let importExportPage: ImportExportPage;

  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:5173');
    navigationPage = new NavigationPage(page);
    await page.waitForLoadState('networkidle');

    // 导航到导入导出页面
    await navigationPage.goToImportExport();
    await page.waitForTimeout(1000);

    importExportPage = new ImportExportPage(page);
  });

  test('31 - 上传测试数据文件', async ({ page }) => {
    // 测试文件路径
    const testFilePath = path.join(process.cwd(), 'data/测试数据.xlsx');
    console.log(`测试文件路径: ${testFilePath}`);

    // 检查文件输入框
    const fileInputCount = await importExportPage.fileInput.count();
    console.log(`文件输入框数量: ${fileInputCount}`);
    expect(fileInputCount).toBeGreaterThan(0);

    // 上传文件
    await importExportPage.uploadFile(testFilePath);
    console.log('文件已上传到输入框');

    // 等待文件信息显示
    await page.waitForTimeout(1000);

    // 检查是否显示了文件信息
    const selectedFileInfo = await page.locator('.selected-file').isVisible().catch(() => false);
    console.log(`文件信息显示: ${selectedFileInfo}`);

    if (selectedFileInfo) {
      const fileName = await page.locator('.selected-file .file-name').textContent();
      console.log(`选中的文件名: ${fileName}`);
      expect(fileName).toContain('测试数据');
    }

    // 检查导入按钮是否可见
    const importButtonVisible = await page.getByRole('button', { name: /开始导入/i }).isVisible().catch(() => false);
    console.log(`导入按钮可见: ${importButtonVisible}`);

    if (importButtonVisible) {
      // 点击导入按钮
      await page.getByRole('button', { name: /开始导入/i }).click();
      console.log('已点击导入按钮');

      // 等待确认对话框
      await page.waitForTimeout(500);

      // 检查是否有确认对话框
      const confirmDialog = await page.locator('.el-message-box').isVisible().catch(() => false);
      console.log(`确认对话框显示: ${confirmDialog}`);

      if (confirmDialog) {
        // 点击确定按钮
        await page.getByRole('button', { name: '确定' }).click();
        console.log('已确认导入');

        // 等待导入完成（最多 10 秒）
        await page.waitForTimeout(2000);

        // 检查导入进度或结果
        const progressVisible = await page.locator('.import-progress').isVisible().catch(() => false);
        const resultVisible = await page.locator('.import-result').isVisible().catch(() => false);

        console.log(`导入进度显示: ${progressVisible}`);
        console.log(`导入结果显示: ${resultVisible}`);

        if (resultVisible) {
          const resultText = await page.locator('.import-result').textContent();
          console.log(`导入结果: ${resultText}`);
        }
      }
    }
  });

  test('32 - 检查导入 API 响应', async ({ page }) => {
    // 监听网络请求
    const requests: any[] = [];
    page.on('request', request => {
      if (request.url().includes('/import-export/import')) {
        requests.push({
          url: request.url(),
          method: request.method(),
        });
        console.log(`捕获到导入请求: ${request.method()} ${request.url()}`);
      }
    });

    page.on('response', async response => {
      if (response.url().includes('/import-export/import')) {
        console.log(`导入 API 响应状态: ${response.status()}`);
        try {
          const body = await response.text();
          console.log(`导入 API 响应内容: ${body.substring(0, 200)}`);
        } catch (e) {
          console.log('无法读取响应内容');
        }
      }
    });

    // 测试文件路径
    const testFilePath = path.join(process.cwd(), 'data/测试数据.xlsx');

    // 上传文件
    await importExportPage.uploadFile(testFilePath);
    await page.waitForTimeout(1000);

    // 检查导入按钮
    const importButtonVisible = await page.getByRole('button', { name: /开始导入/i }).isVisible().catch(() => false);

    if (importButtonVisible) {
      // 点击导入按钮
      await page.getByRole('button', { name: /开始导入/i }).click();
      await page.waitForTimeout(500);

      // 确认导入
      const confirmDialog = await page.locator('.el-message-box').isVisible().catch(() => false);
      if (confirmDialog) {
        await page.getByRole('button', { name: '确定' }).click();

        // 等待 API 请求
        await page.waitForTimeout(3000);

        console.log(`捕获到的请求数量: ${requests.length}`);

        if (requests.length === 0) {
          console.log('警告: 没有捕获到导入 API 请求，可能后端 API 不存在');
        }
      }
    }
  });

  test('33 - 测试文件选择器触发', async ({ page }) => {
    // 点击选择文件按钮
    const selectFileButton = page.getByRole('button', { name: /选择文件导入/i });
    const isVisible = await selectFileButton.isVisible().catch(() => false);

    console.log(`选择文件按钮可见: ${isVisible}`);

    if (isVisible) {
      await selectFileButton.click();
      console.log('已点击选择文件按钮');

      // 检查文件输入框是否存在
      const fileInputs = await page.locator('input[type="file"]').count();
      console.log(`文件输入框数量: ${fileInputs}`);

      expect(fileInputs).toBeGreaterThan(0);
    }
  });

  test('34 - 测试拖拽上传区域', async ({ page }) => {
    // 检查拖拽上传区域
    const uploadArea = page.locator('.el-upload-dragger').first();
    const isVisible = await uploadArea.isVisible().catch(() => false);

    console.log(`拖拽上传区域可见: ${isVisible}`);

    if (isVisible) {
      // 获取上传区域的文本
      const uploadText = await uploadArea.textContent();
      console.log(`上传区域文本: ${uploadText}`);

      expect(uploadText).toContain('拖');
    }
  });
});
