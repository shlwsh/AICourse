/**
 * 导入导出页面对象模型
 */
import { Page, Locator } from '@playwright/test';

export class ImportExportPage {
  readonly page: Page;
  readonly downloadTemplateButton: Locator;
  readonly selectFileButton: Locator;
  readonly uploadArea: Locator;
  readonly fileInput: Locator;
  readonly importButton: Locator;
  readonly exportButton: Locator;
  readonly importTab: Locator;
  readonly exportTab: Locator;
  readonly conflictStrategyRadios: Locator;
  readonly importProgress: Locator;
  readonly importResult: Locator;

  constructor(page: Page) {
    this.page = page;

    // 导入相关元素
    this.importTab = page.getByRole('tab', { name: '导入数据' });
    this.downloadTemplateButton = page.getByRole('button', { name: /下载.*模板/i });
    this.selectFileButton = page.getByRole('button', { name: /选择文件导入/i });
    this.uploadArea = page.locator('.el-upload-dragger').first();
    this.fileInput = page.locator('input[type="file"]');
    this.importButton = page.getByRole('button', { name: /开始导入/i });
    this.conflictStrategyRadios = page.locator('.conflict-strategy .el-radio');
    this.importProgress = page.locator('.import-progress');
    this.importResult = page.locator('.import-result');

    // 导出相关元素
    this.exportTab = page.getByRole('tab', { name: '导出数据' });
    this.exportButton = page.getByRole('button', { name: /导出/i }).first();
  }

  /**
   * 切换到导入标签页
   */
  async switchToImportTab() {
    await this.importTab.click();
    await this.page.waitForTimeout(300);
  }

  /**
   * 切换到导出标签页
   */
  async switchToExportTab() {
    await this.exportTab.click();
    await this.page.waitForTimeout(300);
  }

  /**
   * 下载模板文件
   */
  async downloadTemplate() {
    const downloadPromise = this.page.waitForEvent('download', { timeout: 10000 });
    await this.downloadTemplateButton.click();
    const download = await downloadPromise;
    return download;
  }

  /**
   * 点击选择文件按钮
   */
  async clickSelectFile() {
    await this.selectFileButton.click();
  }

  /**
   * 上传文件
   */
  async uploadFile(filePath: string) {
    await this.fileInput.setInputFiles(filePath);
    await this.page.waitForTimeout(500);
  }

  /**
   * 选择冲突处理策略
   */
  async selectConflictStrategy(strategy: 'skip' | 'overwrite' | 'merge') {
    const strategyMap = {
      skip: '跳过冲突数据',
      overwrite: '覆盖已有数据',
      merge: '合并数据',
    };
    await this.page.getByText(strategyMap[strategy]).click();
  }

  /**
   * 点击导入按钮
   */
  async clickImport() {
    await this.importButton.click();
  }

  /**
   * 点击导出按钮
   */
  async clickExport() {
    const downloadPromise = this.page.waitForEvent('download', { timeout: 10000 });
    await this.exportButton.click();
    const download = await downloadPromise;
    return download;
  }

  /**
   * 检查下载模板按钮是否可见
   */
  async isDownloadTemplateButtonVisible(): Promise<boolean> {
    return await this.downloadTemplateButton.isVisible();
  }

  /**
   * 检查选择文件按钮是否可见
   */
  async isSelectFileButtonVisible(): Promise<boolean> {
    return await this.selectFileButton.isVisible();
  }

  /**
   * 检查上传区域是否可见
   */
  async isUploadAreaVisible(): Promise<boolean> {
    return await this.uploadArea.isVisible();
  }

  /**
   * 检查导入进度是否显示
   */
  async isImportProgressVisible(): Promise<boolean> {
    return await this.importProgress.isVisible();
  }

  /**
   * 检查导入结果是否显示
   */
  async isImportResultVisible(): Promise<boolean> {
    return await this.importResult.isVisible();
  }
}
